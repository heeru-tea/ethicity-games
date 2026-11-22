(function(){'use strict';
 const teacher=document.getElementById('review-teacher'),student=document.getElementById('review-student'),status=document.getElementById('review-status');let joinedCode='';
 window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==teacher.contentWindow)return;
  const m=event.data;if(m?.channel!=='ethicity-data-review'||m.kind!=='room-ready'||typeof m.code!=='string'||!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/.test(m.code)||m.code===joinedCode)return;
  joinedCode=m.code;student.src='index.html?review=student&rev=20261122-scene&room='+encodeURIComponent(m.code);
  status.textContent='수업 '+m.code+' · 오른쪽에서 닉네임으로 참여한 뒤, 왼쪽에서 이야기를 열어 함께 점검하세요.';
 });
})();
