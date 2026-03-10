// ===== Sistema de Permissões - Utilitários =====

import {
  AuthPermission,
  AuthUserRole,
  SalonAuthUser,
  AUTH_ROLE_PERMISSIONS,
  AuthProtectedRouteOptions,
} from '@/types/salon/auth';

/**
 * Verifica se o usuário tem uma permissão específica
 */
export function hasPermission(user: SalonAuthUser | null, permission: AuthPermission): boolean {
  if (!user) return false;

  // Admin tem todas as permissões
  if (user.role === 'ADMIN') return true;

  // Verifica nas permissões do usuário
  return user.permissions.includes(permission);
}

/**
 * Verifica se o usuário tem TODAS as permissões especificadas
 */
export function hasAllPermissions(user: SalonAuthUser | null, permissions: AuthPermission[]): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;

  return permissions.every(permission => user.permissions.includes(permission));
}

/**
 * Verifica se o usuário tem ALGUMA das permissões especificadas
 */
export function hasAnyPermission(user: SalonAuthUser | null, permissions: AuthPermission[]): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;

  return permissions.some(permission => user.permissions.includes(permission));
}

/**
 * Verifica se o usuário tem uma role específica
 */
export function hasRole(user: SalonAuthUser | null, role: AuthUserRole | AuthUserRole[]): boolean {
  if (!user) return false;

  if (Array.isArray(role)) {
    return role.includes(user.role);
  }

  return user.role === role;
}

/**
 * Verifica se o usuário pode acessar uma rota protegida
 */
export function canAccessRoute(user: SalonAuthUser | null, options: AuthProtectedRouteOptions): boolean {
  if (!user) return false;

  const { requiredRole, requiredPermissions, requireAll = true } = options;

  // Verifica role se especificada
  if (requiredRole) {
    if (!hasRole(user, requiredRole)) {
      return false;
    }
  }

  // Verifica permissões se especificadas
  if (requiredPermissions) {
    const permissions = Array.isArray(requiredPermissions)
      ? requiredPermissions
      : [requiredPermissions];

    if (requireAll) {
      if (!hasAllPermissions(user, permissions)) {
        return false;
      }
    } else {
      if (!hasAnyPermission(user, permissions)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Obtém as permissões padrão de uma role
 */
export function getDefaultPermissions(role: AuthUserRole): AuthPermission[] {
  return AUTH_ROLE_PERMISSIONS[role] || [];
}

/**
 * Verifica se o usuário pode ver dados de uma unidade específica
 */
export function canAccessUnit(user: SalonAuthUser | null, unitId: string): boolean {
  if (!user) return false;

  // Admin com permissão de ver todas as unidades
  if (user.role === 'ADMIN' && user.permissions.includes('units.view_all')) {
    return true;
  }

  // Se tem unitIds definidos, verifica se a unidade está na lista
  if (user.unitIds && user.unitIds.length > 0) {
    return user.unitIds.includes(unitId);
  }

  // Caso contrário, só pode ver a própria unidade
  return user.unitId === unitId;
}

/**
 * Verifica se o usuário pode ver dados de um profissional específico
 */
export function canAccessProfessionalData(
  user: SalonAuthUser | null,
  professionalId: string
): boolean {
  if (!user) return false;

  // Admin e Recepcionista podem ver todos
  if (hasRole(user, ['ADMIN', 'RECEPCIONIST'])) {
    return true;
  }

  // Profissional só pode ver seus próprios dados
  if (user.role === 'PROFESSIONAL') {
    return user.professionalId === professionalId;
  }

  return false;
}

/**
 * Verifica se o usuário pode ver dados de um cliente específico
 */
export function canAccessClientData(
  user: SalonAuthUser | null,
  clientId: string
): boolean {
  if (!user) return false;

  // Admin, Recepcionista e Profissional podem ver clientes
  if (hasRole(user, ['ADMIN', 'RECEPCIONIST', 'PROFESSIONAL'])) {
    return true;
  }

  // Cliente só pode ver seus próprios dados
  if (user.role === 'CLIENT') {
    return user.clientId === clientId;
  }

  return false;
}

/**
 * Filtra uma lista de itens baseado nas permissões do usuário
 */
export function filterByPermission<T>(
  items: T[],
  user: SalonAuthUser | null,
  getRequiredPermission: (item: T) => AuthPermission | undefined
): T[] {
  if (!user) return [];
  if (user.role === 'ADMIN') return items;

  return items.filter(item => {
    const permission = getRequiredPermission(item);
    if (!permission) return true;
    return hasPermission(user, permission);
  });
}

/**
 * Cria um guard de permissão para uso em componentes
 */
export function createPermissionGuard(user: SalonAuthUser | null) {
  return {
    can: (permission: AuthPermission) => hasPermission(user, permission),
    canAll: (permissions: AuthPermission[]) => hasAllPermissions(user, permissions),
    canAny: (permissions: AuthPermission[]) => hasAnyPermission(user, permissions),
    hasRole: (role: AuthUserRole | AuthUserRole[]) => hasRole(user, role),
    canAccess: (options: AuthProtectedRouteOptions) => canAccessRoute(user, options),
  };
}

/**
 * Hook helper - retorna objeto com verificações de permissão
 */
export type PermissionGuard = ReturnType<typeof createPermissionGuard>;
