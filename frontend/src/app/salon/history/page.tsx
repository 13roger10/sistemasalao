"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  History,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  User,
  Scissors,
  Clock,
  DollarSign,
  Calendar,
  CheckCircle,
} from "lucide-react";
import { SalonLayout } from "@/components/layout/SalonLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useSalonAuth } from "@/contexts/SalonAuthContext";
import { appointmentService } from "@/services/salon";
import { useRouter } from "next/navigation";
import type { Appointment } from "@/types/salon/appointment";

// ===== HELPERS =====
const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (d: Date) =>
  new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

const formatTime = (d: Date) =>
  new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m}min` : `${h}h`;
};

// ===== COMPONENTE PRINCIPAL =====
export default function HistoryPage() {
  const { user, isLoading: authLoading } = useSalonAuth();
  const router = useRouter();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [activePeriod, setActivePeriod] = useState<"day" | "week" | "month" | "all">("month");
  const [showFilters, setShowFilters] = useState(false);

  // Redireciona não-profissional
  useEffect(() => {
    if (!authLoading && user?.role !== "PROFESSIONAL") {
      router.replace("/salon/dashboard");
    }
  }, [authLoading, user, router]);

  // ===== CARGA =====
  const loadHistory = useCallback(async () => {
    if (!user?.professionalId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await appointmentService.getByProfessional(user.professionalId, {
        page: 1,
        limit: 200,
      });
      // Filtra apenas os concluídos
      const completed = (response.data ?? []).filter((a) => a.status === "completed");
      setAppointments(completed);
    } catch (err) {
      console.error("Erro ao carregar histórico:", err);
      setError("Não foi possível carregar o histórico de atendimentos.");
    } finally {
      setLoading(false);
    }
  }, [user?.professionalId]);

  useEffect(() => {
    if (!authLoading && user?.role === "PROFESSIONAL") {
      loadHistory();
    }
  }, [authLoading, user, loadHistory]);

  // ===== FILTRO POR PERÍODO =====
  const periodRange = useMemo(() => {
    const now = new Date();
    if (activePeriod === "day") {
      const s = new Date(now); s.setHours(0, 0, 0, 0);
      const e = new Date(now); e.setHours(23, 59, 59, 999);
      return { start: s, end: e };
    }
    if (activePeriod === "week") {
      const s = new Date(now); s.setDate(now.getDate() - now.getDay()); s.setHours(0, 0, 0, 0);
      const e = new Date(s); e.setDate(s.getDate() + 6); e.setHours(23, 59, 59, 999);
      return { start: s, end: e };
    }
    if (activePeriod === "month") {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      const e = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start: s, end: e };
    }
    return null;
  }, [activePeriod]);

  // ===== FILTROS APLICADOS =====
  const filtered = useMemo(() => {
    return appointments.filter((a) => {
      if (periodRange) {
        const d = new Date(a.date);
        if (d < periodRange.start || d > periodRange.end) return false;
      }

      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const clientName = (a.client?.name ?? "").toLowerCase();
        const serviceNames = (a.services ?? []).map((sv) => sv.name?.toLowerCase() ?? "").join(" ");
        if (!clientName.includes(s) && !serviceNames.includes(s)) return false;
      }

      return true;
    });
  }, [appointments, periodRange, searchTerm]);

  // ===== TOTAIS =====
  const totals = useMemo(() => ({
    count: filtered.length,
    revenue: filtered.reduce((s, a) => s + (a.finalPrice ?? a.totalPrice ?? 0), 0),
    duration: filtered.reduce((s, a) => s + (a.totalDurationMinutes ?? 0), 0),
    uniqueClients: new Set(filtered.map((a) => String(a.clientId))).size,
  }), [filtered]);

  // ===== LOADING =====
  if (authLoading || (loading && appointments.length === 0)) {
    return (
      <SalonLayout>
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </SalonLayout>
    );
  }

  return (
    <SalonLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Histórico de Atendimentos</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Clientes atendidos com serviços concluídos
            </p>
          </div>
          <Button variant="outline" onClick={loadHistory} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {/* Cards de resumo */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Atendimentos</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{totals.count}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Clientes únicos</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{totals.uniqueClients}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Horas trabalhadas</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{formatDuration(totals.duration)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Faturamento</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(totals.revenue)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar por cliente ou serviço..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              {(["day", "week", "month", "all"] as const).map((period) => {
                const labels = { day: "Hoje", week: "Esta Semana", month: "Este Mês", all: "Todos" };
                const active = activePeriod === period;
                return (
                  <button
                    key={period}
                    onClick={() => setActivePeriod(period)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-primary-600 text-white"
                        : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    }`}
                  >
                    {labels[period]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Erro */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Lista */}
        {filtered.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 py-16 dark:border-gray-600">
            <History className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-500 dark:text-gray-400">Nenhum atendimento encontrado</p>
            {activePeriod !== "all" && (
              <button
                onClick={() => setActivePeriod("all")}
                className="mt-2 text-sm text-primary-600 hover:underline dark:text-primary-400"
              >
                Ver todos os períodos
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50">
                  <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Cliente</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Serviço(s)</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Data</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Horário</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Duração</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((appt) => {
                    const serviceNames = (appt.services ?? [])
                      .map((s) => s.name)
                      .filter(Boolean)
                      .join(", ");
                    return (
                      <tr
                        key={appt.id}
                        className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                              <User className="h-4 w-4" />
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {appt.client?.name ?? "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                            <Scissors className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                            <span>{serviceNames || "—"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                            <Calendar className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                            {formatDate(appt.date)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          {formatTime(appt.date)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                            <Clock className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                            {formatDuration(appt.totalDurationMinutes ?? 0)}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                          {formatCurrency(appt.finalPrice ?? appt.totalPrice ?? 0)}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}

        {/* Rodapé */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {filtered.length} atendimento{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Total: {formatCurrency(totals.revenue)}
            </span>
          </div>
        )}
      </div>
    </SalonLayout>
  );
}
