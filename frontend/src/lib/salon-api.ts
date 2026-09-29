// ===== HTTP Client para Sistema de Salão com Interceptors =====

import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { encerrarSessaoSalon, refreshSalonSession } from "./session-refresh";

// Constantes de storage
const TOKEN_KEY = "salon_auth_token";
const REFRESH_TOKEN_KEY = "salon_refresh_token";

// Cria instância do axios
const salonApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_SALON_API_URL || "/api",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ===== Request Interceptor =====
// Adiciona token JWT em todas as requisições
salonApi.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Obtém token do localStorage
    if (typeof window !== "undefined") {
      const token = localStorage.getItem(TOKEN_KEY);

      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// ===== Response Interceptor =====
// Sessão expirada (401): renova o token (renovação compartilhada com os outros clientes
// HTTP, ver lib/session-refresh) e repete a requisição uma vez; sem renovação, volta ao login.
salonApi.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      const token = await refreshSalonSession();
      if (token) {
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
        }
        return salonApi(originalRequest);
      }
      encerrarSessaoSalon();
    }

    // Trata outros erros
    if (error.response?.status === 403) {
      // Acesso negado - não tem permissão
      console.error("Acesso negado: permissões insuficientes");
    }

    if (error.response?.status === 404) {
      console.error("Recurso não encontrado");
    }

    if (error.response?.status === 500) {
      console.error("Erro interno do servidor");
    }

    return Promise.reject(error);
  }
);

// ===== Métodos auxiliares =====

/**
 * Define o token de autenticação manualmente
 */
export function setAuthToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

/**
 * Remove o token de autenticação
 */
export function clearAuthToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem("salon_auth_user");
  }
}

/**
 * Salão do usuário logado, lido do claim salonId do token (null se não houver).
 */
export function getSalonIdFromToken(): number | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  try {
    const base64 = (token.split(".")[1] || "").replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=")));
    return typeof payload.salonId === "number" ? payload.salonId : null;
  } catch {
    return null;
  }
}

/**
 * Verifica se existe um token válido
 */
export function hasValidToken(): boolean {
  if (typeof window === "undefined") return false;

  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return false;

  // Verifica expiração do token (se possível decodificar)
  try {
    const payload = JSON.parse(atob(token.split(".")[1] || token));
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return false;
    }
    return true;
  } catch {
    // Se não conseguir decodificar, assume que é válido
    return true;
  }
}

// ===== Endpoints da API =====

export const salonApiEndpoints = {
  // Auth
  auth: {
    login: "/auth/salon/login",
    logout: "/auth/salon/logout",
    refresh: "/auth/salon/refresh",
    forgotPassword: "/auth/salon/forgot-password",
    resetPassword: "/auth/salon/reset-password",
  },

  // Users
  users: {
    list: "/salon/users",
    create: "/salon/users",
    get: (id: string) => `/salon/users/${id}`,
    update: (id: string) => `/salon/users/${id}`,
    delete: (id: string) => `/salon/users/${id}`,
  },

  // Clients
  clients: {
    list: "/salon/clients",
    create: "/salon/clients",
    get: (id: string) => `/salon/clients/${id}`,
    update: (id: string) => `/salon/clients/${id}`,
    delete: (id: string) => `/salon/clients/${id}`,
    history: (id: string) => `/salon/clients/${id}/history`,
    loyalty: (id: string) => `/salon/clients/${id}/loyalty`,
  },

  // Professionals
  professionals: {
    list: "/salon/professionals",
    create: "/salon/professionals",
    get: (id: string) => `/salon/professionals/${id}`,
    update: (id: string) => `/salon/professionals/${id}`,
    delete: (id: string) => `/salon/professionals/${id}`,
    schedule: (id: string) => `/salon/professionals/${id}/schedule`,
    commissions: (id: string) => `/salon/professionals/${id}/commissions`,
  },

  // Services
  services: {
    list: "/salon/services",
    create: "/salon/services",
    get: (id: string) => `/salon/services/${id}`,
    update: (id: string) => `/salon/services/${id}`,
    delete: (id: string) => `/salon/services/${id}`,
  },

  // Appointments
  appointments: {
    list: "/salon/appointments",
    create: "/salon/appointments",
    get: (id: string) => `/salon/appointments/${id}`,
    update: (id: string) => `/salon/appointments/${id}`,
    cancel: (id: string) => `/salon/appointments/${id}/cancel`,
    confirm: (id: string) => `/salon/appointments/${id}/confirm`,
    complete: (id: string) => `/salon/appointments/${id}/complete`,
    waitlist: "/salon/appointments/waitlist",
  },

  // Finance
  finance: {
    daily: "/salon/finance/daily",
    monthly: "/salon/finance/monthly",
    registerPayment: "/salon/finance/payments",
    cashFlow: "/salon/finance/cash-flow",
    reports: "/salon/finance/reports",
  },

  // Commissions
  commissions: {
    list: "/salon/commissions",
    calculate: "/salon/commissions/calculate",
    pay: (id: string) => `/salon/commissions/${id}/pay`,
  },

  // Promotions
  promotions: {
    list: "/salon/promotions",
    create: "/salon/promotions",
    get: (id: string) => `/salon/promotions/${id}`,
    update: (id: string) => `/salon/promotions/${id}`,
    delete: (id: string) => `/salon/promotions/${id}`,
  },

  // Stock
  stock: {
    products: "/salon/stock/products",
    movements: "/salon/stock/movements",
    alerts: "/salon/stock/alerts",
  },

  // Dashboard
  dashboard: {
    stats: "/salon/dashboard/stats",
    charts: "/salon/dashboard/charts",
  },

  // Units
  units: {
    list: "/salon/units",
    create: "/salon/units",
    get: (id: string) => `/salon/units/${id}`,
    update: (id: string) => `/salon/units/${id}`,
    delete: (id: string) => `/salon/units/${id}`,
  },
};

export default salonApi;
