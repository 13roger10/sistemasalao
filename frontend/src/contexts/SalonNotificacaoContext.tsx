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
import { useSalonAuth } from "./SalonAuthContext";
import { useWebSocket } from "@/hooks/useWebSocket";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SalonNotificacaoWs {
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

interface SalonNotificacaoContextType {
  naoLidas: number;
  recentes: SalonNotificacaoWs[];
  marcarLida: (id: number) => Promise<void>;
  marcarTodasLidas: () => Promise<void>;
  conectado: boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const SalonNotificacaoContext = createContext<SalonNotificacaoContextType | undefined>(undefined);

const MAX_RECENTES = 20;

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SalonNotificacaoProvider({ children }: { children: ReactNode }) {
  const { token, isAuthenticated } = useSalonAuth();

  const [naoLidas, setNaoLidas] = useState(0);
  const [recentes, setRecentes] = useState<SalonNotificacaoWs[]>([]);
  const [conectado, setConectado] = useState(false);

  const tokenRef = useRef(token);
  tokenRef.current = token;

  // ── Bootstrap: fetch initial unread count ──────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    fetch("/api/notificacoes/resumo", {
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

  // Subscribe to new notifications pushed by the backend
  useEffect(() => {
    if (!isAuthenticated) return;
    return subscribe<SalonNotificacaoWs>("/user/queue/notificacoes", (notif) => {
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
    setRecentes((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)));
    setNaoLidas((c) => Math.max(0, c - 1));
    try {
      await fetch(`/api/notificacoes/${id}/lida`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
    } catch {/* WebSocket counter will self-correct */}
  }, []);

  const marcarTodasLidas = useCallback(async () => {
    setRecentes((prev) => prev.map((n) => ({ ...n, lida: true })));
    setNaoLidas(0);
    try {
      await fetch("/api/notificacoes/lidas", {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
    } catch {/* ignore */}
  }, []);

  return (
    <SalonNotificacaoContext.Provider value={{ naoLidas, recentes, marcarLida, marcarTodasLidas, conectado }}>
      {children}
    </SalonNotificacaoContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSalonNotificacoes() {
  const ctx = useContext(SalonNotificacaoContext);
  if (!ctx) throw new Error("useSalonNotificacoes must be used within SalonNotificacaoProvider");
  return ctx;
}
