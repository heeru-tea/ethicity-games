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
for(const scene of scenario.scenes){
  for(const n of [1,2])verify(`${scene.description} · 현재 사건 ${n}을(를) 조사 중이에요.`);
}
for(const n of [1,2,3,4])assert.equal(api.t(`🔒 단서 ${n}개 더 필요`),`🔒 Find ${n} more ${n===1?'clue':'clues'}`);
assert.equal(api.t('현재 11/10점 · 1점을 줄여 주세요.'),'You have used 11/10 points. Remove 1 point.');
assert.equal(api.t('현재 9/10점 · 1점을 더 배분해 주세요.'),'You have used 9/10 points. Add 1 point.');
assert.equal(api.t('교실에 들어왔어요. 나갈 때는 아래쪽 초록 포털로 가세요.'),'You are in the classroom. Use the green portal at the bottom to leave.');
assert.ok(!api.t('내가 정한 AI 중요도: 이용자 수 1점 · 접근성 2점').includes('Access성'));
const reason='사람이 먼저 확인해야 합니다.';
const record=api.record(['별명: 새봄',`이유: ${reason}`,original],['새봄',reason]);
assert.ok(record.includes('새봄')&&record.includes(reason),'Learner input must remain unchanged');
assert.ok(record.includes(api.t(original)));
assert.equal(api.userText(()=>api.t('새봄')),'새봄');
// Exercise the actual download handler: learners must see names and readable
// plans instead of internal facility IDs and raw JSON, while their input stays.
const parkSource=fs.readFileSync(path.join(root,'publicness-preview/game.js'),'utf8');
const downloadCode=parkSource.split(/\r?\n/).find(line=>line.includes("$('downloadBtn').addEventListener"));
let download,exported='',fileName='';
const facility={id:'path',name:'무장애 연결길'};
const state={name:'내별명',reason,visited:['play','shade','garden','square'],facilities:['path'],weights:{access:1},trialRuns:1,trialHistory:[{facilities:['path'],weights:{access:1},score:45}],policy:'access'};
vm.runInNewContext(downloadCode,{
  $:()=>({addEventListener:(_event,handler)=>{download=handler;}}),
  state,metrics:()=>({chosen:[facility],cost:3}),FACILITIES:[facility],
  CRITERIA:[{id:'access',label:'접근성'}],POLICIES:[{id:'access',title:'누구나 이용 가능한 공간 만들기'}],
  evaluation:{needs:()=>[{name:'하린',need:'정원까지 접근해 함께 꽃 가꾸기',met:false}]},
  window:{EthicityI18n:api},Blob:class{constructor(parts){exported=parts.join('');}},
  URL:{createObjectURL:()=> 'blob:test',revokeObjectURL:noop},setTimeout:noop,
  document:{createElement:()=>({click(){fileName=api.t(this.download);}})}
});
download();
assert.ok(exported.includes('내별명')&&exported.includes(reason));
assert.ok(exported.includes('Step-free connecting path')&&exported.includes('Easy access 1 point'));
assert.ok(exported.includes('45/100 points'));
assert.ok(!exported.includes('"facilities"')&&!exported.includes('"weights"'));
assert.ok(!/[가-힣]/.test(exported.replaceAll('내별명','').replaceAll(reason,'')),exported);
assert.equal(fileName,'Ethicity_Our_Missing_Park_Investigation.txt');
api.setLanguage('ko');assert.equal(api.t(original),original);
console.log(`Verified ${translated} scenario/outcome/need strings, dynamic instructions, language switching and readable exports with protected learner text.`);
