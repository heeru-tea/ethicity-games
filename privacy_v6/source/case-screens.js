'use strict';
function casePhoto(scene){return `<div class="case-photo"><canvas width="1280" height="720" data-common-stage="courtyard" data-case-photo="${scene}" role="img" aria-label="공통 캐릭터로 구성한 가상의 사진 자료"></canvas><span class="ee-badge photo-caption">${scene==='class-photo'?'소풍 단체사진 · 친구 5명 · 가상 학교 표시':'함께 찍은 사진 · 친구 2명 · 이름과 장소 표시'}</span></div>`;}
function caseScreen(r,compact=false){
 const d=CASE_SCREENS[r.scene];if(!d)return '';
 const rows=d.rows.map(([label,value])=>`<div class="case-row"><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('');
 let content='';
 if(d.type==='chat')content=`<div class="case-chat">${d.messages.map(([who,text],i)=>`<div class="case-message">${canvasChar(['saebom','onyu','daon'][i],48)}<div class="ee-panel"><b>${who}</b><p>${esc(text)}</p></div></div>`).join('')}</div>`;
 if(d.type==='photo'||d.type==='public-photo')content=casePhoto(r.scene);
 if(d.type==='signup')content=`<div class="case-banner ee-notice">${commonIcon('key',40)}<strong>${esc(d.banner)}</strong></div><div class="mock-fields"><span class="ee-badge">닉네임: 구름별</span><span class="ee-badge">비밀번호: ●●●●●●</span></div>`;
 if(d.type==='reward')content=`<div class="case-banner ee-notice">${commonIcon('key',56)}<strong>${esc(d.banner)}</strong><span class="mock-close">X</span></div>`;
 if(d.type==='account')content=`<div class="case-profile">${canvasChar('friend',80,'worried')}<p>“우리 계정 같이 쓰자!”<br><span class="small">앞으로 이 계정에 대화와 사진이 남을 수 있습니다.</span></p></div>`;
 if(d.type==='device')content=`<div class="mock-fields"><span class="ee-badge">로그인 상태: 접속 중</span><span class="ee-badge">그림 파일: 남아 있음</span></div>`;
 if(d.type==='delete')content=`<div class="deletion-pair"><div class="ee-panel">${commonIcon('close',40)}<b>기기의 앱</b></div><div class="ee-panel">${commonIcon('notebook',40)}<b>서비스의 기록</b></div></div>`;
 return `<article class="case-document ${compact?'compact':''}" aria-label="${esc(d.title)} 가상 자료"><header class="case-document-head">${commonIcon(d.icon,40)}<div><span class="small">가상의 앱 · 관찰 자료</span><h3>${esc(d.title)}</h3><p>${esc(d.subtitle)}</p></div></header>${content}<dl class="case-rows">${rows}</dl><div class="case-document-foot">${commonIcon('inspect',24)}${esc(d.footer)}</div></article>`;
}
function scenePicture(r,extra=''){
 const art=ROUND_ILLUSTRATIONS[r.scene];
 if(!art)return `<figure class="scene-picture ee-panel ${extra}">${caseScreen(r,true)}<figcaption>${esc(r.sceneSetting)}</figcaption></figure>`;
 return `<figure class="scene-picture scene-vignette ee-panel ${extra}"><div class="case-illustration"><img src="assets/scenes/${art.file}" width="1672" height="941" alt="${esc(art.alt)}" decoding="async">${art.cast?`<canvas width="1672" height="941" class="scene-photo-cast" data-scene-photo-cast="${esc(r.scene)}" aria-hidden="true"></canvas>`:''}</div><figcaption><strong>${esc(art.caption)}</strong><span>${esc(r.sceneSetting)}</span><span>가상의 상황을 보여 주는 장면입니다</span></figcaption></figure>`;
}
function observationPages(r){const d=CASE_SCREENS[r.scene],pages=[];
 if(d.messages)for(const [i,[who,text]]of d.messages.entries())pages.push(`<div class="phone-chat">${canvasChar(['saebom','onyu','daon'][i],56)}<h3>${esc(who)}</h3><p>${esc(text)}</p><small>가상 친구들의 단체 대화</small></div>`);
 if(d.type==='photo'||d.type==='public-photo')pages.push(casePhoto(r.scene));
 if(d.banner)pages.push(`<div class="phone-banner">${commonIcon('key',48)}<h3>${esc(d.banner)}</h3><p>${esc(d.footer)}</p></div>`);
 for(const [label,value]of d.rows)pages.push(`<dl class="phone-row"><dt>${esc(label)}</dt><dd>${esc(value)}</dd></dl>`);
 return pages;
}
function appObservation(r){const d=CASE_SCREENS[r.scene],pages=observationPages(r),page=Math.min(S.observePage||0,pages.length-1),tablet=d.type==='device';return `<section class="panel observation-screen"><div class="device-layout"><div class="device-frame ${tablet?'tablet-frame':'phone-frame'}">${tablet?'':'<img class="phone-frame-art" src="assets/devices/helpy-phone.png" alt="" aria-hidden="true">'}<article class="device-screen" aria-label="${esc(d.title)} 가상 화면"><header><strong>${esc(d.title)}</strong><small>가상 자료 · ${page+1}/${pages.length}</small></header><div class="device-page">${pages[page]}</div><footer>${tablet?'공용 기기':'헬피AI 화면 관찰'}</footer></article></div><div class="observation-copy"><div class="screen-intro">${canvasChar('bot',64,'explaining')}<p class="observe-narration">${esc(say(r.observeNarration))}</p></div><p class="small">${esc(STORY.observationNotice)}</p><div class="observation-controls">${pageButtons(page,pages.length,'observe-page','다음 화면 →')}<div class="buttons stage-buttons">${btn('← 사례 다시 보기','back-case','')}${page===pages.length-1?btn('더 확인할 부분 고르기 →','find-signals'):''}</div></div></div></div></section>`;}
