'use strict';
// Verifies a local compatibility run, not a model's statistical performance.
const fs = require('node:fs');
const path = require('node:path');
const {ROOT,read,sha,loadSuite,evaluate} = require('./AI测评引擎v2.3.cjs');
function verify(native, fixtures, suite) {
  const rows=native.results?.results,stats=native.results?.stats;
  if (!Array.isArray(rows) || rows.length!==fixtures.records.length || stats?.errors!==0) throw new Error('Wrong native result count or execution errors');
  const seen=new Set(),observations=[];
  for(const row of rows){
    const id=row.vars?.fixtureId,f=fixtures.records.find(x=>x.id===id);
    if (!f || seen.has(id) || row.vars.caseId!==f.caseId) throw new Error('Native fixture identity differs');
    seen.add(id);
    const expected=evaluate(suite.tuning.cases.find(c=>c.id===f.caseId),f.output,suite);
    if(row.success!==f.expectedAutomatedPass || row.success!==expected.automatedPass) throw new Error('Native assertion outcome differs');
    if(row.provider?.id!=='echo' || row.tokenUsage?.total!==0 || row.tokenUsage?.numRequests!==0 || row.tokenUsage?.assertions?.numRequests!==0 || row.cost!==0) throw new Error('Unexpected provider / tokens / requests / cost');
    // Native 0.124.1 stores assertion failure messages in `error`, with reason=1.
    // An error string alone must not be misclassified as a transport/runtime error.
    if(row.failureReason!==(row.success?0:1)) throw new Error('Unexpected native execution failure reason');
    if(!row.success && !expected.findings.every(x=>row.error.includes(x.id))) throw new Error('Native failure reason differs from frozen fixture exercise');
    observations.push({fixtureId:id,caseId:f.caseId,status:row.success?'contract-complete':'expected-assertion-failure',engineFindingIds:expected.findings.map(x=>x.id),nativeFailureReason:row.failureReason});
  }
  return {version:'2.3',kind:'promptfoo-compatibility-not-ai-evaluation',fixtureCount:rows.length,studyContexts:new Set(fixtures.records.map(f=>suite.tuning.cases.find(c=>c.id===f.caseId).sourceStudyId)).size,contractComplete:observations.filter(x=>x.status==='contract-complete').length,expectedAssertionFailures:observations.filter(x=>x.status==='expected-assertion-failure').length,executionErrors:stats.errors,modelRequests:0,graderRequests:0,aiAccuracy:null,scientificVerdict:null,observations};
}
if(require.main===module){try{
  const suite=loadSuite(),fixtures=read(suite.config.fixtures);
  const file=path.resolve(ROOT,process.argv[2]||'build/Promptfoo断言报告v2.3.json');
  const bytes=fs.readFileSync(file),native=JSON.parse(bytes);
  const result=verify(native,fixtures,suite);
  result.nativeReportSha256=sha(bytes);result.nativeExportContainsRedaction=bytes.includes(Buffer.from('[REDACTED]'));
  result.rawInputFiles=[suite.config.fixtures,'config/Promptfoo离线配置v2.3.json'].map(name=>({path:name,sha256:sha(fs.readFileSync(path.join(ROOT,name)))}));
  result.exportBoundary='Promptfoo 导出会脱敏部分字段；核查原始输入使用项目 fixture 与独立 runner，不把脱敏导出当原始数值来源。';
  fs.writeFileSync(path.join(ROOT,'build/Promptfoo兼容记录v2.3.json'),JSON.stringify(result,null,2)+'\n');
  console.log('PASS: native Promptfoo and independent runner agree on 7 fixture outcomes / 3 study contexts; 0 execution errors or model/grader requests. NOT AI accuracy.');
}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={verify};
