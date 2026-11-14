// Role clarity and choice fidelity. These are UI/content assertions, not pupil comprehension measurements.
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'../.qa/node_modules/playwright-core');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{for(const viewport of [{width:1024,height:768},{width:768,height:1024}]){
  const context=await browser.newContext({viewport,hasTouch:true}),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const act=name=>page.locator('[data-action="'+name+'"]').first().click();
  await page.goto((process.env.BASE_URL||'http://127.0.0.1:8774')+'/accountability/');
  const original=await page.evaluate(()=>JSON.stringify({END_ACTIONS,HELP_PLANS}));
  await act('start');await page.locator('[data-action^="perspective:"]').nth(1).click();await act('question-next');await act('compact-source');await act('primary');
  await page.waitForFunction(()=>document.querySelector('#current-task-text')?.textContent.includes('도착'),{},{timeout:60000});await act('primary');await act('mark:0');await act('record');
  await act('decision');await act('judgment-kind:deferred');await page.locator('#unknown').fill('누가 안내를 어떻게 이해했는지 더 물어보고 싶어요.');await act('commit-step:2');
  const expected=[[3,'로봇을 쓴 학생','로봇을 켜기 전에 바닥'],[1,'교실을 관리한 사람','청소할 때 안전하게 둘 곳'],[2,'로봇을 만든 곳','로봇이 놓치는 물건']];
  for(const [id,role,action]of expected){const text=await page.locator('[data-action="plan:'+id+'"]').innerText();assert(text.includes(role)&&text.includes(action),'missing role/action '+id);await act('plan:'+id);}
  assert((await page.locator('.planLimit').innerText()).includes('잘못을 똑같이 나누는 것이 아니에요'),'equal-blame warning');
  assert((await page.locator('[data-action="plan:0"]').innerText()).includes('원하는 도움'),'victim agency');
  const fit=await page.evaluate(()=>({noHorizontal:document.documentElement.scrollWidth<=innerWidth,body:document.querySelector('.dialogBody').scrollHeight<=document.querySelector('.dialogBody').clientHeight+2,button:document.querySelector('.dialogActions .primary').getBoundingClientRect().bottom<=innerHeight}));
  assert(fit.noHorizontal&&fit.body&&fit.button,'plan viewport fit');await page.screenshot({path:'.qa/roles-'+viewport.width+'.png'});
  await page.reload();for(const[id]of expected)assert.equal(await page.locator('[data-action="plan:'+id+'"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.evaluate(()=>JSON.stringify({END_ACTIONS,HELP_PLANS})),original,'original action data changed');
  assert.deepEqual(await page.evaluate(()=>state.plans),[3,1,2]);
  await act('simple-finish');const summary=await page.locator('.simpleSummary').innerText();for(const[,role,action]of expected)assert(summary.includes(role)&&summary.includes(action),'summary lost distinction');
  assert(summary.includes('이것은 계획이에요'),'false completed repair');assert(await page.evaluate(()=>judgments.at(-1).deferred&&endState().letters.length===0),'judgment deferral or optional letter changed');
  await page.screenshot({path:'.qa/roles-summary-'+viewport.width+'.png'});assert.deepEqual(errors,[]);console.log('PASS roles/content/choice fidelity and layout',viewport);await context.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});