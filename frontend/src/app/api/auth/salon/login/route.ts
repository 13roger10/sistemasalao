import { NextRequest, NextResponse } from "next/server";
import { SalonAuthUser, AuthUserRole, AUTH_ROLE_PERMISSIONS, AuthLoginResponse } from "@/types/salon/auth";

// Backend API URL (adiciona /api se não estiver presente)
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
    role: "ADMIN" | "PROFISSIONAL" | "CLIENTE" | "RECEPCIONISTA";
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
    "RECEPCIONISTA": "RECEPCIONIST",
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
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email e senha são obrigatórios" },
        { status: 400 }
      );
    }

    // Chama o backend Java
    const backendResponse = await fetch(`${BACKEND_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    // Se falhar, retorna o erro do backend
    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({}));
      const errorMessage = errorData.message || "Credenciais inválidas";
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

    // Cria response com cookie
    const nextResponse = NextResponse.json(response);

    // Define cookie HttpOnly para segurança
    nextResponse.cookies.set("salon_auth_token", backendData.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: backendData.expiresIn,
      path: "/",
    });

    return nextResponse;
  } catch (error) {
    console.error("Login error:", error);

    // Se for erro de conexão com o backend
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return NextResponse.json(
        { message: "Não foi possível conectar ao servidor. Verifique se o backend está rodando." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
