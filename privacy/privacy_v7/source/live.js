// ==================== Firebase 수업 연결 ====================
// 승인한 8라운드를 유지하고 2026-11-04 수업·리포트 전용 답안 규칙을 사용합니다.
// 인증 앱 이름과 브라우저 임시 저장은 v6 전용이라 이전 교사의 수업 목록과 구분됩니다.
// 혼자 탐험할 때는 아래 라이브러리를 내려받거나 네트워크에 연결하지 않습니다.
let firebaseModules=null,cloudInstances={},inFlight=new Map();
async function loadFirebase(){if(!firebaseModules){firebaseModules=Promise.all([
  import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
  import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js'),
  import('https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js')
]).catch(e=>{firebaseModules=null;throw e;});}return firebaseModules;}
function timed(p,ms=20000){let t;return Promise.race([p,new Promise((_,reject)=>{t=setTimeout(()=>reject(new Error('연결 시간 초과: 인터넷 연결을 확인하고 다시 시도합니다.')),ms);})]).finally(()=>clearTimeout(t));}
async function prepareCloud(role){if(!cloudConfigured())throw new Error('아직 Firebase 연결 설정이 없습니다. 교사 화면의 연결 설정에서 준비합니다.');if(location.protocol==='file:')throw new Error('실시간 수업은 Firebase에 올린 웹 주소에서 엽니다. 이 파일에서는 혼자 탐험하기를 사용할 수 있습니다.');const [appMod,authMod,dbMod]=await timed(loadFirebase());if(!cloudInstances[role]){const app=appMod.initializeApp(CONFIG.firebase,'ethicity-privacy-v7-'+role);let persistent=true;try{const probe='ethicity.privacy.v7.authProbe.'+role;localStorage.setItem(probe,'1');localStorage.removeItem(probe);}catch{persistent=false;}const auth=authMod.initializeAuth(app,{persistence:persistent?authMod.browserLocalPersistence:authMod.inMemoryPersistence}),db=dbMod.getDatabase(app);cloudInstances[role]={app,auth,db,A:authMod,D:dbMod,persistent};}return cloudInstances[role];}
function watchConnection(cloud){unsubs.push(cloud.D.onValue(cloud.D.ref(cloud.db,'.info/connected'),snap=>{S.network=!!snap.val();S.networkKnown=true;const e=document.getElementById('connection-status');if(e){e.textContent=S.network?'연결됨':'재연결 중';e.classList.toggle('off',!S.network);}const status=document.getElementById('save-status');if(status)status.textContent=saveStatusText();if(S.mode==='teacher')render();if(S.network&&S.mode==='student'){flushPending();flushReflections();if(S.view==='ending'&&S.cloudResult&&!S.cloudResult.startsWith('✔')){const ending=endingOf(S.answers);if(ending)saveCloudResult({game:'privacy',completed:true,ending,card:STORY.endings[ending].card});}}}));}
async function joinRoom(){if(!S.roomId){S.error='올바른 입장 링크가 아닙니다. 선생님이 보낸 링크로 다시 엽니다.';S.view='wait';render(true);return;}clearLive();const gen=S.liveGeneration;S.view='loading';S.loadingText='이메일 없이 임시 참여번호로 수업에 입장합니다.';S.error='';render(true);try{
  const c=await prepareCloud('student');if(gen!==S.liveGeneration)return;S.cloud=c;
  await c.auth.authStateReady();let user=c.auth.currentUser;if(!user){const cred=await timed(c.A.signInAnonymously(c.auth));user=cred.user;}if(gen!==S.liveGeneration)return;S.uid=user.uid;const resumeData=S.restoreProgress||storedProgress();S.restoreProgress=null;if(resumeData?.uid&&resumeData.uid!==S.uid)throw new Error('저장 기록의 참여번호가 다릅니다. 기록을 저장했던 브라우저로 다시 엽니다.');
  const controlSnap=await timed(c.D.get(c.D.ref(c.db,`roomsPrivacyV7Classroom20261108/${S.roomId}/control`)));const control=controlSnap.val();if(!control)throw new Error('수업을 찾을 수 없습니다. 선생님에게 새 입장 링크를 받습니다.');
  const memberRef=c.D.ref(c.db,`roomsPrivacyV7Classroom20261108/${S.roomId}/members/${S.uid}`);const member=await timed(c.D.get(memberRef));
  if(!member.exists()){if(!control.accepting)throw new Error('이 수업은 새 입장을 마감했습니다. 선생님에게 입장을 열어 달라고 합니다.');await timed(c.D.set(memberRef,{joinedAt:c.D.serverTimestamp(),nickname:S.player.nickname,character:S.player.character}));}
  if(member.exists()&&(member.val().nickname!==S.player.nickname||member.val().character!==S.player.character))await timed(c.D.update(memberRef,{nickname:S.player.nickname,character:S.player.character}));
  const data=await timed(c.D.get(c.D.ref(c.db,`roomsPrivacyV7Classroom20261108/${S.roomId}/answers/${S.uid}`)));if(gen!==S.liveGeneration)return;
  S.answers=validateAnswers(data.val());S.pending={};S.ended=false;S.cloudResult='';
  const draft=resumeData;if(draft?.uid===S.uid){const pending=validateAnswers(draft.pending);for(const [i,a]of Object.entries(pending)){if(!S.answers[i]){S.pending[i]=a;S.answers[i]=a;}}}
  S.control=control;S.progressActive=true;S.archiveView=false;S.restoreAfterJoin=resumeData;
  const noteSnap=await timed(c.D.get(c.D.ref(c.db,`roomsPrivacyV7Classroom20261108/${S.roomId}/reflections/${S.uid}`)));if(gen!==S.liveGeneration)return;
  S.reflectionPending=cleanReflections(resumeData?.reflectionPending);S.reflections={...cleanReflections(noteSnap.val()),...S.reflectionPending};
  unsubs.push(c.D.onValue(c.D.ref(c.db,`roomsPrivacyV7Classroom20261108/${S.roomId}/reflections/${S.uid}`),snap=>{if(gen!==S.liveGeneration)return;S.reflections={...cleanReflections(snap.val()),...S.reflectionPending};persistProgress();reflectionStatus();},liveFailure));
  watchConnection(c);
  unsubs.push(c.D.onValue(c.D.ref(c.db,`roomsPrivacyV7Classroom20261108/${S.roomId}/answers/${S.uid}`),snap=>{if(gen!==S.liveGeneration)return;const server=validateAnswers(snap.val());for(const [i,a]of Object.entries(server)){if(!S.pending[i])S.answers[i]=a;}saveDraft();},liveFailure));
  unsubs.push(c.D.onValue(c.D.ref(c.db,`roomsPrivacyV7Classroom20261108/${S.roomId}/control`),snap=>{if(gen!==S.liveGeneration)return;const v=snap.val();if(!v){S.error='선생님이 수업 기록을 정리했습니다. 혼자 탐험으로 마무리할 수 있습니다.';S.view='wait';render();return;}const changed=JSON.stringify(S.control)!==JSON.stringify(v);S.control=v;if(changed||S.view==='loading')syncStudentScreen();flushPending();},liveFailure));
  syncStudentScreen();flushPending();flushReflections();
}catch(e){if(gen!==S.liveGeneration)return;S.error=friendlyError(e);S.view='wait';render(true);}}
function liveFailure(e){S.error=friendlyError(e);S.network=false;render();}
function syncStudentScreen(){if(S.mode!=='student'||S.ended)return;const c=S.control;if(!c)return;if(S.restoreAfterJoin?.completed&&endingOf(S.answers)&&(c.phase==='ended'||(c.phase==='reveal'&&c.round===7))){S.restoreAfterJoin=null;finishGame();return;}
  if(c.phase==='lobby'){S.view='wait';render(true);return;}
  if(c.phase==='ended'){const missing=STORY.rounds.findIndex((r,i)=>!S.answers[i]||S.pending[i]);if(missing>=0){moveRound(missing);}else finishGame();return;}
  if(c.round<0||c.round>7)return;const previous=S.round;S.round=c.round;
  if(previous!==S.round||S.view!=='round'){resetRoundUI();restoreRoundUI(S.restoreAfterJoin);S.restoreAfterJoin=null;S.view='round';render(true);}else{S.feedback=!!S.answers[S.round]&&studentCanReveal();render();}
}
function canSendRound(i){return S.control&&(S.control.phase==='ended'||(S.control.phase==='collect'&&Number(i)===S.control.round));}
async function sendAnswer(i,a){if(!S.cloud||!S.uid||!canSendRound(i))return;const id=S.roomId+':'+i;if(inFlight.has(id))return;const gen=S.liveGeneration,c=S.cloud;S.pending[i]=a;saveDraft();const promise=c.D.set(c.D.ref(c.db,`roomsPrivacyV7Classroom20261108/${S.roomId}/answers/${S.uid}/${i}`),{choice:a.choice,signals:a.signals,firstSignals:a.firstSignals,signalChecks:a.signalChecks,at:c.D.serverTimestamp()});inFlight.set(id,promise);
  const notify=setTimeout(()=>{if(gen===S.liveGeneration&&S.pending[i]){S.error='저장 확인이 늦어지고 있습니다. 선택은 임시 보관 중이며 연결되면 다시 확인합니다.';render();}},15000);
  try{await promise;if(gen!==S.liveGeneration)return;delete S.pending[i];S.error='';saveDraft();const status=document.getElementById('save-status');if(status)status.textContent=saveStatusText();if(S.control?.phase==='ended'&&S.view==='round')render();}
  catch(e){if(gen!==S.liveGeneration)return;S.error=friendlyError(e)+' 선택은 이 기기에 남겨 두었습니다. 수업이 끝나면 남은 사례에서 다시 전송합니다.';saveDraft();render();}
  finally{clearTimeout(notify);inFlight.delete(id);}
}
function flushPending(){if(S.mode!=='student'||!S.network)return;for(const [i,a]of Object.entries(S.pending))if(canSendRound(i))sendAnswer(Number(i),a);}
async function saveCloudResult(result){if(!S.cloud||!S.uid)return;if(Object.keys(S.pending).length){S.cloudResult='⏳ 아직 서버가 확인하지 않은 선택이 있습니다.';updateCloudResult();return;}const key=S.roomId+':result';if(inFlight.has(key))return;const c=S.cloud,gen=S.liveGeneration;S.cloudResult='⏳ 수업 서버의 완료 기록을 확인하고 있습니다.';updateCloudResult();const p=c.D.set(c.D.ref(c.db,`roomsPrivacyV7Classroom20261108/${S.roomId}/results/${S.uid}`),result);inFlight.set(key,p);try{await p;if(gen!==S.liveGeneration)return;S.cloudResult='✔ 수업 서버에서도 완료를 확인했습니다.';}catch(e){if(gen!==S.liveGeneration)return;S.cloudResult='서버 저장은 확인하지 못했습니다. '+friendlyError(e);}finally{inFlight.delete(key);updateCloudResult();}}
function updateCloudResult(){const el=document.getElementById('cloud-result');if(el)el.textContent=S.cloudResult;}
function reconnectLive(){if(!S.control){joinRoom();return;}if(S.cloud){S.cloud.D.goOnline(S.cloud.db);showToast('기존 참여번호로 연결을 다시 확인합니다.');if(S.network)flushPending();}else joinRoom();}

// ==================== 교사 화면 ====================
function dateLabel(ts){return typeof ts==='number'?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(ts):'새';}
function phaseLabel(c){if(!c)return '';return c.phase==='lobby'?'입장 대기':c.phase==='collect'?`${c.round+1}라운드 · 응답 중`:c.phase==='reveal'?`${c.round+1}라운드 · 결과 공개`:'수업 종료 · 남은 사례 진행 가능';}
// Keep an existing identity so older classes in the same browser remain accessible.
async function connectTeacher(){
 if(S.busy)return;
 const gen=S.liveGeneration;
 const current=()=>gen===S.liveGeneration&&S.mode==='teacher'&&S.view==='teacher';
 S.busy=true;S.error='';render();
 try{
  const c=await prepareCloud('teacher');if(!current())return;
  S.cloud=c;await timed(c.auth.authStateReady());if(!current())return;
  let user=c.auth.currentUser;
  if(!user)user=(await timed(c.A.signInAnonymously(c.auth))).user;
  if(!current())return;
  S.teacher=user;S.teacherAllowed=true;S.uid=user.uid;
  if(S.teacherPanel&&requestedRoom&&/^[a-f0-9]{32}$/.test(requestedRoom))await openTeacherRoom(requestedRoom);else {const currentRoom=readStore('ethicity.privacy.v7.classroom20261108.currentRoom');if(/^[a-f0-9]{32}$/.test(currentRoom||''))await openTeacherRoom(currentRoom);else await loadTeacherRooms();}
 }catch(e){if(current()){S.teacherAllowed=false;S.error=friendlyError(e);}}
 finally{S.busy=false;render();}
}
function enterTeacher(){
 clearLive();S.mode='teacher';S.view='teacher';S.room=null;S.roomId=null;S.control=null;S.error='';
 S.teacherAllowed=false;render(true);return connectTeacher();
}
async function createRoom(){if(S.busy||!S.teacherAllowed||!S.network)return;S.busy=true;render();try{const id=crypto.randomUUID().replaceAll('-','');const c=S.cloud;await timed(c.D.set(c.D.ref(c.db,'roomsPrivacyV7Classroom20261108/'+id),{owner:S.teacher.uid,control:{round:-1,phase:'lobby',accepting:true,createdAt:c.D.serverTimestamp(),updatedAt:c.D.serverTimestamp()}}));writeStore('ethicity.privacy.v7.classroom20261108.currentRoom',id);await openTeacherRoom(id);}catch(e){S.error=friendlyError(e);}finally{S.busy=false;render();}}
async function openTeacherRoom(id){if(!/^[a-f0-9]{32}$/.test(id))return;clearLive();S.room=null;S.control=null;S.roomId=id;S.view='teacher';S.error='';const gen=S.liveGeneration,c=S.cloud;watchConnection(c);unsubs.push(c.D.onValue(c.D.ref(c.db,'roomsPrivacyV7Classroom20261108/'+id),snap=>{if(gen!==S.liveGeneration)return;const room=snap.val();if(!room){S.room=null;S.error='이 수업이 삭제됐거나 더 이상 열 수 없습니다.';}else{if(S.control?.round!==room.control.round){S.teacherTab='scene';S.teacherChoice=0;S.teacherPage=0;}S.room=room;S.control=room.control;}render();},liveFailure));}
function inviteURL(){const u=new URL('index.html',location.href);u.search='';u.hash='';u.searchParams.set('room',S.roomId);return u.href;}
async function copyInvite(){const url=inviteURL();try{await navigator.clipboard.writeText(url);showToast('학생 입장 링크를 복사했습니다.');}catch{modal('학생 입장 링크','<p class="room-link">'+esc(url)+'</p><p>위 주소를 길게 누르거나 선택해서 복사합니다.</p>',btn('확인','close-modal'));}}
async function advanceTeacher(action,force=false){if(S.busy||!S.room||!S.network)return;const control=S.room.control,members=Object.keys(S.room.members||{});const missing=members.filter(uid=>!S.room.answers?.[uid]?.[control.round]).length;
  if(action==='next'&&control.phase!=='lobby'&&!force&&missing){modal('아직 응답하지 않은 탐험가가 있습니다',`<p>${missing}명이 이번 사례를 아직 제출하지 않았습니다. 먼저 다음으로 넘어가면 놓친 사례는 수업이 끝난 뒤 이어서 할 수 있습니다.</p>`,btn('다음 라운드로 이동','teacher-next-confirm')+btn('기다리기','close-modal',''));return;}
  if(action==='end'&&!force){modal('수업을 마무리하겠습니까?','<p>결과 카드를 열고, 놓친 사례가 있는 학생에게 남은 사례를 풀 기회를 제공합니다.</p>',btn('수업 마무리','teacher-end-confirm')+btn('취소','close-modal',''));return;}
  let patch;if(action==='reveal'&&control.phase==='collect')patch={phase:'reveal'};else if(action==='next'&&((control.phase==='reveal'&&control.round<7)||control.phase==='lobby'))patch={round:control.round+1,phase:'collect'};else if(action==='end'&&control.round===7&&control.phase==='reveal')patch={phase:'ended',accepting:false};else return;
  S.busy=true;render();try{await timed(S.cloud.D.update(S.cloud.D.ref(S.cloud.db,`roomsPrivacyV7Classroom20261108/${S.roomId}/control`),{...patch,updatedAt:S.cloud.D.serverTimestamp()}));S.error='';}catch(e){S.error=friendlyError(e);}finally{S.busy=false;render();}}
async function toggleAdmission(){if(S.busy||!S.network)return;S.busy=true;render();try{await timed(S.cloud.D.update(S.cloud.D.ref(S.cloud.db,`roomsPrivacyV7Classroom20261108/${S.roomId}/control`),{accepting:!S.control.accepting,updatedAt:S.cloud.D.serverTimestamp()}));}catch(e){S.error=friendlyError(e);}finally{S.busy=false;render();}}
async function deleteRoom(){if(!S.roomId||!S.teacherAllowed)return;S.busy=true;const id=S.roomId;try{await timed(S.cloud.D.remove(S.cloud.D.ref(S.cloud.db,'roomsPrivacyV7Classroom20261108/'+id)));clearLive();S.room=null;S.roomId=null;removeStore('ethicity.privacy.v7.classroom20261108.currentRoom');await loadTeacherRooms();showToast('이 수업의 서버 기록을 삭제했습니다.');}catch(e){S.error=friendlyError(e);}finally{S.busy=false;render();}}
// ==================== 교사용 연결 설정 ====================
function renderConfig(){return `<section class="panel teacher-wrap"><span class="tag">교사용 · 연결 설정</span>${heading('게임 파일에 연결 정보를 넣습니다',2)}<p>여기에는 Firebase 웹 앱의 <b>공개 연결 설정</b>만 넣습니다. 서비스 계정 비밀키와 비밀번호는 넣지 않습니다.</p><form id="config-form"><div class="config-grid"><label class="field wide"><span>Firebase 웹 앱 설정(JSON)</span><textarea id="firebase-config" spellcheck="false" placeholder='{"apiKey":"...","authDomain":"...","databaseURL":"...","projectId":"...","appId":"..."}'>${cloudConfigured()?esc(JSON.stringify(CONFIG.firebase,null,2)):''}</textarea><small class="small">중괄호로 시작하는 JSON 형식입니다. databaseURL은 Realtime Database 주소입니다. 비워 두면 혼자 탐험만 사용할 수 있습니다.</small></label>${CONFIG.characters.map((c,i)=>`<label class="field"><span>${esc(c.label)} 저장 ID</span><input id="character-id-${i}" type="text" value="${esc(c.id)}" maxlength="32" spellcheck="false" autocomplete="off"><small class="small">현재 ${BASE_CONFIG.provisionalCharacters?'제작용 임시 ID입니다. 팀의 공통 ID가 정해지면 수정합니다.':'공통 캐릭터 ID입니다.'}</small></label>`).join('')}</div><p class="error" id="config-error" role="status">${esc(S.error)}</p><div class="buttons"><button type="submit" class="btn primary">이 브라우저에 설정 적용</button>${btn('설정한 시작 파일 내려받기','export-game','sun')}${btn('교사 화면으로','teacher','')}</div></form><p class="notice" style="margin-top:20px">설정을 적용한 뒤 <b>시작 파일을 내려받아 privacy_v7/index.html을 교체</b>합니다. common·source 폴더도 함께 올려야 합니다. 이 브라우저에만 저장한 설정은 다른 기기로 자동 전달되지 않습니다.</p><details class="guide"><summary>통합 허브와 연결할 때</summary><p>허브와 각 게임을 같은 도메인·프로토콜·포트 아래에 배치합니다. 이 게임은 ethicity.player를 읽고, 완료하면 ethicity.result.privacy에 지정된 네 항목만 저장합니다.</p><p>교사 계정을 따로 등록하지 않습니다. 수업을 만든 브라우저의 임시 식별번호와 서버의 보안 규칙으로 수업 조작 권한을 확인합니다.</p></details></section>`;}
async function saveConfiguration(){const error=document.getElementById('config-error');try{let firebase={};const raw=document.getElementById('firebase-config').value.trim();if(raw){const input=JSON.parse(raw);if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('공개 설정을 JSON 객체로 넣어 주시기 바랍니다.');for(const key of ['apiKey','authDomain','databaseURL','projectId','appId']){if(typeof input[key]!=='string'||!input[key].trim())throw new Error(key+' 항목이 필요합니다.');firebase[key]=input[key].trim();}if(!/^https:\/\/[a-zA-Z0-9.-]+\.(firebaseio\.com|firebasedatabase\.app)\/?$/.test(firebase.databaseURL))throw new Error('Realtime Database의 https 주소를 확인합니다.');if(!/^[a-zA-Z0-9.-]+$/.test(firebase.authDomain))throw new Error('authDomain에는 도메인 이름만 넣습니다.');}
  const next={...CONFIG,firebase,characters:CONFIG.characters.map((c,i)=>({...c,id:document.getElementById('character-id-'+i).value.trim()}))};if(!validConfig(next))throw new Error('캐릭터 ID는 영문으로 시작하는 1~32자이며, 두 ID는 달라야 합니다.');clearLive();for(const value of Object.values(cloudInstances)){try{const [m]=await loadFirebase();await m.deleteApp(value.app);}catch{}}cloudInstances={};S.cloud=null;S.teacher=null;S.teacherAllowed=false;S.room=null;S.roomId=null;CONFIG=next;if(!validPlayer(S.player))S.player=null;const ok=writeStore('ethicity.privacy.v7.settings',CONFIG);S.error='';showToast(ok?'설정을 적용했습니다. HTML을 내려받아 배포 파일에 반영합니다.':'설정은 이 화면에 적용했습니다. 브라우저 저장이 어려우니 지금 HTML을 내려받습니다.');render();
}catch(e){error.textContent='설정을 적용하지 않았습니다. '+(e instanceof SyntaxError?'JSON의 따옴표와 쉼표를 확인해 주시기 바랍니다.':e.message);}}

// ==================== 첫 화면 ====================
if(params.get('mode')==='teacher'||(!requestedRoom&&params.get('mode')!=='solo')){S.mode='teacher';S.view='teacher';}
else if(requestedRoom){if(!S.roomId){S.view='wait';S.error='입장 링크가 올바르지 않습니다. 선생님에게 새 링크를 받습니다.';}else prepareEntry();}
else prepareEntry();
render();
if(S.mode==='teacher')connectTeacher();
