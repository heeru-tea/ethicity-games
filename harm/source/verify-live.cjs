// 공개 설정으로 일회용 가상 계정·수업만 검사합니다. 실제 학급 자료는 읽지 않습니다.
// 실행: node harm/source/verify-live.cjs (먼저 harm 접근 규칙이 서버에 있어야 합니다.)
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const base=path.join(__dirname,'..'),html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const config=JSON.parse(html.match(/<script id="game-config"[^>]*>([\s\S]*?)<\/script>/)[1]);
const story=JSON.parse(fs.readFileSync(path.join(base,'scenario.json'),'utf8'));
const ctx=vm.createContext({window:{},structuredClone,document:{getElementById:id=>({textContent:JSON.stringify(id==='game-data'?story:config)})}});
vm.runInContext(fs.readFileSync(path.join(__dirname,'game.js'),'utf8').split('const params=')[0],ctx);
const R=ctx.window.HarmRules,users=[],rooms=[],checks=[];let streamController;
const authURL=action=>'https://identitytoolkit.googleapis.com/v1/accounts:'+action+'?key='+config.firebase.apiKey;
async function signup(){const res=await fetch(authURL('signUp'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({returnSecureToken:true}),signal:AbortSignal.timeout(20000)});const value=await res.json();assert(res.ok,'Anonymous sign in failed');users.push(value);return value;}
function url(p,u){const out=new URL(p+'.json',config.firebase.databaseURL+'/');if(u)out.searchParams.set('auth',u.idToken);return out;}
async function request(method,p,u,body,headers={}){const res=await fetch(url(p,u),{method,headers:{'Content-Type':'application/json',...headers},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(20000)});return {status:res.status,value:await res.json(),etag:res.headers.get('etag')};}
function check(name,res,allowed=true){assert.equal(res.status===200,allowed,name+' HTTP '+res.status+' '+JSON.stringify(res.value));checks.push(name);return res.value;}
async function step(root,teacher,action,choice){const before=await request('GET',root,teacher,undefined,{'X-Firebase-ETag':'true'});assert.equal(before.status,200);const next=R.transition(before.value,action,Date.now(),choice);assert(next,'Valid transition '+action);const result=await request('PUT',root,teacher,next,{'if-match':before.etag});assert.equal(result.status,200,'Class transition '+action+' '+JSON.stringify(result.value));return result.value;}
async function run(){let teacher;
 try{
  teacher=await signup();const a=await signup(),b=await signup(),stranger=await signup();
  const id=crypto.randomUUID().replaceAll('-',''),root='roomsHarm/'+id;rooms.push(root);
  check('Unauthenticated reads denied',await request('GET',root,null),false);
  check('Teacher creates own harm room',await request('PUT',root,teacher,R.newRoom(teacher.localId,Date.now())));
  check('Student cannot read entire room',await request('GET',root,a),false);
  check('Open room control readable from invitation',await request('GET',root+'/control',a));
  for(const [u,name] of [[a,'별고래'],[b,'달빛']])check('Student joins with fictional nickname',await request('PUT',root+'/members/'+u.localId,u,{nickname:name,character:'char_03',joinedAt:Date.now()}));
  check('No extra personal data fields',await request('PATCH',root+'/members/'+a.localId,a,{school:'가상학교'}),false);
  check('Students cannot read each other membership',await request('GET',root+'/members/'+a.localId,b),false);
  check('Student cannot advance teacher control',await request('PATCH',root+'/control',a,{phase:'vote'}),false);
  check('Outsider cannot take ownership',await request('PUT',root+'/owner',stranger,stranger.localId),false);
  check('Unfiltered classroom listing denied',await request('GET','roomsHarm',a),false);
  const listURL=url('roomsHarm',teacher);listURL.searchParams.set('orderBy','"owner"');listURL.searchParams.set('equalTo',JSON.stringify(teacher.localId));const list=await fetch(listURL);assert.equal(list.status,200);assert((await list.json())[id]);checks.push('Owner query returns own test room');
  let state=await step(root,teacher,'start');
  check('Late new member rejected',await request('PUT',root+'/members/'+stranger.localId,stranger,{nickname:'새별',character:'char_04',joinedAt:Date.now()}),false);
  check('Existing student can reload closed admission control',await request('GET',root+'/control',a));
  check('Outsider cannot read closed admission control',await request('GET',root+'/control',stranger),false);
  state=await step(root,teacher,'next');state=await step(root,teacher,'next');
  state=await step(root,teacher,'next');assert.equal(state.control.phase,'empty');checks.push('Zero replies wait for revote');
  state=await step(root,teacher,'retry');
  const vote=(u,choice,ballot=state.control.ballot)=>request('PUT',root+'/votes/'+state.control.round+'/'+u.localId,u,{choice,ballot,at:Date.now()});
  check('Old ballot rejected',await vote(a,0,state.control.ballot-1),false);
  check('Out of range choice rejected',await vote(a,8),false);
  state=await step(root,teacher,'pause');check('Paused vote rejected',await vote(a,0),false);state=await step(root,teacher,'pause');
  streamController=new AbortController();const stream=await fetch(url(root+'/votes/0',teacher),{headers:{Accept:'text/event-stream'},signal:streamController.signal});assert.equal(stream.status,200);
  let resolveEvent;const event=new Promise(resolve=>resolveEvent=resolve);const reading=(async()=>{let text='';for await(const chunk of stream.body){text+=Buffer.from(chunk).toString();if(text.includes(a.localId)){resolveEvent(true);break;}}})().catch(()=>{});
  check('Student vote accepted',await vote(a,0));check('Student can change own vote before deadline',await vote(a,1));check('Second student votes',await vote(b,0));
  let timer;assert(await Promise.race([event,new Promise(resolve=>timer=setTimeout(()=>resolve(false),15000))]),'Realtime vote arrives');clearTimeout(timer);streamController.abort();await reading;checks.push('Teacher receives real time vote event');
  check('Peer vote is private',await request('GET',root+'/votes/0/'+a.localId,b),false);
  check('Peer vote cannot be changed',await request('PUT',root+'/votes/0/'+a.localId,b,{choice:2,ballot:state.control.ballot,at:Date.now()}),false);
  state=await step(root,teacher,'next');assert.equal(state.control.phase,'tie');check('Votes rejected after deadline',await vote(a,2),false);
  state=await step(root,teacher,'resolve',1);assert.equal(state.decisions[0].tie,true);assert.equal(state.decisions[0].total,2);checks.push('Teacher resolves tied leaders into common result');
  check('Student cannot forge early completion',await request('PUT',root+'/results/'+a.localId,a,{game:'harm',completed:true,ending:'A',card:story.endings.A.card}),false);
  state=await step(root,teacher,'next');
  for(let i=1;i<8;i++){
   assert.equal(state.control.round,i);state=await step(root,teacher,'next');const good=story.rounds[i].choices.findIndex(c=>c.protect);
   check('Round '+(i+1)+' vote accepted',await vote(a,good));state=await step(root,teacher,'next');assert.equal(state.decisions[i].choice,good);state=await step(root,teacher,'next');
  }
  assert.equal(state.control.phase,'ended');assert.equal(state.outcome.ending,'A');assert.equal(state.control.duration,60000);checks.push('Eight live rounds produce A with 60 second recap');
  const wrong={...state.outcome,ending:'C',card:story.endings.C.card};check('Forged classroom ending rejected',await request('PUT',root+'/outcome',teacher,wrong),false);
  for(const u of [a,b]){check('Each student stores same class result',await request('PUT',root+'/results/'+u.localId,u,state.outcome));const result=await request('GET',root+'/results/'+u.localId,teacher);assert.deepEqual(result.value,state.outcome);}
  check('Student cannot store arbitrary card',await request('PUT',root+'/results/'+a.localId,a,{...state.outcome,card:'임의 카드'}),false);
  check('Past round votes stay closed',await vote(a,0),false);
  check('Teacher recap selection synchronized',await request('PUT',root+'/recap',teacher,5));assert.equal((await request('GET',root+'/recap',b)).value,5);
  check('Student cannot rewrite class recap',await request('PUT',root+'/recap',a,1),false);
  for(const expected of ['B','C']){
   const p='roomsHarm/'+crypto.randomUUID().replaceAll('-','');rooms.push(p);let room=R.newRoom(teacher.localId,Date.now());room.members={[a.localId]:{nickname:'별고래',character:'char_03',joinedAt:Date.now()}};
   check('Additional isolated test room '+expected,await request('PUT',p,teacher,room));room=await step(p,teacher,'start');room=await step(p,teacher,'next');
   for(let i=0;i<8;i++){room=await step(p,teacher,'next');const good=story.rounds[i].choices.findIndex(c=>c.protect),choice=expected==='B'&&i>=4&&i<7?good:(good+1)%3;assert.equal((await request('PUT',p+'/votes/'+i+'/'+a.localId,a,{choice,ballot:room.control.ballot,at:Date.now()})).status,200);room=await step(p,teacher,'next');room=await step(p,teacher,'next');}
   assert.equal(room.outcome.ending,expected);check('Ending '+expected+' also stores completion',await request('PUT',p+'/results/'+a.localId,a,room.outcome));
  }
 }finally{
  streamController?.abort();
  if(teacher)for(const p of rooms)assert.equal((await request('DELETE',p,teacher)).status,200,'Disposable room cleanup');
  for(const u of users){const res=await fetch(authURL('delete'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:u.idToken}),signal:AbortSignal.timeout(20000)});assert(res.ok,'Disposable anonymous account cleanup');}
 }
 const report={date:new Date().toISOString(),passed:checks.length,checks,testDataCleaned:true};fs.writeFileSync(path.join(base,'verification-live.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}
run().catch(e=>{console.error(JSON.stringify({error:e.message}));process.exitCode=1;});
