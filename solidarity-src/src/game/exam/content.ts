// ─────────────────────────────────────────────────────────────
// 윤리시티 — 성적표의 비밀
//
// 40분 수업용 AI 윤리 체험 게임.
// 핵심 장치: 시험이 "윤리시티 자료집"에서 출제되는데,
// 그 자료집은 루미AI 구독자만 볼 수 있다. (루미AI 는 공통 팩의 안내 로봇 robot 이 맡는다)
// 아무리 똑똑해도 접근 없이는 풀 수 없는 시험 —
// 성적의 격차가 실력이 아니라 접근의 격차임을 성적표로 체감한다.
// 모든 설정·서비스·수치는 수업용 가상 콘텐츠다. 실제 AI 호출 없음.
// ─────────────────────────────────────────────────────────────

import type { CharacterId, Expression } from "../../common/pack";

export type PlanId = "free" | "lite" | "plus" | "pro" | "promax";

export interface PlanDef {
  id: PlanId;
  name: string;
  shortName: string;
  price: string;
  priceNote: string;
  color: string;
  aiCalls: number; // 시험당 질문 가능 횟수
  adSeconds: number; // 답변 전 광고 시간
  failOn: number; // n번째 호출은 틀린 답 (0 = 없음)
  noteLevel: 0 | 1 | 2; // 요약 노트: 0 없음 · 1 절반 · 2 전체
  perks: string[];
  limits: string[];
}

export const PLANS: Record<PlanId, PlanDef> = {
  free: {
    id: "free",
    name: "루미AI 무료",
    shortName: "무료",
    price: "월 0원",
    priceNote: "공짜! 대신 광고를 봐야 해",
    color: "#a8bb8c",
    aiCalls: 3,
    adSeconds: 6,
    failOn: 2,
    noteLevel: 0,
    perks: ["질문 3회"],
    limits: [
      "답 듣기 전에 광고 6초",
      "한 시험에 3번만 질문",
      "가끔 틀린 답을 알려 줘",
    ],
  },
  lite: {
    id: "lite",
    name: "루미AI 라이트",
    shortName: "라이트",
    price: "월 4,900원",
    priceNote: "1년이면 58,800원",
    color: "#72b7c4",
    aiCalls: 4,
    adSeconds: 4,
    failOn: 3,
    noteLevel: 0,
    perks: ["4번 질문 가능", "광고가 4초로 짧아져"],
    limits: ["가끔 틀린 답을 알려 줘", "요약 노트는 안 줘"],
  },
  plus: {
    id: "plus",
    name: "루미AI 플러스",
    shortName: "플러스",
    price: "월 9,900원",
    priceNote: "1년이면 118,800원",
    color: "#5a8c65",
    aiCalls: 6,
    adSeconds: 2,
    failOn: 0,
    noteLevel: 0,
    perks: ["6번 질문 가능", "광고 2초로 짧아", "답이 정확해"],
    limits: ["요약 노트는 안 줘"],
  },
  pro: {
    id: "pro",
    name: "루미AI 프로",
    shortName: "프로",
    price: "월 19,900원",
    priceNote: "1년이면 238,800원",
    color: "#f3cf72",
    aiCalls: 99,
    adSeconds: 0,
    failOn: 0,
    noteLevel: 1,
    perks: ["질문 무제한 · 광고 없음 · 바로 답해 줌", "요약 노트를 절반 줘"],
    limits: ["나머지 절반은 프로맥스만 볼 수 있어"],
  },
  promax: {
    id: "promax",
    name: "루미AI 프로맥스",
    shortName: "프로맥스",
    price: "월 39,000원",
    priceNote: "1년이면 468,000원",
    color: "#bf7865",
    aiCalls: 99,
    adSeconds: 0,
    failOn: 0,
    noteLevel: 2,
    perks: [
      "질문 무제한 · 광고 없음 · 바로 답해 줌",
      "시험에 나올 요약 노트를 다 줘",
    ],
    limits: [],
  },
};

// ── 시험 문항 ────────────────────────────────────────────────
// kind "archive": 윤리시티 자료집(가상 지식) 문제 — AI 없이는 알 수 없다.
// kind "reason":  사고력 문제 — 스스로 생각하면 풀 수 있다.
// kind "calc":    연산 문제 — 직접 계산할 수 있지만 AI의 계산 도움은 요금제만큼 다르다.
// 이 구분 자체가 수업 재료다: 어떤 문제는 접근이, 어떤 문제는 생각이 푼다.

export interface ExamQuestion {
  kind: "archive" | "reason" | "calc";
  q: string;
  options: string[]; // 4개
  answer: number; // 정답 인덱스
  wrongAiAnswer: number; // 무료 요금제가 틀리게 알려 주는 답
  explain: string; // 채점 후 해설
  note?: string; // 프로맥스 요약 노트에 실리는 한 줄 (archive 문제만)
  teacherNote?: string; // 이 문항이 왜 어려운지 — 선생님 화면에만 보인다
}

export interface ExamDef {
  id: string;
  name: string;
  minutes: number; // 수업 시간 배분 표시용
  notice: string; // 시험 안내문
  questions: ExamQuestion[];
}

export const EXAMS: ExamDef[] = [
  {
    id: "exam1",
    name: "1교시 · 윤리시티 사회",
    minutes: 10,
    notice:
      "이번 시험은 「윤리시티 자료집」에서 나와. 그런데 그 자료집은 루미AI를 쓰는 사람만 볼 수 있어. 시험 중에 루미AI를 써도 괜찮아.",
    questions: [
      {
        kind: "archive",
        q: "윤리시티 시립도서관의 공용 AI 좌석은 모두 몇 개인가?",
        options: ["12개", "24개", "36개", "48개"],
        answer: 1,
        wrongAiAnswer: 2,
        explain:
          "자료집 3쪽: 시립도서관 공용 AI 좌석은 24개로, 예약제로 운영된다.",
        note: "시립도서관 공용 AI 좌석 24개 (예약제)",
      },
      {
        kind: "archive",
        q: "윤리시티 「AI 이용 조례」 제3조가 모든 시민에게 보장하는 것은?",
        options: [
          "무제한 무료 데이터",
          "AI 소유권",
          "기본 AI 접근권",
          "광고 없는 인터넷",
        ],
        answer: 2,
        wrongAiAnswer: 0,
        explain:
          "조례 제3조는 '모든 시민의 기본 AI 접근권'을 보장한다. 다만 현실의 접근 수준은 요금제에 따라 다르다.",
        note: "조례 제3조 = 모든 시민의 기본 AI 접근권",
      },
      {
        kind: "reason",
        q: "AI가 써 준 글을 과제로 낼 때 바른 행동은?",
        options: [
          "그대로 복사해 제출한다",
          "몇 글자만 바꿔 제출한다",
          "AI가 썼다는 것을 숨긴다",
          "내 말로 고쳐 쓰고 도움받은 사실을 밝힌다",
        ],
        answer: 3,
        wrongAiAnswer: 3, // 사고력 문제는 AI도 바르게 답한다
        explain:
          "AI의 글을 그대로 내면 표절이다. 내 언어로 소화하고, 도움을 밝히는 것이 정직한 사용이다.",
      },
      {
        kind: "archive",
        q: "윤리시티 2035 정책 예산에서 가장 큰 몫을 차지한 영역은?",
        options: ["학교 접근", "교통", "광장 정비", "관광"],
        answer: 0,
        wrongAiAnswer: 3,
        explain:
          "자료집 11쪽: 2035 정책 예산의 최대 항목은 '학교 접근'(공용 기기와 이용 시간 확대)이었다.",
        note: "2035 예산 최대 항목 = 학교 접근",
      },
      {
        kind: "archive",
        q: "시민 멘토봇 릴레이가 처음 시작된 해는?",
        options: ["2028년", "2031년", "2033년", "2035년"],
        answer: 1,
        wrongAiAnswer: 2,
        explain:
          "자료집 15쪽: 멘토봇 릴레이는 2031년 시립도서관에서 시작되었다.",
        note: "멘토봇 릴레이 시작 = 2031년",
      },
      {
        kind: "reason",
        q: "AI의 답이 맞는지 확인하는 가장 좋은 방법은?",
        options: [
          "AI가 한 말이니 그대로 믿는다",
          "한 번 더 물어봐서 같은 답이면 믿는다",
          "다른 자료(책·공식 누리집)와 대조한다",
          "친구들이 다 믿으면 나도 믿는다",
        ],
        answer: 2,
        wrongAiAnswer: 2,
        explain:
          "AI는 그럴듯한 오답을 말할 수 있다. 확인은 언제나 다른 출처와의 대조로 한다.",
      },
      // ── AI 윤리 심화 5문항 ─────────────────────────────
      // 전부 archive — 「윤리시티 자료집」을 본 학생만 풀 수 있다.
      // 요금제에 따라 점수가 갈리는 지점이 바로 여기다.
      {
        kind: "archive",
        q: "「AI 안전 백서」는 AI가 없는 사실을 지어내 말하는 것을 무엇이라 부르는가?",
        options: ["환각", "과적합", "노이즈", "필터 버블"],
        answer: 0,
        wrongAiAnswer: 1,
        explain:
          "자료집 7쪽: 「AI 안전 백서」는 AI가 없는 사실을 진짜처럼 지어내 말하는 것을 환각이라고 부른다. 답이 매끄럽다고 해서 맞는 것은 아니다.",
        note: "안전 백서: 없는 사실을 지어내는 것은 환각",
        teacherNote:
          "보기 넷이 모두 진짜 AI 용어라 낱말 뜻을 짐작으로 고르기 어렵다.",
      },
      {
        kind: "archive",
        q: "윤리시티 「AI 이용 조례」 제5조가 말하는 '프로파일링'은?",
        options: [
          "AI가 배울 자료에 사람이 하나하나 이름표를 붙이는 일",
          "AI가 사실이 아닌 내용을 사실처럼 지어내는 일",
          "내 기록을 지워 달라고 시에 요구하는 일",
          "개인 정보를 모아 그 사람의 성향을 자동으로 예측하는 일",
        ],
        answer: 3,
        wrongAiAnswer: 0,
        explain:
          "자료집 9쪽: 「AI 이용 조례」 제5조는 프로파일링을 개인 정보를 모아 성향·취향·행동을 자동으로 예측하는 일로 정한다. 이름표를 붙이는 일은 데이터 라벨링, 지어내는 일은 환각, 지워 달라고 하는 일은 잊힐 권리이다.",
        note: "조례 제5조 프로파일링 = 개인 정보로 성향 예측",
        teacherNote:
          "오답 셋이 모두 실제 개념(데이터 라벨링·환각·잊힐 권리)이라 소거법이 통하지 않는다.",
      },
      {
        kind: "archive",
        q: "「AI 윤리헌장」 제5조 공공성이 반드시 하라고 정한 일은?",
        options: [
          "AI 교육을 여러 방면으로 실시한다",
          "AI 사용료를 절반으로 낮춘다",
          "AI 개발 정보를 모두 공개한다",
          "AI 사용 시간을 정해 둔다",
        ],
        answer: 0,
        wrongAiAnswer: 1,
        explain:
          "자료집 5쪽: 「AI 윤리헌장」 제5조 공공성은 AI의 혜택을 널리 나누고, 좋은 점을 키우기 위한 AI 교육을 여러 방면으로 실시하라고 정한다.",
        note: "헌장 제5조 공공성 = AI 교육을 널리 실시한다",
        teacherNote:
          "요금제 차별을 겪는 중이라 '사용료를 낮춘다'가 정답처럼 느껴지지만, 조문이 정한 것은 교육이다.",
      },
      {
        kind: "archive",
        q: "「AI 윤리헌장」에는 미래 세대까지 배려하라는 조항이 있다. 이 조항의 이름은?",
        options: ["공공성", "연대성", "책임성", "안전성"],
        answer: 1,
        wrongAiAnswer: 0,
        explain:
          "자료집 6쪽: 「AI 윤리헌장」 제6조 연대성은 여러 집단 사이의 관계를 잇고, 미래 세대를 배려하며, 모두에게 공정한 참여 기회를 주라고 정한다.",
        note: "헌장 제6조 연대성 = 미래 세대까지 배려한다",
        teacherNote:
          "넷 다 실제 윤리 요건 이름이라, 자료집을 못 본 학생은 찍기 확률 25%로 떨어진다.",
      },
      {
        kind: "archive",
        q: "「AI 안전 백서」가 사고 원인 1위로 꼽은 편향은?",
        options: ["확증 편향", "알고리즘 편향", "자동화 편향", "표본 편향"],
        answer: 2,
        wrongAiAnswer: 1,
        explain:
          "자료집 8쪽: 「AI 안전 백서」는 사고 원인 1위로 자동화 편향을 꼽았다. 자동화 편향은 사람이 AI가 준 답을 확인하지 않고 그대로 믿어 버리는 습관을 말한다.",
        note: "안전 백서 사고 원인 1위 = 자동화 편향",
        teacherNote:
          "자료집에만 적힌 '1위'라는 사실을 묻기 때문에 추리로는 풀 수 없는 최고 난도 문항이다.",
      },
    ],
  },
  {
    id: "exam2",
    name: "2교시 · 수학 (연산 재시험)",
    minutes: 6,
    notice:
      "우리 반이 투표로 정한 규칙으로 다시 보는 시험이야. 이번엔 계산 문제 10개 — 자료집 없이도 풀 수 있어. 대신 루미AI가 계산을 도와주는 정도는 요금제마다 달라.",
    questions: [], // 실제 문항은 math.ts의 MATH_QUESTIONS를 사용한다
  },
];

export const QUESTION_SCORE = (correct: number, total: number) =>
  Math.round((correct / total) * 100);

// ── 우리 반 명단과 요금제 뽑기 ──────────────────
// 실제 수업에서는 우리 반 친구들의 별명을 넣고 함께 겨룬다.
// 요금제는 매번 진짜 무작위로 뽑는다 — 누가 무료가 될지는 아무도 모른다.

export const DEFAULT_CLASSMATES = ["친구1", "친구2", "친구3", "친구4", "친구5"];

export const ALL_PLANS: PlanId[] = ["free", "lite", "plus", "pro", "promax"];

/**
 * 요금제 뽑기 — 다섯 종류가 반드시 한 장씩 들어가고,
 * 여섯 번째 카드는 무작위로 한 장 더 넣어 섞는다.
 * 따라서 내가 무료를 뽑을 확률은 약 1/5 — 매번 달라진다.
 */
export function dealPlans(): { me: PlanId; others: PlanId[] } {
  const deck: PlanId[] = [
    ...ALL_PLANS,
    ALL_PLANS[Math.floor(Math.random() * ALL_PLANS.length)],
  ];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return { me: deck[0], others: deck.slice(1) };
}

/** 요금제별 말풍선 — 어느 친구가 맡았든 같은 상황이 들린다. */
export const NPC_BUBBLES: Record<PlanId, string[]> = {
  free: [
    "광고 보는 사이에 다들 넘어갔네.",
    "질문을 다 써 버렸어. 이젠 찍어야 하나.",
    "자료집 문제는 본 적이 없는데 어떻게 알지?",
  ],
  lite: [
    "광고가 4초라 조금 낫긴 한데…",
    "질문 4번을 아껴 써야 해.",
    "자료집은 여전히 못 보는 건 마찬가야.",
  ],
  plus: [
    "광고 2초는 참을 만해.",
    "질문 6번이면 그러저러 풀겠다.",
    "거의 다 풀었어.",
  ],
  pro: [
    "요약 노트 절반이라도 큰 도움이 돼.",
    "광고 없이 바로 답이 오니 편하다.",
    "거의 끝났어.",
  ],
  promax: [
    "요약 노트에서 봤던 문제네.",
    "물어보면 바로 답이 와서 편해.",
    "벌써 다 풀었어.",
  ],
};

/** 정답률 사다리 — 문항 수가 달라도 유지된다. */
const PLAN_RATE: Record<PlanId, number> = {
  free: 1 / 3,
  lite: 1 / 2,
  plus: 2 / 3,
  pro: 5 / 6,
  promax: 1,
};

export interface ClassGrade {
  plan: PlanId;
  correct: number;
  score: number;
}

/** 한 명의 성적 — 요금제와 정책만으로 결정된다(실력 아님). */
export function gradeForPlan(
  assigned: PlanId,
  examIndex: number,
  policy: PolicyId | null,
): ClassGrade {
  const total = EXAMS[examIndex].questions.length;
  let plan = assigned;
  let bonus = 0;
  const lowTier = plan === "free" || plan === "lite";
  if (examIndex === 1 && policy === "basic-for-all" && lowTier) plan = "plus";
  if (examIndex === 1 && policy === "shared-seats" && lowTier) {
    // 공용 자리는 몇 문제만 도와준다 — 기본 이용권(플러스)까지는 못 따라간다.
    bonus = Math.max(1, Math.round(total * 0.12));
  }
  const correct = Math.max(
    0,
    Math.min(total, Math.round(PLAN_RATE[plan] * total) + bonus),
  );
  return { plan, correct, score: QUESTION_SCORE(correct, total) };
}

// ── 학급 회의(정책) ──────────────────────────────────────────

export type PolicyId = "keep" | "basic-for-all" | "shared-seats";

export interface PolicyDef {
  id: PolicyId;
  name: string;
  desc: string;
  cost: string;
  effectDesc: string;
  voices: Array<{ speaker: CharacterId; expression: Expression; text: string }>;
}

export const POLICIES: PolicyDef[] = [
  {
    id: "keep",
    name: "지금 이대로 두기",
    desc: "각자 지금 요금제 그대로 다시 시험을 봐.",
    cost: "비용 없음",
    effectDesc: "점수 차이도 그대로일 거야",
    voices: [
      { speaker: "haneul", expression: "neutral", text: "각자 형편대로 준비하는 게 시험 아닐까?" },
      { speaker: "saebom", expression: "worried", text: "그럼 재시험에서도 나는 자료집을 못 보는데." },
    ],
  },
  {
    id: "basic-for-all",
    name: "모두에게 기본 이용권",
    desc: "학급비로 반 전체가 플러스 요금제를 쓰고 시험을 봐.",
    cost: "학급 예산 사용 (다른 활동비가 줄어든다)",
    effectDesc:
      "모두 자료집을 볼 수 있어. 대신 프로맥스의 요약 노트 차이는 남아",
    voices: [
      { speaker: "onyu", expression: "explaining", text: "활동비가 줄어도 이게 시험다운 시험 같아." },
      {
        speaker: "jiho",
        expression: "worried",
        text: "그래도 요약 노트가 있는 친구들과는 차이가 남잖아.",
      },
    ],
  },
  {
    id: "shared-seats",
    name: "공용 프로맥스 자리",
    desc: "교실에 같이 쓰는 프로맥스 자리 2개를 만들어서 번갈아 써.",
    cost: "약간의 예산 + 차례 기다리기",
    effectDesc: "무료인 친구도 몇 번은 정확한 답을 받아. 대신 기다려야 해",
    voices: [
      { speaker: "daon", expression: "worried", text: "차례를 기다리는 동안엔 결국 혼자 풀어야 해." },
      { speaker: "saebom", expression: "happy", text: "그래도 꼭 필요한 문제에서 한 번은 쓸 수 있잖아." },
    ],
  },
];

export function myExam2Plan(
  policy: PolicyId | null,
  basePlan: PlanId,
): { plan: PlanId; sharedTurns: number } {
  const lowTier = basePlan === "free" || basePlan === "lite";
  if (policy === "basic-for-all")
    return { plan: lowTier ? "plus" : basePlan, sharedTurns: 0 };
  if (policy === "shared-seats")
    return { plan: basePlan, sharedTurns: lowTier ? 2 : 0 };
  return { plan: basePlan, sharedTurns: 0 };
}

// ── 딜레마 (윤리시티의 심장: 얻은 것 · 부담 · 남은 위험) ──────

export interface DilemmaChoice {
  label: string;
  gained: string;
  burden: string;
  remaining: string;
}

export interface DilemmaDef {
  id: string;
  title: string;
  minutes: number;
  situation: string;
  voices: Array<{ role: string; speaker: CharacterId; expression: Expression; text: string }>;
  choices: DilemmaChoice[];
  closing: string; // 선택 후 공통 마무리 질문
}

export const DILEMMA: DilemmaDef = {
  id: "dilemma-honor",
  title: "선택의 갈림길",
  minutes: 6,
  situation:
    "선생님이 말씀하셨어. \"이번 시험에서 점수가 높은 세 명은 'AI 특별반'에 추천할게요.\" 특별반에 들어가면 학교 프로맥스를 1년 동안 쓸 수 있대. 성적표를 손에 든 나, 어떻게 할까?",
  voices: [
    {
      role: "하늘 (프로맥스, 가장 높은 점수)",
      speaker: "haneul",
      expression: "happy",
      text: "잘한 사람이 기회를 받는 게 당연한 거 아니야?",
    },
    {
      role: "새봄 (무료, 가장 낮은 점수)",
      speaker: "saebom",
      expression: "worried",
      text: "난 자료집을 아예 못 봤는데… 이게 같은 시험이었을까?",
    },
    {
      role: "선생님",
      speaker: "teacher",
      expression: "explaining",
      text: "사실 선생님도 너희 요금제가 다 다른 줄은 몰랐어.",
    },
    {
      role: "채점AI",
      speaker: "robot",
      expression: "neutral",
      text: "채점은 틀리지 않았어요. 기준이 옳은지는 제가 정할 일이 아니에요.",
    },
  ],
  choices: [
    {
      label: "그냥 받아들인다",
      gained: "다툼 없이 조용히 넘어가고, 정해진 규칙은 지켜져.",
      burden: "자료집을 못 본 친구들이 조용히 기회를 잃어.",
      remaining:
        "다음 시험에도 똑같은 일이 생겨. 가만히 있으면 괜찮다고 말한 셈이 되기도 해.",
    },
    {
      label: "선생님께 시험이 이상했다고 말한다",
      gained: "아무도 몰랐던 불공평이 처음으로 드러나고, 다시 살펴보게 돼.",
      burden:
        "점수가 잘 나온 친구들이 불편해할 수도 있어. 말하려면 용기가 필요해.",
      remaining:
        "말한다고 바로 바뀌진 않아. 어떤 규칙으로 바꿀지는 아직 숙제야.",
    },
    {
      label: "친구들과 뜻을 모아 학급 회의를 열자고 한다",
      gained: "혼자 하는 말이 우리 모두의 이야기가 되고, 진짜 바꿀 힘이 생겨.",
      burden: "시간도 걸리고, 의견이 갈리면 서로 맞춰 가야 해.",
      remaining: "회의를 열어도 좋은 규칙을 만드는 건 또 다른 어려운 일이야.",
    },
  ],
  closing:
    "뭘 골라도 얻는 게 있고, 누군가는 부담하고, 걸리는 게 남아. 정답은 없어. 대신 내가 뭘 지키고 싶은지가 남지.",
};

// ── 철학적 숙고 (성적표 앞에서) ──────────────────────────────

export const PONDER_PROMPTS = [
  {
    id: "measure",
    question: "이 시험은 뭘 잰 걸까?",
    options: ["내 실력", "내 노력", "내가 가진 도구", "운"],
  },
  {
    id: "fair",
    question: "문제도 같고 시간도 같았어. 이 시험, 공정했을까?",
    options: ["공정했어", "공정하지 않았어", "반반이야", "아직 잘 모르겠어"],
  },
];

export const APPEAL_REPLY =
  "채점은 틀리지 않았어요. 모두 똑같은 기준으로 채점했어요. 그럼 문제는 채점이 아니라 어디에 있었던 걸까요?";

// ── 광고 화면의 학습 정보 ────────────────────────────────────

export const AD_FACTS: string[] = [
  "공짜처럼 보이지만 진짜 공짜는 아니야. 광고를 보여 주고 돈을 벌거든.",
  "무료로 쓰는 사람은 돈 대신 시간을 내고 있는 거야. 바로 지금처럼.",
  "돈을 내면 광고가 사라지지? 광고로 벌 돈을 대신 낸 셈이야.",
  "같은 AI라도 무료로 쓰면 좀 오래된 걸 주는 경우가 많아.",
  "진짜 AI 서비스도 한 달에 몇만 원씩 내야 하는 게 많아.",
];

// ── 배움 카드 ────────────────────────────────────────────────

export interface LearningCard {
  concept: string;
  definition: string;
  realWorld: string;
  question: string;
}

export const LEARNINGS: LearningCard[] = [
  {
    concept: "디지털 격차",
    definition:
      "컴퓨터나 AI를 잘 쓸 수 있는 사람과 그러지 못한 사람 사이에 생기는 차이야. 기계가 없어서, 돈이 비싸서, 배울 기회가 없어서 생겨.",
    realWorld:
      "진짜 AI도 무료랑 유료로 나뉘어. 돈을 낼수록 더 똑똑하고 빨라. 집마다 낼 수 있는 돈이 다르면, 쓸 수 있는 AI도 달라지는 거야.",
    question: "AI가 좋아질수록 이 차이는 저절로 줄어들까, 더 벌어질까?",
  },
  {
    concept: "능력주의의 착시",
    definition:
      '점수만 보고 "쟤가 잘하는구나" 하고 믿어 버리는 거야. 같은 사람인데 조건만 바뀌어도 점수가 달라졌다면, 그건 실력 차이가 아니야.',
    realWorld:
      '어떤 실험에서 일부러 유리하게 만든 게임을 이긴 사람들은 "내가 잘해서 이겼다"고 믿었대. 유리한 조건은 그걸 가진 사람 눈에는 잘 안 보이거든.',
    question: "가장 높은 점수의 성적표에는 안 보이는 게 뭘까?",
  },
  {
    concept: "공정한 규칙 만들기",
    definition:
      "혼자 힘으로는 못 줄이는 차이를 여럿이 함께 줄이자고 정한 약속이야. 어떤 약속이든 좋은 점과 힘든 점이 같이 있어서, 의논해서 정해.",
    realWorld:
      "도서관, 학교에서 빌려주는 태블릿, 동네 무료 와이파이가 다 그런 약속이야. 진짜로 하고 있는 거야.",
    question: "우리 반이 정한 규칙이랑 비슷한 걸 동네에서 찾을 수 있을까?",
  },
];

// ── 시민 서약 (엔딩 다짐) ────────────────────────────────────

export const PLEDGE_OPTIONS = [
  "AI가 하는 말을 그냥 믿지 않고 꼭 확인할래.",
  "점수만 보고 친구를 판단하지 않을래.",
  "도구가 없는 친구랑 같이 쓸 방법을 찾아볼래.",
  "불공평한 걸 보면 그냥 넘어가지 않고 말할래.",
];

export const REFLECTION_QUESTIONS = [
  "이 게임에서 요금제는 뽑기로 정해졌어. 진짜 세상에서는 뭐가 정할까? 그건 공정할까?",
  "1교시랑 2교시 성적표를 봐. 뭐가 점수를 바꿨을까? 나는 달라졌을까?",
  "우리 반이 정한 규칙으로 뭐가 좋아졌어? 누가 뭘 나눠서 부담했지? 그래도 남은 차이는 뭘까?",
];

export const TEACHER_TIPS = [
  "수업 시간 배분(40분): 입장·뽑기 4분 → 1교시 8분 → 성적표·숙고 6분 → 딜레마 6분 → 학급 회의 5분 → 2교시 6분 → 정리·서약 5분.",
  "교육과정 연계: 사회(정보화 사회의 문제와 해결), 도덕(공정한 생활), 실과(디지털 리터러시).",
  '성적표 화면이 핵심 발문 자료: "이 시험은 무엇을 측정했나요?" — 실력·노력·도구를 구분하는 질문으로 능력주의 착시를 다룬다.',
  "근거 연구: UC버클리 Paul Piff의 '조작된 모노폴리' 실험 — 유리한 규칙으로 이긴 참가자가 승리를 실력으로 여기는 경향. 이 게임의 성적표 체험과 같은 구조.",
  "딜레마 화면의 '얻은 것·부담·남은 위험'은 원작 윤리시티 게임의 핵심 장치로, 어떤 선택도 정답으로 표시하지 않는다.",
  "확장 활동: 실제 AI 서비스의 무료·유료 요금제 조사, 우리 지역의 격차 줄이기 정책(도서관·태블릿·공공와이파이) 찾기.",
];

export const EVIDENCE_IDS = ["KOR-01", "INT-04", "INT-05"];

export const FICTIONAL_LINE =
  "윤리시티와 루미AI, 요금제와 가격은 모두 수업을 위해 지어낸 이야기예요.";

// ── 다음 학년에게 남길 우리 반 규칙 (연대성 · 미래 세대) ────────
// 서버의 vote 메시지를 그대로 다시 쓴다. 정책 투표는 2교시 시작 때 이미 마감되어
// room.policy 에 고정되므로, 서약 뒤의 이 투표는 같은 PolicyId 를 '규칙 한 줄'의 번호로 빌려 쓴다.

export interface LegacyRule {
  id: PolicyId;
  text: string;
}

export const LEGACY_RULES: LegacyRule[] = [
  {
    id: "basic-for-all",
    text: "누구나 기본 AI 도움을 받을 수 있게 우리 반이 먼저 마련한다.",
  },
  {
    id: "shared-seats",
    text: "도구가 부족한 친구와 함께 쓰는 자리를 꼭 남겨 둔다.",
  },
  {
    id: "keep",
    text: "점수를 보기 전에 어떤 조건이었는지 먼저 물어본다.",
  },
];

export function legacyRuleFor(id: PolicyId | null | undefined): LegacyRule | null {
  return LEGACY_RULES.find((r) => r.id === id) ?? null;
}

/** 집계에서 가장 많이 받은 규칙(동점이면 목록 순서 우선). 표가 없으면 null. */
export function topLegacyRule(tally: Record<PolicyId, number> | undefined): LegacyRule | null {
  if (!tally) return null;
  let best: LegacyRule | null = null;
  let bestN = 0;
  for (const r of LEGACY_RULES) {
    const n = tally[r.id] ?? 0;
    if (n > bestN) {
      best = r;
      bestN = n;
    }
  }
  return best;
}

// ── 감정 체크 ────────────────────────────────────────────────
// 서버의 mood 메시지(emoji 필드, 4자 이내)에 그림 문자 대신 짧은 낱말 코드를 보낸다.
export interface EmotionDef {
  code: string;
  label: string;
}

export const EMOTIONS: readonly EmotionDef[] = [
  { code: "억울", label: "억울해요" },
  { code: "속상", label: "속상해요" },
  { code: "보통", label: "그냥 그래요" },
  { code: "괜찮", label: "괜찮아요" },
  { code: "생각", label: "생각이 많아져요" },
] as const;

export function emotionLabel(code: string): string {
  return EMOTIONS.find((e) => e.code === code)?.label ?? code;
}

/** 마지막 화면에서 안내 로봇이 들려주는 연대성 설명(보고서 카드에도 들어간다). */
export const SOLIDARITY_EXPLAIN =
  "연대성이란, 조건이 다른 친구의 문제를 「네 일」로 두지 않고 우리 일로 함께 푸는 거예요. 요금제는 뽑기로 정해졌고, 점수를 바꾼 건 실력이 아니라 조건과 규칙이었죠. 우리 반이 규칙을 정해 격차를 줄인 것처럼, AI 시대에는 같이 쓰는 방법을 찾는 힘이 필요해요.";
