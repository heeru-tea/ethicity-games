// Explicit, opt-in smoke test. Creates one short-lived QA room and ends it.
import {createRequire} from 'node:module';
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
if (!process.argv.includes('--run-production-smoke')) throw Error('Production smoke requires --run-production-smoke');
const require=createRequire(new URL('../dev/package.json',import.meta.url));
const {initializeApp,deleteApp}=require('firebase/app');
const {getAuth,signInAnonymously,deleteUser}=require('firebase/auth');
const {getFirestore,doc,collection,setDoc,getDoc,getDocs,updateDoc,serverTimestamp,Timestamp,onSnapshot,writeBatch,terminate,setLogLevel}=require('firebase/firestore');
const context={window:{},location:{hostname:'ethicity-nyamnyam-v2.hollowcorn.chatgpt.site'}};
vm.runInNewContext(fs.readFileSync(new URL('../firebase-config.js',import.meta.url),'utf8'),context);
const config=context.window.ETHICITY_CLASSROOM_CONFIG;
assert.equal(config.firebase.projectId,'ethicity-reliability-20261114');
assert(!config.emulators);
globalThis.window=globalThis;
for(const file of ['scenario.js','story.js','classroom-model.js'])vm.runInThisContext(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'));
const M=globalThis.EthicityDataModel,C=globalThis.EthicityClassroomModel;
setLogLevel('silent');
const clients=[]; let count=0;
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const code='QA'+Array.from(randomBytes(6),b=>alphabet[b%32]).join('');
const path='dataV5Rooms/'+code;
const ref=(c,p='')=>doc(c.db,path+(p?'/'+p:''));
async function client(name){const app=initializeApp(config.firebase,'qa-'+name+'-'+Date.now()),auth=getAuth(app);await signInAnonymously(auth);const c={app,auth,uid:auth.currentUser.uid,db:getFirestore(app)};clients.push(c);return c;}
async function ok(name,fn){await fn();console.log('PASS '+name);count++;}
async function denied(fn){await assert.rejects(fn,e=>e.code==='permission-denied');}
let teacher,created=false;
try{
 teacher=await client('teacher'); const a=await client('student-a'),b=await client('student-b');
 await setDoc(ref(teacher),{ownerUid:teacher.uid,createdAt:serverTimestamp(),expiresAt:Timestamp.fromMillis(Date.now()+3600000),heartbeatAt:serverTimestamp(),unlockedScene:-1,paused:false,ended:false,revealScene:-1});created=true;
 console.log('QA room: '+code);
 const join=c=>setDoc(ref(c,'members/'+c.uid),{nickname:'검증별',joinedAt:serverTimestamp(),lastSeen:serverTimestamp(),mode:'classroom',currentScene:-1,completedScene:-1,completed:false,metrics:C.metrics(M.initial())});
 await ok('same nickname, independent users',async()=>{await join(a);await join(b);assert.notEqual(a.uid,b.uid);assert.equal((await getDocs(collection(teacher.db,path,'members'))).size,2);});
 await ok('peer records protected',()=>denied(()=>getDoc(ref(a,'members/'+b.uid))));
 await ok('student cannot control teacher',()=>denied(()=>updateDoc(ref(a),{paused:true,heartbeatAt:serverTimestamp()})));
 await ok('locked story cannot be submitted',()=>denied(()=>updateDoc(ref(a,'members/'+a.uid),{currentScene:0,lastSeen:serverTimestamp()})));
 await ok('real-time unlock reaches student',async()=>{
  const seen=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{off();reject(Error('Listener timeout'));},15000);const off=onSnapshot(ref(a),s=>{if(s.data()?.unlockedScene===0){clearTimeout(timer);off();resolve();}},reject);});
  await updateDoc(ref(teacher),{unlockedScene:0,heartbeatAt:serverTimestamp()});await seen;
 });
 const submit=async(c,choice)=>{const state=M.initial();state.quizChoice=choice;state.scene=0;const batch=writeBatch(c.db);batch.update(ref(c,'members/'+c.uid),{currentScene:0,completedScene:0,metrics:C.metrics(state),lastSeen:serverTimestamp()});batch.set(ref(c,'answers/'+c.uid+'_0'),{uid:c.uid,scene:0,metrics:C.metrics(state),updatedAt:serverTimestamp()});batch.set(ref(c,'checkpoints/'+c.uid),{completedScene:0,json:JSON.stringify(C.checkpoint(state,0)),updatedAt:serverTimestamp()});await batch.commit();};
 await ok('choices stored separately',async()=>{await submit(a,1);await submit(b,2);assert.equal((await getDoc(ref(teacher,'answers/'+a.uid+'_0'))).data().metrics.quiz,1);assert.equal((await getDoc(ref(teacher,'answers/'+b.uid+'_0'))).data().metrics.quiz,2);});
 await ok('private checkpoint protected from teacher',async()=>{await getDoc(ref(a,'checkpoints/'+a.uid));await denied(()=>getDoc(ref(teacher,'checkpoints/'+a.uid)));});
 await ok('aggregate stays private until teacher releases it',async()=>{await setDoc(ref(teacher,'public/0'),{scene:0,total:2,c0:1,c1:1,c2:0,c3:0,updatedAt:serverTimestamp()});await denied(()=>getDoc(ref(a,'public/0')));await updateDoc(ref(teacher),{revealScene:0,heartbeatAt:serverTimestamp()});assert.equal((await getDoc(ref(a,'public/0'))).data().total,2);});
 await ok('teacher cannot overwrite individual answer',()=>denied(()=>updateDoc(ref(teacher,'members/'+a.uid),{metrics:C.metrics(M.initial()),lastSeen:serverTimestamp()})));
 await ok('preview detaches and blocks later submissions',async()=>{await updateDoc(ref(b,'members/'+b.uid),{mode:'preview',lastSeen:serverTimestamp()});await denied(()=>submit(b,1));await denied(()=>updateDoc(ref(b,'members/'+b.uid),{mode:'classroom',lastSeen:serverTimestamp()}));});
 await ok('teacher opens result without inventing missed answers',async()=>{await denied(()=>updateDoc(ref(a,'members/'+a.uid),{currentScene:6,completed:true,lastSeen:serverTimestamp()}));for(let n=1;n<=6;n++)await updateDoc(ref(teacher),{unlockedScene:n,heartbeatAt:serverTimestamp()});await updateDoc(ref(a,'members/'+a.uid),{currentScene:6,completed:true,lastSeen:serverTimestamp()});const member=(await getDoc(ref(a,'members/'+a.uid))).data();assert.equal(member.completedScene,0);assert.equal(member.metrics.quiz,1);});
 await ok('ended room blocks submissions',async()=>{await updateDoc(ref(teacher),{ended:true,heartbeatAt:serverTimestamp()});await denied(()=>updateDoc(ref(a,'members/'+a.uid),{lastSeen:serverTimestamp()}));});
 console.log(`PASS ${count} real Firebase checks. QA room ${code} is ended.`);
}finally{
 if(created)await updateDoc(ref(teacher),{ended:true,heartbeatAt:serverTimestamp()}).catch(()=>{});
 for(const c of clients){await deleteUser(c.auth.currentUser).catch(()=>{});await terminate(c.db);await deleteApp(c.app);}
}
