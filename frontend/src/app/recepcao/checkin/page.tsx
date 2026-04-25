"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  ArrowLeft,
  Search,
  UserCheck,
  CheckCircle,
  Clock,
  Loader2,
  MessageCircle,
} from "lucide-react";

const SALON_ID = "1";

type StatusAgendamento =
  | "PENDENTE"
  | "CONFIRMADO"
  | "EM_ANDAMENTO"
  | "CONCLUIDO"
  | "CANCELADO"
  | "NO_SHOW";

interface ServicoAgendado {
  servicoNome: string;
}

interface Appointment {
  id: number;
  clienteNome: string;
  clienteTelefone: string | null;
  profissionalId: number;
  profissionalNome: string;
  servicos: ServicoAgendado[];
  servicoNome?: string;
  dataHora: string;
  status: StatusAgendamento;
}

interface CheckInState {
  loading: boolean;
  done: boolean;
  notified: boolean | null; // null = not attempted, true = sent, false = failed
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
  if (digits.startsWith("55") && digits.length >= 12) return `+${digits}`;
  return `+${digits}`;
}

function buildProfNotification(appt: Appointment): string {
  const cliente = appt.clienteNome.split(" ")[0];
  const hora = formatTime(appt.dataHora);
  const servico =
    appt.servicos?.map((s) => s.servicoNome).join(", ") ||
    appt.servicoNome ||
    "serviço";
  return `Olá! Seu cliente ${cliente} chegou e está aguardando. Agendamento às ${hora} para ${servico}. 👋`;
}

// ─── Appointment card ─────────────────────────────────────────────────────────

interface AppointmentCardProps {
  appt: Appointment;
  checkInState: CheckInState | undefined;
  onCheckIn: (appt: Appointment) => void;
}

function AppointmentCard({ appt, checkInState, onCheckIn }: AppointmentCardProps) {
  const servicos =
    appt.servicos?.map((s) => s.servicoNome).join(", ") ||
    appt.servicoNome ||
    "—";

  const isPending = appt.status === "PENDENTE";
  const isCheckedIn = appt.status === "CONFIRMADO";
  const isInProgress = appt.status === "EM_ANDAMENTO";
  const isDone = appt.status === "CONCLUIDO";

  const state = checkInState;

  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-sm transition-all ${
        state?.done ? "border-emerald-300 bg-emerald-50/30" : ""
      } ${isPending && !state?.done ? "border-violet-200" : ""}`}
    >
      <div className="flex items-start gap-3">
        {/* Status icon */}
        <div className="mt-0.5 shrink-0">
          {state?.done || isCheckedIn || isInProgress ? (
            <CheckCircle className="h-5 w-5 text-emerald-500" />
          ) : isDone ? (
            <CheckCircle className="h-5 w-5 text-gray-300" />
          ) : (
            <Clock className="h-5 w-5 text-violet-400" />
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900">{appt.clienteNome}</p>
          <p className="mt-0.5 text-xs text-gray-500">
            {formatTime(appt.dataHora)} · {appt.profissionalNome}
          </p>
          <p className="text-xs text-gray-400">{servicos}</p>

          {/* Post check-in feedback */}
          {state?.done && (
            <div className="mt-2 space-y-0.5">
              <p className="flex items-center gap-1 text-xs font-medium text-emerald-700">
                <CheckCircle className="h-3.5 w-3.5" /> Check-in realizado
              </p>
              {state.notified === true && (
                <p className="flex items-center gap-1 text-xs text-emerald-600">
                  <MessageCircle className="h-3.5 w-3.5" /> Profissional notificado via WhatsApp
                </p>
              )}
              {state.notified === false && (
                <p className="text-xs text-gray-400">
                  Profissional sem telefone cadastrado
                </p>
              )}
            </div>
          )}

          {/* Status badges for non-pending */}
          {!isPending && !state?.done && (
            <span className="mt-1.5 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
              {isCheckedIn
                ? "Aguardando atendimento"
                : isInProgress
                ? "Em atendimento"
                : "Concluído"}
            </span>
          )}
        </div>

        {/* Check-in button */}
        {isPending && !state?.done && (
          <button
            onClick={() => onCheckIn(appt)}
            disabled={state?.loading}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 disabled:opacity-60"
          >
            {state?.loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserCheck className="h-4 w-4" />
            )}
            {state?.loading ? "..." : "Chegou"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function CheckInContent() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [checkInMap, setCheckInMap] = useState<Record<number, CheckInState>>({});

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const today = toISODate(new Date());
      const res = await api.get<{ content: Appointment[] } | Appointment[]>(
        `/agendamentos/salon/${SALON_ID}`,
        { params: { size: 300, sort: "dataHora" } }
      );
      const list = "content" in res.data ? res.data.content : res.data;
      const todayList = list.filter(
        (a) =>
          a.dataHora.startsWith(today) &&
          a.status !== "CANCELADO" &&
          a.status !== "NO_SHOW"
      );
      setAppointments(todayList);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  async function handleCheckIn(appt: Appointment) {
    setCheckInMap((prev) => ({
      ...prev,
      [appt.id]: { loading: true, done: false, notified: null },
    }));

    try {
      // 1. Confirm (PENDENTE → CONFIRMADO)
      await api.post(`/agendamentos/${appt.id}/confirmar`);

      // 2. Notify professional via WhatsApp (best-effort)
      let notified: boolean | null = null;
      try {
        const profRes = await api.get<{ telefone?: string }>(
          `/profissionais/${appt.profissionalId}`
        );
        const phone = profRes.data?.telefone;
        if (phone) {
          await api.post("/whatsapp/messages/send", {
            telefone: normalizePhone(phone),
            mensagem: buildProfNotification(appt),
            agendamentoId: appt.id,
            salonId: Number(SALON_ID),
          });
          notified = true;
        } else {
          notified = false;
        }
      } catch {
        notified = false;
      }

      // Update local state to CONFIRMADO so button disappears
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === appt.id ? { ...a, status: "CONFIRMADO" as const } : a
        )
      );

      setCheckInMap((prev) => ({
        ...prev,
        [appt.id]: { loading: false, done: true, notified },
      }));
    } catch {
      setCheckInMap((prev) => {
        const { [appt.id]: _, ...rest } = prev;
        return rest;
      });
      alert("Erro ao realizar check-in. Tente novamente.");
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return appointments;
    return appointments.filter((a) =>
      a.clienteNome.toLowerCase().includes(q)
    );
  }, [appointments, search]);

  const pending = filtered.filter((a) => a.status === "PENDENTE");
  const arrived = filtered.filter(
    (a) => a.status === "CONFIRMADO" || a.status === "EM_ANDAMENTO"
  );
  const done = filtered.filter((a) => a.status === "CONCLUIDO");

  const pendingCount = appointments.filter((a) => a.status === "PENDENTE").length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button
            onClick={() => router.back()}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex flex-1 items-center gap-2">
            <UserCheck className="h-5 w-5 text-violet-600" />
            <div>
              <h1 className="font-semibold text-gray-900">Check-in</h1>
              <p className="text-xs text-gray-400">
                {pendingCount} aguardando check-in
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5">
        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar cliente pelo nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm shadow-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200"
          />
        </div>

        {loading ? (
          <div className="py-20 text-center text-sm text-gray-400">
            Carregando...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <UserCheck className="mx-auto mb-3 h-10 w-10 text-gray-200" />
            <p className="text-sm text-gray-400">
              {search ? "Nenhum cliente encontrado." : "Nenhum agendamento para hoje."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pending check-in */}
            {pending.length > 0 && (
              <section>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-violet-600">
                  <Clock className="h-3.5 w-3.5" />
                  Aguardando check-in ({pending.length})
                </p>
                <div className="space-y-2">
                  {pending.map((appt) => (
                    <AppointmentCard
                      key={appt.id}
                      appt={appt}
                      checkInState={checkInMap[appt.id]}
                      onCheckIn={handleCheckIn}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Already arrived */}
            {arrived.length > 0 && (
              <section>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-600">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Já chegaram ({arrived.length})
                </p>
                <div className="space-y-2">
                  {arrived.map((appt) => (
                    <AppointmentCard
                      key={appt.id}
                      appt={appt}
                      checkInState={checkInMap[appt.id]}
                      onCheckIn={handleCheckIn}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Done */}
            {done.length > 0 && (
              <section>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Concluídos ({done.length})
                </p>
                <div className="space-y-2 opacity-60">
                  {done.map((appt) => (
                    <AppointmentCard
                      key={appt.id}
                      appt={appt}
                      checkInState={checkInMap[appt.id]}
                      onCheckIn={handleCheckIn}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function CheckInPage() {
  return (
    <ProtectedRoute requiredRole="receptionist">
      <CheckInContent />
    </ProtectedRoute>
  );
}
