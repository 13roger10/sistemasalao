"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui";

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (date: Date) => void;
  isLoading?: boolean;
  minDate?: Date;
  initialDate?: Date;
  platform?: "instagram" | "facebook" | "both";
}

// Horarios sugeridos para melhor engajamento
const SUGGESTED_TIMES = [
  { label: "Manha cedo", time: "07:00", description: "Bom para stories" },
  { label: "Hora do almoco", time: "12:00", description: "Alto engajamento" },
  { label: "Fim da tarde", time: "17:00", description: "Horario de pico" },
  { label: "Noite", time: "20:00", description: "Melhor alcance" },
];

// Dias da semana em portugues
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function ScheduleModal({
  isOpen,
  onClose,
  onSchedule,
  isLoading = false,
  minDate: _minDate = new Date(),
  initialDate,
  platform = "both",
}: ScheduleModalProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const date = initialDate || new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });

  const [selectedDate, setSelectedDate] = useState<Date | null>(
    initialDate || null
  );

  const [selectedTime, setSelectedTime] = useState<string>(
    initialDate
      ? `${String(initialDate.getHours()).padStart(2, "0")}:${String(initialDate.getMinutes()).padStart(2, "0")}`
      : "12:00"
  );

  // Gerar dias do calendario
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: (Date | null)[] = [];

    // Dias vazios antes do primeiro dia do mes
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // Dias do mes
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  }, [currentMonth]);

  // Verificar se uma data esta no passado
  const isDateDisabled = useCallback((date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate < today;
  }, []);

  // Verificar se uma data esta selecionada
  const isDateSelected = useCallback((date: Date) => {
    if (!selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  }, [selectedDate]);

  // Verificar se e hoje
  const isToday = useCallback((date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }, []);

  // Navegar entre meses
  const goToPreviousMonth = useCallback(() => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  // Selecionar data
  const handleDateSelect = useCallback((date: Date) => {
    if (!isDateDisabled(date)) {
      setSelectedDate(date);
    }
  }, [isDateDisabled]);

  // Selecionar horario sugerido
  const handleSuggestedTime = useCallback((time: string) => {
    setSelectedTime(time);
  }, []);

  // Confirmar agendamento
  const handleConfirm = useCallback(() => {
    if (!selectedDate) return;

    const [hours, minutes] = selectedTime.split(":").map(Number);
    const scheduledDate = new Date(selectedDate);
    scheduledDate.setHours(hours, minutes, 0, 0);

    // Verificar se a data/hora esta no futuro
    if (scheduledDate <= new Date()) {
      return;
    }

    onSchedule(scheduledDate);
  }, [selectedDate, selectedTime, onSchedule]);

  // Formatar data para exibicao
  const formatSelectedDateTime = useMemo(() => {
    if (!selectedDate) return null;

    const [hours, minutes] = selectedTime.split(":").map(Number);
    const date = new Date(selectedDate);
    date.setHours(hours, minutes);

    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }, [selectedDate, selectedTime]);

  // Verificar se pode confirmar
  const canConfirm = useMemo(() => {
    if (!selectedDate || !selectedTime) return false;

    const [hours, minutes] = selectedTime.split(":").map(Number);
    const scheduledDate = new Date(selectedDate);
    scheduledDate.setHours(hours, minutes, 0, 0);

    return scheduledDate > new Date();
  }, [selectedDate, selectedTime]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-xl">
        {/* Header */}
        <div className="border-b border-gray-100 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Agendar Publicacao
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Escolha quando seu post sera publicado
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 dark:text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Platform Info */}
        <div className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 dark:text-gray-400">Plataforma:</span>
            <span className="flex items-center gap-1 font-medium text-gray-700 dark:text-gray-300">
              {platform === "instagram" && (
                <>
                  <svg className="h-4 w-4 text-pink-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  Instagram
                </>
              )}
              {platform === "facebook" && (
                <>
                  <svg className="h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Facebook
                </>
              )}
              {platform === "both" && (
                <>
                  <svg className="h-4 w-4 text-pink-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  +
                  <svg className="h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Instagram + Facebook
                </>
              )}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {/* Calendar */}
          <div className="mb-6">
            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={goToPreviousMonth}
                className="rounded-lg p-2 text-gray-400 dark:text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h3>
              <button
                onClick={goToNextMonth}
                className="rounded-lg p-2 text-gray-400 dark:text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Weekday headers */}
            <div className="mb-2 grid grid-cols-7 gap-1">
              {WEEKDAYS.map((day) => (
                <div key={day} className="py-2 text-center text-xs font-medium text-gray-400 dark:text-gray-500">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, index) => (
                <div key={index} className="aspect-square">
                  {date ? (
                    <button
                      onClick={() => handleDateSelect(date)}
                      disabled={isDateDisabled(date)}
                      className={`flex h-full w-full items-center justify-center rounded-lg text-sm transition-colors ${
                        isDateSelected(date)
                          ? "bg-violet-500 font-semibold text-white"
                          : isToday(date)
                            ? "bg-violet-100 dark:bg-violet-900/50 font-semibold text-violet-700 dark:text-violet-300"
                            : isDateDisabled(date)
                              ? "cursor-not-allowed text-gray-300 dark:text-gray-600"
                              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      {date.getDate()}
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {/* Time Selection */}
          <div className="mb-6">
            <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
              Horario
            </h4>

            {/* Suggested times */}
            <div className="mb-4 grid grid-cols-2 gap-2">
              {SUGGESTED_TIMES.map((suggestion) => (
                <button
                  key={suggestion.time}
                  onClick={() => handleSuggestedTime(suggestion.time)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    selectedTime === suggestion.time
                      ? "border-violet-500 bg-violet-50 dark:bg-violet-900/30"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${
                      selectedTime === suggestion.time ? "text-violet-700 dark:text-violet-300" : "text-gray-700 dark:text-gray-300"
                    }`}>
                      {suggestion.label}
                    </span>
                    <span className={`text-sm ${
                      selectedTime === suggestion.time ? "text-violet-600 dark:text-violet-400" : "text-gray-500 dark:text-gray-400"
                    }`}>
                      {suggestion.time}
                    </span>
                  </div>
                  <p className={`mt-1 text-xs ${
                    selectedTime === suggestion.time ? "text-violet-500 dark:text-violet-400" : "text-gray-400 dark:text-gray-500"
                  }`}>
                    {suggestion.description}
                  </p>
                </button>
              ))}
            </div>

            {/* Custom time */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">Ou escolha:</span>
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              />
            </div>
          </div>

          {/* Selected DateTime Preview */}
          {selectedDate && formatSelectedDateTime && (
            <div className="rounded-xl border border-violet-100 dark:border-violet-900 bg-violet-50 dark:bg-violet-900/20 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/50">
                  <svg className="h-5 w-5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-violet-900 dark:text-violet-300">
                    Seu post sera publicado em:
                  </p>
                  <p className="mt-1 text-sm capitalize text-violet-700 dark:text-violet-400">
                    {formatSelectedDateTime}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-gray-100 dark:border-gray-700 p-4">
          <Button
            variant="outline"
            fullWidth
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            fullWidth
            onClick={handleConfirm}
            disabled={!canConfirm || isLoading}
            isLoading={isLoading}
          >
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Agendar Publicacao
          </Button>
        </div>
      </div>
    </div>
  );
}
