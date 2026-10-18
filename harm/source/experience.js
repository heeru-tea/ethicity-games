// 화면 갱신과 독립된 대사·클릭·음악 효과. 외부 파일이나 네트워크를 사용하지 않습니다.
function createHarmExperience({read,write,notify}){
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
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

  const layer=document.createElement('div');layer.className='sparkle-layer';layer.setAttribute('aria-hidden','true');document.body.append(layer);
  function burst(x,y){
    if(!sparkle)return;
    while(layer.children.length>=8)layer.firstElementChild.remove();
    const mark=document.createElement('span');mark.className='click-sparkle'+(motion.matches?' reduced':'');mark.style.left=x+'px';mark.style.top=y+'px';
    const ring=document.createElement('i');ring.className='sparkle-ring';mark.append(ring);
    for(let i=0;i<8;i++){
      const star=document.createElement('i'),angle=i*Math.PI/4,distance=i%2?34:46;
      star.className='sparkle-star';star.textContent=i%2?'✦':'✧';
      star.style.setProperty('--dx',Math.cos(angle)*distance+'px');star.style.setProperty('--dy',Math.sin(angle)*distance+'px');
      star.style.setProperty('--turn',(i%2?35:-35)+'deg');mark.append(star);
    }
    layer.append(mark);setTimeout(()=>mark.remove(),720);
  }
  document.addEventListener('pointerdown',e=>{if(e.isPrimary&&e.button===0)burst(e.clientX,e.clientY);},true);
  document.addEventListener('click',e=>{if(e.detail===0){const target=e.target.closest('button,summary,[role="button"]');if(target){const r=target.getBoundingClientRect();burst(r.left+r.width/2,r.top+r.height/2);}}},true);

  // 오리지널 16마디: C장조, 76 BPM. 부드러운 종소리와 낮은 화음으로 반복합니다.
  const melody=[
    [72,null,76,79,76,null,74,null],[72,null,69,72,76,null,72,null],
    [69,null,72,77,76,null,72,null],[71,null,74,79,74,null,71,null],
    [72,76,79,null,81,null,79,76],[76,null,72,69,72,null,76,null],
    [77,null,76,72,69,null,72,null],[74,null,71,null,67,null,null,null],
    [76,null,79,84,79,null,76,null],[76,72,69,null,72,null,76,null],
    [77,null,81,79,77,null,76,null],[74,null,79,77,74,null,71,null],
    [72,null,76,79,76,null,72,null],[69,null,72,76,72,null,69,null],
    [69,null,72,77,74,null,71,null],[72,null,null,null,67,null,null,null]
  ];
  const chords=[[48,60,64,67],[45,57,60,64],[41,57,60,65],[43,55,59,62]];
  let context=null,master=null,musicOn=false,musicBusy=false,audioTimer=null,step=0,nextNote=0;
  let volume=Number(read('ethicity.harm.volume',25));if(!Number.isFinite(volume))volume=25;volume=Math.max(0,Math.min(60,volume));
  const notes=new Set(),beat=60/76/2;
  function note(midi,when,length,level,type='sine'){
    const osc=context.createOscillator(),gain=context.createGain();osc.type=type;osc.frequency.value=440*2**((midi-69)/12);
    gain.gain.setValueAtTime(0,when);gain.gain.linearRampToValueAtTime(level,when+0.025);gain.gain.exponentialRampToValueAtTime(0.0001,when+length);
    osc.connect(gain);gain.connect(master);osc.start(when);osc.stop(when+length+0.05);notes.add(osc);
    osc.onended=()=>{notes.delete(osc);osc.disconnect();gain.disconnect();};
  }
  function scheduleMusic(){
    if(!musicOn||document.hidden||context.state!=='running')return;
    if(nextNote<context.currentTime)nextNote=context.currentTime+0.04;
    while(nextNote<context.currentTime+0.18){
      const bar=Math.floor(step/8)%16,slot=step%8,pitch=melody[bar][slot],chord=chords[bar%4];
      if(pitch!==null){note(pitch,nextNote,1.25,0.13);note(pitch+12,nextNote,0.55,0.012);}
      if(slot===0){note(chord[0],nextNote,2.8,0.12);for(const p of chord.slice(1))note(p,nextNote,2.7,0.035,'triangle');}
      if(slot===4)note(chord[2],nextNote,1.4,0.04);
      nextNote+=beat;step=(step+1)%128;
    }
  }
  function stopNotes(){clearInterval(audioTimer);audioTimer=null;for(const osc of notes){try{osc.stop();}catch{}}notes.clear();}
  function startScheduler(){clearInterval(audioTimer);nextNote=context.currentTime+0.06;scheduleMusic();audioTimer=setInterval(scheduleMusic,80);}
  async function toggleMusic(){
    if(musicBusy)return;musicBusy=true;
    try{
      if(musicOn){musicOn=false;stopNotes();await context.suspend();}
      else{
        const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('unavailable');
        if(!context){context=new Audio();master=context.createGain();master.gain.value=volume/100;master.connect(context.destination);context.addEventListener('statechange',updateControls);}
        await context.resume();if(context.state!=='running')throw Error('not running');musicOn=true;startScheduler();
      }
    }catch{musicOn=false;stopNotes();notify('이 기기에서는 음악을 시작하지 못했습니다. 음악 켜기를 다시 누릅니다. 게임은 계속할 수 있습니다.');}
    finally{musicBusy=false;updateControls();}
  }
  function changeVolume(value){volume=Math.max(0,Math.min(60,Number(value)||0));write('ethicity.harm.volume',volume);if(master)master.gain.setTargetAtTime(volume/100,context.currentTime,0.08);updateControls();}
  document.addEventListener('visibilitychange',async()=>{
    if(!context||!musicOn)return;
    try{if(document.hidden){stopNotes();await context.suspend();}else{await context.resume();if(musicOn)startScheduler();}}
    catch{musicOn=false;stopNotes();}updateControls();
  });
  window.addEventListener('pagehide',()=>{musicOn=false;stopNotes();context?.suspend().catch(()=>{});});
  function controls(){return `<details class="experience-settings"><summary>♪ 화면·소리</summary><div class="experience-popover"><strong>탐험 화면·소리</strong><button type="button" class="effect-control" data-action="typing"></button><button type="button" class="effect-control" data-action="sparkle"></button><button type="button" class="effect-control music-control" data-action="music"></button><label class="music-volume">음악 크기 <output id="music-volume-value">${volume}%</output><input type="range" id="music-volume" aria-label="배경음악 크기" min="0" max="60" step="5" value="${volume}"></label><p>윤리시티의 작은 약속 · 잔잔한 오르골풍<br>음악은 듣고 싶은 기기에서 켭니다.</p></div></details>`;}
  function updateControls(){
    for(const [action,label,on] of [['typing',`대사 효과 ${typing?'켜짐':'꺼짐'}`,typing],['sparkle',`클릭 반짝임 ${sparkle?'켜짐':'꺼짐'}`,sparkle],['music',musicOn?'♫ 음악 끄기':'♪ 음악 켜기',musicOn]]){
      const el=document.querySelector(`[data-action="${action}"]`);if(el){el.textContent=label;el.setAttribute('aria-pressed',String(on));if(action==='music')el.dataset.audioState=context?.state||'off';}
    }
    const output=document.getElementById('music-volume-value');if(output)output.textContent=volume+'%';
  }
  return {sync,finish,controls,updateControls,toggleTyping,toggleMusic,changeVolume,toggleSparkle(){sparkle=!sparkle;write('ethicity.harm.sparkle',sparkle);updateControls();}};
}
