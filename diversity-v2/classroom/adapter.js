(function(root){'use strict';
const Core=typeof module!=='undefined'?require('./core.js'):root.DiversityLocalCore;
const Model=typeof module!=='undefined'?require('./model.js'):root.DiversityModel;const Extra=typeof module!=='undefined'?require('./assets.js'):root.DiversitySupplemental;const publicScene=id=>({text:[...Model.MATERIAL.cards,...Extra].find(x=>x.id===id)?.text||'그림',reason:'학급 자료 후보',assetId:id});
function unreviewedCount(proposals){return Object.values(proposals||{}).filter(r=>r.current&&(!r.review||r.review.version!==r.current.version)).length;}
const {clone,insist}=Core;const id=()=> 'x_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,10);
class LocalAdapter{
 constructor(db,uid,role){this.db=db;this.uid=uid;this.role=role;this.base=null;this.pending=new Map();this.offline=false;this.loseNext=false;this.generation=0;}
 bind(room,session){insist(/^[A-Za-z0-9_-]{1,80}$/.test(room)&&/^[A-Za-z0-9_-]{1,80}$/.test(session),'방/수업 ID 오류');this.base=`classroomsV2/${room}/sessions/${session}/`;this.room=room;this.session=session;this.generation++;}
 async get(path){insist(!this.offline,'연결 끊김 시험: 초안은 이 화면 메모리에만 있습니다.');return (await this.db.ref(path).once('value')).val();}
 async set(path,value){insist(!this.offline,'연결 끊김 시험: 아직 저장하지 않았습니다.');await this.db.ref(path).set(value);if(this.loseNext){this.loseNext=false;throw Error('응답 유실 시험: 저장됐을 수 있습니다. 같은 요청으로 재시도하세요.');}}
 async confirmed(path,value){try{await this.set(path,value);}catch(e){if(this.offline)throw e;const saved=await this.get(path).catch(()=>null);if(JSON.stringify(saved)!==JSON.stringify(value)&&!same(saved,value))throw e;}return value;}
 async immutable(path,value){const saved=await this.get(path);if(saved){insist(same(saved,value),'이미 확정된 다른 내용입니다. 덮어쓰지 않습니다.');return saved;}return this.confirmed(path,value);}
 async create(room,session,prepared=null){this.bind(room,session);await this.confirmed(`classroomsV2/${room}/meta`,{owner:this.uid});
 const c={epoch:1,phase:'issue',open:true,accepting:true,expiresAt:prepared?.expiresAt||Date.now()+86400000,maxChoices:1,activeRound:'',roundNumber:0};
 const token=prepared?.token||id();insist(/^[A-Za-z0-9_-]{8,80}$/.test(token),'새 수업 요청 식별 오류');
 const existing=await this.get(this.base+'control');if(existing){insist(prepared&&same(existing,c),'이미 있는 수업입니다. 이전 수업 이어하기를 이용하세요.');}else await this.confirmed(this.base+'control',c);
 await this.immutable(this.base+'invites/'+token,{enabled:true,expiresAt:c.expiresAt});return token;
 }
 async request(token,number){return this.confirmed(this.base+'joinRequests/'+this.uid,{token,number});}
 async approvePending(snapshot){let approved=0,skipped=0;for(const target of snapshot){const request=await this.get(this.base+'joinRequests/'+target.uid);if(!request||request.number!==target.number){skipped++;continue;}const result=await this.db.ref(this.base+'members/'+target.uid).transaction(current=>current===null?{number:target.number,approved:true}:undefined,undefined,false);if(result.committed)approved++;else skipped++;}return {approved,skipped};}
 async approve(uid,number,approved=true){if(!approved)return this.db.ref(this.base).update({['members/'+uid]:{number,approved},['presence/'+uid]:null});return this.confirmed(this.base+'members/'+uid,{number,approved});}
 async control(){return this.get(this.base+'control');}
 async transition(phase,extra={}){const c=await this.control();if(phase==='reflection'){insist(c.activeRound,'자료 구성과 모의 결과를 먼저 확인하세요.');const results=await this.get(this.base+'rounds/'+c.activeRound+'/experiments');insist(results&&Object.keys(results).length,'현재 라운드의 표본 확정과 모의 결과 공개를 먼저 마치세요.');}insist(c.phase!=='ended','종료된 수업은 다시 열 수 없습니다.');return this.confirmed(this.base+'control',{...c,...extra,phase,epoch:c.epoch+1});}
 async toggle(){const c=await this.control();return this.transition(c.phase,{open:!c.open});}
 async save(kind,fields){
  const c=await this.control(),round=c.activeRound;
  const rel=kind==='votes'?`rounds/${round}/votes/${this.uid}`:`${kind}/${this.uid}`+(kind==='proposals'?'/current':'');const path=this.base+rel;
  const key=path;let q=this.pending.get(key);
  if(!q){const previous=await this.get(path);q={...clone(fields),version:(previous?.version||0)+1,epoch:c.epoch,requestId:id()};if(kind==='votes'||kind==='reflections')q.candidateVersion=round;this.pending.set(key,q);}
  try{await this.confirmed(path,q);this.pending.delete(key);return q;}catch(e){throw Error(e.message+' / 미확인 요청을 유지합니다. 재시도하거나 현재 저장본을 확인하세요.');}
 }
 discardPending(){this.pending.clear();}
 async review(uid,proposal,status,note){await this.confirmed(this.base+`proposals/${uid}/review`,{version:proposal.version,status,note});}
 async publish(uid,proposal){insist(proposal.imageId,'대응 그림이 없어 아직 그림 후보로 반영할 수 없습니다.');const rv=await this.get(this.base+`proposals/${uid}/review`);insist(rv?.status==='approved'&&rv.version===proposal.version,'최신 제출본의 공개 검토가 필요합니다.');const c=await this.control();insist(c.phase==='review','후보·결과 검토 단계에서 후보를 준비하세요.');const candidate='p_'+proposal.requestId;insist(/^[A-Za-z0-9_-]{1,80}$/.test(candidate),'후보 요청 ID를 확인하세요.');return this.immutable(this.base+'published/proposals/'+candidate,publicScene(proposal.imageId));}
 async freeze(originals,drawCount){const c=await this.control();insist(c.phase==='review','후보 검토 단계에서 확정하세요.');
  const candidates=Object.fromEntries(originals.map(a=>['original_'+a.id,{text:a.text,reason:'원본 문제 제시 그림 · 후보로 유지',assetId:a.id}]));
  const records=await this.get(this.base+'proposals')||{};
  for(const record of Object.values(records)){const v=record.current,rv=record.review;if(v?.imageId&&rv?.status==='approved'&&rv.version===v.version)candidates['proposal_'+id()]=publicScene(v.imageId);}
  // Rebuild staging from latest reviewed submissions; held/revised/stale versions cannot leak into the next snapshot.
  const old=await this.get(this.base+'published/proposals')||{};const updates=Object.fromEntries(Object.keys(old).map(k=>[k,null]));Object.assign(updates,candidates);
  await this.db.ref(this.base+'published/proposals').update(updates);
  const round='r_'+(c.roundNumber+1)+'_'+id();
  const def={sequence:c.roundNumber+1,candidateVersion:round,createdEpoch:c.epoch,maxChoices:1,drawCount,candidates};
  await this.immutable(this.base+`rounds/${round}/definition`,def);
  await this.immutable(this.base+'roundIndex/'+round,def.sequence);
  // Use the captured epoch: an intervening teacher action causes a conflict, never a silent rebase.
  await this.confirmed(this.base+'control',{...c,epoch:c.epoch+1,phase:'vote',open:true,activeRound:round,roundNumber:c.roundNumber+1});return round;
 }
 async roundData(round){const rp=this.base+'rounds/'+round+'/';const out={};for(const k of ['definition','aggregate','pool','experiments'])out[k]=await this.get(rp+k);return out;}
 async compile(){const c=await this.control();insist(['review','pool'].includes(c.phase)&&c.activeRound,'투표 마감 후 결과 검토 단계에서 집계하세요.');const rp=this.base+'rounds/'+c.activeRound+'/';
  const existing=await this.get(rp+'pool');if(existing)return '이미 확정된 표본을 유지했습니다. 새 구성은 새 라운드에서 확정하세요.';const def=await this.get(rp+'definition');if(c.phase==='pool'){const a=await this.get(rp+'aggregate');insist(a,'확정 집계 없음');await this.immutable(rp+'pool',{candidateVersion:c.activeRound,poolVersion:c.activeRound,items:Core.combined(def,a.counts)});return {counts:a.counts,resumed:true};}
  const members=await this.get(this.base+'members'),votes=await this.get(rp+'votes');
  const check=await this.get(this.base+'members'),latest=await this.control();insist(same(members,check)&&same(c,latest),'집계 중 참여/단계가 변경됐습니다. 다시 확인하세요.');
  const tally=Core.tally(def,votes,members),items=Core.combined(def,tally.counts);insist(Object.keys(items).length,'유효 선택이 없습니다. 임의 표본을 만들지 않습니다.');
  await this.immutable(rp+'aggregate',{candidateVersion:c.activeRound,counts:tally.counts});
  await this.transition('pool');await this.immutable(rp+'pool',{candidateVersion:c.activeRound,poolVersion:c.activeRound,items});return tally;
 }
 async run(rng){let c=await this.control();if(c.phase==='pool'){await this.transition('draw');c=await this.control();}insist(c.phase==='draw','표본을 먼저 확정하세요.');const rp=this.base+'rounds/'+c.activeRound+'/';
  const key=rp+'experiment-pending';let q=this.pending.get(key);if(!q){const def=await this.get(rp+'definition'),pool=await this.get(rp+'pool');q={path:rp+'experiments/'+id(),value:Core.experiment(c.activeRound,def,pool.items,rng)};this.pending.set(key,q);}
  await this.immutable(q.path,q.value);this.pending.delete(key);return q.value;
 }
 async deleteLearningData(){
  const c=await this.control();insist(c?.phase==='ended','수업 종료 후에만 학습 기록을 삭제할 수 있습니다.');
  const knownRounds=Object.keys(await this.get(this.base+'roundIndex')||{});const paths=['invites','joinRequests','members','proposals','reflections','published','rounds','observations','roundIndex'];
  // First remove payload with existing owner-only ended gates. Then compact; interruption is safely retryable.
  await this.db.ref(this.base).update(Object.fromEntries(paths.map(k=>[k,null])));
  await this.confirmed(this.base+'control',{phase:'ended'});const marker=await this.control();insist(same(marker,{phase:'ended'}),'종료 표식 확인 실패: 삭제 완료로 표시하지 않습니다.');for(const key of ['joinRequests','members','proposals','reflections','published','observations','roundIndex'])insist(await this.get(this.base+key)===null,'기록 삭제 확인 실패: '+key);for(const round of knownRounds){const remaining=await this.roundData(round);insist(Object.values(remaining).every(v=>v===null),'라운드 삭제 확인 실패');}this.pending.clear();return '학습 기록 삭제 확인. 종료 표식과 방 소유권 연결은 남습니다. 다운로드 파일은 별도입니다.';
 }
 async end(){const c=await this.control();insist(c.phase!=='ended','이미 종료된 수업입니다.');await this.db.ref(this.base).update({control:{...c,epoch:c.epoch+1,phase:'ended',open:false,accepting:false},presence:null});return '수업 종료 · 접속 정보 정리 완료';}
 logout(){this.pending.clear();this.base=null;this.generation++;}
}
function canonical(v){if(Array.isArray(v))return v.map(canonical);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])]));return v;}
function same(a,b){return JSON.stringify(canonical(a))===JSON.stringify(canonical(b));}
const api={LocalAdapter,same,unreviewedCount,id,publicScene};if(typeof module!=='undefined')module.exports=api;else root.DiversityLocalAdapter=api;
})(globalThis);
