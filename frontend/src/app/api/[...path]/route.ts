import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_API_URL || "http://localhost:8080";

async function proxyRequest(request: NextRequest, path: string[]) {
  const targetPath = `/api/${path.join("/")}`;
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

    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
    });

    const contentType = response.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: { "Content-Type": contentType || "text/plain" },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { message: "Erro ao conectar com o servidor" },
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
