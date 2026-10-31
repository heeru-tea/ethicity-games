'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
global.window=globalThis;require('../scenario.js');require('../story.js');
const M=EthicityDataModel;
let cases=0;
for(let mask=0;mask<16;mask++)for(let flags=0;flags<256;flags++){
const s=M.initial();s.visited=M.sources.filter((_,i)=>mask&(1<<i)).map(x=>x.id);
[s.sort.duplicates,s.sort.impersonation,s.sort.genuine]=[flags&1?'remove':'keep',flags&2?'remove':'keep',flags&4?'keep':'remove'];
s.allergy=!!(flags&8);s.spice=!!(flags&16);s.boxProtection=flags&32?'locked':'open';s.protectChoices=[!!(flags&64),!!(flags&128)];
const menu=M.initialMenu(s);
assert.equal(menu.rows[0][1]==='짜장면',!(flags&1));
assert.equal(menu.rows[4][1]==='땅콩 버터 피자',!(flags&2));
assert.equal(menu.rows[3][1],'땅콩 소스 치킨');
M.capture(s);const r=M.result(s);
assert.equal(r.kind==='ready',mask===15&&flags===255);
assert.equal(r.menu.title==='선생님 확인 완료',r.kind==='ready');
assert.ok(!r.menu.rows.some(row=>/땅콩/.test(row[1])));
const first=JSON.stringify(s.first);M.sources.forEach(src=>M.visit(s,src.id));M.sources.forEach(src=>M.visit(s,src.id));assert.equal(M.count(s),17);
M.applyActivity(s,'allergy');assert.equal(s.spice,!!(flags&16),'Allergy must not set spice');
M.applyActivity(s,'spice');M.applyActivity(s,'stickers');assert.equal(M.count(s),17);
s.sort={duplicates:'remove',impersonation:'remove',genuine:'keep'};s.boxProtection='locked';s.protectChoices=[true,true];assert.equal(M.result(s).kind,'ready');assert.equal(JSON.stringify(s.first),first,'History stays unchanged');cases++;
}
const game=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8');
for(const [,id] of game.matchAll(/(?:T|L)\('([^']+)'\)/g))assert.ok(EthicityScenario[id],'Missing scenario '+id);
assert.ok(!/localStorage|sessionStorage|fetch\(|XMLHttpRequest/.test(game));
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../../shared/ethicity-elementary-common-v1/manifest.json')));
for(const id of Object.keys(M.people))assert.ok(manifest.characters[id]);
assert.equal(Object.keys(M.people).length,7);assert.ok(!M.people.librarian);
console.log(JSON.stringify({passed:true,cases,checks:['independent menu effects','independent survey questions','deduplicated response counts','history preserved','post-repair result','safe pending menu','scenario IDs','no persistence']}));
