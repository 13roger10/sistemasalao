import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createLogger } from "@/lib/logger";

const logger = createLogger("API:Login");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    logger.info("Received login request", { email });

    // Use environment variable for backend URL (falls back to localhost for development)
    const backendUrl = process.env.BACKEND_API_URL || "http://localhost:8080/api";
    logger.debug("Backend URL configured", { backendUrl });

    const response = await fetch(`${backendUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    logger.debug("Backend response received", { status: response.status });

    if (!response.ok) {
      const error = await response.text();
      logger.error("Backend login failed", new Error(error), { status: response.status });
      return NextResponse.json(
        { message: "Login failed" },
        { status: response.status }
      );
    }

    const data = await response.json();
    logger.info("Login successful", {
      hasUser: !!data.user,
      hasToken: !!data.accessToken
    });

    // Configurar cookie server-side (garante que funcione)
    const cookieStore = await cookies();
    cookieStore.set({
      name: "auth_token",
      value: data.accessToken,
      httpOnly: false, // Precisa ser false para o frontend acessar
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 horas
      path: "/",
    });

    logger.debug("Cookie set successfully");

    // Mapear resposta para formato do frontend
    const frontendResponse = {
      user: {
        id: data.user.id.toString(),
        email: data.user.email,
        name: data.user.nome,
        role: data.user.role === "ADMIN" ? "admin" : "user",
        avatar: undefined,
        createdAt: new Date(data.user.criadoEm),
        updatedAt: new Date(data.user.ultimoLogin || data.user.criadoEm),
      },
      token: data.accessToken,
    };

    logger.debug("Returning login response");
    return NextResponse.json(frontendResponse);
  } catch (error) {
    logger.error("Internal server error during login", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
