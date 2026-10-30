(function(root){'use strict';
const words=['데이터','수집','정리','한쪽으로 치우친 데이터','관리'];
const people={robot:'냠냠봇',teacher:'선생님',jiho:'지호',saebom:'새봄',haneul:'하늘',daon:'다온',onyu:'온유',librarian:'사서'};
const sources=[
 {id:'box',label:'급식실 의견함',detail:'6학년 의견 카드가 모여 있어요',count:12,background:'cafeteria',lines:[['robot','6학년 형·누나들 카드가 잔뜩 있어! 돈가스, 라면, 매운 떡볶이, 땅콩 소스 치킨이야.','happy'],['robot','카드 12장! 한꺼번에 많이 모았네.','happy']]},
 {id:'jiho',label:'교실의 지호',detail:'우리 반 친구의 의견을 들어요',count:2,background:'classroom',lines:[['jiho','나는 카레랑 김밥이 좋아! 친구들도 먹기 편하잖아.','happy'],['robot','카레, 김밥. 의견 카드 2장을 받았어.']]},
 {id:'saebom',label:'1학년 교실 앞의 새봄',detail:'1학년 교실은 좀 멀어요',count:2,background:'classroom',lines:[['saebom','내 동생이랑 동생 친구는 치킨이 좋대. 의견 2장을 가져왔어.','happy'],['saebom','내 동생이 1학년인데, 매운 거 먹으면 울어. 근데 그건 어디에 써? 칸이 없네.','worried'],['robot','어… 내 질문지에는 좋아하는 메뉴를 쓰는 칸만 있네.','worried']]},
 {id:'haneul',label:'도서관의 하늘',detail:'도서관까지 찾아가야 해요',count:1,background:'library',lines:[['librarian','하늘이는 창가 자리에 있어요.','explaining'],['haneul','나는 짜장밥이 좋아. 여기 의견 카드 1장!','happy'],['haneul','근데… 못 먹는 건 안 물어보네?','worried'],['robot','지금은 좋아하는 메뉴만 모으고 있어.']]}
];
const sorting=[
 {id:'duplicates',title:'똑같은 글씨, 똑같은 의견',text:'“매일 짜장면!”\n같은 글씨로 쓴 카드가 30장 있어요.',count:'30장',correct:'remove',why:'한 사람이 여러 번 내면 다른 친구들 의견이 묻혀 버려.',speaker:'robot'},
 {id:'impersonation',title:'하늘의 이름이 적힌 카드',text:'“하늘: 땅콩버터 피자 좋아요.”\n하지만 하늘이 쓴 카드가 아니에요.',count:'1장',correct:'remove',why:'남의 이름으로 쓴 의견은 진짜 데이터가 아니야. 게다가 위험할 수도 있어!',speaker:'robot'},
 {id:'genuine',title:'맞춤법이 틀린 진짜 의견',text:'“떡뽀끼 조아요.”\n친구가 직접 쓴 의견이에요.',count:'1장',correct:'keep',why:'글씨가 틀려도 진짜 친구 마음이야. 어떤 뜻인지 살펴보고 의견은 지켜 주자.',speaker:'robot'}
];
const methods=[
 {id:'question',text:'질문지에 ‘못 먹는 음식’ 칸 추가하기',good:true,reply:'좋아. 좋아하는 것뿐 아니라, 안전하게 먹는 데 필요한 것도 물어보자.'},
 {id:'missing',text:'아직 못 만난 친구에게 물어보기',good:true,reply:'아직 듣지 못한 친구가 있으면 더 물어보자. 다 만났다면 빠진 의견이 없는지 다시 확인하자.'},
 {id:'stickers',text:'글쓰기가 어려우면 그림 스티커로 받기',good:true,reply:'글쓰기가 어려운 동생도 자기 생각을 전할 수 있겠네!'},
 {id:'teacher',text:'메뉴를 정하기 전에 선생님께 확인받기',good:true,reply:'먹기 전에 선생님과 안전한지 확인하자.'},
 {id:'majority',text:'투표를 가장 많이 받은 메뉴가 정답이야',good:false,speaker:'haneul'},
 {id:'lunchbox',text:'못 먹는 친구는 도시락을 싸 오면 돼',good:false,speaker:'saebom'}
];
const pledges=['데이터는 여러 친구에게 고르게 모을게요','많은 의견이 꼭 모두의 의견은 아니라는 걸 기억할게요','질문을 만들 때 빠진 사람이 없는지 살펴볼게요','장난으로 데이터를 바꾸지 않을게요','친구의 소중한 정보는 함부로 보여 주지 않을게요','다 쓴 데이터는 안전하게 정리할게요'];
const scenes=[
 {title:'냠냠봇을 만나다',goal:'AI가 배우는 자료를 알아봐요.',place:'급식실',background:'cafeteria'},
 {title:'친구들의 의견 모으기',goal:'어디에서 누구의 의견을 모을까요?',place:'학교 곳곳',background:'cafeteria'},
 {title:'의견 정리하기',goal:'진짜 의견이 잘 들리도록 정리해요.',place:'급식실 · 의견 정리',background:'cafeteria'},
 {title:'다음 주 급식 발표',goal:'누구의 이야기를 놓쳤는지 살펴봐요.',place:'우리 반 단체 대화방',background:'cafeteria'},
 {title:'냠냠봇 다시 가르치기',goal:'함께 먹을 수 있는 방법 2개를 골라요.',place:'우리 반 단체 대화방',background:'cafeteria'},
 {title:'소중한 데이터 지키기',goal:'질문지를 누구와 어떻게 나눌까요?',place:'교실',background:'classroom'}
];
function initial(){return {scene:-1,visited:[],sort:{duplicates:null,impersonation:null,genuine:null},boxProtection:null,methods:[],questionImproved:false,protectChoices:[],words:[],pledges:[],completed:false};}
function count(s){return sources.filter(x=>s.visited.includes(x.id)).reduce((n,x)=>n+x.count,0);}
function clean(s){return s.sort.duplicates==='remove'&&s.sort.impersonation==='remove';}
function protection(s){return s.protectChoices.filter(Boolean).length;}
function initialMenu(s){
 if(!clean(s))return {kind:'unverified',title:'아직 확인하지 않은 급식표',rows:[['월','짜장면'],['화','짜장면'],['수','짜장면'],['목','짜장면'],['금','땅콩버터 피자']],note:'장난 카드가 남아 진짜 의견을 가렸어요. 아직 먹는 메뉴가 아니에요.'};
 if(s.visited.length===4)return {kind:'all',title:'모든 곳을 들러 만든 첫 급식표',rows:[['월','매운 떡볶이 · 김밥'],['화','카레'],['수','짜장밥'],['목','땅콩 소스 치킨'],['금','돈가스']],note:'여러 의견을 들었지만, 질문지에는 못 먹는 음식을 쓰는 칸이 없었어요.'};
 return {kind:'narrow',title:'모은 의견으로 만든 첫 급식표',rows:[['월','매운 떡볶이'],['화','라면'],['수','매운 떡볶이'],['목','땅콩 소스 치킨'],['금','라면']],note:'의견함 카드 12장이 다른 곳의 의견보다 훨씬 많아요.'};
}
function revisedMenu(s){const rows=[['월','순한 떡볶이 / 매운 떡볶이','매운 정도를 고를 수 있어요'],['화','카레'],['수','김밥'],['목','치킨 · 짜장밥','땅콩 소스를 제외했어요'],['금','돈가스']];return {kind:'revised',title:'함께 고친 다음 주 급식표',rows,note:s.questionImproved?'못 먹는 음식도 묻고, 선생님이 안전을 확인해요.':'위험한 메뉴는 선생님이 먼저 바꿨어요. 질문지에도 빠진 칸을 더 살펴봐요.'};}
function result(s){
 const needs=[];
 if(s.visited.length<4)needs.push('아직 듣지 못한 곳의 의견을 더 모아요.');
 if(!clean(s))needs.push('장난 카드와 남의 이름으로 쓴 카드를 다시 살펴봐요.');
 if(s.sort.genuine!=='keep')needs.push('맞춤법이 틀려도 진짜 의견은 지켜요.');
 if(!s.questionImproved)needs.push('질문지에 못 먹는 음식을 쓰는 칸도 넣어요.');
 if(s.boxProtection==='open')needs.push('의견함을 선생님과 함께 지켜요.');
 if(protection(s)<2)needs.push('질문지를 필요한 사람만 보고, 다 쓰면 안전하게 정리해요.');
 const kind=!clean(s)||(!s.questionImproved&&s.visited.length<4)?'rebuild':needs.length?'review':'ready';
 const title={ready:'모두가 맛있는 급식',review:'조금 더 살펴볼 급식',rebuild:'다시 짜 볼 급식'}[kind];
 const findings=[s.visited.length===4?'네 곳의 의견을 모두 들었어요. 그래도 질문지에 빠진 칸 때문에 못 먹는 음식을 놓쳤어요.':`${s.visited.length}곳에서 ${count(s)}장의 의견을 모았어요. 의견이 많아도 아직 듣지 못한 친구의 생각은 빠질 수 있어요.`,clean(s)?(s.sort.genuine==='keep'?'장난 카드는 빼고, 맞춤법이 틀린 진짜 의견은 지켰어요.':'장난 카드는 뺐어요. 맞춤법이 틀린 진짜 의견도 다시 넣으면 좋겠어요.'):'남아 있는 장난 카드 때문에 첫 급식표가 치우쳤어요. 실제로 먹기 전에 선생님이 위험한 메뉴를 막았어요.',protection(s)===2?'질문지는 필요한 선생님만 보고, 다 쓰면 안전하게 정리하기로 했어요.':'질문지에는 친구를 지키는 중요한 정보가 있어요. 선생님과 함께 보여 주는 범위와 보관 방법을 확인했어요.'];
 return {kind,title,needs,findings,menu:revisedMenu(s)};
}
root.EthicityDataModel={words,people,sources,sorting,methods,pledges,scenes,initial,count,clean,protection,initialMenu,revisedMenu,result};
})(typeof window!=='undefined'?window:globalThis);
