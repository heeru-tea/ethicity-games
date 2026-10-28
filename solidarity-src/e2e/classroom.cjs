// 윤리시티 · 연대성 「성적표의 비밀」 — 실시간 교실 자동 완주 검사.
// 정적 호스트 http://127.0.0.1:8791/solidarity/ + 로컬 Worker http://127.0.0.1:8788 (wrangler dev).
// 선생님 1 + 학생 3 (1440×900 / 760×1000 / 430×860, 마지막 학생은 reduced-motion).
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const STATIC = process.env.SD_STATIC || "http://127.0.0.1:8791/solidarity/";
const SERVER = process.env.SD_SERVER || "http://127.0.0.1:8788";
const OUT = process.env.SD_OUT || path.join(__dirname, "out");
fs.mkdirSync(OUT, { recursive: true });
const EXAMS = require(path.join(__dirname, "content-snapshot.json"));

const consoleErrors = [];
const badRequests = [];
const pages = [];

function url(params) {
  const u = new URL(STATIC);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set("server", SERVER);
  return u.toString();
}

async function newPage(browser, label, viewport, extra = {}) {
  const ctx = await browser.newContext({ viewport, ...extra });
  await ctx.addInitScript(() => {
    window.__ee = [];
    window.addEventListener("message", (e) => {
      if (e.data && typeof e.data.type === "string" && e.data.type.startsWith("ethicity:")) window.__ee.push(e.data);
    });
  });
  const page = await ctx.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(`[${label}] ${m.text()}`);
  });
  page.on("pageerror", (e) => consoleErrors.push(`[${label}] pageerror ${e.message}`));
  page.on("response", (r) => {
    if (r.status() >= 400) badRequests.push(`[${label}] ${r.status()} ${r.url()}`);
  });
  page.on("requestfailed", (r) => {
    const f = r.failure()?.errorText || "";
    if (!/ERR_ABORTED/.test(f)) badRequests.push(`[${label}] failed ${r.url()} ${f}`);
  });
  pages.push({ label, page });
  return page;
}

async function shot(page, name) {
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
}

async function noHScroll(page, label) {
  const ok = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
  if (!ok) throw new Error(`horizontal scroll at ${label}`);
}

async function expectText(page, text, timeout = 20000) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: "visible", timeout });
}

async function next(teacher) {
  await teacher.getByRole("button", { name: "다음 단계로 넘기기" }).click();
}

async function takeExam(page, examIndex, askAi, shotName) {
  const questions = examIndex === 0 ? EXAMS.exam1 : EXAMS.math;
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (askAi && i === 0) {
      const ask = page.getByRole("button", { name: /루미AI 한테 물어보기/ });
      if (await ask.isEnabled()) {
        await ask.click();
        // 광고가 있으면 끝날 때까지 기다린다(최대 7초)
        await page.getByRole("dialog").waitFor({ state: "hidden", timeout: 9000 }).catch(() => {});
        await page.getByText("루미AI 가 고른 답").waitFor({ timeout: 5000 });
      }
    }
    if (shotName && i === 0) await shot(page, shotName);
    await page.getByRole("group", { name: "보기" }).getByRole("button", { name: q.options[q.answer], exact: false }).first().click({ timeout: 15000 });
  }
  await expectText(page, "답안지 냈다!");
}

(async () => {
  const browser = await chromium.launch();
  const teacher = await newPage(browser, "teacher", { width: 1024, height: 768 });
  await teacher.goto(url({}));
  await expectText(teacher, "성적표의 비밀");
  await shot(teacher, "00-landing-1024");
  await teacher.setViewportSize({ width: 1440, height: 900 });
  await shot(teacher, "00-landing-1440");
  await teacher.setViewportSize({ width: 1024, height: 768 });
  await teacher.getByRole("button", { name: "교실 열기" }).click();
  await teacher.getByRole("heading", { name: "선생님 화면" }).waitFor({ timeout: 20000 });
  const code = await teacher.evaluate(() => new URLSearchParams(location.search).get("teach"));
  if (!/^[A-Z0-9]{6}$/.test(code)) throw new Error("bad code " + code);
  await teacher.locator("canvas.sd-qr").waitFor();
  await shot(teacher, "01-teacher-lobby-1024");

  const s1 = await newPage(browser, "s1-1440", { width: 1440, height: 900 });
  const s2 = await newPage(browser, "s2-760", { width: 760, height: 1000 });
  const s3 = await newPage(browser, "s3-430", { width: 430, height: 860 }, { reducedMotion: "reduce" });
  const students = [
    [s1, "민준"],
    [s2, "서연"],
    [s3, "예린"],
  ];
  for (const [p, name] of students) {
    await p.goto(url({ room: code }));
    await p.getByLabel("내 별명").fill(name);
    if (name === "서연") await p.getByRole("group", { name: "내 아바타" }).getByRole("button").nth(1).click();
    await p.getByRole("button", { name: "교실 들어가기" }).click();
    await expectText(p, "교실에 들어왔다!");
  }
  await expectText(teacher, "참가자 (3명)");
  await expectText(s1, "지금 들어온 친구들 (3명)");
  await shot(s1, "02-lobby-1440");
  await shot(s3, "02-lobby-430");
  await noHScroll(s3, "lobby-430");
  await noHScroll(s2, "lobby-760");

  // 요금제 뽑기
  await next(teacher);
  const plans = [];
  for (const [p] of students) {
    await expectText(p, "내 요금제");
    const card = p.locator(".sd-plancard").last();
    await card.waitFor({ timeout: 15000 });
    plans.push(await card.getAttribute("aria-label"));
  }
  if (new Set(plans).size !== 3) throw new Error("plans not distinct: " + plans.join(","));
  await s1.waitForTimeout(1200);
  await shot(s1, "03-draw-1440");
  await shot(s2, "03-draw-760");
  await shot(s3, "03-draw-430");

  // 1교시
  await next(teacher);
  await Promise.all([takeExam(s1, 0, true, "04-exam1-1440"), takeExam(s2, 0, true, "04-exam1-760"), takeExam(s3, 0, false, "04-exam1-430")]);
  await expectText(teacher, "요금제별 평균 점수");
  await shot(teacher, "04-teacher-exam1-1024");

  // 1교시 성적표
  await next(teacher);
  await expectText(s1, "성적통지표");
  for (const n of ["민준", "서연", "예린"]) await s1.getByRole("cell", { name: n }).waitFor();
  await s1.getByRole("group", { name: "지금 기분" }).getByRole("button").nth(4).click();
  await s1.getByRole("button", { name: /채점AI 한테 물어보기/ }).click();
  await expectText(s1, "채점은 틀리지 않았어요");
  await expectText(teacher, "지금 우리 반 기분");
  await shot(s1, "05-report1-1440");
  await s1.setViewportSize({ width: 1024, height: 768 });
  await shot(s1, "05-report1-1024");
  await s1.setViewportSize({ width: 1440, height: 900 });
  await shot(s3, "05-report1-430");
  await noHScroll(s3, "report-430");

  // 미니게임
  await next(teacher);
  await s1.getByRole("heading", { name: "내가 규칙을 정한다면" }).waitFor({ timeout: 15000 });
  await s1.getByRole("button", { name: "문 열고 시작하기" }).click();
  await s1.locator(".sd-kid").first().waitFor({ timeout: 10000 });
  await s1.waitForTimeout(2500);
  await shot(s1, "06-delivery-1440");
  await s1.locator(".sd-kid").first().click();
  await s1.getByText(/건넸어|모자라/).waitFor({ timeout: 5000 });
  await s1.waitForTimeout(400);
  await shot(s1, "06-delivery-after-1440");
  await s1.setViewportSize({ width: 760, height: 1000 });
  await shot(s1, "06-delivery-760");
  await s1.setViewportSize({ width: 1440, height: 900 });
  await s3.getByRole("button", { name: "문 열고 시작하기" }).click();
  await s3.locator(".sd-kid").first().waitFor({ timeout: 10000 });
  await s3.waitForTimeout(2500);
  await shot(s3, "06-delivery-430");
  await noHScroll(s3, "delivery-430");
  await s2.getByRole("button", { name: "규칙 실험실" }).click();
  await s2.getByRole("group", { name: "배분 규칙" }).getByRole("button").first().click();
  await expectText(s2, "그런데 이런 점이 걸려");
  await shot(s2, "06-tickets-760");
  await s2.getByRole("button", { name: "AI 채점기" }).click();
  await s2.getByRole("group", { name: "채점 기준" }).getByRole("button").nth(2).click();
  await expectText(s2, "사람 평가와 일치도");
  await shot(s2, "06-grader-760");

  // 딜레마
  await next(teacher);
  await s1.getByRole("heading", { name: "선택의 갈림길" }).waitFor({ timeout: 15000 });
  await s1.getByRole("group", { name: "선택지" }).getByRole("button").nth(2).click();
  await s1.getByRole("button", { name: "이렇게 하겠습니다" }).click();
  await expectText(s1, "얻은 것");
  await shot(s1, "07-dilemma-1440");
  await shot(s3, "07-dilemma-430");

  // 학급 회의 투표
  await next(teacher);
  for (const [p] of students) await p.getByRole("heading", { name: "재시험 규칙 투표" }).waitFor({ timeout: 15000 });
  await s1.getByRole("group", { name: "규칙 후보" }).getByRole("button").nth(1).click();
  await s2.getByRole("group", { name: "규칙 후보" }).getByRole("button").nth(1).click();
  await s3.getByRole("group", { name: "규칙 후보" }).getByRole("button").nth(0).click();
  await expectText(teacher, "2표");
  await shot(s2, "08-vote-760");
  await shot(teacher, "08-teacher-vote-1024");

  // 2교시
  await next(teacher);
  await expectText(teacher, "채택");
  await Promise.all([takeExam(s1, 1, false), takeExam(s2, 1, true), takeExam(s3, 1, false)]);
  await shot(s3, "09-exam2-done-430");

  // 2교시 성적표 → 마무리
  await next(teacher);
  await expectText(s1, "성적통지표");
  await next(teacher);
  await s1.getByRole("heading", { name: "성적표의 비밀" }).waitFor({ timeout: 15000 });
  for (const [p] of students) {
    await p.getByRole("group", { name: "서약 문장" }).getByRole("button").first().click();
    await p.getByRole("button", { name: "서약하기" }).click();
    await expectText(p, "서약필");
  }
  await s1.getByRole("group", { name: "다음 학년에게 남길 규칙" }).getByRole("button").nth(0).click();
  await s2.getByRole("group", { name: "다음 학년에게 남길 규칙" }).getByRole("button").nth(0).click();
  await s3.getByRole("group", { name: "다음 학년에게 남길 규칙" }).getByRole("button").nth(1).click();
  await expectText(s1, "탐험 완료");
  await s1.locator(".ee-success", { hasText: "우리 반이 남긴 한 줄" }).getByText("누구나 기본 AI 도움").first().waitFor({ timeout: 15000 });
  await teacher.locator(".ee-success", { hasText: "우리 반이 남긴 한 줄" }).getByText("누구나 기본 AI 도움").waitFor({ timeout: 15000 });
  await expectText(teacher, "서약한 학생 3명");
  await shot(s1, "10-final-1440");
  await shot(s2, "10-final-760");
  await shot(s3, "10-final-430");
  await shot(teacher, "10-teacher-final-1024");
  await teacher.setViewportSize({ width: 1440, height: 900 });
  await shot(teacher, "10-teacher-final-1440");
  await noHScroll(s3, "final-430");
  await noHScroll(s2, "final-760");

  // 통합 이벤트·저장 키
  const events = await s1.evaluate(() => window.__ee);
  const types = events.map((e) => e.type);
  if (!types.includes("ethicity:ready")) throw new Error("no ready");
  if (!events.some((e) => e.type === "ethicity:progress" && e.current === 10 && e.total === 10)) throw new Error("no progress 10/10");
  const complete = events.find((e) => e.type === "ethicity:complete");
  if (!complete || complete.gameId !== "solidarity" || !complete.result.completed) throw new Error("no complete");
  if (JSON.stringify(complete).includes("민준")) throw new Error("nickname leaked in result");
  const okPng = await s1.evaluate(() => performance.getEntriesByType("resource").filter((e) => /sd_.*\.png/.test(e.name)).length);
  if (okPng < 2) throw new Error("delivered sd_*.png not loaded: " + okPng);
  const keys = await s1.evaluate(() => Object.keys(localStorage).concat(Object.keys(sessionStorage)));
  const badKeys = keys.filter((k) => !k.startsWith("ethicity.solidarity."));
  if (badKeys.length) throw new Error("bad storage keys: " + badKeys.join(","));

  // 새로고침 복귀
  await s2.reload();
  await expectText(s2, "서약");
  await s2.getByRole("heading", { name: "성적표의 비밀" }).waitFor({ timeout: 20000 });
  await expectText(teacher, "참가자 (3명)");

  // 교실 초기화
  await teacher.getByRole("button", { name: /교실 초기화/ }).click();
  await teacher.getByRole("button", { name: "네, 지웁니다" }).click();
  await expectText(teacher, "참가자 (0명)");

  const report = {
    code,
    plans,
    events: events.map((e) => ({ type: e.type, current: e.current, total: e.total, result: e.result })),
    storageKeys: keys,
    consoleErrors,
    badRequests,
  };
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  if (consoleErrors.length || badRequests.length) {
    console.error("FAILED: console errors or bad requests");
    process.exit(1);
  }
  console.log("PASS");
})().catch(async (e) => {
  console.error("ERROR", e);
  for (const { label, page } of pages) {
    try {
      await page.screenshot({ path: path.join(OUT, `fail-${label}.png`), fullPage: true });
    } catch {}
  }
  console.error(JSON.stringify({ consoleErrors, badRequests }, null, 2));
  process.exit(1);
});
