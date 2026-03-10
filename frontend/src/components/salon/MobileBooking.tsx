'use client';

import { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  Scissors,
  ChevronLeft,
  ChevronRight,
  Check,
  MapPin,
  Bell,
} from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { appointmentService } from '@/services/salon/appointmentService';
import { serviceService } from '@/services/salon/serviceService';
import { professionalService } from '@/services/salon/professionalService';
import { notificationService } from '@/services/salon/notificationService';
import type { Service, Professional, TimeSlot } from '@/types/salon';

interface MobileBookingProps {
  unitId: string;
  clientId?: string;
  onComplete?: (appointmentId: string) => void;
  onCancel?: () => void;
}

type BookingStep = 'service' | 'professional' | 'date' | 'time' | 'confirm';

interface BookingData {
  services: Service[];
  professional: Professional | null;
  date: Date | null;
  time: string | null;
  notes: string;
}

export function MobileBooking({
  unitId,
  clientId,
  onComplete,
  onCancel,
}: MobileBookingProps) {
  const [step, setStep] = useState<BookingStep>('service');
  const [bookingData, setBookingData] = useState<BookingData>({
    services: [],
    professional: null,
    date: null,
    time: null,
    notes: '',
  });

  // Data states
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calendar state
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { locale: ptBR }));

  // Load services - tenta endpoint de cliente, depois público, depois admin
  useEffect(() => {
    const loadServices = async () => {
      setIsLoading(true);
      setError(null);
      try {
        let servicesList: Service[] = [];

        // Tenta endpoint de cliente autenticado primeiro
        if (clientId) {
          try {
            servicesList = await serviceService.listForClient(unitId);
          } catch {
            // Se falhar, tenta endpoint público
            servicesList = await serviceService.listPublic(unitId);
          }
        } else {
          // Para agendamento público, usa endpoint público
          try {
            servicesList = await serviceService.listPublic(unitId);
          } catch {
            // Fallback para getAll se público não existir
            servicesList = await serviceService.getAll({ unitId });
          }
        }

        setServices(servicesList);
      } catch (err) {
        console.error('[MobileBooking] Erro ao carregar servicos:', err);
        setError('Erro ao carregar servicos. Verifique sua conexao.');
      } finally {
        setIsLoading(false);
      }
    };

    loadServices();
  }, [unitId, clientId]);

  // Load professionals when services are selected
  useEffect(() => {
    if (bookingData.services.length === 0) return;

    const loadProfessionals = async () => {
      setIsLoading(true);
      try {
        const serviceIds = bookingData.services.map(s => s.id);
        const response = await professionalService.listByServices(serviceIds, unitId);
        setProfessionals(response);
      } catch (err) {
        setError('Erro ao carregar profissionais');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfessionals();
  }, [bookingData.services, unitId]);

  // Load available slots when date is selected
  useEffect(() => {
    if (!bookingData.date || !bookingData.professional) return;

    const loadSlots = async () => {
      setIsLoading(true);
      try {
        const response = await appointmentService.getAvailability({
          professionalId: bookingData.professional!.id,
          serviceIds: bookingData.services.map(s => s.id),
          date: bookingData.date!,
          unitId,
        });

        const professionalSlots = response.professionals.find(
          p => p.professionalId === bookingData.professional!.id
        );
        setAvailableSlots(professionalSlots?.slots || []);
      } catch (err) {
        setError('Erro ao carregar horarios');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSlots();
  }, [bookingData.date, bookingData.professional, bookingData.services, unitId]);

  // Toggle service selection
  const toggleService = (service: Service) => {
    setBookingData(prev => {
      const isSelected = prev.services.some(s => s.id === service.id);
      return {
        ...prev,
        services: isSelected
          ? prev.services.filter(s => s.id !== service.id)
          : [...prev.services, service],
      };
    });
  };

  // Calculate total
  const totalPrice = bookingData.services.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = bookingData.services.reduce((sum, s) => sum + s.durationMinutes, 0);

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  // Submit booking
  const handleSubmit = async () => {
    if (!clientId || !bookingData.professional || !bookingData.date || !bookingData.time) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const appointment = await appointmentService.create({
        clientId,
        professionalId: bookingData.professional.id,
        serviceIds: bookingData.services.map(s => s.id),
        date: bookingData.date,
        startTime: bookingData.time,
        source: 'online',
        clientNotes: bookingData.notes,
        unitId,
      });

      // Schedule reminders
      await notificationService.reminders.scheduleForAppointment(appointment.id, {
        dayBefore: true,
        hoursBefore: 2,
      });

      onComplete?.(appointment.id);
    } catch (err) {
      setError('Erro ao criar agendamento. Tente novamente.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Navigate steps
  const goNext = () => {
    const steps: BookingStep[] = ['service', 'professional', 'date', 'time', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const goBack = () => {
    const steps: BookingStep[] = ['service', 'professional', 'date', 'time', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    } else {
      onCancel?.();
    }
  };

  // Can proceed to next step
  const canProceed = () => {
    switch (step) {
      case 'service':
        return bookingData.services.length > 0;
      case 'professional':
        return bookingData.professional !== null;
      case 'date':
        return bookingData.date !== null;
      case 'time':
        return bookingData.time !== null;
      default:
        return true;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-violet-600 p-4 text-white">
        <div className="flex items-center gap-4">
          <button
            onClick={goBack}
            className="rounded-full p-2 hover:bg-violet-500"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-lg font-semibold">Novo Agendamento</h1>
            <p className="text-sm text-violet-200">
              {step === 'service' && 'Escolha os servicos'}
              {step === 'professional' && 'Escolha o profissional'}
              {step === 'date' && 'Escolha a data'}
              {step === 'time' && 'Escolha o horario'}
              {step === 'confirm' && 'Confirme seu agendamento'}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-4 flex gap-1">
          {['service', 'professional', 'date', 'time', 'confirm'].map((s, i) => (
            <div
              key={s}
              className={cn(
                'h-1 flex-1 rounded-full',
                i <= ['service', 'professional', 'date', 'time', 'confirm'].indexOf(step)
                  ? 'bg-white'
                  : 'bg-violet-400'
              )}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {error && (
          <div className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Service Selection */}
        {step === 'service' && (
          <div className="space-y-3">
            {services.map(service => (
              <button
                key={service.id}
                onClick={() => toggleService(service)}
                className={cn(
                  'flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all',
                  bookingData.services.some(s => s.id === service.id)
                    ? 'border-violet-500 bg-violet-50'
                    : 'border-gray-200 bg-white'
                )}
              >
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-full',
                    bookingData.services.some(s => s.id === service.id)
                      ? 'bg-violet-500 text-white'
                      : 'bg-gray-100 text-gray-500'
                  )}
                >
                  <Scissors className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{service.name}</h3>
                  <p className="text-sm text-gray-500">{service.durationMinutes} min</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    R$ {service.price.toFixed(2)}
                  </p>
                  {bookingData.services.some(s => s.id === service.id) && (
                    <Check className="ml-auto h-5 w-5 text-violet-500" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Professional Selection */}
        {step === 'professional' && (
          <div className="space-y-3">
            {professionals.map(professional => (
              <button
                key={professional.id}
                onClick={() =>
                  setBookingData(prev => ({ ...prev, professional }))
                }
                className={cn(
                  'flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all',
                  bookingData.professional?.id === professional.id
                    ? 'border-violet-500 bg-violet-50'
                    : 'border-gray-200 bg-white'
                )}
              >
                <div
                  className={cn(
                    'flex h-14 w-14 items-center justify-center rounded-full text-xl font-semibold',
                    bookingData.professional?.id === professional.id
                      ? 'bg-violet-500 text-white'
                      : 'bg-gray-100 text-gray-500'
                  )}
                >
                  {professional.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{professional.name}</h3>
                  <p className="text-sm text-gray-500">{professional.role}</p>
                </div>
                {bookingData.professional?.id === professional.id && (
                  <Check className="h-6 w-6 text-violet-500" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Date Selection */}
        {step === 'date' && (
          <div>
            {/* Week navigation */}
            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}
                className="rounded-full p-2 hover:bg-gray-100"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="font-medium">
                {format(currentWeekStart, 'MMMM yyyy', { locale: ptBR })}
              </span>
              <button
                onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}
                className="rounded-full p-2 hover:bg-gray-100"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Week days */}
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map(day => {
                const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));
                const isSelected = bookingData.date && isSameDay(day, bookingData.date);
                const isToday = isSameDay(day, new Date());

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => !isPast && setBookingData(prev => ({ ...prev, date: day, time: null }))}
                    disabled={isPast}
                    className={cn(
                      'flex flex-col items-center rounded-xl p-3 transition-all',
                      isPast && 'cursor-not-allowed opacity-40',
                      isSelected
                        ? 'bg-violet-500 text-white'
                        : isToday
                        ? 'border-2 border-violet-500 bg-white'
                        : 'bg-white hover:bg-gray-50'
                    )}
                  >
                    <span className="text-xs uppercase">
                      {format(day, 'EEE', { locale: ptBR })}
                    </span>
                    <span className="mt-1 text-lg font-semibold">
                      {format(day, 'd')}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected date display */}
            {bookingData.date && (
              <div className="mt-4 rounded-xl bg-violet-50 p-4 text-center">
                <Calendar className="mx-auto h-8 w-8 text-violet-500" />
                <p className="mt-2 font-medium text-violet-900">
                  {format(bookingData.date, "EEEE, d 'de' MMMM", { locale: ptBR })}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Time Selection */}
        {step === 'time' && (
          <div>
            <div className="mb-4 flex items-center gap-2 text-gray-600">
              <Clock className="h-5 w-5" />
              <span>Horarios disponiveis</span>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-500" />
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="rounded-xl bg-gray-100 p-8 text-center">
                <Clock className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-600">
                  Nenhum horario disponivel para esta data
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {availableSlots
                  .filter(slot => slot.available)
                  .map(slot => (
                    <button
                      key={slot.time}
                      onClick={() =>
                        setBookingData(prev => ({ ...prev, time: slot.time }))
                      }
                      className={cn(
                        'rounded-xl py-3 text-center font-medium transition-all',
                        bookingData.time === slot.time
                          ? 'bg-violet-500 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      )}
                    >
                      {slot.time}
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Confirmation */}
        {step === 'confirm' && (
          <div className="space-y-4">
            {/* Summary Card */}
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <h3 className="mb-4 font-semibold text-gray-900">
                Resumo do Agendamento
              </h3>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Scissors className="h-5 w-5 text-violet-500" />
                  <div>
                    <p className="text-sm text-gray-500">Servicos</p>
                    {bookingData.services.map(s => (
                      <p key={s.id} className="font-medium">{s.name}</p>
                    ))}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-violet-500" />
                  <div>
                    <p className="text-sm text-gray-500">Profissional</p>
                    <p className="font-medium">{bookingData.professional?.name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-violet-500" />
                  <div>
                    <p className="text-sm text-gray-500">Data e Hora</p>
                    <p className="font-medium">
                      {bookingData.date &&
                        format(bookingData.date, "d 'de' MMMM", { locale: ptBR })} as{' '}
                      {bookingData.time}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-violet-500" />
                  <div>
                    <p className="text-sm text-gray-500">Duracao</p>
                    <p className="font-medium">{totalDuration} minutos</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t pt-4">
                <div className="flex items-center justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span className="text-violet-600">
                    R$ {totalPrice.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Reminder notice */}
            <div className="flex items-center gap-3 rounded-xl bg-violet-50 p-4">
              <Bell className="h-6 w-6 text-violet-500" />
              <div>
                <p className="font-medium text-violet-900">Lembretes</p>
                <p className="text-sm text-violet-700">
                  Voce recebera lembretes 1 dia e 2 horas antes do agendamento
                </p>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Observacoes (opcional)
              </label>
              <textarea
                value={bookingData.notes}
                onChange={e =>
                  setBookingData(prev => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Alguma observacao especial?"
                className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                rows={3}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 border-t bg-white p-4">
        {bookingData.services.length > 0 && step !== 'confirm' && (
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-gray-600">
              {bookingData.services.length} servico(s) - {totalDuration} min
            </span>
            <span className="font-semibold text-violet-600">
              R$ {totalPrice.toFixed(2)}
            </span>
          </div>
        )}

        <button
          onClick={step === 'confirm' ? handleSubmit : goNext}
          disabled={!canProceed() || isLoading}
          className={cn(
            'w-full rounded-xl py-4 font-semibold transition-all',
            canProceed() && !isLoading
              ? 'bg-violet-500 text-white hover:bg-violet-600'
              : 'cursor-not-allowed bg-gray-200 text-gray-500'
          )}
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Processando...</span>
            </div>
          ) : step === 'confirm' ? (
            'Confirmar Agendamento'
          ) : (
            'Continuar'
          )}
        </button>
      </div>
    </div>
  );
}
