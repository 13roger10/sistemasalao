// Audit Service - Track all changes and manage backups

import { api } from './api';
import type {
  AuditLog,
  AuditLogCreateInput,
  AuditLogFilters,
  AuditStats,
  AuditAction,
  AuditEntity,
  Backup,
  BackupCreateInput,
  BackupRestoreInput,
  BackupSettings,
  BackupStats,
} from '@/types/salon/audit';
import type { PaginatedResponse, PaginationParams } from '@/types/salon/common';

const BASE_PATH = '/salon/audit';

// ===== Audit Context (for automatic logging) =====
let currentContext: {
  userId?: string;
  userName?: string;
  userRole?: string;
  unitId?: string;
  unitName?: string;
} = {};

export function setAuditContext(context: typeof currentContext) {
  currentContext = { ...currentContext, ...context };
}

export function clearAuditContext() {
  currentContext = {};
}

// ===== Audit Service =====
export const auditService = {
  // ===== Audit Logs =====
  logs: {
    // List audit logs with pagination and filters
    list: (
      params: PaginationParams & AuditLogFilters
    ): Promise<PaginatedResponse<AuditLog>> => {
      return api.get<PaginatedResponse<AuditLog>>(`${BASE_PATH}/logs`, {
        ...params,
        dateFrom: params.dateFrom?.toISOString(),
        dateTo: params.dateTo?.toISOString(),
      });
    },

    // Get single log by ID
    getById: (id: string): Promise<AuditLog> => {
      return api.get<AuditLog>(`${BASE_PATH}/logs/${id}`);
    },

    // Create audit log entry
    create: (data: AuditLogCreateInput): Promise<AuditLog> => {
      return api.post<AuditLog>(`${BASE_PATH}/logs`, {
        ...data,
        ...currentContext,
      });
    },

    // Get logs for a specific entity
    getByEntity: (
      entity: AuditEntity,
      entityId: string
    ): Promise<AuditLog[]> => {
      return api.get<AuditLog[]>(`${BASE_PATH}/logs/entity/${entity}/${entityId}`);
    },

    // Get logs by user
    getByUser: (
      userId: string,
      params?: PaginationParams
    ): Promise<PaginatedResponse<AuditLog>> => {
      return api.get<PaginatedResponse<AuditLog>>(`${BASE_PATH}/logs/user/${userId}`, params);
    },

    // Get recent activity
    getRecent: (limit?: number): Promise<AuditLog[]> => {
      return api.get<AuditLog[]>(`${BASE_PATH}/logs/recent`, { limit });
    },

    // Get statistics
    getStats: (params?: {
      dateFrom?: Date;
      dateTo?: Date;
      unitId?: string;
    }): Promise<AuditStats> => {
      return api.get<AuditStats>(`${BASE_PATH}/logs/stats`, {
        dateFrom: params?.dateFrom?.toISOString(),
        dateTo: params?.dateTo?.toISOString(),
        unitId: params?.unitId,
      });
    },

    // Export logs
    export: (
      filters: AuditLogFilters,
      format: 'csv' | 'xlsx' | 'json'
    ): Promise<Blob> => {
      return api.get<Blob>(`${BASE_PATH}/logs/export`, {
        ...filters,
        format,
        dateFrom: filters.dateFrom?.toISOString(),
        dateTo: filters.dateTo?.toISOString(),
      });
    },

    // Purge old logs
    purge: (olderThan: Date): Promise<{ deleted: number }> => {
      return api.post<{ deleted: number }>(`${BASE_PATH}/logs/purge`, {
        olderThan: olderThan.toISOString(),
      });
    },
  },

  // ===== Backups =====
  backups: {
    // List all backups
    list: (params?: PaginationParams): Promise<PaginatedResponse<Backup>> => {
      return api.get<PaginatedResponse<Backup>>(`${BASE_PATH}/backups`, params);
    },

    // Get backup by ID
    getById: (id: string): Promise<Backup> => {
      return api.get<Backup>(`${BASE_PATH}/backups/${id}`);
    },

    // Create new backup
    create: (data?: BackupCreateInput): Promise<Backup> => {
      return api.post<Backup>(`${BASE_PATH}/backups`, data);
    },

    // Delete backup
    delete: (id: string): Promise<void> => {
      return api.delete(`${BASE_PATH}/backups/${id}`);
    },

    // Download backup file
    download: (id: string): Promise<Blob> => {
      return api.get<Blob>(`${BASE_PATH}/backups/${id}/download`);
    },

    // Restore from backup
    restore: (data: BackupRestoreInput): Promise<{ restored: boolean; message: string }> => {
      return api.post<{ restored: boolean; message: string }>(
        `${BASE_PATH}/backups/${data.backupId}/restore`,
        data
      );
    },

    // Get backup stats
    getStats: (): Promise<BackupStats> => {
      return api.get<BackupStats>(`${BASE_PATH}/backups/stats`);
    },

    // Get backup settings
    getSettings: (): Promise<BackupSettings> => {
      return api.get<BackupSettings>(`${BASE_PATH}/backups/settings`);
    },

    // Update backup settings
    updateSettings: (data: Partial<BackupSettings>): Promise<BackupSettings> => {
      return api.patch<BackupSettings>(`${BASE_PATH}/backups/settings`, data);
    },

    // Run manual backup now
    runNow: (data?: BackupCreateInput): Promise<Backup> => {
      return api.post<Backup>(`${BASE_PATH}/backups/run-now`, data);
    },

    // Get latest backup
    getLatest: (): Promise<Backup | null> => {
      return api.get<Backup | null>(`${BASE_PATH}/backups/latest`);
    },
  },

  // ===== Helper Functions =====
  // Log a create action
  logCreate: (
    entity: AuditEntity,
    entityId: string,
    entityName?: string,
    newValues?: Record<string, unknown>
  ): Promise<AuditLog> => {
    return auditService.logs.create({
      action: 'create',
      entity,
      entityId,
      entityName,
      newValues,
      description: `Criado: ${entityName || entity}`,
    });
  },

  // Log an update action
  logUpdate: (
    entity: AuditEntity,
    entityId: string,
    entityName?: string,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>
  ): Promise<AuditLog> => {
    // Calculate changed fields
    const changedFields = oldValues && newValues
      ? Object.keys(newValues).filter(key => oldValues[key] !== newValues[key])
      : undefined;

    return auditService.logs.create({
      action: 'update',
      entity,
      entityId,
      entityName,
      oldValues,
      newValues,
      description: `Atualizado: ${entityName || entity}`,
      metadata: { changedFields },
    });
  },

  // Log a delete action
  logDelete: (
    entity: AuditEntity,
    entityId: string,
    entityName?: string,
    oldValues?: Record<string, unknown>
  ): Promise<AuditLog> => {
    return auditService.logs.create({
      action: 'delete',
      entity,
      entityId,
      entityName,
      oldValues,
      description: `Excluido: ${entityName || entity}`,
    });
  },

  // Log a view action (for sensitive data)
  logView: (
    entity: AuditEntity,
    entityId: string,
    entityName?: string
  ): Promise<AuditLog> => {
    return auditService.logs.create({
      action: 'view',
      entity,
      entityId,
      entityName,
      description: `Visualizado: ${entityName || entity}`,
    });
  },

  // Log an export action
  logExport: (
    entity: AuditEntity,
    format: string,
    count?: number
  ): Promise<AuditLog> => {
    return auditService.logs.create({
      action: 'export',
      entity,
      entityId: 'bulk',
      description: `Exportado: ${count || 'varios'} ${entity}(s) em ${format}`,
      metadata: { format, count },
    });
  },

  // Log login
  logLogin: (userId: string, userName: string): Promise<AuditLog> => {
    return auditService.logs.create({
      action: 'login',
      entity: 'user',
      entityId: userId,
      entityName: userName,
      description: `Login: ${userName}`,
    });
  },

  // Log logout
  logLogout: (userId: string, userName: string): Promise<AuditLog> => {
    return auditService.logs.create({
      action: 'logout',
      entity: 'user',
      entityId: userId,
      entityName: userName,
      description: `Logout: ${userName}`,
    });
  },
};

// ===== HOC for automatic logging =====
export function withAuditLog<T extends Record<string, unknown>>(
  entity: AuditEntity,
  action: AuditAction,
  getEntityId: (data: T) => string,
  getEntityName?: (data: T) => string
) {
  return function decorator<R>(
    originalMethod: (data: T) => Promise<R>
  ): (data: T) => Promise<R> {
    return async function (data: T): Promise<R> {
      const result = await originalMethod(data);

      // Log the action
      await auditService.logs.create({
        action,
        entity,
        entityId: getEntityId(data),
        entityName: getEntityName?.(data),
        newValues: action === 'create' || action === 'update' ? data : undefined,
      });

      return result;
    };
  };
}
