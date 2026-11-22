const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),story=JSON.parse(read('scenario.json')),config=JSON.parse(read('config.json')),store=new Map();
const cards={A:'개인정보를 제공하여 AI나 인터넷 서비스를 이용할 때에는 가입할 때부터 탈퇴할 때까지 개인정보의 수집, 활용 목적, 보관 등을 꼼꼼히 확인합니다.',B:'개인정보 제공 동의를 해도 되는지 잘 모를 때에는 보호자의 도움을 받아 확인합니다.',C:'미처 생각하지 못한 개인정보 보호 방법을 다시 알아보고 일상에서 실천합니다.'};
for(const [k,v]of Object.entries(cards))assert.equal(story.endings[k].card,v);
assert.equal(story.copyRevision,'20261122');assert.equal(story.rounds.length,8);
assert(!/단짝|소풍|조끼|더 확인해야 할 부분|더 확인할 부분/.test(JSON.stringify(story)));
assert(story.rounds[3].situation.includes('이름과 학교가 적힌 명찰 목걸이'));
assert(story.rounds[3].choices[1].text.includes('명찰의 이름과 학교'));
assert(!/AI 개발|학습 설정/.test(JSON.stringify(story.rounds[2])));
assert(story.rounds[4].signals[2].detail==='이벤트창을 닫은 뒤 어떻게 처리되는지 안내 없음');
assert(story.rounds[7].signals[2].label.includes('대상·이유 안내 없음'));
for(const r of story.rounds){assert.equal(r.choices.length,4);assert.equal(r.choices.filter(c=>c.kind==='safe').length,2);for(const x of r.signals)assert(x.risk?x.feedback.startsWith('이 부분이 수상해!'):x.feedback.includes('안전한 방법'));}
const el={innerHTML:'',textContent:'',dataset:{},querySelector:()=>null,querySelectorAll:()=>[],classList:{add(){},remove(){}}},document={body:el,getElementById:k=>k==='game-data'?{textContent:JSON.stringify(story)}:k==='game-config'?{textContent:JSON.stringify(config)}:el,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}};
const context=vm.createContext({console,document,window:{addEventListener(){}},URL,URLSearchParams,structuredClone,setTimeout,clearTimeout,location:{search:'?mode=solo',href:'https://test.invalid/',pathname:'/'},localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}}),run=s=>vm.runInContext(s,context);
for(const f of ['app','case-data','round-screens','case-screens','common-bridge','reports','classroom','teacher-panels','progress','reflections','closure'])run(read('source/'+f+'.js'));
run(read('source/live.js').split('// ==================== 첫 화면')[0]);
run(`render=()=>{};resetNarration=()=>{};commonIcon=id=>'<i>'+id+'</i>';S.player={nickname:'검증별',character:'char_03'};S.uid='test';S.roomId='a'.repeat(32);S.progressActive=true;S.round=7;S.mode='student';S.control={phase:'reveal',round:7};S.view='round';S.pending={};S.network=true;let writes=[];let resultWrites=[];S.cloud={db:{},D:{ref:(db,p)=>p,set:async(p,v)=>writes.push({p,v})}};saveCloudResult=async result=>resultWrites.push(result);S.answers=Object.fromEntries(STORY.rounds.map((r,i)=>[i,{choice:r.choices.findIndex(c=>c.kind==='safe'),signals:1,firstSignals:1,signalChecks:1}]));`);
(async()=>{
 await run('finishGame()');assert(!store.has('ethicity.result.privacy'));assert.equal(run('S.view'),'round');
 await run('markFinalReady()');assert.equal(run('S.view'),'wait');assert(run('S.finalReady'));assert.equal(run('writes.length'),1);assert.equal(run('resultWrites.length'),0);assert(run('renderFinalWait()').includes('선생님의 마무리 신호'));
 run('persistProgress()');assert(JSON.parse(store.get(run('progressKey()'))).finalReadyRequested);
 await run('flushFinalReady()');assert.equal(run('writes.length'),1,'Readiness is idempotent');
 run("S.ended=false;S.view='loading';syncStudentScreen()");assert.equal(run('S.view'),'wait','Reconnection before teacher ending keeps waiting');
 run("S.control.phase='ended';syncStudentScreen()");assert.equal(run('S.view'),'ending');const result=JSON.parse(store.get('ethicity.result.privacy'));assert.equal(result.card,cards.A);assert.deepEqual(Object.keys(result).sort(),['card','completed','ending','game']);
 store.delete('ethicity.result.privacy');run("S.ended=false;delete S.answers[3];S.catchUp=false;S.view='round';syncStudentScreen()");assert.equal(run('S.view'),'class-recap');assert(!store.has('ethicity.result.privacy'));assert(run('renderClassRecap()').includes('미완료'));
 await run("closureAction('catch-up')");assert.equal(run('S.round'),3);assert.equal(run('S.view'),'round');assert(!store.has('ethicity.result.privacy'));
 run("S.round=7;S.answers[3]={choice:1,signals:1};S.finalReady=false;S.finalReadyRequested=false;S.control={phase:'reveal',round:7};S.network=false;S.pending={};");await run('markFinalReady()');assert(!run('S.finalReady'));assert(run('S.finalReadyRequested'));assert.equal(run('writes.length'),1);run('S.network=true');await run('flushFinalReady()');assert.equal(run('writes.length'),2);
 run("S.mode='teacher';S.room={members:{a:{nickname:'하늘',joinedAt:1},b:{nickname:'구름',joinedAt:2}},answers:{a:S.answers,b:{}},finalReady:{a:true,b:true}};");assert.equal(run('teacherEndStats().ready'),1,'Incomplete answer set cannot count as ready');
 run("S.mode='solo';S.round=3;S.feedbackPage=3");assert(run('feedbackHTML(STORY.rounds[3],STORY.rounds[3].choices[1])').includes('다음 이야기 예고'));assert(run('observationPages(STORY.rounds[3]).join(\'\')').includes('명찰 목걸이 확대'));
 run('S.signals=0;S.signalChecked=false');assert(run('riskSelection(STORY.rounds[0])').includes('수상한 신호 확인'));assert(run('riskSelection(STORY.rounds[0])').includes('primary signal-confirm'));
 context.cardValues=Object.values(cards);const lines=run("cardValues.map(card=>cardTextLines({measureText:t=>({width:[...t].length*32})},card))");for(let i=0;i<3;i++){assert.equal(lines[i].join(' '),Object.values(cards)[i]);assert(lines[i].every(l=>[...l].length*32<=1060));}
 console.log(JSON.stringify({approvedCardsExact:true,cardLengths:Object.values(cards).map(x=>x.length),contextualSuspiciousSignals:true,nameBadgeAndEventWindow:true,teacherEndRequired:true,readinessRetryAndResume:true,incompleteStudentsStayIncomplete:true,largeNextStoryPreview:true,cardWrappingPreservesText:true}));
})().catch(e=>{console.error(e);process.exitCode=1});
