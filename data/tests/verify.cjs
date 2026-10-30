'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
require('../story.js');const M=globalThis.EthicityDataModel,root=path.resolve(__dirname,'../..'),common=path.join(root,'shared/ethicity-elementary-common-v1');
const manifest=JSON.parse(fs.readFileSync(path.join(common,'manifest.json'),'utf8'));
assert.equal(manifest.id,'ethicity-elementary-common');assert.equal(manifest.version,'1.0.0');
assert.deepEqual(Object.keys(M.people),['robot','teacher','jiho','saebom','haneul','daon','onyu','librarian']);
for(const id of Object.keys(M.people))assert.ok(manifest.characters[id]);
const files=[...Object.values(manifest.characters).flatMap(c=>[c.walk,c.portraits,c.source]),...Object.values(manifest.backgrounds).map(b=>b.image),manifest.props.image,manifest.icons.image,manifest.effects.image,...Object.values(manifest.sounds),...manifest.ui.states.map(x=>'ui/'+x+'.png'),'ui/fonts/Galmuri11.woff2','ui/fonts/Galmuri11-Bold.woff2'];
for(const file of files)assert.ok(fs.existsSync(path.join(common,file)),file);
let combinations=0;const outcomes=new Set();
for(let mask=1;mask<16;mask++)for(let sorting=0;sorting<8;sorting++)for(const question of [false,true])for(const box of ['open','one','locked'])for(let protect=0;protect<4;protect++){
 const s=M.initial();s.visited=M.sources.filter((_,i)=>mask&(1<<i)).map(x=>x.id);s.sort={duplicates:sorting&1?'remove':'keep',impersonation:sorting&2?'remove':'keep',genuine:sorting&4?'keep':'remove'};s.questionImproved=question;s.boxProtection=box;s.protectChoices=[!!(protect&1),!!(protect&2)];
 const r=M.result(s);outcomes.add(r.kind);assert.equal(r.findings.length,3);assert.equal(r.menu.rows.length,5);assert.ok(r.menu.rows.every(row=>!row[1].includes('땅콩')),'Revised menus must exclude peanut ingredients');
 if(r.kind==='ready'){assert.equal(s.visited.length,4);assert.ok(M.clean(s));assert.equal(s.sort.genuine,'keep');assert.ok(question);assert.equal(M.protection(s),2);assert.notEqual(box,'open');}
 if(!M.clean(s))assert.equal(M.initialMenu(s).kind,'unverified');
 if(M.clean(s)&&s.visited.length===4)assert.ok(M.initialMenu(s).rows.some(row=>row[1].includes('땅콩')),'Missing questionnaire field remains visible even after all sources');
 combinations++;
}
assert.deepEqual([...outcomes].sort(),['ready','rebuild','review']);
const s=M.initial();s.visited=['box','jiho'];assert.equal(M.count(s),14);s.visited.push('saebom','haneul');assert.equal(M.count(s),17);
const source=fs.readFileSync(path.join(root,'data/game.js'),'utf8');assert.ok(!/localStorage|sessionStorage|indexedDB|sendBeacon|XMLHttpRequest|WebSocket|fetch\s*\(/.test(source),'No persistence or remote calls');
assert.match(source,/emit\('complete',\{result:\{completed:true\}\}\)/);assert.ok(!source.includes('GAME OVER'));
const tree=cp.execFileSync('git',['ls-tree','-r','--format=%(objectname) %(path)','origin/main','shared/ethicity-elementary-common-v1'],{cwd:root,encoding:'utf8'}).trim().split('\n').map(line=>({sha:line.slice(0,40),file:line.slice(41).trim()}));
const hashes=cp.execFileSync('git',['hash-object','--stdin-paths'],{cwd:root,input:tree.map(x=>x.file).join('\n')+'\n',encoding:'utf8'}).trim().split('\n');tree.forEach((x,i)=>assert.equal(hashes[i],x.sha,'Common package changed: '+x.file));
console.log(JSON.stringify({passed:true,combinations,outcomes:[...outcomes].sort(),assetPaths:files.length,unchangedCommonFiles:tree.length},null,2));
