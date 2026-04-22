"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { useWebSocket } from "@/hooks/useWebSocket";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NotificacaoWs {
  id: number;
  tipo: string;
  titulo: string;
  mensagem: string;
  link?: string;
  icone?: string;
  lida: boolean;
  criadoEm: string;
  tempoRelativo: string;
}

interface ContadorWs {
  naoLidas: number;
}

interface NotificacaoContextType {
  /** Current unread notification count (badge) */
  naoLidas: number;
  /** Latest notifications received in this session (most recent first, capped at 20) */
  recentes: NotificacaoWs[];
  /** Marks one notification as read (optimistic) */
  marcarLida: (id: number) => Promise<void>;
  /** Marks all notifications as read (optimistic) */
  marcarTodasLidas: () => Promise<void>;
  /** Whether the WebSocket is currently connected */
  conectado: boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const NotificacaoContext = createContext<NotificacaoContextType | undefined>(undefined);

const MAX_RECENTES = 20;
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

// ─── Provider ─────────────────────────────────────────────────────────────────

export function NotificacaoProvider({ children }: { children: ReactNode }) {
  const { token, isAuthenticated } = useAuth();

  const [naoLidas, setNaoLidas] = useState(0);
  const [recentes, setRecentes] = useState<NotificacaoWs[]>([]);
  const [conectado, setConectado] = useState(false);

  const tokenRef = useRef(token);
  tokenRef.current = token;

  // ── Bootstrap: fetch initial unread count from REST on mount ──────────────
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    fetch(`${API_BASE}/notificacoes/resumo`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setNaoLidas(data.totalNaoLidas ?? 0);
        setRecentes((data.recentes ?? []).slice(0, MAX_RECENTES));
      })
      .catch(() => {/* offline / not critical */});
  }, [isAuthenticated, token]);

  // ── WebSocket ─────────────────────────────────────────────────────────────
  const { subscribe } = useWebSocket({
    token: isAuthenticated ? token : null,
    onConnect: () => setConectado(true),
    onDisconnect: () => setConectado(false),
  });

  // Subscribe to new notifications
  useEffect(() => {
    if (!isAuthenticated) return;

    return subscribe<NotificacaoWs>("/user/queue/notificacoes", (notif) => {
      setRecentes((prev) => [notif, ...prev].slice(0, MAX_RECENTES));
      setNaoLidas((c) => c + 1);
    });
  }, [isAuthenticated, subscribe]);

  // Subscribe to badge counter updates
  useEffect(() => {
    if (!isAuthenticated) return;

    return subscribe<ContadorWs>("/user/queue/notificacoes/contador", ({ naoLidas: n }) => {
      setNaoLidas(n);
    });
  }, [isAuthenticated, subscribe]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const marcarLida = useCallback(async (id: number) => {
    // Optimistic update
    setRecentes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, lida: true } : n))
    );
    setNaoLidas((c) => Math.max(0, c - 1));

    try {
      await fetch(`${API_BASE}/notificacoes/${id}/lida`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
    } catch {
      // If REST fails, WebSocket counter update will correct the state shortly
    }
  }, []);

  const marcarTodasLidas = useCallback(async () => {
    setRecentes((prev) => prev.map((n) => ({ ...n, lida: true })));
    setNaoLidas(0);

    try {
      await fetch(`${API_BASE}/notificacoes/lidas`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
    } catch {/* ignore */}
  }, []);

  return (
    <NotificacaoContext.Provider
      value={{ naoLidas, recentes, marcarLida, marcarTodasLidas, conectado }}
    >
      {children}
    </NotificacaoContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNotificacoes() {
  const ctx = useContext(NotificacaoContext);
  if (!ctx) throw new Error("useNotificacoes must be used within NotificacaoProvider");
  return ctx;
}
