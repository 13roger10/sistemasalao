import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_API_URL || "http://localhost:8080";

async function proxyRequest(request: NextRequest, path: string[]) {
  const joinedPath = path.join("/");
  const targetPath = `/api/${joinedPath}`;
  const url = new URL(request.url);
  const queryString = url.search;
  const targetUrl = `${BACKEND_URL}${targetPath}${queryString}`;

  // Get auth token from cookie or header
  const authToken = request.cookies.get("salon_auth_token")?.value;
  const originalAuth = request.headers.get("Authorization");

  console.log(`[Proxy] ${request.method} ${targetUrl}`);
  console.log(`[Proxy] Cookie token: ${authToken ? "exists" : "none"}`);
  console.log(`[Proxy] Header auth: ${originalAuth ? "exists" : "none"}`);

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  // Use Authorization header from request first, then cookie
  if (originalAuth) {
    headers["Authorization"] = originalAuth;
  } else if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  try {
    const body = request.method !== "GET" && request.method !== "HEAD"
      ? await request.text()
      : undefined;

    // SEC-014: NÃO logar o corpo da requisição — ele contém credenciais (login),
    // tokens e PII. Apenas o tamanho é registrado, sem conteúdo.
    if (body) {
      console.log(`[Proxy] Request body length: ${body.length}`);
    }

    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
    });

    const contentType = response.headers.get("content-type");
    console.log(`[Proxy] Response status: ${response.status}, content-type: ${contentType}`);

    // SEC-014: NÃO logar o corpo da resposta — pode conter accessToken/refreshToken e PII.
    const responseText = await response.text();

    if (contentType?.includes("application/json")) {
      // Parse the text as JSON
      const data = responseText ? JSON.parse(responseText) : {};
      return NextResponse.json(data, { status: response.status });
    }

    return new NextResponse(responseText, {
      status: response.status,
      headers: { "Content-Type": contentType || "text/plain" },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { message: "Erro ao conectar com o servidor", error: String(error) },
      { status: 503 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}
