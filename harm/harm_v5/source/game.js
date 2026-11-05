'use strict';
// 시나리오는 ../scenario.json 한곳에 둔다. v3 분기·점수·엔딩은 story-rules.js에서 계산한다.
const STORY=JSON.parse(document.getElementById('game-data').textContent);
const CONFIG=JSON.parse(document.getElementById('game-config').textContent);
const PLAYER_KEY='ethicity.player',RESULT_KEY='ethicity.result.harm',ROOM_ROOT='roomsHarmV5';
const NUMS=['①','②','③','④','⑤'],LETTERS=['A','B','C'];
const LABELS={safe:{icon:'check',title:'함께 위험을 줄였습니다'},check:{icon:'inspect',title:'더 살펴볼 부분이 있습니다'},risk:{icon:'warning',title:'다음 행동을 함께 살펴봅니다'}};
const PHASES={lobby:'입장 대기',intro:'도입',observe:'화면 보기',clues:'단서 확인',vote:'우리 반 투표',tie:'동률 · 교사 결정',empty:'응답 없음 · 다시 투표',feedback:'학급 결과·피드백',ended:'공동 엔딩·정리'};
function readStore(key,fallback=null){try{const raw=localStorage.getItem(key);return raw===null?fallback:JSON.parse(raw);}catch{return fallback;}}
function writeStore(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
function removeStore(key){try{localStorage.removeItem(key);return true;}catch{return false;}}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function validPlayer(p){return !!p&&CONFIG.characters.some(c=>c.id===p.character)&&typeof p.nickname==='string'&&p.nickname.length>0&&p.nickname.length<=32&&!/[<>\x00-\x1f]/.test(p.nickname);}
function characterType(id){return CONFIG.characters.find(c=>c.id===id)?.type||'boy';}
function canvasChar(type,size=64,mood='neutral'){return `<canvas width="256" height="256" class="ee-pixel" data-character="${esc(commonCharacter(type))}" data-mood="${mood}" style="width:${size}px;height:${size}px" aria-hidden="true"></canvas>`;}
function btn(label,action,cls='primary',extra=''){
  const icons={teacher:'person',demo:'play',join:'arrow_right',home:'home','create-room':'key','open-room':'arrow_right','copy-invite':'person',start:'play',next:'arrow_right',resolve:'check',submit:'check',card:'notebook',review:'inspect',csv:'notebook',fullscreen:'map','teacher-list':'home','change-player':'person','clear-error':'close'};
  return `<button type="button" class="btn ee-button ${cls==='primary'?'':'secondary'}" data-action="${action}" ${extra}>${icons[action]?commonIcon(icons[action]):''}<span>${label.replace(/ →$/,'')}</span></button>`;
}
function heading(s,level=1){return `<h${level} tabindex="-1" data-heading>${esc(s)}</h${level}>`;}
const narrativeRules=createStoryRules(STORY);
const {summarize,resultOf}=narrativeRules;
function tally(room){const counts=[0,0,0],round=room.control.round;for(const [uid,v] of Object.entries(room.votes?.[round]||{})){if(room.members?.[uid]&&v.ballot===room.control.ballot&&Number.isInteger(v.choice)&&v.choice>=0&&v.choice<3)counts[v.choice]++;}const total=counts.reduce((a,b)=>a+b,0),max=Math.max(...counts);return {counts,total,leaders:total?counts.map((n,i)=>n===max?i:-1).filter(i=>i>=0):[]};}
function newRoom(owner,now){return {owner,createdAt:now,control:{version:STORY.version,round:-1,phase:'lobby',revision:0,accepting:true,step:0,paused:false,remaining:0,startedAt:now,duration:0,ballot:0},recap:0};}
function phaseDuration(){return 0;}
function shouldAutoAdvance(){return false;}
function remaining(){return 0;}
function transition(original,action,now,choice=null){
  if(!original?.control)return;
  const room=structuredClone(original),c=room.control;
  const enter=(phase,round=c.round)=>{Object.assign(c,{phase,round,step:0,startedAt:now,duration:0,remaining:0,paused:false,revision:c.revision+1});};
  const decide=(t,index)=>{room.decisions??={};if(room.decisions[c.round])return false;room.decisions[c.round]={choice:index,counts:{0:t.counts[0],1:t.counts[1],2:t.counts[2]},total:t.total,tie:t.leaders.length>1,at:now};enter('feedback');return true;};
  if(action==='start'&&c.phase==='lobby'){enter('intro');return room;}
  if(action==='retry'&&c.phase==='empty'){c.ballot++;enter('vote');return room;}
  if(action==='resolve'&&c.phase==='tie'){const t=tally(room);if(!t.leaders.includes(choice)||t.leaders.length<2)return;if(decide(t,choice))return room;return;}
  if(action==='back'&&['intro','observe','clues','feedback'].includes(c.phase)&&c.step>0){c.step--;c.revision++;return room;}
  if(action!=='next')return;
  if(['intro','observe','clues','feedback'].includes(c.phase)){
    const count=phaseBeats(c,room.decisions).length;
    if(c.step<count-1){c.step++;c.revision++;return room;}
  }
  if(c.phase==='intro'){enter('observe',0);return room;}
  if(c.phase==='observe'){enter('clues');return room;}
  if(c.phase==='clues'){c.ballot++;enter('vote');return room;}
  if(c.phase==='vote'){const t=tally(room);if(!t.total){enter('empty');return room;}if(t.leaders.length>1){enter('tie');return room;}if(decide(t,t.leaders[0]))return room;return;}
  if(c.phase==='feedback'){if(c.round<7)enter('observe',c.round+1);else{const outcome=resultOf(room.decisions);if(!outcome)return;room.outcome=outcome;enter('ended');}return room;}
}
// 순수한 판정 함수만 공개합니다. 시나리오 변경 후 검증에도 사용합니다.
window.HarmRules=Object.freeze({...narrativeRules,tally,transition,newRoom,remaining,shouldAutoAdvance});
const params=new URLSearchParams(location.search),requestedRoom=params.get('room');
let S={role:'home',view:'home',player:readStore(PLAYER_KEY),character:null,nickname:'',room:null,roomId:null,control:null,decisions:{},outcome:null,recap:0,ownVotes:{},votesLoaded:0,selected:null,selectionKey:'',rooms:[],cloud:null,uid:null,connected:false,offset:0,busy:false,sending:false,error:'',saveOK:null,saveKey:'',cloudSaved:'',storageWarning:false,focusKey:'',generation:0,recapPending:false,readyStep:0,personalLearning:[],reportRound:0,endingTab:'summary',modal:null,explainChoice:0,mediaIndex:0};
if(!validPlayer(S.player))S.player=null;else S.player.nickname=CONFIG.characters.find(c=>c.id===S.player.character).label;
let subscriptions=[],modulesPromise=null,cloudInstances={},toastTimer=null,reconnectPause=false;
const main=document.getElementById('main');
const backgroundMusic=createBackgroundMusic({read:readStore,write:writeStore,notify:showToast});
const experience=createHarmExperience({read:readStore,write:writeStore,notify:showToast,music:backgroundMusic});
const now=()=>Date.now()+S.offset;
function showToast(message){const el=document.getElementById('toast');el.textContent=message;el.classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.add('hidden'),4500);}
function stopLive(){S.generation++;subscriptions.forEach(f=>{try{f();}catch{}});subscriptions=[];S.cloud=null;S.connected=false;S.offset=0;reconnectPause=false;}
function currentKey(){const c=S.control;return c?`${S.roomId}:${c.round}:${c.phase}:${c.ballot}`:S.view;}
function speak(text,key='',speaker='daon',mood='explaining') {
  return `<div class="conversation"><div class="dialogue-turn">${canvasChar(speaker,80,mood)}<div class="dialogue-bubble ee-speech"><strong class="dialogue-speaker ee-speaker">${esc(STORY.characters[speaker]||speaker)}</strong><p class="dialogue-text" data-speech="${esc(key)}" role="button" tabindex="0">${esc(text)}</p><small class="speech-hint">대사를 누르면 한 번에 본다</small></div></div></div>`;
}
function conversations(){return V5.conversations(...arguments);}
function typeDialogue(){experience.sync();}
function finishTyping(el=null){experience.finish(el);}
function topbar(){const open=document.querySelector('.experience-settings')?.open;document.getElementById('topright').innerHTML=`${S.player?`<span class="ee-badge pill">${esc(S.player.nickname)}</span>`:''}${['teacher','student'].includes(S.role)?`<span class="conn ${S.connected?'':'off'}" id="connection-status">${S.connected?'연결됨':'연결 확인 중'}</span>`:''}${experience.controls()}<button class="textbtn ee-button secondary" data-action="home">${commonIcon('home',20)}처음으로</button>`;document.querySelector('.experience-settings').open=!!open;experience.updateControls();}
function render(focus=false){
  const oldFocus=document.activeElement?.dataset,oldScroll=window.scrollY;topbar();
  let html=S.view==='setup'?renderSetup():S.view==='intro-ready'?renderIntroReady():S.view==='loading'?`<section class="ee-panel panel loading">${commonIcon('robot',64)}${heading('수업을 연결하고 있습니다',2)}<p>잠시 기다려 주시기 바랍니다.</p></section>`:S.role==='teacher'&&!S.room?renderTeacherList():S.control?renderSession():renderHome();
  if(S.error)html=`<div class="ee-notice notice error" role="alert">${esc(S.error)} ${btn('안내 닫기','clear-error','')}</div>`+html;
  main.innerHTML=html;main.dataset.view=S.control?'session':S.view;document.body.dataset.session=!!S.control;document.body.dataset.role=S.role;paintArt();paintStage();paintQR();typeDialogue();updateClock();if(S.control?.phase==='feedback'&&S.decisions[S.control.round])commonFeedback(currentKey(),STORY.rounds[S.control.round].choices[S.decisions[S.control.round].choice].kind);
  if(focus){main.querySelector('[data-heading]')?.focus({preventScroll:true});window.scrollTo(0,0);}else if(oldFocus?.action){const candidate=[...main.querySelectorAll('[data-action]')].find(e=>e.dataset.action===oldFocus.action&&e.dataset.index===oldFocus.index);candidate?.focus({preventScroll:true});window.scrollTo(0,oldScroll);}
  saveCompletion();
  if(S.modal==='roster')renderModal();
}
function renderHome(){return V5.renderHome(...arguments);}
function preparePlayer(role){S.role=role;S.readyStep=0;if(S.player){S.view='intro-ready';}else{S.character=null;S.nickname='';S.view='setup';}render(true);}
function renderSetup(){return V5.renderSetup(...arguments);}
function questionBox(){return `<div class="ee-notice inquiry"><span class="ee-badge tag">함께 답을 찾을 질문</span><p>${esc(STORY.question)}</p><p class="small">${esc(STORY.easyQuestion)}</p></div>`;}
function renderIntroReady(){return V5.renderIntroReady(...arguments);}
function renderTeacherList(){return V5.renderTeacherList(...arguments);}
function dateLabel(n){return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(n||Date.now());}
function teacherTools(){return V5.teacherTools(...arguments);}
function renderSession(){return V5.renderSession(...arguments);}
function lobbyScreen(){return V5.lobbyScreen(...arguments);}
function introScreen(){return V5.introScreen(...arguments);}
function sceneHTML(){return V5.sceneHTML(...arguments);}
function mediaHTML(){return V5.mediaHTML(...arguments);}
function clueHTML(){return V5.clueHTML(...arguments);}
function narrativeHTML(){return V5.narrativeHTML(...arguments);}
function roundScreen(){return V5.roundScreen(...arguments);}
function voteScreen(){return V5.voteScreen(...arguments);}
function teacherTally(){return V5.teacherTally(...arguments);}
function bars(counts,total){return `<div class="bars">${LETTERS.map((l,i)=>`<div class="barrow"><b>${l}</b><div class="bar"><div class="fill" style="width:${total?Number(counts[i]||0)/total*100:0}%"></div></div><span>${Number(counts[i]||0)}명</span></div>`).join('')}</div>`;}
function decisionWait(r){const teacher=S.role==='teacher'||S.role==='demo';if(S.control.phase==='empty')return `<section class="ee-panel panel wait"><h2>아직 확인된 표가 없습니다</h2><p>아무 선택도 임의로 정하지 않습니다.<br>선생님이 투표를 다시 열면 함께 선택합니다.</p></section>`;const t=teacher?tally(S.room):null;return `<section class="ee-panel panel wait"><span class="ee-badge tag">같은 수의 표가 모였습니다</span><h2>${teacher?'동률인 선택 중 하나를 정합니다':'선생님의 결정을 기다립니다'}</h2>${teacher?bars(t.counts,t.total)+`<div class="choice-list">${t.leaders.map(i=>btn(`${LETTERS[i]} · ${esc(r.choices[i].text)}`,'resolve','',`data-index="${i}" ${S.busy?'disabled':''}`)).join('')}</div>`:'<p>교사 화면에서 결정하면 우리 반의 결과를 함께 봅니다.</p>'}</section>`;}
function tagsHTML(tags){return `<section class="tagrow learning-details"><h3>이 선택으로 배우는 요소</h3><ul>${tags.map(n=>`<li><strong>${NUMS[n-1]} ${esc(STORY.elements[n].title)}</strong><p>${esc(STORY.elements[n].text)}</p></li>`).join('')}</ul></section>`;}
function feedbackScreen(){return V5.feedbackScreen(...arguments);}
function endingScreen(){return V5.endingScreen(...arguments);}
function progressHTML(){return V5.progressHTML(...arguments);}
function recapBit(gi,ci){let n=ci;for(let j=0;j<gi;j++)n+=STORY.recap[j].choices.length;return 1<<n;}
function selectedRecap(){return STORY.recap.flatMap((g,gi)=>g.choices.filter((_,ci)=>S.recap&recapBit(gi,ci)).map(c=>c.text));}
function teacherRoster(){return V5.teacherRoster(...arguments);}
function canVote(){return S.control?.phase==='vote'&&(S.role==='demo'||S.connected)&&!S.busy;}
function updateClock(){}
function setRoom(room,focus=false){const key=currentKey();S.room=room;S.control=room?.control||null;S.decisions=room?.decisions||{};S.outcome=room?.outcome||null;S.recap=room?.recap||0;S.view='session';render(focus||key!==currentKey());}
async function advance(action,choice=null){if(S.busy||!S.control)return;if(S.role==='demo'){const next=transition(S.room,action,now(),choice);if(next){S.error='';setRoom(next,true);}return;}if(S.role!=='teacher'||!S.connected)return;const generation=S.generation,revision=S.control.revision,c=S.cloud,id=S.roomId;S.busy=true;render();try{const res=await c.D.runTransaction(c.D.ref(c.db,`${ROOM_ROOT}/${id}`),room=>{if(room?.owner!==S.uid||room.control.revision!==revision)return;return transition(room,action,Date.now()+S.offset,choice);},{applyLocally:false});if(generation!==S.generation)return;if(!res.committed)showToast('다른 진행 조작이 먼저 반영됐습니다. 현재 화면을 확인합니다.');S.error='';}catch(e){if(generation===S.generation)S.error=friendlyError(e);}finally{if(generation===S.generation){S.busy=false;render();}}}
async function submitVote(){if(S.selected===null||S.sending||!canVote())return;const choice=S.selected,round=S.control.round,ballot=S.control.ballot;if(S.role==='demo'){S.room.votes??={};S.room.votes[round]??={};S.room.votes[round].demo={choice,ballot,at:now()};S.ownVotes[round]={choice,ballot};render();return;}const c=S.cloud,generation=S.generation;S.sending=true;S.error='';render();try{await c.D.set(c.D.ref(c.db,`${ROOM_ROOT}/${S.roomId}/votes/${round}/${S.uid}`),{choice,ballot,at:c.D.serverTimestamp()});if(generation===S.generation){S.ownVotes[round]={choice,ballot};showToast('서버에서 선택을 확인했습니다.');}}catch(e){if(generation===S.generation)S.error='이번 선택의 반영을 확인하지 못했습니다. '+friendlyError(e);}finally{if(generation===S.generation){S.sending=false;render();}}}
function saveCompletion(){if(S.control?.phase!=='ended'||!S.outcome||!summarize(S.decisions))return;const computed=resultOf(S.decisions);if(JSON.stringify(computed)!==JSON.stringify({game:S.outcome.game,completed:S.outcome.completed,ending:S.outcome.ending,card:S.outcome.card})){S.error='공동 결과와 시나리오 버전이 다릅니다. 선생님과 같은 파일을 사용합니다.';return;}if(S.role==='student'||S.role==='demo'){const key=S.roomId+':'+S.outcome.ending;if(S.saveKey!==key){S.saveOK=writeStore(RESULT_KEY,computed);S.saveKey=key;}const el=document.getElementById('completion-status');if(el)el.textContent=S.saveOK?'✔ 이 기기에 침해금지 완료 기록을 저장했습니다.':'게임을 완료했습니다. 이 브라우저는 저장을 허용하지 않아 완료 기록을 보관하지 못했습니다.';if(S.role==='student')saveServerCompletion(computed);}else{const el=document.getElementById('completion-status');if(el)el.textContent='학생 기기에 이 공동 엔딩을 완료 기록으로 저장합니다. 교사 기기에는 학생 배지를 저장하지 않습니다.';}}
let serverResultInFlight=false;
async function saveServerCompletion(result){if(serverResultInFlight||!S.connected||!S.cloud||S.cloudSaved.startsWith('✔'))return;serverResultInFlight=true;const gen=S.generation;try{await S.cloud.D.set(S.cloud.D.ref(S.cloud.db,`${ROOM_ROOT}/${S.roomId}/results/${S.uid}`),result);if(gen===S.generation)S.cloudSaved='✔ 수업 서버에서도 완료를 확인했습니다.';}catch{if(gen===S.generation)S.cloudSaved='서버 완료 확인을 기다립니다. 이 기기의 저장 결과는 위 안내에서 확인합니다.';}finally{serverResultInFlight=false;const el=document.getElementById('cloud-status');if(gen===S.generation&&el)el.textContent=S.cloudSaved;}}
function friendlyError(e){const s=String(e?.code||'')+' '+String(e?.message||e);if(/permission|PERMISSION_DENIED/i.test(s))return '현재 수업에 접근할 수 없습니다. 수업 링크와 서버 연결 상태를 확인해 주세요.';if(/network|timeout|시간 초과|fetch|disconnected/i.test(s))return '연결을 확인하지 못했습니다. 인터넷을 확인한 뒤 다시 시도합니다.';if(/unauthorized-domain/.test(s))return '현재 웹 주소에서 연결이 허용되는지 Firebase 설정을 확인합니다.';return '연결 또는 진행 중 문제가 생겼습니다. '+s.slice(0,180);}
function timed(p,ms=20000){let timer;return Promise.race([p,new Promise((_,reject)=>timer=setTimeout(()=>reject(new Error('연결 시간 초과')),ms))]).finally(()=>clearTimeout(timer));}
async function prepareCloud(role){if(location.protocol==='file:')throw new Error('실시간 수업은 웹 주소에서 엽니다. 파일에서는 수업 미리보기를 사용할 수 있습니다.');if(!modulesPromise)modulesPromise=Promise.all([import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js'),import('https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js')]).catch(e=>{modulesPromise=null;throw e;});const [F,A,D]=await timed(modulesPromise);if(!cloudInstances[role]){let persistent=true;try{localStorage.setItem('ethicity.harm.authProbe','1');localStorage.removeItem('ethicity.harm.authProbe');}catch{persistent=false;}const app=F.initializeApp(CONFIG.firebase,'ethicity-harm-v5-'+role),auth=A.initializeAuth(app,{persistence:persistent?A.browserLocalPersistence:A.inMemoryPersistence}),db=D.getDatabase(app);cloudInstances[role]={app,auth,db,A,D,persistent};}const c=cloudInstances[role];await timed(c.auth.authStateReady());if(!c.auth.currentUser)await timed(c.A.signInAnonymously(c.auth));return c;}
function watchConnection(c,generation){subscriptions.push(c.D.onValue(c.D.ref(c.db,'.info/serverTimeOffset'),s=>{if(generation===S.generation)S.offset=Number(s.val()||0);}));subscriptions.push(c.D.onValue(c.D.ref(c.db,'.info/connected'),snap=>{if(generation!==S.generation)return;S.connected=!!snap.val();render();}));}
async function enterTeacher(){stopLive();S.role='teacher';S.view='loading';S.room=null;S.control=null;S.roomId=null;S.error='';S.rooms=[];S.busy=true;render(true);const generation=S.generation;try{const c=await prepareCloud('teacher');if(generation!==S.generation)return;S.cloud=c;S.uid=c.auth.currentUser.uid;watchConnection(c,generation);S.view='teacher';const resume=params.get('teacherRoom');if(resume&&/^[a-f0-9]{32}$/.test(resume)){S.busy=false;await openRoom(resume);}}catch(e){if(generation===S.generation){S.error=friendlyError(e);S.view='teacher';}}finally{if(generation===S.generation){S.busy=false;render();}}}
async function createRoom(){if(S.busy||!S.cloud||!S.connected)return;S.busy=true;S.error='';render();try{const id=crypto.randomUUID().replaceAll('-',''),room=newRoom(S.uid,now());await timed(S.cloud.D.set(S.cloud.D.ref(S.cloud.db,`${ROOM_ROOT}/${id}`),room));await openRoom(id);}catch(e){S.error=friendlyError(e);}finally{S.busy=false;render();}}
async function openRoom(id){if(!/^[a-f0-9]{32}$/.test(id))return;const c=S.cloud;stopLive();S.cloud=c;S.roomId=id;try{const u=new URL(location.href);u.search='';u.searchParams.set('mode','teacher');u.searchParams.set('teacherRoom',id);history.replaceState(null,'',u);}catch{}S.room=null;S.control=null;S.view='loading';S.saveKey='';S.cloudSaved='';S.error='';const generation=S.generation;watchConnection(c,generation);subscriptions.push(c.D.onValue(c.D.ref(c.db,`${ROOM_ROOT}/${id}`),snap=>{if(generation!==S.generation)return;const room=snap.val();if(!room){S.error='이 수업을 찾을 수 없습니다.';S.control=null;S.view='teacher';render();return;}if(room.control.version!==STORY.version){S.error='이 수업은 다른 시나리오 버전으로 만들어졌습니다. 새 수업을 만듭니다.';S.control=null;S.view='teacher';render();return;}setRoom(room);},e=>{S.error=friendlyError(e);S.view='teacher';render();}));}
async function joinRoom(){if(!S.roomId||!/^[a-f0-9]{32}$/.test(S.roomId)){S.error='선생님에게 올바른 수업 입장 링크를 받습니다.';render();return;}stopLive();S.role='student';S.view='loading';S.error='';S.saveKey='';S.cloudSaved='';S.ownVotes={};S.votesLoaded=0;S.control=null;S.decisions={};S.outcome=null;render(true);const generation=S.generation,id=S.roomId;try{const c=await prepareCloud('student');if(generation!==S.generation)return;S.cloud=c;S.uid=c.auth.currentUser.uid;const memberRef=c.D.ref(c.db,`${ROOM_ROOT}/${id}/members/${S.uid}`),member=await timed(c.D.get(memberRef));const cs=await timed(c.D.get(c.D.ref(c.db,`${ROOM_ROOT}/${id}/control`))),control=cs.val();if(!control)throw new Error('수업을 찾을 수 없습니다.');if(control.version!==STORY.version)throw new Error('선생님과 같은 시나리오 버전의 파일로 참여합니다.');if(!member.exists()){if(!control.accepting)throw new Error('선생님에게 입장 상태를 확인해 주세요.');await timed(c.D.set(memberRef,{nickname:S.player.nickname,character:S.player.character,joinedAt:c.D.serverTimestamp()}));}if(generation!==S.generation)return;S.control=control;S.view='session';watchConnection(c,generation);
  const watch=(path,fn)=>subscriptions.push(c.D.onValue(c.D.ref(c.db,`${ROOM_ROOT}/${id}/${path}`),snap=>{if(generation!==S.generation)return;fn(snap.val());render();},e=>{if(generation===S.generation){S.error=friendlyError(e);render();}}));
  watch('control',v=>{if(v){S.control=v;S.view='session';}else{S.control=null;S.view='intro-ready';S.error='선생님이 수업 기록을 정리했습니다.';}});watch('decisions',v=>S.decisions=v||{});watch('outcome',v=>S.outcome=v);watch('recap',v=>S.recap=v||0);
  for(let i=0;i<8;i++)watch(`votes/${i}/${S.uid}`,v=>{S.votesLoaded|=1<<i;if(v)S.ownVotes[i]=v;else delete S.ownVotes[i];});
  render(true);
 }catch(e){if(generation===S.generation){S.error=friendlyError(e);S.view='intro-ready';S.control=null;render();}}}
function startDemo(){stopLive();S.role='demo';S.uid='demo';S.roomId='demo-'+Date.now();S.cloudSaved='';S.saveKey='';S.ownVotes={};S.selected=null;const room=newRoom('demo',now());room.members={demo:{nickname:S.player.nickname,character:S.player.character,joinedAt:now()}};setRoom(transition(room,'start',now()),true);}
function inviteURL(){const u=new URL(location.href);u.search='';u.hash='';u.searchParams.set('room',S.roomId);return u.href;}
async function copyInvite(){try{await navigator.clipboard.writeText(inviteURL());showToast('학생 입장 링크를 복사했습니다.');}catch{showToast('화면에 표시된 입장 링크를 선택해서 복사합니다.');}}
async function toggleRecap(bit){if(S.recapPending||S.control?.phase!=='ended'||!Number.isInteger(bit)||bit<1||bit>64)return;if(S.role==='demo'){S.room.recap=(S.room.recap||0)^bit;setRoom(S.room);return;}if(S.role!=='teacher'||!S.connected)return;S.recapPending=true;try{await S.cloud.D.runTransaction(S.cloud.D.ref(S.cloud.db,`${ROOM_ROOT}/${S.roomId}/recap`),v=>(v||0)^bit,{applyLocally:false});}catch(e){S.error=friendlyError(e);}finally{S.recapPending=false;render();}}
function downloadBlob(text,type,filename){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportCSV(){if(!S.room)return;const rows=[['참여번호','가상 닉네임',...STORY.rounds.map(r=>r.id+'라운드'),'완료','학급 엔딩'],...Object.entries(S.room.members||{}).map(([uid,m],i)=>[i+1,m.nickname,...STORY.rounds.map((r,j)=>S.room.votes?.[j]?.[uid]?LETTERS[S.room.votes[j][uid].choice]:''),S.room.results?.[uid]?'완료':'',S.outcome?.ending||'']),['학급 확정 선택','',...STORY.rounds.map((r,i)=>S.decisions[i]?LETTERS[S.decisions[i].choice]:''),'',S.outcome?.ending||'']];const safe=v=>{let s=String(v);if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};downloadBlob('\ufeff'+rows.map(r=>r.map(safe).join(',')).join('\r\n'),'text/csv;charset=utf-8','harm-v5-수업기록.csv');}
async function downloadCard(){if(!S.outcome)return;await commonReady;await document.fonts.ready;const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=630;const ctx=canvas.getContext('2d');ctx.fillStyle=COMMON_MANIFEST.style.palette.cream;ctx.fillRect(0,0,1200,630);ctx.fillStyle=COMMON_MANIFEST.style.palette.ink;ctx.fillRect(0,0,1200,100);ctx.fillStyle='white';ctx.font='bold 32px Ethicity';ctx.fillText('윤리시티 · 침해금지',55,65);ctx.fillStyle=COMMON_MANIFEST.style.palette.ink;ctx.font='bold 40px Ethicity';const text=S.outcome.card;let line='',y=250;for(const word of text.split(/\s+/)){const next=line?line+' '+word:word;if(line&&ctx.measureText(next).width>1080){ctx.fillText(line,55,y);line=word;y+=70;}else line=next;}ctx.fillText(line,55,y);ctx.font='24px Ethicity';ctx.fillText('우리 반이 함께 만든 배움 · '+STORY.endings[S.outcome.ending].title,55,480);canvas.toBlob(blob=>{if(blob)downloadBlob(blob,'image/png','harm-한줄카드.png');});}
function resetHome(){backgroundMusic.stop();finishTyping();stopLive();S.role='home';S.view='home';S.room=null;S.roomId=null;S.control=null;S.error='';S.busy=false;S.sending=false;S.saveKey='';S.modal=null;document.getElementById('v5-modal')?.remove();try{history.replaceState(null,'',location.pathname);}catch{}render(true);}
document.addEventListener('input',event=>{if(event.target.id==='music-volume')backgroundMusic.setVolume(event.target.value);});
document.addEventListener('click',async event=>{const el=event.target.closest('[data-action]');if(!el||el.disabled)return;const action=el.dataset.action,i=Number(el.dataset.index);try{
  if(await handleV5Action(action,el,i))return;
  if(['demo','teacher','join','create-room','start'].includes(action))backgroundMusic.start();
  if(action==='music'){backgroundMusic.toggle();return;}
  if(action==='home'){if(S.control&&S.control.phase!=='ended'&&!confirm('진행 중인 수업 화면을 나가겠습니까? 완료 기록은 유지됩니다.'))return;resetHome();}
  else if(action==='teacher')await enterTeacher();else if(action==='demo')preparePlayer('demo');else if(action==='character'){S.character=i;render();}
  else if(action==='join'){if(S.role==='demo')startDemo();else await joinRoom();}else if(action==='change-player'){S.character=CONFIG.characters.findIndex(c=>c.id===S.player?.character);S.view='setup';render(true);}
  else if(action==='create-room')await createRoom();else if(action==='open-room')await openRoom(el.dataset.room);else if(action==='teacher-list')await enterTeacher();
  else if(['start','next','back','retry'].includes(action))await advance(action);else if(action==='resolve')await advance('resolve',i);else if(action==='choice'){if(canVote()){S.selected=i;render();}}else if(action==='submit')await submitVote();
  else if(action==='recap')await toggleRecap(i);else if(action==='copy-invite')await copyInvite();else if(action==='csv')exportCSV();else if(action==='card')await downloadCard();else if(action==='review')document.getElementById('review-list')?.classList.toggle('hidden');
  else if(action==='fullscreen'){if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen();}else if(action==='clear-error'){S.error='';render();}else if(action==='typing')experience.toggleTyping();else if(action==='sfx')await toggleCommonSound();
 }catch(e){S.error=friendlyError(e);S.busy=false;render();}});
document.addEventListener('submit',event=>{if(event.target.id!=='player-form')return;event.preventDefault();if(S.character===null||S.character<0){S.error='탐험가를 먼저 골라 주세요.';render();return;}S.player={character:CONFIG.characters[S.character].id,nickname:CONFIG.characters[S.character].label};S.storageWarning=!writeStore(PLAYER_KEY,S.player);S.error='';S.view='intro-ready';S.readyStep=0;render(true);});
document.addEventListener('click',event=>{const speech=event.target.closest('[data-speech]');if(speech)finishTyping(speech);if(!event.target.closest('.experience-settings'))document.querySelector('.experience-settings')?.removeAttribute('open');});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeModal();document.querySelector('.experience-settings')?.removeAttribute('open');}if(event.target.closest('input,textarea,button,summary'))return;if(event.key==='Enter'||event.key===' '){finishTyping(event.target.closest('[data-speech]'));if(event.key===' ')event.preventDefault();}if(['1','2','3'].includes(event.key)&&canVote()){S.selected=Number(event.key)-1;render();}});
if(requestedRoom){if(/^[a-f0-9]{32}$/.test(requestedRoom)){S.roomId=requestedRoom;preparePlayer('student');}else{S.error='입장 링크가 올바르지 않습니다. 선생님에게 새 링크를 받습니다.';render();}}else if(params.get('mode')==='teacher'){enterTeacher();}else render();
