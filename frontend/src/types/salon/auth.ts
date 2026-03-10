// ===== Sistema de Autenticação e Permissões - Salão/Barbearia =====

import { UserRole as BaseUserRole, Permission as BasePermission } from './user';

/**
 * Roles do sistema para autenticação
 * Compatível com o sistema existente mas com valores uppercase para JWT
 */
export type AuthUserRole = 'ADMIN' | 'RECEPCIONIST' | 'PROFESSIONAL' | 'CLIENT';

/**
 * Permissões granulares do sistema para autenticação
 * Formato: módulo.ação
 */
export type AuthPermission =
  // Usuários
  | 'users.view'
  | 'users.create'
  | 'users.edit'
  | 'users.delete'
  | 'users.manage_roles'
  // Clientes
  | 'clients.view'
  | 'clients.create'
  | 'clients.edit'
  | 'clients.delete'
  | 'clients.view_history'
  | 'clients.manage_loyalty'
  // Profissionais
  | 'professionals.view'
  | 'professionals.create'
  | 'professionals.edit'
  | 'professionals.delete'
  | 'professionals.view_commissions'
  // Serviços
  | 'services.view'
  | 'services.create'
  | 'services.edit'
  | 'services.delete'
  // Agendamentos
  | 'appointments.view'
  | 'appointments.view_all'
  | 'appointments.create'
  | 'appointments.edit'
  | 'appointments.cancel'
  | 'appointments.confirm'
  | 'appointments.complete'
  | 'appointments.manage_waitlist'
  // Financeiro
  | 'finance.view'
  | 'finance.view_all'
  | 'finance.register_payment'
  | 'finance.manage_cash'
  | 'finance.export_reports'
  | 'finance.view_commissions'
  // Comissões
  | 'commissions.view'
  | 'commissions.view_all'
  | 'commissions.manage'
  | 'commissions.pay'
  // Promoções
  | 'promotions.view'
  | 'promotions.create'
  | 'promotions.edit'
  | 'promotions.delete'
  | 'promotions.manage_campaigns'
  // Estoque
  | 'stock.view'
  | 'stock.manage'
  | 'stock.register_movement'
  // Fidelidade
  | 'loyalty.view'
  | 'loyalty.manage'
  // Avaliações
  | 'reviews.view'
  | 'reviews.view_all'
  | 'reviews.respond'
  | 'reviews.moderate'
  // Dashboard
  | 'dashboard.view'
  | 'dashboard.view_full'
  // Multi-unidade
  | 'units.view_all'
  | 'units.manage'
  // Sistema
  | 'system.settings'
  | 'system.backup'
  | 'system.logs';

/**
 * Mapeamento de permissões por role
 * Define quais permissões cada role tem por padrão
 */
export const AUTH_ROLE_PERMISSIONS: Record<AuthUserRole, AuthPermission[]> = {
  ADMIN: [
    // Todas as permissões
    'users.view', 'users.create', 'users.edit', 'users.delete', 'users.manage_roles',
    'clients.view', 'clients.create', 'clients.edit', 'clients.delete', 'clients.view_history', 'clients.manage_loyalty',
    'professionals.view', 'professionals.create', 'professionals.edit', 'professionals.delete', 'professionals.view_commissions',
    'services.view', 'services.create', 'services.edit', 'services.delete',
    'appointments.view', 'appointments.view_all', 'appointments.create', 'appointments.edit', 'appointments.cancel', 'appointments.confirm', 'appointments.complete', 'appointments.manage_waitlist',
    'finance.view', 'finance.view_all', 'finance.register_payment', 'finance.manage_cash', 'finance.export_reports', 'finance.view_commissions',
    'commissions.view', 'commissions.view_all', 'commissions.manage', 'commissions.pay',
    'promotions.view', 'promotions.create', 'promotions.edit', 'promotions.delete', 'promotions.manage_campaigns',
    'stock.view', 'stock.manage', 'stock.register_movement',
    'loyalty.view', 'loyalty.manage',
    'reviews.view', 'reviews.view_all', 'reviews.respond', 'reviews.moderate',
    'dashboard.view', 'dashboard.view_full',
    'units.view_all', 'units.manage',
    'system.settings', 'system.backup', 'system.logs',
  ],
  RECEPCIONIST: [
    'clients.view', 'clients.create', 'clients.edit', 'clients.view_history',
    'professionals.view',
    'services.view',
    'appointments.view', 'appointments.view_all', 'appointments.create', 'appointments.edit', 'appointments.cancel', 'appointments.confirm', 'appointments.complete', 'appointments.manage_waitlist',
    'finance.view', 'finance.register_payment', 'finance.manage_cash',
    'dashboard.view',
    'promotions.view',
  ],
  PROFESSIONAL: [
    'clients.view', 'clients.view_history',
    'services.view',
    'appointments.view', 'appointments.confirm', 'appointments.complete',
    'commissions.view',
    'reviews.view',
    'dashboard.view',
  ],
  CLIENT: [
    'appointments.view', 'appointments.create', 'appointments.cancel',
    'services.view',
    'professionals.view',
  ],
};

/**
 * Labels para exibição das roles
 */
export const AUTH_ROLE_LABELS: Record<AuthUserRole, string> = {
  ADMIN: 'Administrador',
  RECEPCIONIST: 'Recepcionista',
  PROFESSIONAL: 'Profissional',
  CLIENT: 'Cliente',
};

/**
 * Cores para badges das roles
 */
export const AUTH_ROLE_COLORS: Record<AuthUserRole, { bg: string; text: string }> = {
  ADMIN: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' },
  RECEPCIONIST: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  PROFESSIONAL: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
  CLIENT: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300' },
};

/**
 * Converte role do sistema existente para AuthUserRole
 */
export function toAuthUserRole(role: BaseUserRole): AuthUserRole {
  const mapping: Record<BaseUserRole, AuthUserRole> = {
    admin: 'ADMIN',
    manager: 'ADMIN', // Manager tem mesmas permissões de admin
    receptionist: 'RECEPCIONIST',
    professional: 'PROFESSIONAL',
    client: 'CLIENT',
  };
  return mapping[role];
}

/**
 * Converte AuthUserRole para role do sistema existente
 */
export function fromAuthUserRole(role: AuthUserRole): BaseUserRole {
  const mapping: Record<AuthUserRole, BaseUserRole> = {
    ADMIN: 'admin',
    RECEPCIONIST: 'receptionist',
    PROFESSIONAL: 'professional',
    CLIENT: 'client',
  };
  return mapping[role];
}

/**
 * Interface do usuário autenticado
 */
export interface SalonAuthUser {
  id: string;
  email: string;
  name: string;
  role: AuthUserRole;
  permissions: AuthPermission[];
  avatar?: string;
  phone?: string;
  unitId?: string;
  unitIds?: string[];
  professionalId?: string;
  clientId?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Estado de autenticação
 */
export interface SalonAuthState {
  user: SalonAuthUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  permissions: AuthPermission[];
}

/**
 * Resposta do login
 */
export interface AuthLoginResponse {
  user: SalonAuthUser;
  token: string;
  refreshToken?: string;
  expiresIn: number;
}

/**
 * Payload do token JWT decodificado
 */
export interface AuthJWTPayload {
  sub: string;
  email: string;
  name: string;
  role: AuthUserRole;
  permissions: AuthPermission[];
  unitId?: string;
  iat: number;
  exp: number;
}

/**
 * Opções de rota protegida
 */
export interface AuthProtectedRouteOptions {
  requiredRole?: AuthUserRole | AuthUserRole[];
  requiredPermissions?: AuthPermission | AuthPermission[];
  requireAll?: boolean;
  redirectTo?: string;
}
