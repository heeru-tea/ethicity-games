'use strict';
// ==================== 문장과 설정을 읽는 곳 ====================
// 문장만 바꾸려면 위쪽 game-data JSON을 수정합니다. 진행 코드는 아래에 있습니다.
const STORY_TEMPLATE=JSON.parse(document.getElementById('game-data').textContent);
let STORY=STORY_TEMPLATE;
const BASE_CONFIG=JSON.parse(document.getElementById('game-config').textContent);
const originalDocument=document.documentElement.cloneNode(true);
const PLAYER_KEY='ethicity.player', RESULT_KEY='ethicity.result.privacy', FRIEND_KEY='ethicity.privacy.v4.friendName';
// localStorage 접근은 이 세 함수 안에서만 합니다. 저장이 차단돼도 게임은 계속합니다.
function readStore(key,fallback=null){try{const raw=localStorage.getItem(key);return raw===null?fallback:JSON.parse(raw);}catch{return fallback;}}
function writeStore(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
function removeStore(key){try{localStorage.removeItem(key);return true;}catch{return false;}}
const savedConfig=readStore('ethicity.privacy.v4.settings');
let CONFIG=structuredClone(BASE_CONFIG);
if(savedConfig&&validConfig(savedConfig))CONFIG=savedConfig;
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
function choiceText(c){return '당신은'+' '+c.text;}
function btn(text,action,cls='primary',extra=''){return `<button type="button" class="btn ${cls}" data-action="${action}" ${extra}>${text}</button>`;}
function canvasChar(type,size=64,mood='normal'){return `<canvas width="64" height="64" class="pixel" data-character="${type}" data-mood="${mood}" style="width:${size}px;height:${size}px" aria-hidden="true"></canvas>`;}
function validateAnswers(answers){const out={};if(!answers||typeof answers!=='object')return out;for(let i=0;i<STORY.rounds.length;i++){const a=answers[i],r=STORY.rounds[i];if(a&&Number.isInteger(a.choice)&&a.choice>=0&&a.choice<r.choices.length&&Number.isInteger(a.signals)&&a.signals>=1&&a.signals<(1<<r.signals.length))out[i]={choice:a.choice,signals:a.signals,...(typeof a.at==='number'?{at:a.at}:{})};}return out;}
// 점수는 엔딩을 고를 때만 사용합니다. 학생에게는 이야기의 변화로 보여 줍니다.
function protectionTotal(answers){return STORY.rounds.reduce((total,r,i)=>total+(r.choices[answers[i]?.choice]?.score||0),0);}
function endingOf(answers){if(Object.keys(validateAnswers(answers)).length!==STORY.rounds.length)return null;const total=protectionTotal(answers);return total>=STORY.endingThresholds.A?'A':total>=STORY.endingThresholds.B?'B':'C';}
function cloudConfigured(){const f=CONFIG.firebase;return f&&['apiKey','authDomain','databaseURL','projectId','appId'].every(k=>typeof f[k]==='string'&&f[k].length>0);}
const params=new URLSearchParams(location.search);
const requestedRoom=params.get('room');
let S={player:readStore(PLAYER_KEY),friendName:readStore(FRIEND_KEY,''),friendDraft:'',view:'home',mode:requestedRoom?'student':'solo',roomId:/^[a-f0-9]{32}$/.test(requestedRoom||'')?requestedRoom:null,round:0,answers:{},pending:{},signals:0,roundStage:'case',choosing:false,selected:null,nicknameDraft:'',characterDraft:null,feedback:false,storageWarning:false,network:false,networkKnown:false,room:null,control:null,uid:null,teacher:null,teacherAllowed:false,teacherRooms:[],teacherPanel:['choices','participants'].includes(params.get('panel'))?params.get('panel'):null,panelNotice:'',cloud:null,busy:false,error:'',resultSaved:null,cloudResult:'',ended:false,liveGeneration:0};
if(!validPlayer(S.player))S.player=null;
if(typeof S.friendName!=='string'||nicknameError(S.friendName))S.friendName='';
applyFriendName();
const main=document.getElementById('main'),topBarElement=document.getElementById('topright');
let unsubs=[],clockTick=null,toastTimeout=null;
function showToast(message){const el=document.getElementById('toast');el.textContent=message;el.classList.remove('hidden');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.classList.add('hidden'),4500);}
function setError(message){S.error=message;render();}
function draftKey(){return S.mode==='student'?'ethicity.privacy.v4.draft.'+S.roomId:'ethicity.privacy.v4.draft.solo';}
function saveDraft(){writeStore(draftKey(),{version:1,uid:S.uid,player:S.player,answers:S.answers,pending:S.pending,round:S.round});}
function clearLive(){S.liveGeneration++;unsubs.forEach(f=>{try{f();}catch{}});unsubs=[];}
function preparePlayerSetup(){S.characterDraft=S.player?CONFIG.characters.findIndex(c=>c.id===S.player.character):null;S.nicknameDraft=S.player?.nickname||'';S.friendDraft=S.friendName;S.view='setup';S.error='';}
function playerSetup(mode){resetNarration();S.mode=mode;preparePlayerSetup();render(true);}
function activeChoice(){return S.answers[S.round]?STORY.rounds[S.round].choices[S.answers[S.round].choice]:null;}
function studentCanReveal(){return S.mode==='solo'||S.control?.phase==='ended'||(S.control?.round===S.round&&S.control.phase==='reveal');}
function resetRoundUI(){S.roundStage='case';S.signals=S.answers[S.round]?.signals||0;S.choosing=!!S.answers[S.round];S.selected=S.answers[S.round]?.choice??null;S.feedback=!!S.answers[S.round]&&studentCanReveal();S.error='';}
function moveRound(i){S.round=i;S.view='round';resetRoundUI();render(true);}
function render(focus=false){
  const active=document.activeElement;const priorAction=active?.dataset?.action,priorIndex=active?.dataset?.index;
  topBarElement.innerHTML=`${S.mode!=='solo'&&S.cloud?`<span class="conn ${S.network?'':'off'}" id="connection-status">${S.network?'연결됨':'연결 확인 중'}</span>`:''}${S.player&&S.mode!=='teacher'?`<span class="pill">당신</span>`:''}${S.mode!=='teacher'?`<button type="button" class="textbtn typing-toggle" data-action="toggle-typing" aria-label="${typingEnabled?'타이핑 효과 끄기':'타이핑 효과 켜기'}">${typingEnabled?'타이핑 켜짐':'타이핑 꺼짐'}</button>`:''}<button type="button" class="textbtn" data-action="home">처음 화면</button>`;
  const screens={home:renderHome,setup:renderSetup,intro:renderIntro,round:renderRound,wait:renderWait,ending:renderEnding,teacher:renderTeacher,config:renderConfig,loading:renderLoading};
  main.innerHTML=(screens[S.view]||renderHome)();paintArt();mountNarration();
  if(focus){const heading=main.querySelector('[data-heading]');heading?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
  else if(priorAction){const candidates=Array.from(document.querySelectorAll('[data-action]'));candidates.find(e=>e.dataset.action===priorAction&&e.dataset.index===priorIndex&&!e.disabled)?.focus({preventScroll:true});}
}
function heading(text,level=1){return `<h${level} tabindex="-1" data-heading>${esc(text)}</h${level}>`;}
function renderHome(){return `<section class="landing"><div class="herocopy"><div class="eyebrow"><span class="tag">AI 윤리 탐험대</span><span class="chip">프라이버시 보호</span></div>${heading(STORY.title)}<p class="hero-desc">작은 선택으로 지키는 소중한 정보.<br>${esc(nameWithParticle(S.friendName||'친구','과','와'))} 함께 여덟 개의 발자국을 따라가며<br>AI를 현명하게 사용하는 방법을 배웁니다.</p><div class="buttons">${btn('탐험 시작하기 <span aria-hidden="true">→</span>','start-solo')}${btn('교사 컨트롤타워','teacher','')}</div><p class="small" style="margin-top:16px">실시간 수업은 선생님이 보내 준 입장 링크로 시작합니다.</p><div class="hero-metrics"><div><b>8가지 상황</b>생각하고 선택합니다</div><div><b>약 10분</b>나만의 속도로 배웁니다</div><div><b>4단계</b>처음부터 끝까지 지킵니다</div></div></div><div class="heroart"><canvas data-village role="img" aria-label="학교와 숲, 연못이 있는 도트 마을에서 탐험가와 안내봇이 만납니다."></canvas><div class="artlabel">오늘의 미션 · 정보의 길을 따라갑니다</div><div class="artcaption">${canvasChar('bot',56)}<div><strong>${esc(S.friendName||'친구')}의 정보를 함께 지킵니다!</strong><p>모든 인물과 자료는 게임 속 가상 내용입니다.</p></div></div></div></section><div class="stepsbar">${STORY.phases.map((p,i)=>`<div class="stepcard"><span class="num">0${i+1}</span><div><b>${p}</b><small>${['꼭 필요한 정보만 고릅니다','어디에, 얼마나 남습니까?','허락한 범위를 지킵니다','삭제 완료까지 확인합니다'][i]}</small></div></div>`).join('')}</div>`;}
function renderSetup(){return `<section class="panel setup"><span class="tag">프라이버시 보호 · 탐험 준비</span>${heading('친구의 정보 발자국')}<p class="muted">당신의 캐릭터와 가상 친구 이름을 정합니다. 이야기 속 친구는 당신의 닉네임을 부르며 도움을 요청합니다.</p>${S.player?'<p class="saved-player-note">저장된 설정을 불러왔습니다. 나와 가상 친구의 별명을 확인하고 출발합니다.</p>':''}<div class="setup-grid"><div class="characters">${CONFIG.characters.map((c,i)=>`<button type="button" class="character" data-action="character" data-index="${i}" aria-pressed="${S.characterDraft===i}">${canvasChar(c.type,180)}<strong>${esc(c.label)}</strong><small>${S.characterDraft===i?'✔ 선택했습니다':'이 캐릭터 선택하기'}</small></button>`).join('')}</div><form id="player-form"><label class="field"><span>탐험가의 닉네임</span><input id="nickname" class="nickname" name="nickname" type="text" maxlength="5" value="${esc(S.nicknameDraft)}" placeholder="예: 별고래" autocomplete="off" spellcheck="false" aria-describedby="nickname-help nickname-error"><small id="nickname-help" class="small">한글 1~5자 · 공백과 숫자는 쓸 수 없습니다.<br>실제 이름·학교·연락처는 적지 않습니다.</small></label><div id="nickname-error" class="error" role="status">${esc(S.error)}</div><label class="field friend-field"><span>이야기 속 가상 친구의 이름</span><input id="friend-name" class="nickname" name="friend-name" type="text" maxlength="5" value="${esc(S.friendDraft)}" placeholder="예: 구름" autocomplete="off" spellcheck="false" aria-describedby="friend-name-help friend-name-error"><small id="friend-name-help" class="small">한글 1~5자 · 친구에게 상상 속 이름을 지어 줍니다.<br>실제 친구 이름을 적지 않습니다.</small></label><div id="friend-name-error" class="error" role="status"></div><div class="notice">서로를 존중하는 별명을 사용합니다.<br>실시간 수업에 입장하면 닉네임과 선택 기록이 수업 서버에 저장되어 선생님 화면에 표시됩니다. 가상 친구 이름은 이 기기에만 저장합니다. 혼자 탐험할 때는 서버로 보내지 않습니다.</div><button type="submit" class="btn primary" style="margin-top:20px">이 탐험가로 출발합니다 →</button></form></div><div class="setup-bottom"><span class="small">8가지 사례 · 모든 정보는 가상입니다</span>${S.mode!=='student'?btn('교사 컨트롤타워','teacher',''):'<span class="chip">선생님이 보낸 수업 링크로 입장합니다</span>'}</div></section>`;}
function renderIntro(){const d=readStore('ethicity.privacy.v4.draft.solo');const canResume=S.mode==='solo'&&d?.version===1&&d.player?.nickname===S.player?.nickname&&d.player?.character===S.player?.character&&Object.keys(validateAnswers(d.answers)).length>0&&Object.keys(validateAnswers(d.answers)).length<8;return `<section class="panel intro"><div class="intro-scene">${scenePicture(STORY.rounds[0])}</div><div><div class="bothead">${canvasChar('bot',65)}<span class="tag">친구와 시작하는 정보 탐험</span></div>${heading('당신은'+' 탐험을 시작합니다',2)}<div class="dialogue">${dialogueHTML(STORY.introDialogue)}</div>${S.storageWarning?'<p class="notice">이 브라우저에서는 캐릭터나 별명 저장이 어렵습니다. 지금 탐험은 계속할 수 있습니다.</p>':''}<div class="buttons">${btn(S.mode==='student'?'수업에 입장합니다 →':'첫 발자국으로 →','begin')}${canResume?btn('이어서 탐험합니다','resume',''):''}</div><p class="small">사례 보기 → AI 화면 관찰 → 수상한 부분 찾기 → 보호 방법 선택 순서로 진행합니다.<br>키보드로는 Tab·Enter, 선택지는 숫자 1~4로 고를 수 있습니다.</p><button class="textbtn" data-action="change-player">캐릭터·친구 이름 바꾸기</button></div></section>`;}
function trail(){return `<nav class="trail" aria-label="이번 사례에서 살펴볼 개인정보 보호 단계">${STORY.phases.map((p,i)=>`<div class="trailstep ${STORY.rounds[S.round].phase===i?'current':''}"><span class="dot">${i+1}</span><b>${p}</b><span class="dots" aria-hidden="true">${STORY.rounds.filter(r=>r.phase===i).map(r=>S.answers[r.id]?'●':'○').join('')}</span></div>`).join('')}</nav>`;}

function countBits(n){return n.toString(2).replaceAll('0','').length;}
function choicesHTML(r){return `<span class="tag">다음 · 보호 방법 고르기</span><h2 style="font-size:25px">${esc('당신은')} 어떻게 하겠습니까?</h2><p class="action-note">방법 하나를 고른 뒤 ‘선택을 정합니다’를 누릅니다.</p><div class="choice-list">${r.choices.map((c,i)=>`<button type="button" class="choice" data-action="choice" data-index="${i}" aria-pressed="${S.selected===i}"><span class="letter">${i+1}</span><span>${esc(choiceText(c))}</span></button>`).join('')}</div><div class="buttons">${btn('선택을 정합니다','submit','primary',S.selected===null?'disabled':'')}<button class="textbtn" data-action="back-signals">위험 신호 다시 보기</button></div>`;}
function tagHTML(tags){return `<section class="tagrow learning-details" aria-label="이 선택으로 배우는 요소"><h3>이 선택으로 배우는 요소</h3><ul>${tags.map(t=>`<li><strong>${NUMS[t-1]} ${esc(STORY.elementLabels[t])}</strong><p>${esc(STORY.elements[t])}</p></li>`).join('')}</ul></section>`;}
function feedbackHTML(r,c){const l=LABELS[c.kind];const selectedSignals=r.signals.filter((s,i)=>S.answers[S.round].signals&(1<<i));const found=selectedSignals.filter(s=>s.risk).length;const safe=r.choices.find(x=>x.kind==='safe');return `${dialogueHTML([c.reply],'friend-reply')}<span class="tag">마지막 · 선택 뒤의 이야기</span><div class="feedback ${c.kind}"><strong>${l.icon} ${l.title}</strong><p>${esc(c.feedback)}</p></div><div class="change">${esc('당신은')} 선택 뒤의 변화를 살펴봅니다.<br>${esc(c.change)}</div><div class="feedback-note">${found?'✔ 수상한 부분을 '+found+'곳 찾아봤습니다.':'🔎 표시한 부분과 위험 신호를 다시 비교해 봅니다.'}<br>${esc(r.signals.filter(x=>x.risk).map(x=>x.note).join(' '))}</div>${tagHTML(c.tags)}<div class="buttons">${btn(S.mode==='solo'?(S.round===7?'배운 점 카드 보기 →':'다음 발자국으로 →'):S.control?.phase==='ended'?'남은 발자국 확인하기 →':S.round===7?'배운 점 카드 보기 →':'확인했습니다 · 다음을 기다립니다','next')}</div><details class="guide"><summary>다른 방법도 살펴봅니다</summary>${r.choices.map((v,i)=>`<p><b>${i+1}. ${esc(v.text)}</b><br>${LABELS[v.kind].icon} ${esc(v.feedback)}</p>${tagHTML(v.tags)}`).join('')}</details>`;}
function submittedHTML(){const a=S.answers[S.round];return `<div style="text-align:center;padding:18px 0">${canvasChar('bot',96)}<h2>선택을 정했습니다</h2><p>${esc(choiceText(STORY.rounds[S.round].choices[a.choice]))}</p><p class="notice">선생님이 결과를 공개하면<br>선택 뒤의 이야기를 함께 확인합니다.</p><p class="small">친구의 선택과 관계없이 나의 이야기가 이어집니다.</p></div>`;}
function saveStatusText(){if(S.mode==='solo')return '혼자 탐험 중 · 인터넷 없이도 진행할 수 있습니다.';if(S.mode==='teacher')return '';if(S.pending[S.round])return S.network?'⏳ 서버가 저장했는지 확인하고 있습니다.':'⏳ 연결을 기다립니다. 선택은 이 화면에 임시 보관됩니다.';if(S.answers[S.round])return '✔ 서버에서 저장을 확인했습니다.';return S.network?'수업에 연결됐습니다.':'연결을 확인하고 있습니다. 화면을 닫지 말고 잠시 기다립니다.';}
function renderWait(){const n=Object.keys(S.answers).length;return `<section class="panel wait">${canvasChar('bot',112)}<span class="tag" style="display:block;margin-top:15px">함께하는 교실 탐험</span>${heading(S.control?.phase==='lobby'?'친구들이 모이고 있습니다':'다음 발자국을 기다립니다')}<p>${esc('당신은')} 선생님의 안내를 기다립니다.</p><div class="progress-pips">${STORY.rounds.map((r,i)=>`<span class="${S.answers[i]?'done':''}" aria-label="${i+1}라운드 ${S.answers[i]?'응답함':'아직'}">${S.answers[i]?'✔':i+1}</span>`).join('')}</div><p class="small">${n} / 8개의 선택을 마쳤습니다.</p>${S.error?`<p class="notice error">${esc(S.error)}</p>`:''}<p class="statusline" id="save-status">${S.network?'✔ 수업에 연결됐습니다.':'연결을 다시 확인하고 있습니다. 화면을 닫지 말고 기다립니다.'}</p>${S.control&&S.control.round>=0&&S.answers[S.control.round]&&S.control.phase==='reveal'?btn('이번 결과 다시 보기','current-feedback',''):''}${!S.network?btn('연결 다시 확인하기','reconnect',''):''}${S.player?btn('혼자 이어서 탐험하기','solo-fallback',''):''}</section>`;}
function renderEnding(){const code=endingOf(S.answers);if(!code)return '<p>아직 살펴볼 발자국이 남아 있습니다.</p>';const e=STORY.endings[code];return `<section class="panel ending"><span class="tag">프라이버시 보호 · 탐험 완료</span><div class="ending-art">${canvasChar(characterType(S.player.character),104,'happy')}<div class="medal" aria-hidden="true">♧</div>${canvasChar('bot',92,'happy')}</div>${heading(e.title)}<p>${esc(say(e.text))}</p><div class="ending-conversation">${dialogueHTML([{speaker:'friend',text:e.friendReply}])}</div><div class="learning-card"><span class="tag">당신의 배운 점 한 줄 카드</span><blockquote>${esc(e.card)}</blockquote><span class="small">AI 윤리 탐험대 · 프라이버시 보호</span></div><p class="notice ${S.resultSaved?'good':''}">${S.resultSaved?'✔ 완료 기록을 이 브라우저에 저장했습니다.':'탐험은 완료했습니다. 이 브라우저에서는 기록 저장이 어렵습니다. 카드를 내려받아 간직합니다.'}${S.mode==='student'?`<br><span id="cloud-result">${esc(S.cloudResult||'수업 서버에 완료 기록을 보내고 있습니다.')}</span>`:''}</p><div class="buttons" style="justify-content:center">${btn('한 줄 카드 내려받기','download-card')}${btn('다시 탐험하기','restart','')}${S.mode==='student'?btn('수업 완료 저장 다시 확인','retry-result',''):''}</div><div class="recap">${STORY.rounds.map((r,i)=>{const c=r.choices[S.answers[i].choice];return `<div class="recap-item"><span>${i+1}번째 · ${STORY.phases[r.phase]}</span><b>${LABELS[c.kind].icon} ${LABELS[c.kind].title}</b><span>${esc(r.title)}</span></div>`;}).join('')}</div><div class="review-list"><h2 style="font-size:24px">나의 선택을 돌아봅니다</h2>${STORY.rounds.map((r,i)=>{const c=r.choices[S.answers[i].choice],safe=r.choices.find(x=>x.kind==='safe');return `<details><summary>${i+1}. ${esc(r.title)}</summary><p><b>나의 선택</b> · ${esc(choiceText(c))}<br>${esc(c.feedback)}</p><p><b>✔ 보호 방법</b> · ${esc(safe.text)}</p>${tagHTML(c.tags)}</details>`;}).join('')}</div><p class="small">어떤 엔딩이든 끝까지 살펴봤다면 탐험 완료입니다.<br>다른 편의 선택은 이 편의 이야기에 영향을 주지 않습니다.</p></section>`;}
function renderLoading(){return `<section class="panel loading"><span class="spinner" aria-hidden="true"></span>${heading('연결을 확인하고 있습니다',2)}<p>${esc(S.loadingText||'잠시만 기다려 주시기 바랍니다.')}</p><p class="small">인터넷 연결과 수업 설정을 확인합니다.</p>${S.error?`<p class="notice error">${esc(S.error)}</p>`:''}${btn('처음 화면으로','home','')}</section>`;}
function startSolo(resume=false){resetNarration();clearLive();S.mode='solo';S.pending={};S.error='';S.ended=false;S.cloudResult='';if(resume){const d=readStore('ethicity.privacy.v4.draft.solo');S.answers=validateAnswers(d?.answers);S.round=STORY.rounds.findIndex((r,i)=>!S.answers[i]);if(S.round<0)S.round=0;}else{S.answers={};S.round=0;}saveDraft();moveRound(S.round);}
async function finishGame(){const end=endingOf(S.answers);if(!end)return;const result={game:'privacy',completed:true,ending:end,card:STORY.endings[end].card};S.resultSaved=writeStore(RESULT_KEY,result);S.ended=true;S.view='ending';removeStore(draftKey());render(true);if(S.mode==='student')await saveCloudResult(result);}
async function submitChoice(){if(S.selected===null||!S.signals||S.answers[S.round])return;const i=S.round,a={choice:S.selected,signals:S.signals};S.answers[i]=a;if(S.mode==='student'){S.pending[i]=a;saveDraft();render();sendAnswer(i,a);}else{saveDraft();S.feedback=true;render(true);}}
function nextRound(){if(S.mode==='solo'){if(S.round===7)finishGame();else moveRound(S.round+1);return;}if(S.control?.phase==='ended'){const missing=STORY.rounds.findIndex((r,i)=>!S.answers[i]||S.pending[i]);if(missing<0)finishGame();else moveRound(missing);return;}if(S.round===7&&endingOf(S.answers)&&Object.keys(S.pending).length===0){finishGame();return;}S.view='wait';render(true);}
async function savePlayer(event){
  event.preventDefault();
  const input=document.getElementById('nickname'),friendInput=document.getElementById('friend-name');
  S.nicknameDraft=input.value.normalize('NFC');S.friendDraft=friendInput.value.normalize('NFC');
  const error=S.characterDraft===null?'함께할 캐릭터를 먼저 골라 주시기 바랍니다.':nicknameError(S.nicknameDraft);
  const friendError=nicknameError(S.friendDraft);
  document.getElementById('nickname-error').textContent=error;
  document.getElementById('friend-name-error').textContent=friendError;
  for(const [field,message]of [[input,error],[friendInput,friendError]]){if(message)field.setAttribute('aria-invalid','true');else field.removeAttribute('aria-invalid');}
  if(error||friendError){(error?input:friendInput).focus();return;}
  S.player={character:CONFIG.characters[S.characterDraft].id,nickname:S.nicknameDraft};
  S.friendName=S.friendDraft;applyFriendName();resetNarration();
  const playerSaved=writeStore(PLAYER_KEY,S.player),friendSaved=writeStore(FRIEND_KEY,S.friendName);
  S.storageWarning=!playerSaved||!friendSaved;S.view='intro';S.error='';render(true);
}
function modal(title,content,actions){const host=document.getElementById('modal-host');host.innerHTML=`<div class="modal"><section class="modalbox" role="dialog" aria-modal="true" aria-labelledby="modal-title"><h2 id="modal-title">${esc(title)}</h2>${content}<div class="buttons" style="margin-top:20px">${actions}</div></section></div>`;host.querySelector('button')?.focus();}
function closeModal(){document.getElementById('modal-host').innerHTML='';}
function confirmLeave(action){modal('처음 화면으로 돌아가겠습니까?','<p>이미 저장한 완료 기록은 유지됩니다. 진행 중인 선택은 이 기기에 임시 보관합니다.</p>',btn('돌아갑니다',action)+btn('계속 탐험합니다','close-modal',''));}
async function onAction(action,el){const i=Number(el?.dataset?.index);switch(action){
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
  case 'download-card':await downloadCard();break;
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
async function downloadCard(){await loadOriginalArt();if(document.fonts)await document.fonts.ready;const e=STORY.endings[endingOf(S.answers)];const c=document.createElement('canvas');c.width=1200;c.height=630;const x=c.getContext('2d');x.fillStyle='#fffdf2';x.fillRect(0,0,1200,630);x.fillStyle='#145d4f';x.fillRect(0,0,1200,90);x.fillStyle='white';x.font='bold 30px "NanumSquareRound","Malgun Gothic",sans-serif';x.fillText('AI 윤리 탐험대  ·  프라이버시 보호',55,58);x.fillStyle='#163b43';x.font='bold 48px "NanumSquareRound","Malgun Gothic",sans-serif';x.fillText('당신의 배운 점 한 줄 카드',55,180);x.font='bold 40px "NanumSquareRound","Malgun Gothic",sans-serif';const words=e.card.split(' ');let line='',y=300;for(const w of words){const next=line?line+' '+w:w;if(x.measureText(next).width>1020){x.fillText(line,55,y);y+=65;line=w;}else line=next;}x.fillText(line,55,y);const s=document.createElement('canvas');drawCharacter(s,characterType(S.player.character),'happy');x.imageSmoothingEnabled=false;x.drawImage(s,895,385,170,170);x.font='26px "NanumSquareRound","Malgun Gothic",sans-serif';x.fillText('✔ 여덟 가지 정보 보호 탐험을 마쳤습니다.',55,545);c.toBlob(blob=>{if(blob)downloadBlob(blob,'image/png','프라이버시-배운점-카드.png');});}
function exportGame(){const doc=originalDocument.cloneNode(true);doc.querySelector('#game-config').textContent=JSON.stringify(CONFIG,null,2).replaceAll('<','\\u003c');downloadBlob('<!DOCTYPE html>\n'+doc.outerHTML,'text/html;charset=utf-8','privacy.html');showToast('설정이 포함된 HTML 파일을 내려받았습니다. 학생에게는 이 파일을 배포한 주소를 공유합니다.');}
function friendlyError(e){const code=e?.code||'',m=String(e?.message||e);if(/permission|PERMISSION_DENIED/i.test(code+' '+m))return '접근 권한이 없거나 수업의 응답 시간이 끝났습니다. 선생님에게 수업 상태와 저장소 규칙을 확인해 달라고 합니다.';if(code==='auth/unauthorized-domain')return '이 웹 주소가 로그인 허용 목록에 없습니다. Firebase Authentication의 승인된 도메인에 현재 주소를 추가합니다.';if(/popup-blocked/.test(code))return '로그인 팝업이 차단됐습니다. 이 사이트의 팝업을 허용한 뒤 다시 누릅니다.';if(/popup-closed|cancelled-popup/.test(code))return '로그인 창이 닫혔습니다. 다시 로그인할 수 있습니다.';if(/operation-not-allowed/.test(code))return 'Firebase에서 필요한 로그인 방식이 켜져 있지 않습니다. 익명 로그인을 켰는지 확인합니다.';if(/network|timeout|fetch/i.test(code+' '+m))return '연결을 완료하지 못했습니다. 인터넷을 확인하고 다시 시도합니다. 이미 고른 내용은 이 화면에 남아 있습니다.';if(/too-many-requests/.test(code))return '짧은 시간에 접속 요청이 많이 모였습니다. 잠시 뒤 다시 시도합니다.';return m.slice(0,220);}
