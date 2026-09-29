"use client";

import { useUnit } from "@/contexts/UnitContext";

/**
 * Id do salão de quem está logado, como string (para montar URLs da API). Substitui o salão "1"
 * fixo das telas da recepção: a recepcionista de outro salão recebia "acesso negado" do backend.
 * O layout de /recepcao só mostra as páginas depois que o salão é conhecido.
 */
export function useSalaoAtual(): string {
  const { selectedUnitId } = useUnit();
  return selectedUnitId ?? "";
}
