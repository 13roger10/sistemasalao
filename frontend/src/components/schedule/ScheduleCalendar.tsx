"use client";

import { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import type { Post } from "@/types";

interface ScheduleCalendarProps {
  posts: Post[];
  onPostClick?: (post: Post) => void;
  onDateClick?: (date: Date) => void;
  onReschedule?: (post: Post, newDate: Date) => void;
  onCancelSchedule?: (post: Post) => void;
  onPublishNow?: (post: Post) => void;
}

type ViewMode = "month" | "week" | "list";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
const WEEKDAYS_FULL = ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function ScheduleCalendar({
  posts,
  onPostClick,
  onDateClick,
  onReschedule,
  onCancelSchedule,
  onPublishNow,
}: ScheduleCalendarProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // Filtrar apenas posts agendados
  const scheduledPosts = useMemo(() => {
    return posts.filter((p) => p.status === "scheduled" && p.scheduledAt);
  }, [posts]);

  // Agrupar posts por data
  const postsByDate = useMemo(() => {
    const grouped: Record<string, Post[]> = {};
    scheduledPosts.forEach((post) => {
      if (post.scheduledAt) {
        const dateKey = new Date(post.scheduledAt).toISOString().split("T")[0];
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(post);
      }
    });
    return grouped;
  }, [scheduledPosts]);

  // Gerar dias do mes
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: Date[] = [];

    // Dias do mes anterior para preencher a primeira semana
    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push(date);
    }

    // Dias do mes atual
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    // Dias do proximo mes para completar a grade
    const endPadding = 42 - days.length; // 6 semanas x 7 dias
    for (let i = 1; i <= endPadding; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  }, [currentDate]);

  // Gerar dias da semana atual
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push(date);
    }

    return days;
  }, [currentDate]);

  // Verificar se uma data e do mes atual
  const isCurrentMonth = useCallback((date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  }, [currentDate]);

  // Verificar se uma data e hoje
  const isToday = useCallback((date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }, []);

  // Obter posts de uma data
  const getPostsForDate = useCallback((date: Date) => {
    const dateKey = date.toISOString().split("T")[0];
    return postsByDate[dateKey] || [];
  }, [postsByDate]);

  // Navegar entre periodos
  const goToPrevious = useCallback(() => {
    if (viewMode === "month") {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    } else if (viewMode === "week") {
      setCurrentDate(prev => {
        const newDate = new Date(prev);
        newDate.setDate(prev.getDate() - 7);
        return newDate;
      });
    }
  }, [viewMode]);

  const goToNext = useCallback(() => {
    if (viewMode === "month") {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    } else if (viewMode === "week") {
      setCurrentDate(prev => {
        const newDate = new Date(prev);
        newDate.setDate(prev.getDate() + 7);
        return newDate;
      });
    }
  }, [viewMode]);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Formatar horario
  const formatTime = useCallback((date: Date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  }, []);

  // Formatar data completa
  const formatFullDate = useCallback((date: Date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  }, []);

  // Renderizar celula do calendario
  const renderCalendarCell = (date: Date, isWeekView = false) => {
    const datePosts = getPostsForDate(date);
    const isCurrentM = isCurrentMonth(date);
    const isTodayDate = isToday(date);

    return (
      <div
        key={date.toISOString()}
        className={`${isWeekView ? "min-h-[200px]" : "min-h-[100px]"} border-b border-r border-gray-100 dark:border-gray-700 p-1 ${
          !isCurrentM ? "bg-gray-50 dark:bg-gray-800/50" : ""
        }`}
        onClick={() => onDateClick?.(date)}
      >
        {/* Data */}
        <div className="mb-1 flex items-center justify-between">
          <span
            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
              isTodayDate
                ? "bg-violet-500 text-white"
                : !isCurrentM
                  ? "text-gray-400 dark:text-gray-600"
                  : "text-gray-700 dark:text-gray-300"
            }`}
          >
            {date.getDate()}
          </span>
          {isWeekView && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {WEEKDAYS[date.getDay()]}
            </span>
          )}
        </div>

        {/* Posts */}
        <div className="space-y-1">
          {datePosts.slice(0, isWeekView ? 5 : 2).map((post) => (
            <button
              key={post.id}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPost(post);
                onPostClick?.(post);
              }}
              className="group flex w-full items-center gap-1 rounded bg-violet-100 dark:bg-violet-900/50 p-1 text-left transition-colors hover:bg-violet-200 dark:hover:bg-violet-800"
            >
              <div className="relative h-5 w-5 flex-shrink-0 overflow-hidden rounded">
                <Image
                  src={post.imageUrl}
                  alt=""
                  fill
                  className="object-cover"
                />
              </div>
              <span className="truncate text-xs text-violet-700 dark:text-violet-300">
                {post.scheduledAt && formatTime(post.scheduledAt)}
              </span>
            </button>
          ))}
          {datePosts.length > (isWeekView ? 5 : 2) && (
            <span className="block text-center text-xs text-gray-400 dark:text-gray-500">
              +{datePosts.length - (isWeekView ? 5 : 2)} mais
            </span>
          )}
        </div>
      </div>
    );
  };

  // Titulo do periodo atual
  const periodTitle = useMemo(() => {
    if (viewMode === "month") {
      return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    } else if (viewMode === "week") {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
        return `${startOfWeek.getDate()} - ${endOfWeek.getDate()} de ${MONTHS[startOfWeek.getMonth()]}`;
      }
      return `${startOfWeek.getDate()} de ${MONTHS[startOfWeek.getMonth()].substring(0, 3)} - ${endOfWeek.getDate()} de ${MONTHS[endOfWeek.getMonth()].substring(0, 3)}`;
    }
    return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  }, [currentDate, viewMode]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevious}
            className="rounded-lg p-2 text-gray-400 dark:text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <h2 className="min-w-[200px] text-center text-lg font-semibold text-gray-900 dark:text-white">
            {periodTitle}
          </h2>

          <button
            onClick={goToNext}
            className="rounded-lg p-2 text-gray-400 dark:text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={goToToday}
            className="ml-2 rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Hoje
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
          {(["month", "week", "list"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === mode
                  ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {mode === "month" ? "Mes" : mode === "week" ? "Semana" : "Lista"}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        <div className="rounded-lg bg-violet-100 dark:bg-violet-900/50 px-3 py-1.5 text-sm">
          <span className="text-violet-600 dark:text-violet-400">Agendados:</span>{" "}
          <span className="font-semibold text-violet-700 dark:text-violet-300">{scheduledPosts.length}</span>
        </div>
        <div className="rounded-lg bg-amber-100 dark:bg-amber-900/50 px-3 py-1.5 text-sm">
          <span className="text-amber-600 dark:text-amber-400">Esta semana:</span>{" "}
          <span className="font-semibold text-amber-700 dark:text-amber-300">
            {scheduledPosts.filter((p) => {
              if (!p.scheduledAt) return false;
              const date = new Date(p.scheduledAt);
              const today = new Date();
              const startOfWeek = new Date(today);
              startOfWeek.setDate(today.getDate() - today.getDay());
              const endOfWeek = new Date(startOfWeek);
              endOfWeek.setDate(startOfWeek.getDate() + 6);
              return date >= startOfWeek && date <= endOfWeek;
            }).length}
          </span>
        </div>
        <div className="rounded-lg bg-green-100 dark:bg-green-900/50 px-3 py-1.5 text-sm">
          <span className="text-green-600 dark:text-green-400">Hoje:</span>{" "}
          <span className="font-semibold text-green-700 dark:text-green-300">
            {scheduledPosts.filter((p) => {
              if (!p.scheduledAt) return false;
              return isToday(new Date(p.scheduledAt));
            }).length}
          </span>
        </div>
      </div>

      {/* Calendar Views */}
      {viewMode === "month" && (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            {WEEKDAYS.map((day) => (
              <div key={day} className="border-r border-gray-200 dark:border-gray-700 px-2 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((date) => renderCalendarCell(date))}
          </div>
        </div>
      )}

      {viewMode === "week" && (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            {weekDays.map((date, index) => (
              <div
                key={index}
                className={`border-r border-gray-200 dark:border-gray-700 px-2 py-3 text-center last:border-r-0 ${
                  isToday(date) ? "bg-violet-50 dark:bg-violet-900/30" : ""
                }`}
              >
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {WEEKDAYS_FULL[date.getDay()]}
                </div>
                <div className={`mt-1 text-lg font-semibold ${
                  isToday(date) ? "text-violet-600 dark:text-violet-400" : "text-gray-900 dark:text-white"
                }`}>
                  {date.getDate()}
                </div>
              </div>
            ))}
          </div>

          {/* Week grid */}
          <div className="grid grid-cols-7">
            {weekDays.map((date) => renderCalendarCell(date, true))}
          </div>
        </div>
      )}

      {viewMode === "list" && (
        <div className="space-y-3">
          {scheduledPosts.length === 0 ? (
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                <svg className="h-8 w-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">Nenhum post agendado</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Agende seus posts para manter uma presenca consistente nas redes sociais
              </p>
            </div>
          ) : (
            scheduledPosts
              .sort((a, b) => {
                const dateA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
                const dateB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
                return dateA - dateB;
              })
              .map((post) => (
                <div
                  key={post.id}
                  className="flex items-center gap-4 rounded-xl bg-white dark:bg-gray-800 p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  {/* Image */}
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg">
                    <Image
                      src={post.imageUrl}
                      alt={post.title}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-gray-900 dark:text-white">
                      {post.title}
                    </h3>
                    <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                      {post.caption || "Sem legenda"}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <svg className="h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm capitalize text-gray-600 dark:text-gray-400">
                        {post.scheduledAt && formatFullDate(post.scheduledAt)}
                      </span>
                    </div>
                  </div>

                  {/* Platform Badge */}
                  <div className="flex-shrink-0">
                    <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-300">
                      {post.platform === "both" ? "IG + FB" : post.platform === "instagram" ? "IG" : "FB"}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-shrink-0 gap-2">
                    {onPublishNow && (
                      <button
                        onClick={() => onPublishNow(post)}
                        className="rounded-lg p-2 text-green-600 dark:text-green-400 transition-colors hover:bg-green-50 dark:hover:bg-green-900/30"
                        title="Publicar agora"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </button>
                    )}
                    {onCancelSchedule && (
                      <button
                        onClick={() => onCancelSchedule(post)}
                        className="rounded-lg p-2 text-red-600 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-900/30"
                        title="Cancelar agendamento"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))
          )}
        </div>
      )}

      {/* Post Detail Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-xl">
            <div className="relative aspect-video">
              <Image
                src={selectedPost.imageUrl}
                alt={selectedPost.title}
                fill
                className="object-cover"
              />
              <button
                onClick={() => setSelectedPost(null)}
                className="absolute right-3 top-3 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                {selectedPost.title}
              </h3>
              <p className="mb-4 text-sm text-gray-500 dark:text-gray-400 line-clamp-3">
                {selectedPost.caption || "Sem legenda"}
              </p>
              <div className="mb-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="capitalize">
                  {selectedPost.scheduledAt && formatFullDate(selectedPost.scheduledAt)}
                </span>
              </div>
              <div className="flex gap-2">
                {onReschedule && (
                  <button
                    onClick={() => {
                      onReschedule(selectedPost, new Date());
                      setSelectedPost(null);
                    }}
                    className="flex-1 rounded-lg bg-violet-500 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-600"
                  >
                    Reagendar
                  </button>
                )}
                {onPublishNow && (
                  <button
                    onClick={() => {
                      onPublishNow(selectedPost);
                      setSelectedPost(null);
                    }}
                    className="flex-1 rounded-lg bg-green-500 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600"
                  >
                    Publicar Agora
                  </button>
                )}
                {onCancelSchedule && (
                  <button
                    onClick={() => {
                      onCancelSchedule(selectedPost);
                      setSelectedPost(null);
                    }}
                    className="rounded-lg bg-red-100 dark:bg-red-900/50 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 transition-colors hover:bg-red-200 dark:hover:bg-red-900"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
