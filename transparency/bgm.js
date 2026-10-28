/* 배경음악 — 수노로 만든 「Pixel Town Suite」(C장조·97BPM)에서 이 게임 몫의 구간을 잘라낸 루프.
   파일 끝 0.3초에 시작 직전 소리를 섞어 두어 처음으로 되감겨도 이음새가 안 들립니다.
   Web Audio 로 틈 없이 반복하고, 「소리/효과음」 버튼과 함께 켜고 끕니다.
   브라우저 자동재생 제한 때문에 첫 터치·키 입력 뒤에만 소리가 납니다(이 파일이 읽히는 순간부터 터치를 지켜봅니다).
   탭이 숨겨지면 멈추고 돌아오면 이어집니다. */
(function () {
  var ctx = null, unlocked = false, instances = [];
  function getCtx() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    return ctx;
  }
  function unlock() {
    if (unlocked) return; unlocked = true;
    var c = getCtx(); if (c && c.state === 'suspended') c.resume();
    instances.forEach(function (i) { i.play(); });
  }
  document.addEventListener('pointerdown', unlock, { passive: true });
  document.addEventListener('keydown', unlock);
  document.addEventListener('visibilitychange', function () {
    if (!ctx) return;
    if (document.hidden) { if (ctx.state === 'running') ctx.suspend(); }
    else if (unlocked && ctx.state === 'suspended' && instances.some(function (i) { return i.enabled; })) ctx.resume();
  });

  window.EthicityBgm = function (src, opts) {
    opts = opts || {};
    var volume = opts.volume == null ? 0.25 : opts.volume, loopEnd = opts.loopEnd || 0;
    var enabled = false, gain = null, node = null, buf = null, raw = null, loading = null;
    function fetchRaw() {
      if (!loading) loading = fetch(src).then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.arrayBuffer(); }).then(function (b) { raw = b; }).catch(function () { raw = null; });
      return loading;
    }
    function ensureGain() { var c = getCtx(); if (!c) return null; if (!gain) { gain = c.createGain(); gain.gain.value = 0; gain.connect(c.destination); } return gain; }
    function decode() {
      if (buf) return Promise.resolve(buf);
      return fetchRaw().then(function () {
        var c = getCtx(); if (!raw || !c) return null;
        return new Promise(function (res) { try { c.decodeAudioData(raw.slice(0), function (b) { buf = b; res(b); }, function () { res(null); }); } catch (e) { res(null); } });
      });
    }
    function ramp(to, sec) { var t = ctx.currentTime; gain.gain.cancelScheduledValues(t); gain.gain.setValueAtTime(gain.gain.value, t); gain.gain.linearRampToValueAtTime(to, t + sec); }
    function play() {
      if (!enabled || !unlocked || node || !ensureGain()) return;
      decode().then(function (b) {
        if (!b || node || !enabled || !unlocked) return;
        if (ctx.state === 'suspended') ctx.resume();
        node = ctx.createBufferSource(); node.buffer = b; node.loop = true; node.loopStart = 0;
        node.loopEnd = loopEnd && loopEnd < b.duration ? loopEnd : b.duration;
        node.connect(gain); node.start(0); ramp(volume, 0.6);
      });
    }
    function stop() {
      if (!node) return; var n = node; node = null; ramp(0, 0.4);
      setTimeout(function () { try { n.stop(); } catch (e) { /* 이미 멈춤 */ } try { n.disconnect(); } catch (e) { /* 무시 */ } }, 500);
    }
    fetchRaw();
    var api = {
      play: play,
      setEnabled: function (on) { enabled = !!on; if (enabled) play(); else stop(); },
      get enabled() { return enabled; },
      get playing() { return !!node; },
      get state() { return ctx ? ctx.state : 'none'; }
    };
    instances.push(api);
    window.__ethicityBgm = api; // 자동 점검용
    return api;
  };
})();
