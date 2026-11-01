(() => {
  'use strict';
  const DATA = JSON.parse(document.querySelector('#scenario-data').textContent);
  const STORE='ethicity.rights.v0.7.progress';
  const RESULT='ethicity.result.rights';
  const PLAYER='ethicity.player';
  const CW=1280,CH=720;
  const $=id=>document.getElementById(id);
  const esc=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sceneMap=Object.fromEntries(DATA.scenes.map(x=>[x.id,x]));
  const chapterList=DATA.chapters;
  const chapterMap=Object.fromEntries(chapterList.map(x=>[x.id,x]));
  const stationMap=Object.fromEntries(DATA.stations.map(x=>[x.id,x]));
  const stationsByChapter=Object.fromEntries(chapterList.map(ch=>[ch.id,DATA.stations.filter(s=>s.chapter===ch.id)]));
  const defaultClues=()=>Object.fromEntries(chapterList.map(ch=>[ch.id,[]]));
  const defaultState=()=>({started:false,scene:chapterList[0].startScene,x:638,y:560,avatar:'haneul',nickname:'별고래',chapter:chapterList[0].id,clues:defaultClues(),decisions:{},caseAnswers:{},seenIntro:{},completed:false,finalPolicy:null});
  function getJson(key){try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}}
  function normalizeClues(clues){const base=defaultClues(); if(!clues||typeof clues!=='object')return base; for(const ch of chapterList){base[ch.id]=Array.isArray(clues[ch.id])?clues[ch.id].filter(id=>stationMap[id]&&stationMap[id].chapter===ch.id):[]} return base;}
  function load(){const old=getJson(STORE); const seed=defaultState(); if(!old||typeof old!=='object')return seed;
    const chapter = chapterMap[old.chapter]?old.chapter:seed.chapter;
    return {...seed,...old,scene:sceneMap[old.scene]?old.scene:seed.scene,avatar:['jiho','haneul'].includes(old.avatar)?old.avatar:seed.avatar,clues:normalizeClues(old.clues),decisions:old.decisions&&typeof old.decisions==='object'?old.decisions:{},caseAnswers:old.caseAnswers&&typeof old.caseAnswers==='object'?old.caseAnswers:{},seenIntro:old.seenIntro&&typeof old.seenIntro==='object'?old.seenIntro:{},chapter};
  }
  let state=load(),assetEngine=null;
  let modal=false,choicePolicy=null,liveReason='';
  const canvas=$('mapCanvas'),ctx=canvas.getContext('2d');
  let held=new Set(),lastTs=0,justMoved=false,moveDir='down';
  function currentChapterId(){return state.chapter;}
  function currentChapter(){return chapterMap[currentChapterId()];}
  function totalClueCount(){return Object.values(state.clues).reduce((a,b)=>a+b.length,0)}
  function chapterStations(id=currentChapterId()){return stationsByChapter[id]||[];}
  function chapterDone(id=currentChapterId()){return chapterStations(id).every(s=>state.clues[id]?.includes(s.id));}
  function chapterReviewed(id=currentChapterId()){return !!state.caseAnswers[id];}
  function allReviewed(){return chapterList.every(ch=>chapterReviewed(ch.id));}
  function nextChapterId(id){const idx=chapterList.findIndex(ch=>ch.id===id);return idx>=0&&idx<chapterList.length-1?chapterList[idx+1].id:null}
  function getWalkAreas(sceneId=state.scene){
    const fallback={classroom:[{x:120,y:470,w:1040,h:170},{x:500,y:330,w:300,h:120}],courtyard:[{x:80,y:360,w:1120,h:120},{x:555,y:90,w:170,h:570}],library:[{x:430,y:340,w:420,h:270},{x:575,y:600,w:125,h:90}],ai_lab:[{x:430,y:340,w:420,h:270},{x:575,y:600,w:125,h:90}]};
    const bg=window.ETHICITY_COMMON_MANIFEST?.backgrounds?.[sceneId];
    return (bg&&Array.isArray(bg.walkAreas)&&bg.walkAreas.length?bg.walkAreas:fallback[sceneId]||[{x:110,y:415,w:1060,h:220}]);
  }
  function canStand(x,y,sceneId=state.scene){
    return getWalkAreas(sceneId).some(r=>x>=r.x && x<=r.x+r.w && y>=r.y && y<=r.y+r.h);
  }
  function moveTo(nx,ny){
    const px=state.x, py=state.y;
    if(canStand(nx,ny)){state.x=nx;state.y=ny;return true;}
    if(canStand(nx,py)){state.x=nx;return true;}
    if(canStand(px,ny)){state.y=ny;return true;}
    return false;
  }
  function nearestActionText(){
    const stations=chapterStations(currentChapterId()).filter(s=>!state.clues[currentChapterId()].includes(s.id));
    if(!stations.length) return '현재 사건의 증거 파일을 모두 모았어요.';
    return '다음 추천: ' + stations.slice(0,3).map(s=>`${sceneMap[s.scene].name}의 ${s.title}`).join(' → ');
  }
  function openChapterStory(chapterId, force=false){
    const ch=chapterMap[chapterId]; if(!ch) return;
    if(state.seenIntro?.[chapterId] && !force) return;
    const lines=ch.storyLines||[];
    let page=0;
    const drawPage=()=>{
      const last=page===lines.length;
      const voice=page===0?'긴급 알림':page===1?'사건 제보':page===2?'현장 상황':'조사단 안내';
      const content=last
        ? `<div class="story-objective"><b>🎯 오늘의 탐험 목표</b><ol>${(ch.nextActions||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ol><p>교실과 중앙마당의 인물을 만나고, 초록 포털을 지나 다른 장소에서 증거를 찾아보세요.</p></div>`
        : `<div class="story-line"><span class="story-voice">${voice}</span><p>${esc(lines[page])}</p></div>`;
      const body=`<div class="story-progress" aria-label="이야기 진행">${Array.from({length:lines.length+1},(_,i)=>`<span class="${i===page?'now':i<page?'passed':''}"></span>`).join('')}</div><div class="story-stage"><div class="story-chapter-label">CASE ${chapterList.findIndex(x=>x.id===ch.id)+1} · ${esc(ch.shortTitle)}</div>${content}</div><div class="dialog-actions"><button class="btn" type="button" id="storyPrev" ${page===0?'disabled':''}>← 이전</button><button class="btn primary" type="button" id="storyNext">${last?'🔎 조사 시작하기':'다음 이야기 →'}</button></div>`;
      elDialog('📖 사건 이야기',ch.storyTitle||ch.title,body, page===1?(ch.id==='saebom'?'saebom':'onyu'):null);
      $('storyPrev').addEventListener('click',()=>{page--;drawPage()});
      $('storyNext').addEventListener('click',()=>{
        if(!last){page++;drawPage();return;}
        state.seenIntro[chapterId]=true;persist();closeModal();notice(nearestActionText());
      });
    };
    drawPage();
  }
  function activeStationsInScene(scene=state.scene){return chapterStations(currentChapterId()).filter(s=>s.scene===scene)}
  function progressText(){return `사건 해결 ${Object.keys(state.caseAnswers).length}/${chapterList.length} · 증거 ${totalClueCount()}/${DATA.stations.length}`}
  function persist(){try{localStorage.setItem(STORE,JSON.stringify(state))}catch{notice('브라우저 저장을 사용할 수 없어 이번 진행은 임시로 유지됩니다.')}}
  function notice(message){const t=$('notice');t.textContent=message;t.hidden=false;clearTimeout(notice.t);notice.t=setTimeout(()=>t.hidden=true,3800)}
  function showScreen(game){$('intro').hidden=!!game;$('game').hidden=!game;$('resumeBtn').hidden=!state.started;if(game){renderAll();setTimeout(()=>canvas.focus({preventScroll:true}),80)}}
  function activeAvatar(a){state.avatar=a;document.querySelectorAll('.avatar-btn').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.avatar===a)))}
  const playerLocal=getJson(PLAYER)||{};
  const oldAvatar=playerLocal.character==='char_04'?'jiho':playerLocal.character==='char_03'?'haneul':state.avatar;
  if(!state.started)state.avatar=oldAvatar;
  $('nickname').value=state.nickname==='별고래'&&/^[가-힣]{1,5}$/.test(playerLocal.nickname||'')?playerLocal.nickname:state.nickname;
  activeAvatar(state.avatar);
  $('resumeBtn').hidden=!state.started;
  document.querySelectorAll('.avatar-btn').forEach(b=>b.addEventListener('click',()=>activeAvatar(b.dataset.avatar)));
  $('startBtn').addEventListener('click',()=>{
    const name=$('nickname').value.trim();
    if(!/^[가-힣]{1,5}$/.test(name)){notice('실명이 아닌 한글 별명 1~5글자를 입력해 주세요.');$('nickname').focus();return;}
    const next=defaultState(); next.started=true; next.avatar=state.avatar; next.nickname=name; state=next;
    try{localStorage.setItem(PLAYER,JSON.stringify({character:state.avatar==='jiho'?'char_04':'char_03',nickname:state.nickname}))}catch{}
    persist(); showScreen(true); setTimeout(()=>openChapterStory(currentChapterId()),120);
  });
  $('resumeBtn').addEventListener('click',()=>showScreen(true));
  $('homeBtn').addEventListener('click',()=>{closeModal();showScreen(false)});
  $('resetBtn').addEventListener('click',()=>{
    if(!confirm('인권보장 게임 진행과 완료 기록만 지우고 다시 시작할까요? 다른 윤리시티 게임 기록은 남습니다.'))return;
    try{localStorage.removeItem(STORE);localStorage.removeItem(RESULT)}catch{}
    state=defaultState(); activeAvatar(state.avatar); $('nickname').value=state.nickname; showScreen(false); notice('인권보장 게임만 초기화했어요.');
  });
  $('soundBtn').addEventListener('click',()=>{audioEnabled=!audioEnabled;$('soundBtn').textContent=audioEnabled?'🔊 효과음 켜짐':'🔇 효과음 꺼짐';if(assetEngine)assetEngine.setSound(audioEnabled);tone()});

  let audioEnabled=false,audioCtx=null;
  function tone(f=630){if(!audioEnabled)return; if(assetEngine){assetEngine.playSound(f>750?'collect':f<500?'door':'tap').catch(()=>{});return} try{audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='sine';o.frequency.setValueAtTime(f,audioCtx.currentTime);g.gain.setValueAtTime(.035,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.11);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+.12)}catch{}}

  // 실제 맵의 포털: 중앙마당이 허브입니다. 다른 방은 항상 중앙마당으로 돌아옵니다.
  // 좌표는 팀 공통 1280x720 배경의 발 위치 기준이며, 방의 이동 가능 영역과 일치합니다.
  const PORTALS = {
    courtyard:[
      {id:'classroom',x:295,y:435,r:49,label:'교실',dest:'classroom'},
      {id:'library',x:1030,y:435,r:49,label:'도서관',dest:'library'},
      {id:'ai_lab',x:640,y:275,r:53,label:'AI 실습실',dest:'ai_lab'}
    ],
    classroom:[{id:'home',x:640,y:647,r:49,label:'중앙마당으로',dest:'courtyard'}],
    library:[{id:'home',x:640,y:647,r:49,label:'중앙마당으로',dest:'courtyard'}],
    ai_lab:[{id:'home',x:640,y:647,r:49,label:'중앙마당으로',dest:'courtyard'}]
  };
  let portalCooldown=0;
  function goThroughPortal(portal){
    if(!portal || Date.now()<portalCooldown)return false;
    portalCooldown=Date.now()+1100;
    held.clear();justMoved=false;
    state.scene=portal.dest;
    // 방에 들어온 후 바로 포털에 다시 닿지 않도록 출발 지점을 멀리 지정합니다.
    if(portal.dest==='courtyard') {state.x=640;state.y=515;}
    else {state.x=640;state.y=485;}
    persist();renderAll();tone(450);
    notice(portal.dest==='courtyard'?'중앙마당에 도착했어요. 다른 건물 입구로 걸어가 보세요.':`${sceneMap[portal.dest].name}에 들어왔어요. 나갈 때는 아래쪽 초록 포털로 가세요.`);
    return true;
  }
  function checkPortal(){
    if(modal||Date.now()<portalCooldown)return;
    const portal=(PORTALS[state.scene]||[]).find(p=>Math.hypot(state.x-p.x,state.y-p.y)<p.r);
    if(portal)goThroughPortal(portal);
  }
  function drawPortals(){
    for(const p of PORTALS[state.scene]||[]){
      const time=performance.now()/380;
      ctx.save();ctx.translate(p.x,p.y);
      // 투명한 연두색 포털과 방향 표시를 지도 위에 표시합니다.
      ctx.fillStyle='rgba(114,183,196,.25)';ctx.beginPath();ctx.ellipse(0,0,69,24,0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#294b40';ctx.lineWidth=5;ctx.stroke();
      ctx.strokeStyle='#f3cf72';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(0,0,50,15,0,0,Math.PI*2);ctx.stroke();
      const bounce=Math.sin(time)*4;
      ctx.fillStyle='#fff9e7';ctx.strokeStyle='#294b40';ctx.lineWidth=4;
      const w=p.label.length>7?224:166;
      ctx.fillRect(-w/2,-96+bounce,w,44);ctx.strokeRect(-w/2,-96+bounce,w,44);
      ctx.textAlign='center';ctx.fillStyle='#294b40';ctx.font="bold 21px 'Malgun Gothic',sans-serif";
      ctx.fillText('↪ '+p.label,0,-67+bounce);
      ctx.restore();
    }
  }
  function changeScene(id){
    // 탭은 접근성을 위한 보조 이동 수단입니다. 기본 플레이는 지도상의 포털을 이용합니다.
    if(!sceneMap[id])return;
    portalCooldown=Date.now()+1100;
    held.clear();justMoved=false;
    state.scene=id;state.x=640;state.y=(id==='courtyard'?515:485);
    persist();renderAll();tone(460);
  }
  document.querySelectorAll('.scene-tab').forEach(b=>b.addEventListener('click',()=>changeScene(b.dataset.scene)));

  function renderAll(){
    const ch=currentChapter();
    $('progressCount').textContent=progressText();
    $('heroName').textContent=state.nickname;
    $('sceneDescription').textContent=`${sceneMap[state.scene].description} · 현재 ${ch.shortTitle}을(를) 조사 중이에요.`;
    document.querySelectorAll('.scene-tab').forEach(x=>x.setAttribute('aria-current',String(x.dataset.scene===state.scene)));
    $('chapterTitle').textContent=`📌 ${ch.shortTitle} · ${ch.title}`;
    $('chapterIntro').textContent=ch.intro;
    $('chapterBadgeTitle').textContent=`🗂️ ${ch.shortTitle} 정리`;
    renderMissions(); renderCards(); renderFinish(); renderCasePulse(); drawScene();
  }

  function renderCasePulse(){
    const ch=currentChapter(),total=chapterStations(ch.id).length,found=state.clues[ch.id].length;
    $('casePulse').textContent=chapterReviewed(ch.id)?'✅ 사건 정리 완료':`🔎 조사 기록 ${found}/${total} · ${found===0?'첫 제보를 만나 보세요':found===total?'사건을 정리할 준비가 됐어요':'모은 자료와 남은 의문을 확인하세요'}`;
    $('notebookBtn').textContent=`📓 조사 수첩 (${found}/${total})`;
  }

  function openNotebook(){
    const ch=currentChapter(),stations=chapterStations(ch.id),found=stations.filter(s=>state.clues[ch.id].includes(s.id)),missing=stations.filter(s=>!state.clues[ch.id].includes(s.id));
    const gathered=found.length?found.map(s=>`<li><b>${esc(s.card.title)}</b><p>${esc(s.card.detail)}</p><small>내 선택: ${esc(s.choices.find(c=>c.id===state.decisions[s.id])?.label||'미기록')}</small></li>`).join(''):'<li>아직 모은 자료가 없어요. 첫 번째 인물을 찾아가 보세요.</li>';
    const unknown=missing.length?missing.map(s=>`<li>${esc(sceneMap[s.scene].name)} · ${esc(s.title)}</li>`).join(''):'<li>모든 조사 자료를 모았어요. 이제 근거를 비교해 판단해 보세요.</li>';
    const body=`<div class="notebook-intro"><b>${esc(state.nickname)} 조사관의 사건 기록</b><p>${esc(ch.intro)}</p></div><div class="notebook-grid"><section><h3>📂 모은 자료 (${found.length})</h3><ul>${gathered}</ul></section><section><h3>❔ 아직 확인할 자료 (${missing.length})</h3><ul>${unknown}</ul><h3>⚖️ 판단하기 전에</h3><p>${esc(ch.review.principle)}</p></section></div><div class="dialog-actions"><button type="button" class="btn green" id="notebookStory">📖 사건 이야기 다시 보기</button><button type="button" class="btn primary" id="notebookClose">탐험 계속 →</button></div>`;
    elDialog('📓 조사 수첩',ch.title,body);
    $('notebookStory').addEventListener('click',()=>openChapterStory(ch.id,true));
    $('notebookClose').addEventListener('click',closeModal);
  }
  $('notebookBtn').addEventListener('click',openNotebook);

  function renderMissions(){
    const elem=$('missionList'); elem.innerHTML='';
    const here=activeStationsInScene();
    if(!here.length){
      elem.innerHTML='<div class="emptyhint">이 장소에는 현재 사건 단서가 없어요.<br>하단 초록색 포털을 밟아 중앙마당으로 돌아가세요.</div>';
    }else{
      for(const [i,s] of here.entries()){
        const done=state.clues[currentChapterId()].includes(s.id);
        const b=document.createElement('button'); b.className='mission-btn'+(done?' done':''); b.type='button';
        b.innerHTML=`<span class="num">${done?'✓':i+1}</span><span><span class="name">${esc(s.title)}</span><span class="sub">${esc(s.category)} ${done?'· 다시 보기':'· 조사하기'}</span></span>`;
        b.addEventListener('click',()=>openStation(s.id)); elem.append(b);
      }
    }
    const ch=currentChapter();
    if(chapterDone(ch.id)&&!chapterReviewed(ch.id)) $('missionCountHint').textContent='모든 증거를 찾았어요! 아래의 사건 정리 버튼을 눌러 내 판단을 정리해 보세요.';
    else if(chapterReviewed(ch.id)) $('missionCountHint').textContent='이 사건은 정리되었어요. 다음 사건이나 최종 위원회로 진행하세요.';
    else $('missionCountHint').textContent=`${ch.title}의 증거 파일을 모으는 중이에요. (${state.clues[ch.id].length}/${chapterStations(ch.id).length}) · ${nearestActionText()}`;
  }

  function renderCards(){
    const el=$('cards'); el.innerHTML='';
    DATA.stations.forEach((s,i)=>{
      const done=state.clues[s.chapter]?.includes(s.id),chapterTag=chapterMap[s.chapter].shortTitle;
      const elBtn=document.createElement('button'); elBtn.type='button'; elBtn.className='card-mini'+(done?'':' locked'); elBtn.disabled=!done;
      elBtn.title=done?s.card.detail:'아직 찾지 못한 증거 파일';
      elBtn.innerHTML=`<span class="card-n">${done?'✦':'?'}</span><span class="card-t">${done?esc(`${chapterTag} · ${s.card.label}`):`잠긴 파일 ${i+1}`}</span>`;
      elBtn.addEventListener('click',()=>openCard(s.id)); el.append(elBtn);
    })
  }

  function renderFinish(){
    const ch=currentChapter();
    $('caseBtn').disabled=!(chapterDone(ch.id));
    $('caseBtn').textContent=chapterReviewed(ch.id)?'✅ 이 사건 정리 다시 보기':chapterDone(ch.id)?'📝 사건 정리하기':'🔒 증거 수집 필요';
    $('finalBtn').disabled=!allReviewed();
    $('finalBtn').textContent=state.completed?'🎓 나의 결론 다시 보기':allReviewed()?'🏛️ 최종 위원회 열기':'🔒 두 사건 해결 필요';
  }

  $('caseBtn').addEventListener('click',()=>openCaseReview());
  $('finalBtn').addEventListener('click',()=>state.completed?openEnding():openFinal());

  function elDialog(head,title,body,npcId=null){
    const box=$('modal'),p=$('dialog');
    // The original 256px bust sprite ends abruptly at the shoulders.
    // Use the complete walking sprite instead so the character is not cut off.
    const portrait=npcId&&assetEngine?'<canvas class="dialog-portrait" width="160" height="180" aria-hidden="true"></canvas>':'';
    const content=portrait
      ? `<div class="dialog-body dialog-layout"><div class="dialog-content">${body}</div><aside class="dialog-character" aria-label="등장인물"><div class="character-card">${portrait}<span class="character-caption">${esc(head.includes('사건 이야기')?'이야기 속 인물':'사건의 등장인물')}</span></div></aside></div>`
      : `<div class="dialog-body">${body}</div>`;
    p.innerHTML=`<div class="dialog-head"><div class="kicker">${esc(head)}</div><h2 id="dialogTitle">${esc(title)}</h2><button class="xclose" type="button" id="closeModal" aria-label="창 닫기">✕</button></div>${content}`;
    box.hidden=false; modal=true; document.body.style.overflow='hidden'; $('closeModal').addEventListener('click',closeModal);
    if(portrait){try{assetEngine.drawCharacter(p.querySelector('.dialog-portrait').getContext('2d'),npcId,80,165,'down',1,1.25)}catch(e){console.warn('대화 캐릭터 표시 실패',e)}}
    $('closeModal').focus(); tone();
  }
  function closeModal(){modal=false; $('modal').hidden=true; document.body.style.overflow=''; canvas.focus({preventScroll:true})}
  $('modal').addEventListener('click',e=>{if(e.target===$('modal'))closeModal()});

  function openStation(id,forceChoice=false){
    const s=stationMap[id]; if(!s||s.chapter!==currentChapterId())return;
    if(state.decisions[id]&&!forceChoice){showResult(id,state.decisions[id]); return;}
    const art=`<div class="document-fake"><div class="fake-bar"><span class="lights"></span>${esc(s.artifactTitle)}</div><p>${esc(s.artifact)}</p></div>`;
    const body=`<p class="speaker">${esc(s.speaker)}의 이야기 · ${esc(s.category)}</p><div class="story">이 단서는 어떤 의미일까요? 사건의 핵심을 생각하며 선택해 보세요.</div>${art}<p class="question">${esc(s.question)}</p><div class="choices">${s.choices.map((o,i)=>`<button class="choice" type="button" data-answer="${esc(o.id)}"><b>${String.fromCharCode(65+i)}</b><span>${esc(o.label)}</span></button>`).join('')}</div><p class="muted" style="margin-top:12px">정답만 찾는 게임이 아니라, 어떤 근거로 판단이 바뀌는지 살펴보는 탐험입니다.</p>`;
    elDialog('🔎 단서 조사',s.title,body,s.npc);
    $('dialog').querySelectorAll('[data-answer]').forEach(x=>x.addEventListener('click',()=>chooseStation(id,x.dataset.answer)));
  }

  function chooseStation(id,answer){
    const s=stationMap[id],c=s?.choices.find(x=>x.id===answer); if(!c)return;
    state.decisions[id]=answer;
    if(!state.clues[s.chapter].includes(id)) state.clues[s.chapter].push(id);
    persist(); renderAll(); showResult(id,answer); tone(840);
  }

  function showResult(id,answer){
    const s=stationMap[id],c=s.choices.find(x=>x.id===answer);
    const body=`<p class="speaker">${esc(s.speaker)} · 선택의 결과</p><div class="reveal"><h3>📣 어떤 점을 알게 되었나요?</h3><p>${esc(c.result)}</p></div><div class="costcard"><div class="muted">획득한 증거 파일 · ${esc(s.category)}</div><h3 style="margin:7px 0">✦ ${esc(s.card.title)}</h3><p><b>${esc(s.card.label)}</b></p><p>${esc(s.card.detail)}</p><p class="tip">생각해 보기: ${esc(s.card.principle)}</p></div><p class="muted">선택 기록은 이 브라우저에만 저장돼요. 다른 선택을 다시 해 보며 생각이 어떻게 바뀌는지 살펴볼 수도 있어요.</p><div class="dialog-actions"><button id="reviewChoice" class="btn" type="button">↶ 다른 선택 해 보기</button><button id="continuePlay" class="btn primary" type="button">증거 파일 챙기고 계속 →</button></div>`;
    elDialog('🗃️ 증거 파일 획득',s.title,body,s.npc);
    $('reviewChoice').addEventListener('click',()=>openStation(id,true));
    $('continuePlay').addEventListener('click',()=>{closeModal();
      if(chapterDone(s.chapter)&&!chapterReviewed(s.chapter)) notice(`${chapterMap[s.chapter].shortTitle}의 증거 수집 완료! 이제 사건 정리 버튼을 눌러 보세요.`);
      else notice(`${progressText()} · 다른 단서를 찾아요.`);
    });
  }

  function openCard(id){
    const s=stationMap[id]; if(!s)return;
    const chosen=s.choices.find(c=>c.id===state.decisions[id]);
    elDialog('🗃️ 나의 증거 파일',s.card.title,`<div class="costcard"><div class="muted">${esc(chapterMap[s.chapter].shortTitle)} · ${esc(s.category)}</div><h3>${esc(s.card.label)}</h3><p>${esc(s.card.detail)}</p><p class="tip">${esc(s.card.principle)}</p></div><p class="muted">그때 내 선택: ${esc(chosen?.label||'다시 살펴보는 중')}</p><div class="dialog-actions"><button id="reviewCard" class="btn" type="button">그때 선택 다시 보기</button><button id="closeCard" class="btn primary" type="button">확인</button></div>`);
    $('reviewCard').addEventListener('click',()=>{closeModal(); if(s.chapter!==currentChapterId()){state.chapter=s.chapter; state.scene=s.scene; persist(); renderAll()} openStation(id,true)});
    $('closeCard').addEventListener('click',closeModal);
  }

  function optionLabel(chapterId,qid,oid){
    const q=chapterMap[chapterId].review.questions.find(x=>x.id===qid); return q?.options.find(x=>x.id===oid)?.label||oid;
  }

  function openCaseReview(){
    const ch=currentChapter();
    if(chapterReviewed(ch.id)){openCaseResolution(ch.id,true); return;}
    if(!chapterDone(ch.id)){notice('먼저 현재 사건의 증거 파일을 모두 모아 주세요.'); return;}
    const form=`<div class="review-form">${ch.review.questions.map(q=>`<div class="review-q"><h3>${esc(q.label)}</h3><div class="review-options">${q.options.map(o=>`<label class="review-opt"><input type="radio" name="q_${esc(q.id)}" value="${esc(o.id)}"><span>${esc(o.label)}</span></label>`).join('')}</div></div>`).join('')}<label class="reflect-text"><b>내가 이렇게 판단한 이유 (선택 입력)</b><textarea id="caseReason" maxlength="220" placeholder="예: AI 경고만으로는 충분하지 않았고, 메모와 수정 기록이 직접 작성의 근거가 되었어요."></textarea></label><div class="dialog-actions"><button class="btn primary" id="resolveCase" type="button">이 사건 정리 완료 →</button></div></div>`;
    elDialog('📝 사건 정리',ch.review.heading,`<div class="case-summary"><div class="summary-card"><p>${esc(ch.review.summary)}</p></div>${form}</div>`);
    $('resolveCase').addEventListener('click',()=>{
      const answers={};
      for(const q of ch.review.questions){const picked=document.querySelector(`input[name="q_${q.id}"]:checked`); if(!picked){notice('모든 질문에 답한 뒤 정리해 주세요.'); return;} answers[q.id]=picked.value;}
      answers.reason=$('caseReason').value.trim();
      state.caseAnswers[ch.id]=answers;
      const next=nextChapterId(ch.id);
      if(next){state.chapter=next; state.scene=chapterMap[next].startScene; state.x=638; state.y=560;}
      persist(); renderAll(); openCaseResolution(ch.id,false);
    });
  }

  function openCaseResolution(chapterId,repeat=false){
    const ch=chapterMap[chapterId],answers=state.caseAnswers[chapterId]; if(!answers)return;
    const body=`<div class="ending-banner"><div class="crown">${chapterId==='saebom'?'🔍':'🚪'}</div><div class="muted">${esc(ch.shortTitle)} 정리 결과</div><h3>${esc(ch.review.resolutionTitle)}</h3><p>${esc(ch.review.resolution)}</p></div><div class="decision-trail">${Object.entries(answers).filter(([k])=>k!=='reason').map(([k,v])=>`<div class="trail"><b>${esc(ch.review.questions.find(q=>q.id===k).label)}</b><p>${esc(optionLabel(chapterId,k,v))}</p></div>`).join('')}${answers.reason?`<div class="trail"><b>내가 적은 이유</b><p>${esc(answers.reason)}</p></div>`:''}</div><div class="costcard"><h3>획득한 배지 · ${esc(ch.badge)}</h3><p>${esc(ch.review.principle)}</p></div><p class="muted">${esc(ch.review.unlockNotice)}</p><div class="dialog-actions"><button class="btn primary" id="caseClose" type="button">${repeat?'확인':'다음으로'} →</button></div>`;
    elDialog('✅ 사건 해결',ch.review.resolutionTitle,body);
    $('caseClose').addEventListener('click',()=>{closeModal(); if(!repeat){const nextId=nextChapterId(chapterId); if(nextId){notice(ch.review.unlockNotice); setTimeout(()=>openChapterStory(nextId),140);} else notice('두 사건을 모두 해결했어요. 최종 위원회를 열어 보세요.');}});
  }

  function openFinal(){
    if(!allReviewed()){notice('두 사건을 모두 조사하고 정리한 뒤에 최종 위원회를 열 수 있어요.');return;}
    choicePolicy=null; liveReason='';
    const summaries=chapterList.map(ch=>`<div class="trail"><b>${esc(ch.shortTitle)} · ${esc(ch.title)}</b><p>${esc(ch.review.principle)}</p></div>`).join('');
    const body=`<div class="reveal"><h3>두 사건에서 무엇을 배웠나요?</h3><p>AI는 편리함을 줄 수 있지만, 학생의 발표·출입처럼 권리에 영향을 줄 때는 더 엄격한 기준이 필요해요. 여러분이라면 학교에 어떤 원칙을 제안할까요?</p></div><div class="decision-trail">${summaries}</div><p class="question">${esc(DATA.final.question)}</p><div class="policy-grid">${DATA.final.policies.map(p=>`<button class="policy" type="button" data-policy="${esc(p.id)}" aria-pressed="false"><b>${esc(p.title)}</b><small>${esc(p.desc)}</small></button>`).join('')}</div><label class="reflection" for="reason">내 선택의 이유 (선택 입력 · 입력하지 않아도 계속할 수 있어요)<textarea id="reason" placeholder="예: 학생의 권리를 제한하는 최종 판단은 사람이 책임져야 한다고 생각해요." maxlength="220"></textarea></label><p class="muted">이유 글은 서버로 전송하거나 저장하지 않아요. 내려받기 버튼을 누를 때만 학습 카드에 포함됩니다.</p><div class="dialog-actions"><button class="btn primary" id="resolveFinal" disabled type="button">우리 학교의 원칙 정하기 →</button></div>`;
    elDialog('🏛️ 마지막 미션',DATA.final.heading,body);
    $('dialog').querySelectorAll('[data-policy]').forEach(b=>b.addEventListener('click',()=>{choicePolicy=b.dataset.policy; $('dialog').querySelectorAll('[data-policy]').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); $('resolveFinal').disabled=false;}));
    $('resolveFinal').addEventListener('click',()=>{if(!choicePolicy)return; liveReason=$('reason').value.trim(); state.finalPolicy=choicePolicy; state.completed=true; try{localStorage.setItem(RESULT,JSON.stringify({game:'rights',completed:true,ending:choicePolicy,version:'0.1.0-common1'}))}catch{} persist(); renderAll(); openEnding();});
  }

  function openEnding(){
    const p=DATA.final.policies.find(x=>x.id===state.finalPolicy)||DATA.final.policies[0];
    const chapterNotes=chapterList.map(ch=>{
      const ans=state.caseAnswers[ch.id]||{};
      const bits=Object.entries(ans).filter(([k])=>k!=='reason').map(([k,v])=>`${ch.review.questions.find(q=>q.id===k).label}: ${optionLabel(ch.id,k,v)}`);
      return `<li><b>${esc(ch.shortTitle)} · ${esc(ch.title)}</b><br>${esc(bits.join(' / '))}</li>`;
    }).join('');
    const body=`<div class="ending-banner"><div class="crown">⚖️</div><div class="muted">윤리시티 학생 자문위원 · ${esc(state.nickname)}</div><h3>${esc(p.ending)}</h3><p>${esc(p.result)}</p></div><div class="costcard"><h3>나의 원칙 카드</h3><p>${esc(p.card)}</p></div><div class="end-note"><b>내가 조사한 사건들</b><ol>${chapterNotes}</ol><b>수업에서 함께 이야기해 봐요.</b><ol>${DATA.final.reflectionPrompts.map(x=>`<li>${esc(x)}</li>`).join('')}</ol><p>처음의 의심과 마지막 판단이 달라졌나요? 정답보다 <b>근거·권리·재검토</b>를 설명하는 것이 더 중요해요.</p></div><p class="muted">완료 배지는 이 브라우저에 저장했어요. 다른 윤리시티 게임 기록은 변경하지 않았습니다.</p><div class="dialog-actions"><button class="btn" id="saveReflection" type="button">📄 학습 카드 내려받기</button><button class="btn primary" id="endClose" type="button">학교로 돌아가기</button></div>`;
    elDialog('🎓 탐험 완료',p.ending,body);
    $('saveReflection').addEventListener('click',()=>{
      const card=[`윤리시티 인권보장 탐험 · AI의 판결`,`별명: ${state.nickname}`,`완료: ${new Date().toLocaleDateString('ko-KR')}`,'',...chapterList.map(ch=>`${ch.shortTitle} ${ch.title}: ${Object.entries(state.caseAnswers[ch.id]||{}).filter(([k])=>k!=='reason').map(([k,v])=>optionLabel(ch.id,k,v)).join(' / ')}`),'',`최종 원칙: ${p.title}`,`나의 원칙 카드: ${p.card}`,`선택 이유: ${liveReason||'(수업에서 직접 말해 보세요)'}`].join('\n');
      const b=new Blob([card],{type:'text/plain;charset=utf-8'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='윤리시티_인권보장_학습카드.txt';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);notice('학습 카드를 저장했어요.');
    });
    $('endClose').addEventListener('click',closeModal);
  }

  // --- Canvas map & exploration ---
  function fill(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}
  function print(x,y,text,size=26,color='#294b40'){ctx.fillStyle=color;ctx.font=`900 ${size}px 'Malgun Gothic',sans-serif`;ctx.textAlign='center';ctx.fillText(text,x,y)}
  function tree(x,y,s=1){ctx.save();ctx.translate(x,y);ctx.scale(s,s);fill(-12,16,24,64,'#765c43');fill(-51,-60,105,76,'#3c805d');fill(-68,-25,132,58,'#4a9263');fill(-48,-75,102,34,'#78ae7a');fill(-57,-65,11,25,'#a9c88c');ctx.restore()}
  function drawFallback(){
    fill(0,0,CW,CH,'#a8d8d9');fill(0,245,CW,475,'#b4d1a0');
    for(let x=0;x<CW;x+=42){fill(x,262+(x%5)*7,20,13,'#c8e0ad');}
    fill(0,494,CW,226,'#c2d0a5'); for(let y=518;y<720;y+=45){for(let x=0;x<CW;x+=80){fill(x+((y/45|0)%2)*40,y,36,7,'#a6c098')}}
    const scene=state.scene;
    if(scene==='courtyard'){
      fill(0,200,CW,160,'#6a9f85');fill(125,174,1030,223,'#ead5ad');fill(125,173,1030,23,'#aa725d');
      for(let i=0;i<8;i++){fill(169+i*128,223,80,92,'#6caaa8');fill(175+i*128,232,29,80,'#c5e4d2');fill(207+i*128,232,28,80,'#9dcdd5')}
      fill(552,267,170,130,'#668c7c');fill(568,282,67,112,'#aacdd1');fill(638,282,66,112,'#84b8c3');
      print(640,145,'윤 리 시 티  학 교',34); tree(63,355,.7);tree(1220,365,.8);
      fill(220,560,160,28,'#748d75');fill(235,543,130,20,'#a17b5e');fill(222,583,12,42,'#785b46');fill(362,583,12,42,'#785b46');
      fill(924,580,165,22,'#a17b5e');fill(931,603,12,40,'#785b46');fill(1070,603,12,40,'#785b46');
    }else if(scene==='ai_lab'){
      fill(0,0,CW,720,'#d8e3d8');fill(0,0,CW,170,'#b8d5cf');fill(0,170,CW,230,'#f1e2bd');
      for(let x=150;x<1200;x+=200){fill(x,30,155,100,'#f0f7e5');fill(x+9,41,137,80,'#a7d3d1');fill(x+25,52,54,38,'#d2eee5')}
      fill(0,392,CW,330,'#d2caaa');for(let x=0;x<CW;x+=125)fill(x,410,4,310,'#a9b498');
      for(let x of [290,800]){fill(x-125,343,252,42,'#9e805e');fill(x-102,385,20,80,'#866e55');fill(x+83,385,20,80,'#866e55');fill(x-76,243,152,100,'#294b40');fill(x-66,250,132,81,'#72b7c4');fill(x-15,330,30,12,'#4b6e5b')}
      print(640,192,'AI 실습실',31);
    }else if(scene==='library'){
      fill(0,0,CW,720,'#d9e7d9');fill(0,120,CW,260,'#ecd9b5');fill(0,380,CW,340,'#cbbf9e');
      for(let x=65;x<1260;x+=208){fill(x,105,158,310,'#6d8a69');for(let yy=145;yy<360;yy+=42){fill(x+12,yy,14,34,'#b76555');fill(x+30,yy,20,34,'#6a9b91');fill(x+52,yy,16,34,'#efcf72');fill(x+74,yy,19,34,'#a47f91');fill(x+96,yy,13,34,'#6a92aa');fill(x+116,yy,21,34,'#e8c794')}}
      fill(0,449,CW,270,'#d6ccab');for(let x=0;x<1280;x+=100)fill(x,465,65,5,'#eae2c6');
      fill(540,440,200,68,'#9a7956');fill(556,505,22,75,'#73583b');fill(703,505,22,75,'#73583b'); print(640,78,'윤리시티 도서관',39);
    }else {
      fill(0,0,CW,720,'#e5e7ea');fill(0,110,CW,250,'#f2ddb3');fill(0,360,CW,360,'#d9cdb1');
      for(let x=120;x<1180;x+=210){fill(x,95,140,90,'#f5fbf6');fill(x+12,107,116,64,'#bdd7d1')} for(let x=100;x<1200;x+=260){fill(x,250,220,20,'#789083')}
      for(let x=120;x<1220;x+=250){fill(x,380,160,90,'#d9b07a');fill(x+15,395,130,60,'#f1f5f8')} print(640,80,'우리 반 교실',38);
    }
  }
  function drawFigure(x,y,color){fill(x-15,y-74,30,28,'#394f43');fill(x-11,y-70,24,20,'#e8ba8c');fill(x-20,y-44,40,43,color);fill(x-18,y,12,24,'#384d53');fill(x+5,y,12,24,'#384d53');fill(x-27,y-32,9,28,'#e8ba8c');fill(x+18,y-32,9,28,'#e8ba8c')}
  function drawActors(){
    for(const s of activeStationsInScene()){
      const done=state.clues[s.chapter].includes(s.id),px=s.pos.x,py=s.pos.y;
      fill(px-112,py-12,224,10,'#294b40aa');
      if(assetEngine){try{assetEngine.drawCharacter(ctx,s.npc,px,py+13,'down',1,.70);assetEngine.drawIcon(ctx,done?'check':'clue',px-18,py-220,36)}catch(e){console.warn('NPC drawing failed',e);drawFigure(px,py+12,'#bc8373')}} else drawFigure(px,py+12,'#79a58b');
      fill(px-124,py-167,248,64,done?'#dcedcf':'#fff9e7');fill(px-124,py-167,248,5,'#294b40');fill(px-124,py-108,248,5,'#294b40');fill(px-124,py-167,5,64,'#294b40');fill(px+119,py-167,5,64,'#294b40');
      print(px,py-139,done?'✓ 다시 보기':'! 조사하기',23,done?'#347447':'#a66e35');print(px,py-115,s.title,19,'#294b40');
    }
    if(assetEngine){try{assetEngine.drawCharacter(ctx,state.avatar,state.x,state.y,justMoved?moveDir:'down',justMoved?Math.floor(performance.now()/167)%4:1,.8)}catch{drawFigure(state.x,state.y,'#536d9a')}} else drawFigure(state.x,state.y,'#526c92');
    print(state.x,state.y-87,state.nickname,22,'#294b40');
  }
  function drawScene(){ctx.clearRect(0,0,CW,CH); if(assetEngine){try{assetEngine.drawBackground(ctx,state.scene,CW,CH)}catch{drawFallback()}} else drawFallback(); drawPortals(); drawActors()}

  function loop(ts){const dt=Math.min(50,ts-(lastTs||ts)); lastTs=ts;
    if(state.started&&!$('game').hidden&&!modal){let dx=0,dy=0;
      if(held.has('ArrowLeft')||held.has('a'))dx--; if(held.has('ArrowRight')||held.has('d'))dx++; if(held.has('ArrowUp')||held.has('w'))dy--; if(held.has('ArrowDown')||held.has('s'))dy++;
      if(dx||dy){const len=Math.hypot(dx,dy); const nx=Math.min(1170,Math.max(110,state.x+dx/len*(dt*.33))); const ny=Math.min(690,Math.max(100,state.y+dy/len*(dt*.33))); moveTo(nx,ny); checkPortal(); justMoved=true; if(Math.abs(dx)>Math.abs(dy))moveDir=dx>0?'right':'left'; else moveDir=dy>0?'down':'up';}
      else if(justMoved){justMoved=false; persist()}
      drawScene();
    }
    requestAnimationFrame(loop);
  }
  function closestStation(){let best=null,dist=1e9; for(const s of chapterStations(currentChapterId())){if(s.scene!==state.scene)continue; const d=Math.hypot(state.x-s.pos.x,state.y-s.pos.y); if(d<dist){dist=d;best=s}} return {station:best,dist};}
  function interact(){if(modal)return; const {station,dist}=closestStation(); if(station&&dist<235)openStation(station.id); else notice('조사할 인물 가까이 걸어가거나 지도 위 제목을 누르세요.');}
  $('interactBtn').addEventListener('click',interact);
  window.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&modal){closeModal();return}
    if(modal||$('game').hidden||['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;
    const k=e.key.length===1?e.key.toLowerCase():e.key;
    if(document.activeElement?.tagName==='BUTTON'&&['Enter',' '].includes(k))return;
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','w','a','s','d'].includes(k)){held.add(k);e.preventDefault()}
    if(['e','Enter',' '].includes(k)){interact();e.preventDefault()}
  });
  window.addEventListener('keyup',e=>{held.delete(e.key.length===1?e.key.toLowerCase():e.key)});
  window.addEventListener('blur',()=>held.clear());
  for(const b of document.querySelectorAll('[data-dir]')){const key=b.dataset.dir; b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);held.add(key)}); const stop=()=>held.delete(key); b.addEventListener('pointerup',stop); b.addEventListener('pointercancel',stop); b.addEventListener('lostpointercapture',stop)}
  canvas.addEventListener('click',e=>{if(modal)return; const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*CW,y=(e.clientY-r.top)/r.height*CH; let nearest=null,d=1e9; for(const s of activeStationsInScene()){const dist=Math.hypot(x-s.pos.x,y-(s.pos.y-75)); if(dist<d){d=dist; nearest=s}} if(nearest&&d<190){openStation(nearest.id)} else {if(!moveTo(Math.max(110,Math.min(1170,x)),Math.max(100,Math.min(690,y)))) notice('책상이나 가구 위로는 올라갈 수 없어요. 걸을 수 있는 바닥으로 이동해 보세요.'); checkPortal();persist(); drawScene();}});
  canvas.addEventListener('keydown',e=>{if(e.key==='Enter'){interact();e.preventDefault()}});

  async function connectCommonPack(){
    const root='../shared/ethicity-elementary-common-v1';
    try{
      if(typeof ETHICITY_COMMON_MANIFEST==='undefined'||typeof EthicityAssets==='undefined')throw Error('공통 런타임 스크립트를 찾을 수 없습니다.');
      const manifest=ETHICITY_COMMON_MANIFEST;
      if(manifest.version!=='1.0.0')throw Error('공통 팩 버전을 확인해 주세요: '+manifest.version);
      const engine=new EthicityAssets.CommonAssets(manifest,root); await engine.load(); assetEngine=engine; engine.setSound(audioEnabled); $('assetStatus').innerHTML='✓ 팀 공식 16비트 에셋 v'+manifest.version+' 적용'; drawScene();
    }catch(e){console.error('공통 에셋 연결 실패',e); $('assetStatus').textContent='⚠ 공통 팩 오류: 압축 전체를 같은 폴더 구조로 해제해 주세요. ('+e.message+')';}
  }

  $('assetStatus').textContent='팀 공식 공통 팩을 불러오고 있어요…'; showScreen(false); connectCommonPack(); requestAnimationFrame(loop);
})();
