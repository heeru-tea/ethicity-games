(function(){'use strict';
const M=window.EthicityDataModel,COMMON='../shared/ethicity-elementary-common-v1',main=document.getElementById('main'),status=document.getElementById('live-status');
let assets,state=M.initial(),chatHistory=[],queue=[],afterQueue=null,actionHandlers=[],mode='loading',busy=false,effectFrame=0,reported=0,reflection='',customPledge='',customPledgeIndex=null,restoreFocus=null;
const motionQuery=matchMedia('(prefers-reduced-motion: reduce)');let reducedMotion=motionQuery.matches;
let typing=null,typingTimer=0,instantText=false,sceneArt=null,sceneSpeaker=null;
const scenePictures={box:'assets/opinion-box.png',sort:'assets/sorting-cards.png',protect:'assets/protected-surveys.png'};
const sceneFrames={
 welcome:{background:'cafeteria',cast:['robot','teacher'],caption:'다음 주 급식, 함께 정해요'},
 meet:{background:'cafeteria',cast:['robot','teacher'],caption:'냠냠봇은 어떤 자료로 배울까요?'},
 question:{background:'cafeteria',cast:['robot'],caption:'냠냠봇이 만든 첫 질문지',paper:'question'},
 collect:{background:'courtyard',cast:['robot'],caption:'학교 곳곳의 이야기를 모아요'},
 box:{picture:'box',caption:'한곳에 많이 모인 의견 카드'},
 jiho:{background:'classroom',cast:['jiho','robot'],caption:'교실에서 지호의 이야기를 들어요'},
 saebom:{background:'classroom',cast:['saebom','robot'],caption:'새봄이가 전하는 1학년 동생의 이야기'},
 haneul:{background:'library',cast:['haneul','librarian','robot'],caption:'도서관에서 하늘의 이야기를 들어요'},
 sort:{picture:'sort',caption:'카드를 하나씩 자세히 살펴봐요'},
 menu:{background:'cafeteria',cast:['robot'],caption:'아직 먹기 전! 함께 살펴볼 급식표'},
 repair:{background:'classroom',cast:['teacher','robot'],caption:'함께 먹을 수 있는 방법을 찾아요'},
 revised:{background:'cafeteria',cast:['daon','haneul','saebom'],caption:'친구들의 이야기를 듣고 바뀐 급식'},
 privacy:{background:'classroom',cast:['onyu','teacher'],caption:'온유가 질문지를 궁금해해요'},
 protect:{picture:'protect',caption:'필요한 사람만 보고, 안전하게 보관해요'}
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
function showStart(){mode='start';setMain(`<section class="landing" aria-labelledby="game-title"><div class="landing-copy"><p class="eyebrow">데이터 관리 · 대화 탐험</p><h1 id="game-title">급식 메뉴 AI<br>‘냠냠봇’</h1><p class="lead">맛있는 급식은<br>누구의 이야기에서 시작될까요?</p><p>급식 의견 모으기 대장이 되어<br>냠냠봇에게 친구들의 생각을 전해 주세요.</p><div class="button-row"><button class="ee-button" id="start-game">탐험을 시작해요 ${icon('arrow_right',24)}</button></div><div class="landing-note">초등 3~4학년 · 약 8~10분<br>이름을 입력하지 않아요. 기록도 저장하지 않아요.</div></div><div class="landing-art" aria-label="공식 학교 급식실과 안내 로봇 냠냠봇"><img src="${COMMON}/backgrounds/cafeteria.png" alt="따뜻한 학교 급식실"><span class="art-label">다음 주 급식, 함께 정해요</span><p class="hero-callout">많이 모으면 충분할까?<br>나랑 함께 살펴봐!</p><div class="hero-robot">${portrait('robot','happy','large')}</div></div></section><div class="landing-bottom"><p><strong>관찰하고</strong>친구들의 이야기를 들어요</p><p><strong>선택하고</strong>어떤 일이 생기는지 봐요</p><p><strong>함께 정리해요</strong>낱말 카드 5장을 모아요</p></div>`);$('start-game').onclick=()=>{sound();intro();};}
function wordStrip(){return `<div class="word-strip" aria-label="모은 낱말 카드 ${state.words.length}장, 전체 5장">${M.words.map((w,i)=>`<div class="word-card ee-badge ${state.words.includes(w)?'earned':''}" aria-label="${esc(w)} ${state.words.includes(w)?'모았어요':'아직 모으지 않았어요'}"><span class="word-check" aria-hidden="true">${state.words.includes(w)?'✓':'·'}</span><span>${i===3?'한쪽으로<br>치우친 데이터':w}</span></div>`).join('')}</div>`;}
function shell(scene,introMode=false){
 mode=introMode?'intro':'game';
 const info=introMode?{title:'냠냠봇의 부탁',goal:'모두가 맛있고 안전하게 먹으려면 어떤 이야기가 필요할까요?',place:'학교 급식실'}:M.scenes[scene];
 setMain((introMode?'':wordStrip())+
 '<div class="game-layout '+(introMode?'intro-layout':'')+'"><aside class="scene-sidebar" aria-label="현재 장면">'+
 '<figure class="scene-art"><div class="scene-view"><img id="scene-image" class="scene-image" alt=""><canvas id="scene-cast" width="1280" height="720" aria-hidden="true"></canvas><div id="scene-material"></div></div><figcaption id="scene-caption"></figcaption></figure>'+
 '<div class="scene-info"><p class="scene-tag">'+(introMode?'탐험 준비':'장면 '+scene+' / 5')+'</p><h1 class="scene-title">'+info.title+'</h1><p class="scene-goal">'+info.goal+'</p><div id="scene-speaker" class="scene-speaker"></div></div>'+
 '<p class="scene-note">우리의 선택이 냠냠봇의 급식을 바꿔요.<br>먹기 전에는 선생님이 확인해요.</p></aside>'+
 '<section class="messenger ee-panel" aria-label="냠냠봇과 대화"><div class="chat-header"><strong id="chat-place">'+info.place+'</strong><small id="chat-count">'+(introMode?'함께 시작해요':'의견 '+M.count(state)+'장')+'</small></div>'+
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
 $('scene-material').innerHTML=material||(sceneArt.paper?'<div class="scene-paper ee-panel"><strong>냠냠봇 질문지</strong><p>좋아하는 급식 메뉴는?</p><span class="paper-line"></span></div>':'');
 paintIcons($('scene-material'));paintSceneCast();
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
function showNext(label='다음',fn=nextLine){pinAfterLayout();actionHandlers=[];const area=$('action-area');area.innerHTML=`<div class="next-row"><span class="muted">대화창 탭 또는 Space<br>한 번 더 누르면 다음 대사</span><button class="ee-button" id="next-line" data-label="${esc(label)}"><span class="next-label">${label}</span> ${icon('arrow_right',20)}</button></div>`;paintIcons(area);updateNextLabel();$('next-line').onclick=()=>{sound();if(!finishTyping())fn();};$('next-line').focus({preventScroll:true});}
function choices(prompt,items,{multiple=false,selected=[],focus=true}={}){pinAfterLayout();actionHandlers=[];const area=$('action-area');area.innerHTML=`<p class="action-prompt">${esc(prompt)}</p><div class="choices">${items.map((x,i)=>`<button class="ee-choice choice-control" data-choice="${i}" ${x.disabled?'disabled':''} ${multiple?`aria-pressed="${selected.includes(x.id)}"`:''}><span class="key-hint" aria-hidden="true">${i<4?i+1:'·'}</span><span>${multiple?`<span class="check-marker" aria-hidden="true">${selected.includes(x.id)?'✓ ':'□ '}</span>`:''}${esc(x.text)}${x.detail?`<small>${esc(x.detail)}</small>`:''}</span></button>`).join('')}</div>`;area.querySelectorAll('[data-choice]').forEach((b,i)=>{const handler=()=>{if(b.disabled||busy)return;sound();if(!multiple){actionHandlers=[];say('me',items[i].text);}items[i].onSelect();};b.onclick=handler;actionHandlers[i]=handler;});if(focus)area.querySelector('button:not(:disabled)')?.focus({preventScroll:true});}
function earn(word,scene,next){if(word&&!state.words.includes(word)){state.words.push(word);system(`낱말 카드 ‘${word}’를 모았어요.`);const strip=main.querySelector('.word-strip');if(strip)strip.outerHTML=wordStrip();sound('collect');}const current=scene+1;if(current>reported){reported=current;emit('progress',{current,total:6});}showNext(scene===5?'발견한 것 정리하기':'다음 이야기',next);}
function intro(){shell(-1,true);run([['robot','안녕! 나는 급식 메뉴 AI, 냠냠봇이야. 다음 주 급식 메뉴를 정하려고 해!','happy'],['teacher','윤리시티 초등학교 친구들이 함께 먹을 급식이에요. 맛있고 안전해야겠죠?','explaining'],['teacher','당신은 급식 의견 모으기 대장이에요. 친구들의 생각을 모아 냠냠봇에게 전해 주세요.','happy'],['robot','의견이 많으면 좋은 급식이 되겠지? 같이 모아 볼래?','happy']],()=>showNext('탐험 방법 보기',rules));}
function rules(){mode='rules';setMain(`<section class="ee-panel rules-card"><p class="eyebrow">탐험 방법</p><h1>읽고, 고르고, 함께 생각해요</h1><ol class="rule-list"><li><span class="rule-number">1</span><div><strong>대화를 읽고 버튼을 눌러요.</strong><p>글자가 나오는 중에 누르면 문장이 완성돼요.<br>한 번 더 누르면 다음 대사로 넘어가요.<br>지난 대화는 위로 올려 다시 읽을 수 있어요.</p></div></li><li><span class="rule-number">2</span><div><strong>낱말 카드 5장을 모아요.</strong><p>데이터 · 수집 · 정리 · 한쪽으로 치우친 데이터 · 관리</p></div></li><li><span class="rule-number">3</span><div><strong>정답이 없는 선택도 있어요.</strong><p>선택에 따라 냠냠봇의 급식이 달라져요.<br>누가 더 잘했는지 점수를 매기지 않아요.</p></div></li></ol><p class="ee-notice">게임 속 친구와 의견은 모두 가상이에요.<br>실제 이름이나 건강 정보는 적지 않아요.</p><p class="muted spaced">키보드: Tab으로 이동 · Enter/Space로 선택<br>숫자 1~4로 앞의 선택지 고르기 · Space로 다음 대사</p><div class="button-row spaced"><button class="ee-button" id="begin-scenes">냠냠봇 만나러 가기</button></div></section>`);$('begin-scenes').onclick=()=>startScene(0);}
function startScene(n){state.scene=n;shell(n);[sceneZero,sceneOne,sceneTwo,sceneThree,sceneFour,sceneFive][n]();}
function sceneZero(){run([['robot','내가 급식 메뉴를 배우는 데 쓰는 건 뭘까?']],quiz);}
function quiz(){choices('급식 메뉴를 배우는 데 쓸 자료를 골라요.',[{text:'친구들의 의견',onSelect:()=>{effect('correct');run([['robot','맞아! 이렇게 배우는 데 쓰는 자료를 데이터라고 해.','happy'],['robot','질문지는 내가 만들어 놨어. “좋아하는 급식 메뉴를 써 주세요!” 이거면 충분하겠지?','neutral','question'],['teacher','우선 이 질문지로 의견을 모아 봐요. 나중에 빠진 것이 없는지도 살펴봐요.','explaining']],()=>earn('데이터',0,()=>startScene(1)));}},{text:'오늘 날씨',onSelect:()=>retryQuiz('날씨도 데이터가 될 수 있어. 하지만 친구들이 어떤 급식을 먹고 싶은지 알려면 다른 자료가 필요해.')},{text:'급식실 의자 수',onSelect:()=>retryQuiz('의자 수도 데이터가 될 수 있어. 하지만 좋아하는 메뉴를 알아보려면 친구들의 생각을 들어야 해.')}]);}
function retryQuiz(text){effect('retry');run([['robot',text,'explaining']],quiz);}
function sceneOne(){run([['robot','어디에서 의견을 모을까? 다녀온 곳에는 표시해 둘게.']],sourceChoices);}
function sourceChoices(){setSceneArt('collect');choices('어디에서 의견을 모을까요?',M.sources.map(x=>({id:x.id,text:(state.visited.includes(x.id)?'✓ ':'')+x.label,detail:state.visited.includes(x.id)?`${x.count}장 모았어요`:x.detail,disabled:state.visited.includes(x.id),onSelect:()=>visit(x)})));}
function visit(source){setSceneArt(source.id);$('chat-place').textContent=source.label;run(source.lines,()=>{if(!state.visited.includes(source.id))state.visited.push(source.id);$('chat-count').textContent=`의견 ${M.count(state)}장`;system(`${source.label} · ${source.count}장 모았어요. 지금까지 ${M.count(state)}장!`);if(state.visited.length===4){run([['robot','네 곳을 모두 다녀왔어! 이제 모은 의견을 살펴보자.','happy']],()=>earn('수집',1,()=>startScene(2)));}else if(M.count(state)>=14){run([['robot','이 정도면 충분하지 않아? 이제 그만 모을까?']],()=>choices('아직 들르지 않은 곳이 있어요.',[{text:'그만 모으기',onSelect:()=>run([['robot','좋아. 지금까지 모은 의견으로 정리해 볼게.']],()=>earn('수집',1,()=>startScene(2)))},{text:'아직 못 만난 친구가 있어, 더 모을래',onSelect:sourceChoices}]));}else sourceChoices();});}
function sceneTwo(){run([['robot','어? 누가 넣었는지 모르는 카드가 섞여 있어. 같이 살펴봐 줄래?','worried']],()=>sortCard(0));}
function material(card){append(`<article class="material-card ee-panel"><div class="material-top"><h3>${esc(card.title)}</h3>${icon('notebook',32)}</div><p class="material-count">${card.count}</p><p style="white-space:pre-line">${esc(card.text)}</p></article>`,`${card.title}. ${card.text}`);}
function sortCard(index,repeat=false){const card=M.sorting[index];setSceneArt('sort',{caption:card.title+' · '+card.count,material:'<div class="scene-card-label ee-badge">'+esc(card.title)+' · '+card.count+'</div>'});if(!repeat)material(card);choices('냠냠봇에게 줄 의견에 넣을까요, 뺄까요?',[{text:'넣기',onSelect:()=>sortAnswer(index,'keep')},{text:'빼기',onSelect:()=>sortAnswer(index,'remove')}]);}
function sortAnswer(index,value){const card=M.sorting[index];state.sort[card.id]=value;const correct=value===card.correct;effect(correct?'correct':'retry');run([['robot',card.why,correct?'happy':'explaining']],()=>{if(correct)showNext('다음 카드 살펴보기',()=>afterSort(index));else choices('생각을 바꿔도 괜찮아요.',[{text:'다시 골라 보기',onSelect:()=>sortCard(index,true)},{text:'지금 선택으로 이어가기',detail:'급식표에서 어떤 일이 생기는지 살펴봐요',onSelect:()=>afterSort(index)}]);});}
function afterSort(index){if(index<2)sortCard(index+1);else run([['robot','또 이런 카드가 들어오면 어떡하지? 의견함을 어떻게 지킬까?']],()=>choices('의견함을 지킬 방법을 골라요.',[{text:'그냥 둔다',onSelect:()=>boxChoice('open','아무나 카드를 더 넣거나 바꿀 수 있겠네. 선생님과 한 번 더 살펴보자.')},{text:'한 사람당 한 장만 받는다',onSelect:()=>boxChoice('one','한 친구의 의견이 여러 장으로 늘어나지 않게 할 수 있겠어.')},{text:'의견함을 잠그고 선생님과 함께 연다',onSelect:()=>boxChoice('locked','친구들의 의견을 함부로 바꾸지 못하게 함께 지킬 수 있겠어.')} ]));}
function boxChoice(value,text){state.boxProtection=value;setSceneArt('box',{caption:value==='locked'?'의견함은 선생님과 함께 열어요':value==='one'?'한 친구의 이야기를 한 장에 담아요':'의견함을 어떻게 지킬지 함께 생각해요'});run([['robot',text,'explaining']],()=>earn('정리',2,()=>startScene(3)));}
function menuHTML(menu){return `<article class="material-card ee-panel"><div class="material-top"><h3>${esc(menu.title)}</h3>${icon('notebook',28)}</div><ul class="menu-list">${menu.rows.map(r=>`<li><strong class="day">${r[0]}</strong><span class="food">${esc(r[1])}${r[2]?`<small>${esc(r[2])}</small>`:''}</span></li>`).join('')}</ul><p class="safe-label">${esc(menu.note)}</p></article>`;}
function showMenu(menu){setSceneArt(menu.kind==='revised'?'revised':'menu',{material:'<div class="scene-paper scene-menu ee-panel"><strong>'+(menu.kind==='revised'?'함께 고친 급식표':'처음 만든 급식표')+'</strong>'+menu.rows.map(r=>'<p><b>'+r[0]+'</b><span>'+esc(r[1])+'</span></p>').join('')+'</div>'});append(menuHTML(menu),`${menu.title}. ${menu.rows.map(r=>r[0]+'요일 '+r[1]).join('. ')}. ${menu.note}`);}
function sceneThree(){const first=M.initialMenu(state);run([['robot','모은 의견으로 다음 주 급식표를 만들었어! 아직 먹기 전이니 함께 확인해 줘.','happy']],()=>{showMenu(first);showNext('친구들의 이야기 듣기',()=>{const unverified=first.kind==='unverified';run([['saebom',unverified?'매일 짜장면이네… 내 동생이 말한 치킨은 어디 갔지? 매운 걸 못 먹는다는 이야기도 빠졌어.':'월요일 떡볶이… 동생이 너무 매워서 못 먹겠대.','worried'],['haneul',unverified?'금요일에 땅콩버터 피자네… 나 땅콩 알레르기가 있어. 이거 먹으면 안 돼.':'목요일 치킨에 땅콩 소스가 들어가네… 나 땅콩 알레르기가 있어. 이거 먹으면 안 돼.','worried'],['daon','난 좋은데? …아, 하늘이는 못 먹는구나.','worried'],['teacher','잠깐! 땅콩 메뉴는 하늘이에게 위험해요. 이 식단은 그대로 쓸 수 없겠어요.','worried'],['teacher','아직 아무도 먹지 않았어요. 먼저 메뉴를 안전하게 바꾸고, 빠진 이야기를 살펴봐요.','explaining']],reflectChoice);});});}
function reflectChoice(){choices('냠냠봇의 급식은 왜 이렇게 됐을까요?',[{text:'냠냠봇이 매운 걸 좋아해서',onSelect:()=>reflectReply('나는 음식을 먹거나 좋아하지 않아. 받은 자료를 보고 메뉴를 정했어. 어떤 이야기가 빠졌을까?')},{text:'받은 의견이 한쪽으로 치우쳐 있어서',onSelect:()=>reflectReply('많은 의견이 모두의 의견은 아니었네. 질문지에도 못 먹는 음식을 쓰는 칸이 없었어.')},{text:'많이 원한 메뉴니까 원래 맞는 거라서',onSelect:()=>reflectReply('많이 원해도 못 먹는 친구가 있으면 함께 살펴봐야 해. 안전하게 먹는 데 필요한 자료가 빠졌어.')}]);}
function reflectReply(text){run([['robot',text,'explaining'],['teacher','모든 친구를 만나도 질문에 빠진 칸이 있으면 중요한 이야기를 놓칠 수 있어요.','explaining']],reflectionInput);}
function reflectionInput(){pinAfterLayout();actionHandlers=[];const area=$('action-area');area.innerHTML='<label class="action-prompt" for="reflection-input">질문지에 어떤 칸이 더 있었다면 좋았을까요?</label><textarea class="reflection-field" id="reflection-input" maxlength="160" rows="2" placeholder="예: 못 먹는 음식" aria-describedby="reflection-note"></textarea><p class="input-note" id="reflection-note">써도 되고, 건너뛰어도 돼요. 실제 이름이나 건강 정보는 쓰지 않아요. 글은 저장하거나 보내지 않아요.</p><div class="button-row"><button class="ee-button" id="reflection-next">생각 이어가기</button><button class="ee-button secondary" id="reflection-skip">건너뛰기</button></div>';const finish=skip=>{reflection=skip?'':$('reflection-input').value.trim();if(reflection)say('me',reflection);else system('글을 쓰지 않고 생각을 이어가요.');run([['teacher','좋아하는 메뉴뿐 아니라 못 먹는 음식도 알려 줄 칸이 필요해요. 이름이 꼭 필요한지도 살펴봐요.','explaining']],()=>earn('한쪽으로 치우친 데이터',3,()=>startScene(4)));};$('reflection-next').onclick=()=>finish(false);$('reflection-skip').onclick=()=>finish(true);$('reflection-input').focus({preventScroll:true});}
function sceneFour(){run([['teacher','냠냠봇을 다시 도와줘요. 함께 먹을 수 있는 방법을 2개 골라 보세요.','explaining']],methodChoices);}
function methodChoices(focusId){choices(`방법 2개 고르기 · 지금 ${state.methods.length}개 골랐어요`,M.methods.map(m=>({id:m.id,text:m.text,onSelect:()=>{if(!m.good){say('me',m.text);effect('retry');run([[m.speaker,'그럼 우리는 급식을 같이 못 먹는 거야?','worried'],['teacher','함께 먹을 수 있는 다른 방법을 찾아봐요.','explaining']],methodChoices);return;}if(state.methods.includes(m.id))state.methods=state.methods.filter(id=>id!==m.id);else if(state.methods.length<2)state.methods.push(m.id);else {announce('방법은 2개까지 골라요. 고른 방법을 다시 누르면 바꿀 수 있어요.');return;}methodChoices(m.id);}})),{multiple:true,selected:state.methods,focus:!focusId});const area=$('action-area'),footer=document.createElement('div');footer.className='next-row small-gap';footer.innerHTML=`<button class="ee-button" id="confirm-methods" ${state.methods.length!==2?'disabled':''}>이 방법 2개로 도와주기</button>`;area.append(footer);$('confirm-methods').onclick=confirmMethods;if(focusId)area.querySelector(`[data-choice="${M.methods.findIndex(m=>m.id===focusId)}"]`)?.focus({preventScroll:true});}
function confirmMethods(){state.questionImproved=state.methods.includes('question');state.methods.forEach(id=>say('me',M.methods.find(m=>m.id===id).text));effect('correct');const replies=state.methods.map(id=>['robot',M.methods.find(m=>m.id===id).reply,'happy']);replies.push(['teacher','어떤 방법을 골랐든, 위험한 메뉴는 먼저 바꿀게요. 못 먹는 음식은 선생님이 꼭 확인해요.','explaining']);run(replies,()=>{showMenu(M.revisedMenu(state));run([['daon','돈가스도 들어갔네! 다 같이 먹을 수 있겠다.','happy'],['haneul','땅콩 소스를 빼 주고 내 이야기를 들어 줘서 고마워.','happy'],['saebom','내 동생도 순한 떡볶이를 고를 수 있겠어!','happy']],()=>earn(null,4,()=>startScene(5)));});}
function sceneFive(){run([['onyu','누가 뭘 못 먹는지 궁금한데, 질문지 좀 보여 줄래? 재밌을 것 같아!']],()=>choices('온유에게 어떻게 답할까요?',[{text:'보여 준다',onSelect:()=>privacyChoice(false)},{text:'안 돼! 꼭 필요한 선생님만 볼 수 있어',onSelect:()=>privacyChoice(true)}]));}
function privacyChoice(protect){state.protectChoices[0]=protect;setSceneArt('protect');const lines=protect?[['onyu','맞네, 하늘이 정보는 하늘이를 지키는 데만 써야겠다.','explaining']]:[['teacher','잠깐, 보여 주기 전에 멈춰요. 이건 친구를 지키는 중요한 정보예요.','explaining'],['onyu','아, 그냥 궁금했는데… 하늘이한테는 중요한 거구나. 필요한 선생님만 보는 게 좋겠어.','explaining']];lines.push(['teacher','이름이 적힌 질문지는 어떻게 할까요?','explaining']);run(lines,()=>choices('다 쓴 질문지는 어떻게 할까요?',[{text:'교실 게시판에 붙여 둔다',onSelect:()=>retentionChoice(false)},{text:'필요한 동안 잘 보관하고, 다 쓰면 안전하게 버린다',onSelect:()=>retentionChoice(true)}]));}
function retentionChoice(protect){state.protectChoices[1]=protect;setSceneArt('protect',{caption:'다 쓴 질문지는 내용을 알아볼 수 없게 정리해요'});run([['teacher',protect?'필요한 동안 안전하게 보관하고, 일이 끝나면 이름이나 내용을 알아볼 수 없게 정리해요.':'게시판에 붙이면 지나가는 사람도 볼 수 있어요. 붙이기 전에 멈추고, 필요한 동안만 안전하게 보관해요.','explaining'],['robot','고르게 모으기, 바르게 정리하기, 소중하게 지키기! 이제 알겠어.','happy']],()=>earn('관리',5,showResult));}
function showResult(){mode='result';queue=[];afterQueue=null;actionHandlers=[];const result=M.result(state);setMain(`<section aria-labelledby="result-title"><div class="result-top"><div><p class="eyebrow">우리가 함께 만든 변화</p><h1 id="result-title">${result.title}</h1><p class="muted small-gap">이 이름은 냠냠봇 급식표의 준비 상태를 말해요.<br>당신의 점수나 등급이 아니에요.</p></div><div class="result-portraits" aria-label="냠냠봇과 선생님">${portrait('robot','happy','medium')}${portrait('teacher','happy','medium')}</div></div><div class="result-grid"><section class="ee-panel"><h2>냠냠봇의 최종 급식표</h2>${menuHTML(result.menu)}<p class="ee-notice">${result.kind==='ready'?'고르게 모으고 소중하게 지키는 방법을 함께 살펴봤어요.':result.kind==='review'?'안전한 메뉴로 고쳤어요. 더 살펴볼 자료와 지킬 방법도 남아 있어요.':'위험한 메뉴는 선생님이 막았어요. 아래 메뉴는 안전하게 고친 안이에요. 자료를 다시 정리한 뒤 확정해요.'}</p></section><section class="ee-panel"><h2>우리가 발견한 것</h2><ul class="findings">${result.findings.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>${result.needs.length?`<h3 class="spaced">다음에 함께 살펴볼 것</h3><ul class="findings">${result.needs.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<p class="ee-success spaced">여러 친구의 의견과 안전, 소중한 정보를 함께 생각했어요.</p>'}</section></div><section class="result-section"><h2>모은 낱말 카드 5장</h2><div class="small-gap">${wordStrip()}</div></section><section class="ee-panel result-section"><h2>나의 데이터 약속 3가지</h2><p class="muted small-gap">마음에 남은 약속을 3개 골라요. 하나는 내 말로 고쳐 써도 돼요.</p><p class="small-gap" id="pledge-count" role="status">0 / 3개 골랐어요</p><div class="pledge-grid" id="pledge-grid">${M.pledges.map((p,i)=>`<button class="ee-choice" data-pledge="${i}" aria-pressed="false"><span aria-hidden="true">□ </span>${esc(p)}</button>`).join('')}</div><div class="pledge-editor" id="pledge-editor" hidden><label for="pledge-edit-select">고른 약속 하나를 내 말로 바꾸기 (선택)</label><select id="pledge-edit-select"><option value="">그대로 쓸게요</option></select><input id="pledge-edit-input" maxlength="100" placeholder="내가 지킬 약속을 짧게 써요" aria-label="내 말로 고친 약속" hidden><p class="input-note">실제 이름이나 건강 정보는 쓰지 않아요. 직접 쓴 글은 이 화면에서만 사용해요.</p></div><button class="ee-button" id="finish-game" disabled>약속 3개를 고르면 마칠 수 있어요</button></section><section class="ee-panel result-section"><h2>기억할 한 문장</h2><p class="memory-line">많은 사람의 의견과 모두의 의견은 달라요.<br>데이터는 고르게 모으고, 소중하게 지켜요.</p></section></section>`);main.querySelectorAll('[data-pledge]').forEach(b=>b.onclick=()=>togglePledge(Number(b.dataset.pledge)));$('pledge-edit-select').onchange=()=>{const value=$('pledge-edit-select').value;customPledgeIndex=value===''?null:Number(value);customPledge='';$('pledge-edit-input').value='';$('pledge-edit-input').hidden=customPledgeIndex===null;if(customPledgeIndex!==null){$('pledge-edit-input').value=M.pledges[customPledgeIndex];$('pledge-edit-input').focus();}};$('pledge-edit-input').oninput=e=>{customPledge=e.target.value;};$('finish-game').onclick=complete;updatePledges();}
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
