// 교실(실시간 방) 프로토콜 — 서버(Durable Object)와 클라이언트가 함께 쓴다.
// 개인정보는 오가지 않는다: 별명과 점수만 다룬다.

export type PlanId = "free" | "lite" | "plus" | "pro" | "promax";

export type PolicyId = "keep" | "basic-for-all" | "shared-seats";

/** 교실 진행 단계 — 교사가 넘긴다. */
export type Stage =
  | "lobby" // 학생 입장 대기
  | "draw" // 요금제 뽑기 공개
  | "exam1" // 1교시 (사회)
  | "report1" // 1교시 성적표
  | "dilemma" // 선택의 갈림길
  | "vote" // 학급 회의 투표
  | "exam2" // 2교시 (수학 연산)
  | "report2" // 2교시 성적표
  | "final"; // 시민 서약·정리

export interface PlayerView {
  id: string;
  name: string;
  plan: PlanId;
  /** 정책 적용 후 실제 응시 요금제 (2교시에 달라질 수 있다) */
  effectivePlan: PlanId;
  sharedTurns: number;
  online: boolean;
  /** 현재 시험에서 푼 문항 수 */
  progress: number;
  score1: number | null;
  score2: number | null;
  voted: boolean;
  pledged: boolean;
}

export interface VoteTally {
  keep: number;
  "basic-for-all": number;
  "shared-seats": number;
}

export interface RoomState {
  code: string;
  stage: Stage;
  players: PlayerView[];
  policy: PolicyId | null;
  tally: VoteTally;
  /** 감정 체크 집계 (교사 화면에서 반 분위기를 본다) */
  moods: Record<string, number>;
  updatedAt: number;
}

// ── 클라이언트 → 서버 ────────────────────────────────────────

export type ClientMsg =
  | { t: "join"; name: string; token?: string }
  | { t: "teacherJoin" }
  | { t: "setStage"; stage: Stage }
  | { t: "progress"; n: number }
  | { t: "submitScore"; exam: 1 | 2; score: number; correct: number; aiWrongTrusted: number }
  | { t: "vote"; policy: PolicyId }
  | { t: "mood"; emoji: string }
  | { t: "pledge" }
  | { t: "reset" }
  | { t: "ping" };

// ── 서버 → 클라이언트 ────────────────────────────────────────

export type ServerMsg =
  | { t: "welcome"; you: PlayerView; token: string; room: RoomState }
  | { t: "teacherWelcome"; room: RoomState }
  | { t: "room"; room: RoomState }
  | { t: "stage"; stage: Stage; room: RoomState }
  | { t: "error"; message: string };

export const STAGE_ORDER: Stage[] = [
  "lobby",
  "draw",
  "exam1",
  "report1",
  "dilemma",
  "vote",
  "exam2",
  "report2",
  "final",
];

export const STAGE_LABEL: Record<Stage, string> = {
  lobby: "입장 대기",
  draw: "요금제 뽑기",
  exam1: "1교시 사회",
  report1: "1교시 성적표",
  dilemma: "선택의 갈림길",
  vote: "학급 회의 투표",
  exam2: "2교시 수학",
  report2: "2교시 성적표",
  final: "서약과 다음 학년",
};

export const MAX_PLAYERS = 40;

/** 방 코드: 헷갈리는 글자(0/O/1/I)를 뺀 6자리. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeRoomCode(rand: () => number = Math.random): string {
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)];
  }
  return out;
}

export function normalizeCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}
