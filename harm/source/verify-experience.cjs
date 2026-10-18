// 대사 갱신 회귀와 음악 시작/정지를 실제 효과 코드로 검사합니다.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/experience.js','utf8');
function setup({reduced=false,audio=true}={}){
 const listeners={},timeouts=new Map(),intervals=new Map(),store=new Map(),controls=new Map(),observers=[],audios=[],warnings=[];
 let id=0,elements=[];
 class Element{
  constructor(text='',key=''){this.textContent=text;this.dataset={speech:key};this.style={setProperty(){}};this.children=[];this.isConnected=true;this.classList={toggle(){}};this.attributes={};}
  set innerHTML(value){this.html=value;this.ink={textContent:''};}get innerHTML(){return this.html;}
  setAttribute(k,v){this.attributes[k]=v;}
  querySelector(){return this.ink;}
  append(el){this.children.push(el);el.parent=this;}remove(){if(this.parent)this.parent.children=this.parent.children.filter(e=>e!==this);}
  get firstElementChild(){return this.children[0];}
 }
 for(const key of ['typing','sparkle','music'])controls.set(key,new Element());
 const document={hidden:false,body:new Element(),createElement:()=>new Element(),addEventListener:(k,fn)=>(listeners[k]??=[]).push(fn),querySelectorAll:()=>elements,querySelector:s=>controls.get(s.match(/data-action="(.+?)"/)?.[1]),getElementById:()=>null};
 const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(v){this.value=v;}});
 class Audio{
  constructor(){this.state='suspended';this.currentTime=0;this.created=[];audios.push(this);}
  createGain(){return {gain:param(),connect(){},disconnect(){}};}
  createOscillator(){const osc={frequency:param(),connect(){},disconnect(){},start(t){this.startAt=t;},stop(){this.stopped=true;this.onended?.();}};this.created.push(osc);return osc;}
  addEventListener(){}async resume(){this.state='running';}async suspend(){this.state='suspended';}
 }
 const context=vm.createContext({document,window:{AudioContext:audio?Audio:undefined,addEventListener(){}},matchMedia:()=>({matches:reduced}),IntersectionObserver:class{constructor(fn){this.fn=fn;this.targets=[];observers.push(this);}observe(el){this.targets.push(el);}disconnect(){this.targets=[];}},setTimeout:fn=>{timeouts.set(++id,fn);return id;},clearTimeout:n=>timeouts.delete(n),setInterval:fn=>{intervals.set(++id,fn);return id;},clearInterval:n=>intervals.delete(n)});
 vm.runInContext(source+'\nthis.factory=createHarmExperience;',context);
 const fx=context.factory({read:(k,f)=>store.has(k)?store.get(k):f,write:(k,v)=>store.set(k,v),notify:t=>warnings.push(t)});
 return {fx,document,audios,intervals,controls,warnings,store,
  mount(rows){elements.forEach(el=>el.isConnected=false);elements=rows.map(([key,text])=>new Element(text,key));fx.sync();return elements;},
  visible(els){const o=observers.at(-1);o.fn(els.map(el=>({target:el,isIntersecting:true})));},
  tick(n=1){while(n--){const pending=[...timeouts.values()];timeouts.clear();pending.forEach(fn=>fn());}},
  event:async k=>{for(const fn of listeners[k]||[])await fn();}
 };
}
(async()=>{
 const checks=[];
 const s=setup(),text='나를 도와줘! 친구와 함께 확인하자.';
 let els=s.mount([['r1-story',text]]);assert.equal(els[0].dataset.typingState,'waiting');s.tick(100);assert.equal(els[0].ink.textContent,'');
 s.visible(els);s.tick(3);assert.equal([...els[0].ink.textContent].length,3);
 els=s.mount([['r1-story',text]]);assert.equal([...els[0].ink.textContent].length,3);s.visible(els);s.tick(2);assert.equal([...els[0].ink.textContent].length,5);
 checks.push('Typing begins when visible and continues at the same character after a realtime redraw');
 s.fx.finish(els[0]);assert.equal(els[0].ink.textContent,text);
 els=s.mount([['r1-story',text],['r1-feedback','멈춰 줘서 고마워!']]);assert.equal(els[0].dataset.typingState,'complete');s.visible([els[1]]);s.tick(2);assert.equal(els[1].ink.textContent,'멈춰');assert.equal(els[0].ink.textContent,text);
 checks.push('A completed story stays complete while the second feedback dialogue types separately');
 s.fx.toggleTyping();assert.equal(els[1].dataset.typingState,'complete');s.fx.toggleTyping();s.tick(1);assert.equal([...els[1].ink.textContent].length,1);
 checks.push('Instant reading and re-enabling the effect work without replacing the page');
 const reduced=setup({reduced:true});const plain=reduced.mount([['x',text]]);reduced.visible(plain);reduced.tick(2);assert.equal([...plain[0].ink.textContent].length,2);reduced.fx.toggleTyping();assert.equal(plain[0].ink.textContent,text);
 checks.push('Dialogue effect remains available on devices with OS animations off; the reading toggle still shows full text');
 assert.equal(s.audios.length,0);await s.fx.toggleMusic();assert.equal(s.audios.length,1);assert.equal(s.audios[0].state,'running');assert(s.audios[0].created.length>0);assert.equal(s.intervals.size,1);
 const first=s.audios[0].created;s.fx.changeVolume(200);assert.equal(s.store.get('ethicity.harm.volume'),60);
 s.document.hidden=true;await s.event('visibilitychange');assert.equal(s.audios[0].state,'suspended');assert.equal(s.intervals.size,0);assert(first.every(n=>n.stopped));
 s.document.hidden=false;await s.event('visibilitychange');assert.equal(s.audios[0].state,'running');assert.equal(s.intervals.size,1);
 await s.fx.toggleMusic();assert.equal(s.audios[0].state,'suspended');assert.equal(s.intervals.size,0);await s.fx.toggleMusic();assert.equal(s.audios.length,1);assert.equal(s.intervals.size,1);await s.fx.toggleMusic();
 checks.push('Music starts only on request; volume is bounded; hide, resume and repeated toggles do not stack loops');
 const unsupported=setup({audio:false});await unsupported.fx.toggleMusic();assert.equal(unsupported.warnings.length,1);assert.equal(unsupported.intervals.size,0);assert.equal(unsupported.controls.get('music').attributes['aria-pressed'],'false');
 checks.push('Unavailable audio leaves the game usable and the music switch off');
 console.log(JSON.stringify({passed:checks.length,checks},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
