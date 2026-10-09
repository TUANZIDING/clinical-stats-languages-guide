"""One computable base-R report, stdlib only. run computes; check audits a saved snapshot.
No input-path option: the only permitted dataset is the existing 24-observation teaching CSV.
No canonical results, paper targets, or shared artifacts are written.
"""
import argparse
import datetime
import hashlib
import html
import json
import math
import platform
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data/synthetic-independent.csv'
EXAMPLE = ROOT / 'examples/r/welch_demo.R'
REFERENCE = ROOT / 'data/expected-results.json'
VIEW = ROOT / 'docs/assets/统一结果视图v2.2.js'
SCRIPT = Path(__file__).resolve()
SAVED = ROOT / 'docs/assets/计算报告记录v2.2.json'
PAGE = ROOT / 'docs/计算报告示范v2.2.html'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_view():
    return json.loads(VIEW.read_text().split('=', 1)[1].strip().removesuffix(';'))['small']


def validate(record):
    if record.get('kind') != 'actual-r-computation':
        raise ValueError('Cannot label a snapshot import as an actual computation')
    expected = json.loads(REFERENCE.read_text())
    actual = record['result']
    if set(actual) != set(expected):
        raise ValueError('Missing or extra result fields')
    checks = []
    for key, value in expected.items():
        observed = actual[key]
        if isinstance(observed, bool) or not isinstance(observed, (int, float)) or not math.isfinite(observed):
            raise ValueError('Nonfinite or nonnumeric result: ' + key)
        if not math.isclose(observed, value, rel_tol=1e-9, abs_tol=1e-10):
            raise ValueError('R/reference difference: ' + key)
        checks.append(key)
    webpage = read_view()
    for key in ('difference', 'ci_low', 'ci_high', 'p_value'):
        if not math.isclose(actual[key], webpage[key], rel_tol=1e-9, abs_tol=1e-10):
            raise ValueError('R/webpage difference: ' + key)
    inputs = {'data/synthetic-independent.csv': DATA, 'examples/r/welch_demo.R': EXAMPLE,
              'data/expected-results.json': REFERENCE, 'docs/assets/统一结果视图v2.2.js': VIEW,
              'scripts/计算报告v2.2.py': SCRIPT}
    if set(record['sourceHashes']) != set(inputs):
        raise ValueError('Incomplete provenance')
    for key, path in inputs.items():
        if record['sourceHashes'][key] != sha(path):
            raise ValueError('Source hash drift: ' + key)
    if record['direction'] != 'A-B' or record['missing'] != 'none; fail on NA' or record['interval'] != 'two-sided Welch t; Satterthwaite df; 95%':
        raise ValueError('Analysis contract changed')
    if not record.get('environment', {}).get('R') or not record.get('executedAt'):
        raise ValueError('Execution environment/time missing')
    return checks


def compute():
    runtime = shutil.which('Rscript')
    if not runtime:
        raise RuntimeError('Rscript is required for run; check is snapshot-only and needs no R')
    output = subprocess.run([runtime, '--vanilla', str(EXAMPLE)], cwd=ROOT,
                            capture_output=True, text=True, check=True, timeout=60)
    pairs = re.findall(r'^([a-z_]+)=([+\-\deE.]+)\s*$', output.stdout, re.M)
    values = {key: float(value) for key, value in pairs}
    if len(pairs) != 10 or len(values) != 10:
        raise ValueError('Unexpected R output; no report generated')
    env = subprocess.run([runtime, '--vanilla', '-e',
                          'cat(R.version.string,"\\n",R.version$platform,"\\n",'
                          'as.character(packageVersion("stats")),"\\n",'
                          'extSoftVersion()[["BLAS"]],sep="")'],
                         cwd=ROOT, capture_output=True, text=True, check=True, timeout=30).stdout.splitlines()
    record = {'version':'2.2', 'case':'small', 'kind':'actual-r-computation',
              'executedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'direction':'A-B', 'missing':'none; fail on NA',
              'interval':'two-sided Welch t; Satterthwaite df; 95%',
              'result':values, 'sourceHashes':{str(p.relative_to(ROOT)):sha(p) for p in (DATA, EXAMPLE, REFERENCE, VIEW, SCRIPT)},
              'environment':{'R':env[0], 'RPlatform':env[1], 'stats':env[2], 'BLAS':env[3],
                             'Python':platform.python_version(), 'system':platform.platform(),
                             'invocation':'Rscript --vanilla examples/r/welch_demo.R',
                             'packages':'base R only; no restoration or external package installation'},
              'diagnostics':{'executed':['unique IDs','two groups','no missing/nonfinite values'],
                             'pending':['distribution/outliers','independence of a real research design']},
              'limitations':['Only the existing 24-row simulation was recalculated.',
                             'Same-host run; no new OS/container restoration.',
                             'Not paper reproduction, AI evaluation, or a human learning trial.'],
              'stderr':output.stderr}
    validate(record)
    return record


def render(record, local=False):
    validate(record)
    names={'n_a':'A 组观测数','n_b':'B 组观测数','mean_a':'A 组均值','mean_b':'B 组均值',
           'difference':'A−B 均值差','statistic':'Welch t','df':'Satterthwaite 自由度',
           'p_value':'双侧 P 值','ci_low':'95% CI 下限','ci_high':'95% CI 上限'}
    rows=''.join(f'<tr><th scope="row">{label}</th><td data-field="{key}">{record["result"][key]:.12g}</td></tr>' for key,label in names.items())
    payload=json.dumps(record,ensure_ascii=False,sort_keys=True).replace('<','\\u003c')
    prefix='../../docs/' if local else ''
    record_link='计算报告记录v2.2.json' if local else 'assets/计算报告记录v2.2.json'
    return f'''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>均值差计算报告示范 v2.2</title>
<style>body{{font:17px/1.8 "PingFang SC","Microsoft YaHei",sans-serif;color:#123044;background:#fafbf7;margin:0;padding:28px}}main{{max-width:850px;margin:auto}}h1{{font-size:clamp(26px,4vw,38px)}}a{{color:#007965}}a:focus-visible{{outline:3px solid #007965;outline-offset:4px}}table{{border-collapse:collapse;width:100%;background:white}}th,td{{padding:10px;text-align:left;border-bottom:1px solid #d7e0da}}td{{font-family:monospace;overflow-wrap:anywhere}}pre{{white-space:pre-wrap;overflow-wrap:anywhere;background:#123044;color:#d4e9de;padding:18px}}p{{overflow-wrap:anywhere}}.note{{border-left:3px solid #007965;padding:12px 18px;background:#e7f0ea}}@media(max-width:420px){{body{{padding:18px}}th,td{{font-size:13px;padding:8px}}}}</style></head><body><main>
<p><a href="{prefix}index.html#learning">← 回到三层学习路径</a></p><h1>从一次计算，生成一份报告。</h1>
<p>用已有 24 个独立模拟观测演示 A−B 均值差。执行入口实际调用基础 R 的既有脚本，再用同一运行对象生成本页；无需 Quarto、联网资源或额外 R 包。本页是该次保存报告，打开页面不会再计算。</p>
<p class="note">已核对：10 个 R 数字与冻结参考、4 个主网页显示字段在预定数值容差内一致。相对容差 1e−9、绝对容差 1e−10。网页、图注和原有结果对象未被这个示范改写。</p>
<table><caption>实际 R 计算 · 没有患者或疗效结论</caption><tbody>{rows}</tbody></table>
<p>区间：双侧 Welch t，Satterthwaite 自由度，95%；未调整，方向 A−B，无缺失（遇到 NA 即失败）。变量没有临床单位；报告差异与区间，不据 P 值推断临床意义。</p>
<h2>如何重新运行</h2><p>在项目根目录、已有 R 与 Python 时：</p><pre><code>python3 scripts/计算报告v2.2.py run
# 结果默认保存 build；不修改本网页或原结果。
# 检查交付页面只是核对保存对象，不会拟合：
python3 scripts/计算报告v2.2.py check</code></pre>
<h2>已做检查与待核查</h2><p>输入检查：ID 唯一、两组、无缺失和非有限值。分布 / 极端值与真实研究的独立性仍需解释。数值一致不等于方法学认证。</p>
<p>实际运行：{html.escape(record['executedAt'])}<br>R：{html.escape(record['environment']['R'])}；stats {html.escape(record['environment']['stats'])}<br>系统：{html.escape(record['environment']['system'])}<br>同一台主机，没有新增跨系统或容器恢复验证。</p>
<p>本示范只重新计算模拟均值差；没有重跑公共论文、接入或测评 AI，也没有真人学习效果证据。<a href="{prefix}教学路径v2.2.md">查看课程与来源</a> · <a href="{record_link}">查看运行记录、输入 / 代码哈希和环境</a> · <a href="{prefix}index.html#practice">对照主网页</a></p>
<script type="application/json" id="report-source">{payload}</script>
</main></body></html>
'''


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode',choices=['run','check'])
    parser.add_argument('--export',action='store_true',help='Explicitly export a newly computed demo page to docs; never changes common/frozen results')
    args=parser.parse_args()
    if args.mode=='check':
        if args.export:
            parser.error('--export is only valid with run')
        record=json.loads(SAVED.read_text())
        validate(record)
        if PAGE.read_text()!=render(record):
            raise ValueError('Saved report and execution object differ')
        print('PASS snapshot only: 10 frozen values + 4 webpage source values + hashes + self-contained report; no R execution')
    else:
        record=compute()
        directory=ROOT/'build/计算报告示范v2.2'
        directory.mkdir(parents=True,exist_ok=True)
        (directory/'计算报告记录v2.2.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
        (directory/'计算报告示范v2.2.html').write_text(render(record,local=True))
        if args.export:
            SAVED.write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
            PAGE.write_text(render(record))
        print('PASS actual R computation: 10 frozen values + 4 webpage source values; output '+str(directory.relative_to(ROOT)))


if __name__=='__main__':
    main()
