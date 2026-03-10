// Audit Log Types - Track all changes in the system

import { ID, Timestamps } from './common';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'restore'
  | 'login'
  | 'logout'
  | 'view'
  | 'export'
  | 'import'
  | 'backup'
  | 'restore_backup';

export type AuditEntity =
  | 'appointment'
  | 'client'
  | 'professional'
  | 'service'
  | 'finance'
  | 'commission'
  | 'promotion'
  | 'stock'
  | 'loyalty'
  | 'review'
  | 'unit'
  | 'user'
  | 'settings'
  | 'backup';

export interface AuditLog extends Timestamps {
  id: ID;
  userId: ID;
  userName: string;
  userRole: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: ID;
  entityName?: string;
  unitId?: ID;
  unitName?: string;
  ipAddress?: string;
  userAgent?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  changedFields?: string[];
  metadata?: Record<string, unknown>;
  description?: string;
}

export interface AuditLogCreateInput {
  action: AuditAction;
  entity: AuditEntity;
  entityId: ID;
  entityName?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogFilters {
  userId?: ID;
  action?: AuditAction | AuditAction[];
  entity?: AuditEntity | AuditEntity[];
  entityId?: ID;
  unitId?: ID;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface AuditStats {
  totalLogs: number;
  byAction: Record<AuditAction, number>;
  byEntity: Record<AuditEntity, number>;
  byUser: { userId: ID; userName: string; count: number }[];
  recentActivity: AuditLog[];
}

// Backup types
export type BackupStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
export type BackupType = 'full' | 'incremental' | 'differential';

export interface Backup extends Timestamps {
  id: ID;
  name: string;
  type: BackupType;
  status: BackupStatus;
  size?: number; // bytes
  fileUrl?: string;
  entities: AuditEntity[];
  includedUnits?: ID[];
  createdBy: ID;
  createdByName: string;
  completedAt?: Date;
  expiresAt?: Date;
  error?: string;
  metadata?: {
    recordCount?: Record<AuditEntity, number>;
    version?: string;
  };
}

export interface BackupCreateInput {
  name?: string;
  type?: BackupType;
  entities?: AuditEntity[];
  includedUnits?: ID[];
}

export interface BackupRestoreInput {
  backupId: ID;
  entities?: AuditEntity[];
  overwrite?: boolean;
}

export interface BackupSettings {
  autoBackupEnabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string; // HH:mm
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  retentionDays: number;
  entities: AuditEntity[];
  notifyOnComplete: boolean;
  notifyOnFailure: boolean;
  notifyEmails: string[];
}

export interface BackupStats {
  totalBackups: number;
  lastBackup?: Backup;
  nextScheduledBackup?: Date;
  totalSize: number;
  oldestBackup?: Date;
  backupsByStatus: Record<BackupStatus, number>;
}
