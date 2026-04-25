import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ===== ROUTE CONFIGURATION =====

// Rotas públicas do salon (não requerem autenticação)
const salonPublicRoutes = [
  '/salon/login',
  '/salon/register',
  '/salon/forgot-password',
  '/salon/reset-password',
  '/salon/book',
];

// Rotas da área do cliente (requerem role CLIENT)
const clientRoutes = ['/salon/client'];

// Rotas de funcionários (profissional, recepcionista, admin)
const staffRoutes = [
  '/salon/dashboard',
  '/salon/appointments',
  '/salon/clients',
  '/salon/professionals',
  '/salon/services',
  '/salon/finance',
  '/salon/cash',
  '/salon/commissions',
  '/salon/promotions',
  '/salon/stock',
  '/salon/loyalty',
  '/salon/reviews',
  '/salon/units',
  '/salon/settings',
  '/salon/reports',
  '/salon/notifications',
];

// Rotas admin (sistema antigo)
const adminProtectedRoutes = ["/admin"];

// Security headers for production
const securityHeaders = {
  "X-DNS-Prefetch-Control": "on",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-XSS-Protection": "1; mode=block",
  "X-Frame-Options": "SAMEORIGIN",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

// Conditional logging helper
const isDevelopment = process.env.NODE_ENV === "development";
const log = (...args: unknown[]) => {
  if (isDevelopment) {
    console.log("[Proxy]", ...args);
  }
};

// ===== HELPER FUNCTIONS =====

function addSecurityHeaders(response: NextResponse): NextResponse {
  if (process.env.NODE_ENV === "production") {
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }
  return response;
}

/**
 * Decodifica o payload do JWT (sem verificar assinatura - isso é feito no backend)
 */
function decodeJwtPayload(token: string): { role?: string; exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = Buffer.from(payload, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Normaliza a role do backend (português) para o formato do frontend (inglês)
 */
function normalizeRole(role?: string): string | undefined {
  if (!role) return undefined;

  const upperRole = role.toUpperCase();

  // Mapeia roles em português para inglês
  const roleMap: Record<string, string> = {
    'CLIENTE': 'CLIENT',
    'CLIENT': 'CLIENT',
    'PROFISSIONAL': 'PROFESSIONAL',
    'PROFESSIONAL': 'PROFESSIONAL',
    'ADMIN': 'ADMIN',
    'ADMINISTRADOR': 'ADMIN',
    'RECEPCIONISTA': 'RECEPCIONIST',
    'RECEPCIONIST': 'RECEPCIONIST',
  };

  return roleMap[upperRole] || upperRole;
}

/**
 * Verifica se o token expirou
 */
function isTokenExpired(payload: { exp?: number }): boolean {
  if (!payload.exp) return false;
  return Date.now() >= payload.exp * 1000;
}

// ===== MAIN PROXY FUNCTION =====

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  log(`Path: ${pathname}`);

  // Ignora assets estáticos e API
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return addSecurityHeaders(NextResponse.next());
  }

  // ===== ADMIN ROUTES =====
  if (pathname.startsWith('/admin') || pathname === '/login') {
    const adminToken = request.cookies.get("auth_token")?.value;

    // Se o usuário já estiver autenticado e tentar acessar login
    if (pathname === "/login" && adminToken) {
      log("Redirecting authenticated user from /login to /admin/dashboard");
      return addSecurityHeaders(NextResponse.redirect(new URL("/admin/dashboard", request.url)));
    }

    // Verificar se é uma rota admin protegida
    const isProtectedRoute = adminProtectedRoutes.some((route) =>
      pathname.startsWith(route)
    );

    if (isProtectedRoute && !adminToken) {
      log("No admin token found, redirecting to /login");
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return addSecurityHeaders(NextResponse.redirect(loginUrl));
    }

    // Bloqueia RECEPCIONISTA de acessar a área admin
    if (isProtectedRoute && adminToken) {
      const adminPayload = decodeJwtPayload(adminToken);
      if (normalizeRole(adminPayload?.role) === 'RECEPCIONIST') {
        log("RECEPCIONISTA blocked from /admin, redirecting to /recepcao/acesso-negado");
        return addSecurityHeaders(NextResponse.redirect(new URL('/recepcao/acesso-negado', request.url)));
      }
    }

    return addSecurityHeaders(NextResponse.next());
  }

  // ===== SALON ROUTES =====
  if (pathname.startsWith('/salon')) {
    // Permite rotas públicas do salon
    if (salonPublicRoutes.some(route => pathname.startsWith(route))) {
      return addSecurityHeaders(NextResponse.next());
    }

    // Obtém o token do cookie
    const salonToken = request.cookies.get('salon_auth_token')?.value;

    // Se não tem token, verifica se é RECEPCIONISTA tentando acessar área errada
    if (!salonToken) {
      const adminToken = request.cookies.get('auth_token')?.value;
      if (adminToken) {
        const adminPayload = decodeJwtPayload(adminToken);
        if (normalizeRole(adminPayload?.role) === 'RECEPCIONIST') {
          log("RECEPCIONISTA blocked from /salon, redirecting to /recepcao/acesso-negado");
          return addSecurityHeaders(NextResponse.redirect(new URL('/recepcao/acesso-negado', request.url)));
        }
      }
      log("No salon token found, redirecting to /salon/login");
      const loginUrl = new URL('/salon/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return addSecurityHeaders(NextResponse.redirect(loginUrl));
    }

    // Decodifica o token para verificar a role
    const payload = decodeJwtPayload(salonToken);

    // Se não conseguiu decodificar ou token expirado, redireciona para login
    if (!payload || isTokenExpired(payload)) {
      log("Invalid or expired salon token, redirecting to /salon/login");
      const response = NextResponse.redirect(new URL('/salon/login', request.url));
      response.cookies.delete('salon_auth_token');
      return addSecurityHeaders(response);
    }

    const userRole = normalizeRole(payload.role);
    log(`User role: ${payload.role} -> normalized: ${userRole}`);

    // IMPORTANTE: Verificar staffRoutes PRIMEIRO porque /salon/clients
    // não deve ser confundido com /salon/client (área do cliente)
    // Verifica acesso às áreas de funcionários
    if (staffRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
      if (userRole === 'CLIENT') {
        log("Client trying to access staff area, redirecting to /salon/book");
        return addSecurityHeaders(NextResponse.redirect(new URL('/salon/book', request.url)));
      }
      return addSecurityHeaders(NextResponse.next());
    }

    // Verifica acesso à área do cliente (após verificar staffRoutes)
    if (pathname.startsWith('/salon/client/') || pathname === '/salon/client') {
      if (userRole !== 'CLIENT') {
        log("Staff user trying to access client area, redirecting to /salon/dashboard");
        return addSecurityHeaders(NextResponse.redirect(new URL('/salon/dashboard', request.url)));
      }
      return addSecurityHeaders(NextResponse.next());
    }

    // Para qualquer outra rota /salon, permite se autenticado
    return addSecurityHeaders(NextResponse.next());
  }

  // Para todas as outras rotas
  return addSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|.*\\.svg$).*)",
  ],
};
