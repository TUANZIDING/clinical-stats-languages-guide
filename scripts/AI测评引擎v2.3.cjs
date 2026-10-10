'use strict';
// Original deterministic contract checks. No provider, fetch, eval or model-graded assertion.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = name => JSON.parse(fs.readFileSync(path.join(ROOT, name), 'utf8'));
const text = x => typeof x === 'string' && x.trim().length > 0;
const list = x => Array.isArray(x) && x.every(text);

function validateFrozenSources(files, readBytes) {
  for (const [file, hash] of Object.entries(files)) if (sha(readBytes(file)) !== hash) throw new Error('Frozen case/source hash changed: ' + file);
}

function validateCases(tuning, holdout, sources) {
  const ids = new Set(), families = new Map(), studies = new Map();
  const sourceIds = new Set(sources.sources.map(x => x.id));
  for (const [split, dataset] of [['tuning', tuning], ['holdout', holdout]]) {
    if (dataset.split !== split || !Array.isArray(dataset.cases) || !dataset.cases.length) throw new Error('Invalid split / empty cases');
    for (const c of dataset.cases) {
      if (!text(c.id) || ids.has(c.id)) throw new Error('Duplicate / invalid case ID');
      ids.add(c.id);
      for (const [key, map] of [['familyId', families], ['sourceStudyId', studies]]) {
        if (!text(c[key])) throw new Error('Missing study / family identity');
        if (map.has(c[key]) && map.get(c[key]) !== split) throw new Error('Study / family leakage across splits: ' + c[key]);
        map.set(c[key], split);
      }
      const r = c.reference;
      if (!text(c.input.question) || !r || !Array.isArray(r.mustAsk) || !r.acceptablePlans?.length || !r.severeErrors?.length || !r.calculationRequirements?.checks?.length) throw new Error('Incomplete reference rubric: ' + c.id);
      // This version has not had statistician review. Do not self-certify by editing one label.
      if (r.review.status !== 'pending-statistician-review' || r.review.reviewer !== null || r.review.reviewDate !== null) throw new Error('v2.3 reference review must remain pending until a new audited review version');
      for (const field of ['unit', 'dependence', 'sampling', 'targetId']) if (!text(c.input.known[field])) throw new Error('Missing known / unknown field');
      for (const id of r.citationRequirements.sourceIds) if (!sourceIds.has(id)) throw new Error('Unknown rubric source');
      if (new Set(r.mustAsk.map(q => q.key)).size !== r.mustAsk.length) throw new Error('Duplicate clarification key');
      if (new Set(r.acceptablePlans.map(p => p.id)).size !== r.acceptablePlans.length) throw new Error('Duplicate method key');
      if (!r.blockingQuestions.every(key => r.mustAsk.some(q => q.key === key))) throw new Error('Blocking question absent from rubric');
      for (const p of r.acceptablePlans) if (!text(p.targetId) || !text(p.basis) || !list(p.conditions) || !p.conditions.length || !list(p.diagnosticRequirements)) throw new Error('Incomplete candidate basis');
      for (const n of r.calculationRequirements.numericTargets) if (!Number.isFinite(n.expected) || !(n.absoluteTolerance >= 0) || !n.sourceSha256 || !Array.isArray(n.pointer)) throw new Error('Invalid frozen numeric target');
    }
  }
  return {cases: ids.size, studies: studies.size, tuningStudies: new Set(tuning.cases.map(c => c.sourceStudyId)).size, holdoutStudies: new Set(holdout.cases.map(c => c.sourceStudyId)).size};
}

function loadSuite() {
  const config = read('config/AI测评配置v2.3.json');
  const suite = {config, tuning: read(config.tuningCases), holdout: read(config.holdoutCases), sources: read(config.sources), freeze: read(config.freeze)};
  if (config.modelCalls !== 'disabled' || config.gradingModel !== 'disabled' || config.accuracyAggregation !== 'disabled') throw new Error('Offline contract cannot enable models or accuracy');
  if (Object.values(config.weights).reduce((a,b) => a+b,0) !== 100) throw new Error('Mechanical weight total must be 100');
  suite.counts = validateCases(suite.tuning, suite.holdout, suite.sources);
  validateFrozenSources(suite.freeze.files,file=>fs.readFileSync(path.join(ROOT,file)));
  for (const split of ['tuning','holdout']) {
    const identities = suite[split].cases.map(c => ({caseId:c.id,familyId:c.familyId,sourceStudyId:c.sourceStudyId}));
    if (JSON.stringify(identities) !== JSON.stringify(suite.freeze.studies[split])) throw new Error('Frozen study identity changed');
  }
  for (const c of [...suite.tuning.cases, ...suite.holdout.cases]) {
    for (const n of c.reference.calculationRequirements.numericTargets) {
      const bytes = fs.readFileSync(path.join(ROOT,n.sourcePath));
      if (sha(bytes) !== n.sourceSha256 || n.pointer.reduce((v,k) => v[k],JSON.parse(bytes)) !== n.expected) throw new Error('Numeric source drift; do not rewrite expected values');
    }
  }
  return suite;
}

function validateOutput(a) {
  if (!a || typeof a !== 'object' || Array.isArray(a)) return false;
  if (!['needs-information','conditional-candidates'].includes(a.decision)) return false;
  if (!['caseId','targetId','unit','dependence','sampling'].every(k => text(a[k]))) return false;
  if (!Array.isArray(a.questions) || !a.questions.every(q => q && text(q.key) && text(q.text) && text(q.why))) return false;
  if (!Array.isArray(a.candidates) || !a.candidates.every(c => c && text(c.methodId) && text(c.targetId) && text(c.rationale) && text(c.direction) && list(c.conditions) && c.conditions.length && list(c.diagnostics) && c.diagnostics.length && list(c.citationIds) && typeof c.provisional === 'boolean')) return false;
  if (!Array.isArray(a.citations) || !a.citations.every(c => c && text(c.sourceId) && text(c.url) && text(c.title) && text(c.claim) && c.status === 'provided-unverified')) return false;
  if (!a.calculation || !['not-run','reported-from-source'].includes(a.calculation.status) || !list(a.calculation.checks) || !Array.isArray(a.calculation.values)) return false;
  if (!a.calculation.values.every(n => n && text(n.key) && Number.isFinite(n.value) && text(n.sourcePath) && /^[a-f0-9]{64}$/.test(n.sourceSha256) && text(n.direction) && text(n.algorithm))) return false;
  return list(a.warnings) && a.warnings.length > 0;
}

function evaluate(c, raw, suite = loadSuite()) {
  let a;
  try { a = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch {}
  const base = {caseId:c.id, sourceStudyId:c.sourceStudyId, referenceReview:c.reference.review.status, semanticReview:'pending-statistician-review', finalVerdict:null, modelAccuracy:null, checksAreExecutionEvidence:false};
  if (!validateOutput(a)) return {...base, mechanicalScore:0, automatedPass:false, findings:[{id:'format',severity:'contract-error',message:'输出不是约定的结构化答案；字段文字仍需人工阅读。'}], numeric:{provided:0,matched:0,modelCalculationExecuted:false}};
  const r = c.reference, w = suite.config.weights, findings = [];
  const add = (id,message,severity='critical-contract-error') => findings.push({id,severity,message});
  if (a.caseId !== c.id) add('case-identity','答案案例 ID 与指定情境不同。');
  const questionKeys = new Set(a.questions.map(q => q.key));
  const answered = r.mustAsk.filter(q => questionKeys.has(q.key)).length;
  for (const q of r.mustAsk) if (!questionKeys.has(q.key)) add('missing-question:'+q.key,q.text,'contract-gap');
  let designCount = 0;
  for (const key of ['targetId','unit','dependence','sampling']) {
    if (a[key] === c.input.known[key]) designCount++;
    else add('design:'+key,c.input.known[key] === 'unknown' ? '未知设计信息被擅自填成已知。' : '结构化回答与已给定设计不一致。');
  }
  if (r.blockingQuestions.length && a.decision !== 'needs-information') add('premature-selection','仍有关键阻断信息，不能声称方法已选定。');
  if (r.blockingQuestions.length && a.candidates.some(x => !x.provisional)) add('unconditional-method','缺关键资料时只能提出有条件的讨论。');
  if (a.decision === 'conditional-candidates' && !a.candidates.length) add('empty-plan','候选方案状态却没有候选。','contract-gap');
  for (const candidate of a.candidates) {
    if (r.prohibitedMethodIds.includes(candidate.methodId)) add('prohibited-method', '该方法 ID 与本案例已知设计冲突：'+candidate.methodId);
    const p = r.acceptablePlans.find(x => x.id === candidate.methodId);
    if (!p) add('unlisted-method','未列方案可能合理，交统计人员审阅，不能自动判错。','manual-review');
    else {
      if (p.targetId !== candidate.targetId) add('candidate-target','候选方法没有保持其声明的目标量。');
      for (const d of p.diagnosticRequirements) if (!candidate.diagnostics.includes(d)) add('diagnostic:'+d,'缺诊断条目：'+d,'contract-gap');
    }
    if (!candidate.citationIds.length || candidate.citationIds.some(id => !a.citations.some(x => x.sourceId === id))) add('candidate-citation','候选依据没有连接到引用记录。','contract-gap');
  }
  let citationGood = 0;
  for (const citation of a.citations) {
    const s = suite.sources.sources.find(x => x.id === citation.sourceId);
    if (!s) add('unlisted-citation','新来源需要打开并人工核查；不能仅由自动程序宣布伪造。','manual-review');
    else if (s.url !== citation.url) add('citation-url','来源 ID 与已核查入口不一致。');
    else citationGood++;
  }
  if (a.candidates.length && !citationGood) add('citation-missing','未提供注册来源入口。','contract-gap');
  const calc = a.calculation, expected = r.calculationRequirements;
  const checkCoverage = expected.checks.filter(k => calc.checks.includes(k)).length;
  for (const key of expected.checks) if (!calc.checks.includes(key)) add('calculation-check:'+key,'缺少计算核对计划：'+key,'contract-gap');
  if (calc.status === 'not-run' && calc.values.length) add('fabricated-execution','声明未计算却填入计算值；引用快照必须另标 reported-from-source。');
  if (calc.status === 'reported-from-source' && !calc.values.length) add('empty-values','声称引用数值来源但没有值。','contract-gap');
  let matched = 0;
  const seen = new Set();
  for (const n of calc.values) {
    if (seen.has(n.key)) add('duplicate-value','同一个数值目标重复出现。');
    seen.add(n.key);
    const frozen = expected.numericTargets.find(x => x.key === n.key);
    if (!frozen) { add('unlisted-number','没有冻结来源的数值需追加可核查执行证据。','manual-review'); continue; }
    if (n.sourcePath !== frozen.sourcePath || n.sourceSha256 !== frozen.sourceSha256 || n.direction !== frozen.direction || n.algorithm !== frozen.algorithm) add('numeric-provenance','数值来源、方向或算法与冻结目标不符。');
    else if (Math.abs(n.value-frozen.expected) > frozen.absoluteTolerance) add('numeric-difference','数值超过预定绝对容差，保留差异，不改期望值。');
    else matched++;
  }
  const components = {
    format:w.format,
    clarifications:w.clarifications*(r.mustAsk.length ? answered/r.mustAsk.length : 1),
    design:w.design*designCount/4,
    candidateMetadata:(!a.candidates.length && a.decision !== 'needs-information') ? 0 : w.candidateMetadata,
    citationMetadata:(!a.candidates.length && !a.citations.length) || citationGood ? w.citationMetadata : 0,
    calculationContract:w.calculationContract*checkCoverage/expected.checks.length
  };
  const mechanicalScore = Math.round(Object.values(components).reduce((x,y)=>x+y,0)*100)/100;
  return {...base,mechanicalScore,components,automatedPass:findings.length===0 && mechanicalScore>=suite.config.mechanicalThreshold,findings,numeric:{provided:calc.values.length,matched,availableFrozenTargets:expected.numericTargets.length,modelCalculationExecuted:false},manualRequirements:['阅读必问问题是否切中缺口，而非只填 key','评价候选理由、条件与诊断是否成立','打开每条引用核查支持关系','逐条审查严重错误清单、自由文本及计算证据；自填 check 不等于执行']};
}

function compare(left, right) {
  if (left.caseId !== right.caseId || left.sourceStudyId !== right.sourceStudyId) throw new Error('Cannot compare different study contexts');
  return {caseId:left.caseId,sourceStudyId:left.sourceStudyId,leftMechanicalScore:left.mechanicalScore,rightMechanicalScore:right.mechanicalScore,mechanicalDifference:right.mechanicalScore-left.mechanicalScore,leftFindings:left.findings.map(f=>f.id),rightFindings:right.findings.map(f=>f.id),scientificWinner:null,reason:'仅比较断言和契约差异；统计质量与提示词优劣待盲法人工审阅。'};
}
module.exports = {ROOT,sha,read,loadSuite,validateCases,validateFrozenSources,validateOutput,evaluate,compare};
