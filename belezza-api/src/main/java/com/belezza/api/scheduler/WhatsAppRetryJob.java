package com.belezza.api.scheduler;

import com.belezza.api.entity.WhatsAppMessage;
import com.belezza.api.entity.WhatsAppMessageStatus;
import com.belezza.api.repository.WhatsAppMessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Scheduled job that retries failed WhatsApp messages.
 * Messages with less than 3 attempts and created within last 24 hours are eligible.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WhatsAppRetryJob {

    private final WhatsAppMessageRepository messageRepository;
    private final RestTemplate restTemplate;

    @Value("${belezza.whatsapp.phone-number-id:}")
    private String phoneNumberId;

    @Value("${belezza.whatsapp.access-token:}")
    private String accessToken;

    @Value("${belezza.whatsapp.api-version:v18.0}")
    private String apiVersion;

    @Value("${belezza.whatsapp.api-url:https://graph.facebook.com}")
    private String apiUrl;

    @Value("${belezza.whatsapp.retry.enabled:true}")
    private boolean retryEnabled;

    private static final int MAX_RETRY_HOURS = 24;

    /**
     * Retries failed WhatsApp messages.
     * Runs every 15 minutes.
     */
    @Scheduled(fixedRate = 900000) // 15 minutes
    @Transactional
    public void retryFailedMessages() {
        if (!retryEnabled) {
            return;
        }

        if (phoneNumberId == null || phoneNumberId.isEmpty() ||
            accessToken == null || accessToken.isEmpty()) {
            log.debug("WhatsApp retry desativado - credenciais não configuradas");
            return;
        }

        LocalDateTime since = LocalDateTime.now().minusHours(MAX_RETRY_HOURS);
        List<WhatsAppMessage> failedMessages = messageRepository.findRetryableFailed(since);

        if (failedMessages.isEmpty()) {
            log.debug("Nenhuma mensagem WhatsApp para retry");
            return;
        }

        log.info("Iniciando retry de {} mensagens WhatsApp falhas", failedMessages.size());

        int successCount = 0;
        int failCount = 0;

        for (WhatsAppMessage message : failedMessages) {
            try {
                boolean success = retryMessage(message);
                if (success) {
                    successCount++;
                } else {
                    failCount++;
                }
            } catch (Exception e) {
                log.error("Erro no retry da mensagem {}: {}", message.getId(), e.getMessage());
                failCount++;
            }
        }

        log.info("Retry concluído: {} sucesso, {} falhas", successCount, failCount);
    }

    /**
     * Retry a single failed message.
     */
    private boolean retryMessage(WhatsAppMessage message) {
        log.info("Tentando retry da mensagem {} (tentativa {})", message.getId(), message.getTentativas() + 1);

        message.setTentativas(message.getTentativas() + 1);
        message.setStatus(WhatsAppMessageStatus.RETRYING);
        messageRepository.save(message);

        try {
            String url = String.format("%s/%s/%s/messages", apiUrl, apiVersion, phoneNumberId);

            Map<String, Object> payload = new HashMap<>();
            payload.put("messaging_product", "whatsapp");
            payload.put("to", message.getTelefone());
            payload.put("type", "text");
            payload.put("text", Map.of("body", message.getConteudo()));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(accessToken);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, request, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = response.getBody();
                List<Map<String, String>> messages = (List<Map<String, String>>) body.get("messages");
                if (messages != null && !messages.isEmpty()) {
                    String messageId = messages.get(0).get("id");
                    
                    message.setMessageId(messageId);
                    message.setStatus(WhatsAppMessageStatus.SENT);
                    message.setErrorMessage(null);
                    messageRepository.save(message);
                    
                    log.info("Retry bem-sucedido para mensagem {}. Novo ID: {}", message.getId(), messageId);
                    return true;
                }
            }

            // Failed response
            message.setStatus(WhatsAppMessageStatus.FAILED);
            message.setErrorMessage("Resposta inesperada da API");
            messageRepository.save(message);
            
            log.warn("Retry falhou para mensagem {}: resposta inesperada", message.getId());
            return false;

        } catch (RestClientException e) {
            message.setStatus(WhatsAppMessageStatus.FAILED);
            message.setErrorMessage(e.getMessage());
            messageRepository.save(message);
            
            log.error("Retry falhou para mensagem {}: {}", message.getId(), e.getMessage());
            return false;
        }
    }
}
