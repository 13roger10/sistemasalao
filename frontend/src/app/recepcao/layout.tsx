"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SalonAuthProvider } from "@/contexts/SalonAuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { UnitProvider, useUnit } from "@/contexts/UnitContext";
import { Loader2 } from "lucide-react";
import { SalonNotificacaoProvider } from "@/contexts/SalonNotificacaoContext";
import { SalonProtectedRoute } from "@/components/auth/SalonProtectedRoute";

/**
 * Área da recepção com o mesmo login do salão (BUG-035). As telas /recepcao usavam o login
 * antigo (AuthContext, tela /login): a recepcionista, que entra por /salon/login, era mandada
 * para outro login. Agora a área tem os mesmos provedores de /salon e aceita recepcionista e
 * admin; sem sessão, vai para /salon/login e volta para a página pedida depois de entrar.
 */
/** As páginas usam o salão do usuário (useSalaoAtual): só renderizam depois que ele é conhecido. */
function EsperaSalao({ children }: { children: ReactNode }) {
  const { selectedUnitId, isLoading } = useUnit();
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }
  if (!selectedUnitId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-center dark:bg-gray-900">
        <p className="max-w-md text-sm text-gray-600 dark:text-gray-300">
          Seu usuário não está vinculado a um salão. Peça ao administrador para vincular seu cadastro.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}

function ProtecaoRecepcao({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <SalonProtectedRoute
      requiredRole={["ADMIN", "RECEPCIONIST"]}
      showUnauthorized
      redirectTo={`/salon/login?redirect=${encodeURIComponent(pathname || "/recepcao")}`}
    >
      <EsperaSalao>{children}</EsperaSalao>
    </SalonProtectedRoute>
  );
}

export default function RecepcaoLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <SalonAuthProvider>
        <SalonNotificacaoProvider>
          <UnitProvider>
            <ProtecaoRecepcao>{children}</ProtecaoRecepcao>
          </UnitProvider>
        </SalonNotificacaoProvider>
      </SalonAuthProvider>
    </ThemeProvider>
  );
}
