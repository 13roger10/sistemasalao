// ===== Renovação da sessão do salão (compartilhada entre os clientes HTTP) =====
//
// O access token dura 15 minutos. O SalonAuthContext agenda uma renovação antes de expirar,
// mas esse timer não dispara com a aba em segundo plano ou o computador suspenso. Por isso
// todo cliente HTTP que recebe 401 chama refreshSalonSession() e repete a requisição uma vez.
// Chamadas simultâneas compartilham a mesma renovação.

import { env } from "./env";

const TOKEN_KEY = "salon_auth_token";
const REFRESH_TOKEN_KEY = "salon_refresh_token";
const USER_KEY = "salon_auth_user";
const TOKEN_EXPIRY_KEY = "salon_token_expiry";
const UNIDADE_SELECIONADA_KEY = "salon_selected_unit";

/** Evento disparado no window quando o token é renovado fora do SalonAuthContext. */
export const SESSAO_RENOVADA_EVENT = "salon-sessao-renovada";

let emAndamento: Promise<string | null> | null = null;

/**
 * Validade do cookie da sessão: a do refresh token (7 dias), não a do access token (15 min).
 * O proxy do Next só deixa abrir telas do salão com esse cookie; se ele expirasse junto com o
 * access token, recarregar a página depois de 15 minutos levava ao login mesmo com a sessão
 * ainda renovável.
 */
export function validadeDaSessao(): Date {
  const refreshToken = typeof window !== "undefined" ? localStorage.getItem(REFRESH_TOKEN_KEY) : null;
  try {
    const exp = refreshToken ? JSON.parse(atob(refreshToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).exp : null;
    if (typeof exp === "number") return new Date(exp * 1000);
  } catch {
    /* refresh token ilegível: usa o padrão */
  }
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

/** Grava o cookie lido pelo proxy do Next (SEC-013: SameSite=Strict e Secure em HTTPS). */
export function gravarCookieSessao(token: string): void {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${TOKEN_KEY}=${token}; path=/; expires=${validadeDaSessao().toUTCString()}; SameSite=Strict${secure}`;
}

/** Encerra a sessão local e leva para o login do salão (se ainda não estiver nele). */
export function encerrarSessaoSalon(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  if (!window.location.pathname.includes("/login")) {
    window.location.href = "/salon/login";
  }
}

async function renovar(): Promise<string | null> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  const response = await fetch("/api/auth/salon/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) return null;

  const data: { token?: string; refreshToken?: string; expiresIn?: number } = await response.json();
  if (!data.token) return null;

  localStorage.setItem(TOKEN_KEY, data.token);
  if (data.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
  if (data.expiresIn) localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + data.expiresIn));
  gravarCookieSessao(data.token);
  // O SalonAuthContext guarda o token em estado (usado por notificações e WebSocket)
  window.dispatchEvent(new CustomEvent(SESSAO_RENOVADA_EVENT, { detail: { token: data.token } }));
  return data.token;
}

/**
 * Renova o access token com o refresh token. Devolve o novo token, ou null quando a sessão
 * não pode ser renovada (sem refresh token, ou refresh expirado/recusado).
 */
export function refreshSalonSession(): Promise<string | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (!emAndamento) {
    emAndamento = renovar()
      .catch(() => null)
      .finally(() => {
        emAndamento = null;
      });
  }
  return emAndamento;
}

/**
 * Entra em outra unidade do admin: o backend confere que a unidade é dele e está ativa, grava a
 * escolha e devolve tokens novos com o salão dela (o salão de todas as telas vem do token). Vai
 * direto no backend, sem o cliente HTTP do salão, que registra as respostas no console — e esta
 * traz os tokens. Lança erro com a mensagem do backend.
 */
export async function entrarNaUnidade(unidadeId: number | string): Promise<void> {
  const chamar = () =>
    fetch(`${env.apiUrl}/salon/units/${encodeURIComponent(String(unidadeId))}/entrar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ""}` },
    });

  let response = await chamar();
  if (response.status === 401 && (await refreshSalonSession())) {
    response = await chamar();
  }
  const data: { accessToken?: string; refreshToken?: string; expiresIn?: number; message?: string } =
    await response.json().catch(() => ({}));
  if (!response.ok || !data.accessToken) {
    throw new Error(data.message || "Não foi possível entrar na unidade");
  }

  localStorage.setItem(TOKEN_KEY, data.accessToken);
  if (data.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
  if (data.expiresIn) localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + data.expiresIn));
  localStorage.setItem(UNIDADE_SELECIONADA_KEY, String(unidadeId));
  gravarCookieSessao(data.accessToken);
}
