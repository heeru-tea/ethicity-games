'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
global.window=globalThis;require('../scenario.js');require('../story.js');require('../report.js');
const M=EthicityDataModel;let cases=0;
for(let mask=0;mask<16;mask++)for(let flags=0;flags<256;flags++){
 const s=M.initial();s.visited=M.sources.filter((_,i)=>mask&(1<<i)).map(x=>x.id);
 [s.sort.duplicates,s.sort.impersonation,s.sort.genuine]=[flags&1?'remove':'keep',flags&2?'remove':'keep',flags&4?'keep':'remove'];
 s.allergy=!!(flags&8);s.spice=!!(flags&16);s.boxProtection=flags&32?'locked':'open';s.protectChoices=[!!(flags&64),!!(flags&128)];
 const first=M.initialMenu(s);assert.equal(first.rows[0][1]==='짜장면',!(flags&1));assert.equal(first.rows[4][1]==='땅콩 버터 피자',!(flags&2));
 M.capture(s);const r=M.result(s),pending=M.repairs(s).map(x=>x.id);
 assert.equal(r.kind==='ready',mask===15&&flags===255);assert.equal(r.menu.title==='선생님 확인 완료',r.kind==='ready');
 assert.ok(r.menu.rows.every(row=>!row[1].includes('땅콩 버터')&&!row[1].includes('땅콩 소스 치킨')));
 assert.deepEqual([...new Set(r.menu.rows.flatMap(row=>row[3]))].sort(),pending.sort(),'Every unresolved data issue must attach to at least one menu');
 for(const row of r.menu.rows)assert.equal(row[2].includes('아직 확인할 것'),row[3].length>0);
 const history=JSON.stringify(s.first);M.sources.forEach(x=>M.visit(s,x.id));M.sources.forEach(x=>M.visit(s,x.id));assert.equal(M.count(s),17);
 M.applyActivity(s,'allergy');assert.equal(s.spice,!!(flags&16));M.applyActivity(s,'spice');M.applyActivity(s,'stickers');
 s.sort={duplicates:'remove',impersonation:'remove',genuine:'keep'};s.boxProtection='locked';s.protectChoices=[true,true];assert.equal(M.result(s).kind,'ready');assert.equal(JSON.stringify(s.first),history);cases++;
}
const s=M.initial();s.scene=2;s.sort.duplicates='keep';M.record(s,'반복 응답 넣기','짜장면 반복');s.scene=4;s.sort.duplicates='remove';M.record(s,'반복 응답 빼기','반복 메뉴 해소');
assert.ok(s.history[0].after.pending.includes('duplicates'));assert.ok(!s.history[1].after.pending.includes('duplicates'));s.learning=[0,4];s.explorer='B';
const sections=EthicityReport.sections(s,['약속']);assert.equal(sections.filter(x=>x.title.startsWith('이야기')).length,6);assert.ok(sections.find(x=>x.title.includes('학습 내용')).body.includes(M.learningOptions[4]));
assert.ok(sections.some(x=>x.body.includes('결과·변화: 짜장면 반복')));assert.ok(sections.some(x=>x.body.includes('결과·변화: 반복 메뉴 해소')));
const game=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8');for(const [,id] of game.matchAll(/(?:T|L)\('([^']+)'\)/g))assert.ok(EthicityScenario[id],'Missing '+id);
for(const file of ['game.js','story.js','report.js'])assert.ok(!/localStorage|sessionStorage|fetch\(|XMLHttpRequest/.test(fs.readFileSync(path.join(__dirname,'../'+file),'utf8')));
for(const entry of Object.values(EthicityScenario))assert.ok(!/지호|하늘|새봄|다온|온유|모으기|배운|v2/.test(entry.text),entry.text);
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../../../shared/ethicity-elementary-common-v1/manifest.json')));for(const id of Object.keys(M.people))assert.ok(manifest.characters[id]);
console.log(JSON.stringify({passed:true,cases,checks:['independent consequences','each menu has pending issues','safe candidate menus','real repairs','immutable choice history','six-round report','selected learning','anonymous students','no persistence']}));
