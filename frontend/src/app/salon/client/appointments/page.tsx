'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  User,
  Scissors,
  MapPin,
  Plus,
  CheckCircle,
  XCircle,
  AlertCircle,
  Phone,
  RefreshCw,
} from 'lucide-react';
import { format, isSameDay, isAfter, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { appointmentService } from '@/services/salon/appointmentService';
import type { Appointment, AppointmentStatus } from '@/types/salon';

const statusConfig: Record<
  AppointmentStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  pending: {
    label: 'Pendente',
    color: 'bg-yellow-100 text-yellow-700',
    icon: <AlertCircle className="h-4 w-4" />,
  },
  confirmed: {
    label: 'Confirmado',
    color: 'bg-green-100 text-green-700',
    icon: <CheckCircle className="h-4 w-4" />,
  },
  in_progress: {
    label: 'Em Atendimento',
    color: 'bg-blue-100 text-blue-700',
    icon: <Clock className="h-4 w-4" />,
  },
  completed: {
    label: 'Concluido',
    color: 'bg-gray-100 text-gray-700',
    icon: <CheckCircle className="h-4 w-4" />,
  },
  canceled: {
    label: 'Cancelado',
    color: 'bg-red-100 text-red-700',
    icon: <XCircle className="h-4 w-4" />,
  },
  no_show: {
    label: 'Faltou',
    color: 'bg-red-100 text-red-700',
    icon: <XCircle className="h-4 w-4" />,
  },
};

type TabType = 'upcoming' | 'past';

export default function ClientAppointmentsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load appointments for the authenticated client
  useEffect(() => {
    const loadAppointments = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await appointmentService.getMyAppointments({
          limit: 50,
        });
        setAppointments(response.items);
      } catch (err) {
        console.error('[ClientAppointments] Erro ao carregar agendamentos:', err);
        setError('Não foi possível carregar seus agendamentos. Tente novamente.');
      } finally {
        setIsLoading(false);
      }
    };

    loadAppointments();
  }, []);

  // Filter appointments
  const now = new Date();
  const upcomingAppointments = appointments.filter(
    apt => isAfter(new Date(apt.date), now) || isSameDay(new Date(apt.date), now)
  );
  const pastAppointments = appointments.filter(
    apt => isBefore(new Date(apt.date), now) && !isSameDay(new Date(apt.date), now)
  );

  const displayedAppointments =
    activeTab === 'upcoming' ? upcomingAppointments : pastAppointments;

  // Reload appointments
  const reloadAppointments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await appointmentService.getMyAppointments({ limit: 50 });
      setAppointments(response.items);
    } catch (err) {
      console.error('[ClientAppointments] Erro ao recarregar:', err);
      setError('Não foi possível carregar seus agendamentos.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle appointment actions
  const handleConfirm = async (id: string) => {
    try {
      await appointmentService.confirmMyAppointment(id);
      setAppointments(prev =>
        prev.map(apt =>
          apt.id === id ? { ...apt, status: 'confirmed' as AppointmentStatus } : apt
        )
      );
    } catch (err) {
      console.error('Erro ao confirmar:', err);
      alert('Não foi possível confirmar o agendamento. Tente novamente.');
    }
  };

  const handleCancel = async (id: string) => {
    const reason = prompt('Motivo do cancelamento (opcional):');
    if (reason === null) return; // User clicked cancel on prompt

    try {
      await appointmentService.cancelMyAppointment(id, reason || undefined);
      setAppointments(prev =>
        prev.map(apt =>
          apt.id === id ? { ...apt, status: 'canceled' as AppointmentStatus } : apt
        )
      );
    } catch (err) {
      console.error('Erro ao cancelar:', err);
      alert('Não foi possível cancelar o agendamento. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-violet-600 text-white">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-lg font-semibold">Meus Agendamentos</h1>
          <button
            onClick={() => router.push('/salon/book')}
            className="rounded-full bg-white/20 p-2 hover:bg-white/30"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-4 pb-2">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={cn(
              'flex-1 rounded-full py-2 text-sm font-medium transition-colors',
              activeTab === 'upcoming'
                ? 'bg-white text-violet-600'
                : 'text-violet-200 hover:text-white'
            )}
          >
            Proximos ({upcomingAppointments.length})
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={cn(
              'flex-1 rounded-full py-2 text-sm font-medium transition-colors',
              activeTab === 'past'
                ? 'bg-white text-violet-600'
                : 'text-violet-200 hover:text-white'
            )}
          >
            Anteriores ({pastAppointments.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-500" />
          </div>
        ) : error ? (
          <div className="rounded-xl bg-red-50 p-6 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
            <p className="mt-2 text-red-600">{error}</p>
            <button
              onClick={reloadAppointments}
              className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-white"
            >
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </button>
          </div>
        ) : displayedAppointments.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm">
            <Calendar className="mx-auto h-16 w-16 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              {activeTab === 'upcoming'
                ? 'Nenhum agendamento'
                : 'Nenhum historico'}
            </h3>
            <p className="mt-2 text-gray-500">
              {activeTab === 'upcoming'
                ? 'Faca um novo agendamento'
                : 'Seus agendamentos anteriores aparecerao aqui'}
            </p>
            {activeTab === 'upcoming' && (
              <button
                onClick={() => router.push('/salon/book')}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-500 px-6 py-3 font-medium text-white hover:bg-violet-600"
              >
                <Plus className="h-5 w-5" />
                Novo Agendamento
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {displayedAppointments.map(appointment => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onConfirm={() => handleConfirm(appointment.id)}
                onCancel={() => handleCancel(appointment.id)}
                isPast={activeTab === 'past'}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB for new booking - posicionado acima da navegação inferior */}
      {activeTab === 'upcoming' && displayedAppointments.length > 0 && (
        <button
          onClick={() => router.push('/salon/book')}
          className="fixed bottom-24 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-violet-500 text-white shadow-lg hover:bg-violet-600"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}

interface AppointmentCardProps {
  appointment: Appointment;
  onConfirm: () => void;
  onCancel: () => void;
  isPast: boolean;
}

function AppointmentCard({
  appointment,
  onConfirm,
  onCancel,
  isPast,
}: AppointmentCardProps) {
  const status = statusConfig[appointment.status];
  const isToday = isSameDay(new Date(appointment.date), new Date());

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
      {/* Date header */}
      <div
        className={cn(
          'flex items-center justify-between px-4 py-2',
          isToday ? 'bg-violet-500 text-white' : 'bg-gray-50'
        )}
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span className="font-medium">
            {isToday
              ? 'Hoje'
              : format(new Date(appointment.date), "EEEE, d 'de' MMMM", {
                  locale: ptBR,
                })}
          </span>
        </div>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-medium',
            isToday ? 'bg-white/20' : status.color
          )}
        >
          {status.label}
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Time */}
          <div className="text-center">
            <p className="text-2xl font-bold text-violet-600">
              {appointment.startTime}
            </p>
            <p className="text-xs text-gray-500">
              {appointment.totalDurationMinutes} min
            </p>
          </div>

          {/* Details */}
          <div className="flex-1">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-700">
                <Scissors className="h-4 w-4 text-violet-500" />
                <span>
                  {appointment.services.map(s => s.service?.name).join(', ')}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <User className="h-4 w-4 text-violet-500" />
                <span>{appointment.professional?.name}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="h-4 w-4 text-violet-500" />
                <span>Unidade Principal</span>
              </div>
            </div>

            {/* Price */}
            <div className="mt-3 flex items-center justify-between border-t pt-3">
              <span className="text-gray-500">Total</span>
              <span className="text-lg font-semibold text-gray-900">
                R$ {appointment.finalPrice.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        {!isPast && appointment.status === 'pending' && (
          <div className="mt-4 flex gap-3">
            <button
              onClick={onConfirm}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-500 py-3 font-medium text-white hover:bg-green-600"
            >
              <CheckCircle className="h-5 w-5" />
              Confirmar
            </button>
            <button
              onClick={onCancel}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 py-3 font-medium text-red-600 hover:bg-red-50"
            >
              <XCircle className="h-5 w-5" />
              Cancelar
            </button>
          </div>
        )}

        {!isPast && appointment.status === 'confirmed' && (
          <div className="mt-4 flex gap-3">
            <a
              href="tel:+5511999999999"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 font-medium text-gray-700 hover:bg-gray-50"
            >
              <Phone className="h-5 w-5" />
              Ligar
            </a>
            <button
              onClick={onCancel}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 py-3 font-medium text-red-600 hover:bg-red-50"
            >
              <XCircle className="h-5 w-5" />
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
