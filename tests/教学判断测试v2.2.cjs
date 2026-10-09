const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const course=require('../docs/教学课程v2.2.js');
const root=path.resolve(__dirname,'..');
test('three levels teach only the four already computed cases',()=>{
  assert.deepEqual(course.levels.map(x=>x.id),['understand','simulate','paper']);
  assert.deepEqual(course.levels.flatMap(x=>x.cases||[]),['small','clinical','nhanes','longitudinal']);
  for(const c of Object.values(course.cases)){
    for(const key of ['question','estimand','why','steps','diagnostics','interpretation','mistakes','exercise'])assert.ok(c[key]?.length,key);
    for(const d of c.diagnostics)for(const key of ['done','meaning','pending'])assert.ok(d[key]);
    assert.ok(fs.existsSync(path.join(root,'docs',c.figure)));
    assert.ok(fs.existsSync(path.join(root,'docs',c.link)));
    for(const s of c.steps)for(const match of s.command.matchAll(/(?:scripts|examples)\/[\w\p{Script=Han}/.\-]+/gu))assert.ok(fs.existsSync(path.join(root,match[0])),match[0]);
  }
});
test('all eight exercises are reachable once, with option-specific feedback',()=>{
  const ids=course.levels.flatMap(l=>[...(l.exercises||[]),...(l.cases||[]).flatMap(id=>[course.cases[id].exercise,...(course.cases[id].extraExercise?[course.cases[id].extraExercise]:[])])]);
  assert.equal(ids.length,8);assert.equal(new Set(ids).size,8);assert.deepEqual(new Set(ids),new Set(Object.keys(course.exercises)));
  for(const q of Object.values(course.exercises)){
    assert.equal(q.options.length,3);assert.equal(new Set(q.options.map(x=>x.feedback)).size,3);
    for(const o of q.options){assert.ok(o.feedback.trim());assert.notEqual(o.feedback,o.text);}
    assert.ok(q.repair.length>20);
  }
});
const explanation={pairing:/不一致对.*稀疏/,odds:/横断面患病 OR.*条件 OR/,equivalence:/界值.*设计/,normality:/独立性.*条件/,denominator:/47.*45.*缺失机制/,adjustment:/混杂.*中介.*碰撞/,weights:/domain.*期望值/,visits:/失访偏倚.*计划时点.*缺失机制/};
for(const id of Object.keys(course.exercises))test(`${id}: blank/invalid is pending, each distractor gives corrective feedback`,()=>{
  const q=course.exercises[id];
  for(const unknown of [undefined,null,'0',-1,3,NaN,0.5])assert.equal(course.grade(id,unknown).status,'pending');
  for(let i=0;i<3;i++){
    const g=course.grade(id,i);assert.equal(g.status,i===q.correct?'supported':'revise');
    assert.equal(g.text,q.options[i].feedback);assert.equal(g.repair,q.repair);
  }
  assert.match(course.grade(id,q.correct).text,explanation[id]);
});
test('unknown exercise is rejected rather than answered by a default rule',()=>assert.throws(()=>course.grade('unvalidated',0),/Unknown/));
test('display numbers follow common views; missing sources remain pending',()=>{
  const context={window:{}};vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root,'docs/assets/统一结果视图v2.2.js'),'utf8'),context);
  vm.runInContext(fs.readFileSync(path.join(root,'docs/assets/纵向论文视图v2.2.js'),'utf8'),context);
  const views={common:context.window.RESULT_VIEW,longitudinal:context.window.LONGITUDINAL_VIEW};
  assert.match(course.resultText('small',views),/8\.08.*2\.81.*13\.36/);
  assert.match(course.resultText('clinical',views),/45.*43.*3 \/ 5.*9\.03/);
  assert.match(course.resultText('nhanes',views),/72\/72.*16\/32/);
  assert.match(course.resultText('longitudinal',views),/22\/27.*5 项差异/);
  views.common.small.difference=123.456;
  assert.match(course.resultText('small',views),/123\.46/);
  for(const id of Object.keys(course.cases))assert.match(course.resultText(id,{}),/来源未加载.*待补充/);
});
