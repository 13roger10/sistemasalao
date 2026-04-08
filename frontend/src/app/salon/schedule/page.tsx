'use client';

import { useState, useEffect } from 'react';
import {
  Clock,
  Save,
  Plus,
  Trash2,
  Calendar,
  CalendarX,
  CalendarCheck,
  Check,
  AlertCircle,
  Settings,
  Sun,
  Moon,
  Coffee,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { SalonLayout } from '@/components/layout/SalonLayout';
import { scheduleService } from '@/services/salon/scheduleService';
import type { ScheduleSettings, Holiday, SpecialDate } from '@/services/salon/scheduleService';
import type { DaySchedule } from '@/types/salon/common';

const dayNames = ['Domingo', 'Segunda-feira', 'Terca-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sabado'];
const dayShortNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

// Toggle component
interface ToggleSwitchProps {
  enabled: boolean;
  onChange: () => void;
  size?: 'sm' | 'md';
}

function ToggleSwitch({ enabled, onChange, size = 'md' }: ToggleSwitchProps) {
  const dimensions = size === 'sm'
    ? { width: '36px', height: '20px', thumb: '14px', translate: '16px', top: '3px', left: '3px' }
    : { width: '44px', height: '24px', thumb: '18px', translate: '20px', top: '3px', left: '3px' };

  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        'relative flex-shrink-0 rounded-full transition-colors',
        enabled ? 'bg-violet-500' : 'bg-gray-300 dark:bg-gray-600'
      )}
      style={{ width: dimensions.width, height: dimensions.height }}
    >
      <span
        className="absolute rounded-full bg-white shadow-md transition-transform duration-200"
        style={{
          width: dimensions.thumb,
          height: dimensions.thumb,
          top: dimensions.top,
          left: dimensions.left,
          transform: enabled ? `translateX(${dimensions.translate})` : 'translateX(0)',
        }}
      />
    </button>
  );
}

// Day Schedule Row
interface DayScheduleRowProps {
  day: DaySchedule;
  dayIndex: number;
  onChange: (dayIndex: number, field: 'isOpen' | 'start' | 'end', value: boolean | string) => void;
}

function DayScheduleRow({ day, dayIndex, onChange }: DayScheduleRowProps) {
  const isWeekend = dayIndex === 0 || dayIndex === 6;

  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-lg border p-4 transition-all',
        day.isOpen
          ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20'
          : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50',
        isWeekend && 'border-l-4',
        isWeekend && day.isOpen && 'border-l-green-500',
        isWeekend && !day.isOpen && 'border-l-gray-400 dark:border-l-gray-600'
      )}
    >
      <div className="w-32 flex-shrink-0">
        <div className="flex items-center gap-2">
          {isWeekend ? (
            <Sun className="h-4 w-4 text-orange-500" />
          ) : (
            <Coffee className="h-4 w-4 text-blue-500" />
          )}
          <span className="font-medium text-gray-900 dark:text-white">{dayNames[dayIndex]}</span>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {isWeekend ? 'Fim de semana' : 'Dia util'}
        </span>
      </div>

      <ToggleSwitch
        enabled={day.isOpen}
        onChange={() => onChange(dayIndex, 'isOpen', !day.isOpen)}
      />

      {day.isOpen ? (
        <div className="flex flex-1 items-center gap-3">
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-yellow-500" />
            <input
              type="time"
              value={day.timeRanges[0]?.start || '09:00'}
              onChange={(e) => onChange(dayIndex, 'start', e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <span className="text-gray-400">ate</span>
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4 text-indigo-500" />
            <input
              type="time"
              value={day.timeRanges[0]?.end || '18:00'}
              onChange={(e) => onChange(dayIndex, 'end', e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="ml-auto text-sm text-gray-500 dark:text-gray-400">
            {calculateHours(day.timeRanges[0]?.start, day.timeRanges[0]?.end)}
          </div>
        </div>
      ) : (
        <span className="text-sm text-gray-500 dark:text-gray-400">Fechado</span>
      )}
    </div>
  );
}

function calculateHours(start?: string, end?: string): string {
  if (!start || !end) return '';
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const totalMinutes = (eh * 60 + em) - (sh * 60 + sm);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
}

// Holiday Card
interface HolidayCardProps {
  holiday: Holiday;
  onDelete: () => void;
  onToggle: () => void;
}

function HolidayCard({ holiday, onDelete, onToggle }: HolidayCardProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3">
        <div className={cn(
          'flex h-10 w-10 items-center justify-center rounded-full',
          holiday.isOpen
            ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
        )}>
          {holiday.isOpen ? <CalendarCheck className="h-5 w-5" /> : <CalendarX className="h-5 w-5" />}
        </div>
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{holiday.name}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {format(parseISO(holiday.date), "dd 'de' MMMM", { locale: ptBR })}
            {holiday.recurring && ' (anual)'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {holiday.isOpen ? 'Aberto' : 'Fechado'}
          </span>
          <ToggleSwitch enabled={holiday.isOpen} onChange={onToggle} size="sm" />
        </div>
        <button
          onClick={onDelete}
          className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// Add Holiday Modal
interface AddHolidayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (holiday: Omit<Holiday, 'id'>) => void;
}

function AddHolidayModal({ isOpen, onClose, onAdd }: AddHolidayModalProps) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [isHolidayOpen, setIsHolidayOpen] = useState(false);
  const [recurring, setRecurring] = useState(true);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      name,
      date,
      isOpen: isHolidayOpen,
      recurring,
      schedule: isHolidayOpen ? { start: startTime, end: endTime } : undefined,
    });
    setName('');
    setDate('');
    setIsHolidayOpen(false);
    setRecurring(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Adicionar Feriado
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Nome do feriado
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Natal, Ano Novo..."
              required
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-900 focus:border-violet-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Data
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-900 focus:border-violet-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-gray-300">Repete todo ano</span>
            <ToggleSwitch enabled={recurring} onChange={() => setRecurring(!recurring)} size="sm" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-gray-300">Aberto neste dia</span>
            <ToggleSwitch enabled={isHolidayOpen} onChange={() => setIsHolidayOpen(!isHolidayOpen)} size="sm" />
          </div>
          {isHolidayOpen && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Abre as</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Fecha as</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 py-2 font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-violet-600 py-2 font-medium text-white hover:bg-violet-700"
            >
              Adicionar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SchedulePage() {
  const [settings, setSettings] = useState<ScheduleSettings | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [activeTab, setActiveTab] = useState<'schedule' | 'holidays' | 'settings'>('schedule');

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [scheduleData, holidaysData] = await Promise.all([
          scheduleService.get(),
          scheduleService.getHolidays(),
        ]);
        setSettings(scheduleData);
        setHolidays(holidaysData);
      } catch (err) {
        console.error('Error loading schedule:', err);
        setError('Erro ao carregar horarios');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleScheduleChange = (dayIndex: number, field: 'isOpen' | 'start' | 'end', value: boolean | string) => {
    if (!settings) return;

    const days = [...settings.schedule.days];
    const day = { ...days[dayIndex] };

    if (field === 'isOpen') {
      day.isOpen = value as boolean;
    } else if (day.timeRanges.length > 0) {
      day.timeRanges = [{ ...day.timeRanges[0], [field]: value }];
    } else {
      day.timeRanges = [{ start: '09:00', end: '18:00', [field]: value }];
    }

    days[dayIndex] = day;
    setSettings({ ...settings, schedule: { days } });
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleSettingsChange = <K extends keyof ScheduleSettings>(field: K, value: ScheduleSettings[K]) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!settings || !hasChanges) return;

    setIsSaving(true);
    setError(null);

    try {
      const updated = await scheduleService.update(settings);
      setSettings(updated);
      setHasChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving schedule:', err);
      setError('Erro ao salvar alteracoes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddHoliday = async (holiday: Omit<Holiday, 'id'>) => {
    try {
      const newHoliday = await scheduleService.addHoliday(holiday);
      setHolidays([...holidays, newHoliday]);
    } catch (err) {
      console.error('Error adding holiday:', err);
      setError('Erro ao adicionar feriado');
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este feriado?')) return;

    try {
      await scheduleService.deleteHoliday(id);
      setHolidays(holidays.filter(h => h.id !== id));
    } catch (err) {
      console.error('Error deleting holiday:', err);
      setError('Erro ao remover feriado');
    }
  };

  const handleToggleHoliday = async (holiday: Holiday) => {
    try {
      const updated = await scheduleService.updateHoliday(holiday.id, { isOpen: !holiday.isOpen });
      setHolidays(holidays.map(h => h.id === holiday.id ? updated : h));
    } catch (err) {
      console.error('Error updating holiday:', err);
    }
  };

  const copyToAllWeekdays = () => {
    if (!settings) return;
    const monday = settings.schedule.days[1];
    if (!monday.isOpen) return;

    const days = settings.schedule.days.map((day, index) => {
      if (index >= 1 && index <= 5) {
        return {
          ...day,
          isOpen: true,
          timeRanges: [...monday.timeRanges],
        };
      }
      return day;
    });

    setSettings({ ...settings, schedule: { days } });
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <SalonLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-500" />
        </div>
      </SalonLayout>
    );
  }

  if (!settings) {
    return (
      <SalonLayout>
        <div className="flex min-h-[400px] flex-col items-center justify-center text-gray-500">
          <AlertCircle className="h-12 w-12 text-gray-300" />
          <p className="mt-4">Erro ao carregar horarios</p>
        </div>
      </SalonLayout>
    );
  }

  // Calculate total hours per week
  const totalWeeklyHours = settings.schedule.days.reduce((total, day) => {
    if (!day.isOpen || !day.timeRanges[0]) return total;
    const [sh, sm] = day.timeRanges[0].start.split(':').map(Number);
    const [eh, em] = day.timeRanges[0].end.split(':').map(Number);
    return total + ((eh * 60 + em) - (sh * 60 + sm)) / 60;
  }, 0);

  const openDays = settings.schedule.days.filter(d => d.isOpen).length;

  return (
    <SalonLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-cyan-100 p-2 dark:bg-cyan-900/30">
              <Clock className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Horarios de Funcionamento
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Configure dias e horarios de atendimento
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {error && (
              <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm">{error}</span>
              </div>
            )}
            {saveSuccess && (
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <Check className="h-5 w-5" />
                <span className="text-sm">Salvo</span>
              </div>
            )}
            {hasChanges && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Salvando...' : 'Salvar'}
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CalendarCheck className="h-5 w-5" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Dias abertos</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{openDays}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Clock className="h-5 w-5" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Horas/semana</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{totalWeeklyHours.toFixed(0)}h</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <Calendar className="h-5 w-5" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Feriados</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{holidays.length}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
              <Settings className="h-5 w-5" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Intervalo</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{settings.slotDuration}min</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          {[
            { id: 'schedule', label: 'Horarios', icon: Clock },
            { id: 'holidays', label: 'Feriados', icon: Calendar },
            { id: 'settings', label: 'Configuracoes', icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-white text-violet-600 shadow dark:bg-gray-700 dark:text-violet-400'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'schedule' && (
          <div className="space-y-4">
            {/* Quick Actions */}
            <div className="flex justify-end">
              <button
                onClick={copyToAllWeekdays}
                className="text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400"
              >
                Copiar segunda para todos os dias uteis
              </button>
            </div>

            {/* Schedule Grid */}
            <div className="space-y-2">
              {settings.schedule.days.map((day, index) => (
                <DayScheduleRow
                  key={index}
                  day={day}
                  dayIndex={index}
                  onChange={handleScheduleChange}
                />
              ))}
            </div>

            {/* Summary */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-100">Resumo da semana</p>
                  <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                    {openDays} dias abertos, totalizando {totalWeeklyHours.toFixed(0)} horas de atendimento por semana.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'holidays' && (
          <div className="space-y-4">
            {/* Add Holiday Button */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddHoliday(true)}
                className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-700"
              >
                <Plus className="h-4 w-4" />
                Adicionar Feriado
              </button>
            </div>

            {/* Holidays List */}
            {holidays.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white py-12 text-center dark:border-gray-700 dark:bg-gray-800">
                <Calendar className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                <p className="mt-4 text-gray-500 dark:text-gray-400">Nenhum feriado cadastrado</p>
                <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                  Adicione feriados para controlar dias especiais
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {holidays
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((holiday) => (
                    <HolidayCard
                      key={holiday.id}
                      holiday={holiday}
                      onDelete={() => handleDeleteHoliday(holiday.id)}
                      onToggle={() => handleToggleHoliday(holiday)}
                    />
                  ))}
              </div>
            )}

            {/* Info */}
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 text-orange-600 dark:text-orange-400" />
                <div>
                  <p className="font-medium text-orange-900 dark:text-orange-100">Feriados</p>
                  <p className="mt-1 text-sm text-orange-700 dark:text-orange-300">
                    Configure se o estabelecimento estara aberto ou fechado em cada feriado.
                    Feriados marcados como "anual" se repetem automaticamente todo ano.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 font-medium text-gray-900 dark:text-white">Configuracoes de Agendamento</h3>

              <div className="space-y-6">
                {/* Slot Duration */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Duracao do intervalo de agenda (minutos)
                  </label>
                  <select
                    value={settings.slotDuration}
                    onChange={(e) => handleSettingsChange('slotDuration', Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-violet-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value={15}>15 minutos</option>
                    <option value={30}>30 minutos</option>
                    <option value={45}>45 minutos</option>
                    <option value={60}>60 minutos</option>
                  </select>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Define os intervalos de horario disponiveis para agendamento
                  </p>
                </div>

                {/* Buffer Between Appointments */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Intervalo entre agendamentos (minutos)
                  </label>
                  <select
                    value={settings.bufferBetweenAppointments}
                    onChange={(e) => handleSettingsChange('bufferBetweenAppointments', Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-violet-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value={0}>Sem intervalo</option>
                    <option value={5}>5 minutos</option>
                    <option value={10}>10 minutos</option>
                    <option value={15}>15 minutos</option>
                    <option value={30}>30 minutos</option>
                  </select>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Tempo de preparo entre um atendimento e outro
                  </p>
                </div>

                {/* Min Advance Booking */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Antecedencia minima para agendamento (horas)
                  </label>
                  <select
                    value={settings.minAdvanceBooking}
                    onChange={(e) => handleSettingsChange('minAdvanceBooking', Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-violet-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value={0}>Sem limite</option>
                    <option value={1}>1 hora</option>
                    <option value={2}>2 horas</option>
                    <option value={4}>4 horas</option>
                    <option value={12}>12 horas</option>
                    <option value={24}>24 horas</option>
                    <option value={48}>48 horas</option>
                  </select>
                </div>

                {/* Max Advance Booking */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Antecedencia maxima para agendamento (dias)
                  </label>
                  <select
                    value={settings.maxAdvanceBooking}
                    onChange={(e) => handleSettingsChange('maxAdvanceBooking', Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-violet-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value={7}>7 dias</option>
                    <option value={14}>14 dias</option>
                    <option value={30}>30 dias</option>
                    <option value={60}>60 dias</option>
                    <option value={90}>90 dias</option>
                  </select>
                </div>

                {/* Same Day Booking */}
                <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Agendamento no mesmo dia</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Permitir agendamentos para o dia atual
                    </p>
                  </div>
                  <ToggleSwitch
                    enabled={settings.allowSameDayBooking}
                    onChange={() => handleSettingsChange('allowSameDayBooking', !settings.allowSameDayBooking)}
                  />
                </div>

                {/* Timezone */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Fuso horario
                  </label>
                  <select
                    value={settings.timezone}
                    onChange={(e) => handleSettingsChange('timezone', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-violet-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="America/Sao_Paulo">Brasilia (GMT-3)</option>
                    <option value="America/Manaus">Manaus (GMT-4)</option>
                    <option value="America/Cuiaba">Cuiaba (GMT-4)</option>
                    <option value="America/Rio_Branco">Rio Branco (GMT-5)</option>
                    <option value="America/Noronha">Fernando de Noronha (GMT-2)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Holiday Modal */}
        <AddHolidayModal
          isOpen={showAddHoliday}
          onClose={() => setShowAddHoliday(false)}
          onAdd={handleAddHoliday}
        />
      </div>
    </SalonLayout>
  );
}
