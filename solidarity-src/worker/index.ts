import {
  MAX_PLAYERS,
  makeRoomCode,
  normalizeCode,
  type ClientMsg,
  type PlanId,
  type PlayerView,
  type PolicyId,
  type RoomState,
  type ServerMsg,
  type Stage,
  type VoteTally,
} from "../src/shared/protocol";

// 윤리시티 교실 서버.
// 방 하나 = 교실 하나. 교사가 방을 열고 QR을 띄우면 학생들이 폰으로 들어온다.
// 요금제는 서버가 무작위로 나눠 주므로 아무도 미리 알 수 없다.

interface Env {
  ROOM: DurableObjectNamespace;
  ASSETS: Fetcher;
}

interface Player {
  id: string;
  token: string;
  name: string;
  plan: PlanId;
  progress: number;
  score1: number | null;
  score2: number | null;
  correct1: number | null;
  correct2: number | null;
  aiWrongTrusted: number;
  vote: PolicyId | null;
  mood: string | null;
  pledged: boolean;
  sockets: number;
}

const ALL_PLANS: PlanId[] = ["free", "lite", "plus", "pro", "promax"];

/**
 * 요금제 나눠 주기 — 다섯 종류가 골고루 돌아가도록 섞은 더미에서 한 장씩 뽑는다.
 * 더미가 비면 새로 섞는다. 반 인원이 몇 명이든 무료도 프로맥스도 반드시 존재한다.
 */
class PlanDealer {
  private deck: PlanId[] = [];
  draw(): PlanId {
    if (this.deck.length === 0) {
      this.deck = [...ALL_PLANS];
      for (let i = this.deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
      }
    }
    return this.deck.pop()!;
  }
}

function lowTier(plan: PlanId): boolean {
  return plan === "free" || plan === "lite";
}

/** 정책이 적용된 실제 응시 요금제와 공용 자리 이용권. */
function effectiveFor(
  plan: PlanId,
  stage: Stage,
  policy: PolicyId | null,
): { effectivePlan: PlanId; sharedTurns: number } {
  const afterVote = stage === "exam2" || stage === "report2" || stage === "final";
  if (!afterVote || !policy) return { effectivePlan: plan, sharedTurns: 0 };
  if (policy === "basic-for-all" && lowTier(plan)) {
    return { effectivePlan: "plus", sharedTurns: 0 };
  }
  if (policy === "shared-seats" && lowTier(plan)) {
    return { effectivePlan: plan, sharedTurns: 2 };
  }
  return { effectivePlan: plan, sharedTurns: 0 };
}

export class Room {
  private state: DurableObjectState;
  private players = new Map<string, Player>();
  private dealer = new PlanDealer();
  private stage: Stage = "lobby";
  private policy: PolicyId | null = null;
  private code = "";
  private sockets = new Map<WebSocket, { playerId: string | null; teacher: boolean }>();
  private loaded = false;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  private async load() {
    if (this.loaded) return;
    const saved = await this.state.storage.get<{
      code: string;
      stage: Stage;
      policy: PolicyId | null;
      players: Player[];
    }>("room");
    if (saved) {
      this.code = saved.code;
      this.stage = saved.stage;
      this.policy = saved.policy;
      for (const p of saved.players) this.players.set(p.id, { ...p, sockets: 0 });
    }
    this.loaded = true;
  }

  private async save() {
    await this.state.storage.put("room", {
      code: this.code,
      stage: this.stage,
      policy: this.policy,
      players: [...this.players.values()].map((p) => ({ ...p, sockets: 0 })),
    });
  }

  private tally(): VoteTally {
    const t: VoteTally = { keep: 0, "basic-for-all": 0, "shared-seats": 0 };
    for (const p of this.players.values()) if (p.vote) t[p.vote] += 1;
    return t;
  }

  private moods(): Record<string, number> {
    const m: Record<string, number> = {};
    for (const p of this.players.values()) {
      if (p.mood) m[p.mood] = (m[p.mood] ?? 0) + 1;
    }
    return m;
  }

  private view(p: Player): PlayerView {
    const eff = effectiveFor(p.plan, this.stage, this.policy);
    return {
      id: p.id,
      name: p.name,
      plan: p.plan,
      effectivePlan: eff.effectivePlan,
      sharedTurns: eff.sharedTurns,
      online: p.sockets > 0,
      progress: p.progress,
      score1: p.score1,
      score2: p.score2,
      voted: p.vote !== null,
      pledged: p.pledged,
    };
  }

  private roomState(): RoomState {
    return {
      code: this.code,
      stage: this.stage,
      players: [...this.players.values()].map((p) => this.view(p)),
      policy: this.policy,
      tally: this.tally(),
      moods: this.moods(),
      updatedAt: Date.now(),
    };
  }

  private send(ws: WebSocket, msg: ServerMsg) {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // 끊긴 소켓은 무시한다
    }
  }

  private broadcast(msg: ServerMsg) {
    for (const ws of this.sockets.keys()) this.send(ws, msg);
  }

  private broadcastRoom() {
    this.broadcast({ t: "room", room: this.roomState() });
  }

  /** 투표 마감 — 최다 득표 정책을 채택한다(동점이면 격차를 줄이는 쪽 우선). */
  private closeVote() {
    const t = this.tally();
    const order: PolicyId[] = ["basic-for-all", "shared-seats", "keep"];
    let best: PolicyId = "keep";
    let bestN = -1;
    for (const p of order) {
      if (t[p] > bestN) {
        best = p;
        bestN = t[p];
      }
    }
    this.policy = bestN > 0 ? best : "keep";
  }

  async fetch(req: Request): Promise<Response> {
    await this.load();
    const url = new URL(req.url);

    if (url.pathname.endsWith("/create")) {
      if (!this.code) {
        this.code = normalizeCode(url.searchParams.get("code") ?? "") || makeRoomCode();
        await this.save();
      }
      return Response.json({ code: this.code });
    }

    if (url.pathname.endsWith("/state")) {
      return Response.json(this.roomState());
    }

    if (req.headers.get("Upgrade") !== "websocket") {
      return new Response("expected websocket", { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    server.accept();
    const teacher = url.searchParams.get("role") === "teacher";
    this.sockets.set(server, { playerId: null, teacher });

    if (teacher) {
      if (!this.code) {
        this.code = normalizeCode(url.searchParams.get("code") ?? "") || makeRoomCode();
        await this.save();
      }
      this.send(server, { t: "teacherWelcome", room: this.roomState() });
    }

    server.addEventListener("message", async (event) => {
      let msg: ClientMsg;
      try {
        msg = JSON.parse(String(event.data)) as ClientMsg;
      } catch {
        return;
      }
      await this.handle(server, msg);
    });

    const cleanup = () => {
      const meta = this.sockets.get(server);
      if (meta?.playerId) {
        const p = this.players.get(meta.playerId);
        if (p) p.sockets = Math.max(0, p.sockets - 1);
      }
      this.sockets.delete(server);
      this.broadcastRoom();
    };
    server.addEventListener("close", cleanup);
    server.addEventListener("error", cleanup);

    return new Response(null, { status: 101, webSocket: client });
  }

  private async handle(ws: WebSocket, msg: ClientMsg) {
    const meta = this.sockets.get(ws);
    if (!meta) return;

    switch (msg.t) {
      case "join": {
        // 재접속: 토큰이 있으면 원래 자리로 돌아온다(요금제 유지).
        let player = msg.token
          ? [...this.players.values()].find((p) => p.token === msg.token)
          : undefined;
        if (!player) {
          if (this.players.size >= MAX_PLAYERS) {
            this.send(ws, { t: "error", message: "교실이 가득 찼어요 (최대 40명)" });
            return;
          }
          const name = msg.name.trim().slice(0, 8) || "친구";
          const id = crypto.randomUUID().slice(0, 8);
          player = {
            id,
            token: crypto.randomUUID(),
            name,
            plan: this.dealer.draw(),
            progress: 0,
            score1: null,
            score2: null,
            correct1: null,
            correct2: null,
            aiWrongTrusted: 0,
            vote: null,
            mood: null,
            pledged: false,
            sockets: 0,
          };
          this.players.set(id, player);
        } else if (msg.name.trim()) {
          player.name = msg.name.trim().slice(0, 8);
        }
        player.sockets += 1;
        meta.playerId = player.id;
        await this.save();
        this.send(ws, {
          t: "welcome",
          you: this.view(player),
          token: player.token,
          room: this.roomState(),
        });
        this.broadcastRoom();
        return;
      }

      case "setStage": {
        if (!meta.teacher) return;
        if (msg.stage === "exam2" && this.stage === "vote") this.closeVote();
        this.stage = msg.stage;
        // 새 시험이 시작되면 진행도를 초기화한다
        if (msg.stage === "exam1" || msg.stage === "exam2") {
          for (const p of this.players.values()) p.progress = 0;
        }
        await this.save();
        this.broadcast({ t: "stage", stage: this.stage, room: this.roomState() });
        return;
      }

      case "progress": {
        const p = meta.playerId ? this.players.get(meta.playerId) : null;
        if (!p) return;
        p.progress = Math.max(0, Math.min(50, Math.floor(msg.n)));
        this.broadcastRoom();
        return;
      }

      case "submitScore": {
        const p = meta.playerId ? this.players.get(meta.playerId) : null;
        if (!p) return;
        const score = Math.max(0, Math.min(100, Math.round(msg.score)));
        if (msg.exam === 1) {
          p.score1 = score;
          p.correct1 = msg.correct;
        } else {
          p.score2 = score;
          p.correct2 = msg.correct;
        }
        p.aiWrongTrusted += Math.max(0, msg.aiWrongTrusted);
        await this.save();
        this.broadcastRoom();
        return;
      }

      case "vote": {
        const p = meta.playerId ? this.players.get(meta.playerId) : null;
        if (!p) return;
        p.vote = msg.policy;
        await this.save();
        this.broadcastRoom();
        return;
      }

      case "mood": {
        const p = meta.playerId ? this.players.get(meta.playerId) : null;
        if (!p) return;
        p.mood = msg.emoji.slice(0, 4);
        this.broadcastRoom();
        return;
      }

      case "pledge": {
        const p = meta.playerId ? this.players.get(meta.playerId) : null;
        if (!p) return;
        p.pledged = true;
        await this.save();
        this.broadcastRoom();
        return;
      }

      case "reset": {
        if (!meta.teacher) return;
        this.players.clear();
        this.dealer = new PlanDealer();
        this.stage = "lobby";
        this.policy = null;
        await this.save();
        this.broadcast({ t: "stage", stage: this.stage, room: this.roomState() });
        return;
      }

      case "ping":
        this.send(ws, { t: "room", room: this.roomState() });
        return;
    }
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname.startsWith("/api/room/")) {
      const rest = url.pathname.slice("/api/room/".length);
      const code = normalizeCode(rest.split("/")[0] ?? "");
      if (code.length !== 6) {
        return Response.json({ error: "방 코드는 6자리입니다" }, { status: 400 });
      }
      const id = env.ROOM.idFromName(code);
      const stub = env.ROOM.get(id);
      const fwd = new URL(req.url);
      fwd.searchParams.set("code", code);
      return stub.fetch(new Request(fwd.toString(), req));
    }

    if (url.pathname === "/api/new-room") {
      return Response.json({ code: makeRoomCode() });
    }

    return env.ASSETS.fetch(req);
  },
};
