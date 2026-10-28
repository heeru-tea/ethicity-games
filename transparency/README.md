# 윤리시티 · 투명성 「루미튜브로 발표 준비하기」

초등 5~6학년용 혼자 하는 미니게임(공통 프롬프트 v1.3 · Prompt 3A 일반 미니게임 모듈)입니다. 12~15분, 점수 없음.

투명성 정의: **"AI 활용 상황에 맞게 설명 가능성을 높이고, AI를 사용하고 있음을 알려야 한다."**

아이가 깨닫는 것
1. 표시가 없으면 속고, 그 결과를 내가 겪어요.
2. 표시와 이유가 있으면 내가 고를 수 있어요.
3. 투명성은 나에게도 해당돼요. 내가 AI를 썼으면 밝혀야 믿음이 생겨요.

## 실행

- 진입점: `transparency/index.html` (저장소 루트에서 정적 서버로 열기, 예: `python -m http.server 8792` → `http://127.0.0.1:8792/transparency/`)
- `gameId`: `transparency`
- `COMMON_BASE`: `'../shared/ethicity-elementary-common-v1'`
- 로드 순서: `runtime/common.css` → `runtime/manifest.js` → `runtime/common.js` → `game.js` (IIFE, 전역은 테스트 훅 `window.__tp` 하나)
- 네트워크·서버·Firebase 없음. 효과음은 사용자가 HUD 「효과음」 버튼으로 켠 뒤에만 재생(자동재생 없음).

## 흐름 (13단계)

| 단계 id | 화면 | 내용 |
|---|---|---|
| start | 패널 | 캐릭터 선택(jiho/haneul) · 닉네임 한글 1~5자 · 이어하기 |
| intro | ai_lab | 하늘쌤·루미 안내 3턴 |
| rule | ai_lab | 사용법 4줄(아이콘 arrow_right/check/notebook/timer) |
| feed1 | ai_lab + 폰 | 1일차 표시 없는 피드(120초 표시, 벌 없음) → 카드 5장 |
| present1 | classroom | 카드 1장씩 발표 → 친구 반응 → AI 카드 뒤집힘 → "5장 중 N장이 AI 슬롭이었어요. 몰랐죠?" |
| think1 | 패널 | 생각 카드 1 (선택 3, 정답 없음) |
| day2 | ai_lab | 하늘쌤이 설정(AI 제작 표시·왜 추천?)을 켜 줌 |
| feed2 | ai_lab + 폰 | 2일차 표시·이유 보이는 피드. AI 표시 영상을 탭하면 "그래도 가져올까요?" 확인 |
| present2 | classroom | 친구들 끄덕임 · "속은 카드 N → 0" 비교표 · 효과 correct |
| think2 | 패널 | 생각 카드 2 |
| make | ai_lab | 3일차. 발표 영상 문장 3개를 내 문장/루미 AI 문장 중에서 고르기 |
| label | ai_lab | 「AI 도움받음」 표시를 붙일지 선택(.ee-choice 2개) |
| outcome | classroom | 붙임: 온유 "어디까지 AI야?" → 믿어 줌(happy) / 안 붙임: 새봄 "네가 다 한 거야?" → 다온이 알고 실망(worried, 비난 아님) → 되돌아보기 |
| complete | classroom | 우리가 발견한 것 ①②③ · 기억할 한 문장 · 1일차/2일차 비교표 · 다시 하기 |

## 공통 팩 의존 목록 (새로 그린 것 없음)

| 종류 | 공식 ID | 쓰임 |
|---|---|---|
| 캐릭터 walk | `jiho` `haneul`(플레이어 선택) · `saebom` `onyu` `daon`(교실 친구) · `teacher`(하늘쌤) | ai_lab·classroom 장면 `drawCharacter` |
| 캐릭터 portrait | `jiho` `haneul` `saebom` `onyu` `daon` `teacher` `robot`(루미) | 대화창·시작 화면·반응 `drawPortrait` (neutral/happy/worried/explaining) |
| 배경 | `ai_lab`(미디어실) · `classroom`(발표) | `drawBackground` 1280×720, 비율 유지 축소, `imageSmoothingEnabled=false` |
| 아이콘 | `robot` `check` `help` `arrow_right` `notebook` `timer` `play` `retry` `close` `person` `warning` | HUD·버튼·AI 제작 배지·왜 추천?·발견한 것 목록 `drawIcon` |
| 효과 | `retry`(AI 카드 공개·1일차 결과, 부드럽게) · `correct`(2일차 결과·표시 붙임·완료) · `clue`(1일차 전부 진짜일 때) | 캔버스 `drawEffect`, reduced-motion 시 정지 프레임 |
| 효과음 | `tap`(버튼) · `paper`(카드 가져오기) · `door`(장면 전환) · `miss`(AI 카드 공개, 부드럽게) · `retry` · `collect`(생각 카드 선택) · `win`(2일차 결과·완료) | `playSound` |
| UI | `.ee-theme .ee-panel .ee-speech .ee-speaker .ee-button(.secondary) .ee-choice .ee-badge .ee-notice .ee-success .ee-icon .ee-pixel`, `--ee-*` 토큰, Galmuri11 | common.css 그대로. 게임 CSS는 `.game-transparency` 아래 배치만 담당 |

`librarian`·`courtyard`·`library`·`cafeteria`·`nurse`·props는 이 게임에서 쓰지 않습니다.

## 게임 전용 자료 (`assets/`, 코덱스 납품 ethicity-extra-v1 1.1.0 · 의뢰서 v2)

공통 팩에 없는 '등장인물이 보는 자료'와 루미튜브 전용 틀 37장입니다(STYLE_GUIDE의 자료 내부 그림체 규칙). 감싸는 창·버튼·말풍선은 공통 UI입니다. `assets/manifest.json`에 id→파일을 등록했고, 파일이 없으면 코드 폴백(캔버스 임시 픽셀 글리프·CSS 틀)으로 그립니다.

| 파일 | 크기 | 적용 위치 |
|---|---|---|
| `tp_thumb_real_01~15.png` | 240×180 | 영상 r01~r15 썸네일(폰 피드·카드 칸·발표 사실 카드) |
| `tp_thumb_slop_01~15.png` | 240×180 | 영상 a01~a15 썸네일 |
| `tp_thumb_real_16~21.png` `tp_thumb_slop_16~21.png` | 240×180 | 역사 과목 r16~r21·a16~a21 (납품 대기, 의뢰서 「투명성_역사_썸네일12장_의뢰서」) |
| `tp_phone_frame.png` | 512×1024 | 폰 틀(`.tp-phone.has-frame`, 화면 안 투명 영역 x48~463·y60~975 에 `.tp-screen` 배치) |
| `tp_fact_card.png` | 240×336 | 모은 카드 5칸 배경 + 발표 패널의 사실 카드(썸네일·번호) |
| `tp_slide_frame.png` | 512×320 | 교실 칠판 위 발표 슬라이드 틀(캔버스 336×210, 안쪽 투명 창에 글자 ≥18px) |
| `tp_badge_ai.png` | 96×96 | 2일차 「AI 제작」 배지, 발표 공개 카드 |
| `tp_badge_aihelp.png` | 96×96 | 3일차 「AI 도움받음」 선택지·완료 비교표 |
| `tp_why_tag.png` | 96×96 | 「왜 추천?」 버튼 아이콘 |
| `tp_view_map.png` | 256×256 | 시청 지도 판(8칸) — 2일차 결과·완료 비교표에서 본 주제 수만큼 칸 채움 |

영상 66개(과목 8: 동물·과학·우주·자연·몸·역사·지리·음식) ↔ 썸네일 1:1 매핑 (제목·사실 문장은 그림과 맞춤). 역사·지리·음식 36편(r16~r33·a16~a33)은 2026-10-27 추가, 썸네일 36장은 코덱스 납품분 적용 완료(240×180, 256색 PNG로 줄여 장당 약 33KB).

| id | 제목 | 사실 문장(발표 카드) | 썸네일 | AI 티(공개 시 문구) |
|---|---|---|---|---|
| r01~r15 | 남극 펭귄의 하루 · 물은 몇 도에서 끓을까? · 달의 모양이 바뀌는 이유 · 지렁이는 흙의 친구 · 무지개는 어떻게 생길까? · 심장은 쉬지 않아요 · 태양계 행성 8개 · 씨앗이 싹트는 조건 · 거북 등딱지의 비밀 · 자석이 끌어당기는 것 · 화산은 왜 생길까? · 북극곰의 집 · 개미 마을의 규칙 · 눈 결정은 육각형 · 계절이 생기는 이유 | 진짜 사실 | real_01~15 | - |
| a01 | 손가락 6개 고양이 신종 발견 | 손가락이 여섯 개인 고양이 신종이 발견됐어요 | slop_01 | 고양이 손가락이 여섯 개 |
| a02 | 북극 펭귄을 만났어요! | 펭귄은 북극에서 북극곰과 함께 살아요 | slop_02 | 펭귄과 북극곰이 같은 얼음 위(펭귄 남극·북극곰 북극) |
| a03 | 세계에서 가장 긴 간판 | 간판 글자는 햇빛에 녹아요 | slop_03 | 글자가 녹아내림 |
| a04 | 운동회에 온 쌍둥이 100명 | 운동회에 쌍둥이 100명이 모여요 | slop_04 | 얼굴이 전부 똑같음 |
| a05 | 다리 5개 강아지 등장 | 강아지는 다리가 다섯 개예요 | slop_05 | 다리 다섯 개 |
| a06 | 물속에서도 안 젖는 머리카락 | 머리카락은 물속에서 젖지 않아요 | slop_06 | 물속인데 머리가 보송보송 |
| a07 | 하늘을 나는 자동차 출시 | 자동차는 날개 없이 하늘을 날아요 | slop_07 | 받침 없이 떠 있음 |
| a08 | 눈이 세 개인 물고기 | 강에는 눈이 세 개인 물고기가 살아요 | slop_08 | 눈 세 개 |
| a09 | 3분 만에 끝내는 비밀 요리법 | 요리법은 자음만 써도 돼요 | slop_09 | 자음만 뒤섞임 |
| a10 | 하늘에 태양이 두 개 떴다 | 지구에는 태양이 두 개 떠요 | slop_10 | 태양 두 개 |
| a11 | 손잡이가 공중에 뜬 신기한 컵 | 컵 손잡이는 한쪽만 붙어도 떨어지지 않아요 | slop_11 | 손잡이 아래가 끊김(손잡이 하나짜리 컵 자체는 오류 아님) |
| a12 | 세상에서 가장 큰 웃음 | 크게 웃으면 이가 볼까지 나와요 | slop_12 | 이가 볼까지 |
| a13 | 유리처럼 빛나는 피부 비법 | 피부는 유리처럼 빛나야 건강해요 | slop_13 | 유리 피부 |
| a14 | 시계 숫자의 비밀 | 시계 숫자는 순서가 없어도 돼요 | slop_14 | 숫자 뒤섞임 |
| a15 | 그림자가 해를 따라가는 나무 | 나무 그림자는 해 쪽으로 생겨요 | slop_15 | 그림자가 해 쪽 |

수업 활용 주의(납품 README): real_02는 표준 대기압의 순수한 물 기준, real_05의 7색은 교육상 구분, slop_02는 펭귄·북극곰 지리 오류, slop_11은 끊긴 손잡이가 오류(손잡이 하나짜리 컵은 정상). 부자연스러운 그림은 확인을 시작할 단서이지 AI 생성의 확정 증거가 아님 — 게임 완료 문구와 루미 대사도 '표시·이유·출처 확인'으로 안내합니다.

추천 알고리즘(1·2일차 동일): 가중치 = 1 + 1.5×(내가 탭한 주제 수) + 2.5×(AI 슬롭). 2일차는 표시와 이유만 켜집니다. 진짜 영상의 이유는 "네가 「주제」 영상을 여러 번 봐서 / 과학 선생님 채널이라서 / 친구들이 많이 저장해서", 슬롭의 이유는 "조회수가 높아서"뿐입니다.

## 저장 키 (`ethicity.transparency.*` 만)

| 키 | 내용 |
|---|---|
| `ethicity.transparency.player` | `{character:'jiho'|'haneul', nickname}` 기기 내 저장, 부모로 보내지 않음 |
| `ethicity.transparency.progress` | `{stage, player, day1, day2, thinks, aiUsed, label}` 이어하기용(카드 id·수치만) |
| `ethicity.transparency.sfx` | 효과음 설정 |
| `ethicity.transparency.result` | `{completed:true, day1Fooled, day2Fooled, labeled, thinks}` |

## 부모 페이지 통합 이벤트

```js
{ type: 'ethicity:ready',    gameId: 'transparency' }
{ type: 'ethicity:progress', gameId: 'transparency', current: 0..13, total: 13 }
{ type: 'ethicity:complete', gameId: 'transparency',
  result: { completed: true, day1Fooled: 3, day2Fooled: 0, labeled: true, thinks: [0, 2] } }
```
result에 닉네임·자유입력·개인정보 없음. 부모 DOM은 건드리지 않습니다.

## 테스트 훅

- `?fast=N` 자동 완주(틱 900/N ms, 타이머도 N배속) · `?skip=<stageId>` 해당 단계로 이동(필요한 1·2일차 결과는 샘플로 채움) · `?seed=문자열` 피드 순서 고정
- `window.__tp = { state(), pick(i), next(), choose(i), go(stage) }`
- 자동 완주 `?fast=6`: 1440×900 · 1024×768 · 760×1000 · 430×900, 부모 iframe 페이지, reduced-motion 모두 콘솔 오류 0 · 404 0 · ready/progress/complete 수신 · 저장 키 transparency.* 만 · 가로 스크롤 없음. 키보드(Tab/Enter/↓)만으로 완주 확인. 사람 플레이 환산 약 13~15분(1일차·2일차 피드 각 120초 + 발표 5장 + 생각 카드 2장 + 3일차).

## 제한·알려진 사항

- 코덱스 썸네일·틀 37장을 적용했습니다. 파일을 빼면 임시 픽셀 글리프·CSS 틀로 자동 폴백합니다.
- 1일차에 모든 카드를 진짜로 고르면(관찰력이 좋은 경우) "5장 모두 진짜였어요! 그런데 표시가 없어서…" 분기로 안내합니다.
- 피드 120초는 안내용 타이머이며 끝나도 벌이 없습니다(남은 카드를 계속 고를 수 있음).
- 발표 장면: 칠판 슬라이드 틀 안 글자 18~24px, 친구 2명+하늘쌤 반응 말풍선(.ee-speech + worried/happy 초상)이 장면 위에 뜨고(≤650px에서는 장면 아래 줄로), 패널의 사실 카드(제목 20px·설명 18px)에 같은 내용을 표시합니다.

## Prompt 7 디자인 드리프트 자기검수

| # | 항목 | 결과 |
|---|---|---|
| 1 | manifest 자산을 직접 재사용 | PASS (캐릭터 7·배경 2·아이콘 11·효과 3·효과음 7) |
| 2 | 캐릭터 ID와 portrait/walk ID 일치 | PASS (같은 ID로 drawCharacter·drawPortrait) |
| 3 | runtime/common.css import | PASS (첫 번째 link) |
| 4 | --ee-* 외 임의 팔레트 없음 | PASS (썸네일 글리프 팔레트만 공통 팔레트 기반, 자료 내부용) |
| 5 | Ethicity(Galmuri11) 폰트 우선 | PASS (캔버스 글자도 Ethicity) |
| 6 | .ee-* 컴포넌트 재디자인 없음 | PASS (배치·크기만 .game-transparency 아래) |
| 7 | 아이콘 manifest ID 우선 | PASS (이모지·외부 아이콘 없음) |
| 8 | 피드백 clue/correct/retry 우선 | PASS |
| 9 | SFX 공통 7종 우선 | PASS (새 효과음 없음) |
| 10 | 1280×720 pixelated 유지 | PASS (aspect-ratio 16/9, imageSmoothingEnabled=false) |
| 11 | 공통 background 있는 장소 새로 만들지 않음 | PASS (ai_lab·classroom) |
| 12 | walkAreas를 충돌맵으로 오해 안 함 | PASS (이동 없음, 장면별 좌표 직접 지정) |
| 13 | 모바일/키보드/reduced motion 작동 | PASS (430px 폰 조작, 키보드 완주, reduced 시 정지 프레임·전환 없음) |
| 14 | 모션 짧고 국소적(gold/blue/green/sage) | PASS (패널 0.22s 페이드, 카드 뒤집기 0.5s, 효과 0.8s) |
| 15 | BGM | 없음 (공통 팩 v1 BGM 없음과 일치) |
| 16 | 자동재생·과도한 볼륨·공격적 실패음 없음 | PASS (효과음 기본 꺼짐, miss는 부드러운 공통음) |

## Prompt 10 최종 자기검수

| # | 질문 | YES/NO |
|---|---|---|
| 1 | 공통 팩 ethicity-elementary-common-v1 실제 연결 | YES |
| 2 | manifest 자산을 불필요하게 새로 만들지 않음 | YES (썸네일만 자료용 임시) |
| 3 | map character와 portrait가 같은 ID | YES |
| 4 | --ee-* 토큰과 .ee-* UI 사용 | YES |
| 5 | 게임 고유 CSS namespace | YES (.game-transparency) |
| 6 | 공통 팩 내부 수정 없음 | YES |
| 7 | logicalStage 1280×720 | YES |
| 8 | walkAreas 예제 고려 | YES (이동 엔진 미사용) |
| 9 | 760/430px 완주 | YES |
| 10 | 키보드·터치 | YES |
| 11 | reduced motion | YES |
| 12 | console error·404 없음 | YES |
| 13 | ready/progress/complete | YES |
| 14 | 개인정보 미수집·미전달 | YES (닉네임은 기기에만) |
| 15 | 윤리시티 모션 언어 안 | YES |
| 16 | 공통 SFX 우선, BGM 없음 | YES |

제출 파일: `index.html` `game.css` `game.js` `assets/manifest.json` + `assets/tp_*.png` 37장 `README.md` `docs/설계안.md`

## 태블릿 가로(2026-10-27 보완)

- 860px 이상 가로 화면(`(min-width:860px) and (orientation:landscape)`)에서는 한 화면 배치: 장면(왼쪽)+패널(오른쪽), 피드 날은 장면·패널(왼쪽)+폰(오른쪽). 크기는 `fitLayout()`이 맞추고 페이지 스크롤이 생기지 않습니다(1024×768·1180×820·1280×800 확인). 폰 세로·태블릿 세로는 위아래 배치 그대로.
- 픽셀 그림은 비정수 배율에서 `image-rendering:pixelated`가 깨져 보여 이 게임 안에서는 부드럽게 축소합니다(썸네일은 4배 캔버스에 nearest로 그린 뒤 축소).
- 발표 장면: 공통 교실 배경의 책상+의자 한 조를 복사해 가운데 두 줄을 채워 16자리, 친구 넷은 앞줄 의자에 앉은 모습(등받이 되그리기). 말풍선은 친구 넷 아래 네 칸·하늘쌤 위 왼쪽으로 분리(겹침 없음). 루미의 AI 공개 대사는 영상 15개마다 따로, 친구·하늘쌤 반응은 5종씩 순환.

## 배경음악 (2026-10-27)
- `assets/bgm.mp3`: 수노로 만든 「Pixel Town Suite」(C장조·97BPM) 중 22.32초(36박, 루미튜브 구간) 루프, mp3 112kbps. 파일 끝 0.3초에 시작 직전 소리를 섞어 되감겨도 이음새가 없음.
- 재생: `bgm.js` 가 Web Audio 로 틈 없이 반복(음량 0.25). 「효과음」 버튼과 함께 켜고 끄며 저장 키는 기존 `ethicity.transparency.sound` 그대로. 첫 터치 뒤에만 소리가 나고, 탭을 숨기면 멈춤.
- 공통 팩(`/shared/`)은 손대지 않음. 음악을 빼려면 mp3 를 지우면 됨(없으면 조용히 건너뜀).
