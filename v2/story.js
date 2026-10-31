(function(root){'use strict';
const script=root.EthicityScenario;
const T=id=>{if(!script[id])throw Error('Missing scenario '+id);return script[id].text;};
const people={robot:'냠냠봇',teacher:'선생님',jiho:'지호',saebom:'새봄',haneul:'하늘',daon:'다온',onyu:'온유'};
const L=(id,frame)=>{const entry=script[id],parts=entry.kind.split(' · '),person=Object.keys(people).find(k=>people[k]===parts[0]);if(!person)throw Error('Not dialogue '+id);return [person,T(id),({기쁨:'happy',걱정:'worried',설명:'explaining'})[parts[1]]||'neutral',frame];};
const words=['데이터','수집','정리','한쪽으로 치우친 데이터','관리'];
const sources=[
{id:'box',label:T('S1-C1'),detail:'6학년 디지털 응답 12개',count:12,background:'cafeteria',lines:[L('S1-V1-1'),L('S1-V1-2')]},
{id:'jiho',label:T('S1-C2'),detail:'지호와 다른 친구의 응답 2개',count:2,background:'classroom',lines:[L('S1-V2-1'),L('S1-V2-2')]},
{id:'saebom',label:T('S1-C3'),detail:'1학년 교실은 좀 멀어요 · 2개',count:2,background:'classroom',lines:[L('S1-V3-1'),L('S1-V3-2'),L('S1-V3-3')]},
{id:'haneul',label:T('S1-C4'),detail:'도서관까지 찾아가야 해요 · 1개',count:1,background:'library',lines:[L('S1-V4-2'),L('S1-V4-3'),L('S1-V4-4')]}
];
const sorting=[
{id:'duplicates',title:'한 사람이 반복해서 보낸 응답',count:'30개',text:'“짜장면”\n선생님이 제출 기록과 응답한 친구를 확인했어요. 한 사람이 장난으로 30번 보낸 응답이에요.',correct:'remove',why:T('S2-R1')},
{id:'impersonation',title:'하늘의 이름으로 보낸 가짜 응답',count:'1개',text:'“하늘: 땅콩 버터 피자”\n선생님이 하늘에게 본인이 보낸 응답인지 확인했어요.',correct:'remove',why:T('S2-R2')},
{id:'genuine',title:'맞춤법이 틀린 진짜 응답',count:'1개',text:'“떡뽀끼”\n친구가 직접 보낸 진짜 응답이에요.',correct:'keep',why:T('S2-R3')}
];
const methods=[['allergy','S4-C1','S4-R1'],['spice','S4-C7','S4-R7'],['missing','S4-C2','S4-R2'],['stickers','S4-C3','S4-R3'],['teacher','S4-C4','S4-R4']].map(([id,choice,reply])=>({id,text:T(choice),good:true,reply:L(reply)}));
methods.push({id:'majority',text:T('S4-C5'),good:false,speaker:'haneul'},{id:'lunchbox',text:T('S4-C6'),good:false,speaker:'saebom'});
const pledges=Array.from({length:6},(_,i)=>T('RE-PC'+(i+1)));
const scenes=['냠냠봇을 만나다','친구들의 의견 모으기','디지털 응답 정리','다음 주 급식 발표','냠냠봇 다시 가르치기','소중한 데이터 지키기'].map((title,i)=>({title,goal:T('S'+i+'-G'),place:['급식실','학교 곳곳','온라인 설문함','우리 반 단체 대화방','개선 활동','교실'][i]}));
function initial(){return {scene:-1,visited:[],sort:{duplicates:null,impersonation:null,genuine:null},boxProtection:null,methods:[],allergy:false,spice:false,stickers:false,safetyChecked:false,first:null,protectChoices:[],words:[],pledges:[],completed:false};}
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
note:dup||fake?(dup&&fake?'반복해서 보낸 응답과 가짜 응답이 메뉴에 들어갔어요.':dup?'한 사람이 여러 번 보낸 응답이 다른 의견을 가렸어요.':'하늘이 보내지 않은 응답이 메뉴에 들어갔어요.')+' 아직 정해진 급식이 아니에요.':T(all?'S3-MB-N':'S3-MC-N')};
}
function revisedMenu(s,final=false){
const ready=!repairs(s).length&&(!final||protection(s)===2);
return {kind:'revised',title:final?(ready?'선생님 확인 완료':'검토 중인 안'):T('S4-M-T'),
rows:[['월','순한 떡볶이 / 매운 떡볶이','매운 정도를 고를 수 있어요'],['화','카레'],['수','김밥'],['목','치킨 · 짜장밥','땅콩 소스를 제외했어요'],['금','돈가스']],
note:final?T(ready?'RE-N1':'RE-N3'):T(ready?'S4-M-N':'S4-M-N2')};
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
root.EthicityDataModel={T,L,words,people,sources,sorting,methods,pledges,scenes,initial,count,visit,capture,clean,protection,repairs,applyActivity,initialMenu,revisedMenu,result};
})(typeof window!=='undefined'?window:globalThis);
