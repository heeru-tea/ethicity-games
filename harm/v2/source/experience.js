// 타이핑과 공통 클릭 효과를 제공합니다. 배경음악은 사용하지 않습니다.
function createHarmExperience({read,write,notify}){
  let typing=read('ethicity.harm.typing',true)!==false;
  let sparkle=read('ethicity.harm.sparkle',true)!==false;
  const speeches=new Map();
  let bound=[],observer=null,timer=null;
  const escapeText=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function paint(s){
    if(!s.el?.isConnected)return;
    const ink=s.el.querySelector('.speech-ink');
    if(ink)ink.textContent=s.chars.slice(0,s.at).join('');
    s.el.classList.toggle('is-typing',typing&&s.at<s.chars.length);
    s.el.dataset.typingState=s.at===s.chars.length?'complete':s.visible?'typing':'waiting';
  }
  function tick(){
    timer=null;
    if(document.hidden)return;
    for(const s of bound){if(typing&&s.visible&&s.at<s.chars.length){s.at++;paint(s);}}
    if(bound.some(s=>typing&&s.visible&&s.at<s.chars.length))timer=setTimeout(tick,38);
  }
  function schedule(){if(timer===null&&bound.some(s=>typing&&s.visible&&s.at<s.chars.length))timer=setTimeout(tick,38);}
  function sync(){
    clearTimeout(timer);timer=null;observer?.disconnect();bound=[];
    if(typeof IntersectionObserver!=='undefined')observer=new IntersectionObserver(entries=>{
      for(const e of entries){const s=bound.find(s=>s.el===e.target);if(s){s.visible=e.isIntersecting;paint(s);}}
      schedule();
    },{threshold:0.1});
    for(const el of document.querySelectorAll('[data-speech]')){
      const full=el.dataset.fullSpeech||el.textContent,key=el.dataset.speech+'\n'+full;
      let s=speeches.get(key);
      if(!s){s={chars:[...full],at:0,visible:false};speeches.set(key,s);}
      s.el=el;s.visible=!observer;if(!typing)s.at=s.chars.length;
      el.dataset.fullSpeech=full;
      el.setAttribute('aria-label',full+' (누르면 한 번에 봅니다)');
      el.innerHTML=`<span class="speech-reserve" aria-hidden="true">${escapeText(full)}</span><span class="speech-ink" aria-hidden="true"></span>`;
      bound.push(s);paint(s);observer?.observe(el);
    }
    // 지난 수업의 대사를 무한히 보관하지 않습니다.
    if(speeches.size>180)for(const [key,s] of speeches){if(!bound.includes(s))speeches.delete(key);if(speeches.size<=120)break;}
    schedule();
  }
  function finish(el=null){for(const s of bound){if(!el||s.el===el){s.at=s.chars.length;paint(s);}}}
  function toggleTyping(){typing=!typing;write('ethicity.harm.typing',typing);for(const s of bound){s.at=typing?0:s.chars.length;paint(s);}schedule();updateControls();}
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(timer);timer=null;}else schedule();});

  function burst(x,y){if(sparkle)commonBurst(x,y,'clue');}
  document.addEventListener('pointerdown',e=>{if(e.isPrimary&&e.button===0)burst(e.clientX,e.clientY);},true);
  document.addEventListener('click',e=>{if(e.detail===0){const target=e.target.closest('button,summary,[role="button"]');if(target){const r=target.getBoundingClientRect();burst(r.left+r.width/2,r.top+r.height/2);}}},true);

  function controls(){return `<details class="experience-settings"><summary class="ee-button secondary">${commonIcon('settings',20)}화면·소리</summary><div class="experience-popover ee-panel"><strong>탐험 화면·소리</strong><button type="button" class="ee-button secondary effect-control" data-action="typing"></button><button type="button" class="ee-button secondary effect-control" data-action="sparkle"></button><button type="button" class="ee-button secondary effect-control" data-action="sfx"></button><p>클릭과 결과를 알려 주는 효과음을 켜거나 끕니다.</p></div></details>`;}
  function updateControls(){
    updateSoundControl();
    for(const [action,label,on] of [['typing',`대사 효과 ${typing?'켜짐':'꺼짐'}`,typing],['sparkle',`클릭 반짝임 ${sparkle?'켜짐':'꺼짐'}`,sparkle]]){
      const el=document.querySelector(`[data-action="${action}"]`);if(el){el.textContent=label;el.setAttribute('aria-pressed',String(on));}
    }
  }
  return {sync,finish,controls,updateControls,toggleTyping,toggleSparkle(){sparkle=!sparkle;write('ethicity.harm.sparkle',sparkle);updateControls();}};
}
