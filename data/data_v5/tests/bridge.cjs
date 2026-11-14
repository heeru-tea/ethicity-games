const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function client(classroom=true){
 const elements={},messages=[],moves=[];let receive,state;
 function element(){const children={h2:{},p:{}};return {open:false,querySelector:s=>children[s],setAttribute(){},addEventListener(){},showModal(){this.open=true;},close(){this.open=false;}};}
 const parent={postMessage:m=>messages.push(m)},document={getElementById:id=>elements[id],createElement:()=>element(),body:{append:e=>elements[e.id]=e}},window={addEventListener:(_,fn)=>receive=fn};
 const context=vm.createContext({window,parent,document,location:{search:classroom?'?classroom=1':'',origin:'http://localhost:8777'},URLSearchParams});
 for(const file of ['scenario.js','story.js','classroom-model.js','game-bridge.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../'+file),'utf8'),context);
 const api=window.EthicityClassroomBridge;state=window.EthicityDataModel.initial();
 const send=(kind,extra={})=>receive({origin:'http://localhost:8777',source:parent,data:{channel:'ethicity-data-v5',kind,...extra}});
 api.ready({restore:cp=>state=cp.state,setup:x=>state.explorer=x,move:n=>{if(!api.gate(n)){state.scene=n;moves.push(n);api.update(state);}}});
 return {api,send,elements,messages,moves,get state(){return state;},bad:m=>receive({origin:'https://wrong.example',source:parent,data:{channel:'ethicity-data-v5',...m}})};
}
const room=(n,extra={})=>({unlockedScene:n,paused:false,ended:false,...extra});
const fast=client(),slow=client();
for(const c of [fast,slow])c.send('initialize',{room:room(-1),explorer:'B'});
assert.equal(fast.api.gate(0),true);
for(const c of [fast,slow])c.send('control',{room:room(0)});
fast.state.quizChoice=1;slow.state.quizChoice=2;
fast.api.boundary(fast.state,0);
assert(fast.elements['classroom-wait'].open);
assert.equal(fast.api.gate(1),true);
for(const c of [fast,slow])c.send('control',{room:room(1)});
assert.equal(fast.state.scene,1);assert.equal(slow.state.scene,1);
assert.equal(fast.state.quizChoice,1);assert.equal(slow.state.quizChoice,2);
assert.equal(slow.messages.at(-1).checkpoint.completedScene,-1,'unfinished story must not be reported complete');
const before=slow.moves.length;slow.send('control',{room:room(1)});assert.equal(slow.moves.length,before,'heartbeat must not restart dialogue');
slow.send('control',{room:room(2,{paused:true})});assert(slow.elements['classroom-wait'].open);
slow.send('control',{room:room(2)});assert.equal(slow.state.scene,2);
slow.send('control',{room:room(1)});assert.equal(slow.state.scene,2,'stale snapshot must not rewind');
slow.bad({kind:'control',room:room(5)});assert.equal(slow.state.scene,2);
slow.send('independent');assert(slow.api.isClassroom(),'no mid-class preview switch');
slow.send('control',{room:room(6)});assert.equal(slow.state.scene,6);
const rejoin=client();rejoin.send('initialize',{room:room(4),explorer:'A',checkpoint:slow.messages.at(-1).checkpoint});assert.equal(rejoin.state.scene,4);assert.equal(rejoin.state.quizChoice,2);
slow.send('control',{room:room(6,{ended:true})});assert(slow.elements['classroom-wait'].open);
const preview=client(false);preview.send('initialize',{explorer:'B'});preview.send('control',{room:room(0,{paused:true})});assert.equal(preview.api.gate(5),false);const count=preview.messages.length;preview.api.update(preview.state);preview.api.boundary(preview.state,0);assert.equal(preview.messages.length,count);assert.equal(preview.state.explorer,'B');
console.log('PASS: teacher forces fast/unfinished students together; choices and partial checkpoint retained; waiting, pause/resume, late join, reconnect, stale/wrong-origin rejection; preview only at entry.');
