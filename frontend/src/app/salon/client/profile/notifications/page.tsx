'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSalonAuth } from '@/contexts/SalonAuthContext';
import {
  ArrowLeft,
  Bell,
  BellOff,
  CalendarCheck,
  CalendarX,
  Star,
  Gift,
  Award,
  Tag,
  Info,
  AlertTriangle,
  CheckCheck,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Notificacao {
  id: number;
  tipo: string;
  titulo: string;
  mensagem: string;
  link?: string;
  icone?: string;
  lida: boolean;
  agendamentoId?: number;
  criadoEmFormatado?: string;
  tempoRelativo?: string;
}

interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  last: boolean;
}

type FilterTab = 'todas' | 'nao_lidas';

// ── Helpers ────────────────────────────────────────────────────────────────────


function getIconComponent(icone?: string) {
  switch (icone) {
    case 'calendar-check': return CalendarCheck;
    case 'calendar-x':     return CalendarX;
    case 'calendar-edit':  return CalendarCheck;
    case 'star':           return Star;
    case 'gift':           return Gift;
    case 'award':          return Award;
    case 'tag':            return Tag;
    case 'info':           return Info;
    case 'alert-triangle': return AlertTriangle;
    default:               return Bell;
  }
}

function getIconColors(icone?: string): { bg: string; text: string } {
  switch (icone) {
    case 'calendar-check': return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' };
    case 'calendar-x':     return { bg: 'bg-red-100 dark:bg-red-900/30',   text: 'text-red-500 dark:text-red-400' };
    case 'calendar-edit':  return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' };
    case 'star':           return { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-500 dark:text-yellow-400' };
    case 'gift':           return { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-600 dark:text-pink-400' };
    case 'award':          return { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' };
    case 'tag':            return { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-500 dark:text-orange-400' };
    case 'alert-triangle': return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-500 dark:text-red-400' };
    default:               return { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-600 dark:text-violet-400' };
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { token } = useSalonAuth();
  const router = useRouter();

  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [filter, setFilter] = useState<FilterTab>('todas');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalNaoLidas, setTotalNaoLidas] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────────

  const fetchNotificacoes = useCallback(async (pageNum: number, currentFilter: FilterTab, append = false) => {
    if (!token) return;

    append ? setIsLoadingMore(true) : setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        size: '20',
        sort: 'criadoEm,desc',
      });

      if (currentFilter === 'nao_lidas') {
        params.set('lida', 'false');
      }

      const res = await fetch(`/api/notificacoes?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Erro ao carregar notificações');

      const data: PageResponse<Notificacao> = await res.json();

      setNotificacoes(prev => append ? [...prev, ...data.content] : data.content);
      setHasMore(!data.last);
      setPage(pageNum);
    } catch {
      setError('Não foi possível carregar as notificações.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [token]);

  const fetchResumo = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/notificacoes/resumo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTotalNaoLidas(data.totalNaoLidas ?? 0);
      }
    } catch {/* silently ignore */}
  }, [token]);

  useEffect(() => {
    fetchNotificacoes(0, filter);
    fetchResumo();
  }, [filter, fetchNotificacoes, fetchResumo]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const marcarLida = async (id: number) => {
    // Optimistic update
    setNotificacoes(prev =>
      prev.map(n => n.id === id ? { ...n, lida: true } : n)
    );
    setTotalNaoLidas(c => Math.max(0, c - 1));

    try {
      await fetch(`/api/notificacoes/${id}/lida`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Reverte se falhar
      setNotificacoes(prev =>
        prev.map(n => n.id === id ? { ...n, lida: false } : n)
      );
      setTotalNaoLidas(c => c + 1);
    }
  };

  const marcarTodasLidas = async () => {
    setIsMarkingAll(true);
    // Optimistic
    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
    setTotalNaoLidas(0);

    try {
      await fetch(`/api/notificacoes/lidas`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (filter === 'nao_lidas') {
        setNotificacoes([]);
        setHasMore(false);
      }
    } catch {
      // Re-fetch para consistência
      fetchNotificacoes(0, filter);
      fetchResumo();
    } finally {
      setIsMarkingAll(false);
    }
  };

  const loadMore = () => {
    if (!isLoadingMore && hasMore) {
      fetchNotificacoes(page + 1, filter, true);
    }
  };

  // ── Filtered list ────────────────────────────────────────────────────────────

  const lista = filter === 'nao_lidas'
    ? notificacoes.filter(n => !n.lida)
    : notificacoes;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-violet-600 to-purple-700 px-4 pb-20 pt-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/salon/client/profile')}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">Notificações</h1>
              {totalNaoLidas > 0 && (
                <p className="text-xs text-white/70">{totalNaoLidas} não {totalNaoLidas === 1 ? 'lida' : 'lidas'}</p>
              )}
            </div>
          </div>

          {totalNaoLidas > 0 && (
            <button
              onClick={marcarTodasLidas}
              disabled={isMarkingAll}
              className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/30 transition-colors disabled:opacity-50"
            >
              {isMarkingAll ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCheck className="h-3.5 w-3.5" />
              )}
              Marcar todas
            </button>
          )}
        </div>

        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-white/5 blur-xl" />
      </div>

      {/* Conteúdo */}
      <div className="relative -mt-16 px-4 pb-24">
        <div className="rounded-2xl bg-white shadow-lg dark:bg-gray-800 overflow-hidden">

          {/* Tabs */}
          <div className="flex border-b border-gray-100 dark:border-gray-700">
            {(['todas', 'nao_lidas'] as FilterTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={cn(
                  'flex-1 py-3.5 text-sm font-medium transition-colors',
                  filter === tab
                    ? 'border-b-2 border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                )}
              >
                {tab === 'todas' ? 'Todas' : (
                  <span className="flex items-center justify-center gap-1.5">
                    Não lidas
                    {totalNaoLidas > 0 && (
                      <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-bold text-white">
                        {totalNaoLidas > 99 ? '99+' : totalNaoLidas}
                      </span>
                    )}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Loading inicial */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Carregando...</p>
            </div>
          )}

          {/* Erro */}
          {!isLoading && error && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <AlertTriangle className="h-10 w-10 text-red-400" />
              <p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">{error}</p>
              <button
                onClick={() => fetchNotificacoes(0, filter)}
                className="mt-4 flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700/50"
              >
                <RefreshCw className="h-4 w-4" />
                Tentar novamente
              </button>
            </div>
          )}

          {/* Lista vazia */}
          {!isLoading && !error && lista.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                <BellOff className="h-8 w-8 text-gray-400" />
              </div>
              <p className="mt-4 font-medium text-gray-700 dark:text-gray-300">
                {filter === 'nao_lidas' ? 'Nenhuma notificação não lida' : 'Nenhuma notificação'}
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {filter === 'nao_lidas'
                  ? 'Você está em dia com tudo!'
                  : 'Suas notificações aparecerão aqui'}
              </p>
            </div>
          )}

          {/* Lista de notificações */}
          {!isLoading && !error && lista.length > 0 && (
            <ul>
              {lista.map((notif, index) => {
                const Icon = getIconComponent(notif.icone);
                const colors = getIconColors(notif.icone);

                return (
                  <li key={notif.id}>
                    <button
                      onClick={() => !notif.lida && marcarLida(notif.id)}
                      className={cn(
                        'w-full flex items-start gap-3 px-4 py-4 text-left transition-colors',
                        !notif.lida && 'bg-violet-50/60 dark:bg-violet-900/10',
                        'hover:bg-gray-50 dark:hover:bg-gray-700/50',
                        index !== lista.length - 1 && 'border-b border-gray-100 dark:border-gray-700'
                      )}
                    >
                      {/* Ícone */}
                      <div className={cn(
                        'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                        colors.bg
                      )}>
                        <Icon className={cn('h-5 w-5', colors.text)} />
                      </div>

                      {/* Conteúdo */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            'text-sm leading-tight',
                            notif.lida
                              ? 'font-medium text-gray-700 dark:text-gray-300'
                              : 'font-semibold text-gray-900 dark:text-white'
                          )}>
                            {notif.titulo}
                          </p>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                              {notif.tempoRelativo}
                            </span>
                            {!notif.lida && (
                              <span className="h-2 w-2 rounded-full bg-violet-500" />
                            )}
                          </div>
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {notif.mensagem}
                        </p>
                        {!notif.lida && (
                          <p className="mt-1.5 text-xs font-medium text-violet-600 dark:text-violet-400">
                            Toque para marcar como lida
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Load more */}
          {!isLoading && !error && hasMore && (
            <div className="border-t border-gray-100 p-4 dark:border-gray-700">
              <button
                onClick={loadMore}
                disabled={isLoadingMore}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700/50"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  'Ver mais notificações'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
