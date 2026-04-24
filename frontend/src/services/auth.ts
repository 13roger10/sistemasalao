import { api } from "@/lib/api";
import { createLogger } from "@/lib/logger";
import type { User } from "@/types";

const logger = createLogger("AuthService");

interface LoginResponse {
  user: User;
  token: string;
  refreshToken?: string;
  requiresTwoFactor?: boolean;
}

interface LoginRequest {
  email: string;
  password: string;
  totpCode?: string;
}

// Backend API response format (Java Spring Boot)
interface BackendLoginResponse {
  user?: {
    id: number;
    email: string;
    nome: string;
    telefone: string;
    role: "ADMIN" | "PROFISSIONAL" | "CLIENTE" | "RECEPCIONISTA";
    plano: string;
    emailVerificado: boolean;
    criadoEm: string;
    ultimoLogin?: string;
  };
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
  requiresTwoFactor?: boolean;
}

/** Decodes the `exp` claim from a JWT (returns Unix epoch seconds, or null on error). */
export function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

// Mapeia resposta do backend para formato do frontend
function mapBackendUserToFrontend(backendUser: BackendLoginResponse["user"]): User {
  return {
    id: backendUser.id.toString(),
    email: backendUser.email,
    name: backendUser.nome,
    role: backendUser.role === "ADMIN" ? "admin" : backendUser.role === "RECEPCIONISTA" ? "receptionist" : "user",
    avatar: undefined,
    createdAt: new Date(backendUser.criadoEm),
    updatedAt: new Date(backendUser.ultimoLogin || backendUser.criadoEm),
  };
}

// Credenciais de administrador (usar variáveis de ambiente em produção)
const ADMIN_CREDENTIALS = {
  email: process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@belezza.ai",
  password: process.env.ADMIN_PASSWORD || "Admin@123",
};

// Usuário mock para desenvolvimento
const MOCK_ADMIN_USER: User = {
  id: "admin-001",
  name: "Administrador",
  email: ADMIN_CREDENTIALS.email,
  role: "admin",
  avatar: undefined,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Token mock (em produção seria JWT real)
const generateMockToken = () => {
  const payload = {
    userId: MOCK_ADMIN_USER.id,
    email: MOCK_ADMIN_USER.email,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 horas
  };
  return btoa(JSON.stringify(payload));
};

// Verificar se deve usar autenticação mock (sem backend)
// Mock auth está desabilitado - usando API real do backend Java
const useMockAuth = process.env.NEXT_PUBLIC_USE_MOCK_AUTH === "true";

const REFRESH_TOKEN_KEY = "refresh_token";

// Função para definir cookie de autenticação
const setAuthCookie = (token: string) => {
  if (typeof document !== "undefined") {
    // Cookie expira em 24 horas
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `auth_token=${token}; path=/; expires=${expires}; SameSite=Lax`;
  }
};

// Função para remover cookie de autenticação
const removeAuthCookie = () => {
  if (typeof document !== "undefined") {
    document.cookie =
      "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }
};

export const authService = {
  async login(email: string, password: string, totpCode?: string): Promise<LoginResponse> {
    // Em desenvolvimento, verificar credenciais mock
    if (useMockAuth) {
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (
        email === ADMIN_CREDENTIALS.email &&
        password === ADMIN_CREDENTIALS.password
      ) {
        const token = generateMockToken();
        setAuthCookie(token);
        return { user: MOCK_ADMIN_USER, token };
      }

      throw new Error("Credenciais inválidas");
    }

    logger.info("Calling login API route", { email, hasTotpCode: !!totpCode });

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, totpCode }),
    });

    logger.debug("API route response received", { status: response.status });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
      logger.error("Login failed", new Error(errorData.message || "Unknown error"));
      throw new Error(errorData.message || "Credenciais inválidas");
    }

    const backendResponse: BackendLoginResponse = await response.json();

    // Server requires 2FA code — return early without storing tokens
    if (backendResponse.requiresTwoFactor) {
      return { user: {} as User, token: "", requiresTwoFactor: true };
    }

    const mappedResponse: LoginResponse = {
      user: mapBackendUserToFrontend(backendResponse.user!),
      token: backendResponse.accessToken!,
      refreshToken: backendResponse.refreshToken,
    };

    logger.info("Login successful", {
      userId: mappedResponse.user.id,
      email: mappedResponse.user.email,
    });

    setAuthCookie(mappedResponse.token);
    if (backendResponse.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, backendResponse.refreshToken);
    }
    return mappedResponse;
  },

  async verifyToken(token: string): Promise<boolean> {
    // Em desenvolvimento, verificar token mock
    if (useMockAuth) {
      try {
        const payload = JSON.parse(atob(token));
        return payload.exp > Date.now();
      } catch {
        return false;
      }
    }

    // Em produção, verificar com API
    try {
      await api.get("/auth/verify", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return true;
    } catch {
      return false;
    }
  },

  async getProfile(token: string): Promise<User> {
    // Em desenvolvimento, retornar usuário mock
    if (useMockAuth) {
      const isValid = await this.verifyToken(token);
      if (isValid) {
        return MOCK_ADMIN_USER;
      }
      throw new Error("Token inválido");
    }

    // Em produção, buscar da API
    const response = await api.get<User>("/auth/profile", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  },

  async refreshToken(token: string): Promise<LoginResponse> {
    // Em desenvolvimento, gerar novo token mock
    if (useMockAuth) {
      const isValid = await this.verifyToken(token);
      if (isValid) {
        const newToken = generateMockToken();
        setAuthCookie(newToken);
        return {
          user: MOCK_ADMIN_USER,
          token: newToken,
        };
      }
      throw new Error("Token inválido");
    }

    // Read stored refresh token
    const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!storedRefreshToken) {
      throw new Error("Refresh token não encontrado. Faça login novamente.");
    }

    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: storedRefreshToken }),
    });

    if (!response.ok) {
      throw new Error("Sessão expirada. Faça login novamente.");
    }

    const data: BackendLoginResponse = await response.json();
    const newToken = data.accessToken!;

    setAuthCookie(newToken);
    if (data.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    }

    return {
      user: mapBackendUserToFrontend(data.user!),
      token: newToken,
      refreshToken: data.refreshToken,
    };
  },

  logout() {
    removeAuthCookie();
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  },
};
