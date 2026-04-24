"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { appointmentService } from "@/services/salon/appointmentService";
import { clientService }       from "@/services/salon/clientService";
import { professionalService } from "@/services/salon/professionalService";
import { serviceService }      from "@/services/salon/serviceService";
import { api }                 from "@/services/salon/api";
import type { Appointment, Client, Professional, Service } from "@/types/salon";
import {
  ChevronLeft, ChevronRight, Calendar, Clock, User, Scissors,
  RefreshCw, AlertCircle, CalendarDays, ArrowLeft,
  Plus, X, MoreVertical, Check, Search,
} from "lucide-react";
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addDays, addWeeks, addMonths, subDays, subWeeks, subMonths,
  isSameDay, isSameMonth, isToday, eachDayOfInterval,
} from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Constants ────────────────────────────────────────────────────────────────

type ViewMode = "dia" | "semana" | "mes";

const SALON_ID = "1";

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending:     { label: "Pendente",       cls: "bg-yellow-100 text-yellow-700" },
  confirmed:   { label: "Confirmado",     cls: "bg-green-100 text-green-700" },
  in_progress: { label: "Em Andamento",   cls: "bg-blue-100 text-blue-700" },
  completed:   { label: "Concluído",      cls: "bg-gray-100 text-gray-600" },
  canceled:    { label: "Cancelado",      cls: "bg-red-100 text-red-600" },
  no_show:     { label: "Não Compareceu", cls: "bg-orange-100 text-orange-700" },
};

function statusCfg(s: string) {
  return STATUS_CONFIG[s] ?? STATUS_CONFIG.pending;
}

function serviceNames(appt: Appointment): string {
  return appt.services?.map((s) => s.service?.name ?? "").filter(Boolean).join(" + ") || "—";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDataHora(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split("-");
  const [h, min]  = timeStr.split(":");
  return `${y}-${m}-${d}T${h.padStart(2, "0")}:${min.padStart(2, "0")}:00`;
}

async function reagendarAppointment(
  id: string,
  dateStr: string,
  timeStr: string,
  profissionalId?: string
): Promise<void> {
  await api.post(`/agendamentos/${id}/reagendar`, {
    novaDataHora: toDataHora(dateStr, timeStr),
    ...(profissionalId ? { novoProfissionalId: Number(profissionalId) } : {}),
  });
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="relative w-full max-w-md rounded-xl bg-white shadow-xl dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Cancel Modal ─────────────────────────────────────────────────────────────

function CancelModal({
  appointment,
  onConfirm,
  onClose,
  submitting,
}: {
  appointment: Appointment;
  onConfirm: (reason: string) => void;
  onClose: () => void;
  submitting: boolean;
}) {
  const [reason, setReason] = useState("");

  return (
    <ModalOverlay onClose={onClose}>
      <div className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-white">Cancelar agendamento</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium">{appointment.client?.name}</span> — {serviceNames(appointment)}{" "}
          em {appointment.startTime}
        </p>

        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
            Motivo do cancelamento <span className="text-red-500">*</span>
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Informe o motivo..."
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </label>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Fechar
          </button>
          <button
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            disabled={!reason.trim() || submitting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {submitting ? "Cancelando…" : "Confirmar cancelamento"}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── Reschedule / Edit Modal ──────────────────────────────────────────────────

function RescheduleModal({
  appointment,
  professionals,
  onConfirm,
  onClose,
  submitting,
}: {
  appointment: Appointment;
  professionals: Professional[];
  onConfirm: (date: string, time: string, profId?: string) => void;
  onClose: () => void;
  submitting: boolean;
}) {
  const [date, setDate]     = useState(format(appointment.date, "yyyy-MM-dd"));
  const [time, setTime]     = useState(appointment.startTime);
  const [profId, setProfId] = useState(appointment.professionalId);

  return (
    <ModalOverlay onClose={onClose}>
      <div className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-white">Reagendar / Editar</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {appointment.client?.name} — {serviceNames(appointment)}
        </p>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Nova data</span>
            <input
              type="date"
              value={date}
              min={format(new Date(), "yyyy-MM-dd")}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Novo horário</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </label>

          {professionals.length > 0 && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Profissional
              </span>
              <select
                value={profId}
                onChange={(e) => setProfId(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Fechar
          </button>
          <button
            onClick={() => onConfirm(date, time, profId !== appointment.professionalId ? profId : undefined)}
            disabled={!date || !time || submitting}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {submitting ? "Salvando…" : "Salvar alterações"}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

function CreateModal({
  onConfirm,
  onClose,
  submitting,
}: {
  onConfirm: (data: {
    clientId: string;
    professionalId: string;
    serviceIds: string[];
    date: string;
    time: string;
  }) => void;
  onClose: () => void;
  submitting: boolean;
}) {
  const [clients,       setClients]       = useState<Client[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services,      setServices]      = useState<Service[]>([]);
  const [loadingData,   setLoadingData]   = useState(true);

  const [clientSearch,  setClientSearch]  = useState("");
  const [clientId,      setClientId]      = useState("");
  const [clientName,    setClientName]    = useState("");
  const [showClients,   setShowClients]   = useState(false);
  const [profId,        setProfId]        = useState("");
  const [selectedSvcs,  setSelectedSvcs]  = useState<string[]>([]);
  const [date,          setDate]          = useState(format(new Date(), "yyyy-MM-dd"));
  const [time,          setTime]          = useState("09:00");

  const clientRef = useRef<HTMLDivElement>(null);

  // Load reference data on mount
  useEffect(() => {
    Promise.all([
      clientService.list({ salonId: SALON_ID, limit: 200, page: 1 }),
      professionalService.list({ salonId: SALON_ID, status: "active", limit: 100, page: 1 }),
      serviceService.list({ salonId: SALON_ID, limit: 200, page: 1 }),
    ])
      .then(([c, p, s]) => {
        setClients(c.data ?? []);
        setProfessionals(p.data ?? []);
        setServices(s.data ?? []);
        if (p.data?.length) setProfId(p.data[0].id);
      })
      .catch(() => {})
      .finally(() => setLoadingData(false));
  }, []);

  // Close client dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (clientRef.current && !clientRef.current.contains(e.target as Node)) {
        setShowClients(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.phone && c.phone.includes(clientSearch))
  );

  const toggleService = (id: string) => {
    setSelectedSvcs((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const canSubmit =
    clientId && profId && selectedSvcs.length > 0 && date && time && !submitting;

  return (
    <ModalOverlay onClose={onClose}>
      <div className="max-h-[90vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-white">Novo agendamento</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {loadingData ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* Client search */}
            <div ref={clientRef}>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Cliente <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou telefone…"
                  value={clientName || clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setClientId("");
                    setClientName("");
                    setShowClients(true);
                  }}
                  onFocus={() => setShowClients(true)}
                  className="w-full rounded-lg border py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
                {showClients && filteredClients.length > 0 && (
                  <div className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800">
                    {filteredClients.slice(0, 8).map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setClientId(c.id);
                          setClientName(c.name);
                          setClientSearch("");
                          setShowClients(false);
                        }}
                        className="flex w-full flex-col px-3 py-2 text-left hover:bg-violet-50 dark:hover:bg-gray-700"
                      >
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</span>
                        {c.phone && <span className="text-xs text-gray-500">{c.phone}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {clientId && (
                <p className="mt-1 text-xs text-green-600">
                  <Check className="mr-1 inline h-3 w-3" />
                  {clientName} selecionado
                </p>
              )}
            </div>

            {/* Professional */}
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Profissional <span className="text-red-500">*</span>
              </span>
              <select
                value={profId}
                onChange={(e) => setProfId(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Selecione…</option>
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>

            {/* Services */}
            <div>
              <span className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Serviço(s) <span className="text-red-500">*</span>
              </span>
              <div className="max-h-36 overflow-y-auto rounded-lg border p-2 dark:border-gray-600">
                {services.length === 0 ? (
                  <p className="py-2 text-center text-xs text-gray-400">Nenhum serviço encontrado</p>
                ) : (
                  services.map((s) => (
                    <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded p-1.5 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <input
                        type="checkbox"
                        checked={selectedSvcs.includes(s.id)}
                        onChange={() => toggleService(s.id)}
                        className="accent-violet-600"
                      />
                      <span className="flex-1 text-sm text-gray-800 dark:text-gray-200">{s.name}</span>
                      {s.durationMinutes && (
                        <span className="text-xs text-gray-400">{s.durationMinutes} min</span>
                      )}
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Date + Time */}
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Data <span className="text-red-500">*</span>
                </span>
                <input
                  type="date"
                  value={date}
                  min={format(new Date(), "yyyy-MM-dd")}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Horário <span className="text-red-500">*</span>
                </span>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </label>
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Fechar
          </button>
          <button
            onClick={() => canSubmit && onConfirm({ clientId, professionalId: profId, serviceIds: selectedSvcs, date, time })}
            disabled={!canSubmit}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {submitting ? "Criando…" : "Criar agendamento"}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── Appointment Card ─────────────────────────────────────────────────────────

function AppointmentCard({
  appt,
  compact = false,
  openMenuId,
  setOpenMenuId,
  onAction,
}: {
  appt: Appointment;
  compact?: boolean;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  onAction: (action: "confirm" | "reschedule" | "cancel", appt: Appointment) => void;
}) {
  const status   = statusCfg(appt.status);
  const menuOpen = openMenuId === appt.id;

  const canConfirm   = appt.status === "pending";
  const canReschedule = ["pending", "confirmed"].includes(appt.status);
  const canCancel    = !["canceled", "no_show", "completed"].includes(appt.status);
  const hasActions   = canConfirm || canReschedule || canCancel;

  return (
    <div className="relative rounded-lg border bg-white px-3 py-2.5 shadow-sm hover:shadow-md dark:bg-gray-800 dark:border-gray-700">
      <div className="flex items-start justify-between gap-2">
        {/* Time + status */}
        <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white">
          <Clock className="h-3.5 w-3.5 shrink-0 text-violet-500" />
          <span>{appt.startTime}</span>
          {appt.endTime && (
            <span className="font-normal text-gray-500">– {appt.endTime}</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${status.cls}`}>
            {status.label}
          </span>

          {!compact && hasActions && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuId(menuOpen ? null : appt.id);
              }}
              className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Details */}
      {!compact && (
        <div className="mt-1.5 space-y-1 text-sm">
          <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
            <User className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span className="font-medium">{appt.client?.name ?? "—"}</span>
            {appt.client?.phone && (
              <span className="text-xs text-gray-400">· {appt.client.phone}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
            <Scissors className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span>{serviceNames(appt)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <User className="h-3 w-3 shrink-0 text-gray-300" />
            <span>{appt.professional?.name ?? "—"}</span>
          </div>
        </div>
      )}

      {compact && (
        <div className="mt-1 truncate text-xs text-gray-600 dark:text-gray-400">
          {appt.client?.name ?? "—"} · {serviceNames(appt)}
        </div>
      )}

      {/* Action dropdown */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
          <div className="absolute right-0 top-8 z-20 w-44 overflow-hidden rounded-lg border bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800">
            {canConfirm && (
              <button
                onClick={() => { setOpenMenuId(null); onAction("confirm", appt); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-green-50 dark:text-gray-200 dark:hover:bg-green-900/20"
              >
                <Check className="h-3.5 w-3.5 text-green-600" />
                Confirmar
              </button>
            )}
            {canReschedule && (
              <button
                onClick={() => { setOpenMenuId(null); onAction("reschedule", appt); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-violet-50 dark:text-gray-200 dark:hover:bg-violet-900/20"
              >
                <Calendar className="h-3.5 w-3.5 text-violet-600" />
                Reagendar / Editar
              </button>
            )}
            {canCancel && (
              <button
                onClick={() => { setOpenMenuId(null); onAction("cancel", appt); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <X className="h-3.5 w-3.5" />
                Cancelar
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Day View ─────────────────────────────────────────────────────────────────

function DayView({
  appointments, date, openMenuId, setOpenMenuId, onAction,
}: {
  appointments: Appointment[];
  date: Date;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  onAction: (action: "confirm" | "reschedule" | "cancel", appt: Appointment) => void;
}) {
  const sorted = [...appointments].sort((a, b) => a.startTime.localeCompare(b.startTime));

  const confirmed = sorted.filter((a) => ["confirmed", "in_progress"].includes(a.status));
  const pending   = sorted.filter((a) => a.status === "pending");

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <CalendarDays className="mb-3 h-10 w-10" />
        <p className="text-sm">Nenhum agendamento para este dia.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total",       value: sorted.length,    color: "text-gray-700 dark:text-gray-200" },
          { label: "Confirmados", value: confirmed.length, color: "text-green-600" },
          { label: "Pendentes",   value: pending.length,   color: "text-yellow-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg border bg-white p-3 text-center shadow-sm dark:bg-gray-800 dark:border-gray-700">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="mt-0.5 text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {sorted.map((appt) => (
          <AppointmentCard
            key={appt.id}
            appt={appt}
            openMenuId={openMenuId}
            setOpenMenuId={setOpenMenuId}
            onAction={onAction}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({
  appointments, date, onDayClick, openMenuId, setOpenMenuId, onAction,
}: {
  appointments: Appointment[];
  date: Date;
  onDayClick: (d: Date) => void;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  onAction: (action: "confirm" | "reschedule" | "cancel", appt: Appointment) => void;
}) {
  const weekStart = startOfWeek(date, { locale: ptBR });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="grid grid-cols-7 gap-1 sm:gap-2">
      {days.map((day) => {
        const dayAppts = appointments
          .filter((a) => isSameDay(a.date, day))
          .sort((a, b) => a.startTime.localeCompare(b.startTime));
        const today = isToday(day);

        return (
          <div key={day.toISOString()} className="flex flex-col gap-1">
            <button
              onClick={() => onDayClick(day)}
              className={[
                "rounded-lg p-1.5 text-center transition-colors hover:bg-violet-50",
                today ? "bg-violet-600 text-white hover:bg-violet-700" : "bg-white border dark:bg-gray-800 dark:border-gray-700",
              ].join(" ")}
            >
              <p className={`text-[11px] font-medium ${today ? "text-violet-200" : "text-gray-500"}`}>
                {format(day, "EEE", { locale: ptBR }).toUpperCase()}
              </p>
              <p className={`text-lg font-bold leading-tight ${today ? "text-white" : "text-gray-900 dark:text-white"}`}>
                {format(day, "d")}
              </p>
              {dayAppts.length > 0 && (
                <span className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold ${today ? "bg-white/20 text-white" : "bg-violet-100 text-violet-700"}`}>
                  {dayAppts.length}
                </span>
              )}
            </button>
            <div className="space-y-1">
              {dayAppts.slice(0, 3).map((appt) => (
                <AppointmentCard
                  key={appt.id}
                  appt={appt}
                  compact
                  openMenuId={openMenuId}
                  setOpenMenuId={setOpenMenuId}
                  onAction={onAction}
                />
              ))}
              {dayAppts.length > 3 && (
                <button
                  onClick={() => onDayClick(day)}
                  className="w-full text-center text-[11px] text-violet-600 hover:underline"
                >
                  +{dayAppts.length - 3} mais
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Month View ───────────────────────────────────────────────────────────────

function MonthView({
  appointments, date, onDayClick,
}: {
  appointments: Appointment[];
  date: Date;
  onDayClick: (d: Date) => void;
}) {
  const monthStart = startOfMonth(date);
  const monthEnd   = endOfMonth(date);
  const calStart   = startOfWeek(monthStart, { locale: ptBR });
  const calEnd     = endOfWeek(monthEnd, { locale: ptBR });
  const days       = eachDayOfInterval({ start: calStart, end: calEnd });
  const DAY_NAMES  = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div>
      <div className="mb-1 grid grid-cols-7 gap-1">
        {DAY_NAMES.map((d) => (
          <div key={d} className="py-1 text-center text-[11px] font-semibold uppercase text-gray-400">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dayAppts    = appointments.filter((a) => isSameDay(a.date, day));
          const active      = dayAppts.filter((a) => !["canceled", "no_show"].includes(a.status));
          const inMonth     = isSameMonth(day, date);
          const today       = isToday(day);
          const hasConf     = dayAppts.some((a) => ["confirmed", "in_progress"].includes(a.status));
          const hasPend     = dayAppts.some((a) => a.status === "pending");

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={[
                "flex min-h-[70px] flex-col rounded-lg p-1.5 text-left transition-colors",
                !inMonth ? "opacity-40" : "",
                today
                  ? "bg-violet-600 text-white ring-2 ring-violet-400"
                  : "bg-white border hover:bg-violet-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700",
              ].join(" ")}
            >
              <span className={`text-sm font-semibold ${today ? "text-white" : "text-gray-900 dark:text-white"}`}>
                {format(day, "d")}
              </span>
              {active.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-0.5">
                  {hasConf && <span className={`h-1.5 w-1.5 rounded-full ${today ? "bg-green-300" : "bg-green-500"}`} />}
                  {hasPend && <span className={`h-1.5 w-1.5 rounded-full ${today ? "bg-yellow-300" : "bg-yellow-500"}`} />}
                </div>
              )}
              {active.length > 0 && (
                <span className={`mt-auto text-[10px] font-medium ${today ? "text-violet-200" : "text-gray-500"}`}>
                  {active.length} ag.
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> Confirmado</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-500" /> Pendente</span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type ActiveModal =
  | { type: "create" }
  | { type: "reschedule"; appointment: Appointment }
  | { type: "cancel";     appointment: Appointment }
  | null;

export default function RecepcaoAgendaPage() {
  const router                          = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [view,         setView]         = useState<ViewMode>("dia");
  const [currentDate,  setCurrentDate]  = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [openMenuId,   setOpenMenuId]   = useState<string | null>(null);
  const [activeModal,  setActiveModal]  = useState<ActiveModal>(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [toast,        setToast]        = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  // ── Route protection ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== "receptionist")) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, user, router]);

  // ── Toast ────────────────────────────────────────────────────────────────────
  const showToast = useCallback((msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Load appointments ────────────────────────────────────────────────────────
  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await appointmentService.list({ salonId: SALON_ID, limit: 200, page: 1 });
      setAppointments(result.data ?? []);
    } catch {
      setError("Não foi possível carregar os agendamentos.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load professionals for modals
  useEffect(() => {
    professionalService.list({ salonId: SALON_ID, status: "active", limit: 100, page: 1 })
      .then((r) => setProfessionals(r.data ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.role === "receptionist") loadAppointments();
  }, [isAuthenticated, user, loadAppointments]);

  // ── Navigation ───────────────────────────────────────────────────────────────
  const navigate = (dir: "prev" | "next") => {
    setCurrentDate((d) => {
      if (view === "dia")    return dir === "prev" ? subDays(d, 1)   : addDays(d, 1);
      if (view === "semana") return dir === "prev" ? subWeeks(d, 1)  : addWeeks(d, 1);
      return                        dir === "prev" ? subMonths(d, 1) : addMonths(d, 1);
    });
  };

  const handleDayClick = (day: Date) => { setCurrentDate(day); setView("dia"); };

  // ── Date label ───────────────────────────────────────────────────────────────
  const dateLabel = useMemo(() => {
    if (view === "dia") {
      if (isToday(currentDate)) return `Hoje · ${format(currentDate, "d 'de' MMMM", { locale: ptBR })}`;
      return format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR });
    }
    if (view === "semana") {
      const s = startOfWeek(currentDate, { locale: ptBR });
      const e = endOfWeek(currentDate, { locale: ptBR });
      return `${format(s, "d MMM", { locale: ptBR })} – ${format(e, "d MMM yyyy", { locale: ptBR })}`;
    }
    return format(currentDate, "MMMM yyyy", { locale: ptBR });
  }, [view, currentDate]);

  // ── Filtered appointments ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (view === "dia") return appointments.filter((a) => isSameDay(a.date, currentDate));
    if (view === "semana") {
      const s = startOfWeek(currentDate, { locale: ptBR });
      const e = endOfWeek(currentDate, { locale: ptBR });
      return appointments.filter((a) => a.date >= s && a.date <= e);
    }
    return appointments.filter((a) => isSameMonth(a.date, currentDate));
  }, [appointments, currentDate, view]);

  // ── Actions ───────────────────────────────────────────────────────────────────
  const handleAction = useCallback(
    (action: "confirm" | "reschedule" | "cancel", appt: Appointment) => {
      if (action === "confirm") {
        setSubmitting(true);
        appointmentService.confirm(appt.id)
          .then(() => { showToast("Agendamento confirmado!"); loadAppointments(); })
          .catch(() => showToast("Erro ao confirmar.", "err"))
          .finally(() => setSubmitting(false));
      } else {
        setActiveModal(action === "reschedule"
          ? { type: "reschedule", appointment: appt }
          : { type: "cancel",     appointment: appt }
        );
      }
    },
    [loadAppointments, showToast]
  );

  const handleCancel = async (reason: string) => {
    if (activeModal?.type !== "cancel") return;
    setSubmitting(true);
    try {
      await appointmentService.cancel(activeModal.appointment.id, reason);
      showToast("Agendamento cancelado.");
      setActiveModal(null);
      loadAppointments();
    } catch {
      showToast("Erro ao cancelar.", "err");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReschedule = async (date: string, time: string, profId?: string) => {
    if (activeModal?.type !== "reschedule") return;
    setSubmitting(true);
    try {
      await reagendarAppointment(activeModal.appointment.id, date, time, profId);
      showToast("Agendamento reagendado com sucesso!");
      setActiveModal(null);
      loadAppointments();
    } catch {
      showToast("Erro ao reagendar.", "err");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreate = async (data: {
    clientId: string;
    professionalId: string;
    serviceIds: string[];
    date: string;
    time: string;
  }) => {
    setSubmitting(true);
    try {
      await appointmentService.create({
        clientId:       data.clientId,
        professionalId: data.professionalId,
        serviceIds:     data.serviceIds,
        date:           new Date(data.date),
        startTime:      data.time,
        unitId:         SALON_ID,
      });
      showToast("Agendamento criado com sucesso!");
      setActiveModal(null);
      loadAppointments();
    } catch {
      showToast("Erro ao criar agendamento.", "err");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Toast */}
      {toast && (
        <div className={[
          "fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg",
          toast.type === "ok"
            ? "bg-green-600 text-white"
            : "bg-red-600 text-white",
        ].join(" ")}>
          {toast.type === "ok" ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white px-4 py-3 shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <button
            onClick={() => router.push("/recepcao")}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Recepção
          </button>

          <h1 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
            <Calendar className="h-5 w-5 text-violet-600" />
            Agenda
          </h1>

          <div className="flex items-center gap-2">
            <button
              onClick={loadAppointments}
              disabled={loading}
              className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setActiveModal({ type: "create" })}
              className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-4">
        {/* Navigation bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("prev")}
              className="rounded-lg border bg-white p-1.5 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700"
            >
              <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            </button>
            <div className="min-w-[200px] text-center">
              <p className="text-sm font-semibold capitalize text-gray-900 dark:text-white">{dateLabel}</p>
            </div>
            <button
              onClick={() => navigate("next")}
              className="rounded-lg border bg-white p-1.5 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700"
            >
              <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            </button>
            {!isToday(currentDate) && (
              <button
                onClick={() => setCurrentDate(new Date())}
                className="rounded-lg border bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
              >
                Hoje
              </button>
            )}
          </div>

          {/* View switcher */}
          <div className="flex overflow-hidden rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700">
            {(["dia", "semana", "mes"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={[
                  "px-3 py-1.5 text-sm font-medium capitalize transition-colors",
                  view === v
                    ? "bg-violet-600 text-white"
                    : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700",
                ].join(" ")}
              >
                {v === "dia" ? "Dia" : v === "semana" ? "Semana" : "Mês"}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
            <button onClick={loadAppointments} className="ml-auto font-medium underline">
              Tentar novamente
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
          </div>
        )}

        {/* Views */}
        {!loading && !error && (
          <>
            {view === "dia" && (
              <DayView
                appointments={filtered}
                date={currentDate}
                openMenuId={openMenuId}
                setOpenMenuId={setOpenMenuId}
                onAction={handleAction}
              />
            )}
            {view === "semana" && (
              <WeekView
                appointments={filtered}
                date={currentDate}
                onDayClick={handleDayClick}
                openMenuId={openMenuId}
                setOpenMenuId={setOpenMenuId}
                onAction={handleAction}
              />
            )}
            {view === "mes" && (
              <MonthView
                appointments={filtered}
                date={currentDate}
                onDayClick={handleDayClick}
              />
            )}
          </>
        )}
      </main>

      {/* Modals */}
      {activeModal?.type === "cancel" && (
        <CancelModal
          appointment={activeModal.appointment}
          onConfirm={handleCancel}
          onClose={() => setActiveModal(null)}
          submitting={submitting}
        />
      )}

      {activeModal?.type === "reschedule" && (
        <RescheduleModal
          appointment={activeModal.appointment}
          professionals={professionals}
          onConfirm={handleReschedule}
          onClose={() => setActiveModal(null)}
          submitting={submitting}
        />
      )}

      {activeModal?.type === "create" && (
        <CreateModal
          onConfirm={handleCreate}
          onClose={() => setActiveModal(null)}
          submitting={submitting}
        />
      )}
    </div>
  );
}
