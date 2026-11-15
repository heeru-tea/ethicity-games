/* Case facts stay independent of the student's judgment. No answer gate. */
(function(root){
  'use strict';
  function caseOutcome(id,a={}){
    if(id==='saebom'){
      const evidence='독서 메모에서 초안과 수정본으로 이어지는 기록이 있고, 사용한 맞춤법 검사는 과제에서 허용했어요.';
      if(a.rights==='block')return {status:'restricted',protected:false,title:'발표 기회가 아직 돌아오지 않았어요',badge:'권리 보호 미완료 · 멈춘 발표',text:'학교는 AI 경고를 우선해 발표 보류를 유지했어요. 새봄이의 설명과 작성 기록을 확인했는데도 발표 기회는 회복되지 않았어요.',evidence,feedback:'AI 경고와 실제 작성 기록을 비교해 보세요. 추가 확인을 하더라도 발표 기회를 제한해야 하는지 별도로 판단할 수 있어요.'};
      if(a.truth==='ai')return {status:'recheck',protected:false,title:'내 판단과 작성 기록을 다시 비교해요',badge:'재검토 중 · 남은 의심',text:'발표를 바로 취소하지는 않았지만, 여러분은 여전히 AI가 대신 썼다고 판단했어요. 직접 작성의 근거를 충분히 반영했는지 재검토가 남았어요.',evidence,feedback:'의심이 남는 이유를 구체적으로 적고, 초안·수정 기록과 허용된 AI 사용 범위를 다시 비교해 보세요.'};
      if(a.truth==='uncertain')return {status:'protected_pending',protected:true,title:'기회를 지키며 남은 의문을 확인해요',badge:'기회를 지키는 재검토',text:'학교는 불이익을 확정하지 않고 새봄이의 발표 기회를 보장했어요. 직접 썼을 가능성을 인정하면서, 남은 질문은 학생과 함께 확인하기로 했어요.',evidence,feedback:'무엇을 더 확인할지와 언제 검토를 끝낼지 정해 보세요. 불확실함이 곧 권리를 제한할 이유가 되지는 않아요.'};
      return {status:'protected',protected:true,title:'작성 근거를 인정하고 발표 기회를 회복했어요',badge:'다시 살펴보는 눈',text:a.rights==='allow'?'학교는 모은 작성 기록을 근거로 발표를 진행하고, AI 경고가 생긴 이유는 따로 조사하기로 했어요.':'학교는 설명과 작성 기록을 함께 검토해 직접 작성의 근거가 충분하다고 판단했어요. 새봄이의 발표 기회도 회복했어요.',evidence,feedback:'AI 결과만이 아니라 학생의 설명과 과정 기록을 검토한 판단이에요. 같은 오류를 줄일 방법도 생각해 보세요.'};
    }
    const evidence='수기 장부에는 연체가 없고, 학생 코드 대조에서 다른 학생과 잘못 연결된 사실이 확인됐어요.';
    if(a.use==='keep')return {status:'restricted',protected:false,title:'온유에게 닫힌 문이 남았어요',badge:'권리 보호 미완료 · 닫힌 문',text:'학교는 대체 출입 방법을 마련하지 않고 지금 운영을 유지했어요. 오류가 있어도 온유가 즉시 도서관을 이용할 길은 보장되지 않았어요.',evidence,feedback:'편리함을 유지하더라도 사람의 확인과 대체 출입을 동시에 마련할 수 없을까요?'};
    if(a.fairness==='fair')return {status:'recheck',protected:false,title:'출입 제한의 근거를 다시 살펴봐요',badge:'재검토 중 · 출입 판단',text:'앞으로의 운영 방식은 바꾸기로 했지만, 잘못 연결된 기록으로 온유를 막은 판단을 공정하다고 보았어요. 사건 판단과 개선 조치를 함께 재검토해요.',evidence,feedback:'AI가 제한했다는 사실과 제한이 정당하다는 판단은 같지 않아요. 장부와 코드가 보여 주는 근거를 비교해 보세요.'};
    return {status:a.use==='pause'?'protected_paused':'protected',protected:true,title:a.use==='pause'?'AI를 점검하는 동안에도 도서관은 열려 있어요':'다른 확인 방법으로 도서관 문을 열었어요',badge:'모두에게 열린 문',text:a.use==='pause'?'학교는 얼굴인식 사용을 잠시 멈추고 사서의 확인으로 출입을 보장했어요. 온유는 도서관을 이용하고, 학교는 오류와 도입 필요성을 점검해요.':'사서가 장부와 학생 코드를 확인해 온유의 입장을 도왔어요. 앞으로도 사람의 재검토와 대체 출입 방법을 실제로 운영하기로 했어요.',evidence,feedback:'AI를 보조도구로 쓰거나 잠시 멈추는 방식 모두, 점검 중에도 학생의 이용 기회를 보장해야 해요.'};
  }
  function finalOutcome(cases,policy){
    const pending=['saebom','onyu'].filter(id=>!caseOutcome(id,cases[id]).protected);
    if(policy==='efficiency_first')return {status:'restricted',title:'빠른 처리 뒤에 남은 권리 문제',text:'학교의 자동 처리는 빨라졌지만, 잘못 제한된 학생이 즉시 설명하고 도움받을 절차는 마련되지 않았어요.',badge:'권리 보호 미완료',pending};
    if(pending.length)return {status:'pending',title:'원칙을 정했지만 남은 사건이 있어요',text:'앞으로의 운영 원칙은 정했지만, 앞선 사건에서 권리 보호 또는 증거와 판단의 일치 여부가 남아 있어요. 원칙이 실제 학생에게 적용되도록 사건을 다시 살펴볼 수 있어요.',badge:'재검토가 필요한 학교',pending};
    return {status:'protected',badge:'권리를 지키는 학교',pending:[]};
  }
  const api={caseOutcome,finalOutcome};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.RightsOutcomes=api;
})(typeof globalThis!=='undefined'?globalThis:this);
