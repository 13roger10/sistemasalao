"use client";

import { useEffect, useRef, useCallback } from "react";
import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";

// WebSocket must connect directly to the backend — cannot go through the
// Next.js HTTP catch-all proxy because SockJS needs a real WebSocket upgrade.
const WS_URL =
  (process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:8081") + "/ws";

export type WsMessageHandler<T = unknown> = (payload: T) => void;

interface UseWebSocketOptions {
  token: string | null;
  /** Called when the connection is established */
  onConnect?: () => void;
  /** Called when the connection drops */
  onDisconnect?: () => void;
}

interface UseWebSocketReturn {
  /** Subscribe to a STOMP destination.  Returns an unsubscribe function. */
  subscribe: <T>(destination: string, handler: WsMessageHandler<T>) => () => void;
  /** Returns true while the client is connected */
  isConnected: () => boolean;
}

/**
 * Low-level STOMP hook.
 *
 * Manages one STOMP client per mount.  Re-connects automatically when the
 * token changes (e.g. after login).  All subscriptions are cleaned up on
 * unmount.
 *
 * Usage:
 *   const { subscribe } = useWebSocket({ token });
 *   useEffect(() => subscribe("/user/queue/notificacoes", handler), []);
 */
export function useWebSocket({
  token,
  onConnect,
  onDisconnect,
}: UseWebSocketOptions): UseWebSocketReturn {
  const clientRef = useRef<Client | null>(null);
  const subscriptionsRef = useRef<Map<string, StompSubscription>>(new Map());

  const isConnected = useCallback(
    () => clientRef.current?.connected ?? false,
    []
  );

  const subscribe = useCallback(
    <T>(destination: string, handler: WsMessageHandler<T>): (() => void) => {
      const doSubscribe = () => {
        if (!clientRef.current?.connected) return;

        const sub = clientRef.current.subscribe(destination, (frame: IMessage) => {
          try {
            const payload = JSON.parse(frame.body) as T;
            handler(payload);
          } catch {
            handler(frame.body as unknown as T);
          }
        });

        subscriptionsRef.current.set(destination, sub);
      };

      // Subscribe immediately if already connected, otherwise queue it for onConnect
      if (clientRef.current?.connected) {
        doSubscribe();
      } else {
        const prevOnConnect = clientRef.current?.onConnect;
        if (clientRef.current) {
          clientRef.current.onConnect = (frame) => {
            prevOnConnect?.(frame);
            doSubscribe();
          };
        }
      }

      return () => {
        const sub = subscriptionsRef.current.get(destination);
        if (sub) {
          sub.unsubscribe();
          subscriptionsRef.current.delete(destination);
        }
      };
    },
    []
  );

  useEffect(() => {
    if (!token) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5_000,
      heartbeatIncoming: 10_000,
      heartbeatOutgoing: 10_000,

      onConnect: () => {
        onConnect?.();
      },

      onDisconnect: () => {
        onDisconnect?.();
      },

      onStompError: (frame) => {
        console.error("[WS] STOMP error:", frame.headers["message"]);
      },
    });

    clientRef.current = client;
    client.activate();

    return () => {
      subscriptionsRef.current.forEach((sub) => sub.unsubscribe());
      subscriptionsRef.current.clear();
      client.deactivate();
      clientRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return { subscribe, isConnected };
}
