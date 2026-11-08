'use strict';
// ==================== 문장과 설정을 읽는 곳 ====================
// 문장만 바꾸려면 위쪽 game-data JSON을 수정합니다. 진행 코드는 아래에 있습니다.
const STORY_TEMPLATE=JSON.parse(document.getElementById('game-data').textContent);
let STORY=STORY_TEMPLATE;
const BASE_CONFIG=JSON.parse(document.getElementById('game-config').textContent);
const PLAYER_KEY='ethicity.player', RESULT_KEY='ethicity.result.privacy', FRIEND_KEY='ethicity.privacy.v7.friendName';
// localStorage 접근은 이 세 함수 안에서만 합니다. 저장이 차단돼도 게임은 계속합니다.
function readStore(key,fallback=null){try{const raw=localStorage.getItem(key);return raw===null?fallback:JSON.parse(raw);}catch{return fallback;}}
function writeStore(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
function removeStore(key){try{localStorage.removeItem(key);return true;}catch{return false;}}
const savedConfig=readStore('ethicity.privacy.v7.settings');
let CONFIG=structuredClone(BASE_CONFIG);
if(savedConfig&&validConfig(savedConfig))CONFIG=savedConfig;
CONFIG.characters.forEach((c,i)=>c.label=(i===0?'A':'B')+'버전 탐험가');
const LABELS={safe:{icon:'✔',title:'보호를 마쳤습니다'},check:{icon:'🔎',title:'확인하고 있습니다'},risk:{icon:'✖',title:'더 살펴봅니다'}};
const NUMS=['①','②','③','④','⑤'];
// 금지어는 교사가 이 목록에 추가할 수 있습니다. 모든 표현을 알아내지는 못합니다.
const BLOCKED_WORDS=['시발','씨발','씨팔','시팔','씹','좆','좇','지랄','병신','븅신','등신','새끼','개새','꺼져','죽어','멍청','바보','느금','니엄','니애','느개비','창녀','성기','자지','보지','섹스','야동','변태'];
function nicknameError(raw){const n=String(raw??'').normalize('NFC');if(!/^[가-힣]{1,5}$/.test(n))return '완성된 한글로 1~5자를 적어 주시기 바랍니다. 공백·숫자·기호는 쓸 수 없습니다.';const compact=n.replace(/(.)\1+/g,'$1');if(BLOCKED_WORDS.some(w=>n.includes(w)||compact.includes(w)))return '다른 사람을 존중하는 별명으로 바꿔 주시기 바랍니다.';return '';}
function validConfig(c){return !!c&&Array.isArray(c.characters)&&c.characters.length===2&&c.characters.every(x=>x&&/^[A-Za-z][A-Za-z0-9_-]{0,31}$/.test(x.id)&&['boy','pony'].includes(x.type))&&c.characters[0].id!==c.characters[1].id;}
function validPlayer(p){return p&&typeof p.nickname==='string'&&!nicknameError(p.nickname)&&CONFIG.characters.some(c=>c.id===p.character);}
function characterType(id){return CONFIG.characters.find(c=>c.id===id)?.type||'boy';}
function subject(name){return name+((name.charCodeAt(name.length-1)-44032)%28===0?'는':'은');}
function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
// 이름 뒤의 은/는·이/가·와/과를 받침에 맞춥니다. 원본 문장은 game-data에 남습니다.
function nameWithParticle(name,withFinal,withoutFinal){return name+((name.charCodeAt(name.length-1)-44032)%28===0?withoutFinal:withFinal);}
function applyFriendName(){
  const name=S.friendName||'친구';
  const words={'{friend}':name,'{friendSubject}':nameWithParticle(name,'이','가'),'{friendTopic}':subject(name),'{friendWith}':nameWithParticle(name,'과','와')};
  function resolve(value){
    if(typeof value==='string'){for(const [token,replacement]of Object.entries(words))value=value.replaceAll(token,replacement);return value;}
    if(Array.isArray(value))return value.map(resolve);
    if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,resolve(item)]));
    return value;
  }
  STORY=resolve(STORY_TEMPLATE);
}
function say(s){return s.replaceAll('{player}','당신은').replaceAll('{nickname}',S.player?.nickname||'친구');}
function choiceText(c){return c.shortText||c.text;}
function btn(text,action,cls='primary',extra=''){return `<button type="button" class="btn ${cls}" data-action="${action}" ${extra}>${text}</button>`;}
function canvasChar(type,size=64,mood='normal'){return `<canvas width="64" height="64" class="pixel" data-character="${type}" data-mood="${mood}" style="width:${size}px;height:${size}px" aria-hidden="true"></canvas>`;}
function validateAnswers(answers){const out={};if(!answers||typeof answers!=='object')return out;for(let i=0;i<STORY.rounds.length;i++){const a=answers[i],r=STORY.rounds[i];if(a&&Number.isInteger(a.choice)&&a.choice>=0&&a.choice<r.choices.length&&Number.isInteger(a.signals)&&a.signals>=1&&a.signals<(1<<r.signals.length))out[i]={choice:a.choice,signals:a.signals,firstSignals:Number.isInteger(a.firstSignals)&&a.firstSignals>=0&&a.firstSignals<=15?a.firstSignals:a.signals,signalChecks:Number.isInteger(a.signalChecks)&&a.signalChecks>=1&&a.signalChecks<=100?a.signalChecks:1,...(typeof a.at==='number'?{at:a.at}:{})};}return out;}
// 개인정보 보호 점수로 기존 엔딩을 유지합니다. 편리성 점수는 독립 지표입니다.
function protectionTotal(answers){return STORY.rounds.reduce((total,r,i)=>total+(r.choices[answers[i]?.choice]?.score||0),0);}
function endingOf(answers){if(Object.keys(validateAnswers(answers)).length!==STORY.rounds.length)return null;const total=protectionTotal(answers);return total>=STORY.endingThresholds.A?'A':total>=STORY.endingThresholds.B?'B':'C';}
function cloudConfigured(){const f=CONFIG.firebase;return f&&['apiKey','authDomain','databaseURL','projectId','appId'].every(k=>typeof f[k]==='string'&&f[k].length>0);}
const params=new URLSearchParams(location.search);
const requestedRoom=params.get('room');
let S={player:readStore(PLAYER_KEY),friendName:'새봄',friendDraft:'새봄',view:'home',mode:requestedRoom?'student':'solo',roomId:/^[a-f0-9]{32}$/.test(requestedRoom||'')?requestedRoom:null,round:0,answers:{},pending:{},signals:0,roundStage:'case',choosing:false,selected:null,nicknameDraft:'',characterDraft:null,feedback:false,storageWarning:false,network:false,networkKnown:false,room:null,control:null,uid:null,teacher:null,teacherAllowed:false,teacherRooms:[],teacherPanel:['choices','participants'].includes(params.get('panel'))?params.get('panel'):null,panelNotice:'',cloud:null,busy:false,error:'',resultSaved:null,cloudResult:'',ended:false,liveGeneration:0};
if(!validPlayer(S.player))S.player=null;
S.friendName='새봄';
applyFriendName();
const main=document.getElementById('main'),topBarElement=document.getElementById('topright');
let unsubs=[],clockTick=null,toastTimeout=null;
function showToast(message){const el=document.getElementById('toast');el.textContent=message;el.classList.remove('hidden');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.classList.add('hidden'),4500);}
function setError(message){S.error=message;render();}
function draftKey(){return S.mode==='student'?'ethicity.privacy.v7.classroom20261108.draft.'+S.roomId:'ethicity.privacy.v7.classroom20261108.draft.solo';}
function saveDraft(){writeStore(draftKey(),{version:1,uid:S.uid,player:S.player,answers:S.answers,pending:S.pending,round:S.round});}
function clearLive(){S.liveGeneration++;unsubs.forEach(f=>{try{f();}catch{}});unsubs=[];}
function preparePlayerSetup(){S.characterDraft=S.player?CONFIG.characters.findIndex(c=>c.id===S.player.character):null;S.nicknameDraft=S.player?.nickname||'';S.friendDraft=S.friendName;S.view='setup';S.error='';}
function playerSetup(mode){resetNarration();S.mode=mode;preparePlayerSetup();render(true);}
function activeChoice(){return S.answers[S.round]?STORY.rounds[S.round].choices[S.answers[S.round].choice]:null;}
function studentCanReveal(){return S.mode==='solo'||S.control?.phase==='ended'||(S.control?.round===S.round&&S.control.phase==='reveal');}
function resetRoundUI(){S.roundStage='case';S.signals=S.answers[S.round]?.signals||0;S.choosing=!!S.answers[S.round];S.selected=S.answers[S.round]?.choice??null;S.feedback=!!S.answers[S.round]&&studentCanReveal();S.error='';S.dialoguePage=0;S.observePage=0;S.feedbackPage=0;S.signalChecked=false;S.firstSignals=null;S.signalChecks=0;}
function moveRound(i){S.round=i;S.view='round';resetRoundUI();render(true);}
function render(focus=false){
  const active=document.activeElement;const priorAction=active?.dataset?.action,priorIndex=active?.dataset?.index;
  topBarElement.innerHTML=headerV7();
  document.body.dataset.view=S.view;document.body.dataset.mode=S.mode;
  const screens={home:renderHome,setup:renderSetup,intro:renderIntro,round:renderRound,wait:renderWait,ending:renderEnding,teacher:renderTeacher,config:renderConfig,loading:renderLoading};
  main.innerHTML=studentMetrics()+(screens[S.view]||renderHome)();paintArt();mountNarration();applyCommonUI();mountClassroom();
  if(focus){const heading=main.querySelector('[data-heading]');heading?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
  else if(priorAction){const candidates=Array.from(document.querySelectorAll('[data-action]'));candidates.find(e=>e.dataset.action===priorAction&&e.dataset.index===priorIndex&&!e.disabled)?.focus({preventScroll:true});}
}
function heading(text,level=1){return `<h${level} tabindex="-1" data-heading>${esc(text)}</h${level}>`;}
function renderHome(){return `<section class="landing"><div class="herocopy"><div class="eyebrow"><span class="tag">AI 윤리 탐험대</span><span class="chip">프라이버시 보호</span></div>${heading(STORY.title)}<p class="hero-desc">작은 선택으로 지키는 소중한 정보.<br>${esc(nameWithParticle(S.friendName||'친구','과','와'))} 함께 여덟 개의 발자국을 따라가며<br>AI를 현명하게 사용하는 방법을 배웁니다.</p><div class="buttons">${btn('탐험 시작하기 <span aria-hidden="true">→</span>','start-solo')}${btn('교사 컨트롤타워','teacher','')}</div><p class="small" style="margin-top:16px">실시간 수업은 선생님이 보내 준 입장 링크로 시작합니다.</p><div class="hero-metrics"><div><b>8가지 상황</b>생각하고 선택합니다</div><div><b>약 10분</b>나만의 속도로 배웁니다</div><div><b>4단계</b>처음부터 끝까지 지킵니다</div></div></div><div class="heroart"><canvas data-village role="img" aria-label="학교와 숲, 연못이 있는 도트 마을에서 탐험가와 안내봇이 만납니다."></canvas><div class="artlabel">오늘의 미션 · 정보의 길을 따라갑니다</div><div class="artcaption">${canvasChar('bot',56)}<div><strong>${esc(S.friendName||'친구')}의 정보를 함께 지킵니다!</strong><p>모든 인물과 자료는 게임 속 가상 내용입니다.</p></div></div></div></section><div class="stepsbar">${STORY.phases.map((p,i)=>`<div class="stepcard"><span class="num">0${i+1}</span><div><b>${p}</b><small>${['꼭 필요한 정보만 고릅니다','어디에, 얼마나 남습니까?','허락한 범위를 지킵니다','삭제 완료까지 확인합니다'][i]}</small></div></div>`).join('')}</div>`;}
function trail(){return `<nav class="trail" aria-label="이번 사례에서 살펴볼 개인정보 보호 단계">${STORY.phases.map((p,i)=>`<div class="trailstep ${STORY.rounds[S.round].phase===i?'current':''}"><span class="dot">${i+1}</span><b>${p}</b><span class="dots" aria-hidden="true">${STORY.rounds.filter(r=>r.phase===i).map(r=>S.answers[r.id]?'●':'○').join('')}</span></div>`).join('')}</nav>`;}

function countBits(n){return n.toString(2).replaceAll('0','').length;}
function tagHTML(tags){return `<section class="tagrow learning-details" aria-label="이 선택으로 배우는 요소"><h3>이 선택으로 배우는 요소</h3><ul>${tags.map(t=>`<li><strong>${NUMS[t-1]} ${esc(STORY.elementLabels[t])}</strong><p>${esc(STORY.elements[t])}</p></li>`).join('')}</ul></section>`;}
function submittedHTML(){const a=S.answers[S.round];return `<div style="text-align:center;padding:18px 0">${canvasChar('bot',96)}<h2>선택을 정했습니다</h2><p>${esc(choiceText(STORY.rounds[S.round].choices[a.choice]))}</p><p class="notice">선생님이 결과를 공개하면<br>선택 뒤의 이야기를 함께 확인합니다.</p><p class="small">친구의 선택과 관계없이 나의 이야기가 이어집니다.</p></div>`;}
function saveStatusText(){if(S.mode==='solo')return '혼자 탐험 중 · 인터넷 없이도 진행할 수 있습니다.';if(S.mode==='teacher')return '';if(S.pending[S.round])return S.network?'⏳ 서버가 저장했는지 확인하고 있습니다.':'⏳ 연결을 기다립니다. 선택은 이 화면에 임시 보관됩니다.';if(S.answers[S.round])return '✔ 서버에서 저장을 확인했습니다.';return S.network?'수업에 연결됐습니다.':'연결을 확인하고 있습니다. 화면을 닫지 말고 잠시 기다립니다.';}
function renderWait(){const n=Object.keys(S.answers).length;return `<section class="panel wait">${canvasChar('bot',112)}<span class="tag" style="display:block;margin-top:15px">함께하는 교실 탐험</span>${heading(S.control?.phase==='lobby'?'친구들이 모이고 있습니다':'다음 발자국을 기다립니다')}<p>${esc('당신은')} 선생님의 안내를 기다립니다.</p><div class="progress-pips">${STORY.rounds.map((r,i)=>`<span class="${S.answers[i]?'done':''}" aria-label="${i+1}라운드 ${S.answers[i]?'응답함':'아직'}">${S.answers[i]?'✔':i+1}</span>`).join('')}</div><p class="small">${n} / 8개의 선택을 마쳤습니다.</p>${S.error?`<p class="notice error">${esc(S.error)}</p>`:''}<p class="statusline" id="save-status">${S.network?'✔ 수업에 연결됐습니다.':'연결을 다시 확인하고 있습니다. 화면을 닫지 말고 기다립니다.'}</p>${S.control&&S.control.round>=0&&S.answers[S.control.round]&&S.control.phase==='reveal'?btn('이번 결과 다시 보기','current-feedback',''):''}${!S.network?btn('연결 다시 확인하기','reconnect',''):''}${S.player?btn('혼자 이어서 탐험하기','solo-fallback',''):''}</section>`;}
function renderLoading(){return `<section class="panel loading"><span class="spinner" aria-hidden="true"></span>${heading('연결을 확인하고 있습니다',2)}<p>${esc(S.loadingText||'잠시만 기다려 주시기 바랍니다.')}</p><p class="small">인터넷 연결과 수업 설정을 확인합니다.</p>${S.error?`<p class="notice error">${esc(S.error)}</p>`:''}${btn('처음 화면으로','home','')}</section>`;}
function startSolo(resume=false){resetNarration();clearLive();S.mode='solo';S.pending={};S.error='';S.ended=false;S.cloudResult='';if(resume){const d=readStore('ethicity.privacy.v7.classroom20261108.draft.solo');S.answers=validateAnswers(d?.answers);S.round=STORY.rounds.findIndex((r,i)=>!S.answers[i]);if(S.round<0)S.round=0;}else{S.answers={};S.round=0;}saveDraft();moveRound(S.round);}
async function finishGame(){const end=endingOf(S.answers);if(!end)return;const result={game:'privacy',completed:true,ending:end,card:STORY.endings[end].card};S.resultSaved=writeStore(RESULT_KEY,result);S.ended=true;S.view='ending';removeStore(draftKey());render(true);if(S.mode==='student')await saveCloudResult(result);}
async function submitChoice(){if(S.selected===null||!S.signals||!S.signalChecked||S.answers[S.round])return;const i=S.round,a={choice:S.selected,signals:S.signals,firstSignals:S.firstSignals??S.signals,signalChecks:Math.max(1,S.signalChecks||1)};S.answers[i]=a;if(S.mode==='student'){S.pending[i]=a;saveDraft();render();sendAnswer(i,a);}else{saveDraft();S.feedback=true;render(true);}}
function nextRound(){if(S.mode==='solo'){if(S.round===7)finishGame();else moveRound(S.round+1);return;}if(S.control?.phase==='ended'){const missing=STORY.rounds.findIndex((r,i)=>!S.answers[i]||S.pending[i]);if(missing<0)finishGame();else moveRound(missing);return;}if(S.round===7&&endingOf(S.answers)&&Object.keys(S.pending).length===0){finishGame();return;}S.view='wait';render(true);}
function modal(title,content,actions){const host=document.getElementById('modal-host');host.innerHTML=`<div class="modal"><section class="modalbox" role="dialog" aria-modal="true" aria-labelledby="modal-title"><h2 id="modal-title">${esc(title)}</h2>${content}<div class="buttons" style="margin-top:20px">${actions}</div></section></div>`;applyCommonUI(host);host.querySelector('button')?.focus();}
function closeModal(){document.getElementById('modal-host').innerHTML='';}
function confirmLeave(action){modal('처음 화면으로 돌아가겠습니까?','<p>이미 저장한 완료 기록은 유지됩니다. 진행 중인 선택은 이 기기에 임시 보관합니다.</p>',btn('돌아갑니다',action)+btn('계속 탐험합니다','close-modal',''));}
async function onAction(action,el){if(await landingActionV7(action,el))return;if(await classroomAction(action,el))return;const i=Number(el?.dataset?.index);switch(action){
  case 'toggle-sound':toggleSound();break;
  case 'toggle-typing':toggleNarration();break;
  case 'start-solo':S.roomId=null;playerSetup('solo');break;
  case 'character':S.nicknameDraft=document.getElementById('nickname')?.value??S.nicknameDraft;S.friendDraft=document.getElementById('friend-name')?.value??S.friendDraft;S.characterDraft=i;render();break;
  case 'change-player':preparePlayerSetup();render(true);break;
  case 'begin':if(S.mode==='student')joinRoom();else startSolo();break;
  case 'resume':startSolo(true);break;
  case 'observe-case':setRoundStage('observe');break;
  case 'back-case':setRoundStage('case');break;
  case 'find-signals':setRoundStage('signals');break;
  case 'signal':if(S.roundStage==='signals'&&!S.answers[S.round]){S.signals^=1<<i;render();}break;
  case 'show-choices':if(S.signals)setRoundStage('choices');break;
  case 'back-signals':setRoundStage('signals');break;
  case 'choice':if(!S.answers[S.round]){S.selected=i;render();}break;
  case 'submit':submitChoice();break;
  case 'next':nextRound();break;
  case 'current-feedback':moveRound(S.control.round);break;
  case 'reconnect':reconnectLive();break;
  case 'solo-fallback':modal('혼자 탐험으로 이어가겠습니까?','<p>지금까지의 선택을 이어서 배웁니다. 이후의 선택은 교사 화면에 전달되지 않습니다.</p>',btn('혼자 이어서 탐험합니다','solo-fallback-confirm')+btn('수업에 남습니다','close-modal',''));break;
  case 'solo-fallback-confirm':saveDraft();clearLive();closeModal();S.mode='solo';S.roomId=null;S.control=null;S.pending={};S.ended=false;S.error='';{const missing=STORY.rounds.findIndex((r,j)=>!S.answers[j]);if(missing<0)finishGame();else moveRound(missing);}break;
  case 'restart':S.roomId=null;clearLive();playerSetup('solo');break;
  case 'home':if(['round','wait','loading'].includes(S.view)){confirmLeave('go-home');}else goHome();break;
  case 'go-home':goHome();break;
  case 'close-modal':closeModal();break;
  case 'teacher':await enterTeacher();break;
  case 'config':clearLive();S.view='config';S.error='';render(true);break;
  case 'teacher-connect':await connectTeacher();break;
  case 'create-room':createRoom();break;
  case 'open-room':openTeacherRoom(el.dataset.room);break;
  case 'teacher-reveal':advanceTeacher('reveal');break;
  case 'teacher-next':advanceTeacher('next');break;
  case 'teacher-next-confirm':closeModal();advanceTeacher('next',true);break;
  case 'teacher-end':advanceTeacher('end');break;
  case 'teacher-end-confirm':closeModal();advanceTeacher('end',true);break;
  case 'toggle-admission':toggleAdmission();break;
  case 'copy-invite':copyInvite();break;
  case 'delete-room':modal('이 수업 기록을 삭제하겠습니까?','<p>선택·완료 기록과 입장 링크를 이 수업 서버에서 삭제합니다. 학생 기기의 완료 기록은 남습니다. 삭제한 수업 기록은 되돌릴 수 없습니다.</p>',btn('이 수업 기록 삭제','delete-room-confirm','danger')+btn('취소','close-modal',''));break;
  case 'delete-room-confirm':closeModal();deleteRoom();break;
  case 'room-list':clearLive();S.roomId=null;S.room=null;S.control=null;loadTeacherRooms();break;
  case 'open-choices':openTeacherPanel('choices');break;
  case 'open-participants':openTeacherPanel('participants');break;
  case 'expand-choices':S.teacherPanel='choices';S.panelNotice='';render(true);break;
  case 'expand-participants':S.teacherPanel='participants';S.panelNotice='';render(true);break;
  case 'teacher-reconnect':openTeacherRoom(S.roomId);break;
  case 'panel-fullscreen':toggleTeacherFullscreen();break;
  case 'panel-back':leaveTeacherPanel();break;
  case 'export-csv':exportCSV();break;
  case 'export-game':exportGame();break;
  case 'download-card':await downloadCommonCard();break;
  case 'retry-result':if(endingOf(S.answers))saveCloudResult({game:'privacy',completed:true,ending:endingOf(S.answers),card:STORY.endings[endingOf(S.answers)].card});break;
}}
function goHome(){closeModal();clearLive();preparePlayerSetup();S.mode='solo';S.roomId=null;S.control=null;S.room=null;S.error='';try{history.replaceState(null,'',location.pathname);}catch{}render(true);}
document.addEventListener('click',event=>{const el=event.target.closest('[data-action]');if(el&&!el.disabled){onAction(el.dataset.action,el).catch(e=>{S.error=friendlyError(e);render();});}});
document.addEventListener('submit',event=>{if(event.target.id==='player-form')savePlayer(event);if(event.target.id==='config-form'){event.preventDefault();saveConfiguration();}});
function updateNameDraft(event){
  const id=event.target.id;if(!['nickname','friend-name'].includes(id)||event.isComposing)return;
  S[id==='nickname'?'nicknameDraft':'friendDraft']=event.target.value;
  document.getElementById(id+'-error').textContent=event.target.value?nicknameError(event.target.value):'';
  event.target.removeAttribute('aria-invalid');
}
document.addEventListener('input',updateNameDraft);
document.addEventListener('compositionend',updateNameDraft);
document.addEventListener('keydown',event=>{const modalEl=document.querySelector('.modal');if(modalEl){if(event.key==='Escape')closeModal();if(event.key==='Tab'){const list=Array.from(modalEl.querySelectorAll('button,a,input,textarea')).filter(e=>!e.disabled);if(event.shiftKey&&document.activeElement===list[0]){event.preventDefault();list.at(-1).focus();}else if(!event.shiftKey&&document.activeElement===list.at(-1)){event.preventDefault();list[0].focus();}}return;}if(/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)||event.ctrlKey||event.metaKey||event.altKey)return;if(S.view==='round'&&S.choosing&&!S.answers[S.round]&&/^[1-4]$/.test(event.key)){event.preventDefault();S.selected=Number(event.key)-1;render();}});
function downloadBlob(data,type,name){const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportGame(){const doc=document.documentElement.cloneNode(true);doc.querySelector('#main').innerHTML='<p>탐험을 준비하고 있습니다.</p>';doc.querySelector('#topright').replaceChildren();doc.querySelector('#modal-host').replaceChildren();doc.querySelector('#game-config').textContent=JSON.stringify(CONFIG,null,2).replaceAll('<','\\u003c');downloadBlob('<!DOCTYPE html>\n'+doc.outerHTML,'text/html;charset=utf-8','index.html');showToast('설정한 index.html을 내려받았습니다. v6 폴더의 기존 index.html만 교체하고 common·source 폴더는 함께 유지합니다.');}
function friendlyError(e){const code=e?.code||'',m=String(e?.message||e);if(/permission|PERMISSION_DENIED/i.test(code+' '+m))return '접근 권한이 없거나 수업의 응답 시간이 끝났습니다. 선생님에게 수업 상태와 저장소 규칙을 확인해 달라고 합니다.';if(code==='auth/unauthorized-domain')return '이 웹 주소가 로그인 허용 목록에 없습니다. Firebase Authentication의 승인된 도메인에 현재 주소를 추가합니다.';if(/popup-blocked/.test(code))return '로그인 팝업이 차단됐습니다. 이 사이트의 팝업을 허용한 뒤 다시 누릅니다.';if(/popup-closed|cancelled-popup/.test(code))return '로그인 창이 닫혔습니다. 다시 로그인할 수 있습니다.';if(/operation-not-allowed/.test(code))return 'Firebase에서 필요한 로그인 방식이 켜져 있지 않습니다. 익명 로그인을 켰는지 확인합니다.';if(/network|timeout|fetch/i.test(code+' '+m))return '연결을 완료하지 못했습니다. 인터넷을 확인하고 다시 시도합니다. 이미 고른 내용은 이 화면에 남아 있습니다.';if(/too-many-requests/.test(code))return '짧은 시간에 접속 요청이 많이 모였습니다. 잠시 뒤 다시 시도합니다.';return m.slice(0,220);}
