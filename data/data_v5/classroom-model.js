(function(root){'use strict';
const mask=(items,allowed)=>allowed.reduce((n,x,i)=>n+(items.includes(x)?2**i:0),0);
const ids=['box','jiho','saebom','haneul'];
const metrics=s=>({visits:mask(s.visited,ids),sortA:[null,'keep','remove'].indexOf(s.sort.duplicates),sortB:[null,'keep','remove'].indexOf(s.sort.impersonation),sortC:[null,'keep','remove'].indexOf(s.sort.genuine),scope:Number(s.scope.role)+2*Number(s.scope.access),criteria:Number(s.criteria.allergy)+2*Number(s.criteria.spice),tests:Number(s.tests.allergy)+2*Number(s.tests.spice),monitor:Number(!!s.protectChoices[0])+2*Number(!!s.protectChoices[1]),methods:mask(s.methods,['allergy','spice','missing','stickers','teacher','majority','lunchbox']),quiz:s.quizChoice||0,reflection:s.reflectionChoice||0,candidate:s.questionChoice||0,learning:mask(s.learning,[0,1,2,3,4,5])});
function checkpoint(s,completedScene){
 const copy=JSON.parse(JSON.stringify(s));
 // Only predefined game choices cross this boundary. All custom prose stays in the game iframe.
 copy.question=null;
 copy.history=copy.history.filter(row=>!row.choice.startsWith('기준 후보: ')).slice(-400);
 return {schema:1,completedScene,state:copy};
}
function validateCheckpoint(cp){return !!cp&&cp.schema===1&&Number.isInteger(cp.completedScene)&&cp.completedScene>=0&&cp.completedScene<=5&&cp.state&&Array.isArray(cp.state.history)&&Array.isArray(cp.state.visited)&&Array.isArray(cp.state.words)&&cp.state.sort&&cp.state.scope&&cp.state.criteria&&cp.state.tests;}
function aggregate(rows,members,scene){
 const active=new Set(members.filter(x=>x.mode==='classroom').map(x=>x.uid));
 const answers=rows.filter(x=>x.scene===scene&&active.has(x.uid));
 const definitions=[
  [['기준부터 살펴보기','quiz',1],['글씨부터 살펴보기','quiz',2],['빠르기부터 살펴보기','quiz',3]],
  [['4곳에서 시험','visits',15],['익숙한 시험만 확인','visits',1],['그 밖의 시험 조합','visits',v=>v!==15&&v!==1]],
  [['광고 알림 중지','sortA',2],['건강 기록 접근 중지','sortB',2],['채소 데이 유지','sortC',1],['맡은 일·권한 모두 설정','scope',3]],
  [['냠냠봇이 매운 걸 좋아해서','reflection',1],['꼭 필요한 기준이 빠져서','reflection',2],['시험 때 잘했으니 문제없다','reflection',3]],
  [['알레르기·순한 맛 모두 재시험','tests',3],['일부 재시험','tests',v=>v===1||v===2],['아직 재시험하지 않음','tests',0]],
  [['새 오류 알리기 + 꾸준한 점검','monitor',3],['둘 중 하나 선택','monitor',v=>v===1||v===2],['둘 다 아직 선택하지 않음','monitor',0]]
 ];
 return {scene,total:answers.length,items:definitions[scene].map(([label,key,value])=>({label,count:answers.filter(x=>typeof value==='function'?value(x.metrics[key]):x.metrics[key]===value).length}))};
}
function gate({independent,room,scene}){if(independent)return null;if(!room)return 'connecting';if(room.ended)return 'ended';if(room.paused)return 'paused';if(scene>room.unlockedScene)return 'waiting';return null;}
root.EthicityClassroomModel={metrics,checkpoint,validateCheckpoint,aggregate,gate};
})(typeof window!=='undefined'?window:globalThis);
