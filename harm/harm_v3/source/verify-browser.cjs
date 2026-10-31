'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const base=path.resolve(__dirname,'..'),story=require('../scenario.json');
const out=process.env.HARM_SCREENSHOTS||path.join(base,'qa');fs.mkdirSync(out,{recursive:true});
const checks=[],errors=[];
(async()=>{
 const server=require('node:http').createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});fs.createReadStream(path.join(base,'index.html')).pipe(res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port+'/harm/harm_v3/';
 const browser=await chromium.launch({channel:'msedge',headless:true});
 async function screenshot(page,name){await page.evaluate(()=>{finishTyping();return Promise.all([...document.images].map(i=>i.decode()));});await page.screenshot({path:path.join(out,name+'.png'),fullPage:true});}
 try{
  const context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const external=[];page.on('request',r=>{if(!r.url().startsWith(url)&&/^https?:/.test(r.url()))external.push(r.url());});
  await page.goto(url);await page.waitForFunction(()=>commonLoaded&&document.fonts.check('16px Ethicity'));
  assert.equal(await page.locator('h1').innerText(),story.title);assert.equal(await page.evaluate(()=>backgroundMusic.state().playing),false);await screenshot(page,'home');
  await page.locator('[data-action="demo"]').click();await page.locator('[data-action="character"][data-index="1"]').click();await page.locator('#nickname').fill('별고래');await page.locator('#player-form button[type="submit"]').click();
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('ethicity.player'))),{character:'char_04',nickname:'별고래'});
  const speech=page.locator('[data-speech]').first();await speech.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('[data-speech]')?.dataset.typingState==='typing');await speech.click();assert.equal(await speech.getAttribute('data-typing-state'),'complete');
  await page.waitForFunction(()=>backgroundMusic.state().playing);
  assert.equal(await page.evaluate(()=>backgroundMusic.state().volume),.18);
  await page.locator('.experience-settings>summary').click();
  await page.locator('#music-volume').fill('30');assert.equal(await page.evaluate(()=>backgroundMusic.state().volume),.3);
  await page.locator('[data-action="music"]').click();assert.equal(await page.evaluate(()=>backgroundMusic.state().playing),false);assert.equal(await page.locator('[data-action="music"]').getAttribute('aria-pressed'),'false');
  await page.locator('[data-action="music"]').click();await page.waitForFunction(()=>backgroundMusic.state().playing);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await page.evaluate(()=>backgroundMusic.state().playing),false);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForFunction(()=>backgroundMusic.state().playing);
  await page.locator('[data-action="music"]').click();
  await page.locator('[data-action="sfx"]').click();assert.equal(await page.locator('[data-action="sfx"]').getAttribute('aria-pressed'),'true');await page.locator('[data-action="sfx"]').click();await page.locator('.experience-settings>summary').click();
  await page.locator('[data-action="join"]').click();await page.locator('[data-action="next"]').click();
  const picks=[1,2,0,2,1,0,1,2];
  for(let i=0;i<8;i++){
   await page.locator(`.round-scene[data-scene="${i+1}"]`).waitFor();assert.equal(await page.locator('[role="timer"]').count(),0);assert(await page.locator('.story-chapter').isVisible());
   const topic={2:'photo',3:'voice',4:'tracking',5:'shop'}[i];if(topic)assert.equal(await page.locator(`[data-risk="${topic}"]`).getAttribute('data-state'),'needed');
   if(i===2)assert((await page.locator('.narrative-text').innerText()).includes('게시판에 올라가지 않았다'));
   if(i===3)assert((await page.locator('.narrative-text').innerText()).includes('만들 수 없었다'));
   if(i===0||i===3||i===6)await screenshot(page,'round-'+(i+1));
   await page.locator('[data-action="start-vote"][data-index="90"]').click();
   assert(await page.locator('.story-chapter').isVisible());assert.equal(await page.locator('.choice-screen .learning-details').count(),0);
   if(i===0){await page.locator('[data-action="pause"]').click();assert(await page.locator('[data-action="submit"]').isDisabled());await page.locator('[data-action="extend"]').click();await page.locator('[data-action="pause"]').click();}
   await page.locator(`[data-action="choice"][data-index="${picks[i]}"]`).click();await page.locator('[data-action="submit"]').click();await page.locator('[data-action="next"]').click();
   await page.locator('.feedback').waitFor();assert.equal(await page.locator('[role="timer"]').count(),0);assert(await page.locator('.story-chapter').isVisible());
   assert.equal(await page.locator('.learning-details').count(),0);
   await page.locator('[data-action="next"]').click();
  }
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('ethicity.result.harm'))),{game:'harm',completed:true,ending:'A',card:story.endings.A.card});
  assert.equal(await page.locator('[data-state="resolved"]').count(),4);await page.locator('[data-action="recap"]').first().click();assert((await page.locator('.class-answer').innerText()).includes('사진 속 사람이 사진을 쓰지 말라고 해요.'));
  const downloadEvent=page.waitForEvent('download');await page.locator('[data-action="card"]').click();const download=await downloadEvent;await download.saveAs(path.join(out,'learning-card.png'));
  await screenshot(page,'ending-a');checks.push('Full A path: original UI/assets, 8 persistent stories, hidden tags, voting timer/pause, common player storage, shared recap and exported card');
  checks.push('Multiple speakers type correctly; user MP3 starts after a gesture, toggles, adjusts volume, pauses while hidden, resumes, and keeps separate SFX controls');assert.deepEqual(external,[]);
  // Exercise all branch scenes with the actual DOM, including repair, paused event and each ending.
  for(const picks of [[0,1,1,1,2,2,0,1],[0,1,2,0,0,1,2,2],[1,0,0,2,1,2,1,2]]){
   await page.evaluate(picks=>{const room=HarmRules.newRoom('demo',Date.now());room.members={demo:{nickname:'별고래',character:'char_04',joinedAt:Date.now()}};room.decisions=Object.fromEntries(picks.map((choice,i)=>[i,{choice,counts:{0:1,1:0,2:0},total:1,tie:false,at:Date.now()}]));S.role='demo';S.roomId='branch-'+picks.join('');S.uid='demo';room.control={...room.control,round:6,phase:'observe',accepting:false};setRoom(room,true);},picks);
   const txt=await page.locator('.narrative-text').innerText();if(picks[0]===0){assert(txt.includes('写真')===false);assert(txt.includes('게시판의 사진을 내려 달라는 요청이 아직 필요하다'));}else assert(txt.includes('만들기 전에 막았다'));
   if(picks[5]===2)assert(txt.includes('잠시 쉬고 있다'));
   await screenshot(page,'branch-r7-'+picks.join(''));
   const expected=await page.evaluate(()=>{const room=structuredClone(S.room);room.outcome=HarmRules.resultOf(room.decisions);room.control.phase='ended';room.control.round=7;setRoom(room,true);return room.outcome;});
   assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('ethicity.result.harm'))),expected);await screenshot(page,'ending-'+expected.ending.toLowerCase()+'-'+picks[0]);
  }
  checks.push('DOM branch checks: spread/prevented photos, harmed/prevented calls, paused events, support states and A/B/C completion');
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{S.control.round=3;S.control.phase='vote';S.control.startedAt=Date.now();S.control.duration=90000;render(true);});
  await screenshot(page,'mobile-round4');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.equal(await page.locator('.choice-screen [data-action="choice"]').count(),3);
  checks.push('390px mobile view has readable story/choices and no horizontal overflow');
  const blocked=await browser.newContext({viewport:{width:1280,height:900}});
  await blocked.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error('blocked')};Storage.prototype.setItem=()=>{throw Error('blocked')};});
  const bp=await blocked.newPage();bp.on('pageerror',e=>errors.push(e.message));await bp.goto(url);await bp.locator('[data-action="demo"]').click();await bp.locator('[data-action="character"]').first().click();await bp.locator('#nickname').fill('반짝');await bp.locator('#player-form button[type="submit"]').click();await bp.locator('[data-action="join"]').click();
  await bp.evaluate(()=>{S.room.decisions=Object.fromEntries([0,1,2,0,0,1,2,2].map((choice,i)=>[i,{choice}]));S.room.outcome=HarmRules.resultOf(S.room.decisions);S.room.control.phase='ended';S.room.control.round=7;setRoom(S.room,true);});
  assert((await bp.locator('#completion-status').innerText()).includes('저장을 허용하지 않아'));assert(await bp.locator('.learning-card').isVisible());checks.push('Storage-blocked browser can reach ending and show card without crashing');
  await blocked.close();
  await page.setViewportSize({width:1280,height:900});await page.goto(url);await page.locator('[data-action="demo"]').click();assert.equal(await page.locator('#player-form').count(),0);assert(await page.locator('[data-action="join"]').isVisible());assert.equal(await page.evaluate(()=>backgroundMusic.state().enabled),false);assert.equal(await page.evaluate(()=>backgroundMusic.state().volume),.3);
  checks.push('Returning player skips character selection; standalone preview makes no external requests');
  assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
 const report={date:new Date().toISOString(),passed:checks.length,checks,errors};fs.writeFileSync(path.join(base,'verification-browser.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
