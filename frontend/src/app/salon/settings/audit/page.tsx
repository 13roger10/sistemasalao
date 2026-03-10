'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Search,
  Filter,
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
  Calendar,
} from 'lucide-react';
import { format, formatDistanceToNow, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
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

const actionColors: Record<AuditAction, string> = {
  create: 'bg-green-100 text-green-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
  restore: 'bg-purple-100 text-purple-700',
  login: 'bg-violet-100 text-violet-700',
  logout: 'bg-gray-100 text-gray-700',
  view: 'bg-yellow-100 text-yellow-700',
  export: 'bg-cyan-100 text-cyan-700',
  import: 'bg-orange-100 text-orange-700',
  backup: 'bg-indigo-100 text-indigo-700',
  restore_backup: 'bg-pink-100 text-pink-700',
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
  const router = useRouter();
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
            <h1 className="text-lg font-semibold">Logs de Alteracao</h1>
            <p className="text-sm text-gray-500">
              Historico de todas as alteracoes no sistema
            </p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600"
          >
            <Download className="h-4 w-4" />
            Exportar
          </button>
        </div>

        {/* Filters */}
        <div className="border-t px-4 py-3">
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-violet-500 focus:outline-none"
              />
            </div>

            {/* Action Filter */}
            <select
              value={selectedAction}
              onChange={e => setSelectedAction(e.target.value as AuditAction | '')}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
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
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
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
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
            >
              <option value="today">Hoje</option>
              <option value="week">Ultima semana</option>
              <option value="month">Ultimo mes</option>
              <option value="all">Todos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Total de Logs</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalLogs}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Criacoes</p>
            <p className="text-2xl font-bold text-green-600">{stats.byAction.create || 0}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Alteracoes</p>
            <p className="text-2xl font-bold text-blue-600">{stats.byAction.update || 0}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Exclusoes</p>
            <p className="text-2xl font-bold text-red-600">{stats.byAction.delete || 0}</p>
          </div>
        </div>
      )}

      {/* Logs List */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-500" />
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-xl bg-white py-12 text-center shadow-sm">
            <FileText className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-gray-500">Nenhum log encontrado</p>
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
  );
}

function LogCard({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        {/* Action Icon */}
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full',
            actionColors[log.action]
          )}
        >
          {actionIcons[log.action]}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900">
            {log.description || `${actionLabels[log.action]} de ${entityLabels[log.entity]}`}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
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
              actionColors[log.action]
            )}
          >
            {actionLabels[log.action]}
          </span>
          <span className="text-xs text-gray-400">
            {entityLabels[log.entity]}
          </span>
        </div>
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t bg-gray-50 p-4">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">ID do Registro:</span>
              <span className="font-mono text-gray-900">{log.entityId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Data/Hora:</span>
              <span className="text-gray-900">
                {format(new Date(log.createdAt), "dd/MM/yyyy 'as' HH:mm:ss", { locale: ptBR })}
              </span>
            </div>
            {log.ipAddress && (
              <div className="flex justify-between">
                <span className="text-gray-500">IP:</span>
                <span className="font-mono text-gray-900">{log.ipAddress}</span>
              </div>
            )}
            {log.changedFields && log.changedFields.length > 0 && (
              <div>
                <span className="text-gray-500">Campos alterados:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {log.changedFields.map(field => (
                    <span
                      key={field}
                      className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700"
                    >
                      {field}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {log.oldValues && (
              <div>
                <span className="text-gray-500">Valores anteriores:</span>
                <pre className="mt-1 overflow-auto rounded bg-gray-100 p-2 text-xs">
                  {JSON.stringify(log.oldValues, null, 2)}
                </pre>
              </div>
            )}
            {log.newValues && (
              <div>
                <span className="text-gray-500">Novos valores:</span>
                <pre className="mt-1 overflow-auto rounded bg-gray-100 p-2 text-xs">
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
