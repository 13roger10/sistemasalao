package com.belezza.api.integration;

import com.belezza.api.integration.impl.WhatsAppServiceImpl;
import com.belezza.api.repository.WhatsAppMessageRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("WhatsApp Service Tests")
class WhatsAppServiceTest {

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private ObjectMapper objectMapper;

    @Mock
    private WhatsAppMessageRepository messageRepository;

    @InjectMocks
    private WhatsAppServiceImpl whatsAppService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(whatsAppService, "phoneNumberId", "123456789");
        ReflectionTestUtils.setField(whatsAppService, "accessToken", "test-token");
        ReflectionTestUtils.setField(whatsAppService, "apiVersion", "v18.0");
        ReflectionTestUtils.setField(whatsAppService, "apiUrl", "https://graph.facebook.com");
    }

    @Test
    @DisplayName("Should send direct message successfully")
    void shouldSendDirectMessageSuccessfully() {
        // Given
        String telefone = "+5511999999999";
        String mensagem = "Teste de mensagem";

        Map<String, Object> responseBody = Map.of(
            "messages", List.of(
                Map.of("id", "wamid.123456")
            )
        );

        ResponseEntity<Map> response = new ResponseEntity<>(responseBody, HttpStatus.OK);

        when(restTemplate.exchange(
            anyString(),
            eq(HttpMethod.POST),
            any(HttpEntity.class),
            eq(Map.class)
        )).thenReturn(response);

        // When
        String messageId = whatsAppService.enviarMensagemDireta(telefone, mensagem);

        // Then
        assertThat(messageId).isEqualTo("wamid.123456");
        verify(restTemplate).exchange(
            anyString(),
            eq(HttpMethod.POST),
            any(HttpEntity.class),
            eq(Map.class)
        );
    }

    @Test
    @DisplayName("Should normalize phone number correctly")
    void shouldNormalizePhoneNumberCorrectly() {
        // Given
        String telefone = "(11) 99999-9999";
        String mensagem = "Teste";

        Map<String, Object> responseBody = Map.of(
            "messages", List.of(
                Map.of("id", "wamid.123")
            )
        );

        ResponseEntity<Map> response = new ResponseEntity<>(responseBody, HttpStatus.OK);

        ArgumentCaptor<HttpEntity> captor = ArgumentCaptor.forClass(HttpEntity.class);

        when(restTemplate.exchange(
            anyString(),
            eq(HttpMethod.POST),
            captor.capture(),
            eq(Map.class)
        )).thenReturn(response);

        // When
        whatsAppService.enviarMensagemDireta(telefone, mensagem);

        // Then
        HttpEntity<Map<String, Object>> capturedEntity = captor.getValue();
        Map<String, Object> payload = capturedEntity.getBody();
        assertThat(payload).isNotNull();
        assertThat(payload.get("to")).isEqualTo("+5511999999999");
    }

    @Test
    @DisplayName("Should send 24h reminder with correct format")
    void shouldSend24hReminderWithCorrectFormat() {
        // Given
        String telefone = "+5511999999999";
        String nomeCliente = "João Silva";
        String data = "15/02/2024";
        String hora = "14:30";
        String servico = "Corte Masculino";
        String linkConfirmacao = "https://belezza.ai/confirmar/abc123";

        Map<String, Object> responseBody = Map.of(
            "messages", List.of(
                Map.of("id", "wamid.reminder24h")
            )
        );

        ResponseEntity<Map> response = new ResponseEntity<>(responseBody, HttpStatus.OK);

        when(restTemplate.exchange(
            anyString(),
            eq(HttpMethod.POST),
            any(HttpEntity.class),
            eq(Map.class)
        )).thenReturn(response);

        // When
        String messageId = whatsAppService.enviarLembrete24h(
            telefone, nomeCliente, data, hora, servico, linkConfirmacao
        );

        // Then
        assertThat(messageId).isEqualTo("wamid.reminder24h");
        verify(restTemplate).exchange(
            anyString(),
            eq(HttpMethod.POST),
            any(HttpEntity.class),
            eq(Map.class)
        );
    }

    @Test
    @DisplayName("Should send 2h reminder with correct format")
    void shouldSend2hReminderWithCorrectFormat() {
        // Given
        String telefone = "+5511999999999";
        String nomeCliente = "João Silva";
        String hora = "14:30";
        String servico = "Corte Masculino";
        String endereco = "Rua ABC, 123";

        Map<String, Object> responseBody = Map.of(
            "messages", List.of(
                Map.of("id", "wamid.reminder2h")
            )
        );

        ResponseEntity<Map> response = new ResponseEntity<>(responseBody, HttpStatus.OK);

        when(restTemplate.exchange(
            anyString(),
            eq(HttpMethod.POST),
            any(HttpEntity.class),
            eq(Map.class)
        )).thenReturn(response);

        // When
        String messageId = whatsAppService.enviarLembrete2h(
            telefone, nomeCliente, hora, servico, endereco
        );

        // Then
        assertThat(messageId).isEqualTo("wamid.reminder2h");
        verify(restTemplate).exchange(
            anyString(),
            eq(HttpMethod.POST),
            any(HttpEntity.class),
            eq(Map.class)
        );
    }

    @Test
    @DisplayName("Should send image with caption successfully")
    void shouldSendImageWithCaptionSuccessfully() {
        // Given
        String telefone = "+5511999999999";
        String imageUrl = "https://example.com/image.jpg";
        String caption = "Confira nosso trabalho!";

        Map<String, Object> responseBody = Map.of(
            "messages", List.of(
                Map.of("id", "wamid.image123")
            )
        );

        ResponseEntity<Map> response = new ResponseEntity<>(responseBody, HttpStatus.OK);

        when(restTemplate.exchange(
            anyString(),
            eq(HttpMethod.POST),
            any(HttpEntity.class),
            eq(Map.class)
        )).thenReturn(response);

        // When
        String messageId = whatsAppService.enviarImagem(telefone, imageUrl, caption);

        // Then
        assertThat(messageId).isEqualTo("wamid.image123");
        verify(restTemplate).exchange(
            anyString(),
            eq(HttpMethod.POST),
            any(HttpEntity.class),
            eq(Map.class)
        );
    }

    @Test
    @DisplayName("Should send confirmation message successfully")
    void shouldSendConfirmationMessageSuccessfully() {
        // Given
        String telefone = "+5511999999999";
        String nomeCliente = "João Silva";
        String data = "15/02/2024";
        String hora = "14:30";
        String servico = "Corte Masculino";
        String profissional = "Carlos";
        String endereco = "Rua ABC, 123";
        String linkConfirmacao = "https://belezza.ai/confirmar/abc123";

        Map<String, Object> responseBody = Map.of(
            "messages", List.of(
                Map.of("id", "wamid.confirmation")
            )
        );

        ResponseEntity<Map> response = new ResponseEntity<>(responseBody, HttpStatus.OK);

        when(restTemplate.exchange(
            anyString(),
            eq(HttpMethod.POST),
            any(HttpEntity.class),
            eq(Map.class)
        )).thenReturn(response);

        // When
        String messageId = whatsAppService.enviarConfirmacaoAgendamento(
            telefone, nomeCliente, data, hora, servico, profissional, endereco, linkConfirmacao
        );

        // Then
        assertThat(messageId).isEqualTo("wamid.confirmation");
        verify(restTemplate).exchange(
            anyString(),
            eq(HttpMethod.POST),
            any(HttpEntity.class),
            eq(Map.class)
        );
    }

    @Test
    @DisplayName("Should send post-appointment message successfully")
    void shouldSendPostAppointmentMessageSuccessfully() {
        // Given
        String telefone = "+5511999999999";
        String nomeCliente = "João Silva";
        String linkAvaliacao = "https://belezza.ai/avaliar/abc123";

        Map<String, Object> responseBody = Map.of(
            "messages", List.of(
                Map.of("id", "wamid.postappointment")
            )
        );

        ResponseEntity<Map> response = new ResponseEntity<>(responseBody, HttpStatus.OK);

        when(restTemplate.exchange(
            anyString(),
            eq(HttpMethod.POST),
            any(HttpEntity.class),
            eq(Map.class)
        )).thenReturn(response);

        // When
        String messageId = whatsAppService.enviarPosAtendimento(
            telefone, nomeCliente, linkAvaliacao
        );

        // Then
        assertThat(messageId).isEqualTo("wamid.postappointment");
        verify(restTemplate).exchange(
            anyString(),
            eq(HttpMethod.POST),
            any(HttpEntity.class),
            eq(Map.class)
        );
    }
}
