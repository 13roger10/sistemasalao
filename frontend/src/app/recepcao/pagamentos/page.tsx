"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/salon/api";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Loader2, AlertCircle,
  CheckCircle2, Clock, User, Scissors, RefreshCw,
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
}

interface PagamentoBackend {
  id: number;
  agendamentoId: number;
  status: string;          // PENDENTE | APROVADO | RECUSADO | ESTORNADO
  statusDescricao: string;
  formaDescricao?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateKey(iso: string): string {
  return iso.slice(0, 10); // "YYYY-MM-DD"
}

function toTime(iso: string): string {
  return iso.slice(11, 16); // "HH:MM"
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

// ─── Status Badge ─────────────────────────────────────────────────────────────

function AppointmentStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:     { label: "Pendente",       cls: "bg-yellow-100 text-yellow-700" },
    confirmed:   { label: "Confirmado",     cls: "bg-green-100 text-green-700" },
    in_progress: { label: "Em andamento",   cls: "bg-blue-100 text-blue-700" },
    completed:   { label: "Concluído",      cls: "bg-gray-100 text-gray-600" },
    canceled:    { label: "Cancelado",      cls: "bg-red-100 text-red-600" },
    no_show:     { label: "Não compareceu", cls: "bg-orange-100 text-orange-700" },
    // Also handle backend enum names
    PENDENTE:      { label: "Pendente",       cls: "bg-yellow-100 text-yellow-700" },
    CONFIRMADO:    { label: "Confirmado",     cls: "bg-green-100 text-green-700" },
    EM_ANDAMENTO:  { label: "Em andamento",   cls: "bg-blue-100 text-blue-700" },
    CONCLUIDO:     { label: "Concluído",      cls: "bg-gray-100 text-gray-600" },
    CANCELADO:     { label: "Cancelado",      cls: "bg-red-100 text-red-600" },
    NAO_COMPARECEU:{ label: "Não compareceu", cls: "bg-orange-100 text-orange-700" },
  };
  const cfg = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function PaymentBadge({
  pago,
  cancelado,
}: {
  pago: boolean;
  cancelado: boolean;
}) {
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

  // Filter appointments for selected date (exclude canceled in counts)
  const dayAppts = appointments.filter(
    (a) => a.dataHora && toDateKey(a.dataHora) === selectedDate
  );

  const isCanceled = (a: AgendamentoBackend) =>
    a.status === "CANCELADO" || a.status === "canceled";

  const isPaid = (a: AgendamentoBackend): boolean => {
    const p = paymentMap.get(a.id);
    return p?.status === "APROVADO";
  };

  const active = dayAppts.filter((a) => !isCanceled(a));
  const paid = active.filter(isPaid).length;
  const pending = active.filter((a) => !isPaid(a)).length;

  return (
    <div className="min-h-screen bg-gray-50">
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
              <p className="text-2xl font-bold text-green-700">{paid}</p>
              <p className="mt-0.5 text-xs text-green-600">Pagos</p>
            </div>
            <div className="rounded-xl border border-orange-100 bg-orange-50 p-4 text-center">
              <p className="text-2xl font-bold text-orange-700">{pending}</p>
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
            <button
              onClick={load}
              className="text-sm text-violet-600 hover:underline"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && dayAppts.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
            <Clock className="h-10 w-10" />
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

                  {/* Professional + appointment status */}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-gray-500">{appt.profissionalNome}</span>
                    <AppointmentStatusBadge status={appt.status} />
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
