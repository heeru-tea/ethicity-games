const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),story=JSON.parse(read('scenario.json')),config=JSON.parse(read('config.json')),storage=new Map();
const el={textContent:'',innerHTML:'',dataset:{},querySelector:()=>null,querySelectorAll:()=>[],classList:{add(){},remove(){}}};
const doc={body:el,getElementById:id=>id==='game-data'?{textContent:JSON.stringify(story)}:id==='game-config'?{textContent:JSON.stringify(config)}:el,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}};
const context=vm.createContext({console,URL,URLSearchParams,structuredClone,setTimeout,clearTimeout,document:doc,window:{addEventListener(){}},location:{search:'?mode=solo',pathname:'/',href:'https://example.test/?mode=solo'},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}});
const run=code=>vm.runInContext(code,context);
for(const name of ['app','round-screens','case-data','case-screens','reports','classroom','teacher-panels','progress','reflections'])run(read('source/'+name+'.js'));
run("render=()=>{};resetNarration=()=>{};commonIcon=id=>'<i>'+id+'</i>';S.player={nickname:'별빛',character:'char_03'};S.mode='solo';");
(async()=>{
 assert.equal(story.rounds.length,8);assert.equal(Object.keys(story.elements).length,5);
 assert.equal((run('learningSummary()').match(/권리가 있습니다/g)||[]).length,1);
 for(let i=0;i<8;i++){const r=story.rounds[i];assert.equal(r.choices.length,4);assert.equal(r.choices.filter(c=>c.kind==='safe').length,2);for(let j=0;j<4;j++){assert(['direct','check','pause'].includes(r.choices[j].useProcess.kind));assert(r.choices[j].useProcess.text);run(`S.round=${i};S.feedbackPage=1`);const html=run(`feedbackHTML(STORY.rounds[${i}],STORY.rounds[${i}].choices[${j}])`);assert(!html.includes('/ 2점'));assert(!html.includes('100점'));assert(!html.includes('학습 요소'));}}
 run('S.dialoguePage=2');let html=run('renderIntro()');assert.equal((html.match(/<nav /g)||[]).length,1);assert(html.includes('data-action="begin"'));assert(html.indexOf('data-action="begin"')<html.indexOf('</nav>'));
 html=run('caseDialogue(STORY.rounds[0])');assert(html.indexOf('data-action="observe-case"')<html.indexOf('</nav>'));
 run("S.progressActive=true;S.round=2;S.view='round';S.roundStage='choices';S.signals=5;S.signalChecked=true;S.selected=1;S.choosing=true;S.observePage=3;S.dialoguePage=2;S.answers={0:{choice:0,signals:3,firstSignals:1,signalChecks:2}};S.reflections={0:'다음에는 먼저 확인합니다.'};persistProgress();S.signals=0;S.selected=null;S.round=0;S.answers={};");
 await run('resumeProgress()');assert.equal(run('S.round'),2);assert.equal(run('S.signals'),5);assert.equal(run('S.selected'),1);assert.equal(run('S.observePage'),3);assert.equal(run('S.reflections[0]'),'다음에는 먼저 확인합니다.');
 const solo=run('progressKey()');run("params.set('preview','1')");assert.notEqual(run('progressKey()'),solo);assert.equal(run('storedProgress()'),null);run("params.delete('preview')");
 run("S.answers=Object.fromEntries(STORY.rounds.map((r,i)=>[i,{choice:r.choices.findIndex(c=>c.score===(i<4?2:0)),signals:1,firstSignals:1,signalChecks:1}]));");assert.equal(run('endingOf(S.answers)'),'B');assert(run('renderEnding()').includes('놓친 보호 방법을 더 연습'));assert(!/\d+\s*점|progressbar/.test(run('scoreBars(S.answers,true)')));
 await run('finishGame()');run('persistProgress()');const completed=JSON.parse(storage.get('ethicity.result.privacy'));assert.deepEqual(Object.keys(completed).sort(),['card','completed','ending','game']);assert.equal(completed.ending,'B');assert(completed.card.length<=40);
 run("beginFreshProgress();S.view='intro';persistProgress()");assert(run('storedProgress(true).completed'));assert.equal(run('Object.keys(storedProgress().answers).length'),0);
 await run('resumeProgress(true)');assert(run('S.archiveView'));assert.equal(run('S.view'),'ending');assert.equal(run('Object.keys(storedProgress().answers).length'),0);
 html=run("reportContent({nickname:'별빛',character:'char_03'},S.answers,'',{'0':'<script>bad()</script>\\n다시 확인합니다.'},true)");assert(html.includes('data-reflection="0"'));assert(html.includes('&lt;script&gt;'));assert(!html.includes('<script>bad'));
 html=run("reportDocument(reportContent(S.player,S.answers,'',{'0':'먼저 확인합니다.'}))");assert(html.includes('먼저 확인합니다.'));assert(!html.includes('<textarea'));assert.equal(run("csvCell('=1+1')"),'"\'=1+1"');
 assert.equal(run("Object.keys(cleanReflections({bad:'x',0:'x'.repeat(900)})).length"),1);assert.equal(run("cleanReflections({0:'x'.repeat(900)})[0].length"),500);
 run("localStorage.setItem=()=>{throw Error('blocked')};S.archiveView=false;S.view='round';S.progressActive=true");assert.equal(run('persistProgress()'),false);
 const result={rounds:8,choices:32,oneRightsSentence:true,navigationSingleRowStructure:true,noStudentScores:true,ending50PercentReworded:true,resumePagesAndUnsubmittedSelection:true,previewSeparated:true,lastResultRetained:true,reflectionEscaping:true,printIncludesWriting:true,csvFormulaEscaped:true,blockedStorageSafe:true};
 console.log(JSON.stringify(result));
})().catch(e=>{console.error(e);process.exitCode=1});

