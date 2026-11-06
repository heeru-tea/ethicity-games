// 윤리시티 — 근거 라이브러리 출처 메타데이터 (S17 · 근거 배지 공용).
// 원문명·발행기관·연도·공식 링크는 「윤리시티_AI인생게임_UI_이미지에셋_계획서」 §19의
// 참고문헌 값을 그대로 옮겼고, shortLabel·natureLabel은 같은 문서 §8.2 표를 따른다.
// 확인하지 못한 값은 만들지 않고 "확인 필요"로 표시한다. (이번 14개는 모두 §19에서 확인됨)

import type { SourceDef } from "../types";

const LAST_VERIFIED = "2026-08-16";

const CAUTION_ISO = "자발적 국제표준으로, 인증이나 법적 의무를 뜻하지 않아요.";

export const SOURCES: SourceDef[] = [
  {
    id: "KOR-01",
    shortLabel: "교육분야 AI 윤리원칙",
    natureLabel: "국내 교육지침",
    region: "KOR",
    docTitle: "사람의 성장을 지원하는 교육분야 인공지능 윤리원칙",
    publisher: "교육부",
    year: "2022",
    url: "https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=92297&lev=0&m=020402&opType=N&s=moe&statusYN=W",
    lastVerified: LAST_VERIFIED,
    studentSummary:
      "우리나라 교육부가 학교에서 AI를 사용할 때 모두가 지켜야 할 약속을 정리한 문서예요. AI는 사람의 성장을 돕는 도구여야 하고, 어떤 학생에게나 공평하게 배울 기회가 열려 있어야 한다고 말해요. 또 선생님의 전문성을 존중하면서 안전과 개인정보 보호도 함께 지키자고 약속하고 있어요.",
    studentQuestion: "AI 좌석이 부족할 때 어떤 규칙이 배움의 기회를 더 공평하게 만들까요?",
    teacherScope:
      "국내 교육분야 지침 · 법적 강제력은 없으나 학교 AI 활용의 기본 기준 · 접근 형평·연대·교수자 전문성 카드의 근거로 사용.",
    tags: ["교육", "아동·청소년"],
  },
  {
    id: "KOR-02",
    shortLabel: "국가 AI 윤리기준",
    natureLabel: "국내 윤리기준",
    region: "KOR",
    docTitle: "사람이 중심이 되는 인공지능(AI) 윤리기준",
    publisher: "과학기술정보통신부·정보통신정책연구원",
    year: "2020",
    url: "https://ai.kisdi.re.kr/aieth/main/contents.do?menuNo=400029",
    lastVerified: LAST_VERIFIED,
    studentSummary:
      "과학기술정보통신부가 발표한, 사람이 중심이 되는 AI를 만들기 위한 우리나라의 윤리기준이에요. 인간의 존엄성, 사회의 공공선, 기술의 합목적성이라는 세 가지 기본원칙을 세웠어요. 그리고 프라이버시 보호, 연대성, 투명성 같은 열 가지 핵심요건으로 AI를 함께 살펴보자고 제안해요.",
    studentQuestion: "우리 반에서 AI를 쓸 때 열 가지 요건 중 무엇을 가장 먼저 살펴보고 싶나요?",
    teacherScope:
      "국내 범부처 윤리기준 · 법적 구속력이 없는 자율규범 · 연대성 등 10대 핵심요건 토론의 기준으로 사용.",
    tags: ["권고"],
  },
  {
    id: "KOR-03",
    shortLabel: "AI 윤리교육 개발기준",
    natureLabel: "국내 교육지침",
    region: "KOR",
    docTitle: "사람중심의 인공지능 구현을 위한 인공지능 윤리정책 개발",
    publisher: "과학기술정보통신부·정보통신정책연구원",
    year: "2021",
    url: "https://ai.kisdi.re.kr/aieth/bbs/B0000085/view.do?menuNo=400014&nttId=344&pageIndex=1",
    lastVerified: LAST_VERIFIED,
    studentSummary:
      "AI 윤리를 어떻게 가르치면 좋을지 연구해서 정리한 우리나라의 정책 보고서예요. 학생의 나이와 발달 수준에 맞게 놀이, 체험, 탐구 활동으로 배우는 것이 좋다고 제안해요. 이 게임이 시험 문제 대신 선택과 토론으로 윤리를 경험하게 만든 이유가 여기에 담겨 있어요.",
    studentQuestion: "정답 고르기와 직접 겪어 보기 중 어느 쪽이 윤리를 배우는 데 더 도움이 될까요?",
    teacherScope:
      "국내 정책연구 보고서(제3장·부록 2 인공지능 윤리교육 콘텐츠 개발 기준) · 법적 의무 아님 · 놀이·체험형 학습 설계의 근거로 사용.",
    tags: ["교육", "아동·청소년"],
  },
  {
    id: "KOR-04",
    shortLabel: "생성형 AI 교수학습 가이드",
    natureLabel: "국내 교수학습 안내",
    region: "KOR",
    docTitle: "생성형 AI를 활용한 교수학습 운영 가이드(GM 2024-05)",
    publisher: "한국교육학술정보원",
    year: "2024",
    url: "https://www.keris.or.kr/main/ad/pblcte/selectPblcteETCInfo.do?mi=1142&pblcteSeq=13792",
    lastVerified: LAST_VERIFIED,
    studentSummary:
      "한국교육학술정보원이 만든, 학교 수업에서 생성형 AI를 활용하는 방법을 담은 안내서예요. AI의 답을 그대로 옮기지 않고 질문을 다듬고 결과를 확인하며 쓰는 방법을 알려 줘요. 교과 수업 속에서 AI를 안전하고 의미 있게 쓰는 흐름을 보여 주는 자료예요.",
    studentQuestion: "AI가 준 답을 발표에 쓰기 전에 나는 무엇을 확인해야 할까요?",
    teacherScope:
      "국내 교수학습 안내 자료 · 법적 의무 아님 · 질문 설계·결과 검증 활동 카드의 수업 운영 근거로 사용.",
    tags: ["교육"],
  },
  {
    id: "KOR-05",
    shortLabel: "생성형 AI 개인정보 안내",
    natureLabel: "국내 개인정보 안내",
    region: "KOR",
    docTitle: "생성형 인공지능(AI) 개발·활용을 위한 개인정보 처리 안내서",
    publisher: "개인정보보호위원회",
    year: "2025",
    url: "https://pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS217&mCode=G010030020&nttId=11439",
    lastVerified: LAST_VERIFIED,
    studentSummary:
      "개인정보보호위원회가 만든, 생성형 AI를 개발하고 쓸 때 개인정보를 지키는 방법 안내서예요. 꼭 필요한 정보만 모으고, 내 정보가 어디로 가는지 확인하는 것이 중요하다고 말해요. 이 게임이 이름 같은 개인정보를 받지 않는 것도 이 원칙과 이어져 있어요.",
    studentQuestion: "AI에게 무언가 물어볼 때 넣지 말아야 할 나의 정보는 무엇일까요?",
    teacherScope:
      "국내 개인정보 처리 안내서 · 행정 안내 성격 · 데이터 최소 수집과 개인정보 카드, S03 안내 화면의 근거로 사용.",
    tags: ["개인정보"],
  },
  {
    id: "KOR-06",
    shortLabel: "대한민국 AI 기본법",
    natureLabel: "대한민국 법령",
    region: "KOR",
    docTitle: "인공지능 발전과 신뢰 기반 조성 등에 관한 기본법",
    publisher: "대한민국",
    year: "2026",
    url: "https://www.law.go.kr/LSW/lsInfoP.do?efYd=20260122&lsiSeq=282791",
    lastVerified: LAST_VERIFIED,
    studentSummary:
      "AI를 발전시키면서도 믿고 쓸 수 있게 만들기 위해 우리나라가 만든 법이에요. 중요한 AI 결정에는 설명이 필요하고, 누구나 안전하게 AI를 이용할 환경을 만들자는 내용을 담았어요. 이 게임의 설명 보기와 이의제기 장면이 이 법의 생각과 이어져 있어요.",
    studentQuestion: "AI의 결정이 이해되지 않을 때 우리는 무엇을 요청할 수 있을까요?",
    teacherScope:
      "대한민국 현행 법령(제3조·제27조·제29조 참조) · 국내 법제 맥락 소개 · 설명·이의제기·접근성 카드의 배경 자료로 사용.",
    caution: "법령 소개이며 이 게임이 법률 판단을 내리는 것은 아니에요.",
    tags: ["법·규정"],
  },
  {
    id: "INT-01",
    shortLabel: "UNESCO AI 윤리 권고",
    natureLabel: "국제 권고",
    region: "INT",
    docTitle: "Recommendation on the Ethics of Artificial Intelligence",
    publisher: "UNESCO",
    year: "2021",
    url: "https://www.unesco.org/en/legal-affairs/recommendation-ethics-artificial-intelligence",
    lastVerified: LAST_VERIFIED,
    studentSummary:
      "유네스코에 모인 세계 여러 나라가 함께 약속한 AI 윤리 권고예요. AI가 사람의 권리를 지키고, 나라와 사람 사이의 디지털 격차를 줄이는 데 힘써야 한다고 말해요. AI를 배우고 쓸 기회가 모두에게 열려야 한다는 이 게임의 바탕이 되는 약속이에요.",
    studentQuestion: "AI를 쓸 기회가 몇몇 사람에게만 몰리면 어떤 일이 생길까요?",
    teacherScope:
      "국제 권고 · 한국에 직접 구속력 없음 · 포용·디지털 격차·연대성 토론의 비교 기준으로 사용(문단 44–45, 100–106 참조).",
    tags: ["권고"],
  },
  {
    id: "INT-02",
    shortLabel: "UNESCO 생성형 AI 교육 지침",
    natureLabel: "국제 교육지침",
    region: "INT",
    docTitle: "Guidance for Generative AI in Education and Research",
    publisher: "UNESCO",
    year: "2023",
    url: "https://www.unesco.org/en/articles/guidance-generative-ai-education-and-research?hub=66973",
    lastVerified: LAST_VERIFIED,
    studentSummary:
      "유네스코가 만든, 학교와 연구에서 생성형 AI를 쓰는 방법을 안내하는 지침이에요. 사람이 중심이 되어야 하고, 나이에 맞게, 데이터를 보호하며 사용해야 한다고 말해요. 모두가 공평하게 혜택을 받으려면 학교가 무엇을 살펴야 하는지도 알려 줘요.",
    studentQuestion: "생성형 AI를 수업에서 쓸 때 사람이 꼭 맡아야 하는 일은 무엇일까요?",
    teacherScope:
      "국제 교육지침 · 한국에 직접 구속력 없음 · 생성형 AI 수업 규칙 만들기와 연령 적합성 판단의 비교 기준으로 사용.",
    tags: ["교육", "권고"],
  },
  {
    id: "INT-03",
    shortLabel: "UNESCO 학생 AI 역량",
    natureLabel: "국제 역량 프레임워크",
    region: "INT",
    docTitle: "AI Competency Framework for Students",
    publisher: "UNESCO",
    year: "2024",
    url: "https://www.unesco.org/en/articles/ai-competency-framework-students?hub=195885",
    lastVerified: LAST_VERIFIED,
    studentSummary:
      "유네스코가 만든, 학생이 길러야 할 AI 역량을 정리한 국제 틀이에요. AI를 잘 쓰는 힘은 속도가 아니라 이해하고, 적용하고, 새로 만들어 보는 단계로 자란다고 해요. 질문을 설계하고 결과를 검증하는 이 게임의 역량 기록 방식이 여기에서 왔어요.",
    studentQuestion: "AI를 잘 쓴다는 것은 빠른 것일까요, 아니면 확인하며 쓰는 것일까요?",
    teacherScope:
      "국제 역량 프레임워크 · 한국에 직접 구속력 없음 · AI 활용역량(질문·검증·협업) 판정과 난이도 위계의 설계 기준으로 사용.",
    tags: ["교육", "아동·청소년"],
  },
  {
    id: "INT-04",
    shortLabel: "UNICEF 아동 중심 AI 3.0",
    natureLabel: "국제 아동권리 지침",
    region: "INT",
    docTitle: "Guidance on AI and Children, Version 3.0",
    publisher: "UNICEF Innocenti",
    year: "2025",
    url: "https://www.unicef.org/innocenti/reports/policy-guidance-ai-children",
    lastVerified: LAST_VERIFIED,
    studentSummary:
      "유니세프가 만든, 어린이를 위한 AI가 지켜야 할 기준을 담은 안내서예요. AI는 어린이의 안전과 개인정보를 지키고 누구도 차별하지 않아야 한다고 말해요. 어린이에게 가장 좋은 것이 무엇인지 먼저 생각하고 모두를 포용하자는 약속이 담겨 있어요.",
    studentQuestion: "어린이를 위한 AI라면 가장 먼저 무엇을 지켜야 할까요?",
    teacherScope:
      "국제 아동권리 지침 · 한국에 직접 구속력 없음 · 아동 최선의 이익·포용·설명책임 카드의 비교 기준으로 사용.",
    tags: ["아동·청소년", "권고"],
  },
  {
    id: "INT-05",
    shortLabel: "OECD AI 원칙",
    natureLabel: "국제 권고",
    region: "INT",
    docTitle: "OECD AI Principles",
    publisher: "OECD",
    year: "2019(2024 개정)",
    url: "https://oecd.ai/en/ai-principles",
    lastVerified: LAST_VERIFIED,
    studentSummary:
      "OECD에 모인 여러 나라가 함께 약속한 AI 원칙이에요. AI는 모두의 성장을 돕고, 공정해야 하며, 결과를 설명할 수 있어야 하고, 책임지는 사람이 있어야 한다고 해요. 일과 사회가 변할 때 사람들이 새로 배울 수 있게 도울 준비도 함께 하자고 제안해요.",
    studentQuestion: "AI 때문에 일이 달라진 사람을 도시가 어떻게 도울 수 있을까요?",
    teacherScope:
      "국제 권고 · 한국에 직접 구속력 없음 · 포용 성장·노동 전환·재교육 카드의 비교 기준으로 사용.",
    tags: ["권고"],
  },
  {
    id: "INT-06",
    shortLabel: "EU AI Act 교육 맥락",
    natureLabel: "EU 비교 법제",
    region: "INT",
    docTitle: "Regulation (EU) 2024/1689 (Artificial Intelligence Act)",
    publisher: "European Union",
    year: "2024",
    url: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj?locale=en",
    lastVerified: LAST_VERIFIED,
    studentSummary:
      "유럽연합이 만든 AI에 관한 법이에요. 교육에서 쓰이는 일부 AI는 사람에게 큰 영향을 줄 수 있어서 더 조심히 관리해야 한다고 정했어요. AI를 이해하고 다루는 힘, 곧 AI 리터러시를 기르는 일도 중요하게 다루고 있어요.",
    studentQuestion: "학교에서 쓰는 AI를 더 조심히 관리해야 하는 이유는 무엇일까요?",
    teacherScope:
      "EU 비교 법제(제4조·부속서 III 제3항 참조) · 한국 학교에 직접 적용되지 않음 · 위험 기반 관리와 AI 리터러시 토론의 비교 기준으로 사용.",
    caution: "유럽연합 비교 법제로, 한국 학교에 직접 적용되는 법이 아니에요.",
    tags: ["법·규정", "교육"],
  },
  {
    id: "INT-07",
    shortLabel: "ISO/IEC 42001",
    natureLabel: "자발적 국제표준",
    region: "INT",
    docTitle: "ISO/IEC 42001:2023",
    publisher: "ISO/IEC",
    year: "2023",
    url: "https://www.iso.org/standard/42001",
    lastVerified: LAST_VERIFIED,
    studentSummary:
      "AI를 만들고 운영하는 조직이 스스로 관리 체계를 갖추도록 돕는 국제표준이에요. 계획하고, 실행하고, 점검하고, 고쳐 나가는 과정을 반복하며 AI를 책임 있게 다루자고 해요. 이 게임에서 규칙을 만들고 매주 다시 검토하는 장면과 이어져 있어요.",
    studentQuestion: "우리 반 AI 규칙도 한 번 만들고 끝일까요, 계속 살펴봐야 할까요?",
    teacherScope:
      "자발적 국제표준(공개 요약 범위) · 인증·법적 의무 아님 · 규칙 점검·추적성·지속 개선 장면의 비교 기준으로 사용.",
    caution: CAUTION_ISO,
    tags: ["자발표준"],
  },
  {
    id: "INT-08",
    shortLabel: "ISO/IEC 42005",
    natureLabel: "자발적 국제표준",
    region: "INT",
    docTitle: "ISO/IEC 42005:2025",
    publisher: "ISO/IEC",
    year: "2025",
    url: "https://www.iso.org/standard/42005",
    lastVerified: LAST_VERIFIED,
    studentSummary:
      "AI가 개인과 집단, 사회에 어떤 영향을 주는지 미리 살펴보고 기록하도록 돕는 국제표준이에요. 좋아진 점만 보지 말고 부담한 사람과 남은 위험까지 함께 적어 보자고 해요. 이 게임의 얻은 것·부담·남은 위험 기록이 이 생각과 이어져 있어요.",
    studentQuestion: "새 정책을 만들 때 좋은 점 말고 무엇을 더 살펴봐야 할까요?",
    teacherScope:
      "자발적 국제표준(공개 요약 범위) · 인증·법적 의무 아님 · 정책 전후 비교와 개인·집단·사회 영향 기록의 설계 근거로 사용.",
    caution: CAUTION_ISO,
    tags: ["자발표준"],
  },
];
