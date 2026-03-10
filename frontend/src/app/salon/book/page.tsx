'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  CheckCircle,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Download,
  Share2,
  Bell,
  Home,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MobileBooking } from '@/components/salon/MobileBooking';
import { usePWA } from '@/hooks/salon/usePWA';
import { cn } from '@/lib/utils';

function BookingPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const unitId = searchParams.get('unit') || 'default';
  const clientId = searchParams.get('client');

  const [bookingComplete, setBookingComplete] = useState(false);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  const { isInstallable, isInstalled, install, isPushSupported, enablePush, isPushEnabled } = usePWA();

  // Show install banner after booking
  useEffect(() => {
    if (bookingComplete && isInstallable && !isInstalled) {
      const timer = setTimeout(() => setShowInstallBanner(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [bookingComplete, isInstallable, isInstalled]);

  const handleBookingComplete = async (id: string) => {
    setAppointmentId(id);
    setBookingComplete(true);

    // Request push permission after successful booking
    if (isPushSupported && !isPushEnabled) {
      await enablePush();
    }
  };

  const handleInstall = async () => {
    const success = await install();
    if (success) {
      setShowInstallBanner(false);
    }
  };

  if (bookingComplete) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-b from-green-500 to-green-600">
        {/* Success Animation */}
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-white">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white/20">
            <CheckCircle className="h-16 w-16" />
          </div>

          <h1 className="mb-2 text-2xl font-bold">
            Agendamento Confirmado!
          </h1>
          <p className="mb-8 text-green-100">
            Voce recebera uma notificacao de lembrete antes do horario
          </p>

          {/* Appointment Summary */}
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-left text-gray-800">
            <div className="mb-4 text-center">
              <p className="text-sm text-gray-500">Codigo do Agendamento</p>
              <p className="font-mono text-lg font-bold text-violet-600">
                #{appointmentId?.slice(-8).toUpperCase()}
              </p>
            </div>

            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-violet-500" />
                <span>{format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-violet-500" />
                <span>14:00</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-violet-500" />
                <span>Belezza.ai Salon</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6">
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/salon/client/appointments')}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white py-4 font-semibold text-green-600"
            >
              <Calendar className="h-5 w-5" />
              Meus Agendamentos
            </button>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: 'Agendamento Confirmado',
                    text: `Agendamento confirmado! Codigo: #${appointmentId?.slice(-8).toUpperCase()}`,
                  });
                }
              }}
              className="flex items-center justify-center rounded-xl bg-white/20 p-4 text-white"
            >
              <Share2 className="h-5 w-5" />
            </button>
          </div>

          <button
            onClick={() => router.push('/salon/dashboard')}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-white/30 py-4 font-semibold text-white"
          >
            <Home className="h-5 w-5" />
            Voltar ao Inicio
          </button>
        </div>

        {/* Install Banner */}
        {showInstallBanner && (
          <div className="fixed inset-x-0 bottom-0 z-50 p-4">
            <div className="mx-auto max-w-lg rounded-2xl bg-white p-4 shadow-xl">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100">
                  <Download className="h-6 w-6 text-violet-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    Instale o Belezza.ai
                  </h3>
                  <p className="text-sm text-gray-600">
                    Acesse rapidamente e receba notificacoes de lembretes
                  </p>
                </div>
                <button
                  onClick={() => setShowInstallBanner(false)}
                  className="text-gray-400"
                >
                  <span className="sr-only">Fechar</span>
                  &times;
                </button>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleInstall}
                  className="flex-1 rounded-xl bg-violet-500 py-3 font-semibold text-white"
                >
                  Instalar App
                </button>
                <button
                  onClick={() => setShowInstallBanner(false)}
                  className="rounded-xl px-4 py-3 text-gray-600"
                >
                  Agora nao
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <MobileBooking
      unitId={unitId}
      clientId={clientId || undefined}
      onComplete={handleBookingComplete}
      onCancel={() => router.back()}
    />
  );
}

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BookingPageContent />
    </Suspense>
  );
}
