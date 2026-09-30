package com.belezza.api.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * IP de quem fez a requisição, para o bloqueio de login por IP.
 *
 * <p>O {@code X-Forwarded-For} só vale quando o pedido chega de um proxy confiável: o próprio
 * computador (o servidor Next, que repassa o IP de quem abriu a tela) ou, com
 * {@code trust-forward-header=true}, o proxy da hospedagem (nginx/ingress). Nesse caso usa o
 * ÚLTIMO salto, o que o proxy acrescentou — os anteriores o cliente pode forjar. Fora isso vale o
 * IP da conexão, que o cliente não controla.
 */
@Component
public class ClientIpResolver {

    @Value("${belezza.rate-limit.trust-forward-header:false}")
    private boolean trustForwardHeader;

    public String resolver(HttpServletRequest request) {
        String remoto = request.getRemoteAddr();
        if (trustForwardHeader || isLoopback(remoto)) {
            String encaminhado = request.getHeader("X-Forwarded-For");
            if (encaminhado != null && !encaminhado.isBlank()) {
                String[] saltos = encaminhado.split(",");
                String ultimo = saltos[saltos.length - 1].trim();
                if (!ultimo.isEmpty()) {
                    return ultimo;
                }
            }
            String realIp = request.getHeader("X-Real-IP");
            if (realIp != null && !realIp.isBlank()) {
                return realIp.trim();
            }
        }
        return remoto;
    }

    /** IP da requisição em andamento; nulo fora de uma requisição HTTP. */
    public String ipAtual() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes atributos) {
            return resolver(atributos.getRequest());
        }
        return null;
    }

    private static boolean isLoopback(String ip) {
        return ip != null && (ip.equals("127.0.0.1") || ip.equals("::1") || ip.equals("0:0:0:0:0:0:0:1"));
    }
}
