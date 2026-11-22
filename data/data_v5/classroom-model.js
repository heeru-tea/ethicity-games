(function(root){'use strict';
const mask=(items,allowed)=>allowed.reduce((n,x,i)=>n+(items.includes(x)?2**i:0),0);
const ids=['box','jiho','saebom','haneul'];
const phases=['탐험 준비','대화 중','선택 중','결과 확인 중','다음 이야기 대기','탐험 완료'];
const activities={intro:'탐험 안내',rules:'탐험 방법',criteria:'식단 구성 기준표',collect:'적용할 상황 고르기',box:'급식실 · 익숙한 메뉴',jiho:'교실 · 다른 메뉴 요청',saebom:'1학년 · 매운 정도',haneul:'도서관 · 알레르기','sort-duplicates':'광고 보내기 기능','sort-impersonation':'건강 기록 접근','sort-genuine':'채소 데이 구성',permissions:'허용된 기능과 접근 권한',menu:'월~금 식단표 확인',reflect:'원인 생각하기',candidates:'추가할 성능 기준',methods:'개선 방법 2개 선택','repair-allergy':'알레르기 기준 수정·적용','repair-spice':'순한 맛 기준 수정·적용','repair-missing':'다른 상황에 추가 적용','repair-stickers':'그림 입력 적용','repair-teacher':'선생님과 기준 확인','repair-majority':'연습 결과만 믿은 선택','repair-lunchbox':'메뉴만 지운 선택',priorities:'미해결 항목 확인',monitor:'운영 중 새 오류',plan:'지속적 점검 계획',summary:'선택과 학습 내용 정리',pledges:'실천 약속 선택',finish:'약속 확인과 PNG 저장',waiting:'이야기 완료',complete:'탐험 완료'};
function validView(v){return !!v&&Number.isInteger(v.phase)&&v.phase>=0&&v.phase<phases.length&&Object.hasOwn(activities,v.activity);}
function viewLabel(v){return validView(v)?activities[v.activity]:'상황 확인 중';}
const metrics=s=>({visits:mask(s.visited,ids),sortA:[null,'keep','remove'].indexOf(s.sort.duplicates),sortB:[null,'keep','remove'].indexOf(s.sort.impersonation),sortC:[null,'keep','remove'].indexOf(s.sort.genuine),scope:Number(s.scope.role)+2*Number(s.scope.access),criteria:Number(s.criteria.allergy)+2*Number(s.criteria.spice),tests:Number(s.tests.allergy)+2*Number(s.tests.spice),monitor:Number(!!s.protectChoices[0])+2*Number(!!s.protectChoices[1]),methods:mask(s.methods,['allergy','spice','missing','stickers','teacher','majority','lunchbox']),quiz:s.quizChoice||0,reflection:s.reflectionChoice||0,candidate:s.questionChoice||0,learning:mask(s.learning,[0,1,2,3,4,5])});
function checkpoint(s,completedScene){
 const copy=JSON.parse(JSON.stringify(s));
 // Only predefined game choices cross this boundary. All custom prose stays in the game iframe.
 copy.question=null;
 copy.history=copy.history.filter(row=>!row.choice.startsWith('기준 후보: ')).slice(-400);
 return {schema:2,completedScene,state:copy};
}
function validateCheckpoint(cp){return !!cp&&[1,2].includes(cp.schema)&&Number.isInteger(cp.completedScene)&&cp.completedScene>=-1&&cp.completedScene<=5&&cp.state&&Array.isArray(cp.state.history)&&Array.isArray(cp.state.visited)&&Array.isArray(cp.state.words)&&cp.state.sort&&cp.state.scope&&cp.state.criteria&&cp.state.tests;}
function aggregate(rows,members,scene){
 const active=new Set(members.filter(x=>x.mode==='classroom').map(x=>x.uid));
 const answers=rows.filter(x=>x.scene===scene&&active.has(x.uid));
 const definitions=[
  [['기준부터 살펴보기','quiz',1],['글씨부터 살펴보기','quiz',2],['빠르기부터 살펴보기','quiz',3]],
  [['4곳에서 시험','visits',15],['익숙한 시험만 확인','visits',1],['그 밖의 시험 조합','visits',v=>v!==15&&v!==1]],
  [['광고 알림 중지','sortA',2],['건강 기록 접근 중지','sortB',2],['채소 데이 유지','sortC',1],['권한이 허용된 일·권한 모두 설정','scope',3]],
  [['냠냠봇이 매운 걸 좋아해서','reflection',1],['꼭 필요한 기준이 빠져서','reflection',2],['시험 때 잘했으니 문제없다','reflection',3]],
  [['알레르기·순한 맛 모두 재시험','tests',3],['일부 재시험','tests',v=>v===1||v===2],['아직 재시험하지 않음','tests',0]],
  [['새 오류 알리기 + 지속적 점검','monitor',3],['둘 중 하나 선택','monitor',v=>v===1||v===2],['둘 다 아직 선택하지 않음','monitor',0]]
 ];
 return {scene,total:answers.length,items:definitions[scene].map(([label,key,value])=>({label,count:answers.filter(x=>typeof value==='function'?value(x.metrics[key]):x.metrics[key]===value).length}))};
}
function gate({independent,room,scene}){if(independent)return null;if(!room)return 'connecting';if(room.ended)return 'ended';if(room.paused)return 'paused';if(scene!==room.unlockedScene)return 'waiting';return null;}
root.EthicityClassroomModel={metrics,checkpoint,validateCheckpoint,aggregate,gate,phases,activities,validView,viewLabel};
})(typeof window!=='undefined'?window:globalThis);
