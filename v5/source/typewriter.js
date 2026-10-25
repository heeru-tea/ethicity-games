// 이야기 연출만 담당합니다. 수업 상태·답안·완료 기록은 바꾸지 않습니다.
const narration={key:null,position:0,parts:[],gates:[],timer:null,finished:new Set(),active:false};
let typingEnabled=readStore('ethicity.privacy.v5.typing',!matchMedia('(prefers-reduced-motion: reduce)').matches)!==false;
function resetNarration(){clearTimeout(narration.timer);narration.key=null;narration.position=0;narration.finished.clear();narration.active=false;}
function narrationPlan(){
  const base=[S.mode,S.roomId||'solo',S.player?.nickname||'',S.friendName||'',S.view,S.round].join(':');
  if(S.view==='intro')return {key:base,text:'.dialogue p',gate:'.intro .buttons,.intro .buttons + .small'};
  if(S.view==='ending')return {key:base,text:'.ending > p:first-of-type,.ending-conversation .dialogue-text,.learning-card blockquote',gate:'.ending > .notice,.ending > .buttons,.recap,.review-list'};
  if(S.view!=='round')return null;
  const stage=roundScreen();
  if(stage==='feedback')return {key:base+':feedback:'+S.answers[S.round].choice,text:'.friend-reply .dialogue-text,.feedback p,.change,.feedback-note',gate:'.action-panel .tagrow,.action-panel .buttons,.action-panel details.guide'};
  if(stage==='submitted')return null;
  if(stage==='choices')return {key:base+':choices',text:'.action-panel > h2,.action-panel > .action-note',gate:'.choice-list,.action-panel > .buttons'};
  if(stage==='observe')return {key:base+':observe',text:'.observe-narration',gate:'.observation-items,.stage-buttons'};
  if(stage==='signals')return {key:base+':signals',text:'.signal-narration',gate:'.signal-picks,.signal-help,.stage-buttons'};
  return {key:base+':case',text:'.story,.case-dialogue .dialogue-text',gate:'.case-dialogue .buttons'};
}
function mountNarration(){
  clearTimeout(narration.timer);narration.active=false;
  const plan=narrationPlan();if(!plan){narration.key=null;return;}
  const nodes=Array.from(main.querySelectorAll(plan.text));if(!nodes.length)return;
  if(narration.finished.has(plan.key)||!typingEnabled)return;
  if(narration.key!==plan.key)narration.position=0;
  narration.key=plan.key;narration.parts=[];narration.gates=Array.from(main.querySelectorAll(plan.gate));
  let start=0;
  for(const node of nodes){
    const original=node.innerHTML;const full=original.replace(/<br\s*\/?\s*>/gi,'\n');
    const decoder=document.createElement('span');decoder.innerHTML=full;
    const letters=Array.from(decoder.textContent);const text=letters.join('');
    node.classList.add('narration-line');node.innerHTML='';
    const reserve=document.createElement('span');reserve.className='narration-reserve';reserve.textContent=text;reserve.setAttribute('aria-hidden','true');
    const ink=document.createElement('span');ink.className='narration-ink';ink.setAttribute('aria-hidden','true');
    const accessible=document.createElement('span');accessible.className='sr';accessible.textContent=text;
    node.append(reserve,ink,accessible);narration.parts.push({node,ink,letters,start,original});start+=letters.length;
  }
  narration.total=start;
  narration.gates.forEach(node=>{node.classList.add('narration-gated');node.inert=true;node.setAttribute('aria-hidden','true');});
  const bar=document.createElement('div');bar.className='narration-toolbar';bar.innerHTML='<span aria-hidden="true" class="narration-pulse">●</span><span>이야기가 이어집니다</span><button type="button" data-reveal-story>클릭해서 모두 보기 <span aria-hidden="true">↵</span></button><span class="sr">화면을 누르거나 Enter 또는 스페이스 키를 누르면 이 장면의 글이 모두 보입니다.</span>';
  const host=S.view==='round'?main.querySelector('.case-dialogue,.observation-screen,.signal-screen,.action-panel'):S.view==='intro'?main.querySelector('.dialogue'):main.querySelector('.learning-card');
  host?.append(bar);applyCommonUI();narration.active=true;paintNarration();scheduleNarration();
}
function paintNarration(){
  for(const p of narration.parts){const count=Math.max(0,Math.min(p.letters.length,narration.position-p.start));p.ink.textContent=p.letters.slice(0,count).join('');p.node.classList.toggle('narration-current',count>0&&count<p.letters.length);}
}
function scheduleNarration(){
  if(!narration.active)return;
  if(narration.position>=narration.total){finishNarration();return;}
  const last=narration.parts.find(p=>narration.position>p.start&&narration.position<=p.start+p.letters.length);
  const ch=last?.letters[narration.position-last.start-1];
  narration.timer=setTimeout(()=>{narration.position++;paintNarration();scheduleNarration();},/[.!?。\n]/.test(ch||'')?160:26);
}
function finishNarration(){
  if(!narration.active)return;
  clearTimeout(narration.timer);narration.position=narration.total;narration.active=false;narration.finished.add(narration.key);
  narration.parts.forEach(p=>{p.node.innerHTML=p.original;p.node.classList.remove('narration-line','narration-current');});
  narration.gates.forEach(node=>{node.classList.remove('narration-gated');node.inert=false;node.removeAttribute('aria-hidden');node.classList.add('narration-arrived');});
  const bar=main.querySelector('.narration-toolbar');
  const skipFocused=bar?.contains(document.activeElement);
  if(bar){bar.innerHTML='<span>✔ 이야기가 모두 펼쳐졌습니다</span>';bar.classList.add('narration-done');}
  if(skipFocused){const next=narration.gates.flatMap(n=>n.matches('button')?[n]:Array.from(n.querySelectorAll('button'))).find(b=>!b.disabled);next?.focus({preventScroll:true});}
}
document.addEventListener('click',event=>{
  if(!narration.active||event.target.closest('input,textarea,select,a,.modal,.appbar'))return;
  if(!event.target.closest('#main,.footer'))return;
  event.preventDefault();event.stopImmediatePropagation();finishNarration();
},true);
document.addEventListener('keydown',event=>{
  if(!narration.active||event.ctrlKey||event.metaKey||event.altKey||event.target.closest('input,textarea,select,.modal,.appbar'))return;
  if(['Enter',' ','1','2','3','4'].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();finishNarration();}
},true);
function toggleNarration(){typingEnabled=!typingEnabled;writeStore('ethicity.privacy.v5.typing',typingEnabled);finishNarration();if(typingEnabled)resetNarration();render();}
