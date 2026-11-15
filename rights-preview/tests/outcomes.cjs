const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {caseOutcome,finalOutcome}=require('../source/outcomes.js');
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../scenario.json'),'utf8'));
let count=0;
for(const ch of data.chapters){
  const [a,b]=ch.review.questions;
  for(const x of a.options)for(const y of b.options){
    const answers={[a.id]:x.id,[b.id]:y.id};
    const o=caseOutcome(ch.id,answers);
    assert.ok(o.title&&o.badge&&o.text&&o.evidence&&o.feedback);
    if((ch.id==='saebom'&&y.id==='block')||(ch.id==='onyu'&&y.id==='keep')){
      assert.equal(o.protected,false);assert.match(o.badge,/미완료/);
      assert.notEqual(o.badge,'모두에게 열린 문');
    }
    if((ch.id==='saebom'&&x.id==='ai')||(ch.id==='onyu'&&x.id==='fair'))assert.equal(o.protected,false);
    count++;
  }
}
const good={saebom:{truth:'direct',rights:'review'},onyu:{fairness:'unfair',use:'support'}};
const bad={saebom:{truth:'ai',rights:'block'},onyu:{fairness:'fair',use:'keep'}};
for(const p of data.final.policies){
  assert.equal(finalOutcome(good,p.id).status,p.id==='efficiency_first'?'restricted':'protected');
  assert.notEqual(finalOutcome(bad,p.id).status,'protected');
}
assert.equal(caseOutcome('saebom',{truth:'uncertain',rights:'review'}).status,'protected_pending');
assert.notEqual(caseOutcome('saebom',good.saebom).text,caseOutcome('saebom',bad.saebom).text);
assert.notEqual(caseOutcome('onyu',good.onyu).badge,caseOutcome('onyu',bad.onyu).badge);
for(const st of data.stations){assert.equal(st.choices.length,3);assert.equal(new Set(st.choices.map(c=>c.id)).size,3);}
const js=fs.readFileSync(path.join(__dirname,'../source/game.js'),'utf8');
new Function(js);
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
assert.ok(!html.includes('__INLINE_'));
assert.ok(!js.includes("fill(px-112,py-12,224,10"));
assert.ok(!js.includes('if(!good)'));
console.log(`Verified ${count} case combinations, 8 final combinations, evidence/rights branches and generated syntax.`);
