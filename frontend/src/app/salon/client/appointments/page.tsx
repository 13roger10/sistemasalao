"use client";

import { useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  User,
  Scissors,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  CalendarDays,
  History,
  RefreshCw,
} from "lucide-react";
import { format, isPast, isToday, isFuture, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { SalonLayout } from "@/components/layout/SalonLayout";
import { appointmentService } from "@/services/salon/appointmentService";
import { useSalonAuth } from "@/contexts/SalonAuthContext";
import { cn } from "@/lib/utils";
import type { Appointment, AppointmentStatus } from "@/types/salon";

// Status configuration
const STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: string; icon: ReactNode }> = {
  pending: {
    label: "Pendente",
    color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    icon: <Clock className="h-4 w-4" />,
  },
  confirmed: {
    label: "Confirmado",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    icon: <CheckCircle className="h-4 w-4" />,
  },
  in_progress: {
    label: "Em Andamento",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    icon: <RefreshCw className="h-4 w-4" />,
  },
  completed: {
    label: "Concluido",
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    icon: <CheckCircle className="h-4 w-4" />,
  },
  canceled: {
    label: "Cancelado",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    icon: <XCircle className="h-4 w-4" />,
  },
  no_show: {
    label: "Nao Compareceu",
    color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
    icon: <AlertCircle className="h-4 w-4" />,
  },
};

type TabType = "upcoming" | "past";

export default function ClientAppointmentsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useSalonAuth();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("upcoming");
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // Load appointments
  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    const loadAppointments = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Usa a rota exclusiva do cliente autenticado — nunca traz dados de
        // outros clientes nem notas internas da equipe.
        const response = await appointmentService.getMyAppointments({
          page: 1,
          limit: 100,
        });

        const myAppointments = [...response.data].sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateB.getTime() - dateA.getTime();
        });

        setAppointments(myAppointments);
      } catch (err) {
        console.error("Erro ao carregar agendamentos:", err);
        setError("Nao foi possivel carregar seus agendamentos. Tente novamente.");
      } finally {
        setIsLoading(false);
      }
    };

    loadAppointments();
  }, [user, authLoading]);

  // Filter appointments by tab
  const filteredAppointments = appointments.filter((apt) => {
    const aptDate = new Date(apt.date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (activeTab === "upcoming") {
      // Upcoming: today or future, and not canceled/completed
      return (
        (isToday(aptDate) || isFuture(aptDate)) &&
        !["canceled", "completed", "no_show"].includes(apt.status)
      );
    } else {
      // Past: past dates or completed/canceled
      return (
        isPast(aptDate) ||
        ["completed", "canceled", "no_show"].includes(apt.status)
      );
    }
  });

  // Sort filtered appointments
  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    if (activeTab === "upcoming") {
      return dateA.getTime() - dateB.getTime(); // Soonest first
    }
    return dateB.getTime() - dateA.getTime(); // Most recent first
  });

  // Abre o modal de confirmação
  const handleCancelClick = (appointment: Appointment) => {
    setCancelError(null);
    setAppointmentToCancel(appointment);
  };

  // Confirma o cancelamento via API
  const handleConfirmCancel = async () => {
    if (!appointmentToCancel) return;

    setCancelingId(appointmentToCancel.id);
    setCancelError(null);
    try {
      await appointmentService.cancel(appointmentToCancel.id, "Cancelado pelo cliente");
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === appointmentToCancel.id ? { ...apt, status: "canceled" as AppointmentStatus } : apt
        )
      );
      setAppointmentToCancel(null);
    } catch (err) {
      console.error("Erro ao cancelar agendamento:", err);
      const msg = err instanceof Error
        ? err.message.replace(/^\[HTTP \d+\] /, "")
        : "Não foi possível cancelar o agendamento. Tente novamente.";
      setCancelError(msg);
      setAppointmentToCancel(null);
    } finally {
      setCancelingId(null);
    }
  };

  // Confirma o agendamento pendente via API
  const handleConfirmAppointment = async (appointment: Appointment) => {
    setConfirmingId(appointment.id);
    setConfirmError(null);
    try {
      await appointmentService.confirmMyAppointment(appointment.id);
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === appointment.id ? { ...apt, status: "confirmed" as AppointmentStatus } : apt
        )
      );
    } catch (err) {
      console.error("Erro ao confirmar agendamento:", err);
      const msg = err instanceof Error
        ? err.message.replace(/^\[HTTP \d+\] /, "")
        : "Não foi possível confirmar o agendamento. Tente novamente.";
      setConfirmError(msg);
    } finally {
      setConfirmingId(null);
    }
  };

  // Format date for display
  const formatAppointmentDate = (date: Date | string) => {
    const dateObj = typeof date === "string" ? parseISO(date) : date;

    if (isToday(dateObj)) {
      return "Hoje";
    }

    return format(dateObj, "EEEE, d 'de' MMMM", { locale: ptBR });
  };

  // Get service names
  const getServiceNames = (apt: Appointment) => {
    if (apt.services && apt.services.length > 0) {
      return apt.services.map((s) => s.service?.name || "Servico").join(", ");
    }
    return "Servico";
  };

  // Loading state
  if (authLoading || isLoading) {
    return (
      <SalonLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Carregando seus agendamentos...</p>
          </div>
        </div>
      </SalonLayout>
    );
  }

  return (
    <SalonLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Minha Agenda</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Acompanhe seus agendamentos atuais e anteriores
            </p>
          </div>
          <Button onClick={() => router.push("/salon/book")}>
            <Calendar className="mr-2 h-4 w-4" />
            Novo Agendamento
          </Button>
        </div>

        {/* Erro de cancelamento */}
        {cancelError && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
            <p className="flex-1 text-sm text-red-800 dark:text-red-300">{cancelError}</p>
            <button
              onClick={() => setCancelError(null)}
              className="text-red-500 hover:text-red-700 dark:text-red-400"
              aria-label="Fechar"
            >
              ×
            </button>
          </div>
        )}

        {/* Erro de confirmação */}
        {confirmError && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
            <p className="flex-1 text-sm text-red-800 dark:text-red-300">{confirmError}</p>
            <button
              onClick={() => setConfirmError(null)}
              className="text-red-500 hover:text-red-700 dark:text-red-400"
              aria-label="Fechar"
            >
              ×
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-violet-100 p-2 dark:bg-violet-900/30">
                <CalendarDays className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Proximos</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {appointments.filter((a) => {
                    const d = new Date(a.date);
                    return (isToday(d) || isFuture(d)) && !["canceled", "completed", "no_show"].includes(a.status);
                  }).length}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Concluidos</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {appointments.filter((a) => a.status === "completed").length}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-gray-100 p-2 dark:bg-gray-700">
                <History className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {appointments.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={cn(
              "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
              activeTab === "upcoming"
                ? "border-violet-500 text-violet-600 dark:text-violet-400"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            )}
          >
            <CalendarDays className="h-4 w-4" />
            Proximos
            {appointments.filter((a) => {
              const d = new Date(a.date);
              return (isToday(d) || isFuture(d)) && !["canceled", "completed", "no_show"].includes(a.status);
            }).length > 0 && (
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-600 dark:bg-violet-900/50 dark:text-violet-400">
                {appointments.filter((a) => {
                  const d = new Date(a.date);
                  return (isToday(d) || isFuture(d)) && !["canceled", "completed", "no_show"].includes(a.status);
                }).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("past")}
            className={cn(
              "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
              activeTab === "past"
                ? "border-violet-500 text-violet-600 dark:text-violet-400"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            )}
          >
            <History className="h-4 w-4" />
            Historico
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {/* Appointments List */}
        <div className="space-y-4">
          {sortedAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 py-12 dark:border-gray-700 dark:bg-gray-800/50">
              <Calendar className="mb-4 h-12 w-12 text-gray-400" />
              <p className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                {activeTab === "upcoming"
                  ? "Nenhum agendamento proximo"
                  : "Nenhum historico de agendamentos"}
              </p>
              <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                {activeTab === "upcoming"
                  ? "Faca um novo agendamento para comecar"
                  : "Seus agendamentos anteriores aparecerão aqui"}
              </p>
              {activeTab === "upcoming" && (
                <Button onClick={() => router.push("/salon/book")}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Agendar Agora
                </Button>
              )}
            </div>
          ) : (
            sortedAppointments.map((appointment) => {
              const status = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.pending;
              const canCancel =
                activeTab === "upcoming" &&
                ["pending", "confirmed"].includes(appointment.status);

              return (
                <div
                  key={appointment.id}
                  className="rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    {/* Left side - Appointment info */}
                    <div className="flex-1 space-y-3">
                      {/* Date and time */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-violet-500" />
                          <span className="font-medium text-gray-900 dark:text-white capitalize">
                            {formatAppointmentDate(appointment.date)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-violet-500" />
                          <span className="text-gray-700 dark:text-gray-300">
                            {appointment.startTime}
                            {appointment.endTime && ` - ${appointment.endTime}`}
                          </span>
                        </div>
                      </div>

                      {/* Services */}
                      <div className="flex items-center gap-2">
                        <Scissors className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-700 dark:text-gray-300">
                          {getServiceNames(appointment)}
                        </span>
                      </div>

                      {/* Professional */}
                      {appointment.professional && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-700 dark:text-gray-300">
                            {appointment.professional.name}
                          </span>
                        </div>
                      )}

                      {/* Price */}
                      {appointment.totalPrice > 0 && (
                        <div className="text-sm font-medium text-violet-600 dark:text-violet-400">
                          R$ {appointment.totalPrice.toFixed(2)}
                        </div>
                      )}
                    </div>

                    {/* Right side - Status and actions */}
                    <div className="flex flex-col items-end gap-3">
                      {/* Status badge */}
                      <div
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                          status.color
                        )}
                      >
                        {status.icon}
                        {status.label}
                      </div>

                      {/* Cancel button */}
                      {canCancel && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelClick(appointment)}
                          disabled={cancelingId === appointment.id}
                          className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          {cancelingId === appointment.id ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <XCircle className="mr-1 h-3 w-3" />
                          )}
                          Cancelar
                        </Button>
                      )}

                      {/* Reschedule button for upcoming appointments */}
                      {canCancel && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push("/salon/book")}
                          className="text-gray-600 dark:text-gray-400"
                        >
                          <RefreshCw className="mr-1 h-3 w-3" />
                          Reagendar
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Appointment code */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Codigo: #{appointment.id.slice(-8).toUpperCase()}
                    </span>
                    <div className="flex items-center gap-3">
                      {appointment.clientNotes && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Obs: {appointment.clientNotes}
                        </span>
                      )}
                      {/* Confirm button - only for pending appointments */}
                      {activeTab === "upcoming" && appointment.status === "pending" && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleConfirmAppointment(appointment)}
                          disabled={confirmingId === appointment.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {confirmingId === appointment.id ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle className="mr-1 h-3 w-3" />
                          )}
                          Confirmar Agendamento
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal de confirmação de cancelamento */}
      <Modal
        isOpen={!!appointmentToCancel}
        onClose={() => setAppointmentToCancel(null)}
        title="Cancelar Agendamento"
      >
        {appointmentToCancel && (
          <div className="space-y-5">
            {/* Ícone de alerta */}
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            </div>

            <p className="text-center text-gray-600 dark:text-gray-400">
              Tem certeza que deseja cancelar este agendamento?
            </p>

            {/* Detalhes do agendamento */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Calendar className="h-4 w-4 text-violet-500" />
                  <span className="capitalize font-medium">
                    {formatAppointmentDate(appointmentToCancel.date)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Clock className="h-4 w-4 text-violet-500" />
                  <span>
                    {appointmentToCancel.startTime}
                    {appointmentToCancel.endTime && ` - ${appointmentToCancel.endTime}`}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Scissors className="h-4 w-4 text-violet-500" />
                  <span>{getServiceNames(appointmentToCancel)}</span>
                </div>
                {appointmentToCancel.professional && (
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <User className="h-4 w-4 text-violet-500" />
                    <span>{appointmentToCancel.professional.name}</span>
                  </div>
                )}
              </div>
            </div>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Esta ação não pode ser desfeita.
            </p>

            {/* Botões */}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setAppointmentToCancel(null)}
                disabled={!!cancelingId}
              >
                Manter Agendamento
              </Button>
              <Button
                variant="primary"
                className="w-full bg-red-600 hover:bg-red-700 sm:w-auto"
                onClick={handleConfirmCancel}
                disabled={!!cancelingId}
              >
                {cancelingId ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cancelando...
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    Confirmar Cancelamento
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </SalonLayout>
  );
}
