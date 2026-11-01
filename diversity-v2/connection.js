(function(root){'use strict';
const PROJECT='ethicity-diversity-2026';
const DATABASE='https://ethicity-diversity-2026-default-rtdb.asia-southeast1.firebasedatabase.app';
function requireValue(ok,msg){if(!ok)throw Error(msg);}
async function connect(firebase,config,role,onState=()=>{},origin='',demoIdentity=null,options={}){
 requireValue(['teacher','student'].includes(role),'역할 오류');
 requireValue(config&&['demo','production'].includes(config.mode),'연결 모드를 명시해야 합니다.');
 if(config.mode==='demo'){
  if(demoIdentity!==null)requireValue(role==='student'&&/^fake_[A-Za-z0-9_-]{1,60}$/.test(demoIdentity),'모의 학생 ID 오류');
  const uid=role==='teacher'?'teacher-demo':demoIdentity||'fake_'+Math.random().toString(36).slice(2,12);
  const app=firebase.initializeApp({projectId:'demo-ethicity-security',databaseURL:'http://127.0.0.1:9000?ns=demo-ethicity-security'},'demo_'+Date.now()+'_'+Math.random().toString(36).slice(2));
  const db=app.database();db.useEmulator('127.0.0.1',9000,{mockUserToken:{sub:uid,user_id:uid,firebase:{sign_in_provider:role==='teacher'?'google.com':'anonymous'}}});
  onState('demo-ready');return {app,db,uid,mode:'demo',close:async()=>{db.goOffline();if(app.delete)await app.delete();}};
 }
 // Validate ALL settings before creating an app, user, network connection or popup.
 requireValue(demoIdentity===null,'운영 모드에 demo 재접속 ID를 사용할 수 없습니다.');
 const p=config.production;
 requireValue(p?.enabled===true,'운영 연결은 승인 전 잠겨 있습니다.');
 requireValue(p.settingsVerified===true,'운영 설정 읽기 검증이 필요합니다.');
 requireValue(p.origin===origin&&/^https:\/\//.test(origin),'승인된 HTTPS 실행 주소가 필요합니다.');
 requireValue(!('mockUserToken' in config)&&!('mockUserToken' in p),'운영 모드에 모의 토큰을 사용할 수 없습니다.');
 const sdk=p.sdk;
 requireValue(sdk?.projectId===PROJECT&&sdk.databaseURL===DATABASE,'운영 대상 불일치');
 for(const k of ['apiKey','authDomain','appId'])requireValue(typeof sdk[k]==='string'&&sdk[k].length>0&&!/PLACEHOLDER|TODO|REPLACE/.test(sdk[k]),'SDK 설정이 비어 있습니다.');
 requireValue(typeof firebase.auth==='function','Auth SDK 연결이 필요합니다.');
 let app,auth,db,stop;
 try{
  onState('authenticating');app=firebase.initializeApp(sdk,role==='student'?'ethicity-diversity-production-student':'production_teacher_'+Date.now());auth=app.auth();
  // Stable student app name + SDK SESSION storage preserve only this tab's Auth identity.
  // No custom token storage. Teacher persistence remains unchanged.
  await auth.setPersistence(role==='student'?firebase.auth.Auth.Persistence.SESSION:firebase.auth.Auth.Persistence.NONE);
  let restored=null;
  if(role==='student')restored=await new Promise((resolve,reject)=>{let unsubscribe;unsubscribe=auth.onAuthStateChanged(u=>{resolve(u);Promise.resolve().then(()=>unsubscribe?.());},reject);});
  requireValue(!restored||restored.isAnonymous===true,'학생 인증 세션이 다른 역할입니다. 로그아웃 후 다시 참여하세요.');
  if(options.restoreOnly&&!restored){const e=new Error('복원할 학생 로그인이 없습니다. 새 계정은 만들지 않았습니다.');e.code='auth/no-restorable-session';throw e;}
  const credential=role==='teacher'?await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()):restored?{user:restored}:await auth.signInAnonymously();
  const user=credential?.user;
  requireValue(user?.uid&&!user.uid.startsWith('fake_')&&user.uid!=='teacher-demo','실제 인증 UID가 필요합니다.');
  requireValue(role==='student'?user.isAnonymous===true:!user.isAnonymous&&user.providerData?.some(x=>x.providerId==='google.com'),'인증 제공자와 역할이 다릅니다.');
  db=app.database(); // Never calls useEmulator or constructs mockUserToken in this branch.
  stop=auth.onAuthStateChanged(u=>{if(!u||u.uid!==user.uid){db.goOffline();onState('signed-out');}});
  onState('authenticated-permission-unverified');
  return {app,db,uid:user.uid,mode:'production',close:async()=>{if(stop)stop();db.goOffline();await auth.signOut();await app.delete();onState('signed-out');}};
 }catch(e){if(stop)stop();if(db)db.goOffline();if(auth&&!options.restoreOnly)await auth.signOut().catch(()=>{});if(app)await app.delete().catch(()=>{});onState('error');throw e;}
}
const api={connect,PROJECT,DATABASE};if(typeof module!=='undefined')module.exports=api;else root.DiversityConnection=api;
})(globalThis);
