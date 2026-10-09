/* Display only the derived register; textContent prevents source markup injection. */
(function(){
  'use strict';
  const r=window.CASE_STATUS_VIEW;
  const body=document.getElementById('case-status-body');
  if(!body)return;
  if(!r){document.getElementById('case-status-boundary').textContent='状态来源未加载：待核查。';return;}
  for(const row of r.cases){
    const tr=document.createElement('tr');const th=document.createElement('th');th.scope='row';
    const a=document.createElement('a');a.href=row.evidence;a.textContent=row.name;th.append(a);tr.append(th);
    for(const column of r.columns){const s=row.statuses[column],td=document.createElement('td'),strong=document.createElement('strong'),p=document.createElement('p');
      strong.textContent=s.state;p.textContent=s.detail;td.append(strong,p);tr.append(td);}
    body.append(tr);
  }
  document.getElementById('case-status-boundary').textContent=r.boundary;
  document.getElementById('case-status-ai').textContent='AI 测评：'+r.ai.state+'。'+r.ai.detail;
})();
