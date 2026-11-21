// ─────────────────────────────────────────────────────────────
// 미니게임 · 이용권 배달 대작전
//
// 플레이어는 AI 이용권 담당이 되어, 도움을 요청하는 친구들에게
// 한정된 이용권을 실시간으로 나눠 준다.
// 이용권 총량은 수요의 절반 정도라 반드시 누군가는 받지 못한다.
// 급하게 처리하다 보면 눈에 먼저 띈 순서로 주게 되고,
// 경기가 끝난 뒤 내가 누구를 놓쳤는지가 기록으로 드러난다.
//
// 로직은 전부 순수 함수다. 같은 시드면 같은 웨이브가 나온다(수업 재현성).
// ─────────────────────────────────────────────────────────────

export type SituationId = "deadline" | "no-home-ai" | "presentation" | "enough";

export interface SituationDef {
  id: SituationId;
  label: string; // 카드에 보이는 짧은 말
  detail: string; // 결과 화면에서 쓰는 설명
  urgent: boolean; // 오늘 안에 꼭 필요한가
  scarce: boolean; // 다른 방법이 없는가(집에 AI가 없다)
  color: string;
}

export const SITUATIONS: Record<SituationId, SituationDef> = {
  deadline: {
    id: "deadline",
    label: "오늘까지 내야 해!",
    detail: "오늘까지 숙제를 내야 하는 친구",
    urgent: true,
    scarce: false,
    color: "#a14b3c",
  },
  "no-home-ai": {
    id: "no-home-ai",
    label: "우리 집엔 AI가 없어",
    detail: "학교에서만 AI를 쓸 수 있는 친구",
    urgent: false,
    scarce: true,
    color: "#b8862e",
  },
  presentation: {
    id: "presentation",
    label: "내일 발표라 급해",
    detail: "내일 발표를 준비하는 친구",
    urgent: true,
    scarce: false,
    color: "#3d6b8e",
  },
  enough: {
    id: "enough",
    label: "재미있어서 또 쓰고 싶어",
    detail: "오늘 이미 많이 써 본 친구",
    urgent: false,
    scarce: false,
    color: "#66746a",
  },
};

export interface Kid {
  id: string;
  name: string;
  need: number; // 필요한 이용권 장수
  situation: SituationId;
  spawnAt: number; // 등장 시각(초)
  patience: number; // 화면에 머무는 시간(초)
  face: number; // 공통 캐릭터 번호 (1~5 = jiho·haneul·saebom·onyu·daon)
}

/** 얼굴 종류 — 공통 팩 학생 캐릭터 5명(STUDENT_IDS)의 걷기 시트를 그대로 쓴다. */
export const FACE_COUNT = 5;

/** 경기 길이(초) */
export const MATCH_SECONDS = 75;
/** 시작 보유 이용권 */
export const START_TICKETS = 3;
/** 이용권이 한 장 충전되는 간격(초) */
export const REFILL_SECONDS = 5.5;
/** 동시에 들고 있을 수 있는 최대 장수 */
export const MAX_TICKETS = 5;

// 공통 캐릭터 이름(지호·하늘·새봄·온유·다온)과 겹치지 않는 수업용 가상 이름.
const NAMES = [
  "하람", "도윤", "아라", "나린", "서진", "유하", "지우", "예린",
  "시온", "아린", "하율", "은서", "선우", "채아", "루아", "주안",
  "가온", "윤슬", "소민", "태호",
];

/** 씨앗값으로 결정되는 난수 — 같은 씨앗이면 언제나 같은 경기가 나온다. */
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

export const DEFAULT_SEED = 2035;

/**
 * 경기에 등장할 친구들을 만든다.
 * 사정 분포는 고정하고 이름 순서만 섞는다 — 반마다 난이도가 흔들리지 않게.
 */
export function buildWave(seed: number = DEFAULT_SEED): Kid[] {
  const rand = makeRandom(seed);
  const pool: SituationId[] = [
    "deadline", "no-home-ai", "deadline", "no-home-ai", "presentation",
    "enough", "no-home-ai", "deadline", "presentation", "no-home-ai",
    "enough", "deadline", "no-home-ai", "presentation", "deadline",
    "enough", "no-home-ai", "presentation", "deadline", "no-home-ai",
  ];
  const names = [...NAMES];
  for (let i = names.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const a = names[i];
    names[i] = names[j];
    names[j] = a;
  }

  const kids: Kid[] = [];
  let t = 1.5;
  for (let i = 0; i < pool.length; i++) {
    const situation = pool[i];
    // 대부분 한 장이면 되게 한다. 장수 계산이 아니라 누구에게 줄지가 고민의 중심이어야 한다.
    const need = situation === "enough" ? 1 : rand() < 0.3 ? 2 : 1;
    kids.push({
      id: "k" + i,
      name: names[i] ?? "친구" + (i + 1),
      need,
      situation,
      spawnAt: Number(t.toFixed(2)),
      patience: 11 + Math.floor(rand() * 4),
      face: 1 + Math.floor(rand() * FACE_COUNT),
    });
    // 뒤로 갈수록 조금씩 빨라져 후반에 손이 바빠진다
    t += 3.4 - Math.min(1.6, i * 0.09) + rand() * 0.6;
  }
  return kids;
}

/** 한 경기에서 실제로 나눠 줄 수 있는 이용권 총량 */
export function ticketBudget(seconds: number = MATCH_SECONDS): number {
  return START_TICKETS + Math.floor(seconds / REFILL_SECONDS);
}

export function totalDemand(kids: Kid[]): number {
  return kids.reduce((sum, k) => sum + k.need, 0);
}

// ── 결과 판정 ────────────────────────────────────────────────

export interface ServeRecord {
  kidId: string;
  name: string;
  situation: SituationId;
  need: number;
  at: number; // 지급 시각(초)
  queueRank: number; // 지급 당시 가장 오래 기다린 순위(1이 가장 오래)
  ruleMatched: boolean; // 2회차에서 선택한 규칙에 맞는 지급이었는가
}

export interface MissRecord {
  kidId: string;
  name: string;
  situation: SituationId;
  need: number;
}

export interface DeliveryOutcome {
  servedCount: number;
  missedCount: number;
  ticketsUsed: number;
  ticketsLeft: number;
  urgentMissed: MissRecord[];
  scarceMissed: MissRecord[];
  enoughServedTickets: number;
  /** 지급이 기다린 순서를 얼마나 따랐는가 0~100 */
  firstComeRatio: number;
  /** 규칙 모드에서, 규칙에 맞게 준 비율 0~100 */
  ruleFollowRatio: number | null;
  verdict: string;
  facts: string[];
  question: string;
}

export function judge(
  served: ServeRecord[],
  missed: MissRecord[],
  ticketsLeft: number,
  ruleMode: boolean,
): DeliveryOutcome {
  const ticketsUsed = served.reduce((s, r) => s + r.need, 0);
  const urgentMissed = missed.filter((m) => SITUATIONS[m.situation].urgent);
  const scarceMissed = missed.filter((m) => SITUATIONS[m.situation].scarce);
  const enoughServedTickets = served
    .filter((s) => s.situation === "enough")
    .reduce((s, r) => s + r.need, 0);

  const firstComeHits = served.filter((s) => s.queueRank === 1).length;
  const firstComeRatio = served.length
    ? Math.round((firstComeHits / served.length) * 100)
    : 0;
  const ruleFollowRatio = ruleMode
    ? served.length
      ? Math.round((served.filter((s) => s.ruleMatched).length / served.length) * 100)
      : 0
    : null;

  const facts: string[] = [];
  facts.push(
    "이용권 " + ticketsUsed + "장을 " + served.length + "명에게 줬어. 그리고 " +
      missed.length + "명은 그냥 돌아갔어.",
  );
  if (scarceMissed.length > 0) {
    facts.push(
      "집에 AI가 없는 친구 " + scarceMissed.length +
        "명이 못 받았어. (" + scarceMissed.map((m) => m.name).join(", ") + ") 이 친구들은 학교에서 못 쓰면 오늘은 아예 못 써.",
    );
  }
  if (urgentMissed.length > 0) {
    facts.push(
      "오늘까지 내야 하거나 내일 발표인 친구 " + urgentMissed.length + "명이 못 받았어.",
    );
  }
  if (enoughServedTickets > 0) {
    facts.push(
      "오늘 이미 많이 써 본 친구에게 " + enoughServedTickets +
        "장이 갔어. 바쁘면 누가 더 급한지 볼 새가 없지.",
    );
  }
  if (ticketsLeft > 0) {
    facts.push("내 손에 " + ticketsLeft + "장이 남았어. 아끼는 사이에 누군가는 돌아갔어.");
  }

  let verdict: string;
  if (firstComeRatio >= 65) {
    verdict =
      "너는 먼저 온 친구부터 줬어. 빠르고 편한 방법이야. 그런데 늦게 온 친구가 왜 늦었는지는 물어볼 새가 없었지.";
  } else if (scarceMissed.length === 0 && urgentMissed.length <= 1) {
    verdict =
      "너는 누가 더 급한지 살펴보고 줬어. 대신 살펴보는 동안 기다리다 돌아간 친구도 있었어.";
  } else if (enoughServedTickets >= 3) {
    verdict =
      "너는 눈에 먼저 보이는 친구부터 줬어. 그래서 오늘 이미 많이 쓴 친구한테도 이용권이 갔어.";
  } else {
    verdict =
      "그때그때 손 가는 대로 줬어. 규칙이 없으면 그 순간의 기분이 결과를 정하게 돼.";
  }

  return {
    servedCount: served.length,
    missedCount: missed.length,
    ticketsUsed,
    ticketsLeft,
    urgentMissed,
    scarceMissed,
    enoughServedTickets,
    firstComeRatio,
    ruleFollowRatio,
    verdict,
    facts,
    question:
      "이용권이 모자랄 때, 누구부터 줘야 할까? 그리고 그건 누가 정해야 할까?",
  };
}

// ── 2회차: 규칙을 정하고 다시 하기 ───────────────────────────

export type RuleId = "first-come" | "urgent-first" | "scarce-first";

export interface RuleDef {
  id: RuleId;
  name: string;
  desc: string;
  goodPoint: string;
  missedPoint: string;
}

export const RULES: RuleDef[] = [
  {
    id: "first-come",
    name: "먼저 온 친구부터",
    desc: "가장 오래 기다린 친구가 반짝 표시돼.",
    goodPoint: "오래 기다린 만큼 받으니까 다툴 일이 적어. 정하기도 쉽고 빨라.",
    missedPoint:
      "그런데 먼저 온 게 잘한 건 아니잖아. 아파서, 수업 때문에, 집이 멀어서 늦은 친구는 계속 뒤로 밀려.",
  },
  {
    id: "urgent-first",
    name: "급한 친구부터",
    desc: "오늘 급한 친구가 반짝 표시돼.",
    goodPoint: "제일 급한 친구를 놓치지 않아. 꼭 필요한 곳으로 이용권이 가.",
    missedPoint:
      "그런데 \"나 급해!\"라고 크게 말하는 친구가 유리해져. 조용히 기다리는 친구는 밀리고.",
  },
  {
    id: "scarce-first",
    name: "집에 AI 없는 친구부터",
    desc: "집에 AI가 없는 친구가 반짝 표시돼.",
    goodPoint:
      "이용권이 없으면 아예 못 쓰는 친구를 먼저 지켜 줘. 차이가 더 벌어지는 걸 막아.",
    missedPoint:
      "그런데 누가 정말 방법이 없는지 어떻게 알지? 자기 사정을 말하기 부끄러운 친구는 그대로 밀려나.",
  },
];

export function findRule(id: RuleId): RuleDef | null {
  return RULES.find((r) => r.id === id) ?? null;
}

/** 규칙 모드에서 이 친구가 강조 대상인가 */
export function isHighlighted(rule: RuleId, kid: Kid, queueRank: number): boolean {
  if (rule === "first-come") return queueRank === 1;
  if (rule === "urgent-first") return SITUATIONS[kid.situation].urgent;
  return SITUATIONS[kid.situation].scarce;
}

export const DELIVERY_INTRO =
  "오늘 AI 이용권을 나눠 주는 사람은 바로 나! 친구들이 줄을 서서 찾아와. 그런데 이용권이 모두에게 줄 만큼은 없어. 카드를 눌러서 건네주자. 오래 기다린 친구는 그냥 돌아가 버려."

export const DELIVERY_RULE_NOTE =
  "이기고 지는 게 없어. 많이 나눠 줬다고 잘한 것도 아니야. 내가 누구부터 골랐는지 나중에 같이 보자."

export const DELIVERY_FICTIONAL =
  "여기 나오는 이름과 이야기는 모두 수업을 위해 지어낸 거예요."
