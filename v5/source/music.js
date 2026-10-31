'use strict';
// 사용자가 제공한 배경음악입니다. 공통 효과음과 별도로 조절합니다.
// 오디오 요소는 화면을 다시 그려도 유지되어 라운드마다 처음으로 돌아가지 않습니다.
const musicAudio=document.getElementById('background-music');
const musicTeacher=params.get('mode')==='teacher';
const musicKey='ethicity.privacy.v5.music.'+(musicTeacher?'teacher':'player');
const musicSaved=readStore(musicKey,{});
let musicEnabled=typeof musicSaved?.enabled==='boolean'?musicSaved.enabled:!musicTeacher;
let musicVolume=Number.isFinite(musicSaved?.volume)?Math.max(0,Math.min(1,musicSaved.volume)):.2;
let musicStarted=false,musicPending=false,musicError=false,musicAttempt=0;
musicAudio.volume=musicVolume;
function saveMusicPreference(){writeStore(musicKey,{enabled:musicEnabled,volume:musicVolume});}
function musicLabel(){return musicPending?'배경음악 준비 중':!musicAudio.paused?'배경음악 켜짐':musicError?'배경음악 다시 재생':musicEnabled?'배경음악 재생':'배경음악 꺼짐';}
function syncMusicControls(){
 const button=document.querySelector('[data-action="toggle-music"]');
 if(button){button.textContent=musicLabel();button.setAttribute('aria-pressed',String(!musicAudio.paused));button.setAttribute('aria-label',musicPending||!musicAudio.paused?'배경음악 끄기':'배경음악 켜기');}
 const value=document.getElementById('music-volume-value');if(value)value.textContent=Math.round(musicVolume*100)+'%';
}
function mountMusicControls(){
 if(!topBarElement.querySelector('.music-controls')){
  const group=document.createElement('div');group.className='music-controls';
  group.innerHTML=`<button type="button" class="textbtn" data-action="toggle-music"></button><label class="music-volume"><span>음량</span><input id="music-volume" type="range" min="0" max="100" step="5" value="${Math.round(musicVolume*100)}" aria-label="배경음악 음량"><output id="music-volume-value" for="music-volume"></output></label>`;
  topBarElement.insertBefore(group,topBarElement.querySelector('[data-action="toggle-sound"]'));
 }
 syncMusicControls();
}
async function playMusic(){
 if(!musicEnabled||document.hidden||musicPending||!musicAudio.paused)return;
 const attempt=++musicAttempt;musicPending=true;musicError=false;syncMusicControls();
 try{
  await musicAudio.play();
  if(attempt!==musicAttempt)return;
  if(!musicEnabled||document.hidden){musicAudio.pause();return;}
  musicStarted=true;
 }catch(error){
  if(attempt!==musicAttempt||error?.name==='AbortError')return;
  if(error?.name!=='NotAllowedError'){musicError=true;showToast('음악을 불러오지 못했습니다. 배경음악 버튼으로 다시 시도할 수 있습니다.');}
 }finally{if(attempt===musicAttempt)musicPending=false;syncMusicControls();}
}
function pauseMusic(){musicAttempt++;musicPending=false;musicAudio.pause();syncMusicControls();}
function toggleMusic(){
 if(musicPending||!musicAudio.paused){musicEnabled=false;pauseMusic();}
 else{musicEnabled=true;playMusic();}
 saveMusicPreference();syncMusicControls();
}
document.addEventListener('click',event=>{
 if(event.target.closest('[data-action="toggle-music"]')){toggleMusic();return;}
 // 첫 실제 클릭으로 브라우저의 자동 재생 제한을 지킵니다. 꺼 둔 음악은 다시 켜지 않습니다.
 if(event.isTrusted&&musicEnabled)playMusic();
});
document.addEventListener('keydown',event=>{
 if(!event.isTrusted||!['Enter',' '].includes(event.key)||event.target.closest('[data-action="toggle-music"],input,textarea,select'))return;
 if(musicEnabled)playMusic();
});
document.addEventListener('input',event=>{
 if(event.target.id!=='music-volume')return;
 musicVolume=Math.max(0,Math.min(1,Number(event.target.value)/100));musicAudio.volume=musicVolume;saveMusicPreference();syncMusicControls();
});
document.addEventListener('visibilitychange',()=>{
 if(document.hidden)pauseMusic();else if(musicEnabled&&musicStarted)playMusic();
});
window.addEventListener('pagehide',pauseMusic);
window.addEventListener('pageshow',()=>{if(musicEnabled&&musicStarted)playMusic();});
for(const name of ['playing','pause'])musicAudio.addEventListener(name,syncMusicControls);
