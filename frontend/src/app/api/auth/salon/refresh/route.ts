import { NextRequest, NextResponse } from "next/server";
import { SalonAuthUser, AuthUserRole, AUTH_ROLE_PERMISSIONS, AuthLoginResponse } from "@/types/salon/auth";

// Backend API URL (sem /api no final)
// Mesma normalização das outras rotas de auth: NEXT_PUBLIC_API_URL já termina em /api, e somar
// "/api/auth/refresh" gerava /api/api/auth/refresh — a renovação da sessão nunca funcionava.
const RAW_BACKEND_URL = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const BACKEND_URL = RAW_BACKEND_URL.endsWith("/api") ? RAW_BACKEND_URL : `${RAW_BACKEND_URL}/api`;

// Interface para resposta do backend
interface BackendAuthResponse {
  user: {
    id: number;
    email: string;
    nome: string;
    telefone?: string;
    avatarUrl?: string;
    role: "ADMIN" | "PROFISSIONAL" | "CLIENTE";
    plano: string;
    emailVerificado: boolean;
    criadoEm: string;
    ultimoLogin?: string;
  };
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

// Mapeia role do backend para role do frontend
function mapBackendRole(backendRole: string): AuthUserRole {
  const roleMap: Record<string, AuthUserRole> = {
    "ADMIN": "ADMIN",
    "PROFISSIONAL": "PROFESSIONAL",
    "CLIENTE": "CLIENT",
  };
  return roleMap[backendRole] || "CLIENT";
}

// Mapeia usuário do backend para formato do frontend
function mapBackendUser(backendUser: BackendAuthResponse["user"]): SalonAuthUser {
  const role = mapBackendRole(backendUser.role);
  return {
    id: backendUser.id.toString(),
    email: backendUser.email,
    name: backendUser.nome,
    role,
    phone: backendUser.telefone,
    avatar: backendUser.avatarUrl,
    isActive: true,
    createdAt: new Date(backendUser.criadoEm),
    updatedAt: backendUser.ultimoLogin ? new Date(backendUser.ultimoLogin) : new Date(backendUser.criadoEm),
    lastLogin: backendUser.ultimoLogin ? new Date(backendUser.ultimoLogin) : undefined,
    permissions: AUTH_ROLE_PERMISSIONS[role] || [],
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { message: "Refresh token é obrigatório" },
        { status: 400 }
      );
    }

    // Chama o backend Java para refresh
    const backendResponse = await fetch(`${BACKEND_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });

    // Se falhar, retorna o erro do backend
    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({}));
      const errorMessage = errorData.message || "Sessão expirada. Faça login novamente.";
      return NextResponse.json(
        { message: errorMessage },
        { status: backendResponse.status }
      );
    }

    // Processa resposta do backend
    const backendData: BackendAuthResponse = await backendResponse.json();

    // Mapeia para formato do frontend
    const user = mapBackendUser(backendData.user);

    const response: AuthLoginResponse = {
      user,
      token: backendData.accessToken,
      refreshToken: backendData.refreshToken,
      expiresIn: backendData.expiresIn,
    };

    // O cookie salon_auth_token é gravado no navegador (lib/session-refresh), como no login.
    // Um cookie httpOnly com o mesmo nome aqui não poderia mais ser atualizado pelo JavaScript
    // e expiraria em 15 minutos, levando ao login na próxima navegação.
    return NextResponse.json(response);
  } catch (error) {
    console.error("Refresh token error:", error);

    // Se for erro de conexão com o backend
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return NextResponse.json(
        { message: "Não foi possível conectar ao servidor." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
