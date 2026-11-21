import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  DEFAULT_SEED,
  DELIVERY_FICTIONAL,
  DELIVERY_INTRO,
  DELIVERY_RULE_NOTE,
  MATCH_SECONDS,
  MAX_TICKETS,
  REFILL_SECONDS,
  RULES,
  SITUATIONS,
  START_TICKETS,
  buildWave,
  findRule,
  isHighlighted,
  judge,
  ticketBudget,
  totalDemand,
  type DeliveryOutcome,
  type Kid,
  type MissRecord,
  type RuleId,
  type ServeRecord,
} from "../../game/exam/delivery";
import { playSfx } from "../../game/exam/sound";
import {
  STUDENT_IDS,
  prefersReducedMotion,
  useAssets,
  useGameImages,
  type CharacterId,
  type Direction,
  type Expression,
} from "../../common/pack";
import { Effect, HelpdeskBanner, Icon, Portrait, Ticket, pct } from "../../common/Sprite";
import { Say } from "../../components/game/ui";
import { StageLayout } from "../../components/game/layout";

// 이용권 배달 대작전 — 실시간 활동.
// 공통 팩 학생 캐릭터(jiho·haneul·saebom·onyu·daon)가 걷기 스프라이트로 화면 밖에서 도움 창구까지 걸어와
// 줄을 서고(최대 3명), 머리 위에 표정 얼굴과 말풍선을 띄운다. 카드를 누르면 이용권을 건네고(happy, collect),
// 참을성이 다하면 돌아간다(worried, retry). 이용권은 수요의 절반뿐이라 반드시 누군가는 놓친다. 승패는 없다.

type Phase = "intro" | "playing" | "result" | "ruleSelect";

const TICK_MS = 100;
const H = 480; // 장면 띠 높이 (ai_lab 의 y 160~640)
const CROP_Y = 160;
const SLOTS = [860, 700, 540]; // 창구에서 가까운 순서
const SLOT_Y = 560;
const COUNTER = { x: 1040, y: 560 };
const KID_SCALE = 0.85;
const WALK_SPEED = 240; // 논리 px/s

interface SimKid {
  kid: Kid;
  face: CharacterId;
  x: number;
  y: number;
  dir: Direction;
  state: "in" | "wait" | "out" | "back";
  slot: number;
  enteredAt: number | null;
  leaveAt: number | null;
  expression: Expression;
  tx: number;
  ty: number;
}

interface Sim {
  t: number;
  active: SimKid[]; // 화면에 있는 친구(걸어오는 중·기다리는 중·떠나는 중)
  spawned: number;
  served: ServeRecord[];
  missed: MissRecord[];
  tickets: number;
  refills: number;
  done: boolean;
}

function faceOf(kid: Kid): CharacterId {
  return STUDENT_IDS[(kid.face - 1 + STUDENT_IDS.length) % STUDENT_IDS.length];
}

/** 단계 머리글·활동 탭은 FairnessMinigame 이 넘겨 주고, 각 국면이 StageLayout(장면 왼쪽·패널 오른쪽)으로 그린다. */
interface Frame {
  title: ReactNode;
  tabs: ReactNode;
}

export function DeliveryGame({ title, tabs }: Frame) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [round, setRound] = useState<1 | 2>(1);
  const [rule, setRule] = useState<RuleId | null>(null);
  const [outcome1, setOutcome1] = useState<DeliveryOutcome | null>(null);
  const [outcome, setOutcome] = useState<DeliveryOutcome | null>(null);

  const start = (r: 1 | 2, chosen: RuleId | null) => {
    setRound(r);
    setRule(chosen);
    setPhase("playing");
  };

  const finish = useCallback(
    (o: DeliveryOutcome) => {
      setOutcome(o);
      if (round === 1) setOutcome1(o);
      setPhase("result");
    },
    [round],
  );

  const frame = { title, tabs };
  return (
    <>
      {phase === "intro" ? <Intro frame={frame} onStart={() => start(1, null)} /> : null}
      {phase === "playing" ? <Match key={round + String(rule)} frame={frame} rule={rule} onFinish={finish} /> : null}
      {phase === "ruleSelect" ? <RuleSelect frame={frame} onPick={(r) => start(2, r)} /> : null}
      {phase === "result" && outcome ? (
        <Result
          frame={frame}
          outcome={outcome}
          round={round}
          rule={rule}
          outcome1={outcome1}
          onRetryWithRule={() => setPhase("ruleSelect")}
        />
      ) : null}
    </>
  );
}

// ── 시작 안내 ────────────────────────────────────────────────
function Intro({ frame, onStart }: { frame: Frame; onStart: () => void }) {
  const kids = useMemo(() => buildWave(DEFAULT_SEED), []);
  const demand = totalDemand(kids);
  const budget = ticketBudget();
  const howTo = (
      <div className="ee-notice">
        <strong>이렇게 하면 돼</strong>
        <ul style={{ margin: "6px 0 0", paddingLeft: 18, display: "grid", gap: 4 }} className="sd-small">
          <li>창구 앞에 선 친구를 누르면 이용권을 건네줘. 필요한 만큼 한 번에 나가.</li>
          <li>
            이용권은 {REFILL_SECONDS}초에 한 장씩 새로 생겨. 손에는 최대 {MAX_TICKETS}장까지.
          </li>
          <li>친구 아래 막대가 다 줄어들면 친구는 그냥 돌아가.</li>
          <li>{MATCH_SECONDS}초 동안 해 보자. 키보드로는 Tab 으로 친구를 고르고 Enter 로 건네.</li>
        </ul>
      </div>
  );
  return (
    <StageLayout title={frame.title} scene={<HelpdeskBanner />} under={howTo}>
      {frame.tabs}
      <div className="ee-panel">
        <h2 className="sd-h2">이용권 배달 대작전 · 오늘 이용권 담당은 나!</h2>
        <p className="sd-small">{DELIVERY_INTRO}</p>
        <div className="sd-row">
          <span className="ee-badge">찾아올 친구 {kids.length}명</span>
          <span className="ee-badge">친구들이 필요한 건 {demand}장</span>
          <span className="ee-badge" style={{ borderColor: "var(--ee-red)" }}>
            내가 줄 수 있는 건 {budget}장뿐
          </span>
        </div>
        <p className="sd-small sd-muted">{DELIVERY_RULE_NOTE}</p>
      </div>

      <button
        type="button"
        className="ee-button sd-wide sd-big"
        onClick={() => {
          playSfx("door");
          onStart();
        }}
      >
        문 열고 시작하기
      </button>
      <p className="sd-small sd-muted">{DELIVERY_FICTIONAL}</p>
    </StageLayout>
  );
}

// ── 본 경기 ──────────────────────────────────────────────────
function Match({ frame, rule, onFinish }: { frame: Frame; rule: RuleId | null; onFinish: (o: DeliveryOutcome) => void }) {
  const kids = useMemo(() => buildWave(DEFAULT_SEED), []);
  const assets = useAssets();
  const images = useGameImages(["sd_helpdesk"]);
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<Sim>({
    t: 0,
    active: [],
    spawned: 0,
    served: [],
    missed: [],
    tickets: START_TICKETS,
    refills: 0,
    done: false,
  });
  const [now, setNow] = useState(0);
  const [tickets, setTickets] = useState(START_TICKETS);
  const [, bump] = useState(0); // 줄 상태가 바뀔 때 겹층을 다시 그린다
  const [fx, setFx] = useState<{ kind: "collect" | "retry"; x: number; y: number; token: number } | null>(null);
  const [notice, setNotice] = useState<string>("곧 친구들이 올 거야.");
  const refresh = () => bump((n) => n + 1);

  /** 기다리는 친구들에게 창구 가까운 순서로 자리를 다시 준다. */
  const assignSlots = (sim: Sim) => {
    const queue = sim.active.filter((k) => k.state === "in" || k.state === "wait");
    queue.forEach((k, i) => {
      const slot = Math.min(i, SLOTS.length - 1);
      if (k.slot !== slot) {
        k.slot = slot;
        k.tx = SLOTS[slot];
        k.ty = SLOT_Y;
        if (k.state === "wait") k.state = "in";
        k.dir = "right";
      }
    });
  };

  const spawn = (sim: Sim) => {
    const kid = kids[sim.spawned];
    sim.spawned += 1;
    const slot = sim.active.filter((k) => k.state === "in" || k.state === "wait").length;
    const sk: SimKid = {
      kid,
      face: faceOf(kid),
      x: reduced ? SLOTS[Math.min(slot, 2)] : -60,
      y: SLOT_Y,
      dir: "right",
      state: "in",
      slot: Math.min(slot, 2),
      enteredAt: null,
      leaveAt: null,
      expression: "neutral",
      tx: SLOTS[Math.min(slot, 2)],
      ty: SLOT_Y,
    };
    sim.active.push(sk);
    assignSlots(sim);
    refresh();
  };

  // 게임 논리 시계 (100ms): 등장·참을성·충전·종료
  useEffect(() => {
    const sim = simRef.current;
    const started = Date.now();
    const id = setInterval(() => {
      const t = (Date.now() - started) / 1000;
      sim.t = t;
      setNow(t);

      const shouldRefill = Math.floor(t / REFILL_SECONDS);
      if (shouldRefill > sim.refills) {
        sim.refills = shouldRefill;
        sim.tickets = Math.min(MAX_TICKETS, sim.tickets + 1);
        setTickets(sim.tickets);
      }

      // 등장: 예정 시각이 됐고 자리가 비면 들어온다. 줄이 비어 있으면 다음 친구를 바로 부른다.
      const queued = () => sim.active.filter((k) => k.state === "in" || k.state === "wait").length;
      while (sim.spawned < kids.length && queued() < SLOTS.length && (kids[sim.spawned].spawnAt <= t || queued() === 0)) {
        spawn(sim);
      }

      // 참을성이 다한 친구는 돌아간다
      let changed = false;
      for (const k of sim.active) {
        if (k.state === "wait" && k.leaveAt !== null && k.leaveAt <= t) {
          sim.missed.push({ kidId: k.kid.id, name: k.kid.name, situation: k.kid.situation, need: k.kid.need });
          k.state = "back";
          k.expression = "worried";
          k.dir = "left";
          k.tx = -90;
          k.ty = SLOT_Y + 40;
          setFx({ kind: "retry", x: SLOTS[k.slot], y: SLOT_Y - 150, token: Date.now() });
          setNotice(`${k.kid.name}(이)가 기다리다 돌아갔어.`);
          playSfx("miss");
          changed = true;
        }
      }
      if (changed) {
        assignSlots(sim);
        refresh();
      }

      if (t >= MATCH_SECONDS && !sim.done) {
        sim.done = true;
        clearInterval(id);
        for (const k of sim.active) {
          if (k.state === "in" || k.state === "wait") {
            sim.missed.push({ kidId: k.kid.id, name: k.kid.name, situation: k.kid.situation, need: k.kid.need });
          }
        }
        setTimeout(() => onFinish(judge(sim.served, sim.missed, sim.tickets, rule !== null)), 60);
      }
    }, TICK_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kids, onFinish, rule]);

  // 그리기 시계: 걷기·도착·퇴장
  useEffect(() => {
    const sim = simRef.current;
    let raf = 0;
    let last = performance.now();
    const draw = () => {
      const nowMs = performance.now();
      const dt = Math.min(0.1, (nowMs - last) / 1000);
      last = nowMs;
      let changed = false;
      for (const k of [...sim.active]) {
        if (k.state === "wait") continue;
        const dx = k.tx - k.x;
        const dy = k.ty - k.y;
        const dist = Math.hypot(dx, dy);
        const step = reduced ? dist : WALK_SPEED * dt;
        if (dist <= step) {
          k.x = k.tx;
          k.y = k.ty;
          if (k.state === "in") {
            k.state = "wait";
            if (k.enteredAt === null) {
              k.enteredAt = sim.t;
              k.leaveAt = sim.t + k.kid.patience;
            }
            changed = true;
          } else {
            sim.active = sim.active.filter((x) => x !== k);
            changed = true;
          }
        } else {
          k.x += (dx / dist) * step;
          k.y += (dy / dist) * step;
        }
      }
      if (changed) refresh();

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx && assets) {
        ctx.save();
        ctx.clearRect(0, 0, 1280, H);
        ctx.translate(0, -CROP_Y);
        assets.drawBackground(ctx, "ai_lab", 1280, 720);
        const items: Array<{ y: number; draw: () => void }> = [];
        const desk = images.sd_helpdesk;
        if (desk) {
          const h = 150;
          const w = (h * desk.naturalWidth) / desk.naturalHeight;
          items.push({
            y: COUNTER.y,
            draw: () => {
              ctx.imageSmoothingEnabled = false;
              ctx.drawImage(desk, COUNTER.x - w / 2, COUNTER.y - h, w, h);
            },
          });
        } else {
          items.push({ y: COUNTER.y, draw: () => assets.drawProp(ctx, "desk", COUNTER.x, COUNTER.y, 140) });
        }
        items.push({ y: COUNTER.y - 60, draw: () => assets.drawCharacter(ctx, "robot", COUNTER.x, COUNTER.y - 60, "down", 1, 0.66) });
        const frame = reduced ? 1 : Math.floor((nowMs / 1000) * 6) % 4;
        for (const k of sim.active) {
          const f = k.state === "wait" ? 1 : frame;
          items.push({ y: k.y, draw: () => assets.drawCharacter(ctx, k.face, k.x, k.y, k.dir, f, KID_SCALE) });
        }
        items.sort((a, b) => a.y - b.y).forEach((i) => i.draw());
        ctx.restore();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [assets, images, reduced]);

  const give = (k: SimKid) => {
    const sim = simRef.current;
    if (sim.done || k.state !== "wait") return;
    if (sim.tickets < k.kid.need) {
      playSfx("miss");
      setNotice(`이용권이 모자라. ${k.kid.name}에게는 ${k.kid.need}장이 필요해.`);
      return;
    }
    playSfx("paper");
    const queueRank = k.slot + 1;
    sim.served.push({
      kidId: k.kid.id,
      name: k.kid.name,
      situation: k.kid.situation,
      need: k.kid.need,
      at: sim.t,
      queueRank,
      ruleMatched: rule ? isHighlighted(rule, k.kid, queueRank) : false,
    });
    sim.tickets -= k.kid.need;
    setTickets(sim.tickets);
    k.state = "out";
    k.expression = "happy";
    k.dir = "right";
    k.tx = 1360;
    k.ty = SLOT_Y + 70;
    setFx({ kind: "collect", x: COUNTER.x - 60, y: COUNTER.y - 170, token: Date.now() });
    setNotice(`${k.kid.name}에게 이용권 ${k.kid.need}장을 건넸어.`);
    assignSlots(sim);
    refresh();
  };

  const sim = simRef.current;
  const left = Math.max(0, MATCH_SECONDS - now);
  const ruleDef = rule ? findRule(rule) : null;
  const waiting = sim.active.filter((k) => k.state === "wait");
  const nobody = sim.active.every((k) => k.state === "out" || k.state === "back");

  const hud = (
    <div>
      {/* 상태 바 */}
      <div className="ee-panel sd-hud" style={{ padding: "8px 12px" }}>
        <div className="sd-tickets" aria-label={"남은 이용권 " + tickets + "장"} role="img">
          {Array.from({ length: MAX_TICKETS }, (_, i) => (
            <Ticket key={i} on={i < tickets} size={26} />
          ))}
          <strong className="sd-num" style={{ marginLeft: 6, fontSize: 18 }}>
            {tickets}
          </strong>
        </div>
        <span className={"sd-timer sd-num" + (left <= 15 ? " sd-timer--hot" : "")}>
          <Icon id="timer" size={22} />
          {Math.ceil(left)}초
        </span>
      </div>
      <div className="sd-progress" aria-hidden>
        <i style={{ width: (now / MATCH_SECONDS) * 100 + "%" }} />
      </div>
    </div>
  );

  const scene = (
      /* 장면: 도움 창구 + 걸어오는 친구들 */
      <div className="sd-scenebox" role="group" aria-label="도움 창구 앞 줄">
        <canvas
          ref={canvasRef}
          width={1280}
          height={H}
          className="sd-scene sd-smooth"
          style={{ aspectRatio: `1280 / ${H}` }}
          role="img"
          aria-label="AI 도우미실 도움 창구. 친구들이 줄을 서서 이용권을 기다린다"
        />
        <div className="sd-scenelayer">
          <span className="sd-counter" style={pct(COUNTER.x, COUNTER.y + 6 - CROP_Y, H)}>
            도움 창구
          </span>
          {fx ? (
            <span className="sd-at" style={pct(fx.x, fx.y - CROP_Y, H)}>
              <Effect id={fx.kind === "collect" ? "correct" : "retry"} token={fx.token} size={64} />
            </span>
          ) : null}
          {nobody && now > 1.5 ? <span className="sd-empty">다음 친구가 오고 있어</span> : null}
          {waiting.map((k) => {
            const s = SITUATIONS[k.kid.situation];
            const remain = k.leaveAt !== null ? Math.max(0, (k.leaveAt - now) / k.kid.patience) : 1;
            const hi = rule ? isHighlighted(rule, k.kid, k.slot + 1) : false;
            const canPay = tickets >= k.kid.need;
            const hurry = remain < 0.3;
            const sx = SLOTS[k.slot];
            const headY = SLOT_Y - 128 * KID_SCALE;
            return (
              <div key={k.kid.id}>
                <span className={`sd-kidsay${k.slot === 0 ? " sd-kidsay--front" : ""}`} style={pct(sx, headY - 62 - CROP_Y, H)}>
                  <span className="ee-speech">{s.label}</span>
                </span>
                <span className="sd-kidface" style={pct(sx, headY - 6 - CROP_Y, H)}>
                  <Portrait id={k.face} expression={k.expression} size={44} label="" />
                </span>
                <button
                  type="button"
                  className={"sd-kid" + (hi ? " sd-kid--hi" : "") + (hurry ? " sd-kid--hurry" : "") + (canPay ? "" : " sd-kid--poor")}
                  style={pct(sx, SLOT_Y + 8 - CROP_Y, H)}
                  aria-label={`${k.kid.name}, 이용권 ${k.kid.need}장 필요, ${s.label}${hi ? ", 규칙에 맞는 친구" : ""}${canPay ? "" : ", 이용권 부족"}`}
                  onClick={() => give(k)}
                >
                  <span className="sd-kid__tag">
                    <b>
                      {k.kid.name}
                      {hi ? <Icon id="clue" size={14} label="규칙에 맞는 친구" /> : null}
                    </b>
                    <span className={canPay ? "sd-kid__need" : "sd-kid__lack"}>
                      {canPay ? `이용권 ${k.kid.need}장` : `${k.kid.need}장 · 부족`}
                    </span>
                    <span className={"sd-kid__bar" + (hurry ? " sd-kid__bar--hurry" : "")}>
                      <i style={{ width: remain * 100 + "%" }} />
                    </span>
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
  );

  return (
    <StageLayout title={frame.title} scene={scene} under={hud} wide>
      {frame.tabs}
      {ruleDef ? (
        <div className="ee-notice">
          <strong className="sd-small">우리 규칙 · {ruleDef.name}</strong>
          <p className="sd-small sd-muted">{ruleDef.desc}</p>
        </div>
      ) : null}
      <div className="ee-panel">
        <p className="sd-small sd-strong">창구 앞에 선 친구를 누르면 이용권을 건네.</p>
        <p className="sd-small sd-muted" role="status" aria-live="polite" style={{ minHeight: 24 }}>
          {notice}
        </p>
      </div>
    </StageLayout>
  );
}

// ── 규칙 고르기 (2회차) ──────────────────────────────────────
function RuleSelect({ frame, onPick }: { frame: Frame; onPick: (r: RuleId) => void }) {
  const [picked, setPicked] = useState<RuleId | null>(null);
  return (
    <StageLayout title={frame.title}>
      {frame.tabs}
      <Say speaker="robot" expression="explaining" name="안내 로봇">
        방금은 규칙 없이 손 가는 대로 줬지요? 이번엔 먼저 규칙을 정하고 해 봐요. 고른 규칙에 맞는
        친구는 이름 옆에 단서 표시가 붙어요. 그 친구한테만 줘야 하는 건 아니에요. 규칙을 지킬지는
        여전히 내 손에 달렸어요.
      </Say>
      <div className="sd-choices" role="group" aria-label="규칙 후보">
        {RULES.map((r) => (
          <button
            key={r.id}
            type="button"
            className="ee-choice"
            aria-pressed={picked === r.id}
            onClick={() => {
              playSfx("paper");
              setPicked(r.id);
            }}
          >
            <strong>{r.name}</strong>
            <span className="sd-hint">{r.desc}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="ee-button sd-wide sd-big"
        disabled={!picked}
        onClick={() => {
          if (!picked) return;
          playSfx("door");
          onPick(picked);
        }}
      >
        이 규칙으로 다시 해 보기
      </button>
    </StageLayout>
  );
}

// ── 결과 ─────────────────────────────────────────────────────
function Result({
  frame,
  outcome,
  round,
  rule,
  outcome1,
  onRetryWithRule,
}: {
  frame: Frame;
  outcome: DeliveryOutcome;
  round: 1 | 2;
  rule: RuleId | null;
  outcome1: DeliveryOutcome | null;
  onRetryWithRule: () => void;
}) {
  const ruleDef = rule ? findRule(rule) : null;
  const missedAll = [...outcome.scarceMissed, ...outcome.urgentMissed].filter(
    (m, i, arr) => arr.findIndex((x) => x.kidId === m.kidId) === i,
  );
  const shown = missedAll.slice(0, 6);
  const summary = (
    <>
      <div className="ee-panel">
        <h2 className="sd-h2">{round === 1 ? "1번째 판 · 규칙 없이" : "2번째 판 · " + (ruleDef?.name ?? "")}</h2>
        <div className="sd-tally">
          <figure>
            <Portrait id="saebom" expression="happy" size={88} label="이용권을 받은 친구" />
            <figcaption className="sd-small sd-muted">
              이용권을 받은 친구
              <b style={{ color: "var(--ee-green)" }}>{outcome.servedCount}명</b>
            </figcaption>
          </figure>
          <figure>
            <Portrait id="onyu" expression="worried" size={88} label="그냥 돌아간 친구" />
            <figcaption className="sd-small sd-muted">
              그냥 돌아간 친구
              <b style={{ color: "var(--ee-red)" }}>{outcome.missedCount}명</b>
            </figcaption>
          </figure>
        </div>
        <div className="sd-row">
          <span className="ee-badge">먼저 온 친구부터 준 비율 {outcome.firstComeRatio}%</span>
          {outcome.ruleFollowRatio !== null ? <span className="ee-badge">규칙대로 준 비율 {outcome.ruleFollowRatio}%</span> : null}
        </div>
        <p className="sd-strong">{outcome.verdict}</p>
      </div>

      <div className="ee-panel">
        <h2 className="sd-h3">무슨 일이 있었냐면</h2>
        <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }} className="sd-small">
          {outcome.facts.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </div>

      {round === 2 && outcome1 ? (
        <div className="ee-panel">
          <h2 className="sd-h3">1번째 판이랑 비교하면</h2>
          <div className="sd-table-wrap">
            <table className="sd-table">
              <thead>
                <tr>
                  <th scope="col">항목</th>
                  <th scope="col">규칙 없이</th>
                  <th scope="col">{ruleDef?.name}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>도와준 친구</td>
                  <td className="sd-num">{outcome1.servedCount}명</td>
                  <td className="sd-num">{outcome.servedCount}명</td>
                </tr>
                <tr>
                  <td>집에 AI 없는데 못 받음</td>
                  <td className="sd-num">{outcome1.scarceMissed.length}명</td>
                  <td className="sd-num">{outcome.scarceMissed.length}명</td>
                </tr>
                <tr>
                  <td>급한데 못 받음</td>
                  <td className="sd-num">{outcome1.urgentMissed.length}명</td>
                  <td className="sd-num">{outcome.urgentMissed.length}명</td>
                </tr>
                <tr>
                  <td>이미 많이 쓴 친구에게 간 장수</td>
                  <td className="sd-num">{outcome1.enoughServedTickets}장</td>
                  <td className="sd-num">{outcome.enoughServedTickets}장</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </>
  );

  return (
    <StageLayout title={frame.title} left={summary}>
      {frame.tabs}
      <Say speaker="robot" expression="explaining" name="안내 로봇" compact>
        {outcome.question}
      </Say>

      {round === 1 ? (
        <button type="button" className="ee-button sd-wide sd-big" onClick={onRetryWithRule}>
          <Icon id="retry" size={24} />
          규칙 정하고 한 판 더
        </button>
      ) : (
        <p className="sd-small sd-muted sd-center">
          어떤 규칙으로 해도 못 받는 친구가 생겼지? 선생님이 다음으로 넘길 때까지 기다리자.
        </p>
      )}

      {missedAll.length > 0 ? (
        <div className="ee-notice">
          <strong style={{ color: "var(--ee-red)" }}>못 받고 돌아간 친구</strong>
          <div className="sd-small" style={{ display: "grid", gap: 4, marginTop: 6 }}>
            {shown.map((m) => (
              <p key={m.kidId}>
                {m.name} · {SITUATIONS[m.situation].detail}
              </p>
            ))}
            {missedAll.length > shown.length ? <p className="sd-muted">그리고 {missedAll.length - shown.length}명 더 있어.</p> : null}
          </div>
        </div>
      ) : null}

      {round === 2 && ruleDef ? (
        <>
          <div className="ee-success">
            <strong style={{ color: "var(--ee-green)" }}>이 규칙, 좋은 점</strong>
            <p className="sd-small">{ruleDef.goodPoint}</p>
          </div>
          <div className="ee-notice">
            <strong style={{ color: "#8a6a1c" }}>그런데 이런 점이 걸려</strong>
            <p className="sd-small">{ruleDef.missedPoint}</p>
          </div>
        </>
      ) : null}
      <p className="sd-small sd-muted">{DELIVERY_FICTIONAL}</p>
    </StageLayout>
  );
}
