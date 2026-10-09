/* Offline teaching outputs only. No fetch, model API, storage or upload. */
(() => {
  'use strict';
  const result = window.RESULT_VIEW && window.RESULT_VIEW.clinical;
  if (!result || result.simulation !== true) return;
  const $ = id => document.getElementById(id);
  $('clinical-result-legend').textContent = result.report.legend;
  $('diagnostic-legend').textContent = result.diagnosticLegend;
  const body = $('clinical-table-body');
  body.replaceChildren();
  function row(label, values, missing = false) {
    const tr = document.createElement('tr');
    if (missing) tr.className = 'missing-row';
    [label, ...values].forEach((text, i) => {
      const cell = document.createElement(i === 0 ? 'th' : 'td');
      if (i === 0) cell.scope = 'row';
      cell.textContent = text;
      tr.append(cell);
    });
    body.append(tr);
  }
  const fields = [
    ['age', '年龄，岁；均值 (SD)'],
    ['sex', '记录性别'],
    ['baseline-sbp', '基线收缩压，mmHg；均值 (SD)'],
    ['baseline-crp', '基线 CRP，mg/L；中位数 [Q1, Q3]']
  ];
  for (const [field, label] of fields) {
    const groups = ['A', 'B'].map(g => result.table1[field][g]);
    if (field === 'sex') {
      for (const level of ['F', 'M']) row(`${label}：${level}`, groups.map(s => `${s.levels[level].n} / ${s.n} (${s.levels[level].percent.toFixed(1)}%)`));
    } else {
      row(label, groups.map(s => {
        const text = field === 'baseline-crp'
          ? `${s.median.toFixed(2)} [${s.q1.toFixed(2)}, ${s.q3.toFixed(2)}]`
          : `${s.mean.toFixed(1)} (${s.sd.toFixed(1)})`;
        return `${text}；已知 n=${s.n}`;
      }));
    }
    row(`${label.split('；')[0]}：缺失 n`, groups.map(s => String(s.missing)), true);
  }
  const d = result.diagnostics;
  $('diagnostic-values').textContent = `结局诊断：Shapiro–Wilk A W=${d.A.shapiroW.toFixed(3)}, P=${d.A.shapiroP.toFixed(4)}；B W=${d.B.shapiroW.toFixed(3)}, P=${d.B.shapiroP.toFixed(4)}。中位数 Levene F=${d.levene.F.toFixed(3)}, P=${d.levene.p.toFixed(4)}。这些数值不触发方法切换。`;
  const tabs = [...document.querySelectorAll('[data-report]')];
  function activate(button, focus = false) {
    tabs.forEach(tab => {
      tab.setAttribute('aria-selected', String(tab === button));
      tab.tabIndex = tab === button ? 0 : -1;
    });
    $('report-output').setAttribute('aria-labelledby', button.id);
    $('report-text').value = result.report[button.dataset.report];
    $('report-copy-status').textContent = '';
    if (focus) button.focus();
  }
  tabs.forEach((button, i) => {
    button.addEventListener('click', () => activate(button));
    button.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (i + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (i + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); activate(tabs[next], true); }
    });
  });
  $('copy-report').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('report-text').value);
      $('report-copy-status').textContent = '已复制模拟段落。使用前核对实际研究方案。';
    } catch {
      $('report-text').focus(); $('report-text').select();
      $('report-copy-status').textContent = '浏览器未允许自动复制，文字已选中，请手动复制。';
    }
  });
  const review = [...document.querySelectorAll('[data-review]')];
  review.forEach(input => input.addEventListener('change', () => {
    const n = review.filter(item => item.checked).length;
    $('review-progress').textContent = `已记录 ${n} / ${review.length} 项。勾选是学习记录，仍需人工审核。`;
  }));
  activate(tabs[0]);
})();
