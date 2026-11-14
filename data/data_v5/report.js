(function(root){'use strict';
const M=root.EthicityDataModel;
function sections(state,promises){
 const result=M.result(state), blocks=[];
 blocks.push({title:'내 탐험 결과',body:[result.title+' · 급식안의 준비 상태',result.note,'시험한 곳 '+state.visited.length+' / 4 · 시험 '+M.count(state)+'번',...result.findings]});
 for(let round=0;round<6;round++){
  const events=state.history.filter(e=>e.round===round);
  blocks.push({title:'이야기 '+(round+1)+' · '+M.scenes[round].title,body:events.length?events.flatMap((event,i)=>[(i+1)+'. 선택: '+event.choice,'결과·변화: '+event.outcome]):['이 이야기의 선택 기록이 없어요.']});
 }
 if(state.first){const first=M.initialMenu(state.first);blocks.push({title:'처음 급식안 · 비교해 봐요',body:first.rows.map(r=>r[0]+'요일 · '+r[1]).concat(first.note)});}
 blocks.push({title:'현재 급식안 · 아직 확인할 것',body:result.menu.rows.map(r=>r[0]+'요일 · '+r[1]+'\n'+r[2])});
 blocks.push({title:'다음에 확인할 문제',body:result.needs.length?result.needs:['이번 시험에서 남은 확인 항목이 없어요. 쓰는 동안에도 계속 점검해요.']});
 blocks.push({title:'내가 선택한 학습 내용',body:state.learning.map(i=>M.learningOptions[i])});
 blocks.push({title:'나의 AI 사용 약속',body:promises});
 blocks.push({title:'기억할 한 문장',body:[M.memory,'이 리포트는 학생의 점수나 등급이 아니에요. 선택과 변화를 돌아보는 기록이에요.']});
 return blocks;
}
function wrap(ctx,text,width){
 const lines=[];
 for(const paragraph of String(text).split('\n')){
  let line='';for(const char of Array.from(paragraph)){if(line&&ctx.measureText(line+char).width>width){lines.push(line);line=char;}else line+=char;}lines.push(line);
 }
 return lines;
}
async function render(state,promises){
 await document.fonts.ready;
 const width=1200,padding=64,maxHeight=7400,canvas=document.createElement('canvas');canvas.width=width;
 const ctx=canvas.getContext('2d');ctx.font='24px Ethicity, sans-serif';
 const pages=[[]];let used=240;
 for(const block of sections(state,promises)){
  let part={title:block.title,lines:[]};
  for(const paragraph of block.body){
   const lines=wrap(ctx,paragraph,width-padding*2-48);
   for(const line of lines){
    if(used+part.lines.length*36+128>maxHeight-100){pages.at(-1).push(part);pages.push([]);used=240;part={title:block.title+' (계속)',lines:[]};}
    part.lines.push(line);
   }
   part.lines.push('');
  }
  pages.at(-1).push(part);used+=104+part.lines.length*36;
 }
 return Promise.all(pages.map(async (blocks,index)=>{
  const page=document.createElement('canvas');page.width=width;page.height=300+blocks.reduce((n,b)=>n+104+b.lines.length*36,0);
  const c=page.getContext('2d');c.fillStyle='#fff9e7';c.fillRect(0,0,width,page.height);
  c.fillStyle='#294b40';c.fillRect(0,0,width,192);c.fillStyle='#f3cf72';c.font='22px Ethicity, sans-serif';c.fillText('윤리시티 · AI 윤리 탐험대',padding,56);
  c.fillStyle='#fff9e7';c.font='bold 38px Ethicity, sans-serif';c.fillText('신뢰성 · 나의 냠냠봇 점검 리포트',padding,112);
  c.font='22px Ethicity, sans-serif';c.fillText(state.explorer+'버전 탐험가  /  '+(index+1)+' · '+pages.length+'쪽',padding,158);
  let y=224;
  for(const b of blocks){
   const height=80+b.lines.length*36;c.fillStyle='#f2e7c7';c.fillRect(padding,y,width-padding*2,height);
   c.fillStyle='#5a8c65';c.fillRect(padding,y,6,height);c.fillStyle='#294b40';c.font='bold 27px Ethicity, sans-serif';c.fillText(b.title,padding+24,y+40);
   c.font='24px Ethicity, sans-serif';b.lines.forEach((line,i)=>c.fillText(line,padding+24,y+82+i*36));y+=height+24;
  }
  c.fillStyle='#294b40';c.font='18px Ethicity, sans-serif';c.fillText('내 기기에만 저장한 기록 · 실명과 개인정보를 입력하지 않는 탐험',padding,page.height-28);
  return new Promise((resolve,reject)=>page.toBlob(blob=>blob?resolve(blob):reject(Error('PNG 변환 실패')),'image/png'));
 }));
}
let urls=[];
function clear(){document.getElementById('report-dialog')?.remove();urls.forEach(URL.revokeObjectURL);urls=[];}
async function download(state,promises){
 const blobs=await render(state,promises);clear();urls=blobs.map(b=>URL.createObjectURL(b));
 const dialog=document.createElement('dialog');dialog.id='report-dialog';dialog.className='ee-panel report-dialog';dialog.setAttribute('aria-labelledby','report-title');
 const heading=document.createElement('h2');heading.id='report-title';heading.textContent='나의 탐험 리포트';dialog.append(heading);
 const note=document.createElement('p');note.textContent=urls.length===1?'PNG 파일을 내 기기에 저장해요.':'기록이 길어서 '+urls.length+'장의 PNG로 나누었어요. 각 장의 저장 버튼을 눌러 주세요.';dialog.append(note);
 const pager=document.createElement('div');pager.className='report-pager';dialog.append(pager);
 let current=0;
 const show=()=>{dialog.querySelectorAll('.report-page').forEach(el=>el.remove());pager.replaceChildren();
 const prev=document.createElement('button'),next=document.createElement('button'),count=document.createElement('span');prev.className=next.className='ee-button secondary';prev.textContent='이전 쪽';next.textContent='다음 쪽';prev.disabled=current===0;next.disabled=current===urls.length-1;count.textContent=(current+1)+' / '+urls.length;prev.onclick=()=>{current--;show();};next.onclick=()=>{current++;show();};pager.append(prev,count,next);
 const url=urls[current],i=current,page=document.createElement('div');page.className='report-page';
  const link=document.createElement('a');link.href=url;link.download='냠냠봇_나의_탐험_리포트'+(urls.length>1?'_'+(i+1):'')+'.png';link.className='ee-button';link.textContent=urls.length>1?(i+1)+'쪽 PNG 저장':'PNG 저장';dialog.append(link);
  page.append(link);const img=document.createElement('img');img.src=url;img.alt='나의 선택과 결과, 학습 내용이 담긴 리포트 '+(i+1)+'쪽';page.append(img);pager.after(page);
 };show();
 const close=document.createElement('button');close.className='ee-button secondary';close.textContent='탐험 완료 화면으로';close.onclick=()=>{dialog.close();document.getElementById('download-report')?.focus();};dialog.append(close);document.body.append(dialog);dialog.showModal();
 // A single user-requested download; extra pages retain explicit individual links.
 dialog.querySelector('a').click();
}
root.EthicityReport={sections,wrap,render,download,clear};
})(typeof window!=='undefined'?window:globalThis);
