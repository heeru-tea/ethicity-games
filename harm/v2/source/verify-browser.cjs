// 실행: NODE_PATH에 Playwright가 설치된 폴더를 지정하고 로컬 미리보기 서버를 켭니다.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base=path.join(__dirname,'..'),story=JSON.parse(fs.readFileSync(path.resolve(base,'../scenario.json'),'utf8'));
let url=process.env.HARM_TEST_URL;
const screenshots=process.env.HARM_SCREENSHOTS||path.resolve(base,'../../../..');
const checks=[],errors=[];
async function capture(page,name){
 await page.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
 await page.waitForFunction(()=>Array.from(document.images).every(image=>image.complete&&image.naturalWidth>0));
 await page.screenshot({path:path.join(screenshots,name),fullPage:true});
}
(async()=>{
 let server;
 if(!url){
  server=require('node:http').createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});fs.createReadStream(path.join(base,'index.html')).pipe(res);});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  url='http://127.0.0.1:'+server.address().port+'/harm/v2/';
 }
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url,{waitUntil:'load'});
  await page.waitForFunction(()=>document.fonts.check('16px Ethicity')&&document.querySelector('canvas[data-village]')?.width===1280);
  await capture(page,'harm-v2-home.png');
  assert.equal(await page.locator('h1').textContent(),story.title);
  assert.equal(await page.locator('.ee-button').count()>2,true);
  checks.push('Common courtyard, portraits, icons, font and buttons load without external asset requests');
  await page.locator('[data-action="demo"]').click();
  await page.locator('[data-action="character"][data-index="1"]').click();
  await page.locator('#nickname').fill('별고래');
  await page.locator('#player-form button[type="submit"]').click();
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('ethicity.player'))),{character:'char_04',nickname:'별고래'});
  await page.locator('[data-speech]').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('[data-speech]').dataset.typingState==='typing');
  await page.locator('[data-speech]').click();
  assert.equal(await page.locator('[data-speech]').getAttribute('data-typing-state'),'complete');
  await capture(page,'harm-v2-intro.png');
  await page.locator('.experience-settings>summary').click();
  await page.locator('[data-action="sfx"]').click();
  assert.equal(await page.locator('[data-action="sfx"]').getAttribute('aria-pressed'),'true');
  await page.locator('[data-action="music"]').click();
  assert.equal(await page.locator('[data-action="music"]').getAttribute('aria-pressed'),'true');
  await page.locator('[data-action="music"]').click();
  await page.locator('[data-action="sfx"]').click();
  await page.locator('.experience-settings>summary').click();
  checks.push('Legacy character ID saves with common Jiho portrait; typing, music and SFX controls work');
  await page.locator('[data-action="join"]').click();
  await page.locator('[data-action="next"]').click();
  for(let i=0;i<8;i++){
   assert.equal(await page.locator('.story-chapter .narrative-text p').count(),story.rounds[i].narrative.length);
   assert(await page.locator('.story-chapter').isVisible());
   assert.equal(await page.locator('[role="timer"]').count(),0);
   await page.locator('.round-scene img').evaluate(image=>image.decode());
   if(i===0){await capture(page,'harm-v2-round1.png');}
   if(i===3){assert.equal((await page.locator('.voice-track').innerText()).replace(/\s+/g,' ').trim(),'추가된 AI 해설 AI로 만든 목소리를 놀이 영상에 덧붙였습니다.');}
   await page.locator('[data-action="start-vote"][data-index="90"]').click();
   assert(await page.locator('.story-chapter').isVisible());
   assert.equal(await page.locator('.choice-screen [data-common-icon="clue"]').count(),0);
   if(i===0){
    await page.locator('[data-action="pause"]').click();assert(await page.locator('[data-action="submit"]').isDisabled());
    await page.locator('[data-action="extend"]').click();await page.locator('[data-action="pause"]').click();
   }
   const choice=story.rounds[i].choices.findIndex(c=>c.protect);
   await page.locator(`[data-action="choice"][data-index="${choice}"]`).click();
   await page.locator('[data-action="submit"]').click();
   assert((await page.locator('#vote-status').innerText()).includes('선택을 확인했습니다'));
   await page.locator('[data-action="next"]').click();
   assert(await page.locator('.feedback').isVisible());
   assert(await page.locator('.story-chapter').isVisible());
   assert.equal(await page.locator('[role="timer"]').count(),0);
   await page.locator('[data-action="next"]').click();
  }
  const result=await page.evaluate(()=>JSON.parse(localStorage.getItem('ethicity.result.harm')));
  assert.deepEqual(result,{game:'harm',completed:true,ending:'A',card:story.endings.A.card});
  await page.locator('[data-action="recap"]').first().click();
  assert((await page.locator('.class-answer').innerText()).includes(story.recap[0].choices[0].text));
  const downloaded=page.waitForEvent('download');await page.locator('[data-action="card"]').click();
  const download=await downloaded;assert.equal(download.suggestedFilename(),'harm-한줄카드.png');
  assert.equal(await download.failure(),null);
  await capture(page,'harm-v2-ending.png');
  checks.push('All eight rounds, persistent stories, voting pause/extend, class ending, recap, completion and card download pass');
  await page.goto(url);await page.locator('[data-action="demo"]').click();
  assert.equal(await page.locator('#player-form').count(),0);assert(await page.locator('[data-action="join"]').isVisible());
  checks.push('Saved ethicity.player skips character selection');
  await page.setViewportSize({width:390,height:844});await page.goto(url);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await capture(page,'harm-v2-mobile.png');
  await page.locator('[data-action="demo"]').click();await page.locator('[data-action="join"]').click();await page.locator('[data-action="next"]').click();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await capture(page,'harm-v2-mobile-round.png');
  checks.push('390px mobile home and round layouts have no horizontal overflow');
  const offline=await browser.newContext({viewport:{width:1280,height:900}}),filePage=await offline.newPage();
  filePage.on('pageerror',e=>errors.push(e.message));
  await filePage.goto('file:///'+path.join(base,'index.html').replaceAll('\\','/'));
  await filePage.locator('[data-action="demo"]').click();
  assert(await filePage.locator('#player-form').isVisible());
  checks.push('Single downloaded HTML opens the offline preview');
  assert.deepEqual(errors,[]);
  const report={passed:checks.length,checks,errors};fs.writeFileSync(path.join(base,'verification-browser.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();if(server)await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
