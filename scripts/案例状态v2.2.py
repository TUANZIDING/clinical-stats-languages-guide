"""Derive a six-axis case status register; offline checks never execute analysis."""
import html
import json
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
BUNDLE=ROOT/'docs/assets/分析结果v2.2.json'
LONG=ROOT/'docs/assets/纵向论文结果v2.2.json'
RECORD=ROOT/'docs/assets/案例验证状态v2.2.json'
VIEW=ROOT/'docs/assets/案例验证状态v2.2.js'
REPORT=ROOT/'docs/案例验证状态v2.2.md'
COLUMNS=['材料核查','代码运行','数值对照','诊断核查','独立专家审阅','真人试用']

def cell(state,detail):return dict(state=state,detail=detail)

def derive(bundle,long):
    cases=bundle['cases']; n=cases['nhanes']; check=n['execution']['comparison']; counts=long['summary']
    rows=[]
    def add(identifier,name,evidence,values):
        rows.append(dict(id=identifier,name=name,evidence=evidence,statuses=dict(zip(COLUMNS,values+[
            cell('待核查','未取得独立统计专家审阅 / 签字。'),cell('待核查','未开展真人学习或研究操作试用。')]))))
    add('small','24 例独立模拟教学','assets/统一结果报告v2.2.md',[
        cell('已核查','项目模拟 CSV、字典、冻结值及代码哈希；不是论文材料。'),
        cell('限定已运行','Python / base R 实际重算；C++ 单列工程验收；SAS 未运行。'),
        cell('限定一致',f"A/B={cases['small']['denominators']['A']}/{cases['small']['denominators']['B']}；10 个冻结值，另核对报告来源。"),
        cell('部分核查','分母、方向、有限值 / 区间核对；独立性为教学设定，未作真人诊断。')])
    add('clinical','96 例含缺失模拟教学','assets/统一结果报告v2.2.md',[
        cell('已核查','项目模拟输入、变量定义及哈希；基线与结局分开。'),
        cell('限定已运行','Python / base R：摘要、Welch、Shapiro、中位数 Levene；可选工具未全部运行。'),
        cell('限定一致',f"总数96；结局A/B={cases['clinical']['denominators']['A']}/{cases['clinical']['denominators']['B']}；R/Python 76 个值核对。"),
        cell('部分核查','缺失分母、分布、异常值讨论；未独立确认缺失机制，未做调整 / 敏感性模型。')])
    add('nhanes','Nickels 2019 · NHANES 横断面','论文验证v2.1.md',[
        cell('限定已核查','完整文章 / SI、本地 15 个公共 XPT、固定作者提交；作者代码无明确许可，不复制或执行。'),
        cell('限定已运行','本项目 R 实现的四个调查模型；原作者 Rmd 未执行。'),
        cell('限定一致',f"{check['passed']}/{check['total']} 个冻结数字；n={n['denominators']['analyzed']}。默认 t 区间 {check['currentDefault']['passed']}/32 端点一致，其余保留。"),
        cell('部分核查','PSU / 分层 / 权重、自由度、排除流程、收敛核对；残差 / 非线性 / 缺失敏感性待核查。')])
    add('medplot','Ahlin 2015 · 重复随访','纵向论文验证v2.2.md',[
        cell('限定已核查','全文和19项SI本地归档；固定作者提交，CC-BY-4.0 / GPL-3 分开；未证明提交是论文实际执行版。'),
        cell('限定已运行','原 Logistic 函数运行；连续原函数报错留存，单处接口兼容后运行。'),
        cell('差异保留',f"{counts['matched']}/{counts['total']} 一致，{counts['differences']} 差异；225患者 / 812访视 / 88缺席；不是整篇复现。"),
        cell('部分核查','患者-时点、变量NA / 缺席、日期异常、优化 / 奇异核对；MAR、残差、随机效应与替代模型待核查。')])
    add('birthweight','Fieß 2017 · 出生体重与角膜','论文验证v2.1.md',[
        cell('限定已核查','全文 / SI / 勘误、作者代码与公共数据入口；材料取得不等于模型复现。'),
        cell('待核查','公共数据已取得；选定作者 / 本项目模型尚未运行。'),
        cell('待核查','未冻结并实际对照本篇模型结果。'),
        cell('待核查','仅讨论缺失盎司填0等源码风险；没有已执行模型诊断。')])
    add('exposome','Patel 2026 · 暴露组图谱','论文验证v2.1.md',[
        cell('限定已核查','全文 / SI / 作者包 / Figshare 元数据；本轮未下载约13GB两数据库。'),
        cell('待核查','完整作者管线未运行；不得用材料核对替代计算。'),
        cell('待核查','没有完成本篇数值对照。'),
        cell('待核查','复杂抽样、多重性、跨周期仅作方法情境讨论。')])
    return dict(schemaVersion='2.2',scope='本地 v2.2 审阅版；按案例和证据范围记录，不是认证或排行',columns=COLUMNS,cases=rows,
        ai=cell('待核查','未调用、盲评或测量大模型的统计选择正确率。规则测试与数值复算不等于 AI 测评。'),
        boundary='限定一致只适用于冻结目标和记录算法；所有论文均未完成整篇重跑，独立专家审阅和真人试用仍待核查。')

def validate(record,bundle,long):
    if record!=derive(bundle,long):raise ValueError('Case state drift / unsupported completion claim')
    if long['summary']['differences']!=5 or long['summary']['matched']!=22:raise ValueError('Retained comparisons changed; inspect actual evidence')
    for row in record['cases']:
        if list(row['statuses'])!=COLUMNS:raise ValueError('Missing audit axis')
        if not (ROOT/'docs'/row['evidence']).is_file():raise ValueError('Missing case evidence')
    return record

def markdown(r):
    lines=['# 案例验证状态 v2.2','',r['scope']+'。','',r['boundary'],'','| 案例 | '+' | '.join(COLUMNS)+' |','|---|'+ '---|'*len(COLUMNS)]
    for row in r['cases']:
        vals=[s['state']+'：'+s['detail'] for s in row['statuses'].values()]
        lines.append('| ['+row['name']+']('+row['evidence']+') | '+' | '.join(vals)+' |')
    lines+=['','AI 测评：'+r['ai']['state']+'。'+r['ai']['detail'],'',
        '状态来自 [共同结果对象](assets/分析结果v2.2.json)、[纵向结果对象](assets/纵向论文结果v2.2.json)及已有材料记录。JSON、网页表和本表由同一生成器派生；离线 check 只核对保存证据，不拟合模型。',
        '', '[本轮实际重跑及工程 / 界面记录](综合核查v2.2.md)。文章和 SI 继续保留在本地忽略目录，没有因新增状态表而转入公开仓库。','']
    return '\n'.join(lines)

def javascript(r):return '/* Derived case status register; no AI or analysis execution. */\nwindow.CASE_STATUS_VIEW = '+json.dumps(r,ensure_ascii=False,indent=2)+';\n'

def main():
    b=json.loads(BUNDLE.read_text());l=json.loads(LONG.read_text());r=derive(b,l)
    if len(sys.argv)>1 and sys.argv[1]=='build':
        validate(r,b,l);RECORD.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');VIEW.write_text(javascript(r));REPORT.write_text(markdown(r));print('Built six-axis register for 6 cases')
    else:
        validate(json.loads(RECORD.read_text()),b,l)
        if VIEW.read_text()!=javascript(r) or REPORT.read_text()!=markdown(r):raise ValueError('Status views differ from result evidence')
        print('PASS: six cases / six evidence axes; saved status checks only, no calculation or expert / human sign-off')
if __name__=='__main__':main()
