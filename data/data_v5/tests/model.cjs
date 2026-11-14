'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
global.window=globalThis;require('../scenario.js');require('../story.js');require('../report.js');
const M=EthicityDataModel;
let checked=0;
// Check independent failures, their menu links and the final plan assessment.
for(let mask=0;mask<16;mask++)for(let flags=0;flags<512;flags++){
 const s=M.initial();s.visited=M.sources.filter((_,i)=>mask&(1<<i)).map(x=>x.id);
 s.sort={duplicates:flags&1?'remove':'keep',impersonation:flags&2?'remove':'keep',genuine:flags&4?'keep':'remove'};
 s.criteria={allergy:!!(flags&8),spice:!!(flags&16)};s.tests={...s.criteria};s.allergy=s.tests.allergy;s.spice=s.tests.spice;
 s.scope={role:!!(flags&32),access:!!(flags&64)};s.protectChoices=[!!(flags&128),!!(flags&256)];
 const r=M.result(s),pending=M.repairs(s).map(x=>x.id);
 assert.equal(r.kind==='ready',mask===15&&flags===511);
 assert.deepEqual([...new Set(r.menu.rows.flatMap(row=>row[3]))].sort(),pending.sort(),'Every unresolved issue attaches to a menu');
 assert.ok(r.menu.rows.every(row=>!row[1].includes('땅콩 버터 피자')&&!row[1].includes('땅콩 소스 치킨')),'Teacher blocks dangerous ingredients on every path');
 assert.equal(r.menu.rows[0][1].includes('순한 떡볶이'),s.tests.spice);
 assert.ok(![r.title,r.note,...r.findings,...r.needs,...r.menu.rows.flatMap(row=>row.slice(0,3))].join(' ').match(/\{[^}]+\}|undefined|NaN/));checked++;
}
const s=M.initial();assert.throws(()=>M.retest(s,'allergy'));
M.addCriterion(s,'allergy');assert.equal(s.criteria.allergy,true);assert.equal(s.tests.allergy,false);
assert.ok(M.repairs(s).some(x=>x.id==='allergy'));
M.retest(s,'allergy');assert.equal(s.tests.allergy,true);assert.equal(s.tests.spice,false);
M.setScope(s,'role');assert.ok(M.repairs(s).some(x=>x.id==='protect'));assert.equal(s.scope.access,false);
M.capture(s);const original=JSON.stringify(s.first);
M.sources.forEach(x=>M.visit(s,x.id));M.sources.forEach(x=>M.visit(s,x.id));M.applyActivity(s,'stickers');assert.equal(M.count(s),17);
s.sort={duplicates:'remove',impersonation:'remove',genuine:'keep'};M.setScope(s,'access');M.addCriterion(s,'spice');M.retest(s,'spice');s.protectChoices=[true,true];
assert.equal(M.result(s).kind,'ready');assert.equal(JSON.stringify(s.first),original);
s.scene=4;M.record(s,'기준 추가','재시험 전');s.criteria.allergy=false;assert.equal(s.history.at(-1).after.criteria.allergy,true,'History captures a snapshot');
assert.ok(M.pledges.some(t=>t.includes('운영 중 새 오류가 반복되면 다시 점검')));
// Every literal scenario reference in the controller must exist.
const source=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8');
for(const match of source.matchAll(/(?:T|L)\('([^']+)'\)/g))assert.ok(EthicityScenario[match[1]],match[1]);
assert.equal(M.words.length,5);assert.equal(M.scenes.length,6);
console.log('PASS: '+checked+' outcome combinations; criteria/retest separation; independent permissions; immutable history; safety; scenario references.');
