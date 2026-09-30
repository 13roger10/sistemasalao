package com.belezza.api.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("ClientIpResolver - IP real sem confiar em cabeçalho forjado")
class ClientIpResolverTest {

    private MockHttpServletRequest pedido(String remoto, String xff) {
        MockHttpServletRequest r = new MockHttpServletRequest();
        r.setRemoteAddr(remoto);
        if (xff != null) r.addHeader("X-Forwarded-For", xff);
        return r;
    }

    @Test
    @DisplayName("Vindo do servidor Next (mesmo computador), usa o IP que ele repassa")
    void confiaNoProxyLocal() {
        ClientIpResolver resolver = new ClientIpResolver();
        assertThat(resolver.resolver(pedido("127.0.0.1", "203.0.113.7"))).isEqualTo("203.0.113.7");
        assertThat(resolver.resolver(pedido("0:0:0:0:0:0:0:1", "1.1.1.1, 203.0.113.7"))).isEqualTo("203.0.113.7");
    }

    @Test
    @DisplayName("Vindo direto da rede, ignora o X-Forwarded-For (o atacante o forjaria)")
    void ignoraCabecalhoForjado() {
        ClientIpResolver resolver = new ClientIpResolver();
        assertThat(resolver.resolver(pedido("198.51.100.9", "10.0.0.1"))).isEqualTo("198.51.100.9");
    }

    @Test
    @DisplayName("Atrás do proxy da hospedagem (trust-forward-header), usa o último salto")
    void atrasDoProxyDaHospedagem() {
        ClientIpResolver resolver = new ClientIpResolver();
        ReflectionTestUtils.setField(resolver, "trustForwardHeader", true);
        assertThat(resolver.resolver(pedido("172.18.0.5", "10.0.0.1, 203.0.113.7"))).isEqualTo("203.0.113.7");
    }
}
