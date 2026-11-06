import { useMemo, useState, type ReactNode } from "react";
import {
  ALLOCATION_RULES,
  ARRIVAL_NOTE,
  BEST_SINGLE_CRITERION,
  CRITERIA,
  DEFAULT_LOTTERY_SEED,
  GRADER_GAME,
  GRADER_HINTS,
  MINIGAME_FICTIONAL_LINE,
  MINIGAME_RULE_NOTE,
  NEED_NOTE,
  TICKET_COUNT,
  TICKET_GAME,
  TICKET_STUDENTS,
  TICKET_TOTAL_NEED,
  allocate,
  randomLotterySeed,
  scoreByAi,
  type AllocationRuleId,
  type CriterionId,
} from "../../game/exam/minigame";
import { PageTitle, Say } from "../../components/game/ui";
import { StageLayout } from "../../components/game/layout";
import { Icon, Scene } from "../../common/Sprite";
import { getAvatar } from "../../common/pack";
import { playSfx } from "../../game/exam/sound";
import { DeliveryGame } from "./DeliveryGame";

// 공정성 미니게임 — 세 활동을 탭으로 오간다.
// 점수도 등수도 없다. 규칙을 골라 보고 무슨 일이 벌어지는지 함께 확인한다.
// 가로 태블릿에서는 장면(작게)·설명이 왼쪽, 탭과 고르는 버튼이 오른쪽 맨 위에 온다.

interface Frame {
  title: ReactNode;
  tabs: ReactNode;
}

export function FairnessMinigame() {
  const [tab, setTab] = useState<"delivery" | "tickets" | "grader">("delivery");

  const title = (
    <PageTitle kicker="공정성 미니게임" sub={MINIGAME_RULE_NOTE}>
      내가 규칙을 정한다면
    </PageTitle>
  );
  const tabs = (
    <div className="sd-choices--inline sd-tabs" role="group" aria-label="활동 고르기">
      {(
        [
          ["delivery", "이용권 배달"],
          ["tickets", "규칙 실험실"],
          ["grader", "AI 채점기"],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          type="button"
          className="ee-choice"
          style={{ flex: 1, minWidth: 96, textAlign: "center" }}
          aria-pressed={tab === id}
          onClick={() => {
            playSfx("tap");
            setTab(id);
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
  const frame = { title, tabs };

  if (tab === "delivery") return <DeliveryGame title={title} tabs={tabs} />;
  if (tab === "tickets") return <TicketGame frame={frame} />;
  return <GraderGame frame={frame} />;
}

// ── 미니게임 1 · 이용권 나누기 ───────────────────────────────
function TicketGame({ frame }: { frame: Frame }) {
  const [rule, setRule] = useState<AllocationRuleId | null>(null);
  const [seed, setSeed] = useState(DEFAULT_LOTTERY_SEED);
  const [tried, setTried] = useState<Set<AllocationRuleId>>(new Set());

  const outcome = useMemo(() => (rule ? allocate(rule, TICKET_STUDENTS, seed) : null), [rule, seed]);

  const pick = (id: AllocationRuleId) => {
    playSfx("paper");
    setRule(id);
    setTried((prev) => new Set(prev).add(id));
  };

  const left = (
    <>
      <div className="ee-panel">
        <h2 className="sd-h3">
          {TICKET_GAME.title} · {TICKET_GAME.subtitle}
        </h2>
        <p className="sd-small">{TICKET_GAME.intro}</p>
        <div className="sd-row">
          <span className="ee-badge">이용권 {TICKET_COUNT}장</span>
          <span className="ee-badge">신청 합계 {TICKET_TOTAL_NEED}장</span>
        </div>
      </div>

      {/* 신청자 명단 */}
      <div className="ee-panel">
        <h2 className="sd-h3">신청한 친구들</h2>
        <div className="sd-stack sd-stack--tight">
          {TICKET_STUDENTS.map((s) => {
            const share = outcome?.shares.find((x) => x.studentId === s.id);
            const state = !share
              ? null
              : share.emptyHanded
                ? "한 장도 못 받음"
                : share.satisfied
                  ? "신청만큼 받음"
                  : "일부만 받음";
            return (
              <div
                key={s.id}
                className="ee-notice"
                style={{
                  borderLeft: share
                    ? `6px solid ${share.emptyHanded ? "var(--ee-red)" : share.satisfied ? "var(--ee-green)" : "var(--ee-gold)"}`
                    : undefined,
                }}
              >
                <div className="sd-row sd-between">
                  <strong>
                    {s.name}
                    <span className="sd-small sd-muted" style={{ fontWeight: 400 }}>
                      {" "}
                      · {s.need}장 신청 · 도착 {s.arrivalOrder}번째
                      {s.hasHomeAi ? " · 집에 AI 있음" : " · 집에 AI 없음"}
                    </span>
                  </strong>
                  {share ? (
                    <span className="sd-num sd-strong" style={{ color: share.emptyHanded ? "var(--ee-red)" : undefined }}>
                      {share.received}장 · {state}
                    </span>
                  ) : null}
                </div>
                <p className="sd-small sd-muted">{s.note}</p>
              </div>
            );
          })}
        </div>
        <p className="sd-small sd-muted">
          {ARRIVAL_NOTE} {NEED_NOTE}
        </p>
      </div>
    </>
  );

  return (
    <StageLayout title={frame.title} scene={<LabScene tab="tickets" />} compact under={left}>
      {frame.tabs}

      {/* 규칙 고르기 */}
      <div className="ee-panel">
        <h2 className="sd-h3">어떤 규칙으로 나눌까요?</h2>
        <p className="sd-small sd-muted">네 가지를 모두 눌러 보세요. 살펴본 규칙: {tried.size}/4</p>
        <div className="sd-choices" role="group" aria-label="배분 규칙">
          {ALLOCATION_RULES.map((r) => (
            <button key={r.id} type="button" className="ee-choice" aria-pressed={rule === r.id} onClick={() => pick(r.id)}>
              <strong>
                {r.name}
                {tried.has(r.id) ? " · 살펴봄" : ""}
              </strong>
              <span className="sd-hint">{r.desc}</span>
            </button>
          ))}
        </div>
        {rule === "lottery" ? (
          <button
            type="button"
            className="ee-button secondary sd-wide"
            onClick={() => {
              playSfx("paper");
              setSeed(randomLotterySeed());
            }}
          >
            <Icon id="retry" size={24} />
            다시 뽑기 — 결과가 또 달라집니다
          </button>
        ) : null}
      </div>

      {/* 결과 */}
      {outcome ? (
        <div className="ee-panel">
          <h2 className="sd-h3">결과 · {outcome.ruleName}</h2>
          <p className="sd-small sd-muted">{outcome.orderNote}</p>
          <div className="sd-row">
            <span className="ee-badge">신청만큼 받음 {outcome.satisfiedCount}명</span>
            <span className="ee-badge" style={outcome.emptyHandedCount > 0 ? { borderColor: "var(--ee-red)" } : undefined}>
              한 장도 못 받음 {outcome.emptyHandedCount}명
            </span>
            {outcome.leftoverTickets > 0 ? <span className="ee-badge">남은 이용권 {outcome.leftoverTickets}장</span> : null}
          </div>

          {outcome.fairnessNotes.length > 0 ? (
            <div className="ee-notice">
              <strong style={{ color: "var(--ee-red)" }}>이번 규칙에서 생긴 일</strong>
              <ul style={{ margin: "4px 0 0", paddingLeft: 18 }} className="sd-small">
                {outcome.fairnessNotes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="ee-success">
            <strong style={{ color: "var(--ee-green)" }}>이 규칙, 좋은 점</strong>
            <p className="sd-small">{outcome.goodPoint}</p>
          </div>
          <div className="ee-notice">
            <strong style={{ color: "#8a6a1c" }}>그런데 이런 점이 걸려</strong>
            <p className="sd-small">{outcome.missedPoint}</p>
          </div>
        </div>
      ) : null}

      {tried.size >= 4 ? (
        <Say speaker="robot" expression="explaining" name="안내 로봇" compact>
          네 가지 규칙을 다 봤어요. {TICKET_GAME.afterText} {TICKET_GAME.question}
        </Say>
      ) : null}
      <p className="sd-small sd-muted">{MINIGAME_FICTIONAL_LINE}</p>
    </StageLayout>
  );
}

// ── 미니게임 2 · AI 채점기 훈련시키기 ────────────────────────
function GraderGame({ frame }: { frame: Frame }) {
  const [on, setOn] = useState<Set<CriterionId>>(new Set());
  const outcome = useMemo(() => scoreByAi([...on]), [on]);

  const toggle = (id: CriterionId) => {
    playSfx("paper");
    setOn((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const left = (
    <>
      <div className="ee-panel">
        <h2 className="sd-h3">
          {GRADER_GAME.title} · {GRADER_GAME.subtitle}
        </h2>
        <p className="sd-small">{GRADER_GAME.intro}</p>
      </div>

      {/* 채점 결과 */}
      <div className="ee-panel">
        <h2 className="sd-h3">AI 채점 결과와 선생님 평가</h2>
        {outcome.noCriteria ? (
          <Say speaker="robot" expression="worried" name="채점AI" compact>
            기준을 하나도 켜지 않았어요. 무엇을 봐야 할지 몰라 아무도 구별하지 못해요.
          </Say>
        ) : (
          <>
            <div className="sd-row">
              <span className="ee-badge">사람 평가와 일치도 {outcome.agreementPercent}%</span>
              <span className="ee-badge" style={outcome.biasScore > 30 ? { borderColor: "var(--ee-red)" } : undefined}>
                어긋남 {outcome.biasScore}
              </span>
            </div>
            <div className="sd-table-wrap">
              <table className="sd-table">
                <thead>
                  <tr>
                    <th scope="col">AI 가 매긴 순서</th>
                    <th scope="col">이름</th>
                    <th scope="col">AI 점수</th>
                    <th scope="col">선생님이 본 순서</th>
                    <th scope="col">결과</th>
                  </tr>
                </thead>
                <tbody>
                  {outcome.rows.map((r) => (
                    <tr key={r.answerId}>
                      <td className="sd-num">{r.aiRank}</td>
                      <td>{r.name}</td>
                      <td className="sd-num">{r.aiScore}</td>
                      <td className="sd-num">{r.humanRank}</td>
                      <td
                        style={{
                          color: r.verdict === "손해" ? "var(--ee-red)" : r.verdict === "이득" ? "var(--ee-blue)" : undefined,
                          fontWeight: r.verdict === "그대로" ? 400 : 700,
                        }}
                      >
                        {r.verdict}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="sd-small">{outcome.verdictText}</p>
            {outcome.harmed.length > 0 ? (
              <div className="ee-notice">
                <strong style={{ color: "var(--ee-red)" }}>손해를 본 친구</strong>
                <ul style={{ margin: "4px 0 0", paddingLeft: 18 }} className="sd-small">
                  {outcome.harmed.map((h) => (
                    <li key={h.name}>{h.text}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </div>
    </>
  );

  return (
    <StageLayout title={frame.title} scene={<LabScene tab="grader" />} compact under={left}>
      {frame.tabs}

      {/* 기준 켜고 끄기 */}
      <div className="ee-panel">
        <h2 className="sd-h3">채점 기준 켜기</h2>
        <p className="sd-small sd-muted">켠 기준만으로 AI 가 점수를 매깁니다. 하나만 켜 보기도 하고, 다 켜 보기도 하세요.</p>
        <div className="sd-choices" role="group" aria-label="채점 기준">
          {CRITERIA.map((c) => (
            <button key={c.id} type="button" className="ee-choice" aria-pressed={on.has(c.id)} onClick={() => toggle(c.id)}>
              <strong>
                {on.has(c.id) ? "켬 · " : "끔 · "}
                {c.name}
              </strong>
              <span className="sd-hint">{c.caution}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 힌트와 정리 */}
      <div className="ee-notice">
        <strong>이렇게도 해 보자</strong>
        <ul style={{ margin: "6px 0 0", paddingLeft: 18, display: "grid", gap: 4 }} className="sd-small">
          {GRADER_HINTS.slice(0, 3).map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </div>

      {on.size > 0 ? (
        <Say speaker="robot" expression="explaining" name="안내 로봇" compact>
          {GRADER_GAME.afterText} {GRADER_GAME.question}
          {!on.has(BEST_SINGLE_CRITERION) ? " 아직 「생각의 근거」 기준은 켜 보지 않았어요. 켜고 비교해 보세요." : ""}
        </Say>
      ) : null}
      <p className="sd-small sd-muted">{MINIGAME_FICTIONAL_LINE}</p>
    </StageLayout>
  );
}

/** 규칙 실험실·AI 채점기 탭의 장면 — 같은 AI 실습실 창구 앞에서 책상·컴퓨터·독서기록장 소품과 함께. */
function LabScene({ tab }: { tab: "tickets" | "grader" }) {
  const me = getAvatar();
  return (
    <Scene
      background="ai_lab"
      crop={{ y: 160, height: 400 }}
      extras={[{ image: "sd_helpdesk", x: 1040, y: 560, height: 150 }]}
      props={[
        { id: "desk", x: 520, y: 560, height: 120 },
        { id: tab === "grader" ? "computer" : "notebook", x: 520, y: 548, height: tab === "grader" ? 70 : 56 },
      ]}
      actors={[
        { id: "robot", x: 1040, y: 500, direction: "down", scale: 0.66 },
        { id: me, x: 520, y: 600, direction: "up", scale: 0.85 },
        { id: "saebom", x: 760, y: 560, direction: "left", scale: 0.85 },
      ]}
      label={tab === "grader" ? "AI 실습실에서 채점 기준을 만져 보는 나와 새봄" : "AI 실습실에서 이용권 규칙을 실험하는 나와 새봄"}
    />
  );
}
