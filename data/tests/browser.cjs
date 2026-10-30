'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{pathToFileURL}=require('node:url');
const output=path.join(__dirname,'artifacts');fs.mkdirSync(output,{recursive:true});
const url=pathToFileURL(path.resolve(__dirname,'../index.html')).href;
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ETHICITY_EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const results=[];
 async function checkTyping(){
  const context=await browser.newContext({viewport:{width:430,height:740},hasTouch:true,reducedMotion:'no-preference'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.locator('#start-game').click();
  const first='안녕! 나는 급식 메뉴 AI, 냠냠봇이야. 다음 주 급식 메뉴를 정하려고 해!';
  await page.locator('.is-typing').waitFor();const length=(await page.locator('.message-bubble').last().innerText()).length;
  assert.ok(length<first.length,'The line begins partially revealed');
  await page.waitForFunction(n=>document.querySelector('.message-bubble').textContent.length>n,length);
  assert.equal(await page.locator('#scene-speaker').getAttribute('data-speaker'),'robot');
  await page.locator('#next-line').tap();assert.equal(await page.locator('.message').count(),1,'First tap completes this line only');assert.equal(await page.locator('.message-bubble').innerText(),first);
  await page.keyboard.press('Space');await page.locator('.is-typing').waitFor();assert.equal(await page.locator('.message').count(),2);assert.equal(await page.locator('#scene-speaker').getAttribute('data-speaker'),'teacher');
  await page.locator('.message-bubble').last().tap();assert.equal(await page.locator('.is-typing').count(),0,'Tapping the chat completes the sentence');assert.equal(await page.locator('.message').count(),2);
  await page.locator('#next-line').tap();await page.locator('.is-typing').waitFor();await page.waitForFunction(()=>!document.querySelector('.is-typing'),null,{timeout:7000});assert.equal(await page.locator('.message').count(),3,'Natural completion does not advance automatically');
  await page.locator('#open-settings').tap();await page.locator('#typing-setting').check();await page.locator('#close-settings').tap();await page.locator('#next-line').tap();assert.equal(await page.locator('.is-typing').count(),0,'Instant text setting bypasses typing');
  await page.locator('#brand-home').tap();await page.locator('#confirm-restart').tap();await page.locator('#open-settings').tap();await page.locator('#typing-setting').uncheck();await page.locator('#close-settings').tap();await page.locator('#start-game').tap();
  await page.locator('.is-typing').waitFor();await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>!document.querySelector('.is-typing'));assert.equal(await page.locator('.message-bubble').innerText(),first);
  await page.locator('#next-line').tap();assert.equal(await page.locator('.is-typing').count(),0);assert.equal(await page.locator('.message').count(),2);
  await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('#next-line').tap();await page.locator('.is-typing').waitFor();await page.locator('#brand-home').tap();await page.locator('#confirm-restart').tap();await page.locator('#start-game').tap();assert.equal(await page.locator('.message').count(),1,'Restart cancels the old typing timer');
  await page.locator('#next-line').tap();const rect=await page.locator('#action-area').boundingBox();assert.ok(rect.y+rect.height<=742);assert.deepEqual(errors,[]);
  await page.screenshot({path:path.join(output,'mobile-typing.png'),fullPage:true});await context.close();
  return {passed:true,checks:['gradual reveal','tap completes before advancing','Space advances','chat tap completes','natural completion waits','instant text setting','live reduced motion','restart cancels timer','430×740 controls visible']};
 }
 async function run(name,width,height,options){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:options.reduced?'reduce':'no-preference',hasTouch:width<=760});
  const host=await context.newPage(),errors=[],external=[];let page=host;
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url());});
  await page.addInitScript(()=>{window.testEvents=[];for(const type of ['ready','progress','complete','exit'])window.addEventListener('ethicity:'+type,e=>window.testEvents.push(e.detail));window.storageWrites=0;Storage.prototype.setItem=function(){window.storageWrites++;throw Error('Unexpected storage write');};});
  await host.goto(options.embedded?pathToFileURL(path.join(__dirname,'integration.html')).href:url);if(options.embedded)page=await (await host.locator('#game').elementHandle()).contentFrame();await page.locator('#start-game').waitFor();await host.screenshot({path:path.join(output,name+'-start.png'),fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No horizontal overflow');
  await page.locator('#open-settings').click();assert.ok(await page.locator('#settings-dialog').isVisible());assert.equal(await page.locator('#motion-setting').isChecked(),!!options.reduced);await host.keyboard.press('Escape');
  await page.locator('#start-game').focus();await host.keyboard.press('Enter');await host.keyboard.press('Space');
  async function flush(){for(let i=0;i<40;i++){const next=page.locator('#next-line');if(!await next.isVisible())return;if(width<=760)await next.tap();else await next.click();}throw Error('Dialogue did not yield to choices');}
  async function pick(text){const choice=page.getByRole('button',{name:text,exact:true});if(width<=760)await choice.tap();else await choice.click();await flush();}
  await flush();await page.locator('#begin-scenes').click();await flush();
  if(options.quizRetry){await pick('오늘 날씨');assert.ok((await page.locator('#conversation-log').innerText()).includes('날씨도 데이터가 될 수 있어'));}
  await host.keyboard.press('1');await flush();
  async function visit(index){await page.locator(`[data-choice="${index}"]`).click();assert.equal(await page.locator('#scene-image').getAttribute('data-scene'),['box','jiho','saebom','haneul'][index]);if(index===0)await host.screenshot({path:path.join(output,name+'-opinion-box.png'),fullPage:true});await flush();}
  await visit(0);await visit(1);
  if(options.all){await pick('아직 못 만난 친구가 있어, 더 모을래');await visit(2);await pick('아직 못 만난 친구가 있어, 더 모을래');await visit(3);}else await pick('그만 모으기');
  assert.equal(await page.locator('#scene-image').getAttribute('data-scene'),'sort');await host.screenshot({path:path.join(output,name+'-sorting.png'),fullPage:true});
  for(let i=0;i<3;i++){
   const correct=i===2?'넣기':'빼기';
   if(options.dirty&&i===0){await pick('넣기');await page.locator('[data-choice="1"]').click();await flush();}
   else if(options.sortRetry&&i===1){await pick('넣기');await pick('다시 골라 보기');await pick(correct);}
   else await pick(correct);
  }
  await pick(options.protect?'의견함을 잠그고 선생님과 함께 연다':'그냥 둔다');
  const initialChat=await page.locator('#conversation-log').innerText();assert.ok(initialChat.includes('아직 아무도 먹지 않았어요'));assert.ok(initialChat.includes(options.dirty?'금요일에 땅콩버터 피자':'목요일 치킨에 땅콩 소스'));
  await host.screenshot({path:path.join(output,name+'-chat.png'),fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const actionRect=await page.locator('#action-area').boundingBox();assert.ok(actionRect.y+actionRect.height<=height+2,'Choices remain in viewport');
  await pick('받은 의견이 한쪽으로 치우쳐 있어서');
  if(options.input){await page.locator('#reflection-input').fill('테스트 의견 123 <script>내용</script>');await host.keyboard.press('1');assert.ok(await page.locator('#reflection-input').isVisible());await page.locator('#reflection-next').click();}else await page.locator('#reflection-skip').click();
  await flush();
  if(options.trap){await page.locator('[data-choice="4"]').click();await flush();assert.ok((await page.locator('#conversation-log').innerText()).includes('같이 못 먹는 거야'));}
  await page.locator(`[data-choice="${options.question?0:1}"]`).click();await page.locator('[data-choice="3"]').click();
  await host.screenshot({path:path.join(output,name+'-methods.png'),fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const methodRect=await page.locator('#action-area').boundingBox();assert.ok(methodRect.y+methodRect.height<=height+2,'Method choices stay in viewport');
  await page.locator('#confirm-methods').click();await flush();
  await pick(options.protect?'안 돼! 꼭 필요한 선생님만 볼 수 있어':'보여 준다');
  assert.equal(await page.locator('#scene-image').getAttribute('data-scene'),'protect');await host.screenshot({path:path.join(output,name+'-protect.png'),fullPage:true});
  await pick(options.protect?'필요한 동안 잘 보관하고, 다 쓰면 안전하게 버린다':'교실 게시판에 붙여 둔다');
  assert.equal(await page.locator('#result-title').innerText(),options.expected);
  assert.equal(await page.locator('.word-card.earned').count(),5);
  assert.equal(await page.locator('#finish-game').isDisabled(),true);
  await page.locator('[data-pledge="0"]').click();await page.locator('[data-pledge="3"]').click();await page.locator('[data-pledge="4"]').click();
  await page.locator('[data-pledge="5"]').click();assert.equal(await page.locator('[data-pledge][aria-pressed=true]').count(),3);
  if(options.input){await page.locator('#pledge-edit-select').selectOption('0');await page.locator('#pledge-edit-input').fill('테스트 약속 <img src=x>');}
  await page.locator('#finish-game').click();assert.ok(await page.getByRole('heading',{name:'함께 먹는 급식, 함께 지키는 데이터'}).isVisible());
  if(options.input)assert.ok((await page.locator('.complete-pledges').innerText()).includes('<img src=x>'));
  const audit=await page.evaluate(()=>({events:window.testEvents,writes:window.storageWrites,overflow:document.documentElement.scrollWidth>innerWidth,broken:[...document.images].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src),motion:document.body.classList.contains('reduced-motion')}));
  assert.equal(audit.writes,0);assert.equal(audit.overflow,false);assert.deepEqual(audit.broken,[]);assert.deepEqual(audit.events.filter(e=>e.type==='ethicity:progress').map(e=>e.current),[1,2,3,4,5,6]);
  assert.equal(audit.events.filter(e=>e.type==='ethicity:ready').length,1);assert.deepEqual(audit.events.filter(e=>e.type==='ethicity:complete'),[{type:'ethicity:complete',gameId:'data',result:{completed:true}}]);assert.ok(!JSON.stringify(audit.events).includes('테스트'));assert.deepEqual(external,[]);assert.deepEqual(errors,[]);if(options.embedded){const parentEvents=await host.evaluate(()=>integrationEvents);assert.deepEqual(parentEvents,audit.events);}
  await host.screenshot({path:path.join(output,name+'-complete.png'),fullPage:true});await page.locator('#play-again').click();await page.locator('#start-game').waitFor();
  results.push({name,width,height,result:options.expected,...audit,errors,externalRequests:external.length});await context.close();
 }
 try{
  const typing=await checkTyping();
  await run('desktop',1280,900,{embedded:true,all:true,protect:true,question:true,quizRetry:true,sortRetry:true,trap:true,input:true,expected:'모두가 맛있는 급식'});
  await run('tablet',760,900,{all:false,protect:true,question:true,reduced:true,expected:'조금 더 살펴볼 급식'});
  await run('mobile',430,932,{all:false,dirty:true,protect:false,question:false,input:true,trap:true,expected:'다시 짜 볼 급식'});
  fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify({passed:true,typing,results},null,2));console.log(JSON.stringify({passed:true,typing,results:results.map(({name,width,height,result,errors,externalRequests})=>({name,width,height,result,errors,externalRequests}))},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
