/* Original recorded MP3 soundtrack and effects. Uses HTMLAudioElement for file:// browser compatibility. */
(() => {
  'use strict';
  const KEY='ethicity.park.audio.enabled';
  const sources={bgm:'park-theme.mp3',dialogue:'dialogue.mp3',collect:'collect.mp3',portal:'portal.mp3',select:'select.mp3',error:'error.mp3',success:'success.mp3',complete:'complete.mp3'};
  const supported=typeof Audio==='function';
  let enabled=true,active=false,status='ready',lastError='',listener=null;
  try { enabled=localStorage.getItem(KEY)!=='false'; } catch {}
  let bgm=null;
  const effects=new Map();
  const notify=()=>{if(listener)listener({enabled,active,status,lastError});};
  function create(name){const el=new Audio('../publicness/assets/audio/'+sources[name]);el.preload='auto';el.volume=name==='bgm'?.65:.9;el.addEventListener('error',()=>{status='error';lastError='음악 파일을 읽을 수 없습니다. ZIP 전체를 압축 해제했는지 확인하세요.';notify();});return el;}
  function initialize(){if(!supported)return false;if(!bgm){bgm=create('bgm');bgm.loop=true;}return true;}
  function errorMessage(error){const code=error?.name||'';if(code==='NotAllowedError')return '브라우저가 소리 재생을 차단했습니다. 🔔 소리 테스트를 직접 눌러 주세요.';if(code==='NotSupportedError')return '오디오 형식이 지원되지 않습니다. Chrome 또는 Edge로 실행해 주세요.';return '소리 재생에 실패했습니다. 탭 음소거 및 컴퓨터 음량을 확인해 주세요.';}
  function attempt(el,success='playing'){
    try {const promise=el.play();if(promise&&typeof promise.then==='function')promise.then(()=>{status=success;lastError='';notify();}).catch(error=>{status='blocked';lastError=errorMessage(error);notify();});else{status=success;lastError='';notify();}return promise;}
    catch(error){status='blocked';lastError=errorMessage(error);notify();return null;}
  }
  function start(){active=true;if(!enabled){status='muted';notify();return;}if(!initialize()){status='unsupported';notify();return;}bgm.volume=.65;attempt(bgm);}
  function pause(){active=false;if(bgm){bgm.pause();bgm.currentTime=0;}for(const effect of effects.values())effect.pause();status='paused';notify();}
  function play(kind){if(!enabled||!active||!initialize()||document.hidden)return;const name=sources[kind]?kind:'select';let element=effects.get(name);if(!element){element=create(name);effects.set(name,element);}try {element.pause();element.currentTime=0;} catch {}attempt(element, status==='playing'?'playing':'effects');}
  function setEnabled(value){enabled=!!value;try{localStorage.setItem(KEY,String(enabled));}catch{}if(!enabled){if(bgm)bgm.pause();for(const item of effects.values())item.pause();status='muted';notify();}else if(active)start();else{status='ready';notify();}return enabled;}
  function toggle(){return setEnabled(!enabled);}
  function test(){if(!supported){status='unsupported';lastError='이 브라우저는 오디오 재생 기능을 지원하지 않습니다.';notify();return;}if(!enabled)setEnabled(true);initialize();let sample=effects.get('collect');if(!sample){sample=create('collect');effects.set('collect',sample);}try{sample.pause();sample.currentTime=0;}catch{}attempt(sample,'test-ok');}
  document.addEventListener('visibilitychange',()=>{if(!bgm)return;if(document.hidden){bgm.pause();}else if(active&&enabled)attempt(bgm);});
  window.addEventListener('pagehide',()=>{if(bgm)bgm.pause();});
  window.ParkAudio={start,pause,play,toggle,setEnabled,test,onChange(fn){listener=fn;notify();},get enabled(){return enabled;},get status(){return status;},get lastError(){return lastError;},supported};
})();
