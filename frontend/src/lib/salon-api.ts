// ===== HTTP Client para Sistema de Salão com Interceptors =====

import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from "axios";

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
// Trata erros de autenticação e faz refresh automático
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });

  failedQueue = [];
};

salonApi.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Se o erro for 401 (não autorizado)
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Se já está fazendo refresh, adiciona à fila
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return salonApi(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      // Tenta fazer refresh do token
      const refreshToken =
        typeof window !== "undefined"
          ? localStorage.getItem(REFRESH_TOKEN_KEY)
          : null;

      if (refreshToken) {
        try {
          const response = await axios.post("/api/auth/salon/refresh", {
            refreshToken,
          });

          const { token, refreshToken: newRefreshToken } = response.data;

          // Atualiza tokens no storage
          if (typeof window !== "undefined") {
            localStorage.setItem(TOKEN_KEY, token);
            if (newRefreshToken) {
              localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
            }
          }

          // Atualiza header da requisição original
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }

          processQueue(null, token);

          return salonApi(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError as Error, null);

          // Limpa auth e redireciona para login
          if (typeof window !== "undefined") {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(REFRESH_TOKEN_KEY);
            localStorage.removeItem("salon_auth_user");
            window.location.href = "/salon/login";
          }

          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else {
        // Sem refresh token, limpa auth e redireciona
        if (typeof window !== "undefined") {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
          localStorage.removeItem("salon_auth_user");
          window.location.href = "/salon/login";
        }
      }
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
