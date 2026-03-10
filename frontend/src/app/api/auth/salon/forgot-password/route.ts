import { NextRequest, NextResponse } from "next/server";

// Backend API URL (adiciona /api se não estiver presente)
const RAW_BACKEND_URL = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const BACKEND_URL = RAW_BACKEND_URL.endsWith("/api") ? RAW_BACKEND_URL : `${RAW_BACKEND_URL}/api`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { message: "Email é obrigatório" },
        { status: 400 }
      );
    }

    // Chama o backend Java
    const backendResponse = await fetch(`${BACKEND_URL}/auth/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    // Processa resposta do backend
    const data = await backendResponse.json().catch(() => ({}));

    // O backend sempre retorna 200 por segurança (não revela se email existe)
    if (!backendResponse.ok) {
      return NextResponse.json(
        { message: data.message || "Erro ao processar solicitação" },
        { status: backendResponse.status }
      );
    }

    return NextResponse.json({
      message: data.message || "Se o email existir, você receberá instruções para redefinir sua senha"
    });
  } catch (error) {
    console.error("Forgot password error:", error);

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
