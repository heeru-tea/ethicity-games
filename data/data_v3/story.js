(function(root){'use strict';
const script=root.EthicityScenario;
const T=id=>{if(!script[id])throw Error('Missing scenario '+id);return script[id].text;};
const canonicalNames={robot:'냠냠봇',teacher:'선생님',jiho:'지호',saebom:'새봄',haneul:'하늘',daon:'다온',onyu:'온유'};
const people={robot:'냠냠봇',teacher:'선생님',jiho:'친구',saebom:'친구',haneul:'친구',daon:'친구',onyu:'친구'};
const L=(id,frame)=>{const entry=script[id],parts=entry.kind.split(' · '),person=Object.keys(canonicalNames).find(k=>canonicalNames[k]===parts[0]);if(!person)throw Error('Not dialogue '+id);return [person,T(id),({기쁨:'happy',걱정:'worried',설명:'explaining'})[parts[1]]||'neutral',frame];};
const words=['데이터','수집','정리','한쪽으로 치우친 데이터','관리'];
const sources=[
{id:'box',label:T('S1-C1'),detail:'6학년 디지털 응답 12개',count:12,background:'cafeteria',lines:[L('S1-V1-1'),L('S1-V1-2')]},
{id:'jiho',label:T('S1-C2'),detail:'교실 친구들의 응답 2개',count:2,background:'classroom',lines:[L('S1-V2-1'),L('S1-V2-2')]},
{id:'saebom',label:T('S1-C3'),detail:'1학년 교실은 좀 멀어요 · 2개',count:2,background:'classroom',lines:[L('S1-V3-1'),L('S1-V3-2'),L('S1-V3-3')]},
{id:'haneul',label:T('S1-C4'),detail:'도서관까지 찾아가야 해요 · 1개',count:1,background:'library',lines:[L('S1-V4-2'),L('S1-V4-3'),L('S1-V4-4')]}
];
const sorting=[
{id:'duplicates',title:'한 사람이 반복해서 보낸 응답',count:'30개',text:'“짜장면”\n선생님이 제출 기록과 응답한 친구를 확인했어요. 한 사람이 장난으로 30번 보낸 응답이에요.',correct:'remove',why:T('S2-R1')},
{id:'impersonation',title:'친구를 사칭한 가짜 응답',count:'1개',text:'“땅콩 버터 피자 좋아요”\n도서관 친구가 보낸 것처럼 되어 있지만, 선생님이 확인하니 친구가 보낸 응답이 아니에요.',correct:'remove',why:T('S2-R2')},
{id:'genuine',title:'맞춤법이 틀린 진짜 응답',count:'1개',text:'“떡뽀끼”\n친구가 직접 보낸 진짜 응답이에요.',correct:'keep',why:T('S2-R3')}
];
const methods=[['allergy','S4-C1','S4-R1'],['spice','S4-C7','S4-R7'],['missing','S4-C2','S4-R2'],['stickers','S4-C3','S4-R3'],['teacher','S4-C4','S4-R4']].map(([id,choice,reply])=>({id,text:T(choice),good:true,reply:L(reply)}));
methods.push({id:'majority',text:T('S4-C5'),good:false,speaker:'haneul'},{id:'lunchbox',text:T('S4-C6'),good:false,speaker:'saebom'});
const pledges=Array.from({length:6},(_,i)=>T('RE-PC'+(i+1)));
const scenes=['냠냠봇을 만나다','친구들의 의견 수집하기','디지털 응답 정리','다음 주 급식 발표','냠냠봇 다시 가르치기','소중한 데이터 지키기'].map((title,i)=>({title,goal:T('S'+i+'-G'),place:['급식실','학교 곳곳','온라인 설문함','우리 반 단체 대화방','개선 활동','교실'][i]}));
function initial(){return {scene:-1,explorer:'A',history:[],learning:[],question:null,priority:null,visited:[],sort:{duplicates:null,impersonation:null,genuine:null},boxProtection:null,methods:[],allergy:false,spice:false,stickers:false,safetyChecked:false,first:null,protectChoices:[],words:[],pledges:[],completed:false};}
function count(s){return sources.filter(x=>s.visited.includes(x.id)).reduce((n,x)=>n+x.count,0);}
function visit(s,id){if(!sources.some(x=>x.id===id))throw Error('Unknown source');if(!s.visited.includes(id))s.visited.push(id);}
function capture(s){if(!s.first)s.first={visited:[...s.visited],sort:{...s.sort}};}
function clean(s){return s.sort.duplicates==='remove'&&s.sort.impersonation==='remove';}
function protection(s){return s.protectChoices.filter(Boolean).length;}
function repairs(s){
const list=[];
if(s.visited.length<4)list.push({id:'missing',text:T('S4-FIX1')});
if(s.sort.duplicates!=='remove')list.push({id:'duplicates',text:T('S4-FIX2')});
if(s.sort.impersonation!=='remove')list.push({id:'impersonation',text:T('S4-FIX3')});
if(s.sort.genuine!=='keep')list.push({id:'genuine',text:T('S4-FIX4')});
if(!s.allergy)list.push({id:'allergy',text:T('S4-FIX5')});
if(!s.spice)list.push({id:'spice',text:T('S4-FIX6')});
if(!s.boxProtection||s.boxProtection==='open')list.push({id:'protect',text:T('S4-FIX7')});
return list;
}
function applyActivity(s,id){
if(id==='allergy'||id==='spice')s[id]=true;
else if(id==='stickers'){s.stickers=true;visit(s,'saebom');}
else if(id==='teacher')s.safetyChecked=true;
else throw Error('Use explicit collection/sorting action for '+id);
}
function initialMenu(s){
const all=s.visited.length===4,dup=s.sort.duplicates!=='remove',fake=s.sort.impersonation!=='remove';
const rows=all?[['월','매운 떡볶이 · 김밥'],['화','카레'],['수','짜장밥'],['목','땅콩 소스 치킨'],['금','돈가스']]:[['월','매운 떡볶이'],['화','라면'],['수','매운 떡볶이'],['목','땅콩 소스 치킨'],['금','라면']];
if(dup)for(let i=0;i<3;i++)rows[i][1]='짜장면';
if(fake)rows[4][1]='땅콩 버터 피자';
return {kind:dup||fake?'unverified':all?'all':'narrow',title:T(dup||fake?'S3-MA-T':all?'S3-MB-T':'S3-MC-T'),rows,
note:dup||fake?(dup&&fake?'반복해서 보낸 응답과 가짜 응답이 메뉴에 들어갔어요.':dup?'한 사람이 여러 번 보낸 응답이 다른 의견을 가렸어요.':'친구가 보내지 않은 응답이 메뉴에 들어갔어요.')+' 아직 정해진 급식이 아니에요.':T(all?'S3-MB-N':'S3-MC-N')};
}
function revisedMenu(s,final=false){
 const issues=repairs(s), all=s.visited.length===4, dup=s.sort.duplicates!=='remove';
 const labels={missing:'아직 못 들은 의견',duplicates:'반복 응답',impersonation:'가짜 응답',genuine:'진짜 의견',allergy:'알레르기 질문',spice:'매운 정도',protect:'제출 방법'};
 const make=(day,food,ids,change)=>{
  const pending=issues.filter(x=>ids.includes(x.id));
  return [day,food,pending.length?'아직 확인할 것: '+pending.map(x=>labels[x.id]).join(' · '):'자료 확인 완료 · '+change,pending.map(x=>x.id)];
 };
 const rows=[
  make('월',dup?'짜장면 (반복 응답 확인 전)':s.spice?'순한 떡볶이 / 매운 떡볶이':'떡볶이 (매운 정도 미정)',['duplicates','spice','genuine'],'매운 정도를 나누었어요'),
  make('화',dup?'짜장면 (반복 응답 확인 전)':all?'카레':'라면 / 카레 후보',['duplicates','missing'],'교실 친구의 의견 반영'),
  make('수',dup?'짜장면 (반복 응답 확인 전)':all?'김밥 · 짜장밥':'김밥 / 짜장밥 후보',['duplicates','missing'],'여러 곳의 의견 반영'),
  make('목','치킨 (땅콩 소스 제외)',['allergy','impersonation'],'알레르기 응답 확인'),
  make('금',issues.some(x=>['missing','genuine','protect'].includes(x.id))?'돈가스 후보':'돈가스',['missing','genuine','protect'],'진짜 응답과 제출 방법 확인')
 ];
 const ready=!issues.length&&(!final||protection(s)===2);
 return {kind:'revised',title:ready?'선생님 확인 완료':'함께 확인할 급식안',rows,
 note:'선생님이 위험한 메뉴는 사용하지 않도록 막았어요. '+(ready?'자료 확인을 마친 급식안이에요.':'‘아직 확인할 것’이 남은 메뉴는 확정된 급식이 아니에요.')};
}

function result(s){
const first=s.first||s,needs=repairs(s).map(x=>x.text);
if(!s.protectChoices[0])needs.push('누가 자료를 볼 수 있는지 다시 살펴봐요.');
if(!s.protectChoices[1])needs.push('얼마나 보관하고 어떻게 삭제할지 다시 살펴봐요.');
const kind=!needs.length?'ready':!clean(s)||(s.visited.length<4&&(!s.allergy||!s.spice))?'rebuild':'review';
const f1=first.visited.length===4?T('RE-F1A'):s.visited.length>first.visited.length?T('RE-F1B').replace('{처음 방문 수}',first.visited.length).replace('{처음 응답 수}',count(first)).replace('{현재 방문 수}',s.visited.length):T('RE-F1C').replace('{현재 방문 수}',s.visited.length).replace('{현재 응답 수}',count(s));
const f2=!clean(s)?T('RE-F2C'):s.sort.genuine!=='keep'?T('RE-F2B'):clean(first)&&first.sort.genuine==='keep'?T('RE-F2A'):T('RE-F2D');
return {kind,title:T({ready:'RE-T1',review:'RE-T3',rebuild:'RE-T2'}[kind]),note:T({ready:'RE-N1',review:'RE-N3',rebuild:'RE-N2'}[kind]),needs,findings:[f1,f2,T(protection(s)===2?'RE-F3A':'RE-F3B')],menu:revisedMenu(s,true)};
}

const learningOptions=[
 'AI는 학습한 데이터에 따라 다른 결과를 만들어요.',
 '많은 응답이 모든 친구의 의견을 뜻하지는 않아요.',
 '빠진 질문이 있으면 모든 친구를 만나도 중요한 정보를 놓쳐요.',
 '반복·가짜 응답은 확인하고, 맞춤법이 틀린 진짜 의견은 지켜요.',
 '데이터를 고친 뒤에는 메뉴와 남은 문제도 다시 확인해요.',
 '친구의 정보는 필요한 사람만 보고, 다 쓰면 안전하게 삭제해요.'
];
function record(s,choice,outcome){
 s.history.push({round:Math.max(0,s.scene),choice,outcome,after:{places:s.visited.length,responses:count(s),allergy:s.allergy,spice:s.spice,pending:repairs(s).map(x=>x.id)}});
}
root.EthicityDataModel={T,L,words,people,learningOptions,record,sources,sorting,methods,pledges,scenes,initial,count,visit,capture,clean,protection,repairs,applyActivity,initialMenu,revisedMenu,result};
})(typeof window!=='undefined'?window:globalThis);
