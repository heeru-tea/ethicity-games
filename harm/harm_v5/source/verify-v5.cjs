'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm'),{chromium}=require('playwright');
const base=path.resolve(__dirname,'..'),story=require('../scenario.json'),{createStoryRules}=require('./story-rules.js');
const checks=[],failures=[];fs.mkdirSync(path.join(base,'qa'),{recursive:true});
const model=createStoryRules(story);let endings={A:0,B:0,C:0};
for(let code=0;code<6561;code++){let n=code,d={};for(let i=0;i<8;i++){d[i]={choice:n%3};n=Math.floor(n/3);const r=model.resolveRound(i,d);assert.equal(r.choices.length,3);}const s=model.summarize(d);endings[s.ending]++;assert(s.trust>=0&&s.trust<=16);assert(s.popularity>=0&&s.popularity<=16);}
checks.push({allPaths:6561,endings});
const server=require('node:http').createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});fs.createReadStream(path.join(base,'index.html')).pipe(res);});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/harm/harm_v5/`;const browser=await chromium.launch({channel:'msedge',headless:true});
try{
const context=await browser.newContext({viewport:{width:1180,height:820},acceptDownloads:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.waitForFunction(()=>typeof commonLoaded!=='undefined'&&commonLoaded);await page.evaluate(()=>document.fonts.ready);
await page.screenshot({path:path.join(base,'qa','home.png')});
await page.locator('[data-action=demo]').click();await page.locator('[data-action=character][data-index="0"]').click();await page.locator('#player-form [type=submit]').click();await page.locator('[data-action=join]').click();
assert.equal(await page.locator('[data-speech]').count(),1);await page.evaluate(()=>backgroundMusic.stop());
const baseState=await page.evaluate(()=>{let room=newRoom('demo',Date.now());room.members={demo:{nickname:'A버전 탐험가',character:'char_03',joinedAt:Date.now()}};return room;});
const pathChoices=[1,2,0,2,1,0,1,2];
const snapshots=[];
for(const viewport of [{width:1180,height:820},{width:1024,height:768},{width:1280,height:800},{width:1366,height:768},{width:1280,height:650},{width:768,height:1024}]){
 await page.setViewportSize(viewport);
 for(const role of ['demo','teacher','student']){
  await page.evaluate(({baseState,role})=>{S.role=role;S.uid='demo';S.roomId='a'.repeat(32);S.connected=true;S.ownVotes={};S.selected=null;setRoom(structuredClone(baseState));}, {baseState,role});
  for(let ri=0;ri<8;ri++){
   for(const phase of ['observe','clues','vote','feedback']){
    await page.evaluate(({ri,phase,pathChoices})=>{S.room.control={...S.room.control,round:ri,phase,step:0,ballot:ri+1};if(phase==='feedback'){S.room.decisions??={};S.room.decisions[ri]={choice:pathChoices[ri],counts:{0:pathChoices[ri]===0?1:0,1:pathChoices[ri]===1?1:0,2:pathChoices[ri]===2?1:0},total:1,tie:false,at:Date.now()};S.ownVotes[ri]={choice:(pathChoices[ri]+1)%3,ballot:ri+1};}setRoom(S.room);finishTyping();},{ri,phase,pathChoices});
    const measure=await page.evaluate(()=>({page:document.documentElement.scrollHeight-innerHeight,width:document.documentElement.scrollWidth-innerWidth,speeches:document.querySelectorAll('[data-speech]').length,panels:[...document.querySelectorAll('.side-panel,.beat-box,.kiosk-display')].map(e=>({kind:e.className,overflow:e.scrollHeight-e.clientHeight}))}));
    if(measure.page>2||measure.width>2||measure.speeches!==1)failures.push({viewport,role,ri,phase,...measure});
    if(viewport.width===1180&&role==='demo'&&ri===0){await page.screenshot({path:path.join(base,'qa',phase+'.png')});}
    if(viewport.width===768&&role==='student'&&ri===6&&phase==='vote')await page.screenshot({path:path.join(base,'qa','portrait-vote.png')});
   }
  }
 }
 snapshots.push({viewport,checked:96});
}
checks.push({layouts:snapshots});
await page.setViewportSize({width:1180,height:820});
await page.evaluate(()=>{S.role='demo';S.roomId='a'.repeat(32);S.room.control.phase='ended';S.room.outcome=resultOf(S.room.decisions);setRoom(S.room);});
await page.locator('[data-action=ending-learning]').click();await page.locator('[data-action=learn][data-index="1"]').click();await page.locator('[data-action=learn][data-index="4"]').click();const downloadPromise=page.waitForEvent('download');await page.locator('[data-action=download-report]').click();const download=await downloadPromise;await download.saveAs(path.join(base,'qa','sample-report.png'));assert(fs.statSync(path.join(base,'qa','sample-report.png')).size>10000);checks.push({png:download.suggestedFilename()});await page.locator('[data-action=close-modal]').click();
await page.evaluate(()=>{S.role='teacher';S.room.control.phase='vote';S.room.control.round=0;setRoom(S.room);});await page.locator('[data-action=invite]').click();const qr=await page.locator('[data-qr]').screenshot();fs.writeFileSync(path.join(base,'qa','invite-qr.png'),qr);assert.equal(await page.locator('.invite-url input').inputValue(),url+'?room='+'a'.repeat(32));await page.screenshot({path:path.join(base,'qa','teacher-invite.png')});await page.locator('[data-action=close-modal]').click();await page.locator('.teacher-toolbar [data-action=explain]').click();for(let i=0;i<3;i++){await page.locator('[data-action=explain-choice][data-index="'+i+'"]').click();assert((await page.locator('.modal-body').innerText()).includes(story.rounds[0].choices[i].feedback));}await page.screenshot({path:path.join(base,'qa','teacher-explanation.png')});checks.push({qr:true,teacherExplanation:3});
const protocol=await page.evaluate(()=>{
 let room=newRoom('owner',100);room.members={s:{}};room=transition(room,'start',100);let count=0;while(room.control.phase!=='vote'&&count++<100)room=transition(room,'next',200);const initial=structuredClone(room);
 const noAuto=shouldAutoAdvance(room.control,Date.now()+1e12)===false;
 room=transition(room,'next',500);const empty=room.control.phase==='empty';room=transition(room,'retry',501);room.votes={0:{s:{choice:1,ballot:room.control.ballot,at:1}}};room=transition(room,'next',600);const feedback=room.control.phase==='feedback';const d=JSON.stringify(room.decisions);for(let i=0;i<phaseBeats(room.control,room.decisions).length;i++)room=transition(room,'next',700+i);return {noAuto,empty,feedback,decisionStable:JSON.stringify(room.decisions)===d,initialPhase:initial.control.phase,oldPauseIgnored:!transition(initial,'pause',400)};
});Object.values(protocol).slice(0,4).forEach(v=>assert.equal(v,true));assert.equal(protocol.oldPauseIgnored,true);checks.push(protocol);
assert.deepEqual(errors,[]);checks.push({browserErrors:errors});
}finally{await browser.close();server.close();}
const report={checks,failures};fs.writeFileSync(path.join(base,'verification-v5.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(failures.length)process.exitCode=1;
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
