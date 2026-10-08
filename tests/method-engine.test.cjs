const test = require('node:test');
const assert = require('node:assert/strict');
const { recommend, makePrompt } = require('../docs/method-engine.js');
const base = { goal:'compare', design:'randomized', outcome:'continuous', structure:'independent', groups:'two', adjust:'no', missing:'none', distribution:'approx' };

test('Incomplete descriptions never silently choose a test', () => {
  assert.equal(recommend({}).level, 'incomplete');
  assert.deepEqual(recommend({}).methods, []);
  assert.equal(recommend({...base, groups:''}).methods.length, 0);
});
test('Independent means and paired means have different analysis units', () => {
  assert.match(recommend(base).methods[0], /Welch/);
  assert.match(recommend({...base, structure:'paired'}).methods[0], /配对 t/);
});
test('Paired binary outcomes route to McNemar, not independent chi-square', () => {
  const r = recommend({...base, outcome:'binary', structure:'paired'});
  assert.match(r.methods[0], /McNemar/);
  assert.doesNotMatch(r.methods.join(' '), /Fisher/);
});
test('Multicondition paired binary data do not silently use two-condition McNemar', () => {
  const r = recommend({...base, outcome:'binary', structure:'paired', groups:'multi'});
  assert.equal(r.level, 'review');
  assert.doesNotMatch(r.methods.join(' '), /McNemar/);
});
test('Repeated and clustered data require correlation-aware discussion', () => {
  for (const structure of ['repeated','clustered']) {
    const r = recommend({...base, structure});
    assert.equal(r.level, 'review');
    assert.match(r.methods.join(' '), /GEE/);
    assert.doesNotMatch(r.methods.join(' '), /Welch t/);
  }
});
test('Unknown missingness, design or dependence is explicitly incomplete', () => {
  for (const field of ['missing','design','structure','adjust']) {
    assert.equal(recommend({...base, [field]:'unknown'}).level, 'incomplete');
  }
});
test('Skewness and actual missing data require further review', () => {
  assert.equal(recommend({...base, distribution:'skew'}).level, 'review');
  assert.equal(recommend({...base, missing:'some'}).level, 'review');
});
test('Survival data are not reduced to ordinary binary logistic', () => {
  const r = recommend({...base, outcome:'survival'});
  assert.match(r.methods.join(' '), /Cox/);
  assert.doesNotMatch(r.methods.join(' '), /Logistic/);
});
test('Prediction and causality return design checkpoints, not a simple significance test', () => {
  for (const goal of ['predict','causal']) {
    const r = recommend({...base, goal});
    assert.equal(r.level, 'review');
    assert.doesNotMatch(r.methods.join(' '), /Welch/);
  }
});
test('Adjustment changes the discussion to modeling', () => {
  assert.match(recommend({...base, adjust:'yes'}).methods[0], /回归/);
  assert.equal(recommend({...base, adjust:'yes'}).level, 'review');
});
test('Case-control binary data include the risk-estimation restriction', () => {
  const r = recommend({...base, design:'casecontrol', outcome:'binary'});
  assert.match(r.checks.join(' '), /不能直接/);
});
test('Association requires predictor information and paired association remains paired', () => {
  assert.equal(recommend({...base, goal:'associate'}).methods.length, 0);
  const r = recommend({...base, goal:'associate', predictor:'continuous', structure:'paired'});
  assert.match(r.methods[0], /配对/);
});
test('Every valid outcome/structure/goal combination returns usable and bounded text', () => {
  for (const goal of ['describe','compare','associate','predict','causal'])
  for (const outcome of ['continuous','binary','ordinal','nominal','count','survival'])
  for (const structure of ['independent','paired','repeated','clustered','unknown']) {
    const r = recommend({...base, goal, outcome, structure, predictor:'continuous'});
    assert.ok(r.title);
    assert.ok(r.methods.every(x => typeof x === 'string' && x.length));
    assert.ok(r.sources.length);
    assert.match(makePrompt({...base, goal, outcome, structure}, r), /待补充/);
  }
});
