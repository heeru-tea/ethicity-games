/* ============================================================
   윤리시티 · 안전성 「닥터루미 창구」  gameId: safety
   공통 팩 ethicity-elementary-common-v1 의 캐릭터·배경·소품·아이콘·효과·효과음을
   runtime/common.js(EthicityAssets)로 그대로 그린다. 새 캐릭터·배경은 그리지 않는다.
   동작 하나: 닥터루미(robot) 답이 맞으면 아이를 오른쪽(침대) / 틀렸으면 왼쪽(보건쌤)으로 민다.
   흐름: START → (마당 진입) → INTRO → 1일차 → 생각 카드 → 2일차(못 보는 카드) → 생각 카드 → 3일차(안전장치) → 3일 보고서 → 완료
   테스트 훅: ?fast=N ?skip=stageId ?seed=N, window.__safety
   ============================================================ */
(function () {
  'use strict';
  var GAME_ID = 'safety';
  var COMMON_BASE = '../shared/ethicity-elementary-common-v1';
  var W = 1280, H = 720;
  var Q = parseQuery();
  var SPEED = Math.max(1, Math.min(30, +Q.fast || 1));
  var SEED = (+Q.seed || Math.floor(Math.random() * 1e9)) >>> 0;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var STORE = { player: 'ethicity.safety.player', result: 'ethicity.safety.result', sound: 'ethicity.safety.sound' };
  var TOTAL_STEPS = 7;

  function parseQuery() { var o = {}; (location.search || '').replace(/^\?/, '').split('&').forEach(function (p) { if (!p) return; var kv = p.split('='); o[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || ''); }); return o; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function post(msg) { try { if (window.parent && window.parent !== window) window.parent.postMessage(Object.assign({ gameId: GAME_ID }, msg), '*'); } catch (e) { /* 부모 없음 */ } }
  function load(key) { try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function save(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); return true; } catch (e) { return false; } }

  // ── 결정적 난수 ─────────────────────────────────────────────
  function rng(seed) { var a = (seed >>> 0) || 1; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var r = Math.imul(a ^ a >>> 15, 1 | a); r = r + Math.imul(r ^ r >>> 7, 61 | r) ^ r; return ((r ^ r >>> 14) >>> 0) / 4294967296; }; }
  function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }

  // ── 데이터: 공식 캐릭터 ID 만 사용 ─────────────────────────────
  var KID_IDS = ['jiho', 'haneul', 'saebom', 'onyu', 'daon'];
  var NAMES = { jiho: '지호', haneul: '하늘', saebom: '새봄', onyu: '온유', daon: '다온', teacher: '보건쌤', robot: '닥터루미' };
  var ALLERGENS = ['땅콩', '우유', '달걀', '새우'];
  var LUNCH = { '땅콩': '땅콩 소스 비빔밥', '우유': '우유 · 크림 스프', '달걀': '달걀말이 · 밥', '새우': '새우볶음밥' };
  var RATE = { 'new': 0.05, old: 0.25 };
  var DANGER_TOPICS = { fever: 1, allergy: 1, scrape: 1, throat: 1 };   // 3일차 안전장치: 위험 증상(열·알레르기·상처·목)
  var LINE_OK_REST = '괜찮아요 · 물 마시고 쉬어요', LINE_OK_CLASS = '괜찮아요 · 교실로 돌아가요', LINE_FEVER = '열이 있어요 · 침대에서 쉬어요';
  // 증상 12종 — 카드 구성·정답 문구는 설계서 표 그대로
  var TOPICS = {
    fever:   { cards: ['temp', 'skin', 'sticker'], key: 'temp', line: LINE_FEVER, wrong: LINE_OK_REST, say: ['머리가 띵하고 몸이 뜨거워요.', '아침부터 으슬으슬해요.', '얼굴이 자꾸 빨개져요.'], trapSay: '괜찮아요, 그냥 왔어요.' },
    allergy: { cards: ['sticker', 'lunch', 'temp'], key: 'lunch', line: '알레르기 · 급식 빼고 보건쌤께', wrong: '괜찮아요 · 급식 먹어도 돼요', say: ['급식 먹으러 가도 돼요?', '오늘 급식 먹어도 괜찮을까요?'] },
    rash:    { cards: ['skin', 'temp'], key: 'skin', line: '발진 · 연고 바르고 쉬어요', wrong: LINE_OK_CLASS, say: ['팔이 자꾸 가려워요.', '팔에 뭐가 났어요.'] },
    scrape:  { cards: ['skin', 'temp'], key: 'skin', line: '상처 · 소독하고 반창고', wrong: LINE_OK_CLASS, say: ['넘어져서 팔이 까졌어요.', '운동장에서 긁혔어요.'] },
    sting:   { cards: ['skin', 'sticker'], key: 'skin', line: '부었어요 · 차갑게 하고 쉬어요', wrong: LINE_OK_CLASS, say: ['벌에 쏘인 것 같아요.', '팔이 퉁퉁 부었어요.'] },
    nose:    { cards: ['nose', 'temp'], key: 'nose', line: '코피 · 고개 숙이고 코 잡기', wrong: LINE_OK_CLASS, say: ['코피가 나요!', '코에서 피가 났어요.'] },
    throat:  { cards: ['throat', 'temp'], key: 'throat', line: '목이 부었어요 · 물 마시고 쉬어요', wrong: LINE_OK_CLASS, say: ['목이 따끔거려요.', '침 삼킬 때 아파요.'] },
    tummy:   { cards: ['lunch', 'temp'], key: 'lunch', line: '배탈 · 따뜻하게 쉬어요', wrong: LINE_FEVER, say: ['급식 먹고 배가 살살 아파요.', '점심을 급하게 먹었어요.'] },
    dizzy:   { cards: ['temp', 'skin'], key: 'temp', line: '어지러워요 · 앉아서 쉬어요', wrong: LINE_OK_CLASS, say: ['체육 하고 어지러웠어요.', '머리가 핑 돌아요.'] },
    cough:   { cards: ['throat', 'temp'], key: 'temp', line: '기침 · 물 마시고 쉬어요', wrong: LINE_OK_CLASS, say: ['기침이 자꾸 나요.', '콜록콜록 멈추질 않아요.'] },
    tired:   { cards: ['temp', 'skin'], key: 'temp', line: LINE_OK_REST, wrong: LINE_FEVER, say: ['그냥 좀 피곤해요.', '아침에 늦게 잤어요.'] },
    faking:  { cards: ['temp', 'skin'], key: 'temp', line: LINE_OK_CLASS, wrong: LINE_FEVER, say: ['너무 아파요… 집에 가고 싶어요.', '열이 펄펄 나는 것 같아요.'] }
  };
  var TOPIC_POOL = ['fever', 'fever', 'allergy', 'allergy', 'rash', 'scrape', 'sting', 'nose', 'throat', 'tummy', 'dizzy', 'cough', 'tired', 'faking', 'faking'];
  var CARD_LABEL = { temp: '체온', skin: '피부', sticker: '알레르기 스티커', lunch: '오늘 급식', nose: '코', throat: '목' };

  var CARD_PHRASES = { A: 'AI가 자신 있게 말해도 중요한 건 다시 확인해요.', B: '숫자보다 증거를 먼저 봐요.', C: '빠른 AI 답보다 안전을 먼저 골라요.', D: "AI 답을 볼 때마다 '정말일까?' 한 번 더 물어요." };
  var ENDINGS = { A: '두 번 확인하는 손', B: '거의 안전한 창구', C: '빨랐지만 아찔했던 사흘', D: '반반의 사흘' };
  var SAFETY_EXPLAIN = '안전성이란, AI가 틀릴 수 있다는 걸 알고 사람이 다치지 않게 미리 장치를 두는 거예요. 자신감 숫자보다 증거 카드를 먼저 보고, 열이나 알레르기처럼 위험한 일은 사람이 한 번 더 확인하고, AI가 못 본 건 사람이 봐요. 네가 신고한 오류가 나를 더 안전하게 만들어요.';
  var THINK = {
    think1: { q: '닥터루미가 자신 있게 말했는데 틀렸어요. 숫자를 봤나요, 증거를 봤나요?', seen: '닥터루미가 {name}에게 {conf}%라고 했는데 틀렸어요. 숫자를 봤나요, 증거를 봤나요?', c: ['자신감 숫자가 높아서 믿었어요', '증거 카드를 먼저 봤어요', '반은 숫자, 반은 증거였어요'] },
    think2: { q: '닥터루미가 못 본 카드는 누가 봐야 할까요?', c: ['닥터루미가 더 똑똑해지면 돼요', '사람이 꼭 확인해야 해요', '자신감이 높으면 안 봐도 돼요'] }
  };

  // ── 하루 설정 ───────────────────────────────────────────────
  var DAYS = {
    day1: { day: 1, title: '닥터루미, 믿어도 될까', seconds: 150, interval: [4.0, 2.5], patience: 9, tutorial: true, unseen: false, safety: false },
    day2: { day: 2, title: '닥터루미가 못 보는 것', seconds: 180, interval: [3.6, 2.5], patience: 8, tutorial: false, unseen: true, safety: false, bossAt: 12 },
    day3: { day: 3, title: '안전장치가 생겼어요', seconds: 180, interval: [3.6, 2.5], patience: 9, tutorial: false, unseen: true, safety: true }
  };
  var QUEUE_MAX = 8;

  // ── 케이스 생성 ─────────────────────────────────────────────
  function tempFor(r, hot) { return hot ? 37.7 + Math.round(r() * 14) / 10 : 36.2 + Math.round(r() * 11) / 10; }
  function genCases(seed, n, cfg, kidPool) {
    var r = rng(seed), out = [];
    for (var i = 0; i < n; i++) {
      var topic = pick(r, TOPIC_POOL), T = TOPICS[topic], c = { i: i, topic: topic, kid: pick(r, kidPool), boss: false, cards: [], key: T.key, u: r(), confR: r(), confW: r(), trap: false, hidden: -1, unseen: -1 };
      var hot = topic === 'fever' || (topic === 'throat' && r() < 0.5) || (topic === 'dizzy' && r() < 0.5) || (topic === 'cough' && r() < 0.4);
      var temp = tempFor(r, hot);
      var sticker = r() < 0.55 ? pick(r, ALLERGENS) : null, lunchItem = pick(r, ALLERGENS);
      if (topic === 'allergy') { if (r() < 0.7) { sticker = sticker || pick(r, ALLERGENS); lunchItem = sticker; } else { sticker = sticker || pick(r, ALLERGENS); lunchItem = pick(r, ALLERGENS.filter(function (a) { return a !== sticker; })); } }
      if (topic === 'sting' && r() < 0.5) sticker = pick(r, ALLERGENS);
      T.cards.forEach(function (kind) {
        var card = { kind: kind };
        if (kind === 'temp') { card.value = temp; card.img = 'sf_card_temp'; card.text = temp.toFixed(1) + '°'; card.danger = temp >= 37.6; }
        else if (kind === 'skin') { var sk = topic === 'rash' ? 'rash' : topic === 'scrape' ? 'scrape' : topic === 'sting' ? 'swell' : 'ok'; card.value = sk; card.img = 'sf_card_skin_' + sk; card.text = { ok: '정상', rash: '발진', scrape: '까진 상처', swell: '부음' }[sk]; card.danger = sk !== 'ok'; }
        else if (kind === 'sticker') { card.value = sticker; card.img = sticker ? 'sf_card_sticker_' + allergenId(sticker) : 'sf_card_sticker_none'; card.text = sticker ? sticker + ' 알레르기' : '없음'; card.danger = !!sticker; }
        else if (kind === 'lunch') { card.value = lunchItem; card.img = 'sf_card_lunch_' + allergenId(lunchItem); card.text = LUNCH[lunchItem]; card.danger = !!sticker && sticker === lunchItem; }
        else if (kind === 'nose') { var nb = topic === 'nose'; card.value = nb ? 'bleed' : 'ok'; card.img = nb ? 'sf_card_nose_bleed' : 'sf_card_nose_ok'; card.text = nb ? '코피' : '정상'; card.danger = nb; }
        else if (kind === 'throat') { var tr = topic === 'throat' || (topic === 'cough' && r() < 0.4); card.value = tr ? 'red' : 'ok'; card.img = tr ? 'sf_card_throat_red' : 'sf_card_throat_ok'; card.text = tr ? '빨갛게 부음' : '정상'; card.danger = tr; }
        c.cards.push(card);
      });
      // 진실: 위험 여부와 정답 문구
      c.danger = truthDanger(c);
      c.line = truthLine(c);
      c.say = pick(r, T.say);
      if (topic === 'fever' && r() < 0.35) { c.say = T.trapSay; c.trap = true; }           // 함정: "괜찮아요"라는데 체온 38.5
      if (r() < 0.3) c.hidden = c.cards.findIndex(function (k) { return k.kind === c.key; });  // 함정: 숨은 카드에 핵심 증거
      if (cfg.unseen && r() < 0.45) c.unseen = Math.floor(r() * c.cards.length);             // 2일차: 닥터루미가 못 본 카드
      out.push(c);
    }
    if (cfg.tutorial) {   // 1일차 교습: 0번 맞는 답·숨김 없음, 1번 열인데 '괜찮아요'(틀림), 2번 숨은 핵심 카드
      out[0] = makeFeverTrap(out[0], false); out[0].hidden = -1; out[0].forceRight = true;
      out[1] = makeFeverTrap(out[1]); out[1].forceWrong = true; out[1].hidden = -1;
      out[2].hidden = out[2].cards.findIndex(function (k) { return k.kind === out[2].key; });
    }
    if (cfg.bossAt != null && cfg.bossAt < out.length) {   // 보스: 급식 알레르기, 급식 카드를 닥터루미가 못 봄, 자신감 97%
      var b = out[cfg.bossAt]; b.boss = true; b.topic = 'allergy'; b.key = 'lunch'; b.kid = 'saebom'; b.hidden = -1; b.trap = false;
      b.cards = [{ kind: 'sticker', value: '땅콩', img: 'sf_card_sticker_peanut', text: '땅콩 알레르기', danger: true }, { kind: 'lunch', value: '땅콩', img: 'sf_card_lunch_peanut', text: LUNCH['땅콩'], danger: true }, { kind: 'temp', value: 36.6, img: 'sf_card_temp', text: '36.6°', danger: false }];
      b.unseen = 1; b.danger = true; b.line = TOPICS.allergy.line; b.say = '오늘 급식에 땅콩 소스래요. 먹어도 돼요?';
    }
    return out;
  }
  function allergenId(a) { return { '땅콩': 'peanut', '우유': 'milk', '달걀': 'egg', '새우': 'shrimp' }[a]; }
  function makeFeverTrap(c, trap) {
    trap = trap !== false;
    var t = Object.assign({}, c, { topic: 'fever', key: 'temp', trap: trap, say: trap ? TOPICS.fever.trapSay : TOPICS.fever.say[0], boss: false });
    t.cards = [{ kind: 'temp', value: trap ? 38.3 : 38.1, img: 'sf_card_temp', text: trap ? '38.3°' : '38.1°', danger: true }, { kind: 'skin', value: 'ok', img: 'sf_card_skin_ok', text: '정상', danger: false }, { kind: 'sticker', value: null, img: 'sf_card_sticker_none', text: '없음', danger: false }];
    t.danger = true; t.line = LINE_FEVER; return t;
  }
  function cardOf(c, kind) { for (var i = 0; i < c.cards.length; i++) if (c.cards[i].kind === kind) return c.cards[i]; return null; }
  function truthDanger(c) {
    var t = cardOf(c, 'temp'), hot = t && t.value >= 37.6;
    switch (c.topic) {
      case 'fever': return true;
      case 'allergy': return cardOf(c, 'lunch').danger;
      case 'rash': case 'scrape': case 'sting': case 'nose': return true;
      case 'throat': return true;
      case 'dizzy': case 'cough': return !!hot;
      case 'tummy': case 'tired': case 'faking': return false;
    }
    return false;
  }
  function truthLine(c) {
    var T = TOPICS[c.topic], t = cardOf(c, 'temp'), hot = t && t.value >= 37.6;
    if (c.topic === 'allergy') return c.danger ? T.line : '괜찮아요 · 급식 먹어도 돼요';
    if ((c.topic === 'dizzy' || c.topic === 'cough') && hot) return LINE_FEVER;
    return T.line;
  }
  function wrongLine(c) {
    var T = TOPICS[c.topic];
    if (c.topic === 'allergy') return c.danger ? T.wrong : T.line;
    if ((c.topic === 'dizzy' || c.topic === 'cough')) return c.danger ? LINE_OK_CLASS : LINE_FEVER;
    return T.wrong;
  }
  function keyIndex(c) { return c.cards.findIndex(function (k) { return k.kind === c.key; }); }
  // 닥터루미의 답: 조건(최신판 5% / 옛 버전 25%)에 따라 틀린다. 못 본 카드에 핵심이 있으면 자신 있게 틀린다.
  function withAI(c, cond, cfg) {
    var wrong = c.boss ? true : c.forceWrong ? true : c.forceRight ? false : c.u < (RATE[cond] || RATE.old);
    var unseenKey = cfg.unseen && c.unseen >= 0 && c.cards[c.unseen].kind === c.key && c.cards[c.unseen].danger;
    if (unseenKey) wrong = true;
    var conf = wrong ? 68 + Math.round(c.confW * 28) : 72 + Math.round(c.confR * 26);
    if (unseenKey) conf = 85 + Math.round(c.confW * 11);
    if (c.boss) conf = 97;
    var verdict = wrong ? wrongLine(c) : c.line;
    var human = !!cfg.safety && (conf < 80 || !!DANGER_TOPICS[c.topic] || c.boss);
    return Object.assign({}, c, { ai: { wrong: wrong, conf: conf, line: verdict, unseenKey: unseenKey, human: human } });
  }
  // 1일차 앞쪽에 틀린 답이 최소 2건(그중 1건은 자신감 90% 이상) 있도록 보정 — 교습·생각 카드용
  function ensureWrong(cases, cfg) {
    if (!cfg.tutorial) return cases;
    var seen = cases.slice(0, 14), wrongs = seen.filter(function (c) { return c.ai.wrong; });
    var need = Math.max(0, 3 - wrongs.length), i, picked = [];
    for (i = 3; i < seen.length && picked.length < need; i += 3) if (!cases[i].ai.wrong) picked.push(i);
    picked.forEach(function (idx) { var c = cases[idx]; c.ai.wrong = true; c.ai.line = wrongLine(c); c.ai.conf = 90 + Math.round(c.confW * 8); });
    if (!cases.slice(0, 14).some(function (c) { return c.ai.wrong && c.ai.conf >= 90; })) { var w = cases.slice(0, 14).filter(function (c) { return c.ai.wrong; })[0]; if (w) w.ai.conf = 91 + Math.round(w.confW * 6); }
    return cases;
  }

  // ── 임시 픽셀 증거 카드(60×84 → 240×336). assets/manifest.json 에 PNG 가 있으면 그것을 우선 쓴다 ──
  var PAL = { ink: '#294b40', cream: '#fff9e7', sage: '#a8bb8c', gold: '#f3cf72', blue: '#72b7c4', red: '#bf7865', green: '#5a8c65', paper: '#f2e7c7', white: '#ffffff', skin: '#f6dcc0' };
  var cardImages = {};   // id → data URL 또는 PNG 경로
  function px(ctx, x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); }
  function rectO(ctx, x, y, w, h, fill, line) { px(ctx, x, y, w, h, line || PAL.ink); px(ctx, x + 1, y + 1, w - 2, h - 2, fill); }
  function oval(ctx, cx, cy, rx, ry, fill, line) {
    for (var yy = -ry; yy <= ry; yy++) { var ww = Math.round(rx * Math.sqrt(Math.max(0, 1 - (yy * yy) / (ry * ry)))); px(ctx, cx - ww, cy + yy, ww * 2 + 1, 1, line || PAL.ink); }
    for (yy = -ry + 1; yy <= ry - 1; yy++) { ww = Math.round((rx - 1) * Math.sqrt(Math.max(0, 1 - (yy * yy) / ((ry - 1) * (ry - 1))))); if (ww > 0) px(ctx, cx - ww, cy + yy, ww * 2 + 1, 1, fill); }
  }
  function drawCardBase(ctx, back) {
    px(ctx, 0, 0, 60, 84, PAL.ink); px(ctx, 2, 2, 56, 80, back ? PAL.paper : PAL.cream);
    px(ctx, 4, 4, 52, 1, PAL.sage); px(ctx, 4, 79, 52, 1, PAL.sage); px(ctx, 4, 4, 1, 76, PAL.sage); px(ctx, 55, 4, 1, 76, PAL.sage);
  }
  function drawItem(ctx, id) {
    var p = id.replace('sf_card_', '').split('_'), kind = p[0], v = p.slice(1).join('_');
    if (kind === 'back') { for (var y = 8; y < 76; y += 6) for (var x = 8; x < 52; x += 6) px(ctx, x, y, 2, 2, PAL.sage); rectO(ctx, 20, 30, 20, 24, PAL.cream); px(ctx, 26, 35, 8, 2, PAL.ink); px(ctx, 32, 37, 2, 4, PAL.ink); px(ctx, 28, 41, 4, 2, PAL.ink); px(ctx, 28, 46, 3, 3, PAL.ink); return; }
    if (kind === 'temp') { rectO(ctx, 25, 10, 10, 54, PAL.white); for (var i = 0; i < 6; i++) px(ctx, 36, 16 + i * 8, 4, 1, PAL.ink); px(ctx, 28, 16, 4, 44, PAL.paper); px(ctx, 28, 36, 4, 24, PAL.red); oval(ctx, 30, 68, 8, 8, PAL.red); return; }
    if (kind === 'skin') { rectO(ctx, 12, 20, 36, 44, PAL.skin); px(ctx, 12, 20, 36, 6, PAL.blue); px(ctx, 13, 21, 34, 4, PAL.blue);
      if (v === 'rash') { [[18, 32], [30, 30], [40, 38], [22, 46], [34, 50], [26, 56], [40, 54]].forEach(function (d) { px(ctx, d[0], d[1], 3, 3, PAL.red); }); }
      else if (v === 'scrape') { [[20, 34], [23, 37], [26, 40], [29, 43], [32, 46], [35, 49]].forEach(function (d) { px(ctx, d[0], d[1], 4, 3, PAL.red); }); px(ctx, 24, 48, 2, 2, PAL.red); px(ctx, 36, 36, 2, 2, PAL.red); }
      else if (v === 'swell') { oval(ctx, 30, 42, 11, 10, '#f3b7a4', PAL.red); px(ctx, 29, 41, 3, 3, PAL.red); [[14, 36], [44, 32], [16, 50], [46, 50]].forEach(function (d) { px(ctx, d[0], d[1], 3, 1, PAL.red); }); }
      else { px(ctx, 24, 40, 12, 2, PAL.sage); px(ctx, 28, 36, 4, 10, PAL.sage); }
      return; }
    if (kind === 'sticker') { oval(ctx, 30, 40, 22, 22, PAL.gold); oval(ctx, 30, 40, 18, 18, PAL.cream, PAL.gold);
      if (v === 'none') { px(ctx, 22, 40, 4, 4, PAL.green); px(ctx, 26, 44, 4, 4, PAL.green); px(ctx, 30, 40, 4, 4, PAL.green); px(ctx, 34, 36, 4, 4, PAL.green); px(ctx, 38, 32, 3, 4, PAL.green); }
      else allergenIcon(ctx, v, 30, 40);
      px(ctx, 14, 68, 32, 2, PAL.ink); px(ctx, 20, 72, 20, 2, PAL.ink); return; }
    if (kind === 'lunch') { rectO(ctx, 8, 24, 44, 40, PAL.sage); rectO(ctx, 12, 28, 16, 14, PAL.white); rectO(ctx, 32, 28, 16, 14, PAL.gold); rectO(ctx, 12, 46, 36, 14, PAL.paper); allergenIcon(ctx, v, 30, 53, true); px(ctx, 8, 66, 44, 4, PAL.ink); return; }
    if (kind === 'nose') { oval(ctx, 30, 36, 20, 22, PAL.skin); px(ctx, 22, 30, 3, 3, PAL.ink); px(ctx, 36, 30, 3, 3, PAL.ink); px(ctx, 29, 36, 3, 8, '#e3b996'); px(ctx, 27, 44, 7, 2, PAL.ink);
      if (v === 'bleed') { px(ctx, 32, 46, 2, 6, PAL.red); oval(ctx, 33, 56, 3, 4, PAL.red, PAL.red); oval(ctx, 33, 68, 4, 5, PAL.red, PAL.red); } else { px(ctx, 25, 50, 11, 2, PAL.ink); }
      return; }
    if (kind === 'throat') { oval(ctx, 30, 40, 24, 26, PAL.skin); oval(ctx, 30, 46, 12, 11, v === 'red' ? '#d98a7a' : '#f3c9c0'); oval(ctx, 30, 48, 7, 6, v === 'red' ? PAL.red : '#e9a79c', v === 'red' ? PAL.red : '#e9a79c');
      px(ctx, 21, 32, 3, 3, PAL.ink); px(ctx, 37, 32, 3, 3, PAL.ink); if (v === 'red') { px(ctx, 24, 44, 3, 2, PAL.red); px(ctx, 34, 44, 3, 2, PAL.red); } return; }
  }
  function allergenIcon(ctx, v, cx, cy, small) {
    var s = small ? 0.7 : 1;
    if (v === 'peanut') { oval(ctx, cx - Math.round(5 * s), cy, Math.round(7 * s), Math.round(6 * s), '#d9b06a'); oval(ctx, cx + Math.round(5 * s), cy, Math.round(7 * s), Math.round(6 * s), '#d9b06a'); px(ctx, cx - 2, cy - 2, 2, 2, PAL.ink); px(ctx, cx + 3, cy + 1, 2, 2, PAL.ink); }
    else if (v === 'milk') { rectO(ctx, cx - Math.round(7 * s), cy - Math.round(10 * s), Math.round(14 * s), Math.round(20 * s), PAL.white); px(ctx, cx - Math.round(6 * s), cy - 2, Math.round(12 * s), 3, PAL.blue); }
    else if (v === 'egg') { oval(ctx, cx, cy, Math.round(9 * s), Math.round(11 * s), PAL.white); oval(ctx, cx, cy + 2, Math.round(4 * s), Math.round(4 * s), PAL.gold, PAL.gold); }
    else if (v === 'shrimp') { oval(ctx, cx, cy, Math.round(11 * s), Math.round(7 * s), '#f0a28e', PAL.red); px(ctx, cx + 6, cy - 2, 2, 2, PAL.ink); px(ctx, cx - 8, cy + 2, 4, 2, PAL.red); px(ctx, cx - 11, cy - 4, 3, 2, PAL.red); }
  }
  var CARD_IDS = ['sf_card_back', 'sf_card_temp', 'sf_card_skin_ok', 'sf_card_skin_rash', 'sf_card_skin_scrape', 'sf_card_skin_swell', 'sf_card_sticker_none', 'sf_card_sticker_peanut', 'sf_card_sticker_milk', 'sf_card_sticker_egg', 'sf_card_sticker_shrimp', 'sf_card_lunch_peanut', 'sf_card_lunch_milk', 'sf_card_lunch_egg', 'sf_card_lunch_shrimp', 'sf_card_nose_ok', 'sf_card_nose_bleed', 'sf_card_throat_ok', 'sf_card_throat_red'];
  function buildTempCards() {
    var cv = document.createElement('canvas'); cv.width = 60; cv.height = 84; var ctx = cv.getContext('2d');
    var big = document.createElement('canvas'); big.width = 240; big.height = 336; var bctx = big.getContext('2d'); bctx.imageSmoothingEnabled = false;
    CARD_IDS.forEach(function (id) {
      ctx.clearRect(0, 0, 60, 84); drawCardBase(ctx, id === 'sf_card_back'); drawItem(ctx, id);
      bctx.clearRect(0, 0, 240, 336); bctx.imageSmoothingEnabled = false; bctx.drawImage(cv, 0, 0, 240, 336);
      cardImages[id] = big.toDataURL('image/png');
    });
  }
  // 게임 전용 자산 로더: assets/manifest.json(=assets/manifest.js 의 window.ETHICITY_SAFETY_ASSETS)에 등록된 PNG 를 우선 쓴다.
  // file:// 에서는 fetch 가 막히므로 manifest.js 전역을 먼저 보고, 없을 때만 http(s) 에서 manifest.json 을 읽는다. 없는 id 는 임시 픽셀 카드로 남는다.
  var gameImages = {};   // props: id → Image
  function loadGameAssets() {
    var m0 = window.ETHICITY_SAFETY_ASSETS || null;
    var p = m0 ? Promise.resolve(m0) : (/^https?:/.test(location.protocol) && window.fetch ? fetch('assets/manifest.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }) : Promise.resolve(null));
    return p.then(function (m) {
      if (!m) return;
      var jobs = [];
      Object.keys(m.cards || {}).forEach(function (id) { jobs.push(new Promise(function (res) { var img = new Image(); img.onload = function () { cardImages[id] = 'assets/' + m.cards[id]; res(); }; img.onerror = res; img.src = 'assets/' + m.cards[id]; })); });
      Object.keys(m.props || {}).forEach(function (id) { jobs.push(new Promise(function (res) { var img = new Image(); img.onload = function () { gameImages[id] = img; res(); }; img.onerror = res; img.src = 'assets/' + m.props[id].file; })); });
      return Promise.all(jobs);
    });
  }

  // ── DOM ────────────────────────────────────────────────────
  var A = null;   // EthicityAssets
  var BGM = null; // 배경음악(bgm.js) — 소리 버튼과 함께 켜고 끕니다
  var D = {};     // DOM 참조
  var player = load(STORE.player);
  var soundOn = load(STORE.sound) !== 0;
  var game = { stage: null, answers: { think1: null, think2: null }, records: {}, cond: null, seenWrong: null, progress: 0 };
  var R = null;   // 현재 하루 런타임
  var scene = { bg: 'nurse', actors: [], props: [], fx: [], tags: [], tick: null, draw: null };
  var now = 0, lastRaf = 0, timers = [];

  function after(sec, fn) { var t = { at: now + sec, fn: fn, dead: false }; timers.push(t); return t; }
  function cancel(t) { if (t) t.dead = true; }
  function runTimers() { if (!timers.length) return; var due = [], keep = []; timers.forEach(function (t) { if (t.dead) return; (now >= t.at ? due : keep).push(t); }); timers = keep; due.forEach(function (t) { if (!t.dead) t.fn(); }); }
  function clearTimers() { timers.forEach(function (t) { t.dead = true; }); timers = []; }

  function iconEl(id, size, cls) { var c = document.createElement('canvas'); c.width = c.height = size || 32; c.className = 'ee-icon' + (cls ? ' ' + cls : ''); c.setAttribute('aria-hidden', 'true'); try { A.drawIcon(c.getContext('2d'), id, 0, 0, c.width); } catch (e) { /* 아이콘 없음 */ } return c; }
  function faceEl(id, expr, cls) { var c = document.createElement('canvas'); c.width = c.height = 128; c.className = 'sf-face ee-pixel' + (cls ? ' ' + cls : ''); c.setAttribute('role', 'img'); c.setAttribute('aria-label', NAMES[id] + ' ' + ({ neutral: '', happy: '기쁜 표정', worried: '걱정하는 표정', explaining: '설명하는 표정' }[expr] || '')); try { A.drawPortrait(c.getContext('2d'), id, expr || 'neutral', 0, 0, 128); } catch (e) { /* */ } return c; }
  function button(label, cls, onClick, opts) { var b = el('<button type="button" class="ee-button' + (cls ? ' ' + cls : '') + '"></button>'); if (opts && opts.icon) { b.appendChild(iconEl(opts.icon, 32)); b.appendChild(document.createTextNode(' ')); } b.appendChild(document.createTextNode(label)); if (onClick) b.addEventListener('click', onClick); return b; }
  function sfx(id) { if (!A) return; A.playSound(id); }
  function setSound(on) { soundOn = !!on; A.setSound(soundOn); if (BGM) BGM.setEnabled(soundOn); save(STORE.sound, soundOn ? 1 : 0); if (D.sound) { D.sound.setAttribute('aria-pressed', String(soundOn)); D.sound.querySelector('span').textContent = soundOn ? '소리 켬' : '소리 끔'; } }
  function focusFirst(root) { var b = root && root.querySelector('button:not([disabled]),input'); if (b) { try { b.focus({ preventScroll: false }); } catch (e) { b.focus(); } } }

  function buildDom() {
    var app = $('#sf-app');
    app.innerHTML = '';
    var hud = el('<header class="sf-hud ee-panel" aria-label="진행 상황"></header>');
    hud.appendChild(el('<div class="sf-hud-title">닥터루미 창구<small id="sf-stage-label">윤리시티 · 안전성</small></div>'));
    var timer = el('<div class="sf-timer" aria-live="off"><div class="sf-bar" id="sf-bar"><i></i></div><span class="sf-sec" id="sf-sec">0:00</span></div>');
    timer.insertBefore(iconEl('timer', 32), timer.firstChild);
    hud.appendChild(timer);
    var stats = el('<ul class="sf-stats"></ul>');
    [['cared', 'heart', '돌본 아이'], ['acc', 'retry', '다시 살펴본 아이'], ['caught', 'notebook', '오류 신고'], ['queue', 'person', '줄']].forEach(function (s) { var li = el('<li class="ee-badge"><span>' + s[2] + '</span> <b id="sf-stat-' + s[0] + '">0</b></li>'); li.insertBefore(iconEl(s[1], 32), li.firstChild); stats.appendChild(li); });
    hud.appendChild(stats);
    D.sound = el('<button type="button" class="ee-button secondary" aria-pressed="' + soundOn + '" aria-label="효과음"><span>' + (soundOn ? '소리 켬' : '소리 끔') + '</span></button>');
    D.sound.insertBefore(iconEl('volume', 32), D.sound.firstChild);
    D.sound.addEventListener('click', function () { setSound(!soundOn); if (soundOn) sfx('tap'); });
    hud.appendChild(D.sound);
    app.appendChild(hud);

    D.stageWrap = el('<div class="sf-stage-wrap"><canvas class="sf-stage" id="sf-stage" width="1280" height="720" tabindex="0" role="img" aria-label="보건실 장면. 왼쪽 화살표 키는 보건쌤께, 오른쪽 화살표 키는 침대로 보내요."></canvas></div>');
    D.canvas = $('#sf-stage', D.stageWrap); D.ctx = D.canvas.getContext('2d'); D.ctx.imageSmoothingEnabled = false;
    D.titleCard = el('<div class="sf-title-card" hidden><b></b><span></span></div>'); D.stageWrap.appendChild(D.titleCard);
    D.stageNote = el('<div class="sf-stage-note" hidden></div>'); D.stageWrap.appendChild(D.stageNote);
    var cell = el('<div class="sf-stage-cell"></div>'); cell.appendChild(D.stageWrap); app.appendChild(cell); // 가로 태블릿에서 무대가 칸을 가득 채우는 기준(game.css)

    D.deck = el('<section class="sf-deck" id="sf-deck" aria-live="polite"></section>');
    app.appendChild(D.deck);
    D.screen = el('<div class="sf-screen" id="sf-screen" hidden role="dialog" aria-modal="true"></div>');
    app.appendChild(D.screen);
    D.live = el('<div class="sf-visually-hidden" aria-live="assertive" id="sf-live"></div>'); app.appendChild(D.live);
    bindInput();
  }
  function announce(t) { if (D.live) { D.live.textContent = ''; setTimeout(function () { D.live.textContent = t; }, 30); } }
  function hudStat(key, v) { var b = $('#sf-stat-' + key); if (b && b.textContent !== String(v)) b.textContent = String(v); }
  function hudTimer(left, total) { var bar = $('#sf-bar'), sec = $('#sf-sec'); if (!bar) return; var pc = total > 0 ? clamp(left / total * 100, 0, 100) : 0; bar.firstChild.style.width = pc + '%'; bar.classList.toggle('is-urgent', left <= 10 && left > 0 && total > 0); var s = Math.max(0, Math.ceil(left)); sec.textContent = Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function stageLabel(t) { var e = $('#sf-stage-label'); if (e) e.textContent = t; }
  function showTitleCard(title, sub, sec, done) { D.titleCard.hidden = false; $('b', D.titleCard).textContent = title; $('span', D.titleCard).textContent = sub || ''; announce(title + ' ' + (sub || '')); after(sec, function () { D.titleCard.hidden = true; if (done) done(); }); }
  function showScreen(panelNode) { D.screen.innerHTML = ''; var p = el('<div class="sf-panel ee-panel"></div>'); p.appendChild(panelNode); D.screen.appendChild(p); D.screen.hidden = false; D.screen.scrollTop = 0; focusFirst(p); }
  function hideScreen() { D.screen.hidden = true; D.screen.innerHTML = ''; }
  function setProgress(n) { if (n <= game.progress) return; game.progress = n; post({ type: 'ethicity:progress', current: n, total: TOTAL_STEPS }); }

  // ── 무대(캔버스) ────────────────────────────────────────────
  var G = {
    door: { x: 640, y: 700 }, window: { x: 640, y: 512 }, desk: { x: 640, y: 446 }, chair: { x: 600, y: 372 }, playerSpot: { x: 600, y: 372 },
    dock: { x: 748, y: 450 }, robot: { x: 748, y: 428 }, teacherSpot: { x: 330, y: 400 }, careSpot: { x: 400, y: 440 },
    bed: { x: 1010, y: 470 }, bedFront: { x: 1010, y: 500 }, bedSide: { x: 940, y: 510 }, guard: { x: 842, y: 440 },
    queue: function (i) { var k = Math.min(i, 7); return { x: 700 + 56 * k, y: 560 + 2 * k }; } // 줄은 바닥 안(x≤1092)에만: 오른쪽 긴 의자·벽 위로 올라가지 않게
  };
  function makeActor(id, x, y, opts) { var a = Object.assign({ id: id, x: x, y: y, dir: 'down', frame: 1, walking: false, path: null, speed: 170, scale: 0.8, alpha: 1, z: null, animT: 0, onArrive: null, faceAfter: null, dead: false, offset: 0, bob: 0 }, opts || {}); scene.actors.push(a); return a; }
  function removeActor(a) { a.dead = true; var i = scene.actors.indexOf(a); if (i >= 0) scene.actors.splice(i, 1); }
  function goTo(a, points, cb, faceAfter) {
    a.path = points.slice(); a.onArrive = cb || null; a.faceAfter = faceAfter || null; a.walking = true;
    if (reduceMotion) { var last = points[points.length - 1]; a.x = last.x; a.y = last.y; a.path = null; a.walking = false; a.frame = 1; if (faceAfter) a.dir = faceAfter; after(0.05, function () { if (!a.dead && cb) cb(a); }); }
  }
  function fadeOut(a, sec, cb) { a.fading = { t0: now, sec: reduceMotion ? 0.001 : (sec || 0.4), cb: cb }; }
  function updateActors(dt) {
    scene.actors.forEach(function (a) {
      if (a.fading) { var k = (now - a.fading.t0) / a.fading.sec; a.alpha = clamp(1 - k, 0, 1); if (k >= 1) { var cb = a.fading.cb; a.fading = null; removeActor(a); if (cb) cb(a); } return; }
      if (a.walking && a.path && a.path.length) {
        var p = a.path[0], dx = p.x - a.x, dy = p.y - a.y, dist = Math.hypot(dx, dy), step = a.speed * dt;
        if (Math.abs(dx) > Math.abs(dy)) a.dir = dx < 0 ? 'left' : 'right'; else if (dist > 0.5) a.dir = dy < 0 ? 'up' : 'down';
        if (dist <= step) { a.x = p.x; a.y = p.y; a.path.shift(); if (!a.path.length) { a.walking = false; a.frame = 1; a.path = null; if (a.faceAfter) a.dir = a.faceAfter; var f = a.onArrive; a.onArrive = null; if (f) f(a); } }
        else { a.x += dx / dist * step; a.y += dy / dist * step; }
        a.animT += dt; a.frame = Math.floor(a.animT * 6) % 4;
      } else { a.frame = 1; a.animT = 0; }
    });
    scene.fx = scene.fx.filter(function (f) { return now - f.t0 < 0.8; });
  }
  function addFx(id, x, y, size) { scene.fx.push({ id: id, x: x, y: y, t0: now, size: size || 96 }); }
  function render() {
    var ctx = D.ctx; ctx.imageSmoothingEnabled = false;
    try { A.drawBackground(ctx, scene.bg, W, H); } catch (e) { ctx.fillStyle = PAL.paper; ctx.fillRect(0, 0, W, H); }
    var items = [];
    scene.props.forEach(function (p) { items.push({ z: p.z != null ? p.z : p.y, draw: function () { if (p.game) { var im = gameImages[p.id]; if (im) ctx.drawImage(im, p.x - p.h / 2, p.y - p.h, p.h, p.h); } else A.drawProp(ctx, p.id, p.x, p.y, p.h); } }); });
    scene.actors.forEach(function (a) { if (a.alpha <= 0) return; items.push({ z: a.z != null ? a.z : a.y, draw: function () { ctx.globalAlpha = a.alpha; A.drawCharacter(ctx, a.id, Math.round(a.x + a.offset), Math.round(a.y - a.bob), a.dir, a.frame, a.scale); ctx.globalAlpha = 1; } }); });
    items.sort(function (p, q) { return p.z - q.z; }).forEach(function (it) { it.draw(); });
    scene.fx.forEach(function (f) { A.drawEffect(ctx, f.id, f.x, f.y, (now - f.t0) * 1000, f.size, reduceMotion); });
    if (scene.draw) scene.draw(ctx);
  }
  function drawTag(ctx, text, x, y) { ctx.font = '700 18px Ethicity, "Malgun Gothic", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; var w = ctx.measureText(text).width + 16; ctx.fillStyle = PAL.ink; ctx.fillRect(Math.round(x - w / 2) - 2, y - 14, Math.round(w) + 4, 28); ctx.fillStyle = PAL.cream; ctx.fillRect(Math.round(x - w / 2), y - 12, Math.round(w), 24); ctx.fillStyle = PAL.ink; ctx.fillText(text, x, y + 1); }
  function drawBar(ctx, x, y, w, h, pct, color) { ctx.fillStyle = PAL.ink; ctx.fillRect(x - 2, y - 2, w + 4, h + 4); ctx.fillStyle = PAL.cream; ctx.fillRect(x, y, w, h); ctx.fillStyle = color; ctx.fillRect(x, y, Math.round(w * clamp(pct, 0, 1)), h); }

  function frame(ts) {
    requestAnimationFrame(frame);
    var real = Math.min(0.05, (ts - lastRaf) / 1000 || 0); lastRaf = ts;
    var dt = real * SPEED; now += dt;
    runTimers(); updateActors(dt); if (scene.tick) scene.tick(dt); render();
  }

  // 보건실 기본 장면: 소품(desk·chair·bed·robot_dock)과 상주 인물(플레이어·보건쌤·닥터루미)
  var playerActor = null, teacherActor = null, robotActor = null;
  function setupNurse(opts) {
    opts = opts || {}; scene.bg = 'nurse'; scene.actors = []; scene.fx = []; scene.tick = null; scene.draw = null;
    scene.props = [
      { id: 'chair', x: G.chair.x, y: G.chair.y + 6, h: 80, z: G.chair.y - 2 },
      { id: 'desk', x: G.desk.x, y: G.desk.y, h: 120 },
      { id: 'robot_dock', x: G.dock.x, y: G.dock.y, h: 76, z: G.dock.y },
      { id: 'bed', x: G.bed.x, y: G.bed.y, h: 130 },
      { id: 'sf_guard_off', game: true, x: G.guard.x, y: G.guard.y, h: 72, z: G.guard.y }
    ];
    if (opts.guardOn) setGuard(true);
    var pid = player ? player.character : 'jiho';
    playerActor = makeActor(pid, opts.playerAtDoor ? G.door.x : G.playerSpot.x, opts.playerAtDoor ? G.door.y : G.playerSpot.y, { dir: opts.playerAtDoor ? 'up' : 'down', scale: 0.8 });
    teacherActor = makeActor('teacher', G.teacherSpot.x, G.teacherSpot.y, { dir: 'right', scale: 0.9 });
    robotActor = makeActor('robot', G.robot.x, G.robot.y, { dir: 'down', scale: 0.65, z: G.dock.y + 1 });
  }
  function setGuard(on) { scene.props.forEach(function (p) { if (p.game) p.id = on ? 'sf_guard_on' : 'sf_guard_off'; }); }
  function robotBob(dt) { if (reduceMotion || !robotActor) return; robotActor.bob = Math.round(Math.sin(now * 2.2) * 2); }

  // ── 입력: 키보드·드래그·스와이프 ────────────────────────────
  var drag = null;
  function bindInput() {
    document.addEventListener('keydown', function (e) {
      var tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { if (R && R.running) { e.preventDefault(); act(e.key === 'ArrowLeft' ? 'left' : 'right', 'key'); } }
      else if (e.key >= '1' && e.key <= '3') { if (R && R.window) { e.preventDefault(); tapCard(+e.key - 1, 'key'); } }
    });
    D.stageWrap.addEventListener('pointerdown', function (e) { if (!R || !R.running) return; if (e.target && e.target.closest && e.target.closest('button')) return; drag = { x0: e.clientX, dx: 0, id: e.pointerId }; try { D.stageWrap.setPointerCapture(e.pointerId); } catch (err) { /* */ } });
    D.stageWrap.addEventListener('pointermove', function (e) { if (!drag || drag.id !== e.pointerId) return; drag.dx = e.clientX - drag.x0; var kid = R && R.window; if (kid && kid.state === 'window' && !reduceMotion) kid.actor.offset = clamp(drag.dx * (W / D.stageWrap.clientWidth), -70, 70); });
    function endDrag(e) { if (!drag || drag.id !== e.pointerId) return; var dx = drag.dx; drag = null; var kid = R && R.window; if (kid && kid.state === 'window') kid.actor.offset = 0; if (Math.abs(dx) >= 40) act(dx < 0 ? 'left' : 'right', 'swipe'); }
    D.stageWrap.addEventListener('pointerup', endDrag); D.stageWrap.addEventListener('pointercancel', endDrag);
  }

  // ── 창구 데크 ──────────────────────────────────────────────
  function deckClear() { D.deck.innerHTML = ''; D.deck.classList.remove('is-window'); $('#sf-app').classList.remove('is-window'); if (D.actions && D.actions.parentNode) D.actions.parentNode.removeChild(D.actions); D.actions = null; D.btnL = null; D.btnR = null; }
  function deckSay(id, expr, speakerHtml, lineHtml, subHtml) {
    var say = el('<div class="sf-say"></div>');
    say.appendChild(faceEl(id, expr));
    var sp = el('<div class="ee-speech"><p class="ee-speaker">' + speakerHtml + '</p><p class="sf-line">' + lineHtml + '</p>' + (subHtml ? '<p class="sf-sub">' + subHtml + '</p>' : '') + '</div>');
    say.appendChild(sp);
    D.deck.appendChild(say); return say;
  }
  // 가로 화면이면 「보건쌤께·침대로」 버튼을 무대 안(아래 가운데)에, 아니면 데크 맨 아래에 둔다.
  var LANDSCAPE = window.matchMedia ? window.matchMedia('(min-width:860px) and (orientation:landscape)') : { matches: false };
  function placeActions() {
    if (!D.actions) return; var onStage = !!LANDSCAPE.matches, target = onStage ? D.stageWrap : D.deck;
    if (D.actions.parentNode !== target) target.appendChild(D.actions);
    D.actions.classList.toggle('is-on-stage', onStage);
  }
  if (LANDSCAPE.addEventListener) LANDSCAPE.addEventListener('change', placeActions); else if (LANDSCAPE.addListener) LANDSCAPE.addListener(placeActions);
  function buildWindowDeck() {
    deckClear(); D.deck.classList.add('is-window'); $('#sf-app').classList.add('is-window');
    // 왼쪽(무대 아래): 아이 말 → 닥터루미 답 → 피드백·안내 / 오른쪽: 증거 카드 선반 / 버튼은 placeActions()
    var main = el('<div class="sf-deck-main"></div>'), side = el('<div class="sf-deck-side"></div>');
    D.kidline = el('<div class="ee-notice sf-kidline" hidden><span class="sf-kidtext"></span></div>'); main.appendChild(D.kidline);
    D.say = el('<div class="sf-say" hidden></div>'); main.appendChild(D.say);
    D.feedback = el('<div class="sf-feedback ee-success" hidden></div>'); main.appendChild(D.feedback);
    D.tip = el('<div class="ee-notice sf-tip" hidden></div>'); main.appendChild(D.tip);
    side.appendChild(el('<p class="sf-tray-title">책상 위 증거 카드<small>탭해서 확인 · 1~3 키</small></p>'));
    D.tray = el('<div class="sf-tray" role="group" aria-label="책상 위 증거 카드 (숫자 키 1~3으로도 탭할 수 있어요)"></div>'); side.appendChild(D.tray);
    D.deck.appendChild(main); D.deck.appendChild(side);
    D.tray.addEventListener('click', function (e) { var c = e.target.closest('.sf-card'); if (!c) return; tapCard(+c.dataset.i, 'tap'); });
    D.actions = el('<div class="sf-actions"></div>');
    D.btnL = el('<button type="button" class="ee-button secondary is-left" aria-keyshortcuts="ArrowLeft"><span class="sf-btn-main">보건쌤께</span><small>닥터루미가 틀렸어요 · ← 키</small></button>');
    D.btnL.querySelector('.sf-btn-main').insertBefore(iconEl('arrow_left', 32), D.btnL.querySelector('.sf-btn-main').firstChild);
    D.btnR = el('<button type="button" class="ee-button is-right" aria-keyshortcuts="ArrowRight"><span class="sf-btn-main">침대로</span><small>닥터루미가 맞아요 · → 키</small></button>');
    D.btnR.querySelector('.sf-btn-main').appendChild(iconEl('arrow_right', 32));
    D.btnL.addEventListener('click', function () { act('left', 'button'); }); D.btnR.addEventListener('click', function () { act('right', 'button'); });
    D.actions.appendChild(D.btnL); D.actions.appendChild(D.btnR);
    placeActions();
    setControls(false);
  }
  function setControls(on) { if (!D.btnL) return; D.btnL.disabled = !on; D.btnR.disabled = !on; if (!on) setLock(false); }
  function setLock(locked, keyKind) {
    if (!D.btnR) return;
    D.btnR.classList.toggle('is-locked', locked); D.btnR.setAttribute('aria-disabled', locked ? 'true' : 'false');
    var main = D.btnR.querySelector('.sf-btn-main'), small = D.btnR.querySelector('small');
    main.innerHTML = ''; if (locked) main.appendChild(iconEl('lock', 32)); main.appendChild(document.createTextNode(locked ? '잠김' : '침대로')); if (!locked) main.appendChild(iconEl('arrow_right', 32));
    small.textContent = locked ? (CARD_LABEL[keyKind] || '핵심') + ' 카드를 탭해요' : '닥터루미가 맞아요 · → 키';
  }
  function showTip(html, iconId, sec) { if (!D.tip) return; D.tip.innerHTML = ''; if (iconId) D.tip.appendChild(iconEl(iconId, 32)); D.tip.appendChild(el('<span>' + html + '</span>')); D.tip.hidden = false; cancel(D.tipT); if (sec) D.tipT = after(sec, hideTip); }
  function hideTip() { if (D.tip) D.tip.hidden = true; }
  function showFeedback(kind, html, face) {
    if (!D.feedback) return; D.feedback.className = 'sf-feedback ' + (kind === 'ok' ? 'ee-success' : 'ee-notice'); D.feedback.innerHTML = '';
    if (face) D.feedback.appendChild(faceEl(face.id, face.expr));
    D.feedback.appendChild(iconEl(kind === 'ok' ? 'check' : 'retry', 32)); D.feedback.appendChild(el('<span>' + html + '</span>')); D.feedback.hidden = false;
    cancel(D.fbT); D.fbT = after(1.6, function () { D.feedback.hidden = true; });
  }
  function hintButton(dir, on) { var b = dir === 'left' ? D.btnL : D.btnR; if (!b) return; b.classList.toggle('is-hint', !!on); }

  function cardHtml(card, i, kid, cfg) {
    var hidden = kid.c.hidden === i && !kid.flipped[i], unseen = cfg.unseen && kid.c.unseen === i;
    var img = cardImages[hidden ? 'sf_card_back' : card.img] || cardImages.sf_card_back;
    var label = hidden ? '?' : CARD_LABEL[card.kind], val = hidden ? '탭해서 봐요' : card.text;
    var aria = hidden ? '뒤집힌 카드 ' + (i + 1) + ' — 탭해서 확인해요' : CARD_LABEL[card.kind] + ' 카드: ' + card.text + (unseen ? ' (닥터루미가 못 본 카드)' : cfg.unseen ? ' (닥터루미가 본 카드)' : '');
    var b = el('<button type="button" class="sf-card' + (hidden ? ' is-hidden' : '') + (unseen ? ' is-unseen' : '') + '" data-i="' + i + '" aria-pressed="' + (kid.tapped[i] ? 'true' : 'false') + '" aria-label="' + esc(aria) + '"><span class="sf-card-pic"><img class="sf-card-img" alt="" src="' + img + '">' + (!hidden && card.kind === 'temp' ? '<span class="sf-card-num" aria-hidden="true">' + esc(card.text) + '</span>' : '') + '</span><span class="sf-card-label">' + esc(label) + '</span><span class="sf-card-value' + (!hidden && card.danger ? ' is-danger' : '') + '">' + esc(val) + '</span></button>');
    if (cfg.unseen) { var eye = el('<span class="sf-card-eye" aria-hidden="true"><span>' + (unseen ? '못 봄' : '봄') + '</span></span>'); eye.insertBefore(iconEl(unseen ? 'warning' : 'inspect', 32), eye.firstChild); b.appendChild(eye); }
    return b;
  }
  function renderTray(kid) {
    if (!D.tray) return; D.tray.innerHTML = ''; if (!kid) return;
    kid.c.cards.forEach(function (card, i) { D.tray.appendChild(cardHtml(card, i, kid, R.cfg)); });
    updateKeyHint(kid);
  }
  function updateKeyHint(kid) {
    if (!D.tray) return; var ki = keyIndex(kid.c), locked = isLocked(kid);
    $$('.sf-card', D.tray).forEach(function (c, i) { c.classList.toggle('is-key-hint', locked && i === ki); });
  }
  function showKidLine(kid) { D.kidline.innerHTML = ''; D.kidline.appendChild(faceEl(kid.c.kid, kid.c.danger && !kid.c.trap ? 'worried' : 'neutral')); D.kidline.appendChild(el('<span class="sf-kidtext"><b>' + esc(NAMES[kid.c.kid]) + '</b>: ' + esc(kid.c.say) + '</span>')); D.kidline.hidden = false; }
  function showRobotSay(kid) {
    var ai = kid.c.ai, cfg = R.cfg; D.say.innerHTML = '';
    D.say.appendChild(faceEl('robot', 'explaining'));
    var speaker = el('<p class="ee-speaker">닥터루미 <span class="ee-badge">자신감 ' + ai.conf + '%</span></p>');
    speaker.insertBefore(iconEl('robot', 32), speaker.firstChild);
    var sp = el('<div class="ee-speech"></div>'); sp.appendChild(speaker);
    if (ai.human) {
      var ln = el('<p class="sf-line is-human"><span>사람이 확인해 주세요.</span></p>'); ln.insertBefore(iconEl('person', 32), ln.firstChild); sp.appendChild(ln);
      sp.appendChild(el('<p class="sf-sub">내 생각은 "' + esc(ai.line) + '"인데, ' + (ai.conf < 80 ? '자신감이 80%보다 낮아요.' : '위험할 수 있는 증상이에요.') + (cfg.unseen && kid.c.unseen >= 0 ? ' ' + CARD_LABEL[kid.c.cards[kid.c.unseen].kind] + ' 카드는 못 봤어요.' : '') + '</p>'));
    } else {
      sp.appendChild(el('<p class="sf-line">' + esc(ai.line) + '</p>'));
      if (cfg.safety && cfg.unseen && kid.c.unseen >= 0) sp.appendChild(el('<p class="sf-sub">' + CARD_LABEL[kid.c.cards[kid.c.unseen].kind] + ' 카드는 못 봤어요.</p>'));
    }
    D.say.appendChild(sp); D.say.hidden = false;
    announce('닥터루미: ' + (ai.human ? '사람이 확인해 주세요. ' : '') + ai.line + ' 자신감 ' + ai.conf + '%');
  }
  function hideWindowDeck() { if (D.say) D.say.hidden = true; if (D.kidline) D.kidline.hidden = true; renderTray(null); setLock(false); hintButton('left', false); hintButton('right', false); }

  // ── 하루 런타임 ─────────────────────────────────────────────
  function newDay(stageId) {
    var cfg = DAYS[stageId];
    var pool = KID_IDS.filter(function (k) { return !player || k !== player.character; });
    var cases = genCases(SEED + cfg.day * 7919, 80, cfg, pool).map(function (c) { return withAI(c, game.cond, cfg); });
    cases = ensureWrong(cases, cfg);
    R = { id: stageId, cfg: cfg, cases: cases, idx: 0, t: 0, spawnT: cfg.interval[0], running: false, ended: false, kids: [], queue: [], window: null, holdUntil: 0, extra: 0,
      cared: 0, acc: 0, caught: 0, busy: 0, timeouts: 0, maxQueue: 0, waitSum: 0, waitN: 0, tut: { step: 0, pause: false, done: {} }, lockHands: 0 };
  }
  function tick(dt) {
    robotBob(dt);
    if (!R || !R.running) return;
    var cfg = R.cfg; R.t += dt;
    var left = cfg.seconds - R.t; hudTimer(left, cfg.seconds);
    var k = clamp(R.t / cfg.seconds, 0, 1), interval = cfg.interval[0] + (cfg.interval[1] - cfg.interval[0]) * k;
    if (R.t < cfg.seconds) {
      R.spawnT += dt;
      while ((R.spawnT >= interval || R.extra > 0) && R.idx < R.cases.length && R.queue.length < QUEUE_MAX) { if (R.extra > 0) R.extra--; else R.spawnT -= interval; spawn(); }
      if (R.spawnT > interval) R.spawnT = interval;
    }
    if (!R.window && R.queue.length && now >= R.holdUntil) {
      var kid = R.queue.shift(); R.window = kid; kid.state = 'toWindow'; kid.dispatchT = now; kid.actor.speed = 200;
      R.waitSum += now - kid.spawnT; R.waitN++;
      goTo(kid.actor, [G.window], function () { present(kid); }, 'up'); reslot();
    }
    var w = R.window;
    if (w && w.state === 'toWindow' && !w.actor.walking && now - w.dispatchT > 2.5) { w.actor.x = G.window.x; w.actor.y = G.window.y; present(w); }
    if (w && w.state === 'window' && !R.tut.pause && w.presented) {
      w.patience -= dt;
      if (w.patience <= 0) { R.timeouts++; showTip('시간이 다 됐어요 · 닥터루미 답대로 갔어요', 'timer', 2); resolve(w, 'right', { auto: true }); }
    }
    hudStat('queue', R.queue.length); R.maxQueue = Math.max(R.maxQueue, R.queue.length);
    if (R.t >= cfg.seconds && !R.window && !R.ended) endDay();
  }
  function drawWindowOverlay(ctx) {
    var w = R && R.window; if (!w || w.state !== 'window' || !w.presented) return;
    var x = w.actor.x + w.actor.offset, top = w.actor.y - 120 * w.actor.scale;
    drawTag(ctx, NAMES[w.c.kid], x, top - 34);
    if (!R.tut.pause) drawBar(ctx, x - 36, top - 16, 72, 8, w.patience / R.cfg.patience, w.patience <= 3 ? PAL.red : PAL.gold);
    if (R.hint) { var ic = R.hint === 'left' ? 'arrow_left' : 'arrow_right', hx = R.hint === 'left' ? x - 90 : x + 58, bob = reduceMotion ? 0 : Math.round(Math.sin(now * 6) * 5); A.drawIcon(ctx, ic, hx + (R.hint === 'left' ? -bob : bob), w.actor.y - 70, 40); }
  }
  function spawn() {
    var c = R.cases[R.idx++]; if (!c) return;
    var kid = { c: c, actor: makeActor(c.kid, G.door.x, G.door.y, { dir: 'up', scale: 0.8, speed: 170 }), state: 'queue', slot: -1, flipped: [false, false, false], tapped: [false, false, false], patience: R.cfg.patience, spawnT: now, presented: false };
    R.kids.push(kid); R.queue.push(kid); reslot();
    if (R.queue.length === 1 && R.kids.length === 1) sfx('door');
  }
  function reslot() { R.queue.forEach(function (kid, i) { if (kid.slot === i) return; var fresh = kid.slot < 0; kid.slot = i; var p = G.queue(i); kid.actor.speed = 170; goTo(kid.actor, fresh ? [{ x: 640, y: 600 }, p] : [p], null, 'left'); }); } // 문에서 먼저 위로 올라온 뒤 줄로(아래 낮은 벽 위를 걷지 않게)
  function present(kid) {
    if (!R || !R.running || R.window !== kid) return;
    kid.state = 'window'; kid.actor.dir = 'up'; kid.patience = R.cfg.patience; kid.presented = true; R.n = (R.n || 0) + 1;
    showKidLine(kid); renderTray(kid); setControls(true); setLock(isLocked(kid), kid.c.key); updateKeyHint(kid); sfx('tap');
    kid.showT = after(0.3, function () { kid.showT = null; if (R && R.window === kid && kid.state === 'window') showRobotSay(kid); });
    if (kid.c.ai.wrong && R.cfg.day === 1 && (!game.seenWrong || kid.c.ai.conf > game.seenWrong.conf)) game.seenWrong = { name: NAMES[kid.c.kid], conf: kid.c.ai.conf };
    if (R.cfg.tutorial) tutorialFor(kid);
    else if (R.cfg.safety && kid.c.ai.human && R.lockHands < 2) { R.lockHands++; showTip('침대 버튼이 잠겼어요. ' + CARD_LABEL[kid.c.key] + ' 카드를 탭해서 직접 확인해요.', 'lock', 5); }
    else if (R.cfg.unseen && !R.cfg.safety && kid.c.unseen >= 0 && !R.unseenHinted) { R.unseenHinted = true; showTip('느낌표가 붙은 카드는 닥터루미가 못 본 카드예요. 거기에 답이 있을 수도 있어요.', 'warning', 6); }
  }
  // 1일차 손가락 교습을 아이콘·안내문으로: 첫 3명은 시간이 멈춘다
  function tutorialFor(kid) {
    var i = kid.c.i;
    if (i === 0) { R.tut.pause = true; R.hint = 'right'; hintButton('right', true); showTip('① 닥터루미 답을 봐요 ② 책상 위 카드와 비교해요 ③ 맞으면 <b>침대로</b> 밀어요 (→ 키·스와이프·버튼)', 'robot'); }
    else if (i === 1) { R.tut.pause = true; R.hint = 'left'; hintButton('left', true); showTip('체온 카드를 봐요. 38.3°인데 "괜찮아요"? 틀렸어요! 틀리면 <b>보건쌤께</b> 밀어요 (← 키)', 'inspect'); }
    else if (i === 2) { R.tut.pause = true; showTip('뒤집힌 카드는 탭해서 봐요. 숨은 카드에 답이 있을 때가 있어요.', 'clue'); }
    else if (i === 3) { showTip('이제 시간이 흘러요. 안 밀면 닥터루미 답대로 가요!', 'timer', 4); }
  }
  function isLocked(kid) { return !!(R && R.cfg.safety && kid.c.ai.human && !kid.tapped[keyIndex(kid.c)]); }
  function tapCard(i, src) {
    var kid = R && R.window; if (!kid || kid.state !== 'window') return false; var card = kid.c.cards[i]; if (!card) return false;
    var btn = $$('.sf-card', D.tray)[i], wasLocked = isLocked(kid);
    kid.tapped[i] = true; sfx('tap');
    if (kid.c.hidden === i && !kid.flipped[i]) { kid.flipped[i] = true; if (btn && !reduceMotion) { btn.classList.add('is-flipping'); setTimeout(function () { renderTray(kid); }, 180); } else renderTray(kid); if (R.tut.pause && kid.c.i === 2) { R.tut.pause = false; hideTip(); } }
    else if (btn) btn.setAttribute('aria-pressed', 'true');
    if (wasLocked && !isLocked(kid)) { setLock(false); updateKeyHint(kid); addFx('unlock', G.window.x, G.window.y - 110, 96); sfx('collect'); showTip('확인했어요! 이제 네가 정해요. 맞으면 침대로, 틀렸으면 보건쌤께.', 'check', 3); }
    return true;
  }
  // 동작 하나: 왼쪽(보건쌤께) / 오른쪽(침대로)
  function act(dir, src) {
    if (!R || !R.running) return false; var kid = R.window; if (!kid || kid.state !== 'window' || !kid.presented) return false;
    if (dir === 'right' && isLocked(kid)) { sfx('tap'); showTip('아직 잠겨 있어요. ' + CARD_LABEL[kid.c.key] + ' 카드를 먼저 탭해요.', 'lock', 3); updateKeyHint(kid); return false; }
    if (R.tut.pause && ((kid.c.i === 0 && dir !== 'right') || (kid.c.i === 1 && dir !== 'left'))) { sfx('tap'); showTip(kid.c.i === 0 ? '이번엔 닥터루미가 맞았어요. 침대로(→) 밀어요.' : '카드와 다르면 틀린 거예요. 보건쌤께(←) 밀어요.', 'help'); return false; }
    resolve(kid, dir, { src: src }); return true;
  }
  function resolve(kid, dir, o) {
    o = o || {}; if (kid.state !== 'window') return;
    kid.state = 'leaving'; R.window = null; R.tut.pause = false; R.hint = null; cancel(kid.showT); kid.actor.offset = 0;
    hintButton('left', false); hintButton('right', false); hideTip(); hideWindowDeck(); setControls(false);
    var c = kid.c, aiRight = !c.ai.wrong, ok = (dir === 'right') === aiRight;
    R.cared++; hudStat('cared', R.cared);
    if (ok && dir === 'right') { addFx('correct', G.window.x, G.window.y - 110, 96); sfx('collect'); showFeedback('ok', '맞아요! ' + esc(NAMES[c.kid]) + '가 침대로 갔어요.'); R.holdUntil = now + 0.5; sendRight(kid, false); }
    else if (ok && dir === 'left') { R.caught++; hudStat('caught', R.caught); addFx('correct', G.window.x, G.window.y - 110, 96); sfx('collect'); showFeedback('ok', '잘 잡았어요! 닥터루미가 틀렸어요 → 오류 신고 +1' + (c.boss ? ' · 급식 카드를 못 본 97%였어요' : '')); R.holdUntil = now + 0.6; sendLeft(kid, true); }
    else if (!ok && dir === 'left') { R.busy++; R.extra++; sfx('miss'); showFeedback('retry', '닥터루미가 맞았어요. 보건쌤이 다시 보느라 줄이 하나 길어졌어요.'); R.holdUntil = now + 1.0; sendLeft(kid, false); }
    else { R.acc++; hudStat('acc', R.acc); sfx('miss'); showFeedback('retry', esc(NAMES[c.kid]) + '가 더 아파졌어요. 다시 살펴봐야 했어요. (' + esc(c.line) + ')', { id: c.kid, expr: 'worried' }); R.holdUntil = now + 1.6; sendRight(kid, true); }
    announce(ok ? '맞아요' : '다시 살펴봐야 했어요');
  }
  function sendRight(kid, accident) {
    var a = kid.actor; a.speed = 190;
    goTo(a, [{ x: 760, y: 540 }, G.bedFront], function () {
      a.dir = 'up';
      if (accident) { addFx('retry', a.x, a.y - 100, 96); sfx('retry'); teacherCare(a, function () { fadeOut(a, 0.5); }); }
      else fadeOut(a, 0.5);
    }, 'up');
  }
  function sendLeft(kid, caught) {
    var a = kid.actor; a.speed = 190;
    goTo(a, [{ x: 520, y: 540 }, G.careSpot], function () { a.dir = 'left'; teacherActor.dir = 'right'; if (caught) addFx('clue', G.teacherSpot.x, G.teacherSpot.y - 110, 80); after(0.5, function () { fadeOut(a, 0.5); }); }, 'left');
  }
  function teacherCare(kidActor, done) {
    var home = { x: G.teacherSpot.x, y: G.teacherSpot.y }; teacherActor.speed = 260;
    goTo(teacherActor, [{ x: 520, y: 540 }, G.bedSide], function () { teacherActor.dir = 'right'; after(0.8, function () { done(); goTo(teacherActor, [{ x: 520, y: 540 }, home], null, 'right'); }); }, 'right');
  }
  function endDay() {
    R.ended = true; R.running = false; setControls(false); hideTip(); hudTimer(0, 1);
    R.queue.forEach(function (kid) { var a = kid.actor; kid.state = 'gone'; goTo(a, [{ x: a.x, y: 600 }, { x: 640, y: 600 }, G.door], function () { fadeOut(a, 0.3); }, 'down'); });
    R.queue = []; hudStat('queue', 0);
    setProgress(R.cfg.day * 2);
    game.records[R.id] = { day: R.cfg.day, cared: R.cared, acc: R.acc, caught: R.caught, busy: R.busy, timeouts: R.timeouts, maxQueue: R.maxQueue, avgWait: R.waitN ? R.waitSum / R.waitN : 0 };
    sfx('paper'); showTip(R.cfg.day + '일차 끝! 돌본 아이 ' + R.cared + ' · 다시 살펴본 아이 ' + R.acc + ' · 오류 신고 ' + R.caught, 'check');
    after(1.2, function () { flow.next(); });
  }

  // ── 흐름 ──────────────────────────────────────────────────
  var STAGES = ['start', 'walk', 'intro', 'day1', 'think1', 'day2', 'think2', 'day3', 'report', 'complete'];
  var flow = {
    i: -1, cleanup: null,
    go: function (id) { var i = STAGES.indexOf(id); if (i < 0) return; if (flow.cleanup) { try { flow.cleanup(); } catch (e) { /* */ } flow.cleanup = null; } clearTimers(); R = null; game.stage = id; flow.i = i; hideScreen(); D.titleCard.hidden = true; D.stageNote.hidden = true; D.stageNote.innerHTML = ''; flow.cleanup = STAGE_RUN[id]() || null; },
    next: function () { flow.go(STAGES[flow.i + 1]); }
  };
  var STAGE_RUN = {
    start: startStage, walk: walkStage, intro: introStage,
    day1: function () { return dayStage('day1'); }, day2: function () { return dayStage('day2'); }, day3: function () { return dayStage('day3'); },
    think1: function () { return thinkStage('think1'); }, think2: function () { return thinkStage('think2'); },
    report: reportStage, complete: completeStage
  };

  function startStage() {
    setupNurse(); stageLabel('윤리시티 · 안전성'); hudTimer(0, 0); ['cared', 'acc', 'caught', 'queue'].forEach(function (k) { hudStat(k, 0); });
    deckClear();
    var chosen = player ? player.character : 'jiho', nick = player ? player.nick : '';
    var p = el('<div><span class="sf-kicker">윤리시티 · 안전성</span><h1 class="sf-h1">닥터루미 창구</h1><p class="sf-p">보건실 창구를 맡았어요. AI 닥터루미가 먼저 답하면, 책상 위 증거 카드와 비교해서 맞으면 침대로, 틀렸으면 보건쌤께 보내요.</p></div>');
    var pickWrap = el('<div><p class="sf-h2" id="sf-pick-label">캐릭터를 골라요</p></div>'); var pk = el('<div class="sf-pick" role="group" aria-labelledby="sf-pick-label"></div>');
    ['jiho', 'haneul'].forEach(function (id) { var b = el('<button type="button" class="ee-choice" data-id="' + id + '" aria-pressed="' + (chosen === id) + '"><span>' + NAMES[id] + '</span></button>'); b.insertBefore(faceEl(id, 'happy'), b.firstChild); b.addEventListener('click', function () { chosen = id; $$('.ee-choice', pk).forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.id === id)); }); sfx('tap'); }); pk.appendChild(b); });
    pickWrap.appendChild(pk); p.appendChild(pickWrap);
    var field = el('<div class="sf-field"><label for="sf-nick">닉네임 (한글 1~5자)</label><input class="sf-input" id="sf-nick" type="text" maxlength="5" autocomplete="off" inputmode="text" placeholder="예: 탐험가"><span class="sf-sub" id="sf-nick-help">실제 이름 대신 별명을 써요. 이 기기에만 저장돼요.</span></div>');
    var input = $('input', field); input.value = nick; p.appendChild(field);
    var err = el('<p class="ee-notice" role="alert" hidden>한글 1~5자로 적어 주세요.</p>'); p.appendChild(err);
    var prev = load(STORE.result); if (prev && prev.completed) p.appendChild(el('<p class="sf-sub">지난 기록: 엔딩 ' + esc(prev.ending) + ' · ' + esc(ENDINGS[prev.ending] || '') + '</p>'));
    var row = el('<div class="sf-row is-end"></div>');
    row.appendChild(button('입장', '', function () {
      var v = input.value.trim(); if (!/^[가-힣]{1,5}$/.test(v)) { err.hidden = false; input.focus(); return; }
      player = { character: chosen, nick: v }; save(STORE.player, player); setSound(soundOn); sfx('door'); flow.next();
    }));
    p.appendChild(row);
    showScreen(p);
    setTimeout(function () { var ch = $('.ee-choice', pk); if (ch) ch.focus(); }, 0);
  }
  // 마당에서 보건실 문으로 걸어 들어오는 짧은 장면(건너뛰기 가능)
  function walkStage() {
    stageLabel('보건실로 가는 길'); deckClear();
    scene.bg = 'courtyard'; scene.actors = []; scene.props = []; scene.fx = []; scene.tick = null; scene.draw = null;
    var pid = player.character, a = makeActor(pid, 640, 700, { dir: 'up', scale: 0.85, speed: 220 });
    var done = false, skipBtn;
    function finish() { if (done) return; done = true; flow.next(); }
    var note = el('<div class="ee-notice sf-tip"><span>' + esc(player.nick) + '(' + NAMES[pid] + ')가 보건실로 가요…</span></div>'); note.insertBefore(iconEl('map', 32), note.firstChild); D.deck.appendChild(note);
    skipBtn = button('건너뛰기', 'secondary', function () { sfx('tap'); finish(); }); var row = el('<div class="sf-row is-end"></div>'); row.appendChild(skipBtn); D.deck.appendChild(row); skipBtn.focus();
    goTo(a, [{ x: 640, y: 410 }, { x: 330, y: 410 }], function () { sfx('door'); fadeOut(a, 0.3, function () {
      setupNurse({ playerAtDoor: true }); scene.bg = 'nurse';
      playerActor.speed = 240; goTo(playerActor, [{ x: 640, y: 560 }, { x: 540, y: 470 }, { x: 560, y: 372 }, G.playerSpot], function () { playerActor.dir = 'down'; after(0.3, finish); }, 'down');
    }); }, 'left');
    return function () { done = true; };
  }
  function introStage() {
    if (!scene.actors.length || scene.bg !== 'nurse') setupNurse();
    stageLabel('보건쌤 소개'); deckClear(); setProgress(0);
    var lines = [
      ['explaining', esc(player.nick) + ', 오늘 보건실 창구를 맡아 줘서 고마워요. 아이들이 책상 앞으로 오면 네가 정해요.'],
      ['explaining', '책상 옆 로봇은 <b>닥터루미</b>예요. 아이를 보고 먼저 답을 말해요. 자신감 %도 같이요. 그런데 가끔 틀려요.'],
      ['neutral', '책상 위 <b>증거 카드</b>(체온·피부·스티커·급식·코·목)와 닥터루미 말을 비교해요. 뒤집힌 카드는 탭해서 봐요.'],
      ['happy', '맞으면 <b>침대로</b>(→), 틀렸으면 <b>나한테</b>(←) 보내요. 안 밀면 닥터루미 답대로 가요!']
    ];
    var i = 0, say, row, nextBtn;
    function show() {
      deckClear(); say = deckSay('teacher', lines[i][0], '보건쌤 <span class="ee-badge">' + (i + 1) + ' / ' + lines.length + '</span>', lines[i][1]);
      row = el('<div class="sf-row is-end"></div>'); nextBtn = button(i < lines.length - 1 ? '다음' : '시작해요', '', function () { sfx('tap'); if (i < lines.length - 1) { i++; show(); } else { setProgress(1); flow.next(); } });
      if (i < lines.length - 1) row.appendChild(button('건너뛰기', 'secondary', function () { sfx('tap'); setProgress(1); flow.next(); }));
      row.appendChild(nextBtn); D.deck.appendChild(row); nextBtn.focus();
    }
    show();
    teacherActor.dir = 'right';
    return function () { };
  }
  function dayStage(id) {
    var cfg = DAYS[id];
    setupNurse();
    newDay(id); scene.tick = tick; scene.draw = drawWindowOverlay;
    if (cfg.day === 2) setProgress(3); else if (cfg.day === 3) setProgress(5);
    stageLabel(cfg.day + '일차 · ' + cfg.title); hudTimer(cfg.seconds, cfg.seconds); ['cared', 'acc', 'caught', 'queue'].forEach(function (k) { hudStat(k, 0); });
    deckClear();
    showTitleCard(cfg.day + '일차', cfg.title, 1.4, function () { dayIntro(cfg); });
    return function () { R = null; scene.tick = null; scene.draw = null; };
  }
  function dayIntro(cfg) {
    deckClear();
    var text, expr = 'explaining';
    if (cfg.day === 1) text = '첫날이에요. 처음 세 명은 천천히 연습해요. 그다음부터는 시간이 흘러요. 안 밀면 닥터루미 답대로 가요.';
    else if (cfg.day === 2) text = '오늘은 카드마다 표시가 있어요. <b>돋보기</b>는 닥터루미가 본 카드, <b>느낌표</b>는 못 본 카드예요. 못 본 카드에 답이 있으면 닥터루미는 자신 있게 틀려요. 틀린 걸 잡으면 <b>오류 신고</b>가 쌓여요.';
    else text = '닥터루미에 <b>안전장치</b>를 켤게요. ① 자신감 80% 아래이거나 열·알레르기·상처·목이면 닥터루미가 "사람이 확인해 주세요"라고 말하고 침대 버튼이 잠겨요. 핵심 카드를 탭하면 풀려요. ② 못 본 카드는 스스로 알려 줘요.';
    var say = deckSay('teacher', expr, '보건쌤', text, cfg.day === 3 ? '사고는 줄겠지만, 확인하는 동안 줄이 길어질 수 있어요.' : (cfg.day === 2 ? '보고서에서 네가 신고한 오류가 닥터루미 개선에 쓰여요.' : ''));
    var row = el('<div class="sf-row is-end"></div>');
    var go = button(cfg.day === 3 ? '안전장치 켜고 시작' : '시작', '', function () {
      sfx('tap'); if (cfg.day === 3) switchScene(function () { startDay(); }); else startDay();
    });
    row.appendChild(go); D.deck.appendChild(row); go.focus();
  }
  // 3일차: 보건쌤이 닥터루미 충전대로 가서 스위치를 켜는 장면
  function switchScene(done) {
    deckClear(); var note = el('<div class="ee-notice sf-tip"><span>보건쌤이 닥터루미의 안전장치를 켜요…</span></div>'); note.insertBefore(iconEl('settings', 32), note.firstChild); D.deck.appendChild(note);
    teacherActor.speed = 240;
    goTo(teacherActor, [{ x: 520, y: 540 }, { x: 760, y: 540 }, { x: G.guard.x, y: G.guard.y + 40 }], function () {
      teacherActor.dir = 'up'; addFx('key', G.guard.x, G.guard.y - 60, 80); sfx('tap');
      after(0.7, function () { setGuard(true); addFx('unlock', G.robot.x, G.robot.y - 90, 96); sfx('collect'); after(0.8, function () { goTo(teacherActor, [{ x: 760, y: 540 }, { x: 520, y: 540 }, G.teacherSpot], null, 'right'); done(); }); });
    }, 'up');
  }
  function startDay() {
    buildWindowDeck(); R.running = true; R.spawnT = R.cfg.interval[0]; sfx('door');
    showTip(R.cfg.day === 1 ? '아이들이 와요. 닥터루미 답을 카드와 비교해요.' : R.cfg.day === 2 ? '느낌표 카드를 꼭 확인해요.' : '잠기면 핵심 카드를 탭해요.', 'play', 3);
    try { D.canvas.focus({ preventScroll: true }); } catch (e) { /* */ }
  }
  function thinkStage(id) {
    var t = THINK[id], rec = game.records[id === 'think1' ? 'day1' : 'day2'];
    var q = t.q; if (id === 'think1' && game.seenWrong) q = t.seen.replace('{name}', game.seenWrong.name).replace('{conf}', game.seenWrong.conf);
    var p = el('<div><span class="sf-kicker">생각 카드 ' + (id === 'think1' ? 1 : 2) + ' · 60초</span></div>');
    if (rec) p.appendChild(el('<p class="sf-sub">' + rec.day + '일차 · 돌본 아이 ' + rec.cared + ' · 다시 살펴본 아이 ' + rec.acc + ' · 오류 신고 ' + rec.caught + ' · 가장 길었던 줄 ' + rec.maxQueue + '명</p>'));
    p.appendChild(el('<h2 class="sf-h1">' + esc(q) + '</h2>'));
    var bar = el('<div class="sf-think-bar"><div class="sf-bar" aria-hidden="true"><i style="width:100%"></i></div></div>'); p.appendChild(bar);
    var ch = el('<div class="sf-choices" role="group" aria-label="생각 카드 선택"></div>'); var picked = null;
    t.c.forEach(function (c, i) { var b = el('<button type="button" class="ee-choice" aria-pressed="false"><span class="sf-num">' + (i + 1) + '</span><span>' + esc(c) + '</span></button>'); b.addEventListener('click', function () { picked = i; game.answers[id] = i; $$('.ee-choice', ch).forEach(function (x, j) { x.setAttribute('aria-pressed', String(j === i)); }); nextBtn.disabled = false; sfx('tap'); }); ch.appendChild(b); });
    p.appendChild(ch);
    p.appendChild(el('<p class="sf-sub">정답은 없어요. 네 생각을 고르면 돼요. 보고서에 함께 나와요.</p>'));
    var row = el('<div class="sf-row is-end"></div>'); var nextBtn = button('다음 날로', '', function () { sfx('tap'); flow.next(); }); nextBtn.disabled = true; row.appendChild(nextBtn); p.appendChild(row);
    showScreen(p);
    var t0 = now, dur = 60; var timer = { dead: false };
    (function tickBar() { if (timer.dead) return; var k = clamp(1 - (now - t0) / dur, 0, 1); bar.querySelector('i').style.width = (k * 100) + '%'; if (k <= 0) { nextBtn.disabled = false; return; } requestAnimationFrame(tickBar); })();
    return function () { timer.dead = true; };
  }
  function reportStage() {
    var d = [game.records.day1, game.records.day2, game.records.day3].map(function (r, i) { return r || { day: i + 1, cared: 0, acc: 0, caught: 0, maxQueue: 0, busy: 0, timeouts: 0 }; });
    var max = Math.max(1, d.reduce(function (m, r) { return Math.max(m, r.acc, r.caught, r.maxQueue); }, 1));
    var p = el('<div><span class="sf-kicker">3일 보고서</span><h2 class="sf-h1">닥터루미 창구, 사흘의 기록</h2></div>');
    var legend = el('<div class="sf-legend"><span class="is-acc"><i></i>다시 살펴본 아이</span><span class="is-report"><i></i>오류 신고</span><span class="is-queue"><i></i>가장 길었던 줄</span></div>'); p.appendChild(legend);
    var chart = el('<div class="sf-chart"></div>');
    d.forEach(function (r) {
      chart.appendChild(el('<div><b>' + r.day + '일차</b><br><span class="sf-sub">돌본 아이 ' + r.cared + '</span></div>'));
      var bars = el('<div class="sf-bars"></div>');
      [['is-acc', r.acc, '다시 살펴본 아이'], ['is-report', r.caught, '오류 신고'], ['is-queue', r.maxQueue, '가장 길었던 줄']].forEach(function (b) { bars.appendChild(el('<div class="sf-cbar ' + b[0] + '"><i style="width:' + Math.round(b[1] / max * 100) + '%" aria-hidden="true"></i><b>' + b[1] + '</b><span class="sf-visually-hidden">' + b[2] + '</span></div>')); });
      chart.appendChild(bars);
    });
    p.appendChild(chart);
    var totalCaught = d[0].caught + d[1].caught + d[2].caught, totalAcc = d[0].acc + d[1].acc + d[2].acc;
    var cond = game.cond === 'new' ? '최신판(오판 5%)' : '옛 버전(오판 25%)';
    var list = el('<ul class="sf-list"></ul>');
    list.appendChild(el('<li>네 닥터루미는 <b>' + cond + '</b>이었어요. 너는 몰랐지만, 카드를 보면 알 수 있었어요.</li>'));
    list.appendChild(el('<li>네가 신고한 오류 <b>' + totalCaught + '건</b>이 닥터루미 개선에 쓰여요.</li>'));
    list.appendChild(el('<li>3일차 안전장치: 다시 살펴본 아이 ' + d[1].acc + '명 → <b>' + d[2].acc + '명</b>, 가장 길었던 줄 ' + d[1].maxQueue + '명 → <b>' + d[2].maxQueue + '명</b>. 안전해진 만큼 줄은 ' + (d[2].maxQueue > d[1].maxQueue ? '길어졌어요' : '비슷했어요') + '.</li>'));
    p.appendChild(list);
    p.appendChild(el('<p class="sf-h2">내 생각 카드</p>'));
    var ans = el('<ul class="sf-list"></ul>');
    ans.appendChild(el('<li>' + esc(THINK.think1.q) + ' → <b>' + esc(game.answers.think1 != null ? THINK.think1.c[game.answers.think1] : '모르겠어요') + '</b></li>'));
    ans.appendChild(el('<li>' + esc(THINK.think2.q) + ' → <b>' + esc(game.answers.think2 != null ? THINK.think2.c[game.answers.think2] : '모르겠어요') + '</b></li>'));
    p.appendChild(ans);
    var row = el('<div class="sf-row is-end"></div>'); row.appendChild(button('완료 화면으로', '', function () { sfx('tap'); flow.next(); })); p.appendChild(row);
    showScreen(p); sfx('paper');
    game.totalAcc = totalAcc; game.totalCaught = totalCaught;
  }
  function endingCode() { var acc = game.totalAcc || 0; return acc === 0 ? 'A' : acc <= 2 ? 'B' : acc >= 5 ? 'C' : 'D'; }
  function completeStage() {
    var code = endingCode(), d = game.records, good = code === 'A' || code === 'B';
    var result = { completed: true, ending: code, cond: game.cond, days: ['day1', 'day2', 'day3'].map(function (k) { var r = d[k] || {}; return { acc: r.acc || 0, caught: r.caught || 0, maxQueue: r.maxQueue || 0, cared: r.cared || 0 }; }), at: new Date().toISOString() };
    save(STORE.result, result);
    setProgress(7); post({ type: 'ethicity:complete', result: { completed: true } });
    sfx('win'); if (playerActor) addFx('correct', playerActor.x, playerActor.y - 110, 96);
    var p = el('<div><span class="sf-kicker">완료 · 엔딩 ' + code + '</span><h2 class="sf-h1">' + esc(ENDINGS[code]) + '</h2></div>');
    var ec = el('<div class="sf-endcard"><p>' + esc(CARD_PHRASES[code]) + '</p></div>'); ec.insertBefore(faceEl(player.character, good ? 'happy' : 'worried'), ec.firstChild);
    p.appendChild(el('<p class="sf-h2">기억할 한 문장</p>')); p.appendChild(ec);
    p.appendChild(el('<p class="sf-h2">우리가 발견한 것</p>'));
    var found = el('<ul class="sf-list"></ul>');
    found.appendChild(el('<li>닥터루미가 자신 있게 말해도 카드와 다르면 틀린 거예요. 자신감 %는 정답 보증이 아니에요.</li>'));
    found.appendChild(el('<li>닥터루미가 못 본 카드(급식 메뉴 같은 것)에 답이 있을 때가 있어요. 못 본 건 사람이 봐야 해요.</li>'));
    found.appendChild(el('<li>안전장치가 있으면 사고는 줄지만 줄은 길어져요. 그래도 위험한 일은 한 번 더 확인하는 게 맞아요.</li>'));
    p.appendChild(found);
    p.appendChild(el('<p class="sf-h2">닥터루미의 한마디 · 안전성이란?</p>'));
    var aiSay = el('<div class="sf-say"></div>'); aiSay.appendChild(faceEl('robot', 'explaining')); aiSay.appendChild(el('<div class="ee-speech"><p class="ee-speaker">닥터루미</p><p class="sf-p">' + esc(SAFETY_EXPLAIN) + '</p></div>')); p.appendChild(aiSay);
    p.appendChild(el('<p class="sf-h2">탐험 보고서 카드</p>'));
    var rep = el('<div class="sf-report"></div>'); p.appendChild(rep);
    if (window.EthicityReportCard) window.EthicityReportCard.mount(rep, reportOpts(code));
    p.appendChild(el('<p class="sf-sub">' + esc(player.nick) + ' · 윤리시티 안전성 · 저장됨 (이 기기에만)</p>'));
    var row = el('<div class="sf-row is-end"></div>');
    row.appendChild(button('처음 화면으로', 'secondary', function () { sfx('tap'); resetGame(); flow.go('start'); }));
    row.appendChild(button('다시 하기', '', function () { sfx('tap'); resetGame(); flow.go('walk'); }, { icon: 'retry' }));
    p.appendChild(row); showScreen(p);
  }
  // 탐험 보고서 카드(report-card.js)에 넣을 내용
  function reportOpts(code) {
    var d = game.records, days = ['day1', 'day2', 'day3'].map(function (k, i) { return d[k] || { day: i + 1, cared: 0, acc: 0, caught: 0, maxQueue: 0 }; });
    var sum = function (k) { return days.reduce(function (t, r) { return t + (r[k] || 0); }, 0); };
    var face = function (id, expr) { return function (ctx, x, y, size) { A.drawPortrait(ctx, id, expr, x, y, size); }; };
    var ans = function (id) { return game.answers[id] != null ? THINK[id].c[game.answers[id]] : '고르지 않았어요'; };
    return {
      concept: '안전성', game: '닥터루미 창구', title: '닥터루미 창구 탐험 보고서', nick: player.nick, who: NAMES[player.character] + ' · 엔딩 ' + code + ' 「' + ENDINGS[code] + '」',
      portrait: face(player.character, code === 'A' || code === 'B' ? 'happy' : 'worried'),
      stats: [{ label: '사흘 동안 돌본 아이', value: sum('cared') + '명' }, { label: '다시 살펴본 아이', value: sum('acc') + '명', color: '#bf7865' }, { label: '오류 신고', value: sum('caught') + '건', color: '#5a8c65' }, { label: '가장 길었던 줄', value: Math.max.apply(null, days.map(function (r) { return r.maxQueue || 0; })) + '명', color: '#3f7fb5' }],
      sections: [
        { heading: '하루하루 기록', rows: [['내 닥터루미', game.cond === 'new' ? '최신판 (오판 5%)' : '옛 버전 (오판 25%)']].concat(days.map(function (r) { return [r.day + '일차', '돌봄 ' + r.cared + ' · 다시 살펴봄 ' + r.acc + ' · 오류 신고 ' + r.caught + ' · 줄 ' + r.maxQueue + '명']; })) },
        { heading: '내 생각 카드', lines: ['① ' + THINK.think1.q + ' → ' + ans('think1'), '② ' + THINK.think2.q + ' → ' + ans('think2')] },
        { heading: '우리가 발견한 것', lines: ['닥터루미가 자신 있게 말해도 카드와 다르면 틀린 거예요. 자신감 %는 정답 보증이 아니에요.', '닥터루미가 못 본 카드에 답이 있을 때가 있어요. 못 본 건 사람이 봐야 해요.', '안전장치가 있으면 사고는 줄지만 줄은 길어져요. 그래도 위험한 일은 한 번 더 확인하는 게 맞아요.'] }
      ],
      ai: { name: '닥터루미', text: SAFETY_EXPLAIN, portrait: face('robot', 'explaining') },
      remember: CARD_PHRASES[code], filename: '윤리시티_안전성_' + player.nick
    };
  }
  function resetGame() { game.records = {}; game.answers = { think1: null, think2: null }; game.seenWrong = null; game.totalAcc = 0; game.totalCaught = 0; game.progress = 0; game.cond = rng(SEED ^ 0x9e3779b9)() < 0.5 ? 'new' : 'old'; }

  // ── 테스트 훅 ─────────────────────────────────────────────
  window.__safety = {
    state: function () { var w = R && R.window; return { stage: game.stage, running: !!(R && R.running), day: R ? R.cfg.day : 0, t: R ? R.t : 0, queue: R ? R.queue.length : 0, window: w && w.presented ? { kid: w.c.kid, topic: w.c.topic, aiWrong: w.c.ai.wrong, conf: w.c.ai.conf, human: w.c.ai.human, locked: isLocked(w), key: keyIndex(w.c), hidden: w.c.hidden, unseen: w.c.unseen, tutPause: R.tut.pause } : null, stats: R ? { cared: R.cared, acc: R.acc, caught: R.caught, maxQueue: R.maxQueue } : null, records: game.records, cond: game.cond, progress: game.progress, screen: !D.screen.hidden }; },
    act: function (dir) { return act(dir, 'hook'); },
    tap: function (i) { return tapCard(i, 'hook'); },
    next: function () { var b = $$('#sf-screen button:not([disabled]), #sf-deck .sf-row button:not([disabled])').filter(function (x) { return !/건너뛰기|처음 화면으로/.test(x.textContent); }).pop(); if (b) { b.click(); return true; } return false; },
    choose: function (i) { var c = $$('#sf-screen .ee-choice')[i]; if (c) { c.click(); return true; } return false; },
    skip: function () { var b = $$('#sf-deck .sf-row button').filter(function (x) { return /건너뛰기/.test(x.textContent); })[0]; if (b) { b.click(); return true; } return false; },
    go: function (id) { flow.go(id); },
    actors: function () { return scene.actors.map(function (a) { return { id: a.id, x: a.x, y: a.y, walking: a.walking }; }); },
    setPlayer: function (ch, nick) { player = { character: ch || 'jiho', nick: nick || '탐험가' }; save(STORE.player, player); }
  };

  // ── 시작 ──────────────────────────────────────────────────
  async function boot() {
    var fail = $('#sf-fail');
    try {
      A = await EthicityAssets.load(window.ETHICITY_COMMON_MANIFEST, COMMON_BASE);
    } catch (e) { if (fail) { fail.hidden = false; fail.textContent = '공통 에셋을 불러오지 못했어요. ../shared/ethicity-elementary-common-v1 폴더를 확인해 주세요. (' + e.message + ')'; } return; }
    buildTempCards(); await loadGameAssets();
    try { if (document.fonts && document.fonts.load) await Promise.race([document.fonts.load('700 18px Ethicity'), new Promise(function (r) { setTimeout(r, 1500); })]); } catch (e) { /* 글꼴은 선택 */ }
    buildDom(); A.setSound(soundOn);
    BGM = window.EthicityBgm ? window.EthicityBgm('assets/bgm.mp3', { volume: 0.25, loopEnd: 22.32 }) : null; if (BGM) BGM.setEnabled(soundOn); // 보건실 구간 22.32초(36박) 루프
    resetGame();
    requestAnimationFrame(function (ts) { lastRaf = ts; requestAnimationFrame(frame); });
    post({ type: 'ethicity:ready' });
    var skip = Q.skip && STAGES.indexOf(Q.skip) > 0 ? Q.skip : null;
    if (skip) { if (!player) { player = { character: 'jiho', nick: '탐험가' }; } ['day1', 'day2'].forEach(function (k, i) { if (STAGES.indexOf(skip) > STAGES.indexOf(k)) game.records[k] = { day: i + 1, cared: 0, acc: 0, caught: 0, busy: 0, timeouts: 0, maxQueue: 0, avgWait: 0 }; }); if (STAGES.indexOf(skip) > STAGES.indexOf('day3')) game.records.day3 = { day: 3, cared: 0, acc: 0, caught: 0, busy: 0, timeouts: 0, maxQueue: 0, avgWait: 0 }; flow.go(skip); }
    else flow.go('start');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
