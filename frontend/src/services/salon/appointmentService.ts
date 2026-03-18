// Appointment Service - API calls for appointment management

import { api } from './api';
import type {
  Appointment,
  AppointmentCreateInput,
  AppointmentUpdateInput,
  AppointmentFilters,
  AppointmentStats,
  AppointmentStatus,
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

// Interface para resposta do backend
interface AgendamentoBackendResponse {
  id: number;
  profissionalId: number;
  profissionalNome?: string;
  clienteId?: number;
  clienteNome?: string;
  servicoId?: number;
  servicoNome?: string;
  servicoIds?: number[];
  dataHora: string;
  duracaoMinutos: number;
  status: string;
  observacoes?: string;
  precoTotal?: number;
  criadoEm?: string;
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
  const endTime = new Date(dataHora.getTime() + (agendamento.duracaoMinutos || 30) * 60000);

  return {
    id: String(agendamento.id),
    clientId: String(agendamento.clienteId || ''),
    client: agendamento.clienteNome ? {
      id: String(agendamento.clienteId || ''),
      name: agendamento.clienteNome,
      email: '',
      phone: '',
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
    professional: undefined, // Simplificado - o profissional será carregado separadamente se necessário
    services: agendamento.servicoNome ? [{
      serviceId: String(agendamento.servicoId || ''),
      price: agendamento.precoTotal || 0,
      durationMinutes: agendamento.duracaoMinutos || 30,
    }] : [],
    date: dataHora,
    startTime: dataHora.toTimeString().slice(0, 5),
    endTime: endTime.toTimeString().slice(0, 5),
    totalDurationMinutes: agendamento.duracaoMinutos || 30,
    status: mapStatus(agendamento.status),
    source: 'admin',
    totalPrice: agendamento.precoTotal || 0,
    finalPrice: agendamento.precoTotal || 0,
    isPaid: false,
    commissionTotal: 0,
    commissionPaid: false,
    internalNotes: agendamento.observacoes,
    unitId: '1',
    createdAt: agendamento.criadoEm ? new Date(agendamento.criadoEm) : new Date(),
    updatedAt: new Date(),
  };
};

export const appointmentService = {
  // List appointments with pagination and filters (admin endpoint)
  // IMPORTANTE: Backend usa /agendamentos/salon/{salonId}
  list: (
    params: PaginationParams & AppointmentFilters & { salonId?: string | number }
  ): Promise<PaginatedResponse<Appointment>> => {
    const salonId = params.salonId || '1';
    return api.get<{ content: AgendamentoBackendResponse[], totalElements: number, totalPages: number, number: number }>(`${BASE_PATH}/salon/${salonId}`, params)
      .then((response) => {
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
      });
  },

  // List appointments for the authenticated client
  getMyAppointments: (
    params?: PaginationParams & { status?: string }
  ): Promise<PaginatedResponse<Appointment>> => {
    return api.get<PaginatedResponse<Appointment>>(`${BASE_PATH}/my`, params);
  },

  // Get single appointment for the authenticated client
  getMyAppointmentById: (id: string): Promise<Appointment> => {
    return api.get<Appointment>(`${BASE_PATH}/my/${id}`);
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
    return api.post<Appointment>(`${BASE_PATH}/my`, data);
  },

  // Confirm appointment for the authenticated client
  confirmMyAppointment: (id: string): Promise<Appointment> => {
    return api.post<Appointment>(`${BASE_PATH}/my/${id}/confirm`);
  },

  // Cancel appointment for the authenticated client
  cancelMyAppointment: (id: string, reason?: string): Promise<Appointment> => {
    return api.post<Appointment>(`${BASE_PATH}/my/${id}/cancel`, { reason });
  },

  // Reschedule appointment for the authenticated client
  rescheduleMyAppointment: (
    id: string,
    newDate: string,
    newTime: string
  ): Promise<Appointment> => {
    return api.post<Appointment>(`${BASE_PATH}/my/${id}/reschedule`, {
      date: newDate,
      startTime: newTime,
    });
  },

  // Get single appointment by ID
  getById: (id: string): Promise<Appointment> => {
    return api.get<Appointment>(`${BASE_PATH}/${id}`);
  },

  // Create new appointment
  // Backend espera: profissionalId, servicoId/servicoIds, dataHora, observacoes
  create: (data: AppointmentCreateInput): Promise<Appointment> => {
    // Combinar date e startTime em dataHora (LocalDateTime)
    const date = data.date instanceof Date ? data.date : new Date(data.date);
    const [hours, minutes] = (data.startTime || '09:00').split(':').map(Number);
    date.setHours(hours, minutes, 0, 0);

    // Formatar dataHora como LocalDateTime (sem timezone) - formato: yyyy-MM-ddTHH:mm:ss
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const dataHora = `${year}-${month}-${day}T${hour}:${minute}:00`;

    // Combinar notas
    const observacoes = [data.clientNotes, data.internalNotes]
      .filter(Boolean)
      .join(' | ');

    const backendData = {
      profissionalId: Number(data.professionalId),
      servicoIds: data.serviceIds?.map(id => Number(id)),
      dataHora,
      observacoes: observacoes || undefined,
    };

    console.log('Enviando agendamento:', backendData);

    return api.post<AgendamentoBackendResponse>(BASE_PATH, backendData)
      .then(mapAgendamentoToFrontend);
  },

  // Update existing appointment
  update: (id: string, data: AppointmentUpdateInput): Promise<Appointment> => {
    return api.patch<Appointment>(`${BASE_PATH}/${id}`, data);
  },

  // Cancel appointment
  cancel: (id: string, reason?: string): Promise<Appointment> => {
    return api.post<Appointment>(`${BASE_PATH}/${id}/cancel`, { reason });
  },

  // Confirm appointment
  confirm: (id: string): Promise<Appointment> => {
    return api.post<Appointment>(`${BASE_PATH}/${id}/confirm`);
  },

  // Start appointment (in progress)
  start: (id: string): Promise<Appointment> => {
    return api.post<Appointment>(`${BASE_PATH}/${id}/start`);
  },

  // Complete appointment
  complete: (
    id: string,
    paymentData?: { method: string; amount: number }
  ): Promise<Appointment> => {
    return api.post<Appointment>(`${BASE_PATH}/${id}/complete`, paymentData);
  },

  // Mark as no-show
  noShow: (id: string): Promise<Appointment> => {
    return api.post<Appointment>(`${BASE_PATH}/${id}/no-show`);
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
          end: new Date(new Date(ag.dataHora).getTime() + (ag.duracaoMinutos || 30) * 60000),
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
          end: new Date(new Date(ag.dataHora).getTime() + (ag.duracaoMinutos || 30) * 60000),
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

  // Check availability
  // IMPORTANTE: Backend não tem endpoint de disponibilidade, retorna slots padrão
  checkAvailability: (data: AvailabilityRequest): Promise<AvailabilityResponse> => {
    // Gerar slots de horário padrão (8h-19h, a cada 30min)
    const slots: TimeSlot[] = [];
    for (let hour = 8; hour <= 18; hour++) {
      slots.push({ time: `${String(hour).padStart(2, '0')}:00`, available: true });
      slots.push({ time: `${String(hour).padStart(2, '0')}:30`, available: true });
    }
    slots.push({ time: '19:00', available: true });

    return Promise.resolve({
      date: data.date,
      professionals: [{
        professionalId: data.professionalId || '1',
        professionalName: 'Profissional',
        slots,
      }],
    });
  },

  // Get availability (alias for MobileBooking compatibility)
  getAvailability: (data: AvailabilityRequest): Promise<AvailabilityResponse> => {
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
