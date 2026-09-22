"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SalonLayout } from "@/components/layout/SalonLayout";
import { useSalonAuth, Can } from "@/contexts/SalonAuthContext";
import { appointmentService } from "@/services/salon/appointmentService";
import { commissionService } from "@/services/salon/commissionService";
import { reviewService } from "@/services/salon/reviewService";
import { dashboardService } from "@/services/salon/dashboardService";
import { api } from "@/services/salon/api";
import type { Appointment } from "@/types/salon";
import type { DashboardData } from "@/types/salon/dashboard";
import {
  Calendar,
  Users,
  DollarSign,
  Clock,
  TrendingUp,
  Star,
  AlertCircle,
  Scissors,
  Award,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  CheckCircle,
  XCircle,
  RefreshCw,
  Wallet,
  UserCheck,
  CreditCard,
  ScanLine,
  Timer,
  MessageCircle,
  List,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";

// ===== TIPOS =====
interface DailyRevenue {
  date: string;
  label: string;
  revenue: number;
  appointments: number;
}

interface AvailableSlot {
  professionalId: string;
  professionalName: string;
  slots: number;
  totalSlots: number;
}

interface NewClient {
  month: string;
  count: number;
  returning: number;
}

// ===== MOCK DATA =====
const generateRevenueData = (): DailyRevenue[] => {
  const today = new Date();
  const data: DailyRevenue[] = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    data.push({
      date: date.toISOString().split("T")[0],
      label: i === 0 ? "Hoje" : i === 1 ? "Ontem" : dayNames[date.getDay()],
      revenue: Math.floor(Math.random() * 2000) + 1500,
      appointments: Math.floor(Math.random() * 15) + 8,
    });
  }

  return data;
};

const availableSlots: AvailableSlot[] = [
  { professionalId: "1", professionalName: "Ana", slots: 3, totalSlots: 8 },
  { professionalId: "2", professionalName: "Carlos", slots: 5, totalSlots: 10 },
  { professionalId: "3", professionalName: "Juliana", slots: 2, totalSlots: 8 },
  { professionalId: "4", professionalName: "Roberto", slots: 6, totalSlots: 8 },
  { professionalId: "5", professionalName: "Fernanda", slots: 4, totalSlots: 6 },
];

const SERVICE_COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#6b7280", "#3b82f6", "#ef4444"];

const newClientsData: NewClient[] = [
  { month: "Jul", count: 28, returning: 45 },
  { month: "Ago", count: 35, returning: 52 },
  { month: "Set", count: 42, returning: 48 },
  { month: "Out", count: 38, returning: 55 },
  { month: "Nov", count: 48, returning: 62 },
  { month: "Dez", count: 55, returning: 70 },
];

// ===== COMPONENTES AUXILIARES =====
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg: string;
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
}

function StatCard({ title, value, subtitle, icon, iconBg, trend }: StatCardProps) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          {trend && (
            <div className={cn(
              "mt-2 flex items-center gap-1 text-sm font-medium",
              trend.isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            )}>
              {trend.isPositive ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )}
              {trend.value}% {trend.label}
            </div>
          )}
          {subtitle && !trend && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </div>
        <div className={cn("rounded-xl p-3", iconBg)}>
          {icon}
        </div>
      </div>
    </div>
  );
}

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

function ChartCard({ title, subtitle, children, action }: ChartCardProps) {
  return (
    <div className="rounded-xl border bg-white shadow-sm dark:border-gray-800 dark:bg-gray-800">
      <div className="flex items-center justify-between border-b p-4 dark:border-gray-700">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// Custom Tooltip para gráficos
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <p className="mb-2 font-medium text-gray-900 dark:text-white">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.name.includes("R$") || entry.name === "Faturamento"
              ? `R$ ${entry.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
              : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ===== DASHBOARD SIMPLIFICADO PARA PROFISSIONAL =====
function ProfessionalDashboard() {
  const { user } = useSalonAuth();
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [weekAppointments, setWeekAppointments] = useState<Appointment[]>([]);
  const [monthAppointmentsCount, setMonthAppointmentsCount] = useState(0);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [commissionToday, setCommissionToday] = useState(0);
  const [commissionTotal, setCommissionTotal] = useState(0);
  const [saldoAReceber, setSaldoAReceber] = useState(0);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [totalReviews, setTotalReviews] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.professionalId) return;
    setIsLoading(true);
    try {
      const [todayAppts, weekResp, commResp, reviewResp, paymResp] = await Promise.allSettled([
        appointmentService.getDailyAgenda(user.professionalId, new Date()),
        appointmentService.getByProfessional(user.professionalId, { page: 1, limit: 200 }),
        commissionService.listByProfessional(String(user.professionalId)),
        reviewService.listByProfessional(String(user.professionalId)),
        api.get<{ content?: { valorTotalComissoes: number; status: string }[] }>(
          `/pagamentos-profissional/profissional/${user.professionalId}`,
          { page: 0, size: 500 }
        ),
      ]);

      if (todayAppts.status === 'fulfilled') setTodayAppointments(todayAppts.value);

      if (weekResp.status === 'fulfilled') {
        const allAppts = weekResp.value.data || weekResp.value.items || [];
        const now = new Date();

        // Mês atual
        const monthAppts = allAppts.filter(a => {
          const d = new Date(a.date);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        setMonthAppointmentsCount(monthAppts.length);

        // Próximos agendamentos: futuros confirmados/pendentes, ordenados por data
        const upcoming = allAppts
          .filter(a => new Date(a.date) > now && ['confirmed', 'pending'].includes(a.status))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 8);
        setUpcomingAppointments(upcoming);

        // Semana atual
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        setWeekAppointments(allAppts.filter(a => {
          const d = new Date(a.date);
          return d >= weekStart && d <= weekEnd;
        }));
      }

      if (commResp.status === 'fulfilled') {
        const comms = commResp.value.data || commResp.value.items || [];
        const now = new Date();
        const todayStr = now.toDateString();

        const todayComms = comms.filter(c => new Date(c.appointmentDate).toDateString() === todayStr);
        setCommissionToday(todayComms.reduce((sum, c) => sum + (c.commissionValue || 0), 0));

        const monthComms = comms.filter(c => {
          const d = new Date(c.appointmentDate);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        setCommissionTotal(monthComms.reduce((sum, c) => sum + (c.commissionValue || 0), 0));

        // Saldo a receber: pending commissions not yet paid out
        const pendingComms = comms.filter(c => c.status === 'pending');
        const totalPendente = pendingComms.reduce((sum, c) => sum + (c.commissionValue || 0), 0);

        // Subtract payments already received (PAGO)
        let totalPago = 0;
        if (paymResp.status === 'fulfilled') {
          const raw = paymResp.value as unknown as { content?: { valorTotalComissoes: number; status: string }[] } | { valorTotalComissoes: number; status: string }[];
          const list = Array.isArray(raw) ? raw : ((raw as { content?: { valorTotalComissoes: number; status: string }[] }).content ?? []);
          totalPago = list
            .filter(p => p.status === 'PAGO')
            .reduce((sum, p) => sum + (p.valorTotalComissoes || 0), 0);
        }

        setSaldoAReceber(Math.max(0, totalPendente - totalPago));
      }

      if (reviewResp.status === 'fulfilled') {
        const reviews = reviewResp.value.data || reviewResp.value.items || [];
        if (reviews.length > 0) {
          const avg = reviews.reduce((sum, r) => sum + ((r as { rating?: number }).rating || 0), 0) / reviews.length;
          setAvgRating(Math.round(avg * 10) / 10);
          setTotalReviews(reviews.length);
        }
      }
    } catch (e) {
      console.error('Erro ao carregar dashboard do profissional:', e);
    } finally {
      setIsLoading(false);
    }
  }, [user?.professionalId]);

  useEffect(() => { load(); }, [load]);

  const today = new Date();
  const todayLabel = today.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  const statusLabel: Record<string, string> = {
    confirmed: 'Confirmado', pending: 'Pendente', in_progress: 'Em andamento',
    completed: 'Concluído', cancelled: 'Cancelado', no_show: 'Não compareceu',
  };
  const statusColors: Record<string, string> = {
    confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    in_progress: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    completed: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    cancelled: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
    no_show: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  };

  const completedToday = todayAppointments.filter(a => a.status === 'completed').length;
  const pendingToday = todayAppointments.filter(a => ['confirmed', 'pending', 'in_progress'].includes(a.status)).length;

  const upcomingToday = todayAppointments
    .filter(a => ['confirmed', 'pending', 'in_progress'].includes(a.status))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <SalonLayout pageTitle="Meu Dashboard" requiredRole={["PROFESSIONAL"]}>
      <div className="space-y-6">
        {/* Boas-vindas */}
        <div className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 p-6 text-white shadow-lg">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                Olá, {user?.name?.split(' ')[0] || 'Profissional'}!
              </h2>
              <p className="mt-1 text-violet-100 capitalize">{todayLabel}</p>
            </div>
            {isLoading ? (
              <RefreshCw className="h-6 w-6 animate-spin text-white/70" />
            ) : (
              <div className="flex items-center gap-4 rounded-lg bg-white/10 px-4 py-3 backdrop-blur-sm">
                <div className="text-center">
                  <p className="text-2xl font-bold">{todayAppointments.length}</p>
                  <p className="text-xs text-violet-200">Hoje</p>
                </div>
                <div className="h-10 w-px bg-white/20" />
                <div className="text-center">
                  <p className="text-2xl font-bold">{weekAppointments.length}</p>
                  <p className="text-xs text-violet-200">Esta semana</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Agendamentos Hoje</p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                  {isLoading ? '—' : todayAppointments.length}
                </p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {completedToday} concluídos · {pendingToday} pendentes
                </p>
              </div>
              <div className="rounded-xl bg-violet-100 p-3 dark:bg-violet-900/30">
                <Calendar className="h-6 w-6 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
          </div>

          {/* Total de Atendimentos no Mês */}
          <div className="rounded-xl border bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de Atendimentos</p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                  {isLoading ? '—' : monthAppointmentsCount}
                </p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {new Date().toLocaleDateString('pt-BR', { month: 'long' })} · {weekAppointments.length} esta semana
                </p>
              </div>
              <div className="rounded-xl bg-blue-100 p-3 dark:bg-blue-900/30">
                <Scissors className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          {/* Total Ganho Hoje */}
          <div className="rounded-xl border bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Ganho Hoje</p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                  {isLoading ? '—' : `R$ ${commissionToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                </p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">via comissões</p>
              </div>
              <div className="rounded-xl bg-emerald-100 p-3 dark:bg-emerald-900/30">
                <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </div>

          {/* Total Ganho no Mês */}
          <div className="rounded-xl border bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Ganho no Mês</p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                  {isLoading ? '—' : `R$ ${commissionTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                </p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {new Date().toLocaleDateString('pt-BR', { month: 'long' })}
                </p>
              </div>
              <div className="rounded-xl bg-green-100 p-3 dark:bg-green-900/30">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* Saldo a Receber */}
          <div className="rounded-xl border bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Saldo a Receber</p>
                <p className="mt-2 text-3xl font-bold text-violet-600 dark:text-violet-400">
                  {isLoading ? '—' : `R$ ${saldoAReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                </p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  comissões pendentes de pagamento
                </p>
              </div>
              <div className="rounded-xl bg-violet-100 p-3 dark:bg-violet-900/30">
                <Wallet className="h-6 w-6 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Avaliação Média</p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                  {isLoading ? '—' : avgRating !== null ? avgRating.toFixed(1) : 'N/A'}
                </p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {totalReviews > 0 ? `${totalReviews} avaliações` : 'sem avaliações'}
                </p>
              </div>
              <div className="rounded-xl bg-yellow-100 p-3 dark:bg-yellow-900/30">
                <Star className="h-6 w-6 text-yellow-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link href="/salon/appointments"
            className="flex flex-col items-center gap-2 rounded-xl border border-violet-100 bg-violet-50 p-4 text-center transition-colors hover:bg-violet-100 dark:border-violet-900/40 dark:bg-violet-900/20 dark:hover:bg-violet-900/30">
            <Calendar className="h-6 w-6 text-violet-600 dark:text-violet-400" />
            <span className="text-sm font-medium text-violet-700 dark:text-violet-300">Minha Agenda</span>
          </Link>
          <Link href="/salon/commission"
            className="flex flex-col items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 p-4 text-center transition-colors hover:bg-blue-100 dark:border-blue-900/40 dark:bg-blue-900/20 dark:hover:bg-blue-900/30">
            <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Comissões</span>
          </Link>
          <Link href="/salon/statement"
            className="flex flex-col items-center gap-2 rounded-xl border border-green-100 bg-green-50 p-4 text-center transition-colors hover:bg-green-100 dark:border-green-900/40 dark:bg-green-900/20 dark:hover:bg-green-900/30">
            <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-700 dark:text-green-300">Extrato</span>
          </Link>
          <Link href="/salon/receipts"
            className="flex flex-col items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 p-4 text-center transition-colors hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-900/20 dark:hover:bg-amber-900/30">
            <Wallet className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Recebimentos</span>
          </Link>
        </div>

        {/* Agenda do Dia */}
        <div className="rounded-xl border bg-white shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <div className="flex items-center justify-between border-b p-4 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-violet-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Agenda de Hoje</h3>
            </div>
            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
              {todayAppointments.length} agendamentos
            </span>
          </div>

          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-violet-500" />
            </div>
          ) : todayAppointments.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-gray-400 dark:text-gray-600">
              <div className="text-center">
                <Calendar className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum agendamento hoje</p>
              </div>
            </div>
          ) : (
            <div className="divide-y dark:divide-gray-700">
              {todayAppointments
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((appt) => {
                  const time = new Date(appt.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                  const service = appt.services?.[0]?.service?.name ?? appt.services?.[0]?.serviceId ?? '—';
                  const colorClass = statusColors[appt.status] ?? statusColors.pending;
                  return (
                    <div key={appt.id} className="flex items-center gap-4 p-4">
                      <div className="w-14 shrink-0 text-center">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{time}</span>
                      </div>
                      <div className="h-8 w-px shrink-0 bg-gray-200 dark:bg-gray-700" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-900 dark:text-white">
                          {appt.client?.name ?? 'Cliente'}
                        </p>
                        <p className="truncate text-sm text-gray-500 dark:text-gray-400">{service}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}>
                        {statusLabel[appt.status] ?? appt.status}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Próximos Agendamentos — sempre visível */}
        <div className="rounded-xl border bg-white shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <div className="flex items-center justify-between border-b p-4 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Próximos Agendamentos</h3>
            </div>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              {upcomingAppointments.length} confirmados
            </span>
          </div>

          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-violet-500" />
            </div>
          ) : upcomingAppointments.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-gray-400 dark:text-gray-600">
              <div className="text-center">
                <Clock className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum agendamento futuro confirmado</p>
              </div>
            </div>
          ) : (
            <div className="divide-y dark:divide-gray-700">
              {upcomingAppointments.map((appt) => {
                const apptDate = new Date(appt.date);
                const isToday = apptDate.toDateString() === new Date().toDateString();
                const isTomorrow = apptDate.toDateString() === (() => { const t = new Date(); t.setDate(t.getDate() + 1); return t.toDateString(); })();
                const dateLabel = isToday
                  ? 'Hoje'
                  : isTomorrow
                  ? 'Amanhã'
                  : apptDate.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
                const time = apptDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const service = appt.services?.[0]?.service?.name ?? '—';
                const colorClass = statusColors[appt.status] ?? statusColors.pending;
                return (
                  <div key={appt.id} className="flex items-center gap-4 p-4">
                    <div className="w-24 shrink-0">
                      <p className={`text-xs font-semibold capitalize ${isToday ? 'text-violet-600 dark:text-violet-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {dateLabel}
                      </p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{time}</p>
                    </div>
                    <div className="h-8 w-px shrink-0 bg-gray-200 dark:bg-gray-700" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-gray-900 dark:text-white">
                        {appt.client?.name ?? 'Cliente'}
                      </p>
                      <p className="truncate text-sm text-gray-500 dark:text-gray-400">{service}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}>
                      {statusLabel[appt.status] ?? appt.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </SalonLayout>
  );
}

// ===== DASHBOARD ADMIN/RECEPCIONIST =====
function AdminDashboard() {
  const { user } = useSalonAuth();
  const [revenueFilter, setRevenueFilter] = useState<"week" | "month">("week");

  // Dados reais de faturamento/comissao/ranking, vindos de /api/dashboard (backed by Pagamento real)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [todayData, setTodayData] = useState<DashboardData | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [mensal, diario] = await Promise.all([
          dashboardService.getMensal(),
          dashboardService.getDiario(),
        ]);
        if (!cancelled) {
          setDashboardData(mensal);
          setTodayData(diario);
        }
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        if (!cancelled) setIsLoadingDashboard(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Mock data with useMemo (usado apenas para o grafico de 7 dias, ainda sem endpoint diario granular)
  const revenueData = useMemo(() => generateRevenueData(), []);

  // Faturamento de hoje: dado real (Pagamento), com variacao vs ontem calculada no backend
  const todayRevenue = todayData?.faturamento.valorTotal ?? 0;
  const revenueTrend = todayData
    ? Math.round(todayData.faturamento.percentualVariacao) * (todayData.faturamento.crescimento ? 1 : -1)
    : 0;

  // Clientes novos no mes: dado real
  const thisMonthClients = dashboardData?.clientes.novosNoPeriodo ?? 0;

  // Avaliacao media do salao: media das avaliacoes reais dos profissionais no ranking
  const avaliacoesReais = (dashboardData?.rankingProfissionais ?? []).filter(p => p.avaliacaoMedia > 0);
  const avaliacaoMediaSalao = avaliacoesReais.length > 0
    ? avaliacoesReais.reduce((sum, p) => sum + p.avaliacaoMedia, 0) / avaliacoesReais.length
    : 0;

  const totalAvailableSlots = availableSlots.reduce((sum, p) => sum + p.slots, 0);
  const totalSlots = availableSlots.reduce((sum, p) => sum + p.totalSlots, 0);
  const occupancyRate = Math.round(((totalSlots - totalAvailableSlots) / totalSlots) * 100);

  const weeklyRevenue = revenueData.reduce((sum, day) => sum + day.revenue, 0);
  const weeklyAppointments = revenueData.reduce((sum, day) => sum + day.appointments, 0);

  // Serviços mais vendidos: dado real, com cores atribuídas por posição
  const servicosChartData = (dashboardData?.servicosMaisVendidos ?? []).map((servico, index) => ({
    id: servico.servicoId,
    name: servico.nome,
    percentage: servico.percentualTotal,
    revenue: servico.faturamento,
    color: SERVICE_COLORS[index % SERVICE_COLORS.length],
  }));

  // Ranking de profissionais: dado real, incluindo comissão acumulada
  const rankingChartData = dashboardData?.rankingProfissionais ?? [];

  const upcomingAppointments = [
    { id: 1, client: "João Silva", service: "Corte Masculino", time: "09:00", professional: "Carlos Barbeiro", status: "confirmed" },
    { id: 2, client: "Maria Santos", service: "Coloração", time: "10:30", professional: "Ana Cabeleireira", status: "pending" },
    { id: 3, client: "Pedro Oliveira", service: "Barba", time: "11:00", professional: "Carlos Barbeiro", status: "confirmed" },
    { id: 4, client: "Lucia Costa", service: "Corte + Escova", time: "14:00", professional: "Juliana Stylist", status: "confirmed" },
  ];

  const alerts = [
    { type: "warning", message: "3 clientes com aniversário esta semana", icon: Users },
    { type: "info", message: "Estoque de pomada modeladora baixo", icon: AlertCircle },
    { type: "success", message: "Meta semanal atingida: R$ 15.000", icon: Target },
    { type: "warning", message: "5 horários vagos hoje à tarde", icon: Clock },
  ];

  return (
    <SalonLayout pageTitle="Dashboard" requiredRole={["ADMIN"]}>
      <div className="space-y-6">
        {/* Welcome message */}
        <div className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 p-6 text-white shadow-lg">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                Olá, {user?.name?.split(" ")[0] || "Usuário"}!
              </h2>
              <p className="mt-1 text-violet-100">
                Confira o resumo do seu dia e acompanhe o desempenho do salão.
              </p>
            </div>
            <div className="flex items-center gap-4 rounded-lg bg-white/10 px-4 py-3 backdrop-blur-sm">
              <div className="text-center">
                <p className="text-2xl font-bold">{weeklyAppointments}</p>
                <p className="text-xs text-violet-200">Agendamentos</p>
              </div>
              <div className="h-10 w-px bg-white/20" />
              <div className="text-center">
                <p className="text-2xl font-bold">R$ {(weeklyRevenue / 1000).toFixed(1)}k</p>
                <p className="text-xs text-violet-200">Esta semana</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Faturamento Hoje */}
          <Can permission="finance.view">
            <StatCard
              title="Faturamento Hoje"
              value={`R$ ${todayRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
              icon={<DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />}
              iconBg="bg-green-100 dark:bg-green-900/30"
              trend={{
                value: Math.abs(revenueTrend),
                isPositive: revenueTrend >= 0,
                label: "vs ontem",
              }}
            />
          </Can>

          {/* Horários Vagos */}
          <StatCard
            title="Horários Vagos Hoje"
            value={totalAvailableSlots}
            icon={<Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />}
            iconBg="bg-orange-100 dark:bg-orange-900/30"
            subtitle={`${occupancyRate}% ocupação`}
          />

          {/* Clientes Novos */}
          <StatCard
            title="Clientes Novos (Mês)"
            value={thisMonthClients}
            icon={<Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />}
            iconBg="bg-blue-100 dark:bg-blue-900/30"
            subtitle={isLoadingDashboard ? "Carregando..." : "Cadastrados este mês"}
          />

          {/* Avaliação */}
          <StatCard
            title="Avaliação Média"
            value={avaliacaoMediaSalao > 0 ? avaliacaoMediaSalao.toFixed(1) : "—"}
            icon={<Star className="h-6 w-6 text-yellow-500" />}
            iconBg="bg-yellow-100 dark:bg-yellow-900/30"
            subtitle={avaliacoesReais.length > 0 ? `Média entre ${avaliacoesReais.length} profissionais` : "Sem avaliações no período"}
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Faturamento Semanal Chart */}
          <Can permission="finance.view">
            <ChartCard
              title="Faturamento Diário"
              subtitle="Últimos 7 dias"
              action={
                <select
                  value={revenueFilter}
                  onChange={(e) => setRevenueFilter(e.target.value as "week" | "month")}
                  className="rounded-lg border bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
                >
                  <option value="week">Semana</option>
                  <option value="month">Mês</option>
                </select>
              }
            >
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "#6b7280", fontSize: 12 }}
                      axisLine={{ stroke: "#e5e7eb" }}
                    />
                    <YAxis
                      tick={{ fill: "#6b7280", fontSize: 12 }}
                      axisLine={{ stroke: "#e5e7eb" }}
                      tickFormatter={(value) => `R$${(value / 1000).toFixed(1)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Faturamento"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </Can>

          {/* Serviços Mais Vendidos */}
          <ChartCard
            title="Serviços Mais Vendidos"
            subtitle="Distribuição por tipo de serviço"
          >
            {servicosChartData.length === 0 ? (
              <div className="flex h-72 items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                {isLoadingDashboard ? "Carregando..." : "Nenhum serviço vendido neste mês"}
              </div>
            ) : (
              <div className="flex h-72 items-center">
                <div className="w-1/2">
                  <ResponsiveContainer width="100%" height={250} minHeight={200}>
                    <PieChart>
                      <Pie
                        data={servicosChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="percentage"
                      >
                        {servicosChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name, props) => [`${value}%`, props.payload.name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-1/2 space-y-2 pl-4">
                  {servicosChartData.slice(0, 5).map((service) => (
                    <div key={service.id} className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: service.color }}
                      />
                      <span className="flex-1 text-sm text-gray-600 dark:text-gray-400">
                        {service.name}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {service.percentage.toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ChartCard>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Clientes Novos Chart */}
          <ChartCard
            title="Clientes Novos vs Recorrentes"
            subtitle="Últimos 6 meses"
          >
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                <BarChart data={newClientsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                    axisLine={{ stroke: "#e5e7eb" }}
                  />
                  <YAxis
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                    axisLine={{ stroke: "#e5e7eb" }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar
                    dataKey="count"
                    name="Novos"
                    fill="#8b5cf6"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="returning"
                    name="Recorrentes"
                    fill="#06b6d4"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Horários Vagos por Profissional */}
          <ChartCard
            title="Disponibilidade por Profissional"
            subtitle="Horários vagos hoje"
          >
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                <BarChart data={availableSlots} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                    axisLine={{ stroke: "#e5e7eb" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="professionalName"
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                    axisLine={{ stroke: "#e5e7eb" }}
                    width={80}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      `${value} horários`,
                      name === "slots" ? "Disponíveis" : "Ocupados"
                    ]}
                  />
                  <Legend />
                  <Bar
                    dataKey="slots"
                    name="Disponíveis"
                    fill="#10b981"
                    radius={[0, 4, 4, 0]}
                    stackId="stack"
                  />
                  <Bar
                    dataKey={(entry) => entry.totalSlots - entry.slots}
                    name="Ocupados"
                    fill="#f59e0b"
                    radius={[0, 4, 4, 0]}
                    stackId="stack"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* Ranking e Próximos Agendamentos */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Ranking Profissionais */}
          <Can permission="finance.view">
            <div className="lg:col-span-1 rounded-xl border bg-white shadow-sm dark:border-gray-800 dark:bg-gray-800">
              <div className="border-b p-4 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-yellow-500" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Ranking Profissionais
                  </h3>
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Por faturamento este mês
                </p>
              </div>
              <div className="divide-y dark:divide-gray-700">
                {rankingChartData.length === 0 && (
                  <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    {isLoadingDashboard ? "Carregando..." : "Nenhum atendimento faturado este mês"}
                  </div>
                )}
                {rankingChartData.map((professional, index) => (
                  <div key={professional.profissionalId} className="flex items-center gap-4 p-4">
                    <div className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                      index === 0 && "bg-yellow-100 text-yellow-700",
                      index === 1 && "bg-gray-100 text-gray-700",
                      index === 2 && "bg-orange-100 text-orange-700",
                      index > 2 && "bg-gray-50 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                    )}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {professional.nome}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <span>{professional.atendimentos} atend.</span>
                        {professional.avaliacaoMedia > 0 && (
                          <span className="text-yellow-500 flex items-center gap-0.5">
                            <Star className="h-3 w-3 fill-current" />
                            {professional.avaliacaoMedia.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {professional.faturamentoFormatado}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Comissão: {professional.comissaoTotalFormatada}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Can>

          {/* Próximos Agendamentos */}
          <div className="lg:col-span-2 rounded-xl border bg-white shadow-sm dark:border-gray-800 dark:bg-gray-800">
            <div className="border-b p-4 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-violet-500" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Próximos Agendamentos
                  </h3>
                </div>
                <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                  Hoje
                </span>
              </div>
            </div>
            <div className="divide-y dark:divide-gray-700">
              {upcomingAppointments.map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                      {appointment.client.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {appointment.client}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {appointment.service} - {appointment.professional}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {appointment.time}
                    </span>
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                      appointment.status === "confirmed"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                    )}>
                      {appointment.status === "confirmed" ? "Confirmado" : "Pendente"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t p-4 dark:border-gray-700">
              <a
                href="/salon/appointments"
                className="text-sm font-medium text-violet-600 hover:text-violet-500 dark:text-violet-400"
              >
                Ver todos os agendamentos
              </a>
            </div>
          </div>
        </div>

        {/* Alertas */}
        <div className="rounded-xl border bg-white shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <div className="border-b p-4 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Alertas e Lembretes
              </h3>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
            {alerts.map((alert, index) => {
              const Icon = alert.icon;
              return (
                <div
                  key={index}
                  className={cn(
                    "flex items-start gap-3 rounded-lg p-3",
                    alert.type === "warning" && "bg-yellow-50 dark:bg-yellow-900/20",
                    alert.type === "info" && "bg-blue-50 dark:bg-blue-900/20",
                    alert.type === "success" && "bg-green-50 dark:bg-green-900/20"
                  )}
                >
                  <Icon className={cn(
                    "h-5 w-5 flex-shrink-0 mt-0.5",
                    alert.type === "warning" && "text-yellow-600 dark:text-yellow-400",
                    alert.type === "info" && "text-blue-600 dark:text-blue-400",
                    alert.type === "success" && "text-green-600 dark:text-green-400"
                  )} />
                  <p className={cn(
                    "text-sm font-medium",
                    alert.type === "warning" && "text-yellow-800 dark:text-yellow-200",
                    alert.type === "info" && "text-blue-800 dark:text-blue-200",
                    alert.type === "success" && "text-green-800 dark:text-green-200"
                  )}>
                    {alert.message}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </SalonLayout>
  );
}

// ===== DASHBOARD RECEPCIONISTA =====
interface ReceptionAppointment {
  id: number;
  clienteNome: string;
  clienteTelefone: string;
  profissionalNome: string;
  servicos: string[];
  dataHora: string;
  status: string;
  statusDescricao: string;
  pagamentoStatus: string | null;
  pagamentoStatusDescricao: string | null;
  valorPago: number | null;
}

const STATUS_APPT: Record<string, { label: string; cls: string }> = {
  PENDENTE:     { label: 'Pendente',       cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
  CONFIRMADO:   { label: 'Confirmado',     cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  EM_ANDAMENTO: { label: 'Em atendimento', cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
  CONCLUIDO:    { label: 'Concluído',      cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
  CANCELADO:    { label: 'Cancelado',      cls: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' },
  NO_SHOW:      { label: 'Não compareceu', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
};

const STATUS_PAG: Record<string, { label: string; cls: string }> = {
  PAGO:    { label: 'Pago',     cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  PENDENTE:{ label: 'Pendente', cls: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' },
};

function ReceptionistDashboard() {
  const { user } = useSalonAuth();
  const [appointments, setAppointments] = useState<ReceptionAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const resp = await api.get<ReceptionAppointment[] | { data?: ReceptionAppointment[]; content?: ReceptionAppointment[] }>(
        `/recepcao/appointments?date=${today}&salonId=1`
      );
      const list = Array.isArray(resp)
        ? resp
        : (resp as { data?: ReceptionAppointment[]; content?: ReceptionAppointment[] }).data
          ?? (resp as { data?: ReceptionAppointment[]; content?: ReceptionAppointment[] }).content
          ?? [];
      setAppointments(list);
    } catch {
      setAppointments([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const todayLabel = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const totalHoje      = appointments.length;
  const confirmados    = appointments.filter(a => ['CONFIRMADO', 'EM_ANDAMENTO'].includes(a.status)).length;
  const emAndamento    = appointments.filter(a => a.status === 'EM_ANDAMENTO').length;
  const pagPendente    = appointments.filter(a => !a.pagamentoStatus || a.pagamentoStatus === 'PENDENTE').length;

  const quickActions = [
    { href: '/recepcao/checkin',               icon: ScanLine,       label: 'Check-in',         bg: 'bg-teal-50 border-teal-100 hover:bg-teal-100 dark:bg-teal-900/20 dark:border-teal-900/40',   text: 'text-teal-700 dark:text-teal-300',   iconCls: 'text-teal-600 dark:text-teal-400' },
    { href: '/recepcao/confirmacao-pagamento', icon: CreditCard,     label: 'Confirmar Pgto.',   bg: 'bg-green-50 border-green-100 hover:bg-green-100 dark:bg-green-900/20 dark:border-green-900/40', text: 'text-green-700 dark:text-green-300', iconCls: 'text-green-600 dark:text-green-400' },
    { href: '/recepcao/fila',                  icon: Timer,          label: 'Fila / Encaixe',   bg: 'bg-amber-50 border-amber-100 hover:bg-amber-100 dark:bg-amber-900/20 dark:border-amber-900/40', text: 'text-amber-700 dark:text-amber-300', iconCls: 'text-amber-600 dark:text-amber-400' },
    { href: '/recepcao/agenda',                icon: Calendar,       label: 'Agenda',            bg: 'bg-violet-50 border-violet-100 hover:bg-violet-100 dark:bg-violet-900/20 dark:border-violet-900/40', text: 'text-violet-700 dark:text-violet-300', iconCls: 'text-violet-600 dark:text-violet-400' },
    { href: '/recepcao/lista-do-dia',          icon: List,           label: 'Lista do Dia',      bg: 'bg-orange-50 border-orange-100 hover:bg-orange-100 dark:bg-orange-900/20 dark:border-orange-900/40', text: 'text-orange-700 dark:text-orange-300', iconCls: 'text-orange-600 dark:text-orange-400' },
    { href: '/recepcao/clientes',              icon: Users,          label: 'Clientes',           bg: 'bg-blue-50 border-blue-100 hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-900/40',   text: 'text-blue-700 dark:text-blue-300',   iconCls: 'text-blue-600 dark:text-blue-400' },
    { href: '/recepcao/atendimento',           icon: UserCheck,      label: 'Atendimento',       bg: 'bg-indigo-50 border-indigo-100 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-900/40', text: 'text-indigo-700 dark:text-indigo-300', iconCls: 'text-indigo-600 dark:text-indigo-400' },
    { href: '/recepcao/comunicacao',           icon: MessageCircle,  label: 'Comunicação',       bg: 'bg-pink-50 border-pink-100 hover:bg-pink-100 dark:bg-pink-900/20 dark:border-pink-900/40',   text: 'text-pink-700 dark:text-pink-300',   iconCls: 'text-pink-600 dark:text-pink-400' },
  ];

  return (
    <SalonLayout pageTitle="Recepção" requiredRole={["ADMIN", "RECEPCIONIST"]}>
      <div className="space-y-6">

        {/* Banner de boas-vindas */}
        <div className="rounded-xl bg-gradient-to-r from-teal-600 to-violet-600 p-6 text-white shadow-lg">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                Olá, {user?.name?.split(' ')[0] || 'Recepcionista'}!
              </h2>
              <p className="mt-1 capitalize text-teal-100">{todayLabel}</p>
            </div>
            {isLoading ? (
              <RefreshCw className="h-6 w-6 animate-spin text-white/70" />
            ) : (
              <div className="flex items-center gap-4 rounded-lg bg-white/10 px-4 py-3 backdrop-blur-sm">
                <div className="text-center">
                  <p className="text-2xl font-bold">{totalHoje}</p>
                  <p className="text-xs text-teal-200">Agendamentos</p>
                </div>
                <div className="h-10 w-px bg-white/20" />
                <div className="text-center">
                  <p className="text-2xl font-bold">{emAndamento}</p>
                  <p className="text-xs text-teal-200">Em atendimento</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Agendamentos Hoje"
            value={isLoading ? '—' : totalHoje}
            icon={<Calendar className="h-6 w-6 text-violet-600 dark:text-violet-400" />}
            iconBg="bg-violet-100 dark:bg-violet-900/30"
            subtitle="agenda do dia"
          />
          <StatCard
            title="Confirmados / Ativos"
            value={isLoading ? '—' : confirmados}
            icon={<UserCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />}
            iconBg="bg-blue-100 dark:bg-blue-900/30"
            subtitle={`${emAndamento} em atendimento`}
          />
          <StatCard
            title="Aguard. Pagamento"
            value={isLoading ? '—' : pagPendente}
            icon={<CreditCard className="h-6 w-6 text-orange-600 dark:text-orange-400" />}
            iconBg="bg-orange-100 dark:bg-orange-900/30"
            subtitle="pagamentos pendentes"
          />
          <StatCard
            title="Concluídos"
            value={isLoading ? '—' : appointments.filter(a => a.status === 'CONCLUIDO').length}
            icon={<CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />}
            iconBg="bg-green-100 dark:bg-green-900/30"
            subtitle="atendimentos finalizados"
          />
        </div>

        {/* Ações rápidas */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {quickActions.map(({ href, icon: Icon, label, bg, text, iconCls }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors',
                bg
              )}
            >
              <Icon className={cn('h-6 w-6', iconCls)} />
              <span className={cn('text-xs font-medium', text)}>{label}</span>
            </Link>
          ))}
        </div>

        {/* Lista de agendamentos do dia */}
        <div className="rounded-xl border bg-white shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <div className="flex items-center justify-between border-b p-4 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-violet-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Agendamentos de Hoje</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                {totalHoje} agendamentos
              </span>
              <button
                onClick={load}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-violet-500" />
            </div>
          ) : appointments.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-gray-400 dark:text-gray-600">
              <div className="text-center">
                <Calendar className="mx-auto mb-2 h-10 w-10 opacity-30" />
                <p className="text-sm">Nenhum agendamento para hoje</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Horário</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Profissional</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Serviço</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Pagamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {appointments
                    .slice()
                    .sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime())
                    .map(appt => {
                      const time = new Date(appt.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                      const apptStatus  = STATUS_APPT[appt.status]  ?? { label: appt.status, cls: 'bg-gray-100 text-gray-600' };
                      const pagStatus   = appt.pagamentoStatus ? STATUS_PAG[appt.pagamentoStatus] ?? { label: appt.pagamentoStatus, cls: 'bg-gray-100 text-gray-600' } : null;
                      return (
                        <tr key={appt.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="whitespace-nowrap px-4 py-3 font-bold text-gray-900 dark:text-white">
                            {time}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900 dark:text-white">{appt.clienteNome}</p>
                            {appt.clienteTelefone && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">{appt.clienteTelefone}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                            {appt.profissionalNome ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                            {appt.servicos?.join(', ') || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', apptStatus.cls)}>
                              {apptStatus.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {pagStatus ? (
                              <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', pagStatus.cls)}>
                                {pagStatus.label}
                              </span>
                            ) : (
                              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-400 dark:bg-gray-700 dark:text-gray-500">
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </SalonLayout>
  );
}

// ===== ROTEADOR DE DASHBOARD =====
// Cada role vê seu dashboard específico — sem redirecionamentos externos.
export default function SalonDashboardPage() {
  const { user, isLoading } = useSalonAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <RefreshCw className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (user?.role === 'PROFESSIONAL')  return <ProfessionalDashboard />;
  if (user?.role === 'RECEPCIONIST')  return <ReceptionistDashboard />;
  return <AdminDashboard />;
}
