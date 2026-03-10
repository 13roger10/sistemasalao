"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSalonAuth } from "@/contexts/SalonAuthContext";
import { AuthUserRole } from "@/types/salon/auth";
import { Loader2 } from "lucide-react";

export default function SalonIndexPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useSalonAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push("/salon/login");
      return;
    }

    if (user) {
      // Redireciona baseado na role
      const roleRedirects: Record<AuthUserRole, string> = {
        ADMIN: "/salon/dashboard",
        RECEPCIONIST: "/salon/dashboard",
        PROFESSIONAL: "/salon/appointments",
        CLIENT: "/salon/client/appointments",
      };
      router.push(roleRedirects[user.role]);
    }
  }, [isAuthenticated, isLoading, user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Carregando...
        </p>
      </div>
    </div>
  );
}
