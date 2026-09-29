import type { NextRequest } from "next/server";

/**
 * IP de quem abriu a tela, para repassar ao backend nas rotas que fazem proxy do login.
 * Sem isso o backend via todas as tentativas vindo do IP do servidor Next, e o limite de
 * tentativas por IP (RateLimitFilter) contava todos os usuários juntos (BUG-029).
 *
 * Usa o ÚLTIMO valor do X-Forwarded-For, o que o proxy da hospedagem acrescenta: os anteriores
 * vêm do próprio cliente e podem ser forjados.
 */
export function ipDoCliente(request: NextRequest): string | null {
  const encaminhado = request.headers.get("x-forwarded-for");
  if (encaminhado) {
    const saltos = encaminhado.split(",").map((s) => s.trim()).filter(Boolean);
    if (saltos.length > 0) return saltos[saltos.length - 1];
  }
  return request.headers.get("x-real-ip");
}

/** Cabeçalhos para o backend com o IP do cliente, quando conhecido. */
export function cabecalhosComIp(request: NextRequest, base: Record<string, string>): Record<string, string> {
  const ip = ipDoCliente(request);
  return ip ? { ...base, "X-Forwarded-For": ip } : base;
}
