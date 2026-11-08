(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const SAVE_KEY = 'ethicity.park.publicness.v0.5.preview';
  const NPCS = [
    {id:'play',name:'새봄',role:'놀이터를 잃은 어린이',x:350,y:340,sprite:'saebom',icon:'🛝',place:'오래된 놀이터',line:'여기 원래 그네가 있었어. 하루에 열두 명밖에 안 온다고 없앴대. 그런데 우리 동네에서 친구들과 놀 수 있는 곳은 여기뿐이야!',fact:'AI 기록: 놀이터 이용객은 하루 12명. 주민 조사: 근처에 다른 무료 놀이터가 없음.',question:'이용객이 적으면 꼭 필요한 공간도 없어져야 할까요?'},
    {id:'shade',name:'정순 할머니',role:'쉼터를 이용하던 주민',x:335,y:745,img:'grandmother',icon:'🌳',place:'벤치가 없어진 쉼터',line:'여기 나무 아래 벤치에서 친구들과 잠깐씩 쉬었는데, 이제는 앉을 곳이 없구나. 짧게 이용한다고 쓸모없는 건 아니잖니?',fact:'AI 기록: 벤치에 앉는 평균 시간은 짧음. 주민 조사: 걷다가 잠시 쉬는 장소가 필요함.',question:'시설을 짧게 사용하는 이유는 무엇일까요?'},
    {id:'garden',name:'하린',role:'정원을 찾은 학생',x:1265,y:736,img:'harin',icon:'🌷',place:'계단이 있는 작은 정원',line:'새 정원이 예쁘대서 와 봤는데 입구가 계단이야. 휠체어로 들어갈 수 있도록 길도 연결해 주면 좋겠어.',fact:'AI 기록: 가장 짧은 산책로를 선택함. 주민 조사: 계단 때문에 일부 주민의 진입이 불가능함.',question:'가장 짧은 길이 모두에게 좋은 길일까요?'},
    {id:'square',name:'지호',role:'광장을 이용하던 학생',x:1260,y:370,sprite:'jiho',icon:'🪑',place:'카페가 넓어진 중앙 광장',line:'예전에는 광장에서 친구들이랑 이야기했어. 지금은 카페에서 뭔가 사지 않으면 앉아서 쉴 곳이 별로 없어.',fact:'AI 기록: 카페 수익이 증가할 것으로 예측됨. 주민 조사: 돈을 쓰지 않고 머무를 수 있는 공간이 줄어듦.',question:'공공 공간에는 누구나 무료로 이용할 수 있는 곳도 필요할까요?'}
  ];
  const CRITERIA = [
    {id:'users',label:'이용자 수',detail:'얼마나 많은 주민이 이용하는가?'},
    {id:'access',label:'접근성',detail:'누구나 시설에 접근할 수 있는가?'},
    {id:'need',label:'이용의 필요성',detail:'소수에게도 꼭 필요한 시설인가?'},
    {id:'safety',label:'안전성',detail:'위험 없이 활동하고 이동할 수 있는가?'},
    {id:'efficiency',label:'운영 효율성',detail:'예산과 공간을 얼마나 효율적으로 활용하는가?'}
  ];
  const FACILITIES = [
    {id:'path',icon:'♿',name:'무장애 연결길',cost:3,description:'입구에서 시설까지 턱 없이 이동하는 길',access:3,play:0,rest:0},
    {id:'play',icon:'🛝',name:'어린이 놀이터',cost:3,description:'아이들이 안전하게 놀 수 있는 공간',access:0,play:3,rest:0},
    {id:'shade',icon:'🌳',name:'그늘 쉼터',cost:2,description:'어르신과 보행자를 위한 쉬는 공간',access:0,play:0,rest:3},
    {id:'garden',icon:'🌷',name:'공동 정원',cost:2,description:'함께 꽃을 가꾸는 작은 정원',access:1,play:0,rest:2},
    {id:'square',icon:'🪑',name:'무료 광장 벤치',cost:2,description:'구매하지 않아도 머무를 수 있는 곳',access:1,play:0,rest:2},
    {id:'lights',icon:'💡',name:'산책길 조명',cost:2,description:'늦은 오후에도 안전하게 이동하기',access:1,play:0,rest:1}
  ];
  const POLICIES = [
    {id:'participate',title:'주민의 목소리를 계속 듣기',detail:'AI 분석과 함께 서로 다른 주민의 실제 의견을 정기적으로 확인해요.'},
    {id:'access',title:'누구나 이용 가능한 공간 만들기',detail:'교통·안전·장애물과 무료 접근을 중요한 설계 조건으로 삼아요.'},
    {id:'balance',title:'이용률과 필요성을 함께 보기',detail:'숫자로 계산되는 효율과 숫자로 표현하기 어려운 필요를 함께 검토해요.'}
  ];
  const blank = () => ({name:'초록별',avatar:'haneul',stage:'start',world:'park',visited:[],criteria:[],weights:{users:2,access:2,need:2,safety:2,efficiency:2},criteriaPassed:false,facilities:[],trialRuns:0,aiHistory:[],policy:null,reason:'',finished:false});
  let state = blank();
  try { const saved = JSON.parse(localStorage.getItem(SAVE_KEY)||'null'); if(saved && typeof saved==='object') state={...state,...saved,visited:Array.isArray(saved.visited)?saved.visited.filter(id=>NPCS.some(n=>n.id===id)):[],weights:Object.fromEntries(CRITERIA.map(c=>[c.id,Number.isInteger(saved.weights?.[c.id])&&saved.weights[c.id]>=1&&saved.weights[c.id]<=6?saved.weights[c.id]:2])),facilities:Array.isArray(saved.facilities)?saved.facilities.filter(id=>FACILITIES.some(f=>f.id===id)):[],aiHistory:Array.isArray(saved.aiHistory)?saved.aiHistory.slice(-10):[]}; } catch {}
  const save = () => { try { localStorage.setItem(SAVE_KEY,JSON.stringify(state)); } catch {} };
  const canvas = $('world'), ctx = canvas.getContext('2d');
  const W=960,H=540,SCENES={park:{width:1600,height:1000},lab:{width:1600,height:950}};
  const images={};
  for (const [key,src] of Object.entries({park:'park-map.png',lab:'ai-lab.png',haneul:'haneul-walk.png',jiho:'jiho-walk.png',saebom:'saebom-walk.png',grandmother:'grandmother.png',harin:'harin.png',onyu:'onyu.png',parkbot:'parkbot.png',officer:'town-officer.png'})) { const img=new Image(); img.src='../publicness/assets/'+src; images[key]=img; }
  let player={x:800,y:860},camera={x:0,y:0},keys=new Set(),target=null,modalOpen=false,nearLock=null,portalCooldown=0,labLock=false,lastFrame=0;
  const motion={vx:0,vy:0};
  const TOP_SPEED=.33,ACCEL=.0023,BRAKE=.00185;
  const reducedMotion=typeof window.matchMedia==='function'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let portalPhase=null;
  const resetMotion=()=>{motion.vx=0;motion.vy=0;walkingFrame=1;walkClock=0;};
  function ease(from,to,step){return from<to?Math.min(from+step,to):Math.max(from-step,to);}
  function rectContains(r,x,y,pad=12){return x>r[0]-pad&&x<r[2]+pad&&y>r[1]-pad&&y<r[3]+pad;}
  // Park landmarks: permanent buildings, fenced gardens, flower beds and pond.
  // NPC footprints and portal remain on the accessible paths between these regions.
  const PARK_BLOCKERS=[
    [80,170,220,275], [410,170,675,295], [910,170,1095,295], [1375,170,1520,350],
    [500,420,672,627], [930,430,1110,635], [80,435,245,655], [1385,440,1520,666],
    [475,875,675,950], [930,875,1120,950]
  ];
  const LAB_BLOCKERS=[[80,170,425,350],[1175,170,1520,350]];
  // Collision lines follow stone fences, curved garden borders and steps.
  // Coordinates refer to the 1600×1000 park world (character *feet*, not sprite head).
  // Keep gates and accessible approach to the four residents open.
  const PARK_STONE_WALLS=[
    // Eastern terrace garden: sloped retaining wall and its lower bend.
    {points:[[885,430],[890,525],[935,615],[998,695],[1048,763],[1080,828],[1150,860]],halfWidth:19},
    // Upper/lower stretches of the stone garden border, excluding the stair opening.
    {points:[[1130,860],[1200,866],[1250,864]],halfWidth:17},
    {points:[[1335,845],[1415,845],[1495,815]],halfWidth:18},
    // Western garden and shrub-bed parapets.
    {points:[[260,430],[268,520],[284,596],[325,652]],halfWidth:16},
    {points:[[350,650],[410,665],[465,691]],halfWidth:16}
  ];
  function distanceToSegment(px,py,ax,ay,bx,by){
    const dx=bx-ax,dy=by-ay,length=dx*dx+dy*dy;
    if(length===0)return Math.hypot(px-ax,py-ay);
    const t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/length));
    return Math.hypot(px-ax-dx*t,py-ay-dy*t);
  }
  function collisionAt(world,x,y){
    const b=SCENES[world];
    if(x<80||x>b.width-80||y<170||y>b.height-65)return true;
    const blockers=world==='park'?PARK_BLOCKERS:LAB_BLOCKERS;
    if(blockers.some(r=>rectContains(r,x,y)))return true;
    if(world!=='park')return false;
    const radius=14; // foot collision radius: sprite body may overlap the edge visually
    return PARK_STONE_WALLS.some(wall=>wall.points.some((p,i)=>{
      if(!i)return false;
      const from=wall.points[i-1];
      return distanceToSegment(x,y,from[0],from[1],p[0],p[1])<=wall.halfWidth+radius;
    }));
  }
  function moveSafe(nx,ny){
    const ox=player.x,oy=player.y;
    // Continuous collision: split each frame movement into short steps so a fast
    // character cannot skip over a narrow fence between two frames.
    const dx=nx-ox,dy=ny-oy;
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/4));
    let blockedX=false,blockedY=false;
    for(let i=0;i<steps;i++){
      const sx=dx/steps,sy=dy/steps;
      if(!collisionAt(state.world,player.x+sx,player.y))player.x+=sx;
      else blockedX=true;
      if(!collisionAt(state.world,player.x,player.y+sy))player.y+=sy;
      else blockedY=true;
    }
    if(blockedX)motion.vx=0;
    if(blockedY)motion.vy=0;
    return Math.hypot(player.x-ox,player.y-oy);
  }
  let collectWithSpace=null;
  const sound=window.ParkAudio||{enabled:false,supported:false,status:'unsupported',lastError:'오디오 기능을 사용할 수 없습니다.',start(){},pause(){},play(){},toggle(){return false;},test(){},onChange(){}};
  function updateSoundButton(){const b=$('soundToggle'),test=$('soundTest'),status=$('soundStatus');b.textContent=sound.supported?(sound.enabled?'🔊 사운드 켜짐':'🔇 사운드 꺼짐'):'🔇 오디오 미지원';b.setAttribute('aria-pressed',String(!!sound.enabled&&sound.supported));b.disabled=!sound.supported;test.disabled=!sound.supported;const labels={ready:'게임 시작 후 음악 재생',playing:'♪ 배경음악 재생 중',effects:'♪ 효과음 재생됨','test-ok':'✓ 테스트 소리가 재생됐어요',muted:'음소거 상태',paused:'첫 화면에서는 음악 일시정지',blocked:sound.lastError,error:sound.lastError,unsupported:sound.lastError};status.textContent=labels[sound.status]||'오디오 준비 중';status.classList.toggle('audio-error',['blocked','error','unsupported'].includes(sound.status));}
  $('soundToggle').addEventListener('click',()=>{sound.toggle();updateSoundButton();if(sound.enabled)sound.play('select');});
  $('soundTest').addEventListener('click',()=>sound.test());
  sound.onChange(updateSoundButton);
  updateSoundButton();
  let visualTime=0;
  const loaded = img => img?.complete && img.naturalWidth>0;
  function toast(msg){const box=$('toast');box.textContent=msg;box.hidden=false;clearTimeout(toast.handle);toast.handle=setTimeout(()=>box.hidden=true,3300);}
  function openModal(title,body,buttons=''){modalOpen=true;collectWithSpace=null;keys.clear();target=null;resetMotion();sound.play('dialogue');$('dialogOverlay').hidden=false;$('dialogCard').innerHTML=`<div class="dialog-head"><div><p class="eyebrow">ETHICITY · 별빛공원 이야기</p><h3 id="dialogTitle">${esc(title)}</h3></div><button id="dialogClose" class="dialog-close" aria-label="닫기">✕</button></div>${body}<div class="dialog-actions">${buttons}</div>`;$('dialogClose').addEventListener('click',closeModal);$('dialogClose').focus();}
  function closeModal(){modalOpen=false;collectWithSpace=null;$('dialogOverlay').hidden=true;if(!$('gameScreen').hidden&&state.stage==='explore')canvas.focus({preventScroll:true});}
  $('dialogOverlay').addEventListener('click',e=>{if(e.target===$('dialogOverlay'))closeModal();});
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&modalOpen)closeModal();if(modalOpen&&collectWithSpace&&(e.code==='Space'||e.key===' ')){e.preventDefault();if(!e.repeat)collectWithSpace();}});
  function screen(game){$('startScreen').hidden=game;$('gameScreen').hidden=!game;$('resumeBtn').hidden=state.stage==='start';if(game){renderStage();if(state.stage==='explore')canvas.focus({preventScroll:true});}window.scrollTo(0,0);}
  function intro(){const pages=[
    {who:'마을 담당자',img:'officer',text:'별빛공원의 시설이 오래되어 AI 파크봇에게 새 설계를 맡겼어요. 오늘 드디어 개장합니다!'},
    {who:'파크봇',img:'parkbot',text:'분석 완료! 이용객 수와 운영 효율이 높아졌어요. 그런데 예상과 달리 일부 주민이 공원에 오지 않는군요.'},
    {who:'온유',img:'onyu',text:'어? 새봄이와 정순 할머니가 안 보이네. 우리가 알던 놀이터와 쉼터도 사라졌어. 같이 이유를 찾아보자!'},
    {who:'오늘의 임무',img:'onyu',text:'① 공원에서 주민 네 명을 만나기 ② 관리실에서 AI 계산 기준 분석하기 ③ 공원 설계하기 ④ 시범 개장 후 다시 개선하기'}
  ];let i=0;const draw=()=>{const p=pages[i];openModal(`별빛공원 개장식 · ${i+1}/4`,`<div class="dialogue"><img src="../publicness/assets/${p.img==='officer'?'town-officer':p.img}.png" alt="${esc(p.who)} 픽셀아트"><div><p class="quote-label">${esc(p.who)}</p><p>“${esc(p.text)}”</p></div></div>`,`<button class="btn primary" id="introNext">${i===3?'🔎 공원 탐험 시작':'다음 이야기 →'}</button>`);$('introNext').addEventListener('click',()=>{i++;if(i<pages.length)draw();else{closeModal();toast('공원 곳곳에서 주민의 목소리와 단서를 찾아보세요!');}});};draw();}
  document.querySelectorAll('[data-avatar]').forEach(btn=>btn.addEventListener('click',()=>document.querySelectorAll('[data-avatar]').forEach(b=>b.classList.toggle('selected',b===btn))));
  $('nickname').value=state.name;
  document.querySelectorAll('[data-avatar]').forEach(b=>b.classList.toggle('selected',b.dataset.avatar===state.avatar));
  $('startBtn').addEventListener('click',()=>{const name=$('nickname').value.trim();if(!/^[가-힣]{1,6}$/.test(name)){toast('별명은 한글 1~6글자로 입력해 주세요.');return;}sound.start();sound.play('success');state=blank();state.name=name;state.avatar=document.querySelector('.avatar.selected')?.dataset.avatar||'haneul';state.stage='explore';save();player={x:800,y:860};nearLock=null;portalCooldown=performance.now()+1600;screen(true);intro();});
  $('resumeBtn').addEventListener('click',()=>{sound.start();sound.play('select');if(state.stage==='explore'){player=state.world==='lab'?{x:800,y:755}:{x:800,y:860};nearLock=null;portalCooldown=performance.now()+1200;}screen(true);});
  $('homeBtn').addEventListener('click',()=>{if(modalOpen)closeModal();sound.pause();screen(false);});
  let walkingDirection='down',walkingFrame=1,walkClock=0;
  function sprite(key,x,y,size=1,direction='down',frame=1){const img=images[key];if(!loaded(img))return;const row={down:0,left:1,right:2,up:3}[direction]||0;ctx.imageSmoothingEnabled=false;ctx.drawImage(img,(frame%4)*96,row*128,96,128,x-48*size,y-120*size,96*size,128*size);}
  function portrait(key,x,y,w=95,h=118){const img=images[key];if(!loaded(img))return;ctx.imageSmoothingEnabled=false;ctx.drawImage(img,x-w/2,y-h,w,h);}
  function marker(x,y,label,icon,done=false){ctx.fillStyle=done?'#ddf4d9':'#fff9df';ctx.strokeStyle='#294b40';ctx.lineWidth=3;ctx.fillRect(x-75,y-145,150,34);ctx.strokeRect(x-75,y-145,150,34);ctx.fillStyle='#294b40';ctx.textAlign='center';ctx.font='bold 16px Galmuri,sans-serif';ctx.fillText(icon+' '+label,x,y-122);}
  function portal(x,y,title){
    const pulse=Math.sin(visualTime/430)*6;
    ctx.save();
    ctx.fillStyle='rgba(77,228,215,.28)';ctx.fillRect(x-42-pulse/2,y-105-pulse,84+pulse,98+pulse);
    ctx.strokeStyle='#f1e39a';ctx.lineWidth=5;ctx.strokeRect(x-38,y-102,76,96);
    if(!reducedMotion){
      const t=visualTime/650;
      for(let i=0;i<9;i++){
        const a=t+i*Math.PI*2/9,px=x+Math.cos(a)*47,py=y-58+Math.sin(a)*48;
        ctx.fillStyle=i%2===0?'#f1e39a':'#d4fff2';
        ctx.fillRect(Math.round(px),Math.round(py),i%3===0?7:5,i%3===0?7:5);
      }
    }
    ctx.fillStyle='#fff9d5';ctx.font='bold 16px Galmuri,sans-serif';ctx.textAlign='center';
    ctx.fillText('✦ '+title,x,y-115);ctx.restore();
  }
  function drawScene(){const scene=SCENES[state.world],img=images[state.world];camera.x=Math.max(0,Math.min(scene.width-W,player.x-W/2));camera.y=Math.max(0,Math.min(scene.height-H,player.y-H/2));ctx.clearRect(0,0,W,H);ctx.fillStyle='#b9d9bd';ctx.fillRect(0,0,W,H);ctx.save();ctx.translate(-Math.floor(camera.x),-Math.floor(camera.y));if(loaded(img)){ctx.imageSmoothingEnabled=false;ctx.drawImage(img,0,0,scene.width,scene.height);}if(state.world==='park'){
      portal(805,190,'AI 관리실');
      for(const n of NPCS){if(n.img)portrait(n.img,n.x,n.y);else sprite(n.sprite,n.x,n.y,.85);marker(n.x,n.y,n.name,n.icon,state.visited.includes(n.id));}
    } else {marker(800,325,'파크봇','🤖',state.criteriaPassed);portal(800,850,'공원으로');}
    sprite(state.avatar,player.x,player.y,.9,walkingDirection,walkingFrame);ctx.font='bold 17px Galmuri,sans-serif';ctx.textAlign='center';ctx.fillStyle='#fffde9';ctx.strokeStyle='#294b40';ctx.lineWidth=4;ctx.strokeText(state.name,player.x,player.y-111);ctx.fillText(state.name,player.x,player.y-111);
    if(target){ctx.strokeStyle='#fff4af';ctx.lineWidth=4;ctx.beginPath();ctx.arc(target.x,target.y,13+3*Math.sin(visualTime/220),0,2*Math.PI);ctx.stroke();}
    ctx.restore();drawTransitionOverlay();}
  function nearest(){const items=state.world==='park'?NPCS:[{id:'parkbot',x:800,y:325}];let best=null,dist=Infinity;for(const n of items){const d=Math.hypot(player.x-n.x,player.y-n.y);if(d<dist){best=n;dist=d;}}return {npc:best,dist};}
  function changeWorld(world){sound.play('portal');state.world=world;save();keys.clear();target=null;nearLock=null;labLock=false;resetMotion();player=world==='lab'?{x:800,y:725}:{x:800,y:820};portalCooldown=performance.now()+1900;$('sceneLabel').textContent=world==='lab'?'🤖 파크봇 관리실':'🌳 별빛공원';$('sceneHelp').textContent=world==='lab'?'파크봇에게 다가가서 분석 보고서 확인':'방향키 / WASD 이동 · 접근 시 자동 대화 · 스페이스로 단서 수집';$('mapHint').textContent=world==='lab'?'파크봇에게 접근해 이야기하세요. 아래쪽 포털로 공원에 돌아갈 수 있어요.':'아바타가 움직이면 카메라가 따라와요. 청록색 관리실 문으로 들어갈 수 있어요.';toast(world==='lab'?'AI 관리실에 들어왔어요.':'별빛공원으로 돌아왔어요.');}
  function beginPortal(nextWorld){
    if(portalPhase||performance.now()<portalCooldown)return;
    keys.clear();target=null;resetMotion();
    if(reducedMotion){changeWorld(nextWorld);return;}
    portalPhase={world:nextWorld,elapsed:0,changed:false};
    sound.play('portal');
  }
  function updatePortal(dt){
    if(!portalPhase)return;
    portalPhase.elapsed+=dt;
    if(!portalPhase.changed&&portalPhase.elapsed>=260){
      portalPhase.changed=true;changeWorld(portalPhase.world);
    }
    if(portalPhase.elapsed>=520)portalPhase=null;
  }
  function drawTransitionOverlay(){
    if(!portalPhase)return;
    const t=Math.min(1,portalPhase.elapsed/520);
    const opacity=Math.max(0,1-Math.abs(t-.5)*2);
    ctx.save();ctx.fillStyle='rgba(255,249,232,'+(opacity*.94)+')';ctx.fillRect(0,0,W,H);
    ctx.strokeStyle='#f4d477';ctx.lineWidth=9;ctx.globalAlpha=opacity;
    ctx.beginPath();ctx.arc(W/2,H/2,28+Math.sin(Math.PI*t)*92,0,Math.PI*2);ctx.stroke();
    ctx.restore();
  }
  function talk(n){if(!n)return;nearLock=n.id;target=null;keys.clear();const got=state.visited.includes(n.id);openModal(n.place,`<div class="dialogue">${n.img?`<img src="../publicness/assets/${n.img}.png" alt="${esc(n.name)}">`:`<span class="dialog-sprite ${n.sprite}" aria-hidden="true"></span>`}<div><p class="quote-label">${esc(n.name)} · ${esc(n.role)}</p><p>“${esc(n.line)}”</p></div></div><div class="evidence"><b>📓 ${got?'다시 읽는 증거 카드':'새로운 증거 카드'}</b><p>${esc(n.fact)}</p><p><b>생각해 보기:</b> ${esc(n.question)}</p></div><p class="keyboard-hint">⌨️ 스페이스바를 누르면 ${got?'확인':'단서 수집'} · 마우스 클릭도 가능</p>`,`<button class="btn primary" id="collectBtn">${got?'확인':'🔎 단서 수집'} [SPACE]</button>`);$('collectBtn').addEventListener('click',()=>{sound.play('collect');if(!state.visited.includes(n.id))state.visited.push(n.id);save();renderJournal();closeModal();toast(state.visited.length===4?'단서를 모두 모았어요! 공원 위쪽 AI 관리실로 가 보세요.':'증거 카드를 수집했어요!');});collectWithSpace=()=>{$('collectBtn')?.click();};}
  function talkLab(){nearLock='parkbot';const done=state.visited.length===NPCS.length;openModal('파크봇의 분석 보고서',`<div class="dialogue"><img src="../publicness/assets/parkbot.png" alt="픽셀아트 AI 파크봇"><div><p class="quote-label">파크봇</p><p>“저는 이용객 수, 운영비, 예상 수익을 계산했어요. 하지만 주민들의 실제 생활은 제 계산에 없었습니다.”</p></div></div><div class="evidence">${done?'주민 4명의 의견을 모았군요. 함께 제 계산 기준을 고쳐 주세요.':`아직 단서가 ${NPCS.length-state.visited.length}개 부족해요. 공원에 돌아가 주민들을 조사해 주세요.`}</div>`,`<button class="btn primary" id="reportBtn" ${done?'':'disabled'}>🤖 AI 판단 기준 분석</button>`);$('reportBtn').addEventListener('click',()=>{if(done){closeModal();changeStage('analysis');}});}
  function checkInteractions(){const locked=state.world==='park'?NPCS.find(n=>n.id===nearLock):nearLock==='parkbot'?{x:800,y:325}:null;if(locked&&Math.hypot(player.x-locked.x,player.y-locked.y)>160)nearLock=null;if(!portalPhase&&performance.now()>portalCooldown){const p=state.world==='park'?{x:805,y:190}:{x:800,y:850};if(Math.hypot(player.x-p.x,player.y-p.y)<65){beginPortal(state.world==='park'?'lab':'park');return;}}const {npc,dist}=nearest();if(npc&&dist<112&&!nearLock){target=null;keys.clear();state.world==='park'?talk(npc):talkLab();}}
  function walkable(x,y){return !collisionAt(state.world,x,y);}
  function tick(t){
    const dt=Math.min(50,Math.max(0,t-(lastFrame||t)));lastFrame=t;visualTime=t;
    if(state.stage==='explore'&&!$('gameScreen').hidden){
      if(portalPhase){updatePortal(dt);}
      else if(!modalOpen){
        let dx=0,dy=0;
        if(keys.has('left'))dx--;if(keys.has('right'))dx++;if(keys.has('up'))dy--;if(keys.has('down'))dy++;
        if(dx||dy)target=null;
        else if(target){
          const vx=target.x-player.x,vy=target.y-player.y,d=Math.hypot(vx,vy);
          if(d<12){target=null;}
          else {const desired=Math.min(TOP_SPEED,Math.sqrt(2*BRAKE*d));dx=vx/d*desired/TOP_SPEED;dy=vy/d*desired/TOP_SPEED;}
        }
        const length=Math.hypot(dx,dy),tx=length?dx/Math.max(1,length)*TOP_SPEED:0,ty=length?dy/Math.max(1,length)*TOP_SPEED:0;
        motion.vx=ease(motion.vx,tx,dt*(length?ACCEL:BRAKE));
        motion.vy=ease(motion.vy,ty,dt*(length?ACCEL:BRAKE));
        if(Math.abs(motion.vx)<.002)motion.vx=0;if(Math.abs(motion.vy)<.002)motion.vy=0;
        const b=SCENES[state.world];
        const nx=Math.max(80,Math.min(b.width-80,player.x+motion.vx*dt));
        const ny=Math.max(170,Math.min(b.height-65,player.y+motion.vy*dt));
        const moved=moveSafe(nx,ny);
        if(moved>.03){
          walkingDirection=Math.abs(motion.vx)>Math.abs(motion.vy)?(motion.vx>0?'right':'left'):(motion.vy>0?'down':'up');
          walkClock+=dt;walkingFrame=Math.floor(walkClock/150)%4;
        }else{walkingFrame=1;walkClock=0;}
        if(target&&moved<.01){target=null;resetMotion();}
        checkInteractions();
      }
      drawScene();
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  const keyMap={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',a:'left',d:'right',w:'up',s:'down'};
  window.addEventListener('keydown',e=>{if(modalOpen||portalPhase||state.stage!=='explore'||$('gameScreen').hidden||['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;const d=keyMap[e.key.length===1?e.key.toLowerCase():e.key];if(d){keys.add(d);e.preventDefault();}if(e.key.toLowerCase()==='e'||e.key==='Enter'){const n=nearest();if(n.dist<190){state.world==='park'?talk(n.npc):talkLab();}else toast('주민이나 파크봇에게 조금 더 가까이 가 보세요.');e.preventDefault();}});
  window.addEventListener('keyup',e=>{const d=keyMap[e.key.length===1?e.key.toLowerCase():e.key];if(d)keys.delete(d);});window.addEventListener('blur',()=>{keys.clear();resetMotion();});
  document.querySelectorAll('[data-dir]').forEach(btn=>{const d=btn.dataset.dir;btn.addEventListener('pointerdown',e=>{e.preventDefault();btn.setPointerCapture(e.pointerId);keys.add(d);});for(const event of ['pointerup','pointercancel','lostpointercapture'])btn.addEventListener(event,()=>keys.delete(d));});
  canvas.addEventListener('click',e=>{if(modalOpen||portalPhase||state.stage!=='explore')return;const rect=canvas.getBoundingClientRect();const x=Math.max(80,Math.min(SCENES[state.world].width-80,camera.x+(e.clientX-rect.left)*W/rect.width));const y=Math.max(170,Math.min(SCENES[state.world].height-65,camera.y+(e.clientY-rect.top)*H/rect.height));if(!walkable(x,y)){toast('담장·건물·화단 위로는 이동할 수 없어요. 바닥길을 선택해 주세요.');return;}target={x,y};canvas.focus({preventScroll:true});});
  function renderJournal(){$('clueList').innerHTML=NPCS.map(n=>`<button class="clue-row ${state.visited.includes(n.id)?'got':''}" data-clue="${n.id}"><span class="clue-icon">${n.icon}</span><span><b>${state.visited.includes(n.id)?'✓':'○'} ${esc(n.place)}</b><small>${state.visited.includes(n.id)?esc(n.name)+' · 기록 완료':'공원에서 조사하기'}</small></span></button>`).join('');document.querySelectorAll('[data-clue]').forEach(btn=>btn.addEventListener('click',()=>{const n=NPCS.find(x=>x.id===btn.dataset.clue);if(state.visited.includes(n.id))talk(n);else toast('아바타를 움직여 해당 주민에게 다가가 보세요.');}));$('progressChip').textContent=`단서 ${state.visited.length}/4`;$('labActionBtn').disabled=state.visited.length<4;$('labActionBtn').textContent=state.visited.length===4?'🤖 분석 단계로 이동':'🔒 단서 '+(4-state.visited.length)+'개 더 필요';}
  $('talkBtn').addEventListener('click',()=>{const n=nearest();if(n.dist<190){state.world==='park'?talk(n.npc):talkLab();}else toast('가까운 주민에게 다가가세요.');});
  $('labActionBtn').addEventListener('click',()=>{if(state.visited.length===4){if(state.world==='park')toast('관리실 포털에 다가가면 이동할 수 있어요. 직접 조사한 후 계속 진행해 보세요.');else changeStage('analysis');}});
  function weightTotal(){return CRITERIA.reduce((sum,c)=>sum+state.weights[c.id],0);}
  function renderCriteria(){
    document.querySelector('#analysisStage .chapter-banner h3').textContent='AI는 어떤 기준을 더 중요하게 판단해야 할까요?';
    document.querySelector('#analysisStage .chapter-banner p:last-child').textContent='10점의 중요도를 나누면 파크봇이 그 기준으로 공원을 설계해요. 시범 개장 후 기준을 바꾸어 다시 설계할 수 있어요.';
    document.querySelector('#analysisStage .panel:last-child h3').textContent='⚖️ AI 판단 기준에 점수 배분하기';
    document.querySelector('#analysisStage .panel:last-child .small-note').textContent='각 기준은 최소 1점, 최대 6점이고 전체 합계는 10점이에요. 2점씩은 시작 예시일 뿐 정답이 아니에요.';
    $('criteriaList').innerHTML=CRITERIA.map(c=>`<label class="weight-item" for="weight-${c.id}"><span class="weight-title"><b>${esc(c.label)}</b><strong id="weight-value-${c.id}">${state.weights[c.id]}점</strong></span><small>${esc(c.detail)}</small><input type="range" id="weight-${c.id}" data-weight="${c.id}" min="1" max="6" step="1" value="${state.weights[c.id]}" aria-label="${esc(c.label)} 가중치"></label>`).join('');
    document.querySelectorAll('[data-weight]').forEach(input=>input.addEventListener('input',()=>{
      state.weights[input.dataset.weight]=Number(input.value);save();
      $(`weight-value-${input.dataset.weight}`).textContent=input.value+'점';updateWeightFeedback();
    }));
    updateWeightFeedback();
  }
  function updateWeightFeedback(){
    const total=weightTotal();
    $('criteriaFeedback').textContent=total===10?'✅ 10점을 모두 배분했어요. 이 기준으로 AI를 작동시킬 수 있어요.':total>10?`현재 ${total}/10점 · ${total-10}점을 줄여 주세요.`:`현재 ${total}/10점 · ${10-total}점을 더 배분해 주세요.`;
    $('criteriaCheckBtn').disabled=total!==10;
  }
  $('criteriaCheckBtn').addEventListener('click',()=>{
    if(weightTotal()!==10)return;
    sound.play('success');state.criteriaPassed=true;const proposal=proposePark();state.facilities=[...proposal.ids];state.aiHistory.push({weights:{...state.weights},facilities:[...proposal.ids],score:proposal.score});state.aiHistory=state.aiHistory.slice(-10);save();
    openModal('파크봇의 새로운 계산',`<div class="dialogue"><img src="../publicness/assets/parkbot.png" alt="AI 파크봇"><div><p class="quote-label">파크봇</p><p>“새 기준으로 가능한 시설들을 비교해 공원을 다시 설계했어요. 주민 반응을 확인한 다음 다른 기준으로 다시 설계할 수도 있어요!”</p></div></div>`,`<button class="btn primary" id="toBuild">🌿 공원 설계 시작</button>`);
    $('toBuild').addEventListener('click',()=>{closeModal();changeStage('build');});
  });
  const metrics=()=>{const chosen=FACILITIES.filter(f=>state.facilities.includes(f.id));return{chosen,cost:chosen.reduce((s,f)=>s+f.cost,0),play:chosen.reduce((s,f)=>s+f.play,0),rest:chosen.reduce((s,f)=>s+f.rest,0),access:chosen.reduce((s,f)=>s+f.access,0)};};
  // Each criterion rates the actual facility combination on a transparent 0–10 scale.
  // Weights determine AI's aggregate appraisal, not whether a resident's needs disappear.
  function evaluatePark(facilities=state.facilities,weights=state.weights){
    const chosen=new Set(facilities),has=id=>chosen.has(id),cost=FACILITIES.filter(f=>has(f.id)).reduce((n,f)=>n+f.cost,0);
    const raw={
      users:Math.min(10,(has('play')?4:0)+(has('shade')?2:0)+(has('square')?2:0)+(has('garden')?1:0)+(has('path')?1:0)+(has('lights')?1:0)),
      access:Math.min(10,(has('path')?6:0)+(has('square')?2:0)+(has('shade')?1:0)+(has('garden')?1:0)),
      need:Math.min(10,(has('path')?3:0)+(has('play')?2:0)+(has('shade')?2:0)+(has('garden')?2:0)+(has('square')?1:0)+(has('lights')?1:0)),
      safety:Math.min(10,(has('lights')?5:0)+(has('path')?3:0)+(has('play')?1:0)+(has('shade')?1:0)),
      efficiency:Math.min(10,Math.round(10*((has('play')?4:0)+(has('shade')?2:0)+(has('square')?2:0)+(has('garden')?1:0)+(has('lights')?1:0)+1)/(Math.max(1,cost)*1.4)))
    };
    const contributions=CRITERIA.map(c=>({id:c.id,name:c.label,raw:raw[c.id],weight:weights[c.id],points:raw[c.id]*weights[c.id]}));
    return {raw,contributions,score:Math.round(contributions.reduce((sum,c)=>sum+c.points,0)/Math.max(1,CRITERIA.reduce((n,c)=>n+weights[c.id],0))*10)};
  }
  function proposePark(weights=state.weights){
    let best=null;
    for(let mask=0;mask<(1<<(FACILITIES.length-1));mask++){
      const ids=['path'];let cost=FACILITIES[0].cost;
      for(let i=1;i<FACILITIES.length;i++)if(mask&(1<<(i-1))){ids.push(FACILITIES[i].id);cost+=FACILITIES[i].cost;}
      if(cost>10)continue;
      const score=evaluatePark(ids,weights).score;
      if(!best||score>best.score||(score===best.score&&cost<best.cost)||(score===best.score&&cost===best.cost&&ids.join(',')<best.ids.join(',')))best={ids,cost,score};
    }
    return best;
  }
  function facilityNames(ids){return ids.map(id=>FACILITIES.find(f=>f.id===id)?.name||id).join(' · ');}
  function aiRecommendationCard(){
    const h=state.aiHistory.slice(-2);
    const previous=h.length>1?'<p><b>이전 AI 추천:</b> '+esc(facilityNames(h[0].facilities))+'</p>':'';
    return '<div class="ai-recommend"><strong>🤖 파크봇이 가중치로 설계한 공원</strong>'+previous+'<p><b>이번 AI 추천:</b> '+esc(facilityNames(h.at(-1)?.facilities||[]))+'</p><p>추천안을 그대로 쓰거나 주민의 필요에 맞게 직접 바꿀 수 있어요.</p></div>';
  }
  function trialComparison(){
    const h=state.aiHistory.slice(-2);
    if(h.length<2)return '<div class="ai-recommend"><p>기준을 다시 조절하고 파크봇의 추천이 어떻게 달라지는지 비교해 보세요.</p></div>';
    const before=h[0],after=h[1],diff=facilityNames(before.facilities)!==facilityNames(after.facilities);
    return '<div class="ai-recommend"><h3>🔄 AI 기준 변경 전후</h3><p><b>이전 기준:</b> '+esc(CRITERIA.map(c=>c.label+' '+before.weights[c.id]+'점').join(' · '))+'</p><p><b>이전 추천:</b> '+esc(facilityNames(before.facilities))+'</p><p><b>현재 기준:</b> '+esc(CRITERIA.map(c=>c.label+' '+after.weights[c.id]+'점').join(' · '))+'</p><p><b>현재 추천:</b> '+esc(facilityNames(after.facilities))+'</p><p>'+ (diff?'파크봇의 설계가 달라졌어요.':'이번에는 기준이 바뀌어도 같은 설계가 나왔어요.')+' 주민 반응과 함께 비교해 보세요.</p></div>';
  }
  function scoreMarkup(){
    const score=evaluatePark(),sorted=[...score.contributions].sort((a,b)=>b.weight-a.weight);
    return `<section class="evaluation-panel" aria-label="가중치를 반영한 AI 공원 평가"><h3>🤖 파크봇 평가 · ${score.score}/100점</h3><p>내가 정한 중요도에 따라 계산했어요. 아래 점수는 공원 설계 비교를 위한 모형이며, 주민 만족도의 정답은 아니에요.</p><div class="evaluation-list">${score.contributions.map(c=>`<div class="evaluation-row"><span>${esc(c.name)} <small>중요도 ${c.weight}점</small></span><div class="evaluation-bar"><i style="width:${c.raw*10}%"></i></div><strong>${c.raw}/10</strong></div>`).join('')}</div><p class="evaluation-formula">계산: 각 기준의 달성도(0~10) × 배분한 중요도(1~6), 합산 후 100점으로 환산</p><p>AI가 가장 중시한 기준: <b>${esc(sorted[0].name)}</b>. 주민들의 대화와 AI 점수가 항상 일치하는지 살펴보세요.</p></section>`;
  }
  // Each pixel-art map retains its color only in areas selected by the learner.
  // Zones sit above the background image but below the clickable facility markers.
  const zones = ['play','square','shade','garden','lights','path'];
  function updateMapColors(map){
    if(!map)return;
    let layer=map.querySelector('.facility-color-layer');
    if(!layer){
      layer=document.createElement('div');layer.className='facility-color-layer';layer.setAttribute('aria-hidden','true');
      layer.innerHTML=zones.map(id=>`<span class="facility-color-zone zone-${id}" data-color-zone="${id}"></span>`).join('');
      map.querySelector('img')?.insertAdjacentElement('afterend',layer);
    }
    layer.querySelectorAll('[data-color-zone]').forEach(zone=>zone.classList.toggle('is-muted',!state.facilities.includes(zone.dataset.colorZone)));
  }
  function toggleFacility(id){sound.play('select');state.facilities=state.facilities.includes(id)?state.facilities.filter(x=>x!==id):[...state.facilities,id];save();renderBuild();}
  function renderBuild(){
    const m=metrics();
    document.querySelector('#buildStage .chapter-banner p:last-child').textContent='예산은 10칸이지만 모든 시설을 설치하려면 14칸이 필요해요. 누구의 필요를 먼저 고려할지 선택하고, 시범 개장 후 다시 판단해 보세요.';
    $('facilityList').innerHTML=FACILITIES.map(f=>`<button class="facility ${state.facilities.includes(f.id)?'selected':'unselected'}" data-facility="${f.id}" aria-pressed="${state.facilities.includes(f.id)}"><span class="emoji">${f.icon}</span><span class="description"><b>${esc(f.name)} ${state.facilities.includes(f.id)?'✓':''}</b><small>${esc(f.description)}</small></span><span class="cost">${f.cost}칸</span></button>`).join('');
    document.querySelectorAll('[data-facility]').forEach(b=>b.addEventListener('click',()=>toggleFacility(b.dataset.facility)));
    document.querySelectorAll('[data-spot]').forEach(el=>{
      const f=FACILITIES.find(x=>x.id===el.dataset.spot),selected=state.facilities.includes(f.id);
      el.classList.toggle('selected',selected);el.classList.toggle('unselected',!selected);
      el.setAttribute('role','button');el.setAttribute('tabindex','0');el.setAttribute('aria-pressed',String(selected));
      el.setAttribute('aria-label',f.name+(selected?' 설치됨, 선택하면 제거':' 설치되지 않음, 선택하면 설치'));
      el.onclick=()=>toggleFacility(f.id);el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleFacility(f.id);}};
    });
    updateMapColors($('buildMap'));
    $('budgetChip').textContent=`${m.cost} / 10`;
    $('playMetric').textContent=m.play;$('restMetric').textContent=m.rest;$('accessMetric').textContent=m.access;
    let feedback='선택한 시설은 컬러, 선택하지 않은 시설은 흑백으로 표시돼요. 어떤 주민이 불편해질지 생각해 보세요.';
    if(m.cost>10)feedback='예산 10칸을 초과했어요. 꼭 필요한 시설을 다시 골라 주세요.';
    else if(m.cost===0)feedback='시설을 선택해 보세요. 모두 설치할 수는 없어요.';
    else if(m.cost<7)feedback='예산이 남았어요. 다른 주민을 위한 시설도 살펴보세요.';
    $('buildFeedback').innerHTML=aiRecommendationCard()+'<p>'+esc(feedback)+'</p>';
    $('trialBtn').disabled=m.cost>10||m.cost===0;
  }
  function renderTrial(){const chosen=id=>state.facilities.includes(id);const r=[
    {name:'새봄',img:'saebom',sprite:true,good:chosen('play'),yes:'우와! 다시 친구들과 그네를 탈 수 있어!',no:'운동시설은 생겼지만 우리가 놀 수 있는 곳은 아직 없어.'},
    {name:'정순 할머니',img:'grandmother',good:chosen('shade'),yes:'그늘에서 잠깐 쉬며 친구들과 이야기할 수 있겠구나.',no:chosen('square')?'벤치는 생겼지만 햇볕을 피할 그늘이 없어 오래 머물기 어렵구나.':'햇볕을 피하며 쉴 수 있는 그늘이 필요하구나.'},
    {name:'하린',img:'harin',good:chosen('path')&&chosen('garden'),yes:'이제 정원까지 길이 연결되어 꽃을 볼 수 있어!',no:chosen('path')?'들어올 수는 있지만 함께 가꿀 작은 정원도 있으면 좋겠어.':'정원 앞 계단을 지나갈 수 없어.'},
    {name:'지호',img:'jiho',sprite:true,good:chosen('square'),yes:'아무것도 사지 않아도 광장에서 만날 수 있어!',no:'광장에서 앉으려면 카페를 이용해야 해서 아쉬워.'}
  ];
    const episodes=[
      {time:'🌤️ 오전 · 접근과 놀이',events:[
        chosen('path')?'휠체어를 탄 주민이 공원 안으로 편하게 들어옵니다.':'휠체어를 탄 주민이 턱 앞에서 멈춥니다. 공원 입구부터 접근이 어렵습니다.',
        chosen('play')?(chosen('shade')?'아이들이 놀고 보호자는 그늘에서 기다립니다.':'아이들은 신나게 놀지만 보호자가 앉아서 기다릴 그늘이 부족합니다.'):'아이들이 놀이터를 찾지 못해 산책로에서 뛰다가 보행자와 부딪힐 뻔합니다.'
      ]},
      {time:'☀️ 오후 · 휴식과 공동체',events:[
        chosen('shade')?'어르신들이 나무 그늘 아래에서 쉬어 갑니다.':'햇볕이 강해지자 오래 걷기 어려운 주민이 공원을 일찍 떠납니다.',
        chosen('garden')?(chosen('path')?'주민들이 함께 꽃을 가꿉니다. 모두가 정원까지 접근할 수 있습니다.':'공동 정원은 생겼지만 턱 때문에 일부 주민은 꽃을 가꾸는 활동에 참여하지 못합니다.'):'주민들은 함께 가꿀 공간이 없어 서로 교류할 기회를 놓칩니다.',
        chosen('square')?'누구나 돈을 쓰지 않고 광장에서 쉴 수 있습니다.':'광장에 무료 벤치가 없어 카페를 이용하지 않는 주민은 오래 머무르기 어렵습니다.'
      ]},
      {time:'🌙 저녁 · 안전과 이용 시간',events:[
        chosen('lights')?'산책길 조명 덕분에 해가 진 뒤에도 길을 알아보기 쉽습니다.':'해가 지자 길이 어두워져 일부 주민이 공원 이용을 포기합니다.',
        chosen('path')&&chosen('lights')?'조명이 켜진 무장애 길을 따라 여러 주민이 안전하게 귀가합니다.':(!chosen('path')&&!chosen('lights')?'어둡고 턱이 있는 길 때문에 이동이 어려운 주민의 불편이 더 커집니다.':'일부 이동 문제는 해결됐지만 모든 주민이 안전하게 이동하기에는 부족함이 남습니다.')
      ]}
    ];
    $('reactions').innerHTML=`<div class="trial-story">${episodes.map(ep=>`<section class="trial-episode"><h3>${esc(ep.time)}</h3>${ep.events.map(event=>`<p>• ${esc(event)}</p>`).join('')}</section>`).join('')}</div>`+r.map(x=>`<article class="reaction">${x.sprite?`<span class="dialog-sprite ${x.img}" aria-hidden="true"></span>`:`<img src="../publicness/assets/${x.img}.png" alt="${esc(x.name)} 픽셀 캐릭터">`}<div><b>${x.good?'😊':'💭'} ${esc(x.name)}</b><p>“${esc(x.good?x.yes:x.no)}”</p></div></article>`).join('');
    $('parkImprovements').innerHTML=FACILITIES.map(f=>{const loc={play:[20,27],square:[78,27],shade:[20,72],garden:[79,70],lights:[53,56],path:[54,84]}[f.id];return `<span class="improvement ${chosen(f.id)?'':'unselected'}" style="left:${loc[0]}%;top:${loc[1]}%">${f.icon} ${esc(f.name)}</span>`;}).join('');
    updateMapColors(document.querySelector('.trial-map'));
    $('reactions').insertAdjacentHTML('afterbegin',scoreMarkup()+aiRecommendationCard()+trialComparison());
    const actions=document.querySelector('#trialStage .end-actions');
    if(!document.getElementById('reweightBtn')){
      const btn=document.createElement('button');btn.id='reweightBtn';btn.className='btn';btn.textContent='⚖️ AI 판단 기준 다시 정하기';
      btn.addEventListener('click',()=>changeStage('analysis'));actions.prepend(btn);
    }
  }
  function renderPolicies(){$('policyList').innerHTML=POLICIES.map(p=>`<button class="policy ${state.policy===p.id?'selected':''}" data-policy="${p.id}" aria-pressed="${state.policy===p.id}"><b>${esc(p.title)}</b><span>${esc(p.detail)}</span></button>`).join('');document.querySelectorAll('[data-policy]').forEach(b=>b.addEventListener('click',()=>{state.policy=b.dataset.policy;save();renderPolicies();}));$('finishBtn').disabled=!state.policy;$('reason').value=state.reason;}
  function renderEnding(){const m=metrics(),p=POLICIES.find(x=>x.id===state.policy);$('endSummary').innerHTML=`<b>🌱 ${esc(state.name)} 조사단의 공원 기록</b><p>설치한 시설: ${m.chosen.map(x=>esc(x.name)).join(' · ')}</p><p>개선 예산: ${m.cost}/10 · 놀이 ${m.play} · 휴식 ${m.rest} · 접근 ${m.access}</p><p>내가 정한 AI 중요도: ${CRITERIA.map(c=>`${esc(c.label)} ${state.weights[c.id]}점`).join(' · ')}</p><p>AI의 가중 평가: ${evaluatePark().score}/100점 (실제 주민 만족도와 다를 수 있음)</p><p>선택한 AI 운영 원칙: ${esc(p?.title||'')}</p>${state.reason?`<p>내가 생각한 이유: ${esc(state.reason)}</p>`:''}<p>시범 개장 횟수: ${state.trialRuns}회</p>`;}
  function renderStage(){const stages=['explore','analysis','build','trial','meeting','end'];for(const s of stages){const el=s==='explore'?'exploreStage':s+'Stage';$(el).hidden=state.stage!==s;}const title={explore:'별빛공원 현장 조사',analysis:'AI 계산 기준 분석',build:'우리 모두의 공원 설계',trial:'두 번째 개장식',meeting:'공원 운영 원칙',end:'공공성 탐험 완료'};const hint={explore:'공원 주민들에게 다가가면 자동으로 대화가 열려요.',analysis:'AI가 놓친 기준을 찾아 선택하세요.',build:'한정된 자원으로 공원을 설계하세요.',trial:'주민의 반응을 확인하고 필요하면 수정하세요.',meeting:'AI가 지켜야 할 원칙을 선택해 주세요.',end:'모두의 목소리를 기억해 주세요.'};$('stageTitle').textContent=title[state.stage]||'별빛공원 탐험';$('stageHint').textContent=hint[state.stage]||'';$('stageNumber').textContent='CHAPTER '+String(Math.max(1,stages.indexOf(state.stage)+1)).padStart(2,'0');if(state.stage==='explore')renderJournal();if(state.stage==='analysis')renderCriteria();if(state.stage==='build')renderBuild();if(state.stage==='trial')renderTrial();if(state.stage==='meeting')renderPolicies();if(state.stage==='end')renderEnding();}
  function changeStage(stage){state.stage=stage;save();renderStage();window.scrollTo(0,0);}
  $('trialBtn').addEventListener('click',()=>{const m=metrics();if(m.cost>10||m.cost===0)return;sound.play('success');state.trialRuns++;changeStage('trial');});
  $('reviseBtn').addEventListener('click',()=>changeStage('build'));
  $('meetingBtn').addEventListener('click',()=>changeStage('meeting'));
  $('finishBtn').addEventListener('click',()=>{if(!state.policy)return;sound.play('complete');state.reason=$('reason').value.trim();state.finished=true;changeStage('end');});
  $('replayBtn').addEventListener('click',()=>{sound.pause();state=blank();save();$('nickname').value=state.name;screen(false);});
  $('downloadBtn').addEventListener('click',()=>{const m=metrics(),p=POLICIES.find(x=>x.id===state.policy);const lines=['윤리시티: 사라진 우리들의 공원',`별명: ${state.name}`,`조사 단서: ${state.visited.length}/4`,`개선 시설: ${m.chosen.map(x=>x.name).join(', ')}`,`개선 예산: ${m.cost}/10`,`AI 가중치: ${CRITERIA.map(c=>c.label+' '+state.weights[c.id]+'점').join(', ')}`,`AI 평가: ${evaluatePark().score}/100점`,`시범 개장 횟수: ${state.trialRuns}`,`AI 원칙: ${p?.title||''}`,`이유: ${state.reason||'(수업에서 함께 이야기해 보세요)'}`];const u=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download='윤리시티_사라진_우리들의_공원_탐구기록.txt';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);});
  // Saved progress never bypasses the opening screen; the learner chooses Start or Resume.
  screen(false);
})();
