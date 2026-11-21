import { useCallback, useEffect, useRef, useState } from "react";
import type { ClientMsg, PlayerView, RoomState, ServerMsg } from "../shared/protocol";
import { roomSocketUrl } from "./server";

// 교실 접속 훅 — WebSocket 으로 방에 붙고, 끊기면 스스로 다시 붙는다.
// 학생 토큰은 ethicity.solidarity.token.<코드> 에 저장해 새로고침해도 같은 자리로 돌아온다.
// 서버 프로토콜(src/shared/protocol.ts)은 원본 그대로다.

const TOKEN_PREFIX = "ethicity.solidarity.token.";

export type ConnStatus = "connecting" | "open" | "closed" | "error";

export interface RoomConn {
  status: ConnStatus;
  room: RoomState | null;
  me: PlayerView | null;
  error: string | null;
  send: (msg: ClientMsg) => void;
}

export function tokenKeyFor(code: string): string {
  return `${TOKEN_PREFIX}${code}`;
}

export function useRoom(code: string | null, role: "student" | "teacher", name: string): RoomConn {
  const [status, setStatus] = useState<ConnStatus>("connecting");
  const [room, setRoom] = useState<RoomState | null>(null);
  const [me, setMe] = useState<PlayerView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const queue = useRef<ClientMsg[]>([]);
  const retry = useRef(0);
  const alive = useRef(true);

  const send = useCallback((msg: ClientMsg) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    } else {
      queue.current.push(msg);
    }
  }, []);

  useEffect(() => {
    if (!code) return;
    alive.current = true;

    const connect = () => {
      if (!alive.current) return;
      setStatus("connecting");
      const ws = new WebSocket(roomSocketUrl(code, role));
      wsRef.current = ws;

      ws.onopen = () => {
        if (!alive.current) return;
        retry.current = 0;
        setStatus("open");
        if (role === "student") {
          let token: string | undefined;
          try {
            token = window.localStorage.getItem(tokenKeyFor(code)) ?? undefined;
          } catch {
            token = undefined;
          }
          ws.send(JSON.stringify({ t: "join", name, token } satisfies ClientMsg));
        }
        for (const m of queue.current.splice(0)) ws.send(JSON.stringify(m));
      };

      ws.onmessage = (event) => {
        let msg: ServerMsg;
        try {
          msg = JSON.parse(String(event.data)) as ServerMsg;
        } catch {
          return;
        }
        if (msg.t === "welcome") {
          try {
            window.localStorage.setItem(tokenKeyFor(code), msg.token);
          } catch {
            // 저장 실패는 무시
          }
          setMe(msg.you);
          setRoom(msg.room);
        } else if (msg.t === "teacherWelcome") {
          setRoom(msg.room);
        } else if (msg.t === "room" || msg.t === "stage") {
          setRoom(msg.room);
          setMe((prev) => (prev ? (msg.room.players.find((p) => p.id === prev.id) ?? prev) : prev));
        } else if (msg.t === "error") {
          setError(msg.message);
        }
      };

      ws.onclose = () => {
        if (!alive.current) return;
        setStatus("closed");
        retry.current = Math.min(retry.current + 1, 6);
        setTimeout(connect, 400 * retry.current);
      };

      ws.onerror = () => {
        setStatus("error");
      };
    };

    connect();
    return () => {
      alive.current = false;
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [code, role, name]);

  return { status, room, me, error, send };
}
