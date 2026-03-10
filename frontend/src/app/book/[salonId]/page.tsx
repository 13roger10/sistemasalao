"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Scissors,
  ChevronLeft,
  ChevronRight,
  Check,
  ArrowLeft,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  Star,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Service } from "@/types/salon/service";
import type { Professional } from "@/types/salon/professional";
import type { TimeSlot } from "@/types/salon/appointment";

// ===== TIPOS =====
interface Step {
  id: number;
  title: string;
  completed: boolean;
}

interface BookingData {
  services: Service[];
  professional: Professional | null;
  date: Date | null;
  time: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  notes: string;
}

// ===== COMPONENTES =====

// Step Indicator
const StepIndicator = ({ steps, currentStep }: { steps: Step[]; currentStep: number }) => (
  <div className="mb-8">
    <div className="flex items-center justify-center">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-colors ${
              step.completed
                ? "bg-violet-500 text-white"
                : currentStep === step.id
                ? "border-2 border-violet-500 text-violet-500"
                : "border-2 border-gray-300 text-gray-400"
            }`}
          >
            {step.completed ? <Check className="h-5 w-5" /> : step.id}
          </div>
          {index < steps.length - 1 && (
            <div
              className={`h-1 w-16 sm:w-24 ${
                step.completed ? "bg-violet-500" : "bg-gray-300"
              }`}
            />
          )}
        </div>
      ))}
    </div>
    <div className="mt-2 flex justify-center">
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
        {steps[currentStep - 1]?.title}
      </span>
    </div>
  </div>
);

// Service Card
const ServiceCard = ({
  service,
  selected,
  onToggle,
}: {
  service: Service;
  selected: boolean;
  onToggle: () => void;
}) => {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  return (
    <button
      onClick={onToggle}
      className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
        selected
          ? "border-violet-500 bg-violet-50 dark:border-violet-400 dark:bg-violet-900/20"
          : "border-gray-200 bg-white hover:border-violet-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-violet-600"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 dark:text-white">{service.name}</h3>
          {service.description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{service.description}</p>
          )}
          <div className="mt-2 flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
              <Clock className="h-4 w-4" />
              {formatDuration(service.durationMinutes)}
            </span>
            <span className="font-semibold text-violet-600 dark:text-violet-400">
              {service.promotionalPrice ? (
                <>
                  <span className="mr-1 text-gray-400 line-through">
                    {formatCurrency(service.price)}
                  </span>
                  {formatCurrency(service.promotionalPrice)}
                </>
              ) : (
                formatCurrency(service.price)
              )}
            </span>
          </div>
        </div>
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
            selected
              ? "border-violet-500 bg-violet-500 text-white"
              : "border-gray-300 dark:border-gray-600"
          }`}
        >
          {selected && <Check className="h-4 w-4" />}
        </div>
      </div>
    </button>
  );
};

// Professional Card
const ProfessionalCard = ({
  professional,
  selected,
  onSelect,
}: {
  professional: Professional;
  selected: boolean;
  onSelect: () => void;
}) => (
  <button
    onClick={onSelect}
    className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
      selected
        ? "border-violet-500 bg-violet-50 dark:border-violet-400 dark:bg-violet-900/20"
        : "border-gray-200 bg-white hover:border-violet-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-violet-600"
    }`}
  >
    <div className="flex items-center gap-4">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-semibold text-white"
        style={{ backgroundColor: professional.color || "#8B5CF6" }}
      >
        {professional.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1">
        <h3 className="font-medium text-gray-900 dark:text-white">{professional.name}</h3>
        {professional.specialties && professional.specialties.length > 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {professional.specialties.join(", ")}
          </p>
        )}
        <div className="mt-1 flex items-center gap-1">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {professional.averageRating.toFixed(1)}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({professional.totalReviews} avaliações)
          </span>
        </div>
      </div>
      <div
        className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
          selected
            ? "border-violet-500 bg-violet-500 text-white"
            : "border-gray-300 dark:border-gray-600"
        }`}
      >
        {selected && <Check className="h-4 w-4" />}
      </div>
    </div>
  </button>
);

// Calendar Day
const CalendarDay = ({
  date,
  selected,
  disabled,
  today,
  onClick,
}: {
  date: Date;
  selected: boolean;
  disabled: boolean;
  today: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
      selected
        ? "bg-violet-500 text-white"
        : disabled
        ? "cursor-not-allowed text-gray-300 dark:text-gray-600"
        : today
        ? "border border-violet-500 text-violet-500"
        : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
    }`}
  >
    {date.getDate()}
  </button>
);

// Time Slot Button
const TimeSlotButton = ({
  time,
  selected,
  disabled,
  onClick,
}: {
  time: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
      selected
        ? "bg-violet-500 text-white"
        : disabled
        ? "cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600"
        : "border border-gray-300 bg-white text-gray-700 hover:border-violet-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-violet-500"
    }`}
  >
    {time}
  </button>
);

// ===== PÁGINA PRINCIPAL =====
export default function PublicBookingPage() {
  const params = useParams();
  const router = useRouter();
  const salonId = params.salonId as string;

  // Estados do wizard
  const [currentStep, setCurrentStep] = useState(1);
  const [bookingData, setBookingData] = useState<BookingData>({
    services: [],
    professional: null,
    date: null,
    time: "",
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    notes: "",
  });

  // Dados do salão
  const [salonInfo, setSalonInfo] = useState({
    name: "Belezza Salão & Barbearia",
    address: "Rua das Flores, 123 - Centro",
    phone: "(11) 3333-4444",
    email: "contato@belezza.com.br",
  });

  // Dados de serviços e profissionais
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingCode, setBookingCode] = useState("");

  // Estado do calendário
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Steps
  const steps: Step[] = [
    { id: 1, title: "Serviços", completed: currentStep > 1 },
    { id: 2, title: "Profissional", completed: currentStep > 2 },
    { id: 3, title: "Data e Hora", completed: currentStep > 3 },
    { id: 4, title: "Seus Dados", completed: currentStep > 4 },
    { id: 5, title: "Confirmação", completed: bookingSuccess },
  ];

  // Funções auxiliares
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  // Carregar dados
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Mock data
        setServices([
          { id: "1", name: "Corte Masculino", description: "Corte tradicional masculino", categoryId: "1", price: 50, durationMinutes: 30, commissionPercentage: 50, status: "active", showInOnlineBooking: true, requiresConfirmation: false, usesStock: false, loyaltyPointsEarned: 10, unitIds: [], totalBookings: 150, averageRating: 4.8, createdAt: new Date(), updatedAt: new Date() },
          { id: "2", name: "Barba", description: "Barba com navalha e toalha quente", categoryId: "2", price: 35, durationMinutes: 25, commissionPercentage: 50, status: "active", showInOnlineBooking: true, requiresConfirmation: false, usesStock: false, loyaltyPointsEarned: 8, unitIds: [], totalBookings: 120, averageRating: 4.9, createdAt: new Date(), updatedAt: new Date() },
          { id: "3", name: "Limpeza de Pele", description: "Limpeza facial profunda com hidratação", categoryId: "3", price: 120, durationMinutes: 60, commissionPercentage: 40, status: "active", showInOnlineBooking: true, requiresConfirmation: true, usesStock: true, loyaltyPointsEarned: 20, unitIds: [], totalBookings: 45, averageRating: 4.7, createdAt: new Date(), updatedAt: new Date() },
          { id: "4", name: "Corte + Barba", description: "Combo corte masculino com barba completa", categoryId: "1", price: 75, promotionalPrice: 70, durationMinutes: 50, commissionPercentage: 50, status: "active", showInOnlineBooking: true, requiresConfirmation: false, usesStock: false, loyaltyPointsEarned: 15, unitIds: [], totalBookings: 200, averageRating: 4.9, createdAt: new Date(), updatedAt: new Date() },
        ] as Service[]);

        setProfessionals([
          { id: "1", userId: "1", name: "Carlos", email: "carlos@salon.com", phone: "(11) 88888-1111", status: "active", serviceIds: ["1", "2", "4"], specialties: ["Corte", "Barba"], commissionType: "percentage", commissionValue: 50, schedule: { days: [] }, averageRating: 4.8, totalReviews: 50, totalAppointments: 200, totalRevenue: 10000, unitIds: ["1"], primaryUnitId: "1", acceptsOnlineBooking: true, showInPublicProfile: true, color: "#8B5CF6", createdAt: new Date(), updatedAt: new Date() },
          { id: "2", userId: "2", name: "Ana", email: "ana@salon.com", phone: "(11) 88888-2222", status: "active", serviceIds: ["3"], specialties: ["Estética Facial"], commissionType: "percentage", commissionValue: 40, schedule: { days: [] }, averageRating: 4.9, totalReviews: 80, totalAppointments: 300, totalRevenue: 15000, unitIds: ["1"], primaryUnitId: "1", acceptsOnlineBooking: true, showInPublicProfile: true, color: "#EC4899", createdAt: new Date(), updatedAt: new Date() },
          { id: "3", userId: "3", name: "Roberto", email: "roberto@salon.com", phone: "(11) 88888-3333", status: "active", serviceIds: ["1", "2", "4"], specialties: ["Corte Moderno"], commissionType: "percentage", commissionValue: 50, schedule: { days: [] }, averageRating: 4.7, totalReviews: 30, totalAppointments: 150, totalRevenue: 8000, unitIds: ["1"], primaryUnitId: "1", acceptsOnlineBooking: true, showInPublicProfile: true, color: "#10B981", createdAt: new Date(), updatedAt: new Date() },
        ]);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [salonId]);

  // Carregar horários disponíveis
  useEffect(() => {
    if (bookingData.professional && bookingData.date) {
      // Mock available slots
      const slots: TimeSlot[] = [];
      const occupiedTimes = ["10:00", "14:30", "16:00"];

      for (let h = 8; h <= 19; h++) {
        for (const m of ["00", "30"]) {
          const time = `${h.toString().padStart(2, "0")}:${m}`;
          slots.push({
            time,
            available: !occupiedTimes.includes(time),
          });
        }
      }
      setAvailableSlots(slots);
    }
  }, [bookingData.professional, bookingData.date]);

  // Filtrar profissionais pelos serviços selecionados
  const filteredProfessionals = useMemo(() => {
    if (bookingData.services.length === 0) return professionals;

    return professionals.filter((prof) =>
      bookingData.services.every((service) => prof.serviceIds.includes(service.id))
    );
  }, [bookingData.services, professionals]);

  // Calcular totais
  const totals = useMemo(() => {
    const price = bookingData.services.reduce(
      (acc, s) => acc + (s.promotionalPrice || s.price),
      0
    );
    const duration = bookingData.services.reduce(
      (acc, s) => acc + s.durationMinutes,
      0
    );
    return { price, duration };
  }, [bookingData.services]);

  // Gerar dias do calendário
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: { date: Date; disabled: boolean; today: boolean }[] = [];

    // Preencher dias anteriores
    for (let i = 0; i < firstDay.getDay(); i++) {
      const date = new Date(year, month, -(firstDay.getDay() - 1 - i));
      days.push({ date, disabled: true, today: false });
    }

    // Dias do mês
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      const isPast = date < today;
      const isSunday = date.getDay() === 0;
      days.push({
        date,
        disabled: isPast || isSunday,
        today: date.getTime() === today.getTime(),
      });
    }

    return days;
  }, [calendarMonth]);

  // Handlers
  const toggleService = (service: Service) => {
    const isSelected = bookingData.services.some((s) => s.id === service.id);
    if (isSelected) {
      setBookingData({
        ...bookingData,
        services: bookingData.services.filter((s) => s.id !== service.id),
      });
    } else {
      setBookingData({
        ...bookingData,
        services: [...bookingData.services, service],
      });
    }
  };

  const selectProfessional = (professional: Professional) => {
    setBookingData({
      ...bookingData,
      professional: bookingData.professional?.id === professional.id ? null : professional,
      date: null,
      time: "",
    });
  };

  const selectDate = (date: Date) => {
    setBookingData({
      ...bookingData,
      date,
      time: "",
    });
  };

  const selectTime = (time: string) => {
    setBookingData({ ...bookingData, time });
  };

  const nextStep = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Simular envio
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setBookingCode(`BEL${Date.now().toString().slice(-6)}`);
      setBookingSuccess(true);
      setCurrentStep(5);
    } catch (error) {
      console.error("Erro ao criar agendamento:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Validações
  const canProceedStep1 = bookingData.services.length > 0;
  const canProceedStep2 = bookingData.professional !== null;
  const canProceedStep3 = bookingData.date !== null && bookingData.time !== "";
  const canProceedStep4 =
    bookingData.clientName.trim() !== "" && bookingData.clientPhone.trim() !== "";

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Scissors className="mx-auto h-12 w-12 animate-pulse text-violet-500" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-500">
              <Scissors className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {salonInfo.name}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Agendamento Online</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* Step Indicator */}
        <StepIndicator steps={steps} currentStep={currentStep} />

        {/* Step 1: Serviços */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Escolha os serviços
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                Selecione um ou mais serviços para agendar
              </p>
            </div>

            <div className="space-y-3">
              {services
                .filter((s) => s.status === "active" && s.showInOnlineBooking)
                .map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    selected={bookingData.services.some((s) => s.id === service.id)}
                    onToggle={() => toggleService(service)}
                  />
                ))}
            </div>

            {bookingData.services.length > 0 && (
              <div className="rounded-lg bg-violet-50 p-4 dark:bg-violet-900/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {bookingData.services.length} serviço
                      {bookingData.services.length > 1 ? "s" : ""} selecionado
                      {bookingData.services.length > 1 ? "s" : ""}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Duração total: {formatDuration(totals.duration)}
                    </p>
                  </div>
                  <p className="text-xl font-bold text-violet-600 dark:text-violet-400">
                    {formatCurrency(totals.price)}
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={nextStep} disabled={!canProceedStep1} rightIcon={<ArrowRight className="h-4 w-4" />}>
                Continuar
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Profissional */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Escolha o profissional
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                Selecione quem irá atendê-lo
              </p>
            </div>

            <div className="space-y-3">
              {filteredProfessionals.map((professional) => (
                <ProfessionalCard
                  key={professional.id}
                  professional={professional}
                  selected={bookingData.professional?.id === professional.id}
                  onSelect={() => selectProfessional(professional)}
                />
              ))}
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={prevStep} leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Voltar
              </Button>
              <Button onClick={nextStep} disabled={!canProceedStep2} rightIcon={<ArrowRight className="h-4 w-4" />}>
                Continuar
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Data e Hora */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Escolha a data e horário
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                Selecione quando deseja ser atendido
              </p>
            </div>

            {/* Calendário */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-4 flex items-center justify-between">
                <button
                  onClick={() =>
                    setCalendarMonth(
                      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1)
                    )
                  }
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="font-medium text-gray-900 dark:text-white capitalize">
                  {calendarMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                </span>
                <button
                  onClick={() =>
                    setCalendarMonth(
                      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1)
                    )
                  }
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                  <div key={day} className="py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => (
                  <CalendarDay
                    key={index}
                    date={day.date}
                    selected={
                      bookingData.date?.toDateString() === day.date.toDateString()
                    }
                    disabled={day.disabled}
                    today={day.today}
                    onClick={() => !day.disabled && selectDate(day.date)}
                  />
                ))}
              </div>
            </div>

            {/* Horários */}
            {bookingData.date && (
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Horários disponíveis em{" "}
                  {bookingData.date.toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </h3>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {availableSlots.map((slot) => (
                    <TimeSlotButton
                      key={slot.time}
                      time={slot.time}
                      selected={bookingData.time === slot.time}
                      disabled={!slot.available}
                      onClick={() => selectTime(slot.time)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="ghost" onClick={prevStep} leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Voltar
              </Button>
              <Button onClick={nextStep} disabled={!canProceedStep3} rightIcon={<ArrowRight className="h-4 w-4" />}>
                Continuar
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Dados do Cliente */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Seus dados
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                Informe seus dados para confirmar o agendamento
              </p>
            </div>

            <div className="space-y-4">
              <Input
                label="Nome completo *"
                value={bookingData.clientName}
                onChange={(e) =>
                  setBookingData({ ...bookingData, clientName: e.target.value })
                }
                placeholder="Seu nome"
                leftIcon={<User className="h-4 w-4" />}
              />

              <Input
                label="Telefone / WhatsApp *"
                value={bookingData.clientPhone}
                onChange={(e) =>
                  setBookingData({ ...bookingData, clientPhone: e.target.value })
                }
                placeholder="(00) 00000-0000"
                leftIcon={<Phone className="h-4 w-4" />}
              />

              <Input
                label="E-mail (opcional)"
                type="email"
                value={bookingData.clientEmail}
                onChange={(e) =>
                  setBookingData({ ...bookingData, clientEmail: e.target.value })
                }
                placeholder="seu@email.com"
                leftIcon={<Mail className="h-4 w-4" />}
              />

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Observações (opcional)
                </label>
                <textarea
                  value={bookingData.notes}
                  onChange={(e) =>
                    setBookingData({ ...bookingData, notes: e.target.value })
                  }
                  placeholder="Alguma preferência ou informação adicional?"
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
                />
              </div>
            </div>

            {/* Resumo */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-3 font-medium text-gray-900 dark:text-white">Resumo do agendamento</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Serviços:</span>
                  <span className="text-gray-900 dark:text-white">
                    {bookingData.services.map((s) => s.name).join(", ")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Profissional:</span>
                  <span className="text-gray-900 dark:text-white">
                    {bookingData.professional?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Data:</span>
                  <span className="text-gray-900 dark:text-white">
                    {bookingData.date?.toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Horário:</span>
                  <span className="text-gray-900 dark:text-white">{bookingData.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Duração:</span>
                  <span className="text-gray-900 dark:text-white">
                    {formatDuration(totals.duration)}
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-2 dark:border-gray-700">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-900 dark:text-white">Total:</span>
                    <span className="text-lg font-bold text-violet-600 dark:text-violet-400">
                      {formatCurrency(totals.price)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={prevStep} leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Voltar
              </Button>
              <Button onClick={handleSubmit} disabled={!canProceedStep4} isLoading={isSubmitting}>
                Confirmar Agendamento
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Confirmação */}
        {currentStep === 5 && bookingSuccess && (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-500 dark:bg-green-900/30 dark:text-green-400">
                <Check className="h-10 w-10" />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Agendamento Confirmado!
              </h2>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                Seu código de agendamento é:
              </p>
              <p className="mt-1 text-2xl font-bold text-violet-600 dark:text-violet-400">
                {bookingCode}
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6 text-left dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 font-medium text-gray-900 dark:text-white">
                Detalhes do agendamento
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <Scissors className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-900 dark:text-white">
                    {bookingData.services.map((s) => s.name).join(", ")}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-900 dark:text-white">
                    {bookingData.professional?.name}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-900 dark:text-white">
                    {bookingData.date?.toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-900 dark:text-white">{bookingData.time}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-900 dark:text-white">{salonInfo.address}</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-yellow-50 p-4 text-left dark:bg-yellow-900/20">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Importante:</strong> Em caso de imprevistos, por favor entre em contato
                conosco com pelo menos 2 horas de antecedência.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                variant="secondary"
                onClick={() => {
                  const message = encodeURIComponent(
                    `Olá! Acabei de fazer um agendamento.\n\n` +
                    `Código: ${bookingCode}\n` +
                    `Data: ${bookingData.date?.toLocaleDateString("pt-BR")}\n` +
                    `Horário: ${bookingData.time}`
                  );
                  window.open(`https://wa.me/55${salonInfo.phone.replace(/\D/g, "")}?text=${message}`, "_blank");
                }}
                leftIcon={<MessageCircle className="h-4 w-4" />}
              >
                Enviar WhatsApp
              </Button>
              <Button
                onClick={() => {
                  setBookingSuccess(false);
                  setCurrentStep(1);
                  setBookingData({
                    services: [],
                    professional: null,
                    date: null,
                    time: "",
                    clientName: "",
                    clientPhone: "",
                    clientEmail: "",
                    notes: "",
                  });
                }}
              >
                Fazer Novo Agendamento
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {salonInfo.name} • {salonInfo.address}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {salonInfo.phone} • {salonInfo.email}
          </p>
        </div>
      </footer>
    </div>
  );
}
