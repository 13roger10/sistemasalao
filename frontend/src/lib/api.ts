import axios from "axios";
import { env } from "./env";

export const api = axios.create({
  baseURL: env.apiUrl,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para adicionar token automaticamente
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      // Tenta primeiro o token do Salon, depois o token geral
      const token = localStorage.getItem("salon_auth_token") || localStorage.getItem("auth_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar erros de resposta
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado ou inválido
      if (typeof window !== "undefined") {
        // Limpa tokens de ambos os contextos
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        localStorage.removeItem("salon_auth_token");
        localStorage.removeItem("salon_auth_user");
        localStorage.removeItem("salon_refresh_token");
        localStorage.removeItem("salon_token_expiry");

        // Redirecionar para login apropriado
        if (!window.location.pathname.includes("/login")) {
          const isSalonPath = window.location.pathname.startsWith("/salon");
          window.location.href = isSalonPath ? "/salon/login" : "/login";
        }
      }
    }

    return Promise.reject(error);
  }
);
