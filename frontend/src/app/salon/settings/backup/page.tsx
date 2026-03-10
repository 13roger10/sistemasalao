'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Download,
  Upload,
  HardDrive,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Settings,
  Trash2,
  RefreshCw,
  Calendar,
  Database,
  Shield,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { auditService } from '@/services/salon/auditService';
import type { Backup, BackupSettings, BackupStats, BackupStatus, AuditEntity } from '@/types/salon/audit';

const statusConfig: Record<BackupStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: 'Pendente',
    color: 'bg-yellow-100 text-yellow-700',
    icon: <Clock className="h-4 w-4" />,
  },
  in_progress: {
    label: 'Em andamento',
    color: 'bg-blue-100 text-blue-700',
    icon: <RefreshCw className="h-4 w-4 animate-spin" />,
  },
  completed: {
    label: 'Concluido',
    color: 'bg-green-100 text-green-700',
    icon: <CheckCircle className="h-4 w-4" />,
  },
  failed: {
    label: 'Falhou',
    color: 'bg-red-100 text-red-700',
    icon: <XCircle className="h-4 w-4" />,
  },
};

const entityLabels: Record<AuditEntity, string> = {
  appointment: 'Agendamentos',
  client: 'Clientes',
  professional: 'Profissionais',
  service: 'Servicos',
  finance: 'Financeiro',
  commission: 'Comissoes',
  promotion: 'Promocoes',
  stock: 'Estoque',
  loyalty: 'Fidelidade',
  review: 'Avaliacoes',
  unit: 'Unidades',
  user: 'Usuarios',
  settings: 'Configuracoes',
  backup: 'Backups',
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function BackupPage() {
  const router = useRouter();
  const [backups, setBackups] = useState<Backup[]>([]);
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [settings, setSettings] = useState<BackupSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedEntities, setSelectedEntities] = useState<AuditEntity[]>([]);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [backupsResponse, statsResponse, settingsResponse] = await Promise.all([
          auditService.backups.list({ limit: 50 }),
          auditService.backups.getStats(),
          auditService.backups.getSettings(),
        ]);

        setBackups(backupsResponse.data);
        setStats(statsResponse);
        setSettings(settingsResponse);
        setSelectedEntities(settingsResponse.entities);
      } catch (error) {
        console.error('Error loading backups:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Create backup
  const handleCreateBackup = async () => {
    setIsCreating(true);
    try {
      const backup = await auditService.backups.runNow({
        type: 'full',
        entities: selectedEntities.length > 0 ? selectedEntities : undefined,
      });

      setBackups(prev => [backup, ...prev]);
    } catch (error) {
      console.error('Error creating backup:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // Download backup
  const handleDownload = async (backup: Backup) => {
    try {
      const blob = await auditService.backups.download(backup.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${backup.name || backup.id}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading backup:', error);
    }
  };

  // Delete backup
  const handleDelete = async (backup: Backup) => {
    if (!confirm('Tem certeza que deseja excluir este backup?')) return;

    try {
      await auditService.backups.delete(backup.id);
      setBackups(prev => prev.filter(b => b.id !== backup.id));
    } catch (error) {
      console.error('Error deleting backup:', error);
    }
  };

  // Save settings
  const handleSaveSettings = async () => {
    if (!settings) return;

    try {
      const updated = await auditService.backups.updateSettings(settings);
      setSettings(updated);
      setShowSettings(false);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  // Toggle entity selection
  const toggleEntity = (entity: AuditEntity) => {
    setSelectedEntities(prev =>
      prev.includes(entity)
        ? prev.filter(e => e !== entity)
        : [...prev, entity]
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="flex items-center gap-4 p-4">
          <button
            onClick={() => router.back()}
            className="rounded-full p-2 hover:bg-gray-100"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Backup Automatico</h1>
            <p className="text-sm text-gray-500">
              Gerencie backups do sistema
            </p>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="rounded-full p-2 hover:bg-gray-100"
          >
            <Settings className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-violet-600">
              <Database className="h-5 w-5" />
              <span className="text-sm text-gray-500">Total de Backups</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{stats.totalBackups}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-green-600">
              <HardDrive className="h-5 w-5" />
              <span className="text-sm text-gray-500">Tamanho Total</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {formatBytes(stats.totalSize)}
            </p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-blue-600">
              <Clock className="h-5 w-5" />
              <span className="text-sm text-gray-500">Ultimo Backup</span>
            </div>
            <p className="mt-2 text-sm font-medium text-gray-900">
              {stats.lastBackup
                ? formatDistanceToNow(new Date(stats.lastBackup.createdAt), {
                    addSuffix: true,
                    locale: ptBR,
                  })
                : 'Nunca'}
            </p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-orange-600">
              <Calendar className="h-5 w-5" />
              <span className="text-sm text-gray-500">Proximo Backup</span>
            </div>
            <p className="mt-2 text-sm font-medium text-gray-900">
              {stats.nextScheduledBackup
                ? format(new Date(stats.nextScheduledBackup), "dd/MM 'as' HH:mm")
                : 'Nao agendado'}
            </p>
          </div>
        </div>
      )}

      {/* Create Backup Section */}
      <div className="p-4">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Criar Backup Agora</h3>
              <p className="text-sm text-gray-500">
                Execute um backup manual do sistema
              </p>
            </div>
            <button
              onClick={handleCreateBackup}
              disabled={isCreating}
              className={cn(
                'flex items-center gap-2 rounded-xl px-6 py-3 font-medium text-white',
                isCreating
                  ? 'bg-gray-400'
                  : 'bg-violet-500 hover:bg-violet-600'
              )}
            >
              {isCreating ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  Iniciar Backup
                </>
              )}
            </button>
          </div>

          {/* Entity Selection */}
          <div className="mt-4">
            <p className="mb-2 text-sm text-gray-500">Selecione os dados para backup:</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(entityLabels) as AuditEntity[])
                .filter(e => e !== 'backup')
                .map(entity => (
                  <button
                    key={entity}
                    onClick={() => toggleEntity(entity)}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                      selectedEntities.includes(entity)
                        ? 'bg-violet-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    {entityLabels[entity]}
                  </button>
                ))}
            </div>
            {selectedEntities.length === 0 && (
              <p className="mt-2 text-xs text-gray-400">
                Nenhum selecionado = backup completo
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && settings && (
        <div className="mx-4 mb-4 rounded-xl bg-white p-4 shadow-sm">
          <h3 className="mb-4 font-medium text-gray-900">
            Configuracoes de Backup Automatico
          </h3>

          <div className="space-y-4">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-700">Backup Automatico</p>
                <p className="text-sm text-gray-500">
                  Executar backups automaticamente
                </p>
              </div>
              <button
                onClick={() =>
                  setSettings({
                    ...settings,
                    autoBackupEnabled: !settings.autoBackupEnabled,
                  })
                }
                className={cn(
                  'relative h-6 w-11 rounded-full transition-colors',
                  settings.autoBackupEnabled ? 'bg-violet-500' : 'bg-gray-300'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                    settings.autoBackupEnabled ? 'translate-x-5' : 'translate-x-0.5'
                  )}
                />
              </button>
            </div>

            {settings.autoBackupEnabled && (
              <>
                {/* Frequency */}
                <div>
                  <label className="mb-1 block text-sm text-gray-600">Frequencia</label>
                  <select
                    value={settings.frequency}
                    onChange={e =>
                      setSettings({
                        ...settings,
                        frequency: e.target.value as BackupSettings['frequency'],
                      })
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-violet-500 focus:outline-none"
                  >
                    <option value="daily">Diario</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensal</option>
                  </select>
                </div>

                {/* Time */}
                <div>
                  <label className="mb-1 block text-sm text-gray-600">Horario</label>
                  <input
                    type="time"
                    value={settings.time}
                    onChange={e =>
                      setSettings({ ...settings, time: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-violet-500 focus:outline-none"
                  />
                </div>

                {/* Retention */}
                <div>
                  <label className="mb-1 block text-sm text-gray-600">
                    Manter backups por (dias)
                  </label>
                  <input
                    type="number"
                    value={settings.retentionDays}
                    onChange={e =>
                      setSettings({
                        ...settings,
                        retentionDays: parseInt(e.target.value) || 30,
                      })
                    }
                    min={7}
                    max={365}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-violet-500 focus:outline-none"
                  />
                </div>

                {/* Notifications */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-700">Notificar ao concluir</p>
                  </div>
                  <button
                    onClick={() =>
                      setSettings({
                        ...settings,
                        notifyOnComplete: !settings.notifyOnComplete,
                      })
                    }
                    className={cn(
                      'relative h-6 w-11 rounded-full transition-colors',
                      settings.notifyOnComplete ? 'bg-violet-500' : 'bg-gray-300'
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                        settings.notifyOnComplete ? 'translate-x-5' : 'translate-x-0.5'
                      )}
                    />
                  </button>
                </div>
              </>
            )}

            {/* Save Button */}
            <button
              onClick={handleSaveSettings}
              className="w-full rounded-xl bg-violet-500 py-3 font-medium text-white hover:bg-violet-600"
            >
              Salvar Configuracoes
            </button>
          </div>
        </div>
      )}

      {/* Backups List */}
      <div className="p-4">
        <h3 className="mb-3 font-medium text-gray-900">Historico de Backups</h3>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-500" />
          </div>
        ) : backups.length === 0 ? (
          <div className="rounded-xl bg-white py-12 text-center shadow-sm">
            <Shield className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-gray-500">Nenhum backup encontrado</p>
            <p className="mt-1 text-sm text-gray-400">
              Crie seu primeiro backup agora
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {backups.map(backup => (
              <BackupCard
                key={backup.id}
                backup={backup}
                onDownload={() => handleDownload(backup)}
                onDelete={() => handleDelete(backup)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface BackupCardProps {
  backup: Backup;
  onDownload: () => void;
  onDelete: () => void;
}

function BackupCard({ backup, onDownload, onDelete }: BackupCardProps) {
  const status = statusConfig[backup.status];

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full',
              status.color
            )}
          >
            {status.icon}
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {backup.name || `Backup ${format(new Date(backup.createdAt), 'dd/MM/yyyy')}`}
            </p>
            <p className="text-sm text-gray-500">
              {format(new Date(backup.createdAt), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
            </p>
          </div>
        </div>

        <span className={cn('rounded-full px-2 py-1 text-xs font-medium', status.color)}>
          {status.label}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
        <span className="flex items-center gap-1">
          <Database className="h-4 w-4" />
          {backup.entities.length} modulos
        </span>
        {backup.size && (
          <span className="flex items-center gap-1">
            <HardDrive className="h-4 w-4" />
            {formatBytes(backup.size)}
          </span>
        )}
        <span className="flex items-center gap-1">
          Tipo: {backup.type}
        </span>
      </div>

      {backup.error && (
        <div className="mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-600">
          Erro: {backup.error}
        </div>
      )}

      {backup.status === 'completed' && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={onDownload}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-50 py-2 text-sm font-medium text-violet-600 hover:bg-violet-100"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
          <button
            onClick={onDelete}
            className="flex items-center justify-center rounded-lg border border-red-200 px-4 py-2 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
