'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ETHICITY_EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.ETHICITY_TEST_URL||pathToFileURL(path.resolve(__dirname,'../index.html')).href);
  await page.locator('#start-game').waitFor();
  assert.equal(await page.locator('#background-music').evaluate(a=>a.paused&&a.currentTime===0),true,'No music before a user starts');
  assert.match(await page.locator('body').evaluate(e=>getComputedStyle(e).cursor),/cursor-arrow.svg/);
  assert.match(await page.locator('#start-game').evaluate(e=>getComputedStyle(e).cursor),/cursor-pointer.svg/);
  await page.locator('#start-game').click();
  await page.locator('.is-typing').waitFor();
  const partial=await page.locator('.message-bubble').innerText();
  await page.waitForFunction(()=>!document.querySelector('audio').paused&&document.querySelector('audio').currentTime>0);
  await page.locator('#next-line').click();
  const full=await page.locator('.message-bubble').innerText();assert.ok(full.startsWith(partial)&&full.length>partial.length);
  await page.locator('#next-line').click();await page.locator('.is-typing').waitFor();
  assert.equal(await page.locator('.message').count(),1);
  assert.ok(!(await page.locator('#conversation-log').innerText()).includes(full),'Old bubble was removed');
  await page.locator('#open-settings').click();
  await page.locator('#typing-setting').selectOption('instant');
  await page.locator('#bgm-setting').uncheck();assert.equal(await page.locator('audio').evaluate(a=>a.paused),true);
  await page.locator('#bgm-volume').fill('40');assert.equal(await page.locator('audio').evaluate(a=>a.volume),.4);
  await page.locator('#bgm-setting').check();await page.waitForFunction(()=>!document.querySelector('audio').paused);
  const audio=await page.locator('audio').evaluate(a=>({duration:a.duration,loop:a.loop}));assert.ok(audio.duration>1&&audio.loop);
  await page.locator('#close-settings').click();await page.locator('#next-line').click();
  assert.equal(await page.locator('.is-typing').count(),0);
  assert.equal(await page.locator('.message').count(),1);
  async function flush(){for(let i=0;i<25&&await page.locator('#next-line').isVisible();i++)await page.locator('#next-line').click();}
  await flush();await page.locator('#begin-scenes').click();await flush();
  await page.locator('[data-choice="0"]').click();await flush();
  assert.match(await page.locator('.scene-title').innerText(),/의견/);
  assert.ok(!(await page.locator('#conversation-log').innerText()).includes('이거면 충분하겠지'),'Scene transition clears previous text');
  await page.locator('[data-choice="0"]').click();await flush();
  assert.equal(await page.locator('.material-card').count(),0,'Activity content is cleared when returning to collection');
  await page.locator('#open-settings').click();await page.locator('#typing-setting').selectOption('typing');await page.locator('#close-settings').click();
  await page.locator('[data-choice="1"]').click();await page.locator('.is-typing').waitFor();
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>!document.querySelector('.is-typing'));
  await page.screenshot({path:path.join(__dirname,'artifacts/effects-desktop.png'),fullPage:true});
  await page.locator('#brand-home').click();await page.locator('#confirm-restart').click();
  assert.equal(await page.locator('audio').evaluate(a=>a.paused&&a.currentTime===0),true);
  assert.deepEqual(errors,[]);
  console.log('PASS effects: typing/instant, one bubble, scene reset, cursor, BGM gesture/mute/volume/loop, reduced motion, restart');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
