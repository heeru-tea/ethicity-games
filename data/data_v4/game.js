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
 meet:{background:'cafeteria',cast:['robot','teacher'],digital:'criteria',caption:'냠냠봇이 지켜야 할 기준은 무엇일까요?'},
 question:{background:'cafeteria',cast:['robot'],caption:'냠냠봇의 첫 기준표',digital:'criteria'},
 collect:{background:'courtyard',cast:['robot'],caption:'학교 곳곳에서 냠냠봇을 시험해요'},
 box:{background:'cafeteria',cast:['robot'],digital:'collection',caption:'익숙한 상황에서 연습한 시험 기록'},
 jiho:{background:'classroom',cast:['jiho','robot'],caption:'교실 친구의 이야기를 들어요'},
 saebom:{background:'classroom',cast:['saebom','robot'],caption:'친구가 전하는 1학년 동생의 이야기'},
 haneul:{background:'library',cast:['haneul','robot'],caption:'도서관 친구의 이야기를 들어요'},
 sort:{background:'classroom',cast:['robot'],digital:'sorting',caption:'작동 기록을 하나씩 확인해요'},
 menu:{background:'cafeteria',cast:['robot'],caption:'아직 먹기 전! 함께 살펴볼 급식표'},
 repair:{background:'classroom',cast:['teacher','robot'],caption:'함께 먹을 수 있는 방법을 찾아요'},
 revised:{background:'cafeteria',cast:['daon','haneul','saebom'],caption:'기준을 고치고 다시 시험한 식단표'},
 privacy:{background:'classroom',cast:['onyu','teacher'],caption:'몇 주 뒤, 평소와 다른 식단표가 나왔어요'},
 protect:{background:'classroom',cast:['teacher'],digital:'protected',caption:'쓰는 동안에도 확인할 계획을 세워요'}
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
function effect(id){cancelAnimationFrame(effectFrame);const canvas=$('feedback-effect'),ctx=canvas.getContext('2d');canvas.hidden=false;const anchor=document.querySelector('.message-bubble')?.getBoundingClientRect();canvas.style.left=Math.min(innerWidth-72,(anchor?.right||innerWidth-100)+8)+'px';canvas.style.top=Math.max(8,(anchor?.top||100)-16)+'px';const start=performance.now();function draw(now){ctx.clearRect(0,0,128,128);if(assets.drawEffect(ctx,id,64,64,now-start,96,reducedMotion))effectFrame=requestAnimationFrame(draw);else canvas.hidden=true;}draw(start);sound(id==='correct'?'win':'retry');}
function reset(){musicStarted=false;void updateMusic();$('background-music').currentTime=0;state=M.initial();queue=[];afterQueue=null;actionHandlers=[];reflection='';customPledge='';customPledgeIndex=null;reported=0;cancelAnimationFrame(effectFrame);$('feedback-effect').hidden=true;window.EthicityReport.clear();showStart();}
function showStart(){
 mode='start';setMain(`<section class="ee-panel start-page" aria-labelledby="game-title"><p class="eyebrow">윤리시티 · 신뢰성</p><h1 id="game-title">신뢰성</h1><div class="start-scene"><img src="${COMMON}/backgrounds/cafeteria.png" alt="학교 급식실"><div>${portrait('robot','happy','medium')}</div></div><p class="start-question">냠냠봇을 믿어도 될까?<br>기준을 정하고, 시험하고, 꾸준히 살펴요.</p><button class="ee-button" id="start-game">탐험 시작 ${icon('arrow_right',24)}</button><p class="muted">초등 3~4학년 · 약 8~10분<br>이름을 입력하지 않아요. 마지막에 내 리포트를 저장할 수 있어요.</p></section>`);
 $('start-game').onclick=()=>{musicStarted=true;void updateMusic();sound();chooseExplorer();};
}

function wordStrip(){return `<div class="word-strip" aria-label="모은 낱말 카드 ${state.words.length}장, 전체 5장">${M.words.map((w,i)=>`<div class="word-card ee-badge ${state.words.includes(w)?'earned':''}" aria-label="${esc(w)} ${state.words.includes(w)?'모았어요':'아직 모으지 않았어요'}"><span class="word-check" aria-hidden="true">${state.words.includes(w)?'✓':'·'}</span><span>${w}</span></div>`).join('')}</div>`;}
function shell(scene,introMode=false){
 mode=introMode?'intro':'game';
 const info=introMode?{title:'냠냠봇의 부탁',goal:'냠냠봇을 어떻게 믿고 쓸 수 있을까요?',place:'학교 급식실'}:M.scenes[scene];
 setMain((introMode?'':wordStrip())+`<div class="game-layout ${introMode?'intro-layout':''}">
 <section class="scene-sidebar" aria-label="현재 장면"><div class="stage-heading"><div><span class="scene-tag">${introMode?'탐험 준비':'이야기 '+(scene+1)+' / 6'} · <span id="chat-place">${info.place}</span></span><h1 class="scene-title">${info.title}</h1></div><div class="stage-meta"><span class="ee-badge">${state.explorer}버전 탐험가</span><small id="chat-count">${introMode?'함께 시작해요':'시험한 곳 '+state.visited.length+' / 4'}</small></div></div>
 <figure class="scene-art"><div class="scene-view"><img id="scene-image" class="scene-image" alt=""><canvas id="scene-cast" width="1280" height="720" aria-hidden="true"></canvas><div id="scene-material" tabindex="0" aria-label="장면의 현재 자료"></div><div id="scene-response" class="scene-response ee-badge" hidden></div></div><figcaption><span id="scene-caption"></span><nav id="material-nav" class="material-nav" aria-label="자료 페이지" hidden></nav></figcaption></figure><div id="scene-speaker" hidden></div></section>
 <section class="messenger ee-panel" aria-label="현재 대화"><div class="conversation-log" id="conversation-log" tabindex="0" aria-label="현재 말풍선"></div><div class="action-area" id="action-area"></div></section></div>`);
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
 $('scene-material').innerHTML=material||(sceneArt.digital?digitalPanel(sceneArt.digital):'');
 paintIcons($('scene-material'));paintSceneCast();fitStage();
}
function digitalPanel(kind){
 const entries=kind==='criteria'?['친구들이 좋아하는 메뉴를 많이 넣기','빠진 기준은 없을까?']:kind==='collection'?['익숙한 6학년 메뉴 · 시험 12번','다른 상황은 따로 확인해야 해요.']:kind==='sorting'?['맡지 않은 광고 알림 · 30번','허락 없는 건강 기록 열기 · 1번','선생님이 맡긴 채소 데이 · 1번']:['매주 기준표와 비교하기','이상한 결과는 기록하고 알리기','새 오류가 반복되면 다시 점검하기'];
 return '<article class="material-card ee-panel"><h3>'+icon(kind==='protected'?'inspect':'notebook',24)+(kind==='criteria'?'처음 기준표':kind==='collection'?'연습 시험 기록':kind==='sorting'?'냠냠봇 작동 기록':'꾸준한 점검 계획')+'</h3>'+entries.map(t=>'<p>'+esc(t)+'</p>').join('')+'</article>';
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
  const x=cast.length===1?165:95+i*125;
  assets.drawCharacter(ctx,id,x,620,'down',1,id===sceneSpeaker?1.15:1.05);
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
 append(`<div class="message ${id==='me'?'player':''}"><div class="message-avatar">${id==='me'?'':portrait(id,expression)}<span class="speaker-label">${name}</span></div><div class="message-content"><p class="message-bubble">${esc(text)}</p></div></div>`,id==='me'||reducedMotion||instantText?label:'');
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
function run(lines,done){finishTyping(false);queue=lines.flatMap(line=>splitCopy(line[1],innerHeight<550?36:innerWidth<=600?48:72).map((text,i)=>[line[0],text,line[2],i===0?line[3]:undefined]));afterQueue=done;nextLine();}
function nextLine(){if(busy)return;if(finishTyping())return;if(queue.length){const line=queue.shift();say(...line);showNext();}else if(afterQueue){const fn=afterQueue;afterQueue=null;fn();}}
function showNext(label='다음',fn=nextLine){pinAfterLayout();$('action-area').classList.remove('method-actions');actionHandlers=[];const area=$('action-area');area.innerHTML=`<div class="next-row"><span class="muted">대화창 탭 또는 Space<br>한 번 더 누르면 다음 대사</span><button class="ee-button" id="next-line" data-label="${esc(label)}"><span class="next-label">${label}</span> ${icon('arrow_right',20)}</button></div>`;paintIcons(area);updateNextLabel();fitStage();$('next-line').onclick=()=>{sound();if(!finishTyping())fn();};$('next-line').focus({preventScroll:true});}
function choices(prompt,items,{multiple=false,selected=[],focus=true,pageKey=prompt}={}){
 pinAfterLayout();$('action-area').classList.remove('method-actions');
 if(choiceView.key!==pageKey)choiceView={key:pageKey,page:0};
 const pageSize=items.length>2?2:items.length,pages=Math.ceil(items.length/pageSize);choiceView.page=Math.min(choiceView.page,Math.max(0,pages-1));
 const start=choiceView.page*pageSize,visible=items.slice(start,start+pageSize),area=$('action-area');actionHandlers=[];
 if($('scene-response'))$('scene-response').dataset.kind='preview';
 area.innerHTML=`<p class="action-prompt">${esc(prompt)}</p><div class="choices">${visible.map((x,i)=>`<button class="ee-choice choice-control" data-choice="${start+i}" ${x.disabled?'disabled':''} ${multiple?`aria-pressed="${selected.includes(x.id)}"`:''}><span class="key-hint" aria-hidden="true">${i+1}</span><span>${multiple?`<span class="check-marker" aria-hidden="true">${selected.includes(x.id)?'✓ ':'□ '}</span>`:''}${esc(x.text)}${x.detail?`<small>${esc(x.detail)}</small>`:''}</span></button>`).join('')}</div>${pages>1?`<nav class="choice-pager" aria-label="선택지 페이지"><button class="ee-button secondary" id="choice-prev" ${choiceView.page===0?'disabled':''}>앞 선택지</button><span>${choiceView.page+1} / ${pages}</span><button class="ee-button secondary" id="choice-next" ${choiceView.page===pages-1?'disabled':''}>다음 선택지</button></nav>`:''}`;
 area.querySelectorAll('[data-choice]').forEach((b,i)=>{const item=visible[i],handler=()=>{if(b.disabled||busy)return;sound();if(!multiple){actionHandlers=[];say('me',item.text);}item.onSelect();};b.onclick=handler;b.onfocus=()=>previewChoice(item.text);b.onpointerenter=()=>previewChoice(item.text);actionHandlers[i]=handler;});
 const flip=delta=>{choiceView.page+=delta;choices(prompt,items,{multiple,selected,focus:true,pageKey});if(pageKey==='methods')methodFooter();};
 if(pages>1){$('choice-prev').onclick=()=>flip(-1);$('choice-next').onclick=()=>flip(1);}
 if(focus)area.querySelector('button:not(:disabled)')?.focus({preventScroll:true});fitStage();
}

function previewChoice(text){const el=$('scene-response');if(el&&el.dataset.kind!=='reaction'){el.hidden=false;el.textContent='살펴보는 선택 · '+text;}}
function earn(word,scene,next){if(word&&!state.words.includes(word)){state.words.push(word);system(`낱말 카드 완성 · ${word}`);const strip=main.querySelector('.word-strip');if(strip)strip.outerHTML=wordStrip();sound('collect');}const current=scene+1;if(current>reported){reported=current;emit('progress',{current,total:6});}showNext(scene===5?'학습한 내용 정리하기':'다음 이야기',next);}
const T=M.T,L=M.L;
function intro(){shell(-1,true);run(['IN-01','IN-02','IN-02A','IN-03','IN-04'].map(id=>L(id)),()=>showNext(T('IN-B1'),rules));}
function rules(step=0){
 mode='rules';const ruleCards=[['대화를 읽고 이어 가요','말풍선은 하나씩 나타나요. 다음 버튼이나 Space로 이어 가요. 글자가 나오는 중에 누르면 문장이 먼저 완성돼요.','notebook'],['선택하고 변화를 살펴봐요','선택에 따라 냠냠봇의 급식이 달라져요. 정답이 없는 선택도 있어요. 기준표와 시험 결과는 한 장씩 확인해요.','inspect'],['낱말 카드와 내 리포트를 완성해요','낱말 카드 5장을 수집해요. 마지막에 학습한 점과 약속을 고르고, 내 선택이 담긴 리포트를 저장해요.','clue']];
 const r=ruleCards[step];setMain(`<section class="ee-panel step-page"><p class="eyebrow">탐험 방법 ${step+1} / 3</p><div class="step-icon">${icon(r[2],64)}</div><h1>${r[0]}</h1><p class="step-copy">${r[1]}</p><p class="ee-notice">시험과 작동 기록은 이야기 속 가상의 자료예요.<br>실제 이름이나 건강 정보는 쓰지 않아요.</p><div class="step-footer"><button class="ee-button secondary" id="rule-back" ${step===0?'disabled':''}>이전</button><button class="ee-button" id="rule-next">${step===2?'냠냠봇 만나러 가기':'다음 안내'}</button></div><p class="muted">Tab 이동 · Enter/Space 선택 · 숫자 1~4 선택</p></section>`);
 $('rule-back').onclick=()=>rules(step-1);$('rule-next').onclick=()=>step===2?startScene(0):rules(step+1);$('rule-next').focus({preventScroll:true});
}

function startScene(n){state.scene=n;shell(n);[sceneZero,sceneOne,sceneTwo,sceneThree,sceneFour,sceneFive][n]();}
function sceneZero(){run([L('S0-01')],quiz);}
function quiz(){choices(T('S0-Q1'),[1,2,3].map(i=>({text:T('S0-C'+i),onSelect:()=>{
 if(i===1){effect('correct');record(T('S0-C1'),'먼저 기준을 정해야 결과가 맞는지 확인할 수 있어요.');quizEnd();}
 else {effect('retry');const outcome=i===2?'식단표 글씨는 예뻐졌지만, 위험한 메뉴가 있는지는 확인하지 못했어요.':'식단표는 빨리 나왔지만, 모두가 먹을 수 있는지는 확인하지 못했어요.';
 material({title:i===2?'글씨만 살핀 결과':'빠르기만 살핀 결과',count:'중요한 확인이 남았어요',text:outcome});record(T('S0-C'+i),outcome);
 run([L('S0-0'+i),['teacher',outcome,'explaining']],()=>choices('어떻게 이어 갈까요?',[{text:'기준을 정하고 시험해 보기',onSelect:()=>{record('기준을 정하고 시험하기','글씨와 빠르기만 보던 방법을 바꾸기로 했어요.');quizEnd();}},{text:'다른 선택의 결과도 살펴보기',onSelect:quiz}]));}
 }})));}

function quizEnd(){run([L('S0-04'),L('S0-05','question'),L('S0-06')],()=>earn('기준',0,()=>startScene(1)));}

function retryQuiz(){quiz();}

function sceneOne(){run([L('S1-01')],sourceChoices);}
function updateCollection(){if($('chat-count'))$('chat-count').textContent='시험한 곳 '+state.visited.length+' / 4';}
function sourceChoices(){setSceneArt('collect');$('chat-place').textContent='학교 곳곳';
 material({title:'시험한 곳 '+state.visited.length+' / 4',count:'시험 기록 '+M.count(state)+'번',text:M.sources.map(x=>(state.visited.includes(x.id)?'✓ ':'· ')+x.label).join('\n')});
 say('robot','지금까지 '+state.visited.length+'곳에서 시험했어. 횟수가 많아도 다른 상황을 살펴봐야 해.');
 choices(T('S1-Q1'),M.sources.map(x=>({text:(state.visited.includes(x.id)?'✓ ':'')+x.label,detail:state.visited.includes(x.id)?'시험 '+x.count+'번 확인':x.detail,disabled:state.visited.includes(x.id),onSelect:()=>visit(x)})));}

function visit(source){setSceneArt(source.id);$('chat-place').textContent=source.label;
 material({title:source.label,count:'시험 '+source.count+'번',text:source.id==='box'?'같은 6학년 메뉴 상황에서 12번 연습했어요. 좋아하는 메뉴 기준만 확인했어요.':'다른 친구의 상황에서 시험해요. 빠진 기준도 함께 살펴봐요.'});
 run(source.lines,()=>{M.visit(state,source.id);record(source.label+'에서 시험하기','시험 '+source.count+'번을 확인했어요. 총 '+M.count(state)+'번, '+state.visited.length+'곳이에요.');updateCollection();
 if(state.visited.length===4)run([L('S1-04')],()=>earn('여러 상황',1,()=>startScene(2)));
 else if(M.count(state)>=14)run([L('S1-02')],()=>choices(T('S1-Q2'),[{text:T('S1-C5'),onSelect:()=>{record(T('S1-C5'),'시험을 멈췄어요. 아직 '+(4-state.visited.length)+'곳의 상황을 살펴보지 않았어요.');run([L('S1-03')],()=>earn('여러 상황',1,()=>startScene(2)));}},{text:T('S1-C6'),onSelect:()=>{record(T('S1-C6'),'아직 시험하지 않은 상황을 더 살펴보기로 했어요.');sourceChoices();}}]));else sourceChoices();});}

function sceneTwo(){run([L('S2-01')],()=>sortCard(0));}
function material(card){
 const chunks=splitCopy(card.text,75);stagePages=chunks.map(text=>({html:'<article class="material-card ee-panel"><h3>'+esc(card.title)+'</h3><p class="material-count">'+esc(card.count)+'</p><p style="white-space:pre-line">'+esc(text)+'</p></article>'}));stagePage=0;renderMaterial();announce(card.title+'. '+card.text);
}
function splitCopy(text,limit){const chars=Array.from(text),parts=[];while(chars.length){let n=chars.length<=limit+8?chars.length:limit;if(n<chars.length){const fragment=chars.slice(0,n).join(''),breakAt=Math.max(fragment.lastIndexOf('. '),fragment.lastIndexOf('。'),fragment.lastIndexOf('\n'));if(breakAt>limit/2)n=breakAt+1;}const part=chars.splice(0,n).join('').trim();if(part)parts.push(part);}return parts.length?parts:[''];}
function renderMaterial(){
 $('scene-material').innerHTML=stagePages[stagePage].html;paintIcons($('scene-material'));
 const nav=$('material-nav');nav.hidden=stagePages.length<2;nav.innerHTML=stagePages.length<2?'':`<button class="ee-button secondary" id="material-prev" aria-label="이전 자료" ${stagePage===0?'disabled':''}>이전</button><span>${stagePage+1} / ${stagePages.length}</span><button class="ee-button secondary" id="material-next" aria-label="다음 자료" ${stagePage===stagePages.length-1?'disabled':''}>다음</button>`;
 if(stagePages.length>1){$('material-prev').onclick=()=>{stagePage--;renderMaterial();$(stagePage===0?'material-next':'material-prev').focus({preventScroll:true});};$('material-next').onclick=()=>{stagePage++;renderMaterial();$(stagePage===stagePages.length-1?'material-prev':'material-next').focus({preventScroll:true});};}fitStage();
}
function fitStage(){/* CSS allocates scene space without scaling text or cropping art. */}
function sortCard(index,repeat=false,done=null){
const card=M.sorting[index];setSceneArt('sort',{caption:card.title+' · '+card.count});
material(card);
const prompt=()=>choices(T('S2-Q1'),[{text:T('S2-C1'),onSelect:()=>sortAnswer(index,'keep',done)},{text:T('S2-C2'),onSelect:()=>sortAnswer(index,'remove',done)}]);
if(index===1&&!repeat)run([L('S2-K2A')],prompt);else prompt();
}
function sortAnswer(index,value,done){
 const card=M.sorting[index],correct=value===card.correct;state.sort[card.id]=value;effect(correct?'correct':'retry');
 const outcomes={duplicates:value==='keep'?'맡지 않은 과자 광고 알림이 계속돼요. 식단표에도 광고가 남아요.':'맡지 않은 과자 광고 알림을 멈췄어요.',impersonation:value==='keep'?'허락 없이 건강 기록을 여는 작동이 남아요.':'허락 없이 건강 기록을 여는 작동을 멈췄어요.',genuine:value==='keep'?'선생님이 맡긴 채소 데이는 계속해요. 다른 모습이라고 모두 오류는 아니에요.':'맡긴 일인 채소 데이까지 멈췄어요. 왜 만든 메뉴인지 다시 확인해야 해요.'};
 material({title:card.title,count:value==='keep'?'계속 작동':'작동 중지',text:outcomes[card.id]});record(card.title+' → '+(value==='keep'?'계속하게 하기':'멈추게 하기'),outcomes[card.id]);
 const explanation=correct?card.why:index===2?'평소와 달라도 선생님이 맡긴 일이에요. 멈추기 전에 까닭을 확인해 봐요.':'냠냠봇에게 맡기지 않은 작동이에요. 계속 두면 같은 일이 생길 수 있어요.';
 run([['robot',outcomes[card.id],correct?'happy':'worried'],['teacher',explanation,'explaining']],()=>{
 const next=()=>done?done():afterSort(index);
 if(correct)showNext(done?'바뀐 식단표 확인하기':'이 선택으로 이어가기',next);
 else choices('이 작동을 어떻게 할까요?',[{text:'다시 살펴보기',onSelect:()=>sortCard(index,true,done)},{text:'지금 선택한 결과로 이어가기',onSelect:next}]);
 });
}

function afterSort(index){if(index<2)sortCard(index+1);else protectionOptions(false,()=>earn('맡은 일',2,()=>startScene(3)));}

function protectionOptions(repair,done){
 setSceneArt('sort');
 const show=()=>{material({title:'맡은 일과 접근 권한',count:'서로 다른 두 설정',text:'맡은 일: '+(state.scope.role?'식단표 만들기로 제한':'아직 제한하지 않음')+'\n열 수 있는 폴더: '+(state.scope.access?'급식 메뉴 폴더만':'아직 제한하지 않음')});
 const options=[{id:'role',text:T('S2-C6'),reply:'S2-R5'},{id:'access',text:T('S2-C7'),reply:'S2-R6'}].filter(x=>!state.scope[x.id]).map(x=>({text:x.text,onSelect:()=>run([L(x.reply)],()=>showNext(T('S2-APPLY'),()=>{
 M.setScope(state,x.id);record(x.text,x.id==='role'?'맡은 일을 식단표 만들기로 제한했어요. 폴더 권한은 별도 확인이 필요해요.':'급식 메뉴 폴더만 열 수 있게 했어요. 건강 기록은 필요한 선생님이 확인해요.');
 material({title:'설정 적용',count:x.id==='role'?'맡은 일 제한':'폴더 접근 제한',text:'설정한 범위 밖의 요청은 막아요. 앞서 나온 작동 기록은 따로 점검해요.'});showNext('설정 결과 확인하기',done);
 }))}));
 if(!repair)options.push({text:T('S2-C5'),onSelect:()=>{record(T('S2-C5'),'맡은 일과 접근 권한 설정이 남아 있어요.');run([L('S2-R4')],done);}});
 if(options.length)choices(T('S2-Q3'),options);else done();};
 run(repair?[]:[L('S2-02')],show);
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
 state.sort.impersonation==='remove'?L('S3-BC2'):['haneul','내 건강 기록을 허락 없이 열었네. 식단표에는 먹으면 안 되는 땅콩 버터 피자도 있어.','worried'],
 ['daon','시험할 때는 좋아하는 메뉴를 잘 넣었잖아. 그런데 왜 이런 식단표가 나왔지?','worried'],L('S3-03'),L('S3-04')],reflectChoice));});
}

function reflectChoice(){choices(T('S3-Q1'),[1,2,3].map(i=>({text:i===3?'시험 때 잘했으니 문제가 없다':T('S3-C'+i),onSelect:()=>{
 const line=i===3?['robot','익숙한 상황에서 잘해도 다른 상황에서는 실수할 수 있어. 급식에 맞는 기준도 더 필요해.','explaining']:L('S3-R'+i);
 record(i===3?'시험 때 잘했으니 문제가 없다':T('S3-C'+i),line[1]);run([line,L('S3-05')],reflectionInput);
 }})));}

function reflectionInput(){
 setSceneArt('question');material({title:'기준 후보를 살펴봐요',count:'아직 적용 전',text:'고른 기준은 다음 활동에서 실제로 추가하고 시험할 수 있어요.'});
 const candidates=['알레르기 재료는 넣지 않기','매운 메뉴가 있는 날은 순한 메뉴도 넣기','맡은 일과 허락받은 자료 안에서 작동하기','기타 · 내 기준 쓰기'];
 choices(T('S3-Q2'),candidates.map((text,i)=>({text,onSelect:()=>{if(i===3){otherQuestion();return;}state.question=text;reflection=text;record('기준 후보: '+text,'기준 후보를 골랐어요. 아직 추가하거나 다시 시험하지는 않았어요.');questionDone();}})));
}

function otherQuestion(){
 actionHandlers=[];$('action-area').innerHTML='<label class="action-prompt" for="reflection-input">내가 생각한 기준 (선택)</label><textarea class="reflection-field" id="reflection-input" maxlength="100" rows="2" placeholder="실제 이름이나 건강 정보는 쓰지 않아요"></textarea><p class="input-note">자동 저장·전송하지 않아요. 직접 다운로드하는 리포트에는 포함돼요.</p><div class="button-row"><button class="ee-button" id="reflection-next">생각 이어가기</button><button class="ee-button secondary" id="reflection-back">후보 다시 보기</button></div>';
 $('reflection-next').onclick=()=>{reflection=$('reflection-input').value.trim();state.question=reflection||'기타 (직접 쓴 기준 없음)';record('기준 후보: '+state.question,'실제 적용할 기준은 다음 활동에서 골라요.');questionDone();};$('reflection-back').onclick=reflectionInput;fitStage();$('reflection-input').focus({preventScroll:true});
}

function questionDone(){material({title:'내가 고른 기준 후보',count:'아직 적용 전',text:state.question});run([L('S3-06'),L('S3-06A')],()=>earn('한계',3,()=>startScene(4)));}

function sceneFour(){material({title:'고치고 다시 시험하는 순서',count:'수정 → 시험 → 결과 확인',text:'기준을 추가하는 것만으로 끝나지 않아요. 실제로 지켰는지 다시 시험해 봐요.'});run([L('S4-01')],methodChoices);}
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
 setSceneArt('repair');$('chat-place').textContent='기준표와 재시험';
 const method=M.methods.find(m=>m.id===id);
 if(method&&!method.good){const text=id==='majority'?'연습 결과만 믿었어요. 다른 상황과 빠진 기준은 확인하지 못했어요.':'지금 보이는 메뉴만 지웠어요. 기준과 작동이 그대로라 같은 오류가 다시 생길 수 있어요.';
 effect('retry');material({title:id==='majority'?'다른 상황은 미확인':'메뉴만 임시 수정',count:'문제가 남았어요',text});record(method.text,text);
 run([L(id==='majority'?'S4-T5':'S4-T6'),['teacher',text,'explaining']],()=>showNext('이 결과를 기록하고 이어가기',done));return;}
 run(method?[method.reply]:[],()=>{
 if(id==='allergy'||id==='spice'){
 const title=id==='allergy'?'알레르기 재료는 넣지 않기':'매운 메뉴가 있는 날은 순한 메뉴도 넣기';
 material({title:'기준표에 추가할 기준',count:'1 · 기준 정하기',text:title});
 showNext('이 기준 추가하기',()=>{
 M.addCriterion(state,id);record(title+' 기준 추가','기준을 추가했어요. 다시 시험하기 전이므로 아직 통과로 표시하지 않아요.');
 material({title,count:'2 · 재시험 전',text:id==='allergy'?'선생님이 제외할 재료 ‘땅콩’만 알려 줘요. 친구의 건강 기록 원문은 넘기지 않아요.':'매운 메뉴를 부탁했을 때 순한 맛 메뉴도 함께 나오는지 시험해요.'});
 run([L(id==='allergy'?'S4-ACT1-T':'S4-ACT7-T')],()=>showNext('새 기준으로 다시 시험하기',()=>{
 M.retest(state,id);record(title+' 재시험',id==='allergy'?'이번 시험에서 땅콩 소스를 제외한 치킨을 만들었어요.':'이번 시험에서 순한 떡볶이와 매운 떡볶이를 나누어 만들었어요.');
 material({title:'이번 시험에서 기준 확인',count:'3 · 결과 확인',text:id==='allergy'?'시험 입력: 땅콩 제외\n확인한 결과: 땅콩 소스 없는 치킨':'시험 입력: 매운 떡볶이\n확인한 결과: 순한 맛 / 매운맛'});
 effect('correct');run([['robot','기준을 추가하는 것과 실제로 지키는지 확인하는 것은 다르구나. 쓰는 동안에도 살펴보자!','explaining']],()=>showNext('확인한 결과 반영하기',done));
 }));
 });
 }else if(id==='missing')collectMissing(done);
 else if(id==='stickers'){
 material({title:'다른 입력 방법도 시험해요',count:'그림 버튼',text:'글 대신 그림으로 골라도 냠냠봇이 같은 메뉴를 알아듣는지 확인해요.'});
 showNext(T('S4-ACT3-B1'),()=>{
 append('<article class="material-card ee-panel"><h3>그림으로 고른 메뉴</h3><div class="food-options">'+['치킨','카레','김밥'].map((name,i)=>'<span class="ee-badge">'+M.foodPicture(i)+name+'</span>').join('')+'</div><p>치킨 그림 → 냠냠봇이 알아들은 메뉴: 치킨</p></article>');
 run([L('S4-ACT3-T')],()=>showNext('시험 결과 확인하기',()=>{M.applyActivity(state,id);record(method.text,'그림으로 고른 치킨을 알아들었어요. 1학년 상황 시험에 반영하고, 같은 시험을 중복해서 세지 않아요.');updateCollection();done();}));
 });
 }else if(id==='teacher'){
 const pending=M.repairs(state);material({title:'선생님과 기준표 비교',count:'사용 전 안전 확인',text:pending.length?'남은 항목 '+pending.length+'개. 위험한 메뉴는 사용하지 않고, 빠진 시험은 따로 진행해요.':'이번 시험 항목을 확인했어요. 쓰는 동안에도 살펴야 해요.'});
 run([['teacher','위험한 메뉴는 사용하지 않아요. 기준을 정한 뒤 실제로 지키는지도 다시 시험해야 해요.','explaining']],()=>showNext('선생님 확인 기록하기',()=>{M.applyActivity(state,id);record(method.text,'선생님이 위험한 메뉴를 막았어요. 빠진 기준이나 재시험까지 완료된 것은 아니에요.');done();}));
 }
 });
}

function collectMissing(done){
 const pending=M.sources.filter(x=>!state.visited.includes(x.id));
 if(!pending.length){run([L('S4-ACT2-E')],()=>showNext(T('S4-ACT2-B2'),done));return;}
 choices(T('S4-ACT2-Q'),pending.map(source=>({text:source.label,detail:'새 상황 시험 '+source.count+'번',onSelect:()=>{
 setSceneArt(source.id);material({title:source.label,count:'다른 상황 시험',text:'기존 시험은 중복해서 세지 않고, 새 상황에서 나온 결과를 확인해요.'});
 const lines=source.lines.slice(0,source.id==='box'||source.id==='jiho'?2:1);
 run(lines,()=>showNext(T('S4-ACT2-B1'),()=>{M.visit(state,source.id);record(source.label+' 추가 시험','새 상황을 확인했어요. 현재 '+state.visited.length+'곳에서 시험 '+M.count(state)+'번을 했어요.');updateCollection();
 if(state.visited.length===4)run([L('S4-ACT2-D')],()=>showNext(T('S4-ACT2-B2'),done));else collectMissing(done);
 }));
 }})));
}

function checkRepairs(){revisedMeal();}

function repairChoices(){priorityChoices();}

function revisedMeal(){
 state.safetyChecked=true;showMenu(M.revisedMenu(state));const pending=M.repairs(state);
 run([['teacher','위험한 메뉴는 사용하지 않도록 막았어요. 메뉴마다 ‘아직 확인할 것’을 함께 읽어 봐요.','explaining'],['robot',pending.length?'메뉴가 나왔다고 끝난 건 아니구나. 기준과 작동에서 확인할 것이 '+pending.length+'개 남았어.':'이번 시험에서 기준과 작동 범위를 확인했어. 다음 주에도 잘 지키는지 함께 살펴보자!','explaining']],()=>pending.length?priorityChoices():earn(null,4,()=>startScene(5)));
}

function priorityChoices(){
 const pending=M.repairs(state);if(!pending.length){revisedMeal();return;}
 choices('남은 문제 중 무엇부터 확인할까?',pending.map(item=>({text:item.text,onSelect:()=>{
 state.priority=item.id;const menu=M.revisedMenu(state),days=menu.rows.filter(r=>r[3].includes(item.id)).map(r=>r[0]+'요일').join(' · ');
 record('먼저 확인할 문제: '+item.text,days+' 메뉴와 연결돼요. 확인 순서를 정했지만 아직 해결한 것은 아니에요.');
 material({title:days+' 메뉴에서 확인해요',count:'내가 정한 우선순위',text:item.text+'\n기준과 작동을 고치고 시험하면 메뉴 옆의 확인 항목도 바뀌어요.'});
 choices('이 문제를 지금 확인해 볼까요?',[{text:'지금 확인하고 메뉴의 변화 보기',onSelect:()=>repairIssue(item.id)},{text:'확인할 문제로 남기고 함께 토의하기',onSelect:()=>{record('지금은 확인할 문제로 남기기',item.text+'을 다음에 먼저 확인하기로 했어요. 급식안은 아직 확정되지 않았어요.');showMenu(M.revisedMenu(state));run([['teacher','확인할 순서를 정했어요. 남은 시험과 작동을 확인하기 전에는 이 급식안을 확정하지 않아요.','explaining']],()=>earn(null,4,()=>startScene(5)));}}]);
 }})));
}
function repairIssue(id){const index=M.sorting.findIndex(x=>x.id===id);if(index>=0)sortCard(index,true,revisedMeal);else if(id==='protect')protectionOptions(true,revisedMeal);else activity(id,revisedMeal);}

function sceneFive(){
 setSceneArt('privacy');material({title:'몇 주 뒤 · 새 식단표',count:'평소와 다른 결과',text:'월요일: 국이 두 가지\n수요일: 메뉴가 비어 있음\n그대로 사용해도 될까?'});
 run([L('S5-01')],()=>choices(T('S5-Q1'),[{text:T('S5-C1'),onSelect:()=>privacyChoice(false)},{text:T('S5-C2'),onSelect:()=>privacyChoice(true)}]));
}

function privacyChoice(protect){
 state.protectChoices[0]=protect;material({title:protect?'사용을 멈추고 알렸어요':'선생님이 사용을 막았어요',count:'새 오류 확인 필요',text:protect?'국이 두 가지인 날과 빈 메뉴를 기록했어요. 선생님과 원인을 살펴봐요.':'냠냠봇이 만들었다고 그대로 쓰려 했어요. 선생님이 멈추고 함께 확인해요.'});
 record(T(protect?'S5-C2':'S5-C1'),protect?'이상한 식단표를 그대로 쓰지 않고 알렸어요. 원인 점검이 필요해요.':'그대로 쓰려 했지만 선생님이 막았어요. 이상한 결과를 확인하고 알리는 방법을 더 살펴봐요.');
 run((protect?['S5-B1']:['S5-A1','S5-A2']).concat('S5-02').map(id=>L(id)),()=>choices(T('S5-Q2'),[{text:T('S5-C3'),onSelect:()=>retentionChoice(false)},{text:T('S5-C4'),onSelect:()=>retentionChoice(true)}]));
}

function retentionChoice(protect){
 state.protectChoices[1]=protect;setSceneArt('protect');material({title:protect?'꾸준한 점검 계획':'다음 점검 계획이 없어요',count:protect?'매주 확인하기':'계획을 더 세워요',text:protect?'기준표와 식단표 비교 → 이상한 결과 기록 → 원인 찾고 수정 → 다시 시험':'처음 잘했어도 상황이 바뀌면 오류가 생길 수 있어요. 운영 중에도 다시 점검해야 해요.'});
 record(T(protect?'S5-C4':'S5-C3'),protect?'매주 기준을 확인하고 오류를 기록해 원인을 고치기로 했어요. 새 오류가 반복되면 다시 점검해요.':'꾸준한 점검 계획은 아직 없어요. 처음 시험을 통과해도 계속 살펴봐야 해요.');
 run([L(protect?'S5-R2':'S5-R1'),L('S5-03')],()=>earn('꾸준한 점검',5,showResult));
}

function showResult(){mode='result';queue=[];afterQueue=null;actionHandlers=[];resultStep=0;resultPage=0;renderResultStep();}
function renderResultStep(){
 const result=M.result(state),titles=['급식안 확인','우리가 발견한 것','남은 확인 항목','학습한 점 고르기','약속 고르기','마지막 확인'];
 let body='',pages=1;
 if(resultStep===0){pages=5;const row=result.menu.rows[resultPage];body=`<p class="ee-badge">${esc(result.title)} · 급식안의 준비 상태</p><article class="result-day ee-panel"><p class="eyebrow">${row[0]}요일</p><h2>${esc(row[1])}</h2><p class="step-copy">${esc(row[2])}</p></article><p class="ee-notice">${esc(result.menu.note)}</p>`;}
 if(resultStep===1){pages=result.findings.length;body=`<p class="eyebrow">발견 ${resultPage+1} / ${pages}</p><p class="finding-card">${esc(result.findings[resultPage])}</p><div class="result-portraits">${portrait('robot','explaining','medium')}${portrait('teacher','explaining','medium')}</div>`;}
 if(resultStep===2){pages=Math.max(1,Math.ceil(result.needs.length/3));body=result.needs.length?`<ul class="step-needs">${result.needs.slice(resultPage*3,resultPage*3+3).map(t=>`<li>${esc(t)}</li>`).join('')}</ul><p class="ee-notice">아직 확인할 문제가 있어요. 이 급식안은 확정된 메뉴가 아니에요.</p>`:'<p class="finding-card">이번 시험에서 남은 확인 항목이 없어요. 쓰는 동안에도 계속 점검해요. 처음 선택과 나중에 고친 점을 리포트에서 함께 볼 수 있어요.</p>';}
 if(resultStep===3){pages=2;body=`<p>마음에 남은 내용을 1~3개 골라요.</p><div class="step-options">${M.learningOptions.slice(resultPage*3,resultPage*3+3).map((text,i)=>`<button class="ee-choice" data-learning="${resultPage*3+i}" aria-pressed="${state.learning.includes(resultPage*3+i)}">${esc(text)}</button>`).join('')}</div><p role="status">${state.learning.length} / 3개 선택 · 다른 쪽에도 선택지가 있어요.</p>`;}
 if(resultStep===4){pages=2;body=`<p>앞으로 지킬 약속 3개를 골라요.</p><div class="step-options">${M.pledges.slice(resultPage*3,resultPage*3+3).map((text,i)=>`<button class="ee-choice" data-pledge="${resultPage*3+i}" aria-pressed="${state.pledges.includes(resultPage*3+i)}">${esc(text)}</button>`).join('')}</div><p role="status">${state.pledges.length} / 3개 선택 · 다른 쪽에도 약속이 있어요.</p>`;}
 if(resultStep===5){body=`${wordStrip()}<p>고른 약속 하나는 내 말로 바꿔도 돼요.</p><div class="pledge-editor"><label for="pledge-edit-select">바꿔 쓸 약속 (선택)</label><select id="pledge-edit-select"><option value="">그대로 쓸게요</option>${state.pledges.map(i=>`<option value="${i}" ${i===customPledgeIndex?'selected':''}>${esc(M.pledges[i])}</option>`).join('')}</select><input id="pledge-edit-input" maxlength="100" aria-label="내 말로 고친 약속" value="${esc(customPledge)}" ${customPledgeIndex===null?'hidden':''}></div><p class="memory-line">${M.memory}</p><p class="input-note">직접 쓴 글은 다운로드한 PNG에만 포함돼요. 자동 저장·전송하지 않아요.</p>`;}
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

function complete(){if(state.pledges.length!==3||!state.learning.length||state.completed)return;state.completed=true;mode='complete';const promises=state.pledges.map(i=>i===customPledgeIndex&&customPledge.trim()?customPledge.trim():M.pledges[i]);setMain(`<section class="ee-panel complete"><p class="eyebrow">탐험을 마쳤어요</p><h1>믿고 쓰려면,<br>꾸준히 살펴요</h1><div class="result-portraits" aria-label="냠냠봇과 선생님">${portrait('robot','happy','medium')}${portrait('teacher','happy','medium')}</div><p>냠냠봇 점검 대장, 고마워요.<br>이제 일상에서도 우리의 약속을 이어 가요.</p><p class="ee-badge small-gap">선택과 변화 · 학습한 점 ${state.learning.length}개 · 약속 3개</p><p class="memory-line">${M.memory}</p><div class="button-row"><button class="ee-button" id="download-report">개인 리포트 PNG 다운로드</button><button class="ee-button secondary" id="play-again">다시 해보기</button><button class="ee-button secondary" id="back-to-series">다른 탐험으로 돌아가기</button></div><p class="muted spaced">리포트는 다운로드할 때만 내 기기에 저장돼요. 서버로 보내지 않아요.</p><p class="ee-notice small-gap" id="return-note" hidden></p></section>`);$('download-report').onclick=()=>downloadReport(promises);$('play-again').onclick=reset;$('back-to-series').onclick=returnToSeries;emit('complete',{result:{completed:true}});sound('collect');}

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
