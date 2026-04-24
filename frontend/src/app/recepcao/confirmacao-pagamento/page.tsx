"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/salon/api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft, Loader2, AlertCircle, RefreshCw,
  CheckCircle2, Clock, User, Scissors, CalendarCheck,
  X, Banknote, QrCode, CreditCard,
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
  valorCobrado?: number;
}

interface PagamentoBackend {
  id: number;
  agendamentoId: number;
  status: string;
  formaDescricao?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function toTime(iso: string): string {
  return iso.slice(11, 16);
}

function nowLabel(): string {
  return format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

function serviceNames(appt: AgendamentoBackend): string {
  if (appt.servicos?.length) {
    return appt.servicos.map((s) => s.servicoNome).filter(Boolean).join(" + ");
  }
  return appt.servicoNome ?? "—";
}

function isCanceled(status: string): boolean {
  return status === "CANCELADO" || status === "canceled";
}

function isActive(status: string): boolean {
  return !isCanceled(status) && status !== "NAO_COMPARECEU" && status !== "no_show";
}

// Eligible for payment registration: only CONCLUIDO or EM_ANDAMENTO
function canConfirm(status: string): boolean {
  return status === "CONCLUIDO" || status === "EM_ANDAMENTO" ||
    status === "completed" || status === "in_progress";
}

// ─── Forma options ────────────────────────────────────────────────────────────

const FORMAS = [
  { value: "DINHEIRO",       label: "Dinheiro",          icon: <Banknote className="h-5 w-5" /> },
  { value: "PIX",            label: "PIX",               icon: <QrCode className="h-5 w-5" /> },
  { value: "CARTAO_CREDITO", label: "Cartão de Crédito", icon: <CreditCard className="h-5 w-5" /> },
  { value: "CARTAO_DEBITO",  label: "Cartão de Débito",  icon: <CreditCard className="h-5 w-5" /> },
];

// ─── Confirmation Modal ───────────────────────────────────────────────────────

function ConfirmacaoModal({
  appt,
  onConfirm,
  onClose,
}: {
  appt: AgendamentoBackend;
  onConfirm: (agendamentoId: number, valor: number, forma: string) => Promise<void>;
  onClose: () => void;
}) {
  const [forma, setForma] = useState("");
  const [valor, setValor] = useState(
    appt.valorCobrado != null ? Number(appt.valorCobrado).toFixed(2) : ""
  );
  const [valorError, setValorError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const registradoEm = nowLabel();

  const handleSubmit = async () => {
    const num = parseFloat(valor.replace(",", "."));
    if (isNaN(num) || num <= 0) {
      setValorError("Informe um valor válido");
      return;
    }
    if (!forma) return;
    setSubmitting(true);
    try {
      await onConfirm(appt.id, num, forma);
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
            <h2 className="font-semibold text-gray-900">Confirmar Pagamento</h2>
            <p className="mt-0.5 text-xs text-gray-500">Verificação: status Pendente</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-100">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Appointment summary */}
        <div className="bg-gray-50 px-5 py-3 border-b">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold text-gray-900">{toTime(appt.dataHora)}</span>
            <span className="font-medium text-gray-800">{appt.clienteNome}</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
            <Scissors className="h-3 w-3 flex-shrink-0" />
            <span>{serviceNames(appt)}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-400">
            <User className="h-3 w-3 flex-shrink-0" />
            <span>{appt.profissionalNome}</span>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-5 p-5">
          {/* Data / hora do registro */}
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2.5 text-xs text-blue-700">
            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Registrado em: <strong>{registradoEm}</strong></span>
          </div>

          {/* Valor */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Valor pago <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm text-gray-500">R$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={valor}
                onChange={(e) => {
                  setValor(e.target.value);
                  setValorError("");
                }}
                className={`w-full rounded-lg border py-2 pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-emerald-500 ${
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
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className={forma === f.value ? "text-emerald-500" : "text-gray-400"}>
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
            className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !forma}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Confirmar Pagamento
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Appointment Row ──────────────────────────────────────────────────────────

function AppointmentRow({
  appt,
  paid,
  formaDescricao,
  onConfirm,
}: {
  appt: AgendamentoBackend;
  paid: boolean;
  formaDescricao?: string;
  onConfirm?: () => void;
}) {
  const canceled = isCanceled(appt.status);
  const eligible = !paid && !canceled && canConfirm(appt.status);

  return (
    <div
      className={`rounded-xl border bg-white shadow-sm transition-opacity ${
        canceled ? "border-gray-100 opacity-50" : "border-gray-200"
      }`}
    >
      <div className="flex items-start gap-4 p-4">
        {/* Status icon */}
        <div className="flex-shrink-0 pt-0.5">
          {paid ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
          ) : canceled ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
              <Clock className="h-5 w-5 text-gray-400" />
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
              <Clock className="h-5 w-5 text-orange-500" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold text-gray-900">{toTime(appt.dataHora)}</span>
            <span className="font-medium text-gray-800 truncate">{appt.clienteNome}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
            <Scissors className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{serviceNames(appt)}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-400">
            <User className="h-3 w-3 flex-shrink-0" />
            <span>{appt.profissionalNome}</span>
          </div>
        </div>

        {/* Right: status badge */}
        <div className="flex-shrink-0 text-right">
          {paid ? (
            <div>
              <span className="inline-block rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                Pago
              </span>
              {formaDescricao && (
                <p className="mt-0.5 text-xs text-gray-400">{formaDescricao}</p>
              )}
            </div>
          ) : canceled ? (
            <span className="inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
              Cancelado
            </span>
          ) : (
            <span className="inline-block rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-600">
              Pendente
            </span>
          )}
        </div>
      </div>

      {/* Confirm button — only for eligible pending appointments */}
      {eligible && onConfirm && (
        <div className="border-t border-gray-100 px-4 py-3">
          <button
            onClick={onConfirm}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 active:scale-[0.98] transition-transform"
          >
            <CheckCircle2 className="h-4 w-4" />
            Confirmar Pagamento
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConfirmacaoPagamentoPage() {
  const router = useRouter();
  const today = todayStr();

  const [appointments, setAppointments] = useState<AgendamentoBackend[]>([]);
  const [paymentMap, setPaymentMap] = useState<Map<number, PagamentoBackend>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<AgendamentoBackend | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
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

      const todayAppts = appts
        .filter((a) => a.dataHora?.slice(0, 10) === today)
        .sort((a, b) => a.dataHora.localeCompare(b.dataHora));

      setAppointments(todayAppts);
      setPaymentMap(map);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    load();
  }, [load]);

  const handleConfirmar = async (
    agendamentoId: number,
    valor: number,
    forma: string
  ) => {
    await api.post("/pagamentos", { agendamentoId, valor, forma });
    setConfirmTarget(null);
    showToast("Pagamento confirmado com sucesso");
    load();
  };

  const isPaid = (appt: AgendamentoBackend) =>
    paymentMap.get(appt.id)?.status === "APROVADO";

  const activeAppts = appointments.filter((a) => isActive(a.status));
  const paidCount = activeAppts.filter(isPaid).length;
  const pendingCount = activeAppts.length - paidCount;

  const pendingList = appointments.filter(
    (a) => isActive(a.status) && !isPaid(a)
  );
  const paidList = appointments.filter(isPaid);
  const inactiveList = appointments.filter((a) => !isActive(a.status));

  const todayLabel = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-4 top-4 z-[100] flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          {toast.type === "success" && <CheckCircle2 className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {/* Confirmation modal */}
      {confirmTarget && (
        <ConfirmacaoModal
          appt={confirmTarget}
          onConfirm={handleConfirmar}
          onClose={() => setConfirmTarget(null)}
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
            <h1 className="font-semibold text-gray-900">Confirmação de Pagamento</h1>
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
        {/* Summary */}
        {!loading && !error && (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-gray-900">{activeAppts.length}</p>
              <p className="mt-0.5 text-xs text-gray-500">Atendimentos</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-center">
              <p className="text-2xl font-bold text-emerald-700">{paidCount}</p>
              <p className="mt-0.5 text-xs text-emerald-600">Confirmados</p>
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
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <p className="text-sm text-gray-500">Erro ao carregar atendimentos</p>
            <button onClick={load} className="text-sm text-emerald-600 hover:underline">
              Tentar novamente
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && appointments.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
            <CalendarCheck className="h-12 w-12" />
            <p className="text-sm">Nenhum atendimento agendado para hoje</p>
          </div>
        )}

        {/* List */}
        {!loading && !error && appointments.length > 0 && (
          <div className="space-y-3">
            {/* Pending */}
            {pendingList.length > 0 && (
              <>
                <p className="text-xs font-medium uppercase tracking-wide text-orange-500">
                  Pendentes ({pendingList.length})
                </p>
                {pendingList.map((appt) => (
                  <AppointmentRow
                    key={appt.id}
                    appt={appt}
                    paid={false}
                    onConfirm={
                      canConfirm(appt.status)
                        ? () => setConfirmTarget(appt)
                        : undefined
                    }
                  />
                ))}
              </>
            )}

            {/* Confirmed */}
            {paidList.length > 0 && (
              <>
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
                  Confirmados ({paidList.length})
                </p>
                {paidList.map((appt) => (
                  <AppointmentRow
                    key={appt.id}
                    appt={appt}
                    paid={true}
                    formaDescricao={paymentMap.get(appt.id)?.formaDescricao}
                  />
                ))}
              </>
            )}

            {/* Inactive */}
            {inactiveList.length > 0 && (
              <>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Cancelados / Não compareceram
                </p>
                {inactiveList.map((appt) => (
                  <AppointmentRow
                    key={appt.id}
                    appt={appt}
                    paid={false}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
