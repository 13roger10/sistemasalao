'use client';

import { useState, useEffect } from 'react';
import {
  Download,
  HardDrive,
  Clock,
  CheckCircle,
  XCircle,
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
import { SalonLayout } from '@/components/layout/SalonLayout';
import { auditService } from '@/services/salon/auditService';
import type { Backup, BackupSettings, BackupStats, BackupStatus, AuditEntity } from '@/types/salon/audit';

const statusConfig: Record<BackupStatus, { label: string; color: string; darkColor: string; icon: React.ReactNode }> = {
  pending: {
    label: 'Pendente',
    color: 'bg-yellow-100 text-yellow-700',
    darkColor: 'dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: <Clock className="h-4 w-4" />,
  },
  in_progress: {
    label: 'Em andamento',
    color: 'bg-blue-100 text-blue-700',
    darkColor: 'dark:bg-blue-900/30 dark:text-blue-400',
    icon: <RefreshCw className="h-4 w-4 animate-spin" />,
  },
  completed: {
    label: 'Concluido',
    color: 'bg-green-100 text-green-700',
    darkColor: 'dark:bg-green-900/30 dark:text-green-400',
    icon: <CheckCircle className="h-4 w-4" />,
  },
  failed: {
    label: 'Falhou',
    color: 'bg-red-100 text-red-700',
    darkColor: 'dark:bg-red-900/30 dark:text-red-400',
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

  if (isLoading) {
    return (
      <SalonLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-500" />
        </div>
      </SalonLayout>
    );
  }

  return (
    <SalonLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
              <Database className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Backup Automatico
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Gerencie backups do sistema
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
                <Database className="h-5 w-5" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Total de Backups</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{stats.totalBackups}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <HardDrive className="h-5 w-5" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Tamanho Total</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {formatBytes(stats.totalSize)}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <Clock className="h-5 w-5" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Ultimo Backup</span>
              </div>
              <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                {stats.lastBackup
                  ? formatDistanceToNow(new Date(stats.lastBackup.createdAt), {
                      addSuffix: true,
                      locale: ptBR,
                    })
                  : 'Nunca'}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                <Calendar className="h-5 w-5" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Proximo Backup</span>
              </div>
              <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                {stats.nextScheduledBackup
                  ? format(new Date(stats.nextScheduledBackup), "dd/MM 'as' HH:mm")
                  : 'Nao agendado'}
              </p>
            </div>
          </div>
        )}

        {/* Create Backup Section */}
        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Criar Backup Agora</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Execute um backup manual do sistema
              </p>
            </div>
            <button
              onClick={handleCreateBackup}
              disabled={isCreating}
              className={cn(
                'flex items-center gap-2 rounded-lg px-6 py-3 font-medium text-white',
                isCreating
                  ? 'bg-gray-400'
                  : 'bg-violet-600 hover:bg-violet-700'
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
            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">Selecione os dados para backup:</p>
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
                        ? 'bg-violet-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    )}
                  >
                    {entityLabels[entity]}
                  </button>
                ))}
            </div>
            {selectedEntities.length === 0 && (
              <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                Nenhum selecionado = backup completo
              </p>
            )}
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && settings && (
          <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-4 font-medium text-gray-900 dark:text-white">
              Configuracoes de Backup Automatico
            </h3>

            <div className="space-y-4">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-700 dark:text-gray-300">Backup Automatico</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
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
                    settings.autoBackupEnabled ? 'bg-violet-500' : 'bg-gray-300 dark:bg-gray-600'
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
                    <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Frequencia</label>
                    <select
                      value={settings.frequency}
                      onChange={e =>
                        setSettings({
                          ...settings,
                          frequency: e.target.value as BackupSettings['frequency'],
                        })
                      }
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 focus:border-violet-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="daily">Diario</option>
                      <option value="weekly">Semanal</option>
                      <option value="monthly">Mensal</option>
                    </select>
                  </div>

                  {/* Time */}
                  <div>
                    <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Horario</label>
                    <input
                      type="time"
                      value={settings.time}
                      onChange={e =>
                        setSettings({ ...settings, time: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 focus:border-violet-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  {/* Retention */}
                  <div>
                    <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">
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
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 focus:border-violet-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  {/* Notifications */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">Notificar ao concluir</p>
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
                        settings.notifyOnComplete ? 'bg-violet-500' : 'bg-gray-300 dark:bg-gray-600'
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
                className="w-full rounded-lg bg-violet-600 py-3 font-medium text-white hover:bg-violet-700"
              >
                Salvar Configuracoes
              </button>
            </div>
          </div>
        )}

        {/* Backups List */}
        <div>
          <h3 className="mb-3 font-medium text-gray-900 dark:text-white">Historico de Backups</h3>

          {backups.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white py-12 text-center dark:border-gray-700 dark:bg-gray-800">
              <Shield className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
              <p className="mt-4 text-gray-500 dark:text-gray-400">Nenhum backup encontrado</p>
              <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
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
    </SalonLayout>
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
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full',
              status.color,
              status.darkColor
            )}
          >
            {status.icon}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {backup.name || `Backup ${format(new Date(backup.createdAt), 'dd/MM/yyyy')}`}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {format(new Date(backup.createdAt), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
            </p>
          </div>
        </div>

        <span className={cn('rounded-full px-2 py-1 text-xs font-medium', status.color, status.darkColor)}>
          {status.label}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
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
        <div className="mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          Erro: {backup.error}
        </div>
      )}

      {backup.status === 'completed' && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={onDownload}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-50 py-2 text-sm font-medium text-violet-600 hover:bg-violet-100 dark:bg-violet-900/20 dark:text-violet-400 dark:hover:bg-violet-900/30"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
          <button
            onClick={onDelete}
            className="flex items-center justify-center rounded-lg border border-red-200 px-4 py-2 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
