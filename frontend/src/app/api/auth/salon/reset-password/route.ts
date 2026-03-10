import { NextRequest, NextResponse } from "next/server";

// Backend API URL (adiciona /api se não estiver presente)
const RAW_BACKEND_URL = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const BACKEND_URL = RAW_BACKEND_URL.endsWith("/api") ? RAW_BACKEND_URL : `${RAW_BACKEND_URL}/api`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    if (!token) {
      return NextResponse.json(
        { message: "Token é obrigatório" },
        { status: 400 }
      );
    }

    if (!newPassword) {
      return NextResponse.json(
        { message: "Nova senha é obrigatória" },
        { status: 400 }
      );
    }

    // Chama o backend Java
    const backendResponse = await fetch(`${BACKEND_URL}/auth/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token, newPassword }),
    });

    // Processa resposta do backend
    const data = await backendResponse.json().catch(() => ({}));

    if (!backendResponse.ok) {
      const errorMessage = data.message || "Token inválido ou expirado";
      return NextResponse.json(
        { message: errorMessage },
        { status: backendResponse.status }
      );
    }

    return NextResponse.json({
      message: data.message || "Senha alterada com sucesso"
    });
  } catch (error) {
    console.error("Reset password error:", error);

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
