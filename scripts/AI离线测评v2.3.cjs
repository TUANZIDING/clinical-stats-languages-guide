'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {ROOT,sha,read,loadSuite,evaluate,compare} = require('./AI测评引擎v2.3.cjs');
const cfg = 'config/Promptfoo离线配置v2.3.json';
const save = (file,x) => { fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file,JSON.stringify(x,null,2)+'\n'); };
function promptfooConfig(suite, fixtures) {
  return {description:'v2.3 工程断言样例：固定输出，不是 AI 测评',basePath:'..',providers:['echo'],prompts:['{{response}}'],sharing:false,writeLatestResults:false,evaluateOptions:{cache:false,maxConcurrency:1},defaultTest:{assert:[{type:'javascript',value:'file://scripts/Promptfoo断言v2.3.cjs',metric:'mechanical-contract-only'}]},tests:fixtures.records.map(f=>({description:f.id+' '+f.purpose,vars:{caseId:f.caseId,fixtureId:f.id,response:JSON.stringify(f.output)},providerOutput:JSON.stringify(f.output),metadata:{origin:f.origin,expectedAutomatedPass:f.expectedAutomatedPass,notModelEvaluation:true}}))};
}
function report(suite, records, split, kind) {
  const cases = suite[split].cases;
  const seen = new Set();
  const rows = records.map(f => {
    if (!f || typeof f.id!=='string' || !f.id.trim() || typeof f.caseId!=='string' || !f.output) throw new Error('Answer records require stable id, caseId and output');
    if (seen.has(f.id)) throw new Error('Duplicate answer record');
    seen.add(f.id);
    const c = cases.find(x=>x.id===f.caseId);
    if (!c) throw new Error('Output references another split / unknown case: '+f.caseId);
    return {recordId:f.id,origin:f.origin,result:evaluate(c,f.output,suite),...(kind==='assertion-fixture-run' ? {expectedAutomatedPass:f.expectedAutomatedPass} : {})};
  });
  return {version:'2.3',kind,split,modelCallsByRunner:0,modelGraderCalls:0,aiAccuracy:null,scientificVerdict:null,referenceReview:'pending-statistician-review',environment:{node:process.version,platform:process.platform,arch:process.arch},frozenSources:suite.freeze.files,promptSha256:sha(fs.readFileSync(path.join(ROOT,suite.config.prompt))),studyContextCount:new Set(rows.map(x=>x.result.sourceStudyId)).size,answerRecordCount:rows.length,missingCaseIds:cases.filter(c=>!records.some(r=>r.caseId===c.id)).map(c=>c.id),rows,boundary:'多个输出或论文数值不增加独立研究数量；自动分数只衡量输出契约，引用和方法依据待人工审阅。'};
}
function storedRecords(packet,suite,split,promptPath) {
  if (packet.kind!=='stored-model-outputs' || packet.split!==split || !Array.isArray(packet.records) || !packet.records.length) throw new Error('Use stored-model-outputs packet with explicit split');
  const promptHash=sha(fs.readFileSync(promptPath));
  const datasetHash=suite.freeze.files[suite.config[split==='tuning'?'tuningCases':'holdoutCases']];
  if (packet.provenance?.promptSha256!==promptHash || packet.provenance?.datasetSha256!==datasetHash || !packet.provenance?.modelId || !packet.provenance?.modelVersion || !packet.provenance?.generatedAt || !packet.provenance?.samplingParameters || !packet.provenance?.toolsOrRetrieval) throw new Error('Missing output provenance or prompt/dataset version mismatch');
  if (split==='holdout' && (packet.provenance.usedForPromptTuning!==false || packet.provenance.promptFrozenBeforeHoldout!==true)) throw new Error('Held-out use needs an explicit frozen-prompt and no-tuning declaration; exposure still requires human audit');
  return packet.records.map(r=>({...r,origin:'stored-model-output-not-generated-by-runner'}));
}
function main(args=process.argv.slice(2)) {
  const command=args[0]||'check';
  const opt=name=>{const i=args.indexOf(name);return i<0?null:args[i+1];};
  const suite=loadSuite(), fixtures=read(suite.config.fixtures);
  if (fixtures.kind!=='assertion-fixtures-not-model-outputs' || fixtures.modelCalls!==0 || fixtures.records.some(f=>f.origin!=='developer-authored-fixture' || f.modelId!==null || !suite.tuning.cases.some(c=>c.id===f.caseId))) throw new Error('Fixture cannot be model output or held-out case');
  if (command==='export-promptfoo') {
    save(path.join(ROOT,cfg),promptfooConfig(suite,fixtures));
    console.log('Exported custom-path Echo / providerOutput configuration. No model call.');return;
  }
  if (command==='check') {
    if (fs.readFileSync(path.join(ROOT,cfg),'utf8')!==JSON.stringify(promptfooConfig(suite,fixtures),null,2)+'\n') throw new Error('Promptfoo config drift; export and review changes');
    console.log('PASS: 18 case rubrics, source hashes, study-level split and tuning-only fixture configuration. All reference answers pending review; no model run.');return;
  }
  if (command==='demo') {
    const result=report(suite,fixtures.records,'tuning','assertion-fixture-run');
    if (result.rows.some(r=>r.result.automatedPass!==r.expectedAutomatedPass)) throw new Error('Unexpected assertion behaviour; do not edit rubric to make a bad fixture pass');
    save(path.join(ROOT,opt('--out')||'build/AI离线报告v2.3.json'),result);
    console.log('PASS: 7 scripted outputs exercised; 3 contract-complete and 4 expected errors detected. 3 study contexts. NO model evaluation or AI accuracy.');return;
  }
  if (command==='compare-demo') {
    const c=suite.tuning.cases.find(x=>x.id==='T-02');
    const left=evaluate(c,fixtures.records.find(f=>f.id==='F-01').output,suite),right=evaluate(c,fixtures.records.find(f=>f.id==='F-02').output,suite);
    save(path.join(ROOT,'build/AI输出比较v2.3.json'),compare(left,right));
    console.log('Compared two scripted alternatives on ONE study. scientificWinner=null; no prompt/model superiority claim.');return;
  }
  const split=opt('--split')||'tuning';
  if (!['tuning','holdout'].includes(split)) throw new Error('Split must be tuning or holdout');
  if (command==='prompts') {
    const template=fs.readFileSync(path.join(ROOT,suite.config.prompt),'utf8');
    const inputs=suite[split].cases.map(c=>{
      const prompt=template.replace('{{scenario}}',JSON.stringify({caseId:c.id,...c.input},null,2)).replace('{{sources}}',JSON.stringify(suite.sources.sources.map(s=>({id:s.id,title:s.title,url:s.url})),null,2));
      return {caseId:c.id,sourceStudyId:c.sourceStudyId,prompt,renderedPromptSha256:sha(Buffer.from(prompt))};
    });
    if (split==='holdout' && !args.includes('--frozen-prompt')) throw new Error('Held-out inputs require --frozen-prompt and must not be used for tuning');
    save(path.join(ROOT,opt('--out')||'build/AI测评输入v2.3.json'),{version:'2.3',split,promptSha256:sha(Buffer.from(template)),inputs,referenceAnswersIncluded:false});
    console.log('Wrote '+inputs.length+' inputs without reference rubrics or target numbers. No model call.');return;
  }
  if (command==='run' || command==='compare') {
    const promptPath=path.resolve(ROOT,opt('--prompt')||suite.config.prompt);
    const input=opt('--outputs');
    if (!input) throw new Error('Explicit --outputs path required. Runner does not generate model answers.');
    const packet=JSON.parse(fs.readFileSync(path.resolve(ROOT,input),'utf8'));
    const result=report(suite,storedRecords(packet,suite,split,promptPath),split,'stored-output-contract-check');
    result.promptSha256=packet.provenance.promptSha256;
    result.outputProvenance=packet.provenance;result.provenanceIndependentlyVerified=false;
    if (command==='compare') {
      const rightFile=opt('--right');if (!rightFile) throw new Error('--right packet required');
      const rightPacket=JSON.parse(fs.readFileSync(path.resolve(ROOT,rightFile),'utf8'));
      const rightPromptPath=path.resolve(ROOT,opt('--right-prompt')||opt('--prompt')||suite.config.prompt);
      const right=report(suite,storedRecords(rightPacket,suite,split,rightPromptPath),split,'stored-output-contract-check');
      const leftIds=result.rows.map(x=>x.result.caseId),rightIds=right.rows.map(x=>x.result.caseId);
      if (new Set(leftIds).size!==leftIds.length || new Set(rightIds).size!==rightIds.length || JSON.stringify([...leftIds].sort())!==JSON.stringify([...rightIds].sort())) throw new Error('Comparison requires one output per case and identical context sets; do not silently drop missing answers');
      const comparisons=result.rows.map(l=>compare(l.result,right.rows.find(r=>r.result.caseId===l.result.caseId).result));
      save(path.join(ROOT,opt('--out')||'build/AI成对比较v2.3.json'),{version:'2.3',split,leftProvenance:packet.provenance,rightProvenance:rightPacket.provenance,aiAccuracy:null,scientificWinner:null,comparisons});
    } else save(path.join(ROOT,opt('--out')||'build/AI输出核查v2.3.json'),result);
    console.log('Checked pre-existing outputs only. Reference review / scientific verdict pending; AI accuracy not computed.');return;
  }
  throw new Error('Commands: check, demo, compare-demo, export-promptfoo, prompts, run, compare');
}
if(require.main===module){try{main();}catch(error){console.error(error.message);process.exitCode=1;}}
module.exports={main,promptfooConfig,report,storedRecords};
