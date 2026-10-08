"""Rebuild original educational figures from the same explicitly synthetic CSV."""
import json
import sys
from pathlib import Path
from xml.sax.saxutils import escape
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.font_manager import FontProperties
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'examples/python'))
from welch_demo import analyze

ASSETS = ROOT / 'docs/assets'
ASSETS.mkdir(parents=True, exist_ok=True)
result = analyze()
(ROOT / 'data/expected-results.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
(ASSETS / 'demo-result.js').write_text('window.DEMO_RESULT = '+json.dumps(result)+';\n',encoding='utf-8')
rows = np.genfromtxt(ROOT / 'data/synthetic-independent.csv',delimiter=',',names=True,dtype=None,encoding='utf-8')
groups = [rows['value'][rows['group']==g] for g in ('A','B')]
font_candidates = ['/System/Library/Fonts/PingFang.ttc','/System/Library/Fonts/Supplemental/Arial Unicode.ttf','/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc']
font_path = next((p for p in font_candidates if Path(p).exists()),None)
fp = FontProperties(fname=font_path) if font_path else FontProperties(family='DejaVu Sans')
INK,TEAL,SOFT,LINE,PAPER = '#123044','#007965','#536874','#d7e0da','#fafbf7'
fig, axes = plt.subplots(1,2,figsize=(12,5.06667),dpi=150,gridspec_kw={'width_ratios':[1.3,1]})
fig.patch.set_facecolor('white')
for ax in axes:
    ax.set_facecolor('white')
    for spine in ['top','right']: ax.spines[spine].set_visible(False)
    for spine in ['bottom','left']: ax.spines[spine].set_color(LINE)
    ax.tick_params(colors=SOFT,labelsize=10,length=0,pad=10)
    ax.grid(False)
left,right=axes
jitter=np.array([-.08,.02,.12,-.15,.06,-.04,.16,-.13,.10,-.02,.04,-.10])
for i,(values,color) in enumerate(zip(groups,[INK,TEAL])):
    left.scatter(i+jitter,values,s=45,color=color,zorder=3)
    left.plot([i-.22,i+.22],[values.mean()]*2,color=color,linewidth=2.5,zorder=4)
left.set_xlim(-.7,1.7);left.set_ylim(105,145)
left.set_xticks([0,1],['A  (n=12)','B  (n=12)'])
left.set_ylabel('Simulated value / arbitrary units',color=SOFT,fontsize=10)
left.set_title('01 / Independent synthetic observations',loc='left',color=INK,fontsize=12,pad=20)
right.axvline(0,color=SOFT,linestyle='--',linewidth=1)
right.errorbar(result['difference'],0,xerr=[[result['difference']-result['ci_low']],[result['ci_high']-result['difference']]],fmt='o',markersize=9,capsize=7,color=TEAL,elinewidth=3)
right.set_xlim(-3,17);right.set_ylim(-.75,.75);right.set_yticks([])
right.spines['left'].set_visible(False)
right.set_xlabel('Mean difference (A minus B)',color=SOFT,fontsize=10,labelpad=16)
right.set_title('02 / Estimate + 95% confidence interval',loc='left',color=INK,fontsize=12,pad=20)
right.text(result['difference'],.32,f"{result['difference']:.2f}  [{result['ci_low']:.2f}, {result['ci_high']:.2f}]",ha='center',color=TEAL,fontsize=12)
right.text(.43,.08,f"Two-sided Welch t-test\np = {result['p_value']:.4f}",transform=right.transAxes,color=SOFT,fontsize=10,linespacing=1.8)
fig.text(.06,.94,'SIMULATED DATA / TEACHING ONLY',fontfamily='monospace',fontsize=10,color=TEAL)
fig.text(.06,.025,'人为构造教学数据 · 非患者数据 · 不证明临床疗效',fontproperties=fp,fontsize=10,color=SOFT)
fig.subplots_adjust(left=.07,right=.97,top=.80,bottom=.21,wspace=.30)
fig.savefig(ASSETS / 'welch-demo.png',dpi=150)
fig.savefig(ASSETS / 'welch-demo.svg')
plt.close(fig)

def svg_doc(w,h,body,dark=False):
    bg=INK if dark else PAPER
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img"><rect width="{w}" height="{h}" fill="{bg}"/><g font-family="Avenir Next,PingFang SC,Microsoft YaHei,sans-serif">{body}</g></svg>'

def text(x,y,s,size=16,color=INK,extra=''):
    return f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}" {extra}>{escape(s)}</text>'

def write(name,w,h,body,dark=False):
    (ASSETS/name).write_text(svg_doc(w,h,body,dark),encoding='utf-8')

hero=text(32,34,'01 / INDEPENDENT OBSERVATIONS',11,SOFT,extra='letter-spacing="1"')
hero+=text(32,66,'同一目标，两种工具，也应得到同一估计。',20)
for i,(values,color) in enumerate(zip(groups,[INK,TEAL])):
    x=120+i*200
    for j,v in enumerate(values):
        y=270-(v-105)*4.1
        hero+=f'<circle cx="{x+jitter[j]*260:.2f}" cy="{y:.2f}" r="5.5" fill="{color}"/>'
    my=270-(values.mean()-105)*4.1
    hero+=f'<path d="M{x-49},{my:.2f}h98" stroke="{color}" stroke-width="2"/>'
    hero+=text(x-35,300,f'{"AB"[i]} · n=12',13,SOFT)
hero+=f'<path d="M470,110v200" stroke="{LINE}"/>'
hero+=text(500,132,'A − B',14,SOFT)+text(498,170,f"{result['difference']:.2f}",32,TEAL)
hero+=text(498,208,'95% CI',11,SOFT)+text(498,233,f"[{result['ci_low']:.2f}, {result['ci_high']:.2f}]",13,TEAL)
hero+=text(498,272,'双侧 Welch',11,SOFT)+text(498,293,f"P = {result['p_value']:.4f}",13)
hero+=text(32,365,'SIMULATED / A−B / EFFECT + UNCERTAINTY',10,SOFT,extra='letter-spacing="1"')
write('hero-chart.svg',640,400,hero)

path_body=''
for i,s in enumerate(['研究问题','设计 + 结构','候选方法']):
    x=10+i*163
    path_body+=f'<rect x="{x}" y="34" width="142" height="69" rx="6" fill="white" stroke="{LINE}"/>'
    path_body+=text(x+15,61,f'0{i+1}',10,TEAL)+text(x+15,86,s,16)
    if i<2:path_body+=f'<path d="M{x+148},68h10m-4,-4l4,4l-4,4" fill="none" stroke="{TEAL}"/>'
write('question-path.svg',500,135,path_body)

cover=''
cover+=text(60,58,'CLINICAL STATISTICS / A CHECKABLE LEARNING GUIDE',14,'#bcd8ca',extra='letter-spacing="2"')
cover+=text(60,128,'医学科研统计选择指南',48,'#ffffff',extra='font-weight="600"')
cover+=text(60,178,'从研究问题出发，让方法、工具与 AI 各司其职。',23,'#d4e9de')
cover+=text(60,229,'零编程起步  /  图文教程  /  离线向导  /  模拟代码',15,'#bcd8ca')
for i,s in enumerate(['研究问题','研究设计','候选方法','核查复现']):
    x=60+i*282
    cover+=f'<rect x="{x}" y="292" width="249" height="97" rx="7" fill="#1c3e51" stroke="#536874"/>'
    cover+=text(x+20,321,f'0{i+1}',11,'#bcd8ca')+text(x+20,357,s,23,'#ffffff')
    if i<3:cover+=f'<path d="M{x+256},338h18m-6,-6l6,6l-6,6" fill="none" stroke="#d4e9de" stroke-width="1.5"/>'
cover+=text(60,449,'R · Python · SAS · C++  /  AI HELPS YOU ASK BETTER QUESTIONS',12,'#bcd8ca',extra='letter-spacing="1"')
write('cover.svg',1240,490,cover,dark=True)

flow=''
steps=[('01','确定研究目标','描述 / 比较 / 关联 / 预测 / 因果'),('02','核对设计与单位','独立 / 配对 / 重复 / 聚类'),('03','识别结局与目标量','连续 / 分类 / 计数 / 事件时间'),('04','检查条件和缺口','缺失 / 分布 / 混杂 / 删失'),('05','预定方案并复现','效应 + CI / 诊断 / 代码与版本')]
for i,(num,title,sub) in enumerate(steps):
    y=30+i*113
    flow+=f'<rect x="28" y="{y}" width="844" height="84" rx="6" fill="white" stroke="{LINE}"/>'
    flow+=text(52,y+49,num,21,TEAL)+text(115,y+35,title,23)+text(115,y+63,sub,15,SOFT)
    if i<4:flow+=f'<path d="M450,{y+89}v17m-4,-4l4,4l4,-4" fill="none" stroke="{TEAL}"/>'
flow+=text(28,620,'简化教学流程：候选方法需要结合完整研究设计与专业审核。',15,SOFT)
write('method-flow.svg',900,650,flow)

ai=''
for i,(title,sub) in enumerate([('提供设计','人群 / 单位 / 结局 / 目标量'),('AI 补缺口','先问问题，再比候选'),('模拟核查','检查参数、来源与数值'),('人工确认','定稿方案并保留版本记录')]):
    x=28+i*290
    ai+=f'<rect x="{x}" y="40" width="256" height="130" rx="7" fill="white" stroke="{LINE}"/>'
    ai+=text(x+19,72,f'0{i+1}',12,TEAL)+text(x+19,111,title,25)+text(x+19,145,sub,13,SOFT)
    if i<3:ai+=f'<path d="M{x+264},103h17m-5,-5l5,5l-5,5" fill="none" stroke="{TEAL}"/>'
ai+=text(28,215,'教学工作流；未验证 AI 决策准确性。外部 AI 使用前请核对隐私、机构要求和引用。',15,SOFT)
write('ai-workflow.svg',1200,250,ai)
(ASSETS/'favicon.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="#123044"/><text x="10" y="30" font-family="Georgia,serif" font-size="30" fill="#e7f0ea">Σ</text></svg>',encoding='utf-8')

print(json.dumps(result,indent=2))
print('Rebuilt all original teaching assets from the synthetic CSV.')
