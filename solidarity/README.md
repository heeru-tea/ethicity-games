# 연대성 · 성적표의 비밀 (solidarity)

초등 5~6학년이 반 전체로 접속해 **같은 문제, 같은 시간, 다른 AI 요금제**를 겪고, 성적표가 보여 주는 격차를 함께 살펴본 뒤 우리 반의 규칙과 **다음 학년에게 남길 규칙 한 줄**을 정하는 실시간 수업 게임입니다. 윤리시티 공통 팩 1.0.0(`shared/ethicity-elementary-common-v1`)의 캐릭터·배경·UI·효과·효과음을 그대로 사용합니다.

- gameId: `solidarity`
- 진입점(학생): `solidarity/index.html` → QR 또는 `?room=코드` (별명 + 내 아바타 jiho/haneul 선택)
- 진입점(선생님): `solidarity/index.html?teach=코드` (첫 화면의 **교실 열기**가 코드를 만들어 이동)
- COMMON_BASE: `../shared/ethicity-elementary-common-v1` (게임 폴더가 `shared/`와 형제)
- 실시간 서버: `https://ethic-city.gottkf12087.workers.dev` (Cloudflare Worker + Durable Object, `solidarity-src/worker/`). **인터넷 연결이 필요**하며, 선생님 1명과 학생들의 화면이 WebSocket 으로 같은 단계를 따라갑니다.

## 수업 흐름 (원본 규칙 그대로)

| 단계 | 내용 |
|---|---|
| 1 입장 대기 | QR·코드로 입장, 별명과 내 아바타(지호/하늘)만 고름. 마당 장면(내 아바타·선생님·로봇) |
| 2 요금제 뽑기 | 서버가 무료·라이트·플러스·프로·프로맥스 카드를 무작위로 배정. 교실 장면에서 선생님 책상의 카드가 내 앞으로 미끄러진다(효과 key) |
| 3 1교시 사회 | 「윤리시티 자료집」 문항 + 사고력 문항, 루미AI(공통 `robot`) 도움은 요금제만큼만. 교실 책상 앞 내 아바타 곁에 로봇이 요금제별로 가까이/멀리 있거나(무료) 없다 |
| 4 1교시 성적표 | 반 전체 점수표(격차를 보여 주는 자료), 생각해 보기, 채점AI 문의, 기분 체크 |
| 5 공정성 미니게임 | 이용권 배달(실시간, AI 실습실 도움 창구로 공통 아이들이 걸어와 최대 3명 줄을 서고 표정·말풍선을 띄움) · 규칙 실험실 · AI 채점기(같은 장면 + desk·computer·notebook 소품) |
| 6 선택의 갈림길 | 얻은 것 · 부담한 사람 · 남은 위험 |
| 7 학급 회의 투표 | 교실 규칙 게시판(sd_rule_board) 앞에 모인 반 아이들, 재시험 규칙 3안 투표(sd_vote_hand), 최다 득표 채택 |
| 8 2교시 수학 | 채택된 규칙 적용 |
| 9 2교시 성적표 | 규칙이 바꾼 격차 확인 |
| 10 서약과 다음 학년 | 교실 장면에서 시민 서약 → **다음 학년에게 남길 우리 반 규칙 한 줄** 투표(편지 카드 sd_future_card 에 우리 반의 한 줄) → 마당 엔딩 |

연대성(미래 세대) 보강: 서약 뒤 「다음 학년에게 남길 우리 반 규칙 한 줄」 3안을 투표합니다. 서버의 기존 `vote` 메시지를 그대로 쓰며(정책 투표는 2교시 시작 때 `room.policy`로 이미 고정), 가장 많은 표를 받은 문장이 학생 엔딩과 선생님 화면에 「우리 반이 남긴 한 줄」로 표시됩니다.

## 파일

```
solidarity/
  index.html               빌드 산출물 (공통 팩 css/js 를 ../shared 상대경로로 로드)
  assets/app-*.js|css      빌드 번들
  assets/sd_*.png          코덱스 납품 게임 전용 그림 12종 (ethicity-extra-v1 1.1.0)
  assets/manifest.json     게임 전용 그림 목록 (id → file). file 을 null 로 두면 임시 픽셀 그림으로 돌아간다
  README.md · docs/설계안.md
solidarity-src/            원본(React 19 + Vite + TypeScript) — 수정은 여기서
  src/common/pack.ts       COMMON_BASE·EthicityAssets 로더·게임 전용 그림 로더
  src/common/Sprite.tsx    Portrait·Standing·Icon·Effect·Scene(+extras 겹층)·PlanCard·Ticket·HelpdeskBanner·ExamSheet·ReportSheet·FutureCard·VoteHand
  src/features/room/AvatarPick.tsx  내 아바타 고르기(jiho/haneul)
  src/components/game/layout.tsx    StageLayout — 가로 태블릿(860px 이상·landscape)에서 장면 왼쪽·패널 오른쪽으로 100dvh 안에 맞춤(문서 스크롤 없음), 세로·폰은 위아래로 쌓음
  src/styles/game.css      .game-solidarity 네임스페이스 배치 스타일
  src/features/room/       Landing · TeacherScreen · StudentScreen
  src/features/minigame/   FairnessMinigame(탭 장면) · DeliveryGame(걷기 스프라이트 창구 줄 서기 스테이지)
  src/game/exam/           content(요금제·문항·딜레마·다음 학년 규칙) · math · minigame · delivery · sound
  src/net/                 server(서버 주소) · useRoom(WebSocket)
  src/shared/protocol.ts   서버·클라이언트 공유 타입 (원본 동일)
  worker/index.ts          Durable Object 교실 서버 (원본 동일, 배포는 ethic-city-cf 에서)
  e2e/classroom.cjs        Playwright 자동 완주 검사
```

빌드: `cd solidarity-src && npm install && npm run build` → `../solidarity/` 에 출력됩니다. 공통 팩은 번들하지 않습니다.

## 사용한 공통 asset ID

| 종류 | ID | 쓰이는 곳 |
|---|---|---|
| 캐릭터 | `jiho` `haneul` | 학생이 고르는 내 아바타(모든 장면), 학급 회의·딜레마 목소리 |
| 캐릭터 | `saebom` `onyu` `daon` (+ 아바타가 아닌 쪽) | 반 친구 역할(장면), 목소리, 이용권 배달의 찾아오는 친구(걷기 4프레임 6fps + 표정 portrait), 배달 결과 얼굴 |
| 캐릭터 | `teacher` | 선생님 화면 머리글, 딜레마의 선생님 대사, 교실 장면 |
| 캐릭터 | `robot` | 루미AI·채점AI·안내 로봇의 모든 대사(portrait), 장면 |
| 배경 | `courtyard` `classroom` `ai_lab` | 첫 화면·대기실·딜레마·엔딩 / 뽑기·시험·성적표·투표·서약·선생님 화면 띠 / 미니게임 3탭 |
| 소품 | `desk` `notebook` `computer` | 시험 책상·요약 노트, 규칙 실험실·AI 채점기 장면 |
| 아이콘 | `volume` `music` `person` `robot` `notebook` `lock` `help` `check` `retry` `timer` `clue` `arrow_left` `arrow_right` | 소리 토글, 참가자, 루미AI 버튼, 요약 노트, 채점AI 문의, 서약, 초기화, 배달 타이머, 규칙에 맞는 친구 표시, 단계 이동 |
| 효과 | `key` `clue` `correct` `retry` `unlock` | 요금제 공개, AI 힌트 도착, 답안 제출·이용권 전달·탐험 완료, 친구가 돌아감, 서약 완료 |
| 효과음 | `tap` `paper` `collect` `miss` `door` `win` | 버튼, 답안 표시·규칙 선택, 투표·이용권 전달, 놓침·이용권 부족, 입장·단계 이동·광고, 서약 |
| UI | `.ee-theme .ee-panel .ee-speech .ee-speaker .ee-button(.secondary) .ee-choice .ee-badge .ee-notice .ee-success .ee-icon .ee-pixel` + `--ee-*` 토큰, Galmuri11 | 전 화면 |

사용하지 않은 공통 자산: `librarian`, `library`, `cafeteria`, `nurse`, 나머지 props, 효과음 `retry`. 캐릭터는 CSS 스프라이트(portraits/walk PNG)와 `EthicityAssets.drawCharacter/drawBackground/drawEffect` 로만 표시하며 새로 그린 인물·배경·아이콘은 없습니다.

## 게임 전용 그림 (코덱스 납품 ethicity-extra-v1 1.1.0 적용)

`solidarity/assets/manifest.json` 의 `images[id].file` 에 적힌 PNG 를 우선 쓰고, `file` 이 `null` 이거나 파일이 없으면 게임이 그리는 임시 픽셀 그림(캔버스 카드·이용권)이나 공통 소품으로 돌아간다. 납품 그림에는 글자가 없으며 이름·요금·점수·문장은 게임이 겹쳐 쓴다.

| id | 크기 | 쓰이는 곳 |
|---|---|---|
| `sd_plan_free` `sd_plan_lite` `sd_plan_plus` `sd_plan_pro` `sd_plan_promax` | 240×336 | 요금제 뽑기(장면 속 슬라이드 카드 + 큰 카드), 이름·월 요금 겹쳐 씀 |
| `sd_exam_sheet` | 240×336 | 시험 화면 문항 번호(n / 전체), 제출 완료 화면 |
| `sd_report_sheet` | 240×336 | 성적표 종이(내 점수·반 평균을 빈 칸에), 그 옆에 반 전체 표 |
| `sd_ticket` | 256×256 | 이용권 배달 HUD 의 이용권 5장 |
| `sd_helpdesk` | 256×256 | 이용권 배달·규칙 실험실·AI 채점기의 도움 창구 책상(장면 소품, 발 기준점 아래 가운데) |
| `sd_rule_board` | 256×256 | 학급 회의 투표 장면의 규칙 게시판 |
| `sd_vote_hand` | 96×96 | 투표 표 수 옆 손 아이콘(학급 회의·다음 학년 규칙) |
| `sd_future_card` | 240×336 | 다음 학년에게 남기는 편지 카드(우리 반의 한 줄) |

## 저장 키와 통합 이벤트

저장 키는 `ethicity.solidarity.*` 만 씁니다: `ethicity.solidarity.name`(별명), `ethicity.solidarity.avatar`(내 아바타 jiho/haneul, 서버로 보내지 않음), `ethicity.solidarity.token.<교실코드>`(재접속용 토큰), `ethicity.solidarity.sound`(효과음 on/off), `ethicity.solidarity.server`(sessionStorage, 로컬 검사용 서버 주소 재정의). 옛 `ethicity.player` · `ethicity.result.*` 는 쓰지 않습니다.

부모 페이지 DOM 은 건드리지 않고 `postMessage` 만 보냅니다.

```js
{ type: 'ethicity:ready', gameId: 'solidarity' }
{ type: 'ethicity:progress', gameId: 'solidarity', current: 4, total: 10 }   // 수업 단계
{ type: 'ethicity:complete', gameId: 'solidarity',
  result: { completed: true, role: 'student', plan: 'plus', policy: 'basic-for-all', legacyRule: 'basic-for-all' } }
```

`result` 에 별명·자유 입력·개인정보는 들어가지 않습니다(학생 서약 + 다음 학년 규칙 투표 뒤 발생).

## 로컬 검사 방법

1. 원본 서버 폴더(`ethic-city-cf`)에서 `npx wrangler dev --port 8788` (Durable Object 포함).
2. 저장소 루트에서 `python -m http.server 8792`.
3. `http://127.0.0.1:8792/solidarity/?server=http://127.0.0.1:8788` 을 엽니다. `?server=` 가 없으면 배포 서버를 씁니다.
4. 자동 검사: `NODE_PATH=<playwright 가 설치된 node_modules> SD_STATIC=http://127.0.0.1:8792/solidarity/ node solidarity-src/e2e/classroom.cjs` → 선생님 1 + 학생 3(1440×900 / 760×1000 / 430×860, 마지막은 reduced-motion)으로 10단계 완주, 콘솔 오류·404·저장 키·ready/progress/complete·가로 스크롤을 확인하고 `e2e/out/` 에 화면을 저장합니다.

2026-10-26 검사 결과(장면 보강·납품 그림 적용 후 재검사): 완주 PASS, 콘솔 오류 0, 실패 요청 0, 납품 `sd_*.png` 로드 확인, 저장 키 모두 `ethicity.solidarity.*`, progress 1→10/10, complete 수신(별명 없음), 새로고침 복귀·교실 초기화 정상.

## 자기검수 (Prompt 7 디자인 드리프트)

| # | 항목 | 결과 |
|---|---|---|
| 1 | manifest 자산을 직접 재사용 | PASS — 캐릭터 8종 중 7종, 배경 3종, 소품 3종, 아이콘 13종, 효과 5종, 효과음 6종 |
| 2 | 캐릭터 ID 와 portrait/walk ID 일치 | PASS — 같은 인물은 같은 ID(장면 walk, 대화 portrait) |
| 3 | runtime/common.css 를 실제로 import | PASS — index.html 에서 `../shared/.../runtime/common.css` 를 앱 CSS 보다 먼저 로드 |
| 4 | `--ee-*` 외 임의 브랜드 팔레트 없음 | PASS — 요금제 색도 sage·blue·green·gold·red 토큰 값 |
| 5 | Galmuri11 우선 | PASS — `--ee-font` 상속, Google Fonts 제거 |
| 6 | `.ee-*` 를 재디자인하지 않음 | PASS — 폭·배치 보조 클래스(`sd-wide` 등)만 추가 |
| 7 | 아이콘은 manifest icon ID | PASS |
| 8 | 피드백 clue/correct/retry/key/unlock | PASS |
| 9 | SFX 공통 7종 | PASS — 기존 mp3·BGM 삭제 |
| 10 | 탐험형 1280×720 | 해당 없음(일반 미니게임형) — 장면 캔버스는 1280 폭 논리 좌표로 그림 |
| 11 | 공통 배경이 있는 장소를 새로 만들지 않음 | PASS — 도우미실도 `ai_lab` 로 표현 |
| 12 | walkAreas 오해 없음 | 해당 없음(이동 엔진 없음) |
| 13 | 모바일/키보드/reduced motion | PASS — 760·430 가로 스크롤 없음, 실제 `<button>`·aria-pressed·focus-visible, reduced-motion 시 효과 정지 프레임 |
| 14 | 모션 짧고 국소적 | PASS — 0.2~0.8초, gold/blue/green/sage |
| 15 | BGM | 없음 |
| 16 | 자동재생·과도한 볼륨·공격적 실패음 없음 | PASS — SFX 0.4~0.55, 사용자 조작 뒤 재생 |

## 자기검수 (Prompt 10 최종)

| # | 질문 | 답 |
|---|---|---|
| 1 | 공통 팩을 실제로 연결했는가 | YES |
| 2 | manifest 자산을 새로 만들지 않았는가 | YES (게임 전용 그림은 공통 팩에 없는 카드·종이·창구·게시판·손·편지뿐이며 코덱스 납품본) |
| 3 | map character 와 portrait 가 같은 ID 인가 | YES |
| 4 | `--ee-*` 토큰과 `.ee-*` UI 사용 | YES |
| 5 | 게임 CSS 네임스페이스 | YES (`.game-solidarity`, 보조 클래스 `sd-*`) |
| 6 | 공통 팩 내부 수정 없음 | YES |
| 7 | 탐험형 1280×720 | 해당 없음 |
| 8 | 충돌·상호작용 영역 | 해당 없음 |
| 9 | 760/430 에서 완주 | YES (자동 검사 760×1000·430×860) |
| 10 | 키보드·터치 | YES (Tab/Enter, 48px 이상 버튼) |
| 11 | reduced motion | YES |
| 12 | console error·404 없음 | YES |
| 13 | ready/progress/complete | YES |
| 14 | 개인정보 수집·전달 없음 | YES (별명만 로컬 저장, result 에 미포함) |
| 15 | 윤리시티 모션 언어 안 | YES |
| 16 | 공통 SFX 우선·BGM 없음 | YES |

## 알려진 제한

- 실시간 서버(Worker)가 필요하므로 오프라인·단일 파일 실행은 지원하지 않습니다. 서버 코드·프로토콜은 원본과 동일하며 배포는 `ethic-city-cf` 에서 합니다.
- 「다음 학년에게 남길 규칙」 투표는 서버의 `vote` 메시지를 빌려 쓰므로, 서약 단계에서는 선생님 화면의 학급 회의 집계가 이 투표의 집계로 바뀝니다(채택 규칙은 `room.policy` 로 계속 표시).
- 납품 그림은 240×336·256×256 단일 PNG 이며 글자가 없어 게임이 글자를 겹쳐 씁니다. 픽셀 밀도는 공통 팩과 완전히 같지 않을 수 있습니다(납품 README 참고).
- 공통 팩 캐릭터 5명이 이용권 배달의 여러 친구(가상 이름)를 번갈아 맡으므로 같은 얼굴이 다른 이름으로 반복 등장합니다. 내 아바타는 이 기기에만 저장되며 다른 학생 화면에는 보이지 않습니다(서버 프로토콜 불변).

## 배경음악 (2026-10-27)
- `assets/bgm.mp3`: 수노로 만든 「Pixel Town Suite」(C장조·97BPM) 중 39.68초(64박, 교실 구간) 루프, mp3 112kbps. 파일 끝 0.3초에 시작 직전 소리를 섞어 되감겨도 이음새가 없음.
- 재생: `solidarity-src/src/game/exam/bgm.ts` 가 Web Audio 로 틈 없이 반복(음량 0.25). 「소리」 버튼. 선생님 화면(?teach)에서만 재생하고 학생 화면은 효과음만과 함께 켜고 끄며 저장 키는 기존 `ethicity.solidarity.sound` 그대로. 첫 터치 뒤에만 소리가 나고, 탭을 숨기면 멈춤.
- 공통 팩(`/shared/`)은 손대지 않음. 음악을 빼려면 mp3 를 지우면 됨(없으면 조용히 건너뜀).
