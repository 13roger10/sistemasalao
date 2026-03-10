"use client";

import { useEffect, useRef, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSalonAuth } from "@/contexts/SalonAuthContext";
import { AuthPermission, AuthUserRole, AUTH_ROLE_LABELS } from "@/types/salon/auth";
import { Loader2, ShieldAlert, Lock } from "lucide-react";

interface SalonProtectedRouteProps {
  children: ReactNode;
  /** Role(s) necessária(s) para acessar */
  requiredRole?: AuthUserRole | AuthUserRole[];
  /** Permissão(ões) necessária(s) para acessar */
  requiredPermissions?: AuthPermission | AuthPermission[];
  /** Se true, precisa de TODAS as permissões. Se false, qualquer uma */
  requireAll?: boolean;
  /** Rota para redirecionar se não autorizado (default: /salon/login) */
  redirectTo?: string;
  /** Componente a exibir enquanto carrega */
  loadingComponent?: ReactNode;
  /** Componente a exibir se não autorizado (ao invés de redirecionar) */
  unauthorizedComponent?: ReactNode;
  /** Se true, mostra mensagem de erro ao invés de redirecionar */
  showUnauthorized?: boolean;
}

export function SalonProtectedRoute({
  children,
  requiredRole,
  requiredPermissions,
  requireAll = true,
  redirectTo = "/salon/login",
  loadingComponent,
  unauthorizedComponent,
  showUnauthorized = false,
}: SalonProtectedRouteProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, can, canAll, canAny, isRole } = useSalonAuth();
  const hasRedirected = useRef(false);

  // Verifica se o usuário tem as permissões necessárias
  const hasRequiredPermissions = (): boolean => {
    if (!requiredPermissions) return true;

    const permissions = Array.isArray(requiredPermissions)
      ? requiredPermissions
      : [requiredPermissions];

    return requireAll ? canAll(permissions) : canAny(permissions);
  };

  // Verifica se o usuário tem a role necessária
  const hasRequiredRole = (): boolean => {
    if (!requiredRole) return true;
    return isRole(requiredRole);
  };

  // Verifica autorização completa
  const isAuthorized = (): boolean => {
    return hasRequiredRole() && hasRequiredPermissions();
  };

  // Redireciona se não autenticado
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push(redirectTo);
    }
  }, [isLoading, isAuthenticated, router, redirectTo]);

  // Redireciona se não autorizado (e showUnauthorized é false)
  useEffect(() => {
    if (
      !isLoading &&
      isAuthenticated &&
      user &&
      !isAuthorized() &&
      !showUnauthorized &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      // Redireciona para uma página apropriada baseada na role
      const roleRedirects: Record<AuthUserRole, string> = {
        ADMIN: "/salon/dashboard",
        RECEPCIONIST: "/salon/dashboard",
        PROFESSIONAL: "/salon/appointments",
        CLIENT: "/salon/client/appointments",
      };
      router.push(roleRedirects[user.role] || "/salon");
    }
  }, [isLoading, isAuthenticated, user, showUnauthorized, router]);

  // Loading state
  if (isLoading) {
    return (
      loadingComponent || (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Verificando autenticação...
            </p>
          </div>
        </div>
      )
    );
  }

  // Não autenticado (redirecionamento em andamento)
  if (!isAuthenticated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <Lock className="h-8 w-8 text-gray-400" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Redirecionando para login...
          </p>
        </div>
      </div>
    );
  }

  // Não autorizado
  if (!isAuthorized()) {
    if (showUnauthorized) {
      return (
        unauthorizedComponent || (
          <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="mx-4 max-w-md rounded-lg bg-white p-8 text-center shadow-lg dark:bg-gray-800">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <ShieldAlert className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                Acesso Negado
              </h2>
              <p className="mb-4 text-gray-600 dark:text-gray-400">
                Você não tem permissão para acessar esta página.
              </p>
              <div className="mb-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Seu perfil: <span className="font-medium text-gray-700 dark:text-gray-300">
                    {AUTH_ROLE_LABELS[user.role]}
                  </span>
                </p>
                {requiredRole && (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Perfil necessário:{" "}
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {Array.isArray(requiredRole)
                        ? requiredRole.map(r => AUTH_ROLE_LABELS[r]).join(" ou ")
                        : AUTH_ROLE_LABELS[requiredRole]}
                    </span>
                  </p>
                )}
              </div>
              <button
                onClick={() => router.back()}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700"
              >
                Voltar
              </button>
            </div>
          </div>
        )
      );
    }

    // Redirecionando
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Redirecionando...
          </p>
        </div>
      </div>
    );
  }

  // Autorizado
  return <>{children}</>;
}

// ===== Componente wrapper para páginas de admin =====
interface AdminOnlyProps {
  children: ReactNode;
}

export function AdminOnly({ children }: AdminOnlyProps) {
  return (
    <SalonProtectedRoute requiredRole="ADMIN" showUnauthorized>
      {children}
    </SalonProtectedRoute>
  );
}

// ===== Componente wrapper para páginas de recepção =====
interface ReceptionAccessProps {
  children: ReactNode;
}

export function ReceptionAccess({ children }: ReceptionAccessProps) {
  return (
    <SalonProtectedRoute
      requiredRole={["ADMIN", "RECEPCIONIST"]}
      showUnauthorized
    >
      {children}
    </SalonProtectedRoute>
  );
}

// ===== Componente wrapper para páginas de profissional =====
interface ProfessionalAccessProps {
  children: ReactNode;
}

export function ProfessionalAccess({ children }: ProfessionalAccessProps) {
  return (
    <SalonProtectedRoute
      requiredRole={["ADMIN", "RECEPCIONIST", "PROFESSIONAL"]}
      showUnauthorized
    >
      {children}
    </SalonProtectedRoute>
  );
}

// ===== Componente wrapper para páginas de cliente =====
interface ClientAccessProps {
  children: ReactNode;
}

export function ClientAccess({ children }: ClientAccessProps) {
  return (
    <SalonProtectedRoute requiredRole="CLIENT" showUnauthorized>
      {children}
    </SalonProtectedRoute>
  );
}
