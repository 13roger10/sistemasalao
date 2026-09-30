/**
 * Busca de texto sem acentos, sem diferença de maiúsculas e com espaços simples:
 * "jose cao" encontra "José  Ção" (BUG-040).
 */
export function normalizarBusca(texto: string | null | undefined): string {
  return (texto ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/** `texto` contém `busca`, ignorando acentos, maiúsculas e espaços repetidos. */
export function contemTexto(texto: string | null | undefined, busca: string | null | undefined): boolean {
  return texto != null && normalizarBusca(texto).includes(normalizarBusca(busca));
}
