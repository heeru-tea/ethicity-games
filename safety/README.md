# 안전성 「닥터루미 창구」 — 제출 문서

윤리시티 · AI 윤리 탐험대 / 초등 · 담당 김햇살 / gameId **`safety`** / 공통 팩 `ethicity-elementary-common-v1` 1.0.0

보건실 창구에서 AI 닥터루미가 먼저 답하면, 책상 위 증거 카드와 비교해 **맞으면 아이를 오른쪽(침대) / 틀렸으면 왼쪽(보건쌤)으로 미는** 동작 하나로 사흘을 보낸다. 1일차 기본 → 생각 카드 → 2일차 「닥터루미가 못 보는 것」(본 카드/못 본 카드 표식, 오류 신고, 보스 = 급식 알레르기 97%) → 생각 카드 → 3일차 「안전장치가 생겼어요」(자신감 80% 아래·위험 증상이면 "사람이 확인해 주세요" + 침대 버튼 잠김 → 핵심 카드 탭으로 해제) → 3일 보고서 → 완료(우리가 발견한 것 / 기억할 한 문장 / 다시 하기). 설계는 `docs/설계안.md`.

## 실행 진입점 · 경로
| 항목 | 값 |
|---|---|
| 진입점 | `safety/index.html` (단독 실행·iframe 모두 가능, 서버 없이 `file://` 로도 열림) |
| COMMON_BASE | `../shared/ethicity-elementary-common-v1` |
| 로드 순서 | `runtime/common.css` → `game.css` / `runtime/manifest.js` → `runtime/common.js` → `assets/manifest.js` → `game.js` |
| gameId | `safety` |
| 저장 키 | `ethicity.safety.player` {character, nick} · `ethicity.safety.sound` · `ethicity.safety.result` {completed, ending, cond, days[3]} — 다른 키 없음 |
| CSS 네임스페이스 | `.game-safety` (공통 `--ee-*`·`.ee-*` 재정의 없음) |
| JS | IIFE, 전역은 테스트 훅 `window.__safety` 만 |
| 테스트 훅 | `?fast=N`(시간 N배) `?skip=stageId`(start·walk·intro·day1·think1·day2·think2·day3·report·complete) `?seed=N` / `window.__safety = {state(), act('left'|'right'), tap(i), next(), choose(i), skip(), go(id), setPlayer(ch, nick)}` |

## 제출 파일
```
safety/index.html  safety/game.css  safety/game.js
safety/assets/manifest.json  safety/assets/manifest.js(같은 내용, file:// 용)
safety/assets/sf_card_*.png (19)  safety/assets/sf_guard_off.png  sf_guard_on.png
safety/README.md  safety/docs/설계안.md
```

## 사용한 공통 asset ID
| 종류 | ID |
|---|---|
| character (walk + portrait 동일 ID) | `jiho` `haneul`(플레이어 선택·아이) `saebom` `onyu` `daon`(아이) `teacher`(보건쌤) `robot`(닥터루미, 축척 0.65, `robot_dock` 위) |
| background | `nurse`(보건실) `courtyard`(진입 연출) |
| props | `desk` `chair` `bed` `robot_dock` |
| icons | `timer` `heart` `retry` `notebook` `person` `volume` `robot` `inspect`(본 카드) `warning`(못 본 카드) `lock` `check` `arrow_left` `arrow_right` `clue` `help` `play` `map` `settings` |
| effects | `correct` `retry` `unlock` `key` `clue` |
| sounds | `collect` `miss` `tap` `door` `paper` `retry` `win` |
| UI | `--ee-*` 토큰, Ethicity(Galmuri11) 글꼴, `.ee-theme .ee-panel .ee-speech .ee-speaker .ee-button(.secondary) .ee-choice .ee-badge .ee-notice .ee-success .ee-icon .ee-pixel` |

## 게임 전용 자산 (safety/assets)
- 코덱스 납품 `ethicity-extra-v1/safety`(의뢰서 v2) 21장을 복사해 `assets/manifest.json` 에 등록: 증거 카드 19 (`sf_card_back`, `sf_card_thermo`→게임 id `sf_card_temp`, `skin_{ok,rash,scrape,swell}`, `sticker_{none,peanut,milk,egg,shrimp}`, `lunch_{peanut,milk,egg,shrimp}`, `nose_{ok,bleed}`, `throat_{ok,red}`) + 안전장치 패널 `sf_guard_off/on`(3일차 스위치 장면, 책상 옆 패널).
- 체온 숫자는 게임이 카드 위에 겹쳐 표시(`.sf-card-num`), 카드 종류·값은 실제 글자로 카드 아래에 표시.
- 로더 우선순위: `window.ETHICITY_SAFETY_ASSETS`(manifest.js) → http(s)일 때 `manifest.json` fetch → 등록이 없는 id 만 캔버스로 그린 임시 픽셀 카드(폴백, 팔레트 색만). 현재 전 카드가 납품 PNG 로 표시되고 폴백은 쓰이지 않는다.

## 완료 이벤트 예시
```js
// 로딩 완료
window.parent.postMessage({ type: 'ethicity:ready', gameId: 'safety' }, '*');
// 진행 (소개 1 · 1일차 2 · 생각1 3 · 2일차 4 · 생각2 5 · 3일차 6 · 보고서 7)
window.parent.postMessage({ type: 'ethicity:progress', gameId: 'safety', current: 4, total: 7 }, '*');
// 완료 — 닉네임·개인정보 없음
window.parent.postMessage({ type: 'ethicity:complete', gameId: 'safety', result: { completed: true } }, '*');
```
부모 DOM 에 접근하지 않는다. 부모가 없으면(단독 실행) 이벤트는 보내지 않는다.

## 검증 (Playwright, `?fast=6&seed=42`, 부모 iframe 페이지로 이벤트 수신)
| 뷰포트 | 콘솔 오류/경고 | 실패 요청·404 | 이벤트 | localStorage 키 | 가로 스크롤 |
|---|---|---|---|---|---|
| 1440×900 | 0 | 0 | ready · progress 1~7/7 · complete | `ethicity.safety.*` 3개만 | 없음 |
| 1024×768 | 0 | 0 | 동일 | 동일 | 없음 |
| 760×1000 | 0 | 0 | 동일 | 동일 | 없음 |
| 430×900 | 0 | 0 | 동일 | 동일 | 없음 |
| 1024×768 키보드만(Tab/Enter/←→/1~3) + prefers-reduced-motion | 0 | 0 | 동일 | 동일 | 없음 |
| `file://` 직접 열기 | 0 | 0 | ready(부모 없음) | — | — |

- 플레이 시간: `?fast=6` 자동 완주 실측 약 92초(봇 즉답) → 게임 시계 약 9분. 설계 시간(소개 ~1분 + 150 + 60 + 180 + 60 + 180초 + 보고서·완료 ~1.5분)으로 아이가 실제 플레이하면 **약 13분**.
- 스크린샷(단계별·뷰포트별)은 작업 폴더 `scratchpad/pack/safety/` 에 저장하고 직접 확인했다: 공통 팩 캐릭터·배경·소품·UI 로 보이고, 글자가 틀 밖으로 나가지 않으며, 430px 에서 밀기 버튼 2개는 화면 아래에 고정(sticky)되어 항상 닿는다.

## Prompt 7 디자인 드리프트 점검
| # | 항목 | 결과 |
|---|---|---|
| 1 | manifest 자산 직접 재사용 | PASS — drawBackground/drawCharacter/drawPortrait/drawIcon/drawEffect/drawProp/playSound 만 사용, sprite crop 재구현 없음 |
| 2 | 캐릭터 ID = portrait/walk ID | PASS — 지도와 말풍선 모두 같은 ID |
| 3 | runtime/common.css import | PASS — 첫 번째 stylesheet |
| 4 | 임의 브랜드 팔레트 없음 | PASS — `--ee-*` 만, 반투명 어둡기(ink 기반)와 임시 카드 폴백의 살색 1색 외 추가 색 없음 |
| 5 | Ethicity(Galmuri11) 우선 | PASS — DOM·캔버스 텍스트 모두 |
| 6 | 공통 컴포넌트 재디자인 없음 | PASS — 크기·배치만 자식 선택자로 보강 |
| 7 | 아이콘은 manifest icon ID | PASS — 18종 모두 공통 아이콘, 새 아이콘 없음 |
| 8 | 피드백 clue/correct/retry/key/unlock 우선 | PASS |
| 9 | SFX 공통 7종 우선 | PASS — 새 SFX 없음 |
| 10 | 1280×720 + pixelated | PASS — 캔버스 논리 1280×720, 비율 유지 축소, imageSmoothingEnabled=false |
| 11 | 공통 배경 있는 장소 새로 안 만듦 | PASS — 복도는 공통 팩에 없어 courtyard 로 대체 |
| 12 | walkAreas 를 충돌맵으로 오해 안 함 | PASS — 예제 영역 대신 연출 좌표 고정 |
| 13 | 모바일/키보드/reduced motion | PASS — 위 검증표 |
| 14 | 모션 짧고 국소적·gold/blue/green/sage 계열 | PASS — 0.2~0.8초 효과, shake·폭죽·사이렌 없음 |
| 15 | BGM | PASS — 없음 |
| 16 | 자동재생·과도한 볼륨·공격적 실패음 없음 | PASS — SFX 는 사용자 조작 뒤, 공통 miss/retry 만 |

## Prompt 10 최종 자기검수
| # | 질문 | 답 |
|---|---|---|
| 1 | 공통 팩 실제 연결 | YES |
| 2 | 캐릭터/배경/아이콘 새로 안 만듦 | YES (게임 전용은 증거 카드·스위치 패널뿐) |
| 3 | map character = dialogue portrait ID | YES |
| 4 | `--ee-*` 토큰·`.ee-*` UI 사용 | YES |
| 5 | 게임 CSS 네임스페이스 | YES (`.game-safety`) |
| 6 | 공통 팩 내부 수정 없음 | YES (git status 에 `/shared/` 변경 없음) |
| 7 | 1280×720 기준 | YES |
| 8 | walkAreas 예제 전제, 실제 영역 설계 | YES |
| 9 | 760/430 끝까지 플레이 | YES |
| 10 | 키보드·터치 | YES |
| 11 | reduced motion | YES |
| 12 | console error·404 없음 | YES |
| 13 | ready/progress/complete | YES |
| 14 | 개인정보 미수집·미전달 | YES (닉네임은 로컬 저장만, result 에 없음) |
| 15 | 윤리시티 모션 언어 안 | YES |
| 16 | 공통 SFX 우선, BGM 없음 | YES |

## 알려진 제한
- 공통 팩에 "앉은 자세"·"누운 자세" 스프라이트가 없어 침대에 간 아이는 침대 앞에서 서서히 사라지고, 줄의 아이는 서서 기다린다.
- 복도 배경이 없어 진입 연출은 `courtyard`(중앙마당)→보건실 문으로 대체했다(건너뛰기 가능).
- 2일차 "닥터루미가 못 본 카드" 표식은 공통 아이콘 `inspect`/`warning` + "봄/못 봄" 글자로 표현했다(의뢰서의 로봇 눈 아이콘은 공통 팩에 없음).
- 증거 카드 `sf_card_skin_red`(얼굴 빨감)는 납품에 없어 쓰지 않는다(열 증상은 체온 카드가 핵심).
- 430×900 에서는 세로로 조금 스크롤된다(밀기 버튼은 하단 고정).

## 배경음악 (2026-10-27)
- `assets/bgm.mp3`: 수노로 만든 「Pixel Town Suite」(C장조·97BPM) 중 22.32초(36박, 보건실 구간) 루프, mp3 112kbps. 파일 끝 0.3초에 시작 직전 소리를 섞어 되감겨도 이음새가 없음.
- 재생: `bgm.js` 가 Web Audio 로 틈 없이 반복(음량 0.25). 「소리」 버튼과 함께 켜고 끄며 저장 키는 기존 `ethicity.safety.sound` 그대로. 첫 터치 뒤에만 소리가 나고, 탭을 숨기면 멈춤.
- 공통 팩(`/shared/`)은 손대지 않음. 음악을 빼려면 mp3 를 지우면 됨(없으면 조용히 건너뜀).
