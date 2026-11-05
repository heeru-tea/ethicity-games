'use strict';
let learningKey='',reportPreviewURL=null;
function personalKey(){return `ethicity.harm.v5.learning:${S.roomId}:${S.uid||'demo'}`;}
function loadPersonalLearning(){const key=personalKey();if(key===learningKey)return;learningKey=key;const saved=readStore(key,[]);S.personalLearning=Array.isArray(saved)?saved.filter(n=>Number.isInteger(n)&&STORY.elements[n]):[];}
function togglePersonalLearning(n){if(!STORY.elements[n]||S.role==='teacher')return;loadPersonalLearning();S.personalLearning=S.personalLearning.includes(n)?S.personalLearning.filter(x=>x!==n):[...S.personalLearning,n].sort();if(!writeStore(personalKey(),S.personalLearning))showToast('이 기기에 배움을 보관할 수 없어요. PNG로 저장해 주세요.');}
function roundReport(index){const r=narrativeRules.resolveRound(index,S.decisions),d=S.decisions[index],vote=S.ownVotes[index];return {round:r,decision:d,personal:Number.isInteger(vote?.choice)?r.choices[vote.choice]:null,personalIndex:vote?.choice,classChoice:d?r.choices[d.choice]:null};}
function reportRoundHTML(){const i=S.reportRound,{round:r,decision:d,personal,personalIndex,classChoice}=roundReport(i);return `<section class="ee-panel round-review">${pager(i,8,'report-prev','report-next')}<h2>${i+1}. ${esc(r.title)}</h2><div class="report-comparison"><section><span class="ee-badge tag">내 선택</span><h3>${personal?`${LETTERS[personalIndex]} · ${esc(personal.text)}`:'이 라운드는 제출 기록이 없어요'}</h3>${personal?`<p>${esc(personal.feedback)}</p><p class="small">이 선택의 예상 변화 · 인기 +${personal.popularity}, 믿음 +${personal.trust}</p>`:''}</section><section><span class="ee-badge tag">실제 학급 결과</span><h3>${LETTERS[d.choice]} · ${esc(classChoice.text)}</h3><p>${esc(classChoice.feedback)}</p><p>${esc(classChoice.change)}</p></section></div><p class="review-lesson"><b>함께 배울 점</b> ${esc(r.risk)}</p></section>`;}
function learningHTML(){const teacher=S.role==='teacher';return `<section class="ee-panel learning-panel"><h2>${teacher?'학생의 배움 리포트':'내가 배운 점을 골라요'}</h2><p>${teacher?'학생은 자기 화면에서 배운 점을 고르고 개인 PNG 리포트를 저장합니다.':'기억하고 싶은 배움을 모두 골라 주세요. 내 선택 기록과 함께 PNG로 저장돼요.'}</p><div class="learning-options">${Object.entries(STORY.elements).map(([id,e])=>`<button class="ee-choice" data-action="learn" data-index="${id}" aria-pressed="${S.personalLearning.includes(Number(id))}" ${teacher?'disabled':''}><span class="check-square">${S.personalLearning.includes(Number(id))?'✓':''}</span><span><b>${esc(e.title)}</b><small>${esc(e.text)}</small></span></button>`).join('')}</div>${teacher?'<p>교사의 전체 선택 기록은 참여 현황에서 CSV로 내려받을 수 있습니다.</p>':`<div class="report-download">${btn('개인 리포트 PNG 다운로드','download-report','primary',S.personalLearning.length&&(S.role!=='student'||S.votesLoaded===255)?'':'disabled')}<span class="small">${S.personalLearning.length?'8라운드 선택 · 결과 · 변화 · 내가 고른 배움':'배운 점을 하나 이상 골라 주세요.'}</span></div>`}</section>`;}
// Measure first, then render at the exact height so long Korean feedback never clips.
async function downloadReport(){
  if(!S.outcome||S.role==='teacher'||!S.personalLearning.length)return;if(S.role==='student'&&S.votesLoaded!==255){showToast('선택 기록을 불러오고 있어요. 잠시 뒤 다시 저장해 주세요.');return;}
  await commonReady;await document.fonts.ready;
  const width=1400,pad=64,lineHeight=38,probe=document.createElement('canvas').getContext('2d');
  const sections=[];const add=(text,{size=25,bold=false,color='#294b40',gap=16}={})=>sections.push({text,size,bold,color,gap});
  add('윤리시티 · 나의 AI 윤리 탐험 리포트',{size:39,bold:true,gap:28});
  add(`${S.player.nickname}  |  침해금지 v5  |  ${new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul'}).format(new Date())}`,{size:22});
  add(`우리 반 엔딩 ${S.outcome.ending} · ${STORY.endings[S.outcome.ending].title}`,{size:30,bold:true});
  const p=narrativeRules.progress(S.decisions);add(`최종 축제 인기 ${p.popularity}/16 · 마을의 믿음 ${p.trust}/16`,{size:23});
  add('내 선택의 결과는 당시 상황에서의 예상입니다. 게임에는 학급이 확정한 선택과 변화가 실제로 반영됩니다.',{size:22,gap:30});
  for(let i=0;i<8;i++){
    const {round:r,decision:d,personal,personalIndex,classChoice}=roundReport(i);
    add(`${i+1}라운드 · ${r.title}`,{size:29,bold:true,gap:18});
    add(personal?`내 선택 ${LETTERS[personalIndex]} · ${personal.text}`:'내 선택 · 제출 기록 없음 (늦게 입장했거나 제출하지 않았어요.)',{bold:true});
    if(personal){add(`내 선택의 예상 결과 · ${personal.feedback}`);add(`예상 변화 · 인기 +${personal.popularity}, 믿음 +${personal.trust}`,{size:23});}
    add(`학급 확정 ${LETTERS[d.choice]} · ${classChoice.text}`,{bold:true,color:'#4c6049'});
    add(`실제 결과 · ${classChoice.feedback}`);add(`실제 변화 · ${classChoice.change}`,{size:23});
    const before=narrativeRules.progress(S.decisions,i),after=narrativeRules.progress(S.decisions,i+1);
    add(`누적 기록 · 인기 ${before.popularity} → ${after.popularity}, 믿음 ${before.trust} → ${after.trust}`,{size:22});
    add(`함께 배울 점 · ${r.risk}`,{size:24,gap:32});
  }
  add('내가 고른 배움',{size:31,bold:true,gap:20});
  S.personalLearning.forEach((id,i)=>{add(`${i+1}. ${STORY.elements[id].title}`,{bold:true});add(STORY.elements[id].text);});
  add('우리 반의 실천 약속',{size:29,bold:true,gap:18});add(S.outcome.card,{size:27,gap:24});
  add('모든 인물과 자료는 가상입니다. 이 리포트는 학습을 돌아보기 위한 기록입니다.',{size:21});
  const lines=[];let y=pad;
  for(const section of sections){probe.font=`${section.bold?'bold ':''}${section.size}px Ethicity`;let line='';const height=Math.max(lineHeight,section.size*1.5);
    for(const char of [...section.text]){if(line&&probe.measureText(line+char).width>width-pad*2){lines.push({...section,text:line,y});y+=height;line=char;}else line+=char;}
    lines.push({...section,text:line,y});y+=height+section.gap;
  }
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=Math.ceil(y+pad);const ctx=canvas.getContext('2d');
  ctx.fillStyle='#fbf5e5';ctx.fillRect(0,0,width,canvas.height);ctx.fillStyle='#294b40';ctx.fillRect(0,0,18,canvas.height);ctx.textBaseline='top';
  for(const line of lines){ctx.fillStyle=line.color;ctx.font=`${line.bold?'bold ':''}${line.size}px Ethicity`;ctx.fillText(line.text,pad,line.y);}
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('리포트 이미지 생성에 실패했어요. 다시 시도해 주세요.');
  if(reportPreviewURL)URL.revokeObjectURL(reportPreviewURL);reportPreviewURL=URL.createObjectURL(blob);
  downloadBlob(blob,'image/png',`harm-v5-${S.player.nickname.replaceAll(' ','')}-배움리포트.png`);openModal('report-preview');
}
