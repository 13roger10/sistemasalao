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
import { authService, getTokenExpiry } from "@/services/auth";
import type { User, AuthState } from "@/types";

interface AuthContextType extends AuthState {
  // Returns true when the server requires a 2FA code to complete login
  login: (email: string, password: string, totpCode?: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "auth_token";
const USER_STORAGE_KEY = "auth_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });
  const hasInitialized = useRef(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const setAuth = useCallback((user: User | null, token: string | null) => {
    setState({
      user,
      token,
      isAuthenticated: !!user && !!token,
      isLoading: false,
    });

    if (token && user) {
      localStorage.setItem(STORAGE_KEY, token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }, []);

  // Schedules a silent token refresh 60 seconds before the JWT expires.
  // Uses a ref to allow the callback to reference itself without circular deps.
  const scheduleRefreshRef = useRef<(token: string) => void>(() => {});

  const scheduleRefresh = useCallback((token: string) => {
    clearRefreshTimer();
    const exp = getTokenExpiry(token);
    if (!exp) return;

    const msUntilExpiry = exp * 1000 - Date.now();
    const delay = Math.max(msUntilExpiry - 60_000, 0); // refresh 60s before expiry

    refreshTimerRef.current = setTimeout(async () => {
      try {
        const response = await authService.refreshToken(token);
        setAuth(response.user, response.token);
        scheduleRefreshRef.current(response.token);
      } catch {
        // Refresh failed — force logout
        authService.logout();
        setAuth(null, null);
      }
    }, delay);
  }, [clearRefreshTimer, setAuth]);

  scheduleRefreshRef.current = scheduleRefresh;

  const login = useCallback(
    async (email: string, password: string, totpCode?: string): Promise<boolean> => {
      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        const response = await authService.login(email, password, totpCode);

        // Server requires 2FA code — do not store tokens yet
        if (response.requiresTwoFactor) {
          setState((prev) => ({ ...prev, isLoading: false }));
          return true;
        }

        setAuth(response.user, response.token);
        scheduleRefresh(response.token);
        return false;
      } catch (error) {
        setState((prev) => ({ ...prev, isLoading: false }));
        throw error;
      }
    },
    [setAuth, scheduleRefresh]
  );

  const logout = useCallback(() => {
    clearRefreshTimer();
    authService.logout(); // Remove cookie e localStorage
    setAuth(null, null);
  }, [clearRefreshTimer, setAuth]);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem(STORAGE_KEY);
    const userStr = localStorage.getItem(USER_STORAGE_KEY);

    if (!token || !userStr) {
      // Limpa qualquer cookie órfão
      authService.logout();
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const user = JSON.parse(userStr) as User;

      // Redefine o cookie para garantir sincronização
      if (typeof document !== "undefined") {
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toUTCString();
        document.cookie = `auth_token=${token}; path=/; expires=${expires}; SameSite=Lax`;
      }
      setAuth(user, token);
      scheduleRefresh(token);
    } catch {
      authService.logout();
      setAuth(null, null);
    }
  }, [setAuth, scheduleRefresh]);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
