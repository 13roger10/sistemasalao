'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  Download,
  Clock,
  User,
  FileText,
  Edit,
  Trash2,
  Eye,
  LogIn,
  LogOut,
  Plus,
  RefreshCw,
  Shield,
} from 'lucide-react';
import { format, formatDistanceToNow, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { SalonLayout } from '@/components/layout/SalonLayout';
import { auditService } from '@/services/salon/auditService';
import type { AuditLog, AuditAction, AuditEntity, AuditStats } from '@/types/salon/audit';

const actionIcons: Record<AuditAction, React.ReactNode> = {
  create: <Plus className="h-4 w-4" />,
  update: <Edit className="h-4 w-4" />,
  delete: <Trash2 className="h-4 w-4" />,
  restore: <RefreshCw className="h-4 w-4" />,
  login: <LogIn className="h-4 w-4" />,
  logout: <LogOut className="h-4 w-4" />,
  view: <Eye className="h-4 w-4" />,
  export: <Download className="h-4 w-4" />,
  import: <FileText className="h-4 w-4" />,
  backup: <Download className="h-4 w-4" />,
  restore_backup: <RefreshCw className="h-4 w-4" />,
};

const actionColors: Record<AuditAction, { light: string; dark: string }> = {
  create: { light: 'bg-green-100 text-green-700', dark: 'dark:bg-green-900/30 dark:text-green-400' },
  update: { light: 'bg-blue-100 text-blue-700', dark: 'dark:bg-blue-900/30 dark:text-blue-400' },
  delete: { light: 'bg-red-100 text-red-700', dark: 'dark:bg-red-900/30 dark:text-red-400' },
  restore: { light: 'bg-purple-100 text-purple-700', dark: 'dark:bg-purple-900/30 dark:text-purple-400' },
  login: { light: 'bg-violet-100 text-violet-700', dark: 'dark:bg-violet-900/30 dark:text-violet-400' },
  logout: { light: 'bg-gray-100 text-gray-700', dark: 'dark:bg-gray-700 dark:text-gray-300' },
  view: { light: 'bg-yellow-100 text-yellow-700', dark: 'dark:bg-yellow-900/30 dark:text-yellow-400' },
  export: { light: 'bg-cyan-100 text-cyan-700', dark: 'dark:bg-cyan-900/30 dark:text-cyan-400' },
  import: { light: 'bg-orange-100 text-orange-700', dark: 'dark:bg-orange-900/30 dark:text-orange-400' },
  backup: { light: 'bg-indigo-100 text-indigo-700', dark: 'dark:bg-indigo-900/30 dark:text-indigo-400' },
  restore_backup: { light: 'bg-pink-100 text-pink-700', dark: 'dark:bg-pink-900/30 dark:text-pink-400' },
};

const actionLabels: Record<AuditAction, string> = {
  create: 'Criacao',
  update: 'Alteracao',
  delete: 'Exclusao',
  restore: 'Restauracao',
  login: 'Login',
  logout: 'Logout',
  view: 'Visualizacao',
  export: 'Exportacao',
  import: 'Importacao',
  backup: 'Backup',
  restore_backup: 'Restauracao',
};

const entityLabels: Record<AuditEntity, string> = {
  appointment: 'Agendamento',
  client: 'Cliente',
  professional: 'Profissional',
  service: 'Servico',
  finance: 'Financeiro',
  commission: 'Comissao',
  promotion: 'Promocao',
  stock: 'Estoque',
  loyalty: 'Fidelidade',
  review: 'Avaliacao',
  unit: 'Unidade',
  user: 'Usuario',
  settings: 'Configuracoes',
  backup: 'Backup',
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState<AuditAction | ''>('');
  const [selectedEntity, setSelectedEntity] = useState<AuditEntity | ''>('');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('week');

  // Load logs
  useEffect(() => {
    const loadLogs = async () => {
      setIsLoading(true);
      try {
        const dateFrom = dateRange === 'today'
          ? new Date(new Date().setHours(0, 0, 0, 0))
          : dateRange === 'week'
          ? subDays(new Date(), 7)
          : dateRange === 'month'
          ? subDays(new Date(), 30)
          : undefined;

        const [logsResponse, statsResponse] = await Promise.all([
          auditService.logs.list({
            limit: 100,
            action: selectedAction || undefined,
            entity: selectedEntity || undefined,
            search: search || undefined,
            dateFrom,
          }),
          auditService.logs.getStats({ dateFrom }),
        ]);

        setLogs(logsResponse.data);
        setStats(statsResponse);
      } catch (error) {
        console.error('Error loading audit logs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLogs();
  }, [search, selectedAction, selectedEntity, dateRange]);

  const handleExport = async () => {
    try {
      const blob = await auditService.logs.export(
        {
          action: selectedAction || undefined,
          entity: selectedEntity || undefined,
          search: search || undefined,
        },
        'xlsx'
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logs-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting logs:', error);
    }
  };

  return (
    <SalonLayout requiredRole={["ADMIN"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/30">
              <Shield className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Logs de Alteracao
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Historico de todas as alteracoes no sistema
              </p>
            </div>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
          >
            <Download className="h-4 w-4" />
            Exportar
          </button>
        </div>

        {/* Filters */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 focus:border-violet-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              />
            </div>

            {/* Action Filter */}
            <select
              value={selectedAction}
              onChange={e => setSelectedAction(e.target.value as AuditAction | '')}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-violet-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Todas acoes</option>
              {Object.entries(actionLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            {/* Entity Filter */}
            <select
              value={selectedEntity}
              onChange={e => setSelectedEntity(e.target.value as AuditEntity | '')}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-violet-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Todas entidades</option>
              {Object.entries(entityLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            {/* Date Range */}
            <select
              value={dateRange}
              onChange={e => setDateRange(e.target.value as typeof dateRange)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-violet-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="today">Hoje</option>
              <option value="week">Ultima semana</option>
              <option value="month">Ultimo mes</option>
              <option value="all">Todos</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total de Logs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalLogs}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">Criacoes</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.byAction.create || 0}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">Alteracoes</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.byAction.update || 0}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">Exclusoes</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.byAction.delete || 0}</p>
            </div>
          </div>
        )}

        {/* Logs List */}
        <div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-500" />
            </div>
          ) : logs.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white py-12 text-center dark:border-gray-700 dark:bg-gray-800">
              <FileText className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
              <p className="mt-4 text-gray-500 dark:text-gray-400">Nenhum log encontrado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map(log => (
                <LogCard key={log.id} log={log} />
              ))}
            </div>
          )}
        </div>
      </div>
    </SalonLayout>
  );
}

function LogCard({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false);
  const colors = actionColors[log.action];

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        {/* Action Icon */}
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full',
            colors.light,
            colors.dark
          )}
        >
          {actionIcons[log.action]}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900 dark:text-white">
            {log.description || `${actionLabels[log.action]} de ${entityLabels[log.entity]}`}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {log.userName}
            </span>
            <span>-</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(log.createdAt), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-col items-end gap-1">
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              colors.light,
              colors.dark
            )}
          >
            {actionLabels[log.action]}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {entityLabels[log.entity]}
          </span>
        </div>
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">ID do Registro:</span>
              <span className="font-mono text-gray-900 dark:text-white">{log.entityId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Data/Hora:</span>
              <span className="text-gray-900 dark:text-white">
                {format(new Date(log.createdAt), "dd/MM/yyyy 'as' HH:mm:ss", { locale: ptBR })}
              </span>
            </div>
            {log.ipAddress && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">IP:</span>
                <span className="font-mono text-gray-900 dark:text-white">{log.ipAddress}</span>
              </div>
            )}
            {log.changedFields && log.changedFields.length > 0 && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Campos alterados:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {log.changedFields.map(field => (
                    <span
                      key={field}
                      className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    >
                      {field}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {log.oldValues && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Valores anteriores:</span>
                <pre className="mt-1 overflow-auto rounded bg-gray-100 p-2 text-xs text-gray-900 dark:bg-gray-800 dark:text-gray-300">
                  {JSON.stringify(log.oldValues, null, 2)}
                </pre>
              </div>
            )}
            {log.newValues && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Novos valores:</span>
                <pre className="mt-1 overflow-auto rounded bg-gray-100 p-2 text-xs text-gray-900 dark:bg-gray-800 dark:text-gray-300">
                  {JSON.stringify(log.newValues, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
