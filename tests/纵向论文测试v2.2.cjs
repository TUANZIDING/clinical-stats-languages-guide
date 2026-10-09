const test = require('node:test');
const assert = require('node:assert/strict');
const card = require('../docs/研究卡片v2.2.js');
// Manually encoded published design. This is a rule regression check, not an AI
// answer benchmark, blinded external validation, or an actual learner trial.
const continuous = {
  question:'EM 患者第 14 天相对基线的平均恶心强度差是多少？',population:'公开 EM 成人纵向示例',
  comparator:'Measurement 14 相对 0',outcomeName:'过去一周恶心 VAS',outcomeUnit:'0–10',
  goal:'associate',design:'cohort',sampling:'simple',outcome:'continuous',estimand:'coefficient',
  predictor:'categorical',unit:'person',unitDetail:'PersonID 是患者，访视行不独立',structure:'repeated',
  sampleTotal:'225',effectScope:'conditional',timeOrigin:'入组 / 基线诊断',outcomeTime:'计划 0/14/180/365 天，主要对比14−0',
  adjust:'no',adjustBasis:'复算作者单一时点类别固定效应和患者随机截距；非因果推断',
  missing:'some',missingBasis:'区分缺席访视和记录中结局 NA；作者逐结局 na.omit，缺失机制未证实'
};
const binary = {...continuous,outcome:'binary',estimand:'oddsRatio',outcomeName:'恶心是否存在',outcomeUnit:'Nausea>0 为1，0为0',eventInfo:'unknown'};
const names=r=>r.candidates.map(x=>x.name).join('；');

test('Published repeated VAS design triggers dependence, missing-visit, time coding and multiplicity reminders',()=>{
  const r=card.recommend(continuous),text=r.diagnostics.join(' ');
  assert.equal(r.level,'review'); assert.match(names(r),/混合模型/); assert.doesNotMatch(names(r),/Welch|独立 t/);
  assert.match(text,/对象计.*访视行数/); assert.match(text,/访视缺席.*变量缺失/);
  assert.match(text,/类别.*连续值.*参考时点/); assert.match(text,/多重性/);
});
test('Subject-specific OR is not silently matched to ordinary GEE',()=>{
  const r=card.recommend(binary);
  assert.match(names(r),/条件 OR/); assert.doesNotMatch(names(r),/GEE/);
  assert.match(r.diagnostics.join(' '),/OR 不是 RR 或 HR/);
  assert.match(r.diagnostics.join(' '),/奇异拟合.*梯度.*区间算法/);
  assert.ok(r.gaps.some(x=>x.field==='eventInfo')); assert.ok(r.gaps.some(x=>x.field==='events'));
});
test('Marginal OR keeps GEE and an explicitly marginalized alternative, never raw GLMM OR',()=>{
  const r=card.recommend({...binary,effectScope:'marginal'});
  assert.match(names(r),/GEE/); assert.match(names(r),/积分.*标准化/);
  assert.ok(r.candidates.some(x=>x.conditions.some(c=>/积分.*标准化/.test(c))));
});
test('Unknown effect level remains a gap with separately labeled model discussions',()=>{
  const r=card.recommend({...binary,effectScope:'unknown'});
  assert.ok(r.gaps.some(x=>x.field==='effectScope')); assert.match(names(r),/GEE/);
  assert.match(names(r),/混合模型/); assert.equal(r.level,'review');
});
test('Unknown repeated structure blocks ordinary independent defaults',()=>{
  const r=card.recommend({...continuous,structure:'unknown'});
  assert.equal(r.level,'incomplete'); assert.deepEqual(r.candidates,[]);
});
test('Unknown estimand and missingness stay unresolved despite a published citation',()=>{
  const r=card.recommend({...continuous,estimand:'unknown',missing:'unknown'});
  assert.equal(r.level,'incomplete'); assert.deepEqual(r.candidates,[]);
  assert.ok(r.gaps.some(x=>x.field==='estimand')); assert.ok(r.gaps.some(x=>x.field==='missing'));
});
test('Sparse longitudinal binary data do not bypass convergence and Wald caveats',()=>{
  const r=card.recommend({...binary,eventInfo:'sparse',events:'0'});
  assert.equal(r.level,'review'); assert.match(r.conditions.join(' '),/可识别性.*常规 Wald/);
  assert.match(r.diagnostics.join(' '),/分离/);
});
test('A free-text claim of 812 patients cannot be verified by a rule engine',()=>{
  const r=card.recommend({...continuous,sampleTotal:'812'});
  assert.match(r.diagnostics.join(' '),/独立样本量按对象计/);
  assert.match(r.conditions.join(' '),/已由研究者核查/);
  // The rule does not have a dataset; it must not certify the supplied n.
  assert.equal(r.level,'review');
});
