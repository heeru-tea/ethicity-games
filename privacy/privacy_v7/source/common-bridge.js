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
 if(photo){
  const people=canvas.dataset.casePhoto==='class-photo'?['haneul','jiho','saebom','onyu','daon']:['saebom','onyu'];
  people.forEach((id,i)=>{const px=640+(i-(people.length-1)/2)*120;commonAssets.drawCharacter(x,id,px,515,'down',1,.9);if(canvas.dataset.casePhoto==='class-photo')drawNameBadge(x,px,515,.9);});
 }else{
  commonAssets.drawCharacter(x,player,520,515,'down',1,.9);
  commonAssets.drawCharacter(x,'saebom',655,510,'down',1,.9);
  commonAssets.drawCharacter(x,'robot',775,515,'down',1,.7);
 }
 if(!photo)commonAssets.drawProp(x,'notebook',915,545,80);
}
function applyCommonUI(root=document){
 const map={'.panel,.modalbox,.stat,.learning-card,.stepcard': 'ee-panel', '.dialogue-bubble':'ee-speech', '.dialogue-speaker':'ee-speaker', '.choice,.signal,.character,.character-card':'ee-choice', '.chip,.pill':'ee-badge', '.notice,.feedback-note':'ee-notice', '.notice.good,.feedback.safe':'ee-success', '.feedback.check,.feedback.risk':'ee-notice'};
 for(const [selector,cls]of Object.entries(map))root.querySelectorAll(selector).forEach(e=>e.classList.add(cls));
 root.querySelectorAll('button.btn,button.textbtn,[data-reveal-story]').forEach(b=>{b.classList.add('ee-button');if(!b.classList.contains('primary')&&!b.hasAttribute('data-reveal-story'))b.classList.add('secondary');});
 root.querySelectorAll('.dialogue-player .dialogue-speaker').forEach(e=>{e.textContent=(S.player?.nickname||'탐험가')+' · 나';});
}
function drawScenePhotoCast(canvas){
 // 새 삽화의 사진 안에 공통 캐릭터 원본만 겹쳐 표시합니다.
 canvas.width=1672;canvas.height=941;const x=canvas.getContext('2d');
 const scene=canvas.dataset.scenePhotoCast,people=ROUND_ILLUSTRATIONS[scene]?.cast||[];
 const points=scene==='class-photo'?people.map((_,i)=>[685+i*88,573,.8]):[[855,510,.64],[955,510,.64]];
 people.forEach((id,i)=>{const [px,py,scale]=points[i];commonAssets.drawCharacter(x,id,px,py,'down',1,scale);if(scene==='class-photo')drawNameBadge(x,px,py,scale);});
}
function paintArt(){
 mountMusicControls();
 applyCommonUI();
 if(!commonAssets){loadOriginalArt().then(paintArt).catch(()=>{const e=document.getElementById('asset-status');if(e){e.hidden=false;e.textContent='공통 그림을 불러오지 못했습니다. common 폴더와 함께 게임을 열어 주시기 바랍니다. 글과 선택으로 탐험을 계속할 수 있습니다.';}});return;}
 document.querySelectorAll('[data-character]').forEach(c=>drawCharacter(c,c.dataset.character,c.dataset.mood));
 document.querySelectorAll('[data-common-stage],[data-village]').forEach(drawCommonStage);
 document.querySelectorAll('[data-scene-photo-cast]').forEach(drawScenePhotoCast);
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
function cardTextLines(ctx,text,maxWidth=1060){const lines=[];let line='';for(const word of text.split(' ')){const next=(line?line+' ':'')+word;if(line&&ctx.measureText(next).width>maxWidth){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);return lines;}
async function downloadCommonCard(){
 try{await loadOriginalArt();await document.fonts.ready;}catch{}
 const ending=STORY.endings[endingOf(S.answers)];if(!ending)return;const c=document.createElement('canvas');c.width=1200;c.height=630;let x=c.getContext('2d');x.font='32px Ethicity, sans-serif';const lines=cardTextLines(x,ending.card),lastTextY=250+(lines.length-1)*56,footerY=Math.max(520,lastTextY+115);c.height=Math.max(630,footerY+100);x=c.getContext('2d');
 x.fillStyle='#fff9e7';x.fillRect(0,0,c.width,c.height);x.fillStyle='#294b40';x.font='bold 32px Ethicity, sans-serif';x.fillText('윤리시티 · AI 윤리 탐험대',64,80);x.font='bold 44px Ethicity, sans-serif';x.fillText('프라이버시 보호 · 배운 점 카드',64,155);x.font='32px Ethicity, sans-serif';lines.forEach((line,i)=>x.fillText(line,64,250+i*56));
 if(commonAssets){commonAssets.drawPortrait(x,assetId(characterType(S.player.character)),'happy',930,footerY-70,150);commonAssets.drawIcon(x,'check',64,footerY-35,48);}x.fillStyle='#294b40';x.font='24px Ethicity, sans-serif';x.fillText('여덟 가지 사례를 끝까지 살펴봤습니다.',128,footerY);
 c.toBlob(blob=>{if(blob)downloadBlob(blob,'image/png','프라이버시-배운점-카드.png');});
}
// 공통 캐릭터 파일을 바꾸지 않고, 이 사례에만 필요한 명찰 목걸이를 겹칩니다.
function drawNameBadge(ctx,x,y,scale){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.strokeStyle='#315c59';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-6,-51);ctx.lineTo(0,-35);ctx.lineTo(6,-51);ctx.stroke();ctx.fillStyle='#fff9e7';ctx.fillRect(-10,-36,20,15);ctx.strokeStyle='#294b40';ctx.strokeRect(-10,-36,20,15);ctx.fillStyle='#294b40';ctx.fillRect(-6,-32,12,2);ctx.fillRect(-5,-27,10,2);ctx.restore();}
