(function(root){'use strict';
// User-approved defaults; saved explicit choice wins. Never autoplay on page load.
// diversity splits by role (teacher ON, student OFF); accountability has no role split.
const DEFAULT_ENABLED_BY_GAME=Object.freeze({accountability:true});
const VOLUME = 0.6;
const script=document.currentScript,game=script.dataset.game,role=document.body.dataset.role;
if(!['accountability','diversity'].includes(game)||root.EthicityMusic)return;
const DEFAULT_ENABLED=game==='diversity'?role==='teacher':DEFAULT_ENABLED_BY_GAME[game];
const key='ethicity.'+game+(game==='diversity'?'.'+role:'')+'.audio.enabled';let saved=null;
try{const v=localStorage.getItem(key);if(v==='true'||v==='false')saved=v==='true';}catch{}
let enabled=saved===null?DEFAULT_ENABLED:saved,active=false,preview=false,player=null,token=0,previewTimer=null,state='idle',failed=false;
const en=()=>document.documentElement.lang==='en';
const box=document.createElement('div');box.className='ethicity-music-controls';box.style.cssText='display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0;font-size:14px';box.setAttribute('aria-label',en()?'Music controls':'소리 설정');
const toggle=document.createElement('button'),test=document.createElement('button'),status=document.createElement('span');toggle.type=test.type='button';status.setAttribute('role','status');status.setAttribute('aria-live','polite');box.append(toggle,test,status);
(document.querySelector(game==='accountability'?'header nav':'.game-header')||document.body).append(box);
function render(){toggle.setAttribute('aria-pressed',String(enabled===true));toggle.textContent=en()?(enabled===true?'Sound on':'Sound off'):(enabled===true?'소리 켜짐':'소리 꺼짐');test.textContent=en()?'Test sound':'소리 테스트';status.textContent=state==='blocked'?(en()?'Playback blocked. Press Test sound.':'재생이 차단됐어요. 소리 테스트를 눌러 주세요.'):state==='error'?(en()?'Music unavailable. You can keep playing.':'음악을 불러오지 못했어요. 활동은 계속할 수 있어요.'):preview?(en()?'5-second preview':'5초 미리듣기'):enabled===null?(en()?'Music is optional.':'필요할 때 소리를 켤 수 있어요.'):state==='playing'?(en()?'Music playing':'음악 재생 중'):'';}
function audio(){if(player)return player;player=new Audio();player.preload='none';player.loop=true;player.volume=VOLUME;const ogg=!!player.canPlayType('audio/ogg; codecs="vorbis"');player.src=new URL('assets/audio/bgm-'+game+(ogg?'.ogg':'.mp3'),script.src).href;player.addEventListener('error',()=>{state='error';failed=true;render();});return player;}
function pause(){token++;if(player)player.pause();state='paused';render();}
function play(){if(document.hidden||(!preview&&(!active||enabled!==true)))return;const ticket=++token;let p;try{p=audio();failed=false;const result=p.play();Promise.resolve(result).then(()=>{if(ticket!==token||document.hidden||(!preview&&(!active||enabled!==true))){p.pause();return;}if(!failed){state='playing';render();}}).catch(e=>{if(ticket!==token)return;state=e?.name==='NotAllowedError'?'blocked':'error';render();});}catch{state='error';render();}}
function stopPreview(){preview=false;clearTimeout(previewTimer);previewTimer=null;}
function start(){active=true;stopPreview();play();render();}
function stop(){active=false;stopPreview();pause();}
toggle.onclick=()=>{stopPreview();enabled=enabled!==true;try{localStorage.setItem(key,String(enabled));}catch{}if(enabled){active=true;play();}else pause();render();};
test.onclick=()=>{stopPreview();preview=true;play();render();previewTimer=setTimeout(()=>{stopPreview();if(active&&enabled===true)play();else pause();},5000);};
const startSelector=game==='accountability'?'[data-action="start"]':(role==='teacher'?'#create,#connect':'#join');
document.addEventListener('click',e=>{const target=e.target.closest?.(startSelector);if(target)start();if(game==='diversity'&&e.target.closest?.('#leave-keep,#leave-discard'))stop();},true);
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopPreview();pause();}else play();});root.addEventListener('pagehide',stop);
if(typeof MutationObserver==='function')new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
root.EthicityMusic={start,stop,get enabled(){return enabled;},get status(){return state;},get defaultEnabled(){return DEFAULT_ENABLED;},get source(){return player?.src||null;}};render();
})(window);
