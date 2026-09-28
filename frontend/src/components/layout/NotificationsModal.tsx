"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bell,
  Calendar,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  CheckCheck,
  ChevronRight,
  Clock,
  CreditCard,
  Gift,
  Loader2,
  Star,
  Wallet,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useSalonAuth } from "@/contexts/SalonAuthContext";
import { useSalonNotificacoes, type SalonNotificacaoWs } from "@/contexts/SalonNotificacaoContext";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

// Ícone + cor por tipo de notificação (TipoNotificacao do backend)
const TIPO_STYLES: Record<string, { icon: React.ReactNode; color: string }> = {
  AGENDAMENTO_PENDENTE: { icon: <Calendar className="h-4 w-4" />, color: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400" },
  AGENDAMENTO_CONFIRMADO: { icon: <CalendarCheck className="h-4 w-4" />, color: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" },
  AGENDAMENTO_CONFIRMADO_CLIENTE: { icon: <CalendarCheck className="h-4 w-4" />, color: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" },
  AGENDAMENTO_CANCELADO: { icon: <CalendarX className="h-4 w-4" />, color: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" },
  AGENDAMENTO_REAGENDADO: { icon: <CalendarClock className="h-4 w-4" />, color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" },
  LEMBRETE_24H: { icon: <Clock className="h-4 w-4" />, color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" },
  LEMBRETE_2H: { icon: <Clock className="h-4 w-4" />, color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" },
  AVALIACAO_RECEBIDA: { icon: <Star className="h-4 w-4" />, color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" },
  FIDELIDADE_CREDITO: { icon: <Gift className="h-4 w-4" />, color: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400" },
  FIDELIDADE_NIVEL: { icon: <Gift className="h-4 w-4" />, color: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400" },
  PROMOCAO: { icon: <Gift className="h-4 w-4" />, color: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400" },
  COMISSAO_DISPONIVEL: { icon: <Wallet className="h-4 w-4" />, color: "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400" },
  PAGAMENTO_REALIZADO: { icon: <CreditCard className="h-4 w-4" />, color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" },
};
const DEFAULT_STYLE = { icon: <Bell className="h-4 w-4" />, color: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" };

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Chamado ao clicar numa notificação (marca como lida e navega para o destino). */
  onSelect: (notificacao: SalonNotificacaoWs) => void;
}

interface NotificacoesPage {
  content: SalonNotificacaoWs[];
  last: boolean;
}

export function NotificationsModal({ isOpen, onClose, onSelect }: NotificationsModalProps) {
  const { token } = useSalonAuth();
  const { naoLidas, marcarTodasLidas } = useSalonNotificacoes();

  const [items, setItems] = useState<SalonNotificacaoWs[]>([]);
  const [page, setPage] = useState(0);
  const [isLastPage, setIsLastPage] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<"todas" | "nao_lidas">("todas");

  const loadPage = useCallback(
    async (pageToLoad: number) => {
      if (!token) return;
      setIsLoading(true);
      setError(false);
      try {
        const response = await fetch(`/api/notificacoes?page=${pageToLoad}&size=${PAGE_SIZE}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = (await response.json()) as NotificacoesPage;
        setItems((prev) => (pageToLoad === 0 ? data.content : [...prev, ...data.content]));
        setPage(pageToLoad);
        setIsLastPage(data.last);
      } catch {
        setError(true);
      } finally {
        setIsLoading(false);
      }
    },
    [token]
  );

  // Recarrega a lista sempre que o modal é aberto
  useEffect(() => {
    if (isOpen) {
      setFilter("todas");
      loadPage(0);
    }
  }, [isOpen, loadPage]);

  const handleMarkAll = async () => {
    await marcarTodasLidas();
    setItems((prev) => prev.map((n) => ({ ...n, lida: true })));
  };

  const handleSelect = (notificacao: SalonNotificacaoWs) => {
    setItems((prev) => prev.map((n) => (n.id === notificacao.id ? { ...n, lida: true } : n)));
    onSelect(notificacao);
  };

  const visibleItems = filter === "nao_lidas" ? items.filter((n) => !n.lida) : items;

  if (typeof document === "undefined") return null;

  return createPortal(
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Notificações"
      description={naoLidas > 0 ? `${naoLidas} não lida${naoLidas > 1 ? "s" : ""}` : "Todas as notificações foram lidas"}
      size="lg"
      footer={
        <Button variant="ghost" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      {/* Filtros + ação */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-700/60">
          {(
            [
              { key: "todas", label: "Todas" },
              { key: "nao_lidas", label: "Não lidas" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                filter === tab.key
                  ? "bg-white text-violet-700 shadow-sm dark:bg-gray-800 dark:text-violet-400"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {naoLidas > 0 && (
          <button
            onClick={handleMarkAll}
            className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Marcar todas como lidas
          </button>
        )}
      </div>

      {/* Lista */}
      <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-gray-100 dark:border-gray-700">
        {isLoading && items.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : error && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">Não foi possível carregar as notificações.</p>
            <button
              onClick={() => loadPage(0)}
              className="mt-2 text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400"
            >
              Tentar novamente
            </button>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bell className="h-8 w-8 text-gray-300 dark:text-gray-600" />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {filter === "nao_lidas" ? "Nenhuma notificação não lida" : "Nenhuma notificação"}
            </p>
          </div>
        ) : (
          visibleItems.map((notif, index) => {
            const style = TIPO_STYLES[notif.tipo] ?? DEFAULT_STYLE;
            const navegavel = Boolean(notif.agendamentoId || notif.link);
            return (
              <button
                key={notif.id}
                onClick={() => handleSelect(notif)}
                className={cn(
                  "group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
                  "hover:bg-gray-50 dark:hover:bg-gray-700/60",
                  !notif.lida && "bg-violet-50/60 dark:bg-violet-900/10",
                  index !== visibleItems.length - 1 && "border-b border-gray-100 dark:border-gray-700"
                )}
              >
                <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", style.color)}>
                  {style.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm leading-snug",
                      notif.lida ? "font-medium text-gray-700 dark:text-gray-300" : "font-semibold text-gray-900 dark:text-white"
                    )}
                  >
                    {notif.titulo}
                  </p>
                  <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{notif.mensagem}</p>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{notif.tempoRelativo}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2 self-center">
                  {!notif.lida && <span className="h-2 w-2 rounded-full bg-violet-500" />}
                  {navegavel && (
                    <ChevronRight className="h-4 w-4 text-gray-300 transition-colors group-hover:text-violet-500 dark:text-gray-600" />
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Paginação */}
      {!isLastPage && items.length > 0 && (
        <div className="mt-3 flex justify-center">
          <Button variant="ghost" size="sm" onClick={() => loadPage(page + 1)} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Carregar mais"}
          </Button>
        </div>
      )}
    </Modal>,
    document.body
  );
}
