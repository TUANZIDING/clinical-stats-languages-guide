(function () {
  'use strict';
  const course=window.TeachingCourse;
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const list=xs=>'<ul>'+xs.map(x=>`<li>${escape(x)}</li>`).join('')+'</ul>';
  const views={common:window.RESULT_VIEW,longitudinal:window.LONGITUDINAL_VIEW};
  function exercise(id) {
    const q=course.exercises[id];
    return `<form class="judgment" data-exercise="${id}" aria-describedby="${id}-scenario"><fieldset><legend>判断练习 · ${escape(q.title)}</legend><p id="${id}-scenario">${escape(q.scenario)}</p>${q.options.map((o,i)=>`<label><input type="radio" name="${id}" value="${i}"><span>${escape(o.text)}</span></label>`).join('')}</fieldset><button type="submit" class="button secondary">核对这个判断</button><p class="judgment-feedback" id="${id}-feedback" role="status" aria-live="polite"></p></form>`;
  }
  function caseCard(id) {
    const c=course.cases[id];
    return `<details class="lesson-case" id="lesson-${id}"><summary>${escape(c.title)}</summary><div class="lesson-content"><h4>临床问题 / 教学问题</h4><p>${escape(c.question)}</p><h4>目标量</h4><p>${escape(c.estimand)}</p><h4>选择理由</h4><p>${escape(c.why)}</p><h4>可运行步骤</h4><ol>${c.steps.map(s=>`<li><p>${escape(s.text)}</p>${s.command?`<pre><code>${escape(s.command)}</code></pre>`:''}</li>`).join('')}</ol><h4>诊断：算过什么，还有什么缺口</h4>${c.diagnostics.map(d=>`<div class="diagnosis-note"><p><strong>已做：</strong>${escape(d.done)}</p><p><strong>怎么解释：</strong>${escape(d.meaning)}</p><p><strong>待核查：</strong>${escape(d.pending)}</p></div>`).join('')}<h4>结果解读 · 读取同一结果来源</h4><p class="lesson-result" data-case-result="${id}">${escape(course.resultText(id,views))}</p><p>${escape(c.interpretation)}</p><figure><img src="${c.figure}" alt="${escape(c.figureAlt)}" loading="lazy"><figcaption>保存的核查产物；打开本页不重新拟合。图中方法与来源见对应案例。</figcaption></figure><h4>常见错误</h4>${list(c.mistakes)}${exercise(c.exercise)}${c.extraExercise?exercise(c.extraExercise):''}<p class="source-line"><a href="${c.link}">打开案例细节与边界</a> · <a href="${c.source}" target="_blank" rel="noopener noreferrer">方法 / 原文来源 ↗</a></p></div></details>`;
  }
  for (const level of course.levels) {
    const panel=document.getElementById('learning-'+level.id);
    panel.innerHTML=`<p class="lesson-outcome"><strong>这一层的交付：</strong>${escape(level.outcome)}</p>`+(level.tasks?`<ol class="first-tasks">${level.tasks.map(t=>`<li>${escape(t)}</li>`).join('')}</ol><p><a href="#navigator">去填研究卡片 →</a></p>`:'')+(level.cases?level.cases.map(caseCard).join(''):'')+(level.exercises?level.exercises.map(exercise).join(''):'');
  }
  document.querySelectorAll('[data-exercise]').forEach(form=>{
    const id=form.dataset.exercise,feedback=document.getElementById(id+'-feedback');
    form.addEventListener('submit',event=>{
      event.preventDefault();
      const selected=form.querySelector('input:checked');
      const result=course.grade(id,selected?Number(selected.value):undefined);
      const label={pending:'待选择',supported:'判断有依据',revise:'需要修正'}[result.status];
      feedback.dataset.status=result.status;
      feedback.textContent=`${label}：${result.text}${result.repair?' 下一步：'+result.repair:''}`;
    });
    form.addEventListener('change',()=>{
      feedback.textContent='判断已更改，请再次核对；上一次反馈不用于当前选择。';
      feedback.dataset.status='pending';
    });
  });
  const tabs=[...document.querySelectorAll('[data-learning]')];
  function activate(tab,focus) {
    tabs.forEach(b=>{const active=b===tab;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;document.getElementById(b.getAttribute('aria-controls')).hidden=!active;});
    if(focus)tab.focus();
  }
  tabs.forEach((tab,i)=>{
    tab.addEventListener('click',()=>activate(tab,false));
    tab.addEventListener('keydown',e=>{
      let next;
      if(e.key==='ArrowRight')next=(i+1)%tabs.length;
      if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;
      if(e.key==='Home')next=0;
      if(e.key==='End')next=tabs.length-1;
      if(next!==undefined){e.preventDefault();activate(tabs[next],true);}
    });
  });
})();
