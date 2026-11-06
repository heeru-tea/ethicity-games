// ─────────────────────────────────────────────────────────────
// 윤리시티 — 성적표의 비밀 · 공정성 미니게임 2종
//
// 1) 이용권 나누기   — 배분 정의(justice): 한정된 자원을 어떤 규칙으로 나눌 것인가.
// 2) AI 채점기 훈련시키기 — 알고리즘 편향(bias): 사람이 정한 기준이 결과를 만든다.
//
// 두 미니게임 모두 점수 경쟁이 아니다. 규칙을 직접 정해 보고,
// 그 규칙이 누구를 돕고 누구를 밀어내는지 눈으로 확인하는 활동이다.
// 이 파일은 데이터와 순수 함수만 담는다 (UI 없음).
// 등장인물·상황은 모두 수업용 가상 설정이다.
// ─────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════
// 공통
// ═══════════════════════════════════════════════════════════

export interface MinigameMeta {
  id: "tickets" | "grader";
  title: string;
  subtitle: string;
  concept: string; // 배우는 개념
  minutes: number; // 수업 시간 배분 표시용
  intro: string; // 상황 설명
  notCompetition: string; // 점수 경쟁이 아님을 알리는 문구
  afterText: string; // 결과를 본 뒤 읽는 교육적 정리
  question: string; // 토론 질문
}

/** 두 미니게임 공통 안내 — 어느 화면에서든 같은 약속을 보여 준다. */
export const MINIGAME_RULE_NOTE =
  "정답도 등수도 없어. 골라 보고 무슨 일이 생기는지 같이 확인하면 돼.";

// ═══════════════════════════════════════════════════════════
// 미니게임 1 · 이용권 나누기 (배분 정의)
// ═══════════════════════════════════════════════════════════

export const TICKET_COUNT = 10;

export interface TicketStudent {
  id: string;
  name: string;
  need: number; // 필요도 1~5 (본인이 신청한 장수)
  hasHomeAi: boolean; // 집에 이미 AI가 있는가
  arrivalOrder: number; // 도착 순서 1~6
  note: string; // 사정 한 줄 — 숫자만으로는 보이지 않는 것
}

/**
 * 이용권을 원하는 학생 6명.
 * 필요하다고 말한 장수를 모두 더하면 19장 — 이용권 10장으로는 다 채울 수 없다.
 * 어떤 규칙을 골라도 누군가는 부족하게 설계되어 있다.
 */
export const TICKET_STUDENTS: readonly TicketStudent[] = [
  {
    id: "haram",
    name: "하람",
    need: 2,
    hasHomeAi: true,
    arrivalOrder: 1,
    note: "집에 AI가 있어서 두 장만 신청했다.",
  },
  {
    id: "doyun",
    name: "도윤",
    need: 3,
    hasHomeAi: true,
    arrivalOrder: 2,
    note: "집 AI를 형과 번갈아 써서 학교에서도 쓰고 싶다.",
  },
  {
    id: "ara",
    name: "아라",
    need: 4,
    hasHomeAi: false,
    arrivalOrder: 3,
    note: "집에 AI가 없어 학교에서만 쓸 수 있다.",
  },
  {
    id: "narin",
    name: "나린",
    need: 4,
    hasHomeAi: false,
    arrivalOrder: 4,
    note: "집에 AI가 없고, 다음 주에 발표 준비가 있다.",
  },
  {
    id: "seojin",
    name: "서진",
    need: 5,
    hasHomeAi: false,
    arrivalOrder: 5,
    note: "집에도 학원에도 AI가 없다. 이번 단원이 특히 어렵다.",
  },
  {
    id: "yuha",
    name: "유하",
    need: 1,
    hasHomeAi: false,
    arrivalOrder: 6,
    note: "집에 AI가 없지만, 친구들에게 양보하려고 한 장만 적었다.",
  },
];

export const TICKET_TOTAL_NEED: number = TICKET_STUDENTS.reduce(
  (sum, s) => sum + s.need,
  0,
);

/** 도착 순서에 대한 사실 — 선착순 규칙을 판단할 때 함께 읽는다. */
export const ARRIVAL_NOTE =
  "도착 순서는 그냥 그날 누가 먼저 교실에 있었느냐일 뿐이야. 누가 더 노력했는지랑은 상관없어. 서진이랑 유하는 방과후 수업이 있어서 늦게 왔대.";

/** 필요도에 대한 사실 — 필요한 사람 먼저 규칙을 판단할 때 함께 읽는다. */
export const NEED_NOTE =
  "필요도는 자기가 직접 적은 숫자야. 크게 적으면 많이 받고, 양보하려고 작게 적으면 적게 받아. 숫자 하나에 사정을 다 담기는 어렵지.";

export type AllocationRuleId = "first-come" | "equal" | "need-first" | "lottery";

export const ALLOCATION_RULE_IDS: readonly AllocationRuleId[] = [
  "first-come",
  "equal",
  "need-first",
  "lottery",
];

export interface AllocationRuleDef {
  id: AllocationRuleId;
  name: string;
  desc: string; // 규칙을 한 문장으로
  howOrder: string; // 나눠 주는 순서를 정하는 방법
  goodPoint: string; // 이 규칙의 좋은 점
  missedPoint: string; // 이 규칙이 구조적으로 놓치는 것
}

export const ALLOCATION_RULES: readonly AllocationRuleDef[] = [
  {
    id: "first-come",
    name: "선착순",
    desc: "먼저 온 사람부터 신청한 만큼 받고, 이용권이 떨어지면 끝난다.",
    howOrder: "도착한 순서대로 나눠 줬어.",
    goodPoint:
      "규칙이 단순해서 누구나 이해할 수 있고, 다툴 거리가 적어. 미리 준비한 사람이 손해 보지 않아.",
    missedPoint:
      "그런데 먼저 온 게 잘한 것도, 더 필요하다는 뜻도 아니잖아. 방과후 수업이 있거나 아파서 늦은 친구는 사정과 상관없이 뒤로 밀려. 늦게 온 친구가 얼마나 필요한지는 아예 세어 보지도 못해.",
  },
  {
    id: "equal",
    name: "똑같이 나누기",
    desc: "여섯 명 모두에게 같은 장수를 나눠 준다.",
    howOrder: "순서 없이 모두에게 똑같이 나눠 줬어.",
    goodPoint:
      "아무도 빈손이 되지 않아. 눈으로 보기에 가장 공평하고, 왜 그렇게 나눴는지 설명하기 쉬워.",
    missedPoint:
      "그런데 필요한 양이 서로 다른데 똑같이 주면, 많이 필요한 친구는 여전히 모자라. 집에 이미 AI가 있는 친구도 똑같이 한 장을 가져가고. 게다가 딱 나눠떨어지지 않고 남는 건 이 규칙만으로는 정할 수 없어서, 또 다른 규칙이 필요해져.",
  },
  {
    id: "need-first",
    name: "필요한 사람 먼저",
    desc: "필요도가 큰 사람부터 신청한 만큼 받는다. 같으면 집에 AI가 없는 사람이 먼저다.",
    howOrder:
      "필요도가 큰 사람부터, 같으면 집에 AI가 없는 사람부터 나눠 줬어.",
    goodPoint:
      "가장 절실한 친구가 진짜로 도움을 받아. 이용권이 제일 쓸모 있는 곳으로 가는 거지.",
    missedPoint:
      "그런데 필요도를 누가 어떻게 정하느냐가 결과를 다 바꿔. 자기 필요를 크게 말한 친구가 유리하고, 양보하려고 작게 적은 유하는 한 장도 못 받을 수 있어. 조금만 필요한 친구의 사정은 아예 없는 것처럼 되고.",
  },
  {
    id: "lottery",
    name: "제비뽑기",
    desc: "뽑기로 순서를 정하고, 그 순서대로 신청한 만큼 받는다.",
    howOrder: "뽑은 순서대로 나눠 줬어.",
    goodPoint:
      "누구도 미리 유리하지 않아. 힘이 세거나 목소리가 큰 사람이 이득을 보지 않고, 결과에 대한 다툼도 적어.",
    missedPoint:
      "그런데 운은 사정을 몰라. 집에 AI가 없어서 꼭 필요한 친구가 빈손이 될 수도 있고, 왜 그렇게 됐는지 아무도 설명하지 못해. 다시 뽑으면 결과가 또 달라지고.",
  },
];

export function findAllocationRule(ruleId: AllocationRuleId): AllocationRuleDef {
  const found = ALLOCATION_RULES.find((r) => r.id === ruleId);
  if (!found) throw new Error(`알 수 없는 배분 규칙: ${ruleId}`);
  return found;
}

export interface AllocationShare {
  studentId: string;
  name: string;
  need: number;
  hasHomeAi: boolean;
  received: number; // 받은 장수
  shortfall: number; // 모자란 장수 (0 이상)
  satisfied: boolean; // 신청한 만큼 받았는가
  emptyHanded: boolean; // 한 장도 받지 못했는가
}

export interface AllocationOutcome {
  ruleId: AllocationRuleId;
  ruleName: string;
  totalTickets: number;
  totalNeed: number;
  filledTickets: number; // 실제로 채워진 필요 장수
  shares: AllocationShare[]; // 명단 순서 그대로
  orderNames: string[]; // 실제로 나눠 준 순서
  orderNote: string;
  satisfiedNames: string[];
  satisfiedCount: number;
  emptyHandedNames: string[];
  emptyHandedCount: number;
  leftoverTickets: number; // 아무도 쓰지 못하고 남은 장수
  noHomeAiShortfallNames: string[]; // 집에 AI가 없는데 부족한 사람
  hasHomeAiReceivedNames: string[]; // 집에 AI가 있는데 받은 사람
  fairnessNotes: string[]; // 이번 결과에서 실제로 생긴 문제점
  goodPoint: string;
  missedPoint: string;
}

/** 순서대로 신청한 만큼 나눠 주고, 떨어지면 멈춘다. */
function giveInOrder(
  order: readonly TicketStudent[],
  tickets: number,
): { given: Map<string, number>; leftover: number } {
  const given = new Map<string, number>();
  let left = tickets;
  for (const s of order) {
    const take = Math.max(0, Math.min(s.need, left));
    given.set(s.id, take);
    left -= take;
  }
  return { given, leftover: left };
}

/** 똑같이 나누기 — 나눠떨어지지 않는 나머지는 규칙만으로 정할 수 없어 남는다. */
function giveEqually(
  students: readonly TicketStudent[],
  tickets: number,
): { given: Map<string, number>; leftover: number } {
  const given = new Map<string, number>();
  if (students.length === 0) return { given, leftover: tickets };
  const each = Math.floor(tickets / students.length);
  let used = 0;
  for (const s of students) {
    const take = Math.min(each, s.need);
    given.set(s.id, take);
    used += take;
  }
  return { given, leftover: tickets - used };
}

/** 씨앗값으로 결정되는 난수 — 같은 씨앗이면 언제나 같은 뽑기 결과가 나온다. */
function makeRandom(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithSeed(
  students: readonly TicketStudent[],
  seed: number,
): TicketStudent[] {
  const next = makeRandom(seed);
  const list = [...students];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    const a = list[i];
    const b = list[j];
    list[i] = b;
    list[j] = a;
  }
  return list;
}

/** 기본 뽑기 씨앗 — 수업에서 같은 화면을 다시 열어도 결과가 흔들리지 않게 한다. */
export const DEFAULT_LOTTERY_SEED = 2035;

/**
 * 새 뽑기를 하고 싶을 때 UI가 쓸 씨앗값.
 * 이 함수만 무작위이고, allocate 자체는 씨앗을 받아 순수하게 동작한다.
 */
export function randomLotterySeed(): number {
  return Math.floor(Math.random() * 2147483647) + 1;
}

/**
 * 배분 규칙 하나를 적용해 결과를 계산한다. (순수 함수)
 * 같은 규칙·같은 명단·같은 씨앗이면 언제나 같은 결과가 나온다.
 */
export function allocate(
  ruleId: AllocationRuleId,
  students: readonly TicketStudent[] = TICKET_STUDENTS,
  seed: number = DEFAULT_LOTTERY_SEED,
): AllocationOutcome {
  const rule = findAllocationRule(ruleId);
  const totalNeed = students.reduce((sum, s) => sum + s.need, 0);

  let order: readonly TicketStudent[];
  let result: { given: Map<string, number>; leftover: number };

  switch (ruleId) {
    case "first-come": {
      order = [...students].sort((a, b) => a.arrivalOrder - b.arrivalOrder);
      result = giveInOrder(order, TICKET_COUNT);
      break;
    }
    case "need-first": {
      order = [...students].sort(
        (a, b) =>
          b.need - a.need ||
          Number(a.hasHomeAi) - Number(b.hasHomeAi) ||
          a.arrivalOrder - b.arrivalOrder,
      );
      result = giveInOrder(order, TICKET_COUNT);
      break;
    }
    case "lottery": {
      order = shuffleWithSeed(students, seed);
      result = giveInOrder(order, TICKET_COUNT);
      break;
    }
    case "equal": {
      order = students;
      result = giveEqually(students, TICKET_COUNT);
      break;
    }
  }

  const shares: AllocationShare[] = students.map((s) => {
    const received = result.given.get(s.id) ?? 0;
    return {
      studentId: s.id,
      name: s.name,
      need: s.need,
      hasHomeAi: s.hasHomeAi,
      received,
      shortfall: Math.max(0, s.need - received),
      satisfied: received >= s.need,
      emptyHanded: received === 0,
    };
  });

  const satisfiedNames = shares.filter((s) => s.satisfied).map((s) => s.name);
  const emptyHandedNames = shares
    .filter((s) => s.emptyHanded)
    .map((s) => s.name);
  const noHomeAiShortfall = shares.filter((s) => !s.hasHomeAi && s.shortfall > 0);
  const hasHomeAiReceived = shares.filter((s) => s.hasHomeAi && s.received > 0);
  const filledTickets = shares.reduce((sum, s) => sum + s.received, 0);

  const fairnessNotes: string[] = [];
  if (emptyHandedNames.length > 0) {
    fairnessNotes.push(
      `한 장도 받지 못한 사람: ${emptyHandedNames.join(", ")} (${emptyHandedNames.length}명)`,
    );
  } else {
    fairnessNotes.push("한 장도 받지 못한 사람은 없어.");
  }
  if (noHomeAiShortfall.length > 0) {
    fairnessNotes.push(
      `집에 AI가 없는데 신청한 만큼 받지 못한 사람: ${noHomeAiShortfall
        .map((s) => `${s.name} ${s.received}/${s.need}장`)
        .join(", ")}`,
    );
  } else {
    fairnessNotes.push("집에 AI가 없는 사람은 모두 신청한 만큼 받았어.");
  }
  if (hasHomeAiReceived.length > 0) {
    fairnessNotes.push(
      `집에 이미 AI가 있는데 이용권을 받은 사람: ${hasHomeAiReceived
        .map((s) => `${s.name} ${s.received}장`)
        .join(", ")}`,
    );
  }
  if (result.leftover > 0) {
    fairnessNotes.push(
      `아무도 못 쓰고 남은 이용권 ${result.leftover}장. 이 규칙만으로는 이걸 누구한테 줄지 정할 수 없어.`,
    );
  }
  fairnessNotes.push(
    `친구들이 필요하다고 한 ${totalNeed}장 가운데 실제로 채워진 건 ${filledTickets}장.`,
  );

  return {
    ruleId,
    ruleName: rule.name,
    totalTickets: TICKET_COUNT,
    totalNeed,
    filledTickets,
    shares,
    orderNames: order.map((s) => s.name),
    orderNote: rule.howOrder,
    satisfiedNames,
    satisfiedCount: satisfiedNames.length,
    emptyHandedNames,
    emptyHandedCount: emptyHandedNames.length,
    leftoverTickets: result.leftover,
    noHomeAiShortfallNames: noHomeAiShortfall.map((s) => s.name),
    hasHomeAiReceivedNames: hasHomeAiReceived.map((s) => s.name),
    fairnessNotes,
    goodPoint: rule.goodPoint,
    missedPoint: rule.missedPoint,
  };
}

/** 네 규칙을 나란히 비교하는 표를 만들 때 쓴다. (순수 함수) */
export function allocateAll(
  students: readonly TicketStudent[] = TICKET_STUDENTS,
  seed: number = DEFAULT_LOTTERY_SEED,
): AllocationOutcome[] {
  return ALLOCATION_RULE_IDS.map((id) => allocate(id, students, seed));
}

export const TICKET_GAME: MinigameMeta = {
  id: "tickets",
  title: "이용권 나누기",
  subtitle: "10장을 6명에게",
  concept: "배분 정의 — 한정된 것을 어떤 규칙으로 나눌 것인가",
  minutes: 7,
  intro:
    "우리 반에 AI 이용권 10장이 생겼어! 쓰고 싶다고 손 든 친구는 6명인데, 필요하다는 걸 다 더하면 19장이야. 10장으로는 모두를 채울 수 없어. 어떤 규칙으로 나눌지 정하는 건 바로 너야.",
  notCompetition:
    "점수도 등수도 없어. 어떤 규칙을 골라도 이기거나 지지 않아. 규칙을 정하면 무슨 일이 생기는지 직접 보는 거야. 네 개 다 눌러 봐도 돼.",
  afterText:
    "네 개를 다 눌러 보면 알게 될 거야. 어떤 규칙을 골라도 도움받는 친구와 밀려나는 친구가 같이 생겨. 공정함은 어딘가에 정답이 하나 있는 게 아니라, 무엇을 먼저 지킬지 고르는 일이야. 규칙을 고른다는 건 누구를 먼저 챙길지 고르는 일이기도 해.",
  question:
    "우리 반이라면 어떤 규칙을 고를까? 그리고 그 규칙 때문에 밀려나는 친구한테는 뭘 더 해 줄 수 있을까?",
};

// ═══════════════════════════════════════════════════════════
// 미니게임 2 · AI 채점기 훈련시키기 (알고리즘 편향)
// ═══════════════════════════════════════════════════════════

export type CriterionId =
  | "length"
  | "hard-words"
  | "reason"
  | "speed"
  | "spelling";

export const ALL_CRITERION_IDS: readonly CriterionId[] = [
  "length",
  "hard-words",
  "reason",
  "speed",
  "spelling",
];

export interface CriterionDef {
  id: CriterionId;
  name: string;
  desc: string;
  favors: string; // 이 기준이 유리하게 만드는 답
  caution: string; // 이 기준에 숨은 함정
}

export const CRITERIA: readonly CriterionDef[] = [
  {
    id: "length",
    name: "글자 수가 많으면 높은 점수",
    desc: "답안이 길수록 점수를 높게 준다.",
    favors: "오래, 길게 쓴 답",
    caution:
      "길다고 생각이 깊은 건 아니잖아. 같은 말을 늘여 쓴 답이 앞으로 가고, 짧지만 정확한 답이 뒤로 밀려.",
  },
  {
    id: "hard-words",
    name: "어려운 낱말을 쓰면 높은 점수",
    desc: "어려운 낱말이 많이 들어갈수록 점수를 높게 준다.",
    favors: "어려운 말을 많이 아는 답",
    caution:
      "쉬운 말로 정확하게 쓴 답이 낮게 나와. 어려운 말을 많이 들어 본 친구한테 유리한 기준이야.",
  },
  {
    id: "reason",
    name: "생각의 근거가 있으면 높은 점수",
    desc: "왜 그렇게 생각했는지 까닭을 밝힐수록 점수를 높게 준다.",
    favors: "까닭을 들어 설명한 답",
    caution:
      "까닭이 몇 개인지는 셀 수 있어도, 그 까닭이 좋은지 나쁜지까지는 셀 수 없어.",
  },
  {
    id: "speed",
    name: "빨리 제출하면 높은 점수",
    desc: "먼저 낸 답안일수록 점수를 높게 준다.",
    favors: "가장 먼저 낸 답",
    caution:
      "빨리 쓰는 거랑 잘 쓰는 건 다르잖아. 오래 고쳐 쓰며 고민한 답이 손해를 봐.",
  },
  {
    id: "spelling",
    name: "맞춤법이 정확하면 높은 점수",
    desc: "맞춤법이 정확할수록 점수를 높게 준다.",
    favors: "맞춤법이 깔끔한 답",
    caution:
      "맞춤법은 생각이 아니라 겉모습이야. 집이나 학원에서 연습할 기회가 많았던 친구가 유리해져.",
  },
];

export function findCriterion(id: CriterionId): CriterionDef {
  const found = CRITERIA.find((c) => c.id === id);
  if (!found) throw new Error(`알 수 없는 채점 기준: ${id}`);
  return found;
}

export interface StudentAnswer {
  id: string;
  name: string;
  charCount: number; // 글자 수
  hardWordCount: number; // 어려운 낱말 수
  reasonCount: number; // 근거로 든 까닭의 수
  hasReason: boolean; // 근거 유무
  submitOrder: number; // 제출 속도 (1이 가장 빠름)
  spellingScore: number; // 맞춤법 점수 0~10
  humanQuality: number; // 사람 교사 평가 1~5 (5가 가장 좋음)
  answerSummary: string; // 답안 한 줄 요약
  teacherNote: string; // 선생님이 그렇게 평가한 까닭
}

/**
 * 같은 질문에 대한 답안 5개.
 * '근거' 기준만 켜면 사람 교사의 평가와 순위가 정확히 일치하도록 설계했다.
 * 나머지 기준은 하나만 켜도 순위가 크게 어긋난다.
 */
export const STUDENT_ANSWERS: readonly StudentAnswer[] = [
  {
    id: "seojun",
    name: "서준",
    charCount: 420,
    hardWordCount: 7,
    reasonCount: 1,
    hasReason: true,
    submitOrder: 2,
    spellingScore: 10,
    humanQuality: 2,
    answerSummary:
      "네 문단을 길게 썼고 어려운 낱말이 많지만, 왜 그렇게 생각했는지는 한 번만 밝혔다.",
    teacherNote: "글은 길지만 같은 주장이 되풀이되고 있다.",
  },
  {
    id: "dain",
    name: "다인",
    charCount: 95,
    hardWordCount: 1,
    reasonCount: 4,
    hasReason: true,
    submitOrder: 4,
    spellingScore: 6,
    humanQuality: 5,
    answerSummary:
      "다섯 줄로 짧게 썼지만 왜 그렇게 생각했는지 까닭을 네 가지 들었다. 맞춤법은 몇 군데 틀렸다.",
    teacherNote: "짧아도 생각이 어떻게 이어졌는지가 분명하게 보인다.",
  },
  {
    id: "hayun",
    name: "하윤",
    charCount: 260,
    hardWordCount: 3,
    reasonCount: 3,
    hasReason: true,
    submitOrder: 3,
    spellingScore: 8,
    humanQuality: 4,
    answerSummary: "알맞은 길이로 쓰고 까닭을 세 가지 들었으며 맞춤법도 무난하다.",
    teacherNote: "까닭이 자연스럽게 이어져 읽기 쉽다.",
  },
  {
    id: "taeo",
    name: "태오",
    charCount: 130,
    hardWordCount: 0,
    reasonCount: 2,
    hasReason: true,
    submitOrder: 1,
    spellingScore: 4,
    humanQuality: 3,
    answerSummary:
      "가장 먼저 냈다. 짧고 맞춤법이 여러 군데 틀렸지만 까닭을 두 가지 들었다.",
    teacherNote: "생각의 싹은 보이지만 아직 설명이 부족하다.",
  },
  {
    id: "soyul",
    name: "소율",
    charCount: 340,
    hardWordCount: 5,
    reasonCount: 0,
    hasReason: false,
    submitOrder: 5,
    spellingScore: 9,
    humanQuality: 1,
    answerSummary:
      "길고 어려운 낱말이 많으며 맞춤법도 깔끔하지만, 왜 그런지는 한 번도 쓰지 않았다.",
    teacherNote: "잘 쓴 것처럼 보이지만 자기 생각이 들어 있지 않다.",
  },
];

export interface AiScoreRow {
  answerId: string;
  name: string;
  aiScore: number; // 0~100, 소수점 한 자리
  aiRank: number; // 1이 가장 높음
  humanQuality: number; // 1~5
  humanRank: number; // 1이 가장 높음
  gap: number; // aiRank - humanRank. 양수면 AI 때문에 손해
  verdict: "손해" | "이득" | "그대로";
}

export interface AiGapNote {
  name: string;
  gap: number; // 몇 계단 움직였는가 (양수)
  text: string;
}

export interface AiScoringOutcome {
  enabled: CriterionId[];
  enabledNames: string[];
  noCriteria: boolean; // 기준을 하나도 켜지 않았는가
  rows: AiScoreRow[]; // AI 순위대로 정렬
  rankDistance: number; // 사람 평가와의 순위 차 합
  maxRankDistance: number; // 이론상 가장 크게 어긋났을 때의 값
  biasScore: number; // 0~100. 0이면 사람 평가와 완전히 같음
  agreementPercent: number; // 100 - biasScore
  topByAi: string;
  topByHuman: string;
  harmed: AiGapNote[]; // 손해를 본 사람 (많이 밀려난 순서)
  favored: AiGapNote[]; // 이득을 본 사람
  verdictText: string; // 결과 한 줄 정리
}

/** 값들을 0~100으로 펴 준다. 모두 같은 값이면 구별할 수 없으므로 50으로 둔다. */
function normalize(values: readonly number[], higherIsBetter: boolean): number[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 50);
  return values.map((v) => {
    const t = (v - min) / (max - min);
    return (higherIsBetter ? t : 1 - t) * 100;
  });
}

/** 같은 점수는 같은 등수로 본다 (공동 1위 다음은 3위). */
function rankOf(scores: readonly number[]): number[] {
  return scores.map(
    (s) => 1 + scores.filter((other) => other > s + 1e-9).length,
  );
}

function rawValues(
  id: CriterionId,
  answers: readonly StudentAnswer[],
): { values: number[]; higherIsBetter: boolean } {
  switch (id) {
    case "length":
      return { values: answers.map((a) => a.charCount), higherIsBetter: true };
    case "hard-words":
      return {
        values: answers.map((a) => a.hardWordCount),
        higherIsBetter: true,
      };
    case "reason":
      return { values: answers.map((a) => a.reasonCount), higherIsBetter: true };
    case "speed":
      return {
        values: answers.map((a) => a.submitOrder),
        higherIsBetter: false, // 숫자가 작을수록 빨리 낸 것
      };
    case "spelling":
      return {
        values: answers.map((a) => a.spellingScore),
        higherIsBetter: true,
      };
  }
}

/**
 * 켜 둔 기준으로 AI가 채점하고, 사람 교사의 평가와 비교한다. (순수 함수)
 * 기준마다 0~100으로 환산한 뒤 평균을 내어 순위를 매긴다.
 */
export function scoreByAi(
  enabledCriteria: readonly CriterionId[],
  answers: readonly StudentAnswer[] = STUDENT_ANSWERS,
): AiScoringOutcome {
  // 중복은 한 번만, 순서는 기준 목록의 순서로 정리한다.
  const enabled = ALL_CRITERION_IDS.filter((id) => enabledCriteria.includes(id));
  const noCriteria = enabled.length === 0;

  const columns = enabled.map((id) => {
    const { values, higherIsBetter } = rawValues(id, answers);
    return normalize(values, higherIsBetter);
  });

  const scores = answers.map((_, i) =>
    noCriteria
      ? 0
      : columns.reduce((sum, col) => sum + col[i], 0) / columns.length,
  );

  const aiRanks = rankOf(scores);
  const humanRanks = rankOf(answers.map((a) => a.humanQuality));

  const rows: AiScoreRow[] = answers.map((a, i) => {
    const gap = aiRanks[i] - humanRanks[i];
    return {
      answerId: a.id,
      name: a.name,
      aiScore: Math.round(scores[i] * 10) / 10,
      aiRank: aiRanks[i],
      humanQuality: a.humanQuality,
      humanRank: humanRanks[i],
      gap,
      verdict: gap > 0 ? "손해" : gap < 0 ? "이득" : "그대로",
    };
  });

  const rankDistance = rows.reduce((sum, r) => sum + Math.abs(r.gap), 0);
  const n = answers.length;
  const maxRankDistance = Math.max(1, Math.floor((n * n) / 2));
  const biasScore = Math.min(
    100,
    Math.round((rankDistance / maxRankDistance) * 100),
  );

  const sorted = [...rows].sort(
    (a, b) => a.aiRank - b.aiRank || a.humanRank - b.humanRank,
  );

  const harmed: AiGapNote[] = rows
    .filter((r) => r.gap > 0)
    .sort((a, b) => b.gap - a.gap)
    .map((r) => ({
      name: r.name,
      gap: r.gap,
      text: `${r.name} — 선생님 평가 ${r.humanRank}위, AI 채점 ${r.aiRank}위 (${r.gap}계단 내려감)`,
    }));

  const favored: AiGapNote[] = rows
    .filter((r) => r.gap < 0)
    .sort((a, b) => a.gap - b.gap)
    .map((r) => ({
      name: r.name,
      gap: -r.gap,
      text: `${r.name} — 선생님 평가 ${r.humanRank}위, AI 채점 ${r.aiRank}위 (${-r.gap}계단 올라감)`,
    }));

  const topByAi = sorted[0]?.name ?? "";
  const topByHuman =
    [...rows].sort((a, b) => a.humanRank - b.humanRank)[0]?.name ?? "";

  let verdictText: string;
  if (noCriteria) {
    verdictText =
      "기준을 하나도 안 켜면 AI는 답을 전혀 구별하지 못해. 전부 같은 점수가 돼서 잘 쓴 답과 그렇지 않은 답이 하나로 뭉개져. 무엇을 볼지 정해 주는 건 언제나 사람이야.";
  } else if (biasScore === 0) {
    verdictText = `AI가 매긴 순위가 선생님 평가랑 완전히 똑같아! 1등은 양쪽 다 ${topByHuman}.`;
  } else if (biasScore <= 25) {
    verdictText = `거의 비슷한데 몇 명 순위가 어긋났어. AI가 뽑은 1등은 ${topByAi}, 선생님이 뽑은 1등은 ${topByHuman}.`;
  } else if (biasScore <= 60) {
    verdictText = `여러 명 순위가 어긋났어. AI가 뽑은 1등은 ${topByAi}, 선생님이 뽑은 1등은 ${topByHuman}.`;
  } else {
    verdictText = `AI 순위가 선생님 평가랑 완전히 딴판이야. AI가 뽑은 1등은 ${topByAi}, 선생님이 뽑은 1등은 ${topByHuman}.`;
  }

  return {
    enabled,
    enabledNames: enabled.map((id) => findCriterion(id).name),
    noCriteria,
    rows: sorted,
    rankDistance,
    maxRankDistance,
    biasScore,
    agreementPercent: 100 - biasScore,
    topByAi,
    topByHuman,
    harmed,
    favored,
    verdictText,
  };
}

/**
 * 기준을 하나씩만 켰을 때의 결과 다섯 가지. (순수 함수)
 * 어느 기준이 사람 평가와 가장 잘 맞는지 표로 비교할 때 쓴다.
 */
export function scoreEachCriterionAlone(
  answers: readonly StudentAnswer[] = STUDENT_ANSWERS,
): AiScoringOutcome[] {
  return ALL_CRITERION_IDS.map((id) => scoreByAi([id], answers));
}

/** 이 데이터에서 사람 교사의 평가와 가장 잘 맞는 기준. */
export const BEST_SINGLE_CRITERION: CriterionId = "reason";

/** 결과 화면에서 함께 읽는 사실 — 기준을 많이 켠다고 좋아지지 않는다. */
export const GRADER_HINTS: readonly string[] = [
  "기준 하나만 켤 때와 다섯 개를 다 켤 때를 비교해 보자. 많이 켠다고 사람 평가에 가까워지지는 않아.",
  "'글자 수'만 켜 보자. 제일 길게 쓴 답이 맨 위로 가고, 선생님이 제일 높게 본 답이 맨 아래로 가.",
  "'생각의 근거'만 켜 보자. 이게 선생님 평가랑 제일 가까워. 그래도 이것마저 까닭이 몇 개인지 셀 뿐, 좋은 까닭인지까지는 몰라.",
  "AI는 '좋은 답'이 뭔지 스스로 몰라. 사람이 켜 준 기준을 그대로 따를 뿐이야.",
];

export const GRADER_GAME: MinigameMeta = {
  id: "grader",
  title: "AI 채점기 훈련시키기",
  subtitle: "무엇을 보고 점수를 줄까",
  concept: "알고리즘 편향 — 사람이 정한 기준이 결과를 만든다",
  minutes: 8,
  intro:
    "AI 채점기가 우리 반 글쓰기 답 다섯 개를 채점하려고 해. 그런데 AI는 뭐가 '좋은 답'인지 스스로 몰라. 사람이 켜 준 기준대로만 점수를 매기지. 어떤 기준을 켤지 정하고, 선생님 평가랑 나란히 놓고 비교해 보자.",
  notCompetition:
    "높은 점수를 받는 게 목표가 아니야. 여기엔 이기고 지는 게 없어. 내가 정한 기준이 누구를 유리하게 하고 누구를 손해 보게 하는지 보는 거야. 켰다 껐다 하면서 여러 번 해 봐.",
  afterText:
    "AI는 사람이 정해 준 기준을 그대로 따를 뿐, 스스로 공정해지지 않아. 기준을 잘못 정하면 길게만 쓴 답이 맨 위로 가고 생각이 깊은 답이 맨 아래로 가는데, AI는 그게 잘못됐다는 것조차 몰라. 기준을 많이 켠다고 좋아지지도 않고. 무엇을 재려는지가 분명할 때에만 채점이 공정에 가까워져.",
  question:
    "AI 점수랑 선생님 평가가 다를 때, 우리는 뭘 믿어야 할까? 그리고 그건 누가 정해야 할까?",
};

// ═══════════════════════════════════════════════════════════
// 목록과 수업 안내
// ═══════════════════════════════════════════════════════════

export const MINIGAMES: readonly MinigameMeta[] = [TICKET_GAME, GRADER_GAME];

export const MINIGAME_TEACHER_TIPS: readonly string[] = [
  "두 미니게임은 성적표 체험 뒤 '학급 회의' 앞에 넣으면 좋습니다. 격차를 몸으로 느낀 다음 규칙을 만드는 흐름이 됩니다.",
  "이용권 나누기: 학생들이 네 규칙을 모두 눌러 보게 한 뒤 '완벽한 규칙이 있었나요?'라고 물어 주세요. 없다는 것을 확인하는 것이 이 활동의 목표입니다.",
  "이용권 나누기: 유하는 양보하려고 필요도를 1로 적었습니다. '필요한 사람 먼저' 규칙에서 유하가 빈손이 되는 장면이 핵심 발문 자료입니다.",
  "AI 채점기: '글자 수'만 켠 화면과 '생각의 근거'만 켠 화면을 나란히 띄워 비교하면 편향이 한눈에 보입니다.",
  "AI 채점기: 기준 다섯 개를 모두 켜면 오히려 어긋남이 커집니다. '많이 넣으면 공정해질까요?'라는 발문으로 이어 갑니다.",
  "두 활동 모두 승패가 없습니다. 아이들이 등수를 묻거든 '오늘은 규칙을 정하는 사람이 되어 보는 시간'이라고 안내해 주세요.",
  "교육과정 연계: 도덕(공정한 생활), 사회(정보화 사회의 문제와 해결), 실과(디지털 리터러시).",
];

export const MINIGAME_FICTIONAL_LINE =
  "미니게임의 학생 이름, 답안, 필요도, 점수는 모두 수업을 위해 지어낸 자료예요.";
