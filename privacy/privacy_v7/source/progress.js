'use strict';
// 게임별·수업별 진행 기록입니다. 허브의 공통 저장 형식은 바꾸지 않습니다.
const PROGRESS_PREFIX='ethicity.privacy.v7.progress.';
const UI_FIELDS=['roundStage','dialoguePage','observePage','feedbackPage','signalFeedbackPage','signals','signalChecked','firstSignals','signalChecks','selected','choosing'];
function progressKey(){return PROGRESS_PREFIX+(S.mode==='student'?'room.'+S.roomId:params.get('preview')==='1'?'preview':'solo');}
function cleanReflections(value){const out={};if(value&&typeof value==='object')for(const [key,text]of Object.entries(value))if(/^(?:[0-7]|plan)$/.test(key)&&typeof text==='string')out[key]=text.replace(/\u0000/g,'').slice(0,500);return out;}
function checkedProgress(d){if(!d||!validPlayer(d.player))return null;return {...d,answers:validateAnswers(d.answers),pending:validateAnswers(d.pending),reflections:cleanReflections(d.reflections),reflectionPending:cleanReflections(d.reflectionPending),round:Number.isInteger(d.round)&&d.round>=0&&d.round<8?d.round:0};}
function storedProgress(last=false){let d=readStore(progressKey()+(last?'.last':''));if(!d&&!last&&S.mode==='solo'&&params.get('preview')!=='1')d=readStore('ethicity.privacy.v7.classroom20261108.draft.solo');if(!d&&!last&&S.mode==='student')d=readStore('ethicity.privacy.v7.classroom20261108.draft.'+S.roomId);return checkedProgress(d);}
function persistProgress(){
 if(!S.progressActive||S.mode==='teacher'||!validPlayer(S.player)||!['intro','round','wait','ending'].includes(S.view))return false;
 const d={version:2,uid:S.uid||null,player:S.player,answers:validateAnswers(S.answers),pending:validateAnswers(S.pending),round:S.round,view:S.view,completed:S.view==='ending',reflections:cleanReflections(S.reflections),reflectionPending:cleanReflections(S.reflectionPending),savedAt:Date.now(),ui:Object.fromEntries(UI_FIELDS.map(k=>[k,S[k]??null]))};
 const ok=writeStore(progressKey()+(S.archiveView?'.last':''),d);if(d.completed&&!S.archiveView)writeStore(progressKey()+'.last',d);S.progressStored=ok;return ok;
}
function restoreRoundUI(d){
 if(!d||d.round!==S.round)return;const u=d.ui||{};
 S.roundStage=['case','observe','signals','choices'].includes(u.roundStage)?u.roundStage:'case';
 for(const k of ['dialoguePage','observePage','feedbackPage','signalFeedbackPage'])S[k]=Number.isInteger(u[k])?Math.max(0,Math.min(20,u[k])):0;
 S.signals=Number.isInteger(u.signals)?u.signals&15:0;S.firstSignals=Number.isInteger(u.firstSignals)?u.firstSignals&15:null;
 S.signalChecks=Number.isInteger(u.signalChecks)?Math.max(0,Math.min(100,u.signalChecks)):0;
 S.signalChecked=!!u.signalChecked&&!!S.signals;S.selected=Number.isInteger(u.selected)&&u.selected>=0&&u.selected<=3?u.selected:null;
 S.choosing=!!u.choosing&&S.roundStage==='choices';
 if(S.answers[S.round]){S.signals=S.answers[S.round].signals;S.selected=S.answers[S.round].choice;S.feedback=studentCanReveal();}
}
function prepareEntry(){if(storedProgress()||storedProgress(true)){S.view='resume';S.error='';S.progressActive=false;}else preparePlayerSetup();}
function renderResume(){const d=storedProgress(),last=storedProgress(true),current=d||last,complete=!!d?.completed;return `<section class="panel resume-screen">${heading('탐험 기록을 이어갑니다')}<p><b>${esc(current?.player.nickname||'탐험가')}</b>의 기록이 이 기기에 있습니다.</p><p>${d?`${Object.keys(d.answers).length} / 8라운드 선택 ${complete?'완료':'저장'} · ${complete?'지난 결과를 다시 볼 수 있습니다.':(d.round+1)+'라운드에서 이어갈 수 있습니다.'}`:'지난 결과와 리포트를 다시 볼 수 있습니다.'}</p><div class="buttons">${d&&!complete?btn(S.mode==='student'?'수업으로 이어가기':'이어하기','resume-progress'):''}${(complete||last)?btn('지난 결과 보기','last-result',d&&!complete?'':'primary'):''}${S.mode!=='student'?btn('새로 시작','new-progress',''):''}</div><p class="small">${S.mode==='student'?'같은 기기·브라우저·수업 링크에서 기록을 복원합니다. 교사의 진행 단계에 맞춰 이어집니다.':'새로 시작해도 마지막 완료 리포트는 보관합니다. 미리보기와 혼자 탐험은 따로 저장합니다.'}</p>${S.error?`<p class="notice error">${esc(S.error)}</p>`:''}</section>`;}
async function resumeProgress(last=false){
 const d=storedProgress(last)||storedProgress();if(!d){preparePlayerSetup();render(true);return;}
 resetNarration();S.player=d.player;S.friendName='새봄';applyFriendName();S.error='';S.archiveView=last;S.reflections=d.reflections;S.reflectionPending=d.reflectionPending;
 if(S.mode==='student'){S.restoreProgress=d;S.progressActive=false;await joinRoom();return;}
 clearLive();S.answers=d.answers;S.pending={};S.round=d.round;S.uid=null;S.ended=false;S.cloudResult='';S.progressActive=true;
 S.view=d.completed&&endingOf(S.answers)?'ending':d.view==='intro'?'intro':'round';S.ended=S.view==='ending';resetRoundUI();restoreRoundUI(d);render(true);
}
function beginFreshProgress(){S.progressActive=true;S.archiveView=false;S.answers={};S.pending={};S.reflections={};S.reflectionPending={};S.round=0;S.ended=false;S.uid=null;resetRoundUI();}
async function progressAction(action,el){switch(action){
 case 'resume-progress':await resumeProgress();break;
 case 'last-result':await resumeProgress(true);break;
 case 'new-progress':modal('새 탐험을 시작하겠습니까?','<p>진행 중인 임시 기록은 새 탐험으로 바뀝니다. 마지막 완료 리포트는 보관합니다.</p>',btn('새로 시작','new-progress-confirm')+btn('돌아가기','close-modal',''));break;
 case 'new-progress-confirm':closeModal();S.progressActive=false;S.archiveView=false;preparePlayerSetup();render(true);break;
 case 'review-round':{const i=Number(el.dataset.index),r=STORY.rounds[i],a=revealedAnswers()[i];if(!r||!a)break;const c=r.choices[a.choice];modal(`${i+1}라운드 다시 살펴보기`,`<p><b>나의 선택</b> ${esc(choiceText(c))}</p><p>${esc(c.privacyReason)}</p><h3>기억할 보호 방법</h3>${r.choices.filter(x=>x.kind==='safe').map(x=>`<p>✔ ${esc(choiceText(x))}</p>`).join('')}`,btn('닫기','close-modal'));break;}
 default:return false;}return true;}
// 각 조작 뒤 render에서 저장하고, 창이 가려지거나 닫힐 때에도 마지막 상태를 보관합니다.
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')persistProgress();});
window.addEventListener('pagehide',()=>persistProgress());
