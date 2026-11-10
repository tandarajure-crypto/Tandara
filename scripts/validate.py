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
