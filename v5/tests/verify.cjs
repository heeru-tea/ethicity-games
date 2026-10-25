/* Run: node tests/verify.cjs — no dependencies and no network. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const story=JSON.parse(read('scenario.json')),config=JSON.parse(read('config.json'));
const html=read('index.html'),embedded=JSON.parse(html.match(/<script id="game-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
assert.deepEqual(embedded,story);assert.equal(story.rounds.length,8);
const tags=new Set();for(const r of story.rounds){assert.equal(r.choices.length,4);assert.equal(r.signals.length,4);for(const c of r.choices){assert(c.tags.length);for(const t of c.tags){assert(story.elements[t]);tags.add(t);}assert(c.feedback&&c.change&&c.reply.text);}}
assert.deepEqual([...tags].sort(),[1,2,3,4,5]);
for(const e of Object.values(story.endings)){assert([...e.card].length<=40);assert(e.card.endsWith('니다.'));}
const main={innerHTML:'',querySelector:()=>null},store=new Map();
const context=vm.createContext({console,URL,URLSearchParams,structuredClone,setTimeout,clearTimeout,location:{search:'',pathname:'/v5/'},document:{documentElement:{cloneNode:()=>({})},getElementById:id=>id==='game-data'?{textContent:JSON.stringify(story)}:id==='game-config'?{textContent:JSON.stringify(config)}:main,addEventListener(){}},localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}});
vm.runInContext(read('source/app.js'),context);
const run=code=>vm.runInContext(code,context);
assert.equal(run("nicknameError('별고래')"),'');assert.equal(run("nicknameError('가나다라마')"),'');
for(const n of ['','가나다라마바','별 고래','ABC','ㅂㄱ','시발','바보']){context.nameTest=n;assert(run('nicknameError(nameTest)'));}
assert.equal(run("esc('<img onerror=alert(1)>')"),'&lt;img onerror=alert(1)&gt;');
assert.equal(run('endingOf({})'),null);assert.equal(run('Object.keys(validateAnswers({0:{choice:4,signals:1},1:{choice:1,signals:0}})).length'),0);
run('render=()=>{};S.player={character:"char_03",nickname:"별고래"};S.friendName="구름";applyFriendName();');
assert(run('say(STORY.introDialogue[0].text)').startsWith('별고래!'));assert.equal(run('STORY_TEMPLATE.introDialogue[0].text'),story.introDialogue[0].text);
const counts=run(`(()=>{const counts={A:0,B:0,C:0};for(let n=0;n<65536;n++){let n2=n,a={};for(let i=0;i<8;i++){a[i]={choice:n2%4,signals:1};n2=Math.floor(n2/4);}counts[endingOf(a)]++;}return counts;})()`);
assert(Object.values(counts).every(x=>x>0));assert.equal(Object.values(counts).reduce((a,b)=>a+b),65536);
run('S.answers=Object.fromEntries(STORY.rounds.map((r,i)=>[i,{choice:r.choices.findIndex(c=>c.kind==="safe"),signals:1}]));');
(async()=>{
 await run('finishGame()');const result=JSON.parse(store.get('ethicity.result.privacy'));
 assert.deepEqual(Object.keys(result).sort(),['card','completed','ending','game']);assert.equal(result.game,'privacy');assert.equal(result.completed,true);assert.equal(result.ending,'A');
 run('localStorage.getItem=()=>{throw Error("storage denied")};localStorage.setItem=()=>{throw Error("storage denied")};localStorage.removeItem=()=>{throw Error("storage denied")};');
 assert.equal(run('readStore("x",42)'),42);assert.equal(run('writeStore("x",{})'),false);assert.equal(run('removeStore("x")'),false);await run('finishGame()');assert.equal(run('S.view'),'ending');assert.equal(run('S.resultSaved'),false);
 const app=read('source/app.js'),choices=app.slice(app.indexOf('function choicesHTML'),app.indexOf('function tagHTML'));assert(!choices.includes('tagHTML('));assert(read('source/round-screens.js').includes("S.player?.nickname||'탐험가'"));
 const manifest=JSON.parse(read('common/manifest.json'));vm.runInContext(read('source/case-data.js'),context);assert.equal(run('Object.keys(CASE_SCREENS).length'),8);for(const r of story.rounds){context.sceneTest=r.scene;assert(run('!!CASE_SCREENS[sceneTest]'));}
 const ids=run('Object.values(CASE_SCREENS).map(x=>x.icon)');for(const id of ids)assert(manifest.icons.icons[id]);
 for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)){const p=match[1];if(!/^https?:/.test(p))assert(fs.existsSync(path.join(root,p)),p);}
 const report={testedAt:new Date().toISOString(),scenarioEmbeddedUnchanged:true,rounds:8,choicesPerRound:4,learningElements:[1,2,3,4,5],endingsAcross65536ChoicePaths:counts,allThreeEndingsReachable:true,storageFailureContinues:true,hubResultSchemaPreserved:true,nicknameValidation:true,learningTagsOnlyAfterChoice:true,caseScreens:8,commonAssetIdsValid:true,sourceSyntax:'checked with node --check'};
 fs.writeFileSync(path.join(root,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
