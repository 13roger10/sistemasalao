package com.belezza.api.service.impl;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.internet.MimeMultipart;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@DisplayName("E-mails escapam o HTML dos dados do usuário")
class EmailServiceImplTest {

    private final JavaMailSender mailSender = mock(JavaMailSender.class);
    private final EmailServiceImpl service = new EmailServiceImpl(mailSender);

    @BeforeEach
    void setUp() {
        when(mailSender.createMimeMessage()).thenReturn(new MimeMessage(Session.getInstance(new Properties())));
        ReflectionTestUtils.setField(service, "fromEmail", "noreply@belezza.ai");
        ReflectionTestUtils.setField(service, "frontendUrl", "http://localhost:3000");
        ReflectionTestUtils.setField(service, "emailEnabled", true);
    }

    private String corpoEnviado() throws Exception {
        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(captor.capture());
        captor.getValue().saveChanges();
        return texto(captor.getValue().getContent());
    }

    /** HTML já decodificado, percorrendo as partes da mensagem. */
    private static String texto(Object conteudo) throws Exception {
        if (conteudo instanceof MimeMultipart mp) {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < mp.getCount(); i++) {
                sb.append(texto(mp.getBodyPart(i).getContent()));
            }
            return sb.toString();
        }
        return String.valueOf(conteudo);
    }

    @Test
    @DisplayName("Nome e motivo com HTML viram texto no e-mail de cancelamento (sem link falso)")
    void cancelamentoEscapaNomeEMotivo() throws Exception {
        service.sendAppointmentCancelledEmail("ana@teste.com",
                "Ana <a href=\"https://golpe.example\">Clique aqui</a>", "10/10/2026", "14:00",
                "Corte <b>VIP</b>", "<img src=x onerror=alert(1)>", "http://localhost:3000/reagendar");

        String corpo = corpoEnviado();
        assertThat(corpo).doesNotContain("<a href=\"https://golpe.example\">")
                .doesNotContain("<img src=x")
                .contains("&lt;a href=&quot;https://golpe.example&quot;&gt;")
                .contains("&lt;img src=x onerror=alert(1)&gt;")
                .contains("Corte &lt;b&gt;VIP&lt;/b&gt;");
    }
}
