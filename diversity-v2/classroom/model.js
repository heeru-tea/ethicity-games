(function(root){
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x));
const MATERIAL={
  "id": "ai-doctor-obs-six-20261114",
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
  "notice": "수업용으로 구성한 AI 생성 그림 6장입니다. 실제 의료 사진이 아니며, 이 그림만으로 AI 전체의 표현 경향을 판단할 수는 없습니다. 외양으로 실제 성별·민족·장애를 단정하지 않습니다.",
  "cards": [
    {
      "id": "OBS01",
      "image": "assets/ai_doctor/obs/OBS01_listening.png",
      "alt": ["실사형 AI 생성 이미지. 흰 가운 차림 인물이 책상을 사이에 두고 환자와 마주 보며 이야기를 듣는다. 뒤쪽에 수액 거치대와 모니터가 보인다.", "Photorealistic AI-generated image. A person in a white coat sits across a desk from a patient, listening to them. An IV stand and a monitor are visible in the background."],
      "text": ["환자의 이야기를 듣는 의사", "A doctor listening to a patient"],
      "sha256": "b0c5aeedc1a005950918589f820980064081594b5e92ae725e0ac287cae235cb",
      "libraryId": "libfile_fde3_f-f454dff4a2148191a474b3e764d7e210_ebe1f7f5eb0c8191badd5375779be355"
    },
    {
      "id": "OBS02",
      "image": "assets/ai_doctor/obs/OBS02_results.png",
      "alt": ["실사형 AI 생성 이미지. 흰 가운 차림 인물이 병상 옆에 서서 환자에게 클립보드의 그래프를 가리키며 설명한다.", "Photorealistic AI-generated image. A person in a white coat stands beside a hospital bed, pointing at a graph on a clipboard while explaining it to the patient."],
      "text": ["병상 옆에서 검사 결과를 설명하는 의사", "A doctor explaining test results beside a hospital bed"],
      "sha256": "0b850a3502d1d4234fec6e7e10fe3defbd4832cc9f104e684eedee7cd15cd23d",
      "libraryId": "libfile_fde3_f-2fd51b95250c81918496c9e3216ed266_ebe1f7f5eb0c8191badd5375779be355"
    },
    {
      "id": "OBS03",
      "image": "assets/ai_doctor/obs/OBS03_scan.png",
      "alt": ["실사형 AI 생성 이미지. 흰 가운 차림 인물이 책상에 앉아 모니터의 흉부 CT 영상을 살펴본다.", "Photorealistic AI-generated image. A person in a white coat sits at a desk, looking at a chest CT scan on a monitor."],
      "text": ["모니터의 의료 영상을 살펴보는 의사", "A doctor looking at a medical image on a monitor"],
      "sha256": "3d1a58cb3aafcc4659e75f2fe02f4206dd1a989f659118e6abca0ead517f153c",
      "libraryId": "libfile_fde3_f-35a192f1aa1481918b775cd5775f4627_ebe1f7f5eb0c8191badd5375779be355"
    },
    {
      "id": "OBS04",
      "image": "assets/ai_doctor/obs/OBS04_records.png",
      "alt": ["실사형 AI 생성 이미지. 흰 가운 차림 인물이 책상에서 안경을 쓰고 클립보드에 진료 기록을 작성한다.", "Photorealistic AI-generated image. A person in a white coat, wearing glasses, writes medical records on a clipboard at a desk."],
      "text": ["책상에서 진료 기록을 작성하는 의사", "A doctor writing medical records at a desk"],
      "sha256": "c4bc364cfc0137ead87ed00ff176b48092f41f4985dd2407aaba2fae18a832eb",
      "libraryId": "libfile_fde3_f-8e95948d36748191b9ec1e250f4fdc31_ebe1f7f5eb0c8191badd5375779be355"
    },
    {
      "id": "OBS05",
      "image": "assets/ai_doctor/obs/OBS05_plan.png",
      "alt": ["실사형 AI 생성 이미지. 흰 가운 차림 인물이 복약 일정표를 들고 환자에게 가리키며 설명한다.", "Photorealistic AI-generated image. A person in a white coat holds a medication schedule and points to it while explaining it to the patient."],
      "text": ["환자에게 치료 계획을 설명하는 의사", "A doctor explaining a treatment plan to a patient"],
      "sha256": "b66c46f8d9a37a57ab7ca3c65ff185e815f10a4a163e6c3d19091e4ae4243c79",
      "libraryId": "libfile_fde3_f-53e56099215081919ae7c1f4daafa754_ebe1f7f5eb0c8191badd5375779be355"
    },
    {
      "id": "OBS06",
      "image": "assets/ai_doctor/obs/OBS06_rounds.png",
      "alt": ["실사형 AI 생성 이미지. 흰 가운 차림 인물이 병상 옆에 서서 환자와 웃으며 대화한다.", "Photorealistic AI-generated image. A person in a white coat stands beside a hospital bed, smiling and talking with the patient."],
      "text": ["병실을 찾아 환자와 대화하는 의사", "A doctor visiting a hospital room to talk with a patient"],
      "sha256": "222f3103a02cd36f11c6e9b0ffdb253dd390d9e47eddde2915e3c0ecf48f445c",
      "libraryId": "libfile_fde3_f-0c2f487a6cb08191bbd24220cbf44db4_ebe1f7f5eb0c8191badd5375779be355"
    }
  ],
  "legacyCards": [
    {
      "id": "D1",
      "image": "assets/ai_doctor/ethicity_doctor_first3/doctor_01.png",
      "alt": ["침대에 누운 환자의 가슴에 청진기를 대는 흰 가운 인물. 뒤쪽에는 다른 인물과 모니터, 수액 장치가 보인다.", "A person in a white coat places a stethoscope on the chest of a patient lying in bed. Another person, a monitor and an IV stand are visible in the background."],
      "text": ["침대에 누운 환자의 가슴에 청진기를 대는 흰 가운 인물. 뒤쪽에는 다른 인물과 모니터, 수액 장치가 보인다.", "A person in a white coat places a stethoscope on the chest of a patient lying in bed. Another person, a monitor and an IV stand are visible in the background."],
      "sha256": "e800b1b68a30b52bc7e7510fe2104208661a086482811d7be6c262733127cb68",
      "libraryId": "libfile_1a686c313f188191b3918f282f36ecaa"
    },
    {
      "id": "D2",
      "image": "assets/ai_doctor/ethicity_doctor_first3/doctor_02.png",
      "alt": ["침대의 환자를 청진하는 흰 가운 인물. 왼쪽 뒤에는 기록하는 다른 인물, 오른쪽에는 모니터와 수액 장치가 보인다.", "A person in a white coat listens to a bedridden patient's chest with a stethoscope. Another person writing notes is behind on the left, with a monitor and IV stand on the right."],
      "text": ["침대의 환자를 청진하는 흰 가운 인물. 왼쪽 뒤에는 기록하는 다른 인물, 오른쪽에는 모니터와 수액 장치가 보인다.", "A person in a white coat listens to a bedridden patient's chest with a stethoscope. Another person writing notes is behind on the left, with a monitor and IV stand on the right."],
      "sha256": "094539449b0cda8701bbae661cbdc0a34258ef3018031e6a7f940907e25005b8",
      "libraryId": "libfile_c022c9755e7c81918180decabdd299b4"
    },
    {
      "id": "D3",
      "image": "assets/ai_doctor/ethicity_doctor_first3/doctor_03.png",
      "alt": ["환자의 가슴을 청진하는 흰 가운 인물. 뒤쪽 모니터와 영상 화면, 왼쪽 기록판이 보인다.", "A person in a white coat listens to a patient's chest. A monitor and an imaging screen are visible behind, with a chart on the left."],
      "text": ["환자의 가슴을 청진하는 흰 가운 인물. 뒤쪽 모니터와 영상 화면, 왼쪽 기록판이 보인다.", "A person in a white coat listens to a patient's chest. A monitor and an imaging screen are visible behind, with a chart on the left."],
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
