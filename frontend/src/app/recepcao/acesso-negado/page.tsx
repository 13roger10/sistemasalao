"use client";

import { useRouter } from "next/navigation";
import { ShieldX, ArrowLeft } from "lucide-react";

export default function AcessoNegadoPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <ShieldX className="h-8 w-8 text-red-500" />
        </div>
        <h1 className="mb-2 text-xl font-bold text-gray-900">Acesso não permitido</h1>
        <p className="mb-6 text-sm text-gray-500">
          Você não tem permissão para acessar esta área. Seu perfil de recepcionista
          só permite acesso aos módulos da recepção.
        </p>
        <button
          onClick={() => router.push("/recepcao")}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-violet-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para a Recepção
        </button>
      </div>
    </div>
  );
}
