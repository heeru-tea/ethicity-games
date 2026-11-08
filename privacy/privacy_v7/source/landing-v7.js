'use strict';
// v7: 공통 자산과 UI를 그대로 사용하는 교사 시작 화면입니다.
function headerV7(){
 const connection=S.mode==='teacher'?`<span class="conn ${S.network?'':'off'}" id="connection-status" role="status">${S.network?'연결됨':S.error?'연결 확인 필요':'연결 확인 중'}</span>`:S.mode==='student'&&S.cloud?`<span class="conn ${S.network?'':'off'}" id="connection-status">${S.network?'연결됨':'재연결 중'}</span>`:'';
 return connection+(S.player&&S.mode!=='teacher'?`<span class="pill">${esc(S.player.nickname)}</span>`:'')+btn(commonIcon('settings',20)+'화면·소리','experience-settings','')+btn(commonIcon('home',20)+'처음으로','v7-home','');
}
function renderTeacherStartV7(){
 const ready=S.teacherAllowed&&S.network&&!S.busy;
 return `<section class="v7-teacher-start" aria-label="교사 컨트롤타워 시작"><div class="panel v7-start-copy"><span class="ee-badge">교사 컨트롤타워</span>${heading('우리 반의 프라이버시 탐험')}<p class="v7-start-lead">새 수업을 열면 QR코드와 입장 링크를 바로 제공합니다.</p><ol class="v7-start-flow"><li>사례 화면과 친구의 이야기 확인</li><li>위험 신호를 짚고 함께 토론</li><li>선택을 모으고 교사가 결과 공개</li><li>두 점수 확인 · 개인 리포트 저장</li></ol><div class="buttons v7-start-actions">${btn(commonIcon('key',20)+(S.busy?'연결 준비 중…':'새 수업 만들기'),'create-room','primary',ready?'':'disabled')}${btn(commonIcon('retry',20)+'연결 다시 확인','v7-reconnect','',S.busy?'disabled':'')}<a class="btn ee-button secondary" href="index.html?mode=solo&amp;preview=1" target="_blank" rel="noopener">${commonIcon('play',20)}수업 미리보기<span class="sr-only"> (새 탭)</span></a></div><p class="v7-start-note">별도 수업 목록은 만들지 않습니다. 진행 중에는 수업을 만든 브라우저와 현재 교사 화면의 주소를 유지해 주세요.</p>${S.returnRoom?`<div class="buttons">${btn('진행 중인 수업으로 돌아가기','v7-resume','')}</div>`:''}${S.error?`<p class="notice error" role="alert">${esc(S.error)}</p>`:''}${!S.teacherAllowed&&!S.error?'<p class="v7-connection-note" role="status">별도 로그인 없이 수업 연결을 준비합니다.</p>':''}</div><div class="v7-start-art"><figure class="v7-lab-scene"><canvas data-common-stage="ai_lab" width="1280" height="720" role="img" aria-label="윤리시티 AI 연구실에서 탐험가, 친구 새봄과 안내 로봇이 만나는 장면"></canvas><figcaption>프라이버시 탐험 · AI 연구실</figcaption><span class="v7-fiction-label">가상 상황</span></figure><div class="panel v7-start-pacing">시간 제한 없이, 교사가 한 라운드씩 진행합니다.</div></div></section>`;
}
function experienceSettingsV7(){
 modal('화면·소리',`<div class="v7-settings"><p>화면과 소리를 편한 방식으로 조절합니다.</p>${btn(typingEnabled?'타이핑 효과 켜짐':'타이핑 효과 꺼짐','v7-typing','',`aria-pressed="${typingEnabled}"`)}${btn(soundEnabled?'효과음 켜짐':'효과음 꺼짐','v7-sound','',`aria-pressed="${soundEnabled}"`)}<button type="button" class="btn" data-action="toggle-music">${esc(musicLabel())}</button><label class="music-volume"><span>배경음악 음량</span><input id="music-volume" type="range" min="0" max="100" step="5" value="${Math.round(musicVolume*100)}" aria-label="배경음악 음량"><output id="music-volume-value" for="music-volume">${Math.round(musicVolume*100)}%</output></label>${btn(document.fullscreenElement?'전체 화면 해제':'전체 화면 보기','v7-fullscreen','')}<p class="small">미리보기는 새 탭에서 열리며 학생 기록을 만들지 않습니다.</p></div>`,btn('닫기','close-modal'));
 syncMusicControls();
}
async function teacherHomeV7(){
 closeModal();S.returnRoom=S.roomId||S.returnRoom;await loadTeacherRooms();S.view='teacher';S.mode='teacher';render(true);
}
async function landingActionV7(action){
 switch(action){
 case 'experience-settings':experienceSettingsV7();break;
 case 'v7-typing':toggleNarration();experienceSettingsV7();document.querySelector('[data-action="v7-typing"]')?.focus();break;
 case 'v7-sound':toggleSound();experienceSettingsV7();document.querySelector('[data-action="v7-sound"]')?.focus();break;
 case 'v7-fullscreen':try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else showToast('이 브라우저에서는 전체 화면을 지원하지 않습니다.');}catch{showToast('전체 화면을 열지 못했습니다. 브라우저의 전체 화면 메뉴를 이용합니다.');}experienceSettingsV7();break;
 case 'v7-reconnect':if(S.busy)break;if(S.cloud)S.cloud.D.goOnline(S.cloud.db);if(S.teacherAllowed){S.error='';await loadTeacherRooms();showToast('수업 연결을 다시 확인합니다.');}else await connectTeacher();break;
 case 'v7-home':if(S.mode==='teacher'){if(S.room)modal('처음 화면으로 돌아가겠습니까?','<p>수업 기록은 지우지 않습니다. 처음 화면에서 진행 중인 수업으로 돌아갈 수 있습니다.</p>',btn('처음으로','v7-home-confirm')+btn('수업에 남기','close-modal',''));else await teacherHomeV7();}else if(['round','wait','loading'].includes(S.view))confirmLeave('v7-home-confirm');else location.assign(new URL('teacher.html',location.href).href);break;
 case 'v7-home-confirm':if(S.mode==='teacher')await teacherHomeV7();else{saveDraft();location.assign(new URL('teacher.html',location.href).href);}break;
 case 'v7-resume':if(S.returnRoom){const id=S.returnRoom;S.returnRoom=null;await openTeacherRoom(id);}break;
 default:return false;
 }return true;
}
