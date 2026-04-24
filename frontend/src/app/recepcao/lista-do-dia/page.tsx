"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  ArrowLeft,
  List,
  ArrowUp,
  ArrowDown,
  Star,
  RotateCcw,
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
  profissionalNome: string;
  servicos: ServicoAgendado[];
  servicoNome?: string;
  dataHora: string;
  status: StatusAgendamento;
}

interface Payment {
  agendamentoId: number;
  status: string;
}

interface Row extends Appointment {
  pago: boolean;
  priority: number; // lower = higher priority; default = index
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
  CANCELADO: "bg-gray-100 text-gray-500",
  NO_SHOW: "bg-red-100 text-red-600",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayLabel() {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

// ─── Payment badge ────────────────────────────────────────────────────────────

function PaymentBadge({ pago }: { pago: boolean }) {
  return pago ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
      🟢 Pago
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
      🔴 Pendente
    </span>
  );
}

// ─── Client row ───────────────────────────────────────────────────────────────

interface ClientRowProps {
  row: Row;
  index: number;
  total: number;
  isPrioritized: boolean;
  onMoveUp: (id: number) => void;
  onMoveDown: (id: number) => void;
  onTogglePriority: (id: number) => void;
}

function ClientRow({
  row,
  index,
  total,
  isPrioritized,
  onMoveUp,
  onMoveDown,
  onTogglePriority,
}: ClientRowProps) {
  const servicos =
    row.servicos?.map((s) => s.servicoNome).join(", ") ||
    row.servicoNome ||
    "—";

  const isCancelled = row.status === "CANCELADO" || row.status === "NO_SHOW";

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border bg-white p-4 shadow-sm transition-all ${
        isPrioritized ? "border-amber-300 ring-1 ring-amber-200" : ""
      } ${isCancelled ? "opacity-60" : ""}`}
    >
      {/* Priority position badge */}
      <div className="flex w-7 shrink-0 flex-col items-center">
        <span className="text-sm font-bold text-gray-400">{index + 1}</span>
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-gray-900">{row.clienteNome}</p>
          {isPrioritized && (
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          )}
          <PaymentBadge pago={row.pago} />
        </div>
        <p className="mt-0.5 text-xs text-gray-500">
          {formatTime(row.dataHora)} · {row.profissionalNome} · {servicos}
        </p>
      </div>

      {/* Status badge */}
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[row.status]}`}
      >
        {STATUS_LABEL[row.status]}
      </span>

      {/* Priority controls */}
      {!isCancelled && (
        <div className="flex shrink-0 flex-col gap-0.5">
          <button
            onClick={() => onTogglePriority(row.id)}
            title={isPrioritized ? "Remover prioridade" : "Marcar como prioritário"}
            className={`rounded p-1 transition-colors ${
              isPrioritized
                ? "bg-amber-100 text-amber-600 hover:bg-amber-200"
                : "text-gray-300 hover:bg-gray-100 hover:text-amber-500"
            }`}
          >
            <Star className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onMoveUp(row.id)}
            disabled={index === 0}
            className="rounded p-1 text-gray-300 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-20"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onMoveDown(row.id)}
            disabled={index === total - 1}
            className="rounded p-1 text-gray-300 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-20"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Summary cards ────────────────────────────────────────────────────────────

function Summary({ rows }: { rows: Row[] }) {
  const active = rows.filter(
    (r) => r.status !== "CANCELADO" && r.status !== "NO_SHOW"
  );
  const paid = active.filter((r) => r.pago).length;
  const pending = active.filter((r) => !r.pago).length;

  return (
    <div className="mb-5 grid grid-cols-3 gap-3">
      <div className="rounded-xl border bg-white p-3 text-center shadow-sm">
        <p className="text-xl font-bold text-gray-900">{active.length}</p>
        <p className="text-xs text-gray-500">Total</p>
      </div>
      <div className="rounded-xl border bg-white p-3 text-center shadow-sm">
        <p className="text-xl font-bold text-emerald-600">{paid}</p>
        <p className="text-xs text-gray-500">Pagos</p>
      </div>
      <div className="rounded-xl border bg-white p-3 text-center shadow-sm">
        <p className="text-xl font-bold text-red-500">{pending}</p>
        <p className="text-xs text-gray-500">Pendentes</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function ListaDoDialContent() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [prioritizedIds, setPrioritizedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const today = toISODate(new Date());

      const [apptRes, payRes] = await Promise.all([
        api.get<{ content: Appointment[] } | Appointment[]>(
          `/agendamentos/salon/${SALON_ID}`,
          { params: { size: 300, sort: "dataHora" } }
        ),
        api.get<{ content: Payment[] } | Payment[]>(
          `/pagamentos/salon/${SALON_ID}`,
          { params: { size: 300 } }
        ),
      ]);

      const appts = "content" in apptRes.data ? apptRes.data.content : apptRes.data;
      const pays = "content" in payRes.data ? payRes.data.content : payRes.data;

      const payMap = new Map<number, Payment>();
      pays.forEach((p) => payMap.set(p.agendamentoId, p));

      const todayAppts = appts
        .filter((a) => a.dataHora.startsWith(today))
        .map((a, i) => ({
          ...a,
          pago: payMap.get(a.id)?.status === "APROVADO",
          priority: i,
        }));

      setRows(todayAppts);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Move row up by swapping priorities
  function moveUp(id: number) {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === id);
      if (idx === 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }

  function moveDown(id: number) {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === id);
      if (idx === prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }

  function togglePriority(id: number) {
    setPrioritizedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // Move to top
        setRows((r) => {
          const idx = r.findIndex((row) => row.id === id);
          if (idx <= 0) return r;
          const copy = [...r];
          const [item] = copy.splice(idx, 1);
          copy.unshift(item);
          return copy;
        });
      }
      return next;
    });
  }

  function resetOrder() {
    setRows((prev) => [...prev].sort((a, b) => a.dataHora.localeCompare(b.dataHora)));
    setPrioritizedIds(new Set());
  }

  const active = rows.filter(
    (r) => r.status !== "CANCELADO" && r.status !== "NO_SHOW"
  );
  const cancelled = rows.filter(
    (r) => r.status === "CANCELADO" || r.status === "NO_SHOW"
  );

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
            <List className="h-5 w-5 text-violet-600" />
            <div>
              <h1 className="font-semibold text-gray-900">Lista do Dia</h1>
              <p className="text-xs capitalize text-gray-400">{todayLabel()}</p>
            </div>
          </div>
          <button
            onClick={resetOrder}
            title="Restaurar ordem original"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Resetar
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {loading ? (
          <div className="py-20 text-center text-sm text-gray-400">
            Carregando...
          </div>
        ) : rows.length === 0 ? (
          <div className="py-20 text-center">
            <List className="mx-auto mb-3 h-10 w-10 text-gray-200" />
            <p className="text-sm text-gray-400">Nenhum agendamento para hoje.</p>
          </div>
        ) : (
          <>
            <Summary rows={rows} />

            {/* Active list */}
            <div className="space-y-2">
              {active.map((row, i) => (
                <ClientRow
                  key={row.id}
                  row={row}
                  index={i}
                  total={active.length}
                  isPrioritized={prioritizedIds.has(row.id)}
                  onMoveUp={moveUp}
                  onMoveDown={moveDown}
                  onTogglePriority={togglePriority}
                />
              ))}
            </div>

            {/* Cancelled/no-show section */}
            {cancelled.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                  Cancelados / Não compareceu
                </p>
                <div className="space-y-2">
                  {cancelled.map((row, i) => (
                    <ClientRow
                      key={row.id}
                      row={row}
                      index={i}
                      total={cancelled.length}
                      isPrioritized={false}
                      onMoveUp={() => {}}
                      onMoveDown={() => {}}
                      onTogglePriority={() => {}}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function ListaDoDiaPage() {
  return (
    <ProtectedRoute requiredRole="receptionist">
      <ListaDoDialContent />
    </ProtectedRoute>
  );
}
