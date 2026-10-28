import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import {
  commonUrl,
  manifest,
  prefersReducedMotion,
  useAssets,
  useGameImage,
  useGameImages,
  type BackgroundId,
  type CharacterId,
  type Direction,
  type EffectId,
  type Expression,
  type GameImageId,
  type IconId,
} from "./pack";
import { PLANS, type PlanId } from "../game/exam/content";

// 공통 팩 그림을 React 에서 쓰는 작은 부품들.
// 표정·걷기·아이콘은 공통 PNG 를 CSS 스프라이트로 자르고(새로 그리지 않음),
// 장면과 피드백 효과는 runtime/common.js 의 EthicityAssets 로 캔버스에 그린다.

/**
 * 픽셀 그림의 렌더링 방식. 원본 칸 크기의 정수 배·정수 분의 1 로 보일 때만 `ee-pixel`(nearest) 을 쓰고,
 * 그 밖의 배율(태블릿 DPR 2 에서 깨져 보이는 경우)은 `sd-smooth` 로 부드럽게 줄인다.
 */
export function pixelClass(cell: number, size: number): string {
  if (!cell || !size) return "sd-smooth";
  const up = size / cell;
  const down = cell / size;
  const isInt = (v: number) => Math.abs(v - Math.round(v)) < 0.001;
  return isInt(up) || isInt(down) ? "ee-pixel" : "sd-smooth";
}
const PORTRAIT_CELL = 256;
const WALK_W = 96;
const ICON_CELL = 64;

/** 대화창 얼굴 — characters/[id]-portraits.png 의 4표정 중 하나. */
export function Portrait({
  id,
  expression = "neutral",
  size = 64,
  label,
  className,
}: {
  id: CharacterId;
  expression?: Expression;
  size?: number;
  label?: string;
  className?: string;
}) {
  const c = manifest()?.characters?.[id];
  if (!c) return null;
  const i = Math.max(0, c.expressions.indexOf(expression));
  const style: CSSProperties = {
    width: size,
    height: size,
    backgroundImage: `url("${commonUrl(c.portraits)}")`,
    backgroundSize: `${size * 4}px ${size}px`,
    backgroundPosition: `-${i * size}px 0`,
  };
  return (
    <span
      className={`sd-sprite ${pixelClass(PORTRAIT_CELL, size)}${className ? ` ${className}` : ""}`}
      style={style}
      role="img"
      aria-label={label ?? c.name}
    />
  );
}

/** 지도용 서 있는 모습 — characters/[id]-walk.png 의 1번 프레임. */
export function Standing({
  id,
  direction = "down",
  frame = 1,
  scale = 0.5,
  label,
}: {
  id: CharacterId;
  direction?: Direction;
  frame?: number;
  scale?: number;
  label?: string;
}) {
  const c = manifest()?.characters?.[id];
  if (!c) return null;
  const row = Math.max(0, c.directions.indexOf(direction));
  const w = Math.round(96 * scale);
  const h = Math.round(128 * scale);
  const style: CSSProperties = {
    width: w,
    height: h,
    backgroundImage: `url("${commonUrl(c.walk)}")`,
    backgroundSize: `${w * 4}px ${h * 4}px`,
    backgroundPosition: `-${frame * w}px -${row * h}px`,
  };
  return (
    <span className={`sd-sprite ${pixelClass(WALK_W, w)}`} style={style} role="img" aria-label={label ?? c.name} />
  );
}

/** 공통 아이콘 24종 — ui/icons.png (512×192, 셀 64). */
export function Icon({
  id,
  size = 32,
  label,
  className,
}: {
  id: IconId;
  size?: number;
  label?: string;
  className?: string;
}) {
  const m = manifest();
  const f = m?.icons?.icons?.[id];
  if (!f) return null;
  const k = size / 64;
  const style: CSSProperties = {
    width: size,
    height: size,
    backgroundImage: `url("${commonUrl(m.icons.image)}")`,
    backgroundSize: `${512 * k}px ${192 * k}px`,
    backgroundPosition: `-${f.x * k}px -${f.y * k}px`,
  };
  return (
    <span
      className={`sd-sprite ee-icon ${pixelClass(ICON_CELL, size)}${className ? ` ${className}` : ""}`}
      style={style}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}

/** 피드백 효과 — effects/feedback.png 8프레임을 0.8초 한 번 재생. `token` 이 바뀔 때마다 다시 뜬다. */
export function Effect({
  id,
  token,
  size = 72,
  className,
}: {
  id: EffectId;
  token: number | string | null;
  size?: number;
  className?: string;
}) {
  const assets = useAssets();
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !assets || token === null) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = prefersReducedMotion();
    const start = performance.now();
    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, size, size);
      const elapsed = reduced ? 300 : performance.now() - start;
      const alive = assets.drawEffect(ctx, id, size / 2, size / 2, elapsed, size, reduced);
      if (alive && !reduced) raf = requestAnimationFrame(draw);
      else if (reduced) {
        setTimeout(() => ctx.clearRect(0, 0, size, size), 600);
      }
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [assets, id, token, size]);

  return (
    <canvas
      ref={ref}
      width={size}
      height={size}
      className={`sd-effect ee-pixel${className ? ` ${className}` : ""}`}
      aria-hidden
    />
  );
}

export interface SceneActor {
  id: CharacterId;
  x: number;
  y: number;
  direction?: Direction;
  frame?: number;
  scale?: number;
}

export interface SceneProp {
  id: string;
  x: number;
  y: number;
  height?: number;
}

/** 게임 전용 그림(코덱스 납품 소품)을 발 기준점(아래 가운데)으로 장면에 올린다. */
export interface SceneExtra {
  image: GameImageId;
  x: number;
  y: number;
  height: number;
}

/**
 * 장면 그림 — 공통 배경 1280×720 위에 공통 캐릭터·소품을 올린다.
 * `crop` 이 있으면 세로 가운데 부분만 잘라 가로로 긴 띠 그림을 만든다.
 */
export function Scene({
  background,
  actors = [],
  props = [],
  extras = [],
  crop,
  label,
  className,
  children,
}: {
  background: BackgroundId;
  actors?: SceneActor[];
  props?: SceneProp[];
  extras?: SceneExtra[];
  crop?: { y: number; height: number };
  label: string;
  className?: string;
  /** 장면 위에 얹는 HTML(말풍선·버튼). 좌표는 % 로 둔다. */
  children?: ReactNode;
}) {
  const assets = useAssets();
  const ref = useRef<HTMLCanvasElement>(null);
  const H = crop?.height ?? 720;
  const offsetY = crop?.y ?? 0;

  const extraImages = useGameImages(extras.map((e) => e.image));
  const key = useMemo(
    () => JSON.stringify({ background, actors, props, extras, crop }),
    [background, actors, props, extras, crop],
  );

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !assets) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.clearRect(0, 0, 1280, H);
    ctx.translate(0, -offsetY);
    try {
      assets.drawBackground(ctx, background, 1280, 720);
      const items: Array<{ y: number; draw: () => void }> = [];
      for (const p of props) {
        items.push({ y: p.y, draw: () => assets.drawProp(ctx, p.id, p.x, p.y, p.height ?? 120) });
      }
      for (const e of extras) {
        const img = extraImages[e.image];
        if (!img) continue;
        const w = (e.height * img.naturalWidth) / img.naturalHeight;
        items.push({
          y: e.y,
          draw: () => {
            // 납품 256px 그림을 150px 로 줄여 그린다 — 정수 배가 아니므로 부드럽게.
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, e.x - w / 2, e.y - e.height, w, e.height);
            ctx.imageSmoothingEnabled = false;
          },
        });
      }
      for (const a of actors) {
        items.push({
          y: a.y,
          draw: () =>
            assets.drawCharacter(ctx, a.id, a.x, a.y, a.direction ?? "down", a.frame ?? 1, a.scale ?? 0.85),
        });
      }
      items.sort((a, b) => a.y - b.y).forEach((i) => i.draw());
    } finally {
      ctx.restore();
    }
  }, [assets, key, H, offsetY, background, actors, props, extras, extraImages]);

  const canvas = (
    <canvas
      ref={ref}
      width={1280}
      height={H}
      className={`sd-scene sd-smooth${className && !children ? ` ${className}` : ""}`}
      style={{ aspectRatio: `1280 / ${H}` }}
      role="img"
      aria-label={label}
    />
  );
  if (!children) return canvas;
  return (
    <div className={`sd-scenebox${className ? ` ${className}` : ""}`}>
      {canvas}
      <div className="sd-scenelayer">{children}</div>
    </div>
  );
}

/** 장면 좌표(1280 × H)를 % 위치로 바꾼다. */
export function pct(x: number, y: number, h: number): CSSProperties {
  return { left: `${(x / 1280) * 100}%`, top: `${(y / h) * 100}%` };
}

// ── 게임 전용 임시 그림 (코덱스 납품 전) ─────────────────────

const PLAN_TONE: Record<PlanId, { band: string; text: string; dots: number }> = {
  free: { band: "#a8bb8c", text: "#294b40", dots: 1 },
  lite: { band: "#72b7c4", text: "#294b40", dots: 2 },
  plus: { band: "#5a8c65", text: "#fff9e7", dots: 3 },
  pro: { band: "#f3cf72", text: "#294b40", dots: 4 },
  promax: { band: "#bf7865", text: "#fff9e7", dots: 5 },
};

function drawPlanCard(ctx: CanvasRenderingContext2D, plan: PlanId) {
  const W = 168;
  const H = 232;
  const p = PLANS[plan];
  const tone = PLAN_TONE[plan];
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, W, H);
  // 바깥 잉크 테두리 + 크림 속
  ctx.fillStyle = "#294b40";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#fff9e7";
  ctx.fillRect(4, 4, W - 8, H - 8);
  // 색 띠
  ctx.fillStyle = tone.band;
  ctx.fillRect(4, 4, W - 8, 64);
  ctx.fillStyle = "#294b40";
  ctx.fillRect(4, 68, W - 8, 4);
  // 모서리 픽셀 장식
  ctx.fillStyle = "#f3cf72";
  for (const [x, y] of [
    [12, 12],
    [W - 20, 12],
    [12, H - 20],
    [W - 20, H - 20],
  ]) {
    ctx.fillRect(x, y, 8, 8);
  }
  // 글자
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = tone.text;
  ctx.font = "700 20px Ethicity, 'Malgun Gothic', sans-serif";
  ctx.fillText(p.shortName, W / 2, 38);
  ctx.fillStyle = "#294b40";
  ctx.font = "700 14px Ethicity, 'Malgun Gothic', sans-serif";
  ctx.fillText("루미AI 요금제", W / 2, 96);
  ctx.font = "14px Ethicity, 'Malgun Gothic', sans-serif";
  ctx.fillText(p.price, W / 2, 122);
  // 등급 점 5개
  for (let i = 0; i < 5; i++) {
    const x = 36 + i * 24;
    ctx.fillStyle = i < tone.dots ? tone.band : "#f2e7c7";
    ctx.fillRect(x, 150, 16, 16);
    ctx.strokeStyle = "#294b40";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, 151, 14, 14);
  }
  ctx.fillStyle = "#5a8c65";
  ctx.font = "13px Ethicity, 'Malgun Gothic', sans-serif";
  ctx.fillText(p.aiCalls > 90 ? "질문 무제한" : `질문 ${p.aiCalls}회`, W / 2, 190);
  ctx.fillText(p.adSeconds > 0 ? `광고 ${p.adSeconds}초` : "광고 없음", W / 2, 210);
}

/** 요금제 카드 — assets/manifest.json 에 sd_plan_* PNG 가 있으면 그 파일, 없으면 임시 픽셀 카드. */
export function PlanCard({ plan, width = 168, className }: { plan: PlanId; width?: number; className?: string }) {
  const src = useGameImage(`sd_plan_${plan}` as GameImageId);
  const ref = useRef<HTMLCanvasElement>(null);
  const alt = `${PLANS[plan].name} 카드`;
  useEffect(() => {
    if (src) return;
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const draw = () => drawPlanCard(ctx, plan);
    draw();
    // 글꼴이 늦게 오면 한 번 더 그린다
    if (document.fonts?.ready) void document.fonts.ready.then(draw);
  }, [plan, src]);
  if (src) {
    // 납품 카드에는 글자가 없다. 이름·월 요금은 게임이 겹쳐 쓴다.
    return (
      <span
        className={`sd-plancard sd-plancard--img${className ? ` ${className}` : ""}`}
        style={{ width }}
        role="img"
        aria-label={alt}
      >
        <img src={src} alt="" className="sd-smooth" draggable={false} />
        <span className="sd-plancard__name">{PLANS[plan].shortName}</span>
        <span className="sd-plancard__price">{PLANS[plan].price}</span>
      </span>
    );
  }
  return (
    <canvas
      ref={ref}
      width={168}
      height={232}
      className={`sd-plancard ${pixelClass(168, width)}${className ? ` ${className}` : ""}`}
      style={{ width, height: Math.round((width * 232) / 168) }}
      role="img"
      aria-label={alt}
    />
  );
}

function drawTicket(ctx: CanvasRenderingContext2D, on: boolean) {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, 32, 40);
  ctx.fillStyle = on ? "#294b40" : "#b3c19c";
  ctx.fillRect(2, 2, 28, 36);
  ctx.fillStyle = on ? "#f3cf72" : "#f2e7c7";
  ctx.fillRect(5, 5, 22, 30);
  // 절취선 구멍
  ctx.fillStyle = on ? "#294b40" : "#b3c19c";
  ctx.fillRect(0, 18, 6, 4);
  ctx.fillRect(26, 18, 6, 4);
  // 글자 대신 가로줄 2개
  ctx.fillStyle = on ? "#294b40" : "#b3c19c";
  ctx.fillRect(9, 11, 14, 3);
  ctx.fillRect(9, 26, 14, 3);
}

/** 이용권 — sd_ticket PNG 가 있으면 그 파일, 없으면 임시 픽셀 이용권. */
export function Ticket({ on, size = 32 }: { on: boolean; size?: number }) {
  const src = useGameImage("sd_ticket");
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (src) return;
    const ctx = ref.current?.getContext("2d");
    if (ctx) drawTicket(ctx, on);
  }, [on, src]);
  const h = Math.round((size * 40) / 32);
  if (src) {
    return (
      <img
        src={src}
        alt=""
        aria-hidden
        className="sd-ticket sd-smooth"
        style={{ width: Math.round(size * 1.3), height: Math.round(size * 1.3), opacity: on ? 1 : 0.3 }}
        draggable={false}
      />
    );
  }
  return (
    <canvas ref={ref} width={32} height={40} className="sd-ticket ee-pixel" style={{ width: size, height: h }} aria-hidden />
  );
}

/** 도우미실 장면 — 공통 AI 실습실 + 납품 도움 창구 책상(sd_helpdesk) + 안내 로봇. */
export function HelpdeskBanner() {
  return (
    <Scene
      background="ai_lab"
      crop={{ y: 160, height: 480 }}
      extras={[{ image: "sd_helpdesk", x: 1040, y: 560, height: 150 }]}
      actors={[
        { id: "robot", x: 1040, y: 500, direction: "down", scale: 0.66 },
        { id: "saebom", x: 860, y: 560, direction: "right", scale: 0.85 },
        { id: "onyu", x: 700, y: 560, direction: "right", scale: 0.85 },
        { id: "daon", x: 540, y: 560, direction: "right", scale: 0.85 },
      ]}
      label="학교 AI 도우미실 — 도움 창구 앞에 친구들이 줄을 선다"
    />
  );
}

/** 납품 종이·카드 위에 글자를 겹쳐 보여 주는 공용 틀. 파일이 없으면 공통 .ee-panel 로 대신한다. */
function PaperCard({
  image,
  width,
  label,
  className,
  children,
}: {
  image: GameImageId;
  width: number;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const src = useGameImage(image);
  if (!src) {
    return (
      <div
        className={`ee-panel sd-paper sd-paper--fallback${className ? ` ${className}` : ""}`}
        style={{ width }}
        role="img"
        aria-label={label}
      >
        {children}
      </div>
    );
  }
  return (
    <div className={`sd-paper${className ? ` ${className}` : ""}`} style={{ width }} role="img" aria-label={label}>
      <img src={src} alt="" className="sd-smooth" draggable={false} />
      <div className="sd-paper__text">{children}</div>
    </div>
  );
}

/** 시험지 — 현재 문항 번호를 빈 답란 위에 겹쳐 쓴다. */
export function ExamSheet({ current, total, width = 96 }: { current: number; total: number; width?: number }) {
  return (
    <PaperCard image="sd_exam_sheet" width={width} label={`시험지 ${current} / ${total}`} className="sd-paper--exam">
      <span className="sd-paper__big">
        {current}
        <small> / {total}</small>
      </span>
    </PaperCard>
  );
}

/** 성적표 종이 — 빈 점수 칸에 내 점수를 쓴다. */
export function ReportSheet({ score, avg, width = 200 }: { score: number; avg: number; width?: number }) {
  return (
    <PaperCard
      image="sd_report_sheet"
      width={width}
      label={`내 점수 ${score}점, 반 평균 ${avg}점`}
      className="sd-paper--report"
    >
      <span className="sd-paper__big">
        {score}
        <small>점</small>
      </span>
      <span className="sd-paper__sub">반 평균 {avg}점</span>
    </PaperCard>
  );
}

/** 다음 학년에게 남기는 편지 카드 — 우리 반의 한 줄을 적는다. */
export function FutureCard({ text, width = 220 }: { text: string; width?: number }) {
  return (
    <PaperCard image="sd_future_card" width={width} label={`다음 학년에게: ${text}`} className="sd-paper--future">
      <span className="sd-paper__kicker">다음 학년에게</span>
      <span className="sd-paper__body">{text}</span>
    </PaperCard>
  );
}

/** 투표 손 아이콘(sd_vote_hand). 파일이 없으면 공통 person 아이콘. */
export function VoteHand({ size = 28 }: { size?: number }) {
  const src = useGameImage("sd_vote_hand");
  if (!src) return <Icon id="person" size={size} />;
  return (
    <img
      src={src}
      alt=""
      aria-hidden
      className="sd-smooth"
      style={{ width: size, height: size, verticalAlign: "middle" }}
      draggable={false}
    />
  );
}
