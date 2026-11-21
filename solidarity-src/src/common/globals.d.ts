// 공통 팩 runtime/manifest.js · runtime/common.js 가 전역에 올려 두는 값의 타입.

export interface CommonCharacter {
  name: string;
  walk: string;
  portraits: string;
  directions: Array<"down" | "left" | "right" | "up">;
  expressions: Array<"neutral" | "happy" | "worried" | "explaining">;
}

export interface CommonManifest {
  id: string;
  version: string;
  style: { palette: Record<string, string> };
  characters: Record<string, CommonCharacter>;
  backgrounds: Record<string, { name: string; image: string }>;
  props: { image: string; frames: Record<string, { x: number; y: number; w: number; h: number }> };
  icons: { image: string; icons: Record<string, { x: number; y: number; w: number; h: number }> };
  effects: {
    image: string;
    effects: Record<string, { row: number; frames: number; durationMs: number }>;
  };
  sounds: Record<string, string>;
}

export interface CommonAssets {
  drawBackground(ctx: CanvasRenderingContext2D, id: string, w?: number, h?: number): void;
  drawCharacter(
    ctx: CanvasRenderingContext2D,
    id: string,
    x: number,
    y: number,
    direction?: string,
    frame?: number,
    scale?: number,
  ): void;
  drawPortrait(
    ctx: CanvasRenderingContext2D,
    id: string,
    expression?: string,
    x?: number,
    y?: number,
    size?: number,
  ): void;
  drawIcon(ctx: CanvasRenderingContext2D, id: string, x: number, y: number, size?: number): void;
  drawEffect(
    ctx: CanvasRenderingContext2D,
    id: string,
    x: number,
    y: number,
    elapsedMs: number,
    size?: number,
    reducedMotion?: boolean,
  ): boolean;
  drawProp(ctx: CanvasRenderingContext2D, id: string, x: number, y: number, height?: number): void;
  setSound(on: boolean): void;
  playSound(id: string): Promise<boolean>;
}

declare global {
  interface Window {
    ETHICITY_COMMON_MANIFEST: CommonManifest;
    EthicityAssets: {
      load(manifest: CommonManifest, base: string): Promise<CommonAssets>;
    };
  }
}
