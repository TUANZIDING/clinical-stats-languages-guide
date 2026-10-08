"""Local link/asset/data checks. No network calls, uploads or browser automation."""
import csv
import json
import re
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT=Path(__file__).resolve().parents[1]
errors=[]
links=0

def check_link(path, raw, ids=None):
    global links
    if raw.startswith(('http:','https:','mailto:','data:','javascript:')): return
    parsed=urlsplit(raw)
    if not parsed.path:
        if parsed.fragment and ids is not None and parsed.fragment not in ids:
            errors.append(f'{path.relative_to(ROOT)}: missing anchor #{parsed.fragment}')
        return
    target=(path.parent/unquote(parsed.path)).resolve()
    if not target.is_relative_to(ROOT) or not target.exists():
        errors.append(f'{path.relative_to(ROOT)}: broken local link {raw}')
    links+=1

class PageParser(HTMLParser):
    def __init__(self):super().__init__();self.ids=[];self.refs=[];self.external=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.append(a['id'])
        if tag in ('a','img','script','link'):
            ref=a.get('src') or a.get('href')
            if ref:self.refs.append(ref)
            if tag in ('img','script','link') and ref and urlsplit(ref).scheme:self.external.append(ref)

for path in ROOT.rglob('*.md'):
    if '.git' in path.parts:continue
    for raw in re.findall(r'!?\[[^\]]*\]\(([^)\s]+)\)',path.read_text(encoding='utf-8')):check_link(path,raw)
for path in (ROOT/'docs').rglob('*.html'):
    parser=PageParser();parser.feed(path.read_text(encoding='utf-8'))
    if len(parser.ids)!=len(set(parser.ids)):errors.append('Duplicate HTML IDs')
    if parser.external:errors.append('Unexpected externally hosted runtime assets')
    for ref in parser.refs:check_link(path,ref,set(parser.ids))
for path in (ROOT/'docs/assets').glob('*.svg'):
    try:ET.parse(path)
    except ET.ParseError as error:errors.append(f'Invalid SVG: {path.name}: {error}')
with (ROOT/'data/synthetic-independent.csv').open(newline='') as handle:rows=list(csv.DictReader(handle))
if len(rows)!=24 or len({r['id'] for r in rows})!=24:errors.append('Unexpected synthetic rows or IDs')
for group in ('A','B'):
    if sum(r['group']==group for r in rows)!=12:errors.append('Unexpected group sizes')
expected=json.loads((ROOT/'data/expected-results.json').read_text())
site=(ROOT/'docs/assets/demo-result.js').read_text().removeprefix('window.DEMO_RESULT = ').strip().removesuffix(';')
if json.loads(site)!=expected:errors.append('Website result data do not match reference')
if errors:raise SystemExit('\n'.join(errors))
print(f'PASS: {links} local links/assets; HTML IDs; SVG XML; offline assets; 24 synthetic rows; website/reference consistency.')
