(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const engine = window.StatsGuide;
  let currentConfig = null;
  let currentResult = null;
  const form = $('design-form');
  const initialResult = $('result-panel').innerHTML;
  const config = () => Object.fromEntries(new FormData(form));
  const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const list = xs => '<ul>' + xs.map(s => '<li>' + escapeHTML(s) + '</li>').join('') + '</ul>';
  function syncFields() {
    const c = config();
    $('groups-field').hidden = c.goal !== 'compare';
    $('predictor-field').hidden = c.goal !== 'associate';
    $('adjust-field').hidden = !['compare','associate'].includes(c.goal);
    $('distribution-field').hidden = !(c.goal === 'compare' && c.outcome === 'continuous');
    for (const k of ['groups','predictor','adjust','distribution']) $(k).disabled = $(k + '-field').hidden;
  }
  function invalidate() {
    currentConfig = null; currentResult = null;
    $('generate-prompt').disabled = true;
    $('download-plan').disabled = true;
    $('prompt-panel').hidden = true;
    $('prompt-text').value = '';
    $('result-panel').innerHTML = initialResult;
    document.querySelectorAll('.preset').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
  }
  function showResult() {
    const c = config();
    const r = engine.recommend(c);
    currentConfig = c; currentResult = r;
    const badge = {candidate:'候选方法 · 条件待核查',review:'需要进一步设计 / 专业讨论',incomplete:'信息不足 · 先补充'}[r.level];
    const refs = r.sources.map(key => engine.sources[key]).filter(Boolean);
    $('result-panel').innerHTML = `<span class="result-badge ${r.level}">${badge}</span><h3>${escapeHTML(r.title)}</h3><p>${escapeHTML(r.reason)}</p>${r.methods.length ? '<h4>候选讨论起点</h4><div class="method-list">'+list(r.methods)+'</div>' : ''}<h4>先核查 / 补充</h4>${list(r.checks)}<h4>最终需要报告</h4>${list(r.report)}<div class="sources-list">${refs.map(([name,url]) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${escapeHTML(name)} ↗</a>`).join('')}</div><p class="result-footnote">规则生成的教学草案。样本量、目标量、假设和数据质量未由此验证，不能直接作为正式分析计划。</p>`;
    $('generate-prompt').disabled = false;
    $('download-plan').disabled = false;
    $('prompt-panel').hidden = true;
  }
  form.addEventListener('change', () => { syncFields(); invalidate(); });
  form.addEventListener('submit', event => { event.preventDefault(); syncFields(); showResult(); });
  form.addEventListener('reset', () => { window.setTimeout(() => { syncFields(); invalidate(); }, 0); });
  const cases = {
    means:{goal:'compare',design:'randomized',outcome:'continuous',structure:'independent',groups:'two',adjust:'no',missing:'none',distribution:'approx'},
    paired:{goal:'compare',design:'cohort',outcome:'binary',structure:'paired',groups:'two',adjust:'no',missing:'none'},
    survival:{goal:'compare',design:'cohort',outcome:'survival',structure:'independent',groups:'two',adjust:'yes',missing:'unknown'}
  };
  document.querySelectorAll('.preset').forEach(button => {
    button.setAttribute('aria-pressed','false');
    button.addEventListener('click', () => {
      for (const field of Object.keys(engine.labels)) if ($(field)) $(field).value = cases[button.dataset.case][field] || '';
      syncFields(); invalidate(); showResult();
      button.classList.add('active'); button.setAttribute('aria-pressed','true');
    });
  });
  $('generate-prompt').addEventListener('click', () => {
    if (!currentResult) return;
    $('prompt-text').value = engine.makePrompt(currentConfig,currentResult);
    $('prompt-panel').hidden = false;
    $('copy-status').textContent = '';
    $('prompt-text').focus({preventScroll:true});
  });
  $('copy-prompt').addEventListener('click', async () => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText($('prompt-text').value);
      $('copy-status').textContent = '已复制。发送前请补充未知项，并核对来源与隐私。';
    } catch (_) {
      $('prompt-text').focus({preventScroll:true}); $('prompt-text').select();
      $('copy-status').textContent = '浏览器未允许自动复制，文本已选中，请按 Ctrl+C / ⌘C。';
    }
  });
  $('download-plan').addEventListener('click', () => {
    if (!currentResult) return;
    const r = currentResult;
    const prompt = engine.makePrompt(currentConfig,r);
    const markdown = `# 统计方法讨论草案\n\n状态：离线规则生成，未验证数据，待研究团队审核。\n日期：${new Date().toLocaleDateString('sv-SE')}\n\n## 候选方法\n\n${r.methods.map(s=>'- '+s).join('\n') || '- 信息不足，尚无候选。'}\n\n## 先核查\n\n${r.checks.map(s=>'- '+s).join('\n')}\n\n## 报告内容\n\n${r.report.map(s=>'- '+s).join('\n')}\n\n## 来源\n\n${r.sources.map(k=>'- ['+engine.sources[k][0]+']('+engine.sources[k][1]+')').join('\n')}\n\n## AI 提问模板\n\n${prompt}\n\n正式分析前补齐目标量、样本量、事件数、变量字典、诊断和缺失方案；保留审核记录。\n`;
    const url = URL.createObjectURL(new Blob([markdown],{type:'text/markdown;charset=utf-8'}));
    const a = document.createElement('a'); a.href = url; a.download = '统计方法讨论草案v2.0.md';
    document.body.appendChild(a); a.click(); a.remove(); window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  const tools = {
    beginner:{label:'ENTRY POINT',name:'jamovi / SPSS',intro:'用图形界面，先把统计概念学明白。',title:'对完全没有编程基础的人',text:'可以先读入教学数据、画图、做指定的分析并保存设置。jamovi 桌面版免费开源；如果所在机构已有 SPSS 许可，也可以使用。',condition:'仍需理解研究设计、变量与假设。菜单点击不能代替方法判断。',source:'jamovi 官方介绍',url:'https://www.jamovi.org/'},
    r:{label:'STATISTICS & REPRODUCTION',name:'R',intro:'愿意学一点代码，可考虑的长期科研路线。',title:'统计计算、绘图与可复现分析',text:'从读入 CSV、画图和一个指定模型起步。R 是免费的统计计算语言和环境，适合逐步建立保存代码、参数与结果的习惯。',condition:'这是根据工具角色提出的建议，并非“对所有初学者最容易”的实测结论。',source:'R 官方介绍',url:'https://www.r-project.org/about.html'},
    python:{label:'DATA / IMAGING / MACHINE LEARNING',name:'Python',intro:'数据自动化、影像和 AI 方向可考虑。',title:'通用语言，连接数据处理与分析',text:'Python 可做批量数据处理、统计推断和机器学习。传统统计可使用 SciPy、statsmodels 等库；学习语言之外，仍需学习研究设计与统计解释。',condition:'会训练分类器不等于会设计医学研究。预测时需特别核对数据泄漏与验证。',source:'Python 官方介绍',url:'https://www.python.org/doc/essays/blurb/'},
    sas:{label:'TEAM WORKFLOW',name:'SAS',intro:'课程或团队使用它，就先衔接现有流程。',title:'程序、界面与规范化的分析交付',text:'SAS 是分析软件体系，有自己的语言和 SAS Studio 等界面。现有模板、指导和验证流程能影响实际学习成本；OnDemand for Academics 提供免费学习入口。',condition:'商业许可与免费学习用途不同，请核对当前授权条件。研究是否合规不能仅由软件名称决定。',source:'SAS OnDemand 官方入口',url:'https://www.sas.com/en_us/software/on-demand-for-academics.html'},
    cpp:{label:'ALGORITHM ENGINEERING',name:'C++',intro:'适合算法与性能需求，通常可以晚些再学。',title:'能做统计，但工具链要求更高',text:'C++ 能开发统计计算和高性能算法。使用 Boost Math 等库可以计算 t 分布概率及 P 值。本项目提供同一教学任务的 C++ 示例。',condition:'对常规医学统计初学者，先掌握设计和更便于复现的工作流通常更实用。代码行数不是易用性或正确性评分。',source:'Boost Math t 分布文档',url:'https://live.boost.org/doc/libs/1_51_0/libs/math/doc/sf_and_dist/html/math_toolkit/dist/dist_ref/dists/students_t_dist.html'}
  };
  function activateTool(button, focus = false) {
    const t = tools[button.dataset.tool];
    document.querySelectorAll('[data-tool]').forEach(b=>{b.setAttribute('aria-selected',String(b===button));b.tabIndex=b===button?0:-1;});
    $('tool-panel').setAttribute('aria-labelledby',button.id);
    $('tool-panel').innerHTML = `<div class="tool-name"><span>${t.label}</span><h3>${t.name}</h3><p>${t.intro}</p></div><div class="tool-description"><h4>${t.title}</h4><p>${t.text}</p><p class="tool-condition">${t.condition}</p><a href="${t.url}" target="_blank" rel="noopener noreferrer">查看 ${t.source} ↗</a></div>`;
    if (focus) button.focus();
  }
  const tabs = [...document.querySelectorAll('[data-tool]')];
  tabs.forEach((button,i)=>{
    button.addEventListener('click',()=>activateTool(button));
    button.addEventListener('keydown',event=>{
      let next;
      if(event.key==='ArrowRight')next=(i+1)%tabs.length;
      if(event.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;
      if(event.key==='Home')next=0;
      if(event.key==='End')next=tabs.length-1;
      if(next!==undefined){event.preventDefault();activateTool(tabs[next],true);}
    });
  });
  $('quiz-reveal').addEventListener('click',()=>{
    const expanded = $('quiz-answer').hidden;
    $('quiz-answer').hidden = !expanded;
    $('quiz-reveal').setAttribute('aria-expanded',String(expanded));
    $('quiz-reveal').textContent = expanded ? '收起解析' : '展开解析';
  });
  // Exact values are written into this local file by scripts/build_assets.py.
  if (window.DEMO_RESULT) {
    const d = window.DEMO_RESULT;
    $('demo-diff').textContent = d.difference.toFixed(2);
    $('demo-ci').textContent = `[${d.ci_low.toFixed(2)}, ${d.ci_high.toFixed(2)}]`;
    $('demo-p').textContent = d.p_value.toFixed(4);
  }
  syncFields();
})();
