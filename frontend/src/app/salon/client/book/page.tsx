'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle,
  Calendar,
  Clock,
  MapPin,
  ChevronLeft,
  Home,
  CalendarPlus,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MobileBooking } from '@/components/salon/MobileBooking';
import { useSalonAuth } from '@/contexts/SalonAuthContext';

interface BookingResult {
  appointmentId: string;
  date: Date;
  time: string;
  serviceName: string;
  professionalName: string;
}

export default function ClientBookPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useSalonAuth();

  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);

  // Redireciona se não estiver autenticado
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/salon/login?redirect=/salon/client/book');
    }
  }, [authLoading, isAuthenticated, router]);

  const handleBookingComplete = (appointmentId: string) => {
    // Em uma implementação real, buscaríamos os detalhes do agendamento
    setBookingResult({
      appointmentId,
      date: new Date(),
      time: '14:00',
      serviceName: 'Serviço agendado',
      professionalName: 'Profissional',
    });
    setBookingComplete(true);
  };

  const handleCancel = () => {
    router.push('/salon/book');
  };

  const handleGoToAppointments = () => {
    router.push('/salon/book');
  };

  const handleNewBooking = () => {
    setBookingComplete(false);
    setBookingResult(null);
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  // Não autenticado
  if (!isAuthenticated) {
    return null;
  }

  // Tela de sucesso após agendamento
  if (bookingComplete && bookingResult) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-b from-green-500 to-green-600">
        {/* Success Animation */}
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-white">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white/20 animate-bounce">
            <CheckCircle className="h-16 w-16" />
          </div>

          <h1 className="mb-2 text-2xl font-bold">
            Agendamento Confirmado!
          </h1>
          <p className="mb-8 text-green-100">
            Você receberá uma notificação de lembrete antes do horário
          </p>

          {/* Appointment Summary */}
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-left text-gray-800 shadow-xl">
            <div className="mb-4 text-center">
              <p className="text-sm text-gray-500">Código do Agendamento</p>
              <p className="font-mono text-lg font-bold text-violet-600">
                #{bookingResult.appointmentId.slice(-8).toUpperCase()}
              </p>
            </div>

            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-violet-500" />
                <span>
                  {format(bookingResult.date, "EEEE, d 'de' MMMM", { locale: ptBR })}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-violet-500" />
                <span>{bookingResult.time}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-violet-500" />
                <span>Unidade Principal</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 pb-24 space-y-3">
          <button
            onClick={handleGoToAppointments}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-4 font-semibold text-green-600 shadow-lg transition-transform active:scale-98"
          >
            <Home className="h-5 w-5" />
            Ver Meus Agendamentos
          </button>

          <button
            onClick={handleNewBooking}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-white/30 bg-white/10 py-4 font-semibold text-white transition-transform active:scale-98"
          >
            <CalendarPlus className="h-5 w-5" />
            Fazer Novo Agendamento
          </button>
        </div>
      </div>
    );
  }

  // Formulário de agendamento
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-violet-600 text-white">
        <div className="flex items-center gap-4 p-4">
          <button
            onClick={handleCancel}
            className="rounded-full p-2 hover:bg-violet-500 transition-colors"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Novo Agendamento</h1>
            <p className="text-sm text-violet-200">
              Olá, {user?.name?.split(' ')[0] || 'Cliente'}
            </p>
          </div>
        </div>
      </div>

      {/* Booking Component */}
      <div className="pb-20">
        <MobileBooking
          unitId="default"
          clientId={user?.id}
          onComplete={handleBookingComplete}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}
