"use client";

import Link from "next/link";
import { Gift } from "lucide-react";
import { SalonLayout } from "@/components/layout/SalonLayout";
import { Button } from "@/components/ui/Button";

// BUG-012 (auditoria): a tela mostrava cupons, campanhas, cashback e pacotes fictícios, fixos no
// código, e "salvar" não gravava nada — ainda não existe backend de promoções. Fica fora do menu
// e esta rota avisa, até o módulo existir.
export default function PromotionsPage() {
  return (
    <SalonLayout requiredRole="ADMIN" pageTitle="Promoções">
      <div className="mx-auto max-w-xl rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
        <Gift className="mx-auto h-12 w-12 text-gray-400" />
        <h1 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">Promoções ainda não estão disponíveis</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Cupons, campanhas, cashback e pacotes promocionais estão em desenvolvimento. Enquanto isso, use o
          Programa de Fidelidade para recompensar clientes frequentes.
        </p>
        <Link href="/salon/loyalty" className="mt-6 inline-block">
          <Button variant="primary">Ir para Fidelidade</Button>
        </Link>
      </div>
    </SalonLayout>
  );
}
