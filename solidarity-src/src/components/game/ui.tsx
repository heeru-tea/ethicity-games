import { useEffect, useRef, type ReactNode } from "react";
import { Portrait } from "../../common/Sprite";
import type { CharacterId, Expression } from "../../common/pack";

// 공용 UI — 공통 팩의 .ee-* 창·말풍선·버튼을 React 부품으로 감싼다. 그림 문자 없음.

export function Modal({
  label,
  onClose,
  children,
  closeText = "닫기",
  hideClose,
}: {
  label: string;
  onClose?: () => void;
  children: ReactNode;
  closeText?: string;
  hideClose?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    restoreRef.current = document.activeElement as HTMLElement | null;
    const node = ref.current;
    if (!node) return;
    const focusables = () =>
      Array.from(
        node.querySelectorAll<HTMLElement>(
          'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("disabled"));
    (focusables()[0] ?? node).focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) {
        e.stopPropagation();
        onClose();
      }
      if (e.key === "Tab") {
        const list = focusables();
        if (list.length === 0) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    node.addEventListener("keydown", onKey);
    return () => {
      node.removeEventListener("keydown", onKey);
      restoreRef.current?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="sd-overlay" role="presentation">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className="ee-panel sd-modal"
      >
        {children}
        {!hideClose && onClose ? (
          <div style={{ textAlign: "right" }}>
            <button type="button" className="ee-button secondary" onClick={onClose}>
              {closeText}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function PageTitle({
  kicker,
  children,
  sub,
}: {
  kicker?: string;
  children: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <header className="sd-pagehead">
      {kicker ? <p className="sd-kicker">{kicker}</p> : null}
      <h1 className="sd-title">{children}</h1>
      {sub ? <p className="sd-sub">{sub}</p> : null}
    </header>
  );
}

/** 얼굴 + 공통 말풍선. 같은 인물은 항상 같은 공통 ID 로 그린다. */
export function Say({
  speaker,
  expression = "neutral",
  name,
  children,
  compact,
  role,
}: {
  speaker: CharacterId;
  expression?: Expression;
  name?: string;
  children: ReactNode;
  compact?: boolean;
  role?: string;
}) {
  return (
    <div className={`sd-say${compact ? " sd-say--compact" : ""}`} role={role}>
      <Portrait id={speaker} expression={expression} size={64} />
      <div className="ee-speech">
        {name ? <p className="ee-speaker">{name}</p> : null}
        <div>{children}</div>
      </div>
    </div>
  );
}

export function PlanDot({ color }: { color: string }) {
  return <span className="sd-plandot" style={{ background: color }} aria-hidden />;
}

export function Bar({
  value,
  tone,
}: {
  value: number; // 0~100
  tone?: "gold" | "green" | "blue" | "red";
}) {
  return (
    <span className={`sd-bar${tone ? ` sd-bar--${tone}` : ""}`} style={{ display: "block" }} aria-hidden>
      <i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </span>
  );
}
