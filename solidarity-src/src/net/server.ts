// 실시간 교실 서버 주소.
// 서버(Cloudflare Worker + Durable Object, worker/)와 프로토콜은 원본 그대로이며
// 게임 화면은 어느 정적 호스트에 두어도 아래 주소의 서버에 WebSocket 으로 붙는다.
// 로컬 검사는 ?server=http://127.0.0.1:8788 로 바꿔 쓴다(같은 탭 안에서만 기억).

export const DEFAULT_SERVER = "https://ethic-city.gottkf12087.workers.dev";

const OVERRIDE_KEY = "ethicity.solidarity.server";

export function serverOverride(): string | null {
  try {
    const fromQuery = new URLSearchParams(window.location.search).get("server");
    if (fromQuery && /^https?:\/\//.test(fromQuery)) {
      window.sessionStorage.setItem(OVERRIDE_KEY, fromQuery);
      return fromQuery;
    }
    return window.sessionStorage.getItem(OVERRIDE_KEY);
  } catch {
    return null;
  }
}

export function serverOrigin(): string {
  return serverOverride() ?? DEFAULT_SERVER;
}

export function roomSocketUrl(code: string, role: "student" | "teacher"): string {
  const origin = new URL(serverOrigin());
  const proto = origin.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${origin.host}/api/room/${code}/ws?role=${role}`;
}

/** 이 게임 페이지 자신의 주소(쿼리 없이). /solidarity/ 같은 하위 경로를 유지한다. */
export function pageUrl(params: Record<string, string>): string {
  const u = new URL(window.location.href);
  u.search = "";
  u.hash = "";
  const override = serverOverride();
  const q = new URLSearchParams(params);
  if (override) q.set("server", override);
  u.search = q.toString();
  return u.toString();
}
