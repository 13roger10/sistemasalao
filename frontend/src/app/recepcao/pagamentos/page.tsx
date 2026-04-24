"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/salon/api";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Loader2, AlertCircle,
  CheckCircle2, Clock, User, Scissors, RefreshCw, X,
  Banknote, QrCode, CreditCard, BadgeDollarSign,
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
  statusDescricao: string;
  valorCobrado?: number;
}

interface PagamentoBackend {
  id: number;
  agendamentoId: number;
  status: string;
  statusDescricao: string;
  formaDescricao?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateKey(iso: string): string {
  return iso.slice(0, 10);
}

function toTime(iso: string): string {
  return iso.slice(11, 16);
}

function fmtDateLabel(dateStr: string): string {
  try {
    const d = parseISO(dateStr);
    return isValid(d) ? format(d, "EEEE, dd 'de' MMMM", { locale: ptBR }) : dateStr;
  } catch {
    return dateStr;
  }
}

function serviceNames(appt: AgendamentoBackend): string {
  if (appt.servicos?.length) {
    return appt.servicos.map((s) => s.servicoNome).filter(Boolean).join(" + ");
  }
  return appt.servicoNome ?? "—";
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function canRegisterPayment(appt: AgendamentoBackend): boolean {
  return appt.status === "CONCLUIDO" || appt.status === "EM_ANDAMENTO" ||
         appt.status === "completed" || appt.status === "in_progress";
}

// ─── Payment Form Options ─────────────────────────────────────────────────────

interface FormaOption {
  value: string;
  label: string;
  icon: React.ReactNode;
}

const FORMAS: FormaOption[] = [
  { value: "DINHEIRO",       label: "Dinheiro",         icon: <Banknote className="h-5 w-5" /> },
  { value: "PIX",            label: "PIX",              icon: <QrCode className="h-5 w-5" /> },
  { value: "CARTAO_CREDITO", label: "Cartão de Crédito", icon: <CreditCard className="h-5 w-5" /> },
  { value: "CARTAO_DEBITO",  label: "Cartão de Débito",  icon: <CreditCard className="h-5 w-5" /> },
];

// ─── Register Payment Modal ───────────────────────────────────────────────────

function RegisterPaymentModal({
  appointment,
  onConfirm,
  onClose,
}: {
  appointment: AgendamentoBackend;
  onConfirm: (agendamentoId: number, valor: number, forma: string) => Promise<void>;
  onClose: () => void;
}) {
  const [forma, setForma] = useState<string>("");
  const [valor, setValor] = useState<string>(
    appointment.valorCobrado != null
      ? String(appointment.valorCobrado.toFixed ? appointment.valorCobrado.toFixed(2) : appointment.valorCobrado)
      : ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [valorError, setValorError] = useState("");

  const handleValorChange = (v: string) => {
    setValor(v.replace(",", "."));
    setValorError("");
  };

  const handleSubmit = async () => {
    if (!forma) return;
    const num = parseFloat(valor);
    if (isNaN(num) || num <= 0) {
      setValorError("Informe um valor válido");
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm(appointment.id, num, forma);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center p-4">
      <div
        className="w-full max-w-md rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="font-semibold text-gray-900">Registrar Pagamento</h2>
            <p className="text-xs text-gray-500 mt-0.5">{appointment.clienteNome}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-100">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Service info */}
          <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
            <div className="flex items-center gap-1.5">
              <Scissors className="h-3.5 w-3.5 text-gray-400" />
              <span>{serviceNames(appointment)}</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              <span>{toTime(appointment.dataHora)}</span>
              <span>·</span>
              <span>{appointment.profissionalNome}</span>
            </div>
          </div>

          {/* Valor */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Valor <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm text-gray-500">R$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={valor}
                onChange={(e) => handleValorChange(e.target.value)}
                className={`w-full rounded-lg border py-2 pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-violet-500 ${
                  valorError ? "border-red-400" : "border-gray-200"
                }`}
              />
            </div>
            {valorError && <p className="mt-1 text-xs text-red-500">{valorError}</p>}
          </div>

          {/* Forma de pagamento */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Forma de pagamento <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {FORMAS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setForma(f.value)}
                  className={`flex items-center gap-2 rounded-lg border-2 px-3 py-3 text-sm font-medium transition-all ${
                    forma === f.value
                      ? "border-violet-500 bg-violet-50 text-violet-700"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className={forma === f.value ? "text-violet-500" : "text-gray-400"}>
                    {f.icon}
                  </span>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t px-5 py-4">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !forma}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirmar Pagamento
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function AppointmentStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:        { label: "Pendente",        cls: "bg-yellow-100 text-yellow-700" },
    confirmed:      { label: "Confirmado",      cls: "bg-green-100 text-green-700" },
    in_progress:    { label: "Em andamento",    cls: "bg-blue-100 text-blue-700" },
    completed:      { label: "Concluído",       cls: "bg-gray-100 text-gray-600" },
    canceled:       { label: "Cancelado",       cls: "bg-red-100 text-red-600" },
    no_show:        { label: "Não compareceu",  cls: "bg-orange-100 text-orange-700" },
    PENDENTE:       { label: "Pendente",        cls: "bg-yellow-100 text-yellow-700" },
    CONFIRMADO:     { label: "Confirmado",      cls: "bg-green-100 text-green-700" },
    EM_ANDAMENTO:   { label: "Em andamento",    cls: "bg-blue-100 text-blue-700" },
    CONCLUIDO:      { label: "Concluído",       cls: "bg-gray-100 text-gray-600" },
    CANCELADO:      { label: "Cancelado",       cls: "bg-red-100 text-red-600" },
    NAO_COMPARECEU: { label: "Não compareceu",  cls: "bg-orange-100 text-orange-700" },
  };
  const cfg = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function PaymentBadge({ pago, cancelado }: { pago: boolean; cancelado: boolean }) {
  if (cancelado) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Cancelado
      </span>
    );
  }
  if (pago) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Pago
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700">
      <Clock className="h-3.5 w-3.5" />
      Pendente
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RecepcaoPagamentosPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [appointments, setAppointments] = useState<AgendamentoBackend[]>([]);
  const [paymentMap, setPaymentMap] = useState<Map<number, PagamentoBackend>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [registerTarget, setRegisterTarget] = useState<AgendamentoBackend | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [apptRes, payRes] = await Promise.all([
        api.get<{ content: AgendamentoBackend[] } | AgendamentoBackend[]>(
          `/agendamentos/salon/${SALON_ID}`,
          { size: 300, sort: "dataHora" }
        ),
        api.get<{ content: PagamentoBackend[] } | PagamentoBackend[]>(
          `/pagamentos/salon/${SALON_ID}`,
          { size: 300, sort: "criadoEm" }
        ),
      ]);

      const appts = Array.isArray(apptRes)
        ? apptRes
        : (apptRes as { content: AgendamentoBackend[] }).content ?? [];

      const pays = Array.isArray(payRes)
        ? payRes
        : (payRes as { content: PagamentoBackend[] }).content ?? [];

      const map = new Map<number, PagamentoBackend>();
      pays.forEach((p) => map.set(p.agendamentoId, p));

      setAppointments(appts);
      setPaymentMap(map);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRegisterPayment = async (
    agendamentoId: number,
    valor: number,
    forma: string
  ) => {
    await api.post("/pagamentos", { agendamentoId, valor, forma });
    showToast("Pagamento registrado com sucesso");
    setRegisterTarget(null);
    load();
  };

  const dayAppts = appointments.filter(
    (a) => a.dataHora && toDateKey(a.dataHora) === selectedDate
  );

  const isCanceled = (a: AgendamentoBackend) =>
    a.status === "CANCELADO" || a.status === "canceled";

  const isPaid = (a: AgendamentoBackend): boolean =>
    paymentMap.get(a.id)?.status === "APROVADO";

  const active = dayAppts.filter((a) => !isCanceled(a));
  const paidCount = active.filter(isPaid).length;
  const pendingCount = active.filter((a) => !isPaid(a)).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-4 top-4 z-[100] rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Register modal */}
      {registerTarget && (
        <RegisterPaymentModal
          appointment={registerTarget}
          onConfirm={handleRegisterPayment}
          onClose={() => setRegisterTarget(null)}
        />
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
            <h1 className="font-semibold text-gray-900">Pagamentos</h1>
            <p className="text-xs text-gray-500 capitalize">{fmtDateLabel(selectedDate)}</p>
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
        {/* Date Navigation */}
        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <button
            onClick={() => setSelectedDate((d) => addDays(d, -1))}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-sm font-medium text-gray-900 outline-none"
          />
          <button
            onClick={() => setSelectedDate((d) => addDays(d, 1))}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Summary */}
        {!loading && !error && (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-gray-900">{active.length}</p>
              <p className="mt-0.5 text-xs text-gray-500">Total</p>
            </div>
            <div className="rounded-xl border border-green-100 bg-green-50 p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{paidCount}</p>
              <p className="mt-0.5 text-xs text-green-600">Pagos</p>
            </div>
            <div className="rounded-xl border border-orange-100 bg-orange-50 p-4 text-center">
              <p className="text-2xl font-bold text-orange-700">{pendingCount}</p>
              <p className="mt-0.5 text-xs text-orange-600">Pendentes</p>
            </div>
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
            <p className="text-sm text-gray-500">Erro ao carregar pagamentos</p>
            <button onClick={load} className="text-sm text-violet-600 hover:underline">
              Tentar novamente
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && dayAppts.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
            <BadgeDollarSign className="h-10 w-10" />
            <p className="text-sm">Nenhum agendamento neste dia</p>
          </div>
        )}

        {/* Appointment list */}
        {!loading && !error && dayAppts.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Agendamentos
            </p>
            {dayAppts.map((appt) => {
              const canceled = isCanceled(appt);
              const paid = isPaid(appt);
              const canRegister = !canceled && !paid && canRegisterPayment(appt);

              return (
                <div
                  key={appt.id}
                  className={`rounded-xl border bg-white p-4 shadow-sm ${
                    canceled ? "border-gray-100 opacity-60" : "border-gray-200"
                  }`}
                >
                  {/* Top row: time + payment badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <Clock className="h-4 w-4 flex-shrink-0 text-violet-500" />
                      {toTime(appt.dataHora)}
                    </div>
                    <PaymentBadge pago={paid} cancelado={canceled} />
                  </div>

                  {/* Client */}
                  <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-800">
                    <User className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                    <span className="font-medium">{appt.clienteNome}</span>
                  </div>

                  {/* Services */}
                  <div className="mt-1 flex items-start gap-1.5 text-sm text-gray-600">
                    <Scissors className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                    <span>{serviceNames(appt)}</span>
                  </div>

                  {/* Professional + status + register button */}
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-500">{appt.profissionalNome}</span>
                      <AppointmentStatusBadge status={appt.status} />
                    </div>
                    {canRegister && (
                      <button
                        onClick={() => setRegisterTarget(appt)}
                        className="flex-shrink-0 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                      >
                        Registrar Pagamento
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
