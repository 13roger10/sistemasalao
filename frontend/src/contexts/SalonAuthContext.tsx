"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  SalonAuthUser,
  SalonAuthState,
  AuthPermission,
  AuthUserRole,
  AuthLoginResponse,
  AUTH_ROLE_PERMISSIONS,
} from "@/types/salon/auth";
import {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  hasRole,
  createPermissionGuard,
  type PermissionGuard,
} from "@/lib/permissions";

// ===== Constantes =====
const TOKEN_KEY = "salon_auth_token";
const REFRESH_TOKEN_KEY = "salon_refresh_token";
const USER_KEY = "salon_auth_user";
const TOKEN_EXPIRY_KEY = "salon_token_expiry";

// ===== Interface do Contexto =====
interface SalonAuthContextType extends SalonAuthState {
  // Ações de autenticação
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<boolean>;
  checkAuth: () => Promise<void>;

  // Verificações de permissão
  can: (permission: AuthPermission) => boolean;
  canAll: (permissions: AuthPermission[]) => boolean;
  canAny: (permissions: AuthPermission[]) => boolean;
  isRole: (role: AuthUserRole | AuthUserRole[]) => boolean;
  guard: PermissionGuard;
}

// ===== Contexto =====
const SalonAuthContext = createContext<SalonAuthContextType | undefined>(undefined);

// ===== Provider =====
interface SalonAuthProviderProps {
  children: ReactNode;
}

export function SalonAuthProvider({ children }: SalonAuthProviderProps) {
  const router = useRouter();
  const [state, setState] = useState<SalonAuthState>({
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: true,
    permissions: [],
  });
  const hasInitialized = useRef(false);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ===== Helpers =====
  const clearAuth = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
      // Limpa cookie
      document.cookie = "salon_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }

    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    setState({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      permissions: [],
    });
  }, []);

  const setAuth = useCallback((
    user: SalonAuthUser,
    token: string,
    refreshToken?: string,
    expiresIn?: number
  ) => {
    // Garante que o usuário tenha permissões (usa padrão da role se não tiver)
    const permissions = user.permissions?.length > 0
      ? user.permissions
      : AUTH_ROLE_PERMISSIONS[user.role] || [];

    const userWithPermissions: SalonAuthUser = {
      ...user,
      permissions,
    };

    // Salva no localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(userWithPermissions));

      if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }

      // Salva timestamp de expiração
      if (expiresIn) {
        const expiry = Date.now() + expiresIn * 1000;
        localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
      }

      // Define cookie para o servidor
      const expires = new Date(Date.now() + (expiresIn || 86400) * 1000).toUTCString();
      document.cookie = `salon_auth_token=${token}; path=/; expires=${expires}; SameSite=Lax`;
    }

    setState({
      user: userWithPermissions,
      token,
      refreshToken: refreshToken || null,
      isAuthenticated: true,
      isLoading: false,
      permissions,
    });

    // Configura refresh automático (5 minutos antes de expirar)
    if (expiresIn && refreshToken) {
      const refreshTime = (expiresIn - 300) * 1000; // 5 minutos antes
      if (refreshTime > 0) {
        refreshTimeoutRef.current = setTimeout(() => {
          refreshAuth();
        }, refreshTime);
      }
    }
  }, []);

  // ===== Login =====
  const login = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Chama API de login
      const response = await fetch("/api/auth/salon/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Credenciais inválidas");
      }

      const data: AuthLoginResponse = await response.json();
      setAuth(data.user, data.token, data.refreshToken, data.expiresIn);
    } catch (error) {
      clearAuth();
      throw error;
    }
  }, [setAuth, clearAuth]);

  // ===== Logout =====
  const logout = useCallback(() => {
    clearAuth();
    router.push("/salon/login");
  }, [clearAuth, router]);

  // ===== Refresh Token =====
  const refreshAuth = useCallback(async (): Promise<boolean> => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    if (!refreshToken) {
      return false;
    }

    try {
      const response = await fetch("/api/auth/salon/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        clearAuth();
        return false;
      }

      const data: AuthLoginResponse = await response.json();
      setAuth(data.user, data.token, data.refreshToken, data.expiresIn);
      return true;
    } catch {
      clearAuth();
      return false;
    }
  }, [setAuth, clearAuth]);

  // ===== Check Auth (inicialização) =====
  const checkAuth = useCallback(async () => {
    if (typeof window === "undefined") {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const token = localStorage.getItem(TOKEN_KEY);
    const userStr = localStorage.getItem(USER_KEY);
    const expiryStr = localStorage.getItem(TOKEN_EXPIRY_KEY);

    if (!token || !userStr) {
      clearAuth();
      return;
    }

    // Verifica se o token expirou
    if (expiryStr) {
      const expiry = parseInt(expiryStr, 10);
      if (Date.now() > expiry) {
        // Tenta refresh
        const refreshed = await refreshAuth();
        if (!refreshed) {
          clearAuth();
          return;
        }
        return;
      }
    }

    try {
      const user = JSON.parse(userStr) as SalonAuthUser;
      const permissions = user.permissions?.length > 0
        ? user.permissions
        : AUTH_ROLE_PERMISSIONS[user.role] || [];

      // Redefine o cookie
      const expires = expiryStr
        ? new Date(parseInt(expiryStr, 10)).toUTCString()
        : new Date(Date.now() + 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = `salon_auth_token=${token}; path=/; expires=${expires}; SameSite=Lax`;

      setState({
        user: { ...user, permissions },
        token,
        refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY),
        isAuthenticated: true,
        isLoading: false,
        permissions,
      });
    } catch {
      clearAuth();
    }
  }, [clearAuth, refreshAuth]);

  // ===== Verificações de Permissão =====
  const can = useCallback((permission: AuthPermission): boolean => {
    return hasPermission(state.user, permission);
  }, [state.user]);

  const canAll = useCallback((permissions: AuthPermission[]): boolean => {
    return hasAllPermissions(state.user, permissions);
  }, [state.user]);

  const canAny = useCallback((permissions: AuthPermission[]): boolean => {
    return hasAnyPermission(state.user, permissions);
  }, [state.user]);

  const isRole = useCallback((role: AuthUserRole | AuthUserRole[]): boolean => {
    return hasRole(state.user, role);
  }, [state.user]);

  const guard = createPermissionGuard(state.user);

  // ===== Inicialização =====
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    checkAuth();
  }, [checkAuth]);

  // ===== Cleanup =====
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  // ===== Render =====
  return (
    <SalonAuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        refreshAuth,
        checkAuth,
        can,
        canAll,
        canAny,
        isRole,
        guard,
      }}
    >
      {children}
    </SalonAuthContext.Provider>
  );
}

// ===== Hook =====
export function useSalonAuth() {
  const context = useContext(SalonAuthContext);

  if (context === undefined) {
    throw new Error("useSalonAuth must be used within a SalonAuthProvider");
  }

  return context;
}

// ===== HOC para componentes que requerem permissão =====
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  permission: AuthPermission
) {
  return function PermissionWrapper(props: P) {
    const { can, isLoading, isAuthenticated } = useSalonAuth();

    if (isLoading) {
      return null;
    }

    if (!isAuthenticated || !can(permission)) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
}

// ===== Componente de guarda de permissão =====
interface CanProps {
  permission?: AuthPermission;
  permissions?: AuthPermission[];
  requireAll?: boolean;
  role?: AuthUserRole | AuthUserRole[];
  fallback?: ReactNode;
  children: ReactNode;
}

export function Can({
  permission,
  permissions,
  requireAll = true,
  role,
  fallback = null,
  children,
}: CanProps) {
  const { can, canAll, canAny, isRole, isAuthenticated, isLoading } = useSalonAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <>{fallback}</>;
  }

  // Verifica role
  if (role && !isRole(role)) {
    return <>{fallback}</>;
  }

  // Verifica permissão única
  if (permission && !can(permission)) {
    return <>{fallback}</>;
  }

  // Verifica múltiplas permissões
  if (permissions) {
    const hasPermissions = requireAll
      ? canAll(permissions)
      : canAny(permissions);

    if (!hasPermissions) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}
