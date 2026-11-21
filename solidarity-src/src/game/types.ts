// 윤리시티 — AI 인생게임 공유 타입.
// 게임 규칙 데이터와 엔진, 화면이 모두 이 타입을 기준으로 맞물린다.

export type MetricKey = "trust" | "solidarity" | "publicImpact" | "choiceRange";

export type EvidenceCategory = "question" | "verification" | "collaboration";

export type ClaimType = "official" | "designer" | "fictional";

/** 카드·미션 선택이 게임 상태에 가하는 구조화 효과. */
export type EffectOp =
  | { kind: "credits"; delta: number }
  | { kind: "salaryBonus"; amount: number; uses: number; label: string }
  | { kind: "metric"; metric: MetricKey; delta: number }
  | { kind: "pressure"; delta: number }
  | { kind: "aiEvidence"; category: EvidenceCategory; label: string }
  | { kind: "lottery"; win: number; label: string }
  | { kind: "record"; note: string };

export interface ChoiceDef {
  /** 원본 선택지 문구 (cards.json 보존) */
  label: string;
  ops: EffectOp[];
  /** 선택 후 3단 피드백: 무엇이 좋아졌고, 누가 부담했으며, 무엇이 남았는지 */
  gained: string;
  burden: string;
  remaining: string;
  /** 이 선택이 남기는 AI 활용 증거 종류(있을 때만) */
  evidenceTag?: EvidenceCategory;
  /** 특정 접근 조건 태그를 가진 시민에게 다르게 보이는 안내 */
  accessNotes?: Partial<Record<AccessTag, string>>;
}

export type MissionZone = "library" | "allocation" | "relay" | "city";

export interface MissionCardDef {
  id: string; // M-01 ... M-24
  index: number; // 0-based, cards.json missionCards 순서
  zone: MissionZone;
  title: string; // 원본 t
  situation: string; // 원본 s
  task: string; // 원본 task
  srcIds: string[]; // 원본 src 파싱
  claim: ClaimType;
  choices: ChoiceDef[]; // 원본 choices 문구 보존 + 구조화 효과
  image: string; // /assets/ethicity/cards/mission/mission-NN.svg
}

export type EconomyCategory =
  | "salary"
  | "tax"
  | "lottery"
  | "cost"
  | "training"
  | "support";

export interface EconomyCardDef {
  id: string; // E-01 ... E-24
  index: number;
  cat: EconomyCategory;
  title: string; // 원본 t
  situation: string; // 원본 s
  effectText: string; // 원본 effect 문자열 보존
  ruleText: string; // 원본 rule 보존
  claim: ClaimType; // 경제 카드는 전부 fictional(수업용 가상자료)
  /** 정산형 카드(정기 월급·정기 세금)는 공식으로 처리 */
  settlement?: "salary" | "tax";
  choices: ChoiceDef[];
  image: string;
}

export type AccessTag =
  | "public-ai-only"
  | "shared-device"
  | "needs-easy-korean"
  | "verification-novice"
  | "low-network"
  | "free-tier"
  | "time-limit"
  | "no-paid-tools"
  | "assistive-input"
  | "travel-to-library";

export interface CitizenDef {
  id: string; // c01..c10
  name: string;
  strength: string;
  limit: string;
  interest: string;
  accessTag: AccessTag;
  /** 접근 조건이 플레이에서 어떻게 나타나는지 학생용 설명 */
  accessNote: string;
  /** 도움을 받을 수 있는 곳 (S05 공개 카드) */
  supportNote: string;
  colors: { skin: string; hair: string; shirt: string };
  portrait: string;
  token: string;
}

export type TileKind =
  | "start"
  | "tutorial"
  | "salary"
  | "cost-life"
  | "event"
  | "practice"
  | "tax"
  | "dilemma"
  | "lottery"
  | "journal"
  | "mission1"
  | "cost-repair"
  | "solidarity"
  | "privacy"
  | "cost-subscription"
  | "skillcheck"
  | "mission2"
  | "training"
  | "cost-transport"
  | "evidence"
  | "mission3"
  | "network"
  | "policy-draft"
  | "mission4"
  | "assembly"
  | "ending";

export interface TileDef {
  index: number; // 0..35
  day: number; // (index+1)*5
  label: string; // 보드 표기 문구
  kind: TileKind;
  /** 마스터 보드(3840×2160) 타일 중심 좌표 */
  master: { x: number; y: number };
  /** 모바일 보드(390×4240) 타일 중심 좌표 */
  mobile: { x: number; y: number };
  zone?: MissionZone;
}

export interface SourceDef {
  id: string; // KOR-01 ... INT-08
  shortLabel: string;
  natureLabel: string; // 효력 라벨 (국내 교육지침 등)
  region: "KOR" | "INT";
  docTitle: string; // 원문명
  publisher: string;
  year: string;
  url: string;
  lastVerified: string; // 2026-08-16
  studentSummary: string; // 학생용 한 문장(2~4문장 이내)
  studentQuestion: string; // 생각해 볼 질문
  teacherScope: string; // 효력·적용범위 설명
  caution?: string; // INT-06/07/08 오해 방지 문구
  tags: string[]; // 필터: 아동·청소년, 교육, 법·규정, 권고, 자발표준
}

export type SalaryModifier = {
  amount: number;
  usesLeft: number;
  label: string;
};

export interface JournalEntry {
  turn: number;
  day: number;
  tileIndex: number;
  tileLabel: string;
  type:
    | "turn"
    | "choice"
    | "salary"
    | "tax"
    | "lottery"
    | "mission"
    | "dilemma"
    | "evidence"
    | "policy"
    | "system";
  title: string;
  detail: string;
  reason?: string; // 학생이 남긴 이유
  deltas?: Array<{ label: string; delta: number }>;
}

export interface CardResult {
  cardId: string;
  tileIndex: number;
  turn: number;
  choiceIndex: number;
  choiceLabel: string;
  reason?: string;
  evidenceViewed: boolean;
}

export interface LedgerLine {
  turn: number;
  day: number;
  label: string;
  delta: number;
  balance: number;
}

// ── 미션 상태 ──────────────────────────────────────────────

export type LibrarySlot = "seat" | "wait" | "helpdesk";

export interface LibraryState {
  status: "idle" | "active" | "done";
  /** 시민 9명(민서 제외 나머지) 배치: citizenId → slot */
  placements: Record<string, LibrarySlot>;
  rule: "first-come" | "equal" | "urgent-first" | "lottery" | "support" | null;
  sceneIndex: number; // 카드 6장 장면 진행
  sceneChoices: number[]; // 장면별 선택 인덱스
  revisionsUsed: number; // 수정 기회 1회
  reason: string;
}

export interface AllocationTeam {
  id: string;
  name: string;
  need: number; // 필요 1..5
  expectedImpact: number; // 기대 효과 1..5
  accessGap: number; // 현재 접근 부족 1..5
  giveBack: number; // 공동체 환원 1..5
  requested: number;
}

export interface AllocationState {
  status: "idle" | "active" | "done";
  first: Record<string, number>; // 첫 배분안 teamId → 수량
  revised: Record<string, number>; // 수정안
  stage: "first" | "feedback" | "revise" | "done";
  explanationsViewed: string[]; // 설명 보기 실행한 팀
  objections: string[]; // 이의제기 접수 팀
  humanReviews: string[]; // 사람이 다시 검토한 팀
  sceneIndex: number;
  sceneChoices: number[];
  reason: string;
}

export type RelayRole = "question" | "verify" | "explain" | "peer";

export interface RelayState {
  status: "idle" | "active" | "done";
  /** 역할 노드별 도움 담당 시민 수(부하) */
  load: Record<RelayRole, number>;
  fatigue: Record<RelayRole, number>; // 0..5
  policies: string[]; // 2인 멘토조·도움시간 상한·익명 요청·안내서 공유
  sceneIndex: number;
  sceneChoices: number[];
  reason: string;
}

export type PolicyArea =
  | "school-access"
  | "staff-retraining"
  | "privacy"
  | "explain-appeal"
  | "local-link";

export interface CityState {
  status: "idle" | "active" | "done";
  budget: Record<PolicyArea, number>; // 합계 100일 때만 적용
  applied: boolean;
  sceneIndex: number;
  sceneChoices: number[];
  reason: string;
  review: { gained: string; burden: string; risk: string; nextReview: string };
}

export interface PolicyDraft {
  focus: PolicyArea | null;
  memo: string;
}

export interface DilemmaResult {
  dilemmaId: string;
  choiceIndex: number;
  reason: string;
  groupNotes: string[]; // 모둠 의견
  minorityNote: string; // 남은 질문·소수의견
}

// ── 게임 전체 상태 ─────────────────────────────────────────

export type GameMode = "solo" | "group" | "teacher-demo";

export type GamePhase =
  | "start"
  | "mode"
  | "privacy"
  | "citizen"
  | "access"
  | "playing"
  | "ending";

/** 타일 도착 시 처리해야 할 사건 종류 */
export type EncounterKind =
  | "tutorial"
  | "salary"
  | "tax"
  | "economy-card"
  | "lottery-card"
  | "practice"
  | "dilemma"
  | "journal"
  | "mission"
  | "solidarity-card"
  | "privacy-card"
  | "skillcheck"
  | "training-card"
  | "evidence"
  | "network"
  | "policy-draft"
  | "assembly"
  | "ending";

export interface Encounter {
  kind: EncounterKind;
  tileIndex: number;
  cardId?: string; // 카드형 사건일 때
  missionZone?: MissionZone;
  dilemmaId?: string;
}

export interface GameState {
  schemaVersion: number;
  contentVersion: string;
  mode: GameMode;
  seed: string;
  rngCursor: number; // 시드 재현: 지금까지 소비한 난수 개수
  phase: GamePhase;
  day: number;
  tileIndex: number;
  turn: number;
  citizenId: string | null;
  credits: number;
  lastSalary: number;
  aiSkill: 0 | 1 | 2 | 3;
  aiEvidence: Array<{ category: EvidenceCategory; label: string; day: number }>;
  choiceRange: number; // 0..10
  trust: number; // 0..10
  solidarity: number; // 0..10
  publicImpact: number; // 0..10
  pressure: number; // 0..
  taxPaid: number;
  publicBudget: number; // 세금 → 공공서비스 연결 표시용
  salaryModifiers: SalaryModifier[];
  seenEconomyCards: string[]; // 덱 중복 방지
  /** 지나온 월급·세금 칸의 정산 대기열 (인생게임식: 지나가도 정산) */
  settlementQueue: Array<{ type: "salary" | "tax"; tileIndex: number }>;
  pendingEncounter: Encounter | null;
  lastDial: number | null;
  journal: JournalEntry[];
  ledger: LedgerLine[];
  cardHistory: CardResult[];
  evidenceViews: string[]; // 열람한 출처 ID
  dilemmas: DilemmaResult[];
  library: LibraryState;
  allocation: AllocationState;
  relay: RelayState;
  city: CityState;
  policyDraft: PolicyDraft;
  createdAt: string;
  updatedAt: string;
}

export interface SessionSummary {
  /** 교사 대시보드용 익명 세션 요약(현재 브라우저만) */
  id: string;
  citizenId: string | null;
  mode: GameMode;
  seed: string;
  day: number;
  finished: boolean;
  metrics: {
    credits: number;
    aiSkill: number;
    choiceRange: number;
    trust: number;
    solidarity: number;
    publicImpact: number;
    pressure: number;
  };
  choices: Array<{ cardId: string; choiceIndex: number; choiceLabel: string }>;
  remainingRisks: string[];
  missionRevisions: number;
  evidenceViews: string[];
  updatedAt: string;
}
