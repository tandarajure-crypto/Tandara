#!/usr/bin/env python3
"""Read-only Tandara checks. Never change data or print genealogical records."""
import collections
import html.parser
import json
import pathlib
import re
import shutil
import subprocess
import sys
from urllib.parse import unquote, urlsplit

ROOT = pathlib.Path('.').resolve()
SKIP = {'.git', 'node_modules', '.venv', 'venv', '__pycache__', 'dist', 'build'}
ASSETS = {'.html', '.htm', '.js', '.css', '.json', '.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.pdf', '.ico', '.avif'}
CODE = re.compile(r'^\d+(?:\.\d+)*(?:-[A-Z]+(?:-\d+)?)?$')

class Page(html.parser.HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links, self.json_scripts, self.codes = [], [], []
        self.lang = None
        self.languages = []
        self.in_json = False
        self.parts = []
        self.start_line = 0

    def handle_starttag(self, tag, attributes):
        a = dict(attributes)
        if tag == 'html':
            self.lang = a.get('lang')
        if tag == 'body':
            self.languages = [a.get('data-page-hr'), a.get('data-page-en')]
        for key in ('href', 'src', 'poster'):
            if a.get(key):
                self.links.append((self.getpos()[0], key, a[key]))
        if a.get('data-person-code'):
            self.codes.append(a['data-person-code'])
        if tag == 'script' and a.get('type', '').lower() == 'application/json':
            self.in_json = True
            self.start_line = self.getpos()[0]
            self.parts = []

    def handle_data(self, value):
        if self.in_json:
            self.parts.append(value)

    def handle_endtag(self, tag):
        if tag == 'script' and self.in_json:
            self.json_scripts.append((self.start_line, ''.join(self.parts)))
            self.in_json = False

def paths(extensions):
    return (p for p in ROOT.rglob('*') if p.is_file()
            and p.suffix.lower() in extensions
            and not any(part in SKIP for part in p.relative_to(ROOT).parts))

errors, warnings = [], []
counts = collections.Counter()
for path in paths({'.json'}):
    counts['JSON'] += 1
    try:
        json.loads(path.read_text(encoding='utf-8-sig'))
    except (UnicodeError, OSError, json.JSONDecodeError) as e:
        errors.append(f'{path.relative_to(ROOT)}: invalid JSON ({type(e).__name__}, line {getattr(e, "lineno", "?")})')

node = shutil.which('node')
for path in paths({'.js', '.mjs', '.cjs'}):
    counts['JavaScript'] += 1
    if not node:
        errors.append('Node.js required to check JavaScript syntax')
        break
    checked = subprocess.run([node, '--check', str(path)], capture_output=True, text=True)
    if checked.returncode:
        errors.append(f'{path.relative_to(ROOT)}: invalid JavaScript syntax')

for path in paths({'.html', '.htm'}):
    counts['HTML'] += 1
    rel = path.relative_to(ROOT)
    try:
        parser = Page()
        parser.feed(path.read_text(encoding='utf-8-sig'))
        parser.close()
    except (UnicodeError, OSError, ValueError) as e:
        errors.append(f'{rel}: unreadable HTML ({type(e).__name__})')
        continue
    if not parser.lang:
        warnings.append(f'{rel}: html lang missing')
    for line, raw in parser.json_scripts:
        counts['embedded JSON'] += 1
        try:
            json.loads(raw)
        except json.JSONDecodeError as e:
            errors.append(f'{rel}:{line + e.lineno}: invalid embedded JSON ({e.msg})')
    for line, attr, address in parser.links:
        parsed = urlsplit(address)
        if parsed.scheme or parsed.netloc or not parsed.path or address.startswith(('#', '//')):
            continue
        target = unquote(parsed.path)
        if '\\' in target:
            warnings.append(f'{rel}:{line}: backslash in {attr} path')
            continue
        absolute = (path.parent / target).resolve()
        if not absolute.is_relative_to(ROOT):
            counts['cross-repository references'] += 1
            continue
        if target.endswith('/') or absolute.suffix.lower() in ASSETS:
            counts['local references'] += 1
            if not absolute.exists():
                warnings.append(f'{rel}:{line}: missing local {attr} target {target}')
    for sibling in parser.languages:
        if sibling:
            candidate = (path.parent / sibling).resolve()
            if candidate.is_relative_to(ROOT) and not candidate.exists():
                warnings.append(f'{rel}: missing language counterpart {sibling}')
    repeated = sum(n > 1 for n in collections.Counter(parser.codes).values())
    if repeated:
        warnings.append(f'{rel}: {repeated} repeated person codes (may be intentional)')
    strange = sum(not CODE.fullmatch(c) for c in parser.codes)
    if strange:
        warnings.append(f'{rel}: {strange} nonstandard person codes (review only)')


# Additional non-destructive checks. Structural anomalies remain warnings until
# the genealogy schema has been agreed and baseline anomalies reviewed.
diagram_pages = {}
cross_repo_links = collections.Counter()
for path in paths({'.html', '.htm'}):
    rel = path.relative_to(ROOT)
    try:
        page = Page()
        page.feed(path.read_text(encoding='utf-8-sig'))
        page.close()
    except (UnicodeError, OSError, ValueError):
        continue
    for _, _, address in page.links:
        parsed = urlsplit(address)
        parts = unquote(parsed.path).split('/')
        if 'tandara-common' in parts or '../tandara-common/' in address:
            cross_repo_links['tandara-common'] += 1
        if 'PRIVAT' in parts:
            cross_repo_links['PRIVAT'] += 1
    for _, raw in page.json_scripts:
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue
        if not isinstance(data, dict) or not any(key in data for key in ('primary', 'nodes')):
            continue
        people = {}
        for group_name in ('primary', 'nodes'):
            group = data.get(group_name, {})
            if not isinstance(group, dict):
                warnings.append(f'{rel}: diagram group {group_name} is not an object')
                continue
            for code, person in group.items():
                if not isinstance(person, dict):
                    warnings.append(f'{rel}: non-object person entry in {group_name}')
                    continue
                if code in people:
                    warnings.append(f'{rel}: person code is present in multiple diagram groups')
                people[code] = person
                if person.get('code') not in (None, code) or person.get('id') not in (None, code):
                    warnings.append(f'{rel}: diagram entry code/id differs from its key')
        if not people:
            continue
        counts['diagrams'] += 1
        counts['diagram entries'] += len(people)
        anomalies = collections.Counter()
        for code, person in people.items():
            parent = person.get('parent')
            if parent is not None and not isinstance(parent, str):
                anomalies['parent field is not text'] += 1
            children = person.get('children', [])
            if children is not None and not isinstance(children, list):
                anomalies['children field is not a list'] += 1
                continue
            for child in children or []:
                if not isinstance(child, str):
                    anomalies['child reference is not text'] += 1
                elif child == code:
                    anomalies['person references self as child'] += 1
                elif child in people:
                    child_parent = people[child].get('parent')
                    if child_parent and child_parent != code:
                        anomalies['parent/child references differ'] += 1
                else:
                    anomalies['child reference outside this diagram (verify across diagrams)'] += 1
            if parent == code:
                anomalies['person references self as parent'] += 1
            elif parent and parent in people:
                other_children = people[parent].get('children')
                if isinstance(other_children, list) and code not in other_children:
                    anomalies['parent missing reciprocal child reference'] += 1
        for kind, number in sorted(anomalies.items()):
            warnings.append(f'{rel}: {number} genealogy entries: {kind}')
        diagram_pages[str(rel)] = people

# Compare corresponding pages by code only; never print names or biographies.
for filename, people in sorted(diagram_pages.items()):
    if filename.endswith('-en.html'):
        continue
    english = filename[:-5] + '-en.html'
    if english in diagram_pages:
        a, b = set(people), set(diagram_pages[english])
        if a != b:
            warnings.append(f'{filename}: HR/EN diagram identifiers differ '
                            f'(HR-only={len(a-b)}, EN-only={len(b-a)})')
        shared = a & b
        changed_links = sum(
            people[code].get('parent') != diagram_pages[english][code].get('parent')
            or people[code].get('children', []) != diagram_pages[english][code].get('children', [])
            for code in shared
        )
        if changed_links:
            warnings.append(f'{filename}: {changed_links} HR/EN genealogy relationship differences')
        counts['HR/EN diagram pairs'] += 1

# This is deliberately not a claim of cross-repository or publishing privacy safety.
for target, number in sorted(cross_repo_links.items()):
    print(f'INFO: {number} references to {target}; remote targets require separate verification')
if (ROOT / 'objava.json').exists():
    try:
        objava = json.loads((ROOT / 'objava.json').read_text(encoding='utf-8-sig'))
        for key in ('title', 'message', 'imageAlt', 'linkLabel'):
            value = objava.get(key)
            if isinstance(value, dict) and set(('hr', 'en')) - set(value):
                warnings.append(f'objava.json: missing HR/EN setting in {key}')
    except (ValueError, OSError):
        pass

print('Tandara read-only validation')
print('Counts:', ', '.join(f'{key}={value}' for key, value in sorted(counts.items())))
print(f'Syntax failures={len(errors)}; review warnings={len(warnings)}')
for finding in errors[:50]:
    print('ERROR:', finding)
for finding in warnings[:50]:
    print('WARNING:', finding)
if len(errors) > 50 or len(warnings) > 50:
    print('Additional findings omitted from log')
sys.exit(1 if errors else 0)
