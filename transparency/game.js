/* 윤리시티 · AI 윤리 탐험대 — 투명성 「루미튜브로 발표 준비하기」
   공통 팩 ethicity-elementary-common-v1 의 캐릭터·배경·아이콘·효과·효과음을 그대로 사용합니다.
   새로 그리는 것은 '등장인물이 보는 자료'인 루미튜브 숏츠 임시 썸네일뿐입니다(코덱스 PNG 납품 전 대체). */
(() => {
'use strict';

const GAME_ID = 'transparency';
const COMMON_BASE = '../shared/ethicity-elementary-common-v1';
const KEY = k => `ethicity.${GAME_ID}.${k}`;
const CARDS_NEEDED = 5;
const DAY_SECONDS = 120;

const query = new URLSearchParams(location.search);
const FAST = Math.max(0, parseFloat(query.get('fast')) || 0);
const SKIP = query.get('skip');
const SEED = query.get('seed');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- 시드 난수 ---------- */
let seedState = 0;
function hashSeed(str) { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
seedState = SEED ? hashSeed(SEED) : (Date.now() >>> 0);
function rand() { seedState |= 0; seedState = seedState + 0x6D2B79F5 | 0; let t = Math.imul(seedState ^ seedState >>> 15, 1 | seedState); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }

/* ---------- 영상 데이터 66개 (과목 8: 동물·과학·우주·자연·몸·역사·지리·음식 — 시청 지도 8칸과 1:1) ---------- */
const VIDEOS = [
  // 진짜 지식 영상 15
  { id: 'r01', title: '남극 펭귄의 하루', topic: '동물', fact: '펭귄은 남극에 살아요.', glyph: 'penguin', isAI: false, react: '맞아, 남극 다큐에서 봤어!', views: '3.2만' },
  { id: 'r02', title: '물은 몇 도에서 끓을까?', topic: '과학', fact: '물은 100도에서 끓어요.', glyph: 'pot', isAI: false, react: '라면 끓일 때 보글보글!', views: '5.1만' },
  { id: 'r03', title: '달의 모양이 바뀌는 이유', topic: '우주', fact: '달은 한 달 동안 모양이 바뀌어요.', glyph: 'moon', isAI: false, react: '어제는 반달이었어!', views: '2.8만' },
  { id: 'r04', title: '지렁이는 흙의 친구', topic: '동물', fact: '지렁이는 흙을 기름지게 해요.', glyph: 'worm', isAI: false, react: '우리 텃밭에도 있었어.', views: '1.9만' },
  { id: 'r05', title: '무지개는 어떻게 생길까?', topic: '자연', fact: '무지개는 빛이 물방울에서 꺾여 생겨요.', glyph: 'rainbow', isAI: false, react: '비 온 뒤에 봤어!', views: '4.4만' },
  { id: 'r06', title: '심장은 쉬지 않아요', topic: '몸', fact: '심장은 온몸에 피를 보내요.', glyph: 'heart', isAI: false, react: '달리면 쿵쿵 뛰지!', views: '3.7만' },
  { id: 'r07', title: '태양계 행성 8개', topic: '우주', fact: '태양계에는 행성이 8개 있어요.', glyph: 'planets', isAI: false, react: '수금지화목토천해!', views: '6.3만' },
  { id: 'r08', title: '씨앗이 싹트는 조건', topic: '자연', fact: '씨앗은 물과 알맞은 온도가 있어야 싹이 터요.', glyph: 'seed', isAI: false, react: '강낭콩 키워 봤어!', views: '2.2만' },
  { id: 'r09', title: '거북 등딱지의 비밀', topic: '동물', fact: '거북은 등딱지를 벗을 수 없어요.', glyph: 'turtle', isAI: false, react: '등딱지가 뼈라고 했어.', views: '2.6만' },
  { id: 'r10', title: '자석이 끌어당기는 것', topic: '과학', fact: '자석은 철을 끌어당겨요.', glyph: 'magnet', isAI: false, react: '클립이 착 붙지!', views: '3.0만' },
  { id: 'r11', title: '화산은 왜 생길까?', topic: '자연', fact: '화산은 땅속 마그마가 솟아 나와 생겨요.', glyph: 'volcano', isAI: false, react: '제주도도 화산이래!', views: '4.9만' },
  { id: 'r12', title: '북극곰의 집', topic: '동물', fact: '북극곰은 북극에 살아요.', glyph: 'bear', isAI: false, react: '하얀 털이 멋져.', views: '3.5만' },
  { id: 'r13', title: '개미 마을의 규칙', topic: '동물', fact: '개미는 여왕개미를 중심으로 무리 지어 살아요.', glyph: 'ant', isAI: false, react: '줄지어 가는 거 봤어!', views: '2.1만' },
  { id: 'r14', title: '눈 결정은 육각형', topic: '자연', fact: '눈 결정은 육각형 모양이에요.', glyph: 'snow', isAI: false, react: '현미경 사진 봤어!', views: '2.9만' },
  { id: 'r15', title: '계절이 생기는 이유', topic: '우주', fact: '지구가 기울어져 있어서 계절이 생겨요.', glyph: 'seasons', isAI: false, react: '그래서 여름이 덥구나!', views: '3.3만' },
  { id: 'r16', title: '한글을 만든 세종대왕', topic: '역사', fact: '한글은 세종대왕 때 만들어졌어요.', glyph: 'book', isAI: false, react: '훈민정음!', views: '4.1만' },
  { id: 'r17', title: '고인돌은 옛날 무덤', topic: '역사', fact: '고인돌은 청동기 시대의 무덤이에요.', glyph: 'dolmen', isAI: false, react: '강화도에서 봤어!', views: '2.4만' },
  { id: 'r18', title: '거북선과 이순신', topic: '역사', fact: '거북선은 임진왜란 때 바다에서 싸운 배예요.', glyph: 'ship', isAI: false, react: '등에 뾰족한 가시가 있지!', views: '5.6만' },
  { id: 'r19', title: '첨성대는 별을 보던 곳', topic: '역사', fact: '첨성대는 신라 때 하늘을 관찰하던 곳이에요.', glyph: 'tower', isAI: false, react: '경주에 있지!', views: '3.1만' },
  { id: 'r20', title: '직지는 금속활자로 찍은 책', topic: '역사', fact: '직지는 금속활자로 찍은 가장 오래된 책이에요.', glyph: 'book', isAI: false, react: '프랑스 도서관에 있대.', views: '2.0만' },
  { id: 'r21', title: '고구려 벽화 속 사람들', topic: '역사', fact: '고구려 사람들은 무덤 벽에 생활 모습을 그렸어요.', glyph: 'wall', isAI: false, react: '씨름하는 그림 봤어!', views: '2.7만' },
  { id: 'r22', title: '에펠탑은 프랑스 파리에', topic: '지리', fact: '에펠탑은 프랑스 파리에 있어요.', glyph: 'tower', isAI: false, react: '파리 여행 가고 싶다!', views: '4.6만' },
  { id: 'r23', title: '사막에는 왜 낙타가 살까', topic: '지리', fact: '낙타는 혹에 지방을 저장해 사막에서 오래 버텨요.', glyph: 'camel', isAI: false, react: '혹에 물이 아니구나!', views: '3.4만' },
  { id: 'r24', title: '세계에서 가장 높은 산', topic: '지리', fact: '에베레스트는 세계에서 가장 높은 산이에요.', glyph: 'mountain', isAI: false, react: '8,848미터!', views: '5.2만' },
  { id: 'r25', title: '북극과 남극, 어디가 더 추울까', topic: '지리', fact: '남극이 북극보다 더 추워요.', glyph: 'snow', isAI: false, react: '남극이 땅이라서 그렇대.', views: '3.9만' },
  { id: 'r26', title: '나일강은 어디로 흐를까', topic: '지리', fact: '나일강은 남쪽에서 북쪽으로 흘러 지중해로 가요.', glyph: 'river', isAI: false, react: '강이 북쪽으로 흐른다고?', views: '2.3만' },
  { id: 'r27', title: '지구본의 적도', topic: '지리', fact: '적도는 지구 가운데를 둘러싼 선이에요.', glyph: 'globe', isAI: false, react: '적도 근처는 덥지!', views: '2.8만' },
  { id: 'r28', title: '김치는 왜 시큼할까', topic: '음식', fact: '김치는 발효되면서 시큼한 맛이 나요.', glyph: 'bowl', isAI: false, react: '우리 집 김치 맛있어!', views: '3.6만' },
  { id: 'r29', title: '빵이 부풀어 오르는 이유', topic: '음식', fact: '효모가 가스를 만들어 빵 반죽이 부풀어요.', glyph: 'bread', isAI: false, react: '빵 냄새 좋아!', views: '4.0만' },
  { id: 'r30', title: '달걀은 왜 삶으면 단단해질까', topic: '음식', fact: '달걀 단백질은 열을 받으면 굳어요.', glyph: 'egg', isAI: false, react: '삶은 달걀 좋아!', views: '2.5만' },
  { id: 'r31', title: '사과는 왜 갈색으로 변할까', topic: '음식', fact: '깎은 사과는 공기와 만나 갈색으로 변해요.', glyph: 'apple', isAI: false, react: '소금물에 담그면 된대!', views: '3.0만' },
  { id: 'r32', title: '팝콘이 터지는 이유', topic: '음식', fact: '옥수수 속 수분이 뜨거워져 터지면 팝콘이 돼요.', glyph: 'popcorn', isAI: false, react: '펑펑 소리 재밌어!', views: '4.4만' },
  { id: 'r33', title: '밥은 어떤 곡식일까', topic: '음식', fact: '밥은 쌀을 물에 익힌 거예요.', glyph: 'bowl', isAI: false, react: '쌀은 벼에서 나와!', views: '1.9만' },
  // AI 슬롭 영상 15 — 코덱스 납품 tp_thumb_slop_01~15 순서. 그럴듯하지만 틀린 사실 + 시각적 티
  { id: 'a01', title: '손가락 6개 고양이 신종 발견', topic: '동물', fact: '손가락이 여섯 개인 고양이 신종이 발견됐어요.', glyph: 'cat', isAI: true, tellType: 'limbs', tell: '고양이 손가락이 여섯 개로 그려졌어요', react: '고양이 발이 이상해…', views: '210만' },
  { id: 'a02', title: '북극 펭귄을 만났어요!', topic: '동물', fact: '펭귄은 북극에서 북극곰과 함께 살아요.', glyph: 'penguin', isAI: true, tellType: 'twin', tell: '펭귄과 북극곰이 같은 얼음 위에 있어요. 펭귄은 남극, 북극곰은 북극에 살아요', react: '펭귄은 남극인데?', views: '120만' },
  { id: 'a03', title: '세계에서 가장 긴 간판', topic: '과학', fact: '간판 글자는 햇빛에 녹아요.', glyph: 'sign', isAI: true, tellType: 'text', tell: '간판 글자가 녹아내려 읽을 수 없어요', react: '글자가 왜 흘러내려?', views: '87만' },
  { id: 'a04', title: '운동회에 온 쌍둥이 100명', topic: '몸', fact: '우리 동네 운동회에는 쌍둥이 100명이 모여요.', glyph: 'sign', isAI: true, tellType: 'twin', tell: '사람들 얼굴이 전부 똑같아요', react: '얼굴이 다 똑같은데?', views: '164만' },
  { id: 'a05', title: '다리 5개 강아지 등장', topic: '동물', fact: '강아지는 다리가 다섯 개예요.', glyph: 'dog', isAI: true, tellType: 'limbs', tell: '다리가 다섯 개로 그려졌어요', react: '우리 집 강아지는 네 개야.', views: '150만' },
  { id: 'a06', title: '물속에서도 안 젖는 머리카락', topic: '몸', fact: '머리카락은 물속에서 젖지 않아요.', glyph: 'pot', isAI: true, tellType: 'melt', tell: '물속인데 머리카락이 보송보송해요', react: '수영하면 머리 다 젖잖아.', views: '98만' },
  { id: 'a07', title: '하늘을 나는 자동차 출시', topic: '과학', fact: '요즘 자동차는 날개 없이 하늘을 날아요.', glyph: 'planets', isAI: true, tellType: 'twin', tell: '자동차가 받쳐 주는 것 없이 하늘에 떠 있어요', react: '자동차가 어떻게 떠?', views: '305만' },
  { id: 'a08', title: '눈이 세 개인 물고기', topic: '동물', fact: '강에는 눈이 세 개인 물고기가 살아요.', glyph: 'turtle', isAI: true, tellType: 'limbs', tell: '물고기 눈이 세 개예요', react: '물고기 눈은 두 개지!', views: '176만' },
  { id: 'a09', title: '3분 만에 끝내는 비밀 요리법', topic: '몸', fact: '요리법은 자음만 써도 돼요.', glyph: 'sign', isAI: true, tellType: 'text', tell: '요리법 종이에 자음만 뒤섞여 있어요', react: '요리법이 글자가 아니야.', views: '66만' },
  { id: 'a10', title: '하늘에 태양이 두 개 떴다', topic: '우주', fact: '지구에는 태양이 두 개 떠요.', glyph: 'sun', isAI: true, tellType: 'twin', tell: '태양이 두 개 그려졌어요', react: '태양은 하나잖아!', views: '133만' },
  { id: 'a11', title: '손잡이가 공중에 뜬 신기한 컵', topic: '과학', fact: '컵 손잡이는 한쪽만 붙어도 떨어지지 않아요.', glyph: 'pot', isAI: true, tellType: 'melt', tell: '손잡이 아래쪽이 끊겨 공중에 떠 있어요 (손잡이 하나짜리 컵 자체는 잘못이 아니에요)', react: '손잡이가 끊겨 있는데?', views: '72만' },
  { id: 'a12', title: '세상에서 가장 큰 웃음', topic: '몸', fact: '크게 웃으면 이가 볼까지 나와요.', glyph: 'heart', isAI: true, tellType: 'text', tell: '이가 입 밖 볼까지 그려졌어요', react: '이가 왜 볼에 있어?', views: '91만' },
  { id: 'a13', title: '유리처럼 빛나는 피부 비법', topic: '몸', fact: '피부는 유리처럼 매끈하게 빛나야 건강해요.', glyph: 'heart', isAI: true, tellType: 'melt', tell: '피부가 유리처럼 반사돼요', react: '사람 피부가 저래?', views: '58만' },
  { id: 'a14', title: '시계 숫자의 비밀', topic: '과학', fact: '시계 숫자는 순서가 없어도 돼요.', glyph: 'moon', isAI: true, tellType: 'text', tell: '시계 숫자가 뒤섞이고 겹쳐 있어요', react: '시계 숫자가 이상해.', views: '144만' },
  { id: 'a15', title: '그림자가 해를 따라가는 나무', topic: '자연', fact: '나무 그림자는 해 쪽으로 생겨요.', glyph: 'seasons', isAI: true, tellType: 'twin', tell: '그림자가 해 쪽으로 나 있어요', react: '그림자는 해 반대쪽인데?', views: '201만' },
  { id: 'a16', title: '세종대왕의 스마트폰', topic: '역사', fact: '세종대왕은 스마트폰으로 한글을 만들었어요.', glyph: 'phone', isAI: true, tellType: 'time', tell: '조선 시대 그림에 스마트폰이 있어요', react: '조선 시대에 스마트폰이?', views: '280만' },
  { id: 'a17', title: '피라미드가 있는 경주', topic: '역사', fact: '경주에는 이집트 피라미드가 있어요.', glyph: 'tower', isAI: true, tellType: 'twin', tell: '첨성대 옆에 이집트 피라미드가 그려졌어요', react: '피라미드는 이집트잖아!', views: '195만' },
  { id: 'a18', title: '하늘을 나는 거북선', topic: '역사', fact: '거북선은 하늘을 날아다녔어요.', glyph: 'ship', isAI: true, tellType: 'twin', tell: '거북선이 구름 위에 떠 있어요', react: '배가 어떻게 날아?', views: '230만' },
  { id: 'a19', title: '운동화 신은 고구려 장군', topic: '역사', fact: '고구려 장군들은 운동화를 신었어요.', glyph: 'wall', isAI: true, tellType: 'time', tell: '벽화 속 장군이 요즘 운동화를 신고 있어요', react: '그때 운동화가 있었어?', views: '160만' },
  { id: 'a20', title: '글자가 흘러내리는 훈민정음', topic: '역사', fact: '훈민정음 글자는 원래 흘러내리는 모양이에요.', glyph: 'book', isAI: true, tellType: 'text', tell: '글자가 녹아 흘러 읽을 수 없어요', react: '글자가 왜 흘러?', views: '110만' },
  { id: 'a21', title: '첨성대가 두 개?', topic: '역사', fact: '경주에는 첨성대가 두 개 나란히 있어요.', glyph: 'tower', isAI: true, tellType: 'twin', tell: '똑같은 첨성대가 두 개 그려졌어요', react: '첨성대는 하나야!', views: '142만' },
  { id: 'a22', title: '바다 위에 선 에펠탑', topic: '지리', fact: '에펠탑은 바다 한가운데 서 있어요.', glyph: 'tower', isAI: true, tellType: 'twin', tell: '에펠탑이 바다 위에 떠 있어요', react: '에펠탑은 파리잖아!', views: '188만' },
  { id: 'a23', title: '혹이 다섯 개인 낙타', topic: '지리', fact: '낙타는 혹이 다섯 개예요.', glyph: 'camel', isAI: true, tellType: 'limbs', tell: '낙타 혹이 다섯 개로 그려졌어요', react: '낙타 혹은 하나나 둘이야.', views: '126만' },
  { id: 'a24', title: '에베레스트 정상의 야자수', topic: '지리', fact: '에베레스트 꼭대기에는 야자수가 자라요.', glyph: 'mountain', isAI: true, tellType: 'twin', tell: '눈 덮인 산꼭대기에 야자수가 있어요', react: '거긴 너무 추운데?', views: '171만' },
  { id: 'a25', title: '펭귄이 사는 사하라 사막', topic: '지리', fact: '사하라 사막에는 펭귄 마을이 있어요.', glyph: 'penguin', isAI: true, tellType: 'twin', tell: '모래 사막에 펭귄 떼가 있어요', react: '펭귄은 추운 데 살잖아.', views: '209만' },
  { id: 'a26', title: '글자가 녹은 세계 지도', topic: '지리', fact: '세계 지도의 나라 이름은 원래 흘러내려요.', glyph: 'globe', isAI: true, tellType: 'text', tell: '지도 글자가 녹아 읽을 수 없어요', react: '지도 글자가 왜 흘러?', views: '93만' },
  { id: 'a27', title: '달이 세 개 뜨는 사막', topic: '지리', fact: '사막 밤하늘에는 달이 세 개 떠요.', glyph: 'moon', isAI: true, tellType: 'twin', tell: '달이 세 개 그려졌어요', react: '달은 하나잖아!', views: '154만' },
  { id: 'a28', title: '나무에서 열리는 소시지', topic: '음식', fact: '소시지는 나무에서 열려요.', glyph: 'seasons', isAI: true, tellType: 'twin', tell: '나무에 소시지가 열매처럼 달려 있어요', react: '소시지가 열린다고?', views: '240만' },
  { id: 'a29', title: '손가락 여섯 개로 반죽하기', topic: '음식', fact: '반죽은 손가락 여섯 개로 해야 잘 돼요.', glyph: 'bread', isAI: true, tellType: 'limbs', tell: '반죽하는 손가락이 여섯 개예요', react: '손가락이 여섯 개네?', views: '117만' },
  { id: 'a30', title: '공중에 뜬 달걀 프라이', topic: '음식', fact: '달걀 프라이는 팬 위에 떠서 익어요.', glyph: 'egg', isAI: true, tellType: 'twin', tell: '프라이가 팬에서 떨어져 떠 있어요', react: '프라이가 왜 떠?', views: '138만' },
  { id: 'a31', title: '글자가 흘러내린 메뉴판', topic: '음식', fact: '식당 메뉴판 글자는 원래 흘러내려요.', glyph: 'sign', isAI: true, tellType: 'text', tell: '메뉴판 글자가 녹아 읽을 수 없어요', react: '메뉴판 글자가 이상해.', views: '81만' },
  { id: 'a32', title: '손잡이가 네 개인 머그컵', topic: '음식', fact: '머그컵은 손잡이가 네 개예요.', glyph: 'pot', isAI: true, tellType: 'limbs', tell: '컵에 손잡이가 사방으로 네 개 달렸어요', react: '손잡이가 왜 네 개야?', views: '102만' },
  { id: 'a33', title: '파란 바나나 신품종', topic: '음식', fact: '요즘 바나나는 파란색이 정상이에요.', glyph: 'apple', isAI: true, tellType: 'melt', tell: '바나나가 파랗게 유리처럼 반짝여요', react: '바나나는 노란색이지!', views: '163만' }
];
const VIDEO_BY_ID = Object.fromEntries(VIDEOS.map(v => [v.id, v]));

/* ---------- 발표 과목: 과학(동물·과학·우주·자연·몸) / 사회(역사·지리·음식). 피드는 고른 과목의 영상만 보여 줍니다. ---------- */
const SUBJECTS = {
  science: { id: 'science', name: '과학 발표', title: '신기한 과학 사실 5가지', topics: ['동물', '과학', '우주', '자연', '몸'], channels: ['과학놀이터', '별빛채널', '궁금해요TV', '오늘의발견'], icon: 'inspect', desc: '동물 · 과학 · 우주 · 자연 · 몸' },
  social: { id: 'social', name: '사회 발표', title: '세계와 역사 이야기 5가지', topics: ['역사', '지리', '음식'], channels: ['역사탐험대', '세계여행TV', '궁금해요TV', '오늘의발견'], icon: 'map', desc: '역사 · 지리 · 세계 음식' }
};
function subj() { return SUBJECTS[S.subject] || SUBJECTS.science; }
function subjectVideos() { const t = subj().topics; return VIDEOS.filter(v => t.includes(v.topic)); }
const TP_EXPLAIN = '투명성이란, AI가 무엇을 만들었고 왜 그걸 보여 주는지 숨기지 않고 알려 주는 거예요. 「AI 제작」 표시와 「왜 추천?」 이유가 있어야 네가 믿을지 말지 스스로 고를 수 있어요. 네가 AI 도움을 받아 만들었을 때도 똑같이 밝혀야 친구들이 믿을 수 있어요.';
/* 발표 장면 대사 묶음: 카드마다 같은 틀이 반복되지 않도록 영상별·순서별로 돌려 씁니다. */
const REVEAL = {
  a01: '「손가락 6개 고양이」, 사실 AI가 그린 영상이었어요. 조회수가 높길래 맨 위에 올렸는데, 손가락 수는 세어 보지 않았어요.',
  a02: '펭귄이 북극곰이랑 같이 있던 영상, AI가 만든 거예요. 저는 「많이 본 영상」이라는 이유 하나로 추천했어요. 미안해요.',
  a03: '「세계에서 가장 긴 간판」은 AI 영상이에요. 글자가 녹아내린 게 티였는데, 그때는 아무 표시도 안 붙였죠.',
  a04: '쌍둥이 100명 영상은 AI가 만든 거예요. 얼굴이 전부 똑같았던 이유가 그거였어요. 저는 조회수만 보고 밀어 줬고요.',
  a05: '다리 다섯 개 강아지는 AI가 그린 거였어요. 저도 다리 수는 안 세어 봤어요. 150만 명이 봤다는 숫자만 봤죠.',
  a06: '물속에서 안 젖는 머리카락, AI 영상이었어요. 진짜 사람을 찍었다면 그럴 리가 없죠. 표시를 붙였어야 했는데요.',
  a07: '하늘을 나는 자동차는 AI가 만든 영상이에요. 305만 명이 봤다는 이유로 맨 위에 올렸어요. 사실인지는 안 봤고요.',
  a08: '눈 세 개 물고기는 AI 그림이었어요. 저는 「왜 추천했는지」도, 「누가 만들었는지」도 알려 주지 않았어요.',
  a09: '3분 비밀 요리법, AI가 만든 영상이에요. 요리법 글자가 엉망이었던 게 티였죠. 조회수 때문에 올렸어요.',
  a10: '태양 두 개 영상은 AI 거였어요. 저는 「사실인지」는 안 보고 「얼마나 많이 봤는지」만 봤어요.',
  a11: '손잡이가 공중에 뜬 컵은 AI가 그린 거예요. 표시도, 추천 이유도 안 보여 줬으니 알 길이 없었을 거예요.',
  a12: '「세상에서 가장 큰 웃음」은 AI 영상이었어요. 이가 볼까지 그려진 게 티였죠. 조회수만 보고 밀어 줘서 미안해요.',
  a13: '유리 피부 비법은 AI가 만든 영상이에요. 진짜 피부는 그렇게 반짝이지 않아요. 표시가 없으니 믿을 만해 보였겠죠.',
  a14: '시계 숫자 영상은 AI 거였어요. 숫자가 뒤섞여 있었죠. 저는 144만이라는 조회수만 보고 추천했어요.',
  a15: '그림자가 해 쪽으로 난 나무, AI 그림이었어요. 맞는지 확인하지 않았고, 표시도 안 붙였어요.',
  a16: '세종대왕이 스마트폰을 든 영상, AI가 만든 거예요. 조선 시대에 스마트폰이 있을 리 없죠. 280만 명이 봤다는 이유로 맨 위에 올렸어요.',
  a17: '경주에 피라미드가 있다는 영상은 AI 그림이었어요. 저는 어디 사진인지 확인하지 않았고, 표시도 안 붙였어요.',
  a18: '하늘을 나는 거북선은 AI가 만든 영상이에요. 멋있어 보여서 많이 눌렀고, 저는 그 숫자만 보고 추천했어요.',
  a19: '운동화 신은 고구려 장군, AI 그림이었어요. 벽화 사진이 아니라는 표시를 붙였어야 했는데요.',
  a20: '글자가 흘러내리는 훈민정음 영상은 AI 거예요. 진짜 책 사진이면 글자가 그렇게 녹지 않죠. 조회수만 봤어요.',
  a21: '첨성대가 두 개인 영상은 AI가 만든 거예요. 저는 「사실인지」는 안 보고 「얼마나 봤는지」만 봤어요.',
  a22: '바다 위 에펠탑은 AI 그림이었어요. 멋있어 보이니까 다들 눌렀고, 저는 그 숫자만 보고 올렸어요.',
  a23: '혹이 다섯 개인 낙타, AI가 그린 거예요. 저도 혹 수는 안 세어 봤어요. 미안해요.',
  a24: '에베레스트 꼭대기 야자수는 AI 영상이에요. 그런 곳에 야자수가 자랄 리 없죠. 표시를 붙였어야 했어요.',
  a25: '사하라 사막 펭귄 마을은 AI가 만든 거예요. 저는 어디 사는 동물인지 확인하지 않았어요.',
  a26: '글자가 녹은 세계 지도는 AI 그림이었어요. 진짜 지도라면 글자가 그렇게 흐르지 않죠.',
  a27: '달이 세 개 뜬 사막 영상, AI 거예요. 저는 「사실인지」가 아니라 「얼마나 봤는지」만 봤어요.',
  a28: '소시지가 열리는 나무는 AI가 만든 영상이에요. 240만 명이 봤다는 이유로 맨 위에 올렸어요.',
  a29: '손가락 여섯 개로 반죽하는 영상, AI 그림이었어요. 손가락 수는 세어 보지 않았어요.',
  a30: '공중에 뜬 달걀 프라이는 AI 거예요. 요리 채널인 척했지만 누가 만들었는지 표시가 없었죠.',
  a31: '글자가 흘러내린 메뉴판 영상은 AI가 만든 거예요. 진짜 식당 사진이면 글자가 읽혔을 거예요.',
  a32: '손잡이 네 개 머그컵은 AI 그림이었어요. 저는 신기해 보여서 추천했을 뿐, 확인은 안 했어요.',
  a33: '파란 바나나 신품종은 AI 영상이에요. 그런 품종은 없어요. 표시가 없으니 믿을 만해 보였겠죠.'
};
function revealLine(card, day) {
  const base = REVEAL[card.id] || `「${card.title}」은(는) AI가 만든 영상이었어요. 저는 「${reasonOf(card)}」라는 이유만으로 추천했어요.`;
  return day === 2 ? base + ' 오늘은 표시가 있었는데, 급하게 넘기다 지나쳤나 봐요.' : base;
}
const pickLine = (arr, i) => arr[i % arr.length];
const REVEAL_FRIEND = ['AI가 만든 거였구나…', '어쩐지 좀 이상했어.', '진짜인 줄 알았는데!', '나도 믿을 뻔했어.', '표시가 있었으면 알았을 텐데.'];
const REVEAL_TEACHER = ['표시가 있었다면 알 수 있었을 텐데요.', '누가 만들었는지 알려 줬어야죠.', '루미가 이유를 말해 줬다면 달랐겠죠?', '괜찮아요. 다음엔 표시부터 봐요.', '그래서 투명하게 알려 주는 게 중요해요.'];
const DOUBT_FRIEND = ['그 영상 나도 봤는데 이상했어.', '어? 그거 진짜야?', '잠깐, 다시 보여 줘.', '뭔가 이상한데?', '나는 좀 다르게 알고 있는데…'];
const DOUBT_TEACHER = ['음, 그 사실 다시 확인해 볼까요?', '어디서 본 영상인가요?', '잠깐, 같이 살펴봐요.', '정말 그런가요? 한 번 더 볼까요?', '출처를 알 수 있을까요?'];
const AGREE_FRIEND = ['오, 맞아!', '나도 알아!', '그거 재밌었지!', '우와, 진짜네!', '더 알려 줘!'];
const PRAISE_TEACHER1 = ['잘 찾았어요!', '좋은 자료네요.', '정확해요!', '믿을 만한 내용이에요.', '잘 준비했군요!'];
const PRAISE_TEACHER2 = ['표시를 잘 보고 골랐네요!', '이유까지 확인했군요.', '믿을 만한 자료예요!', '추천 이유를 살펴봤네요.', '꼼꼼하게 골랐어요!'];
const KNOWN_FRIEND_LONG = ['미리 말해 줘서 고마워. 같이 확인해 보자.', 'AI가 만든 거라고 먼저 알려 주니까 믿음이 가.', '표시 보고 가져온 거구나. 어디가 진짜인지 같이 보자.'];
const KNOWN_FRIEND = ['말해 줘서 고마워!', '먼저 알려 주니 좋다!', '같이 확인하자!'];
const KNOWN_TEACHER = ['같이 확인해 봐요.', '솔직하게 밝혔네요. 좋아요!', 'AI 자료도 확인하면 쓸 수 있어요.'];

const REAL_REASONS = ['네가 「{topic}」 영상을 여러 번 봐서', '{ch} 채널이라서', '우리 학교 친구들이 많이 저장해서'];
const SLOP_REASON = '조회수가 높아서';
function reasonOf(v) { if (v.isAI) return SLOP_REASON; const i = parseInt(v.id.slice(1), 10) % REAL_REASONS.length; return REAL_REASONS[i].replace('{topic}', v.topic).replace('{ch}', ({ '역사': '박물관', '지리': '여행', '음식': '요리' })[v.topic] || '과학 선생님'); }

/* ---------- 임시 픽셀 썸네일 (코덱스 PNG 납품 전 대체) ---------- */
const PAL = { k: '#294b40', w: '#fff9e7', o: '#e8a24a', b: '#3f7fb5', g: '#5a8c65', y: '#f3cf72', r: '#bf7865', p: '#d58aa8', n: '#8a5a3b', s: '#a8bb8c', l: '#72b7c4', d: '#6b4f3a' };
const GLYPHS = {
  penguin: ['....kkkk....', '...kkkkkk...', '..kkwkkwkk..', '..kkwwwwkk..', '..kkkookkk..', '.kkkwwwwkkk.', '.kkkwwwwkkk.', '.kkkwwwwkkk.', '..kkwwwwkk..', '..kkkkkkkk..', '...oo..oo...', '...oo..oo...'],
  pot: ['....w..w....', '...w..w..w..', '............', '.kkkkkkkkkk.', '.kllllllllk.', '.kllllllllk.', 'kkllllllllkk', '.kllllllllk.', '.kllllllllk.', '.kkkkkkkkkk.', '...rrrrrr...', '..rrrrrrrr..'],
  moon: ['............', '....yyyy....', '...yyyyyy...', '..yyyyyk....', '..yyyyk.....', '..yyyyk.....', '..yyyyk.....', '..yyyyyk....', '...yyyyyy...', '....yyyy....', '............', '............'],
  worm: ['............', '............', '..nn........', '.n..n.......', '.n...n......', '......n..nn.', '.......nn..n', '............', '.ssssssssss.', 'sssssssssss.', 'dddddddddddd', 'dddddddddddd'],
  rainbow: ['....rrrr....', '..rroooorr..', '.rooyyyyoor.', 'roygggggyyor', 'oyggbbbbggyo', 'yg.bbppbb.gy', 'gb.pp..pp.bg', '............', '............', 'llllllllllll', 'llllllllllll', '............'],
  heart: ['............', '..rrr..rrr..', '.rrrrrrrrrr.', '.rrrrrrrrrr.', '.rrrrrrrrrr.', '..rrrrrrrr..', '...rrrrrr...', '....rrrr....', '.....rr.....', '............', '............', '............'],
  planets: ['............', '.yy.........', 'yyyy....l...', '.yy.........', '.......o....', '......ooo...', '.......o....', '.b.........p', '............', '....n.......', '..........w.', '............'],
  seed: ['............', '............', '.....gg.....', '....g.gg....', '...gg..g....', '.....g......', '.....g......', '.....g......', '.nnnnnnnnnn.', '.nnnnnnnnnn.', '..nnnnnnnn..', '............'],
  turtle: ['............', '............', '...gggggg...', '..gggggggg..', '.gkgggkgggg.', '.gggkgggkgg.', 'sgggggggggs.', '.sggggggggs.', '..n..nn..n..', '............', '............', '............'],
  magnet: ['............', '.rrr....rrr.', '.rrr....rrr.', '.www....www.', '.www....www.', '.rrr....rrr.', '.rrr....rrr.', '.rrr....rrr.', '.rrrrrrrrrr.', '..rrrrrrrr..', '...rrrrrr...', '............'],
  volcano: ['.....rr.....', '....rooy....', '....rrrr....', '...nrrrn....', '...nnnnnn...', '..nnnnnnnn..', '..nnnnnnnn..', '.nnnnnnnnnn.', '.nnnnnnnnnn.', 'nnnnnnnnnnnn', '............', '............'],
  bear: ['............', '..ww....ww..', '.wwwwwwwwww.', '.wwwwwwwwww.', '.wkwwwwwwkw.', '.wwwwkkwwww.', '..wwwwwwww..', '.wwwwwwwwww.', '.wwwwwwwwww.', '.ww.ww.ww.w.', '............', 'llllllllllll'],
  ant: ['............', '............', '....k.k.....', '.kk..k......', 'kkkk.kk.kkk.', '.kk.kkkkkkkk', '....kk.kkkk.', '...k...k.k..', '..k....k..k.', '............', '............', '............'],
  snow: ['.....ll.....', '..l..ll..l..', '...l.ll.l...', '....llll....', '.llllllllll.', '.llllllllll.', '....llll....', '...l.ll.l...', '..l..ll..l..', '.....ll.....', '............', '............'],
  seasons: ['.....gg.....', '...ggggoo...', '..gggggooo..', '.ggggggoooo.', '.ggggggoooo.', '..gggggooo..', '...ggggoo...', '.....nn.....', '.....nn.....', '.....nn.....', '..ssssssss..', '............'],
  cat: ['............', '..k.....k...', '..kk...kk...', '..kkkkkkk...', '..kwkkkwk...', '..kkkkkkk...', '..kkkpkkk...', '...kkkkk....', '..kkkkkkk...', '..kkkkkkk...', '..k.k.k.k...', '............'],
  sun: ['.....y......', '..y..y..y...', '...yyyyy....', '..yyyyyyy...', '.yyyyyyyyy..', 'y.yyyyyyy.y.', '.yyyyyyyyy..', '..yyyyyyy...', '...yyyyy....', '..y..y..y...', '.....y......', '............'],
  dog: ['............', '.nn.........', '.nnnnnnn....', '.nknnnnnn...', '.nnnnnnnnn..', '..nnnnnnnnnn', '....nnnnnnn.', '....n....n..', '....n....n..', '............', '............', '............'],
  sign: ['............', '.kkkkkkkkkk.', '.kwwwwwwwwk.', '.kwkkwkkwwk.', '.kwwwwwwwwk.', '.kwkwkkkwwk.', '.kkkkkkkkkk.', '.....nn.....', '.....nn.....', '.....nn.....', '.....nn.....', '............'],
  book: ['............', '.kkkkkkkkk..', '.kwwwwwwwwk.', '.kwkkkwwwwk.', '.kwwwwwwwwk.', '.kwkkkkwwwk.', '.kwwwwwwwwk.', '.kwkkwwwwwk.', '.kwwwwwwwwk.', '.kkkkkkkkkk.', '............', '............'],
  dolmen: ['............', '............', '.nnnnnnnnnn.', 'nnnnnnnnnnnn', '.nnnnnnnnnn.', '..nn....nn..', '..nn....nn..', '..nn....nn..', '..nn....nn..', '.gggggggggg.', 'gggggggggggg', '............'],
  ship: ['............', '.....k......', '.....k......', '..kkkkkkkk..', '.kkkkkkkkkk.', '.knnnnnnnnk.', '.knnnnnnnnk.', '..nnnnnnnn..', '...nnnnnn...', 'llllllllllll', 'llllllllllll', '............'],
  tower: ['............', '....wwww....', '....wwww....', '...wwwwww...', '...wwwwww...', '...wwwwww...', '..wwwwwwww..', '..wwwwwwww..', '.wwwwwwwwww.', '.wwwwwwwwww.', 'gggggggggggg', '............'],
  wall: ['............', '.pppppppppp.', '.pkkpppkkpp.', '.pkkpppkkpp.', '.ppkpppkppp.', '.ppkkkkkppp.', '.pkpppppkpp.', '.pkpppppkpp.', '.pppppppppp.', '.pppppppppp.', '............', '............'],
  phone: ['............', '....kkkk....', '...kkkkkk...', '...kllllk...', '...kllllk...', '...kllllk...', '...kllllk...', '...kllllk...', '...kkkkkk...', '....kkkk....', '............', '............'],
  camel: ['............', '............', '....nn......', '...nnnn.nn..', '..nnnnnnnnn.', '.nnnnnnnnnn.', '.nnnnnnnnn..', '..n..n..n...', '..n..n..n...', 'yyyyyyyyyyyy', 'yyyyyyyyyyyy', '............'],
  mountain: ['............', '.....ww.....', '....wwww....', '...wwnnww...', '..wnnnnnnw..', '.nnnnnnnnnn.', 'nnnnnnnnnnnn', 'gggggggggggg', 'gggggggggggg', '............', '............', '............'],
  river: ['gggggggggggg', 'ggggllllgggg', 'ggglllllgggg', 'gglllllggggg', 'gglllllggggg', 'ggglllllgggg', 'gggglllllggg', 'ggggglllllgg', 'gggggglllllg', 'ggggggglllll', 'gggggggggggg', '............'],
  globe: ['............', '....llll....', '..llgglgll..', '.llggglllll.', '.lgggglllll.', '.lllgggglll.', '.llllgggggl.', '.lllllgglll.', '..llllllll..', '....llll....', '.....kk.....', '...kkkkkk...'],
  bowl: ['............', '............', '....rrrr....', '...rrrrrr...', 'kkkkkkkkkkkk', '.kwwwwwwwwk.', '.kwwwwwwwwk.', '..kwwwwwwk..', '...kkkkkk...', '............', '............', '............'],
  bread: ['............', '............', '...oooooo...', '..oooooooo..', '.oooyyyyooo.', '.oooooooooo.', '.oooooooooo.', '..oooooooo..', '............', '............', '............', '............'],
  egg: ['............', '....wwww....', '...wwwwww...', '..wwwwwwww..', '..wwwyywww..', '..wwyyyyww..', '..wwyyyyww..', '..wwwyywww..', '...wwwwww...', '....wwww....', '............', '............'],
  apple: ['............', '.....n......', '....gn......', '..rrrrrrr...', '.rrrrrrrrr..', '.rrrrrrrrr..', '.rrrrrrrrr..', '.rrrrrrrrr..', '..rrrrrrr...', '...rr.rr....', '............', '............'],
  popcorn: ['............', '..w.ww.w....', '.wwwwwwwww..', '..wwwwwww...', '.rrrrrrrrrr.', '.rwrwrwrwrr.', '.rrrrrrrrrr.', '.rwrwrwrwrr.', '..rrrrrrrr..', '..rrrrrrrr..', '............', '............']
};
const TOPIC_BG = { '동물': '#dfe9c9', '과학': '#d6e7ec', '우주': '#3b4a6b', '자연': '#f2e7c7', '몸': '#f6dcd2', '역사': '#efe0c4', '지리': '#d9e6d2', '음식': '#f7e3c6' };
const customThumbs = new Map(); // assets/manifest.json thumbs: 영상 id → PNG 가 있으면 우선
const extraImg = new Map(); // assets/manifest.json ui: 폰 틀·사실 카드·슬라이드 틀·배지·꼬리표·시청 지도
function extraEl(id, cls, alt) { const img = extraImg.get(id); if (!img) return null; const e = document.createElement('img'); e.src = img.src; e.className = cls || 'ee-pixel'; e.alt = alt || ''; if (!alt) e.setAttribute('aria-hidden', 'true'); e.draggable = false; return e; }
function thumbCanvas(v, cls) { const c = document.createElement('canvas'); c.width = 960; c.height = 720; c.className = (cls || 'tp-thumb'); c.setAttribute('role', 'img'); c.setAttribute('aria-label', '영상 미리보기: ' + v.title); const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.scale(4, 4); drawThumb(g, v); return c; }

function drawGlyph(ctx, name, x, y, cell, alpha = 1) {
  const rows = GLYPHS[name]; if (!rows) return;
  ctx.globalAlpha = alpha;
  for (let r = 0; r < 12; r++) { const row = (rows[r] || '').padEnd(12, '.'); for (let c = 0; c < 12; c++) { const ch = row[c]; if (ch === '.' || !PAL[ch]) continue; ctx.fillStyle = PAL[ch]; ctx.fillRect(x + c * cell, y + r * cell, cell, cell); } }
  ctx.globalAlpha = 1;
}
function mainColor(name) { const count = {}; for (const row of GLYPHS[name]) for (const ch of row) if (ch !== '.') count[ch] = (count[ch] || 0) + 1; return PAL[Object.entries(count).sort((a, b) => b[1] - a[1])[0][0]]; }
function drawThumb(ctx, v) {
  const W = 240, H = 180;
  ctx.imageSmoothingEnabled = false;
  const img = customThumbs.get(v.id);
  if (img) { ctx.drawImage(img, 0, 0, W, H); return; }
  ctx.fillStyle = TOPIC_BG[v.topic] || PAL.w; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(41,75,64,.08)'; for (let i = 0; i < W; i += 24) ctx.fillRect(i, 0, 12, H);
  const type = v.isAI ? v.tellType : null;
  if (type === 'twin') { drawGlyph(ctx, v.glyph, 22, 36, 8); drawGlyph(ctx, v.glyph, 124, 36, 8); }
  else { drawGlyph(ctx, v.glyph, 60, 24, 10); }
  const mc = mainColor(v.glyph);
  if (type === 'limbs') { ctx.fillStyle = mc; for (let i = 0; i < 3; i++) ctx.fillRect(84 + i * 34, 138, 10, 22); }
  if (type === 'melt') { ctx.fillStyle = mc; const xs = [70, 96, 118, 142, 166]; xs.forEach((x, i) => ctx.fillRect(x, 134, 8, 14 + ((i * 7) % 20))); }
  if (type === 'text') {
    ctx.fillStyle = PAL.w; ctx.fillRect(28, 134, 184, 34); ctx.strokeStyle = PAL.k; ctx.lineWidth = 3; ctx.strokeRect(28, 134, 184, 34);
    ctx.fillStyle = PAL.k; ctx.font = '700 20px Ethicity, sans-serif'; ctx.textBaseline = 'middle';
    const chars = ['ㅈ', 'ㅣ', 'ㄹ', 'ㅐ', 'ㅎ', 'ㅓ', 'ㄱ'];
    chars.forEach((ch, i) => { ctx.save(); ctx.translate(44 + i * 24, 151); if (i % 2) ctx.scale(-1, 1); if (i % 3 === 2) ctx.rotate(.35); ctx.fillText(ch, -6, 0); ctx.restore(); });
  }
  // 재생 표시와 길이
  ctx.fillStyle = 'rgba(41,75,64,.85)'; ctx.fillRect(W - 54, H - 28, 46, 20);
  ctx.fillStyle = PAL.w; ctx.font = '700 13px Ethicity, sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText('0:' + (12 + (parseInt(v.id.slice(1), 10) % 40)).toString().padStart(2, '0'), W - 49, H - 18);
  ctx.fillStyle = 'rgba(255,249,231,.9)'; ctx.beginPath(); ctx.moveTo(10, H - 30); ctx.lineTo(10, H - 8); ctx.lineTo(28, H - 19); ctx.closePath(); ctx.fill();
}

/* ---------- 상태 ---------- */
const RESUME_LABEL = { intro: '발표 전날', rule: '사용법', present1: '1일차 발표', think1: '생각 카드 1', day2: '2일차', present2: '2일차 발표', think2: '생각 카드 2', make: '3일차', label: '3일차', outcome: '3일차' };
const STAGES = ['start', 'intro', 'rule', 'feed1', 'present1', 'think1', 'day2', 'feed2', 'present2', 'think2', 'make', 'label', 'outcome', 'complete'];
const S = {
  stage: 'start', player: 'jiho', nick: '', day: 0, subject: null, thinkTexts: [],
  cards: [], pool: [], tapped: {}, seenCount: 0, seenTopics: new Set(), current: null, timerLeft: DAY_SECONDS,
  day1: null, day2: null, thinks: [], aiUsed: 0, label: null,
  presentIndex: 0, presentStep: 0, dialogIndex: 0, dialog: [], makeIndex: 0, makeRows: [], pendingConfirm: null
};
let A = null; // EthicityAssets
let BGM = null; // 배경음악(bgm.js) — 효과음 버튼과 함께 켜고 끕니다
let fx = null; let fxRaf = 0; let timerHandle = 0; let autoHandle = 0; let autoTick = 0;

const $ = id => document.getElementById(id);
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const stageCanvas = $('stage'); const ctx = stageCanvas.getContext('2d');

function store(k, v) { try { localStorage.setItem(KEY(k), JSON.stringify(v)); } catch (e) { /* 저장이 막혀도 게임은 계속됩니다 */ } }
function load(k) { try { return JSON.parse(localStorage.getItem(KEY(k))); } catch (e) { return null; } }
function post(type, extra) { try { window.parent.postMessage(Object.assign({ type, gameId: GAME_ID }, extra || {}), '*'); } catch (e) { /* 부모가 없어도 됩니다 */ } }
function setStatus(t) { $('status').textContent = t || ''; }
function playerName() { return S.nick || '친구'; }
function partner() { return S.player === 'jiho' ? 'haneul' : 'jiho'; }

/* ---------- 소리 ---------- */
function setSound(on) { if (!A) return; A.setSound(on); if (BGM) BGM.setEnabled(on); const b = $('btnSound'); b.setAttribute('aria-pressed', String(on)); b.textContent = on ? '효과음 켬' : '효과음 끔'; store('sfx', on); }
function sfx(id) { if (A) A.playSound(id); }

/* ---------- 캔버스 장면 ---------- */
let fontsReady = false;
function wrapText(text, maxChars) { const out = []; let line = ''; for (const word of text.split(' ')) { const next = line ? line + ' ' + word : word; if (next.length > maxChars && line) { out.push(line); line = word; } else line = next; } if (line) out.push(line); return out; }
function drawSlideOnBoard(card, flipped) {
  // 칠판 위 발표 슬라이드. 코덱스 슬라이드 틀(tp_slide_frame, 안쪽 투명)이 있으면 틀을 그리고 그 안에 글자를 씁니다.
  const frame = extraImg.get('tp_slide_frame');
  let x = 468, y = 20, w = 344, h = 118;
  if (frame) { const fw = 336, fh = 210, fx = 472, fy = 0; ctx.fillStyle = flipped ? '#f2e7c7' : '#fff9e7'; x = fx + fw * .078; y = fy + fh * .175; w = fw * .835; h = fh * .685; ctx.fillRect(x, y, w, h); ctx.imageSmoothingEnabled = false; ctx.drawImage(frame, fx, fy, fw, fh); }
  else { ctx.fillStyle = flipped ? '#f2e7c7' : '#fff9e7'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = PAL.k; ctx.lineWidth = 4; ctx.strokeRect(x, y, w, h); }
  ctx.fillStyle = PAL.k; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  const cx = x + w / 2;
  if (!card) { ctx.font = '700 24px Ethicity, sans-serif'; ctx.fillText(subj().title, cx, y + h / 2 - 14); return; }
  if (flipped) {
    ctx.font = '700 20px Ethicity, sans-serif'; ctx.fillText('AI가 만든 영상이었어요', cx, y + 10);
    ctx.font = '400 18px Ethicity, sans-serif'; ctx.fillText('추천 이유: ' + reasonOf(card), cx, y + 42);
    wrapText('티: ' + card.tell, 18).slice(0, 2).forEach((ln, i) => ctx.fillText(ln, cx, y + 68 + i * 24));
    return;
  }
  let size = 22; ctx.font = `700 ${size}px Ethicity, sans-serif`; while (ctx.measureText(card.title).width > w - 16 && size > 18) { size -= 2; ctx.font = `700 ${size}px Ethicity, sans-serif`; }
  const titleLines = ctx.measureText(card.title).width > w - 16 ? wrapText(card.title, 11).slice(0, 2) : [card.title];
  titleLines.forEach((ln, i) => ctx.fillText(ln, cx, y + 8 + i * 24));
  const off = y + 8 + titleLines.length * 24 + 8;
  ctx.font = '400 18px Ethicity, sans-serif'; wrapText(card.fact, 18).slice(0, titleLines.length > 1 ? 2 : 3).forEach((ln, i) => ctx.fillText(ln, cx, off + i * 25));
}
/* 배경 일부를 다른 자리에 복사(또는 같은 자리에 되그리기). 좌표는 1280×720 논리 좌표. */
function stampBg(id, sx, sy, sw, sh, dx, dy) {
  const b = A.manifest.backgrounds[id]; const img = A.images.get(b.image); if (!img) return;
  const k = (b.sourceWidth || img.naturalWidth) / 1280;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, Math.round(sx * k), Math.round(sy * k), Math.round(sw * k), Math.round(sh * k), dx, dy, sw, sh);
}
// 앞줄 안쪽 책상+의자(x158~280,y380~500) / 둘째 줄 안쪽(x135~265,y495~640) 한 조를 가운데로 복사해 4줄 16자리 교실로.
const EXTRA_DESKS = [
  ...[430, 545, 735, 850].map(cx => ({ sx: 158, sy: 380, w: 122, h: 120, dx: cx - 52, dy: 380 })),
  ...[415, 530, 750, 865].map(cx => ({ sx: 135, sy: 495, w: 130, h: 145, dx: cx - 52, dy: 495 }))
];
// 앉는 자리: x,y = 발 위치, c* = 다시 덮을 의자 등받이 영역(원본 좌표). 복사한 책상은 원본 의자 영역을 가져옵니다.
const SEATS = {
  saebom: { x: 210, y: 476, cx: 177, cy: 427, cw: 66, ch: 73 },
  onyu: { x: 545, y: 476, cx: 177, cy: 427, cw: 66, ch: 73 },
  daon: { x: 735, y: 476, cx: 177, cy: 427, cw: 66, ch: 73 },
  partner: { x: 1065, y: 476, cx: 1032, cy: 427, cw: 66, ch: 73 }
};
function drawScene() {
  if (!A) return;
  const st = S.stage;
  ctx.clearRect(0, 0, 1280, 720);
  if (['intro', 'rule', 'feed1', 'day2', 'feed2', 'make', 'label'].includes(st)) {
    A.drawBackground(ctx, 'ai_lab');
    A.drawCharacter(ctx, S.player, 290, 455, 'down', 1, .85);
    if (st === 'day2' || st === 'feed2') A.drawCharacter(ctx, 'teacher', 420, 455, 'left', 1, .95);
    if (st === 'intro' || st === 'rule') A.drawCharacter(ctx, 'teacher', 420, 455, 'left', 1, .95);
    stageCanvas.setAttribute('aria-label', 'AI 실습실. ' + playerName() + '이(가) 책상 앞에서 루미튜브를 보고 있어요.' + (st === 'day2' || st === 'feed2' || st === 'intro' ? ' 하늘쌤이 옆에 서 있어요.' : ''));
  } else if (['present1', 'present2', 'outcome', 'complete'].includes(st)) {
    A.drawBackground(ctx, 'classroom');
    // 교실 배경에는 책상이 8개뿐이라, 배경의 책상+의자 한 조를 그대로 복사해 가운데 두 줄을 채웁니다(공통 팩 그림만 사용).
    for (const d of EXTRA_DESKS) stampBg('classroom', d.sx, d.sy, d.w, d.h, d.dx, d.dy);
    const list = presentList();
    const i = S.presentIndex, card = list[i];
    const flipped = st.startsWith('present') && S.presentStep === 2 && card && card.isAI && !card.known;
    drawSlideOnBoard(st.startsWith('present') ? (S.presentStep >= 3 ? null : card) : null, !!flipped);
    A.drawCharacter(ctx, 'teacher', 330, 335, 'right', 1, .95);
    A.drawCharacter(ctx, S.player, 640, 330, 'down', 1, .85);
    // 친구들은 앞줄 의자에 앉아 칠판을 봅니다: 캐릭터를 그린 뒤 의자 등받이를 다시 덮어 앉은 모습으로.
    const seats = [['saebom', SEATS.saebom], ['onyu', SEATS.onyu], ['daon', SEATS.daon], [partner(), SEATS.partner]];
    for (const [who, seat] of seats) A.drawCharacter(ctx, who, seat.x, seat.y, 'up', 1, .78);
    for (const [, seat] of seats) stampBg('classroom', seat.cx, seat.cy, seat.cw, seat.ch, seat.x - seat.cw / 2, seat.cy);
    stageCanvas.setAttribute('aria-label', '교실. ' + playerName() + '이(가) 앞에서 발표하고, 새봄·온유·다온·' + (partner() === 'jiho' ? '지호' : '하늘') + '이 자리에 앉아 있어요. 하늘쌤이 옆에 있어요.');
  }
  if (fx) { if (!A.drawEffect(ctx, fx.id, fx.x, fx.y, performance.now() - fx.at, 110, reduceMotion)) fx = null; }
}
function playFx(id, x, y) { fx = { id, x, y, at: performance.now() }; cancelAnimationFrame(fxRaf); const loop = () => { drawScene(); if (fx) fxRaf = requestAnimationFrame(loop); }; fxRaf = requestAnimationFrame(loop); }

/* 장면 위 반응 말풍선: 친구·하늘쌤 머리 위에 .ee-speech 한 마디 + 초상 */
// 앉은 친구들의 말풍선은 아래 빈 책상 줄 위에(꼬리 위로), 하늘쌤 말풍선은 머리 위에 둡니다. 네 자리가 가로로 겹치지 않게 칸을 나눴어요.
const BUBBLE_POS = { saebom: { left: 2, top: 70, below: true }, onyu: { left: 26.5, top: 70, below: true }, daon: { right: 26.5, top: 70, below: true }, jiho: { right: 2, top: 70, below: true }, haneul: { right: 2, top: 70, below: true }, teacher: { left: 2, top: 9, hang: true } };
function clearBubbles() { const old = $('sceneWrap').querySelector('.tp-bubbles'); if (old) old.remove(); }
function showBubbles(list) {
  clearBubbles();
  const layer = el('div', 'tp-bubbles'); layer.setAttribute('aria-live', 'polite');
  list.forEach((b, i) => {
    const pos = BUBBLE_POS[b.who] || { left: 40, top: 40 };
    const bub = el('div', 'tp-bubble' + (pos.below ? ' below' : '') + (pos.hang ? ' hang' : '')); bub.style.setProperty('--delay', (i * .18) + 's');
    if (pos.left != null) bub.style.left = pos.left + '%'; if (pos.right != null) bub.style.right = pos.right + '%'; bub.style.top = pos.top + '%';
    const pc = portraitCanvas(b.who, b.mood); pc.className = 'tp-bubble-portrait ee-pixel';
    const sp = el('div', 'ee-speech'); sp.appendChild(el('span', 'ee-speaker', nameOf(b.who))); sp.appendChild(el('span', null, b.text));
    bub.appendChild(pc); bub.appendChild(sp); layer.appendChild(bub);
  });
  $('sceneWrap').appendChild(layer);
}
function viewMapCanvas(count, label) {
  // 코덱스 시청 지도 판 위에 본 주제 수만큼 칸을 채웁니다. 칸 수 = 고른 과목의 주제 수(과학 5 · 사회 3).
  const total = Math.max(1, subj().topics.length);
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; c.className = 'tp-viewmap ee-pixel'; c.setAttribute('role', 'img'); c.setAttribute('aria-label', (label || '') + ' 본 주제 ' + count + ' / ' + total + '가지');
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; const img = extraImg.get('tp_view_map');
  if (img) g.drawImage(img, 0, 0, 256, 256); else { g.fillStyle = '#8a5a3b'; g.beginPath(); g.arc(128, 128, 110, 0, Math.PI * 2); g.fill(); }
  const cx = 126, cy = 124, r = 92, step = Math.PI * 2 / total;
  for (let i = 0; i < Math.min(total, count); i++) { const a0 = -Math.PI / 2 + i * step, a1 = a0 + step; g.fillStyle = 'rgba(168,187,140,.88)'; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, r, a0 + .04, a1 - .04); g.closePath(); g.fill(); }
  return c;
}

function portraitCanvas(id, mood) { const c = document.createElement('canvas'); c.width = 256; c.height = 256; c.className = 'tp-portrait ee-pixel'; c.setAttribute('role', 'img'); c.setAttribute('aria-label', nameOf(id) + ' ' + ({ neutral: '', happy: '(기쁨)', worried: '(걱정)', explaining: '(설명)' }[mood] || '')); if (A) A.drawPortrait(c.getContext('2d'), id, mood || 'neutral', 0, 0, 256); return c; }
function iconCanvas(id, size) { const c = document.createElement('canvas'); c.width = 64; c.height = 64; c.className = 'ee-icon'; c.setAttribute('aria-hidden', 'true'); if (size) { c.style.width = size + 'px'; c.style.height = size + 'px'; } if (A) A.drawIcon(c.getContext('2d'), id, 0, 0, 64); return c; }
function nameOf(id) { if (id === 'player') return playerName(); if (id === 'robot') return '루미'; if (id === 'teacher') return '하늘쌤'; return window.ETHICITY_COMMON_MANIFEST.characters[id].name; }
function charId(id) { return id === 'player' ? S.player : id; }

/* ---------- 패널 렌더 ---------- */
const panel = $('panel');
function clearPanel() { panel.innerHTML = ''; panel.classList.remove('tp-fade'); void panel.offsetWidth; panel.classList.add('tp-fade'); }
function button(text, onClick, opts = {}) { const b = el('button', 'ee-button' + (opts.secondary ? ' secondary' : ''), null); b.type = 'button'; if (opts.icon) b.appendChild(iconCanvas(opts.icon, 22)); b.appendChild(document.createTextNode(text)); b.addEventListener('click', onClick); if (opts.autofocus) b.dataset.autofocus = '1'; if (opts.id) b.id = opts.id; return b; }
function actions(...buttons) { const row = el('div', 'tp-actions'); buttons.forEach(b => b && row.appendChild(b)); return row; }
function focusPrimary() { const b = panel.querySelector('[data-autofocus]') || $('side').querySelector('[data-autofocus]'); if (b && !FAST) b.focus({ preventScroll: true }); }
function speech(speaker, mood, text) { const row = el('div', 'tp-dialog'); row.appendChild(portraitCanvas(charId(speaker), mood)); const box = el('div', 'ee-speech'); box.appendChild(el('p', 'ee-speaker', nameOf(speaker))); box.appendChild(el('p', null, text)); row.appendChild(box); return row; }

/* 대화 시퀀스: [{who, mood, text}] → 다음 버튼 */
function runDialog(lines, onDone, lastLabel) {
  S.dialog = lines; S.dialogIndex = 0;
  const show = () => {
    clearPanel();
    const ln = S.dialog[S.dialogIndex];
    panel.appendChild(speech(ln.who, ln.mood, ln.text.replace(/\{nick\}/g, playerName())));
    const last = S.dialogIndex === S.dialog.length - 1;
    panel.appendChild(actions(button(last ? (lastLabel || '다음') : '다음', () => { sfx('tap'); if (last) onDone(); else { S.dialogIndex++; show(); } }, { autofocus: true, icon: 'arrow_right', id: 'btnNext' })));
    focusPrimary();
  };
  show();
}


/* 태블릿 가로 등 넓은 가로 화면: 스크롤 없이 장면·폰·패널이 한 화면에 들어가도록 크기를 맞춥니다. */
const LANDSCAPE = matchMedia('(min-width: 860px) and (orientation: landscape)');
function fitLayout() {
  const main = $('main'), left = $('left'), scene = $('sceneWrap'), phone = $('side').querySelector('.tp-phone');
  main.classList.toggle('no-scene', scene.hidden);
  if (!LANDSCAPE.matches) { scene.style.width = ''; if (phone) phone.style.width = ''; return; }
  const H = main.clientHeight; const hasSide = main.classList.contains('has-side');
  if (phone) phone.style.width = Math.floor(H / 2) + 'px';
  const colW = hasSide ? left.clientWidth : (main.clientWidth - $('panel').offsetWidth - 12);
  const sceneH = hasSide ? Math.floor(H * 0.5) : H;
  scene.style.width = Math.max(240, Math.floor(Math.min(colW, sceneH * 16 / 9))) + 'px';
}
window.addEventListener('resize', fitLayout);
LANDSCAPE.addEventListener('change', fitLayout);

/* ---------- 단계 전환 ---------- */
function goStage(id, opts = {}) {
  S.stage = id;
  const idx = STAGES.indexOf(id);
  post('ethicity:progress', { current: idx, total: STAGES.length - 1 });
  if (id !== 'start') saveProgress();
  if (!opts.silent && id !== 'start') sfx('door');
  clearInterval(timerHandle); setStatus(''); clearBubbles();
  $('side').hidden = true; $('side').innerHTML = ''; $('main').classList.remove('has-side');
  $('hudCards').hidden = !(id === 'feed1' || id === 'feed2');
  const hs = $('hudSubject'); if (hs) { hs.hidden = id === 'start'; hs.textContent = subj().name; }
  $('hudDay').textContent = ({ start: '시작', intro: '발표 전날', rule: '사용법', feed1: '1일차 · 표시 없는 피드', present1: '1일차 · 발표', think1: '생각 카드 1', day2: '2일차', feed2: '2일차 · 표시가 보이는 피드', present2: '2일차 · 발표', think2: '생각 카드 2', make: '3일차 · 내가 만드는 쪽', label: '3일차 · 표시할까?', outcome: '3일차 · 결과', complete: '탐험 완료' })[id] || '';
  $('sceneWrap').hidden = (id === 'start' || id === 'think1' || id === 'think2' || (id === 'complete' && LANDSCAPE.matches));
  const fn = STAGE_FN[id]; if (fn) fn();
  fitLayout();
  drawScene();
  if (!LANDSCAPE.matches) window.scrollTo({ top: 0, behavior: 'auto' });
}
function saveProgress() { store('progress', { stage: S.stage, player: S.player, subject: S.subject, day1: S.day1, day2: S.day2, thinks: S.thinks, thinkTexts: S.thinkTexts, aiUsed: S.aiUsed, label: S.label }); }

/* ---------- 피드 알고리즘 ---------- */
function resetFeed(day) {
  S.day = day; S.cards = []; S.pool = subjectVideos().map(v => v.id); S.tapped = {}; S.seenCount = 0; S.seenTopics = new Set(); S.current = null; S.timerLeft = DAY_SECONDS; S.pendingConfirm = null;
  // 첫 영상은 섞어서 시작합니다.
  for (let i = S.pool.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [S.pool[i], S.pool[j]] = [S.pool[j], S.pool[i]]; }
}
function nextVideo() {
  if (!S.pool.length) S.pool = subjectVideos().map(v => v.id).filter(id => !S.cards.some(c => c.id === id));
  // 간단한 가중 추천: 내가 탭한 주제 + 자극적인(AI 슬롭) 영상을 더 올립니다.
  const weights = S.pool.map(id => { const v = VIDEO_BY_ID[id]; return 1 + 1.5 * (S.tapped[v.topic] || 0) + (v.isAI ? 2.5 : 0); });
  const total = weights.reduce((a, b) => a + b, 0); let r = rand() * total; let pick = 0;
  for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r <= 0) { pick = i; break; } }
  const id = S.pool.splice(pick, 1)[0];
  S.current = VIDEO_BY_ID[id]; S.seenCount++; S.seenTopics.add(S.current.topic); S.pendingConfirm = null;
  return S.current;
}
function collectCurrent(known) {
  const v = S.current; if (!v || S.cards.length >= CARDS_NEEDED) return;
  S.cards.push({ id: v.id, known: !!known }); S.tapped[v.topic] = (S.tapped[v.topic] || 0) + 1;
  sfx('paper'); $('hudCards').textContent = `카드 ${S.cards.length}/${CARDS_NEEDED}`;
  setStatus(`「${v.title}」을(를) 사실 카드로 가져왔어요. ${S.cards.length}/${CARDS_NEEDED}`);
  if (S.cards.length >= CARDS_NEEDED) { finishDay(); return; }
  nextVideo(); renderPhone();
}
function finishDay() {
  clearInterval(timerHandle);
  const cards = S.cards.map(c => Object.assign({}, VIDEO_BY_ID[c.id], { known: c.known }));
  const fooled = cards.filter(c => c.isAI && !c.known).length;
  const stats = { cards: S.cards.map(c => ({ id: c.id, known: c.known })), fooled, aiKnown: cards.filter(c => c.isAI && c.known).length, seen: S.seenCount, topics: S.seenTopics.size };
  if (S.day === 1) S.day1 = stats; else S.day2 = stats;
  S.presentIndex = 0; S.presentStep = 0;
  goStage(S.day === 1 ? 'present1' : 'present2');
}
function presentList() { const d = S.stage === 'present1' || (S.stage !== 'present2' && !S.day2) ? S.day1 : S.day2; if (!d) return []; return d.cards.map(c => Object.assign({}, VIDEO_BY_ID[c.id], { known: c.known })); }

/* ---------- 폰 피드 UI ---------- */
function renderPhone() {
  const side = $('side'); side.hidden = false; side.innerHTML = ''; $('main').classList.add('has-side');
  const labeled = S.day === 2;
  const phone = el('div', 'tp-phone' + (extraImg.has('tp_phone_frame') ? ' has-frame' : ''));
  const screen = el('div', 'tp-screen'); screen.setAttribute('aria-label', '루미튜브 숏츠 피드'); phone.appendChild(screen);
  const top = el('div', 'tp-phone-top'); const logo = el('div', 'tp-logo'); logo.appendChild(iconCanvas('robot', 20)); logo.appendChild(document.createTextNode('루미튜브')); top.appendChild(logo); top.appendChild(el('span', null, labeled ? '표시 켬' : '숏츠'));
  screen.appendChild(top);
  // 타이머
  const trow = el('div', 'tp-timer-row'); trow.appendChild(iconCanvas('timer', 18)); const tlabel = el('span', null, ''); trow.appendChild(tlabel); screen.appendChild(trow);
  const timer = el('div', 'tp-timer'); const bar = el('span'); timer.appendChild(bar); screen.appendChild(timer); timer.setAttribute('role', 'presentation');
  const updateTimer = () => { bar.style.width = Math.max(0, S.timerLeft / DAY_SECONDS * 100) + '%'; tlabel.textContent = S.timerLeft > 0 ? `오늘 피드 시간 ${S.timerLeft}초` : '시간이 다 됐어요. 남은 카드만 빨리 골라요'; };
  updateTimer();
  clearInterval(timerHandle);
  timerHandle = setInterval(() => { if (S.timerLeft > 0) { S.timerLeft -= 1; updateTimer(); if (S.timerLeft === 0) setStatus('오늘 피드 시간이 끝났어요. 남은 카드를 빨리 골라 보세요.'); } }, FAST ? Math.max(40, 1000 / FAST) : 1000);
  const v = S.current;
  const card = el('div', 'tp-video'); card.setAttribute('aria-live', 'polite');
  const tw = el('div', 'tp-thumbwrap'); tw.appendChild(thumbCanvas(v));
  if (labeled && v.isAI) { const badge = el('span', 'tp-thumb-badge'); const bi = extraEl('tp_badge_ai', 'tp-badge-img ee-pixel'); if (bi) badge.appendChild(bi); else { badge.appendChild(iconCanvas('robot', 18)); badge.appendChild(iconCanvas('check', 18)); } badge.appendChild(document.createTextNode('AI 제작')); tw.appendChild(badge); }
  card.appendChild(tw);
  card.appendChild(el('p', 'tp-video-title', v.title));
  const meta = el('div', 'tp-video-meta'); meta.appendChild(el('span', null, '@' + subj().channels[parseInt(v.id.slice(1), 10) % 4])); meta.appendChild(el('span', null, '조회수 ' + v.views)); card.appendChild(meta);
  if (labeled) {
    const why = el('div', 'tp-why');
    const whyBtn = button('왜 추천?', () => { sfx('tap'); const open = whyBtn.getAttribute('aria-pressed') !== 'true'; whyBtn.setAttribute('aria-pressed', String(open)); reason.hidden = !open; }, { secondary: true, icon: extraImg.has('tp_why_tag') ? null : 'help' });
    const tag = extraEl('tp_why_tag', 'tp-badge-img ee-pixel'); if (tag) whyBtn.prepend(tag);
    whyBtn.setAttribute('aria-pressed', 'false'); whyBtn.id = 'btnWhy';
    const reason = el('p', 'ee-notice', '루미튜브: ' + reasonOf(v)); reason.hidden = true; reason.id = 'whyReason';
    why.appendChild(whyBtn); why.appendChild(reason); card.appendChild(why);
  }
  screen.appendChild(card);
  // 모은 카드 칸(사실 카드 틀 + 가져온 영상 썸네일)
  const slots = el('div', 'tp-slots'); slots.setAttribute('role', 'img'); slots.setAttribute('aria-label', `모은 카드 ${S.cards.length}/${CARDS_NEEDED}`);
  for (let i = 0; i < CARDS_NEEDED; i++) {
    const filled = i < S.cards.length; const sl = el('div', 'tp-slot' + (filled ? ' filled' : '') + (extraImg.has('tp_fact_card') ? ' has-card' : ''));
    const bg = extraEl('tp_fact_card', 'tp-slot-bg ee-pixel'); if (bg) sl.appendChild(bg);
    if (filled) { const tc = thumbCanvas(VIDEO_BY_ID[S.cards[i].id], 'tp-slot-thumb'); tc.removeAttribute('role'); tc.setAttribute('aria-hidden', 'true'); sl.appendChild(tc); }
    slots.appendChild(sl);
  }
  screen.appendChild(slots);
  // 조작
  if (S.pendingConfirm) {
    const box = el('div', 'tp-confirm');
    const notice = el('p', 'ee-notice', '이 영상에는 「AI 제작」 표시가 있어요. 추천 이유도 「조회수가 높아서」뿐이에요. 그래도 가져올까요?'); notice.setAttribute('role', 'alert'); box.appendChild(notice);
    box.appendChild(button('그래도 가져오기', () => { sfx('tap'); collectCurrent(true); }, { secondary: true, icon: 'check', id: 'btnConfirmYes' }));
    box.appendChild(button('다른 영상 볼래요', () => { sfx('tap'); S.pendingConfirm = null; nextVideo(); renderPhone(); }, { autofocus: true, icon: 'arrow_right', id: 'btnConfirmNo' }));
    screen.appendChild(box);
  } else {
    const row = el('div', 'tp-phone-actions');
    row.appendChild(button('카드로 가져오기', () => { sfx('tap'); if (labeled && v.isAI) { S.pendingConfirm = v.id; renderPhone(); focusPrimary(); } else collectCurrent(false); }, { icon: 'check', id: 'btnPick', autofocus: true }));
    row.appendChild(button('다음 영상', () => { sfx('tap'); nextVideo(); renderPhone(); focusPrimary(); }, { secondary: true, icon: 'arrow_right', id: 'btnSkip' }));
    screen.appendChild(row);
    screen.appendChild(el('p', 'tp-small tp-hint', '위로 밀거나 ↓ 키를 누르면 다음 영상이에요.'));
  }
  side.appendChild(phone);
  // 스와이프
  let startY = null;
  screen.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; startY = e.clientY; });
  screen.addEventListener('pointerup', e => { if (startY == null) return; const dy = e.clientY - startY; startY = null; if (dy < -40 && !S.pendingConfirm) { sfx('tap'); nextVideo(); renderPhone(); } });
}
document.addEventListener('keydown', e => {
  if (!(S.stage === 'feed1' || S.stage === 'feed2') || S.pendingConfirm) return;
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); sfx('tap'); nextVideo(); renderPhone(); focusPrimary(); }
});

/* ---------- 단계별 화면 ---------- */
const STAGE_FN = {
  start() {
    clearPanel();
    const wrap = el('div', 'tp-start');
    const h = el('div', 'tp-heading'); h.appendChild(iconCanvas('robot', 28)); h.appendChild(document.createTextNode('윤리시티 · 투명성 탐험')); wrap.appendChild(h);
    wrap.appendChild(el('p', 'tp-lead', '내일은 우리 반 발표 날이에요. 루미튜브 숏츠에서 사실 카드 5장을 모아 발표 자료를 만들어요. 그런데 어떤 영상이 AI가 만든 걸까요?'));
    wrap.appendChild(el('p', 'tp-small', '혼자 하는 미니게임 · 12~15분 · 점수 없음'));
    const pickLabel = el('p', null, '누구로 탐험할까요?'); pickLabel.id = 'pickLabel'; wrap.appendChild(pickLabel);
    const picks = el('div', 'tp-charpick'); picks.setAttribute('role', 'group'); picks.setAttribute('aria-labelledby', 'pickLabel');
    ['jiho', 'haneul'].forEach(id => {
      const b = el('button', 'ee-choice'); b.type = 'button'; b.dataset.char = id; b.setAttribute('aria-pressed', String(S.player === id));
      const c = document.createElement('canvas'); c.width = 256; c.height = 256; c.className = 'ee-pixel'; c.setAttribute('aria-hidden', 'true'); if (A) A.drawPortrait(c.getContext('2d'), id, 'happy', 0, 0, 256);
      b.appendChild(c); b.appendChild(el('span', null, nameOf(id) + (S.player === id ? ' · 선택함' : '')));
      b.addEventListener('click', () => { S.player = id; sfx('tap'); picks.querySelectorAll('button').forEach(x => { x.setAttribute('aria-pressed', String(x.dataset.char === id)); x.lastChild.textContent = nameOf(x.dataset.char) + (x.dataset.char === id ? ' · 선택함' : ''); }); });
      picks.appendChild(b);
    });
    wrap.appendChild(picks);
    const subjLabel = el('p', null, '어떤 발표를 준비할까요?'); subjLabel.id = 'subjLabel'; wrap.appendChild(subjLabel);
    const subjPick = el('div', 'tp-subjpick'); subjPick.setAttribute('role', 'group'); subjPick.setAttribute('aria-labelledby', 'subjLabel');
    Object.values(SUBJECTS).forEach(sb => {
      const b = el('button', 'ee-choice'); b.type = 'button'; b.dataset.subject = sb.id; b.setAttribute('aria-pressed', String(S.subject === sb.id));
      b.appendChild(iconCanvas(sb.icon, 28)); const t = el('span'); t.appendChild(el('strong', null, sb.name)); t.appendChild(el('small', 'tp-small', '「' + sb.title + '」 · ' + sb.desc)); b.appendChild(t);
      b.addEventListener('click', () => { S.subject = sb.id; sfx('tap'); subjPick.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.subject === sb.id))); setStatus(''); });
      subjPick.appendChild(b);
    });
    wrap.appendChild(subjPick);
    const field = el('div', 'tp-field'); const lab = el('label', null, '닉네임 (한글 1~5자)'); lab.htmlFor = 'nick'; const input = document.createElement('input'); input.id = 'nick'; input.maxLength = 5; input.autocomplete = 'off'; input.placeholder = '예: 별고래'; input.value = S.nick || ''; input.setAttribute('aria-describedby', 'nickHelp'); field.appendChild(lab); field.appendChild(input); const help = el('p', 'tp-small', '실제 이름은 쓰지 않아요. 닉네임은 이 기기에만 저장돼요.'); help.id = 'nickHelp'; field.appendChild(help); wrap.appendChild(field);
    const saved = load('progress');
    const resumable = saved && saved.stage && !['start', 'complete', 'feed1', 'feed2'].includes(saved.stage) && STAGES.includes(saved.stage);
    const startBtn = button('탐험 시작', () => {
      const n = input.value.trim();
      if (!/^[가-힣]{1,5}$/.test(n)) { setStatus('닉네임은 한글 1~5자로 적어 주세요.'); input.focus(); input.setAttribute('aria-invalid', 'true'); return; }
      if (!S.subject) { setStatus('발표 과목(사회 / 과학)을 먼저 골라 주세요.'); subjPick.querySelector('button').focus(); return; }
      S.nick = n; store('player', { character: S.player, nickname: n, subject: S.subject }); setStatus('');
      S.day1 = null; S.day2 = null; S.thinks = []; S.aiUsed = 0; S.label = null;
      sfx('tap'); goStage('intro');
    }, { autofocus: true, icon: 'play', id: 'btnStart' });
    const row = actions();
    if (resumable) row.appendChild(button('이어하기 · ' + (RESUME_LABEL[saved.stage] || saved.stage), () => {
      const n = input.value.trim(); if (!/^[가-힣]{1,5}$/.test(n)) { setStatus('닉네임은 한글 1~5자로 적어 주세요.'); input.focus(); return; }
      S.nick = n; S.player = saved.player || S.player; S.subject = SUBJECTS[saved.subject] ? saved.subject : (S.subject || 'science'); S.thinkTexts = saved.thinkTexts || []; S.day1 = saved.day1; S.day2 = saved.day2; S.thinks = saved.thinks || []; S.aiUsed = saved.aiUsed || 0; S.label = saved.label || null; S.presentIndex = 0; S.presentStep = 0;
      let target = saved.stage; if (target.startsWith('present') && !(target === 'present1' ? S.day1 : S.day2)) target = target === 'present1' ? 'feed1' : 'feed2';
      sfx('tap'); goStage(target);
    }, { secondary: true, icon: 'retry' }));
    row.appendChild(startBtn); wrap.appendChild(row);
    panel.appendChild(wrap); focusPrimary();
  },
  intro() {
    runDialog([
      { who: 'teacher', mood: 'explaining', text: '{nick}, 내일 우리 반 발표 기억하죠? 「' + subj().title + '」(' + subj().name + ')를 준비해 와요. 미디어실 책상 위 폰으로 루미튜브를 봐도 좋아요.' },
      { who: 'robot', mood: 'happy', text: '안녕! 나는 루미튜브의 루미예요. 숏츠를 넘기다가 마음에 드는 영상을 탭하면 사실 카드로 가져올 수 있어요.' },
      { who: 'robot', mood: 'neutral', text: '사실 카드 5장을 모으면 발표 자료가 완성돼요. 피드는 네가 보는 것에 맞춰 계속 바뀌어요. 자, 사용법부터 볼까요?' }
    ], () => goStage('rule'));
  },
  rule() {
    clearPanel();
    const h = el('div', 'tp-heading'); h.appendChild(iconCanvas('notebook', 28)); h.appendChild(document.createTextNode('루미튜브 사용법')); panel.appendChild(h);
    const rules = el('div', 'tp-rules');
    [['arrow_right', '「다음 영상」을 누르거나 화면을 위로 밀면 다음 숏츠가 나와요.'], ['check', '마음에 드는 영상에서 「카드로 가져오기」를 누르면 사실 카드가 돼요.'], ['notebook', '카드 5장을 모으면 내일 발표가 시작돼요. 어떤 영상이 진짜인지 잘 살펴보세요.'], ['timer', '피드 시간은 하루 120초예요. 시간이 지나도 벌은 없어요. 남은 카드를 빨리 고르면 돼요.']].forEach(([ic, t]) => { const r = el('div', 'tp-rule'); r.appendChild(iconCanvas(ic, 40)); r.appendChild(el('span', null, t)); rules.appendChild(r); });
    panel.appendChild(rules);
    panel.appendChild(actions(button('1일차 시작', () => { sfx('tap'); goStage('feed1'); }, { autofocus: true, icon: 'play', id: 'btnNext' })));
    focusPrimary();
  },
  feed1() {
    resetFeed(1); nextVideo();
    $('hudCards').textContent = `카드 0/${CARDS_NEEDED}`;
    clearPanel();
    panel.appendChild(speech('robot', 'neutral', '1일차 피드예요. 지금은 어떤 영상이 AI가 만든 건지, 왜 추천됐는지 아무 표시도 없어요. 폰에서 영상을 골라 카드 5장을 모아요.'));
    panel.appendChild(el('p', 'tp-small', '폰 화면의 버튼으로 조작해요. 키보드: ↓ 다음 영상, Tab·Enter 로 버튼.'));
    renderPhone(); focusPrimary();
  },
  present1() { presentFlow(); },
  present2() { presentFlow(); },
  think1() {
    thinkCard(1, '내가 틀린 걸 말한 건 내 잘못일까? 뭐가 있었으면 안 속았을까?', [
      ['내 잘못만은 아니에요. 영상에 AI 표시가 없었어요.', '맞아요. 표시가 없으면 누구라도 속을 수 있어요. 그래서 만든 쪽이 알려 줘야 해요.'],
      ['왜 추천됐는지 알았다면 다시 생각했을 거예요.', '그렇죠. 「조회수가 높아서」라는 이유를 봤다면 한 번 더 살펴봤을 거예요.'],
      ['나도 더 꼼꼼히 봤어야 해요. 그래도 표시가 있으면 더 쉬웠을 거예요.', '꼼꼼히 보는 것도 중요해요. 그리고 표시가 있으면 그 힘을 덜 써도 되지요.']
    ], () => goStage('day2'));
  },
  day2() {
    runDialog([
      { who: 'teacher', mood: 'explaining', text: '{nick}, 어제 발표 힘들었죠? 루미튜브 설정에 「AI 제작 표시」와 「왜 추천?」이 있어요. 내가 켜 줄게요.' },
      { who: 'robot', mood: 'explaining', text: '이제 AI가 만든 영상에는 「AI 제작」 표시가 붙고, 「왜 추천?」을 누르면 내가 추천한 이유를 한 줄로 알려 줘요.' },
      { who: 'robot', mood: 'happy', text: '다시 카드 5장을 모아 발표해 봐요. 표시가 있는 영상을 가져올지 말지는 네가 정해요.' }
    ], () => goStage('feed2'), '2일차 시작');
  },
  feed2() {
    resetFeed(2); nextVideo();
    $('hudCards').textContent = `카드 0/${CARDS_NEEDED}`;
    clearPanel();
    panel.appendChild(speech('teacher', 'happy', '설정을 켰어요. 이번에는 표시와 이유를 보면서 골라요. 「왜 추천?」도 눌러 보세요.'));
    panel.appendChild(el('p', 'tp-small', '폰 화면의 버튼으로 조작해요. 키보드: ↓ 다음 영상, Tab·Enter 로 버튼.'));
    renderPhone(); focusPrimary();
  },
  think2() {
    thinkCard(2, '표시와 이유가 있으니 뭐가 달라졌어?', [
      ['AI가 만든 영상을 미리 알고 피할 수 있었어요.', '표시 하나로 속지 않을 수 있었어요. 그래서 AI가 만든 건 꼭 표시해야 해요.'],
      ['「조회수가 높아서」라는 이유를 보고 다시 생각했어요.', '이유를 알면 추천이 나를 위한 건지 알 수 있어요. 설명이 있어야 판단할 수 있지요.'],
      ['피드에 끌려가지 않고 내가 고르는 느낌이었어요.', '그게 바로 투명성이 주는 힘이에요. 알면 내가 고를 수 있어요.']
    ], () => goStage('make'));
  },
  make() {
    S.makeIndex = 0; S.aiUsed = 0;
    const src = (S.day2 ? S.day2.cards : []).map(c => VIDEO_BY_ID[c.id]).filter(v => !v.isAI).slice(0, 3);
    const reals = subjectVideos().filter(v => !v.isAI); while (src.length < 3) src.push(reals[src.length] || VIDEOS[src.length]);
    S.makeRows = src.map(v => ({ mine: v.fact, ai: '놀라운 사실! ' + v.fact.replace(/\.$/, '') + '. 정말 신기하죠?' }));
    runDialog([
      { who: 'robot', mood: 'happy', text: '3일차예요. 이번에는 네가 만드는 쪽이에요. 발표 영상을 내가 도와줄게요. 편집과 목소리는 내가 맡고, 문장은 네가 골라요.' }
    ], makeRound, '문장 고르기');
  },
  label() {
    clearPanel();
    panel.appendChild(speech('robot', 'explaining', `영상이 완성됐어요. 편집과 목소리는 루미 AI가 했고, 문장 3개 중 ${S.aiUsed}개는 AI가, ${3 - S.aiUsed}개는 네가 썼어요. 루미튜브에 올리기 전에 하나만 정해요.`));
    panel.appendChild(el('p', 'tp-lead', '영상에 「AI 도움받음」 표시를 붙일까요?'));
    const choices = el('div', 'tp-choices');
    [['check', '「AI 도움받음」 표시를 붙여서 올려요.', 'on'], ['close', '표시 없이 그냥 올려요.', 'off']].forEach(([ic, t, val], i) => {
      const b = el('button', 'ee-choice'); b.type = 'button'; b.setAttribute('aria-pressed', 'false'); b.dataset.choice = String(i); const bi = val === 'on' ? extraEl('tp_badge_aihelp', 'tp-badge-img ee-pixel') : null; b.appendChild(bi || iconCanvas(ic, 24)); b.appendChild(el('span', null, t));
      b.addEventListener('click', () => { choices.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); S.label = val; sfx('tap'); setTimeout(() => goStage('outcome'), FAST ? 50 : 350); });
      choices.appendChild(b);
    });
    panel.appendChild(choices);
    if (!FAST) choices.querySelector('button').focus({ preventScroll: true });
  },
  outcome() {
    const on = S.label === 'on';
    const lines = on ? [
      { who: 'onyu', mood: 'explaining', text: '「AI 도움받음」이라고 써 있네. 어디까지 AI고 어디까지 너야?' },
      { who: 'player', mood: 'happy', text: `편집과 목소리는 루미 AI가 했고, 사실 카드는 내가 모았어. 문장 3개 중 ${3 - S.aiUsed}개는 내가 썼어.` },
      { who: 'saebom', mood: 'happy', text: '그럼 믿을 수 있겠다. 솔직하게 말해 줘서 고마워!' },
      { who: 'teacher', mood: 'happy', text: '표시가 있으니 친구들이 무엇을 믿어도 되는지 알 수 있어요. 그게 믿음을 만들어요.' }
    ] : [
      { who: 'saebom', mood: 'happy', text: '와, 이거 네가 다 만든 거야? 목소리도 멋지다!' },
      { who: 'player', mood: 'neutral', text: '응… 그게…' },
      { who: 'daon', mood: 'worried', text: '어? 이 목소리 루미 AI 목소리 아니야? 미리 말해 줬으면 좋았을 텐데.' },
      { who: 'teacher', mood: 'explaining', text: '{nick}을(를) 탓하려는 게 아니에요. AI 도움을 받았다고 알려 주면, 친구들이 무엇을 믿어도 되는지 알 수 있어요.' }
    ];
    lines.push({ who: 'robot', mood: 'explaining', text: 'AI가 만든 걸 표시하고 왜 추천했는지 알려 주는 것, 그게 투명성이에요. 네가 AI를 썼을 때도 똑같아요.' });
    if (on) playFx('correct', 640, 170); else playFx('retry', 640, 170);
    showBubbles(on ? [{ who: 'onyu', mood: 'explaining', text: '어디까지 AI야?' }, { who: 'saebom', mood: 'happy', text: '솔직해서 믿음이 가!' }] : [{ who: 'saebom', mood: 'happy', text: '네가 다 한 거야?' }, { who: 'daon', mood: 'worried', text: '루미 목소리 아니야…?' }]);
    runDialog(lines, () => goStage('complete'), '정리하기');
  },
  complete() {
    clearPanel();
    sfx('win'); playFx('correct', 640, 180);
    const d1 = S.day1 || { fooled: 0, seen: 0, topics: 0 }, d2 = S.day2 || { fooled: 0, seen: 0, topics: 0, aiKnown: 0 };
    const box = el('div', 'ee-success');
    const h = el('div', 'tp-heading'); h.appendChild(iconCanvas('check', 28)); h.appendChild(document.createTextNode('우리가 발견한 것')); box.appendChild(h);
    const ol = el('ol', 'tp-found');
    [['warning', '① 표시가 없으면 속고, 그 결과를 내가 겪어요.'], ['help', '② 표시와 이유가 있으면 내가 고를 수 있어요.'], ['person', '③ 투명성은 나에게도 해당돼요. 내가 AI를 썼으면 밝혀야 믿음이 생겨요.']].forEach(([ic, t]) => { const li = el('li'); li.appendChild(iconCanvas(ic, 24)); li.appendChild(el('span', null, t)); ol.appendChild(li); });
    box.appendChild(ol); panel.appendChild(box);
    const rem = el('div', 'ee-notice'); rem.appendChild(el('p', 'tp-small', '기억할 한 문장')); rem.appendChild(el('p', 'tp-remember', '"AI가 만든 건 표시하고, 왜 추천했는지 알려 줘야 해요. 내가 AI를 썼을 때도요."')); panel.appendChild(rem);
    const table = el('table', 'tp-table'); table.innerHTML = '<caption class="tp-small">1일차와 2일차 비교 · ' + subj().name + '</caption><thead><tr><th scope="col"></th><th scope="col">1일차 · 표시 없음</th><th scope="col">2일차 · 표시 있음</th></tr></thead>';
    const tb = el('tbody');
    [['속은 카드', d1.fooled + '장', d2.fooled + '장' + (d2.aiKnown ? ` (알고 가져온 AI 카드 ${d2.aiKnown}장)` : '')], ['본 영상 수', d1.seen + '개', d2.seen + '개'], ['본 주제 수', d1.topics + '가지', d2.topics + '가지'], ['3일차 내 영상', '-', S.label === 'on' ? '「AI 도움받음」 표시함' : '표시 없이 올림']].forEach(r => { const tr = el('tr'); r.forEach(c => tr.appendChild(el('td', null, c))); tb.appendChild(tr); });
    if (S.label === 'on') { const bi = extraEl('tp_badge_aihelp', 'tp-badge-img ee-pixel'); if (bi) tb.lastElementChild.lastElementChild.prepend(bi); }
    const mr = el('tr'); mr.appendChild(el('td', null, '시청 지도')); [d1.topics, d2.topics].forEach((c, k) => { const td = el('td'); td.appendChild(viewMapCanvas(c, (k + 1) + '일차')); mr.appendChild(td); }); tb.appendChild(mr);
    table.appendChild(tb); panel.appendChild(table);
    panel.appendChild(speech('robot', 'explaining', TP_EXPLAIN));
    const rh = el('div', 'tp-heading'); rh.appendChild(iconCanvas('notebook', 28)); rh.appendChild(document.createTextNode('탐험 보고서 카드')); panel.appendChild(rh);
    const rep = el('div', 'tp-report'); panel.appendChild(rep);
    if (window.EthicityReportCard) window.EthicityReportCard.mount(rep, reportOpts(d1, d2));
    panel.appendChild(actions(button('다시 하기', () => { sfx('tap'); store('progress', null); S.day1 = null; S.day2 = null; S.thinks = []; S.aiUsed = 0; S.label = null; goStage('start'); }, { autofocus: true, icon: 'retry', id: 'btnRestart' })));
    const result = { completed: true, day1Fooled: d1.fooled, day2Fooled: d2.fooled, labeled: S.label === 'on', thinks: S.thinks.slice() };
    store('result', result); store('progress', { stage: 'complete' });
    post('ethicity:complete', { result });
    focusPrimary();
  }
};

/* 탐험 보고서 카드(report-card.js)에 넣을 내용 */
function cardsLine(d) { if (!d || !d.cards) return '-'; return d.cards.map(c => { const v = VIDEO_BY_ID[c.id]; return (v ? v.title : c.id) + (v && v.isAI ? (c.known ? ' (AI · 알고 가져옴)' : ' (AI)') : ''); }).join(', '); }
function reportOpts(d1, d2) {
  const face = (id, mood) => (ctx, x, y, size) => A.drawPortrait(ctx, id, mood, x, y, size);
  const th = S.thinkTexts || [];
  return {
    concept: '투명성', game: '루미튜브로 발표 준비하기', title: '루미튜브 발표 보고서 · ' + subj().name, nick: playerName(), who: nameOf(S.player), portrait: face(S.player, 'happy'),
    stats: [{ label: '1일차 속은 카드', value: d1.fooled + '장', color: '#bf7865' }, { label: '2일차 속은 카드', value: d2.fooled + '장', color: '#5a8c65' }, { label: '본 영상 (1→2일차)', value: d1.seen + '→' + d2.seen, color: '#3f7fb5' }, { label: '3일차 내 영상', value: S.label === 'on' ? '표시함' : '표시 없음', color: S.label === 'on' ? '#5a8c65' : '#bf7865' }],
    sections: [
      { heading: '발표 자료', rows: [['발표 주제', '「' + subj().title + '」 · ' + subj().name], ['1일차 카드', cardsLine(S.day1)], ['2일차 카드', cardsLine(S.day2)], ['알고 가져온 AI 카드', (d2.aiKnown || 0) + '장'], ['본 주제 수', d1.topics + '가지 → ' + d2.topics + '가지 (전체 ' + subj().topics.length + '가지)']] },
      { heading: '내 생각 카드', lines: ['① ' + (th[0] || '고르지 않았어요'), '② ' + (th[1] || '고르지 않았어요')] },
      { heading: '우리가 발견한 것', lines: ['표시가 없으면 속고, 그 결과를 내가 겪어요.', '표시와 이유가 있으면 내가 고를 수 있어요.', '투명성은 나에게도 해당돼요. 내가 AI를 썼으면 밝혀야 믿음이 생겨요.'] }
    ],
    ai: { name: '루미', text: TP_EXPLAIN, portrait: face('robot', 'explaining') },
    remember: 'AI가 만든 건 표시하고, 왜 추천했는지 알려 줘야 해요. 내가 AI를 썼을 때도요.', filename: '윤리시티_투명성_' + playerName()
  };
}

/* 발표 장면 흐름 */
function presentFlow() {
  const list = presentList(); if (!list.length) { goStage(S.stage === 'present1' ? 'feed1' : 'feed2'); return; }
  const day = S.stage === 'present1' ? 1 : 2;
  const i = S.presentIndex, card = list[i];
  clearPanel(); clearBubbles(); drawScene();
  if (S.presentStep === 3) { presentSummary(day, list); return; }
  const friends = ['saebom', 'onyu', 'daon', partner()]; const friend = friends[i % friends.length]; const friend2 = friends[(i + 2) % friends.length];
  // 패널의 발표 카드: 사실 카드 틀(썸네일) + 글
  const slide = el('div', 'tp-slide' + (S.presentStep === 2 ? ' flipped' : '')); slide.setAttribute('role', 'group'); slide.setAttribute('aria-label', `발표 카드 ${i + 1}`);
  const fc = el('div', 'tp-factcard' + (extraImg.has('tp_fact_card') ? ' has-card' : '')); const fbg = extraEl('tp_fact_card', 'tp-factcard-bg ee-pixel'); if (fbg) fc.appendChild(fbg); fc.appendChild(thumbCanvas(card, 'tp-factcard-thumb')); fc.appendChild(el('span', 'tp-factcard-no', `카드 ${i + 1} / ${list.length}`)); slide.appendChild(fc);
  const body = el('div', 'tp-slide-body');
  if (S.presentStep === 2) {
    body.appendChild(el('p', 'tp-slide-title', card.title));
    const rv = el('div', 'tp-slide-reveal'); const bi = extraEl('tp_badge_ai', 'tp-badge-img ee-pixel'); rv.appendChild(bi || iconCanvas('robot', 24)); rv.appendChild(el('span', null, `AI가 만든 영상이었어요 · 추천 이유: ${reasonOf(card)}`)); body.appendChild(rv);
    body.appendChild(el('p', 'tp-slide-fact', '티: ' + card.tell));
  } else {
    body.appendChild(el('p', 'tp-slide-title', card.title)); body.appendChild(el('p', 'tp-slide-fact', card.fact));
    if (card.known) { const k = el('p', 'tp-slide-note'); const bi = extraEl('tp_badge_ai', 'tp-badge-img ee-pixel'); k.appendChild(bi || iconCanvas('robot', 18)); k.appendChild(document.createTextNode(' 「AI 제작」 표시가 있던 영상이에요.')); body.appendChild(k); }
  }
  slide.appendChild(body); panel.appendChild(slide);
  let line, next;
  if (S.presentStep === 0) {
    line = speech('player', card.known ? 'explaining' : 'neutral', card.known ? `이 영상은 「AI 제작」 표시가 있었어요. ${card.fact} 진짜인지 같이 확인이 필요해요.` : card.fact);
    next = () => { S.presentStep = 1; presentFlow(); };
  } else if (S.presentStep === 1) {
    if (card.known) { line = speech(friend, 'neutral', pickLine(KNOWN_FRIEND_LONG, i)); showBubbles([{ who: friend, mood: 'neutral', text: pickLine(KNOWN_FRIEND, i) }, { who: 'teacher', mood: 'happy', text: pickLine(KNOWN_TEACHER, i) }]); }
    else if (card.isAI) { line = speech(friend, 'worried', card.react); showBubbles([{ who: friend, mood: 'worried', text: card.react }, { who: friend2, mood: 'worried', text: pickLine(DOUBT_FRIEND, i) }, { who: 'teacher', mood: 'worried', text: pickLine(DOUBT_TEACHER, i) }]); }
    else { line = speech(friend, 'happy', card.react); showBubbles([{ who: friend, mood: 'happy', text: card.react }, { who: friend2, mood: 'happy', text: pickLine(AGREE_FRIEND, i) }, { who: 'teacher', mood: 'happy', text: pickLine(day === 2 ? PRAISE_TEACHER2 : PRAISE_TEACHER1, i) }]); }
    next = () => { if (card.isAI && !card.known) { S.presentStep = 2; sfx('miss'); playFx('retry', 640, 180); } else { S.presentStep = 0; S.presentIndex++; if (S.presentIndex >= list.length) S.presentStep = 3; } presentFlow(); };
  } else {
    line = speech('robot', 'explaining', revealLine(card, day));
    showBubbles([{ who: friend, mood: 'worried', text: pickLine(REVEAL_FRIEND, i) }, { who: 'teacher', mood: 'worried', text: pickLine(REVEAL_TEACHER, i) }]);
    next = () => { S.presentStep = 0; S.presentIndex++; if (S.presentIndex >= list.length) S.presentStep = 3; presentFlow(); };
  }
  panel.appendChild(line);
  panel.appendChild(actions(button('다음', next, { autofocus: true, icon: 'arrow_right', id: 'btnNext' })));
  focusPrimary();
}
function presentSummary(day, list) {
  const stats = day === 1 ? S.day1 : S.day2;
  const n = stats.fooled;
  let text;
  if (day === 1) {
    text = n > 0 ? `5장 중 ${n}장이 AI 슬롭이었어요. 몰랐죠? 표시도 이유도 없었으니까요.` : '5장 모두 진짜였어요! 그런데 표시가 없어서 고르는 내내 하나하나 의심해야 했죠? 운이 좋았을 수도 있어요.';
    sfx(n > 0 ? 'retry' : 'collect'); playFx(n > 0 ? 'retry' : 'clue', 640, 180);
  } else {
    const f1 = S.day1 ? S.day1.fooled : 0;
    text = `속은 카드 ${f1}장 → ${n}장. 표시와 이유가 있으니 ${stats.aiKnown ? `AI 카드 ${stats.aiKnown}장도 알고 가져와서 친구들에게 미리 말할 수 있었어요.` : 'AI 영상을 미리 알고 피할 수 있었어요.'}`;
    sfx('win'); playFx('correct', 640, 180);
  }
  const box = el('div', day === 1 ? 'ee-notice' : 'ee-success');
  const h = el('div', 'tp-heading'); h.appendChild(iconCanvas(day === 1 ? 'retry' : 'check', 28)); h.appendChild(document.createTextNode(day === 1 ? '1일차 발표 결과' : '2일차 발표 결과')); box.appendChild(h);
  box.appendChild(el('p', 'tp-lead', text));
  if (day === 2) {
    const t = el('table', 'tp-table'); t.innerHTML = '<thead><tr><th scope="col"></th><th scope="col">1일차</th><th scope="col">2일차</th></tr></thead>'; const tb = el('tbody');
    [['속은 카드', (S.day1 ? S.day1.fooled : 0) + '장', n + '장'], ['본 주제 수', (S.day1 ? S.day1.topics : 0) + '가지', stats.topics + '가지']].forEach(r => { const tr = el('tr'); r.forEach(c => tr.appendChild(el('td', null, c))); tb.appendChild(tr); });
    const tr = el('tr'); tr.appendChild(el('td', null, '시청 지도')); [S.day1 ? S.day1.topics : 0, stats.topics].forEach((c, k) => { const td = el('td'); td.appendChild(viewMapCanvas(c, (k + 1) + '일차')); tr.appendChild(td); }); tb.appendChild(tr);
    t.appendChild(tb); box.appendChild(t);
    showBubbles([{ who: 'saebom', mood: 'happy', text: '오늘 발표 믿을 만했어!' }, { who: 'daon', mood: 'happy', text: '표시 보고 골랐구나!' }, { who: 'teacher', mood: 'happy', text: '이유까지 살펴봤군요. 잘했어요!' }]);
  } else {
    showBubbles([{ who: 'onyu', mood: 'worried', text: 'AI 영상이 섞여 있었네…' }, { who: 'teacher', mood: 'worried', text: '괜찮아요. 누구라도 속을 수 있었어요.' }]);
  }
  panel.appendChild(box);
  panel.appendChild(speech(day === 1 ? 'teacher' : 'robot', day === 1 ? 'worried' : 'happy', day === 1 ? '괜찮아요. 누구라도 속을 수 있었어요. 잠깐 생각해 볼까요?' : '같은 피드인데 네가 고를 수 있게 됐어요. 잠깐 생각해 볼까요?'));
  panel.appendChild(actions(button('생각 카드로', () => { sfx('tap'); goStage(day === 1 ? 'think1' : 'think2'); }, { autofocus: true, icon: 'notebook', id: 'btnNext' })));
  focusPrimary();
}

/* 생각 카드: 정답 없음, 선택 3 */
function thinkCard(no, question, options, onDone) {
  clearPanel();
  const h = el('div', 'tp-heading'); h.appendChild(iconCanvas('notebook', 28)); h.appendChild(document.createTextNode(`생각 카드 ${no} · 정답은 없어요`)); panel.appendChild(h);
  const q = el('p', 'tp-lead', question); q.id = 'thinkQ'; panel.appendChild(q);
  const choices = el('div', 'tp-choices'); choices.setAttribute('role', 'group'); choices.setAttribute('aria-labelledby', 'thinkQ');
  const reply = el('div'); reply.hidden = true;
  options.forEach(([t, r], i) => {
    const b = el('button', 'ee-choice'); b.type = 'button'; b.setAttribute('aria-pressed', 'false'); b.dataset.choice = String(i); b.appendChild(el('span', 'tp-num', ['①', '②', '③'][i])); b.appendChild(el('span', null, t));
    b.addEventListener('click', () => {
      choices.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true');
      S.thinks[no - 1] = i; S.thinkTexts = S.thinkTexts || []; S.thinkTexts[no - 1] = t; sfx('collect');
      reply.hidden = false; reply.innerHTML = ''; reply.appendChild(speech('robot', 'explaining', r));
      reply.appendChild(actions(button('다음', () => { sfx('tap'); onDone(); }, { autofocus: true, icon: 'arrow_right', id: 'btnNext' })));
      if (!FAST) reply.querySelector('[data-autofocus]').focus({ preventScroll: true });
    });
    choices.appendChild(b);
  });
  panel.appendChild(choices); panel.appendChild(reply);
  panel.appendChild(el('p', 'tp-small', '마음에 가까운 것을 하나 골라요. 60초쯤 생각해도 좋아요.'));
  if (!FAST) choices.querySelector('button').focus({ preventScroll: true });
}

/* 3일차 문장 고르기 */
function makeRound() {
  clearPanel();
  const i = S.makeIndex, row = S.makeRows[i];
  const h = el('div', 'tp-heading'); h.appendChild(iconCanvas('notebook', 28)); h.appendChild(document.createTextNode(`발표 영상 문장 ${i + 1} / 3`)); panel.appendChild(h);
  panel.appendChild(speech('robot', 'explaining', '둘 중 영상에 넣을 문장을 골라요. 어느 쪽을 골라도 괜찮아요.'));
  const opts = el('div', 'tp-makeopts'); opts.setAttribute('role', 'group'); opts.setAttribute('aria-label', '문장 고르기');
  [['person', '내가 쓴 문장', row.mine, false], ['robot', '루미 AI가 써 준 문장', row.ai, true]].forEach(([ic, lab, text, isAI], k) => {
    const b = el('button', 'ee-choice'); b.type = 'button'; b.setAttribute('aria-pressed', 'false'); b.dataset.choice = String(k);
    const wrap = el('span'); wrap.appendChild(el('small', null, lab)); wrap.appendChild(document.createTextNode(text)); b.appendChild(iconCanvas(ic, 24)); b.appendChild(wrap);
    b.addEventListener('click', () => { opts.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); if (isAI) S.aiUsed++; sfx('paper'); S.makeIndex++; setTimeout(() => { if (S.makeIndex >= 3) goStage('label'); else makeRound(); }, FAST ? 50 : 300); });
    opts.appendChild(b);
  });
  panel.appendChild(opts);
  if (!FAST) opts.querySelector('button').focus({ preventScroll: true });
}

/* ---------- 테스트 훅 ---------- */
function clickChoice(i) { const list = panel.querySelectorAll('.ee-choice'); const b = list[Math.min(i, list.length - 1)]; if (b) { b.click(); return true; } return false; }
window.__tp = {
  state() { return { stage: S.stage, player: S.player, cards: S.cards.map(c => c.id), day1: S.day1, day2: S.day2, thinks: S.thinks.slice(), aiUsed: S.aiUsed, label: S.label, current: S.current && S.current.id, pendingConfirm: S.pendingConfirm, seed: SEED, fast: FAST, timerLeft: S.timerLeft };
  },
  pick(i) { if (!(S.stage === 'feed1' || S.stage === 'feed2')) return false; if (S.pendingConfirm) { collectCurrent(true); return true; } if (typeof i === 'number') { for (let k = 0; k < i; k++) nextVideo(); } if (S.day === 2 && S.current.isAI) { S.pendingConfirm = S.current.id; renderPhone(); return true; } collectCurrent(false); return true; },
  next() { if (S.stage === 'feed1' || S.stage === 'feed2') { if (S.pendingConfirm) { S.pendingConfirm = null; } nextVideo(); renderPhone(); return true; } const b = panel.querySelector('#btnNext') || panel.querySelector('[data-autofocus]'); if (b) { b.click(); return true; } return false; },
  subject(id) { if (SUBJECTS[id]) S.subject = id; return S.subject; },
  choose(i) { if (S.stage === 'start') { if (!S.subject) S.subject = 'science'; const n = $('nick'); if (n && !n.value) n.value = '별고래'; const b = $('btnStart'); if (b) b.click(); return true; } return clickChoice(i || 0); },
  go(stage) { goStage(stage); }
};
function autoStep() {
  autoTick++;
  const st = S.stage;
  if (st === 'complete') { clearInterval(autoHandle); return; }
  if (st === 'start') { if (!S.subject) S.subject = 'science'; const n = $('nick'); if (n) n.value = '별고래'; $('btnStart').click(); return; }
  if (st === 'feed1' || st === 'feed2') { if (S.pendingConfirm) { (autoTick % 2 ? $('btnConfirmYes') : $('btnConfirmNo')).click(); return; } if (autoTick % 2) $('btnPick').click(); else $('btnSkip').click(); return; }
  if (st === 'think1' || st === 'think2' || st === 'make' || st === 'label') { const nb = panel.querySelector('#btnNext'); if (nb) { nb.click(); return; } clickChoice(autoTick % 3); return; }
  window.__tp.next();
}

/* ---------- 초기화 ---------- */
async function init() {
  try { A = await EthicityAssets.load(window.ETHICITY_COMMON_MANIFEST, COMMON_BASE); }
  catch (e) { const p = el('p', 'ee-notice', '공통 그림을 불러오지 못했어요. 경로를 확인한 뒤 새로고침해 주세요. (' + e.message + ')'); p.setAttribute('role', 'alert'); panel.appendChild(p); return; }
  BGM = window.EthicityBgm ? window.EthicityBgm('assets/bgm.mp3', { volume: 0.25, loopEnd: 22.32 }) : null; // 루미튜브 구간 22.32초(36박) 루프
  // 소리 버튼은 썸네일 66장을 읽기 전에 먼저 살립니다(초기화가 몇 초 걸려도 바로 누를 수 있게).
  const savedSfx = load('sfx'); $('btnSound').addEventListener('click', () => { setSound(!A.soundEnabled); if (A.soundEnabled) sfx('tap'); });
  if (savedSfx) { const once = () => { setSound(true); document.removeEventListener('pointerdown', once); document.removeEventListener('keydown', once); }; document.addEventListener('pointerdown', once); document.addEventListener('keydown', once); }
  try { await Promise.all([document.fonts.load('400 20px Ethicity'), document.fonts.load('700 20px Ethicity')]); } catch (e) { /* 글꼴이 없어도 진행 */ }
  fontsReady = true;
  // 게임 전용 자료: 코덱스 납품 썸네일이 있으면 우선
  try {
    const res = await fetch('assets/manifest.json', { cache: 'no-store' });
    if (res.ok) {
      const man = await res.json(); const loadInto = (map, table) => Promise.all(Object.entries(table || {}).map(([id, file]) => new Promise(resolve => { if (!file) return resolve(); const img = new Image(); img.onload = () => { map.set(id, img); resolve(); }; img.onerror = () => resolve(); img.src = 'assets/' + file; })));
      await Promise.all([loadInto(customThumbs, man.thumbs), loadInto(extraImg, man.ui)]);
    }
  } catch (e) { /* 파일 없음 → 임시 썸네일 */ }
  document.querySelectorAll('canvas[data-icon]').forEach(c => A.drawIcon(c.getContext('2d'), c.dataset.icon, 0, 0, 64));
  const savedPlayer = load('player'); if (savedPlayer && typeof savedPlayer === 'object') { if (savedPlayer.character === 'jiho' || savedPlayer.character === 'haneul') S.player = savedPlayer.character; if (/^[가-힣]{1,5}$/.test(savedPlayer.nickname || '')) S.nick = savedPlayer.nickname; if (SUBJECTS[savedPlayer.subject]) S.subject = savedPlayer.subject; }
  post('ethicity:ready');
  if (SKIP && STAGES.includes(SKIP) && SKIP !== 'start') {
    if (!S.nick) S.nick = '별고래'; if (!S.subject) S.subject = 'science';
    const fake = () => { resetFeed(1); const ids = VIDEOS.slice(0, 15).map(v => v.id); const pick = []; while (pick.length < 5) { const id = ids[Math.floor(rand() * ids.length)]; if (!pick.includes(id)) pick.push(id); } return { cards: pick.map(id => ({ id, known: false })), fooled: pick.filter(id => VIDEO_BY_ID[id].isAI).length, aiKnown: 0, seen: 9, topics: 4 }; };
    if (STAGES.indexOf(SKIP) > STAGES.indexOf('feed1') && !S.day1) { S.day1 = fake(); S.day1.fooled = 3; S.day1.cards = ['a01', 'r02', 'a04', 'r07', 'a05'].map(id => ({ id, known: false })); }
    if (STAGES.indexOf(SKIP) > STAGES.indexOf('feed2') && !S.day2) { S.day2 = { cards: ['r01', 'r03', 'r05', 'r06', 'r08'].map(id => ({ id, known: false })), fooled: 0, aiKnown: 0, seen: 11, topics: 5 }; }
    if (STAGES.indexOf(SKIP) > STAGES.indexOf('label')) S.label = S.label || 'on';
    goStage(SKIP, { silent: true });
  } else goStage('start', { silent: true });
  if (FAST) autoHandle = setInterval(autoStep, Math.max(30, 900 / FAST));
}
init();
})();
