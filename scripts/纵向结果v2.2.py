"""Build/check the limited longitudinal replay from one result object.

check: offline stdlib snapshot/provenance arithmetic only, NEVER reruns R.
build: imports an actual R run, then renders Markdown/JS/plot from its numbers.
"""
import hashlib
import json
import math
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RESULT = ROOT/"docs/assets/纵向论文结果v2.2.json"
REPORT = ROOT/"docs/纵向论文对照v2.2.md"
VIEW = ROOT/"docs/assets/纵向论文视图v2.2.js"
PLOT = ROOT/"docs/assets/纵向论文效应图v2.2.png"
AUDIT = ROOT/"data/纵向产物来源v2.2.json"
TARGETS = ROOT/"data/纵向论文目标v2.2.json"
SOURCES = ROOT/"data/纵向论文来源v2.2.json"
FROZEN = "8864d5d321271b669027d170cae15a2c2d8c14552a7ab4086eae931dc57a5563"

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def require(condition, message):
    # Integrity checks must also execute with Python -O / PYTHONOPTIMIZE.
    if not condition:
        raise ValueError(message)

def validate(record):
    require(sha(TARGETS) == FROZEN, 'Frozen targets changed')
    target=json.loads(TARGETS.read_text())
    source=json.loads(SOURCES.read_text())
    require(source['frozenTargets']['sha256'] == FROZEN == record['frozenTargets']['sha256'], 'Longitudinal result contract violated')
    require(record['authorCommit'] == source['authorCommit'], 'Longitudinal result contract violated')
    require(record['execution']['kind'] == 'recomputed', 'Longitudinal result contract violated')
    started=datetime.strptime(record['execution']['startedAt'],'%Y-%m-%d %H:%M:%S %Z').replace(tzinfo=timezone.utc)
    require(started > datetime.fromisoformat(target['frozenAt']), 'Run must follow freeze')
    require(record['code']['sha256'] == sha(ROOT / record['code']['path']), 'Replay code drift')
    require(record['lock']['sha256'] == sha(ROOT / record['lock']['path']), 'R lock drift')
    actual=record['observations']
    wanted={t['id']:t for t in target['targets']}
    rows=record['comparison']
    require(len(rows) == len(wanted) and set((x['id'] for x in rows)) == set(wanted), 'Longitudinal result contract violated')
    for row in rows:
        t=wanted[row['id']]; v=actual.get(row['id'])
        require(row['published'] == t['value'] and row['tolerance'] == t['tolerance'], 'Longitudinal result contract violated')
        require(row['actual'] == v, 'Longitudinal result contract violated')
        if v is None:
            expected='UNREPRODUCED'
        else:
            require(isinstance(v, (int, float)) and math.isfinite(v), 'Longitudinal result contract violated')
            require(abs(row['difference'] - (v - t['value'])) < 1e-12, 'Longitudinal result contract violated')
            expected='MATCH' if abs(v-t['value'])<=t['tolerance']+1e-12 else 'DIFFERENCE'
        require(row['status'] == expected, f"Reclassified comparison: {row['id']}")
    counts=Counter(x['status'] for x in rows)
    require(record['summary'] == dict(matched=counts['MATCH'], differences=counts['DIFFERENCE'], unreproduced=counts['UNREPRODUCED'], total=len(rows)), 'Longitudinal result contract violated')
    d=record['denominators']
    require(sum((x['rows'] for x in d['perVisit'])) == d['observedVisits'], 'Longitudinal result contract violated')
    require(d['plannedGrid'] - d['observedVisits'] == d['absentVisits'], 'Longitudinal result contract violated')
    require(d['nauseaObserved'] <= d['observedVisits'] and d['nauseaPatients'] <= d['patients'], 'Longitudinal result contract violated')
    require(d['perOutcomeMissing']['Nausea'] == d['observedVisits'] - d['nauseaObserved'], 'Longitudinal result contract violated')
    for key,prefix in [('linear14','linear'),('logistic14','logistic')]:
        stat=record['statistics'][key]
        require(stat['lower'] <= stat['estimate'] <= stat['upper'], 'Longitudinal result contract violated')
        require(0 <= stat['p'] <= 1, 'Longitudinal result contract violated')
        for name in ['estimate','lower','upper']:
            require(stat[name] == actual[prefix + name.title() + 'Text'], 'Longitudinal result contract violated')
        diag=record['diagnostics']['linear' if key=='linear14' else 'binary']
        require(diag['nobs'] == d['nauseaObserved'] and diag['patients'] == d['nauseaPatients'], 'Longitudinal result contract violated')
        reference=diag['fixedEffects']['Measurement14']
        require(abs((math.exp(reference) if prefix == 'logistic' else reference) - stat['estimate']) < 1e-10, 'Longitudinal result contract violated')
    require(record['authorRuns']['binaryUnmodified']['error'] is None, 'Longitudinal result contract violated')
    require(record['authorRuns']['continuousUnmodified']['error'], 'Original failure must remain recorded')
    adapter=record['authorRuns']['adapter']
    require(adapter['occurrences'] == 1 and adapter['from'] == 'lmerTest::summary(model)' and (adapter['to'] == 'summary(model)'), 'Longitudinal result contract violated')
    require(record['authorRuns']['continuousCompatible']['error'] is None, 'Longitudinal result contract violated')
    require(record['environment']['packages'] and record['warnings'] and record['unreproduced'], 'Longitudinal result contract violated')
    return counts

def view(record):
    a=record['statistics']['linear14']; b=record['statistics']['logistic14']; d=record['denominators']; s=record['summary']
    return dict(summary=f"{s['matched']}/{s['total']} 一致 · {s['differences']} 项差异 · {s['unreproduced']} 个选定数字未计算",
      design=f"{d['patients']} 位患者 · {d['observedVisits']} 条访视 · {d['absentVisits']} 个缺席访视（按四时点网格）",
      linear=f"恶心强度：计划 14 天访视−基线 β {a['estimate']:.5f}，95% profile CI [{a['lower']:.4f}, {a['upper']:.4f}]。连续作者函数经单处接口兼容适配运行。",
      binary=f"恶心存在：计划 14 天访视相对基线条件 OR {b['estimate']:.4f}，95% Wald CI [{b['lower']:.4f}, {b['upper']:.4f}]。原始 Logistic 作者函数直接运行。",
      legend=f"来源：medplot 公开 EM 数据、发表前作者提交、实际 R 限定复算；{s['matched']} 项一致、{s['differences']} 项差异。两种结局和效应尺度分开，不是因果治疗效应或整篇论文复现。",
      limitation="正文与 SI 冲突保留；原始连续函数失败和兼容运行分列。规则案例测试、数值复算均不等于 AI 测评、方法学认证或真人试用。")

def render_view(record):
    return '/* Derived from 纵向论文结果v2.2.json; no analysis or network request. */\nwindow.LONGITUDINAL_VIEW = '+json.dumps(view(record),ensure_ascii=False,indent=2)+';\n'

def render_report(record):
    v=view(record); a=record['statistics']['linear14']; b=record['statistics']['logistic14']
    lines=['# medplot 限定纵向对照 v2.2','',v['summary']+'。**本次离线 check 只是快照核对；以下数字来自已记录的 R 实际运行。**','',
      v['design']+'。'+v['linear']+' '+v['binary'],'',
      f"计算开始：{record['execution']['startedAt']}；目标冻结：{record['frozenTargets']['frozenAt']}；冻结 SHA-256：`{FROZEN}`。",'',
      '![两种效应尺度与正文 / SI 对照](assets/纵向论文效应图v2.2.png)','',
      '| 对照点 | 原文 | 实算 | 差值 | 预设容差 | 状态 | 原文位置 |','|---|---:|---:|---:|---:|---|---|']
    labels={'MATCH':'一致','DIFFERENCE':'差异','UNREPRODUCED':'未复现'}
    for x in record['comparison']:
        actual='未计算' if x['actual'] is None else f"{x['actual']:.10g}"
        difference='—' if x['difference'] is None else f"{x['difference']:.6g}"
        lines.append(f"| {x['id']} | {x['published']} | {actual} | {difference} | {x['tolerance']} | {labels[x['status']]} | {x['location']} |")
    lines += ['', '## 差异解释与版本边界','',
      '正文 p11 把三次 / 两次访视人数写成 29 / 30；S1 Fig 明确为 30 / 29，公共输入实算与 S1 相同。正文说两个记录的结局缺失，S1 和数据只有基线 Insomnia 一个值缺失。原文可能有叙述或编辑差错，但作者意图未经确认，不替作者订正。',
      '正文 p13 的 OR 区间为 1.02–3.07；S14 为 1.007–3.10，当前作者函数计算与 S14 的舍入一致。不能用舍入解释正文端点的差异，也不能证明正文使用了哪个历史算法。最新提交数据与选定发表前数据逐字节相同（核查 SHA 见来源说明），因此这三类冲突不是这两个数据版本之间的改变。',
      f"日期质量检查：{len(record['diagnostics']['time']['negativeElapsedRows'])} 条访视 Date 早于该患者基线。原始记录不修复、不排除；选定模型按分类 Measurement 拟合，不能据此认证实际日期正确。",
      '原始连续函数因 `lmerTest::summary` 不再导出而失败；本项目保存原错误，仅把该调用换成 `summary`，由 S3 派发到当前 lmerTest 方法。数据、公式、估计方法、CI 算法和冻结目标不改。当前 R 版本的相符不证明恢复了作者 2015 年运行环境。',
      '', '## 已执行与仍需核查','',
      '| 项目 | 实际状态 |','|---|---|',
      '| ID / 结局范围 / 分母 | 患者-时点键、0–10 范围、四时点、变量 NA 与访视缺席分开检查 |',
      '| LMM / GLMM 收敛 | 两个独立同公式诊断拟合均返回优化代码 0、无收敛消息、非奇异；完整梯度 / 方差 / 参数记录在结果对象 |',
      '| 缺失机制与充分诊断 | 未独立确认 MAR、残差 / 随机效应分布、影响点、替代相关结构或敏感性 |',
      '| 全论文 | 其他症状、置换、多重比较、非线性、bootstrap 图表和 GUI 未重跑；不能用27个数字代表整篇 |',
      '| AI / 真人 | 没有调用和评分模型，没有开展初学者试用 |','',
      '[候选与许可](纵向论文候选v2.2.md) · [研究卡片、复跑及方法讨论](纵向论文验证v2.2.md) · [实际结果对象](assets/纵向论文结果v2.2.json)','',
      '署名：Ahlin Č, Stupica D, Strle F, Lusa L (2015). [PLOS ONE 正文与补充材料](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0121760)，CC-BY-4.0；[作者 medplot](https://github.com/crtahlin/medplot) 代码 / 包内数据 GPL-3（单独数据许可未找到）。作者原始文件只在本地忽略目录。','']
    return '\n'.join(lines)

def plot(record):
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from matplotlib import font_manager
    for font in font_manager.fontManager.ttflist:
        if font.name in ('PingFang SC','Heiti TC','Arial Unicode MS'):
            plt.rcParams['font.family']=font.name; break
    plt.rcParams['axes.unicode_minus']=False
    plt.rcParams.update({'figure.facecolor':'#0b1220','axes.facecolor':'#0b1220','text.color':'#eaf2ff','axes.labelcolor':'#eaf2ff','xtick.color':'#a8b7cf','ytick.color':'#a8b7cf','axes.edgecolor':'#45526b'})
    fig,axes=plt.subplots(1,2,figsize=(12,5.2))
    targets={x['id']:x['value'] for x in json.loads(TARGETS.read_text())['targets']}
    for ax,key,prefix,title,ref in [(axes[0],'linear14','linear','恶心强度 · 均值差 β',0),(axes[1],'logistic14','logistic','恶心存在 · 条件 OR',1)]:
        s=record['statistics'][key]
        triples=[(s['estimate'],s['lower'],s['upper']),tuple(targets[prefix+x+'Text'] for x in ('Estimate','Lower','Upper')),tuple(targets[prefix+x+'SI'] for x in ('Estimate','Lower','Upper'))]
        for y,(est,lo,hi) in enumerate(triples):
            color=['#7cf29c','#ffb347','#00d4ff'][y]
            ax.errorbar(est,y,xerr=[[est-lo],[hi-est]],fmt='o',color=color,capsize=5,markersize=7)
            ax.text(.02,y+.2,f'{est:.5g} [{lo:.5g}, {hi:.5g}]',transform=ax.get_yaxis_transform(),fontsize=10,color=color)
        ax.axvline(ref,color='#596881',linestyle='--',linewidth=1)
        ax.set_yticks(range(3),['本轮实算','正文 p13','补充图']);ax.invert_yaxis();ax.set_ylim(2.7,-.7)
        ax.set_title(title,pad=18,fontsize=13); ax.set_xlabel('计划 14 天访视相对基线；患者重复测量')
        ax.spines[['top','right']].set_visible(False)
    fig.suptitle('medplot 纵向论文 · 冻结来源分别对照',fontsize=17,y=.98)
    fig.text(.5,.87,view(record)['design'],ha='center',fontsize=11)
    fig.text(.5,.03,f"27 个选定数字：{record['summary']['matched']} 一致 / {record['summary']['differences']} 差异；连续函数为接口兼容复算。未完成全篇复现。",ha='center',fontsize=11)
    fig.subplots_adjust(left=.12,right=.98,top=.75,bottom=.22,wspace=.42)
    fig.savefig(PLOT,dpi=150);plt.close(fig)

def main():
    action=sys.argv[1] if len(sys.argv)>1 else 'check'
    if action=='build':
        if len(sys.argv)!=3: raise SystemExit('build requires an actual R output path')
        record=json.loads(Path(sys.argv[2]).read_text());validate(record)
        record['recordBuilder']=dict(path='scripts/纵向结果v2.2.py',sha256=sha(Path(__file__)),
           kind='imports actual R computation, derives views; no additional statistical fitting')
        record['data']=json.loads(SOURCES.read_text())['files']
        RESULT.write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
        VIEW.write_text(render_view(record));REPORT.write_text(render_report(record));plot(record)
        paths=[RESULT,VIEW,REPORT,PLOT,SOURCES,ROOT/'config/文献检索环境锁v2.2.txt',ROOT/'scripts/获取纵向论文v2.2.py',ROOT/'scripts/纵向环境恢复v2.2.R',ROOT/'scripts/纵向重跑v2.2.sh']
        AUDIT.write_text(json.dumps(dict(schemaVersion='2.2',kind='derived artifact hashes; not a new recomputation',
            files=[dict(path=str(p.relative_to(ROOT)),sha256=sha(p)) for p in paths]),ensure_ascii=False,indent=2)+'\n')
    elif action=='check':
        record=json.loads(RESULT.read_text());counts=validate(record)
        require(record['recordBuilder']['sha256'] == sha(Path(__file__)), 'Builder drift')
        require(VIEW.read_text() == render_view(record), 'View differs from result object')
        require(REPORT.read_text() == render_report(record), 'Report differs from result object')
        for x in json.loads(AUDIT.read_text())['files']:
            require(sha(ROOT / x['path']) == x['sha256'], f"Artifact/source drift: {x['path']}")
        print(f"PASS offline longitudinal snapshot: {sum(counts.values())} frozen comparisons; {counts['MATCH']} MATCH / {counts['DIFFERENCE']} DIFFERENCE / {counts['UNREPRODUCED']} UNREPRODUCED. No R model run.")
    else:raise SystemExit('Use build ACTUAL-R-OUTPUT or check')

if __name__=='__main__':main()
