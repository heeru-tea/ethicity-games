(function(root){'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
function insist(ok,msg){if(!ok)throw Error(msg);}
function tally(def,ballots,members){
 const counts=Object.fromEntries(Object.keys(def.candidates).map(k=>[k,0]));let accepted=0,excluded=0;
 for(const [uid,b] of Object.entries(ballots||{})){
  if(!members?.[uid]?.approved){excluded++;continue;}
  insist(b.candidateVersion===def.candidateVersion,'후보 버전 충돌');
  const picks=Object.values(b.choices||{});insist(picks.length===1&&counts[picks[0]]!==undefined,'이 연결판은 학생당 1선택만 지원합니다.');
  counts[picks[0]]++;accepted++;
 }
 return {counts,accepted,excluded};
}
function weights(def,counts){const out={};for(const [id,n]of Object.entries(counts)){insist(Number.isInteger(n)&&n>=0&&def.candidates[id],'집계 오류');if(n){const a=def.candidates[id].assetId;insist(a,'대응 이미지 없음');out[a]=(out[a]||0)+n;}}return out;}
const baseline=Object.freeze({D1:1,D2:1,D3:1});
function combined(def,counts){const out={...baseline};for(const [id,n]of Object.entries(weights(def,counts)))out[id]=(out[id]||0)+n;return out;}
function sample(pool,count,rng=Math.random){
 insist(Number.isInteger(count)&&count>=1&&count<=100,'추출 횟수는 1~100입니다.');
 const entries=Object.entries(pool).sort(([a],[b])=>a.localeCompare(b));insist(entries.length>0,'선택된 표본이 없습니다.');
 insist(entries.every(([,w])=>Number.isInteger(w)&&w>0),'표본 수 오류');const total=entries.reduce((s,[,w])=>s+w,0),result=[];
 for(let i=0;i<count;i++){const u=rng();insist(Number.isFinite(u)&&u>=0&&u<1,'난수 범위 오류');let threshold=u*total;for(const [id,w]of entries){threshold-=w;if(threshold<0){result.push(id);break;}}}
 return result;
}
const asMap=xs=>Object.fromEntries(xs.map((v,i)=>['n'+(i+1),v]));
function experiment(round,def,pool,rng=Math.random){const count=def.drawCount||12;return {candidateVersion:round,poolVersion:round,algorithm:'weighted-replacement-v1',baselineVersion:'doctor-first3-equal-v1',count,results:{before:asMap(sample(baseline,count,rng)),after:asMap(sample(pool,count,rng))}};}
const api={clone,insist,tally,weights,baseline,combined,sample,experiment};if(typeof module!=='undefined')module.exports=api;else root.DiversityLocalCore=api;
})(globalThis);
