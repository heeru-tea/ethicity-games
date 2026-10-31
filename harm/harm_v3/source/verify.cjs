'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const base=path.resolve(__dirname,'..'),story=require('../scenario.json');
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const block=id=>JSON.parse(html.match(new RegExp('<script id="'+id+'"[^>]*>([\\s\\S]*?)</script>'))[1]);
const config=block('game-config'),source=fs.readFileSync(path.join(__dirname,'game.js'),'utf8');
const stored=new Map();let blocked=false;
const context=vm.createContext({window:{},structuredClone,document:{getElementById:id=>({textContent:JSON.stringify(id==='game-data'?story:id==='scene-assets'?{}:config)})},localStorage:{getItem:k=>{if(blocked)throw Error('blocked');return stored.get(k)??null;},setItem:(k,v)=>{if(blocked)throw Error('blocked');stored.set(k,v);},removeItem:k=>stored.delete(k)}});
vm.runInContext(fs.readFileSync(path.join(__dirname,'story-rules.js'),'utf8')+'\n'+source.split('const params=')[0]+'\nwindow.StorageCheck={readStore,writeStore,validPlayer,nicknameError};',context);
const R=context.window.HarmRules,P=context.window.StorageCheck;
const checks=[];function test(name,fn){fn();checks.push(name);}
const decisions=a=>Object.fromEntries(a.map((choice,i)=>[i,{choice}]));
const points=[[0,2,1],[2,0,2],[2,1,0],[0,1,2],[0,2,1],[2,0,1],[1,2,1],[0,1,2]];
const pop=[[2,2,1],[0,2,2],[0,1,2],[2,1,2],[2,1,1],[2,1,0],[1,2,0],[2,1,2]];
function expected(a){const trust=a.reduce((n,c,i)=>n+points[i][c],0),fixed=a[6]!==2||(a[2]===0&&a[3]===2&&a[4]===1);return trust>=12&&a[6]===1&&a[7]===2?'A':trust>=6&&fixed?'B':'C';}
test('Approved 8 rounds, 24 choices, five hidden learning tags, two safe voice choices and formal cards',()=>{
 assert.equal(story.rounds.length,8);const tags=new Set();
 story.rounds.forEach((r,i)=>{assert.equal(r.choices.length,3);assert(r.question&&r.narrative.length&&r.clues.length);r.choices.forEach((c,j)=>{assert(c.text&&c.feedback);assert.equal(c.trust,points[i][j]);assert.equal(c.popularity,pop[i][j]);assert(c.tags.length);c.tags.forEach(t=>{assert([1,2,3,4,5].includes(t));tags.add(t);});});});
 assert.equal(tags.size,5);assert.equal(story.rounds[1].choices.filter(c=>c.kind==='safe').length,2);
 for(const e of Object.values(story.endings)){assert([...e.card].length<=40);assert(/(?:합니다|습니다|갑니다)\.$/.test(e.card));}
 assert(!JSON.stringify(story).match(/필요한다|중요한다|솔빛마을|도담/));assert(!Object.values(story.characters).includes('모아'));
});
const endings={A:0,B:0,C:0};
test('All 6561 class paths match approved thresholds; popularity does not decide endings',()=>{
 for(let n=0;n<3**8;n++){
  let x=n;const a=Array.from({length:8},()=>{const c=x%3;x=Math.floor(x/3);return c;}),d=decisions(a),s=R.summarize(d);
  assert.equal(s.ending,expected(a));assert.equal(s.trust,a.reduce((v,c,i)=>v+points[i][c],0));assert.equal(s.popularity,a.reduce((v,c,i)=>v+pop[i][c],0));
  assert.equal(JSON.stringify(R.resultOf(d)),JSON.stringify({game:'harm',completed:true,ending:expected(a),card:story.endings[expected(a)].card}));
  assert.equal(JSON.stringify(R.progress(d)),JSON.stringify(R.progress(structuredClone(d))));
  if(!s.allTechnical)assert.equal(s.ending,'C');endings[s.ending]++;
 }
 assert(Object.values(endings).every(n=>n>0));assert.equal(R.resultOf({0:{choice:0}}),null);
 assert.equal(R.resultOf({...decisions([1,2,0,2,1,0,1,2]),4:{choice:99}}),null);
});
test('Photo/voice prevention branches and repair histories never invent prior harm',()=>{
 for(let face=0;face<3;face++)for(let voice=0;voice<3;voice++)for(let repair=0;repair<3;repair++){
  const d=decisions([face,voice,repair,2,1,2]);
  const r3=R.resolveRound(2,d),r4=R.resolveRound(3,d),r7=R.resolveRound(6,d),s=R.progress(d);
  assert.equal(s.photoSpread,face===0);assert.equal(s.voiceHarm,voice===1);assert.equal(s.photoRequested,face===0&&repair===0);assert(s.paused);
  if(face!==0){assert(r3.narrative.join('').includes('게시판에 올라가지 않았다') || r3.narrative.join('').includes('게시판에도 올리지 않았다'));assert(r7.narrative.join('').includes('만들기 전에 막았다'));}
  else assert(r7.narrative.join('').includes(repair===0?'게시글을 내려 달라고 요청했다':'요청이 아직 필요하다'));
  if(voice!==1){assert(!r4.narrative.join('').includes('돈을 보냈다'));assert(r7.narrative.join('').includes('새봄이 목소리를 따라 한 소리가 만들어지지 않았다'));}
  else assert(r4.narrative.join('').includes('돈을 보냈다'));
  assert(r7.narrative.join('').includes('잠시 쉬고 있다'));
 }
});
test('R7 technical-only versus support and R8 promise preserve meaningful differences',()=>{
 const risky=[0,1,2,0,0,1];
 const only=R.progress(decisions([...risky,0]));assert(only.allTechnical);assert(!only.allResolved);assert(!only.supported);assert.equal(only.statuses.shop,'needed');
 const help=R.progress(decisions([...risky,1]));assert(help.allTechnical&&help.allResolved&&help.supported);assert(help.photoSpread&&help.voiceHarm&&help.photoRequested);
 const promise=R.progress(decisions([...risky,2,2]));assert(promise.pledge&&!promise.allTechnical);assert.equal(R.summarize(decisions([...risky,2,2])).ending,'C');
 const already=R.progress(decisions([1,0,0,2,1,0,2]));assert(already.allTechnical&&already.allResolved);assert(!already.photoSpread&&!already.voiceHarm);
});
test('Full transition lifecycle: only teacher voting is timed and decisions counted once',()=>{
 let t=100000,room=R.newRoom('teacher',t);room.members={s1:{},s2:{},s3:{}};
 room=R.transition(room,'start',t);assert.equal(room.control.duration,0);assert(!R.shouldAutoAdvance(room.control,t+3600000));
 room=R.transition(room,'next',t+=5000);const picks=[1,2,0,2,1,0,1,2];
 for(let i=0;i<8;i++){
  assert.equal(room.control.round,i);assert.equal(room.control.phase,'observe');assert.equal(room.control.duration,0);
  assert(!R.shouldAutoAdvance(room.control,t+3600000));room=R.transition(room,'next',t+=5000,90);assert.equal(room.control.duration,90000);
  room.votes??={};room.votes[i]={s1:{choice:picks[i],ballot:room.control.ballot},s2:{choice:picks[i],ballot:room.control.ballot},s3:{choice:(picks[i]+1)%3,ballot:room.control.ballot}};
  room=R.transition(room,'next',t+=1000);assert.equal(room.control.phase,'feedback');assert.equal(room.control.duration,0);assert.equal(room.decisions[i].total,3);
  assert.equal(R.transition(room,'resolve',t,0),undefined);assert(!R.shouldAutoAdvance(room.control,t+3600000));
  room=R.transition(room,'next',t+=5000);
 }
 assert.equal(room.control.phase,'ended');assert.equal(room.outcome.ending,'A');assert.equal(R.transition(room,'next',t),undefined);
});
test('No-vote retry, tied leaders, stale ballots, pause and 15-second extension',()=>{
 let room=R.newRoom('t',0);room.members={a:{},b:{}};room=R.transition(R.transition(room,'start',0),'next',1000);
 assert.equal(R.transition(room,'pause',2000),undefined);
 for(const sec of [20,40,60,90]){let r=R.transition(room,'next',10000,sec);assert.equal(r.control.duration,sec*1000);r=R.transition(r,'pause',15000);assert.equal(R.remaining(r.control,999999),sec*1000-5000);assert(!R.shouldAutoAdvance(r.control,999999));r=R.transition(r,'extend',17000);assert.equal(R.remaining(r.control,999999),sec*1000+10000);}
 room=R.transition(room,'next',10000);room.votes={0:{a:{choice:2,ballot:0}}};room=R.transition(room,'next',11000);assert.equal(room.control.phase,'empty');assert(!room.decisions);
 room=R.transition(room,'retry',12000,60);assert.equal(room.control.duration,60000);assert.equal(R.tally(room).total,0);
 room.votes[0]={a:{choice:0,ballot:room.control.ballot},b:{choice:1,ballot:room.control.ballot}};room=R.transition(room,'next',13000);assert.equal(room.control.phase,'tie');assert.equal(R.transition(room,'resolve',14000,2),undefined);room=R.transition(room,'resolve',14000,1);assert.equal(room.decisions[0].choice,1);assert.equal(room.decisions[0].tie,true);
});
test('Existing player and result contracts, invalid or blocked storage, nickname restrictions',()=>{
 assert(P.validPlayer({character:'char_03',nickname:'반짝이는 고래'}));assert(P.validPlayer({character:'char_04',nickname:'별빛'}));assert(!P.validPlayer({character:'other',nickname:'별빛'}));assert.equal(P.nicknameError('별빛'),'');assert(P.nicknameError('<img>'));assert(P.nicknameError('학교123'));
 for(const ending of ['A','B','C']){const value={game:'harm',completed:true,ending,card:story.endings[ending].card};assert(P.writeStore('ethicity.result.harm',value));assert.equal(P.readStore('ethicity.result.harm').ending,ending);}
 stored.set('bad','broken');assert.equal(P.readStore('bad'),null);blocked=true;assert(!P.writeStore('ethicity.player',{}));assert.equal(P.readStore('ethicity.player'),null);blocked=false;
});
test('Server and client ending validation agree for every path and every result letter',()=>{
 const rules=require('../database.harm-v3.rules.json');assert.deepEqual(Object.keys(rules.rules),['roomsHarmV3']);
 const r=rules.rules.roomsHarmV3.$room,exp=r.outcome.ending['.validate'];
 assert(r.control.version['.validate'].includes(story.version));
 const run=new Function('newData','return '+exp);
 for(let n=0;n<3**8;n++){let x=n;const a=Array.from({length:8},()=>{const c=x%3;x=Math.floor(x/3);return c;});
  for(const letter of ['A','B','C']){const top={child:name=>name==='decisions'?{child:i=>({child:()=>({val:()=>a[Number(i)]})})}:null},nd={val:()=>letter,parent:()=>({parent:()=>top})};assert.equal(run(nd),expected(a)===letter);}
 }
 assert(r.votes.$round.$uid['.write'].includes("auth.uid == $uid"));assert(r.votes.$round.$uid['.write'].includes("now <"));assert(r.results.$uid.ending['.validate'].includes("outcome"));
});
test('Single-file build retains original common bytes, CSS and runtime; all eight new scenes embedded',()=>{
 const pack=path.resolve(base,'../../shared/ethicity-elementary-common-v1');
 assert.deepEqual(block('game-data'),story);assert.deepEqual(block('common-manifest'),JSON.parse(fs.readFileSync(path.join(pack,'manifest.json'),'utf8')));
 for(const [p,uri] of Object.entries(block('common-files')))assert(Buffer.from(uri.split(',')[1],'base64').equals(fs.readFileSync(path.join(p.startsWith('assets/')?base:pack,p))),p);
 const css=fs.readFileSync(path.join(pack,'runtime/common.css'),'utf8').replace(/\r\n/g,'\n').replace(/url\('[^']+'\)/g,'url(ASSET)');assert(html.replace(/url\('data:[^']+'\)/g,'url(ASSET)').includes(css));
 assert(html.includes(fs.readFileSync(path.join(pack,'runtime/common.js'),'utf8').replace(/\r\n/g,'\n')));
 const scenes=block('scene-assets');assert.equal(Object.keys(scenes).length,8);for(const s of require('./scene-images.json').scenes)assert(Buffer.from(scenes[s.id].src.split(',')[1],'base64').equals(fs.readFileSync(path.join(base,'assets/scenes',s.file))));
 assert.deepEqual(config.characters.map(c=>c.id),['char_03','char_04']);
 const imports=[...source.matchAll(/import\('([^']+)'\)/g)].map(m=>m[1]);assert.equal(imports.length,3);assert(imports.every(u=>u.startsWith('https://www.gstatic.com/firebasejs/12.19.0/')));
 assert(!/private_key|service_account|BEGIN PRIVATE KEY/.test(html));
 const choices=source.slice(source.indexOf('function voteScreen'),source.indexOf('function teacherTally'));assert(!choices.includes('tagsHTML')&&!choices.includes('.tags'));
 assert(Buffer.from(block('music-asset').src.split(',')[1],'base64').equals(fs.readFileSync(path.join(base,'assets/sounds/pixel-adventure.mp3'))));
 assert(!/createOscillator/.test(html));
 new vm.Script(html.match(/<script id="game-code">([\s\S]*?)<\/script>/)[1]);
});
fs.writeFileSync(path.join(base,'verification.json'),JSON.stringify({date:new Date().toISOString(),passed:checks.length,paths:6561,endings,checks},null,2)+'\n');
console.log(JSON.stringify({passed:checks.length,paths:6561,endings,checks},null,2));
