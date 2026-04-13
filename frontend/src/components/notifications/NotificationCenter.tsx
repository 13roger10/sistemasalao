"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Bell, X, Check, CheckCheck, Wifi, WifiOff } from "lucide-react";
import { useNotificacoes, type NotificacaoWs } from "@/contexts/NotificacaoContext";
import { clsx } from "clsx";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tipoIcone(tipo: string): string {
  const mapa: Record<string, string> = {
    AGENDAMENTO_CONFIRMADO: "✅",
    AGENDAMENTO_CANCELADO: "❌",
    LEMBRETE_24H: "🔔",
    LEMBRETE_2H: "⏰",
    FIDELIDADE_CREDITO: "🎁",
    FIDELIDADE_NIVEL: "⭐",
    AVALIACAO_RECEBIDA: "💬",
    POST_FALHOU: "⚠️",
  };
  return mapa[tipo] ?? "🔔";
}

// ─── NotificationItem ─────────────────────────────────────────────────────────

function NotificationItem({
  notif,
  onRead,
}: {
  notif: NotificacaoWs;
  onRead: (id: number) => void;
}) {
  return (
    <li
      className={clsx(
        "flex items-start gap-3 px-4 py-3 transition-colors",
        notif.lida
          ? "opacity-60"
          : "bg-blue-50/60 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/30"
      )}
    >
      <span className="mt-0.5 shrink-0 text-lg leading-none">
        {notif.icone ?? tipoIcone(notif.tipo)}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
          {notif.titulo}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
          {notif.mensagem}
        </p>
        <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
          {notif.tempoRelativo}
        </p>
      </div>

      {!notif.lida && (
        <button
          onClick={() => onRead(notif.id)}
          title="Marcar como lida"
          className="shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-700 dark:hover:text-blue-400"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
      )}
    </li>
  );
}

// ─── NotificationCenter (public API unchanged for Header.tsx) ──────────────────

export function NotificationCenter() {
  const { naoLidas, recentes, marcarLida, marcarTodasLidas, conectado } =
    useNotificacoes();

  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const handleMarkAll = useCallback(async () => {
    await marcarTodasLidas();
  }, [marcarTodasLidas]);

  const handleMarkOne = useCallback(
    async (id: number) => {
      await marcarLida(id);
    },
    [marcarLida]
  );

  return (
    <div className="relative">
      {/* Bell trigger */}
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notificações${naoLidas > 0 ? ` — ${naoLidas} não lidas` : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
        className="relative rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
      >
        <Bell className="h-5 w-5" />
        {naoLidas > 0 && (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold leading-none text-white ring-2 ring-white dark:ring-gray-900"
          >
            {naoLidas > 99 ? "99+" : naoLidas}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notificações"
          className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800 sm:w-96"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Notificações
              </span>
              {conectado ? (
                <Wifi className="h-3 w-3 text-green-500" title="Conectado em tempo real" />
              ) : (
                <WifiOff className="h-3 w-3 text-gray-400" title="Desconectado" />
              )}
            </div>
            <div className="flex items-center gap-1">
              {naoLidas > 0 && (
                <button
                  onClick={handleMarkAll}
                  title="Marcar todas como lidas"
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Todas lidas
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <ul className="max-h-96 divide-y divide-gray-100 overflow-y-auto dark:divide-gray-700">
            {recentes.length === 0 ? (
              <li className="flex flex-col items-center gap-2 py-10 text-center text-gray-400 dark:text-gray-500">
                <Bell className="h-8 w-8 opacity-30" />
                <span className="text-sm">Nenhuma notificação</span>
              </li>
            ) : (
              recentes.map((n) => (
                <NotificationItem key={n.id} notif={n} onRead={handleMarkOne} />
              ))
            )}
          </ul>

          {/* Footer */}
          {recentes.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-2 dark:border-gray-700">
              <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                Últimas {recentes.length} notificações
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
