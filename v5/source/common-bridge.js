'use strict';
// 공통 팩은 수정하지 않습니다. 허브 저장 ID와 공식 그림 ID만 여기서 연결합니다.
const COMMON_BASE = './common';
const CHARACTER_ART = Object.freeze({boy:'haneul', pony:'jiho', friend:'saebom', bot:'robot'});
let commonAssets = null, commonLoad = null, effectFrame = 0, feedbackKey = '';
let soundEnabled = false;
function assetId(type){return CHARACTER_ART[type] || (ETHICITY_COMMON_MANIFEST.characters[type] ? type : 'haneul');}
function commonIcon(id,size=32){return `<canvas class="ee-icon" width="64" height="64" data-common-icon="${id}" style="width:${size}px;height:${size}px" aria-hidden="true"></canvas>`;}
function loadOriginalArt(){
 if(!commonLoad)commonLoad=EthicityAssets.load(ETHICITY_COMMON_MANIFEST,COMMON_BASE).then(a=>{commonAssets=a;a.setSound(soundEnabled);return a;}).catch(e=>{commonLoad=null;throw e;});
 return commonLoad;
}
function drawCharacter(canvas,type,mood='neutral'){
 canvas.width=256;canvas.height=256;
 if(commonAssets)commonAssets.drawPortrait(canvas.getContext('2d'),assetId(type),['happy','worried','explaining'].includes(mood)?mood:'neutral',0,0,256);
}
function drawCommonStage(canvas){
 canvas.width=1280;canvas.height=720;const x=canvas.getContext('2d');
 const bg=canvas.dataset.commonStage||'courtyard';
 commonAssets.drawBackground(x,bg);
 const player=assetId(characterType(S.player?.character));
 const photo=canvas.hasAttribute('data-case-photo');
 commonAssets.drawCharacter(x,photo?'saebom':player,520,515,'down',1,.9);
 commonAssets.drawCharacter(x,photo?'onyu':'saebom',655,510,'down',1,.9);
 commonAssets.drawCharacter(x,photo?'daon':'robot',775,515,'down',1,photo?.9:.7);
 if(!photo)commonAssets.drawProp(x,'notebook',915,545,80);
}
function applyCommonUI(root=document){
 const map={'.panel,.modalbox,.stat,.learning-card,.stepcard': 'ee-panel', '.dialogue-bubble':'ee-speech', '.dialogue-speaker':'ee-speaker', '.choice,.signal,.character':'ee-choice', '.chip,.pill':'ee-badge', '.notice,.feedback-note':'ee-notice', '.notice.good,.feedback.safe':'ee-success', '.feedback.check,.feedback.risk':'ee-notice'};
 for(const [selector,cls]of Object.entries(map))root.querySelectorAll(selector).forEach(e=>e.classList.add(cls));
 root.querySelectorAll('button.btn,button.textbtn,[data-reveal-story]').forEach(b=>{b.classList.add('ee-button');if(!b.classList.contains('primary')&&!b.hasAttribute('data-reveal-story'))b.classList.add('secondary');});
 root.querySelectorAll('.dialogue-player .dialogue-speaker').forEach(e=>{e.textContent=S.player?.nickname||'탐험가';});
}
function paintArt(){
 applyCommonUI();
 if(!commonAssets){loadOriginalArt().then(paintArt).catch(()=>{const e=document.getElementById('asset-status');if(e){e.hidden=false;e.textContent='공통 그림을 불러오지 못했습니다. common 폴더와 함께 게임을 열어 주시기 바랍니다. 글과 선택으로 탐험을 계속할 수 있습니다.';}});return;}
 document.querySelectorAll('[data-character]').forEach(c=>drawCharacter(c,c.dataset.character,c.dataset.mood));
 document.querySelectorAll('[data-common-stage],[data-village]').forEach(drawCommonStage);
 document.querySelectorAll('[data-common-icon]').forEach(c=>{c.width=64;c.height=64;commonAssets.drawIcon(c.getContext('2d'),c.dataset.commonIcon,0,0,64);});
 const stage=S.view==='ending'?'ending':S.view==='round'?roundScreen():'';
 const key=[S.mode,S.roomId,S.round,stage,S.answers[S.round]?.choice].join(':');
 if((stage==='feedback'||stage==='ending')&&key!==feedbackKey){feedbackKey=key;const kind=stage==='ending'?'correct':activeChoice()?.kind==='safe'?'correct':'retry';playFeedback(kind);commonAssets.playSound(stage==='ending'?'win':kind==='correct'?'collect':'retry');}
}
function playFeedback(id){
 const c=document.querySelector('[data-feedback-effect]');if(!c||!commonAssets)return;
 cancelAnimationFrame(effectFrame);c.width=128;c.height=128;const x=c.getContext('2d'),start=performance.now(),reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function tick(now){if(!c.isConnected)return;x.clearRect(0,0,128,128);const alive=commonAssets.drawEffect(x,id,64,64,now-start,112,reduce);if(alive&&!reduce)effectFrame=requestAnimationFrame(tick);}
 tick(start);
}
function toggleSound(){soundEnabled=!soundEnabled;commonAssets?.setSound(soundEnabled);if(soundEnabled)commonAssets?.playSound('tap');render();}
document.addEventListener('click',e=>{const button=e.target.closest('button');if(!button||button.disabled||!commonAssets)return;const a=button.dataset.action;if(a==='toggle-sound')return;commonAssets.playSound(a==='signal'?'collect':['observe-case','find-signals','next'].includes(a)?'paper':'tap');});
// 결과 카드에도 공통 자산을 사용합니다. 그림을 새로 생성하지 않습니다.
async function downloadCommonCard(){
 try{await loadOriginalArt();await document.fonts.ready;}catch{}
 const ending=STORY.endings[endingOf(S.answers)],c=document.createElement('canvas');c.width=1200;c.height=630;const x=c.getContext('2d');
 x.fillStyle='#fff9e7';x.fillRect(0,0,1200,630);x.fillStyle='#294b40';x.font='bold 32px Ethicity, sans-serif';x.fillText('윤리시티 · AI 윤리 탐험대',64,80);x.font='bold 44px Ethicity, sans-serif';x.fillText('프라이버시 보호 · 배운 점 카드',64,155);
 x.font='32px Ethicity, sans-serif';let line='',y=270;for(const word of ending.card.split(' ')){const next=(line?line+' ':'')+word;if(x.measureText(next).width>1010){x.fillText(line,64,y);line=word;y+=56;}else line=next;}x.fillText(line,64,y);
 if(commonAssets){commonAssets.drawPortrait(x,assetId(characterType(S.player.character)),'happy',900,380,180);commonAssets.drawIcon(x,'check',64,485,48);}x.font='24px Ethicity, sans-serif';x.fillText('여덟 가지 사례를 끝까지 살펴봤습니다.',128,520);
 c.toBlob(blob=>{if(blob)downloadBlob(blob,'image/png','프라이버시-v5-배운점-카드.png');});
}
