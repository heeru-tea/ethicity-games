/* 윤리시티 · 탐험 보고서 카드 — 세 게임이 같은 파일을 복사해 쓴다(공통 팩은 건드리지 않는다).
   게임이 끝나면 결과를 캔버스 한 장(가로 1080px)에 그려 화면에 보여 주고, 「PNG로 저장」으로 내려받는다.
   사용: window.EthicityReportCard.mount(container, opts) → { canvas, img, save() }
   opts = { concept, game, title, nick, who, date?, portrait(ctx,x,y,size)?, stats:[{label,value,color?}], sections:[{heading, lines|rows}],
            ai:{ name, text, portrait(ctx,x,y,size)? }, remember, footer?, filename }
   글자는 공통 팩의 Ethicity(갈무리11) 글꼴을 쓴다. 한글은 글자 단위로 줄을 바꾼다. */
(function () {
  'use strict';
  var INK = '#294b40', CREAM = '#fff9e7', PAPER = '#f2e7c7', GREEN = '#5a8c65', GOLD = '#f3cf72', RED = '#bf7865', BLUE = '#3f7fb5', SAGE = '#a8bb8c', LINE = '#b3c19c', MUTED = '#4d6457', LIGHT = '#e6edda';
  var FONT = 'Ethicity, "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  var W = 1080, P = 56;
  function font(ctx, size, bold) { ctx.font = (bold ? '700 ' : '400 ') + size + 'px ' + FONT; }
  function wrap(ctx, text, maxW) {
    var lines = [];
    String(text == null ? '' : text).split('\n').forEach(function (para) {
      var cur = '';
      for (var i = 0; i < para.length; i++) {
        var ch = para[i], t = cur + ch;
        if (ctx.measureText(t).width > maxW && cur) { lines.push(cur.replace(/\s+$/, '')); cur = ch === ' ' ? '' : ch; } else cur = t;
      }
      lines.push(cur);
    });
    return lines;
  }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function box(ctx, x, y, w, h, fill, stroke, r) { rr(ctx, x, y, w, h, r == null ? 14 : r); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.lineWidth = 4; ctx.strokeStyle = stroke; ctx.stroke(); } }
  function textLines(ctx, lines, x, y, lh, color, align) { ctx.fillStyle = color || INK; ctx.textAlign = align || 'left'; ctx.textBaseline = 'top'; lines.forEach(function (ln, i) { ctx.fillText(ln, x, y + i * lh); }); return lines.length * lh; }
  function today() { var d = new Date(); return d.getFullYear() + '. ' + (d.getMonth() + 1) + '. ' + d.getDate() + '.'; }

  /* 블록들은 (ctx, y, dry) → 높이. dry 면 그리지 않고 높이만 잰다. */
  function build(opts) {
    var cw = W - P * 2, blocks = [];
    // 머리띠
    blocks.push(function (ctx, y, dry) {
      var h = 190;
      if (!dry) {
        ctx.fillStyle = INK; ctx.fillRect(0, 0, W, h);
        ctx.fillStyle = GOLD; ctx.fillRect(0, h - 10, W, 10);
        font(ctx, 24, true); textLines(ctx, ['윤리시티 · AI 윤리 탐험대 · ' + opts.concept], P, 36, 30, GOLD);
        font(ctx, 44, true); var tl = wrap(ctx, opts.title || (opts.game + ' 탐험 보고서'), cw - 180); textLines(ctx, tl.slice(0, 2), P, 74, 52, CREAM);
        if (opts.portrait) { box(ctx, W - P - 128, 28, 128, 128, CREAM, GOLD, 16); try { opts.portrait(ctx, W - P - 120, 36, 112); } catch (e) { /* 초상 없음 */ } }
      }
      return h;
    });
    // 이름·날짜 줄
    blocks.push(function (ctx, y, dry) {
      var h = 70;
      if (!dry) {
        font(ctx, 26, true); ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        var left = (opts.nick ? opts.nick + (opts.who ? ' (' + opts.who + ')' : '') : (opts.who || '')) || '';
        ctx.fillText(left, P, y + 22);
        font(ctx, 22, false); ctx.fillStyle = MUTED; ctx.textAlign = 'right'; ctx.fillText(opts.date || today(), W - P, y + 26);
        ctx.fillStyle = LINE; ctx.fillRect(P, y + h - 4, cw, 3);
      }
      return h;
    });
    // 숫자 타일
    if (opts.stats && opts.stats.length) blocks.push(function (ctx, y, dry) {
      var n = opts.stats.length, cols = Math.min(4, n), rows = Math.ceil(n / cols), gap = 16, tw = (cw - gap * (cols - 1)) / cols, th = 124, h = rows * th + (rows - 1) * gap + 28;
      if (!dry) opts.stats.forEach(function (s, i) {
        var cx = P + (i % cols) * (tw + gap), cy = y + 14 + Math.floor(i / cols) * (th + gap);
        box(ctx, cx, cy, tw, th, CREAM, LINE, 12);
        ctx.fillStyle = s.color || GREEN; ctx.fillRect(cx + 4, cy + 4, tw - 8, 8);
        font(ctx, 46, true); ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(String(s.value), cx + tw / 2, cy + 28);
        font(ctx, 20, false); ctx.fillStyle = MUTED; var ll = wrap(ctx, s.label, tw - 16); ctx.fillText(ll[0], cx + tw / 2, cy + 86);
      });
      return h;
    });
    // 절
    (opts.sections || []).forEach(function (sec) {
      blocks.push(function (ctx, y, dry) {
        var h = 20; font(ctx, 28, true);
        if (!dry) { ctx.fillStyle = GREEN; ctx.fillRect(P, y + 20, 10, 30); textLines(ctx, [sec.heading], P + 22, y + 18, 34, INK); }
        h += 50;
        if (sec.rows) {
          font(ctx, 23, false);
          sec.rows.forEach(function (r, i) {
            var vl = wrap(ctx, String(r[1]), cw * 0.64 - 24), rh = Math.max(44, vl.length * 30 + 14);
            if (!dry) {
              ctx.fillStyle = i % 2 ? CREAM : LIGHT; ctx.fillRect(P, y + h, cw, rh);
              font(ctx, 23, true); textLines(ctx, [String(r[0])], P + 16, y + h + 9, 30, INK);
              font(ctx, 23, false); textLines(ctx, vl, W - P - 16, y + h + 9, 30, INK, 'right');
            }
            h += rh;
          });
          if (!dry) { ctx.lineWidth = 3; ctx.strokeStyle = LINE; ctx.strokeRect(P, y + 70, cw, h - 70); }
        } else {
          font(ctx, 24, false);
          (sec.lines || []).forEach(function (line) {
            var ll = wrap(ctx, line, cw - 40);
            if (!dry) { ctx.fillStyle = GREEN; ctx.fillRect(P + 8, y + h + 12, 10, 10); textLines(ctx, ll, P + 32, y + h, 34, INK); }
            h += ll.length * 34 + 6;
          });
        }
        return h + 10;
      });
    });
    // AI 한마디(개념 설명)
    if (opts.ai) blocks.push(function (ctx, y, dry) {
      font(ctx, 24, false); var tl = wrap(ctx, opts.ai.text, cw - 170 - 48), bh = Math.max(150, tl.length * 34 + 70), h = bh + 36;
      if (!dry) {
        box(ctx, P, y + 20, cw, bh, CREAM, INK, 16);
        box(ctx, P + 24, y + 44, 104, 104, PAPER, INK, 10);
        if (opts.ai.portrait) { try { opts.ai.portrait(ctx, P + 28, y + 48, 96); } catch (e) { /* */ } }
        font(ctx, 22, true); textLines(ctx, [opts.ai.name + '의 한마디 · ' + opts.concept + '이란?'], P + 150, y + 40, 28, GREEN);
        font(ctx, 24, false); textLines(ctx, tl, P + 150, y + 76, 34, INK);
      }
      return h;
    });
    // 기억할 한 문장
    if (opts.remember) blocks.push(function (ctx, y, dry) {
      font(ctx, 30, true); var tl = wrap(ctx, opts.remember, cw - 80), bh = tl.length * 42 + 76, h = bh + 24;
      if (!dry) {
        box(ctx, P, y + 12, cw, bh, GOLD, INK, 16);
        font(ctx, 20, true); textLines(ctx, ['기억할 한 문장'], W / 2, y + 30, 26, INK, 'center');
        font(ctx, 30, true); textLines(ctx, tl, W / 2, y + 62, 42, INK, 'center');
      }
      return h;
    });
    // 바닥
    blocks.push(function (ctx, y, dry) {
      var h = 64;
      if (!dry) { ctx.fillStyle = INK; ctx.fillRect(0, y + 12, W, h - 12); font(ctx, 20, false); textLines(ctx, [opts.footer || ('윤리시티 · ' + opts.game + ' · 이 카드는 이 기기에서만 만들어졌어요')], W / 2, y + 30, 24, CREAM, 'center'); }
      return h;
    });
    return blocks;
  }

  function render(opts) {
    var blocks = build(opts), m = document.createElement('canvas'), mctx = m.getContext('2d');
    var total = 0; blocks.forEach(function (b) { total += b(mctx, total, true); });
    var c = document.createElement('canvas'), scale = 2; c.width = W * scale; c.height = Math.ceil(total) * scale;
    var ctx = c.getContext('2d'); ctx.scale(scale, scale); ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, total);
    var y = 0; blocks.forEach(function (b) { y += b(ctx, y, false); });
    return c;
  }
  function fontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all([document.fonts.load('700 30px Ethicity'), document.fonts.load('400 24px Ethicity')]).catch(function () { /* 글꼴 없어도 그린다 */ });
  }
  function download(canvas, filename) {
    var name = (filename || 'ethicity-report') + '.png';
    var done = function (url, revoke) { var a = document.createElement('a'); a.href = url; a.download = name; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); if (revoke) setTimeout(function () { URL.revokeObjectURL(url); }, 4000); };
    if (canvas.toBlob) canvas.toBlob(function (b) { if (b) done(URL.createObjectURL(b), true); else done(canvas.toDataURL('image/png')); }, 'image/png');
    else done(canvas.toDataURL('image/png'));
  }
  /* 화면에 카드 그림 + 저장 버튼을 붙인다. */
  function mount(container, opts) {
    var wrapEl = document.createElement('div'); wrapEl.className = 'ee-report';
    var img = document.createElement('img'); img.className = 'ee-report-img'; img.alt = (opts.game || '') + ' 탐험 보고서 카드'; img.draggable = false;
    var row = document.createElement('div'); row.className = 'ee-report-row';
    var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'ee-button ee-report-save'; btn.textContent = 'PNG로 저장'; btn.disabled = true;
    var hint = document.createElement('p'); hint.className = 'ee-report-hint'; hint.textContent = '보고서 카드를 그리는 중…';
    row.appendChild(btn); row.appendChild(hint); wrapEl.appendChild(img); wrapEl.appendChild(row); container.appendChild(wrapEl);
    var out = { canvas: null, img: img, button: btn, save: function () { if (out.canvas) download(out.canvas, opts.filename); } };
    btn.addEventListener('click', function () { out.save(); hint.textContent = '저장했어요. 다운로드 폴더(또는 사진)를 확인해요.'; });
    fontsReady().then(function () {
      out.canvas = render(opts); img.src = out.canvas.toDataURL('image/png'); btn.disabled = false;
      hint.textContent = '태블릿·폰에서는 카드 그림을 길게 눌러 사진으로 저장할 수도 있어요.';
      if (typeof opts.onReady === 'function') opts.onReady(out);
    });
    return out;
  }
  window.EthicityReportCard = { render: render, mount: mount, download: download };
})();
