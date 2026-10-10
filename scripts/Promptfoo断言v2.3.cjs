'use strict';
const {loadSuite,evaluate} = require('./AI测评引擎v2.3.cjs');
module.exports = (output, context) => {
  const suite = loadSuite();
  // Deliberately tuning-only. Held-out answers never enter the demonstration adapter.
  const c = suite.tuning.cases.find(x => x.id === context.vars.caseId);
  if (!c) throw new Error('Promptfoo fixture adapter accepts tuning cases only');
  const result = evaluate(c, output, suite);
  return {pass:result.automatedPass,score:result.mechanicalScore/100,reason:'工程断言；不是 AI 正确率或方法学通过。' + result.findings.map(x=>x.id).join(';'),metadata:{semanticReview:result.semanticReview,finalVerdict:null}};
};
