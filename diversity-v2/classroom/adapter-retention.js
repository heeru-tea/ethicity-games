(function(root){'use strict';
const Parent=root.DiversityLocalAdapter.LocalAdapter,DAY=86400000;
function parse(room){const m=/^(\d{13})_([A-Za-z0-9_-]{1,60})$/.exec(room);if(!m)throw Error('보관 정책 검수용 교실 링크를 확인해 주세요. 기존 교실은 원래 화면에서 열어 주세요.');return {bucket:m[1],id:m[2]};}
function roomId(raw){const suffix=String(raw).replace(/^\d{13}_/,'');if(!/^[A-Za-z0-9_-]{1,60}$/.test(suffix))throw Error('새 교실 식별값 오류');const now=Date.now();return (now-now%3600000)+'_'+suffix;}
function format(ms){return new Date(ms).toLocaleString('ko-KR',{timeZoneName:'short'});}
function notice(control,role){if(!control?.expiresAt)return '';const access=control.expiresAt,purge=access+6*DAY;return '<aside id="retention-notice" class="retention-notice"><p>이용 마감: '+format(access)+'</p><details><summary>보관·내보내기 안내</summary><p>'+(role==='teacher'?'교사도 개설 24시간 뒤에는 기록을 열거나 XLSX를 받을 수 없습니다. 이용 마감 전에 내려받아 주세요.':'개설 24시간 뒤에는 이 교실을 이용할 수 없어요.')+'</p><p>삭제 대상 시각: '+format(purge)+' · 개설 7일 이후 담당자가 대상 확인 후 삭제합니다. 승인·예약 지연 시 더 보관될 수 있습니다.</p><p>자료·접속 정보·수업과 UID의 연결은 삭제 대상입니다. 인증 계정과 이미 내려받은 파일은 남습니다.</p></details></aside>';}
class RetentionAdapter extends Parent{
 bind(room,session){const v=parse(room);super.bind(room,session);this.classPath='classroomsV2/retentionV1/'+v.bucket+'/'+v.id;this.indexPath='classroomsV2RetentionIndex/'+v.bucket+'/'+v.id;this.base=this.classPath+'/sessions/'+session+'/';this.noticeKey='ethicity.classroomRetention.deadline.'+room+'.'+session;this.deadline=null;try{const saved=Number(root.sessionStorage?.getItem(this.noticeKey));if(Number.isSafeInteger(saved)&&saved>0)this.deadline=saved;}catch{}}
 async get(path){if(this.deadline&&Date.now()>=this.deadline)throw Error('이 교실의 24시간 이용 기간이 끝났습니다. 교사도 기록 열람·XLSX 내보내기를 할 수 없습니다. 7일 이후 확인 후 삭제 대상이며 바로 삭제된 것은 아닙니다.');const value=await super.get(path);if(path===this.base+'control'&&value?.expiresAt){this.deadline=value.expiresAt;try{root.sessionStorage?.setItem(this.noticeKey,String(this.deadline));}catch{}}return value;}
 logout(){try{root.sessionStorage?.removeItem(this.noticeKey);}catch{}super.logout();}
 async create(room,session,prepared){this.bind(room,session);if(!prepared?.token||!Number.isSafeInteger(prepared.expiresAt))throw Error('새 수업 준비 정보 오류');const createdAt=prepared.expiresAt-DAY,meta={owner:this.uid,createdAt,accessUntil:prepared.expiresAt,purgeAfter:createdAt+7*DAY,policyVersion:1},index={createdAt,accessUntil:meta.accessUntil,purgeAfter:meta.purgeAfter,policyVersion:1};
 try{await this.db.ref().update({[this.classPath+'/meta']:meta,[this.indexPath]:index});}catch(e){const existing=await super.get(this.classPath+'/meta').catch(()=>null);if(!existing||JSON.stringify(existing,Object.keys(existing).sort())!==JSON.stringify(meta,Object.keys(meta).sort()))throw Error('교실 개설을 확인하지 못했습니다. 시각·연결을 확인해 주세요. 기존 교실은 덮어쓰지 않았습니다.');}
 this.deadline=meta.accessUntil;const c={epoch:1,phase:'issue',open:true,accepting:true,expiresAt:meta.accessUntil,maxChoices:1,activeRound:'',roundNumber:0};const existing=await this.get(this.base+'control');if(existing){if(!root.DiversityLocalAdapter.same(existing,c))throw Error('이미 진행 중인 교실입니다. 이전 수업 이어하기를 이용하세요.');}else await this.confirmed(this.base+'control',c);await this.immutable(this.base+'invites/'+prepared.token,{enabled:true,expiresAt:meta.accessUntil});return prepared.token;
 }
 // Review -> lock -> start-selection, split from the base class's single-step freeze():
 // candidates are written as soon as they're locked (immutable path), and starting selection
 // is a separate, later control write. A teacher who only locked never opens voting by accident.
 async lockCandidates(originals,drawCount=12){const {id,publicScene,unreviewedCount}=root.DiversityLocalAdapter;const c=await this.control();if(c.phase!=='review')throw Error('후보 검토 단계에서 고정하세요.');
  const key='lock:'+c.epoch;let q=this.pending.get(key);
  if(!q){
   const records=await this.get(this.base+'proposals')||{};
   const unreviewed=unreviewedCount(records);if(unreviewed>0)throw Error('미검토 제안 '+unreviewed+'건을 먼저 확인해 주세요.');
   const candidates=Object.fromEntries(originals.map(a=>['original_'+a.id,{text:a.text,reason:'원본 문제 제시 그림 · 후보로 유지',assetId:a.id}]));
   // Dedupe approved proposals by image before turning them into candidates: several students proposing the
   // same picture must not multiply the vote-time candidate list. Each student's own proposal record is untouched.
   const byAsset=new Map();
   for(const record of Object.values(records)){const v=record.current,rv=record.review;if(v?.imageId&&rv?.status==='approved'&&rv.version===v.version&&!byAsset.has(v.imageId))byAsset.set(v.imageId,v);}
   for(const v of byAsset.values())candidates['proposal_'+id()]=publicScene(v.imageId);
   // Deterministic round id (roundNumber+epoch, not random): a duplicate lock at the same epoch targets the same immutable path instead of creating an orphan round.
   const round='r_'+(c.roundNumber+1)+'_'+c.epoch;
   const def={sequence:c.roundNumber+1,candidateVersion:round,createdEpoch:c.epoch,maxChoices:1,drawCount,candidates};
   q={round,def,old:await this.get(this.base+'published/proposals')||{}};this.pending.set(key,q);
  }
  // Rebuild staging from latest reviewed submissions; held/revised/stale versions cannot leak into the next snapshot.
  const updates=Object.fromEntries(Object.keys(q.old).map(k=>[k,null]));Object.assign(updates,q.def.candidates);
  await this.db.ref(this.base+'published/proposals').update(updates);
  await this.immutable(this.base+`rounds/${q.round}/definition`,q.def);
  await this.immutable(this.base+'roundIndex/'+q.round,q.def.sequence);
  this.pending.delete(key);return q.round;
 }
 async startSelection(round){const c=await this.control();if(c.phase!=='review')throw Error('후보 검토 단계에서 시작하세요.');
  const def=await this.get(this.base+'rounds/'+round+'/definition');
  if(!def||def.createdEpoch!==c.epoch||def.sequence!==c.roundNumber+1)throw Error('후보가 고정된 뒤 수업 상태가 바뀌었습니다. 후보를 다시 고정하세요.');
  // Use the captured epoch: an intervening teacher action causes a conflict, never a silent rebase.
  await this.confirmed(this.base+'control',{...c,epoch:c.epoch+1,phase:'vote',open:true,activeRound:round,roundNumber:c.roundNumber+1});return round;
 }
}
root.RetentionClassroom={roomId,parse,notice};root.DiversityLocalAdapter={...root.DiversityLocalAdapter,LocalAdapter:RetentionAdapter};
})(globalThis);
