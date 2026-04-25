"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "user" | "receptionist";
}

function hasRequiredRole(userRole: string, requiredRole: string): boolean {
  if (requiredRole === "admin") return userRole === "admin";
  if (requiredRole === "receptionist") return userRole === "receptionist" || userRole === "admin";
  return true;
}

export function ProtectedRoute({
  children,
  requiredRole = "admin",
}: ProtectedRouteProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user && !hasRedirected.current) {
      if (!hasRequiredRole(user.role, requiredRole)) {
        hasRedirected.current = true;
        router.push(user.role === "receptionist" ? "/recepcao/acesso-negado" : "/login");
      }
    }
  }, [isLoading, isAuthenticated, user, requiredRole, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          <p className="text-sm text-gray-500">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          <p className="text-sm text-gray-500">Redirecionando para login...</p>
        </div>
      </div>
    );
  }

  if (!hasRequiredRole(user.role, requiredRole)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          <p className="text-sm text-gray-500">Acesso não autorizado...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
