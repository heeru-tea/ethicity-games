// 일회용 가상 교사·학생만 사용하고 테스트가 끝나면 방과 익명 계정을 삭제합니다.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base=path.join(__dirname,'..'),story=JSON.parse(fs.readFileSync(path.resolve(base,'../scenario.json'),'utf8'));
const output=process.env.HARM_SCREENSHOTS||path.resolve(base,'../../../..');
(async()=>{
 const server=require('node:http').createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});fs.createReadStream(path.join(base,'index.html')).pipe(res);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url=process.env.HARM_TEST_URL||'http://127.0.0.1:'+server.address().port+'/harm/v2/';
 let browser,teacher,roomId,config;const pages=[],users=[],checks=[],errors=[];let cleanup=true;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});
  async function openPlayer(player){const context=await browser.newContext({viewport:{width:1280,height:900}});if(player)await context.addInitScript(p=>localStorage.setItem('ethicity.player',JSON.stringify(p)),player);const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(45000);pages.push(page);return page;}
  teacher=await openPlayer();await teacher.goto(url+'?mode=teacher');
  await teacher.locator('[data-action="create-room"]:enabled').waitFor();
  config=await teacher.evaluate(()=>JSON.parse(document.getElementById('game-config').textContent).firebase);
  await teacher.locator('[data-action="create-room"]').click();await teacher.locator('.room-link').waitFor();
  const invitation=await teacher.locator('.room-link').innerText();roomId=new URL(invitation).searchParams.get('room');
  const students=[];
  for(const player of [{character:'char_03',nickname:'별고래'},{character:'char_04',nickname:'달빛'}]){
   const page=await openPlayer(player);await page.goto(invitation);await page.locator('[data-action="join"]').click();await page.locator('.wait').waitFor();students.push(page);
  }
  await teacher.waitForFunction(()=>document.querySelector('.roster')?.textContent.includes('달빛'));
  await teacher.screenshot({path:path.join(output,'harm-v2-classroom-lobby.png'),fullPage:true});
  checks.push('Teacher opens an isolated room; two independent student devices join with legacy character IDs');
  await teacher.locator('[data-action="start"]').click();await teacher.locator('[data-action="next"]').click();
  for(let round=0;round<8;round++){
   for(const page of students)await page.waitForFunction(id=>document.querySelector('.round-scene')?.dataset.scene===String(id),round+1);
   await teacher.locator('[data-action="start-vote"][data-index="90"]').click();
   if(round===0){
    await teacher.locator('[data-action="pause"]').click();
    for(const page of students)await page.locator('[data-action="choice"]:disabled').first().waitFor();
    await teacher.locator('[data-action="extend"]').click();await teacher.locator('[data-action="pause"]').click();
   }
   const good=story.rounds[round].choices.findIndex(c=>c.protect);
   for(let index=0;index<students.length;index++){
    const page=students[index],choice=round===0&&index===1?(good+1)%3:good;
    await page.locator(`[data-action="choice"][data-index="${choice}"]:enabled`).click();await page.locator('[data-action="submit"]').click();
    await page.waitForFunction(()=>document.getElementById('vote-status')?.textContent.includes('선택을 확인했습니다'));
    assert.equal(await page.locator('[role="timer"]').count(),0);
    assert.equal(await page.locator('.bars').count(),0);
   }
   await teacher.waitForFunction(()=>Array.from(document.querySelectorAll('h2')).some(e=>e.textContent==='2명 응답 / 2명 입장'));
   await teacher.locator('[data-action="next"]').click();
   if(round===0){await teacher.locator(`[data-action="resolve"][data-index="${good}"]`).click();checks.push('Live pause/resume, extension, private ballots and teacher tiebreak work');}
   for(const page of [teacher,...students])await page.locator('.feedback').waitFor();
   if(round===3){
    await teacher.screenshot({path:path.join(output,'harm-v2-teacher-round4.png'),fullPage:true});
    await students[0].screenshot({path:path.join(output,'harm-v2-student-round4.png'),fullPage:true});
   }
   await teacher.locator('[data-action="next"]').click();
  }
  for(const page of students){
   await page.waitForFunction(()=>document.getElementById('cloud-status')?.textContent.includes('완료를 확인했습니다'));
   assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('ethicity.result.harm'))),{game:'harm',completed:true,ending:'A',card:story.endings.A.card});
  }
  assert.equal(await teacher.evaluate(()=>localStorage.getItem('ethicity.result.harm')),null);
  await teacher.locator('[data-action="recap"]').first().click();
  for(const page of students)await page.waitForFunction(()=>document.querySelector('[data-action="recap"]').getAttribute('aria-pressed')==='true');
  await students[0].screenshot({path:path.join(output,'harm-v2-student-ending.png'),fullPage:true});
  checks.push('All eight live rounds share one ending; both students store completion and receive teacher recap');
  assert.deepEqual(errors,[]);
 }finally{
  // 자기 시험 계정의 토큰만 메모리에서 읽고, 출력하거나 파일에 기록하지 않습니다.
  for(const page of pages){try{const user=await page.evaluate(async()=>S.cloud?.auth.currentUser?{token:await S.cloud.auth.currentUser.getIdToken(),uid:S.cloud.auth.currentUser.uid}:null);if(user)users.push({page,...user});}catch{cleanup=false;}}
  if(roomId&&config){
   const own=users.find(u=>u.page===teacher);if(own){try{const url=new URL('roomsHarm/'+roomId+'.json',config.databaseURL+'/');url.searchParams.set('auth',own.token);const r=await fetch(url,{method:'DELETE',signal:AbortSignal.timeout(20000)});assert(r.ok,'Disposable room cleanup failed');}catch(e){cleanup=false;console.error(e.message);}}
   else cleanup=false;
  }
  if(config)for(const user of users){try{const r=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:delete?key='+config.apiKey,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:user.token}),signal:AbortSignal.timeout(20000)});assert(r.ok,'Disposable account cleanup failed');}catch(e){cleanup=false;console.error(e.message);}}
  if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));
 }
 assert(cleanup,'Disposable test data must be cleaned');
 const report={date:new Date().toISOString(),passed:checks.length,checks,testDataCleaned:cleanup,errors};
 fs.writeFileSync(path.join(base,'verification-classroom.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
