// Deterministic client/state and RTDB expression tests. No production data is written.
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const base=path.resolve(__dirname,'..'),story=require('../scenario.json'),rules=require('../database.harm-v5.rules.json');
const context=vm.createContext({window:{},structuredClone,document:{getElementById:id=>({textContent:JSON.stringify(id==='game-data'?story:{characters:[]})})}});
vm.runInContext(fs.readFileSync(path.join(__dirname,'screens.js'),'utf8')+'\n'+fs.readFileSync(path.join(__dirname,'story-rules.js'),'utf8')+'\n'+fs.readFileSync(path.join(__dirname,'game.js'),'utf8').split('const params=')[0],context);
const R=context.window.HarmRules,checks=[];
let room=R.newRoom('teacher',1000);room.members={a:{character:'char_03'},b:{character:'char_04'}};room=R.transition(room,'start',1001);
let ticks=0;const next=()=>{room=R.transition(room,'next',1002+ticks++);assert(room);};
while(room.control.phase==='intro')next();
const picks=[1,2,0,2,1,0,1,2];
for(let i=0;i<8;i++){
 assert.equal(room.control.round,i);assert.equal(room.control.phase,'observe');assert.equal(room.control.accepting,true);
 while(room.control.phase==='observe')next();assert.equal(room.control.phase,'clues');while(room.control.phase==='clues')next();assert.equal(room.control.phase,'vote');
 assert.equal(room.control.duration,0);assert.equal(R.shouldAutoAdvance(room.control,Date.now()+1e12),false);
 room.votes??={};room.votes[i]={a:{choice:0,ballot:room.control.ballot-1}};assert.equal(R.tally(room).total,0);
 if(i===0){next();assert.equal(room.control.phase,'empty');room=R.transition(room,'retry',2000);}
 const ballot=room.control.ballot;room.votes[i]={a:{choice:picks[i],ballot},b:{choice:(picks[i]+1)%3,ballot}};
 next();assert.equal(room.control.phase,'tie');assert.equal(R.transition(room,'resolve',2000,(picks[i]+2)%3),undefined);room=R.transition(room,'resolve',2001,picks[i]);assert.equal(room.control.phase,'feedback');
 const settled=JSON.stringify(room.decisions[i]);while(room.control.phase==='feedback')next();assert.equal(JSON.stringify(room.decisions[i]),settled);
}
assert.equal(room.control.phase,'ended');assert.equal(room.outcome.ending,'A');assert.equal(R.transition(room,'next',99999),undefined);checks.push('8-round manual lifecycle, one shared story cursor, late join, stale ballots, empty retry, tied leaders, immutable decisions');
class Snapshot{constructor(value,root=value,parts=[]){this.value=value;this.root=root;this.parts=parts;}val(){return this.value??null;}exists(){return this.value!=null;}child(p){const parts=[...this.parts,...String(p).split('/')];let v=this.root;for(const k of parts)v=v?.[k];return new Snapshot(v,this.root,parts);}parent(){const parts=this.parts.slice(0,-1);let v=this.root;for(const k of parts)v=v?.[k];return new Snapshot(v,this.root,parts);}isNumber(){return typeof this.value==='number';}isString(){return typeof this.value==='string';}isBoolean(){return typeof this.value==='boolean';}hasChildren(a){return a.every(k=>this.value?.[k]!=null);}}
const dbRoom=rules.rules.roomsHarmV5.$room;
function run(exp,args){if(typeof exp==='boolean')return exp;return new Function(...Object.keys(args),'return ('+exp+')')(...Object.values(args));}
const roomId='a'.repeat(32);const db={roomsHarmV5:{[roomId]:room}};let root=new Snapshot(db),data=root.child('roomsHarmV5/'+roomId);const owner={uid:'teacher'},student={uid:'a'},other={uid:'other'};
assert.equal(rules.rules.roomsHarmV5['.read'],false);
for(const auth of [student,other,null]){assert.equal(run(dbRoom['.write'],{auth,data,newData:data}),false);assert.equal(run(dbRoom['.read'],{auth,data}),false);}
assert.equal(run(dbRoom['.write'],{auth:owner,data,newData:data}),true);
const ownRead=dbRoom.votes.$round.$uid['.read'];assert.equal(run(ownRead,{auth:student,$uid:'a'}),true);assert.equal(run(ownRead,{auth:student,$uid:'b'}),false);
room.control.phase='vote';room.control.round=7;room.control.startedAt=1;room.control.duration=0;
const voteWrite=dbRoom.votes.$round.$uid['.write'];const args={auth:student,root,$room:roomId,$round:'7',$uid:'a',newData:new Snapshot({choice:2,ballot:room.control.ballot,at:999999999999}),now:999999999999};
assert.equal(run(voteWrite,args),true);assert.equal(run(voteWrite,{...args,$uid:'b'}),false);room.control.phase='feedback';assert.equal(run(voteWrite,args),false);
checks.push('RTDB expressions: owner-only control, no room list reads, own-vote privacy, no vote deadline, closed voting rejects writes');
for(let code=0;code<6561;code++){let n=code,d={};for(let i=0;i<8;i++){d[i]={choice:n%3};n=Math.floor(n/3);}const expected=R.resultOf(d);for(const ending of ['A','B','C']){const value={decisions:d,outcome:{ending}};assert.equal(run(dbRoom.outcome.ending['.validate'],{newData:new Snapshot(value).child('outcome/ending')}),ending===expected.ending);}}
checks.push('RTDB ending expression matches client for all 6561 class paths and all three ending claims');
assert(dbRoom.control.step);assert(dbRoom.control.phase['.validate'].includes('clues'));assert(!dbRoom.control.version['.validate'].includes('v3'));assert(!voteWrite.includes('now <'));
fs.writeFileSync(path.join(base,'verification-rules.json'),JSON.stringify({checks,limit:'Expression tests; not an emulator or a live Firebase deployment.'},null,2)+'\n');console.log(JSON.stringify({checks},null,2));
