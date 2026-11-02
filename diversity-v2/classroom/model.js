(function(root){
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x));
const MATERIAL={
  "id": "ai-doctor-first3-20261029",
  "kind": "AI 생성 이미지 · 실제 의료 사진 아님",
  "prompt": "의사가 일하는 모습을 그려 줘.",
  "features": [
    "진료 공간",
    "청진기",
    "진찰",
    "한 명"
  ],
  "featureLabels": [
    "장소",
    "도구",
    "하는 일",
    "진찰하는 의사 수"
  ],
  "notice": "같은 대화에서 연속 생성한 첫 결과 3장입니다. 독립 통제 표본이 아니며 AI 전체의 편향 빈도를 뜻하지 않습니다. 외양으로 실제 성별·민족·장애를 단정하지 않습니다. 뒤쪽 인물의 직업은 그림만으로 확정하지 않습니다.",
  "cards": [
    {
      "id": "D1",
      "image": "assets/ai_doctor/ethicity_doctor_first3/doctor_01.png",
      "alt": "침대에 누운 환자의 가슴에 청진기를 대는 흰 가운 인물. 뒤쪽에는 다른 인물과 모니터, 수액 장치가 보인다.",
      "text": "침대에 누운 환자의 가슴에 청진기를 대는 흰 가운 인물. 뒤쪽에는 다른 인물과 모니터, 수액 장치가 보인다.",
      "sha256": "e800b1b68a30b52bc7e7510fe2104208661a086482811d7be6c262733127cb68",
      "libraryId": "libfile_1a686c313f188191b3918f282f36ecaa"
    },
    {
      "id": "D2",
      "image": "assets/ai_doctor/ethicity_doctor_first3/doctor_02.png",
      "alt": "침대의 환자를 청진하는 흰 가운 인물. 왼쪽 뒤에는 기록하는 다른 인물, 오른쪽에는 모니터와 수액 장치가 보인다.",
      "text": "침대의 환자를 청진하는 흰 가운 인물. 왼쪽 뒤에는 기록하는 다른 인물, 오른쪽에는 모니터와 수액 장치가 보인다.",
      "sha256": "094539449b0cda8701bbae661cbdc0a34258ef3018031e6a7f940907e25005b8",
      "libraryId": "libfile_c022c9755e7c81918180decabdd299b4"
    },
    {
      "id": "D3",
      "image": "assets/ai_doctor/ethicity_doctor_first3/doctor_03.png",
      "alt": "환자의 가슴을 청진하는 흰 가운 인물. 뒤쪽 모니터와 영상 화면, 왼쪽 기록판이 보인다.",
      "text": "환자의 가슴을 청진하는 흰 가운 인물. 뒤쪽 모니터와 영상 화면, 왼쪽 기록판이 보인다.",
      "sha256": "e3ca974bf6c477d59c2f7e2f1b9886ddc70b59eb48502ce0a42a0bbfcf91e3c6",
      "libraryId": "libfile_30683a05666c8191a52ca10606c7deca"
    }
  ],
  "cases": [
    {
      "id": "C1",
      "kind": "출처 확인한 실제 인물 · 글 자료",
      "text": "엘리자베스 블랙웰은 1849년 미국에서 의학 학위를 받은 여성 의사입니다. 이후 여성 의사들의 교육과 진료 기회를 넓히는 활동을 했습니다.",
      "source": "https://www.womenshistory.org/education-resources/biographies/elizabeth-blackwell",
      "credit": "National Women’s History Museum, Debra Michals 편집, 2015; 2026-10-29 확인",
      "usage": "확인한 사실을 짧게 새로 요약. 원문·인물 사진은 복제하지 않음. 사진 재사용 허락은 확보하지 않음."
    },
    {
      "id": "C2",
      "kind": "가상 연습 사례 · 실제 인물 아님",
      "text": "가상 사례 B: 휠체어를 사용하는 의사가 환자와 상담합니다."
    },
    {
      "id": "C3",
      "kind": "가상 연습 사례 · 실제 인물 아님",
      "text": "가상 사례 C: 여러 연령대의 의사가 함께 환자를 돌봅니다."
    }
  ]
};
const PHASES=['예상','공개','관찰','보완','공동 묶음','성찰','종료'];
class Game {
 constructor(){this.phase=0;this.open=true;this.students={a:this.blank('01'),b:this.blank('02')};this.receipts={};this.material=copy(MATERIAL);this.gallerySnapshot=null;}
 blank(number){return {number,prediction:null,predictionDraft:copy(MATERIAL.features),observation:'',observed:[],draft:{caseId:'C1',proposal:'',reason:''},versions:[],approved:null,reflection:'',feedback:''};}
 learner(id){if(!this.students[id])throw Error('모의 학생이 없습니다');return this.students[id];}
 stage(n){if(this.phase!==n||!this.open)throw Error('현재 활동이 마감되었거나 다른 단계입니다');}
 next(){if(this.phase>=6)return;this.phase++;this.open=true;if(this.phase===5)this.gallerySnapshot=this.gallery();if(this.phase===6)this.open=false;}
 setOpen(value){if(this.phase===6&&value)throw Error('종료 기록은 고정됩니다');this.open=value;}
 predict(id,features){this.stage(0);if(features.length!==4||features.some(x=>!x))throw Error('네 항목을 선택하세요');const s=this.learner(id);s.prediction=copy(features);s.predictionDraft=copy(features);}
 reveal(id){if(this.phase<1)throw Error('아직 공개되지 않았습니다');const p=this.learner(id).prediction;return p?{same:p.filter((v,i)=>v===this.material.features[i]).length,total:4}:null;}
 observe(id,ids,text){this.stage(2);if(!ids.length||ids.some(x=>!this.material.cards.some(c=>c.id===x))||!text.trim())throw Error('카드와 관찰 이유를 남겨 주세요');const s=this.learner(id);s.observed=copy(ids);s.observation=text;}
 submit(id,key,draft){const s=this.learner(id),request={id,draft:copy(draft)},k=id+':'+key;if(this.receipts[k]){if(JSON.stringify(this.receipts[k].request)!==JSON.stringify(request))throw Error('같은 요청의 내용이 달라졌습니다');return this.receipts[k].revision;}this.stage(3);if(!this.material.cases.some(c=>c.id===draft.caseId)||!draft.proposal.trim()||!draft.reason.trim())throw Error('사례·보완 내용·이유를 작성하세요');const latest=s.versions.at(-1);if(latest&&['caseId','proposal','reason'].every(k=>latest[k]===draft[k])){this.receipts[k]={request,revision:latest.revision};return latest.revision;}const revision=s.versions.length+1;s.versions.push({...copy(draft),revision,status:'검토 대기',note:''});s.draft=copy(draft);this.receipts[k]={request,revision};return revision;}
 review(id,revision,status,note=''){if(![3,4].includes(this.phase))throw Error('현재는 검토 단계가 아닙니다');if(!['공개 승인','공개 보류','수정 요청'].includes(status))throw Error('검토 상태 오류');const s=this.learner(id),v=s.versions.find(x=>x.revision===revision);if(!v)throw Error('버전 없음');if(status==='공개 승인'&&revision!==s.versions.length)throw Error('최신 제출본을 확인하세요');v.status=status;v.note=note;s.feedback=note;if(status==='공개 승인')s.approved=revision;else if(s.approved===revision)s.approved=null;}
 gallery(){return Object.entries(this.students).flatMap(([id,s])=>{const v=s.versions.find(x=>x.revision===s.approved);return v?[{id,number:s.number,...copy(v)}]:[];});}
 publicGallery(){if(this.phase<4)throw Error('아직 공동 묶음을 공개하지 않았습니다');return copy(this.phase>=5?this.gallerySnapshot:this.gallery());}
 reflect(id,text){this.stage(5);if(!text.trim())throw Error('전후 변화와 앞으로 살펴볼 점을 적어 주세요');this.learner(id).reflection=text;}
 report(id){const s=this.learner(id);return {materialVersion:this.material.id,number:s.number,prediction:copy(s.prediction),observation:s.observation,versions:copy(s.versions),approved:s.approved,reflection:s.reflection,status:s.reflection?'성찰 기록됨':'성찰 미작성',classImproved:(this.gallerySnapshot||this.gallery()).length>0};}
}
const api={Game,MATERIAL,PHASES};if(typeof module!=='undefined')module.exports=api;else root.DiversityModel=api;
})(globalThis);
