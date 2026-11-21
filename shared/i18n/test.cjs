const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const messages=require('./en.json');
const root=path.resolve(__dirname,'../..');
const noop=()=>{};
const select={value:'ko',addEventListener:noop};
const element=()=>({dataset:{},prepend:noop,append:noop,addEventListener:noop,querySelector:()=>select});
const document={currentScript:{dataset:{game:'test'}},documentElement:{lang:'ko'},body:element(),head:element(),createElement:element,querySelector:()=>select,querySelectorAll:()=>[],createTreeWalker:()=>({nextNode:()=>null})};
function Canvas(){};Canvas.prototype={fillText:noop,strokeText:noop,measureText:noop};
function Anchor(){};Anchor.prototype.click=noop;
const window={ETHICITY_EN:messages,dispatchEvent:noop,confirm:noop,alert:noop,prompt:noop};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'runtime.js'),'utf8'),{window,document,localStorage:{getItem:()=>null,setItem:noop},Node:{TEXT_NODE:3},NodeFilter:{SHOW_TEXT:4},MutationObserver:class{observe(){}disconnect(){}},CanvasRenderingContext2D:Canvas,HTMLAnchorElement:Anchor,CustomEvent:class{}});
const api=window.EthicityI18n;
const original='AI를 그대로 믿지 않고 누가 언제 다시 확인할까요?';
assert.equal(api.t(original),original);
api.setLanguage('en');
const hangul=/[가-힣]/;
let translated=0;
function verify(value){
  if(typeof value==='string'&&hangul.test(value)){
    assert.ok(!hangul.test(api.t(value)),`Missing English: ${value}`);translated++;
  }else if(value&&typeof value==='object')Object.values(value).forEach(verify);
}
const scenario=JSON.parse(fs.readFileSync(path.join(root,'rights-preview/scenario.json'),'utf8'));
verify(scenario);
const outcomes=require(path.join(root,'rights-preview/source/outcomes.js'));
for(const ch of scenario.chapters){
  const [a,b]=ch.review.questions;
  for(const x of a.options)for(const y of b.options)verify(outcomes.caseOutcome(ch.id,{[a.id]:x.id,[b.id]:y.id}));
}
for(const p of scenario.final.policies){
  for(const cases of [{saebom:{truth:'direct',rights:'review'},onyu:{fairness:'unfair',use:'support'}},{saebom:{truth:'ai',rights:'block'},onyu:{fairness:'fair',use:'keep'}}])verify(outcomes.finalOutcome(cases,p.id));
}
verify(require(path.join(root,'publicness-preview/evaluation.js')).needs(['path','shade']));
verify('중요도: 이용자 수 1점 · 접근성 2점 · 이용의 필요성 2점 · 안전성 4점 · 운영 효율성 1점');
const reason='사람이 먼저 확인해야 합니다.';
const record=api.record(['별명: 새봄',`이유: ${reason}`,original],['새봄',reason]);
assert.ok(record.includes('새봄')&&record.includes(reason),'Learner input must remain unchanged');
assert.ok(record.includes(api.t(original)));
assert.equal(api.userText(()=>api.t('새봄')),'새봄');
api.setLanguage('ko');assert.equal(api.t(original),original);
console.log(`Verified ${translated} scenario/outcome/need strings, live language switching and protected learner text.`);
