// 배경음악 — 수노로 만든 「Pixel Town Suite」(C장조·97BPM)에서 교실 구간 39.68초(64박)를 잘라낸 루프.
// 파일 끝 0.3초에 시작 직전 소리를 섞어 두어 되감겨도 이음새가 안 들린다. Web Audio 로 틈 없이 반복한다.
// 선생님 화면(?teach)에서만 튼다. 학생 태블릿 30대가 동시에 음악을 내면 교실이 시끄럽기 때문(sound.ts 참고).
// 소리 버튼과 함께 켜고 끄며, 첫 터치·키 입력 뒤에만 소리가 난다(브라우저 자동재생 제한).
// 첫 터치는 이 모듈이 읽히는 순간부터 지켜본다.

export interface Bgm {
  setEnabled(on: boolean): void;
  readonly enabled: boolean;
  readonly playing: boolean;
  readonly state: string;
}

type AC = typeof AudioContext;

let ctx: AudioContext | null = null;
let unlocked = false;
const instances: Array<{ play(): void; readonly enabled: boolean }> = [];

function getCtx(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = (window.AudioContext ?? (window as unknown as { webkitAudioContext?: AC }).webkitAudioContext) as
    | AC
    | undefined;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    return null;
  }
  return ctx;
}
function unlock(): void {
  if (unlocked) return;
  unlocked = true;
  const c = getCtx();
  if (c && c.state === "suspended") void c.resume();
  for (const i of instances) i.play();
}
if (typeof document !== "undefined") {
  document.addEventListener("pointerdown", unlock, { passive: true });
  document.addEventListener("keydown", unlock);
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) {
      if (ctx.state === "running") void ctx.suspend();
    } else if (unlocked && ctx.state === "suspended" && instances.some((i) => i.enabled)) {
      void ctx.resume();
    }
  });
}

export function createBgm(src: string, opts: { volume?: number; loopEnd?: number } = {}): Bgm {
  const volume = opts.volume ?? 0.25;
  const loopEnd = opts.loopEnd ?? 0;
  let enabled = false;
  let gain: GainNode | null = null;
  let node: AudioBufferSourceNode | null = null;
  let buf: AudioBuffer | null = null;
  let raw: ArrayBuffer | null = null;
  let loading: Promise<void> | null = null;

  function fetchRaw(): Promise<void> {
    if (!loading) {
      loading = fetch(src)
        .then((r) => {
          if (!r.ok) throw new Error(String(r.status));
          return r.arrayBuffer();
        })
        .then((b) => {
          raw = b;
        })
        .catch(() => {
          raw = null;
        });
    }
    return loading;
  }
  function ensureGain(): GainNode | null {
    const c = getCtx();
    if (!c) return null;
    if (!gain) {
      gain = c.createGain();
      gain.gain.value = 0;
      gain.connect(c.destination);
    }
    return gain;
  }
  function decode(): Promise<AudioBuffer | null> {
    if (buf) return Promise.resolve(buf);
    return fetchRaw().then(() => {
      const c = getCtx();
      if (!raw || !c) return null;
      const data = raw.slice(0);
      return new Promise<AudioBuffer | null>((res) => {
        try {
          c.decodeAudioData(
            data,
            (b) => {
              buf = b;
              res(b);
            },
            () => res(null),
          );
        } catch {
          res(null);
        }
      });
    });
  }
  function ramp(to: number, sec: number): void {
    if (!ctx || !gain) return;
    const t = ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(to, t + sec);
  }
  function play(): void {
    if (!enabled || !unlocked || node || !ensureGain()) return;
    void decode().then((b) => {
      if (!b || node || !enabled || !unlocked || !ctx || !gain) return;
      if (ctx.state === "suspended") void ctx.resume();
      const n = ctx.createBufferSource();
      n.buffer = b;
      n.loop = true;
      n.loopStart = 0;
      n.loopEnd = loopEnd && loopEnd < b.duration ? loopEnd : b.duration;
      n.connect(gain);
      n.start(0);
      node = n;
      ramp(volume, 0.6);
    });
  }
  function stop(): void {
    if (!node) return;
    const n = node;
    node = null;
    ramp(0, 0.4);
    window.setTimeout(() => {
      try {
        n.stop();
      } catch {
        // 이미 멈춤
      }
      try {
        n.disconnect();
      } catch {
        // 무시
      }
    }, 500);
  }
  void fetchRaw();

  const api = {
    play,
    setEnabled(on: boolean) {
      enabled = !!on;
      if (enabled) play();
      else stop();
    },
    get enabled() {
      return enabled;
    },
    get playing() {
      return !!node;
    },
    get state() {
      return ctx ? ctx.state : "none";
    },
  };
  instances.push(api);
  (window as unknown as { __ethicityBgm?: Bgm }).__ethicityBgm = api; // 자동 점검용
  return api;
}
