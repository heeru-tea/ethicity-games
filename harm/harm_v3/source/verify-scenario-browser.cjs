'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const base=path.resolve(__dirname,'..'),out=process.env.HARM_SCREENSHOTS||path.join(base,'qa'),story=require('../scenario.json');
const {createStoryRules}=require('./story-rules.js'),R=createStoryRules(story),errors=[];
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const server=require('node:http').createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});fs.createReadStream(path.join(base,'index.html')).pipe(res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900},acceptDownloads:true});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/');
  await page.waitForFunction(()=>commonLoaded&&document.fonts.check('16px Ethicity'));
  async function show(round,picks,phase='vote'){
   await page.evaluate(({round,picks,phase})=>{
    const room=HarmRules.newRoom('demo',Date.now());room.members={demo:{nickname:'별고래',character:'char_04',joinedAt:Date.now()}};
    room.decisions=Object.fromEntries(picks.map((choice,i)=>[i,{choice,counts:{0:1,1:0,2:0},total:1,tie:false,at:Date.now()}]));
    room.control={...room.control,round,phase,accepting:false,startedAt:Date.now(),duration:90000};
    S.role='demo';S.uid='demo';S.player={nickname:'별고래',character:'char_04'};S.roomId='copy-'+picks.join('')+'-'+round;S.ownVotes={};S.saveKey='';
    setRoom(room,true);finishTyping();
   },{round,picks,phase});
  }
  for(const round of [2,3])for(let branch=0;branch<3;branch++)for(let choice=0;choice<3;choice++){
   const picks=round===2?[branch,0]:[1,branch,0];
   await show(round,picks);
   const expected=R.resolveRound(round,Object.fromEntries(picks.map((choice,i)=>[i,{choice}])));
   const buttons=page.locator('.choice-screen [data-action="choice"]');
   for(let i=0;i<3;i++)assert((await buttons.nth(i).innerText()).includes(expected.choices[i].text));
   if(round===2&&choice===0){await page.locator('.story-chapter').screenshot({path:path.join(out,'photo-branch-'+branch+'.png')});}
   await buttons.nth(choice).click();await page.locator('[data-action="submit"]').click();await page.locator('[data-action="next"]').click();await page.evaluate(()=>finishTyping());
   assert.equal(await page.locator('.feedback p').innerText(),expected.choices[choice].feedback);
   if(expected.choices[choice].reply)assert((await page.locator('.harm-gamegrid').innerText()).includes(expected.choices[choice].reply));
  }
  await show(4,[1,0,0,2],'observe');assert((await page.locator('.story-chapter').innerText()).includes('A기업'));
  await show(5,[1,0,0,2,1],'observe');assert((await page.locator('.story-chapter').innerText()).includes('반짝사진관 사장님'));
  for(const width of [760,430]){
   await page.setViewportSize({width,height:900});await show(2,[2,0]);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   for(const button of await page.locator('.choice-screen [data-action="choice"]').all()){assert((await button.boundingBox()).height>=48);}
   await page.screenshot({path:path.join(out,'photo-mobile-'+width+'.png'),fullPage:true});
  }
  const paths={A:[1,2,0,2,1,0,1,2],B:[0,1,1,1,2,2,0,1],C:[0,1,2,0,0,1,2,2]};
  for(const [ending,picks] of Object.entries(paths)){
   await page.setViewportSize({width:1280,height:900});await show(7,picks,'ended');
   await page.evaluate(()=>{S.outcome=HarmRules.resultOf(S.decisions);S.room.outcome=S.outcome;render();finishTyping();});
   assert.equal(await page.locator('.learning-card blockquote').innerText(),story.endings[ending].card);
   const download=page.waitForEvent('download');await page.locator('[data-action="card"]').click();await(await download).saveAs(path.join(out,'pledge-'+ending+'.png'));
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
 const report={date:new Date().toISOString(),photoAndVoiceChoiceResults:18,mobileWidths:[760,430],exportedCards:['A','B','C'],errors};
 fs.writeFileSync(path.join(base,'verification-scenario-browser.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
