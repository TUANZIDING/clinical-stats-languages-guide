const test = require('node:test');
const assert = require('node:assert/strict');
const card = require('../docs/研究卡片v2.2.js');
// Independently stated teaching scenario; not the UI preset or a patient dataset.
const base = {question:'两组第 28 天的结局均值相差多少？',population:'假设的成年教学对象',comparator:'A 相对于 B，A−B',outcomeName:'第 28 天收缩压',outcomeUnit:'mmHg',goal:'compare',design:'cohort',sampling:'simple',outcome:'continuous',estimand:'meanDifference',unit:'person',structure:'independent',groups:'two',adjust:'no',adjustBasis:'只讨论预设未调整均值差，不作因果解释。',missing:'none',distribution:'approx',sampleTotal:'100',sampleA:'50',sampleB:'50',timeOrigin:'入组',outcomeTime:'入组后 28 天'};
const binary = {...base,outcome:'binary',estimand:'oddsRatio',outcomeName:'28 天阳性状态',outcomeUnit:'阴性=0，阳性=1',events:'20',eventInfo:'checked'};
const names = r=>r.candidates.map(x=>x.name).join('；');
const gap = (r,key)=>r.gaps.some(x=>x.field===key);

test('Empty card retains unknown target/unit/sampling and produces no matched method',()=>{
  const r=card.recommend({}); assert.equal(r.level,'incomplete'); assert.deepEqual(r.candidates,[]);
  for (const key of ['estimand','unit','structure','sampling']) assert.ok(gap(r,key));
  assert.equal(r.target,'待补充');
});
test('Known design categories alone cannot silently stand in for an estimand',()=>{
  for (const estimand of ['', 'unknown','unsupported']) {
    const r=card.recommend({...base,estimand}); assert.equal(r.level,'incomplete'); assert.deepEqual(r.methods,[]);
  }
});
test('Unknown sampling/dependence/unit blocks ordinary independent recommendations',()=>{
  for (const key of ['sampling','structure','unit','design']) {
    const r=card.recommend({...base,[key]:'unknown'});
    assert.deepEqual(r.methods,[]); assert.ok(gap(r,key)); assert.equal(r.level,'incomplete');
  }
});
test('An incompatible outcome/goal/target combination is an explicit gap',()=>{
  for (const input of [{...base,estimand:'oddsRatio'},{...base,goal:'predict'},{...base,goal:'describe'}]) {
    const r=card.recommend(input); assert.deepEqual(r.candidates,[]); assert.ok(gap(r,'estimand'));
  }
});
test('Independent mean comparison allows two candidates that retain the mean target',()=>{
  const r=card.recommend(base); assert.equal(r.level,'candidate'); assert.equal(r.candidates.length,2);
  assert.match(names(r),/Welch/); assert.doesNotMatch(names(r),/Wilcoxon|中位数|秩/);
  assert.ok(r.candidates.every(x=>x.target==='均值差'));
});
test('Paired continuous data use differences and retain pairs for alternative inference',()=>{
  const r=card.recommend({...base,structure:'paired',pairs:'50',sampleA:'',sampleB:''});
  assert.match(names(r),/配对 t/); assert.doesNotMatch(names(r),/Welch/);
  assert.match(r.diagnostics.join(' '),/逐对差值/); assert.match(names(r),/保留配对/);
});
test('Paired binary risk change distinguishes effect estimation from McNemar testing',()=>{
  const r=card.recommend({...binary,structure:'paired',estimand:'riskDifference',pairs:'50',discordant:'3',sampleA:'',sampleB:''});
  assert.match(names(r),/配对比例差/); assert.match(names(r),/McNemar.*精确/);
  assert.doesNotMatch(names(r),/独立|Fisher/);
  assert.match(r.candidates.find(x=>/McNemar/.test(x.name)).target,/CI 需另估计/);
});
test('Paired binary totals cannot replace discordant pairs',()=>{
  const r=card.recommend({...binary,structure:'paired',estimand:'riskDifference',pairs:'50',sampleA:'',sampleB:''});
  assert.ok(gap(r,'discordant')); assert.equal(r.level,'review');
});
test('Adjusted or multi-condition paired binary data do not use a simple independent model',()=>{
  const multi=card.recommend({...binary,structure:'paired',groups:'multi'});
  assert.equal(multi.level,'incomplete'); assert.deepEqual(multi.candidates,[]);
  const r=card.recommend({...binary,structure:'paired',adjust:'yes',adjustBasisType:'plan'});
  assert.match(names(r),/配对/); assert.doesNotMatch(names(r),/独立 2×2|^Logistic|McNemar/);
});
test('Complex survey means retain weighting, variance and domain checks',()=>{
  const r=card.recommend({...base,sampling:'survey',surveyBasis:'组件权重、分层和 PSU 来源待逐项核查'});
  assert.match(names(r),/调查/); assert.doesNotMatch(names(r),/Welch/);
  assert.match(r.diagnostics.join(' '),/PSU.*domain/); assert.equal(r.level,'review');
});
test('Survey with repeated observations must address both designs',()=>{
  const r=card.recommend({...base,sampling:'survey',structure:'repeated'});
  assert.match(r.checks.join(' '),/两种结构/); assert.match(r.diagnostics.join(' '),/相关结构/);
  assert.doesNotMatch(names(r),/Welch/);
});
test('Survey risk ratio does not silently become ordinary Logistic OR or Fisher',()=>{
  const r=card.recommend({...binary,sampling:'survey',estimand:'riskRatio',eventInfo:'sparse'});
  assert.match(names(r),/调查设计.*RD 或 RR/); assert.doesNotMatch(names(r),/Logistic|Fisher/);
});
test('Repeated and clustered observations allow distinct model discussions',()=>{
  for (const structure of ['repeated','clustered']) {
    const r=card.recommend({...base,structure,clusters:structure==='clustered'?'8':''});
    assert.match(names(r),/混合模型/); assert.match(names(r),/GEE/); assert.doesNotMatch(names(r),/Welch/);
    assert.ok(gap(r,'effectScope')); assert.equal(r.level,'review');
  }
});
test('Sparse independent binary OR flags unstable inference and conditional exact options',()=>{
  const r=card.recommend({...binary,eventInfo:'sparse',events:'3'});
  assert.equal(r.level,'review'); assert.match(names(r),/Fisher/);
  assert.match(r.conditions.join(' '),/常规 Wald/); assert.match(r.diagnostics.join(' '),/分离/);
});
test('Zero events trigger review without using a universal events-per-variable cutoff',()=>{
  const r=card.recommend({...binary,events:'0'}); assert.equal(r.level,'review');
  assert.match(r.conditions.join(' '),/零事件/); assert.doesNotMatch(names(r),/Fisher/);
  assert.equal(card.recommend({...binary,events:'3'}).level,'candidate'); // No magical cutoff; checks remain.
});
test('Invalid counts and inconsistent denominators cannot yield a matched plan',()=>{
  for (const input of [{...binary,events:'101'}, {...base,sampleTotal:'99'}, {...base,sampleA:'3.5'}, {...base,sampleTotal:'Infinity'}, {...base,sampleA:'-1'}]) {
    assert.equal(card.recommend(input).level,'incomplete'); assert.deepEqual(card.recommend(input).methods,[]);
  }
  const r=card.recommend({...binary,structure:'paired',pairs:'10',discordant:'11'}); assert.ok(gap(r,'discordant'));
});
test('Prediction without prediction time or horizon does not choose an algorithm',()=>{
  const c={...binary,goal:'predict',estimand:'prediction'};
  for (const input of [c,{...c,predictionTime:'入院时'},{...c,predictionHorizon:'30 天'}]) {
    const r=card.recommend(input); assert.equal(r.level,'incomplete'); assert.deepEqual(r.methods,[]);
  }
});
test('Specified prediction timing still requires leakage-safe validation and calibration',()=>{
  const r=card.recommend({...binary,goal:'predict',estimand:'prediction',predictionTime:'入院时已知特征',predictionHorizon:'入院后 30 天'});
  assert.equal(r.level,'review'); assert.match(r.diagnostics.join(' '),/训练数据.*校准/);
  assert.ok(r.sources.includes('tripod')); assert.doesNotMatch(names(r),/Welch/);
});
test('Risk ratio and risk difference do not silently become Logistic OR',()=>{
  for (const estimand of ['riskDifference','riskRatio']) {
    const r=card.recommend({...binary,estimand}); assert.doesNotMatch(names(r),/Logistic|Fisher/);
    assert.ok(r.candidates.every(x=>x.target.includes(estimand==='riskRatio'?'RR':'比例差')));
  }
});
test('Case-control sample fractions cannot directly estimate risks',()=>{
  for (const estimand of ['riskDifference','riskRatio']) {
    const r=card.recommend({...binary,design:'casecontrol',estimand}); assert.deepEqual(r.methods,[]); assert.ok(gap(r,'estimand'));
  }
  assert.match(names(card.recommend({...binary,design:'casecontrol'})),/OR/);
});
test('Quantile targets are not replaced by mean or generic rank tests',()=>{
  const r=card.recommend({...base,estimand:'medianDifference',estimandDetail:'A−B 的 0.5 分位数差'});
  assert.match(names(r),/分位数/); assert.doesNotMatch(names(r),/Welch|Wilcoxon|Kruskal/); assert.equal(r.level,'review');
});
test('Normality P values cannot alter the predefined mean target',()=>{
  const a=card.recommend({...base,normalityP:'0.99'}),b=card.recommend({...base,normalityP:'0.000001'});
  assert.deepEqual(a.candidates,b.candidates);
  const skew=card.recommend({...base,distribution:'skew'}); assert.equal(skew.level,'review');
  assert.match(names(skew),/Welch/); assert.doesNotMatch(names(skew),/Wilcoxon/);
});
test('Univariate P screening is an unresolved adjustment basis, not an approved covariate set',()=>{
  const r=card.recommend({...base,adjust:'yes',adjustBasisType:'univariate',adjustBasis:'按单因素 P<0.05 选择'});
  assert.ok(gap(r,'adjustBasisType')); assert.equal(r.level,'review'); assert.match(r.checks.join(' '),/不足以论证/);
});
test('Regression coefficient target excludes correlation as a surrogate',()=>{
  const r=card.recommend({...base,goal:'associate',predictor:'continuous',estimand:'coefficient'});
  assert.match(names(r),/回归/); assert.doesNotMatch(names(r),/Pearson|Spearman/);
});
test('HR target is not assigned to Kaplan-Meier description',()=>{
  const r=card.recommend({...base,outcome:'survival',estimand:'hazardRatio',events:'20'});
  assert.match(names(r),/Cox/); assert.doesNotMatch(names(r),/Kaplan/);
});
test('Survey and correlated event-time probability targets do not become HR models',()=>{
  for (const change of [{sampling:'survey'},{structure:'clustered',clusters:'8'}]) {
    const r=card.recommend({...base,outcome:'survival',estimand:'survivalProbability',events:'20',...change});
    assert.match(names(r),/生存概率/); assert.doesNotMatch(names(r),/HR|frailty|Cox/);
  }
  const zero=card.recommend({...base,outcome:'survival',estimand:'hazardRatio',events:'0'});
  assert.match(zero.conditions.join(' '),/零事件.*可识别性/);
});
test('Correlation with survey or repeated structure is not a regression coefficient',()=>{
  for (const change of [{sampling:'survey'},{structure:'repeated'}]) {
    const r=card.recommend({...base,goal:'associate',predictor:'continuous',estimand:'correlation',...change});
    assert.match(names(r),/相关系数/); assert.doesNotMatch(names(r),/线性模型|^混合模型|^GEE/);
  }
});
test('Repeated descriptive questions retain description rather than an effect model',()=>{
  const r=card.recommend({...base,goal:'describe',estimand:'summary',structure:'repeated'});
  assert.match(names(r),/点图|描述/); assert.doesNotMatch(names(r),/混合模型|GEE/);
  assert.match(r.candidates[0].conditions.join(' '),/区间.*相关结构/);
});
test('Invalid category codes including inherited names remain missing',()=>{
  for (const key of ['goal','design','sampling','unit','estimand','structure','missing','adjust']) {
    for (const value of ['__proto__','toString','not-a-category']) {
      const r=card.recommend({...base,[key]:value}); assert.equal(r.level,'incomplete'); assert.deepEqual(r.methods,[]);
    }
  }
});
test('Missing adjustment or missingness remains unknown, never no adjustment/complete cases',()=>{
  for (const key of ['adjust','missing']) {
    const r=card.recommend({...base,[key]:'unknown'}); assert.equal(r.level,'incomplete'); assert.deepEqual(r.methods,[]);
  }
  const r=card.recommend({...base,missing:'some'}); assert.ok(gap(r,'missingBasis')); assert.equal(r.level,'review');
});
test('Unknown text stays unknown and a changed goal excludes stale hidden choices',()=>{
  const r=card.recommend({...base,population:'待补充'}); assert.ok(gap(r,'population'));
  const c=card.normalize({...base,goal:'describe',estimand:'summary',predictionTime:'出院后',adjust:'yes',adjustBasisType:'univariate'});
  assert.equal(c.adjust,''); assert.equal(c.predictionTime,''); assert.equal(c.groups,'');
  const md=card.toMarkdown(c); assert.doesNotMatch(md,/出院后|调整依据类型：/);
  const paired=card.normalize({...base,structure:'paired',pairs:'50',estimandDetail:'旧的中位数目标',adjustBasisType:'univariate'});
  assert.equal(paired.sampleA,''); assert.equal(paired.sampleB,''); assert.equal(paired.estimandDetail,''); assert.equal(paired.adjustBasisType,'');
});
test('Export and AI prompt retain provenance, unknowns, conditional candidates and verification limits',()=>{
  const r=card.recommend({...base,timeOrigin:'',sampleTotal:'',sampleA:'',sampleB:''});
  const md=card.toMarkdown(r.card,r),prompt=card.makePrompt(r.card,r);
  assert.match(md,/时间起点：待补充/); assert.match(md,/独立对象总数：待补充/);
  for (const candidate of r.candidates) assert.ok(md.includes(candidate.name));
  assert.match(md,/诊断步骤（未执行）/); assert.match(md,/工程检查、数值复现、方法学评价、AI 测评和真人试用/);
  assert.match(prompt,/不要直接分析真实患者数据/); assert.match(prompt,/不按正态性 P 值/);
  for (const key of r.sources) assert.ok(card.sources[key]?.[1].startsWith('https://'));
});

test('Multi-condition input labeled paired is unresolved, not ordinary ANOVA',()=>{
  for (const outcome of ['continuous','binary']) {
    const r=card.recommend({...base,outcome,estimand:outcome==='continuous'?'meanDifference':'oddsRatio',structure:'paired',groups:'multi',pairs:'50'});
    assert.equal(r.level,'incomplete'); assert.deepEqual(r.candidates,[]); assert.ok(gap(r,'structure'));
    assert.match(r.checks.join(' '),/重复测量.*不能使用普通独立/);
  }
  const r=card.recommend({...base,groups:'multi',structure:'repeated',effectScope:'marginal'});
  assert.match(names(r),/混合模型|GEE/); assert.doesNotMatch(names(r),/Welch ANOVA/);
});
test('Survey plus correlated binary outcome preserves effect level and unresolved joint design',()=>{
  for (const structure of ['repeated','clustered']) for (const effectScope of ['conditional','marginal','unknown']) {
    const r=card.recommend({...binary,sampling:'survey',surveyBasis:'需核对权重层级及 PSU',structure,effectScope,clusters:'8'});
    assert.equal(r.level,'review'); assert.match(names(r),/同时尊重复杂抽样.*专门方案/);
    assert.doesNotMatch(names(r),/调查加权 Logistic|^GEE|^Logistic 混合模型/);
    assert.match(r.candidates[0].target,/OR/);
    assert.match(r.candidates[0].target,effectScope==='conditional'?/条件效应/:effectScope==='marginal'?/人群平均效应/:/待补充/);
    assert.match(r.candidates[0].conditions.join(' '),/权重进入哪一层/);
  }
});
