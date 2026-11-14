(function(){'use strict';
const hosted=parent!==window,embedded=hosted&&new URLSearchParams(location.search).get('classroom')==='1';
const C=window.EthicityClassroomModel;
const independent=!embedded;
let room=null,scene=-1,ready=false,initialized=false,waiting=false,completedScene=-1,adapter=null;
const post=(kind,data={})=>{if(hosted)parent.postMessage({channel:'ethicity-data-v5',kind,...data},location.origin);};
function dialog(reason){
 let d=document.getElementById('classroom-wait');
 if(!d){d=document.createElement('dialog');d.id='classroom-wait';d.className='ee-panel classroom-wait';d.innerHTML='<h2 id="wait-title"></h2><p id="wait-text"></p>';d.setAttribute('aria-labelledby','wait-title');d.addEventListener('cancel',e=>e.preventDefault());document.body.append(d);}
 const copy={connecting:['수업에 연결하고 있어요','선생님과 연결 상태를 확인해 주세요.'],waiting:['선생님의 다음 이야기를 기다려요','내 선택은 그대로 있어요. 선생님이 이야기를 열면 모두 함께 이동해요.'],paused:['잠시 함께 이야기해요','선생님이 잠시 멈췄어요. 내 선택과 결과는 바뀌지 않아요.'],ended:['수업이 끝났어요','오늘 고른 선택과 그 까닭을 선생님과 함께 이야기해요.']};
 d.querySelector('h2').textContent=copy[reason][0];d.querySelector('p').textContent=copy[reason][1];if(!d.open)d.showModal();
}
function refresh(){
 if(independent||!ready||!initialized)return;
 const target=room?.unlockedScene;
 if(!room?.ended&&!room?.paused&&Number.isInteger(target)&&target>=0&&target<=6&&scene!==target){
  scene=target;waiting=false;document.getElementById('classroom-wait')?.close();adapter.move(target);
 }
 const reason=C.gate({independent,room,scene})||(waiting?'waiting':null);
 if(reason){dialog(reason);return;}
 document.getElementById('classroom-wait')?.close();
}
window.addEventListener('message',e=>{
 if(!hosted||e.origin!==location.origin||e.source!==parent||e.data?.channel!=='ethicity-data-v5')return;
 const m=e.data;
 if(m.kind==='initialize'&&ready&&!initialized){
  initialized=true;
  if(!independent&&C.validateCheckpoint(m.checkpoint)){completedScene=m.checkpoint.completedScene;adapter.restore(m.checkpoint);}
  adapter.setup(m.explorer);
  if(!independent){room=m.room;refresh();}
 }
 if(m.kind==='control'&&!independent){
  if(room&&m.room?.unlockedScene<room.unlockedScene)return;
  room=m.room;refresh();
 }
});
window.EthicityClassroomBridge={
 gate(n){if(independent)return false;const reason=C.gate({independent,room,scene:n});if(reason||completedScene>=n&&n<6){waiting=true;dialog(reason||'waiting');return true;}scene=n;waiting=false;return false;},
 update(s){if(!independent)post('progress',{scene:s.scene,metrics:C.metrics(s),checkpoint:C.checkpoint(s,completedScene)});},
 boundary(s,n){if(!independent){completedScene=Math.max(completedScene,n);post('boundary',{scene:n,metrics:C.metrics(s),checkpoint:C.checkpoint(s,completedScene)});waiting=true;refresh();}},
 complete(s){if(!independent)post('completed',{scene:6,metrics:C.metrics(s)});},
 ready(callbacks){adapter=callbacks;ready=true;post('ready');},
 isClassroom(){return !independent;},
 requestRestart(){if(!independent){post('restart-request');return true;}return false;}
};
})();
