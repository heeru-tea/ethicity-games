(function(){'use strict';
const M=window.EthicityDataModel,COMMON='../../shared/ethicity-elementary-common-v1',main=document.getElementById('main'),status=document.getElementById('live-status');
let assets,state=M.initial(),queue=[],afterQueue=null,actionHandlers=[],mode='loading',busy=false,effectFrame=0,reported=0,reflection='',customPledge='',customPledgeIndex=null,restoreFocus=null;
const motionQuery=matchMedia('(prefers-reduced-motion: reduce)');let reducedMotion=motionQuery.matches;
let typing=null,typingTimer=0,instantText=false,sceneArt=null,sceneSpeaker=null;
let musicStarted=false,musicAttempt=0;
const scenePictures={};
let choiceView={key:'',page:0},resultStep=0,resultPage=0,stagePages=[],stagePage=0;
const sceneFrames={
 welcome:{background:'cafeteria',cast:['robot','teacher'],caption:'다음 주 급식, 함께 정해요'},
 meet:{background:'cafeteria',cast:['robot','teacher'],caption:'냠냠봇은 어떤 자료로 학습할까요?'},
 question:{background:'cafeteria',cast:['robot'],caption:'냠냠봇이 만든 첫 디지털 설문',paper:'question'},
 collect:{background:'courtyard',cast:['robot'],caption:'학교 곳곳에서 의견을 수집해요'},
 box:{background:'cafeteria',cast:['robot'],digital:'collection',caption:'온라인 설문함에 모인 응답'},
 jiho:{background:'classroom',cast:['jiho','robot'],caption:'교실 친구의 이야기를 들어요'},
 saebom:{background:'classroom',cast:['saebom','robot'],caption:'친구가 전하는 1학년 동생의 이야기'},
 haneul:{background:'library',cast:['haneul','robot'],caption:'도서관 친구의 이야기를 들어요'},
 sort:{background:'classroom',cast:['robot'],digital:'sorting',caption:'디지털 응답을 하나씩 확인해요'},
 menu:{background:'cafeteria',cast:['robot'],caption:'아직 먹기 전! 함께 살펴볼 급식표'},
 repair:{background:'classroom',cast:['teacher','robot'],caption:'함께 먹을 수 있는 방법을 찾아요'},
 revised:{background:'cafeteria',cast:['daon','haneul','saebom'],caption:'친구들의 이야기를 듣고 바뀐 급식'},
 privacy:{background:'classroom',cast:['onyu','teacher'],caption:'친구가 디지털 설문을 궁금해해요'},
 protect:{background:'classroom',cast:['teacher'],digital:'protected',caption:'접근을 제한하고 안전하게 보관해요'}
};
const $=id=>document.getElementById(id);
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function emit(type,extra={}){const detail={type:'ethicity:'+type,gameId:'data',...extra};window.dispatchEvent(new CustomEvent(detail.type,{detail}));if(window.parent!==window)window.parent.postMessage(detail,'*');}
function announce(text){status.textContent='';requestAnimationFrame(()=>{status.textContent=text;});}
function icon(id,size=32){return `<canvas class="ee-icon" width="64" height="64" data-icon="${id}" style="width:${size}px;height:${size}px" aria-hidden="true"></canvas>`;}
function paintIcons(root=document){if(!assets)return;root.querySelectorAll('canvas[data-icon]').forEach(c=>assets.drawIcon(c.getContext('2d'),c.dataset.icon,0,0,64));}
function portrait(id,expression='neutral',size=''){const c=ETHICITY_COMMON_MANIFEST.characters[id],index=Math.max(0,c.expressions.indexOf(expression));return `<span class="portrait ${size}" style="--portrait-index:${index}" aria-hidden="true"><img src="${COMMON}/${c.portraits}" alt="" draggable="false"></span>`;}
function setMain(html){choiceView={key:'',page:0};finishTyping(false);cancelAnimationFrame(effectFrame);document.getElementById('feedback-effect').hidden=true;main.innerHTML=html;paintIcons(main);main.focus({preventScroll:true});window.scrollTo(0,0);fitStage();}
function sound(id='tap'){if(assets)void assets.playSound(id);}
async function updateMusic(){
 const audio=$('background-music'),attempt=++musicAttempt;
 if(!musicStarted||!$('bgm-setting').checked||document.hidden){audio.pause();return;}
 try{await audio.play();}catch{
  if(attempt!==musicAttempt)return;
  $('bgm-setting').checked=false;
  announce('배경음악을 재생하지 못했어요. 설정에서 다시 켤 수 있어요.');
 }
}
function effect(id){cancelAnimationFrame(effectFrame);const canvas=$('feedback-effect'),ctx=canvas.getContext('2d');canvas.hidden=false;const anchor=document.getElementById('chat-place')?.getBoundingClientRect();canvas.style.left=Math.min(innerWidth-72,(anchor?.right||innerWidth-100)+8)+'px';canvas.style.top=Math.max(8,(anchor?.top||100)-16)+'px';const start=performance.now();function draw(now){ctx.clearRect(0,0,128,128);if(assets.drawEffect(ctx,id,64,64,now-start,96,reducedMotion))effectFrame=requestAnimationFrame(draw);else canvas.hidden=true;}draw(start);sound(id==='correct'?'win':'retry');}
function reset(){musicStarted=false;void updateMusic();$('background-music').currentTime=0;state=M.initial();queue=[];afterQueue=null;actionHandlers=[];reflection='';customPledge='';customPledgeIndex=null;reported=0;cancelAnimationFrame(effectFrame);$('feedback-effect').hidden=true;window.EthicityReport.clear();showStart();}
function showStart(){
 mode='start';setMain(`<section class="ee-panel start-page" aria-labelledby="game-title"><p class="eyebrow">윤리시티 · 데이터 관리</p><h1 id="game-title">급식 메뉴 AI ‘냠냠봇’</h1><div class="start-scene"><img src="${COMMON}/backgrounds/cafeteria.png" alt="학교 급식실"><div>${portrait('robot','happy','medium')}</div></div><p class="start-question">모두가 함께 먹는 급식,<br>어떤 데이터를 수집해야 할까요?</p><button class="ee-button" id="start-game">탐험 시작 ${icon('arrow_right',24)}</button><p class="muted">초등 3~4학년 · 약 8~10분<br>이름을 입력하지 않아요. 마지막에 내 리포트를 저장할 수 있어요.</p></section>`);
 $('start-game').onclick=()=>{musicStarted=true;void updateMusic();sound();chooseExplorer();};
}

function wordStrip(){return `<div class="word-strip" aria-label="모은 낱말 카드 ${state.words.length}장, 전체 5장">${M.words.map((w,i)=>`<div class="word-card ee-badge ${state.words.includes(w)?'earned':''}" aria-label="${esc(w)} ${state.words.includes(w)?'모았어요':'아직 모으지 않았어요'}"><span class="word-check" aria-hidden="true">${state.words.includes(w)?'✓':'·'}</span><span>${i===3?'한쪽으로<br>치우친 데이터':w}</span></div>`).join('')}</div>`;}
function shell(scene,introMode=false){
 mode=introMode?'intro':'game';
 const info=introMode?{title:'냠냠봇의 부탁',goal:'모두가 함께 먹으려면 어떤 자료가 필요할까요?',place:'학교 급식실'}:M.scenes[scene];
 setMain((introMode?'':wordStrip())+`<div class="game-layout ${introMode?'intro-layout':''}">
 <section class="scene-sidebar" aria-label="현재 장면"><div class="stage-heading"><div><span class="scene-tag">${introMode?'탐험 준비':'이야기 '+(scene+1)+' / 6'}</span><h1 class="scene-title">${info.title}</h1></div><span class="ee-badge">${state.explorer}버전 탐험가</span></div>
 <figure class="scene-art"><div class="scene-view"><img id="scene-image" class="scene-image" alt=""><canvas id="scene-cast" width="1280" height="720" aria-hidden="true"></canvas><div id="scene-material" tabindex="0" aria-label="장면의 현재 자료"></div><div id="scene-response" class="scene-response ee-badge" hidden></div></div><figcaption><span id="scene-caption"></span><nav id="material-nav" class="material-nav" aria-label="자료 페이지" hidden></nav></figcaption></figure><div id="scene-speaker" hidden></div></section>
 <section class="messenger ee-panel" aria-label="현재 대화"><div class="chat-header"><strong id="chat-place">${info.place}</strong><small id="chat-count">${introMode?'함께 시작해요':'의견을 들은 곳 '+state.visited.length+' / 4'}</small></div><div class="conversation-log" id="conversation-log" tabindex="0" aria-label="현재 말풍선"></div><div class="action-area" id="action-area"></div></section></div>`);
 sceneSpeaker=null;setSceneArt(introMode?'welcome':['meet','collect','sort','menu','repair','privacy'][scene]);
 system(info.goal);
 $('conversation-log').addEventListener('click',e=>{if(e.target.closest('button,a,input,textarea,select'))return;const selection=window.getSelection();if(selection&&!selection.isCollapsed)return;$('next-line')?.click();});
}
function chooseExplorer(){
 mode='explorer';setMain(`<section class="ee-panel rules-card"><p class="eyebrow">내 탐험 모습</p><h1>탐험가를 골라요</h1><p>이름을 정하지 않고 시작해요. 어떤 모습을 골라도 같은 이야기를 탐험해요.</p><div class="explorer-grid">${['A','B'].map((id,i)=>`<button class="ee-choice explorer-choice" data-explorer="${id}">${portrait(i?'haneul':'jiho','happy','medium')}<strong>${id}버전 탐험가</strong></button>`).join('')}</div></section>`);
 main.querySelectorAll('[data-explorer]').forEach(b=>b.onclick=()=>{state.explorer=b.dataset.explorer;intro();});
}
function react(text){const el=$('scene-response');if(el){el.hidden=false;el.textContent=text;el.dataset.kind='reaction';}announce(text);}
function record(choice,outcome){M.record(state,choice,outcome);react(outcome);}

function setSceneArt(key,{caption,material}={}){
 if(!$('scene-image'))return;
 finishTyping(false);$('conversation-log').replaceChildren();$('scene-response').hidden=true;
 stagePages=[];stagePage=0;$('material-nav').hidden=true;sceneArt={key,...sceneFrames[key]};
 const image=$('scene-image');
 image.src=sceneArt.picture?scenePictures[sceneArt.picture]:COMMON+'/backgrounds/'+sceneArt.background+'.png';
 image.alt=caption||sceneArt.caption;
 image.dataset.scene=key;
 $('scene-caption').textContent=caption||sceneArt.caption;
 $('scene-material').innerHTML=material||(sceneArt.digital?digitalPanel(sceneArt.digital):'')||(sceneArt.paper?'<div class="scene-paper ee-panel"><strong>냠냠봇 디지털 설문</strong><p>좋아하는 급식 메뉴는?</p><span class="paper-line"></span></div>':'');
 paintIcons($('scene-material'));paintSceneCast();fitStage();
}
function digitalPanel(kind){
 const protectedFile=kind==='protected';
 return '<div class="digital-panel ee-panel"><div class="digital-toolbar">'+icon(protectedFile?'lock':'notebook',20)+'<strong>'+(protectedFile?'응답 파일':kind==='sorting'?'응답 확인':'온라인 설문함')+'</strong></div><div class="digital-rows">'+(protectedFile?'<p>접근 권한 · 선생님</p><p>비밀번호 설정</p><p>다 쓴 뒤 안전하게 삭제</p>':kind==='sorting'?'<p>반복 제출 <b>30개</b></p><p>본인 확인 <b>1개</b></p><p>맞춤법 확인 <b>1개</b></p>':'<p>6학년 응답 <b>12개</b></p><p>돈가스 · 라면</p><p>매운 떡볶이</p><p>땅콩 소스 치킨</p>')+'</div><span class="ee-badge">'+(protectedFile?'공유 제한':'가상의 디지털 자료')+'</span></div>';
}
function paintSceneCast(){
 const canvas=$('scene-cast');if(!canvas||!sceneArt)return;
 const ctx=canvas.getContext('2d');ctx.clearRect(0,0,1280,720);
 if(sceneArt.picture)return;
 let cast=(sceneArt.cast||[]).slice();
 if(sceneSpeaker&&sceneSpeaker!=='me'&&!cast.includes(sceneSpeaker))cast=[...cast.slice(0,2),sceneSpeaker];
 if(['question','menu','revised'].includes(sceneArt.key))cast=[sceneSpeaker&&sceneSpeaker!=='me'?sceneSpeaker:'robot'];
 cast.forEach((id,i)=>{
  ctx.globalAlpha=!sceneSpeaker||id===sceneSpeaker?1:.78;
  const x=cast.length===1?250:220+i*(840/Math.max(1,cast.length-1));
  assets.drawCharacter(ctx,id,x,670,'down',1,id===sceneSpeaker?2.5:2.1);
 });
 ctx.globalAlpha=1;
}
function setSceneSpeaker(id,expression){
 if(!$('scene-speaker'))return;
 sceneSpeaker=id;
 $('scene-speaker').innerHTML=(id==='me'?'':portrait(id,expression))+'<div><small>지금 이야기하는 사람</small><strong>'+(id==='me'?'나':M.people[id])+'</strong></div>';
 $('scene-speaker').dataset.speaker=id;paintSceneCast();
 if(sceneArt.key==='menu'&&id==='teacher')$('scene-caption').textContent='먹기 전에 멈추고, 메뉴를 안전하게 바꿔요';
}
function pinAfterLayout(){const log=document.getElementById('conversation-log');const near=log&&log.scrollHeight-log.scrollTop-log.clientHeight<80;if(near)requestAnimationFrame(()=>scrollLog(true));}
function scrollLog(force=false){const log=$('conversation-log');if(log&&force)log.scrollTop=log.scrollHeight;}
function append(html,label=''){
 const log=$('conversation-log');if(!log)return;
 const template=document.createElement('template');template.innerHTML=html;const node=template.content.firstElementChild;
 if(node.matches('.material-card')){$('scene-material').replaceChildren(node);paintIcons($('scene-material'));}
 else {log.replaceChildren(node);paintIcons(log);scrollLog(true);fitStage();}
 if(label)announce(label);
}

function say(id,text,expression='neutral',frame){
 finishTyping(false);if(frame)setSceneArt(frame);setSceneSpeaker(id,expression);
 const name=id==='me'?'나':M.people[id],label=`${name}. ${text}`;
 // Only the current bubble types; advancing replaces it completely.
 append(`<div class="message ${id==='me'?'player':''}">${id==='me'?'':portrait(id,expression)}<div class="message-content"><p class="speaker-label">${name}</p><p class="message-bubble">${esc(text)}</p></div></div>`,id==='me'||reducedMotion||instantText?label:'');
 if(id==='me'||reducedMotion||instantText)return;
 const bubble=$('conversation-log').lastElementChild.querySelector('.message-bubble');
 typing={bubble,text,label,characters:Array.from(text),index:0};bubble.textContent='';bubble.classList.add('is-typing');bubble.setAttribute('aria-busy','true');typeCharacter();
}
function updateNextLabel(){const button=$('next-line');if(button)button.querySelector('.next-label').textContent=typing?'문장 끝까지 보기':button.dataset.label;}
function finishTyping(read=true){
 if(!typing)return false;
 clearTimeout(typingTimer);typingTimer=0;
 const current=typing;typing=null;
 const log=$('conversation-log'),near=log&&log.scrollHeight-log.scrollTop-log.clientHeight<70;
 current.bubble.textContent=current.text;current.bubble.classList.remove('is-typing');current.bubble.removeAttribute('aria-busy');
 if(near)scrollLog(true);updateNextLabel();fitStage();if(read)announce(current.label);return true;
}
function typeCharacter(){
 if(!typing)return;
 const current=typing,log=$('conversation-log'),near=log&&log.scrollHeight-log.scrollTop-log.clientHeight<70;
 current.bubble.textContent=current.characters.slice(0,++current.index).join('');
 if(near)scrollLog(true);
 if(current.index===current.characters.length){finishTyping();return;}
 typingTimer=setTimeout(typeCharacter,/[.!?…。]/.test(current.characters[current.index-1])?140:30);
}
function system(text){append(`<p class="system-message">${esc(text)}</p>`,text);}
function run(lines,done){finishTyping(false);queue=lines.flatMap(line=>splitCopy(line[1],72).map((text,i)=>[line[0],text,line[2],i===0?line[3]:undefined]));afterQueue=done;nextLine();}
function nextLine(){if(busy)return;if(finishTyping())return;if(queue.length){const line=queue.shift();say(...line);showNext();}else if(afterQueue){const fn=afterQueue;afterQueue=null;fn();}}
function showNext(label='다음',fn=nextLine){pinAfterLayout();$('action-area').classList.remove('method-actions');actionHandlers=[];const area=$('action-area');area.innerHTML=`<div class="next-row"><span class="muted">대화창 탭 또는 Space<br>한 번 더 누르면 다음 대사</span><button class="ee-button" id="next-line" data-label="${esc(label)}"><span class="next-label">${label}</span> ${icon('arrow_right',20)}</button></div>`;paintIcons(area);updateNextLabel();fitStage();$('next-line').onclick=()=>{sound();if(!finishTyping())fn();};$('next-line').focus({preventScroll:true});}
function choices(prompt,items,{multiple=false,selected=[],focus=true,pageKey=prompt}={}){
 pinAfterLayout();$('action-area').classList.remove('method-actions');
 if(choiceView.key!==pageKey)choiceView={key:pageKey,page:0};
 const pageSize=items.length>4?2:4,pages=Math.ceil(items.length/pageSize);choiceView.page=Math.min(choiceView.page,Math.max(0,pages-1));
 const start=choiceView.page*pageSize,visible=items.slice(start,start+pageSize),area=$('action-area');actionHandlers=[];
 if($('scene-response'))$('scene-response').dataset.kind='preview';
 area.innerHTML=`<p class="action-prompt">${esc(prompt)}</p><div class="choices">${visible.map((x,i)=>`<button class="ee-choice choice-control" data-choice="${start+i}" ${x.disabled?'disabled':''} ${multiple?`aria-pressed="${selected.includes(x.id)}"`:''}><span class="key-hint" aria-hidden="true">${i+1}</span><span>${multiple?`<span class="check-marker" aria-hidden="true">${selected.includes(x.id)?'✓ ':'□ '}</span>`:''}${esc(x.text)}${x.detail?`<small>${esc(x.detail)}</small>`:''}</span></button>`).join('')}</div>${pages>1?`<nav class="choice-pager" aria-label="선택지 페이지"><button class="ee-button secondary" id="choice-prev" ${choiceView.page===0?'disabled':''}>앞 선택지</button><span>${choiceView.page+1} / ${pages}</span><button class="ee-button secondary" id="choice-next" ${choiceView.page===pages-1?'disabled':''}>다음 선택지</button></nav>`:''}`;
 area.querySelectorAll('[data-choice]').forEach((b,i)=>{const item=visible[i],handler=()=>{if(b.disabled||busy)return;sound();if(!multiple){actionHandlers=[];say('me',item.text);}item.onSelect();};b.onclick=handler;b.onfocus=()=>previewChoice(item.text);b.onpointerenter=()=>previewChoice(item.text);actionHandlers[i]=handler;});
 const flip=delta=>{choiceView.page+=delta;choices(prompt,items,{multiple,selected,focus:true,pageKey});if(pageKey==='methods')methodFooter();};
 if(pages>1){$('choice-prev').onclick=()=>flip(-1);$('choice-next').onclick=()=>flip(1);}
 if(focus)area.querySelector('button:not(:disabled)')?.focus({preventScroll:true});fitStage();
}

function previewChoice(text){const el=$('scene-response');if(el&&el.dataset.kind!=='reaction'){el.hidden=false;el.textContent='살펴보는 선택 · '+text;}}
function earn(word,scene,next){if(word&&!state.words.includes(word)){state.words.push(word);system(`낱말 카드 ‘${word}’를 모았어요.`);const strip=main.querySelector('.word-strip');if(strip)strip.outerHTML=wordStrip();sound('collect');}const current=scene+1;if(current>reported){reported=current;emit('progress',{current,total:6});}showNext(scene===5?'학습한 내용 정리하기':'다음 이야기',next);}
const T=M.T,L=M.L;
function intro(){shell(-1,true);run(['IN-01','IN-02','IN-02A','IN-03','IN-04'].map(id=>L(id)),()=>showNext(T('IN-B1'),rules));}
function rules(step=0){
 mode='rules';const ruleCards=[['대화를 읽고 이어 가요','말풍선은 하나씩 나타나요. 다음 버튼이나 Space로 이어 가요. 글자가 나오는 중에 누르면 문장이 먼저 완성돼요.','notebook'],['선택하고 변화를 살펴봐요','선택에 따라 냠냠봇의 급식이 달라져요. 정답이 없는 선택도 있어요. 자료와 메뉴는 한 장씩 확인해요.','inspect'],['낱말 카드와 내 리포트를 완성해요','낱말 카드 5장을 수집해요. 마지막에 학습한 점과 약속을 고르고, 내 선택이 담긴 리포트를 저장해요.','clue']];
 const r=ruleCards[step];setMain(`<section class="ee-panel step-page"><p class="eyebrow">탐험 방법 ${step+1} / 3</p><div class="step-icon">${icon(r[2],64)}</div><h1>${r[0]}</h1><p class="step-copy">${r[1]}</p><p class="ee-notice">설문은 이야기 속 가상의 자료예요.<br>실제 이름이나 건강 정보는 쓰지 않아요.</p><div class="step-footer"><button class="ee-button secondary" id="rule-back" ${step===0?'disabled':''}>이전</button><button class="ee-button" id="rule-next">${step===2?'냠냠봇 만나러 가기':'다음 안내'}</button></div><p class="muted">Tab 이동 · Enter/Space 선택 · 숫자 1~4 선택</p></section>`);
 $('rule-back').onclick=()=>rules(step-1);$('rule-next').onclick=()=>step===2?startScene(0):rules(step+1);$('rule-next').focus({preventScroll:true});
}

function startScene(n){state.scene=n;shell(n);[sceneZero,sceneOne,sceneTwo,sceneThree,sceneFour,sceneFive][n]();}
function sceneZero(){run([L('S0-01')],quiz);}
function quiz(){choices(T('S0-Q1'),[1,2,3].map(i=>({text:T('S0-C'+i),onSelect:()=>{
 if(i===1){effect('correct');record(T('S0-C1'),'친구들의 의견으로 좋아하는 메뉴를 알아볼 수 있어요.');quizEnd();}
 else {effect('retry');const outcome=i===2?'날씨만 보고 냠냠봇이 따뜻한 국만 골랐어요. 친구들의 취향은 알 수 없었어요.':'의자 수만 보고 냠냠봇이 급식 수량만 계산했어요. 좋아하는 메뉴는 고르지 못했어요.';material({title:i===2?'날씨만 학습한 결과':'의자 수만 학습한 결과',count:i===2?'따뜻한 국':'급식 24개',text:outcome});record(T('S0-C'+i),outcome);run([['robot',outcome,'worried'],['teacher','어떤 자료를 쓰는지에 따라 결과가 달라져요. 이제 메뉴를 정할 자료를 수집해 볼까요?','explaining']],()=>choices('다음에는 어떻게 해 볼까요?',[{text:'친구들의 의견으로 다시 시작하기',onSelect:()=>{record('친구들의 의견으로 다시 시작하기','급식 메뉴를 정하는 데 맞는 자료로 바꾸기로 했어요.');quizEnd();}},{text:'다른 자료의 결과도 살펴보기',onSelect:quiz}]));}
 }})));}
function quizEnd(){run([L('S0-04'),L('S0-05','question'),L('S0-06')],()=>earn('데이터',0,()=>startScene(1)));}

function retryQuiz(){quiz();}

function sceneOne(){run([L('S1-01')],sourceChoices);}
function updateCollection(){if($('chat-count'))$('chat-count').textContent='의견을 들은 곳 '+state.visited.length+' / 4';}
function sourceChoices(){setSceneArt('collect');$('chat-place').textContent='학교 곳곳';say('robot','아직 의견을 듣지 않은 곳을 골라 보자. 지금까지 '+state.visited.length+'곳에서 응답 '+M.count(state)+'개를 수집했어.');choices(T('S1-Q1'),M.sources.map(x=>({text:(state.visited.includes(x.id)?'✓ ':'')+x.label,detail:state.visited.includes(x.id)?'응답 '+x.count+'개 확인':x.detail,disabled:state.visited.includes(x.id),onSelect:()=>visit(x)})));}
function visit(source){setSceneArt(source.id);$('chat-place').textContent=source.label;run(source.lines,()=>{M.visit(state,source.id);record(source.label+'에서 수집하기','응답 '+source.count+'개를 추가했어요. 총 '+M.count(state)+'개, '+state.visited.length+'곳의 의견이에요.');updateCollection();system(source.label+' · 응답 '+source.count+'개 확인. 지금까지 '+M.count(state)+'개!');if(state.visited.length===4)run([L('S1-04')],()=>earn('수집',1,()=>startScene(2)));else if(M.count(state)>=14)run([L('S1-02')],()=>choices(T('S1-Q2'),[{text:T('S1-C5'),onSelect:()=>{record(T('S1-C5'),'응답 '+M.count(state)+'개로 수집을 멈췄어요. 아직 '+(4-state.visited.length)+'곳의 의견이 빠져 있어요.');run([L('S1-03')],()=>earn('수집',1,()=>startScene(2)));}},{text:T('S1-C6'),onSelect:()=>{record(T('S1-C6'),'아직 만나지 않은 친구들의 응답을 더 수집하기로 했어요.');sourceChoices();}}]));else sourceChoices();});}
function sceneTwo(){run([L('S2-01')],()=>sortCard(0));}
function material(card){
 const chunks=splitCopy(card.text,75);stagePages=chunks.map(text=>({html:'<article class="material-card ee-panel"><h3>'+esc(card.title)+'</h3><p class="material-count">'+esc(card.count)+'</p><p style="white-space:pre-line">'+esc(text)+'</p></article>'}));stagePage=0;renderMaterial();announce(card.title+'. '+card.text);
}
function splitCopy(text,limit){const chars=Array.from(text),parts=[];while(chars.length){let n=Math.min(limit,chars.length);if(n<chars.length){const fragment=chars.slice(0,n).join(''),breakAt=Math.max(fragment.lastIndexOf('. '),fragment.lastIndexOf('。'),fragment.lastIndexOf('\n'));if(breakAt>limit/2)n=breakAt+1;}parts.push(chars.splice(0,n).join('').trim());}return parts.length?parts:[''];}
function renderMaterial(){
 $('scene-material').innerHTML=stagePages[stagePage].html;paintIcons($('scene-material'));
 const nav=$('material-nav');nav.hidden=stagePages.length<2;nav.innerHTML=stagePages.length<2?'':`<button class="ee-button secondary" id="material-prev" ${stagePage===0?'disabled':''}>이전 자료</button><span>${stagePage+1} / ${stagePages.length}</span><button class="ee-button secondary" id="material-next" ${stagePage===stagePages.length-1?'disabled':''}>다음 자료</button>`;
 if(stagePages.length>1){$('material-prev').onclick=()=>{stagePage--;renderMaterial();$(stagePage===0?'material-next':'material-prev').focus({preventScroll:true});};$('material-next').onclick=()=>{stagePage++;renderMaterial();$(stagePage===stagePages.length-1?'material-prev':'material-next').focus({preventScroll:true});};}fitStage();
}
function fitStage(){requestAnimationFrame(()=>{
 const art=main.querySelector('.scene-art'),view=main.querySelector('.scene-view');if(!art||!view)return;
 const fit=()=>{const available=view.getBoundingClientRect().height+innerHeight-(main.getBoundingClientRect().bottom+window.scrollY)-8;const width=Math.min(main.clientWidth-24,960,Math.max(130,available)*16/9);art.style.width=Math.floor(width)+'px';};
 fit();requestAnimationFrame(fit);
 });}
function sortCard(index,repeat=false,done=null){
const card=M.sorting[index];setSceneArt('sort',{caption:card.title+' · '+card.count});
material(card);
const prompt=()=>choices(T('S2-Q1'),[{text:T('S2-C1'),onSelect:()=>sortAnswer(index,'keep',done)},{text:T('S2-C2'),onSelect:()=>sortAnswer(index,'remove',done)}]);
if(index===1&&!repeat)run([L('S2-K2A')],prompt);else prompt();
}
function sortAnswer(index,value,done){
 const card=M.sorting[index],correct=value===card.correct;state.sort[card.id]=value;effect(correct?'correct':'retry');
 const outcomes={duplicates:value==='keep'?'같은 사람의 응답 30개가 남아, 짜장면이 메뉴에서 반복돼요.':'반복 응답 30개를 빼서 다른 친구들의 의견이 드러나요.',impersonation:value==='keep'?'가짜 응답이 남아, 땅콩 버터 피자가 메뉴 후보에 들어가요.':'친구를 사칭한 응답을 빼서 가짜 메뉴 후보를 없앴어요.',genuine:value==='keep'?'맞춤법이 틀려도 친구의 진짜 의견을 지켰어요.':'진짜 떡볶이 의견이 빠졌어요. 친구의 뜻을 놓쳤어요.'};
 material({title:card.title,count:value==='keep'?'응답에 포함':'응답에서 제외',text:outcomes[card.id]});record(card.title+' → '+(value==='keep'?'넣기':'빼기'),outcomes[card.id]);
 run([['robot',outcomes[card.id],correct?'happy':'worried'],['teacher',card.why,'explaining']],()=>showNext(done?'바뀐 급식안 확인하기':'이 선택으로 이어가기',()=>done?done():afterSort(index)));
}

function afterSort(index){if(index<2)sortCard(index+1);else protectionOptions(false,()=>earn('정리',2,()=>startScene(3)));}
function protectionOptions(repair,done){
setSceneArt('box');run(repair?[]:[L('S2-02')],()=>choices(T('S2-Q3'),(repair?['one','locked']:['open','one','locked']).map(value=>{
const ids={open:['S2-C5','S2-R4'],one:['S2-C6','S2-R5'],locked:['S2-C7','S2-R6']}[value];
return {text:T(ids[0]),onSelect:()=>run([L(ids[1])],()=>{if(value==='open'){state.boxProtection=value;record('설문함 관리: '+T(ids[0]),value==='open'?'응답을 다시 바꿀 수 있어요. 제출 방법 확인이 남았어요.':'제출 방법을 제한해서 응답을 지키기로 했어요.');done();}else showNext(T(repair?'S4-FIX7-B':'S2-APPLY'),()=>{state.boxProtection=value;record('설문함 관리: '+T(ids[0]),value==='open'?'응답을 다시 바꿀 수 있어요. 제출 방법 확인이 남았어요.':'제출 방법을 제한해서 응답을 지키기로 했어요.');done();});})};
})));
}
function menuHTML(menu){return '<article class="material-card ee-panel"><div class="material-top"><h3>'+esc(menu.title)+'</h3>'+icon('notebook',28)+'</div><ul class="menu-list">'+menu.rows.map(r=>'<li><strong class="day">'+r[0]+'</strong><span class="food">'+esc(r[1])+(r[2]?'<small>'+esc(r[2])+'</small>':'')+'</span></li>').join('')+'</ul><p class="safe-label">'+esc(menu.note)+'</p></article>';}
function showMenu(menu){
 setSceneArt(menu.kind==='revised'?'revised':'menu',{caption:'요일마다 메뉴와 확인할 것을 살펴봐요'});
 stagePages=menu.rows.map(row=>({html:`<article class="material-card menu-card ee-panel"><p class="eyebrow">${esc(menu.title)} · ${row[0]}요일</p><h3>${esc(row[1])}</h3><p class="menu-pending">${esc(row[2]||menu.note)}</p></article>`}));stagePage=0;renderMaterial();announce(menu.title+'. '+menu.note);
}

function sceneThree(){
M.capture(state);const first=M.initialMenu(state);
run([L('S3-01')],()=>{showMenu(first);showNext(T('S3-B1'),()=>run([
L(state.sort.duplicates==='remove'?'S3-BC1':'S3-A1'),
L(state.sort.impersonation==='remove'?'S3-BC2':'S3-A2'),
L('S3-02'),L('S3-03'),L('S3-04')],reflectChoice));});
}
function reflectChoice(){choices(T('S3-Q1'),[1,2,3].map(i=>({text:T('S3-C'+i),onSelect:()=>{record(T('S3-C'+i),T('S3-R'+i));run([L('S3-R'+i),L('S3-05')],reflectionInput);}})));}
function reflectionInput(){
 setSceneArt('question');material({title:'질문 후보를 살펴봐요',count:'추가할 질문',text:'고른 질문은 개선 활동에서 실제로 추가할 수 있어요.'});
 const candidates=['알레르기가 있는 음식이 있나요?','어느 정도로 매운 음식을 먹을 수 있나요?','몇 학년인가요?','기타 · 내 질문 쓰기'];
 choices('설문에 어떤 질문이 더 필요할까요?',candidates.map((text,i)=>({text,onSelect:()=>{
 if(i===3){otherQuestion();return;}state.question=text;reflection=text;record('설문 질문 후보: '+text,'질문 후보를 골랐어요. 아직 응답을 수집하지는 않았어요.');questionDone();
 }})));
}
function otherQuestion(){
 actionHandlers=[];$('action-area').innerHTML='<label class="action-prompt" for="reflection-input">내가 생각한 질문 (선택)</label><textarea class="reflection-field" id="reflection-input" maxlength="160" rows="2" placeholder="실제 이름이나 건강 정보는 쓰지 않아요"></textarea><p class="input-note">직접 쓴 글은 자동 저장·전송하지 않아요. 다운로드한 리포트에는 포함돼요.</p><div class="button-row"><button class="ee-button" id="reflection-next">이 질문 후보로 이어가기</button><button class="ee-button secondary" id="reflection-back">후보 다시 보기</button></div>';
 $('reflection-next').onclick=()=>{reflection=$('reflection-input').value.trim();state.question=reflection||'기타 (직접 쓴 질문 없음)';record('설문 질문 후보: '+state.question,'생각한 질문을 기록했어요. 실제 추가할 질문은 다음 활동에서 골라요.');questionDone();};$('reflection-back').onclick=reflectionInput;$('reflection-input').focus();
}
function questionDone(){material({title:'내가 고른 질문 후보',count:'아직 응답 없음',text:state.question});run([L('S3-06'),L('S3-06A')],()=>earn('한쪽으로 치우친 데이터',3,()=>startScene(4)));}

function sceneFour(){run([L('S4-01')],methodChoices);}
function methodChoices(focusId){
choices('방법 2개 고르기 · 지금 '+state.methods.length+'개 골랐어요',M.methods.map(m=>({id:m.id,text:m.text,onSelect:()=>{

if(state.methods.includes(m.id))state.methods=state.methods.filter(id=>id!==m.id);
else if(state.methods.length<2)state.methods.push(m.id);else{announce(T('S4-A1'));return;}
methodChoices(m.id);
}})),{multiple:true,selected:state.methods,focus:!focusId,pageKey:'methods'});

methodFooter();
if(focusId)$('action-area').querySelector('[data-choice="'+M.methods.findIndex(m=>m.id===focusId)+'"]')?.focus({preventScroll:true});
}
function methodFooter(){
 $('action-area').classList.add('method-actions');const footer=$('action-area').querySelector('.choice-pager');const confirm=document.createElement('button');confirm.className='ee-button';confirm.id='confirm-methods';confirm.disabled=state.methods.length!==2;confirm.textContent='고른 2개 실행';confirm.onclick=confirmMethods;footer.append(confirm);fitStage();
}
function confirmMethods(){
 record('처음 고른 개선 방법 2개',state.methods.map(id=>M.methods.find(m=>m.id===id).text).join(' / '));
 const steps=[...state.methods];const next=()=>{const id=steps.shift();if(id)activity(id,next);else checkRepairs();};next();
}

function activity(id,done){
setSceneArt('repair');$('chat-place').textContent='개선 활동';
const method=M.methods.find(m=>m.id===id),finish=()=>{M.applyActivity(state,id);record(method.text,id==='teacher'?'위험한 메뉴의 사용을 막았어요. 빠진 자료는 별도로 확인해야 해요.':id==='stickers'?'그림 응답을 확인하고 1학년 의견을 포함했어요.':(id==='allergy'?'알레르기':'매운 정도')+' 질문을 추가하고 응답도 확인했어요.');updateCollection();system('✓ '+method.text);showNext(T('S4-FIX-B'),done);};
 if(method&&!method.good){const text=id==='majority'?'많이 나온 메뉴만 남기자, 적은 수의 친구가 먹기 어려운 음식이 그대로 남았어요.':'일부 친구에게 도시락을 가져오라고 하자, 함께 급식 먹기에서 빠지는 친구가 생겼어요.';effect('retry');material({title:id==='majority'?'다수의 메뉴만 반영':'함께 먹기에서 빠진 친구',count:'문제 남음',text});record(method.text,text);run([L(id==='majority'?'S4-T5':'S4-T6'),['teacher',text+' 이 방법은 빠진 데이터를 고치지 못했어요.','explaining']],()=>showNext('이 결과를 기록하고 이어가기',done));return;}
 if(method)effect('correct');
run(method?[method.reply]:[],()=>{
if(id==='allergy'||id==='spice'){
const prefix=id==='allergy'?'S4-ACT1':'S4-ACT7';
material({title:T(prefix+'-Q'),count:'새 질문',text:id==='allergy'?'친구의 건강 정보는 필요한 선생님이 따로 확인해요.':T('S4-ACT7-N')});
showNext(T(prefix+'-B1'),()=>run([L(prefix+'-T')],()=>{if(id==='allergy')system(T('S4-ACT1-N'));showNext(T(prefix+'-B2'),finish);}));
}else if(id==='missing')collectMissing(done);
else if(id==='stickers'){
material({title:'음식 그림으로 응답하기',count:'그림 버튼',text:'글로 쓰기 어려워도 자기 생각을 전할 수 있어요.'});
showNext(T('S4-ACT3-B1'),()=>{
append('<article class="material-card ee-panel"><h3>1학년 동생들의 응답 화면</h3><div class="food-options">'+['치킨','카레','김밥'].map((name,i)=>'<span class="ee-badge">'+M.foodPicture(i)+name+'</span>').join('')+'</div><p>두 친구가 각자 치킨 그림을 골랐어요.</p></article>');
run([L('S4-ACT3-T')],()=>showNext(T('S4-ACT3-B2'),finish));
});
}else if(id==='teacher'){
const remaining=M.repairs(state).map(x=>x.text).join(' / ');
run([['teacher',T('S4-ACT4-T').replace('{현재 남은 점검 항목 안내}',remaining?'더 확인할 것은 '+remaining+'예요.':'자료도 모두 확인했어요.'),'explaining']],()=>showNext(T('S4-ACT4-B1'),finish));
}
});
}
function collectMissing(done){
const pending=M.sources.filter(x=>!state.visited.includes(x.id));
if(!pending.length){run([L('S4-ACT2-E')],()=>showNext(T('S4-ACT2-B2'),done));return;}
choices(T('S4-ACT2-Q'),pending.map(source=>({text:source.label,detail:'원래 응답 '+source.count+'개',onSelect:()=>{
setSceneArt(source.id);
const lines=source.lines.slice(0,source.id==='box'||source.id==='jiho'?2:1);
if(source.id==='saebom'&&!state.spice)lines.push(L('S1-V3-2'));
if(source.id==='haneul'&&!state.allergy)lines.push(L('S1-V4-3'));
run(lines,()=>showNext(T('S4-ACT2-B1'),()=>{
M.visit(state,source.id);record(source.label+' 추가 수집','빠졌던 응답 '+source.count+'개를 반영했어요. 현재 '+state.visited.length+'곳, '+M.count(state)+'개예요.');updateCollection();system(source.label+' 응답 확인 · 총 '+M.count(state)+'개');
if(state.allergy||state.spice)system('이미 추가한 질문의 응답도 선생님과 확인했어요.');
if(state.visited.length===4)run([L('S4-ACT2-D')],()=>showNext(T('S4-ACT2-B2'),done));else collectMissing(done);
}));
}})));
}
function checkRepairs(){revisedMeal();}

function repairChoices(){priorityChoices();}

function revisedMeal(){
 state.safetyChecked=true;showMenu(M.revisedMenu(state));
 const pending=M.repairs(state);
 run([['teacher','위험한 메뉴는 사용하지 않도록 막았어요. 메뉴마다 ‘아직 확인할 것’을 함께 읽어 봐요.','explaining'],['robot',pending.length?'메뉴가 나왔다고 다 끝난 건 아니구나. 데이터에서 확인할 것이 '+pending.length+'개 남아 있어.':'여러 친구의 의견과 두 질문, 진짜 응답을 확인했어. 바뀐 급식안을 함께 살펴보자!','explaining']],()=>pending.length?priorityChoices():earn(null,4,()=>startScene(5)));
}
function priorityChoices(){
 const pending=M.repairs(state);if(!pending.length){revisedMeal();return;}
 choices('남은 문제 중 무엇부터 확인할까?',pending.map(item=>({text:item.text,onSelect:()=>{
 state.priority=item.id;const menu=M.revisedMenu(state),days=menu.rows.filter(r=>r[3].includes(item.id)).map(r=>r[0]+'요일').join(' · ');
 record('먼저 확인할 문제: '+item.text,days+' 메뉴와 연결돼요. 확인 순서를 정했지만 아직 해결한 것은 아니에요.');
 material({title:days+' 메뉴에서 확인해요',count:'내가 정한 우선순위',text:item.text+'\n자료를 고치면 메뉴 옆의 확인 항목도 바뀌어요.'});
 choices('이 문제를 지금 확인해 볼까요?',[{text:'지금 확인하고 메뉴의 변화 보기',onSelect:()=>repairIssue(item.id)},{text:'확인할 문제로 남기고 함께 토의하기',onSelect:()=>{record('지금은 확인할 문제로 남기기',item.text+'을 다음에 먼저 확인하기로 했어요. 급식안은 아직 확정되지 않았어요.');showMenu(M.revisedMenu(state));run([['teacher','확인할 순서를 정했어요. 남은 자료를 확인하기 전에는 이 급식안을 확정하지 않아요.','explaining']],()=>earn(null,4,()=>startScene(5)));}}]);
 }})));
}
function repairIssue(id){const index=M.sorting.findIndex(x=>x.id===id);if(index>=0)sortCard(index,true,revisedMeal);else if(id==='protect')protectionOptions(true,revisedMeal);else activity(id,revisedMeal);}

function sceneFive(){run([L('S5-01')],()=>choices(T('S5-Q1'),[{text:T('S5-C1'),onSelect:()=>privacyChoice(false)},{text:T('S5-C2'),onSelect:()=>privacyChoice(true)}]));}
function privacyChoice(protect){
state.protectChoices[0]=protect;setSceneArt('privacy');material({title:protect?'질문지 공유 제한':'공유 시도 멈춤',count:protect?'필요한 선생님만':'선생님이 막았어요',text:protect?'친구의 정보를 필요한 목적에만 쓰기로 했어요.':'자료는 실제로 전달되지 않았어요. 볼 수 있는 사람을 다시 확인해야 해요.'});record(protect?'질문지 공유하지 않기':'궁금해하는 친구에게 보여 주기',protect?'필요한 선생님만 보도록 했어요.':'선생님이 공유를 막았어요. 접근 권한 확인은 아직 남았어요.');
run((protect?['S5-B1']:['S5-A1','S5-A2']).concat('S5-02').map(id=>L(id)),()=>choices(T('S5-Q2'),[{text:T('S5-C3'),onSelect:()=>retentionChoice(false)},{text:T('S5-C4'),onSelect:()=>retentionChoice(true)}]));
}
function retentionChoice(protect){state.protectChoices[1]=protect;setSceneArt('protect');material({title:protect?'필요한 동안 보관 후 안전하게 삭제':'게시판 공개 멈춤',count:protect?'삭제 계획 정함':'선생님이 막았어요',text:protect?'누가 보고 언제 삭제할지 정했어요.':'게시판에는 올리지 않았어요. 볼 사람과 보관 기간을 다시 확인해야 해요.'});record(protect?T('S5-C4'):T('S5-C3'),protect?'필요한 기간 뒤 안전하게 삭제하기로 했어요.':'선생님이 게시판 공개를 막았어요. 접근 권한·보관 기간·삭제 방법을 더 확인해야 해요.');run([L(protect?'S5-R2':'S5-R1'),L('S5-03')],()=>earn('관리',5,showResult));}


function showResult(){mode='result';queue=[];afterQueue=null;actionHandlers=[];resultStep=0;resultPage=0;renderResultStep();}
function renderResultStep(){
 const result=M.result(state),titles=['급식안 확인','우리가 발견한 것','남은 확인 항목','학습한 점 고르기','약속 고르기','마지막 확인'];
 let body='',pages=1;
 if(resultStep===0){pages=5;const row=result.menu.rows[resultPage];body=`<p class="ee-badge">${esc(result.title)} · 급식안의 준비 상태</p><article class="result-day ee-panel"><p class="eyebrow">${row[0]}요일</p><h2>${esc(row[1])}</h2><p class="step-copy">${esc(row[2])}</p></article><p class="ee-notice">${esc(result.menu.note)}</p>`;}
 if(resultStep===1){pages=result.findings.length;body=`<p class="eyebrow">발견 ${resultPage+1} / ${pages}</p><p class="finding-card">${esc(result.findings[resultPage])}</p><div class="result-portraits">${portrait('robot','explaining','medium')}${portrait('teacher','explaining','medium')}</div>`;}
 if(resultStep===2){pages=Math.max(1,Math.ceil(result.needs.length/3));body=result.needs.length?`<ul class="step-needs">${result.needs.slice(resultPage*3,resultPage*3+3).map(t=>`<li>${esc(t)}</li>`).join('')}</ul><p class="ee-notice">아직 확인할 문제가 있어요. 이 급식안은 확정된 메뉴가 아니에요.</p>`:'<p class="finding-card">남은 데이터 확인 항목이 없어요. 처음 선택과 나중에 고친 점을 리포트에서 함께 볼 수 있어요.</p>';}
 if(resultStep===3){pages=2;body=`<p>마음에 남은 내용을 1~3개 골라요.</p><div class="step-options">${M.learningOptions.slice(resultPage*3,resultPage*3+3).map((text,i)=>`<button class="ee-choice" data-learning="${resultPage*3+i}" aria-pressed="${state.learning.includes(resultPage*3+i)}">${esc(text)}</button>`).join('')}</div><p role="status">${state.learning.length} / 3개 선택 · 다른 쪽에도 선택지가 있어요.</p>`;}
 if(resultStep===4){pages=2;body=`<p>앞으로 지킬 약속 3개를 골라요.</p><div class="step-options">${M.pledges.slice(resultPage*3,resultPage*3+3).map((text,i)=>`<button class="ee-choice" data-pledge="${resultPage*3+i}" aria-pressed="${state.pledges.includes(resultPage*3+i)}">${esc(text)}</button>`).join('')}</div><p role="status">${state.pledges.length} / 3개 선택 · 다른 쪽에도 약속이 있어요.</p>`;}
 if(resultStep===5){body=`${wordStrip()}<p>고른 약속 하나는 내 말로 바꿔도 돼요.</p><div class="pledge-editor"><label for="pledge-edit-select">바꿔 쓸 약속 (선택)</label><select id="pledge-edit-select"><option value="">그대로 쓸게요</option>${state.pledges.map(i=>`<option value="${i}" ${i===customPledgeIndex?'selected':''}>${esc(M.pledges[i])}</option>`).join('')}</select><input id="pledge-edit-input" maxlength="100" aria-label="내 말로 고친 약속" value="${esc(customPledge)}" ${customPledgeIndex===null?'hidden':''}></div><p class="memory-line">많은 사람의 의견과 모두의 의견은 달라요.<br>데이터는 고르게 수집하고, 소중하게 지켜요.</p><p class="input-note">직접 쓴 글은 다운로드한 PNG에만 포함돼요. 자동 저장·전송하지 않아요.</p>`;}
 const blocked=(resultStep===3&&!state.learning.length)||(resultStep===4&&state.pledges.length!==3);
 setMain(`<section class="ee-panel step-page result-step"><p class="eyebrow">탐험 정리 ${resultStep+1} / 6 · ${state.explorer}버전 탐험가</p><h1>${titles[resultStep]}</h1><div class="step-body">${body}</div>${pages>1?`<nav class="step-pager" aria-label="정리 자료 페이지"><button class="ee-button secondary" id="result-page-prev" ${resultPage===0?'disabled':''}>이전 자료</button><span>${resultPage+1} / ${pages}</span><button class="ee-button secondary" id="result-page-next" ${resultPage===pages-1?'disabled':''}>다음 자료</button></nav>`:''}<div class="step-footer"><button class="ee-button secondary" id="result-back" ${resultStep===0?'disabled':''}>이전 단계</button><button class="ee-button" id="result-next" ${blocked?'disabled':''}>${resultStep===5?'탐험 마치기':blocked?resultStep===3?'학습한 점을 골라요':'약속 3개를 골라요':'다음 단계'}</button></div></section>`);
 if(pages>1){$('result-page-prev').onclick=()=>{resultPage--;renderResultStep();};$('result-page-next').onclick=()=>{resultPage++;renderResultStep();};}
 $('result-back').onclick=()=>{resultStep--;resultPage=0;renderResultStep();};$('result-next').onclick=()=>{if(resultStep===5){complete();return;}resultStep++;resultPage=0;renderResultStep();};
 main.querySelectorAll('[data-learning]').forEach(b=>b.onclick=()=>toggleLearning(Number(b.dataset.learning)));
 main.querySelectorAll('[data-pledge]').forEach(b=>b.onclick=()=>togglePledge(Number(b.dataset.pledge)));
 if(resultStep===5){$('pledge-edit-select').onchange=()=>{const v=$('pledge-edit-select').value;customPledgeIndex=v===''?null:Number(v);customPledge='';$('pledge-edit-input').value='';$('pledge-edit-input').hidden=customPledgeIndex===null;if(customPledgeIndex!==null)$('pledge-edit-input').focus();};$('pledge-edit-input').oninput=e=>{customPledge=e.target.value;};}
}

function togglePledge(i){sound();if(state.pledges.includes(i))state.pledges=state.pledges.filter(x=>x!==i);else if(state.pledges.length<3)state.pledges.push(i);else{announce('약속은 3개 골라요. 고른 약속을 다시 누르면 바꿀 수 있어요.');return;}if(customPledgeIndex!==null&&!state.pledges.includes(customPledgeIndex)){customPledgeIndex=null;customPledge='';}renderResultStep();main.querySelector('[data-pledge="'+i+'"]')?.focus({preventScroll:true});}

function updatePledges(){renderResultStep();}

function complete(){if(state.pledges.length!==3||!state.learning.length||state.completed)return;state.completed=true;mode='complete';const promises=state.pledges.map(i=>i===customPledgeIndex&&customPledge.trim()?customPledge.trim():M.pledges[i]);setMain(`<section class="ee-panel complete"><p class="eyebrow">탐험을 마쳤어요</p><h1>함께 먹는 급식,<br>함께 지키는 데이터</h1><div class="result-portraits" aria-label="냠냠봇과 선생님">${portrait('robot','happy','medium')}${portrait('teacher','happy','medium')}</div><p>급식 의견 수집 대장, 고마워요.<br>이제 일상에서도 우리의 약속을 이어 가요.</p><p class="ee-badge small-gap">선택과 변화 · 학습한 점 ${state.learning.length}개 · 약속 3개</p><p class="memory-line">많은 사람의 의견과 모두의 의견은 달라요.<br>데이터는 고르게 모으고, 소중하게 지켜요.</p><div class="button-row"><button class="ee-button" id="download-report">개인 리포트 PNG 다운로드</button><button class="ee-button secondary" id="play-again">다시 해보기</button><button class="ee-button secondary" id="back-to-series">다른 탐험으로 돌아가기</button></div><p class="muted spaced">리포트는 다운로드할 때만 내 기기에 저장돼요. 서버로 보내지 않아요.</p><p class="ee-notice small-gap" id="return-note" hidden></p></section>`);$('download-report').onclick=()=>downloadReport(promises);$('play-again').onclick=reset;$('back-to-series').onclick=returnToSeries;emit('complete',{result:{completed:true}});sound('collect');}

function toggleLearning(i){
 if(state.learning.includes(i))state.learning=state.learning.filter(n=>n!==i);else if(state.learning.length<3)state.learning.push(i);else{announce('학습한 점은 3개까지 골라요. 다시 누르면 바꿀 수 있어요.');return;}
 renderResultStep();main.querySelector('[data-learning="'+i+'"]')?.focus({preventScroll:true});
}

async function downloadReport(promises){
 const button=$('download-report');button.disabled=true;button.textContent='리포트 만드는 중…';
 try{await window.EthicityReport.download(state,promises);announce('개인 리포트 PNG를 만들었어요. 브라우저의 다운로드를 확인해 주세요.');}
 catch(error){console.error(error);announce('리포트를 만들지 못했어요. 다시 눌러 주세요.');}
 finally{button.disabled=false;button.textContent='개인 리포트 PNG 다운로드';}
}

function returnToSeries(){const note=$('return-note');if(window.parent!==window){emit('exit');note.textContent='탐험을 마쳤어요. 통합 페이지의 게임 목록으로 돌아갈 수 있어요.';}else if(document.referrer){try{const previous=new URL(document.referrer);if(previous.origin===location.origin&&previous.pathname!==location.pathname){location.assign(previous.href);return;}}catch{}}note.hidden=false;if(!note.textContent)note.textContent='이 게임을 연 윤리시티 목록 탭으로 돌아가 다른 탐험을 골라 주세요.';note.focus?.();announce(note.textContent);}
function openDialog(id){finishTyping();restoreFocus=document.activeElement;$(id).showModal();}
function closeDialog(id){$(id).close();restoreFocus?.focus?.({preventScroll:true});}
$('brand-home').onclick=e=>{e.preventDefault();if(['start','loading'].includes(mode))return;if(mode==='complete'){reset();return;}openDialog('restart-dialog');};
$('open-settings').onclick=()=>openDialog('settings-dialog');$('close-settings').onclick=()=>closeDialog('settings-dialog');$('cancel-restart').onclick=()=>closeDialog('restart-dialog');$('confirm-restart').onclick=()=>{$('restart-dialog').close();reset();};
$('sound-setting').onchange=async e=>{assets?.setSound(e.target.checked);if(e.target.checked&&!await assets?.playSound('tap'))announce('소리를 재생하지 못했어요. 게임은 계속할 수 있어요.');};
function setMotion(value){reducedMotion=value;if(value)finishTyping();document.body.classList.toggle('reduced-motion',value);$('motion-setting').checked=value;}
$('typing-setting').onchange=e=>{instantText=e.target.value==='instant';if(instantText)finishTyping();};
$('background-music').volume=.25;
$('bgm-setting').onchange=()=>void updateMusic();
$('bgm-volume').oninput=e=>{const volume=Number(e.target.value);$('background-music').volume=volume/100;$('bgm-volume-value').value=volume+'%';};
document.addEventListener('visibilitychange',()=>void updateMusic());
window.addEventListener('pagehide',()=>{++musicAttempt;$('background-music').pause();});
window.addEventListener('pageshow',()=>void updateMusic());
setMotion(reducedMotion);$('motion-setting').onchange=e=>setMotion(e.target.checked);motionQuery.addEventListener('change',e=>setMotion(e.matches));
document.addEventListener('keydown',e=>{if(e.repeat||e.ctrlKey||e.altKey||e.metaKey||document.querySelector('dialog[open]'))return;const tag=e.target.tagName;if(['INPUT','TEXTAREA','SELECT'].includes(tag)||e.target.isContentEditable)return;if(/^[1-4]$/.test(e.key)&&actionHandlers[Number(e.key)-1]){e.preventDefault();actionHandlers[Number(e.key)-1]();return;}if(e.code==='Space'&&!e.target.closest('button,a')){const next=$('next-line');if(next){e.preventDefault();next.click();}}});
async function boot(){try{if(!window.ETHICITY_COMMON_MANIFEST||!window.EthicityAssets)throw Error('공통 패키지를 찾지 못했어요.');assets=await EthicityAssets.load(ETHICITY_COMMON_MANIFEST,COMMON);await Promise.all(Object.values(scenePictures).map(src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=()=>reject(Error('장면 그림을 찾지 못했어요: '+src));image.src=src;})));paintIcons();showStart();emit('ready');}catch(error){setMain('<div class="ee-panel loading"><h1>공통 자료를 불러오지 못했어요</h1><p class="small-gap">게임 폴더와 shared 폴더를 함께 열어 주세요.</p><p class="muted small-gap" id="load-error"></p><button class="ee-button spaced" id="reload-game">다시 불러오기</button></div>');$('load-error').textContent=error.message;$('reload-game').onclick=()=>location.reload();}}
window.addEventListener('resize',fitStage);
void boot();
})();
