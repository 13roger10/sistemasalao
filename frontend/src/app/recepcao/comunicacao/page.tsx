"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  CheckCircle,
  Clock,
  XCircle,
  Bell,
  Send,
  X,
  Phone,
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
  profissionalNome: string;
  servicos: ServicoAgendado[];
  servicoNome?: string;
  dataHora: string;
  status: StatusAgendamento;
}

type MessageType = "confirmar" | "atraso" | "cancelamento" | "lembrete";

interface MessageAction {
  type: MessageType;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

const MESSAGE_ACTIONS: MessageAction[] = [
  {
    type: "confirmar",
    label: "Confirmar",
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    color: "text-emerald-700",
    bgColor: "bg-emerald-50 hover:bg-emerald-100",
    borderColor: "border-emerald-200",
  },
  {
    type: "lembrete",
    label: "Lembrete",
    icon: <Bell className="h-3.5 w-3.5" />,
    color: "text-violet-700",
    bgColor: "bg-violet-50 hover:bg-violet-100",
    borderColor: "border-violet-200",
  },
  {
    type: "atraso",
    label: "Atraso",
    icon: <Clock className="h-3.5 w-3.5" />,
    color: "text-amber-700",
    bgColor: "bg-amber-50 hover:bg-amber-100",
    borderColor: "border-amber-200",
  },
  {
    type: "cancelamento",
    label: "Cancelamento",
    icon: <XCircle className="h-3.5 w-3.5" />,
    color: "text-red-700",
    bgColor: "bg-red-50 hover:bg-red-100",
    borderColor: "border-red-200",
  },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateLabel(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.toDateString() === b.toDateString();

  if (sameDay(date, today)) return "Hoje";
  if (sameDay(date, tomorrow)) return "Amanhã";
  if (sameDay(date, yesterday)) return "Ontem";
  return date.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
  if (digits.startsWith("55") && digits.length >= 12) return `+${digits}`;
  return `+${digits}`;
}

function buildMessage(type: MessageType, appt: Appointment): string {
  const nome = appt.clienteNome?.split(" ")[0] ?? "cliente";
  const profissional = appt.profissionalNome;
  const servicos =
    appt.servicos?.map((s) => s.servicoNome).join(", ") ||
    appt.servicoNome ||
    "serviço";
  const data = formatDate(appt.dataHora);
  const hora = formatTime(appt.dataHora);

  switch (type) {
    case "confirmar":
      return `Olá ${nome}! Seu agendamento do dia ${data} às ${hora} com ${profissional} para ${servicos} está confirmado. ✅`;
    case "lembrete":
      return `Olá ${nome}! Lembramos que você tem um agendamento no dia ${data} às ${hora} com ${profissional} para ${servicos}. Estamos esperando por você! ✨`;
    case "atraso":
      return `Olá ${nome}! Informamos que o profissional ${profissional} está com um pequeno atraso. Em breve você será atendido(a). 🕐`;
    case "cancelamento":
      return `Olá ${nome}! Infelizmente precisamos cancelar seu agendamento do dia ${data} às ${hora}. Entre em contato para remarcar. 😔`;
  }
}

const STATUS_LABEL: Record<StatusAgendamento, string> = {
  PENDENTE: "Pendente",
  CONFIRMADO: "Confirmado",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
  NO_SHOW: "Não compareceu",
};

const STATUS_COLOR: Record<StatusAgendamento, string> = {
  PENDENTE: "bg-yellow-100 text-yellow-700",
  CONFIRMADO: "bg-blue-100 text-blue-700",
  EM_ANDAMENTO: "bg-violet-100 text-violet-700",
  CONCLUIDO: "bg-emerald-100 text-emerald-700",
  CANCELADO: "bg-red-100 text-red-700",
  NO_SHOW: "bg-gray-100 text-gray-600",
};

// ─── Send Modal ───────────────────────────────────────────────────────────────

interface SendModalProps {
  appt: Appointment;
  messageType: MessageType;
  onClose: () => void;
}

function SendModal({ appt, messageType, onClose }: SendModalProps) {
  const action = MESSAGE_ACTIONS.find((a) => a.type === messageType)!;
  const [telefone, setTelefone] = useState(
    appt.clienteTelefone ? normalizePhone(appt.clienteTelefone) : ""
  );
  const [mensagem, setMensagem] = useState(buildMessage(messageType, appt));
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<"ok" | "error" | null>(null);

  async function handleSend() {
    if (!telefone.trim() || !mensagem.trim()) return;
    setSending(true);
    try {
      await api.post("/whatsapp/messages/send", {
        telefone: telefone.trim(),
        mensagem: mensagem.trim(),
        agendamentoId: appt.id,
        salonId: Number(SALON_ID),
      });
      setResult("ok");
      setTimeout(onClose, 1500);
    } catch {
      setResult("error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <span className={`${action.color}`}>{action.icon}</span>
            <h2 className="font-semibold text-gray-900">
              Mensagem de {action.label}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {/* Client info */}
          <div className="rounded-lg bg-gray-50 px-4 py-3">
            <p className="font-medium text-gray-900">{appt.clienteNome}</p>
            <p className="text-xs text-gray-500">{formatTime(appt.dataHora)} · {appt.profissionalNome}</p>
          </div>

          {/* Phone */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">
              <Phone className="mb-0.5 mr-1 inline h-3.5 w-3.5" />
              Número WhatsApp
            </label>
            <input
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="+5511999999999"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200"
            />
          </div>

          {/* Message */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">
              <MessageCircle className="mb-0.5 mr-1 inline h-3.5 w-3.5" />
              Mensagem
            </label>
            <textarea
              rows={4}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200"
            />
          </div>

          {/* Result feedback */}
          {result === "ok" && (
            <p className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <CheckCircle className="h-4 w-4" /> Mensagem enviada com sucesso!
            </p>
          )}
          {result === "error" && (
            <p className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              <XCircle className="h-4 w-4" /> Falha ao enviar. Verifique o
              número e tente novamente.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t px-5 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !telefone.trim() || result === "ok"}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {sending ? (
              "Enviando..."
            ) : (
              <>
                <Send className="h-4 w-4" /> Enviar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Appointment Card ─────────────────────────────────────────────────────────

interface AppointmentCardProps {
  appt: Appointment;
  onAction: (appt: Appointment, type: MessageType) => void;
}

function AppointmentCard({ appt, onAction }: AppointmentCardProps) {
  const servicos =
    appt.servicos?.map((s) => s.servicoNome).join(", ") ||
    appt.servicoNome ||
    "—";

  const hasPhone = !!appt.clienteTelefone;

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">{appt.clienteNome}</p>
          <p className="text-xs text-gray-500">
            {formatTime(appt.dataHora)} · {appt.profissionalNome}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">{servicos}</p>
          {hasPhone ? (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
              <Phone className="h-3 w-3" />
              {appt.clienteTelefone}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-amber-600">Sem telefone cadastrado</p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[appt.status]}`}
        >
          {STATUS_LABEL[appt.status]}
        </span>
      </div>

      {/* Action buttons */}
      <div className="mt-3 flex flex-wrap gap-2">
        {MESSAGE_ACTIONS.map((action) => (
          <button
            key={action.type}
            onClick={() => onAction(appt, action.type)}
            disabled={!hasPhone}
            title={!hasPhone ? "Telefone não cadastrado" : undefined}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors
              ${action.bgColor} ${action.borderColor} ${action.color}
              disabled:cursor-not-allowed disabled:opacity-40`}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function ComunicacaoContent() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{
    appt: Appointment;
    type: MessageType;
  } | null>(null);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ content: Appointment[] } | Appointment[]>(
        `/agendamentos/salon/${SALON_ID}`,
        { params: { size: 300, sort: "dataHora" } }
      );
      const list = "content" in res.data ? res.data.content : res.data;
      const dateStr = toISODate(selectedDate);
      const filtered = list.filter(
        (a) =>
          a.dataHora.startsWith(dateStr) && a.status !== "CANCELADO" && a.status !== "NO_SHOW"
      );
      setAppointments(filtered);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  function shiftDate(days: number) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d);
  }

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
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-violet-600" />
            <h1 className="font-semibold text-gray-900">Comunicação</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {/* Date navigation */}
        <div className="mb-5 flex items-center justify-between rounded-xl border bg-white px-4 py-3 shadow-sm">
          <button
            onClick={() => shiftDate(-1)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="font-semibold text-gray-900">
              {formatDateLabel(selectedDate)}
            </p>
            <p className="text-xs text-gray-500">
              {selectedDate.toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
              })}
            </p>
          </div>
          <button
            onClick={() => shiftDate(1)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Appointments */}
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">
            Carregando...
          </div>
        ) : appointments.length === 0 ? (
          <div className="py-16 text-center">
            <MessageCircle className="mx-auto mb-3 h-10 w-10 text-gray-200" />
            <p className="text-sm text-gray-400">
              Nenhum agendamento para este dia.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-400">
              {appointments.length}{" "}
              {appointments.length === 1 ? "agendamento" : "agendamentos"}
            </p>
            {appointments.map((appt) => (
              <AppointmentCard
                key={appt.id}
                appt={appt}
                onAction={(a, type) => setModal({ appt: a, type })}
              />
            ))}
          </div>
        )}
      </main>

      {/* Send modal */}
      {modal && (
        <SendModal
          appt={modal.appt}
          messageType={modal.type}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

export default function ComunicacaoPage() {
  return (
    <ProtectedRoute requiredRole="receptionist">
      <ComunicacaoContent />
    </ProtectedRoute>
  );
}
