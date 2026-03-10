"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Search,
  Calendar as CalendarIcon,
  Clock,
  User,
  Users,
  Scissors,
  ChevronLeft,
  ChevronRight,
  Phone,
  MessageCircle,
  Check,
  X,
  AlertTriangle,
  MoreVertical,
  Edit2,
  Trash2,
  List,
  RefreshCw,
  Copy,
  ExternalLink,
  Bell,
  UserPlus,
  Filter,
} from "lucide-react";
import { SalonLayout } from "@/components/layout/SalonLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { DataTable, ActionMenuItem, Column } from "@/components/ui/DataTable";
import { appointmentService } from "@/services/salon/appointmentService";
import { useSalonAuth } from "@/contexts/SalonAuthContext";
import type {
  Appointment,
  AppointmentCreateInput,
  AppointmentStatus,
  AppointmentSource,
  CalendarEvent,
  WaitlistEntry,
  WaitlistCreateInput,
  TimeSlot,
} from "@/types/salon";
import type { Professional } from "@/types/salon/professional";
import type { Client } from "@/types/salon/client";
import type { Service } from "@/types/salon/service";

// ===== TIPOS =====
type CalendarView = "day" | "week" | "month";

// ===== COMPONENTES AUXILIARES =====

// Badge de Status do Agendamento
const AppointmentStatusBadge = ({ status }: { status: AppointmentStatus }) => {
  const statusConfig: Record<AppointmentStatus, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
    pending: {
      label: "Pendente",
      bg: "bg-yellow-100 dark:bg-yellow-900/30",
      text: "text-yellow-700 dark:text-yellow-400",
      icon: <Clock className="h-3 w-3" />,
    },
    confirmed: {
      label: "Confirmado",
      bg: "bg-blue-100 dark:bg-blue-900/30",
      text: "text-blue-700 dark:text-blue-400",
      icon: <Check className="h-3 w-3" />,
    },
    in_progress: {
      label: "Em Atendimento",
      bg: "bg-violet-100 dark:bg-violet-900/30",
      text: "text-violet-700 dark:text-violet-400",
      icon: <Scissors className="h-3 w-3" />,
    },
    completed: {
      label: "Concluído",
      bg: "bg-green-100 dark:bg-green-900/30",
      text: "text-green-700 dark:text-green-400",
      icon: <Check className="h-3 w-3" />,
    },
    canceled: {
      label: "Cancelado",
      bg: "bg-red-100 dark:bg-red-900/30",
      text: "text-red-700 dark:text-red-400",
      icon: <X className="h-3 w-3" />,
    },
    no_show: {
      label: "Não Compareceu",
      bg: "bg-gray-100 dark:bg-gray-700",
      text: "text-gray-700 dark:text-gray-300",
      icon: <AlertTriangle className="h-3 w-3" />,
    },
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}>
      {config.icon}
      {config.label}
    </span>
  );
};

// Card de Estatísticas
const StatsCard = ({
  icon,
  label,
  value,
  color,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  trend?: { value: number; positive: boolean };
}) => (
  <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
    <div className="flex items-center gap-3">
      <div className={`rounded-lg p-2 ${color}`}>{icon}</div>
      <div className="flex-1">
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <div className="flex items-center gap-2">
          <p className="text-xl font-semibold text-gray-900 dark:text-white">{value}</p>
          {trend && (
            <span className={`text-xs font-medium ${trend.positive ? "text-green-500" : "text-red-500"}`}>
              {trend.positive ? "+" : ""}{trend.value}%
            </span>
          )}
        </div>
      </div>
    </div>
  </div>
);

// Tabs Component
const Tabs = ({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: { id: string; label: string; icon?: React.ReactNode; badge?: number }[];
  activeTab: string;
  onChange: (id: string) => void;
}) => (
  <div className="border-b border-gray-200 dark:border-gray-700">
    <nav className="-mb-px flex space-x-4">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === tab.id
              ? "border-violet-500 text-violet-600 dark:text-violet-400"
              : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          {tab.icon}
          {tab.label}
          {tab.badge !== undefined && tab.badge > 0 && (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-600 dark:bg-violet-900/50 dark:text-violet-400">
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </nav>
  </div>
);

// View Selector
const ViewSelector = ({
  view,
  onChange,
}: {
  view: CalendarView;
  onChange: (view: CalendarView) => void;
}) => (
  <div className="flex rounded-lg border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700">
    {[
      { id: "day" as CalendarView, label: "Dia" },
      { id: "week" as CalendarView, label: "Semana" },
      { id: "month" as CalendarView, label: "Mês" },
    ].map((v) => (
      <button
        key={v.id}
        onClick={() => onChange(v.id)}
        className={`px-4 py-2 text-sm font-medium transition-colors first:rounded-l-lg last:rounded-r-lg ${
          view === v.id
            ? "bg-violet-500 text-white"
            : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-600"
        }`}
      >
        {v.label}
      </button>
    ))}
  </div>
);

// Time Slot Component
const TimeSlotCell = ({
  time,
  appointments,
  professionals,
  onSlotClick,
  onAppointmentClick,
}: {
  time: string;
  appointments: Appointment[];
  professionals: Professional[];
  onSlotClick: (time: string, professionalId?: string) => void;
  onAppointmentClick: (appointment: Appointment) => void;
}) => {
  const getStatusColor = (status: AppointmentStatus) => {
    const colors: Record<AppointmentStatus, string> = {
      pending: "bg-yellow-200 border-yellow-400 dark:bg-yellow-900/50 dark:border-yellow-600",
      confirmed: "bg-blue-200 border-blue-400 dark:bg-blue-900/50 dark:border-blue-600",
      in_progress: "bg-violet-200 border-violet-400 dark:bg-violet-900/50 dark:border-violet-600",
      completed: "bg-green-200 border-green-400 dark:bg-green-900/50 dark:border-green-600",
      canceled: "bg-red-200 border-red-400 dark:bg-red-900/50 dark:border-red-600",
      no_show: "bg-gray-200 border-gray-400 dark:bg-gray-700 dark:border-gray-500",
    };
    return colors[status];
  };

  return (
    <div className="flex border-b border-gray-100 dark:border-gray-700 min-h-[60px]">
      {/* Time Column */}
      <div className="w-16 flex-shrink-0 border-r border-gray-100 dark:border-gray-700 py-2 pr-2 text-right text-xs text-gray-500 dark:text-gray-400">
        {time}
      </div>

      {/* Professional Columns */}
      <div className="flex flex-1">
        {professionals.length > 0 ? (
          professionals.map((prof) => {
            const profAppointments = appointments.filter(
              (a) => a.professionalId === prof.id && a.startTime === time
            );

            return (
              <div
                key={prof.id}
                className="flex-1 border-r border-gray-100 dark:border-gray-700 p-1 last:border-r-0"
                onClick={() => profAppointments.length === 0 && onSlotClick(time, prof.id)}
              >
                {profAppointments.map((appt) => (
                  <div
                    key={appt.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAppointmentClick(appt);
                    }}
                    className={`rounded border-l-4 p-1.5 text-xs cursor-pointer hover:opacity-80 ${getStatusColor(appt.status)}`}
                  >
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {appt.client?.name || "Cliente"}
                    </p>
                    <p className="text-gray-600 dark:text-gray-300 truncate">
                      {appt.services.map(s => s.service?.name).join(", ")}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400">
                      {appt.startTime} - {appt.endTime}
                    </p>
                  </div>
                ))}
                {profAppointments.length === 0 && (
                  <div className="h-full min-h-[40px] cursor-pointer rounded hover:bg-gray-50 dark:hover:bg-gray-800" />
                )}
              </div>
            );
          })
        ) : (
          <div
            className="flex-1 p-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
            onClick={() => onSlotClick(time)}
          >
            {appointments
              .filter((a) => a.startTime === time)
              .map((appt) => (
                <div
                  key={appt.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAppointmentClick(appt);
                  }}
                  className={`rounded border-l-4 p-1.5 text-xs cursor-pointer hover:opacity-80 mb-1 ${getStatusColor(appt.status)}`}
                >
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {appt.client?.name || "Cliente"} - {appt.professional?.name || "Profissional"}
                  </p>
                  <p className="text-gray-600 dark:text-gray-300 truncate">
                    {appt.services.map(s => s.service?.name).join(", ")}
                  </p>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ===== COMPONENTE PRINCIPAL =====
export default function AppointmentsPage() {
  const { user } = useSalonAuth();

  // Estados principais
  const [activeTab, setActiveTab] = useState<"agenda" | "list" | "waitlist">("agenda");
  const [calendarView, setCalendarView] = useState<CalendarView>("day");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>("");

  // Estados de dados
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);

  // Estados de loading
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingWaitlist, setIsLoadingWaitlist] = useState(false);

  // Estados de modais
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados do formulário de agendamento
  const [formData, setFormData] = useState<{
    clientId: string;
    professionalId: string;
    serviceIds: string[];
    date: string;
    startTime: string;
    clientNotes: string;
    internalNotes: string;
  }>({
    clientId: "",
    professionalId: "",
    serviceIds: [],
    date: new Date().toISOString().split("T")[0],
    startTime: "",
    clientNotes: "",
    internalNotes: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Estados do formulário de lista de espera
  const [waitlistFormData, setWaitlistFormData] = useState<{
    clientId: string;
    serviceIds: string[];
    preferredProfessionalId: string;
    preferredDate: string;
    preferredTimeStart: string;
    preferredTimeEnd: string;
    notes: string;
  }>({
    clientId: "",
    serviceIds: [],
    preferredProfessionalId: "",
    preferredDate: "",
    preferredTimeStart: "",
    preferredTimeEnd: "",
    notes: "",
  });

  // Estado para filtros da lista
  const [listFilters, setListFilters] = useState({
    search: "",
    status: "" as AppointmentStatus | "",
    professionalId: "",
  });

  // Horários do salão
  const WORKING_HOURS = useMemo(() => {
    const hours: string[] = [];
    for (let h = 8; h <= 20; h++) {
      hours.push(`${h.toString().padStart(2, "0")}:00`);
      hours.push(`${h.toString().padStart(2, "0")}:30`);
    }
    return hours;
  }, []);

  // Funções de formatação
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  // Navegação de data
  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (calendarView === "day") {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1));
    } else if (calendarView === "week") {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Carregar dados
  const loadAppointments = useCallback(async () => {
    setIsLoading(true);
    try {
      const startDate = new Date(currentDate);
      const endDate = new Date(currentDate);

      if (calendarView === "day") {
        endDate.setDate(endDate.getDate() + 1);
      } else if (calendarView === "week") {
        startDate.setDate(startDate.getDate() - startDate.getDay());
        endDate.setDate(startDate.getDate() + 7);
      } else {
        startDate.setDate(1);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0);
      }

      const events = await appointmentService.getCalendarEvents({
        startDate,
        endDate,
        professionalId: selectedProfessionalId || undefined,
      });

      // Mock data para desenvolvimento
      if (!events || events.length === 0) {
        const mockAppointments: Appointment[] = [
          {
            id: "1",
            clientId: "1",
            client: { id: "1", name: "João Silva", email: "joao@email.com", phone: "(11) 99999-1111", totalVisits: 5, totalSpent: 500, loyaltyPoints: 50, loyaltyLevel: "bronze", status: "active", acceptsMarketing: true, acceptsWhatsApp: true, acceptsEmail: true, averageTicket: 100, createdAt: new Date(), updatedAt: new Date() },
            professionalId: "1",
            professional: { id: "1", userId: "1", name: "Carlos", email: "carlos@salon.com", phone: "(11) 88888-1111", status: "active", serviceIds: ["1", "2"], specialties: ["Corte"], commissionType: "percentage", commissionValue: 50, schedule: { days: [] }, averageRating: 4.8, totalReviews: 50, totalAppointments: 200, totalRevenue: 10000, unitIds: ["1"], primaryUnitId: "1", acceptsOnlineBooking: true, showInPublicProfile: true, color: "#8B5CF6", createdAt: new Date(), updatedAt: new Date() },
            services: [{ serviceId: "1", service: { id: "1", name: "Corte Masculino", categoryId: "1", price: 50, durationMinutes: 30, status: "active", createdAt: new Date(), updatedAt: new Date() } as Service, price: 50, durationMinutes: 30 }],
            totalPrice: 50,
            totalDurationMinutes: 30,
            date: currentDate,
            startTime: "09:00",
            endTime: "09:30",
            status: "confirmed",
            source: "admin",
            isPaid: false,
            finalPrice: 50,
            commissionTotal: 25,
            commissionPaid: false,
            unitId: "1",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "2",
            clientId: "2",
            client: { id: "2", name: "Maria Souza", email: "maria@email.com", phone: "(11) 99999-2222", totalVisits: 3, totalSpent: 350, loyaltyPoints: 35, loyaltyLevel: "bronze", status: "active", acceptsMarketing: true, acceptsWhatsApp: true, acceptsEmail: true, averageTicket: 116, createdAt: new Date(), updatedAt: new Date() },
            professionalId: "2",
            professional: { id: "2", userId: "2", name: "Ana", email: "ana@salon.com", phone: "(11) 88888-2222", status: "active", serviceIds: ["1", "3"], specialties: ["Estética"], commissionType: "percentage", commissionValue: 40, schedule: { days: [] }, averageRating: 4.9, totalReviews: 80, totalAppointments: 300, totalRevenue: 15000, unitIds: ["1"], primaryUnitId: "1", acceptsOnlineBooking: true, showInPublicProfile: true, color: "#EC4899", createdAt: new Date(), updatedAt: new Date() },
            services: [{ serviceId: "3", service: { id: "3", name: "Limpeza de Pele", categoryId: "3", price: 120, durationMinutes: 60, status: "active", createdAt: new Date(), updatedAt: new Date() } as Service, price: 120, durationMinutes: 60 }],
            totalPrice: 120,
            totalDurationMinutes: 60,
            date: currentDate,
            startTime: "10:00",
            endTime: "11:00",
            status: "pending",
            source: "online",
            isPaid: false,
            finalPrice: 120,
            commissionTotal: 48,
            commissionPaid: false,
            unitId: "1",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "3",
            clientId: "3",
            client: { id: "3", name: "Pedro Santos", email: "pedro@email.com", phone: "(11) 99999-3333", totalVisits: 8, totalSpent: 800, loyaltyPoints: 80, loyaltyLevel: "silver", status: "active", acceptsMarketing: true, acceptsWhatsApp: true, acceptsEmail: true, averageTicket: 100, createdAt: new Date(), updatedAt: new Date() },
            professionalId: "1",
            professional: { id: "1", userId: "1", name: "Carlos", email: "carlos@salon.com", phone: "(11) 88888-1111", status: "active", serviceIds: ["1", "2"], specialties: ["Corte"], commissionType: "percentage", commissionValue: 50, schedule: { days: [] }, averageRating: 4.8, totalReviews: 50, totalAppointments: 200, totalRevenue: 10000, unitIds: ["1"], primaryUnitId: "1", acceptsOnlineBooking: true, showInPublicProfile: true, color: "#8B5CF6", createdAt: new Date(), updatedAt: new Date() },
            services: [
              { serviceId: "1", service: { id: "1", name: "Corte Masculino", categoryId: "1", price: 50, durationMinutes: 30, status: "active", createdAt: new Date(), updatedAt: new Date() } as Service, price: 50, durationMinutes: 30 },
              { serviceId: "2", service: { id: "2", name: "Barba", categoryId: "2", price: 35, durationMinutes: 25, status: "active", createdAt: new Date(), updatedAt: new Date() } as Service, price: 35, durationMinutes: 25 },
            ],
            totalPrice: 85,
            totalDurationMinutes: 55,
            date: currentDate,
            startTime: "14:00",
            endTime: "14:55",
            status: "in_progress",
            source: "phone",
            isPaid: false,
            finalPrice: 85,
            commissionTotal: 42.5,
            commissionPaid: false,
            unitId: "1",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];
        setAppointments(mockAppointments);
      } else {
        // Convert calendar events to appointments if needed
        setAppointments([]);
      }
    } catch (error) {
      console.error("Erro ao carregar agendamentos:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentDate, calendarView, selectedProfessionalId]);

  const loadProfessionals = useCallback(async () => {
    try {
      // Mock data para desenvolvimento
      setProfessionals([
        { id: "1", userId: "1", name: "Carlos", email: "carlos@salon.com", phone: "(11) 88888-1111", status: "active", serviceIds: ["1", "2"], specialties: ["Corte"], commissionType: "percentage", commissionValue: 50, schedule: { days: [] }, averageRating: 4.8, totalReviews: 50, totalAppointments: 200, totalRevenue: 10000, unitIds: ["1"], primaryUnitId: "1", acceptsOnlineBooking: true, showInPublicProfile: true, color: "#8B5CF6", createdAt: new Date(), updatedAt: new Date() },
        { id: "2", userId: "2", name: "Ana", email: "ana@salon.com", phone: "(11) 88888-2222", status: "active", serviceIds: ["1", "3"], specialties: ["Estética"], commissionType: "percentage", commissionValue: 40, schedule: { days: [] }, averageRating: 4.9, totalReviews: 80, totalAppointments: 300, totalRevenue: 15000, unitIds: ["1"], primaryUnitId: "1", acceptsOnlineBooking: true, showInPublicProfile: true, color: "#EC4899", createdAt: new Date(), updatedAt: new Date() },
        { id: "3", userId: "3", name: "Roberto", email: "roberto@salon.com", phone: "(11) 88888-3333", status: "active", serviceIds: ["1", "2"], specialties: ["Barba"], commissionType: "percentage", commissionValue: 50, schedule: { days: [] }, averageRating: 4.7, totalReviews: 30, totalAppointments: 150, totalRevenue: 8000, unitIds: ["1"], primaryUnitId: "1", acceptsOnlineBooking: true, showInPublicProfile: true, color: "#10B981", createdAt: new Date(), updatedAt: new Date() },
      ]);
    } catch (error) {
      console.error("Erro ao carregar profissionais:", error);
    }
  }, []);

  const loadClients = useCallback(async () => {
    try {
      // Mock data para desenvolvimento
      setClients([
        { id: "1", name: "João Silva", email: "joao@email.com", phone: "(11) 99999-1111", totalVisits: 5, totalSpent: 500, loyaltyPoints: 50, loyaltyLevel: "bronze", status: "active", acceptsMarketing: true, acceptsWhatsApp: true, acceptsEmail: true, averageTicket: 100, createdAt: new Date(), updatedAt: new Date() },
        { id: "2", name: "Maria Souza", email: "maria@email.com", phone: "(11) 99999-2222", totalVisits: 3, totalSpent: 350, loyaltyPoints: 35, loyaltyLevel: "bronze", status: "active", acceptsMarketing: true, acceptsWhatsApp: true, acceptsEmail: true, averageTicket: 116, createdAt: new Date(), updatedAt: new Date() },
        { id: "3", name: "Pedro Santos", email: "pedro@email.com", phone: "(11) 99999-3333", totalVisits: 8, totalSpent: 800, loyaltyPoints: 80, loyaltyLevel: "silver", status: "active", acceptsMarketing: true, acceptsWhatsApp: true, acceptsEmail: true, averageTicket: 100, createdAt: new Date(), updatedAt: new Date() },
      ]);
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
    }
  }, []);

  const loadServices = useCallback(async () => {
    try {
      // Mock data para desenvolvimento
      setServices([
        { id: "1", name: "Corte Masculino", description: "Corte tradicional", categoryId: "1", price: 50, durationMinutes: 30, commissionPercentage: 50, status: "active", showInOnlineBooking: true, requiresConfirmation: false, usesStock: false, loyaltyPointsEarned: 10, unitIds: [], totalBookings: 150, averageRating: 4.8, createdAt: new Date(), updatedAt: new Date() },
        { id: "2", name: "Barba", description: "Barba com navalha", categoryId: "2", price: 35, durationMinutes: 25, commissionPercentage: 50, status: "active", showInOnlineBooking: true, requiresConfirmation: false, usesStock: false, loyaltyPointsEarned: 8, unitIds: [], totalBookings: 120, averageRating: 4.9, createdAt: new Date(), updatedAt: new Date() },
        { id: "3", name: "Limpeza de Pele", description: "Limpeza facial profunda", categoryId: "3", price: 120, durationMinutes: 60, commissionPercentage: 40, status: "active", showInOnlineBooking: true, requiresConfirmation: true, usesStock: true, loyaltyPointsEarned: 20, unitIds: [], totalBookings: 45, averageRating: 4.7, createdAt: new Date(), updatedAt: new Date() },
        { id: "4", name: "Corte + Barba", description: "Combo completo", categoryId: "1", price: 75, promotionalPrice: 70, durationMinutes: 50, commissionPercentage: 50, status: "active", showInOnlineBooking: true, requiresConfirmation: false, usesStock: false, loyaltyPointsEarned: 15, unitIds: [], totalBookings: 200, averageRating: 4.9, createdAt: new Date(), updatedAt: new Date() },
      ] as Service[]);
    } catch (error) {
      console.error("Erro ao carregar serviços:", error);
    }
  }, []);

  const loadWaitlist = useCallback(async () => {
    setIsLoadingWaitlist(true);
    try {
      const data = await appointmentService.waitlist.list();
      setWaitlist(data);
    } catch (error) {
      console.error("Erro ao carregar lista de espera:", error);
      // Mock data
      setWaitlist([
        {
          id: "1",
          clientId: "1",
          client: { id: "1", name: "João Silva", email: "joao@email.com", phone: "(11) 99999-1111", totalVisits: 5, totalSpent: 500, loyaltyPoints: 50, loyaltyLevel: "bronze", status: "active", acceptsMarketing: true, acceptsWhatsApp: true, acceptsEmail: true, averageTicket: 100, createdAt: new Date(), updatedAt: new Date() },
          serviceIds: ["1"],
          preferredProfessionalId: "1",
          preferredDate: new Date(),
          preferredTimeRange: { start: "09:00", end: "12:00" },
          status: "waiting",
          unitId: "1",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
    } finally {
      setIsLoadingWaitlist(false);
    }
  }, []);

  // Verificar disponibilidade
  const checkAvailability = useCallback(async () => {
    if (!formData.professionalId || formData.serviceIds.length === 0 || !formData.date) {
      return;
    }

    try {
      const response = await appointmentService.checkAvailability({
        professionalId: formData.professionalId,
        serviceIds: formData.serviceIds,
        date: new Date(formData.date),
        unitId: "1",
      });

      if (response.professionals && response.professionals.length > 0) {
        setAvailableSlots(response.professionals[0].slots);
      }
    } catch (error) {
      console.error("Erro ao verificar disponibilidade:", error);
      // Mock available slots
      setAvailableSlots(
        WORKING_HOURS.map((time) => ({
          time,
          available: !appointments.some(
            (a) =>
              a.professionalId === formData.professionalId &&
              a.startTime === time &&
              a.status !== "canceled"
          ),
        }))
      );
    }
  }, [formData.professionalId, formData.serviceIds, formData.date, appointments, WORKING_HOURS]);

  // Efeitos
  useEffect(() => {
    loadProfessionals();
    loadClients();
    loadServices();
  }, [loadProfessionals, loadClients, loadServices]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  useEffect(() => {
    if (activeTab === "waitlist") {
      loadWaitlist();
    }
  }, [activeTab, loadWaitlist]);

  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  // Handlers
  const handleCreateAppointment = async () => {
    const errors: Record<string, string> = {};

    if (!formData.clientId) errors.clientId = "Selecione um cliente";
    if (!formData.professionalId) errors.professionalId = "Selecione um profissional";
    if (formData.serviceIds.length === 0) errors.serviceIds = "Selecione pelo menos um serviço";
    if (!formData.date) errors.date = "Selecione uma data";
    if (!formData.startTime) errors.startTime = "Selecione um horário";

    // Verificar se horário está ocupado
    const isSlotOccupied = appointments.some(
      (a) =>
        a.professionalId === formData.professionalId &&
        a.startTime === formData.startTime &&
        a.date.toISOString().split("T")[0] === formData.date &&
        a.status !== "canceled"
    );

    if (isSlotOccupied) {
      errors.startTime = "Este horário já está ocupado";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const input: AppointmentCreateInput = {
        clientId: formData.clientId,
        professionalId: formData.professionalId,
        serviceIds: formData.serviceIds,
        date: new Date(formData.date),
        startTime: formData.startTime,
        source: "admin",
        clientNotes: formData.clientNotes || undefined,
        internalNotes: formData.internalNotes || undefined,
        unitId: "1",
      };

      await appointmentService.create(input);
      setIsCreateModalOpen(false);
      resetForm();
      loadAppointments();
    } catch (error) {
      console.error("Erro ao criar agendamento:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (status: AppointmentStatus) => {
    if (!selectedAppointment) return;

    setIsSubmitting(true);
    try {
      switch (status) {
        case "confirmed":
          await appointmentService.confirm(selectedAppointment.id);
          break;
        case "in_progress":
          await appointmentService.start(selectedAppointment.id);
          break;
        case "completed":
          await appointmentService.complete(selectedAppointment.id);
          break;
        case "no_show":
          await appointmentService.noShow(selectedAppointment.id);
          break;
        default:
          await appointmentService.update(selectedAppointment.id, { status });
      }
      setIsStatusModalOpen(false);
      loadAppointments();
    } catch (error) {
      console.error("Erro ao alterar status:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelAppointment = async (reason?: string) => {
    if (!selectedAppointment) return;

    setIsSubmitting(true);
    try {
      await appointmentService.cancel(selectedAppointment.id, reason);
      setIsCancelModalOpen(false);
      setSelectedAppointment(null);
      loadAppointments();
    } catch (error) {
      console.error("Erro ao cancelar agendamento:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendWhatsAppConfirmation = async (appointment: Appointment) => {
    const client = appointment.client;
    if (!client?.phone) return;

    const message = encodeURIComponent(
      `Olá ${client.name}! Confirmando seu agendamento:\n\n` +
      `📅 Data: ${new Date(appointment.date).toLocaleDateString("pt-BR")}\n` +
      `⏰ Horário: ${appointment.startTime}\n` +
      `💇 Serviço: ${appointment.services.map(s => s.service?.name).join(", ")}\n` +
      `👤 Profissional: ${appointment.professional?.name}\n\n` +
      `Por favor, confirme respondendo esta mensagem.`
    );

    const phone = client.phone.replace(/\D/g, "");
    window.open(`https://wa.me/55${phone}?text=${message}`, "_blank");
  };

  const handleAddToWaitlist = async () => {
    if (!waitlistFormData.clientId || waitlistFormData.serviceIds.length === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const input: WaitlistCreateInput = {
        clientId: waitlistFormData.clientId,
        serviceIds: waitlistFormData.serviceIds,
        preferredProfessionalId: waitlistFormData.preferredProfessionalId || undefined,
        preferredDate: waitlistFormData.preferredDate ? new Date(waitlistFormData.preferredDate) : undefined,
        preferredTimeRange: waitlistFormData.preferredTimeStart && waitlistFormData.preferredTimeEnd
          ? { start: waitlistFormData.preferredTimeStart, end: waitlistFormData.preferredTimeEnd }
          : undefined,
        notes: waitlistFormData.notes || undefined,
        unitId: "1",
      };

      await appointmentService.waitlist.add(input);
      setIsWaitlistModalOpen(false);
      resetWaitlistForm();
      loadWaitlist();
    } catch (error) {
      console.error("Erro ao adicionar à lista de espera:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveFromWaitlist = async (id: string) => {
    try {
      await appointmentService.waitlist.remove(id);
      loadWaitlist();
    } catch (error) {
      console.error("Erro ao remover da lista de espera:", error);
    }
  };

  const handleSlotClick = (time: string, professionalId?: string) => {
    setFormData({
      ...formData,
      date: currentDate.toISOString().split("T")[0],
      startTime: time,
      professionalId: professionalId || "",
    });
    setIsCreateModalOpen(true);
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsViewModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      clientId: "",
      professionalId: "",
      serviceIds: [],
      date: new Date().toISOString().split("T")[0],
      startTime: "",
      clientNotes: "",
      internalNotes: "",
    });
    setFormErrors({});
    setAvailableSlots([]);
  };

  const resetWaitlistForm = () => {
    setWaitlistFormData({
      clientId: "",
      serviceIds: [],
      preferredProfessionalId: "",
      preferredDate: "",
      preferredTimeStart: "",
      preferredTimeEnd: "",
      notes: "",
    });
  };

  // Calcular totais dos serviços selecionados
  const selectedServicesTotal = useMemo(() => {
    const selectedServs = services.filter((s) => formData.serviceIds.includes(s.id));
    return {
      price: selectedServs.reduce((acc, s) => acc + (s.promotionalPrice || s.price), 0),
      duration: selectedServs.reduce((acc, s) => acc + s.durationMinutes, 0),
    };
  }, [formData.serviceIds, services]);

  // Calcular estatísticas do dia
  const todayStats = useMemo(() => {
    const today = new Date();
    const todayAppointments = appointments.filter(
      (a) => new Date(a.date).toDateString() === today.toDateString()
    );

    return {
      total: todayAppointments.length,
      confirmed: todayAppointments.filter((a) => a.status === "confirmed").length,
      pending: todayAppointments.filter((a) => a.status === "pending").length,
      completed: todayAppointments.filter((a) => a.status === "completed").length,
      revenue: todayAppointments
        .filter((a) => a.status === "completed")
        .reduce((acc, a) => acc + a.finalPrice, 0),
    };
  }, [appointments]);

  // Link público do salão
  const publicLink = typeof window !== "undefined"
    ? `${window.location.origin}/book/salon-id`
    : "";

  // Filtrar profissionais para o calendário
  const displayProfessionals = useMemo(() => {
    if (selectedProfessionalId) {
      return professionals.filter((p) => p.id === selectedProfessionalId);
    }
    return professionals;
  }, [professionals, selectedProfessionalId]);

  // Colunas da tabela de lista
  const appointmentColumns: Column<Appointment>[] = [
    {
      key: "client",
      header: "Cliente",
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-600 dark:bg-violet-900/50 dark:text-violet-400">
            {item.client?.name?.charAt(0).toUpperCase() || "C"}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{item.client?.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{item.client?.phone}</p>
          </div>
        </div>
      ),
    },
    {
      key: "datetime",
      header: "Data/Hora",
      render: (item) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">
            {new Date(item.date).toLocaleDateString("pt-BR")}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {item.startTime} - {item.endTime}
          </p>
        </div>
      ),
    },
    {
      key: "professional",
      header: "Profissional",
      render: (item) => (
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: item.professional?.color || "#8B5CF6" }}
          />
          <span className="text-gray-900 dark:text-white">{item.professional?.name}</span>
        </div>
      ),
    },
    {
      key: "services",
      header: "Serviços",
      render: (item) => (
        <div className="max-w-[200px]">
          <p className="text-gray-900 dark:text-white truncate">
            {item.services.map((s) => s.service?.name).join(", ")}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {formatDuration(item.totalDurationMinutes)}
          </p>
        </div>
      ),
    },
    {
      key: "price",
      header: "Valor",
      render: (item) => (
        <span className="font-semibold text-gray-900 dark:text-white">
          {formatCurrency(item.finalPrice)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => <AppointmentStatusBadge status={item.status} />,
    },
  ];

  // Colunas da tabela de lista de espera
  const waitlistColumns: Column<WaitlistEntry>[] = [
    {
      key: "client",
      header: "Cliente",
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-600 dark:bg-violet-900/50 dark:text-violet-400">
            {item.client?.name?.charAt(0).toUpperCase() || "C"}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{item.client?.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{item.client?.phone}</p>
          </div>
        </div>
      ),
    },
    {
      key: "services",
      header: "Serviços",
      render: (item) => (
        <span className="text-gray-900 dark:text-white">
          {item.serviceIds.map((id) => services.find((s) => s.id === id)?.name).join(", ") || "-"}
        </span>
      ),
    },
    {
      key: "preferredDate",
      header: "Data Preferida",
      render: (item) => (
        <span className="text-gray-900 dark:text-white">
          {item.preferredDate
            ? new Date(item.preferredDate).toLocaleDateString("pt-BR")
            : "Qualquer dia"}
        </span>
      ),
    },
    {
      key: "preferredTime",
      header: "Horário Preferido",
      render: (item) => (
        <span className="text-gray-900 dark:text-white">
          {item.preferredTimeRange
            ? `${item.preferredTimeRange.start} - ${item.preferredTimeRange.end}`
            : "Qualquer horário"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => {
        const statusConfig = {
          waiting: { label: "Aguardando", bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400" },
          notified: { label: "Notificado", bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400" },
          booked: { label: "Agendado", bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400" },
          expired: { label: "Expirado", bg: "bg-gray-100 dark:bg-gray-700", text: "text-gray-700 dark:text-gray-300" },
        };
        const config = statusConfig[item.status];
        return (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}>
            {config.label}
          </span>
        );
      },
    },
  ];

  return (
    <SalonLayout requiredRole={["ADMIN", "RECEPCIONIST", "PROFESSIONAL"]} pageTitle="Agenda">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Agenda</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Gerencie os agendamentos do salão
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setIsShareModalOpen(true)}
              leftIcon={<ExternalLink className="h-4 w-4" />}
            >
              Link Público
            </Button>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Novo Agendamento
            </Button>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            icon={<CalendarIcon className="h-5 w-5 text-violet-500" />}
            label="Agendamentos Hoje"
            value={todayStats.total}
            color="bg-violet-100 dark:bg-violet-900/30"
          />
          <StatsCard
            icon={<Check className="h-5 w-5 text-blue-500" />}
            label="Confirmados"
            value={todayStats.confirmed}
            color="bg-blue-100 dark:bg-blue-900/30"
          />
          <StatsCard
            icon={<Clock className="h-5 w-5 text-yellow-500" />}
            label="Pendentes"
            value={todayStats.pending}
            color="bg-yellow-100 dark:bg-yellow-900/30"
          />
          <StatsCard
            icon={<Scissors className="h-5 w-5 text-green-500" />}
            label="Receita Hoje"
            value={formatCurrency(todayStats.revenue)}
            color="bg-green-100 dark:bg-green-900/30"
          />
        </div>

        {/* Tabs */}
        <Tabs
          tabs={[
            { id: "agenda", label: "Agenda", icon: <CalendarIcon className="h-4 w-4" /> },
            { id: "list", label: "Lista", icon: <List className="h-4 w-4" /> },
            { id: "waitlist", label: "Lista de Espera", icon: <Users className="h-4 w-4" />, badge: waitlist.length },
          ]}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as "agenda" | "list" | "waitlist")}
        />

        {/* Tab: Agenda */}
        {activeTab === "agenda" && (
          <div className="space-y-4">
            {/* Controles do Calendário */}
            <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:items-center sm:justify-between">
              {/* Navegação de Data */}
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigateDate("prev")}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button variant="secondary" size="sm" onClick={goToToday}>
                  Hoje
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigateDate("next")}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
                <span className="ml-2 text-lg font-semibold text-gray-900 dark:text-white capitalize">
                  {formatDate(currentDate)}
                </span>
              </div>

              {/* Seletores */}
              <div className="flex items-center gap-4">
                {/* Filtro por Profissional */}
                <select
                  value={selectedProfessionalId}
                  onChange={(e) => setSelectedProfessionalId(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Todos os Profissionais</option>
                  {professionals.map((prof) => (
                    <option key={prof.id} value={prof.id}>
                      {prof.name}
                    </option>
                  ))}
                </select>

                {/* Seletor de Visualização */}
                <ViewSelector view={calendarView} onChange={setCalendarView} />
              </div>
            </div>

            {/* Calendário */}
            <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 overflow-hidden">
              {/* Header com profissionais */}
              {displayProfessionals.length > 0 && (
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                  <div className="w-16 flex-shrink-0 border-r border-gray-200 dark:border-gray-700" />
                  {displayProfessionals.map((prof) => (
                    <div
                      key={prof.id}
                      className="flex-1 border-r border-gray-200 dark:border-gray-700 p-3 last:border-r-0"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: prof.color || "#8B5CF6" }}
                        />
                        <span className="font-medium text-gray-900 dark:text-white text-sm">
                          {prof.name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Time Slots */}
              {isLoading ? (
                <div className="flex h-96 items-center justify-center">
                  <RefreshCw className="h-8 w-8 animate-spin text-violet-500" />
                </div>
              ) : (
                <div className="max-h-[600px] overflow-y-auto">
                  {WORKING_HOURS.map((time) => (
                    <TimeSlotCell
                      key={time}
                      time={time}
                      appointments={appointments}
                      professionals={displayProfessionals}
                      onSlotClick={handleSlotClick}
                      onAppointmentClick={handleAppointmentClick}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Lista */}
        {activeTab === "list" && (
          <>
            {/* Filtros */}
            <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:flex-row">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por cliente..."
                  value={listFilters.search}
                  onChange={(e) => setListFilters({ ...listFilters, search: e.target.value })}
                  leftIcon={<Search className="h-4 w-4" />}
                />
              </div>
              <select
                value={listFilters.status}
                onChange={(e) => setListFilters({ ...listFilters, status: e.target.value as AppointmentStatus | "" })}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Todos os status</option>
                <option value="pending">Pendente</option>
                <option value="confirmed">Confirmado</option>
                <option value="in_progress">Em Atendimento</option>
                <option value="completed">Concluído</option>
                <option value="canceled">Cancelado</option>
                <option value="no_show">Não Compareceu</option>
              </select>
              <select
                value={listFilters.professionalId}
                onChange={(e) => setListFilters({ ...listFilters, professionalId: e.target.value })}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Todos os profissionais</option>
                {professionals.map((prof) => (
                  <option key={prof.id} value={prof.id}>
                    {prof.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tabela */}
            <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <DataTable
                data={appointments.filter((a) => {
                  if (listFilters.search && !a.client?.name?.toLowerCase().includes(listFilters.search.toLowerCase())) {
                    return false;
                  }
                  if (listFilters.status && a.status !== listFilters.status) {
                    return false;
                  }
                  if (listFilters.professionalId && a.professionalId !== listFilters.professionalId) {
                    return false;
                  }
                  return true;
                })}
                columns={appointmentColumns}
                keyExtractor={(item) => item.id}
                isLoading={isLoading}
                emptyMessage="Nenhum agendamento encontrado"
                rowActions={(item) => (
                  <>
                    <ActionMenuItem
                      onClick={() => {
                        setSelectedAppointment(item);
                        setIsViewModalOpen(true);
                      }}
                      icon={<Edit2 className="h-4 w-4" />}
                    >
                      Ver Detalhes
                    </ActionMenuItem>
                    <ActionMenuItem
                      onClick={() => handleSendWhatsAppConfirmation(item)}
                      icon={<MessageCircle className="h-4 w-4" />}
                    >
                      Enviar WhatsApp
                    </ActionMenuItem>
                    {item.status !== "completed" && item.status !== "canceled" && (
                      <ActionMenuItem
                        onClick={() => {
                          setSelectedAppointment(item);
                          setIsCancelModalOpen(true);
                        }}
                        icon={<X className="h-4 w-4" />}
                        variant="danger"
                      >
                        Cancelar
                      </ActionMenuItem>
                    )}
                  </>
                )}
                striped
              />
            </div>
          </>
        )}

        {/* Tab: Lista de Espera */}
        {activeTab === "waitlist" && (
          <>
            <div className="flex justify-end">
              <Button
                onClick={() => setIsWaitlistModalOpen(true)}
                leftIcon={<UserPlus className="h-4 w-4" />}
              >
                Adicionar à Lista
              </Button>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <DataTable
                data={waitlist}
                columns={waitlistColumns}
                keyExtractor={(item) => item.id}
                isLoading={isLoadingWaitlist}
                emptyMessage="Nenhum cliente na lista de espera"
                emptyAction={{
                  label: "Adicionar à lista",
                  onClick: () => setIsWaitlistModalOpen(true),
                }}
                rowActions={(item) => (
                  <>
                    <ActionMenuItem
                      onClick={() => {
                        // Criar agendamento a partir da lista de espera
                        setFormData({
                          ...formData,
                          clientId: item.clientId,
                          serviceIds: item.serviceIds,
                          professionalId: item.preferredProfessionalId || "",
                          date: item.preferredDate
                            ? new Date(item.preferredDate).toISOString().split("T")[0]
                            : new Date().toISOString().split("T")[0],
                        });
                        setIsCreateModalOpen(true);
                      }}
                      icon={<CalendarIcon className="h-4 w-4" />}
                    >
                      Agendar
                    </ActionMenuItem>
                    <ActionMenuItem
                      onClick={() => handleRemoveFromWaitlist(item.id)}
                      icon={<Trash2 className="h-4 w-4" />}
                      variant="danger"
                    >
                      Remover
                    </ActionMenuItem>
                  </>
                )}
                striped
              />
            </div>
          </>
        )}
      </div>

      {/* Modal de Criar Agendamento */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title="Novo Agendamento"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => {
              setIsCreateModalOpen(false);
              resetForm();
            }}>
              Cancelar
            </Button>
            <Button onClick={handleCreateAppointment} isLoading={isSubmitting}>
              Criar Agendamento
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          {formErrors.submit && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {formErrors.submit}
            </div>
          )}

          {/* Cliente */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Cliente *
            </label>
            <select
              value={formData.clientId}
              onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              className={`w-full rounded-lg border px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 dark:text-white ${
                formErrors.clientId
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                  : "border-gray-300 focus:border-violet-500 focus:ring-violet-500/20 dark:border-gray-600"
              } bg-white dark:bg-gray-700`}
            >
              <option value="">Selecione um cliente</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} - {client.phone}
                </option>
              ))}
            </select>
            {formErrors.clientId && (
              <p className="mt-1 text-sm text-red-500">{formErrors.clientId}</p>
            )}
          </div>

          {/* Profissional */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Profissional *
            </label>
            <select
              value={formData.professionalId}
              onChange={(e) => setFormData({ ...formData, professionalId: e.target.value })}
              className={`w-full rounded-lg border px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 dark:text-white ${
                formErrors.professionalId
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                  : "border-gray-300 focus:border-violet-500 focus:ring-violet-500/20 dark:border-gray-600"
              } bg-white dark:bg-gray-700`}
            >
              <option value="">Selecione um profissional</option>
              {professionals.map((prof) => (
                <option key={prof.id} value={prof.id}>
                  {prof.name}
                </option>
              ))}
            </select>
            {formErrors.professionalId && (
              <p className="mt-1 text-sm text-red-500">{formErrors.professionalId}</p>
            )}
          </div>

          {/* Serviços */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Serviços *
            </label>
            <div className={`max-h-48 space-y-2 overflow-y-auto rounded-lg border p-3 ${
              formErrors.serviceIds ? "border-red-500" : "border-gray-300 dark:border-gray-600"
            }`}>
              {services
                .filter((s) => s.status === "active")
                .map((service) => (
                  <label
                    key={service.id}
                    className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <input
                      type="checkbox"
                      checked={formData.serviceIds.includes(service.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            serviceIds: [...formData.serviceIds, service.id],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            serviceIds: formData.serviceIds.filter((id) => id !== service.id),
                          });
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-violet-500 focus:ring-violet-500"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {service.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatCurrency(service.promotionalPrice || service.price)} •{" "}
                        {formatDuration(service.durationMinutes)}
                      </p>
                    </div>
                  </label>
                ))}
            </div>
            {formErrors.serviceIds && (
              <p className="mt-1 text-sm text-red-500">{formErrors.serviceIds}</p>
            )}
            {formData.serviceIds.length > 0 && (
              <div className="mt-2 rounded-lg bg-violet-50 p-2 dark:bg-violet-900/20">
                <p className="text-sm text-violet-700 dark:text-violet-300">
                  Total: {formatCurrency(selectedServicesTotal.price)} •{" "}
                  {formatDuration(selectedServicesTotal.duration)}
                </p>
              </div>
            )}
          </div>

          {/* Data e Hora */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Data *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                min={new Date().toISOString().split("T")[0]}
                className={`w-full rounded-lg border px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 dark:text-white ${
                  formErrors.date
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                    : "border-gray-300 focus:border-violet-500 focus:ring-violet-500/20 dark:border-gray-600"
                } bg-white dark:bg-gray-700`}
              />
              {formErrors.date && (
                <p className="mt-1 text-sm text-red-500">{formErrors.date}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Horário *
              </label>
              <select
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className={`w-full rounded-lg border px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 dark:text-white ${
                  formErrors.startTime
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                    : "border-gray-300 focus:border-violet-500 focus:ring-violet-500/20 dark:border-gray-600"
                } bg-white dark:bg-gray-700`}
              >
                <option value="">Selecione um horário</option>
                {availableSlots.length > 0
                  ? availableSlots.map((slot) => (
                      <option
                        key={slot.time}
                        value={slot.time}
                        disabled={!slot.available}
                        className={!slot.available ? "text-gray-400" : ""}
                      >
                        {slot.time} {!slot.available ? "(Ocupado)" : ""}
                      </option>
                    ))
                  : WORKING_HOURS.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
              </select>
              {formErrors.startTime && (
                <p className="mt-1 text-sm text-red-500">{formErrors.startTime}</p>
              )}
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Observações do Cliente
            </label>
            <textarea
              value={formData.clientNotes}
              onChange={(e) => setFormData({ ...formData, clientNotes: e.target.value })}
              placeholder="Observações do cliente..."
              rows={2}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Notas Internas
            </label>
            <textarea
              value={formData.internalNotes}
              onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
              placeholder="Notas internas (não visíveis para o cliente)..."
              rows={2}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
            />
          </div>
        </div>
      </Modal>

      {/* Modal de Visualizar Agendamento */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedAppointment(null);
        }}
        title="Detalhes do Agendamento"
        size="lg"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setIsViewModalOpen(false);
                setSelectedAppointment(null);
              }}
            >
              Fechar
            </Button>
            {selectedAppointment && selectedAppointment.status !== "completed" && selectedAppointment.status !== "canceled" && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => handleSendWhatsAppConfirmation(selectedAppointment)}
                  leftIcon={<MessageCircle className="h-4 w-4" />}
                >
                  WhatsApp
                </Button>
                <Button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    setIsStatusModalOpen(true);
                  }}
                >
                  Alterar Status
                </Button>
              </>
            )}
          </>
        }
      >
        {selectedAppointment && (
          <div className="space-y-6">
            {/* Status */}
            <div className="flex items-center justify-between">
              <AppointmentStatusBadge status={selectedAppointment.status} />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Origem: {selectedAppointment.source === "online" ? "Online" : selectedAppointment.source === "phone" ? "Telefone" : selectedAppointment.source === "walk_in" ? "Presencial" : "Admin"}
              </span>
            </div>

            {/* Cliente */}
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <h4 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">Cliente</h4>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-lg font-semibold text-violet-600 dark:bg-violet-900/50 dark:text-violet-400">
                  {selectedAppointment.client?.name?.charAt(0).toUpperCase() || "C"}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedAppointment.client?.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedAppointment.client?.phone}
                  </p>
                </div>
              </div>
            </div>

            {/* Data e Hora */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <h4 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">Data</h4>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-900 dark:text-white">
                    {new Date(selectedAppointment.date).toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </span>
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <h4 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">Horário</h4>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-900 dark:text-white">
                    {selectedAppointment.startTime} - {selectedAppointment.endTime}
                  </span>
                </div>
              </div>
            </div>

            {/* Profissional */}
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <h4 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">Profissional</h4>
              <div className="flex items-center gap-2">
                <div
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: selectedAppointment.professional?.color || "#8B5CF6" }}
                />
                <span className="text-gray-900 dark:text-white">
                  {selectedAppointment.professional?.name}
                </span>
              </div>
            </div>

            {/* Serviços */}
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <h4 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">Serviços</h4>
              <div className="space-y-2">
                {selectedAppointment.services.map((s, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <span className="text-gray-900 dark:text-white">{s.service?.name}</span>
                      <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                        ({formatDuration(s.durationMinutes)})
                      </span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(s.price)}
                    </span>
                  </div>
                ))}
                <div className="border-t border-gray-200 pt-2 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-white">Total</span>
                    <span className="text-lg font-bold text-violet-600 dark:text-violet-400">
                      {formatCurrency(selectedAppointment.finalPrice)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notas */}
            {(selectedAppointment.clientNotes || selectedAppointment.internalNotes) && (
              <div className="space-y-4">
                {selectedAppointment.clientNotes && (
                  <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                    <h4 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Observações do Cliente
                    </h4>
                    <p className="text-gray-900 dark:text-white">{selectedAppointment.clientNotes}</p>
                  </div>
                )}
                {selectedAppointment.internalNotes && (
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-900/20">
                    <h4 className="mb-2 text-sm font-medium text-yellow-700 dark:text-yellow-400">
                      Notas Internas
                    </h4>
                    <p className="text-yellow-800 dark:text-yellow-200">
                      {selectedAppointment.internalNotes}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal de Alterar Status */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => {
          setIsStatusModalOpen(false);
          setSelectedAppointment(null);
        }}
        title="Alterar Status"
      >
        <div className="space-y-3">
          {selectedAppointment?.status === "pending" && (
            <Button
              variant="secondary"
              className="w-full justify-start"
              onClick={() => handleStatusChange("confirmed")}
              isLoading={isSubmitting}
              leftIcon={<Check className="h-4 w-4 text-blue-500" />}
            >
              Confirmar Agendamento
            </Button>
          )}
          {(selectedAppointment?.status === "pending" || selectedAppointment?.status === "confirmed") && (
            <Button
              variant="secondary"
              className="w-full justify-start"
              onClick={() => handleStatusChange("in_progress")}
              isLoading={isSubmitting}
              leftIcon={<Scissors className="h-4 w-4 text-violet-500" />}
            >
              Iniciar Atendimento
            </Button>
          )}
          {selectedAppointment?.status === "in_progress" && (
            <Button
              variant="secondary"
              className="w-full justify-start"
              onClick={() => handleStatusChange("completed")}
              isLoading={isSubmitting}
              leftIcon={<Check className="h-4 w-4 text-green-500" />}
            >
              Finalizar Atendimento
            </Button>
          )}
          {selectedAppointment?.status !== "completed" && selectedAppointment?.status !== "canceled" && (
            <>
              <Button
                variant="secondary"
                className="w-full justify-start"
                onClick={() => handleStatusChange("no_show")}
                isLoading={isSubmitting}
                leftIcon={<AlertTriangle className="h-4 w-4 text-gray-500" />}
              >
                Marcar como Não Compareceu
              </Button>
              <Button
                variant="danger"
                className="w-full justify-start"
                onClick={() => {
                  setIsStatusModalOpen(false);
                  setIsCancelModalOpen(true);
                }}
                leftIcon={<X className="h-4 w-4" />}
              >
                Cancelar Agendamento
              </Button>
            </>
          )}
        </div>
      </Modal>

      {/* Modal de Cancelar */}
      <ConfirmModal
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false);
          setSelectedAppointment(null);
        }}
        onConfirm={() => handleCancelAppointment()}
        title="Cancelar Agendamento"
        message={`Tem certeza que deseja cancelar o agendamento de ${selectedAppointment?.client?.name}?`}
        confirmText="Cancelar Agendamento"
        cancelText="Voltar"
        variant="danger"
        isLoading={isSubmitting}
      />

      {/* Modal de Lista de Espera */}
      <Modal
        isOpen={isWaitlistModalOpen}
        onClose={() => {
          setIsWaitlistModalOpen(false);
          resetWaitlistForm();
        }}
        title="Adicionar à Lista de Espera"
        size="lg"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setIsWaitlistModalOpen(false);
                resetWaitlistForm();
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleAddToWaitlist} isLoading={isSubmitting}>
              Adicionar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Cliente */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Cliente *
            </label>
            <select
              value={waitlistFormData.clientId}
              onChange={(e) => setWaitlistFormData({ ...waitlistFormData, clientId: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Selecione um cliente</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          {/* Serviços */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Serviços Desejados *
            </label>
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-gray-300 p-3 dark:border-gray-600">
              {services
                .filter((s) => s.status === "active")
                .map((service) => (
                  <label
                    key={service.id}
                    className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <input
                      type="checkbox"
                      checked={waitlistFormData.serviceIds.includes(service.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setWaitlistFormData({
                            ...waitlistFormData,
                            serviceIds: [...waitlistFormData.serviceIds, service.id],
                          });
                        } else {
                          setWaitlistFormData({
                            ...waitlistFormData,
                            serviceIds: waitlistFormData.serviceIds.filter((id) => id !== service.id),
                          });
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-violet-500 focus:ring-violet-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-white">{service.name}</span>
                  </label>
                ))}
            </div>
          </div>

          {/* Profissional Preferido */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Profissional Preferido
            </label>
            <select
              value={waitlistFormData.preferredProfessionalId}
              onChange={(e) => setWaitlistFormData({ ...waitlistFormData, preferredProfessionalId: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Qualquer profissional</option>
              {professionals.map((prof) => (
                <option key={prof.id} value={prof.id}>
                  {prof.name}
                </option>
              ))}
            </select>
          </div>

          {/* Data e Horário Preferidos */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Data Preferida
              </label>
              <input
                type="date"
                value={waitlistFormData.preferredDate}
                onChange={(e) => setWaitlistFormData({ ...waitlistFormData, preferredDate: e.target.value })}
                min={new Date().toISOString().split("T")[0]}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Horário Início
              </label>
              <select
                value={waitlistFormData.preferredTimeStart}
                onChange={(e) => setWaitlistFormData({ ...waitlistFormData, preferredTimeStart: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Qualquer</option>
                {WORKING_HOURS.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Horário Fim
              </label>
              <select
                value={waitlistFormData.preferredTimeEnd}
                onChange={(e) => setWaitlistFormData({ ...waitlistFormData, preferredTimeEnd: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Qualquer</option>
                {WORKING_HOURS.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Observações
            </label>
            <textarea
              value={waitlistFormData.notes}
              onChange={(e) => setWaitlistFormData({ ...waitlistFormData, notes: e.target.value })}
              placeholder="Observações sobre a preferência..."
              rows={2}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
            />
          </div>
        </div>
      </Modal>

      {/* Modal de Link Público */}
      <Modal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title="Link Público de Agendamento"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Compartilhe este link com seus clientes para que eles possam agendar online:
          </p>
          <div className="flex gap-2">
            <Input
              value={publicLink}
              readOnly
              className="flex-1"
            />
            <Button
              variant="secondary"
              onClick={() => {
                navigator.clipboard.writeText(publicLink);
              }}
              leftIcon={<Copy className="h-4 w-4" />}
            >
              Copiar
            </Button>
          </div>
          <div className="rounded-lg bg-violet-50 p-4 dark:bg-violet-900/20">
            <h4 className="font-medium text-violet-700 dark:text-violet-300">Dica</h4>
            <p className="mt-1 text-sm text-violet-600 dark:text-violet-400">
              Adicione este link à bio do seu Instagram ou envie via WhatsApp para seus clientes.
            </p>
          </div>
        </div>
      </Modal>
    </SalonLayout>
  );
}
