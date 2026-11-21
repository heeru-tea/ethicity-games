import { GAME_ID } from "./common/pack";

// 부모(허브) 페이지 통합 — postMessage 의 ethicity:* 이벤트만 쓴다. 부모 DOM 은 건드리지 않는다.
// result 에는 닉네임 원문·자유 입력·개인정보를 넣지 않는다.

export interface CompleteResult {
  completed: true;
  role: "student" | "teacher";
  plan?: string;
  policy?: string | null;
  legacyRule?: string | null;
}

function post(message: Record<string, unknown>) {
  try {
    window.parent.postMessage({ ...message, gameId: GAME_ID }, "*");
  } catch {
    // 부모가 없거나 차단되어도 게임은 계속된다
  }
}

let readySent = false;
export function postReady(): void {
  if (readySent) return;
  readySent = true;
  post({ type: "ethicity:ready" });
}

let lastProgress = "";
export function postProgress(current: number, total: number): void {
  const key = `${current}/${total}`;
  if (key === lastProgress) return;
  lastProgress = key;
  post({ type: "ethicity:progress", current, total });
}

let completeSent = false;
export function postComplete(result: CompleteResult): void {
  if (completeSent) return;
  completeSent = true;
  post({ type: "ethicity:complete", result });
}
