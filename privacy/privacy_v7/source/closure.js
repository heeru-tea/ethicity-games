'use strict';
// 학생의 준비 상태와 교사의 공동 마무리를 구분합니다. 완료 기록은 8개 답안이 있어야 저장합니다.
function allChoicesSaved(){return !!endingOf(S.answers)&&Object.keys(S.pending||{}).length===0;}
function teacherEndStats(){const people=teacherParticipants();return {total:people.length,submitted:people.filter(([uid])=>!!endingOf(S.room.answers?.[uid])).length,ready:people.filter(([uid])=>S.room.finalReady?.[uid]===true&&!!endingOf(S.room.answers?.[uid])).length};}
function renderFinalWait(){return `<section class="panel wait final-wait">${canvasChar('bot',96)}<span class="tag">함께 마무리할 시간</span>${heading('선생님의 마무리 신호를 기다립니다')}<p>${S.finalReady?'✔ 마무리 준비가 교사 화면에 전달됐습니다.':S.finalReadyRequested?'준비 상태를 전송하고 있습니다. 연결되면 다시 확인합니다.':'8라운드 결과를 읽고 마무리 준비 완료를 누릅니다.'}</p><p>친구들과 어떤 선택을 했는지 비교하고, 자신의 선택 이유를 말해봅시다.</p><div class="buttons">${btn('8라운드 결과 다시 보기','current-feedback','')}${!S.finalReady?btn('마무리 준비 완료','final-ready','primary',allChoicesSaved()?'':'disabled'):''}${!S.network?btn('연결 다시 확인하기','reconnect',''):''}</div><p id="save-status" role="status">${S.network?'수업에 연결됐습니다.':'연결을 다시 확인하고 있습니다.'}</p>${S.error?`<p class="notice error">${esc(S.error)}</p>`:''}</section>`;}
function renderClassRecap(){const missing=8-Object.keys(validateAnswers(S.answers)).length;return `<section class="panel class-recap">${heading('함께 탐험을 돌아봅니다')}<p>선생님이 수업을 마무리했습니다. 친구들과 선택 이유를 이야기해 봅시다.</p><p class="notice">${missing?`아직 선택하지 않은 사례가 ${missing}개 있습니다.`:'선택한 답안의 서버 저장을 확인하고 있습니다.'} 개인 탐험 기록은 아직 미완료입니다.</p><p>배운 점을 함께 살펴본 뒤, 남은 사례를 이어서 선택합니다.</p><div class="buttons">${btn('배운 점 함께 보기','learning-summary','')}${btn('남은 사례 이어하기','catch-up','primary')}${btn('현재 리포트 보기','my-report','')}</div><p class="small">남은 선택과 저장을 마치면 개인 결과 카드가 나타납니다.</p></section>`;}
let readyFlight=null;
async function flushFinalReady(){
 if(S.mode!=='student'||!S.finalReadyRequested||S.finalReady||!S.network||!S.cloud||!allChoicesSaved()||S.control?.phase!=='reveal'||S.control.round!==7)return;
 const c=S.cloud,gen=S.liveGeneration,key=S.roomId+':'+S.uid;if(readyFlight?.key===key)return;const flight={key};readyFlight=flight;
 try{await c.D.set(c.D.ref(c.db,`roomsPrivacyV7Classroom20261108/${S.roomId}/finalReady/${S.uid}`),true);if(gen===S.liveGeneration){S.finalReady=true;S.error='';persistProgress();if(S.view==='wait')render();}}
 catch(e){if(gen===S.liveGeneration){S.error='준비 상태를 아직 전달하지 못했습니다. 연결을 확인한 뒤 다시 누릅니다.';persistProgress();if(S.view==='wait')render();}}
 finally{if(readyFlight===flight)readyFlight=null;}
}
async function markFinalReady(){if(S.mode!=='student'||S.round!==7)return;if(S.control?.phase==='ended'){syncEndedStudent();return;}if(!allChoicesSaved()){showToast('여덟 사례의 선택과 저장을 먼저 마칩니다.');return;}S.finalReadyRequested=true;S.view='wait';render(true);await flushFinalReady();}
async function subscribeFinalReady(c,resumeData,gen){
 S.finalReady=false;S.finalReadyRequested=!!resumeData?.finalReadyRequested;S.catchUp=!!resumeData?.catchUp;
 const ref=c.D.ref(c.db,`roomsPrivacyV7Classroom20261108/${S.roomId}/finalReady/${S.uid}`),snap=await timed(c.D.get(ref));if(gen!==S.liveGeneration)return;S.finalReady=snap.val()===true;S.finalReadyRequested||=S.finalReady;
 unsubs.push(c.D.onValue(ref,s=>{if(gen!==S.liveGeneration)return;S.finalReady=s.val()===true;S.finalReadyRequested||=S.finalReady;persistProgress();if(S.view==='wait')render();},liveFailure));
}
function syncEndedStudent(){
 if(allChoicesSaved()){finishGame();return;}
 if(!S.catchUp){S.view='class-recap';S.ended=false;render(true);return;}
 if(S.view!=='round'){const missing=STORY.rounds.findIndex((r,i)=>!S.answers[i]||S.pending[i]);if(missing>=0)moveRound(missing);}else render();
}
async function closureAction(action){if(action==='final-ready'){await markFinalReady();return true;}if(action==='catch-up'){S.catchUp=true;const missing=STORY.rounds.findIndex((r,i)=>!S.answers[i]||S.pending[i]);if(missing>=0)moveRound(missing);else syncEndedStudent();return true;}return false;}
function nextStoryPreview(r){const next=STORY.rounds[S.round+1];return `<section class="next-story-preview ee-notice" aria-label="${next?'다음 이야기 예고':'함께 마무리'}"><span class="preview-label">${commonIcon(next?'arrow_right':'check',28)}${next?'다음 이야기 예고':'함께 마무리'}</span><h3>${esc(next?next.title:'여덟 개의 발자국을 돌아봅니다')}</h3><p class="bridge-context">${esc(say(r.transition))}</p></section>`;}
