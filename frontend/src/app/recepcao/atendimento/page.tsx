"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/salon/api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft, RefreshCw, Loader2, AlertCircle,
  UserCheck, Users, CheckCircle2, CreditCard,
  Clock, User, Scissors, ChevronRight, UserX, X,
} from "lucide-react";

const SALON_ID = "1";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ServicoAgendadoDTO {
  servicoNome: string;
}

interface AgendamentoBackend {
  id: number;
  clienteNome: string;
  profissionalNome: string;
  servicos: ServicoAgendadoDTO[];
  servicoNome?: string;
  dataHora: string;
  status: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function toTime(iso: string): string {
  return iso.slice(11, 16);
}

function serviceNames(appt: AgendamentoBackend): string {
  if (appt.servicos?.length) {
    return appt.servicos.map((s) => s.servicoNome).filter(Boolean).join(" + ");
  }
  return appt.servicoNome ?? "—";
}

// ─── Flow step config ─────────────────────────────────────────────────────────

type FlowStatus =
  | "PENDENTE" | "CONFIRMADO" | "EM_ANDAMENTO"
  | "CONCLUIDO" | "CANCELADO" | "NAO_COMPARECEU";

interface StepConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
  actionLabel?: string;
  actionColor?: string;
  endpoint?: string;
  // Whether receptionist can mark "Não Compareceu" from this status
  canNoShow?: boolean;
}

const STEPS: Record<string, StepConfig> = {
  PENDENTE: {
    label: "Aguardando chegada",
    color: "text-yellow-700",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    icon: <Clock className="h-5 w-5 text-yellow-600" />,
    actionLabel: "Cliente Chegou",
    actionColor: "bg-blue-600 hover:bg-blue-700",
    endpoint: "confirmar",
    canNoShow: false, // backend only allows from CONFIRMADO
  },
  CONFIRMADO: {
    label: "Cliente presente",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    icon: <UserCheck className="h-5 w-5 text-blue-600" />,
    actionLabel: "Encaminhar para Profissional",
    actionColor: "bg-violet-600 hover:bg-violet-700",
    endpoint: "iniciar",
    canNoShow: true,
  },
  EM_ANDAMENTO: {
    label: "Em atendimento",
    color: "text-violet-700",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200",
    icon: <Users className="h-5 w-5 text-violet-600" />,
    actionLabel: "Concluir Atendimento",
    actionColor: "bg-emerald-600 hover:bg-emerald-700",
    endpoint: "concluir",
    canNoShow: false,
  },
  CONCLUIDO: {
    label: "Atendimento concluído",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
    canNoShow: false,
  },
  CANCELADO: {
    label: "Cancelado",
    color: "text-gray-500",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    icon: <X className="h-5 w-5 text-gray-400" />,
    canNoShow: false,
  },
  NAO_COMPARECEU: {
    label: "Não compareceu",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    icon: <UserX className="h-5 w-5 text-red-500" />,
    canNoShow: false,
  },
};

function normalizeStatus(raw: string): FlowStatus {
  const map: Record<string, FlowStatus> = {
    pending:     "PENDENTE",
    confirmed:   "CONFIRMADO",
    in_progress: "EM_ANDAMENTO",
    completed:   "CONCLUIDO",
    canceled:    "CANCELADO",
    no_show:     "NAO_COMPARECEU",
  };
  return (map[raw] ?? raw) as FlowStatus;
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

const FLOW_STEPS: FlowStatus[] = ["PENDENTE", "CONFIRMADO", "EM_ANDAMENTO", "CONCLUIDO"];

function FlowProgress({ status }: { status: FlowStatus }) {
  const idx = FLOW_STEPS.indexOf(status);
  if (idx === -1) return null;
  return (
    <div className="mt-3 flex items-center gap-1">
      {FLOW_STEPS.map((s, i) => (
        <div key={s} className="flex flex-1 items-center gap-1">
          <div
            className={`h-1.5 flex-1 rounded-full transition-all ${
              i <= idx ? "bg-violet-500" : "bg-gray-200"
            }`}
          />
          {i < FLOW_STEPS.length - 1 && (
            <ChevronRight
              className={`h-3 w-3 flex-shrink-0 ${
                i < idx ? "text-violet-400" : "text-gray-300"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── No-show confirm inline ───────────────────────────────────────────────────

function NoShowConfirm({
  clienteNome,
  onConfirm,
  onCancel,
  loading,
}: {
  clienteNome: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
      <p className="text-xs font-medium text-red-700">
        Confirmar: <strong>{clienteNome}</strong> não compareceu?
      </p>
      <div className="mt-2 flex gap-2">
        <button
          onClick={onCancel}
          disabled={loading}
          className="flex-1 rounded-lg border border-gray-300 bg-white py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-red-600 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserX className="h-3 w-3" />}
          Confirmar não-comparecimento
        </button>
      </div>
    </div>
  );
}

// ─── Appointment Card ─────────────────────────────────────────────────────────

function AppointmentCard({
  appt,
  onAction,
  onNoShow,
  acting,
  noShowActing,
  showingNoShowConfirm,
  onShowNoShowConfirm,
  onCancelNoShowConfirm,
}: {
  appt: AgendamentoBackend;
  onAction: (appt: AgendamentoBackend, endpoint: string) => void;
  onNoShow: (appt: AgendamentoBackend) => void;
  acting: boolean;
  noShowActing: boolean;
  showingNoShowConfirm: boolean;
  onShowNoShowConfirm: () => void;
  onCancelNoShowConfirm: () => void;
}) {
  const status = normalizeStatus(appt.status);
  const step = STEPS[status] ?? STEPS.PENDENTE;
  const showFlow = !["CANCELADO", "NAO_COMPARECEU"].includes(status);

  return (
    <div className={`rounded-xl border-2 bg-white shadow-sm overflow-hidden ${step.borderColor}`}>
      {/* Status bar */}
      <div className={`flex items-center gap-2 px-4 py-2 ${step.bgColor}`}>
        {step.icon}
        <span className={`text-xs font-semibold ${step.color}`}>{step.label}</span>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Time + client */}
        <div className="flex items-baseline gap-2">
          <span className="text-base font-bold text-gray-900">{toTime(appt.dataHora)}</span>
          <span className="font-semibold text-gray-800 truncate">{appt.clienteNome}</span>
        </div>

        {/* Services */}
        <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
          <Scissors className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
          <span className="truncate">{serviceNames(appt)}</span>
        </div>

        {/* Professional */}
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-400">
          <User className="h-3 w-3 flex-shrink-0" />
          <span>{appt.profissionalNome}</span>
        </div>

        {/* Progress bar */}
        {showFlow && <FlowProgress status={status} />}

        {/* Primary action button */}
        {step.actionLabel && step.endpoint && !showingNoShowConfirm && (
          <button
            onClick={() => onAction(appt, step.endpoint!)}
            disabled={acting || noShowActing}
            className={`mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50 ${step.actionColor}`}
          >
            {acting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {status === "PENDENTE"     && <UserCheck className="h-4 w-4" />}
                {status === "CONFIRMADO"   && <Users className="h-4 w-4" />}
                {status === "EM_ANDAMENTO" && <CheckCircle2 className="h-4 w-4" />}
                {step.actionLabel}
              </>
            )}
          </button>
        )}

        {/* "Não Compareceu" secondary button — only for CONFIRMADO */}
        {step.canNoShow && !showingNoShowConfirm && (
          <button
            onClick={onShowNoShowConfirm}
            disabled={acting || noShowActing}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <UserX className="h-4 w-4" />
            Não Compareceu
          </button>
        )}

        {/* No-show confirmation prompt */}
        {showingNoShowConfirm && (
          <NoShowConfirm
            clienteNome={appt.clienteNome}
            onConfirm={() => onNoShow(appt)}
            onCancel={onCancelNoShowConfirm}
            loading={noShowActing}
          />
        )}

        {/* Concluido hint */}
        {status === "CONCLUIDO" && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            <CreditCard className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Encaminhar para confirmação de pagamento</span>
          </div>
        )}

        {/* No-show result badge */}
        {status === "NAO_COMPARECEU" && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            <UserX className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Cliente marcado como não compareceu</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AtendimentoPage() {
  const router = useRouter();
  const today = todayStr();

  const [appointments, setAppointments] = useState<AgendamentoBackend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [actingId, setActingId] = useState<number | null>(null);
  const [noShowActingId, setNoShowActingId] = useState<number | null>(null);
  const [noShowConfirmId, setNoShowConfirmId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.get<{ content: AgendamentoBackend[] } | AgendamentoBackend[]>(
        `/agendamentos/salon/${SALON_ID}`,
        { size: 300, sort: "dataHora" }
      );
      const all = Array.isArray(res)
        ? res
        : (res as { content: AgendamentoBackend[] }).content ?? [];

      const todays = all
        .filter((a) => a.dataHora?.slice(0, 10) === today)
        .sort((a, b) => a.dataHora.localeCompare(b.dataHora));

      setAppointments(todays);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAction = async (appt: AgendamentoBackend, endpoint: string) => {
    setActingId(appt.id);
    try {
      await api.post(`/agendamentos/${appt.id}/${endpoint}`);
      const msgs: Record<string, string> = {
        confirmar: "Check-in realizado — cliente confirmado",
        iniciar:   "Cliente encaminhado para o profissional",
        concluir:  "Atendimento concluído — encaminhar para pagamento",
      };
      showToast(msgs[endpoint] ?? "Atualizado com sucesso");
      load();
    } catch {
      showToast("Erro ao atualizar atendimento", "error");
    } finally {
      setActingId(null);
    }
  };

  const handleNoShow = async (appt: AgendamentoBackend) => {
    setNoShowActingId(appt.id);
    try {
      await api.post(`/agendamentos/${appt.id}/no-show`);
      setNoShowConfirmId(null);
      showToast(`${appt.clienteNome} marcado como não compareceu`);
      load();
    } catch {
      showToast("Erro ao registrar não-comparecimento", "error");
    } finally {
      setNoShowActingId(null);
    }
  };

  const INACTIVE = ["CANCELADO", "canceled", "NAO_COMPARECEU", "no_show"];
  const active   = appointments.filter((a) => !INACTIVE.includes(a.status));
  const inactive = appointments.filter((a) => INACTIVE.includes(a.status));

  const todayLabel = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });

  const counts = {
    aguardando: active.filter((a) => normalizeStatus(a.status) === "PENDENTE").length,
    presente:   active.filter((a) => normalizeStatus(a.status) === "CONFIRMADO").length,
    emAtend:    active.filter((a) => normalizeStatus(a.status) === "EM_ANDAMENTO").length,
    concluido:  active.filter((a) => normalizeStatus(a.status) === "CONCLUIDO").length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-4 top-4 z-[100] rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
            toast.type === "success" ? "bg-violet-600" : "bg-red-600"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="border-b bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button
            onClick={() => router.back()}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-semibold text-gray-900">Fluxo de Atendimento</h1>
            <p className="text-xs capitalize text-gray-500">{todayLabel}</p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-4 space-y-4">
        {/* Stage summary */}
        {!loading && !error && (
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Aguardando", count: counts.aguardando, color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-100" },
              { label: "Presente",   count: counts.presente,   color: "text-blue-700",   bg: "bg-blue-50 border-blue-100" },
              { label: "Atendendo",  count: counts.emAtend,    color: "text-violet-700", bg: "bg-violet-50 border-violet-100" },
              { label: "Concluído",  count: counts.concluido,  color: "text-emerald-700",bg: "bg-emerald-50 border-emerald-100" },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl border p-3 text-center ${s.bg}`}>
                <p className={`text-xl font-bold ${s.color}`}>{s.count}</p>
                <p className={`mt-0.5 text-xs ${s.color} opacity-80`}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <p className="text-sm text-gray-500">Erro ao carregar atendimentos</p>
            <button onClick={load} className="text-sm text-violet-600 hover:underline">
              Tentar novamente
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && appointments.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
            <Users className="h-12 w-12" />
            <p className="text-sm">Nenhum atendimento agendado para hoje</p>
          </div>
        )}

        {/* Active appointments */}
        {!loading && !error && active.length > 0 && (
          <div className="space-y-3">
            {active.map((appt) => (
              <AppointmentCard
                key={appt.id}
                appt={appt}
                onAction={handleAction}
                onNoShow={handleNoShow}
                acting={actingId === appt.id}
                noShowActing={noShowActingId === appt.id}
                showingNoShowConfirm={noShowConfirmId === appt.id}
                onShowNoShowConfirm={() => setNoShowConfirmId(appt.id)}
                onCancelNoShowConfirm={() => setNoShowConfirmId(null)}
              />
            ))}
          </div>
        )}

        {/* Inactive (canceled / no-show) */}
        {!loading && !error && inactive.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Cancelados / Não compareceram
            </p>
            {inactive.map((appt) => (
              <AppointmentCard
                key={appt.id}
                appt={appt}
                onAction={handleAction}
                onNoShow={handleNoShow}
                acting={actingId === appt.id}
                noShowActing={noShowActingId === appt.id}
                showingNoShowConfirm={false}
                onShowNoShowConfirm={() => {}}
                onCancelNoShowConfirm={() => {}}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
