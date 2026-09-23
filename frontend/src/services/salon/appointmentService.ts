// Appointment Service - API calls for appointment management

import { api } from './api';
import type {
  Appointment,
  AppointmentCreateInput,
  AppointmentUpdateInput,
  AppointmentFilters,
  AppointmentStats,
  AppointmentStatus,
  AppointmentService,
  AvailabilityRequest,
  AvailabilityResponse,
  WaitlistEntry,
  WaitlistCreateInput,
  CalendarEvent,
  TimeSlot,
} from '@/types/salon';
import type { PaginatedResponse, PaginationParams, DateRange } from '@/types/salon/common';

// IMPORTANTE: O backend usa /agendamentos (português), não /appointments
const BASE_PATH = '/agendamentos';

// Interface para serviço agendado
interface ServicoAgendadoDTO {
  servicoId: number;
  servicoNome: string;
  servicoDescricao?: string;
  servicoPreco: number;
  ordem: number;
  duracaoPrevistaMinutos: number;
  tempoPreparacaoMinutos: number;
}

// Interface para resposta do backend
interface AgendamentoBackendResponse {
  id: number;
  salonId?: number;
  salonNome?: string;
  profissionalId: number;
  profissionalNome?: string;
  clienteId?: number;
  clienteNome?: string;
  clienteTelefone?: string;
  servicoId?: number;
  servicoNome?: string;
  servicoDuracaoMinutos?: number;
  servicos?: ServicoAgendadoDTO[];
  duracaoTotalMinutos?: number;
  dataHora: string;
  fimPrevisto?: string;
  status: string;
  statusDescricao?: string;
  observacoes?: string;
  notasInternas?: string;
  motivoCancelamento?: string;
  valorCobrado?: number;
  criadoEm?: string;
  atualizadoEm?: string;
}

// Formato retornado por GET /salon/appointments/my (MeusAgendamentosController) —
// já vem sem nenhum campo de nota, propositalmente: essa rota é a única que o
// cliente pode chamar, então nunca deve trafegar notasInternas.
interface MeuAgendamentoBackendItem {
  id: string;
  clientId: string;
  professionalId: string;
  unitId: string;
  date: string;
  startTime: string;
  endTime?: string | null;
  status: string;
  source?: string;
  isPaid?: boolean;
  totalPrice?: number;
  finalPrice?: number;
  totalDurationMinutes?: number;
  services?: {
    serviceId: string;
    price: number;
    durationMinutes: number;
    service?: { id: string; name: string; price: number; durationMinutes: number };
  }[];
  professional?: { id: string; name: string; avatar?: string } | null;
  createdAt?: string;
  updatedAt?: string;
}

// Mapear status do backend para frontend
const mapStatus = (status: string): AppointmentStatus => {
  const statusMap: Record<string, AppointmentStatus> = {
    'PENDENTE': 'pending',
    'CONFIRMADO': 'confirmed',
    'EM_ANDAMENTO': 'in_progress',
    'CONCLUIDO': 'completed',
    'CANCELADO': 'canceled',
    'NAO_COMPARECEU': 'no_show',
  };
  return statusMap[status?.toUpperCase()] || 'pending';
};

// Mapear resposta do backend para frontend
const mapAgendamentoToFrontend = (agendamento: AgendamentoBackendResponse): Appointment => {
  const dataHora = new Date(agendamento.dataHora);
  const duracaoMinutos = agendamento.duracaoTotalMinutos || agendamento.servicoDuracaoMinutos || 30;
  const fimPrevisto = agendamento.fimPrevisto
    ? new Date(agendamento.fimPrevisto)
    : new Date(dataHora.getTime() + duracaoMinutos * 60000);

  // Mapear serviços
  const services: AppointmentService[] = [];
  if (agendamento.servicos && agendamento.servicos.length > 0) {
    // Múltiplos serviços
    for (const serv of agendamento.servicos) {
      services.push({
        serviceId: String(serv.servicoId),
        service: {
          id: String(serv.servicoId),
          name: serv.servicoNome,
          description: serv.servicoDescricao,
          categoryId: '',
          price: serv.servicoPreco,
          durationMinutes: serv.duracaoPrevistaMinutos,
          status: 'active' as const,
          usesStock: false,
          loyaltyPointsEarned: 0,
          showInOnlineBooking: true,
          requiresConfirmation: false,
          unitIds: ['1'],
          totalBookings: 0,
          averageRating: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        price: serv.servicoPreco,
        durationMinutes: serv.duracaoPrevistaMinutos,
      });
    }
  } else if (agendamento.servicoNome) {
    // Serviço único (legacy)
    services.push({
      serviceId: String(agendamento.servicoId || ''),
      service: {
        id: String(agendamento.servicoId || ''),
        name: agendamento.servicoNome,
        categoryId: '',
        price: agendamento.valorCobrado || 0,
        durationMinutes: agendamento.servicoDuracaoMinutos || 30,
        status: 'active' as const,
        usesStock: false,
        loyaltyPointsEarned: 0,
        showInOnlineBooking: true,
        requiresConfirmation: false,
        unitIds: ['1'],
        totalBookings: 0,
        averageRating: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      price: agendamento.valorCobrado || 0,
      durationMinutes: agendamento.servicoDuracaoMinutos || 30,
    });
  }

  return {
    id: String(agendamento.id),
    clientId: String(agendamento.clienteId || ''),
    client: agendamento.clienteNome ? {
      id: String(agendamento.clienteId || ''),
      name: agendamento.clienteNome,
      email: '',
      phone: agendamento.clienteTelefone || '',
      totalVisits: 0,
      totalSpent: 0,
      loyaltyPoints: 0,
      loyaltyLevel: 'bronze',
      status: 'active',
      acceptsMarketing: true,
      acceptsWhatsApp: true,
      acceptsEmail: true,
      averageTicket: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } : undefined,
    professionalId: String(agendamento.profissionalId),
    professional: agendamento.profissionalNome ? {
      id: String(agendamento.profissionalId),
      userId: String(agendamento.profissionalId),
      name: agendamento.profissionalNome,
      email: '',
      phone: '',
      status: 'active',
      serviceIds: [],
      specialties: [],
      commissionType: 'percentage',
      commissionValue: 0,
      schedule: { days: [] },
      averageRating: 0,
      totalReviews: 0,
      totalAppointments: 0,
      totalRevenue: 0,
      unitIds: ['1'],
      primaryUnitId: '1',
      acceptsOnlineBooking: true,
      showInPublicProfile: true,
      color: '#8B5CF6',
      createdAt: new Date(),
      updatedAt: new Date(),
    } : undefined,
    services,
    date: dataHora,
    startTime: dataHora.toTimeString().slice(0, 5),
    endTime: fimPrevisto.toTimeString().slice(0, 5),
    totalDurationMinutes: duracaoMinutos,
    status: mapStatus(agendamento.status),
    source: 'admin',
    totalPrice: agendamento.valorCobrado || 0,
    finalPrice: agendamento.valorCobrado || 0,
    isPaid: false,
    commissionTotal: 0,
    commissionPaid: false,
    clientNotes: agendamento.observacoes,
    internalNotes: agendamento.notasInternas,
    cancellationReason: agendamento.motivoCancelamento,
    unitId: '1',
    createdAt: agendamento.criadoEm ? new Date(agendamento.criadoEm) : new Date(),
    updatedAt: agendamento.atualizadoEm ? new Date(agendamento.atualizadoEm) : new Date(),
  };
};

// Mapeia a resposta de /salon/appointments/my (rota exclusiva do cliente) para o
// tipo Appointment do frontend. Não inclui internalNotes de propósito: essa nota
// é interna da equipe e essa rota nunca a retorna.
const mapMeuAgendamentoToFrontend = (item: MeuAgendamentoBackendItem): Appointment => {
  const dateObj = item.date ? new Date(`${item.date}T${item.startTime || '00:00'}:00`) : new Date();

  const services: AppointmentService[] = (item.services || []).map((s) => ({
    serviceId: s.serviceId,
    service: {
      id: s.service?.id || s.serviceId,
      name: s.service?.name || 'Serviço',
      categoryId: '',
      price: s.service?.price ?? s.price,
      durationMinutes: s.service?.durationMinutes ?? s.durationMinutes,
      status: 'active' as const,
      usesStock: false,
      loyaltyPointsEarned: 0,
      showInOnlineBooking: true,
      requiresConfirmation: false,
      unitIds: ['1'],
      totalBookings: 0,
      averageRating: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    price: s.price,
    durationMinutes: s.durationMinutes,
  }));

  return {
    id: item.id,
    clientId: item.clientId,
    client: undefined,
    professionalId: item.professionalId,
    professional: item.professional ? {
      id: item.professional.id,
      userId: item.professional.id,
      name: item.professional.name,
      email: '',
      phone: '',
      status: 'active',
      serviceIds: [],
      specialties: [],
      commissionType: 'percentage',
      commissionValue: 0,
      schedule: { days: [] },
      averageRating: 0,
      totalReviews: 0,
      totalAppointments: 0,
      totalRevenue: 0,
      unitIds: ['1'],
      primaryUnitId: '1',
      acceptsOnlineBooking: true,
      showInPublicProfile: true,
      color: '#8B5CF6',
      avatar: item.professional.avatar,
      createdAt: new Date(),
      updatedAt: new Date(),
    } : undefined,
    services,
    date: dateObj,
    startTime: item.startTime,
    endTime: item.endTime || '',
    totalDurationMinutes: item.totalDurationMinutes || 30,
    status: (item.status as AppointmentStatus) || 'pending',
    source: 'online',
    totalPrice: item.totalPrice || 0,
    finalPrice: item.finalPrice || 0,
    isPaid: item.isPaid || false,
    commissionTotal: 0,
    commissionPaid: false,
    // Propositalmente sem clientNotes/internalNotes: a rota /my nunca as envia.
    unitId: item.unitId || '1',
    createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
    updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
  };
};

export const appointmentService = {
  // List appointments with pagination and filters (admin endpoint)
  // IMPORTANTE: Backend usa /agendamentos/salon/{salonId}
  list: async (
    params: PaginationParams & AppointmentFilters & { salonId?: string | number }
  ): Promise<PaginatedResponse<Appointment>> => {
    const salonId = params.salonId || '1';
    try {
      // Convert frontend pagination params to Spring Boot format
      const backendParams = {
        page: (params.page || 1) - 1, // Spring Boot uses 0-indexed pages
        size: params.limit || 100,    // Spring Boot uses 'size' not 'limit'
      };
      console.log('Buscando agendamentos - URL:', `${BASE_PATH}/salon/${salonId}`, 'Params:', backendParams);
      const response = await api.get<{ content: AgendamentoBackendResponse[], totalElements: number, totalPages: number, number: number }>(`${BASE_PATH}/salon/${salonId}`, backendParams);
      console.log('Resposta da API de agendamentos:', response);
      console.log('Content recebido:', response.content);
      const appointments = response.content?.map(mapAgendamentoToFrontend) || [];
      console.log('Agendamentos mapeados:', appointments.length, appointments.length > 0 ? appointments[0] : 'nenhum');
      return {
        data: appointments,
        items: appointments,
        meta: {
          total: response.totalElements || appointments.length,
          page: (response.number || 0) + 1,
          limit: params.limit || 20,
          totalPages: response.totalPages || 1,
          hasNextPage: (response.number || 0) + 1 < (response.totalPages || 1),
          hasPrevPage: (response.number || 0) > 0,
        },
      };
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
      return {
        data: [],
        items: [],
        meta: {
          total: 0,
          page: 1,
          limit: params.limit || 20,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }
  },

  // Daily agenda for a specific professional — uses dedicated day-view endpoint
  // Maps to: GET /api/agendamentos/profissional/{profissionalId}/agenda-diaria?data=...
  getDailyAgenda: async (
    professionalId: string | number,
    date: Date
  ): Promise<Appointment[]> => {
    try {
      // Backend expects ISO LocalDateTime: yyyy-MM-ddTHH:mm:ss
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dataParam = dayStart.toISOString().slice(0, 19); // "2024-01-15T00:00:00"

      const response = await api.get<AgendamentoBackendResponse[]>(
        `${BASE_PATH}/profissional/${professionalId}/agenda-diaria`,
        { data: dataParam }
      );
      return (response || []).map(mapAgendamentoToFrontend);
    } catch (error) {
      console.error('Erro ao buscar agenda diária do profissional:', error);
      return [];
    }
  },

  // List appointments for a specific professional — uses backend-level isolation
  // Maps to: GET /api/agendamentos/profissional/{profissionalId}
  getByProfessional: async (
    professionalId: string | number,
    params: PaginationParams & { salonId?: string | number } = {}
  ): Promise<PaginatedResponse<Appointment>> => {
    try {
      const backendParams = {
        page: (params.page || 1) - 1,
        size: params.limit || 100,
      };
      const response = await api.get<{ content: AgendamentoBackendResponse[], totalElements: number, totalPages: number, number: number }>(
        `${BASE_PATH}/profissional/${professionalId}`,
        backendParams
      );
      const appointments = response.content?.map(mapAgendamentoToFrontend) || [];
      return {
        data: appointments,
        items: appointments,
        meta: {
          total: response.totalElements || appointments.length,
          page: (response.number || 0) + 1,
          limit: params.limit || 20,
          totalPages: response.totalPages || 1,
          hasNextPage: (response.number || 0) + 1 < (response.totalPages || 1),
          hasPrevPage: (response.number || 0) > 0,
        },
      };
    } catch (error) {
      console.error('Erro ao buscar agendamentos do profissional:', error);
      return { data: [], items: [], meta: { total: 0, page: 1, limit: params.limit || 20, totalPages: 0, hasNextPage: false, hasPrevPage: false } };
    }
  },

  // List appointments for the authenticated client
  // IMPORTANTE: Usa /salon/appointments/my (MeusAgendamentosController) — a única
  // rota que retorna somente os agendamentos do próprio cliente, sem notas internas.
  getMyAppointments: async (
    params?: PaginationParams & { status?: string }
  ): Promise<PaginatedResponse<Appointment>> => {
    const response = await api.get<{
      items?: MeuAgendamentoBackendItem[];
      data?: MeuAgendamentoBackendItem[];
      meta?: PaginatedResponse<Appointment>['meta'];
    }>('/salon/appointments/my', params);

    const rawItems = response.items || response.data || [];
    const items = rawItems.map(mapMeuAgendamentoToFrontend);

    return {
      data: items,
      items,
      meta: response.meta || {
        total: items.length,
        page: 1,
        limit: items.length,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  },

  // Get single appointment for the authenticated client
  getMyAppointmentById: (id: string): Promise<Appointment> => {
    return api.get<Appointment>(`/salon/appointments/my/${id}`);
  },

  // Create new appointment for the authenticated client
  createMyAppointment: (data: {
    professionalId: string;
    serviceIds: string[];
    date: string;
    startTime: string;
    unitId: string;
    notes?: string;
  }): Promise<Appointment> => {
    return api.post<Appointment>('/salon/appointments/my', data);
  },

  // Confirm appointment for the authenticated client
  confirmMyAppointment: (id: string): Promise<Appointment> => {
    return api.post<MeuAgendamentoBackendItem>(`/salon/appointments/${id}/confirm`)
      .then(mapMeuAgendamentoToFrontend);
  },

  // Cancel appointment for the authenticated client
  cancelMyAppointment: (id: string, reason?: string): Promise<Appointment> => {
    return api.post<Appointment>(`/salon/appointments/my/${id}/cancel`, { reason });
  },

  // Reschedule appointment for the authenticated client.
  // Backend route: POST /api/salon/appointments/{id}/reschedule (MeusAgendamentosController) —
  // ownership of the appointment is enforced server-side, and the team (professional,
  // receptionists, admin) is notified once this succeeds.
  rescheduleMyAppointment: (
    id: string,
    data: {
      date: Date;
      startTime: string;
      professionalId?: string;
      serviceIds?: string[];
      clientNotes?: string;
    }
  ): Promise<Appointment> => {
    const year = data.date.getFullYear();
    const month = String(data.date.getMonth() + 1).padStart(2, '0');
    const day = String(data.date.getDate()).padStart(2, '0');
    const novaDataHora = `${year}-${month}-${day}T${data.startTime}:00`;

    return api.post<AgendamentoBackendResponse>(`/salon/appointments/${id}/reschedule`, {
      novaDataHora,
      novoProfissionalId: data.professionalId ? Number(data.professionalId) : undefined,
      servicoIds: data.serviceIds?.length ? data.serviceIds.map(Number) : undefined,
      observacoes: data.clientNotes,
    }).then(mapAgendamentoToFrontend);
  },

  // Get single appointment by ID
  getById: (id: string): Promise<Appointment> => {
    return api.get<Appointment>(`${BASE_PATH}/${id}`);
  },

  // Create new appointment
  // Backend espera: profissionalId, servicoId/servicoIds, dataHora, observacoes
  create: (data: AppointmentCreateInput): Promise<Appointment> => {
    // Combinar date e startTime em dataHora (LocalDateTime)
    // Extrair componentes da data para evitar problemas de timezone
    const year = data.date.getFullYear();
    const month = data.date.getMonth() + 1;
    const day = data.date.getDate();

    const [hours, minutes] = (data.startTime || '09:00').split(':').map(Number);

    // Formatar dataHora como LocalDateTime (sem timezone) - formato: yyyy-MM-ddTHH:mm:ss
    const monthStr = String(month).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const hour = String(hours).padStart(2, '0');
    const minute = String(minutes).padStart(2, '0');
    const dataHora = `${year}-${monthStr}-${dayStr}T${hour}:${minute}:00`;

    const backendData = {
      clienteId: data.clientId ? Number(data.clientId) : undefined,
      profissionalId: Number(data.professionalId),
      servicoIds: data.serviceIds?.map(id => Number(id)),
      dataHora,
      // Campos separados: observacoes é visível para o cliente, notasInternas nunca é.
      observacoes: data.clientNotes || undefined,
      notasInternas: data.internalNotes || undefined,
    };

    console.log('Enviando agendamento:', backendData);

    return api.post<AgendamentoBackendResponse>(BASE_PATH, backendData)
      .then(mapAgendamentoToFrontend);
  },

  // Update existing appointment
  update: (id: string, data: AppointmentUpdateInput): Promise<Appointment> => {
    return api.patch<Appointment>(`${BASE_PATH}/${id}`, data);
  },

  // Cancel appointment (backend usa /cancelar)
  cancel: (id: string, reason?: string): Promise<Appointment> => {
    return api.post<AgendamentoBackendResponse>(`${BASE_PATH}/${id}/cancelar`, { motivo: reason })
      .then(mapAgendamentoToFrontend);
  },

  // Confirm appointment (backend usa /confirmar)
  confirm: (id: string): Promise<Appointment> => {
    return api.post<AgendamentoBackendResponse>(`${BASE_PATH}/${id}/confirmar`)
      .then(mapAgendamentoToFrontend);
  },

  // Start appointment (in progress) (backend usa /iniciar)
  start: (id: string): Promise<Appointment> => {
    return api.post<AgendamentoBackendResponse>(`${BASE_PATH}/${id}/iniciar`)
      .then(mapAgendamentoToFrontend);
  },

  // Complete appointment (backend usa /concluir)
  complete: (
    id: string,
    paymentData?: { method: string; amount: number }
  ): Promise<Appointment> => {
    return api.post<AgendamentoBackendResponse>(`${BASE_PATH}/${id}/concluir`, paymentData)
      .then(mapAgendamentoToFrontend);
  },

  // Mark as no-show (backend usa /no-show)
  noShow: (id: string): Promise<Appointment> => {
    return api.post<AgendamentoBackendResponse>(`${BASE_PATH}/${id}/no-show`)
      .then(mapAgendamentoToFrontend);
  },

  // Get appointments for calendar view
  // IMPORTANTE: Backend não tem /calendar, usa /salon/{salonId} ou /profissional/{profissionalId}/agenda-diaria
  getCalendarEvents: (
    params: {
      startDate: Date;
      endDate: Date;
      professionalId?: string;
      unitId?: string;
      salonId?: string;
    }
  ): Promise<CalendarEvent[]> => {
    const salonId = params.salonId || '1';

    // Se tem profissionalId, usa agenda-diaria
    if (params.professionalId) {
      return api.get<AgendamentoBackendResponse[]>(`${BASE_PATH}/profissional/${params.professionalId}/agenda-diaria`, {
        data: params.startDate.toISOString(),
      })
        .then((agendamentos) => agendamentos.map(ag => ({
          id: String(ag.id),
          title: ag.servicoNome || 'Agendamento',
          start: new Date(ag.dataHora),
          end: new Date(new Date(ag.dataHora).getTime() + (ag.duracaoTotalMinutos || ag.servicoDuracaoMinutos || 30) * 60000),
          professionalId: String(ag.profissionalId),
          clientName: ag.clienteNome || 'Cliente',
          services: ag.servicoNome ? [ag.servicoNome] : [],
          status: mapStatus(ag.status) as AppointmentStatus,
        })))
        .catch(() => []);
    }

    // Senão, usa /salon/{salonId}
    return api.get<{ content: AgendamentoBackendResponse[] }>(`${BASE_PATH}/salon/${salonId}`)
      .then((response) => {
        const agendamentos = response.content || [];
        return agendamentos.map(ag => ({
          id: String(ag.id),
          title: ag.servicoNome || 'Agendamento',
          start: new Date(ag.dataHora),
          end: new Date(new Date(ag.dataHora).getTime() + (ag.duracaoTotalMinutos || ag.servicoDuracaoMinutos || 30) * 60000),
          professionalId: String(ag.profissionalId),
          clientName: ag.clienteNome || 'Cliente',
          services: ag.servicoNome ? [ag.servicoNome] : [],
          status: mapStatus(ag.status) as AppointmentStatus,
        }));
      })
      .catch(() => []);
  },

  // Get today's appointments
  getToday: (unitId?: string): Promise<Appointment[]> => {
    return api.get<Appointment[]>(`${BASE_PATH}/today`, { unitId });
  },

  // Get appointment statistics
  getStats: (
    params: { dateRange?: DateRange; unitId?: string }
  ): Promise<AppointmentStats> => {
    return api.get<AppointmentStats>(`${BASE_PATH}/stats`, {
      startDate: params.dateRange?.startDate?.toISOString(),
      endDate: params.dateRange?.endDate?.toISOString(),
      unitId: params.unitId,
    });
  },

  // Check availability - calls real backend endpoint
  checkAvailability: async (data: AvailabilityRequest): Promise<AvailabilityResponse> => {
    // Format date as YYYY-MM-DD using LOCAL date components (not UTC) to avoid timezone shift.
    // toISOString() converts to UTC which can give the wrong calendar day for UTC-3 users.
    const d = data.date instanceof Date ? data.date : new Date(data.date);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    // Build query params
    const params = new URLSearchParams();
    params.append('salonId', String(data.unitId || '1'));
    params.append('data', dateStr);
    data.serviceIds.forEach(id => params.append('servicoIds', String(id)));
    if (data.professionalId) {
      params.append('profissionalId', String(data.professionalId));
    }

    interface BackendTimeSlot {
      time: string;
      available: boolean;
      reason?: string;
    }

    interface BackendProfessional {
      professionalId: number;
      professionalName: string;
      photoUrl?: string;
      slots: BackendTimeSlot[];
    }

    interface BackendDisponibilidadeResponse {
      date: string;
      totalDurationMinutes: number;
      slotIntervalMinutes: number;
      professionals: BackendProfessional[];
    }

    try {
      const response = await api.get<BackendDisponibilidadeResponse>(
        `${BASE_PATH}/disponibilidade?${params.toString()}`
      );

      // Map backend response to frontend format
      return {
        date: new Date(response.date),
        professionals: response.professionals.map(prof => ({
          professionalId: String(prof.professionalId),
          professionalName: prof.professionalName,
          slots: prof.slots.map(slot => ({
            time: slot.time,
            available: slot.available,
            reason: slot.reason,
          })),
        })),
      };
    } catch (error) {
      console.error('Error fetching availability:', error);
      // Re-throw so the caller can display the real error message from the backend
      throw error;
    }
  },

  // Get availability (alias for MobileBooking compatibility)
  getAvailability: async (data: AvailabilityRequest): Promise<AvailabilityResponse> => {
    return appointmentService.checkAvailability(data);
  },

  // Apply coupon to appointment
  applyCoupon: (
    id: string,
    couponCode: string
  ): Promise<{ discount: number; finalPrice: number }> => {
    return api.post<{ discount: number; finalPrice: number }>(
      `${BASE_PATH}/${id}/apply-coupon`,
      { couponCode }
    );
  },

  // Send reminder
  sendReminder: (id: string): Promise<void> => {
    return api.post(`${BASE_PATH}/${id}/send-reminder`);
  },

  // Reschedule appointment
  reschedule: (
    id: string,
    newDate: Date,
    newTime: string
  ): Promise<Appointment> => {
    return api.post<Appointment>(`${BASE_PATH}/${id}/reschedule`, {
      date: newDate.toISOString(),
      startTime: newTime,
    });
  },

  // Waitlist
  waitlist: {
    list: (unitId?: string): Promise<WaitlistEntry[]> => {
      return api.get<WaitlistEntry[]>(`${BASE_PATH}/waitlist`, { unitId });
    },

    add: (data: WaitlistCreateInput): Promise<WaitlistEntry> => {
      return api.post<WaitlistEntry>(`${BASE_PATH}/waitlist`, data);
    },

    remove: (id: string): Promise<void> => {
      return api.delete(`${BASE_PATH}/waitlist/${id}`);
    },

    notify: (id: string, slotDetails: string): Promise<void> => {
      return api.post(`${BASE_PATH}/waitlist/${id}/notify`, { slotDetails });
    },
  },

  // Bulk operations
  bulkConfirm: (ids: string[]): Promise<void> => {
    return api.post(`${BASE_PATH}/bulk/confirm`, { ids });
  },

  bulkCancel: (ids: string[], reason?: string): Promise<void> => {
    return api.post(`${BASE_PATH}/bulk/cancel`, { ids, reason });
  },

  // Export appointments
  export: (
    filters: AppointmentFilters,
    format: 'csv' | 'xlsx'
  ): Promise<Blob> => {
    return api.get<Blob>(`${BASE_PATH}/export`, { ...filters, format });
  },
};
