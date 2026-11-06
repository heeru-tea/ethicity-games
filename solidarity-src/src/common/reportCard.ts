// 탐험 보고서 카드 — 캔버스 한 장(가로 1080)에 결과를 그려 화면에 보여 주고 PNG로 저장한다.
// safety/transparency 의 report-card.js 와 같은 모양(머리띠·숫자 타일·절·AI 한마디·기억할 한 문장).
import type { CharacterId, Expression } from "./pack";

export interface ReportStat {
  label: string;
  value: string | number;
  color?: string;
}
export interface ReportSection {
  heading: string;
  lines?: string[];
  rows?: Array<[string, string]>;
}
export interface ReportPortrait {
  id: CharacterId;
  expression?: Expression;
}
export interface ReportOpts {
  concept: string;
  game: string;
  title: string;
  nick?: string;
  who?: string;
  date?: string;
  portrait?: ReportPortrait;
  stats?: ReportStat[];
  sections?: ReportSection[];
  ai?: { name: string; text: string; portrait?: ReportPortrait };
  remember?: string;
  footer?: string;
  filename: string;
}
export type PortraitDrawer = (ctx: CanvasRenderingContext2D, id: string, expression: string, x: number, y: number, size: number) => void;

const INK = "#294b40";
const CREAM = "#fff9e7";
const PAPER = "#f2e7c7";
const GREEN = "#5a8c65";
const GOLD = "#f3cf72";
const LINE = "#b3c19c";
const MUTED = "#4d6457";
const LIGHT = "#e6edda";
const FONT = 'Ethicity, "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
const W = 1080;
const P = 56;

type Block = (ctx: CanvasRenderingContext2D, y: number, dry: boolean) => number;

function font(ctx: CanvasRenderingContext2D, size: number, bold: boolean) {
  ctx.font = `${bold ? "700" : "400"} ${size}px ${FONT}`;
}
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = [];
  for (const para of String(text ?? "").split("\n")) {
    let cur = "";
    for (const ch of para) {
      const t = cur + ch;
      if (ctx.measureText(t).width > maxW && cur) {
        lines.push(cur.replace(/\s+$/, ""));
        cur = ch === " " ? "" : ch;
      } else cur = t;
    }
    lines.push(cur);
  }
  return lines;
}
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, stroke?: string, r = 14) {
  rr(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = 4;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}
function textLines(ctx: CanvasRenderingContext2D, lines: string[], x: number, y: number, lh: number, color = INK, align: CanvasTextAlign = "left") {
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  lines.forEach((ln, i) => ctx.fillText(ln, x, y + i * lh));
  return lines.length * lh;
}
function today() {
  const d = new Date();
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
}

function build(opts: ReportOpts, draw: PortraitDrawer | null): Block[] {
  const cw = W - P * 2;
  const blocks: Block[] = [];
  const portrait = (p: ReportPortrait | undefined, ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    if (!p || !draw) return;
    try {
      draw(ctx, p.id, p.expression ?? "neutral", x, y, size);
    } catch {
      /* 초상 없음 */
    }
  };
  blocks.push((ctx, _y, dry) => {
    const h = 190;
    if (!dry) {
      ctx.fillStyle = INK;
      ctx.fillRect(0, 0, W, h);
      ctx.fillStyle = GOLD;
      ctx.fillRect(0, h - 10, W, 10);
      font(ctx, 24, true);
      textLines(ctx, [`윤리시티 · AI 윤리 탐험대 · ${opts.concept}`], P, 36, 30, GOLD);
      font(ctx, 44, true);
      textLines(ctx, wrap(ctx, opts.title, cw - 180).slice(0, 2), P, 74, 52, CREAM);
      if (opts.portrait) {
        box(ctx, W - P - 128, 28, 128, 128, CREAM, GOLD, 16);
        portrait(opts.portrait, ctx, W - P - 120, 36, 112);
      }
    }
    return h;
  });
  blocks.push((ctx, y, dry) => {
    const h = 70;
    if (!dry) {
      font(ctx, 26, true);
      const left = opts.nick ? `${opts.nick}${opts.who ? ` (${opts.who})` : ""}` : (opts.who ?? "");
      textLines(ctx, [left], P, y + 22, 30, INK);
      font(ctx, 22, false);
      textLines(ctx, [opts.date ?? today()], W - P, y + 26, 26, MUTED, "right");
      ctx.fillStyle = LINE;
      ctx.fillRect(P, y + h - 4, cw, 3);
    }
    return h;
  });
  if (opts.stats?.length) {
    const stats = opts.stats;
    blocks.push((ctx, y, dry) => {
      const n = stats.length;
      const cols = Math.min(4, n);
      const rows = Math.ceil(n / cols);
      const gap = 16;
      const tw = (cw - gap * (cols - 1)) / cols;
      const th = 124;
      const h = rows * th + (rows - 1) * gap + 28;
      if (!dry)
        stats.forEach((s, i) => {
          const cx = P + (i % cols) * (tw + gap);
          const cy = y + 14 + Math.floor(i / cols) * (th + gap);
          box(ctx, cx, cy, tw, th, CREAM, LINE, 12);
          ctx.fillStyle = s.color ?? GREEN;
          ctx.fillRect(cx + 4, cy + 4, tw - 8, 8);
          font(ctx, 46, true);
          textLines(ctx, [String(s.value)], cx + tw / 2, cy + 28, 50, INK, "center");
          font(ctx, 20, false);
          textLines(ctx, [wrap(ctx, s.label, tw - 16)[0]], cx + tw / 2, cy + 86, 24, MUTED, "center");
        });
      return h;
    });
  }
  for (const sec of opts.sections ?? []) {
    blocks.push((ctx, y, dry) => {
      let h = 20;
      font(ctx, 28, true);
      if (!dry) {
        ctx.fillStyle = GREEN;
        ctx.fillRect(P, y + 20, 10, 30);
        textLines(ctx, [sec.heading], P + 22, y + 18, 34, INK);
      }
      h += 50;
      if (sec.rows) {
        font(ctx, 23, false);
        sec.rows.forEach((r, i) => {
          const vl = wrap(ctx, r[1], cw * 0.64 - 24);
          const rh = Math.max(44, vl.length * 30 + 14);
          if (!dry) {
            ctx.fillStyle = i % 2 ? CREAM : LIGHT;
            ctx.fillRect(P, y + h, cw, rh);
            font(ctx, 23, true);
            textLines(ctx, [r[0]], P + 16, y + h + 9, 30, INK);
            font(ctx, 23, false);
            textLines(ctx, vl, W - P - 16, y + h + 9, 30, INK, "right");
          }
          h += rh;
        });
        if (!dry) {
          ctx.lineWidth = 3;
          ctx.strokeStyle = LINE;
          ctx.strokeRect(P, y + 70, cw, h - 70);
        }
      } else {
        font(ctx, 24, false);
        for (const line of sec.lines ?? []) {
          const ll = wrap(ctx, line, cw - 40);
          if (!dry) {
            ctx.fillStyle = GREEN;
            ctx.fillRect(P + 8, y + h + 12, 10, 10);
            textLines(ctx, ll, P + 32, y + h, 34, INK);
          }
          h += ll.length * 34 + 6;
        }
      }
      return h + 10;
    });
  }
  if (opts.ai) {
    const ai = opts.ai;
    blocks.push((ctx, y, dry) => {
      font(ctx, 24, false);
      const tl = wrap(ctx, ai.text, cw - 170 - 48);
      const bh = Math.max(150, tl.length * 34 + 70);
      if (!dry) {
        box(ctx, P, y + 20, cw, bh, CREAM, INK, 16);
        box(ctx, P + 24, y + 44, 104, 104, PAPER, INK, 10);
        portrait(ai.portrait, ctx, P + 28, y + 48, 96);
        font(ctx, 22, true);
        textLines(ctx, [`${ai.name}의 한마디 · ${opts.concept}이란?`], P + 150, y + 40, 28, GREEN);
        font(ctx, 24, false);
        textLines(ctx, tl, P + 150, y + 76, 34, INK);
      }
      return bh + 36;
    });
  }
  if (opts.remember) {
    const remember = opts.remember;
    blocks.push((ctx, y, dry) => {
      font(ctx, 30, true);
      const tl = wrap(ctx, remember, cw - 80);
      const bh = tl.length * 42 + 76;
      if (!dry) {
        box(ctx, P, y + 12, cw, bh, GOLD, INK, 16);
        font(ctx, 20, true);
        textLines(ctx, ["기억할 한 문장"], W / 2, y + 30, 26, INK, "center");
        font(ctx, 30, true);
        textLines(ctx, tl, W / 2, y + 62, 42, INK, "center");
      }
      return bh + 24;
    });
  }
  blocks.push((ctx, y, dry) => {
    const h = 64;
    if (!dry) {
      ctx.fillStyle = INK;
      ctx.fillRect(0, y + 12, W, h - 12);
      font(ctx, 20, false);
      textLines(ctx, [opts.footer ?? `윤리시티 · ${opts.game} · 이 카드는 이 기기에서만 만들어졌어요`], W / 2, y + 30, 24, CREAM, "center");
    }
    return h;
  });
  return blocks;
}

export function renderReportCard(opts: ReportOpts, draw: PortraitDrawer | null): HTMLCanvasElement {
  const blocks = build(opts, draw);
  const m = document.createElement("canvas");
  const mctx = m.getContext("2d")!;
  let total = 0;
  for (const b of blocks) total += b(mctx, total, true);
  const c = document.createElement("canvas");
  const scale = 2;
  c.width = W * scale;
  c.height = Math.ceil(total) * scale;
  const ctx = c.getContext("2d")!;
  ctx.scale(scale, scale);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, total);
  let y = 0;
  for (const b of blocks) y += b(ctx, y, false);
  return c;
}

export function reportFontsReady(): Promise<void> {
  if (!document.fonts?.load) return Promise.resolve();
  return Promise.all([document.fonts.load("700 30px Ethicity"), document.fonts.load("400 24px Ethicity")]).then(
    () => undefined,
    () => undefined,
  );
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string): void {
  const name = `${filename}.png`;
  const done = (url: string, revoke: boolean) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (revoke) setTimeout(() => URL.revokeObjectURL(url), 4000);
  };
  if (canvas.toBlob) {
    canvas.toBlob((b) => {
      if (b) done(URL.createObjectURL(b), true);
      else done(canvas.toDataURL("image/png"), false);
    }, "image/png");
  } else done(canvas.toDataURL("image/png"), false);
}
