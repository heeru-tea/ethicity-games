import { useEffect, useMemo, useState } from "react";
import { useRoom } from "../../net/useRoom";
import { pageUrl } from "../../net/server";
import { STAGE_LABEL, STAGE_ORDER, type PlanId, type PolicyId, type Stage } from "../../shared/protocol";
import {
  EXAMS,
  LEGACY_RULES,
  PLANS,
  POLICIES,
  emotionLabel,
  legacyRuleFor,
  SOLIDARITY_EXPLAIN,
  topLegacyRule,
} from "../../game/exam/content";
import { QrPanel } from "./Landing";
import { playSfx } from "../../game/exam/sound";
import { Icon, Portrait, Scene, type SceneActor } from "../../common/Sprite";
import { STUDENT_IDS } from "../../common/pack";
import { Bar, PlanDot, Say } from "../../components/game/ui";
import { postProgress } from "../../integration";
import { StageLayout } from "../../components/game/layout";
import { ReportCardView } from "../../components/game/ReportCardView";
import type { ReportOpts } from "../../common/reportCard";

// 교사 화면 — 교실을 열고, QR 을 띄우고, 단계를 넘기고, 실시간 현황을 본다.
// 학생 개인 점수로 줄을 세우지 않고 '요금제별 평균'으로 격차를 보여 준다.

export function TeacherScreen({ code }: { code: string }) {
  const { status, room, send } = useRoom(code, "teacher", "");
  const [confirmReset, setConfirmReset] = useState(false);
  const joinUrl = pageUrl({ room: code });

  const stage: Stage = room?.stage ?? "lobby";
  const idx = STAGE_ORDER.indexOf(stage);
  const players = room?.players ?? [];
  const online = players.filter((p) => p.online).length;

  useEffect(() => {
    postProgress(idx + 1, STAGE_ORDER.length);
  }, [idx]);

  const byPlan = useMemo(() => {
    const m = new Map<PlanId, { n: number; s1: number[]; s2: number[] }>();
    for (const p of players) {
      const cur = m.get(p.plan) ?? { n: 0, s1: [], s2: [] };
      cur.n += 1;
      if (p.score1 !== null) cur.s1.push(p.score1);
      if (p.score2 !== null) cur.s2.push(p.score2);
      m.set(p.plan, cur);
    }
    return m;
  }, [players]);

  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

  const go = (s: Stage) => {
    playSfx("door");
    send({ t: "setStage", stage: s });
  };

  const total = Math.max(1, players.length);
  const adopted = POLICIES.find((p) => p.id === room?.policy);
  const legacyTop = stage === "final" ? topLegacyRule(room?.tally) : null;

  return (
    <div className="sd-wrap sd-wrap--wide">
      <div className="sd-row sd-between sd-tophud">
        <div className="sd-row">
          <Portrait id="teacher" expression="explaining" size={48} />
          <h1 className="sd-h2" style={{ fontSize: 24 }}>
            선생님 화면
          </h1>
        </div>
        <span className="ee-badge">
          {status === "open" ? "연결됨" : status === "connecting" ? "연결 중" : "연결 끊김"} · 접속 {online}명 /
          등록 {players.length}명
        </span>
      </div>

      {/* 교실 장면 — 입장한 아이 수만큼 공통 아이들이 서 있다. 가로 태블릿·TV 에서는 왼쪽을 꽉 채우고, 입장 QR·집계는 그 아래 */}
      <StageLayout
        scene={<ClassroomBand count={players.length} online={online} />}
        under={
          <>
          {stage === "lobby" ? (
            <div className="ee-panel sd-center sd-qrpanel">
              <QrPanel url={joinUrl} />
              <div className="sd-qrpanel__text">
                <h2 className="sd-h2">학생들에게 이 화면을 보여 주세요</h2>
                <p className="sd-small sd-muted">QR 이 안 되면 코드를 불러 주세요</p>
                <p className="sd-code sd-num">{code}</p>
                <p className="sd-small sd-muted" style={{ overflowWrap: "anywhere" }}>
                  {joinUrl}
                </p>
              </div>
            </div>
          ) : null}
      {/* 투표 집계 — 학급 회의 (2교시 전) */}
      {stage !== "final" && (stage === "vote" || room?.policy) ? (
        <div className="ee-panel">
          <h2 className="sd-h2">학급 회의 투표</h2>
          <div className="sd-stack sd-stack--tight">
            {POLICIES.map((p) => {
              const n = room?.tally[p.id as PolicyId] ?? 0;
              const chosen = room?.policy === p.id;
              return (
                <div key={p.id}>
                  <div className="sd-row sd-between sd-small">
                    <span className={chosen ? "sd-strong" : undefined}>
                      {p.name}
                      {chosen ? " · 채택" : ""}
                    </span>
                    <span className="sd-num">{n}표</span>
                  </div>
                  <Bar value={(n / total) * 100} tone={chosen ? "green" : undefined} />
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* 다음 학년에게 남길 규칙 — 서약 단계 */}
      {stage === "final" ? (
        <div className="ee-panel">
          <h2 className="sd-h2">다음 학년에게 남길 우리 반 규칙</h2>
          {adopted ? (
            <p className="sd-small sd-muted">2교시에 적용한 규칙: {adopted.name}</p>
          ) : null}
          <div className="sd-stack sd-stack--tight">
            {LEGACY_RULES.map((r) => {
              const n = room?.tally[r.id] ?? 0;
              const top = legacyTop?.id === r.id;
              return (
                <div key={r.id}>
                  <div className="sd-row sd-between sd-small">
                    <span className={top ? "sd-strong" : undefined}>{r.text}</span>
                    <span className="sd-num">{n}표</span>
                  </div>
                  <Bar value={(n / total) * 100} tone={top ? "gold" : undefined} />
                </div>
              );
            })}
          </div>
          {legacyTop ? (
            <div className="ee-success">
              <span className="sd-strong">우리 반이 남긴 한 줄:</span> {legacyTop.text}
            </div>
          ) : (
            <p className="sd-small sd-muted">아직 투표가 들어오지 않았습니다.</p>
          )}
          <p className="sd-small sd-muted">서약한 학생 {players.filter((p) => p.pledged).length}명 / {players.length}명</p>
        </div>
      ) : null}

      {/* 마지막 정리: 안내 로봇이 연대성을 한 번 더 풀어 주고, 우리 반 보고서 카드를 PNG 로 남긴다 */}
      {stage === "final" ? (
        <>
          <Say speaker="robot" expression="explaining" name="안내 로봇" compact>
            {SOLIDARITY_EXPLAIN}
          </Say>
          <div className="ee-panel">
            <h2 className="sd-h2">우리 반 보고서 카드</h2>
            <p className="sd-small sd-muted">요금제별 평균·점수 차·채택한 규칙·남긴 한 줄이 한 장에 들어갑니다. 학생 이름은 들어가지 않습니다.</p>
            <ReportCardView
              opts={teacherReport({
                code,
                n: players.length,
                avg1: avg(players.map((p) => p.score1).filter((x): x is number => x !== null)),
                avg2: avg(players.map((p) => p.score2).filter((x): x is number => x !== null)),
                gap1: gapOf(players.map((p) => p.score1)),
                gap2: gapOf(players.map((p) => p.score2)),
                planRows: (["promax", "pro", "plus", "lite", "free"] as PlanId[])
                  .filter((id) => byPlan.has(id))
                  .map((id) => {
                    const row = byPlan.get(id)!;
                    return [PLANS[id].shortName, `${row.n}명 · 1교시 ${avg(row.s1) ?? "-"} · 2교시 ${avg(row.s2) ?? "-"}`] as [string, string];
                  }),
                policyName: adopted ? adopted.name : null,
                legacyRows: LEGACY_RULES.map((r) => [r.text, `${room?.tally[r.id] ?? 0}표`] as [string, string]),
                classRule: legacyTop ? legacyTop.text : null,
                pledged: players.filter((p) => p.pledged).length,
              })}
            />
          </div>
        </>
      ) : null}

      {/* 요금제별 평균 — 격차를 한눈에 */}
      {players.some((p) => p.score1 !== null) ? (
        <div className="ee-panel">
          <h2 className="sd-h2">요금제별 평균 점수</h2>
          <div className="sd-table-wrap">
            <table className="sd-table">
              <thead>
                <tr>
                  <th scope="col">요금제</th>
                  <th scope="col">인원</th>
                  <th scope="col">1교시 평균</th>
                  <th scope="col">2교시 평균</th>
                </tr>
              </thead>
              <tbody>
                {(["promax", "pro", "plus", "lite", "free"] as PlanId[]).map((id) => {
                  const row = byPlan.get(id);
                  if (!row) return null;
                  return (
                    <tr key={id}>
                      <td>
                        <PlanDot color={PLANS[id].color} />
                        {PLANS[id].shortName}
                      </td>
                      <td className="sd-num">{row.n}</td>
                      <td className="sd-num">{avg(row.s1) ?? "-"}</td>
                      <td className="sd-num">{avg(row.s2) ?? "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="sd-small sd-muted">
            같은 시험, 같은 시간이었습니다. 평균을 가른 것은 무엇이었는지 아이들에게 물어보세요.
          </p>
        </div>
      ) : null}

      {/* 심화 문항 해설 — 선생님만 본다 */}
      {stage === "report1" || stage === "exam1" ? (
        <details className="ee-panel sd-note">
          <summary>1교시 심화 문항은 왜 어려운가 (선생님용)</summary>
          <p className="sd-small sd-muted">
            아래 문항들은 「윤리시티 자료집」을 본 학생만 풀 수 있습니다. 점수 차이가 갈리는 지점이 바로
            여기입니다.
          </p>
          <ol style={{ margin: "10px 0 0", paddingLeft: 20, display: "grid", gap: 10 }}>
            {EXAMS[0].questions
              .map((q, i) => ({ q, i }))
              .filter((x) => x.q.teacherNote)
              .map(({ q, i }) => (
                <li key={q.q} value={i + 1} className="sd-small">
                  <strong>{q.q}</strong>
                  <br />
                  <span style={{ color: "var(--ee-green)" }}>정답 · {q.options[q.answer]}</span>
                  <br />
                  <span className="sd-muted">{q.teacherNote}</span>
                </li>
              ))}
          </ol>
        </details>
      ) : null}

      {/* 감정 집계 */}
      {room && Object.keys(room.moods).length > 0 ? (
        <div className="ee-notice">
          <h2 className="sd-h3">지금 우리 반 기분</h2>
          <div className="sd-row" style={{ marginTop: 8 }}>
            {Object.entries(room.moods).map(([code, n]) => (
              <span key={code} className="ee-badge">
                {emotionLabel(code)} {n}명
              </span>
            ))}
          </div>
        </div>
      ) : null}

          </>
        }
      >
      {/* 단계 제어 */}
      <div className="ee-panel">
        <h2 className="sd-h2">
          수업 단계 · 지금은 「{STAGE_LABEL[stage]}」
        </h2>
        <div className="sd-stages" role="group" aria-label="수업 단계">
          {STAGE_ORDER.map((s, i) => (
            <button
              key={s}
              type="button"
              className="ee-choice"
              aria-pressed={s === stage}
              style={{ opacity: i <= idx ? 1 : 0.6 }}
              onClick={() => go(s)}
            >
              {i + 1}. {STAGE_LABEL[s]}
            </button>
          ))}
        </div>
        <div className="sd-row">
          <button
            type="button"
            className="ee-button secondary"
            disabled={idx <= 0}
            onClick={() => go(STAGE_ORDER[Math.max(0, idx - 1)])}
          >
            <Icon id="arrow_left" size={24} />
            이전 단계
          </button>
          <button
            type="button"
            className="ee-button"
            disabled={idx >= STAGE_ORDER.length - 1}
            onClick={() => go(STAGE_ORDER[Math.min(STAGE_ORDER.length - 1, idx + 1)])}
          >
            다음 단계로 넘기기
            <Icon id="arrow_right" size={24} />
          </button>
        </div>
        {stage === "vote" ? (
          <p className="ee-notice sd-small">
            다음 단계(2교시)로 넘기는 순간 투표가 마감되고, 가장 많은 표를 받은 규칙이 적용됩니다.
          </p>
        ) : null}
        {stage === "final" ? (
          <p className="ee-notice sd-small">
            학생들이 서약한 뒤 「다음 학년에게 남길 규칙 한 줄」에 투표합니다. 집계는 아래에 모입니다.
          </p>
        ) : null}
      </div>

      {/* 참가자 현황 — 가로 화면에서는 오른쪽 칸의 남은 높이를 채운다(game.css .sd-panel__grow) */}
      <div className="ee-panel sd-panel__grow">
        <h2 className="sd-h2">참가자 ({players.length}명)</h2>
        {players.length === 0 ? (
          <Say speaker="robot" expression="explaining" name="안내 로봇" compact>
            아직 아무도 들어오지 않았어요. QR 을 화면에 띄워 주세요.
          </Say>
        ) : (
          <div className="sd-players">
            {players.map((p) => (
              <div key={p.id} className="ee-notice" style={{ opacity: p.online ? 1 : 0.55 }}>
                <div className="sd-row" style={{ gap: 6 }}>
                  <PlanDot color={PLANS[p.effectivePlan].color} />
                  <strong className="sd-small">{p.name}</strong>
                </div>
                <p className="sd-small sd-muted" style={{ fontSize: 13 }}>
                  {PLANS[p.effectivePlan].shortName}
                  {p.progress > 0 ? ` · ${p.progress}문항` : ""}
                  {p.score1 !== null ? ` · 1교시 ${p.score1}점` : ""}
                  {p.score2 !== null ? ` · 2교시 ${p.score2}점` : ""}
                  {p.voted ? " · 투표함" : ""}
                  {p.pledged ? " · 서약함" : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {stage === "final" && legacyRuleFor(room?.policy) === null && adopted ? null : null}

      <div className="sd-center">
        {!confirmReset ? (
          <button type="button" className="ee-button secondary" onClick={() => setConfirmReset(true)}>
            <Icon id="retry" size={24} />
            교실 초기화 (다음 반 수업 준비)
          </button>
        ) : (
          <div className="ee-panel" style={{ display: "inline-grid", gap: 8, textAlign: "left" }}>
            <span className="sd-small">참가자와 점수를 모두 지울까요?</span>
            <div className="sd-row">
              <button
                type="button"
                className="ee-button"
                onClick={() => {
                  send({ t: "reset" });
                  setConfirmReset(false);
                }}
              >
                네, 지웁니다
              </button>
              <button type="button" className="ee-button secondary" onClick={() => setConfirmReset(false)}>
                아니요
              </button>
            </div>
          </div>
        )}
      </div>
      </StageLayout>
    </div>
  );
}

const BAND_MAX = 15;

function gapOf(xs: Array<number | null>): number | null {
  const v = xs.filter((x): x is number => x !== null);
  return v.length ? Math.max(...v) - Math.min(...v) : null;
}

/** 우리 반 보고서 카드 내용 — 반 전체 집계만 담는다(학생 이름 없음). */
function teacherReport(a: {
  code: string;
  n: number;
  avg1: number | null;
  avg2: number | null;
  gap1: number | null;
  gap2: number | null;
  planRows: Array<[string, string]>;
  policyName: string | null;
  legacyRows: Array<[string, string]>;
  classRule: string | null;
  pledged: number;
}): ReportOpts {
  return {
    concept: "연대성",
    game: "성적표의 비밀",
    title: "성적표의 비밀 · 우리 반 보고서",
    who: `교실 ${a.code} · 참가 ${a.n}명 · 서약 ${a.pledged}명`,
    portrait: { id: "teacher", expression: "happy" },
    stats: [
      { label: "1교시 반 평균", value: a.avg1 === null ? "-" : `${a.avg1}점`, color: "#3f7fb5" },
      { label: "2교시 반 평균", value: a.avg2 === null ? "-" : `${a.avg2}점`, color: "#5a8c65" },
      { label: "점수 차 (1→2교시)", value: `${a.gap1 ?? "-"}→${a.gap2 ?? "-"}`, color: "#bf7865" },
      { label: "참가 학생", value: `${a.n}명` },
    ],
    sections: [
      { heading: "요금제별 평균 점수", rows: a.planRows.length ? a.planRows : [["아직 점수 없음", "-"]] },
      { heading: "우리 반이 함께 정한 것", rows: [["2교시에 적용한 규칙", a.policyName ?? "-"], ["다음 학년에게 남길 한 줄", a.classRule ?? "집계 중"], ...a.legacyRows] },
    ],
    ai: { name: "안내 로봇", text: SOLIDARITY_EXPLAIN, portrait: { id: "robot", expression: "explaining" } },
    remember: a.classRule ?? "점수를 바꾼 건 실력이 아니라 조건과 규칙이었다.",
    filename: `윤리시티_연대성_우리반_${a.code}`,
  };
}

/** 선생님 화면의 교실 장면(16:9 전체). 아이들은 공통 학생 5명을 돌려 쓰고 15명까지 보인다. */
function ClassroomBand({ count, online }: { count: number; online: number }) {
  const actors = useMemo<SceneActor[]>(() => {
    const list: SceneActor[] = [{ id: "teacher", x: 640, y: 330, direction: "down", scale: 0.95 }];
    const n = Math.min(count, BAND_MAX);
    for (let i = 0; i < n; i++) {
      const col = i % 5;
      const row = Math.floor(i / 5);
      list.push({ id: STUDENT_IDS[i % STUDENT_IDS.length], x: 440 + col * 100 + (row % 2) * 30, y: 500 + row * 56, direction: "up", scale: 0.8 });
    }
    return list;
  }, [count]);
  return (
    <Scene
      background="classroom"
      actors={actors}
      label={`교실에 학생 ${count}명이 들어와 있다 (접속 ${online}명)`}
    >
      <span className="sd-counter" style={{ left: "50%", top: "4%" }}>
        {count === 0 ? "아직 아무도 없어요" : `등록 ${count}명 · 접속 ${online}명${count > BAND_MAX ? ` · 화면에는 ${BAND_MAX}명까지` : ""}`}
      </span>
    </Scene>
  );
}
