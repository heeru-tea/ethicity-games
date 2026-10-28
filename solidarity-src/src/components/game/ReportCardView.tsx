import { useEffect, useRef, useState } from "react";
import { loadAssets } from "../../common/pack";
import { downloadCanvas, renderReportCard, reportFontsReady, type ReportOpts } from "../../common/reportCard";

/** 탐험 보고서 카드 — 그림으로 보여 주고 「PNG로 저장」. 태블릿에서는 그림을 길게 눌러 저장할 수도 있다. */
export function ReportCardView({ opts }: { opts: ReportOpts }) {
  const [src, setSrc] = useState<string | null>(null);
  const [hint, setHint] = useState("보고서 카드를 그리는 중…");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const key = JSON.stringify(opts);

  useEffect(() => {
    let alive = true;
    void Promise.all([loadAssets(), reportFontsReady()]).then(([assets]) => {
      if (!alive) return;
      const draw = assets ? (ctx: CanvasRenderingContext2D, id: string, e: string, x: number, y: number, s: number) => assets.drawPortrait(ctx, id, e, x, y, s) : null;
      const canvas = renderReportCard(opts, draw);
      canvasRef.current = canvas;
      setSrc(canvas.toDataURL("image/png"));
      setHint("태블릿·폰에서는 카드 그림을 길게 눌러 사진으로 저장할 수도 있어요.");
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <div className="ee-report">
      {src ? <img className="ee-report-img" src={src} alt={`${opts.game} 탐험 보고서 카드`} draggable={false} /> : null}
      <div className="ee-report-row">
        <button
          type="button"
          className="ee-button ee-report-save"
          disabled={!src}
          onClick={() => {
            if (canvasRef.current) downloadCanvas(canvasRef.current, opts.filename);
            setHint("저장했어요. 다운로드 폴더(또는 사진)를 확인해요.");
          }}
        >
          PNG로 저장
        </button>
        <p className="ee-report-hint">{hint}</p>
      </div>
    </div>
  );
}
