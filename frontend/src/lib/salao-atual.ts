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
 * Salão da sessão: o do token (equipe); sem ele — cliente, que não tem salão fixo, ou tela
 * pública —, o salão 1, como antes das unidades. Não usa a unidade guardada no navegador: ela é
 * da equipe e sobrava de um login anterior (o cliente que entrava depois do admin, no mesmo
 * navegador, via o agendamento de uma unidade vazia ou desativada, sem nenhum serviço).
 */
export function salaoAtual(): string {
  if (typeof window === "undefined") return "1";
  try {
    return salaoDoToken(localStorage.getItem(TOKEN_KEY)) || "1";
  } catch {
    return "1";
  }
}

/** Apaga a unidade guardada no navegador (ao sair ou trocar de conta). */
export function esquecerUnidadeSelecionada(): void {
  try {
    localStorage.removeItem(UNIDADE_SELECIONADA_KEY);
  } catch {
    /* sem acesso ao armazenamento: nada a apagar */
  }
}
