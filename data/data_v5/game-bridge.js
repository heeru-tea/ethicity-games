(function(){'use strict';
const embedded=parent!==window&&new URLSearchParams(location.search).get('classroom')==='1';
const C=window.EthicityClassroomModel;
let independent=!embedded,room=null,pending=null,scene=-1,ready=false,restore=null;
const post=(kind,data={})=>{if(embedded)parent.postMessage({channel:'ethicity-data-v5',kind,...data},location.origin);};
function dialog(reason){
 let d=document.getElementById('classroom-wait');
 if(!d){d=document.createElement('dialog');d.id='classroom-wait';d.className='ee-panel classroom-wait';d.innerHTML='<h2 id="wait-title"></h2><p id="wait-text"></p><button class="ee-button" id="wait-preview">미리보기로 혼자 이어가기</button>';d.setAttribute('aria-labelledby','wait-title');d.addEventListener('cancel',e=>e.preventDefault());document.body.append(d);d.querySelector('button').onclick=()=>post('preview-request');}
 const copy={connecting:['수업에 연결하고 있어요','연결이 오래 걸리면 미리보기로 혼자 이어갈 수 있어요.'],waiting:['다음 이야기를 기다려요','내 선택은 그대로 있어요. 선생님이 다음 이야기를 열면 이어갈 수 있어요.'],paused:['잠시 함께 이야기해요','선생님이 잠시 멈췄어요. 내 선택과 결과는 바뀌지 않아요.'],ended:['수업이 끝났어요','미리보기로 전환하면 남은 탐험과 내 리포트를 완성할 수 있어요.']};
 d.querySelector('h2').textContent=copy[reason][0];d.querySelector('p').textContent=copy[reason][1];if(!d.open)d.showModal();
}
function refresh(){
 const reason=C.gate({independent,room,scene:pending?pending.scene:scene});
 if(reason){dialog(reason);return;}
 document.getElementById('classroom-wait')?.close();
 if(pending){const fn=pending.fn;pending=null;fn();}
}
window.addEventListener('message',e=>{
 if(!embedded||e.origin!==location.origin||e.source!==parent||e.data?.channel!=='ethicity-data-v5')return;
 const m=e.data;
 if(m.kind==='control'&&!independent){room=m.room;refresh();}
 if(m.kind==='independent'){independent=true;refresh();post('detached');}
 if(m.kind==='restore'&&ready&&!independent&&C.validateCheckpoint(m.checkpoint)){restore?.(m.checkpoint);}
});
window.EthicityClassroomBridge={
 gate(n,fn){scene=n;if(C.gate({independent,room,scene:n})){pending={scene:n,fn};refresh();return true;}return false;},
 update(s){if(!independent)post('progress',{scene:s.scene,metrics:C.metrics(s)});},
 boundary(s,n){if(!independent)post('boundary',{scene:n,metrics:C.metrics(s),checkpoint:C.checkpoint(s,n)});},
 complete(s){if(!independent)post('completed',{scene:6,metrics:C.metrics(s)});},
 ready(fn){restore=fn;ready=true;post('ready');},
 isClassroom(){return !independent;},
 requestRestart(){if(!independent){post('restart-request');return true;}return false;}
};
})();
