'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{pathToFileURL}=require('node:url');
const out=path.join(__dirname,'artifacts');fs.mkdirSync(out,{recursive:true});
const url=pathToFileURL(path.resolve(__dirname,'../index.html')).href;
(async()=>{
const browser=await chromium.launch({headless:true,executablePath:process.env.ETHICITY_EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const results=[];
try{
for(const config of [
{name:'desktop-repaired',width:1280,height:900,all:false,dirty:true,methods:[3,4],repair:true,protect:true,expected:'모두가 맛있는 급식'},
{name:'tablet-partial',width:760,height:900,all:true,dirty:false,methods:[0,4],repair:false,protect:true,expected:'조금 더 살펴볼 급식'},
{name:'mobile-pending',width:430,height:740,all:false,dirty:true,methods:[0,1],repair:false,protect:false,expected:'다시 짜 볼 급식'},
{name:'mobile-ready',width:430,height:932,all:true,dirty:false,methods:[0,1],repair:false,protect:true,expected:'모두가 맛있는 급식'}
]){
const context=await browser.newContext({viewport:{width:config.width,height:config.height},hasTouch:config.width<=760,reducedMotion:'reduce'});
const host=await context.newPage(),errors=[],external=[];let page=host;
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url());});
await page.addInitScript(()=>{window.auditEvents=[];for(const type of ['ready','progress','complete'])addEventListener('ethicity:'+type,e=>auditEvents.push(e.detail));Storage.prototype.setItem=()=>{throw Error('Storage must not be written');};});
await host.goto(config.name==='desktop-repaired'?pathToFileURL(path.join(__dirname,'integration.html')).href:url);if(config.name==='desktop-repaired')page=await(await host.locator('iframe').elementHandle()).contentFrame();await page.locator('#start-game').waitFor();
async function tap(locator){if(config.width<=760)await locator.tap();else await locator.click();}
async function flush(){for(let i=0;i<90;i++){if(errors.length)throw Error(errors.join('\n'));const next=page.locator('#next-line');if(!await next.isVisible())return;await tap(next);}throw Error('Flow did not stop');}
async function pick(text){await tap(page.locator('#action-area button').filter({hasText:text}).first());await flush();}
async function option(index){await tap(page.locator('[data-choice="'+index+'"]'));await flush();}
async function screenshot(suffix){await host.screenshot({path:path.join(out,config.name+'-'+suffix+'.png'),fullPage:true});}
await screenshot('start');await page.locator('#start-game').focus();await host.keyboard.press('Enter');await flush();await page.locator('#begin-scenes').click();await flush();
await option(1);assert.match(await page.locator('#conversation-log').innerText(),/날씨도 데이터/);await host.keyboard.press('1');await flush();
await option(0);await option(1);
if(config.all){await option(1);await option(2);await option(1);await option(3);}else await option(0);
for(let i=0;i<3;i++){
await pick(i===2?(config.dirty?'제외하기':'포함하기'):(config.dirty?'포함하기':'제외하기'));
if(config.dirty)await pick('지금 선택으로 이어가기');
}
await pick(config.repair?'그냥 둔다':'응답 폴더에 비밀번호와 접근 권한을 설정한다');
const firstText=await page.locator('#conversation-log').innerText();
assert.match(firstText,config.dirty?/금요일에 땅콩 버터 피자/:/목요일 치킨에 땅콩 소스/);
await screenshot('first-menu');await option(1);
await page.locator('#reflection-input').fill('<script>개인정보 아님</script>');
await host.keyboard.press('1');assert.ok(await page.locator('#reflection-input').isVisible());await page.locator('#reflection-next').click();await flush();
await option(5);assert.match(await page.locator('#conversation-log').innerText(),/같이 못 먹는 거야/);
await page.locator('[data-choice="'+config.methods[0]+'"]').click();await page.locator('[data-choice="'+config.methods[1]+'"]').click();
assert.equal(await page.locator('[aria-pressed="true"]').count(),2);
assert.ok(await page.locator('#action-area .ee-choice').evaluateAll(bs=>bs.every(b=>b.scrollHeight<=b.clientHeight+1)),'Choice text must not be clipped');const confirmBox=await page.locator('#confirm-methods').boundingBox();assert.ok(confirmBox.y+confirmBox.height<=config.height,'Confirm stays visible');await screenshot('methods');await page.locator('#confirm-methods').click();await flush();
for(let i=0;i<35;i++){
const prompt=await page.locator('.action-prompt').textContent().catch(()=>'');
if(prompt.includes('온유'))break;
if(prompt.includes('아직 남은 문제')){await pick(config.repair?'더 고치기':'지금까지 정리하기');}
else if(prompt.includes('어떤 항목'))await option(0);
else if(prompt.includes('아직 의견을 듣지 못한 곳'))await option(0);
else if(prompt.includes('포함할까요')){
const title=await page.locator('.material-card h3').last().innerText();await pick(title.includes('맞춤법')?'포함하기':'제외하기');
}
else if(prompt.includes('안전하게 의견'))await option(0);
else throw Error('Unexpected activity '+prompt);
if(i===34)throw Error('Repair loop did not finish');
}
await pick(config.protect?'친구들의 정보를 아무에게나 보여 주면 안 돼!':'보여 준다');
await pick(config.protect?'필요한 동안 접근을 제한해 보관하고, 다 쓰면 안전하게 삭제한다':'반 전체가 보는 온라인 게시판에 올려 둔다');
assert.equal(await page.locator('#result-title').innerText(),config.expected);
assert.equal(await page.locator('.word-card.earned').count(),5);
assert.match(await page.locator('.result-grid').innerText(),config.expected==='모두가 맛있는 급식'?/선생님 확인 완료/:/검토 중인 안/);
if(config.repair){assert.match(await page.locator('.findings').first().innerText(),/처음에는 놓친 응답/);assert.equal(await page.getByRole('heading',{name:'다음에 함께 살펴볼 것'}).count(),0);}
assert.equal(await page.locator('#finish-game').isDisabled(),true);await screenshot('result');
for(const n of [0,3,4])await tap(page.locator('[data-pledge="'+n+'"]'));
await tap(page.locator('[data-pledge="5"]'));assert.equal(await page.locator('[data-pledge][aria-pressed=true]').count(),3);
await page.locator('#pledge-edit-select').selectOption('0');await page.locator('#pledge-edit-input').fill('약속 <img src=x>');
await tap(page.locator('#finish-game'));
assert.match(await page.locator('.complete-pledges').innerText(),/<img src=x>/);
const audit=await page.evaluate(()=>({events:auditEvents,overflow:document.documentElement.scrollWidth>innerWidth,broken:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src)}));
assert.equal(audit.overflow,false);assert.deepEqual(audit.broken,[]);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
assert.deepEqual(audit.events.filter(e=>e.type==='ethicity:progress').map(e=>e.current),[1,2,3,4,5,6]);
assert.equal(audit.events.filter(e=>e.type==='ethicity:ready').length,1);
assert.deepEqual(audit.events.filter(e=>e.type==='ethicity:complete'),[{type:'ethicity:complete',gameId:'data',result:{completed:true}}]);
assert.ok(!JSON.stringify(audit.events).includes('개인정보'));if(config.name==='desktop-repaired')assert.deepEqual(await host.evaluate(()=>parentEvents),audit.events);await screenshot('complete');
await tap(page.locator('#play-again'));await page.locator('#start-game').waitFor();
results.push({name:config.name,result:config.expected,errors,external:external.length});console.log('PASS '+config.name);await context.close();
}
const context=await browser.newContext({viewport:{width:430,height:740},hasTouch:true}),page=await context.newPage();
await page.goto(url);await page.locator('#start-game').click();await page.locator('.is-typing').waitFor();
const first=await page.locator('.message-bubble').innerText();assert.ok(first.length<50);await page.locator('#next-line').tap();assert.equal(await page.locator('.is-typing').count(),0);assert.equal(await page.locator('.message').count(),1);
await page.keyboard.press('Tab');await page.keyboard.press('Space');await page.locator('#next-line').tap();
await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.is-typing').count(),0);
await page.locator('#open-settings').click();await page.locator('#typing-setting').check();await page.keyboard.press('Escape');
await page.screenshot({path:path.join(out,'typing-mobile.png')});await context.close();
fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({passed:true,results,typing:true},null,2));console.log('ALL BROWSER CHECKS PASSED');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
