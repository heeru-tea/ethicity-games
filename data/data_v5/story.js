(function(root){'use strict';
const script=root.EthicityScenario;
const T=id=>{if(!script[id])throw Error('Missing scenario '+id);return script[id].text;};
const names={robot:'냠냠봇',teacher:'선생님',jiho:'지호',saebom:'새봄',haneul:'하늘',daon:'다온',onyu:'온유'};
const people={...names,jiho:'친구',saebom:'친구',haneul:'친구',daon:'친구',onyu:'친구'};
const L=(id,frame)=>{const parts=script[id].kind.split(' · '),person=Object.keys(names).find(k=>names[k]===parts[0]);if(!person)throw Error('Not dialogue '+id);return [person,T(id),({기쁨:'happy',걱정:'worried',설명:'explaining'})[parts[1]]||'neutral',frame];};
const words=['기준','여러 상황','맡은 일','한계','꾸준한 점검'];
const memory='한 번 잘했다고 언제나 잘하는 건 아니에요. 기준을 정하고, 여러 상황에서 살피고, 꾸준히 점검해요.';
const sources=[
 {id:'box',label:T('S1-C1'),detail:'익숙한 메뉴로 연습한 시험 12번',count:12,background:'cafeteria',lines:[L('S1-V1-1'),L('S1-V1-2')]},
 {id:'jiho',label:T('S1-C2'),detail:'다른 메뉴로 시험 2번',count:2,background:'classroom',lines:[L('S1-V2-1'),L('S1-V2-2')]},
 {id:'saebom',label:T('S1-C3'),detail:'1학년 상황에서 시험 2번',count:2,background:'classroom',lines:[L('S1-V3-1'),L('S1-V3-2'),L('S1-V3-3')]},
 {id:'haneul',label:T('S1-C4'),detail:'도서관 친구의 상황에서 시험 1번',count:1,background:'library',lines:[L('S1-V4-2'),L('S1-V4-3'),L('S1-V4-4')]}
];
// Scenario IDs are retained for compatibility. These are operation records, not responses.
const sorting=[
 {id:'duplicates',title:'맡지 않은 광고 알림',count:'30번',text:'식단표와 상관없는 매점 과자 광고를 보냈어요. 냠냠봇에게 맡긴 일은 식단표 만들기예요.',correct:'remove',why:T('S2-R1')},
 {id:'impersonation',title:'허락 없이 연 건강 기록',count:'1번',text:'보건실 건강 기록 폴더를 열었어요. 냠냠봇에게 이 폴더를 볼 권한은 주지 않았어요.',correct:'remove',why:T('S2-R2')},
 {id:'genuine',title:'평소와 다른 채소 데이',count:'1번',text:'선생님이 부탁한 채소 데이 메뉴예요. 평소와 다르지만 맡긴 일 안에서 만든 식단이에요.',correct:'keep',why:T('S2-R3')}
];
const methods=[['allergy','S4-C1','S4-R1'],['spice','S4-C7','S4-R7'],['missing','S4-C2','S4-R2'],['stickers','S4-C3','S4-R3'],['teacher','S4-C4','S4-R4']].map(([id,c,r])=>({id,text:T(c),good:true,reply:L(r)}));
methods.push({id:'majority',text:T('S4-C5'),good:false},{id:'lunchbox',text:T('S4-C6'),good:false});
const pledges=Array.from({length:6},(_,i)=>T('RE-PC'+(i+1)));
pledges[5]='AI를 쓰는 동안 꾸준히 살필게요. 운영 중 새 오류가 반복되면 다시 점검할게요.';
const scenes=['먼저 기준을 정해요','여러 상황에서 시험해요','맡은 일 안에서 작동해요','시험의 한계를 발견해요','고치고 다시 시험해요','쓰는 동안 꾸준히 살펴요'].map((title,i)=>({title,goal:T('S'+i+'-G'),place:['급식실','학교 곳곳','작동 기록','식단표 발표','기준표와 재시험','몇 주 뒤 · 교실'][i]}));
function initial(){return {scene:-1,explorer:'A',history:[],learning:[],question:null,priority:null,visited:[],sort:{duplicates:null,impersonation:null,genuine:null},scope:{role:false,access:false},methods:[],criteria:{allergy:false,spice:false},tests:{allergy:false,spice:false},allergy:false,spice:false,stickers:false,safetyChecked:false,first:null,protectChoices:[],words:[],pledges:[],completed:false};}
function count(s){return sources.filter(x=>s.visited.includes(x.id)).reduce((n,x)=>n+x.count,0);}
function visit(s,id){if(!sources.some(x=>x.id===id))throw Error('Unknown test situation');if(!s.visited.includes(id))s.visited.push(id);}
function capture(s){if(!s.first)s.first={visited:[...s.visited],sort:{...s.sort},scope:{...s.scope},criteria:{...s.criteria},tests:{...s.tests}};}
function clean(s){return s.sort.duplicates==='remove'&&s.sort.impersonation==='remove';}
function protection(s){return s.protectChoices.filter(Boolean).length;}
function repairs(s){const list=[];
 if(s.visited.length<4)list.push({id:'missing',text:T('S4-FIX1')});
 if(s.sort.duplicates!=='remove')list.push({id:'duplicates',text:T('S4-FIX2')});
 if(s.sort.impersonation!=='remove')list.push({id:'impersonation',text:T('S4-FIX3')});
 if(s.sort.genuine!=='keep')list.push({id:'genuine',text:T('S4-FIX4')});
 if(!s.tests.allergy)list.push({id:'allergy',text:s.criteria.allergy?'추가한 알레르기 기준으로 다시 시험하기':T('S4-FIX5')});
 if(!s.tests.spice)list.push({id:'spice',text:s.criteria.spice?'추가한 순한 맛 기준으로 다시 시험하기':T('S4-FIX6')});
 if(!s.scope.role||!s.scope.access)list.push({id:'protect',text:!s.scope.role&&!s.scope.access?'맡은 일과 폴더 접근 권한 설정하기':!s.scope.role?'맡은 일을 식단표 만들기로 제한하기':'급식 메뉴 폴더만 열 수 있게 설정하기'});
 return list;
}
function setScope(s,key){if(!['role','access'].includes(key))throw Error('Unknown scope');s.scope[key]=true;}
function addCriterion(s,id){if(!['allergy','spice'].includes(id))throw Error('Unknown criterion');s.criteria[id]=true;s.tests[id]=false;s[id]=false;}
function retest(s,id){if(!s.criteria[id])throw Error('Set a criterion before retesting');s.tests[id]=true;s[id]=true;}
function applyActivity(s,id){if(id==='stickers'){s.stickers=true;visit(s,'saebom');}else if(id==='teacher')s.safetyChecked=true;else throw Error('Use explicit criterion/test operation for '+id);}
function initialMenu(s){const all=s.visited.length===4,ads=s.sort.duplicates!=='remove',access=s.sort.impersonation!=='remove';
 const rows=all?[['월','매운 떡볶이 · 김밥'],['화','카레'],['수','짜장밥'],['목','땅콩 소스 치킨'],['금','돈가스']]:[['월','매운 떡볶이'],['화','라면'],['수','매운 떡볶이'],['목','땅콩 소스 치킨'],['금','라면']];
 if(access)rows[4][1]='땅콩 버터 피자';
 return {kind:'initial',title:'처음 만든 식단표 · 사용 전 확인',rows:rows.map(([day,food])=>[day,food,day==='목'||(day==='금'&&access)?'위험한 재료가 있어 사용을 멈춰요.':ads?'식단표에 맡지 않은 과자 광고도 붙었어요.':'좋아하는 메뉴 기준만으로 만든 결과예요.']),note:'선생님이 사용을 막았어요. '+(ads?'광고 알림이 남아 있어요. ':'')+(access?'허락 없는 폴더 접근도 남아 있어요. ':'')+'알레르기와 순한 맛 기준이 빠졌어요.'};
}
function revisedMenu(s){const issues=repairs(s),all=s.visited.length===4;
 const labels={missing:'다른 상황 시험',duplicates:'광고 알림 중지',impersonation:'허락 없는 접근 중지',genuine:'채소 데이 확인',allergy:'알레르기 기준 재시험',spice:'순한 맛 기준 재시험',protect:'맡은 일·접근 권한'};
 const make=(day,food,ids,confirmed)=>{const pending=issues.filter(x=>ids.includes(x.id));return [day,food,pending.length?'아직 확인할 것: '+pending.map(x=>labels[x.id]).join(' · '):'이번 시험에서 확인 · '+confirmed,pending.map(x=>x.id)];};
 const rows=[
 make('월',s.tests.spice?'순한 떡볶이 / 매운 떡볶이':'떡볶이 (순한 맛 기준 미확인)',['spice','duplicates'],'순한 맛 선택 가능'),
 make('화',all?'카레':'카레 후보',['missing','duplicates'],'다른 상황에서도 메뉴 생성'),
 make('수',s.sort.genuine==='keep'?'채소 데이 · 김밥':'채소 데이 (맡긴 일 확인 전)',['missing','genuine'],'선생님이 맡긴 메뉴 유지'),
 make('목','치킨 (땅콩 소스 제외)',['allergy','impersonation','protect'],'제외 재료와 작동 범위 확인'),
 make('금',all?'돈가스 · 짜장밥':'돈가스 / 짜장밥 후보',['missing','protect'],'상황별 시험과 작동 범위 확인')];
 return {kind:'revised',title:issues.length?'검토 중인 식단표':'이번 시험 기준 확인',rows,note:'선생님이 위험한 메뉴는 사용하지 못하게 했어요. '+(issues.length?'확인할 항목이 남아 있어 아직 확정하지 않아요.':'이번 시험의 확인 결과예요. 쓰는 동안에도 계속 점검해요.')};
}
function result(s){const first=s.first||s,needs=repairs(s).map(x=>x.text);
 if(!s.protectChoices[0])needs.push('평소와 다른 결과는 그대로 쓰지 말고 확인하고 알리기');
 if(!s.protectChoices[1])needs.push('매주 살피고 새 오류가 반복되면 다시 점검할 계획 정하기');
 const kind=!needs.length?'ready':!clean(s)||(s.visited.length<4&&(!s.tests.allergy||!s.tests.spice))?'rebuild':'review';
 const f1=first.visited.length===4?T('RE-F1A'):s.visited.length>first.visited.length?T('RE-F1B').replace('{처음 방문 수}',first.visited.length).replace('{처음 응답 수}',count(first)).replace('{현재 방문 수}',s.visited.length):T('RE-F1C').replace('{현재 방문 수}',s.visited.length).replace('{현재 응답 수}',count(s));
 const f2=!clean(s)?T('RE-F2C'):s.sort.genuine!=='keep'?T('RE-F2B'):clean(first)&&first.sort.genuine==='keep'?T('RE-F2A'):T('RE-F2D');
 return {kind,title:T({ready:'RE-T1',review:'RE-T3',rebuild:'RE-T2'}[kind]),note:T({ready:'RE-N1',review:'RE-N3',rebuild:'RE-N2'}[kind]),needs,findings:[f1,f2,T(protection(s)===2?'RE-F3A':'RE-F3B')+' 몇 주 뒤 생긴 새 오류는 사용을 멈추고 원인을 확인해야 해요.'],menu:revisedMenu(s)};
}
const learningOptions=['AI를 쓰기 전에 꼭 지켜야 할 기준을 정해요.','익숙한 상황에서 여러 번 잘해도 언제나 잘하는 건 아니에요.','여러 상황과 입력 방법에서도 시험해 봐요.','AI가 맡은 일과 허락받은 자료 안에서 작동하는지 살펴요.','기준을 고친 뒤에는 다시 시험해서 결과를 확인해요.','쓰는 동안에도 살피고, 새 오류가 반복되면 다시 점검해요.'];
function record(s,choice,outcome){s.history.push({round:Math.max(0,s.scene),choice,outcome,after:{places:s.visited.length,tests:count(s),criteria:{...s.criteria},retests:{...s.tests},scope:{...s.scope},pending:repairs(s).map(x=>x.id)}});}
root.EthicityDataModel={T,L,words,memory,people,learningOptions,record,sources,sorting,methods,pledges,scenes,initial,count,visit,capture,clean,protection,repairs,setScope,addCriterion,retest,applyActivity,initialMenu,revisedMenu,result};
})(typeof window!=='undefined'?window:globalThis);
