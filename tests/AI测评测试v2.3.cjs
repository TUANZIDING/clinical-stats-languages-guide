'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync,spawnSync} = require('node:child_process');
const engine = require('../scripts/AI测评引擎v2.3.cjs');
const cli = require('../scripts/AI离线测评v2.3.cjs');
const nativeVerifier = require('../scripts/Promptfoo结果核查v2.3.cjs');
const suite = engine.loadSuite();
const fixtures = engine.read(suite.config.fixtures);
const copy = x=>JSON.parse(JSON.stringify(x));
const sample = id=>copy(fixtures.records.find(f=>f.id===id).output);
const c = id=>[...suite.tuning.cases,...suite.holdout.cases].find(x=>x.id===id);
const grade = (id,answer)=>engine.evaluate(c(id),answer,suite);
const has = (r,id)=>r.findings.some(f=>f.id===id);

test('Frozen dataset contains 10 tuning and 8 held-out studies, with all references pending actual review',()=>{
  assert.deepEqual(suite.counts,{cases:18,studies:18,tuningStudies:10,holdoutStudies:8});
  for(const x of [...suite.tuning.cases,...suite.holdout.cases]){
    assert.equal(x.reference.review.status,'pending-statistician-review');
    assert.equal(x.reference.review.reviewer,null);
  }
});
test('Changing a family name cannot hide reuse of the same paper across splits',()=>{
  const hold=copy(suite.holdout);hold.cases[0].sourceStudyId='10.1371/journal.pone.0211196';
  hold.cases[0].familyId='a-different-family-name';
  assert.throws(()=>engine.validateCases(suite.tuning,hold,suite.sources),/leakage/);
});
test('Duplicate scenario IDs and incompatible split labels are rejected',()=>{
  const hold=copy(suite.holdout);hold.cases[0].id='T-01';
  assert.throws(()=>engine.validateCases(suite.tuning,hold,suite.sources),/Duplicate/);
  assert.throws(()=>engine.validateCases({...suite.tuning,split:'holdout'},suite.holdout,suite.sources),/split/);
});
test('Frozen bytes detect tampering without modifying the live dataset or expectation',()=>{
  const literal={'example':'2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'};
  engine.validateFrozenSources(literal,()=>Buffer.from('hello'));
  assert.throws(()=>engine.validateFrozenSources(literal,()=>Buffer.from('changed')),/hash changed/);
});
test('Two conditional mean approaches both meet the contract, without scientific certification',()=>{
  for(const id of ['F-01','F-02']){
    const r=grade('T-02',sample(id));assert.equal(r.automatedPass,true);
    assert.equal(r.finalVerdict,null);assert.equal(r.modelAccuracy,null);assert.equal(r.semanticReview,'pending-statistician-review');
  }
});
test('An unlisted candidate is sent for review rather than automatically declared scientifically wrong',()=>{
  const a=sample('F-02');a.candidates[0].methodId='bayesian-mean-model';
  const r=grade('T-02',a);assert.ok(has(r,'unlisted-method'));
  assert.equal(r.findings.find(f=>f.id==='unlisted-method').severity,'manual-review');
});
test('Independent Welch is flagged in a known paired study even when dependence field says paired',()=>{
  const r=grade('T-03',sample('F-04'));assert.ok(has(r,'prohibited-method'));assert.equal(r.automatedPass,false);
});
test('Unknown structure and target are not silently filled from software defaults',()=>{
  const r=grade('T-01',sample('F-07'));
  for(const id of ['design:unit','design:dependence','design:sampling','design:targetId','premature-selection','missing-question:target']) assert.ok(has(r,id));
});
test('Ordinary OLS cannot satisfy a known complex-sampling design',()=>{
  const a=sample('F-02');a.caseId='T-04';a.targetId='survey-coefficient';a.sampling='complex';a.candidates[0].methodId='ordinary-ols';
  assert.ok(has(grade('T-04',a),'prohibited-method'));
});
test('Repeated conditional OR cannot be relabelled marginal OR within the same method',()=>{
  const a=sample('F-02');a.caseId='T-05';a.targetId='conditional-odds-ratio';a.dependence='repeated';
  a.candidates[0].methodId='random-intercept-logistic';a.candidates[0].targetId='marginal-odds-ratio';
  assert.ok(has(grade('T-05',a),'candidate-target'));
});
test('Not-run status with numeric values is an execution contradiction, not a successful calculation',()=>{
  const a=sample('F-01');a.calculation.status='not-run';
  const r=grade('T-02',a);assert.ok(has(r,'fabricated-execution'));assert.equal(r.numeric.modelCalculationExecuted,false);
});
test('A wrong number or CI algorithm vetoes a high mechanical completeness score',()=>{
  const r=grade('T-02',sample('F-05'));assert.equal(r.mechanicalScore,100);assert.equal(r.automatedPass,false);assert.ok(has(r,'numeric-difference'));
  const a=sample('F-01');a.calculation.values[0].algorithm='different default interval';
  assert.ok(has(grade('T-02',a),'numeric-provenance'));
});
test('Known source identity cannot be paired with a fabricated URL or self-verified status',()=>{
  assert.ok(has(grade('T-02',sample('F-06')),'citation-url'));
  const a=sample('F-01');a.citations[0].status='verified';
  assert.ok(has(grade('T-02',a),'format'));
});
test('Survival and prediction block premature choice before their missing target/time is clarified',()=>{
  for(const id of ['T-07','T-08']){
    const a=sample('F-02');a.caseId=id;a.targetId=c(id).input.known.targetId;a.dependence=c(id).input.known.dependence;a.sampling=c(id).input.known.sampling;
    assert.ok(has(grade(id,a),'premature-selection'));
  }
});
test('Seven answer variants remain three study contexts, never numeric-target or answer-count accuracy',()=>{
  const r=cli.report(suite,fixtures.records,'tuning','assertion-fixture-run');
  assert.equal(r.answerRecordCount,7);assert.equal(r.studyContextCount,3);assert.equal(r.aiAccuracy,null);assert.equal(r.modelCallsByRunner,0);
  assert.ok(r.missingCaseIds.includes('T-04'));
});
test('Held-out cases cannot enter the tuning demo configuration or be read as tuning outputs',()=>{
  const config=cli.promptfooConfig(suite,fixtures);
  assert.ok(config.tests.every(t=>t.vars.caseId.startsWith('T-')));
  assert.throws(()=>cli.report(suite,[{id:'wrong-split',caseId:'H-02',origin:'fixture',output:sample('F-03')}],'tuning','assertion-fixture-run'),/another split/);
});
test('Comparison is paired by study and leaves a scientific winner undecided',()=>{
  const a=grade('T-02',sample('F-01')),b=grade('T-02',sample('F-02'));
  assert.equal(engine.compare(a,b).scientificWinner,null);
  assert.throws(()=>engine.compare(a,grade('T-03',sample('F-03'))),/different study/);
});
test('Missing provenance and declared tuning exposure block stored held-out use',()=>{
  assert.throws(()=>cli.storedRecords({kind:'stored-model-outputs',split:'holdout',records:[{}]},suite,'holdout',path.join(engine.ROOT,suite.config.prompt)),/provenance/);
  const provenance={modelId:'explicit-test-label',modelVersion:'test',generatedAt:'2026-10-09',samplingParameters:{temperature:0},toolsOrRetrieval:'none',promptSha256:engine.sha(fs.readFileSync(path.join(engine.ROOT,suite.config.prompt))),datasetSha256:suite.freeze.files[suite.config.holdoutCases],usedForPromptTuning:true,promptFrozenBeforeHoldout:true};
  assert.throws(()=>cli.storedRecords({kind:'stored-model-outputs',split:'holdout',records:[{}],provenance},suite,'holdout',path.join(engine.ROOT,suite.config.prompt)),/Held-out/);
});
test('Malformed output fails format without evaluating JavaScript',()=>{
  assert.ok(has(grade('T-02','not JSON: process.exit(0)'),'format'));
});
test('CLI exports ten tuning inputs containing scenario IDs, never reference rubrics or frozen values',()=>{
  execFileSync(process.execPath,['scripts/AI离线测评v2.3.cjs','prompts'],{cwd:engine.ROOT});
  const x=engine.read('build/AI测评输入v2.3.json');assert.equal(x.inputs.length,10);assert.equal(x.referenceAnswersIncluded,false);
  for(const p of x.inputs){assert.ok(p.prompt.includes(p.caseId));assert.ok(!p.prompt.includes('acceptablePlans'));assert.ok(!p.prompt.includes('8.083333333333329'));}
  const run=spawnSync(process.execPath,['scripts/AI离线测评v2.3.cjs','prompts','--split','holdout'],{cwd:engine.ROOT,encoding:'utf8'});
  assert.equal(run.status,1);assert.match(run.stderr,/frozen-prompt/);
});
test('Native compatibility checker distinguishes expected assertion failures from provider/runtime failures',()=>{
  const native={results:{stats:{errors:0},results:fixtures.records.map(f=>{
    const r=grade(f.caseId,f.output);
    return {vars:{fixtureId:f.id,caseId:f.caseId},success:f.expectedAutomatedPass,provider:{id:'echo'},tokenUsage:{total:0,numRequests:0,assertions:{numRequests:0}},cost:0,failureReason:f.expectedAutomatedPass?0:1,error:f.expectedAutomatedPass?null:r.findings.map(x=>x.id).join(';')};
  })}};
  assert.equal(nativeVerifier.verify(native,fixtures,suite).aiAccuracy,null);
  const bad=copy(native);bad.results.results[3].failureReason=2;
  assert.throws(()=>nativeVerifier.verify(bad,fixtures,suite),/execution failure/);
  const paid=copy(native);paid.results.results[0].provider.id='a-remote-model';
  assert.throws(()=>nativeVerifier.verify(paid,fixtures,suite),/provider/);
});
