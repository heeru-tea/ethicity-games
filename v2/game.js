(function(){'use strict';
const M=window.EthicityDataModel,COMMON='../shared/ethicity-elementary-common-v1',main=document.getElementById('main'),status=document.getElementById('live-status');
let assets,state=M.initial(),chatHistory=[],queue=[],afterQueue=null,actionHandlers=[],mode='loading',busy=false,effectFrame=0,reported=0,reflection='',customPledge='',customPledgeIndex=null,restoreFocus=null;
const motionQuery=matchMedia('(prefers-reduced-motion: reduce)');let reducedMotion=motionQuery.matches;
let typing=null,typingTimer=0,instantText=false,sceneArt=null,sceneSpeaker=null;
const scenePictures={};
const sceneFrames={
 welcome:{background:'cafeteria',cast:['robot','teacher'],caption:'다음 주 급식, 함께 정해요'},
 meet:{background:'cafeteria',cast:['robot','teacher'],caption:'냠냠봇은 어떤 자료로 배울까요?'},
 question:{background:'cafeteria',cast:['robot'],caption:'냠냠봇이 만든 첫 디지털 설문',paper:'question'},
 collect:{background:'courtyard',cast:['robot'],caption:'학교 곳곳의 이야기를 모아요'},
 box:{background:'cafeteria',cast:['robot'],digital:'collection',caption:'온라인 설문함에 모인 응답'},
 jiho:{background:'classroom',cast:['jiho','robot'],caption:'교실에서 지호의 이야기를 들어요'},
 saebom:{background:'classroom',cast:['saebom','robot'],caption:'새봄이가 전하는 1학년 동생의 이야기'},
 haneul:{background:'library',cast:['haneul','robot'],caption:'도서관에서 하늘의 이야기를 들어요'},
 sort:{background:'classroom',cast:['robot'],digital:'sorting',caption:'디지털 응답을 하나씩 확인해요'},
 menu:{background:'cafeteria',cast:['robot'],caption:'아직 먹기 전! 함께 살펴볼 급식표'},
 repair:{background:'classroom',cast:['teacher','robot'],caption:'함께 먹을 수 있는 방법을 찾아요'},
 revised:{background:'cafeteria',cast:['daon','haneul','saebom'],caption:'친구들의 이야기를 듣고 바뀐 급식'},
 privacy:{background:'classroom',cast:['onyu','teacher'],caption:'온유가 디지털 설문를 궁금해해요'},
 protect:{background:'classroom',cast:['teacher'],digital:'protected',caption:'접근을 제한하고 안전하게 보관해요'}
};
const $=id=>document.getElementById(id);
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function emit(type,extra={}){const detail={type:'ethicity:'+type,gameId:'data',...extra};window.dispatchEvent(new CustomEvent(detail.type,{detail}));if(window.parent!==window)window.parent.postMessage(detail,'*');}
function announce(text){status.textContent='';requestAnimationFrame(()=>{status.textContent=text;});}
function icon(id,size=32){return `<canvas class="ee-icon" width="64" height="64" data-icon="${id}" style="width:${size}px;height:${size}px" aria-hidden="true"></canvas>`;}
function paintIcons(root=document){if(!assets)return;root.querySelectorAll('canvas[data-icon]').forEach(c=>assets.drawIcon(c.getContext('2d'),c.dataset.icon,0,0,64));}
function portrait(id,expression='neutral',size=''){const c=ETHICITY_COMMON_MANIFEST.characters[id],index=Math.max(0,c.expressions.indexOf(expression));return `<span class="portrait ${size}" style="--portrait-index:${index}" aria-hidden="true"><img src="${COMMON}/${c.portraits}" alt="" draggable="false"></span>`;}
function setMain(html){finishTyping(false);cancelAnimationFrame(effectFrame);document.getElementById('feedback-effect').hidden=true;main.innerHTML=html;paintIcons(main);main.focus({preventScroll:true});window.scrollTo(0,0);}
function sound(id='tap'){if(assets)void assets.playSound(id);}
function effect(id){cancelAnimationFrame(effectFrame);const canvas=$('feedback-effect'),ctx=canvas.getContext('2d');canvas.hidden=false;const anchor=document.getElementById('chat-place')?.getBoundingClientRect();canvas.style.left=Math.min(innerWidth-72,(anchor?.right||innerWidth-100)+8)+'px';canvas.style.top=Math.max(8,(anchor?.top||100)-16)+'px';const start=performance.now();function draw(now){ctx.clearRect(0,0,128,128);if(assets.drawEffect(ctx,id,64,64,now-start,96,reducedMotion))effectFrame=requestAnimationFrame(draw);else canvas.hidden=true;}draw(start);sound(id==='correct'?'win':'retry');}
function reset(){state=M.initial();chatHistory=[];queue=[];afterQueue=null;actionHandlers=[];reflection='';customPledge='';customPledgeIndex=null;reported=0;cancelAnimationFrame(effectFrame);$('feedback-effect').hidden=true;showStart();}
function showStart(){mode='start';setMain(`<section class="landing" aria-labelledby="game-title"><div class="landing-copy"><p class="eyebrow">데이터 관리 · 대화 탐험</p><h1 id="game-title">급식 메뉴 AI<br>‘냠냠봇’</h1><p class="lead">${esc(M.T('ST-03'))}</p><p>${esc(M.T('ST-04'))}</p><div class="button-row"><button class="ee-button" id="start-game">탐험 시작 ${icon('arrow_right',24)}</button></div><div class="landing-note">초등 3~4학년 · 약 8~10분<br>이름을 입력하지 않아요. 기록도 저장하지 않아요.</div></div><div class="landing-art" aria-label="공식 학교 급식실과 안내 로봇 냠냠봇"><img src="${COMMON}/backgrounds/cafeteria.png" alt="따뜻한 학교 급식실"><span class="art-label">우리가 함께 정하는 급식 · v2</span><p class="hero-callout">${esc(M.T('ST-07'))}</p><div class="hero-robot">${portrait('robot','happy','large')}</div></div></section><div class="landing-bottom"><p><strong>관찰하고</strong>친구들의 이야기를 들어요</p><p><strong>선택하고</strong>어떤 일이 생기는지 봐요</p><p><strong>함께 정리해요</strong>낱말 카드 5장을 모아요</p></div>`);$('start-game').onclick=()=>{sound();intro();};}
function wordStrip(){return `<div class="word-strip" aria-label="모은 낱말 카드 ${state.words.length}장, 전체 5장">${M.words.map((w,i)=>`<div class="word-card ee-badge ${state.words.includes(w)?'earned':''}" aria-label="${esc(w)} ${state.words.includes(w)?'모았어요':'아직 모으지 않았어요'}"><span class="word-check" aria-hidden="true">${state.words.includes(w)?'✓':'·'}</span><span>${i===3?'한쪽으로<br>치우친 데이터':w}</span></div>`).join('')}</div>`;}
function shell(scene,introMode=false){
 mode=introMode?'intro':'game';
 const info=introMode?{title:'냠냠봇의 부탁',goal:'모두가 맛있고 안전하게 먹으려면 어떤 이야기가 필요할까요?',place:'학교 급식실'}:M.scenes[scene];
 setMain((introMode?'':wordStrip())+
 '<div class="game-layout '+(introMode?'intro-layout':'')+'"><aside class="scene-sidebar" aria-label="현재 장면">'+
 '<figure class="scene-art"><div class="scene-view"><img id="scene-image" class="scene-image" alt=""><canvas id="scene-cast" width="1280" height="720" aria-hidden="true"></canvas><div id="scene-material"></div></div><figcaption id="scene-caption"></figcaption></figure>'+
 '<div class="scene-info"><p class="scene-tag">'+(introMode?'탐험 준비':'장면 '+scene+' / 5')+'</p><h1 class="scene-title">'+info.title+'</h1><p class="scene-goal">'+info.goal+'</p><div id="scene-speaker" class="scene-speaker"></div></div>'+
 '<p class="scene-note">우리의 선택이 냠냠봇의 급식을 바꿔요.<br>먹기 전에는 선생님이 확인해요.</p></aside>'+
 '<section class="messenger ee-panel" aria-label="냠냠봇과 대화"><div class="chat-header"><strong id="chat-place">'+info.place+'</strong><small id="chat-count">'+(introMode?'함께 시작해요':'의견을 들은 곳 '+state.visited.length+' / 4')+'</small></div>'+
 '<div class="conversation-log" id="conversation-log" tabindex="0" aria-label="지난 대화. 위로 스크롤해 다시 읽을 수 있어요"></div><button class="scroll-hint ee-button secondary" id="latest-message" hidden>새 대화 보기 ↓</button><div class="action-area" id="action-area"></div></section></div>');
 sceneSpeaker=null;setSceneArt(introMode?'welcome':['meet','collect','sort','menu','repair','privacy'][scene]);
 $('conversation-log').innerHTML=chatHistory.join('');paintIcons($('conversation-log'));scrollLog(true);system(introMode?'냠냠봇의 부탁':'장면 '+scene+' · '+info.title);
 $('latest-message').onclick=()=>scrollLog(true);
 $('conversation-log').addEventListener('click',e=>{
  if(e.target.closest('button,a,input,textarea,select'))return;
  const selection=window.getSelection();if(selection&&!selection.isCollapsed)return;
  const log=$('conversation-log');
  if(log.scrollHeight-log.scrollTop-log.clientHeight<60)$('next-line')?.click();
 });
 $('conversation-log').addEventListener('scroll',()=>{const log=$('conversation-log');if(log.scrollHeight-log.scrollTop-log.clientHeight<30)$('latest-message').hidden=true;});
}
function setSceneArt(key,{caption,material}={}){
 if(!$('scene-image'))return;
 sceneArt={key,...sceneFrames[key]};
 const image=$('scene-image');
 image.src=sceneArt.picture?scenePictures[sceneArt.picture]:COMMON+'/backgrounds/'+sceneArt.background+'.png';
 image.alt=caption||sceneArt.caption;
 image.dataset.scene=key;
 $('scene-caption').textContent=caption||sceneArt.caption;
 $('scene-material').innerHTML=material||(sceneArt.digital?digitalPanel(sceneArt.digital):'')||(sceneArt.paper?'<div class="scene-paper ee-panel"><strong>냠냠봇 디지털 설문</strong><p>좋아하는 급식 메뉴는?</p><span class="paper-line"></span></div>':'');
 paintIcons($('scene-material'));paintSceneCast();
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
function scrollLog(force=false){const log=$('conversation-log');if(!log)return;if(force){log.scrollTop=log.scrollHeight;$('latest-message').hidden=true;}}
function append(html,label=''){chatHistory.push(html);const log=$('conversation-log');if(!log)return;const near=log.scrollHeight-log.scrollTop-log.clientHeight<70;log.insertAdjacentHTML('beforeend',html);paintIcons(log);if(near)scrollLog(true);else $('latest-message').hidden=false;if(label)announce(label);}
function say(id,text,expression='neutral',frame){
 finishTyping(false);if(frame)setSceneArt(frame);setSceneSpeaker(id,expression);
 const name=id==='me'?'나':M.people[id],label=`${name}. ${text}`;
 // History always keeps the complete, escaped sentence. Only the current DOM line types.
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
 if(near)scrollLog(true);updateNextLabel();if(read)announce(current.label);return true;
}
function typeCharacter(){
 if(!typing)return;
 const current=typing,log=$('conversation-log'),near=log&&log.scrollHeight-log.scrollTop-log.clientHeight<70;
 current.bubble.textContent=current.characters.slice(0,++current.index).join('');
 if(near)scrollLog(true);else if($('latest-message'))$('latest-message').hidden=false;
 if(current.index===current.characters.length){finishTyping();return;}
 typingTimer=setTimeout(typeCharacter,/[.!?…。]/.test(current.characters[current.index-1])?140:30);
}
function system(text){append(`<p class="system-message">${esc(text)}</p>`,text);}
function run(lines,done){finishTyping(false);queue=lines.slice();afterQueue=done;nextLine();}
function nextLine(){if(busy)return;if(finishTyping())return;if(queue.length){const line=queue.shift();say(...line);showNext();}else if(afterQueue){const fn=afterQueue;afterQueue=null;fn();}}
function showNext(label='다음',fn=nextLine){pinAfterLayout();$('action-area').classList.remove('method-actions');actionHandlers=[];const area=$('action-area');area.innerHTML=`<div class="next-row"><span class="muted">대화창 탭 또는 Space<br>한 번 더 누르면 다음 대사</span><button class="ee-button" id="next-line" data-label="${esc(label)}"><span class="next-label">${label}</span> ${icon('arrow_right',20)}</button></div>`;paintIcons(area);updateNextLabel();$('next-line').onclick=()=>{sound();if(!finishTyping())fn();};$('next-line').focus({preventScroll:true});}
function choices(prompt,items,{multiple=false,selected=[],focus=true}={}){pinAfterLayout();$('action-area').classList.remove('method-actions');actionHandlers=[];const area=$('action-area');area.innerHTML=`<p class="action-prompt">${esc(prompt)}</p><div class="choices">${items.map((x,i)=>`<button class="ee-choice choice-control" data-choice="${i}" ${x.disabled?'disabled':''} ${multiple?`aria-pressed="${selected.includes(x.id)}"`:''}><span class="key-hint" aria-hidden="true">${i<4?i+1:'·'}</span><span>${multiple?`<span class="check-marker" aria-hidden="true">${selected.includes(x.id)?'✓ ':'□ '}</span>`:''}${esc(x.text)}${x.detail?`<small>${esc(x.detail)}</small>`:''}</span></button>`).join('')}</div>`;area.querySelectorAll('[data-choice]').forEach((b,i)=>{const handler=()=>{if(b.disabled||busy)return;sound();if(!multiple){actionHandlers=[];say('me',items[i].text);}items[i].onSelect();};b.onclick=handler;actionHandlers[i]=handler;});if(focus)area.querySelector('button:not(:disabled)')?.focus({preventScroll:true});}
function earn(word,scene,next){if(word&&!state.words.includes(word)){state.words.push(word);system(`낱말 카드 ‘${word}’를 모았어요.`);const strip=main.querySelector('.word-strip');if(strip)strip.outerHTML=wordStrip();sound('collect');}const current=scene+1;if(current>reported){reported=current;emit('progress',{current,total:6});}showNext(scene===5?'학습한 내용 정리하기':'다음 이야기',next);}
const T=M.T,L=M.L;
function intro(){shell(-1,true);run(['IN-01','IN-02','IN-02A','IN-03','IN-04'].map(id=>L(id)),()=>showNext(T('IN-B1'),rules));}
function rules(){mode='rules';setMain('<section class="ee-panel rules-card"><p class="eyebrow">탐험 방법</p><h1>읽기, 선택하기, 함께 생각하기</h1><ol class="rule-list">'+[['RU-02','RU-03'],['RU-04','RU-05'],['RU-06','RU-07']].map(([a,b],i)=>'<li><span class="rule-number">'+(i+1)+'</span><div><strong>'+esc(T(a))+'</strong><p>'+esc(T(b))+'</p></div></li>').join('')+'</ol><p class="ee-notice">게임 속 설문 응답은 미리 만든 가상의 자료예요. 실제 이름이나 건강 정보는 입력하지 않아요.</p><p class="muted spaced">Tab 이동 · Enter/Space 선택 · 숫자 1~4로 앞의 선택지 고르기 · Space 다음 대사<br>추가 점검을 하면 플레이 시간이 더 길어질 수 있어요.</p><button class="ee-button spaced" id="begin-scenes">'+T('RU-B1')+'</button></section>');$('begin-scenes').onclick=()=>startScene(0);}
function startScene(n){state.scene=n;shell(n);[sceneZero,sceneOne,sceneTwo,sceneThree,sceneFour,sceneFive][n]();}
function sceneZero(){run([L('S0-01')],quiz);}
function quiz(){choices(T('S0-Q1'),[{
text:T('S0-C1'),onSelect:()=>{effect('correct');run([L('S0-04'),L('S0-05','question'),L('S0-06')],()=>earn('데이터',0,()=>startScene(1)));}},
{text:T('S0-C2'),onSelect:()=>retryQuiz('S0-02')},{text:T('S0-C3'),onSelect:()=>retryQuiz('S0-03')}]);}
function retryQuiz(id){effect('retry');run([L(id)],quiz);}
function sceneOne(){run([L('S1-01')],sourceChoices);}
function updateCollection(){if($('chat-count'))$('chat-count').textContent='의견을 들은 곳 '+state.visited.length+' / 4';}
function sourceChoices(){setSceneArt('collect');choices(T('S1-Q1'),M.sources.map(x=>({text:(state.visited.includes(x.id)?'✓ ':'')+x.label,detail:state.visited.includes(x.id)?'응답 '+x.count+'개 확인':x.detail,disabled:state.visited.includes(x.id),onSelect:()=>visit(x)})));}
function visit(source){setSceneArt(source.id);$('chat-place').textContent=source.label;run(source.lines,()=>{M.visit(state,source.id);updateCollection();system(source.label+' · 응답 '+source.count+'개 확인. 지금까지 '+M.count(state)+'개!');if(state.visited.length===4)run([L('S1-04')],()=>earn('수집',1,()=>startScene(2)));else if(M.count(state)>=14)run([L('S1-02')],()=>choices(T('S1-Q2'),[{text:T('S1-C5'),onSelect:()=>run([L('S1-03')],()=>earn('수집',1,()=>startScene(2)))},{text:T('S1-C6'),onSelect:sourceChoices}]));else sourceChoices();});}
function sceneTwo(){run([L('S2-01')],()=>sortCard(0));}
function material(card){append('<article class="material-card ee-panel"><div class="material-top"><h3>'+esc(card.title)+'</h3>'+icon('notebook',32)+'</div><p class="material-count">'+esc(card.count)+'</p><p style="white-space:pre-line">'+esc(card.text)+'</p></article>',card.title+'. '+card.text);}
function sortCard(index,repeat=false,done=null){
const card=M.sorting[index];setSceneArt('sort',{caption:card.title+' · '+card.count});
if(!repeat)material(card);
const prompt=()=>choices(T('S2-Q1'),[{text:T('S2-C1'),onSelect:()=>sortAnswer(index,'keep',done)},{text:T('S2-C2'),onSelect:()=>sortAnswer(index,'remove',done)}]);
if(index===1&&!repeat)run([L('S2-K2A')],prompt);else prompt();
}
function sortAnswer(index,value,done){const card=M.sorting[index],correct=value===card.correct;
effect(correct?'correct':'retry');
const advance=()=>{state.sort[card.id]=value;if(done)done();else afterSort(index);};
run([['robot',card.why,correct?'happy':'explaining']],()=>{if(correct)showNext(done?T('S4-FIX-B'):T('S2-B1'),advance);else choices(T('S2-Q2'),[{text:T('S2-C3'),onSelect:()=>sortCard(index,true,done)},{text:T('S2-C4'),detail:'급식표에서 어떤 일이 생기는지 살펴봐요',onSelect:advance}]);});}
function afterSort(index){if(index<2)sortCard(index+1);else protectionOptions(false,()=>earn('정리',2,()=>startScene(3)));}
function protectionOptions(repair,done){
setSceneArt('box');run(repair?[]:[L('S2-02')],()=>choices(T('S2-Q3'),(repair?['one','locked']:['open','one','locked']).map(value=>{
const ids={open:['S2-C5','S2-R4'],one:['S2-C6','S2-R5'],locked:['S2-C7','S2-R6']}[value];
return {text:T(ids[0]),onSelect:()=>run([L(ids[1])],()=>{if(value==='open'){state.boxProtection=value;done();}else showNext(T(repair?'S4-FIX7-B':'S2-APPLY'),()=>{state.boxProtection=value;done();});})};
})));
}
function menuHTML(menu){return '<article class="material-card ee-panel"><div class="material-top"><h3>'+esc(menu.title)+'</h3>'+icon('notebook',28)+'</div><ul class="menu-list">'+menu.rows.map(r=>'<li><strong class="day">'+r[0]+'</strong><span class="food">'+esc(r[1])+(r[2]?'<small>'+esc(r[2])+'</small>':'')+'</span></li>').join('')+'</ul><p class="safe-label">'+esc(menu.note)+'</p></article>';}
function showMenu(menu){setSceneArt(menu.kind==='revised'?'revised':'menu',{material:'<div class="scene-paper scene-menu ee-panel"><strong>'+esc(menu.title)+'</strong>'+menu.rows.map(r=>'<p><b>'+r[0]+'</b><span>'+esc(r[1])+'</span></p>').join('')+'</div>'});append(menuHTML(menu),menu.title+'. '+menu.rows.map(r=>r[0]+'요일 '+r[1]).join('. ')+'. '+menu.note);}
function sceneThree(){
M.capture(state);const first=M.initialMenu(state);
run([L('S3-01')],()=>{showMenu(first);showNext(T('S3-B1'),()=>run([
L(state.sort.duplicates==='remove'?'S3-BC1':'S3-A1'),
L(state.sort.impersonation==='remove'?'S3-BC2':'S3-A2'),
L('S3-02'),L('S3-03'),L('S3-04')],reflectChoice));});
}
function reflectChoice(){choices(T('S3-Q1'),[1,2,3].map(i=>({text:T('S3-C'+i),onSelect:()=>run([L('S3-R'+i),L('S3-05')],reflectionInput)})));}
function reflectionInput(){
pinAfterLayout();actionHandlers=[];$('action-area').innerHTML='<label class="action-prompt" for="reflection-input">'+T('S3-Q2')+'</label><textarea class="reflection-field" id="reflection-input" maxlength="160" rows="2" placeholder="'+esc(T('S3-IN1'))+'" aria-describedby="reflection-note"></textarea><p class="input-note" id="reflection-note">'+esc(T('S3-IN2'))+'</p><div class="button-row"><button class="ee-button" id="reflection-next">'+T('S3-B2')+'</button><button class="ee-button secondary" id="reflection-skip">'+T('S3-B3')+'</button></div>';
const finish=skip=>{reflection=skip?'':$('reflection-input').value.trim();if(reflection)say('me',reflection);else system(T('S3-N1'));run([L('S3-06'),L('S3-06A')],()=>earn('한쪽으로 치우친 데이터',3,()=>startScene(4)));};
$('reflection-next').onclick=()=>finish(false);$('reflection-skip').onclick=()=>finish(true);$('reflection-input').focus({preventScroll:true});
}
function sceneFour(){run([L('S4-01')],methodChoices);}
function methodChoices(focusId){
choices('방법 2개 고르기 · 지금 '+state.methods.length+'개 골랐어요',M.methods.map(m=>({id:m.id,text:m.text,onSelect:()=>{
if(!m.good){say('me',m.text);effect('retry');run([L(m.id==='majority'?'S4-T5':'S4-T6'),L('S4-T7')],methodChoices);return;}
if(state.methods.includes(m.id))state.methods=state.methods.filter(id=>id!==m.id);
else if(state.methods.length<2)state.methods.push(m.id);else{announce(T('S4-A1'));return;}
methodChoices(m.id);
}})),{multiple:true,selected:state.methods,focus:!focusId});
$('action-area').classList.add('method-actions');const footer=document.createElement('div');footer.className='next-row small-gap';footer.innerHTML='<span class="muted">아래로 내려<br>다른 방법도 살펴봐요</span><button class="ee-button" id="confirm-methods" '+(state.methods.length!==2?'disabled':'')+'>'+T('S4-B1')+'</button>';$('action-area').append(footer);
$('confirm-methods').onclick=confirmMethods;
if(focusId)$('action-area').querySelector('[data-choice="'+M.methods.findIndex(m=>m.id===focusId)+'"]')?.focus({preventScroll:true});
}
function confirmMethods(){state.methods.forEach(id=>say('me',M.methods.find(m=>m.id===id).text));effect('correct');
const steps=[...state.methods];const next=()=>{const id=steps.shift();if(id)activity(id,next);else checkRepairs();};next();}
function activity(id,done){
setSceneArt('repair');$('chat-place').textContent='개선 활동';
const method=M.methods.find(m=>m.id===id),finish=()=>{M.applyActivity(state,id);updateCollection();system('✓ '+method.text);showNext(T('S4-FIX-B'),done);};
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
M.visit(state,source.id);updateCollection();system(source.label+' 응답 확인 · 총 '+M.count(state)+'개');
if(state.allergy||state.spice)system('이미 추가한 질문의 응답도 선생님과 확인했어요.');
if(state.visited.length===4)run([L('S4-ACT2-D')],()=>showNext(T('S4-ACT2-B2'),done));else collectMissing(done);
}));
}})));
}
function checkRepairs(){
setSceneArt('repair');$('chat-place').textContent='추가 점검';const remaining=M.repairs(state);
if(!remaining.length){system(T('S4-CHECK-D'));showNext(T('S4-CHECK-B'),revisedMeal);return;}
material({title:'지금 남은 점검 항목',count:remaining.length+'개',text:remaining.map(x=>'• '+x.text).join('\n')});
choices(T('S4-CHECK-Q'),[{text:T('S4-CHECK-C1'),onSelect:repairChoices},{text:T('S4-CHECK-C2'),onSelect:revisedMeal}]);
}
function repairChoices(){choices('어떤 항목을 더 고칠까요?',M.repairs(state).map(item=>({text:item.text,onSelect:()=>{
const index=M.sorting.findIndex(x=>x.id===item.id);
if(index>=0)sortCard(index,false,checkRepairs);
else if(item.id==='protect')protectionOptions(true,checkRepairs);
else activity(item.id,checkRepairs);
}})).concat({text:T('S4-CHECK-C2'),onSelect:revisedMeal}));}
function revisedMeal(){
run([L('S4-02')],()=>{state.safetyChecked=true;showMenu(M.revisedMenu(state));run(['S4-03','S4-04','S4-05'].map(id=>L(id)),()=>earn(null,4,()=>startScene(5)));});
}
function sceneFive(){run([L('S5-01')],()=>choices(T('S5-Q1'),[{text:T('S5-C1'),onSelect:()=>privacyChoice(false)},{text:T('S5-C2'),onSelect:()=>privacyChoice(true)}]));}
function privacyChoice(protect){
state.protectChoices[0]=protect;setSceneArt('protect');
run((protect?['S5-B1']:['S5-A1','S5-A2']).concat('S5-02').map(id=>L(id)),()=>choices(T('S5-Q2'),[{text:T('S5-C3'),onSelect:()=>retentionChoice(false)},{text:T('S5-C4'),onSelect:()=>retentionChoice(true)}]));
}
function retentionChoice(protect){state.protectChoices[1]=protect;setSceneArt('protect',{caption:T('S5-CAP2')});run([L(protect?'S5-R2':'S5-R1'),L('S5-03')],()=>earn('관리',5,showResult));}


function showResult(){mode='result';queue=[];afterQueue=null;actionHandlers=[];const result=M.result(state);setMain(`<section aria-labelledby="result-title"><div class="result-top"><div><p class="eyebrow">우리가 함께 만든 변화</p><h1 id="result-title">${result.title}</h1><p class="muted small-gap">이 이름은 냠냠봇 급식표의 준비 상태를 말해요.<br>당신의 점수나 등급이 아니에요.</p></div><div class="result-portraits" aria-label="냠냠봇과 선생님">${portrait('robot','happy','medium')}${portrait('teacher','happy','medium')}</div></div><div class="result-grid"><section class="ee-panel"><h2>냠냠봇의 최종 급식표</h2>${menuHTML(result.menu)}<p class="ee-notice">${esc(result.note)}</p></section><section class="ee-panel"><h2>우리가 발견한 것</h2><ul class="findings">${result.findings.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>${result.needs.length?`<h3 class="spaced">다음에 함께 살펴볼 것</h3><ul class="findings">${result.needs.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<p class="ee-success spaced">여러 친구의 의견과 안전, 소중한 정보를 함께 생각했어요.</p>'}</section></div><section class="result-section"><h2>모은 낱말 카드 5장</h2><div class="small-gap">${wordStrip()}</div></section><section class="ee-panel result-section"><h2>나의 데이터 약속 3가지</h2><p class="muted small-gap">마음에 남은 약속을 3개 골라요. 하나는 내 말로 고쳐 써도 돼요.</p><p class="small-gap" id="pledge-count" role="status">0 / 3개 골랐어요</p><div class="pledge-grid" id="pledge-grid">${M.pledges.map((p,i)=>`<button class="ee-choice" data-pledge="${i}" aria-pressed="false"><span aria-hidden="true">□ </span>${esc(p)}</button>`).join('')}</div><div class="pledge-editor" id="pledge-editor" hidden><label for="pledge-edit-select">고른 약속 하나를 내 말로 바꾸기 (선택)</label><select id="pledge-edit-select"><option value="">그대로 쓸게요</option></select><input id="pledge-edit-input" maxlength="100" placeholder="내가 지킬 약속을 짧게 써요" aria-label="내 말로 고친 약속" hidden><p class="input-note">실제 이름이나 건강 정보는 쓰지 않아요. 직접 쓴 글은 이 화면에서만 사용해요.</p></div><button class="ee-button" id="finish-game" disabled>약속 3개를 고르면 마칠 수 있어요</button></section><section class="ee-panel result-section"><h2>기억할 한 문장</h2><p class="memory-line">많은 사람의 의견과 모두의 의견은 달라요.<br>데이터는 고르게 모으고, 소중하게 지켜요.</p></section></section>`);main.querySelectorAll('[data-pledge]').forEach(b=>b.onclick=()=>togglePledge(Number(b.dataset.pledge)));$('pledge-edit-select').onchange=()=>{const value=$('pledge-edit-select').value;customPledgeIndex=value===''?null:Number(value);customPledge='';$('pledge-edit-input').value='';$('pledge-edit-input').hidden=customPledgeIndex===null;if(customPledgeIndex!==null){$('pledge-edit-input').value=M.pledges[customPledgeIndex];$('pledge-edit-input').focus();}};$('pledge-edit-input').oninput=e=>{customPledge=e.target.value;};$('finish-game').onclick=complete;updatePledges();}
function togglePledge(i){sound();if(state.pledges.includes(i))state.pledges=state.pledges.filter(x=>x!==i);else if(state.pledges.length<3)state.pledges.push(i);else {announce('약속은 3개 골라요. 고른 약속을 다시 누르면 바꿀 수 있어요.');return;}if(customPledgeIndex!==null&&!state.pledges.includes(customPledgeIndex)){customPledgeIndex=null;customPledge='';$('pledge-edit-input').value='';$('pledge-edit-input').hidden=true;}updatePledges();}
function updatePledges(){main.querySelectorAll('[data-pledge]').forEach(b=>{const picked=state.pledges.includes(Number(b.dataset.pledge));b.setAttribute('aria-pressed',String(picked));b.querySelector('span').textContent=picked?'✓ ':'□ ';});$('pledge-count').textContent=`${state.pledges.length} / 3개 골랐어요`;$('pledge-editor').hidden=state.pledges.length===0;$('pledge-edit-select').innerHTML='<option value="">그대로 쓸게요</option>'+state.pledges.map(i=>`<option value="${i}">${esc(M.pledges[i])}</option>`).join('');$('pledge-edit-select').value=customPledgeIndex===null?'':String(customPledgeIndex);$('finish-game').disabled=state.pledges.length!==3;$('finish-game').textContent=state.pledges.length===3?'약속하고 탐험 마치기':'약속 3개를 고르면 마칠 수 있어요';}
function complete(){if(state.pledges.length!==3||state.completed)return;state.completed=true;mode='complete';const promises=state.pledges.map(i=>i===customPledgeIndex&&customPledge.trim()?customPledge.trim():M.pledges[i]);setMain(`<section class="ee-panel complete"><p class="eyebrow">탐험을 마쳤어요</p><h1>함께 먹는 급식,<br>함께 지키는 데이터</h1><div class="result-portraits" aria-label="냠냠봇과 선생님">${portrait('robot','happy','medium')}${portrait('teacher','happy','medium')}</div><p>급식 의견 모으기 대장, 고마워요.<br>이제 일상에서도 우리의 약속을 이어 가요.</p><ul class="complete-pledges">${promises.map(p=>`<li>${esc(p)}</li>`).join('')}</ul><p class="memory-line">많은 사람의 의견과 모두의 의견은 달라요.<br>데이터는 고르게 모으고, 소중하게 지켜요.</p><div class="button-row"><button class="ee-button" id="play-again">다시 해보기</button><button class="ee-button secondary" id="back-to-series">다른 탐험으로 돌아가기</button></div><p class="muted spaced">진행과 직접 쓴 글은 저장되지 않아요.</p><p class="ee-notice small-gap" id="return-note" hidden></p></section>`);$('play-again').onclick=reset;$('back-to-series').onclick=returnToSeries;emit('complete',{result:{completed:true}});sound('collect');reflection='';customPledge='';}
function returnToSeries(){const note=$('return-note');if(window.parent!==window){emit('exit');note.textContent='탐험을 마쳤어요. 통합 페이지의 게임 목록으로 돌아갈 수 있어요.';}else if(document.referrer){try{const previous=new URL(document.referrer);if(previous.origin===location.origin&&previous.pathname!==location.pathname){location.assign(previous.href);return;}}catch{}}note.hidden=false;if(!note.textContent)note.textContent='이 게임을 연 윤리시티 목록 탭으로 돌아가 다른 탐험을 골라 주세요.';note.focus?.();announce(note.textContent);}
function openDialog(id){finishTyping();restoreFocus=document.activeElement;$(id).showModal();}
function closeDialog(id){$(id).close();restoreFocus?.focus?.({preventScroll:true});}
$('brand-home').onclick=e=>{e.preventDefault();if(['start','loading'].includes(mode))return;if(mode==='complete'){reset();return;}openDialog('restart-dialog');};
$('open-settings').onclick=()=>openDialog('settings-dialog');$('close-settings').onclick=()=>closeDialog('settings-dialog');$('cancel-restart').onclick=()=>closeDialog('restart-dialog');$('confirm-restart').onclick=()=>{$('restart-dialog').close();reset();};
$('sound-setting').onchange=async e=>{assets?.setSound(e.target.checked);if(e.target.checked&&!await assets?.playSound('tap'))announce('소리를 재생하지 못했어요. 게임은 계속할 수 있어요.');};
function setMotion(value){reducedMotion=value;if(value)finishTyping();document.body.classList.toggle('reduced-motion',value);$('motion-setting').checked=value;}
$('typing-setting').onchange=e=>{instantText=e.target.checked;if(instantText)finishTyping();};
setMotion(reducedMotion);$('motion-setting').onchange=e=>setMotion(e.target.checked);motionQuery.addEventListener('change',e=>setMotion(e.matches));
document.addEventListener('keydown',e=>{if(e.repeat||e.ctrlKey||e.altKey||e.metaKey||document.querySelector('dialog[open]'))return;const tag=e.target.tagName;if(['INPUT','TEXTAREA','SELECT'].includes(tag)||e.target.isContentEditable)return;if(/^[1-4]$/.test(e.key)&&actionHandlers[Number(e.key)-1]){e.preventDefault();actionHandlers[Number(e.key)-1]();return;}if(e.code==='Space'&&!e.target.closest('button,a')){const next=$('next-line');if(next){e.preventDefault();next.click();}}});
async function boot(){try{if(!window.ETHICITY_COMMON_MANIFEST||!window.EthicityAssets)throw Error('공통 패키지를 찾지 못했어요.');assets=await EthicityAssets.load(ETHICITY_COMMON_MANIFEST,COMMON);await Promise.all(Object.values(scenePictures).map(src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=()=>reject(Error('장면 그림을 찾지 못했어요: '+src));image.src=src;})));paintIcons();showStart();emit('ready');}catch(error){setMain('<div class="ee-panel loading"><h1>공통 자료를 불러오지 못했어요</h1><p class="small-gap">게임 폴더와 shared 폴더를 함께 열어 주세요.</p><p class="muted small-gap" id="load-error"></p><button class="ee-button spaced" id="reload-game">다시 불러오기</button></div>');$('load-error').textContent=error.message;$('reload-game').onclick=()=>location.reload();}}
void boot();
})();
