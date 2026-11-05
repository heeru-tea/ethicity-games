// Opt-in live Firebase classroom acceptance check. Creates and removes one temporary room and test users.
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const base=path.resolve(__dirname,'..'),checks=[],errors=[],pages=[];
if(process.env.HARM_V4_LIVE_TEST!=='1')throw Error('Set HARM_V4_LIVE_TEST=1 to create temporary test data on the deployed service.');
(async()=>{const url='https://ethicity-privacy-20261011.web.app/harm/harm_v4/';const browser=await chromium.launch({channel:'msedge',headless:true});
try{
async function player(){const c=await browser.newContext({viewport:{width:1180,height:820},acceptDownloads:true});const p=await c.newPage();p.setDefaultTimeout(45000);p.on('pageerror',e=>errors.push(e.message));pages.push(p);return p;}
const teacher=await player();await teacher.goto(url+'?mode=teacher');await teacher.locator('[data-action=create-room]:enabled').click();await teacher.locator('.invite-url input').waitFor();const invite=await teacher.locator('.invite-url input').inputValue();const id=new URL(invite).searchParams.get('room');assert.equal(await teacher.locator('[data-qr]').count(),1);console.log('LIVE_ROOM_CREATED');checks.push('Create room immediately shows QR and URL, without a room-list query');
const students=[];for(let i=0;i<2;i++){const p=await player();await p.goto(invite);await p.locator('[data-action=character][data-index="'+i+'"]').click();await p.locator('#player-form [type=submit]').click();await p.locator('[data-action=join]').click();await p.locator('.student-lobby').waitFor();students.push(p);}
await teacher.waitForFunction(()=>Object.keys(S.room.members||{}).length===2);await teacher.locator('[data-action=start]').click();
async function denied(page,operation){const result=await page.evaluate(async operation=>{const {D,db}=S.cloud,p=ROOM_ROOT+'/'+S.roomId;try{if(operation==='room-read')await D.get(D.ref(db,p));else if(operation==='control-write')await D.set(D.ref(db,p+'/control/revision'),99999);else if(operation==='other-vote-read'){await D.get(D.ref(db,p+'/votes/0/not-this-student'));}else if(operation==='fake-outcome')await D.set(D.ref(db,p+'/outcome'),{ending:'A'});else if(operation==='closed-vote')await D.set(D.ref(db,p+'/votes/'+S.control.round+'/'+S.uid),{choice:0,ballot:S.control.ballot,at:Date.now()+S.offset});return 'allowed';}catch(e){return e.code||e.message;}},operation);assert.match(result,/permission.denied/i,operation+' must be denied');}
for(const operation of ['room-read','control-write','other-vote-read','fake-outcome'])await denied(students[0],operation);
checks.push('Live rules reject student whole-room reads, teacher-control writes, another student vote reads, and forged outcomes');
const picks=[1,2,0,2,1,0,1,2];
for(let r=0;r<8;r++){console.log('ROUND',r+1);
 let guard=0;while(await teacher.evaluate(()=>S.control.phase)!=='vote'){assert(guard++<60);await teacher.locator('.teacher-toolbar [data-action=next]').click();await teacher.waitForFunction(()=>!S.busy);}
 for(const p of students)await p.waitForFunction(ri=>S.control.phase==='vote'&&S.control.round===ri,r);
 assert.equal(await students[0].locator('[data-speech]').count(),1);
 for(let i=0;i<2;i++){await students[i].locator('[data-action=choice][data-index="'+(i===0?picks[r]:(picks[r]+1)%3)+'"]').click();await students[i].locator('[data-action=submit]').click();await students[i].waitForFunction(()=>!S.sending&&!!S.ownVotes[S.control.round]);}
 await teacher.waitForFunction(()=>tally(S.room).total===2);
 if(r===0){const before=await students[0].evaluate(()=>({uid:S.uid,choice:S.ownVotes[0]?.choice,ballot:S.ownVotes[0]?.ballot}));await students[0].reload();await students[0].locator('[data-action=join]').click();await students[0].waitForFunction(()=>S.votesLoaded===255&&S.control.phase==='vote');assert.deepEqual(await students[0].evaluate(()=>({uid:S.uid,choice:S.ownVotes[0]?.choice,ballot:S.ownVotes[0]?.ballot})),before);await teacher.reload();await teacher.waitForFunction(()=>S.control?.phase==='vote');assert.equal(await teacher.evaluate(()=>S.roomId),id);checks.push('Student reload restores identity and vote; teacher URL restores active control screen');await teacher.locator('[data-action=invite]').click();assert.equal(await teacher.locator('.invite-url input').inputValue(),invite);await teacher.locator('[data-action=close-modal]').click();}
 await teacher.locator('.teacher-toolbar [data-action=next]').click();await teacher.waitForFunction(()=>S.control.phase==='tie');await teacher.locator('[data-action=resolve][data-index="'+picks[r]+'"]').click();await teacher.waitForFunction(()=>S.control.phase==='feedback');for(const p of students)await p.waitForFunction(()=>S.control.phase==='feedback');
 if(r===0){await denied(students[0],'closed-vote');checks.push('Live rules reject vote updates after teacher closes voting');}
 if(r<7){while(await teacher.evaluate(()=>S.control.phase)==='feedback'){await teacher.locator('.teacher-toolbar [data-action=next]').click();await teacher.waitForFunction(()=>!S.busy);}}
}
while(await teacher.evaluate(()=>S.control.phase)==='feedback'){await teacher.locator('.teacher-toolbar [data-action=next]').click();await teacher.waitForFunction(()=>!S.busy);}
for(const p of students){await p.waitForFunction(()=>S.control.phase==='ended'&&S.outcome);assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('ethicity.result.harm')).ending),'A');}
await students[1].locator('[data-action=ending-learning]').click();await students[1].locator('[data-action=learn][data-index="3"]').click();const selected=await students[1].evaluate(()=>S.personalLearning);await students[1].reload();await students[1].locator('[data-action=join]').click();await students[1].waitForFunction(()=>S.control?.phase==='ended'&&S.votesLoaded===255);await students[1].locator('[data-action=ending-learning]').click();assert.deepEqual(await students[1].evaluate(()=>S.personalLearning),selected);
await teacher.waitForFunction(()=>Object.keys(S.room.results||{}).length===2);
checks.push('Both student completion records accepted by production rules');
checks.push('Three independent devices complete all eight rounds, with tied votes, class ending, individual votes, and locally retained learning selections');
const downloadPromise=students[1].waitForEvent('download');await students[1].locator('[data-action=download-report]').click();const download=await downloadPromise;const output=path.join(base,'qa/live-report.png');await download.saveAs(output);const png=fs.readFileSync(output);assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),1400);checks.push('Production personal report PNG downloaded, width 1400, height '+png.readUInt32BE(20));
await teacher.screenshot({path:path.join(base,'qa/live-teacher-ended.png')});
assert.deepEqual(errors,[]);fs.writeFileSync(path.join(base,'verification-live-v4.json'),JSON.stringify({verifiedAt:new Date().toISOString(),url,checks,transport:'Production Firebase Authentication, Realtime Database and Hosting; no transport mock',errors},null,2)+'\n');console.log(JSON.stringify({checks,errors},null,2));
}catch(e){for(let i=0;i<pages.length;i++){console.error('STATE',i,await pages[i].evaluate(()=>({role:S.role,phase:S.control?.phase,round:S.control?.round,error:S.error,busy:S.busy})));await pages[i].screenshot({path:path.join(base,'qa/live-failure-'+i+'.png')});}throw e;}finally{
for(const p of pages){try{await p.evaluate(async()=>{if(S.role==='teacher'&&S.roomId&&S.cloud){const ref=S.cloud.D.ref(S.cloud.db,ROOM_ROOT+'/'+S.roomId);const snap=await S.cloud.D.get(ref);if(snap.val()?.owner===S.uid)await S.cloud.D.set(ref,null);}});}catch(e){console.error('Room cleanup failed:',e.message);}}
for(const p of pages){try{await p.evaluate(async()=>{if(S.cloud?.auth.currentUser)await S.cloud.A.deleteUser(S.cloud.auth.currentUser);});}catch(e){console.error('Test account cleanup failed:',e.message);}}
await browser.close();}

})().catch(e=>{console.error(e);process.exitCode=1;});
