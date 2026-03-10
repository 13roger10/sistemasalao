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
import { authService } from "@/services/auth";
import type { User, AuthState } from "@/types";

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
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

  const login = useCallback(
    async (email: string, password: string) => {
      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        const response = await authService.login(email, password);
        setAuth(response.user, response.token);
      } catch (error) {
        setState((prev) => ({ ...prev, isLoading: false }));
        throw error;
      }
    },
    [setAuth]
  );

  const logout = useCallback(() => {
    authService.logout(); // Remove cookie e localStorage
    setAuth(null, null);
  }, [setAuth]);

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
    } catch {
      authService.logout();
      setAuth(null, null);
    }
  }, [setAuth]);

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
