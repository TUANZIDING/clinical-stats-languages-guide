"""Check captured Step 6 run evidence offline. This command does not rerun R."""
import hashlib
import json
import math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
P=ROOT/'docs/assets/综合复算记录v2.2.json'
def require(ok,message):
 if not ok:raise ValueError(message)
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def check():
 r=json.loads(P.read_text());b=json.loads((ROOT/'docs/assets/分析结果v2.2.json').read_text());l=json.loads((ROOT/'docs/assets/纵向论文结果v2.2.json').read_text())
 require(r['kind'].startswith('Actual local recomputation'), 'Missing bounded execution evidence')
 rows=r['numericComparison']['checks'];require(r['numericComparison']['fields']==len(rows),'Comparison count drift')
 for row in rows:
  parts=row['path'];x=l if parts[0]=='medplot' else b['cases'][parts[0]]
  for key in parts[1:]:x=x[int(key)] if isinstance(x,list) else x[key]
  require(x==row['actual'],'Saved actual differs from result object: '+row['field'])
  require(math.isclose(row['actual'],row['previous'],rel_tol=r['numericComparison']['relativeTolerance'],abs_tol=r['numericComparison']['absoluteTolerance']),'Pre/post repair numeric difference: '+row['field'])
 for item in r['inputs']+r['frozenProtection']:require(digest(ROOT/item['path'])==item['sha256'],'Hash drift: '+item['path'])
 for library in r['restores']:
  require(library['packageCount']==len(library['packages']),'Restored package count drift')
  require(all(x['matched'] and x['actual']==x['expected'] for x in library['packages']),'Pinned package mismatch')
 require(r['cpp']['exitCode']==0 and digest(ROOT/'examples/cpp/welch_demo.cpp')==r['cpp']['sourceSha256'],'C++ compilation evidence drift')
 require(r['longitudinal']['summary']==l['summary'] and r['longitudinal']['authorRuns']==l['authorRuns'],'Author failure / differences drift')
 materials=json.loads((ROOT/'docs/assets/材料复核记录v2.2.json').read_text())
 require(materials['count']==len(materials['files']),'Material count drift')
 for source in materials['manifests']:require(digest(ROOT/source['path'])==source['sha256'],'Material manifest drift')
 for item in materials['files']:
  manifest=json.loads((ROOT/item['manifest']).read_text())
  original=next(x for x in manifest['files'] if x['file']==item['file'])
  require(item['matched'] and item['sha256']==original['sha256'] and item['bytes']==original['bytes'],'Saved material identity drift')
 print(f"PASS snapshot only: {len(rows)} pre/post repair numeric fields, 11 frozen inputs, restoration and compile records; no new execution")
if __name__=='__main__':check()
