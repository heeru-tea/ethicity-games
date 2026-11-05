'use strict';
// Every story beat is one visible message. The teacher shares the cursor with the class.
function textPages(text,max=120){const parts=[];let line='';for(const word of String(text).split(/\s+/)){if(line&&(line+' '+word).length>max){parts.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)parts.push(line);return parts;}
function storyBeats(r){return [...(r.narrative||[r.text||r.situation]).filter(Boolean).flatMap(text=>textPages(text).map(text=>({speaker:'narrator',text,mood:'neutral'}))),...(r.dialogues||[]).flatMap(d=>textPages(d.text).map(text=>({...d,text})))];}
function mediaPages(r){return (r?.media||[{label:'매직메이커 AI',text:'사진과 목소리를 바꾸기 전에, 누구에게 어떤 일이 생길지 함께 확인해요.'}]).flatMap(m=>textPages(m.text,48).map(text=>({...m,text})));}
function phaseBeats(c,decisions){
  if(c.phase==='intro')return storyBeats(STORY.intro);
  if(c.round<0)return [];
  const r=narrativeRules.resolveRound(c.round,decisions);
  if(c.phase==='observe')return [...storyBeats(r),...mediaPages(r).map((m,i)=>({speaker:'robot',text:`키오스크의 ‘${m.label}’ 화면을 살펴봐요.`,mood:'explaining',media:i}))];
  if(c.phase==='clues')return r.clues.map((text,i)=>({speaker:'robot',text,mood:'explaining',clue:i}));
  if(c.phase==='feedback'){
    const ch=r.choices[decisions?.[c.round]?.choice];if(!ch)return [];
    return [{speaker:ch.speaker||'robot',text:ch.reply||ch.feedback,mood:ch.kind==='safe'?'happy':'worried'},
      {speaker:'narrator',text:ch.feedback,mood:'neutral'},...(ch.steps||[]).map(text=>({speaker:'narrator',text,mood:'neutral'})),
      {speaker:'robot',text:r.risk,mood:'explaining'}];
  }return [];
}
function activeBeat(){return phaseBeats(S.control,S.decisions)[S.control.step]||{speaker:'robot',text:'우리 반의 생각을 모아 주세요.',mood:'explaining'};}
function personName(id){return id==='narrator'?'이야기':STORY.characters[id]||'학생';}
function beatHTML(beat,key){return `<div class="beat-box" aria-live="polite">${beat.speaker==='narrator'?commonIcon('notebook',32):canvasChar(beat.speaker,64,beat.mood||'explaining')}<div class="beat-copy"><b>${esc(personName(beat.speaker))}</b><p class="dialogue-text" data-speech="${esc(key)}" tabindex="0" role="button">${esc(beat.text)}</p></div></div>`;}
function pager(index,total,previous,next,extra=''){return `<div class="pager">${btn('이전',previous,'',`aria-label="이전 내용" ${index<=0?'disabled':''} ${extra}`)}<span>${index+1} / ${total}</span>${btn('다음',next,'',`aria-label="다음 내용" ${index>=total-1?'disabled':''} ${extra}`)}</div>`;}
function miniProgress(){const p=narrativeRules.progress(S.decisions);return `<div class="mini-progress"><span>축제 인기 <b>${p.popularity}</b><small> / 16</small></span><span>마을의 믿음 <b>${p.trust}</b><small> / 16</small></span><span>${p.count}개 선택 완료</span></div>`;}
function stageHTML(r=null){return `<div class="live-stage"><canvas data-live-stage role="img" aria-label="이야기가 진행될 때마다 인물과 반응이 나타나는 게임 장면"></canvas><div class="stage-label">${esc(r?.title||'매직메이커AI 공방')}</div><span class="stage-note">가상 상황</span></div>`;}
function stageActors(){
  const c=S.control;if(!c)return ['robot'];
  if(c.phase==='lobby')return ['robot'];
  let beats=c.phase==='intro'?storyBeats(STORY.intro):storyBeats(narrativeRules.resolveRound(Math.max(0,c.round),S.decisions));
  if(['intro','observe'].includes(c.phase))beats=beats.slice(0,c.step+1);
  const ids=[...new Set(['robot',...beats.map(b=>b.speaker).filter(id=>id!=='narrator')])];
  if(c.phase==='feedback')ids.push(...phaseBeats(c,S.decisions).slice(0,c.step+1).map(b=>b.speaker).filter(id=>id!=='narrator'));
  return [...new Set(ids)];
}
function paintStage(){
  commonReady.then(()=>document.querySelectorAll('[data-live-stage]').forEach(canvas=>{
    canvas.width=1280;canvas.height=720;const ctx=canvas.getContext('2d');
    commonArt.drawBackground(ctx,S.control?.round>=6?'courtyard':'ai_lab');
    // The standing sprites are added as their speakers enter the story.
    const actors=stageActors(),positions=[[1010,515],[500,535],[690,555],[865,555],[350,545],[1120,590]];
    actors.forEach((id,i)=>{const [x,y]=positions[i%positions.length];commonArt.drawCharacter(ctx,commonCharacter(id),x,y,'down',0,id==='robot'?.78:1.05);});
    const beat=S.control?activeBeat():null;
    if(beat&&beat.speaker!=='narrator'&&['intro','observe','clues','feedback'].includes(S.control.phase)){
      const i=actors.indexOf(beat.speaker);if(i>=0){const [x,y]=positions[i%positions.length];ctx.fillStyle='#fff9e8';ctx.strokeStyle='#294b40';ctx.lineWidth=4;ctx.beginPath();ctx.roundRect(x-67,y-187,134,52,12);ctx.fill();ctx.stroke();ctx.fillStyle='#294b40';ctx.font='bold 23px Ethicity';ctx.textAlign='center';ctx.fillText(beat.mood==='worried'?'걱정돼요':beat.mood==='happy'?'좋아요!':'함께 확인',x,y-153);}
    }
  })).catch(()=>{});
}
function kioskHTML(r){const items=mediaPages(r),index=Math.min(S.control?.phase==='clues'?S.control.step:S.control?.phase==='observe'?(activeBeat().media||0):0,items.length-1),m=items[index];const asset=JSON.parse(document.getElementById('kiosk-asset').textContent);
  return `<div class="kiosk-area"><div class="kiosk"><img class="kiosk-art" src="${asset.src}" alt="세로 화면을 가진 매직메이커 AI 키오스크"><div class="kiosk-display"><span class="kiosk-brand">MAGIC MAKER AI</span><strong>${esc(m.label)}</strong><p>${esc(m.text)}</p><small>${index+1} / ${items.length} · 가상 화면</small></div></div></div>`;
}
const V4={
renderHome(){return `<section class="landing"><div class="herocopy"><span class="ee-badge tag">AI 윤리 탐험대 · 침해금지 v4</span>${heading(STORY.title)}<p class="hero-desc">재미있는 AI 공방,<br>모두에게 괜찮을까요?</p><p>화면을 보고, 단서를 찾고, 함께 선택해요.</p><div class="buttons">${btn('교사 컨트롤타워','teacher')}${btn('수업 미리보기','demo','')}</div><p class="small">학생은 선생님이 공유한 QR 또는 링크로 입장해요.</p><div class="hero-metrics"><span>8개의 이야기</span><span>시간 제한 없이</span><span>나의 배움 리포트</span></div></div><div class="home-art">${stageHTML()}${kioskHTML()}</div></section>`;},
renderSetup(){return `<section class="ee-panel setup"><span class="ee-badge tag">탐험 준비</span>${heading('함께할 탐험가를 골라요')}<p>마음에 드는 버전을 골라 주세요.</p><form id="player-form"><div class="characters">${CONFIG.characters.map((c,i)=>`<button type="button" class="ee-choice character" data-action="character" data-index="${i}" aria-pressed="${S.character===i}">${canvasChar(c.type,160)}<strong>${esc(c.label)}</strong><small>${S.character===i?'선택했어요':'이 탐험가 선택'}</small></button>`).join('')}</div><button class="ee-button" type="submit">이 탐험가로 출발</button></form><p class="small">실제 이름을 입력하지 않아요. 선택한 탐험가와 투표 기록은 이 수업에서만 사용해요.</p></section>`;},
renderIntroReady(){return `<section class="ready-grid"><div>${stageHTML()}<div class="ee-panel ready-player">${canvasChar(characterType(S.player.character),64)}<b>${esc(S.player.nickname)}</b>${btn('탐험가 바꾸기','change-player','')}</div></div><section class="ee-panel ready-copy"><span class="ee-badge tag">입장 준비 완료</span>${heading('우리 반과 함께 출발해요',2)}<p>${esc(STORY.intro.text)}</p><p>선생님이 한 장면씩 열어 줍니다. 화면을 살펴본 뒤, 단서를 확인하고 선택해요.</p>${btn(S.role==='student'?'수업에 입장':'미리보기 시작','join')}${S.storageWarning?'<p>이 기기에서는 기록 저장이 어려워요. 게임은 계속할 수 있어요.</p>':''}</section></section>`;},
renderTeacherList(){return `<section class="teacher-start"><div class="ee-panel"><span class="ee-badge tag">교사 컨트롤타워</span>${heading('우리 반의 AI 공방')}<p>새 수업을 열면 QR코드와 입장 링크를 바로 제공합니다.</p><ol class="start-flow"><li>화면과 대사를 한 장면씩 확인</li><li>단서를 짚고 함께 토론</li><li>투표를 열고 직접 마감</li><li>결과 확인 · 개인 PNG 리포트</li></ol><div class="buttons">${btn(S.busy?'연결 준비 중…':'새 수업 만들기','create-room','primary',S.busy||!S.connected?'disabled':'')}${btn('연결 다시 확인','teacher','')}${btn('수업 미리보기','demo','')}</div><p class="small">별도 수업 목록은 만들지 않습니다. 진행 중에는 현재 교사 화면의 주소를 유지해 주세요.</p></div><div class="teacher-start-art">${stageHTML()}<div class="ee-panel">시간 제한 없이, 교사가 한 단계씩 진행합니다.</div></div></section>`;},
teacherTools(){const c=S.control,busy=S.busy||S.role==='teacher'&&!S.connected,disabled=busy?'disabled':'';
  const count=phaseBeats(c,S.decisions).length,last=c.step>=count-1;
  let label='',action='next';
  if(c.phase==='lobby'){label='수업 시작';action='start';}
  else if(c.phase==='intro')label=last?'첫 번째 화면 보기':'다음 대사';
  else if(c.phase==='observe')label=last?'단서 확인하기':'다음 장면';
  else if(c.phase==='clues')label=last?'선택 열기':'다음 단서';
  else if(c.phase==='vote')label='선택 마감 · 결과 보기';
  else if(c.phase==='empty'){label='선택 다시 열기';action='retry';}
  else if(c.phase==='feedback')label=last?(c.round===7?'엔딩 · 리포트':'다음 라운드'):'다음 반응';
  return `<nav class="teacher-toolbar" aria-label="교사 진행"><div class="teacher-caption"><b>${S.role==='demo'?'수업 미리보기':'교사 컨트롤타워'}</b><small>${S.role==='demo'?'한 표로 연습':'직접 진행 · 시간 제한 없음'}</small></div><div class="toolbar-actions">${['intro','observe','clues','feedback'].includes(c.phase)?btn('이전','back','',`${disabled} ${c.step<=0?'disabled':''}`):''}${label?btn(label,action,'primary',disabled):''}${c.round>=0&&c.phase!=='ended'?btn('선택별 해설','explain',''):''}${S.role==='teacher'?btn('입장 QR·링크','invite',''):''}${S.role==='teacher'?btn('참여 현황','roster',''):''}</div></nav>`;},
renderSession(){const c=S.control,r=c.round>=0?narrativeRules.resolveRound(c.round,S.decisions):null;
  const phase=['observe','clues','vote'].indexOf(c.phase),step=phase>=0?phase:3;
  const head=`<div class="session-heading"><h1>${c.phase==='lobby'?'함께할 탐험가를 기다려요':c.phase==='intro'?'축제 전날, 공방을 준비해요':c.phase==='ended'?'우리 반의 이야기 · 나의 배움':esc(r.title)}</h1><span>${c.round<0?'준비':`${c.round+1} / 8`}</span></div>`;
  const trail=r&&c.phase!=='ended'?`<ol class="phase-trail">${['화면 보기','단서 확인','선택','결과'].map((t,i)=>`<li class="${i===step?'active':''}" ${i===step?'aria-current="step"':''}><span>${i+1}</span>${t}</li>`).join('')}${miniProgress()}</ol>`:'';
  const content=c.phase==='lobby'?V4.lobbyScreen():c.phase==='intro'?V4.introScreen():c.phase==='ended'?V4.endingScreen():V4.roundScreen(r);
  return `${S.role==='teacher'||S.role==='demo'?V4.teacherTools():`<div class="student-status"><span>${esc(S.player?.nickname||'탐험가')} · ${esc(PHASES[c.phase])}</span><small>선생님과 같은 장면을 보고 있어요</small></div>`}${head}${trail}<div class="session-content">${content}</div>`;
},
lobbyScreen(){if(S.role==='teacher')return `<div class="lobby-layout"><div>${stageHTML()}<div class="lobby-count"><b>${Object.keys(S.room.members||{}).length}명</b> 입장했어요 · 준비되면 수업을 시작해 주세요.</div></div><section class="ee-panel invite-panel">${inviteContents()}</section></div>`;return `<div class="student-lobby">${stageHTML()}<div class="ee-panel"><h2>${esc(S.player?.nickname)}, 준비됐어요!</h2><p>선생님이 시작하면 같은 장면을 함께 봐요.</p></div></div>`;},
introScreen(){const beats=phaseBeats(S.control,S.decisions);return `<div class="play-layout"><div class="stage-column">${stageHTML()}${beatHTML(activeBeat(),currentKey()+':'+S.control.step)}<div class="beat-position">${S.control.step+1} / ${beats.length} · ${S.role==='student'?'선생님이 다음 대사를 열어 줘요':'한 번에 하나씩 읽어요'}</div></div><aside class="ee-panel side-panel intro-aside"><span class="ee-badge tag">함께 생각할 질문</span><h2>${esc(STORY.easyQuestion)}</h2>${kioskHTML()}</aside></div>`;},
roundScreen(r){const c=S.control,k=`${S.roomId}:${c.round}:${c.ballot}`;if(S.selectionKey!==k){S.selectionKey=k;S.selected=S.ownVotes[c.round]?.ballot===c.ballot?S.ownVotes[c.round].choice:null;S.mediaIndex=0;}
  const beats=phaseBeats(c,S.decisions);let side;
  if(c.phase==='observe')side=`<aside class="ee-panel side-panel"><span class="ee-badge tag">화면 보기</span><h2>${esc(r.question)}</h2>${kioskHTML(r)}</aside>`;
  else if(c.phase==='clues')side=`<aside class="ee-panel side-panel clue-panel"><span class="ee-badge tag">단서 ${c.step+1} / ${beats.length}</span><h2>어떤 위험 신호가 보이나요?</h2><div class="clue-focus">${commonIcon('inspect',32)}<p>${esc(beats[c.step]?.text)}</p></div>${r.definition?`<p class="definition">${esc(r.definition)}</p>`:''}<p class="small">충분히 이야기한 뒤 선생님이 선택을 열어 줍니다.</p></aside>`;
  else if(c.phase==='vote')side=V4.voteScreen(r);
  else if(c.phase==='feedback')side=V4.feedbackScreen(r);
  else side=decisionWait(r);
  const beat=['observe','feedback'].includes(c.phase)?activeBeat():c.phase==='clues'?{speaker:'robot',text:'화면 속 정보와 단서를 함께 살펴봐요. 누구에게 어떤 일이 생길 수 있을까요?',mood:'explaining'}:{speaker:'robot',text:r.question,mood:'explaining'};
  const visual=c.phase==='clues'?`<div class="clue-stage">${stageHTML(r)}<div class="stage-kiosk">${kioskHTML(r)}</div></div>`:stageHTML(r);
  return `<div class="play-layout phase-${c.phase}"><div class="stage-column">${visual}${beatHTML(beat,currentKey()+':'+c.step)}<div class="beat-position">${beats.length?`${c.step+1} / ${beats.length} · `:''}${c.phase==='vote'?'선생님이 마감할 때까지 선택을 바꿀 수 있어요':'화면을 누르면 대사를 바로 볼 수 있어요'}</div></div>${side}</div>`;
},
voteScreen(r){if(S.role==='teacher'){const t=tally(S.room);return `<aside class="ee-panel side-panel vote-panel"><span class="ee-badge tag">선택을 모으고 있어요 · ${t.total} / ${Object.keys(S.room.members||{}).length}명</span><div class="teacher-choices">${r.choices.map((ch,i)=>`<button class="ee-choice" data-action="explain" data-index="${i}"><b>${LETTERS[i]}</b><span>${esc(ch.text)}</span><small>${t.counts[i]}표 · 해설 보기</small></button>`).join('')}</div><p class="small">자동 마감 없이 교사가 결과를 엽니다.</p></aside>`;}
  const vote=S.ownVotes[S.control.round],saved=vote?.ballot===S.control.ballot,open=canVote();return `<aside class="ee-panel side-panel vote-panel"><span class="ee-badge tag">나의 선택</span><div class="choice-list">${r.choices.map((ch,i)=>`<button class="ee-choice choice" data-action="choice" data-index="${i}" aria-pressed="${S.selected===i}" ${open&&!S.sending?'':'disabled'}><b>${LETTERS[i]}</b><span>${esc(ch.text)}</span></button>`).join('')}</div>${btn(S.sending?'확인 중…':saved?'선택 바꿔 제출':'이 선택 제출','submit','primary',!open||S.sending||S.selected===null?'disabled':'')}<p class="statusline" id="vote-status" role="status">${saved?`✓ ${LETTERS[vote.choice]} 선택을 제출했어요.`:open?'하나를 고르고 제출해 주세요.':'연결 상태를 확인해 주세요.'}</p></aside>`;},
feedbackScreen(r){const d=S.decisions[S.control.round];if(!d)return '<aside class="ee-panel side-panel">결과를 확인하고 있어요.</aside>';const ch=r.choices[d.choice],own=S.ownVotes[S.control.round];return `<aside class="ee-panel side-panel feedback-panel"><span class="ee-badge tag">우리 반의 선택 ${LETTERS[d.choice]}</span><h2>${esc(ch.text)}</h2><p class="score-change">인기 +${ch.popularity} · 믿음 +${ch.trust}</p><p>${esc(ch.change)}</p>${bars(d.counts,d.total)}${own?`<p class="personal-choice">내 선택 ${LETTERS[own.choice]} · ${own.choice===d.choice?'우리 반과 같아요':'우리 반과 달랐어요. 결과를 함께 살펴봐요.'}</p>`:''}<span class="small">왼쪽에서 반응과 결과를 한 장면씩 확인해요.</span></aside>`;},
endingScreen(){if(!S.outcome||!summarize(S.decisions))return '<p>결과를 확인하고 있어요.</p>';const e=STORY.endings[S.outcome.ending];loadPersonalLearning();
  const tabs=`<div class="ending-tabs" role="tablist">${[['summary','우리 반의 엔딩'],['rounds','라운드 돌아보기'],['learning','나의 배움 · PNG']].map(([id,label])=>`<button role="tab" aria-selected="${S.endingTab===id}" class="ee-button ${S.endingTab===id?'':'secondary'}" data-action="ending-tab" data-tab="${id}">${label}</button>`).join('')}</div>`;
  let body;if(S.endingTab==='rounds')body=reportRoundHTML();else if(S.endingTab==='learning')body=learningHTML();else body=`<div class="ending-summary"><div>${stageHTML()}${beatHTML({speaker:e.speaker,text:e.reply,mood:'explaining'},'ending:'+S.roomId)}</div><section class="ee-panel"><span class="ee-badge tag">엔딩 ${S.outcome.ending}</span><h2>${esc(e.title)}</h2><p>${esc(e.text)}</p><blockquote>${esc(e.card)}</blockquote>${miniProgress()}<p>${esc(narrativeRules.pending(summarize(S.decisions)).join(' · '))}</p>${btn('나의 배움 고르기','ending-learning')}</section></div>`;
  return `<div class="ending-shell">${tabs}<div class="ending-body">${body}</div><div class="completion-line"><span id="completion-status" role="status"></span><span id="cloud-status" role="status">${esc(S.cloudSaved)}</span></div></div>`;
},
progressHTML(){return miniProgress();},
teacherRoster(){const rows=Object.entries(S.room.members||{}).sort((a,b)=>a[1].joinedAt-b[1].joinedAt);return `<p>${rows.length}명 입장 · 완료 확인 ${Object.keys(S.room.results||{}).length}명</p><p class="small">입장 기록이며 현재 접속 인원과는 다를 수 있습니다.</p><div class="roster"><table><thead><tr><th>번호</th><th>탐험가</th><th>이번 선택</th><th>완료</th></tr></thead><tbody>${rows.map(([uid,m],i)=>`<tr><td>${i+1}</td><td>${esc(CONFIG.characters.find(c=>c.id===m.character)?.label||'탐험가')}</td><td>${S.room.votes?.[S.control.round]?.[uid]?.ballot===S.control.ballot?'제출':'대기'}</td><td>${S.room.results?.[uid]?'✓':'—'}</td></tr>`).join('')}</tbody></table></div>${btn('기록 CSV 다운로드','csv','')}`;},
conversations(list,key){return list?.length?beatHTML(list[0],key):'';},sceneHTML:stageHTML,mediaHTML:kioskHTML,
clueHTML(r){return r.clues.map(t=>`<p>${esc(t)}</p>`).join('');},narrativeHTML(r){return beatHTML(storyBeats(r)[0],currentKey());},teacherTally(r){return bars(tally(S.room).counts,tally(S.room).total);}
};
function inviteContents(){return `<h2>학생 입장 QR·링크</h2><canvas class="invite-qr" data-qr width="300" height="300" role="img" aria-label="학생 입장 링크 QR코드"></canvas><label class="invite-url">학생 입장 링크<input readonly value="${esc(inviteURL())}" aria-label="학생 입장 링크" onclick="this.select()"></label>${btn('링크 복사','copy-invite')}<p class="small">나갔다가 돌아온 학생도 같은 QR·링크로 입장해요. 같은 기기·브라우저로 돌아오면 이전 선택을 이어받아요.</p>`;}
function paintQR(){document.querySelectorAll('[data-qr]').forEach(canvas=>{try{const qr=qrcode(0,'M');qr.addData(inviteURL());qr.make();const n=qr.getModuleCount(),cell=Math.max(3,Math.floor(300/(n+8))),size=(n+8)*cell;canvas.width=canvas.height=size;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,size,size);ctx.fillStyle='#000';for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(qr.isDark(y,x))ctx.fillRect((x+4)*cell,(y+4)*cell,cell,cell);}catch{canvas.outerHTML='<p>QR코드를 만들지 못했어요. 아래 링크로 입장해 주세요.</p>';}});}
let modalFocus=null;
function openModal(type){modalFocus=document.activeElement;S.modal=type;renderModal();}
function closeModal(){S.modal=null;document.getElementById('v4-modal')?.remove();modalFocus?.isConnected&&modalFocus.focus();}
function renderModal(){
  let d=document.getElementById('v4-modal');if(!S.modal){d?.remove();return;}
  if(!d){d=document.createElement('dialog');d.id='v4-modal';document.body.append(d);d.addEventListener('cancel',()=>{S.modal=null;});}
  let title='',body='';
  if(S.modal==='invite'){title='학생 입장 안내';body=inviteContents();}
  if(S.modal==='roster'){title='참여 현황';body=V4.teacherRoster();}
  if(S.modal==='explain'){
    const r=narrativeRules.resolveRound(S.control.round,S.decisions),ch=r.choices[S.explainChoice];title='선택별 결과 · 교사용 해설';
    body=`<p class="small">현재까지의 학급 선택을 반영한 예상 결과입니다.</p><div class="explain-tabs">${r.choices.map((_,i)=>`<button class="ee-button ${S.explainChoice===i?'':'secondary'}" data-action="explain-choice" data-index="${i}" aria-pressed="${S.explainChoice===i}">선택 ${LETTERS[i]}</button>`).join('')}</div><h3>${esc(ch.text)}</h3><p class="score-change">축제 인기 +${ch.popularity} · 마을의 믿음 +${ch.trust}</p><p>${esc(ch.feedback)}</p><blockquote>${esc(ch.reply||'')}</blockquote>${ch.steps?`<ol>${ch.steps.map(t=>`<li>${esc(t)}</li>`).join('')}</ol>`:''}<p><b>지도할 때</b> ${esc(r.risk)}</p>${tagsHTML(ch.tags)}`;
  }
  if(S.modal==='report-preview'){title='나의 배움 리포트';body='<p>다운로드가 시작됐어요. 이미지도 길게 눌러 저장할 수 있어요.</p><img id="report-preview-image" alt="나의 8라운드 선택과 배움 리포트">';}
  d.innerHTML=`<div class="modal-heading"><h2>${title}</h2>${btn('닫기','close-modal','')}</div><div class="modal-body">${body}</div>`;
  if(S.modal==='report-preview')d.querySelector('img').src=reportPreviewURL;
  if(!d.open)d.showModal();paintArt();paintQR();
}
async function handleV4Action(action,el,i){
  if(action==='invite'){openModal('invite');return true;}
  if(action==='roster'){openModal('roster');return true;}
  if(action==='explain'){S.explainChoice=Number.isInteger(i)&&i>=0&&i<3?i:0;openModal('explain');return true;}
  if(action==='explain-choice'){S.explainChoice=i;renderModal();return true;}
  if(action==='close-modal'){closeModal();return true;}
  if(action==='media-prev'||action==='media-next'){S.mediaIndex=Math.max(0,S.mediaIndex+(action==='media-next'?1:-1));render();return true;}
  if(action==='ending-tab'||action==='ending-learning'){S.endingTab=action==='ending-learning'?'learning':el.dataset.tab;render(true);return true;}
  if(action==='report-prev'||action==='report-next'){S.reportRound=Math.max(0,Math.min(7,S.reportRound+(action==='report-next'?1:-1)));render();return true;}
  if(action==='learn'){togglePersonalLearning(i);render();return true;}
  if(action==='download-report'){await downloadReport();return true;}
  return false;
}
