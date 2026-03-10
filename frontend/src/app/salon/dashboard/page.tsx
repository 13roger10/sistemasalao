"use client";

import { useState, useMemo } from "react";
import { SalonLayout } from "@/components/layout/SalonLayout";
import { useSalonAuth, Can } from "@/contexts/SalonAuthContext";
import {
  Calendar,
  Users,
  DollarSign,
  Clock,
  TrendingUp,
  TrendingDown,
  Star,
  AlertCircle,
  Scissors,
  Award,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
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

interface ProfessionalRanking {
  id: string;
  name: string;
  avatar?: string;
  revenue: number;
  appointments: number;
  rating: number;
  trend: "up" | "down" | "stable";
  trendValue: number;
}

interface ServiceRanking {
  id: string;
  name: string;
  count: number;
  revenue: number;
  percentage: number;
  color: string;
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

const professionalsRanking: ProfessionalRanking[] = [
  {
    id: "1",
    name: "Ana Cabeleireira",
    revenue: 8500,
    appointments: 45,
    rating: 4.9,
    trend: "up",
    trendValue: 15,
  },
  {
    id: "2",
    name: "Carlos Barbeiro",
    revenue: 7200,
    appointments: 52,
    rating: 4.8,
    trend: "up",
    trendValue: 8,
  },
  {
    id: "3",
    name: "Juliana Stylist",
    revenue: 6800,
    appointments: 38,
    rating: 4.7,
    trend: "stable",
    trendValue: 0,
  },
  {
    id: "4",
    name: "Roberto Manicure",
    revenue: 4500,
    appointments: 60,
    rating: 4.6,
    trend: "down",
    trendValue: 5,
  },
  {
    id: "5",
    name: "Fernanda Estética",
    revenue: 3800,
    appointments: 25,
    rating: 4.9,
    trend: "up",
    trendValue: 22,
  },
];

const servicesRanking: ServiceRanking[] = [
  { id: "1", name: "Corte Masculino", count: 156, revenue: 4680, percentage: 28, color: "#8b5cf6" },
  { id: "2", name: "Coloração", count: 89, revenue: 8010, percentage: 22, color: "#06b6d4" },
  { id: "3", name: "Corte Feminino", count: 78, revenue: 5460, percentage: 18, color: "#10b981" },
  { id: "4", name: "Escova", count: 65, revenue: 2600, percentage: 14, color: "#f59e0b" },
  { id: "5", name: "Manicure", count: 45, revenue: 1800, percentage: 10, color: "#ec4899" },
  { id: "6", name: "Outros", count: 32, revenue: 1920, percentage: 8, color: "#6b7280" },
];

const availableSlots: AvailableSlot[] = [
  { professionalId: "1", professionalName: "Ana", slots: 3, totalSlots: 8 },
  { professionalId: "2", professionalName: "Carlos", slots: 5, totalSlots: 10 },
  { professionalId: "3", professionalName: "Juliana", slots: 2, totalSlots: 8 },
  { professionalId: "4", professionalName: "Roberto", slots: 6, totalSlots: 8 },
  { professionalId: "5", professionalName: "Fernanda", slots: 4, totalSlots: 6 },
];

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

// ===== COMPONENTE PRINCIPAL =====
export default function SalonDashboardPage() {
  const { user } = useSalonAuth();
  const [revenueFilter, setRevenueFilter] = useState<"week" | "month">("week");

  // Mock data with useMemo
  const revenueData = useMemo(() => generateRevenueData(), []);

  // Calcular estatísticas
  const todayRevenue = revenueData[revenueData.length - 1]?.revenue || 0;
  const yesterdayRevenue = revenueData[revenueData.length - 2]?.revenue || 0;
  const revenueTrend = yesterdayRevenue > 0
    ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
    : 0;

  const totalNewClients = newClientsData.reduce((sum, item) => sum + item.count, 0);
  const lastMonthClients = newClientsData[newClientsData.length - 2]?.count || 0;
  const thisMonthClients = newClientsData[newClientsData.length - 1]?.count || 0;
  const clientsTrend = lastMonthClients > 0
    ? Math.round(((thisMonthClients - lastMonthClients) / lastMonthClients) * 100)
    : 0;

  const totalAvailableSlots = availableSlots.reduce((sum, p) => sum + p.slots, 0);
  const totalSlots = availableSlots.reduce((sum, p) => sum + p.totalSlots, 0);
  const occupancyRate = Math.round(((totalSlots - totalAvailableSlots) / totalSlots) * 100);

  const weeklyRevenue = revenueData.reduce((sum, day) => sum + day.revenue, 0);
  const weeklyAppointments = revenueData.reduce((sum, day) => sum + day.appointments, 0);

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
    <SalonLayout pageTitle="Dashboard" requiredPermissions="dashboard.view">
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
            trend={{
              value: Math.abs(clientsTrend),
              isPositive: clientsTrend >= 0,
              label: "vs mês anterior",
            }}
          />

          {/* Avaliação */}
          <StatCard
            title="Avaliação Média"
            value="4.8"
            icon={<Star className="h-6 w-6 text-yellow-500" />}
            iconBg="bg-yellow-100 dark:bg-yellow-900/30"
            subtitle="Baseado em 245 avaliações"
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
            <div className="flex h-72 items-center">
              <div className="w-1/2">
                <ResponsiveContainer width="100%" height={250} minHeight={200}>
                  <PieChart>
                    <Pie
                      data={servicesRanking}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="percentage"
                    >
                      {servicesRanking.map((entry, index) => (
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
                {servicesRanking.slice(0, 5).map((service) => (
                  <div key={service.id} className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: service.color }}
                    />
                    <span className="flex-1 text-sm text-gray-600 dark:text-gray-400">
                      {service.name}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {service.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
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
                {professionalsRanking.map((professional, index) => (
                  <div key={professional.id} className="flex items-center gap-4 p-4">
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
                        {professional.name}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <span>{professional.appointments} atend.</span>
                        <span className="text-yellow-500 flex items-center gap-0.5">
                          <Star className="h-3 w-3 fill-current" />
                          {professional.rating}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        R$ {(professional.revenue / 1000).toFixed(1)}k
                      </p>
                      <div className={cn(
                        "flex items-center justify-end gap-0.5 text-xs",
                        professional.trend === "up" && "text-green-600",
                        professional.trend === "down" && "text-red-600",
                        professional.trend === "stable" && "text-gray-500"
                      )}>
                        {professional.trend === "up" && <TrendingUp className="h-3 w-3" />}
                        {professional.trend === "down" && <TrendingDown className="h-3 w-3" />}
                        {professional.trend !== "stable" && `${professional.trendValue}%`}
                        {professional.trend === "stable" && "—"}
                      </div>
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
