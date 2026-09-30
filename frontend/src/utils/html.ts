/**
 * Escapa texto para inserir em HTML montado à mão (relatórios impressos): "<img onerror=…>" vira
 * texto e não código. O React já escapa o que renderiza; isto é para HTML fora dele.
 */
export function escaparHtml(valor: unknown): string {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
