#!/usr/bin/env python3
"""Advisory, read-only genealogy and privacy checks.
Never print names, person IDs, dates, or private record content.
No external access, no modification of files.
"""
import collections
import html.parser
import json
import os
import pathlib
import re
import sys
from urllib.parse import unquote, urlsplit

ROOT = pathlib.Path('.').resolve()
REPO = os.environ.get('GITHUB_REPOSITORY', '').rsplit('/', 1)[-1].lower()
SKIP = {'.git', 'node_modules', '.venv', 'venv', '__pycache__', 'dist', 'build'}
EXT = {'.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif', '.pdf', '.ico'}
FIELDS = ('photo', 'photoEn', 'image', 'imageEn', 'src', 'thumbnail', 'poster')
GROUPS = ('primary', 'nodes')
stats = collections.Counter()
warnings = collections.Counter()
examples = collections.defaultdict(list)

def record(kind, path):
    warnings[kind] += 1
    # Do not expose private path components, person codes, or source content.
    safe = path.name if REPO != 'privat' else '[private HTML file]'
    if safe not in examples[kind] and len(examples[kind]) < 3:
        examples[kind].append(safe)

class Diagrams(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.on = False
        self.chunks = []
        self.blocks = []
    def handle_starttag(self, tag, attributes):
        a = dict(attributes)
        if tag == 'script' and a.get('type', '').lower() == 'application/json' and a.get('id') == 'diagramData':
            self.on = True
            self.chunks = []
    def handle_data(self, value):
        if self.on:
            self.chunks.append(value)
    def handle_endtag(self, tag):
        if tag == 'script' and self.on:
            self.blocks.append(''.join(self.chunks))
            self.on = False

def files(ext):
    return (p for p in ROOT.rglob('*') if p.is_file() and p.suffix.lower() in ext
            and not any(part in SKIP for part in p.relative_to(ROOT).parts))

def photograph_paths(node):
    if isinstance(node, dict):
        for k, v in node.items():
            if k in FIELDS and isinstance(v, str) and v.strip():
                yield v
            elif isinstance(v, (dict, list)):
                yield from photograph_paths(v)
    elif isinstance(node, list):
        for v in node:
            yield from photograph_paths(v)

def check_photo(value, page):
    parsed = urlsplit(value)
    if parsed.scheme in ('http', 'https') or parsed.netloc or value.startswith('//'):
        stats['external image URLs (not validated)'] += 1
        return
    if parsed.scheme or not parsed.path or parsed.path.startswith('data:'):
        return
    path = unquote(parsed.path)
    if pathlib.PurePosixPath(path).suffix.lower() not in EXT:
        return
    stats['diagram image references'] += 1
    dest = (page.parent / path).resolve()
    if not dest.is_relative_to(ROOT):
        stats['cross-repository images (not validated)'] += 1
    elif not dest.is_file():
        record('missing local diagram image', page)

def inspect(data, page):
    persons = {}
    for group in GROUPS:
        entries = data.get(group)
        if isinstance(entries, dict):
            stats['diagram records'] += len(entries)
            for code, obj in entries.items():
                if not isinstance(obj, dict):
                    record('malformed diagram record', page)
                    continue
                if code in persons and persons[code] != obj:
                    record('different records with same code in diagram', page)
                persons[code] = obj
                if obj.get('code') and str(obj['code']) != str(code):
                    record('record key and code mismatch', page)
                if obj.get('id') and str(obj['id']) != str(code):
                    record('record key and id mismatch', page)
    for code, obj in persons.items():
        parent = obj.get('parent')
        if parent and isinstance(parent, str) and parent == code:
            record('self-parent relationship', page)
        children = obj.get('children')
        if isinstance(children, list):
            if len(set(map(str, children))) != len(children):
                record('repeated child reference', page)
            for child in children:
                if child == code:
                    record('self-child relationship', page)
                linked = persons.get(str(child))
                if isinstance(linked, dict) and linked.get('parent') and linked['parent'] != code:
                    record('parent-child mismatch (review model)', page)
                elif linked is None:
                    stats['children outside current diagram (not necessarily errors)'] += 1
        if isinstance(parent, str) and parent and parent not in persons:
            stats['parents outside current diagram (not necessarily errors)'] += 1
        for photo in photograph_paths(obj):
            check_photo(photo, page)
    return set(persons)

diagrams = {}
for page in files({'.html', '.htm'}):
    try:
        contents = page.read_text(encoding='utf-8-sig')
        parser = Diagrams()
        parser.feed(contents)
        for raw in parser.blocks:
            # Hard-fail syntax validation is performed by validate.py.
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue
            if isinstance(data, dict):
                stats['diagram blocks'] += 1
                diagrams[page] = inspect(data, page)
        if REPO != 'privat' and re.search(
            r'https?://(?:[^"\\s/]+/)?(?:PRIVAT)(?:/|\\b)', contents, re.I):
            record('reference to private repository in public HTML', page)
    except (OSError, UnicodeError, ValueError):
        record('unreadable HTML for advisory scan', page)

for page, codes in diagrams.items():
    name = page.name
    if name.endswith('-en.html'):
        partner = page.with_name(name[:-8] + '.html')
    else:
        partner = page.with_name(name[:-5] + '-en.html')
    if partner not in diagrams:
        continue
    stats['paired diagrams compared'] += 1
    if codes != diagrams[partner]:
        record('HR/EN diagram person-code mismatch', page)

if REPO != 'privat':
    for source in files({'.js', '.json', '.css'}):
        try:
            content = source.read_text(encoding='utf-8-sig')
            if re.search(r'https?://(?:[^"\\s/]+/)?PRIVAT(?:/|\\b)', content, re.I):
                record('reference to private repository in public source', source)
        except (OSError, UnicodeError):
            record('unreadable public source', source)

print('Advisory checks (no modifications, no genealogy data in logs)')
print('Counts: ' + ', '.join(f'{k}={v}' for k, v in sorted(stats.items())))
print(f'Warning categories={len(warnings)}; total findings={sum(warnings.values())}')
for kind, amount in sorted(warnings.items()):
    print(f'WARNING: {kind}: {amount} occurrence(s); samples: {", ".join(examples[kind])}')
print('External assets and cross-repository references remain unverified.')
print('Privacy scan checks repository references only; it is NOT a personal-data audit.')
sys.exit(0)
