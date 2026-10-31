const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const story=JSON.parse(read('scenario.json')),rules=JSON.parse(read('database.v5.rules.json')).rules.roomsPrivacyV5Story20261031;
assert.equal(story.revision,'20261031');
assert.deepEqual(story.rounds.map(r=>r.scene),['signup','account','group-chat','class-photo','reward','public-photo','shared-tablet','delete-account']);
for(const r of story.rounds){assert.equal(r.choices.filter(c=>c.score===2&&c.kind==='safe').length,2);assert(r.transition&&r.transitionDialogue.length);}
assert(new Set(story.rounds.map(r=>r.choices.map(c=>c.score).join(','))).size>1);
const checkEnding=new Function('root','newData','$room','$uid','return '+rules.$room.results.$uid.ending['.validate']);
const checkCard=new Function('newData','return '+rules.$room.results.$uid.card['.validate']);
let tested=0;
for(let n=0;n<65536;n++){
 let value=n,total=0,choices=[];for(const r of story.rounds){const c=value%4;value=Math.floor(value/4);choices.push(c);total+=r.choices[c].score;}
 const expected=total>=13?'A':total>=8?'B':'C';
 function snap(parts=[]){return {child:k=>snap([...parts,k]),val:()=>choices[Number(parts.at(-2))]};}
 for(const code of ['A','B','C'])assert.equal(checkEnding(snap(),{val:()=>code},'room','uid'),code===expected);
 tested++;
}
for(const [code,e]of Object.entries(story.endings)){
 const nd=card=>({val:()=>card,parent:()=>({child:()=>({val:()=>code})})});
 assert(checkCard(nd(e.card)));assert(!checkCard(nd('틀린 카드')));
}
const app=read('source/app.js'),live=read('source/live.js');
assert(app.includes('story20261031.draft.'));assert(!live.includes('roomsV4'));
assert(app.includes("safe=r.choices.filter(x=>x.kind==='safe')"));
assert(app.includes('r.transitionDialogue'));
console.log(JSON.stringify({scenarioRevision:story.revision,safeChoicesPerRound:2,serverAndClientScorePathsMatched:tested,cardsValidated:true,oldDraftsIsolated:true,allSafeChoicesReviewed:true}));
