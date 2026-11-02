(function(root){'use strict';
let phase='',step='observe',opened=new Set(),context='';
function selectContext(key){if(context!==key){context=key;phase='';step='observe';opened=new Set();}}
function decorate(doc,c,hasObservation,hasProposal){
 const main=doc.getElementById('main');if(!main)return;
 if(phase!==c.phase){phase=c.phase;step=c.phase==='proposal'&&hasObservation?'propose':'observe';}
 main.classList.add('student-mission-stage');
 const obs=doc.getElementById('observation')?.closest('section'),proposal=doc.getElementById('proposal')?.closest('section');
 if(c.phase==='proposal'&&obs&&proposal){
  const bar=doc.createElement('nav');bar.className='local-mission-tabs';bar.setAttribute('aria-label','내 조사 순서');
  for(const [key,label]of [['observe','그림 조사'],['propose','보완 생각']]){const b=doc.createElement('button');b.textContent=label;b.type='button';b.setAttribute('aria-pressed',String(step===key));b.onclick=()=>{step=key;obs.hidden=key!=='observe';proposal.hidden=key!=='propose';bar.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));};bar.append(b);}main.prepend(bar);obs.hidden=step!=='observe';proposal.hidden=step!=='propose';
 }
 const results=doc.getElementById('results');if(results){const key=context+'/'+c.activeRound;const actual=results.querySelector('.result');if(actual&&!opened.has(key)){
  const box=doc.createElement('section');box.className='result-envelope';const b=doc.createElement('button');b.textContent='도착한 그림 결과 열어보기';b.className='ee-button';box.append(b);
  const saved=Array.from(results.children);saved.forEach(el=>el.hidden=true);results.prepend(box);
  b.onclick=()=>{opened.add(key);saved.forEach(el=>el.hidden=false);box.remove();};
 }}
 const end=main.querySelector('.ending-replay');const reflect=doc.getElementById('reflection')?.closest('section');
 if(end&&reflect&&main.querySelector('.saved-reflection')){reflect.hidden=true;const edit=doc.createElement('button');edit.textContent='내 성찰 다시 보기·고치기';edit.onclick=()=>{reflect.hidden=!reflect.hidden;};end.before(edit);}
}
function teacher(doc,c){if(root.TeacherDashboard)return;const main=doc.getElementById('main');if(!main)return;main.classList.add('teacher-control-stage');const bar=doc.createElement('aside');bar.className='teacher-next';const ids={issue:'proposal-phase',proposal:'review-phase',review:c.activeRound?'compile':'freeze',vote:'review-phase',pool:'run',draw:'reflect-phase',reflection:'end'};const target=doc.getElementById(ids[c.phase]);if(target){const label=doc.createElement('strong');label.textContent='교사 진행 · '+target.textContent;bar.append(label);const button=doc.createElement('button');button.className='ee-button';button.textContent=target.textContent;button.disabled=target.disabled;button.onclick=()=>{if(target.id==='end'){target.scrollIntoView({block:'center'});target.focus();}else target.click();};bar.append(button);if(target.disabled){const reason=doc.createElement('p');reason.textContent=target.title||'현재 단계의 제출 상태를 확인해 주세요.';bar.append(reason);}main.prepend(bar);}}
const api={decorate,teacher,selectContext};if(typeof module!=='undefined')module.exports=api;else root.ClassroomMissions=api;
})(globalThis);
