'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const story=require('../scenario.json'),legacy=require('./legacy-v3-cards.json');
const {createStoryRules}=require('./story-rules.js'),R=createStoryRules(story);
const decisions=a=>Object.fromEntries(a.map((choice,i)=>[i,{choice}]));
const checks=[];
function test(name,run){run();checks.push(name);}
test('Photo branches explain uploader, subject, consent and actual publication; choice meaning survives overlays',()=>{
 for(let first=0;first<3;first++){
  const d=decisions([first,0]),r=R.resolveRound(2,d);
  assert(r.narrative.join('').includes('방문객'));
  for(let choice=0;choice<3;choice++){
   const c=r.choices[choice],base=story.rounds[2].choices[choice];
   for(const field of ['trust','popularity','tags','kind','protect'])assert.deepEqual(c[field],base[field]);
   assert.equal(c.speaker,'daon');assert(c.reply);assert.equal(c.fullText,c.text);
   assert(!/퍼졌다면|아직이면|없는 사진|모든 사진이 사라/.test(c.feedback+c.text));
  }
  if(first===0){assert(r.narrative.join('').includes('반 온라인 게시판에 올렸다'));assert(r.choices[0].feedback.includes('내려 달라고 요청'));}
  else{assert(!/지워졌어요|삭제/.test(r.choices.map(c=>c.feedback).join('')));assert(r.narrative.join('').includes('묻지 않')||r.narrative.join('').includes('물어본 적이 없'));}
  if(first===2){assert(r.dialogues.some(d=>d.text.includes('올리는 사람이 누르는')));assert(r.choices[0].text.includes('버튼만 믿지 않고'));}
 }
});
test('Voice followups distinguish disabled, unrestricted and robot-only history',()=>{
 for(let voice=0;voice<3;voice++){
  const r=R.resolveRound(3,decisions([1,voice]));
  assert(r.choices[0].text.includes(voice===1?'계속 연다':'새로 연다'));
  assert.equal(r.choices[1].feedback.includes('돈을 보낸'),false);
  assert.equal(r.choices[2].feedback.includes('돈을 보낸'),voice===1);
  assert(!/쉬고 있었다면|4-A|4-B/.test(JSON.stringify(r.choices)));
 }
});
test('All 729 histories give the correct R7 dialogue and six concrete support actions',()=>{
 for(let n=0;n<3**6;n++){
  let x=n;const a=Array.from({length:6},()=>{const c=x%3;x=Math.floor(x/3);return c;});
  const r=R.resolveRound(6,decisions(a)),steps=r.choices[1].steps;
  assert.equal(steps.length,6);assert(!/라면|했다면|퍼졌다면|제작 메모/.test(steps.join('')));
  assert.equal(steps[1].includes('내려 달라고 요청'),a[0]===0);
  assert.equal(steps[2].includes('돈을 보낸'),a[1]===1);
  assert.equal(steps[3].includes('모아 둔 자료'),a[4]!==1);
  assert.equal(steps[4].includes('해 본 행사'),a[5]===0);
  assert.equal(r.dialogues[0].text,story.stateText.photoDialogue[a[0]===0?(a[2]===0?'requested':'notRequested'):'prevented']);
  assert.equal(r.dialogues[1].text,story.stateText.voiceDialogue[a[1]===1?'harmed':'prevented']);
 }
});
test('Labels, all speakers and three future-action cards match the approved revision',()=>{
 assert.equal(story.characters.company_staff,'A기업');assert.equal(story.characters.photographer,'반짝사진관 사장님');
 assert(!/두빛|사진관 주인|다온 대신|이 분기는|처리하지 않는다/.test(JSON.stringify(story)));
 assert.equal(new Set(Object.values(story.endings).map(e=>e.card)).size,3);
 for(const e of Object.values(story.endings)){assert(/겠습니다\.$/.test(e.card));assert([...e.card].length<=40);}
 for(let index=0;index<8;index++)for(let branch=0;branch<3;branch++){
  const r=R.resolveRound(index,decisions([branch,branch,0,2,1,0]));
  for(const d of r.dialogues)assert(story.characters[d.speaker]);
  for(const c of r.choices)if(c.reply)assert(story.characters[c.speaker]);
 }
});
test('Server accepts only each room version’s matching ending card; existing versions are immutable',()=>{
 const room=require('../database.harm-v3.rules.json').rules.roomsHarmV3.$room;
 const validCard=new Function('newData','return '+room.outcome.card['.validate']);
 const validVersion=new Function('newData','data','return '+room.control.version['.validate']);
 const versions={[story.version]:Object.fromEntries(Object.entries(story.endings).map(([k,e])=>[k,e.card])),...legacy};
 for(const [version,cards] of Object.entries(versions)){
  assert(validVersion({val:()=>version},{exists:()=>false}));
  assert(validVersion({val:()=>version},{exists:()=>true,val:()=>version}));
  for(const [candidateVersion,candidates] of Object.entries(versions)){
   if(candidateVersion!==version)assert(!validVersion({val:()=>candidateVersion},{exists:()=>true,val:()=>version}));
   for(const ending of ['A','B','C'])for(const [letter,card] of Object.entries(candidates)){
    const root={child:()=>({child:()=>({val:()=>version})})};
    const nd={val:()=>card,parent:()=>({child:()=>({val:()=>ending}),parent:()=>root})};
    assert.equal(validCard(nd),candidateVersion===version&&letter===ending);
   }
  }
 }
 assert(!validVersion({val:()=> 'invented'},{exists:()=>false}));
});
const report={date:new Date().toISOString(),passed:checks.length,checks};
fs.writeFileSync(path.join(__dirname,'../verification-scenario.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
