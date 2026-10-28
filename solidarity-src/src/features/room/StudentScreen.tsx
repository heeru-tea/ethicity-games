import { useEffect, useMemo, useRef, useState } from "react";
import { useRoom } from "../../net/useRoom";
import { STAGE_LABEL, STAGE_ORDER, type PolicyId, type Stage, type VoteTally } from "../../shared/protocol";
import {
  AD_FACTS,
  APPEAL_REPLY,
  DILEMMA,
  EMOTIONS,
  EXAMS,
  LEARNINGS,
  LEGACY_RULES,
  PLANS,
  PLEDGE_OPTIONS,
  POLICIES,
  PONDER_PROMPTS,
  REFLECTION_QUESTIONS,
  SOLIDARITY_EXPLAIN,
  topLegacyRule,
} from "../../game/exam/content";
import { MATH_QUESTIONS, MATH_ROUND_SIZE } from "../../game/exam/math";
import { Bar, Modal, PageTitle, PlanDot, Say } from "../../components/game/ui";
import { Effect, ExamSheet, FutureCard, Icon, PlanCard, Portrait, ReportSheet, Scene, VoteHand, pct } from "../../common/Sprite";
import { classmates, getAvatar, type AvatarId } from "../../common/pack";
import { playSfx } from "../../game/exam/sound";
import { postComplete, postProgress } from "../../integration";
import { StageLayout, isLandscapeFit } from "../../components/game/layout";
import { ReportCardView } from "../../components/game/ReportCardView";
import type { ReportOpts } from "../../common/reportCard";

// 학생 화면 — 선생님이 넘기는 단계를 따라가며 우리 반과 실시간으로 함께 진행한다.
// 서버 프로토콜은 원본 그대로. 화면은 공통 팩(.ee-*, 공통 캐릭터·배경·효과)으로 그린다.

interface ExamAnswerState {
  qIndex: number;
  answers: Array<number | null>;
  aiUsed: number;
  hint: { qIndex: number; pick: number; wrong: boolean } | null;
  done: boolean;
}

const emptyExam = (): ExamAnswerState => ({ qIndex: 0, answers: [], aiUsed: 0, hint: null, done: false });

export function StudentScreen({ code, name }: { code: string; name: string }) {
  const { status, room, me, error, send } = useRoom(code, "student", name);
  const stage: Stage = room?.stage ?? "lobby";
  const avatar = getAvatar();

  useEffect(() => {
    if (!room) return;
    postProgress(STAGE_ORDER.indexOf(stage) + 1, STAGE_ORDER.length);
  }, [room, stage]);

  if (error) {
    return (
      <div className="sd-wrap">
        <Say speaker="robot" expression="worried" name="안내 로봇">
          교실에 들어가지 못했어요. {error}
        </Say>
      </div>
    );
  }

  if (!room || !me) {
    return (
      <div className="sd-wrap">
        <div className="ee-panel sd-center" style={{ padding: "40px 16px" }} aria-live="polite">
          <Portrait id="robot" expression="neutral" size={72} />
          <p className="sd-h3">{status === "open" ? "교실에 들어가는 중…" : "선생님 교실을 찾는 중…"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sd-wrap">
      <StatusBar stage={stage} me={me} code={code} />
      {stage === "lobby" ? <Lobby room={room} me={me} avatar={avatar} /> : null}
      {stage === "draw" ? <DrawView me={me} avatar={avatar} /> : null}
      {stage === "exam1" ? <ExamView examIndex={0} me={me} send={send} avatar={avatar} /> : null}
      {stage === "exam2" ? <ExamView examIndex={1} me={me} send={send} avatar={avatar} /> : null}
      {stage === "report1" ? <ReportView exam={1} room={room} me={me} send={send} /> : null}
      {stage === "report2" ? <ReportView exam={2} room={room} me={me} send={send} /> : null}
      {stage === "dilemma" ? <DilemmaView /> : null}
      {stage === "vote" ? <VoteView room={room} me={me} send={send} avatar={avatar} /> : null}
      {stage === "final" ? <FinalView room={room} me={me} send={send} avatar={avatar} /> : null}
    </div>
  );
}

// ── 상단 상태 ────────────────────────────────────────────────
function StatusBar({
  stage,
  me,
  code,
}: {
  stage: Stage;
  me: { name: string; effectivePlan: keyof typeof PLANS; sharedTurns: number };
  code: string;
}) {
  const plan = PLANS[me.effectivePlan];
  return (
    <div className="sd-statusbar">
      <span className="ee-badge">
        <PlanDot color={plan.color} />
        {me.name} · {plan.shortName}
        {me.sharedTurns > 0 ? ` · 공용 ${me.sharedTurns}회` : ""}
      </span>
      <span className="ee-badge">{STAGE_LABEL[stage]}</span>
      <span className="sd-small sd-muted sd-num">{code}</span>
    </div>
  );
}

// ── 대기실 ───────────────────────────────────────────────────
function Lobby({
  room,
  me,
  avatar,
}: {
  room: { players: Array<{ id: string; name: string; online: boolean }> };
  me: { id: string };
  avatar: AvatarId;
}) {
  return (
    <StageLayout
      title={
        <PageTitle kicker="입장 완료" sub="선생님이 시작하면 다 같이 출발해. 조금만 기다리자.">
          교실에 들어왔다!
        </PageTitle>
      }
      scene={
        <Scene
          background="courtyard"
          crop={{ y: 120, height: 480 }}
          actors={[
            { id: avatar, x: 640, y: 570, direction: "up" },
            { id: "teacher", x: 540, y: 470, direction: "right", scale: 0.95 },
            { id: "robot", x: 740, y: 455, direction: "left", scale: 0.65 },
          ]}
          label="학교 중앙마당에서 선생님과 안내 로봇이 나를 맞이한다"
        >
          <span className="sd-counter" style={pct(640, 40, 480)}>
            선생님이 시작할 때까지 기다리자
          </span>
        </Scene>
      }
      under={
      <div className="ee-panel">
        <h2 className="sd-h3">지금 들어온 친구들 ({room.players.length}명)</h2>
        <div className="sd-row">
          {room.players.map((p) => (
            <span key={p.id} className="ee-badge" style={{ opacity: p.online ? 1 : 0.5, fontWeight: p.id === me.id ? 700 : 400 }}>
              <Icon id="person" size={18} />
              {" "}
              {p.name}
              {p.id === me.id ? " (나)" : ""}
            </span>
          ))}
        </div>
      </div>
      }
    />
  );
}

// ── 뽑기 공개 ────────────────────────────────────────────────
function DrawView({ me, avatar }: { me: { plan: keyof typeof PLANS; sharedTurns: number }; avatar: AvatarId }) {
  const [revealed, setRevealed] = useState(false);
  const [landed, setLanded] = useState<number | null>(null);
  useEffect(() => {
    if (!revealed) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setLanded(Date.now()), reduce ? 50 : 950);
    return () => clearTimeout(t);
  }, [revealed]);
  useEffect(() => {
    playSfx("paper");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(
      () => {
        setRevealed(true);
        playSfx("collect");
      },
      reduce ? 50 : 1200,
    );
    return () => clearTimeout(t);
  }, []);
  const plan = PLANS[me.plan];
  const perks = revealed ? (
    <div className="ee-panel sd-reveal" style={{ textAlign: "left" }}>
      <h2 className="sd-h3">{plan.name} 은 이래</h2>
      {plan.perks.map((p) => (
        <p key={p} className="sd-small" style={{ margin: 0 }}>
          · {p}
        </p>
      ))}
      {plan.limits.map((l) => (
        <p key={l} className="sd-small" style={{ margin: 0, color: "var(--ee-red)" }}>
          · {l}
        </p>
      ))}
    </div>
  ) : undefined;

  return (
    <StageLayout
      title={
        <PageTitle kicker="등교" sub="카드를 잘 섞어서 한 장씩 나눠 줬어. 실력이랑은 아무 상관 없어.">
          내 요금제
        </PageTitle>
      }
      under={perks}
      scene={
        <Scene
          background="classroom"
          crop={{ y: 120, height: 480 }}
          actors={[
            { id: "teacher", x: 330, y: 340, direction: "right", scale: 0.95 },
            { id: avatar, x: 760, y: 570, direction: "left" },
          ]}
          label={revealed ? "선생님이 책상에서 내 앞으로 요금제 카드를 건넨다" : "선생님이 카드를 섞고 있다"}
        >
          {!revealed ? (
            <span className="sd-counter" style={pct(640, 300, 480)}>
              카드 섞는 중…
            </span>
          ) : (
            <>
              <div className={`sd-cardfly${landed ? " sd-cardfly--still" : ""}`} aria-hidden>
                <PlanCard plan={me.plan} width={160} />
              </div>
              {landed ? (
                <span className="sd-at" style={pct(600, 150, 480)}>
                  <Effect id="key" token={landed} size={72} />
                </span>
              ) : null}
            </>
          )}
        </Scene>
      }
    >
      {!revealed ? (
        <div className="sd-center" style={{ padding: "16px 0" }} aria-live="polite">
          <div className="sd-cardback" aria-hidden />
          <p className="sd-h3 sd-muted sd-mt">카드 섞는 중…</p>
        </div>
      ) : (
        <div className="sd-center sd-reveal sd-mt">
          <PlanCard plan={me.plan} width={168} />
          <p className="sd-h2 sd-mt" style={{ fontSize: 24 }}>
            {plan.name}
          </p>
          <p className="sd-small sd-muted sd-num">
            {plan.price} · {plan.priceNote}
          </p>
          <p className="sd-small sd-muted sd-mt">선생님이 시험을 시작할 때까지 기다리자.</p>
        </div>
      )}
    </StageLayout>
  );
}

// ── 시험 ─────────────────────────────────────────────────────
function ExamView({
  examIndex,
  me,
  send,
  avatar,
}: {
  examIndex: 0 | 1;
  me: { effectivePlan: keyof typeof PLANS; sharedTurns: number };
  avatar: AvatarId;
  send: (
    m: { t: "progress"; n: number } | { t: "submitScore"; exam: 1 | 2; score: number; correct: number; aiWrongTrusted: number },
  ) => void;
}) {
  // 반 전체가 같은 문항을 풀어야 하므로 셔플하지 않고 앞에서부터 쓴다.
  const questions = useMemo(
    () => (examIndex === 0 ? EXAMS[0].questions : MATH_QUESTIONS.slice(0, MATH_ROUND_SIZE)),
    [examIndex],
  );

  const [st, setSt] = useState<ExamAnswerState>(() => ({
    ...emptyExam(),
    answers: Array.from({ length: questions.length }, () => null),
  }));
  const [ad, setAd] = useState<{ until: number; willFail: boolean; fact: string } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [sharedLeft, setSharedLeft] = useState(me.sharedTurns);
  const [hintFx, setHintFx] = useState<number | null>(null);
  const submitted = useRef(false);
  const rules = PLANS[me.effectivePlan];

  useEffect(() => {
    if (!ad) return;
    const tick = setInterval(() => setNow(Date.now()), 250);
    const t = setTimeout(
      () => {
        const q = questions[st.qIndex];
        setSt((s) => ({
          ...s,
          hint: { qIndex: s.qIndex, pick: ad.willFail ? q.wrongAiAnswer : q.answer, wrong: ad.willFail },
        }));
        setHintFx(Date.now());
        setAd(null);
      },
      Math.max(0, ad.until - Date.now()),
    );
    return () => {
      clearInterval(tick);
      clearTimeout(t);
    };
  }, [ad, questions, st.qIndex]);

  const q = questions[st.qIndex];
  const callsLeft = Math.max(0, rules.aiCalls - st.aiUsed);
  const hintActive = st.hint?.qIndex === st.qIndex;
  const canAsk = !ad && !hintActive && !st.done && (callsLeft > 0 || sharedLeft > 0);

  const onAsk = () => {
    const viaShared = sharedLeft > 0 && (me.effectivePlan === "free" || me.effectivePlan === "lite");
    const used = viaShared ? st.aiUsed : st.aiUsed + 1;
    const effective = viaShared ? PLANS.promax : rules;
    const willFail = !viaShared && rules.failOn > 0 && used === rules.failOn;
    if (viaShared) setSharedLeft((n) => n - 1);
    else setSt((s) => ({ ...s, aiUsed: used }));
    if (effective.adSeconds > 0) {
      playSfx("door");
      setAd({
        until: Date.now() + effective.adSeconds * 1000,
        willFail,
        fact: AD_FACTS[(examIndex * 3 + used) % AD_FACTS.length],
      });
    } else {
      playSfx("tap");
      setSt((s) => ({
        ...s,
        hint: { qIndex: s.qIndex, pick: willFail ? q.wrongAiAnswer : q.answer, wrong: willFail },
      }));
      setHintFx(Date.now());
    }
  };

  const choose = (optIndex: number) => {
    playSfx("paper");
    setSt((s) => {
      const answers = [...s.answers];
      answers[s.qIndex] = optIndex;
      const last = s.qIndex + 1 >= questions.length;
      if (!last) {
        send({ t: "progress", n: s.qIndex + 1 });
        return { ...s, answers, qIndex: s.qIndex + 1, hint: null };
      }
      if (!submitted.current) {
        submitted.current = true;
        let correct = 0;
        let aiWrong = 0;
        questions.forEach((qq, i) => {
          if (answers[i] === qq.answer) correct += 1;
          if (qq.wrongAiAnswer !== qq.answer && answers[i] === qq.wrongAiAnswer) aiWrong += 1;
        });
        const score = Math.round((correct / questions.length) * 100);
        send({ t: "progress", n: questions.length });
        send({ t: "submitScore", exam: examIndex === 0 ? 1 : 2, score, correct, aiWrongTrusted: aiWrong });
      }
      return { ...s, answers, hint: null, done: true };
    });
  };

  const tier = me.effectivePlan;
  const robotActor =
    tier === "free"
      ? []
      : tier === "lite"
        ? [{ id: "robot" as const, x: 1010, y: 600, direction: "left" as const, scale: 0.6 }]
        : [{ id: "robot" as const, x: 790, y: 605, direction: "left" as const, scale: 0.66 }];
  const noteProp = rules.noteLevel > 0 ? [{ id: "notebook", x: 560, y: 572, height: 60 }] : [];
  const examScene = (
    <Scene
      background="classroom"
      crop={{ y: 200, height: 400 }}
      props={[{ id: "desk", x: 640, y: 580, height: 120 }, ...noteProp]}
      actors={[{ id: avatar, x: 640, y: 630, direction: "up" }, ...robotActor]}
      label={
        tier === "free"
          ? "교실 책상 앞에 선 나. 루미AI 로봇은 곁에 없다"
          : `교실 책상 앞에 선 나와 곁에 선 루미AI 로봇 (${PLANS[tier].shortName})`
      }
    />
  );

  if (st.done) {
    return (
      <StageLayout
        scene={
          <Scene
            background="classroom"
            crop={{ y: 200, height: 400 }}
            actors={[
              { id: "teacher", x: 640, y: 330, direction: "down", scale: 0.95 },
              { id: avatar, x: 640, y: 620, direction: "up" },
              ...classmates(avatar, 2).map((id, i) => ({ id, x: 480 + i * 320, y: 600, direction: "up" as const })),
            ]}
            label="교실에서 답안지를 낸 친구들이 선생님을 바라본다"
          />
        }
        under={
          <div className="ee-success sd-center sd-examdone" style={{ padding: "12px 16px" }}>
            <ExamSheet current={questions.length} total={questions.length} width={72} />
            <Effect id="correct" token="done" size={64} />
            <div>
              <p className="sd-h2">답안지 냈다!</p>
              <p className="sd-small sd-muted">다른 친구들이 다 낼 때까지 기다리자. 곧 성적표가 나와.</p>
            </div>
          </div>
        }
      />
    );
  }

  const examName = examIndex === 0 ? EXAMS[0].name : "2교시 · 수학 (연산)";
  const notes = examIndex === 0 ? EXAMS[0].questions.filter((x) => x.note) : [];

  // 요약 노트 (1교시 · 요금제별) — 첫 문항에서는 펼쳐 두고, 이후에는 접어 둔다. 가로 태블릿에서는 장면 아래에 둔다.
  const noteBlock =
    examIndex === 0 ? (
        rules.noteLevel === 2 ? (
          <details className="ee-notice sd-note" open={st.qIndex === 0}>
            <summary>
              <Icon id="notebook" size={22} />
              루미AI 요약 노트 · 전부 다 ({notes.length}줄)
            </summary>
            <ul>
              {notes.map((x) => (
                <li key={x.q}>{x.note}</li>
              ))}
            </ul>
          </details>
        ) : rules.noteLevel === 1 ? (
          <details className="ee-notice sd-note" open={st.qIndex === 0}>
            <summary>
              <Icon id="notebook" size={22} />
              루미AI 요약 노트 · 절반만 ({Math.ceil(notes.length / 2)}줄)
            </summary>
            <ul>
              {notes
                .filter((_, i) => i % 2 === 0)
                .map((x) => (
                  <li key={x.q}>{x.note}</li>
                ))}
            </ul>
          </details>
        ) : st.qIndex === 0 ? (
          <div className="ee-notice sd-row">
            <Icon id="lock" size={24} label="잠김" />
            <div>
              <strong className="sd-small">요약 노트 · 잠겨 있어</strong>
              <p className="sd-small sd-muted">프로랑 프로맥스만 볼 수 있어.</p>
            </div>
          </div>
        ) : null
      ) : null;

  return (
    <StageLayout scene={examScene} under={noteBlock ?? undefined}>
      <div className="sd-row sd-between">
        <h2 className="sd-h2">{examName}</h2>
        <ExamSheet current={st.qIndex + 1} total={questions.length} width={72} />
      </div>

      <div className="ee-panel">
        <p className="sd-h3" style={{ lineHeight: 1.5 }}>
          {st.qIndex + 1}. {q.q}
        </p>

        {hintActive ? (
          <div style={{ position: "relative" }}>
            <Say speaker="robot" expression={st.hint!.wrong ? "neutral" : "explaining"} name="루미AI" role="status" compact>
              {st.hint!.wrong
                ? `아마 ${st.hint!.pick + 1}번 "${q.options[st.hint!.pick]}" 같아요.`
                : `답은 ${st.hint!.pick + 1}번 "${q.options[st.hint!.pick]}"입니다.`}
            </Say>
            <Effect id="clue" token={hintFx} size={56} className="sd-effect--float" />
          </div>
        ) : null}

        <div className="sd-choices" role="group" aria-label="보기">
          {q.options.map((opt, i) => (
            <button
              key={i}
              type="button"
              className="ee-choice"
              style={hintActive && st.hint!.pick === i ? { borderColor: "var(--ee-blue)", background: "#e8f3f5" } : undefined}
              disabled={!!ad}
              onClick={() => choose(i)}
            >
              <span className="sd-muted sd-num" style={{ marginRight: 8 }}>
                {i + 1}
              </span>
              {opt}
              {hintActive && st.hint!.pick === i ? <span className="sd-hint">루미AI 가 고른 답</span> : null}
            </button>
          ))}
        </div>

        <div className="sd-row">
          <button type="button" className="ee-button secondary" disabled={!canAsk} onClick={onAsk}>
            <Icon id="robot" size={24} />
            루미AI 한테 물어보기
            {rules.adSeconds > 0 && sharedLeft === 0 ? ` (광고 ${rules.adSeconds}초)` : ""}
          </button>
          <span className="sd-small sd-muted">
            {rules.aiCalls > 90 ? "질문 무제한" : `남은 질문 ${callsLeft}회`}
            {sharedLeft > 0 ? ` · 공용 ${sharedLeft}회` : ""}
          </span>
        </div>
      </div>

      {ad ? (
        <Modal label="광고 시청 중" hideClose>
          <div className="sd-center sd-stack">
            <Say speaker="robot" expression="neutral" name="루미AI 무료" compact>
              답을 보려면 광고를 끝까지 봐야 해요.
            </Say>
            <p className="sd-count sd-num" aria-live="polite">
              {Math.max(0, Math.ceil((ad.until - now) / 1000))}
            </p>
            <div className="ee-notice" style={{ textAlign: "left" }}>
              <p className="sd-small">{ad.fact}</p>
            </div>
            <button type="button" className="ee-button secondary" disabled>
              건너뛰기 · 프로맥스 전용
            </button>
          </div>
        </Modal>
      ) : null}
    </StageLayout>
  );
}

// ── 성적표 ───────────────────────────────────────────────────
function ReportView({
  exam,
  room,
  me,
  send,
}: {
  exam: 1 | 2;
  room: {
    players: Array<{ id: string; name: string; effectivePlan: keyof typeof PLANS; score1: number | null; score2: number | null }>;
  };
  me: { id: string };
  send: (m: { t: "mood"; emoji: string }) => void;
}) {
  const [graded, setGraded] = useState(false);
  const [mood, setMood] = useState<string | null>(null);
  const [appeal, setAppeal] = useState(false);
  const [ponder, setPonder] = useState<Record<string, number>>({});
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 가로 태블릿에서 표가 길면 표 안에서만 스크롤하므로, 내 줄이 보이게 맞춘다.
    if (!graded || !isLandscapeFit()) return;
    const me = tableRef.current?.querySelector<HTMLElement>("tr.sd-me");
    me?.scrollIntoView({ block: "nearest" });
  }, [graded]);

  useEffect(() => {
    setGraded(false);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(
      () => {
        setGraded(true);
        playSfx("paper");
      },
      reduce ? 50 : 1200,
    );
    return () => clearTimeout(t);
  }, [exam]);

  const rows = useMemo(
    () =>
      [...room.players]
        .map((p) => ({ ...p, score: exam === 1 ? p.score1 : p.score2 }))
        .filter((p) => p.score !== null)
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0)),
    [room.players, exam],
  );
  const mine = rows.find((r) => r.id === me.id);
  const scores = rows.map((r) => r.score ?? 0);
  const top = scores.length ? Math.max(...scores) : 0;
  const low = scores.length ? Math.min(...scores) : 0;
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  if (!graded) {
    return (
      <StageLayout>
        <div className="ee-panel sd-center" style={{ padding: "40px 16px" }} aria-live="polite">
          <Portrait id="robot" expression="neutral" size={72} label="채점AI" />
          <p className="sd-h2">채점하는 중…</p>
          <p className="sd-small sd-muted">윤리시티 채점AI 가 채점 중 · 모두 같은 기준으로 채점해</p>
        </div>
      </StageLayout>
    );
  }

  const report = (
    <div className="sd-report sd-report--main">
      <p className="sd-report__title">성적통지표</p>
      <div className="sd-report-grid">
        <div style={{ position: "relative" }}>
          <ReportSheet score={mine?.score ?? 0} avg={avg} width={200} />
          <span className="sd-stamp" style={{ position: "absolute", right: 0, top: 8 }}>
            채점필
          </span>
        </div>
        <div className="sd-report__table">
          <div className="sd-table-wrap sd-table-wrap--sticky" ref={tableRef}>
            <table className="sd-table">
              <thead>
                <tr>
                  <th scope="col">이름</th>
                  <th scope="col">요금제</th>
                  <th scope="col">점수</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={r.id === me.id ? "sd-me" : undefined}>
                    <td>{r.name}</td>
                    <td>
                      <PlanDot color={PLANS[r.effectivePlan].color} />
                      {PLANS[r.effectivePlan].shortName}
                    </td>
                    <td className="sd-num">{r.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="sd-small sd-muted sd-mt">
            가장 높은 점수 {top}점, 가장 낮은 점수 {low}점. 차이는 {top - low}점이야. 채점: 윤리시티 채점AI · 「AI 이용
            조례」 제7조에 따라 왜 이렇게 됐는지 물어볼 수 있어.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <StageLayout
      title={
        <PageTitle kicker={`${exam}교시 결과`} sub="우리 반 성적표야. 사람을 평가하는 표가 아니라, 조건이 만든 격차를 보여 주는 자료야.">
          성적표
        </PageTitle>
      }
      left={
        <>
          {exam === 1 ? (
            <Scene
              background="classroom"
              crop={{ y: 220, height: 400 }}
              actors={[
                { id: "haneul", x: 430, y: 560, direction: "down" },
                { id: "jiho", x: 560, y: 590, direction: "down" },
                { id: "saebom", x: 690, y: 565, direction: "down" },
                { id: "onyu", x: 820, y: 595, direction: "down" },
                { id: "daon", x: 950, y: 560, direction: "down" },
              ]}
              label="성적표를 받아 든 다섯 친구"
              className="sd-portrait-only"
            />
          ) : null}
          {report}
        </>
      }
    >
      {exam === 1 ? (
        <>
          <div className="ee-panel">
            <h2 className="sd-h3">잠깐, 생각해 보자</h2>
            {PONDER_PROMPTS.map((p) => (
              <div key={p.id}>
                <p className="sd-strong sd-small" style={{ marginBottom: 8 }}>
                  {p.question}
                </p>
                <div className="sd-choices--inline" role="group" aria-label={p.question}>
                  {p.options.map((opt, i) => (
                    <button
                      key={opt}
                      type="button"
                      className="ee-choice"
                      style={{ padding: "8px 14px", fontSize: 15 }}
                      aria-pressed={ponder[p.id] === i}
                      onClick={() => setPonder((s) => ({ ...s, [p.id]: i }))}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="ee-panel">
            {!appeal ? (
              <button
                type="button"
                className="ee-button secondary sd-wide"
                onClick={() => {
                  playSfx("tap");
                  setAppeal(true);
                }}
              >
                <Icon id="help" size={24} />
                채점AI 한테 물어보기 (조례 제7조)
              </button>
            ) : (
              <Say speaker="robot" expression="neutral" name="채점AI" compact>
                {APPEAL_REPLY}
              </Say>
            )}
          </div>
        </>
      ) : null}

      <div className="ee-panel">
        <h2 className="sd-h3">지금 기분이 어때?</h2>
        <div className="sd-choices--inline" role="group" aria-label="지금 기분">
          {EMOTIONS.map((e) => (
            <button
              key={e.code}
              type="button"
              className="ee-choice"
              style={{ padding: "8px 14px", fontSize: 15 }}
              aria-pressed={mood === e.code}
              onClick={() => {
                playSfx("tap");
                setMood(e.code);
                send({ t: "mood", emoji: e.code });
              }}
            >
              {e.label}
            </button>
          ))}
        </div>
        <p className="sd-small sd-muted">선생님 화면에 우리 반 기분이 모여.</p>
      </div>
    </StageLayout>
  );
}

// ── 딜레마 ───────────────────────────────────────────────────
function DilemmaView() {
  const [picked, setPicked] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const d = DILEMMA;

  return (
    <StageLayout
      title={
        <PageTitle kicker="쉬는 시간" sub={d.situation}>
          {d.title}
        </PageTitle>
      }
      scene={
        <Scene
          background="courtyard"
          crop={{ y: 140, height: 420 }}
          actors={[
            { id: "haneul", x: 500, y: 540, direction: "right" },
            { id: "saebom", x: 640, y: 560, direction: "down" },
            { id: "teacher", x: 800, y: 530, direction: "left", scale: 0.95 },
            { id: "robot", x: 980, y: 500, direction: "left", scale: 0.65 },
          ]}
          label="중앙마당에서 성적표를 들고 이야기하는 하늘·새봄·선생님·채점 로봇"
        />
      }
      compact
      under={
        !confirmed ? (
          <div className="sd-stack" style={{ gap: 14 }}>
            {d.voices.map((v) => (
              <Say key={v.role} speaker={v.speaker} expression={v.expression} name={v.role} compact>
                {v.text}
              </Say>
            ))}
          </div>
        ) : undefined
      }
    >
      {!confirmed ? (
        <>
          <p className="sd-small sd-strong">나라면 어떻게 할까? 하나를 고르자.</p>
          <div className="sd-choices" role="group" aria-label="선택지">
            {d.choices.map((c, i) => (
              <button key={i} type="button" className="ee-choice" aria-pressed={picked === i} onClick={() => setPicked(i)}>
                {c.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="ee-button sd-wide sd-big"
            disabled={picked === null}
            onClick={() => {
              playSfx("tap");
              setConfirmed(true);
            }}
          >
            이렇게 하겠습니다
          </button>
        </>
      ) : (
        <div className="ee-panel">
          <p className="sd-h3">나의 선택: {d.choices[picked!].label}</p>
          <div className="ee-success">
            <strong style={{ color: "var(--ee-green)" }}>얻은 것</strong>
            <p className="sd-small">{d.choices[picked!].gained}</p>
          </div>
          <div className="ee-notice">
            <strong style={{ color: "#8a6a1c" }}>부담한 사람</strong>
            <p className="sd-small">{d.choices[picked!].burden}</p>
          </div>
          <div className="ee-notice">
            <strong style={{ color: "var(--ee-red)" }}>남은 위험</strong>
            <p className="sd-small">{d.choices[picked!].remaining}</p>
          </div>
          <Say speaker="robot" expression="explaining" name="안내 로봇" compact>
            {d.closing}
          </Say>
        </div>
      )}
    </StageLayout>
  );
}

// ── 투표 ─────────────────────────────────────────────────────
function VoteView({
  room,
  me,
  send,
  avatar,
}: {
  room: { tally: VoteTally; players: unknown[] };
  me: { voted: boolean };
  send: (m: { t: "vote"; policy: PolicyId }) => void;
  avatar: AvatarId;
}) {
  const [picked, setPicked] = useState<PolicyId | null>(null);
  const total = Math.max(1, room.players.length);

  return (
    <StageLayout
      title={
        <PageTitle kicker="학급 회의" sub="다음 시험 규칙을 우리 손으로 정하자. 한 사람당 한 표야.">
          재시험 규칙 투표
        </PageTitle>
      }
      scene={
        <Scene
          background="classroom"
          crop={{ y: 140, height: 460 }}
          extras={[{ image: "sd_rule_board", x: 640, y: 330, height: 150 }]}
          actors={[
            { id: "teacher", x: 470, y: 340, direction: "right", scale: 0.95 },
            { id: avatar, x: 640, y: 570, direction: "up" },
            ...classmates(avatar, 3).map((id, i) => ({ id, x: 480 + i * 160, y: 530 + (i % 2) * 40, direction: "up" as const })),
          ]}
          label="교실 앞 규칙 게시판 앞에 모인 우리 반"
        />
      }
      compact
      under={
        <div className="sd-stack" style={{ gap: 14 }}>
          {POLICIES.flatMap((p) => p.voices.map((v, i) => ({ ...v, key: `${p.id}-${i}`, policy: p.name }))).map((v) => (
            <Say key={v.key} speaker={v.speaker} expression={v.expression} name={`${PLANSPEAKER[v.speaker]} · ${v.policy}`} compact>
              {v.text}
            </Say>
          ))}
        </div>
      }
    >
      <div className="sd-choices" role="group" aria-label="규칙 후보" style={{ gap: 12 }}>
        {POLICIES.map((p) => {
          const n = room.tally[p.id as PolicyId] ?? 0;
          return (
            <button
              key={p.id}
              type="button"
              className="ee-choice"
              aria-pressed={picked === p.id}
              onClick={() => {
                setPicked(p.id as PolicyId);
                playSfx("collect");
                send({ t: "vote", policy: p.id as PolicyId });
              }}
            >
              <strong>{p.name}</strong>
              <span className="sd-hint">{p.desc}</span>
              <span className="sd-hint">비용: {p.cost}</span>
              <span style={{ display: "block", marginTop: 8 }}>
                <Bar value={(n / total) * 100} tone="green" />
              </span>
              <span className="sd-hint sd-num sd-voteicon">
                <VoteHand size={22} />
                {n}표
              </span>
            </button>
          );
        })}
      </div>

      <p className="sd-small sd-muted sd-center">
        {me.voted ? "투표 완료! 바꾸고 싶으면 다시 눌러도 돼." : "하나를 골라서 투표해 보자."}
        <br />
        표를 제일 많이 받은 규칙으로 다음 시험을 봐.
      </p>
    </StageLayout>
  );
}

const PLANSPEAKER: Record<string, string> = {
  jiho: "지호",
  haneul: "하늘",
  saebom: "새봄",
  onyu: "온유",
  daon: "다온",
  teacher: "선생님",
  librarian: "사서 선생님",
  robot: "안내 로봇",
};

// ── 마무리 ───────────────────────────────────────────────────
function FinalView({
  room,
  me,
  send,
  avatar,
}: {
  room: {
    policy: PolicyId | null;
    tally: VoteTally;
    players: Array<{ id: string; score1: number | null; score2: number | null; effectivePlan: keyof typeof PLANS }>;
  };
  me: { id: string; name: string; plan: keyof typeof PLANS; effectivePlan: keyof typeof PLANS };
  send: (m: { t: "pledge" } | { t: "vote"; policy: PolicyId }) => void;
  avatar: AvatarId;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [legacy, setLegacy] = useState<PolicyId | null>(null);
  const mine = room.players.find((p) => p.id === me.id);
  const policy = POLICIES.find((p) => p.id === room.policy);
  const classRule = topLegacyRule(room.tally);

  useEffect(() => {
    if (done && legacy) {
      postComplete({ completed: true, role: "student", plan: me.plan, policy: room.policy, legacyRule: legacy });
    }
  }, [done, legacy, me.plan, room.policy]);

  const gap = (which: 1 | 2) => {
    const xs = room.players.map((p) => (which === 1 ? p.score1 : p.score2)).filter((x): x is number => x !== null);
    return xs.length ? Math.max(...xs) - Math.min(...xs) : null;
  };

  const pledgeScene = (
    <Scene
      background="classroom"
      crop={{ y: 160, height: 440 }}
      actors={[
        { id: "teacher", x: 640, y: 335, direction: "down", scale: 0.95 },
        { id: "robot", x: 820, y: 345, direction: "left", scale: 0.62 },
        { id: avatar, x: 640, y: 580, direction: "up" },
        ...classmates(avatar, 3).map((id, i) => ({ id, x: 470 + i * 170, y: 540 + (i % 2) * 36, direction: "up" as const })),
      ]}
      label="교실에서 서약서를 앞에 두고 모인 우리 반"
    />
  );
  const endingScene = (
    <Scene
      background="courtyard"
      crop={{ y: 120, height: 400 }}
      actors={[
        { id: avatar, x: 640, y: 560, direction: "down" },
        ...classmates(avatar, 3).map((id, i) => ({ id, x: 460 + i * 180 + (i >= 1 ? 60 : 0), y: 540 + (i % 2) * 30, direction: "down" as const })),
        { id: "teacher", x: 420, y: 480, direction: "down", scale: 0.95 },
        { id: "robot", x: 860, y: 470, direction: "down", scale: 0.65 },
      ]}
      label="학교 중앙마당에서 탐험을 마친 우리 반"
    />
  );

  return (
    <StageLayout
      title={
        <PageTitle kicker="마지막 시간" sub="성적표 두 장을 나란히 놓고 이야기해 보자.">
          성적표의 비밀
        </PageTitle>
      }
      scene={done && legacy ? endingScene : pledgeScene}
      compact
      under={
        <>
      <div className="ee-panel">
        <h2 className="sd-h3">똑같은 나, 성적표는 두 장</h2>
        {[
          { label: "1교시", score: mine?.score1 ?? null, plan: me.plan },
          { label: "2교시", score: mine?.score2 ?? null, plan: me.effectivePlan },
        ].map((row) => (
          <div key={row.label}>
            <div className="sd-row sd-between sd-small">
              <span className="sd-muted">
                {row.label} · {PLANS[row.plan].shortName}
              </span>
              <span className="sd-num sd-strong">{row.score ?? "-"}점</span>
            </div>
            <Bar value={row.score ?? 0} tone={row.label === "1교시" ? "blue" : "green"} />
          </div>
        ))}
        <div className="sd-row sd-between sd-small">
          <span className="sd-muted">우리 반 가장 높은 점수와 가장 낮은 점수의 차</span>
          <span className="sd-num">
            {gap(1) ?? "-"}점 → {gap(2) ?? "-"}점
          </span>
        </div>
        <p className="sd-small">
          과목이 바뀌어도 나는 똑같았어. 점수를 바꾼 건{" "}
          <strong>{policy ? `우리 반이 투표로 정한 규칙, ${policy.name}` : "규칙"}</strong>이었어.
        </p>
      </div>

      <div className="ee-panel">
        <h2 className="sd-h3">오늘 우리가 알게 된 것</h2>
        {LEARNINGS.map((c) => (
          <div key={c.concept} className="ee-notice">
            <strong style={{ color: "var(--ee-green)" }}>{c.concept}</strong>
            <p className="sd-small">{c.definition}</p>
          </div>
        ))}
      </div>

      <div className="ee-panel">
        <h2 className="sd-h3">이제 우리 이야기를 해 보자</h2>
        <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 8 }} className="sd-small">
          {REFLECTION_QUESTIONS.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ol>
      </div>
        </>
      }
    >
      <div className="sd-report">
        <p className="sd-report__title">시민 서약</p>
        {!done ? (
          <>
            <div className="sd-choices" role="group" aria-label="서약 문장">
              {PLEDGE_OPTIONS.map((p, i) => (
                <button key={p} type="button" className="ee-choice" aria-pressed={picked === i} onClick={() => setPicked(i)}>
                  {p}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="ee-button sd-wide sd-mt"
              disabled={picked === null}
              onClick={() => {
                playSfx("win");
                send({ t: "pledge" });
                setDone(true);
              }}
            >
              <Icon id="check" size={24} />
              서약하기
            </button>
          </>
        ) : (
          <div className="sd-center" style={{ position: "relative", padding: "6px 0" }}>
            <Effect id="unlock" token="pledged" size={72} className="sd-effect--float" />
            <p className="sd-h3" style={{ lineHeight: 1.6 }}>
              "{PLEDGE_OPTIONS[picked!]}"
            </p>
            <span className="sd-stamp sd-mt" style={{ display: "inline-block" }}>
              서약필
            </span>
          </div>
        )}
      </div>

      {done ? (
        <div className="ee-panel">
          <h2 className="sd-h3">다음 학년에게 남길 우리 반 규칙 한 줄</h2>
          <p className="sd-small sd-muted">
            우리가 겪은 일을 내년 이 교실의 후배들은 겪지 않게, 남기고 싶은 규칙 하나를 고르자. 한 사람당 한 표야.
          </p>
          <div className="sd-choices" role="group" aria-label="다음 학년에게 남길 규칙">
            {LEGACY_RULES.map((r) => {
              const n = room.tally[r.id] ?? 0;
              return (
                <button
                  key={r.id}
                  type="button"
                  className="ee-choice"
                  aria-pressed={legacy === r.id}
                  onClick={() => {
                    playSfx("collect");
                    setLegacy(r.id);
                    send({ t: "vote", policy: r.id });
                  }}
                >
                  {r.text}
                  <span className="sd-hint sd-num sd-voteicon">
                    <VoteHand size={22} />
                    {n}표
                  </span>
                </button>
              );
            })}
          </div>
          {legacy ? (
            <div className="ee-success">
              <FutureCard text={classRule ? classRule.text : "집계를 기다리는 중…"} width={220} />
              <p className="sd-center">
                <strong>우리 반이 남긴 한 줄:</strong> {classRule ? classRule.text : "집계를 기다리는 중…"}
              </p>
              <p className="sd-small sd-muted sd-center">가장 많은 표를 받은 문장이 우리 반의 한 줄이 돼. 바꾸고 싶으면 다시 눌러도 돼.</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {done && legacy ? (
        <div className="ee-success sd-center" style={{ padding: "20px 16px" }}>
          <Effect id="correct" token="complete" size={64} />
          <p className="sd-h2">탐험 완료</p>
          <p className="sd-small">
            우리가 발견한 것: 점수를 바꾼 건 실력이 아니라 조건과 규칙이었다.
            <br />
            기억할 한 문장: "{PLEDGE_OPTIONS[picked!]}"
          </p>
          <p className="sd-small sd-muted">선생님이 정리하는 동안 이 화면을 함께 보자.</p>
        </div>
      ) : null}

      {done && legacy ? (
        <>
          <Say speaker="robot" expression="explaining" name="안내 로봇">
            {SOLIDARITY_EXPLAIN}
          </Say>
          <div className="ee-panel">
            <h2 className="sd-h3">내 탐험 보고서 카드</h2>
            <p className="sd-small sd-muted">PNG로 저장해서 선생님께 내거나 학급 게시판에 모아요. 별명 말고 다른 개인정보는 들어가지 않아요.</p>
            <ReportCardView
              opts={studentReport({
                nick: me.name,
                avatar,
                plan: me.plan,
                effectivePlan: me.effectivePlan,
                score1: mine?.score1 ?? null,
                score2: mine?.score2 ?? null,
                gap1: gap(1),
                gap2: gap(2),
                policyName: policy ? policy.name : null,
                classRule: classRule ? classRule.text : null,
                pledge: PLEDGE_OPTIONS[picked!],
              })}
            />
          </div>
        </>
      ) : null}
    </StageLayout>
  );
}

/** 학생 보고서 카드 내용 — 별명·점수·요금제·우리 반 규칙·서약만 담는다(개인정보 없음). */
function studentReport(a: {
  nick: string;
  avatar: AvatarId;
  plan: keyof typeof PLANS;
  effectivePlan: keyof typeof PLANS;
  score1: number | null;
  score2: number | null;
  gap1: number | null;
  gap2: number | null;
  policyName: string | null;
  classRule: string | null;
  pledge: string;
}): ReportOpts {
  const s = (v: number | null) => (v === null ? "-" : `${v}점`);
  return {
    concept: "연대성",
    game: "성적표의 비밀",
    title: "성적표의 비밀 탐험 보고서",
    nick: a.nick,
    who: `${PLANS[a.plan].shortName} 요금제로 시작`,
    portrait: { id: a.avatar, expression: "happy" },
    stats: [
      { label: "1교시 점수", value: s(a.score1), color: "#3f7fb5" },
      { label: "2교시 점수", value: s(a.score2), color: "#5a8c65" },
      { label: "우리 반 점수 차 (1→2교시)", value: `${a.gap1 ?? "-"}→${a.gap2 ?? "-"}`, color: "#bf7865" },
      { label: "내 요금제 (1→2교시)", value: `${PLANS[a.plan].shortName}→${PLANS[a.effectivePlan].shortName}` },
    ],
    sections: [
      {
        heading: "우리 반이 함께 정한 것",
        rows: [
          ["2교시에 적용한 규칙", a.policyName ?? "-"],
          ["다음 학년에게 남길 한 줄", a.classRule ?? "집계 중"],
          ["내 서약", a.pledge],
        ],
      },
      { heading: "오늘 우리가 알게 된 것", lines: LEARNINGS.map((c) => `${c.concept}: ${c.definition}`) },
    ],
    ai: { name: "안내 로봇", text: SOLIDARITY_EXPLAIN, portrait: { id: "robot", expression: "explaining" } },
    remember: a.pledge,
    filename: `윤리시티_연대성_${a.nick}`,
  };
}
