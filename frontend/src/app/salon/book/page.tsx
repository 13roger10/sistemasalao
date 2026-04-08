"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Users,
  Scissors,
  ChevronLeft,
  ChevronRight,
  Check,
  CheckCircle,
  Plus,
  X,
  AlertTriangle,
  Search,
} from "lucide-react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SalonLayout } from "@/components/layout/SalonLayout";
import { Button } from "@/components/ui/Button";
import { appointmentService } from "@/services/salon/appointmentService";
import { serviceService } from "@/services/salon/serviceService";
import { professionalService } from "@/services/salon/professionalService";
import { useSalonAuth } from "@/contexts/SalonAuthContext";
import { useUnit } from "@/contexts/UnitContext";
import { cn } from "@/lib/utils";
import type { Service, Professional, TimeSlot, Client } from "@/types/salon";

// ===== TIPOS =====
type BookingStep = "service" | "professional" | "datetime" | "confirm";

interface BookingData {
  client: Client | null;
  services: Service[];
  professional: Professional | null;
  date: Date | null;
  time: string | null;
  notes: string;
}

// ===== COMPONENTES AUXILIARES =====

// Card de Estatisticas
const StatsCard = ({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) => (
  <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
    <div className="flex items-center gap-3">
      <div className={`rounded-lg p-2 ${color}`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-xl font-semibold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  </div>
);

// Step Indicator
const StepIndicator = ({
  steps,
  currentStep,
  onStepClick,
}: {
  steps: { id: BookingStep; label: string; icon: React.ReactNode }[];
  currentStep: BookingStep;
  onStepClick?: (step: BookingStep) => void;
}) => {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = step.id === currentStep;
        const isClickable = onStepClick && index < currentIndex;

        return (
          <div key={step.id} className="flex items-center">
            <button
              onClick={() => isClickable && onStepClick(step.id)}
              disabled={!isClickable}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isCompleted && "text-green-600 dark:text-green-400",
                isCurrent && "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
                !isCompleted && !isCurrent && "text-gray-400 dark:text-gray-500",
                isClickable && "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  isCompleted && "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
                  isCurrent && "bg-violet-500 text-white",
                  !isCompleted && !isCurrent && "bg-gray-200 text-gray-500 dark:bg-gray-700"
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </button>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "mx-2 h-0.5 w-8",
                  index < currentIndex ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

// ===== COMPONENTE PRINCIPAL =====
function BookingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSalonAuth();
  const { selectedUnitId } = useUnit();
  const unitId = searchParams.get("unit") || selectedUnitId || "1";

  // States
  const [step, setStep] = useState<BookingStep>("service");
  const [bookingData, setBookingData] = useState<BookingData>({
    client: user ? { id: user.id, name: user.name, email: user.email, phone: user.phone } as Client : null,
    services: [],
    professional: null,
    date: null,
    time: null,
    notes: "",
  });

  // Data states
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [serviceSearch, setServiceSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Categorias disponíveis baseadas no TipoServico do backend
  // Os categoryIds numéricos são mapeados pelo serviceService
  const serviceCategories = [
    { id: "1", name: "Cabelo", icon: "✂️", names: ["Cabelo", "CABELO"] },
    { id: "2", name: "Barba", icon: "🧔", names: ["Barba", "BARBA"] },
    { id: "3", name: "Estética", icon: "✨", names: ["Estética", "Estetica", "ESTETICA"] },
    { id: "4", name: "Unha", icon: "💅", names: ["Unha", "UNHA"] },
    { id: "5", name: "Maquiagem", icon: "💄", names: ["Maquiagem", "MAQUIAGEM"] },
    { id: "6", name: "Depilação", icon: "🌸", names: ["Depilação", "Depilacao", "DEPILACAO"] },
    { id: "7", name: "Sobrancelha", icon: "👁️", names: ["Sobrancelha", "SOBRANCELHA"] },
    { id: "8", name: "Massagem", icon: "💆", names: ["Massagem", "MASSAGEM"] },
    { id: "9", name: "Outro", icon: "📦", names: ["Outro", "OUTRO"] },
  ];

  // Função helper para verificar se um serviço pertence a uma categoria
  const matchesCategory = (service: Service, categoryId: string) => {
    const category = serviceCategories.find(c => c.id === categoryId);
    if (!category) return false;
    return service.categoryId === categoryId ||
           category.names.some(name => service.category?.name === name);
  };

  // Calendar state
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { locale: ptBR }));

  // Set logged user as client
  useEffect(() => {
    if (user) {
      setBookingData((prev) => ({
        ...prev,
        client: { id: user.id, name: user.name, email: user.email, phone: user.phone } as Client,
      }));
    }
  }, [user]);

  // Load services
  useEffect(() => {
    const loadServices = async () => {
      setIsLoading(true);
      try {
        const response = await serviceService.getAll({ unitId, status: "active" });
        setServices(response || []);
      } catch (err) {
        console.error("Erro ao carregar servicos:", err);
        setError("Erro ao carregar servicos");
      } finally {
        setIsLoading(false);
      }
    };
    loadServices();
  }, [unitId]);

  // Load professionals when services are selected
  useEffect(() => {
    console.log("[Booking] useEffect for professionals triggered. Services count:", bookingData.services.length);
    if (bookingData.services.length === 0) {
      console.log("[Booking] No services selected, clearing professionals");
      setProfessionals([]);
      return;
    }

    const loadProfessionals = async () => {
      setIsLoading(true);
      try {
        const serviceIds = bookingData.services.map((s) => s.id);
        console.log("[Booking] Loading professionals for serviceIds:", serviceIds);
        const response = await professionalService.listByServices(serviceIds, unitId);
        console.log("[Booking] Professionals loaded:", response.length, response.map(p => p.name));
        setProfessionals(response);
      } catch (err) {
        console.error("[Booking] Error loading professionals:", err);
        setError("Erro ao carregar profissionais");
      } finally {
        setIsLoading(false);
      }
    };

    loadProfessionals();
  }, [bookingData.services, unitId]);

  // Load available slots when date and professional are selected
  useEffect(() => {
    if (!bookingData.date || !bookingData.professional) return;

    const loadSlots = async () => {
      setIsLoading(true);
      try {
        const response = await appointmentService.getAvailability({
          professionalId: bookingData.professional!.id,
          serviceIds: bookingData.services.map((s) => s.id),
          date: bookingData.date!,
          unitId,
        });

        const professionalSlots = response.professionals.find(
          (p: { professionalId: string }) => p.professionalId === bookingData.professional!.id
        );
        setAvailableSlots(professionalSlots?.slots || []);
      } catch (err) {
        setError("Erro ao carregar horarios");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSlots();
  }, [bookingData.date, bookingData.professional, bookingData.services, unitId]);

  // Calculate totals
  const totalPrice = bookingData.services.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = bookingData.services.reduce((sum, s) => sum + s.durationMinutes, 0);

  // Week days
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  // Toggle service
  const toggleService = (service: Service) => {
    console.log("[Booking] toggleService called:", service.id, service.name);
    setBookingData((prev) => {
      const isSelected = prev.services.some((s) => s.id === service.id);
      const newServices = isSelected
        ? prev.services.filter((s) => s.id !== service.id)
        : [...prev.services, service];
      console.log("[Booking] Services after toggle:", newServices.length, newServices.map(s => s.name));
      return {
        ...prev,
        services: newServices,
        professional: null, // Reset professional when services change
      };
    });
  };

  // Navigate steps
  const goNext = () => {
    console.log("[Booking] goNext called. Current step:", step);
    console.log("[Booking] canProceed:", canProceed());
    console.log("[Booking] bookingData.services:", bookingData.services.length);

    if (!canProceed()) {
      console.log("[Booking] Cannot proceed - button should be disabled");
      return;
    }

    const steps: BookingStep[] = ["service", "professional", "datetime", "confirm"];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1];
      console.log("[Booking] Moving to step:", nextStep);
      setStep(nextStep);
      // Scroll para o topo quando mudar de step
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const goBack = () => {
    const steps: BookingStep[] = ["service", "professional", "datetime", "confirm"];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  // Can proceed
  const canProceed = () => {
    switch (step) {
      case "service":
        return bookingData.services.length > 0;
      case "professional":
        return bookingData.professional !== null;
      case "datetime":
        return bookingData.date !== null && bookingData.time !== null;
      default:
        return true;
    }
  };

  // Submit booking
  const handleSubmit = async () => {
    // Verifica se o usuário está logado
    if (!user) {
      // Redireciona para login e volta para esta página
      router.push(`/salon/login?redirect=/salon/book`);
      return;
    }

    if (!bookingData.professional || !bookingData.date || !bookingData.time) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Debug: mostra dados do usuário e do agendamento
      console.log('[handleSubmit] User:', user);
      console.log('[handleSubmit] BookingData:', {
        professionalId: bookingData.professional.id,
        serviceIds: bookingData.services.map((s) => s.id),
        date: bookingData.date,
        time: bookingData.time,
      });

      // Não enviar clientId - o backend usará o email do token para identificar/criar o cliente
      const appointment = await appointmentService.create({
        professionalId: bookingData.professional.id,
        serviceIds: bookingData.services.map((s) => s.id),
        date: bookingData.date,
        startTime: bookingData.time,
        source: "online",
        clientNotes: bookingData.notes,
        unitId,
      });

      setAppointmentId(appointment.id);
      setBookingComplete(true);
    } catch (err: unknown) {
      // Mostra a mensagem real do erro
      const errorMessage = err instanceof Error ? err.message : "Erro ao criar agendamento";
      setError(errorMessage);
      console.error('[handleSubmit] Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset booking
  const resetBooking = () => {
    setBookingData({
      client: user ? { id: user.id, name: user.name, email: user.email, phone: user.phone } as Client : null,
      services: [],
      professional: null,
      date: null,
      time: null,
      notes: "",
    });
    setStep("service");
    setBookingComplete(false);
    setAppointmentId(null);
  };

  // Steps config
  const stepsConfig: { id: BookingStep; label: string; icon: React.ReactNode }[] = [
    { id: "service", label: "Servicos", icon: <Scissors className="h-4 w-4" /> },
    { id: "professional", label: "Profissional", icon: <Users className="h-4 w-4" /> },
    { id: "datetime", label: "Data/Hora", icon: <CalendarIcon className="h-4 w-4" /> },
    { id: "confirm", label: "Confirmar", icon: <Check className="h-4 w-4" /> },
  ];

  // Success screen
  if (bookingComplete) {
    return (
      <SalonLayout>
        <div className="flex min-h-[70vh] flex-col items-center justify-center">
          <div className="mx-auto max-w-md text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mx-auto dark:bg-green-900/30">
              <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>

            <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
              Agendamento Confirmado!
            </h1>
            <p className="mb-6 text-gray-500 dark:text-gray-400">
              O cliente recebera uma notificacao de confirmacao
            </p>

            <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 text-left dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-4 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">Codigo do Agendamento</p>
                <p className="font-mono text-lg font-bold text-violet-600 dark:text-violet-400">
                  #{appointmentId?.slice(-8).toUpperCase()}
                </p>
              </div>

              <div className="space-y-3 border-t border-gray-200 pt-4 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-violet-500" />
                  <span className="text-gray-900 dark:text-white">{bookingData.client?.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Scissors className="h-5 w-5 text-violet-500" />
                  <span className="text-gray-900 dark:text-white">
                    {bookingData.services.map((s) => s.name).join(", ")}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-violet-500" />
                  <span className="text-gray-900 dark:text-white">{bookingData.professional?.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-5 w-5 text-violet-500" />
                  <span className="text-gray-900 dark:text-white">
                    {bookingData.date && format(bookingData.date, "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-violet-500" />
                  <span className="text-gray-900 dark:text-white">{bookingData.time}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => router.push(user?.role === 'CLIENT' ? "/salon/client/appointments" : "/salon/appointments")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                Ver Agenda
              </Button>
              <Button className="flex-1" onClick={resetBooking}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Agendamento
              </Button>
            </div>
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Novo Agendamento</h1>
            <p className="text-gray-500 dark:text-gray-400">Crie um novo agendamento para um cliente</p>
          </div>
          <Button variant="outline" onClick={() => router.push("/salon/appointments")}>
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
        </div>

        {/* Progress Steps */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <StepIndicator
            steps={stepsConfig}
            currentStep={step}
            onStepClick={(s) => {
              const currentIndex = stepsConfig.findIndex((st) => st.id === step);
              const targetIndex = stepsConfig.findIndex((st) => st.id === s);
              if (targetIndex < currentIndex) setStep(s);
            }}
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
            {error}
          </div>
        )}

        {/* Content */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          {/* Service Selection */}
          {step === "service" && (
            <div className="space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Selecione uma categoria e escolha os servicos
                </p>
                {bookingData.services.length > 0 && (
                  <p className="text-sm font-medium text-violet-600 dark:text-violet-400">
                    {bookingData.services.length} selecionado(s) - R$ {totalPrice.toFixed(2)} ({totalDuration} min)
                  </p>
                )}
              </div>

              {/* Category Menu */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Categorias</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={cn(
                      "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
                      selectedCategory === null
                        ? "bg-violet-500 text-white shadow-md"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    )}
                  >
                    <span>🏠</span>
                    <span>Todos</span>
                  </button>
                  {serviceCategories.map((category) => {
                    // Contar quantos serviços existem nessa categoria
                    const categoryServices = services.filter(
                      (s) => matchesCategory(s, category.id)
                    );
                    if (categoryServices.length === 0) return null;

                    return (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={cn(
                          "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
                          selectedCategory === category.id
                            ? "bg-violet-500 text-white shadow-md"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                        )}
                      >
                        <span>{category.icon}</span>
                        <span>{category.name}</span>
                        <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-xs">
                          {categoryServices.length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Pesquisar serviços..."
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-gray-900 placeholder-gray-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
                {serviceSearch && (
                  <button
                    onClick={() => setServiceSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Serviços filtrados por categoria */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {services
                  .filter((service) => {
                    // Filtro por categoria
                    if (selectedCategory && !matchesCategory(service, selectedCategory)) {
                      return false;
                    }
                    // Filtro por texto de busca
                    const searchMatch =
                      service.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
                      (service.description && service.description.toLowerCase().includes(serviceSearch.toLowerCase()));
                    return searchMatch;
                  })
                  .map((service) => (
                  <button
                    key={service.id}
                    onClick={() => toggleService(service)}
                    className={cn(
                      "flex items-center gap-4 rounded-lg border-2 p-4 text-left transition-all",
                      bookingData.services.some((s) => s.id === service.id)
                        ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                        : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-full",
                        bookingData.services.some((s) => s.id === service.id)
                          ? "bg-violet-500 text-white"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                      )}
                    >
                      <Scissors className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{service.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{service.durationMinutes} min</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 dark:text-white">R$ {service.price.toFixed(2)}</p>
                      {bookingData.services.some((s) => s.id === service.id) && (
                        <Check className="ml-auto h-5 w-5 text-violet-500" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {services.length === 0 && (
                <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                  Nenhum servico disponivel
                </div>
              )}

              {services.length > 0 && services.filter((service) => {
                // Filtro por categoria
                if (selectedCategory && !matchesCategory(service, selectedCategory)) {
                  return false;
                }
                // Filtro por texto de busca
                const searchMatch =
                  service.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
                  (service.description && service.description.toLowerCase().includes(serviceSearch.toLowerCase()));
                return searchMatch;
              }).length === 0 && (
                <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                  <Search className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                  {selectedCategory && serviceSearch ? (
                    <>
                      <p>Nenhum serviço encontrado para &quot;{serviceSearch}&quot; em {serviceCategories.find(c => c.id === selectedCategory)?.name}</p>
                      <div className="mt-2 flex justify-center gap-2">
                        <button
                          onClick={() => setServiceSearch("")}
                          className="text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                        >
                          Limpar pesquisa
                        </button>
                        <span className="text-gray-400">ou</span>
                        <button
                          onClick={() => setSelectedCategory(null)}
                          className="text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                        >
                          Ver todas categorias
                        </button>
                      </div>
                    </>
                  ) : selectedCategory ? (
                    <>
                      <p>Nenhum serviço disponível em {serviceCategories.find(c => c.id === selectedCategory)?.name}</p>
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className="mt-2 text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                      >
                        Ver todas categorias
                      </button>
                    </>
                  ) : (
                    <>
                      <p>Nenhum serviço encontrado para &quot;{serviceSearch}&quot;</p>
                      <button
                        onClick={() => setServiceSearch("")}
                        className="mt-2 text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                      >
                        Limpar pesquisa
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Professional Selection */}
          {step === "professional" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Profissionais disponiveis para os servicos selecionados
              </p>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
                </div>
              ) : professionals.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {professionals.map((professional) => (
                    <button
                      key={professional.id}
                      onClick={() => setBookingData((prev) => ({ ...prev, professional }))}
                      className={cn(
                        "flex items-center gap-4 rounded-lg border-2 p-4 text-left transition-all",
                        bookingData.professional?.id === professional.id
                          ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                          : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-14 w-14 items-center justify-center rounded-full text-xl font-semibold",
                          bookingData.professional?.id === professional.id
                            ? "bg-violet-500 text-white"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                        )}
                      >
                        {professional.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{professional.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{professional.role || "Profissional"}</p>
                      </div>
                      {bookingData.professional?.id === professional.id && (
                        <Check className="h-6 w-6 text-violet-500" />
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                  <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-yellow-500" />
                  <p>Nenhum profissional disponivel para os servicos selecionados.</p>
                  <p className="text-sm">Verifique se ha profissionais vinculados a estes servicos.</p>
                </div>
              )}
            </div>
          )}

          {/* Date and Time Selection */}
          {step === "datetime" && (
            <div className="space-y-6">
              {/* Date Selection */}
              <div>
                <h3 className="mb-4 font-medium text-gray-900 dark:text-white">Selecione a Data</h3>
                <div className="flex items-center justify-between mb-4">
                  <Button variant="outline" size="sm" onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {format(currentWeekStart, "MMMM yyyy", { locale: ptBR })}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map((day) => {
                    const isSelected = bookingData.date && isSameDay(day, bookingData.date);
                    const isToday = isSameDay(day, new Date());
                    const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));
                    const isSunday = day.getDay() === 0; // Domingo = 0

                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => !isPast && setBookingData((prev) => ({ ...prev, date: day, time: null }))}
                        disabled={isPast}
                        title={isSunday ? "Salao fechado aos domingos" : undefined}
                        className={cn(
                          "flex flex-col items-center rounded-lg p-3 transition-all",
                          isSelected && "bg-violet-500 text-white",
                          !isSelected && !isPast && !isSunday && "bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600",
                          !isSelected && !isPast && isSunday && "bg-orange-50 text-orange-400 dark:bg-orange-900/20 dark:text-orange-500",
                          isPast && "cursor-not-allowed bg-gray-50 text-gray-300 dark:bg-gray-800 dark:text-gray-600",
                          isToday && !isSelected && "ring-2 ring-violet-500"
                        )}
                      >
                        <span className="text-xs uppercase">
                          {format(day, "EEE", { locale: ptBR })}
                        </span>
                        <span className="text-lg font-semibold">{format(day, "d")}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Selection */}
              {bookingData.date && (
                <div>
                  <h3 className="mb-4 font-medium text-gray-900 dark:text-white">
                    Horarios Disponiveis - {format(bookingData.date, "d 'de' MMMM", { locale: ptBR })}
                  </h3>

                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
                    </div>
                  ) : availableSlots.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
                      {availableSlots.map((slot) => (
                          <button
                            key={slot.time}
                            onClick={() => slot.available && setBookingData((prev) => ({ ...prev, time: slot.time }))}
                            disabled={!slot.available}
                            title={slot.available ? `Selecionar ${slot.time}` : slot.reason || "Indisponível"}
                            className={cn(
                              "rounded-lg px-3 py-2 text-sm font-medium transition-all",
                              bookingData.time === slot.time
                                ? "bg-violet-500 text-white"
                                : slot.available
                                  ? "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                                  : "bg-gray-50 text-gray-300 cursor-not-allowed line-through dark:bg-gray-800 dark:text-gray-600"
                            )}
                          >
                            {slot.time}
                          </button>
                        ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <CalendarIcon className="mx-auto mb-3 h-12 w-12 text-gray-400 dark:text-gray-500" />
                      <p className="font-medium text-gray-700 dark:text-gray-300">
                        Nenhum horario disponivel
                      </p>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {bookingData.professional?.name} nao trabalha em {format(bookingData.date, "EEEE", { locale: ptBR })} ou todos os horarios ja estao ocupados.
                      </p>
                      <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                        Tente selecionar outra data ou escolha um profissional diferente.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Confirmation */}
          {step === "confirm" && (
            <div className="space-y-6">
              <h3 className="font-medium text-gray-900 dark:text-white">Resumo do Agendamento</h3>

              {/* Aviso se não estiver logado */}
              {!user && (
                <div className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-700 dark:border-yellow-900/50 dark:bg-yellow-900/20 dark:text-yellow-400">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Faca login para confirmar</p>
                    <p className="text-sm">Voce precisa estar logado para confirmar o agendamento.</p>
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-violet-500" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Cliente</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {user?.name || "Faca login para continuar"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Scissors className="h-5 w-5 text-violet-500" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Servicos</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {bookingData.services.map((s) => s.name).join(", ")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-violet-500" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Profissional</p>
                      <p className="font-medium text-gray-900 dark:text-white">{bookingData.professional?.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <CalendarIcon className="h-5 w-5 text-violet-500" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Data e Hora</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {bookingData.date && format(bookingData.date, "EEEE, d 'de' MMMM", { locale: ptBR })} as{" "}
                        {bookingData.time}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-violet-500" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Duracao Estimada</p>
                      <p className="font-medium text-gray-900 dark:text-white">{totalDuration} minutos</p>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-medium text-gray-900 dark:text-white">Total</span>
                      <span className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                        R$ {totalPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Observacoes (opcional)
                </label>
                <textarea
                  value={bookingData.notes}
                  onChange={(e) => setBookingData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Alguma observacao sobre o agendamento..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={goBack} disabled={step === "service"}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          {step === "confirm" ? (
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Agendando...
                </>
              ) : user ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Confirmar Agendamento
                </>
              ) : (
                <>
                  <User className="mr-2 h-4 w-4" />
                  Fazer Login para Agendar
                </>
              )}
            </Button>
          ) : (
            <Button onClick={goNext} disabled={!canProceed()}>
              Continuar
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </SalonLayout>
  );
}

// Loading fallback
function LoadingFallback() {
  return (
    <SalonLayout>
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
      </div>
    </SalonLayout>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BookingPageContent />
    </Suspense>
  );
}
