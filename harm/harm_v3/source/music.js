/* 사용자가 제공한 MP3만 재생한다. 자동 시작은 없고 첫 게임 조작 후 재생한다. */
function createBackgroundMusic({read,write,notify}) {
  const settingsKey='ethicity.harm.v3.music';
  const saved=read(settingsKey,{})||{};
  let enabled=saved.enabled!==false,volume=Number.isFinite(saved.volume)?Math.max(0,Math.min(1,saved.volume)):0.18;
  let audio=null,active=false,pending=false,warned=false;
  const asset=JSON.parse(document.getElementById('music-asset').textContent);
  function persist(){write(settingsKey,{enabled,volume});}
  function update(){
    const button=document.querySelector('[data-action="music"]');
    if(button){button.textContent='배경음악 '+(enabled?'켜짐':'꺼짐');button.setAttribute('aria-pressed',String(enabled));}
    const slider=document.getElementById('music-volume');if(slider)slider.value=String(Math.round(volume*100));
    const label=document.getElementById('music-volume-label');if(label)label.textContent=Math.round(volume*100)+'%';
  }
  async function play(){
    if(!enabled||!active||document.hidden||pending)return;
    if(!audio){audio=new Audio(asset.src);audio.loop=true;audio.preload='none';audio.addEventListener('error',()=>{if(!warned){warned=true;notify('배경음악을 재생하지 못했다. 게임은 계속 진행할 수 있다.');}});}
    audio.volume=volume;if(!audio.paused)return;
    pending=true;
    try{await audio.play();if(!enabled||!active||document.hidden)audio.pause();}
    catch{if(!warned){warned=true;notify('음악 재생을 기다린다. 화면·소리에서 배경음악을 다시 켤 수 있다.');}}
    finally{pending=false;}
  }
  function start(){active=true;void play();}
  function stop(){active=false;audio?.pause();}
  function toggle(){enabled=!enabled;persist();if(enabled){active=true;void play();}else audio?.pause();update();}
  function setVolume(value){const n=Number(value);if(!Number.isFinite(n))return;volume=Math.max(0,Math.min(100,n))/100;if(audio)audio.volume=volume;persist();update();}
  document.addEventListener('visibilitychange',()=>{if(document.hidden)audio?.pause();else void play();});
  window.addEventListener('pagehide',stop);
  return {start,stop,toggle,setVolume,update,state:()=>({enabled,volume,active,playing:!!audio&&!audio.paused}),controls:()=>`<button type="button" class="ee-button secondary effect-control" data-action="music"></button><label class="music-volume" for="music-volume">음악 크기 <span id="music-volume-label"></span><input id="music-volume" type="range" min="0" max="100" step="1" aria-label="배경음악 크기"></label><small>Pixel Adventure · 제공한 음악</small>`};
}
