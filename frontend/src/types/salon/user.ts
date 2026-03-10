// User and Permission types for the salon system

import { ID, Timestamps, Status, SoftDelete } from './common';

// User Roles
export type UserRole = 'admin' | 'manager' | 'receptionist' | 'professional' | 'client';

export interface User extends Timestamps, SoftDelete {
  id: ID;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;

  // Auth
  passwordHash?: string;
  emailVerified: boolean;
  phoneVerified: boolean;

  // Role
  role: UserRole;
  roleId?: ID;
  customRole?: Role;

  // Status
  status: Status;
  lastLoginAt?: Date;
  lastActiveAt?: Date;

  // Professional link
  professionalId?: ID;

  // Client link
  clientId?: ID;

  // Multi-unit
  unitIds: ID[];
  primaryUnitId?: ID;

  // Settings
  preferences?: UserPreferences;

  // Security
  twoFactorEnabled: boolean;
  failedLoginAttempts: number;
  lockedUntil?: Date;
}

export interface UserPreferences {
  language: string;
  timezone: string;
  dateFormat: string;
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    whatsapp: boolean;
  };
  dashboardLayout?: Record<string, unknown>;
}

export interface UserCreateInput {
  email: string;
  name: string;
  phone?: string;
  password: string;
  role: UserRole;
  roleId?: ID;
  unitIds: ID[];
  primaryUnitId?: ID;
  avatar?: string;
}

export interface UserUpdateInput {
  name?: string;
  phone?: string;
  avatar?: string;
  status?: Status;
  role?: UserRole;
  roleId?: ID;
  unitIds?: ID[];
  primaryUnitId?: ID;
  preferences?: Partial<UserPreferences>;
}

export interface UserFilters {
  search?: string;
  role?: UserRole;
  status?: Status;
  unitId?: ID;
  hasLoggedIn?: boolean;
}

// Roles and Permissions
export type PermissionModule =
  | 'dashboard'
  | 'clients'
  | 'appointments'
  | 'services'
  | 'finance'
  | 'commissions'
  | 'promotions'
  | 'stock'
  | 'users'
  | 'reviews'
  | 'loyalty'
  | 'units'
  | 'settings'
  | 'reports';

export type PermissionAction =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'export'
  | 'manage';

export interface Permission {
  module: PermissionModule;
  action: PermissionAction;
  allowed: boolean;
}

export interface Role extends Timestamps {
  id: ID;
  name: string;
  description?: string;
  isDefault: boolean;
  isSystemRole: boolean; // Cannot be deleted

  permissions: Permission[];

  // Inheritance
  inheritsFrom?: ID;

  userCount?: number;
}

export interface RoleCreateInput {
  name: string;
  description?: string;
  permissions: Permission[];
  inheritsFrom?: ID;
}

export interface RoleUpdateInput extends Partial<RoleCreateInput> {}

// Default role permissions
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Partial<Record<PermissionModule, PermissionAction[]>>> = {
  admin: {
    dashboard: ['view', 'manage'],
    clients: ['view', 'create', 'edit', 'delete', 'export'],
    appointments: ['view', 'create', 'edit', 'delete', 'manage'],
    services: ['view', 'create', 'edit', 'delete'],
    finance: ['view', 'create', 'edit', 'delete', 'export', 'manage'],
    commissions: ['view', 'create', 'edit', 'delete', 'manage'],
    promotions: ['view', 'create', 'edit', 'delete'],
    stock: ['view', 'create', 'edit', 'delete', 'manage'],
    users: ['view', 'create', 'edit', 'delete', 'manage'],
    reviews: ['view', 'edit', 'delete', 'manage'],
    loyalty: ['view', 'create', 'edit', 'delete', 'manage'],
    units: ['view', 'create', 'edit', 'delete', 'manage'],
    settings: ['view', 'edit', 'manage'],
    reports: ['view', 'export'],
  },
  manager: {
    dashboard: ['view'],
    clients: ['view', 'create', 'edit', 'export'],
    appointments: ['view', 'create', 'edit', 'delete'],
    services: ['view', 'create', 'edit'],
    finance: ['view', 'create', 'edit', 'export'],
    commissions: ['view', 'create', 'edit'],
    promotions: ['view', 'create', 'edit'],
    stock: ['view', 'create', 'edit'],
    users: ['view', 'create', 'edit'],
    reviews: ['view', 'edit'],
    loyalty: ['view', 'edit'],
    settings: ['view', 'edit'],
    reports: ['view', 'export'],
  },
  receptionist: {
    dashboard: ['view'],
    clients: ['view', 'create', 'edit'],
    appointments: ['view', 'create', 'edit'],
    services: ['view'],
    finance: ['view', 'create'],
    reviews: ['view'],
    loyalty: ['view'],
  },
  professional: {
    dashboard: ['view'],
    clients: ['view'],
    appointments: ['view'],
    services: ['view'],
    commissions: ['view'],
    reviews: ['view'],
  },
  client: {
    appointments: ['view', 'create'],
    services: ['view'],
    reviews: ['view', 'create'],
    loyalty: ['view'],
  },
};

// Activity Log
export type ActivityType =
  | 'login'
  | 'logout'
  | 'create'
  | 'update'
  | 'delete'
  | 'view'
  | 'export'
  | 'password_change'
  | 'permission_change'
  | 'setting_change';

export interface ActivityLog extends Timestamps {
  id: ID;
  userId: ID;
  userName: string;
  userEmail: string;

  activityType: ActivityType;
  module: PermissionModule | 'auth' | 'system';
  action: string;
  description: string;

  // Target
  targetType?: string;
  targetId?: ID;
  targetName?: string;

  // Changes
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;

  // Meta
  ipAddress?: string;
  userAgent?: string;
  unitId?: ID;
}

export interface ActivityLogFilters {
  userId?: ID;
  activityType?: ActivityType;
  module?: PermissionModule | 'auth' | 'system';
  dateFrom?: Date;
  dateTo?: Date;
  unitId?: ID;
}

// Session
export interface UserSession extends Timestamps {
  id: ID;
  userId: ID;
  token: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  isActive: boolean;
  lastActivityAt: Date;
}

// User Stats
export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  byRole: Record<UserRole, number>;
  newUsersThisMonth: number;
  loginsToday: number;
  activeNow: number;
}
