import { commonUrl, manifest, type SoundId } from "../../common/pack";
import { createBgm, type Bgm } from "./bgm";

// 효과음 — 공통 팩 effects/audio 7종(collect·miss·tap·door·win·paper·retry)만 쓴다.
// 배경음악은 assets/bgm.mp3(수노 「Pixel Town Suite」 교실 구간)를 선생님 화면(?teach)에서만 튼다 — bgm.ts 참고.
// 소리 설정은 ethicity.solidarity.sound 에 저장하며, 배경음악도 같은 버튼으로 켜고 끈다.

const SOUND_KEY = "ethicity.solidarity.sound";

export type SfxName = SoundId;

const VOLUME: Record<SfxName, number> = {
  tap: 0.45,
  paper: 0.5,
  collect: 0.5,
  miss: 0.4,
  door: 0.45,
  win: 0.55,
  retry: 0.45,
};

const cache = new Map<string, HTMLAudioElement>();

let bgm: Bgm | null = null;
function isTeacherScreen(): boolean {
  try {
    return new URLSearchParams(window.location.search).has("teach");
  } catch {
    return false;
  }
}
/** 선생님 화면이면 배경음악을 준비하고 현재 소리 설정에 맞춘다. 학생 화면은 아무것도 하지 않는다. */
export function initBgm(): void {
  if (bgm || !isTeacherScreen()) return;
  bgm = createBgm("./assets/bgm.mp3", { volume: 0.25, loopEnd: 39.68 });
  bgm.setEnabled(soundEnabled());
}

export function soundEnabled(): boolean {
  try {
    return window.localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean): void {
  try {
    window.localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {
    // 저장 실패는 무시
  }
  if (bgm) bgm.setEnabled(on);
}

export function playSfx(name: SfxName): void {
  if (!soundEnabled()) return;
  try {
    const rel = manifest()?.sounds?.[name];
    if (!rel) return;
    let base = cache.get(name);
    if (!base) {
      base = new Audio(commonUrl(rel));
      base.preload = "auto";
      cache.set(name, base);
    }
    const node = base.cloneNode(true) as HTMLAudioElement;
    node.volume = VOLUME[name];
    void node.play().catch(() => {
      // 사용자 조작 전 자동재생 차단 등은 조용히 무시
    });
  } catch {
    // 오디오 미지원 환경에서도 게임은 계속된다
  }
}
