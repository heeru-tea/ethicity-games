const assert=require('node:assert/strict');
const model=require('./evaluation.js');
const equal={users:2,access:2,need:2,safety:2,efficiency:2};
assert.equal(model.evaluate([],equal).score,0,'Empty park must not earn efficiency for saving the budget');
assert.equal(model.evaluate([],equal).raw.efficiency,0);
assert(model.evaluate(['shade'],equal).raw.efficiency>model.evaluate(['garden'],equal).raw.efficiency,'Equal-cost comparisons must reflect benefit, not facility count');
assert.equal(model.needs(['garden']).find(n=>n.name==='하린').met,false);
assert.equal(model.needs(['path','garden']).find(n=>n.name==='하린').met,true);
assert.equal(model.needs(['path','lights']).find(n=>n.name==='저녁 산책 주민').met,true);
let valid=0;
const ids=Object.keys(model.costs);
for(let mask=0;mask<64;mask++){
  const selected=ids.filter((_,i)=>mask&(1<<i));
  for(const weights of [equal,model.originalWeights,{users:1,access:1,need:1,safety:6,efficiency:1}]){
    const r=model.evaluate(selected,weights);
    assert(r.score>=0&&r.score<=100);
    assert(Object.values(r.raw).every(v=>v>=0&&v<=10));
  }
  if(selected.includes('path')&&model.evaluate(selected,equal).cost<=10){
    valid++;
    assert(model.needs(selected).some(n=>!n.met),'Budget must leave an explicit need, rather than a hidden perfect answer');
  }
}
assert(valid>1);
console.log(`Verified 64 facility sets under 3 weight profiles; ${valid} accessible budget-feasible designs, access dependencies and efficiency regressions.`);
