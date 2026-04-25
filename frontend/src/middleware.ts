import { NextRequest, NextResponse } from "next/server";

/**
 * Decodes the role claim from a JWT without verifying the signature.
 * Used only for routing decisions; the backend enforces real authorization.
 */
function getRoleFromJwt(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    // Replace URL-safe base64 chars and pad to multiple of 4
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const decoded = JSON.parse(atob(padded));
    return decoded.role ?? null;
  } catch {
    return null;
  }
}

/** Routes the RECEPCIONISTA role must never access. */
const BLOCKED_FOR_RECEPCIONISTA = ["/salon", "/admin"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isBlocked = BLOCKED_FOR_RECEPCIONISTA.some((prefix) =>
    pathname.startsWith(prefix)
  );
  if (!isBlocked) return NextResponse.next();

  const token = request.cookies.get("auth_token")?.value;
  if (!token) return NextResponse.next();

  const role = getRoleFromJwt(token);
  if (role === "RECEPCIONISTA") {
    return NextResponse.redirect(new URL("/recepcao/acesso-negado", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/salon/:path*", "/admin/:path*"],
};
