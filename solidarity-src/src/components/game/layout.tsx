import { useLayoutEffect, useRef, type ReactNode } from "react";

// 단계 화면 배치 — 가로 태블릿(860px 이상·landscape)에서는 왼쪽(장면 + 그 아래 보조 내용)·오른쪽(핵심 조작 패널)
// 두 칸으로 나누어 전체를 100dvh 안에 맞춘다(문서 스크롤 없음). 핵심 조작은 패널 맨 위에 두어 스크롤 없이 보이게 한다.
// 세로·폰에서는 지금처럼 위에서 아래로 쌓인다.
// 장면 폭은 transparency 의 fitLayout 처럼 min(칸 폭, 남은 높이 × 가로세로비) 로 JS 가 맞춘다.

export const LANDSCAPE_QUERY = "(min-width: 860px) and (orientation: landscape)";

export function isLandscapeFit(): boolean {
  return typeof window !== "undefined" && window.matchMedia(LANDSCAPE_QUERY).matches;
}

export function StageLayout({
  title,
  scene,
  under,
  left,
  compact,
  wide,
  children,
  className,
}: {
  /** 머리글(PageTitle 등). 가로 모드에서는 한 줄로 줄어든다. */
  title?: ReactNode;
  /** 왼쪽 장면(Scene 캔버스 또는 .sd-scenebox). */
  scene?: ReactNode;
  /** 장면 아래에 붙는 보조 내용. 길면 왼쪽 칸 안에서만 스크롤한다. */
  under?: ReactNode;
  /** 장면 대신 왼쪽 칸을 채우는 내용(성적표 등). */
  left?: ReactNode;
  /** 장면을 작게(높이 최대 220px) 두고 아래 내용에 자리를 양보한다. */
  compact?: boolean;
  /** 장면이 주인공인 단계(이용권 배달 실시간) — 패널을 좁게. */
  wide?: boolean;
  /** 오른쪽 패널. 없으면 왼쪽 칸이 전체 폭을 쓴다. */
  children?: ReactNode;
  className?: string;
}) {
  const colRef = useRef<HTMLDivElement>(null);
  const fitRef = useRef<HTMLDivElement>(null);
  const underRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const col = colRef.current;
    const fit = fitRef.current;
    if (!col || !fit) return;
    const mq = window.matchMedia(LANDSCAPE_QUERY);
    let raf = 0;
    const apply = () => {
      raf = 0;
      if (!mq.matches) {
        fit.style.width = "";
        return;
      }
      const canvas = fit.querySelector("canvas");
      const ratio = canvas && canvas.height > 0 ? canvas.width / canvas.height : 16 / 9;
      const colW = col.clientWidth;
      const colH = col.clientHeight;
      // 아래 내용의 자연 높이(줄어들어 스크롤 중이어도 scrollHeight 로 잰다)
      const underH = underRef.current ? underRef.current.scrollHeight + 10 : 0;
      let budget = compact ? Math.min(colH * 0.4, 220) : colH - underH;
      // 아래 내용이 너무 길면 장면 높이를 최소 150px 은 지키고 아래 내용이 스크롤한다.
      budget = Math.max(Math.min(colH, compact ? 120 : Math.max(150, colH * 0.38)), budget); // 아래 내용이 길면 칸이 스크롤되더라도 장면은 세로의 38% 이상
      const w = Math.max(200, Math.floor(Math.min(colW, budget * ratio)));
      fit.style.width = `${w}px`;
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    apply();
    const ro = new ResizeObserver(schedule);
    ro.observe(col);
    if (underRef.current) ro.observe(underRef.current);
    window.addEventListener("resize", schedule);
    mq.addEventListener("change", schedule);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", schedule);
      mq.removeEventListener("change", schedule);
    };
  }, [scene, under, compact]);

  const hasScene = !!scene;
  const hasLeft = hasScene || !!left;
  const hasPanel = children !== undefined && children !== null && children !== false;
  const cls = [
    "sd-main",
    hasLeft ? "" : "sd-main--noscene",
    hasPanel ? "" : "sd-main--nopanel",
    wide ? "sd-main--wide" : "",
    compact ? "sd-main--compact" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={`sd-stage${className ? ` ${className}` : ""}`}>
      {title ? <div className="sd-head">{title}</div> : null}
      <div className={cls}>
        {hasScene ? (
          <div className="sd-scenecol" ref={colRef}>
            <div className="sd-scenefit" ref={fitRef}>
              {scene}
            </div>
            {under ? (
              <div className="sd-under" ref={underRef}>
                {under}
              </div>
            ) : null}
          </div>
        ) : left ? (
          <div className="sd-leftcol">{left}</div>
        ) : null}
        {hasPanel ? <div className="sd-panel">{children}</div> : null}
      </div>
    </div>
  );
}
