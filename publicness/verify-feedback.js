// Publicness feedback v0.5: source-driven deterministic checks, Node.js only.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=__dirname;
const code=fs.readFileSync(path.join(root,'game.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const start=code.indexOf('  function evaluatePark(');
const end=code.indexOf('  function facilityNames(',start);
assert(start>=0&&end>start,'AI evaluator and recommendation must exist');
const facilityStart=code.indexOf('  const FACILITIES = [');
const facilityEnd=code.indexOf('  const POLICIES = [',facilityStart);
const criteriaStart=code.indexOf('  const CRITERIA = [');
const criteriaEnd=facilityStart;
const evaluation=code.slice(start,end);
const factory=Function(
  code.slice(criteriaStart,criteriaEnd)+
  code.slice(facilityStart,facilityEnd)+
  evaluation+
  ';return {proposePark,evaluatePark};'
);
const {proposePark,evaluatePark}=factory();
const users={users:6,access:1,need:1,safety:1,efficiency:1};
const access={users:1,access:6,need:1,safety:1,efficiency:1};
const A=proposePark(users),B=proposePark(access);
assert.notDeepEqual(A.ids,B.ids,'Different priorities must change AI facility proposals');
for(const plan of [A,B]){
  assert(plan.ids.includes('path'),'Accessible path should be mandatory');
  assert(plan.cost<=10,'AI proposal must fit budget');
}
assert(evaluatePark(['path','play'],users).raw.efficiency!==evaluatePark(['path','shade','square'],users).raw.efficiency,
  'Efficiency must consider cost and usage, not simply facility count');
assert(code.includes("good:chosen('shade')"),'Only shade should resolve strong sunlight problem');
assert(code.includes("walkingDirection")&&code.includes("walkingFrame"),'4-way walking animation expected');
assert(code.includes("trialComparison()"),'Comparison should be displayed at trial');
assert(html.includes('id="criteriaCheckBtn"'),'AI criteria stage must exist');
console.log('PASS publicness feedback: different AI plans, budget, shadow, efficiency, walking and comparisons');
