(function(root){'use strict';
const PROJECT='ethicity-diversity-2026';
async function connect(firebase,config,role,onState=()=>{},origin='',ignored=null,options={}){
 const p=config?.production,sdk=p?.sdk;
 if(config?.retentionPolicyVersion!==1||config.mode!=='classroom'||!p?.enabled||!p.settingsVerified||origin!=='https://heeru-tea.github.io'||p.origin!==origin||sdk?.projectId!==PROJECT||sdk.authDomain!==PROJECT+'.firebaseapp.com'||sdk.databaseURL!=='https://ethicity-diversity-2026-default-rtdb.asia-southeast1.firebasedatabase.app'||!sdk.apiKey||config.databaseHost||config.authHost)throw Error('교실 연결 설정을 확인할 수 없습니다. 운영 담당자에게 알려 주세요.');
 if(!['teacher','student'].includes(role)||ignored!==null)throw Error('접속 역할을 확인해 주세요.');
 const app=firebase.initializeApp(sdk,'ethicity-retention-production-v1-'+role);
 const auth=app.auth();
 let stop,db;try{
  // Let SDK restore first; never replace an existing identity on refresh.
  let user=await new Promise((resolve,reject)=>{let off=auth.onAuthStateChanged(u=>{resolve(u);Promise.resolve().then(()=>off?.());},reject);});
  if(user&&!user.isAnonymous)throw Error('다른 인증으로 연결되어 있습니다. 먼저 나가 주세요.');
  if(options.restoreOnly&&!user){const e=Error('이 탭에서 복원할 교실이 없습니다.');e.code='auth/no-restorable-session';throw e;}
  const preferenceKey='ethicity.diversity.retentionProduction.remember';
  const remember=role==='teacher'&&(options.remember===true||(options.remember===undefined&&root.localStorage?.getItem(preferenceKey)==='yes'));
  await auth.setPersistence(remember?firebase.auth.Auth.Persistence.LOCAL:firebase.auth.Auth.Persistence.SESSION);
  if(role==='teacher'&&options.remember!==undefined){if(remember)root.localStorage?.setItem(preferenceKey,'yes');else root.localStorage?.removeItem(preferenceKey);}
  if(!user)user=(await auth.signInAnonymously()).user;
  db=app.database();const offset=Number((await db.ref('.info/serverTimeOffset').once('value')).val());if(!Number.isFinite(offset))throw Error('서버 시각을 확인하지 못했습니다. 다시 시도해 주세요.');
  stop=auth.onAuthStateChanged(u=>{if(!u||u.uid!==user.uid){db.goOffline();onState('signed-out');}});
  onState('authenticated-permission-unverified');
  return {app,db,uid:user.uid,mode:'classroom',remember,serverNow:()=>Date.now()+offset,close:async()=>{stop?.();db.goOffline();await auth.signOut();if(role==='teacher')root.localStorage?.removeItem(preferenceKey);await app.delete();onState('signed-out');}};
 }catch(e){stop?.();db?.goOffline();await app.delete();throw e;}
}
const api={connect,PROJECT};if(typeof module!=='undefined')module.exports=api;else root.DiversityConnection=api;
})(globalThis);
