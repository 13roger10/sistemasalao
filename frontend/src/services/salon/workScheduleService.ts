// Work Schedule Service - API calls for professional work schedule management

import { api } from './api';

export type DiaSemana = 'SEGUNDA' | 'TERCA' | 'QUARTA' | 'QUINTA' | 'SEXTA' | 'SABADO' | 'DOMINGO';

export interface WorkSchedule {
  id?: number;
  profissionalId: number;
  diaSemana: DiaSemana;
  diaSemanaDescricao?: string;
  horaInicio: string;
  horaFim: string;
  intervaloInicio?: string;
  intervaloFim?: string;
  ativo: boolean;
}

export interface WorkScheduleRequest {
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFim: string;
  intervaloInicio?: string;
  intervaloFim?: string;
  ativo: boolean;
}

// Labels for days of week in Portuguese
export const diasSemanaLabels: Record<DiaSemana, string> = {
  SEGUNDA: 'Segunda-feira',
  TERCA: 'Terça-feira',
  QUARTA: 'Quarta-feira',
  QUINTA: 'Quinta-feira',
  SEXTA: 'Sexta-feira',
  SABADO: 'Sábado',
  DOMINGO: 'Domingo',
};

// Short labels
export const diasSemanaShort: Record<DiaSemana, string> = {
  SEGUNDA: 'Seg',
  TERCA: 'Ter',
  QUARTA: 'Qua',
  QUINTA: 'Qui',
  SEXTA: 'Sex',
  SABADO: 'Sáb',
  DOMINGO: 'Dom',
};

// All days of week
export const diasSemana: DiaSemana[] = [
  'SEGUNDA',
  'TERCA',
  'QUARTA',
  'QUINTA',
  'SEXTA',
  'SABADO',
  'DOMINGO',
];

export const workScheduleService = {
  // List work schedules for a professional
  list: (profissionalId: string | number): Promise<WorkSchedule[]> => {
    return api.get<WorkSchedule[]>(`/profissionais/${profissionalId}/horarios`);
  },

  // Create work schedule for a day
  create: (profissionalId: string | number, data: WorkScheduleRequest): Promise<WorkSchedule> => {
    return api.post<WorkSchedule>(`/profissionais/${profissionalId}/horarios`, data);
  },

  // Update work schedule for a day
  update: (profissionalId: string | number, diaSemana: DiaSemana, data: WorkScheduleRequest): Promise<WorkSchedule> => {
    return api.put<WorkSchedule>(`/profissionais/${profissionalId}/horarios/${diaSemana}`, data);
  },

  // Delete/deactivate work schedule for a day
  delete: (profissionalId: string | number, diaSemana: DiaSemana): Promise<void> => {
    return api.delete(`/profissionais/${profissionalId}/horarios/${diaSemana}`);
  },

  // Create or update multiple schedules at once
  saveAll: async (profissionalId: string | number, schedules: WorkScheduleRequest[]): Promise<void> => {
    // Get existing schedules
    const existing = await workScheduleService.list(profissionalId);
    const existingDays = new Set(existing.map(s => s.diaSemana));

    // Process each schedule
    for (const schedule of schedules) {
      if (schedule.ativo) {
        if (existingDays.has(schedule.diaSemana)) {
          // Update existing
          await workScheduleService.update(profissionalId, schedule.diaSemana, schedule);
        } else {
          // Create new
          await workScheduleService.create(profissionalId, schedule);
        }
      } else if (existingDays.has(schedule.diaSemana)) {
        // Deactivate existing
        await workScheduleService.delete(profissionalId, schedule.diaSemana);
      }
    }
  },

  // Get default schedule template (Mon-Sat 09:00-18:00)
  getDefaultSchedule: (): WorkScheduleRequest[] => {
    return diasSemana.map(dia => ({
      diaSemana: dia,
      horaInicio: '09:00',
      horaFim: '18:00',
      intervaloInicio: '12:00',
      intervaloFim: '13:00',
      ativo: dia !== 'DOMINGO', // Sunday off by default
    }));
  },
};
