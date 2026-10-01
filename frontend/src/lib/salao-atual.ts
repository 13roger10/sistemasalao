// Salão (unidade) da sessão atual — o mesmo que o backend usa.
//
// Um admin pode ter várias unidades, e cada uma é um salão: as telas não podem supor o salão 1.
// O salão vem do token de acesso (claim "salonId"), que muda quando o admin entra em outra unidade.
// Só leitura: quem valida o acesso é o backend.

const TOKEN_KEY = "salon_auth_token";
const UNIDADE_SELECIONADA_KEY = "salon_selected_unit";

/** Salão gravado no token de acesso (claim "salonId"), ou null se não houver. */
export function salaoDoToken(token: string | null | undefined): string | null {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return json.salonId != null ? String(json.salonId) : null;
  } catch {
    return null;
  }
}

/**
 * Salão da sessão: o do token; sem ele (cliente sem salão fixo), a unidade escolhida no
 * navegador; e, só em último caso, o salão 1 (o comportamento de antes, para telas públicas).
 */
export function salaoAtual(): string {
  if (typeof window === "undefined") return "1";
  try {
    return (
      salaoDoToken(localStorage.getItem(TOKEN_KEY)) ||
      localStorage.getItem(UNIDADE_SELECIONADA_KEY) ||
      "1"
    );
  } catch {
    return "1";
  }
}
