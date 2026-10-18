// Node.js 기본 기능만 사용하는 판정·저장·시나리오 검사입니다.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const base=path.join(__dirname,'..'),story=JSON.parse(fs.readFileSync(path.join(base,'scenario.json'),'utf8'));
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const config=JSON.parse(html.match(/<script id="game-config"[^>]*>([\s\S]*?)<\/script>/)[1]);
const source=fs.readFileSync(path.join(__dirname,'game.js'),'utf8');
const stored=new Map();let blocked=false;
const context=vm.createContext({window:{},structuredClone,document:{getElementById:id=>({textContent:JSON.stringify(id==='game-data'?story:config)})},localStorage:{getItem:k=>{if(blocked)throw Error('blocked');return stored.get(k)??null;},setItem:(k,v)=>{if(blocked)throw Error('blocked');stored.set(k,v);},removeItem:k=>stored.delete(k)}});
vm.runInContext(source.split('const params=')[0]+'\nwindow.StorageCheck={readStore,writeStore,validPlayer,nicknameError};',context);
const R=context.window.HarmRules,P=context.window.StorageCheck;
const checks=[];function test(name,fn){fn();checks.push(name);}
test('8 rounds, 3 endings, all choices tagged 1–5, all elements covered',()=>{
 assert.equal(story.rounds.length,8);assert.equal(Object.keys(story.endings).length,3);
 const covered=new Set();for(const r of story.rounds){assert.equal(r.choices.length,3);assert(r.question&&r.dialogue&&r.clues.length);assert.equal(r.choices.filter(c=>c.protect).length,1);for(const c of r.choices){assert(c.tags.length);for(const n of c.tags){assert([1,2,3,4,5].includes(n));covered.add(n);}}}
 assert.equal(covered.size,5);for(const group of story.recap)for(const c of group.choices)assert(c.tags.length&&c.tags.every(n=>[1,2,3,4,5].includes(n)));
});
test('Every card is at most 40 characters and uses 합니다 style',()=>{for(const e of Object.values(story.endings)){assert([...e.card].length<=40);assert(/(?:합니다|습니다)\.$/.test(e.card));}});
test('All 6,561 class decision sequences produce exactly the specified ending',()=>{
 const counts={A:0,B:0,C:0};for(let n=0;n<3**8;n++){let x=n;const ds={};let early=0,repair=0,last=false;for(let i=0;i<8;i++){const choice=x%3;x=Math.floor(x/3);ds[i]={choice};const good=story.rounds[i].choices[choice].protect;if(i<4)early+=Number(good);else if(i<7)repair+=Number(good);else last=good;}
  const expected=early>=3&&repair>=2&&last?'A':repair>=2?'B':'C';assert.equal(R.resultOf(ds).ending,expected);counts[expected]++;
 }assert(Object.values(counts).every(n=>n>0));
 assert.equal(R.resultOf({0:{choice:0}}),null);
});
test('Eight rounds follow the same order; one classroom outcome and 60 second recap',()=>{
 let t=1000000,room=R.newRoom('teacher',t);room.members={s1:{},s2:{},s3:{}};
 room=R.transition(room,'start',t);assert.equal(room.control.duration,60000);assert.equal(room.control.accepting,false);
 room=R.transition(room,'next',t+=60000);
 for(let i=0;i<8;i++){
  assert.equal(room.control.round,i);assert.equal(room.control.phase,'observe');assert.equal(room.control.duration,20000);
  room=R.transition(room,'next',t+=20000);assert.equal(room.control.duration,40000);
  const choice=story.rounds[i].choices.findIndex(c=>c.protect),b=room.control.ballot;
  room.votes??={};room.votes[i]={s1:{choice,ballot:b},s2:{choice,ballot:b},s3:{choice:(choice+1)%3,ballot:b},outsider:{choice:2,ballot:b}};
  const snapshot=JSON.stringify(room);const next=R.transition(room,'next',t+=40000);assert.equal(JSON.stringify(room),snapshot,'Original state must remain unchanged');room=next;
  assert.equal(room.control.phase,'feedback');assert.equal(room.decisions[i].total,3);assert.equal(room.decisions[i].choice,choice);
  room=R.transition(room,'next',t+=40000);
 }
 assert.equal(room.control.phase,'ended');assert.equal(room.control.duration,60000);assert.equal(room.outcome.ending,'A');assert.equal(t-1000000+60000,920000);assert.equal(R.transition(room,'next',t),undefined);
});
test('No vote never selects an arbitrary answer; retry ignores older ballot',()=>{
 let room=R.newRoom('t',0);room.members={a:{}};room=R.transition(R.transition(R.transition(room,'start',0),'next',60000),'next',80000);
 room.votes={0:{a:{choice:2,ballot:0}}};room=R.transition(room,'next',120000);assert.equal(room.control.phase,'empty');assert(!room.decisions);
 room=R.transition(room,'retry',121000);assert.equal(room.control.ballot,2);assert.equal(R.tally(room).total,0);
});
test('Only tied leaders can be chosen by teacher',()=>{
 let room=R.newRoom('t',0);room.members={a:{},b:{}};room.control={...room.control,round:0,phase:'vote',ballot:1};room.votes={0:{a:{choice:0,ballot:1},b:{choice:1,ballot:1}}};
 room=R.transition(room,'next',10);assert.equal(room.control.phase,'tie');assert.equal(R.transition(room,'resolve',11,2),undefined);
 room=R.transition(room,'resolve',12,1);assert.equal(room.decisions[0].choice,1);assert.equal(room.decisions[0].tie,true);assert.equal(R.transition(room,'resolve',13,0),undefined);
});
test('Pause preserves time; extension and resume work',()=>{
 let room=R.transition(R.newRoom('t',0),'start',0);room=R.transition(room,'pause',10000);assert.equal(R.remaining(room.control,99999),50000);assert.equal(R.transition(room,'next',99999),undefined);
 room=R.transition(room,'extend',100000);assert.equal(R.remaining(room.control,100000),65000);room=R.transition(room,'pause',110000);assert.equal(R.remaining(room.control,120000),55000);
});
test('Common saved character accepted; nickname validation; blocked and malformed storage safe',()=>{
 assert(P.validPlayer({character:'char_03',nickname:'반짝이는 고래'}));assert(P.validPlayer({character:'char_04',nickname:'별빛'}));assert(!P.validPlayer({character:'unknown',nickname:'별빛'}));assert.equal(P.nicknameError('별빛'),'');assert(P.nicknameError('<img>'));assert(P.nicknameError('학교123'));
 const result={game:'harm',completed:true,ending:'C',card:story.endings.C.card};assert(P.writeStore('ethicity.result.harm',result));assert.equal(P.readStore('ethicity.result.harm').ending,'C');stored.set('bad','not json');assert.equal(P.readStore('bad'),null);blocked=true;assert.equal(P.writeStore('ethicity.result.harm',result),false);assert.equal(P.readStore('ethicity.player'),null);blocked=false;
});
test('Built game includes exact story, common characters and only reference Firebase modules',()=>{
 assert.deepEqual(JSON.parse(html.match(/<script id="game-data"[^>]*>([\s\S]*?)<\/script>/)[1]),story);
 assert.deepEqual(config.characters.map(c=>c.id),['char_03','char_04']);
 const imports=[...source.matchAll(/import\('([^']+)'\)/g)].map(m=>m[1]);assert.equal(imports.length,3);assert(imports.every(u=>u.startsWith('https://www.gstatic.com/firebasejs/12.19.0/')));
 assert(!/private_key|service_account|BEGIN PRIVATE KEY/.test(html));
 const choiceRendering=source.slice(source.indexOf('function voteScreen'),source.indexOf('function teacherTally'));assert(!choiceRendering.includes('.tags'));assert(!choiceRendering.includes('tagsHTML'));
 new vm.Script(html.match(/<script id="game-code">([\s\S]*?)<\/script>/)[1]);
});
console.log(JSON.stringify({passed:checks.length,decisionCombinations:6561,checks},null,2));
