const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');

const FILES={release:'../diversity-v2/classroom/ui-retention.js'};

function load(file){
  const src=fs.readFileSync(path.join(__dirname,file),'utf8');
  const helpers=src.slice(src.indexOf('function uiKey('),src.indexOf('function bindDraft('));
  const studentFn=src.slice(src.indexOf('async function student('),src.indexOf('function readStudentLesson('));
  const parts=src.split(/\r?\n/).find(l=>l.startsWith('function observationParts('));
  assert(parts,'observationParts present');
  assert(helpers.includes('captureUi')&&helpers.includes('restoreUi'),'UI state helpers present');
  assert(studentFn.includes('lastRenderKey'),'student() uses the render key');

  const dom=new JSDOM('<!doctype html><div id="main"></div>',{url:'http://localhost/'});
  const win=dom.window;
  let scrollY=0;
  Object.defineProperty(win,'scrollY',{get:()=>scrollY});
  win.scrollTo=(x,y)=>{scrollY=y;};
  const document=win.document;

  let overviewCalls=0;
  const data={};
  const s={
    document,globalThis:win,$:id=>document.getElementById(id),
    role:'student',draftRevision:0,adapter:null,
    renderedFormRound:null,lastStudentPhase:'',lastVoteSignature:'',lastReflectionText:undefined,lastRenderKey:'',
    observationEdited:false,history:'',savedObservation:null,scrollMissionOnce:false,
    drafts:{observation:'',observationDifference:'',evidence:'',proposal:'',reason:'',imageId:'',reflection:'',reflection2:'',choice:'',choiceRound:'',drawCount:12},
    editedFields:new Set(),tabSession:null,
    DiversityIntegration:{bridge:{observe(){}}},
    ClassroomMissions:{decorate(){}},
    restoreSavedForms(){},
    overview:()=>{overviewCalls++;return '<details class="scene-context"><summary>도움 요청의 조사 기준</summary><p>기준</p></details>';},
    field:(id,label,value)=>`<label>${label}<textarea id="${id}">${value||''}</textarea></label>`,
    btn:(id,text)=>`<button id="${id}">${text}</button>`,
    esc:v=>String(v??''),pictures:()=>'',asset:()=>({image:'',text:''}),shortLabel:id=>id,
    originals:[{id:'D1',image:'',alt:'',text:'원본',}],materials:[],
    histories:()=>'',wireHistory:async()=>{},ending:()=>'',choiceTray:()=>'',persistDrafts(){},bindDraft(){},
    action:async fn=>fn(),
    // Korean-only passthrough, matching ui-retention.js's own fallback when
    // i18n.js (not loaded by this harness) is unavailable.
    tr:a=>Array.isArray(a)?a[0]:a,L:ko=>ko,uiCopy:v=>v,
  };
  const proxy=new Proxy(s,{has:(t,k)=>typeof k==='string'&&k in t,get:(t,k)=>t[k],set:(t,k,v)=>{t[k]=v;return true;}});
  const build=new Function('stubs',`with(stubs){${parts}\n${helpers}\n${studentFn}\nreturn {student,captureUi,restoreUi};}`);
  const api=build(proxy);

  const adapter={generation:1,base:'b/',uid:'u1',async get(p){return data[p];}};
  s.adapter=adapter;
  return {api,s,win,document,data,adapter,overviewCalls:()=>overviewCalls,setScroll:y=>{scrollY=y;}};
}

for(const [name,file] of Object.entries(FILES)){
  test(`${name}: unchanged server state does not rebuild the student screen`,async()=>{
    const h=load(file);
    const c={phase:'proposal',activeRound:'r1',open:true};
    await h.api.student(h.adapter,c,[]);
    const main=h.document.getElementById('main');
    const firstChild=main.firstElementChild;
    const callsAfterFirst=h.overviewCalls();
    assert(callsAfterFirst>=1&&firstChild,'first render happened');

    const details=main.querySelector('details.scene-context');
    details.open=true;
    h.setScroll(420);
    for(let i=0;i<3;i++)await h.api.student(h.adapter,{...c},[]);

    assert.equal(h.overviewCalls(),callsAfterFirst,'no rebuild while state is unchanged');
    assert.equal(main.firstElementChild,firstChild,'same DOM node');
    assert.equal(main.querySelector('details.scene-context').open,true,'opened details stay open');
    assert.equal(h.win.scrollY,420,'scroll position kept');
  });

  test(`${name}: a real server change rebuilds but keeps opened details, focused button and scroll`,async()=>{
    const h=load(file);
    const c={phase:'proposal',activeRound:'r1',open:true};
    await h.api.student(h.adapter,c,[]);
    const main=h.document.getElementById('main');
    main.querySelector('details.scene-context').open=true;
    main.querySelector('#save-proposal').focus();
    h.setScroll(300);
    const before=h.overviewCalls();

    h.data['b/observations/u1']={version:2,text:'new',evidence:'D1'};
    await h.api.student(h.adapter,{...c},[]);

    assert(h.overviewCalls()>before,'rebuilt after the observation changed');
    assert.equal(main.querySelector('details.scene-context').open,true,'details open state survives the rebuild');
    assert.equal(h.win.scrollY,300,'scroll restored');
    assert.equal(h.document.activeElement?.id,'save-proposal','focus restored to the same control');
  });

  test(`${name}: while a text field is focused, remote changes never replace the field or its caret`,async()=>{
    const h=load(file);
    const c={phase:'proposal',activeRound:'r1',open:true};
    await h.api.student(h.adapter,c,[]);
    const main=h.document.getElementById('main');
    const ta=main.querySelector('#proposal');
    ta.focus();ta.value='휠체어를 쓰는 의사';ta.setSelectionRange(2,4);

    h.data['b/observations/u1']={version:2,text:'new',evidence:'D1'};
    await h.api.student(h.adapter,{...c},[]);

    assert.equal(main.querySelector('#proposal'),ta,'the same textarea node is kept');
    assert.equal(ta.value,'휠체어를 쓰는 의사');
    assert.equal([ta.selectionStart,ta.selectionEnd].join(),'2,4');
    assert.equal(h.document.activeElement,ta);
  });

  test(`${name}: a details the student closed stays closed; phase change rebuilds`,async()=>{
    const h=load(file);
    const c={phase:'proposal',activeRound:'r1',open:true};
    await h.api.student(h.adapter,c,[]);
    const main=h.document.getElementById('main');
    const d=main.querySelector('details.scene-context');
    d.open=true;d.open=false;
    const before=h.overviewCalls();
    await h.api.student(h.adapter,{...c,phase:'review'},[]);
    assert(h.overviewCalls()>before,'rebuilt when the phase changed');
    assert.equal(main.querySelector('details.scene-context').open,false);
  });
}
