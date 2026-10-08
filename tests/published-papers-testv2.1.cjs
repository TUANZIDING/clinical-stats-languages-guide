const test = require('node:test');
const assert = require('node:assert/strict');
const { recommend, makePrompt } = require('../docs/method-engine.js');
const catalog = require('../data/paper-catalogv2.1.json');

for (const c of catalog.method_cases) {
  test(`Published case ${c.id} retains survey design and review status`, () => {
    const r = recommend(c.input);
    assert.equal(r.level, 'review');
    assert.match(r.methods.join(' '), c.input.outcome === 'binary' ? /调查加权 Logistic/ : /调查加权线性/);
    assert.match(r.checks.join(' '), /权重.*PSU/);
    assert.match(r.checks.join(' '), /domain/);
    assert.doesNotMatch(r.methods.join(' '), /Welch|GEE/);
    assert.match(makePrompt(c.input,r), /抽样设计：复杂抽样调查/);
  });
}
const base = catalog.method_cases[0].input;
test('Unknown or omitted sampling is not silently treated as a simple sample', () => {
  assert.equal(recommend({...base,sampling:'unknown'}).level,'incomplete');
  assert.deepEqual(recommend({...base,sampling:''}).methods,[]);
});
test('Survey designs do not route an unadjusted mean comparison to ordinary Welch', () => {
  const r=recommend({...base,goal:'compare',groups:'two',adjust:'no',distribution:'approx'});
  assert.doesNotMatch(r.methods.join(' '),/Welch/);
  assert.match(r.methods.join(' '),/调查加权/);
});
test('Repeated observations within a survey require both structures to be addressed', () => {
  const r=recommend({...base,structure:'repeated'});
  assert.match(r.checks.join(' '),/两种结构/);
});
test('Changing association to causal or prediction keeps the design checkpoints', () => {
  assert.match(recommend({...base,goal:'causal'}).title,/因果设计/);
  assert.match(recommend({...base,goal:'predict'}).title,/预测与验证/);
});
test('Survey descriptions distinguish weighted estimands and sample counts', () => {
  const r=recommend({...base,goal:'describe'});
  assert.match(r.methods.join(' '),/调查加权/);
  assert.match(r.checks.join(' '),/未加权样本人数/);
});
