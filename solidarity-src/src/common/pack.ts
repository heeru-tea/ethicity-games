import { useEffect, useState } from "react";
import type { CommonAssets, CommonManifest } from "./globals";

// 공통 팩 연결 — ../shared/ethicity-elementary-common-v1 을 런타임에 그대로 쓴다.
// 이 게임 폴더(solidarity/)가 shared/ 와 형제이므로 COMMON_BASE 는 한 단계 위다.

export const GAME_ID = "solidarity";
export const COMMON_BASE = "../shared/ethicity-elementary-common-v1";

export type CharacterId =
  | "jiho"
  | "haneul"
  | "saebom"
  | "onyu"
  | "daon"
  | "teacher"
  | "librarian"
  | "robot";
export type Expression = "neutral" | "happy" | "worried" | "explaining";
export type Direction = "down" | "left" | "right" | "up";
export type BackgroundId = "courtyard" | "classroom" | "library" | "cafeteria" | "nurse" | "ai_lab";
export type IconId =
  | "home" | "inspect" | "notebook" | "key" | "lock" | "check" | "retry" | "close"
  | "pause" | "play" | "music" | "volume" | "person" | "robot" | "clue" | "help"
  | "exit" | "warning" | "heart" | "timer" | "map" | "settings" | "arrow_left" | "arrow_right";
export type EffectId = "clue" | "correct" | "retry" | "key" | "unlock";
export type SoundId = "collect" | "miss" | "tap" | "door" | "win" | "paper" | "retry";

/** 공통 학생 캐릭터 5명 — 배달 미니게임·장면에서 돌려 쓴다. */
export const STUDENT_IDS: CharacterId[] = ["jiho", "haneul", "saebom", "onyu", "daon"];

export function manifest(): CommonManifest {
  return window.ETHICITY_COMMON_MANIFEST;
}

export function commonUrl(relative: string): string {
  return `${COMMON_BASE}/${relative}`;
}

export function characterName(id: CharacterId): string {
  return manifest()?.characters?.[id]?.name ?? id;
}

let assetsPromise: Promise<CommonAssets | null> | null = null;

/** EthicityAssets.load 를 한 번만 수행한다. 실패해도 게임은 CSS 스프라이트로 계속된다. */
export function loadAssets(): Promise<CommonAssets | null> {
  if (!assetsPromise) {
    assetsPromise = (async () => {
      try {
        if (!window.EthicityAssets || !window.ETHICITY_COMMON_MANIFEST) return null;
        return await window.EthicityAssets.load(window.ETHICITY_COMMON_MANIFEST, COMMON_BASE);
      } catch {
        return null;
      }
    })();
  }
  return assetsPromise;
}

export function useAssets(): CommonAssets | null {
  const [assets, setAssets] = useState<CommonAssets | null>(null);
  useEffect(() => {
    let alive = true;
    void loadAssets().then((a) => {
      if (alive) setAssets(a);
    });
    return () => {
      alive = false;
    };
  }, []);
  return assets;
}

// ── 내 아바타 (학생이 고르는 공통 캐릭터, 서버로 보내지 않음) ─────
export type AvatarId = "jiho" | "haneul";
export const AVATAR_IDS: AvatarId[] = ["jiho", "haneul"];
const AVATAR_KEY = "ethicity.solidarity.avatar";

export function getAvatar(): AvatarId {
  try {
    const v = window.localStorage.getItem(AVATAR_KEY);
    return v === "haneul" ? "haneul" : "jiho";
  } catch {
    return "jiho";
  }
}

export function setAvatar(id: AvatarId): void {
  try {
    window.localStorage.setItem(AVATAR_KEY, id);
  } catch {
    // 저장 실패는 무시
  }
}

/** 내 아바타를 뺀 나머지 공통 학생 3~4명 (반 친구 역할). */
export function classmates(me: CharacterId, n = 3): CharacterId[] {
  return STUDENT_IDS.filter((id) => id !== me).slice(0, n);
}

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

// ── 게임 전용 자산 (assets/manifest.json) ────────────────────
// 요금제 카드·이용권·도우미실 그림은 아직 납품 전이라 게임이 직접 그린다.
// 같은 id 의 PNG 가 manifest 에 등록되면 그 파일을 우선 쓴다.

export type GameImageId =
  | "sd_plan_free"
  | "sd_plan_lite"
  | "sd_plan_plus"
  | "sd_plan_pro"
  | "sd_plan_promax"
  | "sd_exam_sheet"
  | "sd_report_sheet"
  | "sd_ticket"
  | "sd_helpdesk"
  | "sd_rule_board"
  | "sd_vote_hand"
  | "sd_future_card";

interface GameManifest {
  images?: Record<string, { file?: string | null }>;
}

let gameManifestPromise: Promise<GameManifest> | null = null;
const resolvedImages = new Map<string, string | null>();

function loadGameManifest(): Promise<GameManifest> {
  if (!gameManifestPromise) {
    gameManifestPromise = fetch("assets/manifest.json", { cache: "no-cache" })
      .then((r) => (r.ok ? (r.json() as Promise<GameManifest>) : {}))
      .catch(() => ({}));
  }
  return gameManifestPromise;
}

/** 등록된 파일이 실제로 로드되면 그 주소를, 아니면 null 을 돌려준다. */
export async function resolveGameImage(id: GameImageId): Promise<string | null> {
  if (resolvedImages.has(id)) return resolvedImages.get(id) ?? null;
  const m = await loadGameManifest();
  const file = m.images?.[id]?.file;
  if (!file) {
    resolvedImages.set(id, null);
    return null;
  }
  const ok = await new Promise<boolean>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = file;
  });
  resolvedImages.set(id, ok ? file : null);
  return ok ? file : null;
}

export function useGameImage(id: GameImageId): string | null {
  const [src, setSrc] = useState<string | null>(() => resolvedImages.get(id) ?? null);
  useEffect(() => {
    let alive = true;
    void resolveGameImage(id).then((s) => {
      if (alive) setSrc(s);
    });
    return () => {
      alive = false;
    };
  }, [id]);
  return src;
}

// 캔버스(장면)에 그릴 때 쓰는 이미지 요소 캐시
const imageEls = new Map<string, HTMLImageElement>();

export async function loadGameImageEl(id: GameImageId): Promise<HTMLImageElement | null> {
  const cached = imageEls.get(id);
  if (cached) return cached;
  const src = await resolveGameImage(id);
  if (!src) return null;
  const img = new Image();
  img.src = src;
  if (!img.complete) {
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
    });
  }
  if (!img.naturalWidth) return null;
  imageEls.set(id, img);
  return img;
}

export function useGameImages(ids: GameImageId[]): Partial<Record<GameImageId, HTMLImageElement>> {
  const key = ids.join(",");
  const [map, setMap] = useState<Partial<Record<GameImageId, HTMLImageElement>>>({});
  useEffect(() => {
    let alive = true;
    void Promise.all(ids.map((id) => loadGameImageEl(id).then((el) => [id, el] as const))).then((pairs) => {
      if (!alive) return;
      const next: Partial<Record<GameImageId, HTMLImageElement>> = {};
      for (const [id, el] of pairs) if (el) next[id] = el;
      setMap(next);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return map;
}
