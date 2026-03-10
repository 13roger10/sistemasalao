package com.belezza.api.controller;

import com.belezza.api.entity.WhatsAppMessage;
import com.belezza.api.entity.WhatsAppMessageStatus;
import com.belezza.api.repository.WhatsAppMessageRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Webhook controller for WhatsApp Business API callbacks.
 * Handles verification and status updates from Meta Cloud API.
 */
@RestController
@RequestMapping("/api/webhooks/whatsapp")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Webhooks", description = "WhatsApp webhook endpoints")
public class WhatsAppWebhookController {

    private final WhatsAppMessageRepository messageRepository;

    @Value("${whatsapp.webhook-verify-token:belezza_whatsapp_verify}")
    private String verifyToken;

    /**
     * Webhook verification endpoint.
     * WhatsApp will call this endpoint to verify the webhook URL during setup.
     */
    @GetMapping
    @Operation(
        summary = "Webhook verification",
        description = "WhatsApp webhook verification endpoint. " +
                     "Validates the verify token and returns the challenge."
    )
    public ResponseEntity<?> verifyWebhook(
        @RequestParam("hub.mode") String mode,
        @RequestParam("hub.challenge") String challenge,
        @RequestParam("hub.verify_token") String token
    ) {
        log.info("WhatsApp webhook verification request. Mode: {}, Token: {}", mode, token);

        // Verify mode and token
        if ("subscribe".equals(mode) && verifyToken.equals(token)) {
            log.info("WhatsApp webhook verified successfully");
            // Return challenge as plain text
            return ResponseEntity.ok(challenge);
        }

        log.warn("WhatsApp webhook verification failed. Invalid token or mode");
        return ResponseEntity.status(403).body("Verification failed");
    }

    /**
     * Webhook events endpoint.
     * Receives status updates from WhatsApp about message delivery.
     */
    @PostMapping
    @Operation(
        summary = "Receive webhook events",
        description = "Receives status notifications from WhatsApp (sent, delivered, read, failed). " +
                     "Updates message status in the database."
    )
    public ResponseEntity<String> handleWebhook(@RequestBody Map<String, Object> payload) {
        log.info("WhatsApp webhook event received: {}", payload);

        try {
            // Parse webhook payload
            String object = (String) payload.get("object");

            if ("whatsapp_business_account".equals(object)) {
                // Process entries
                if (payload.containsKey("entry")) {
                    List<Map<String, Object>> entries =
                        (List<Map<String, Object>>) payload.get("entry");

                    for (Map<String, Object> entry : entries) {
                        processEntry(entry);
                    }
                }
            }

            // Always return 200 OK to acknowledge receipt
            return ResponseEntity.ok("EVENT_RECEIVED");

        } catch (Exception e) {
            log.error("Error processing WhatsApp webhook: {}", e.getMessage(), e);
            // Still return 200 to avoid retries
            return ResponseEntity.ok("EVENT_RECEIVED");
        }
    }

    /**
     * Process a single webhook entry.
     */
    private void processEntry(Map<String, Object> entry) {
        try {
            String id = (String) entry.get("id");

            log.debug("Processing WhatsApp entry: {}", id);

            // Process changes
            if (entry.containsKey("changes")) {
                List<Map<String, Object>> changes =
                    (List<Map<String, Object>>) entry.get("changes");

                for (Map<String, Object> change : changes) {
                    processChange(change);
                }
            }

        } catch (Exception e) {
            log.error("Error processing WhatsApp entry: {}", e.getMessage(), e);
        }
    }

    /**
     * Process a single change event.
     */
    private void processChange(Map<String, Object> change) {
        try {
            String field = (String) change.get("field");
            Map<String, Object> value = (Map<String, Object>) change.get("value");

            log.debug("Processing WhatsApp change - Field: {}, Value: {}", field, value);

            if ("messages".equals(field)) {
                // Handle message status updates
                if (value.containsKey("statuses")) {
                    List<Map<String, Object>> statuses =
                        (List<Map<String, Object>>) value.get("statuses");

                    for (Map<String, Object> status : statuses) {
                        handleStatusUpdate(status);
                    }
                }
            }

        } catch (Exception e) {
            log.error("Error processing WhatsApp change: {}", e.getMessage(), e);
        }
    }

    /**
     * Handle message status update.
     */
    private void handleStatusUpdate(Map<String, Object> status) {
        try {
            String messageId = (String) status.get("id");
            String statusValue = (String) status.get("status");
            Long timestamp = (Long) status.get("timestamp");

            log.info("WhatsApp status update - Message: {}, Status: {}, Timestamp: {}",
                messageId, statusValue, timestamp);

            // Find message in database
            messageRepository.findByMessageId(messageId).ifPresent(message -> {
                updateMessageStatus(message, statusValue, timestamp);
            });

        } catch (Exception e) {
            log.error("Error handling WhatsApp status update: {}", e.getMessage(), e);
        }
    }

    /**
     * Update message status in database.
     */
    private void updateMessageStatus(WhatsAppMessage message, String statusValue, Long timestamp) {
        try {
            LocalDateTime statusTime = timestamp != null
                ? LocalDateTime.ofEpochSecond(timestamp, 0, java.time.ZoneOffset.UTC)
                : LocalDateTime.now();

            switch (statusValue) {
                case "sent":
                    message.setStatus(WhatsAppMessageStatus.SENT);
                    break;

                case "delivered":
                    message.setStatus(WhatsAppMessageStatus.DELIVERED);
                    message.setEntregueEm(statusTime);
                    log.info("Mensagem {} entregue", message.getMessageId());
                    break;

                case "read":
                    message.setStatus(WhatsAppMessageStatus.READ);
                    message.setLidoEm(statusTime);
                    log.info("Mensagem {} lida", message.getMessageId());
                    break;

                case "failed":
                    message.setStatus(WhatsAppMessageStatus.FAILED);
                    // Extract error message if available
                    // (error info would be in the status object)
                    log.warn("Mensagem {} falhou", message.getMessageId());
                    break;

                default:
                    log.warn("Status WhatsApp desconhecido: {}", statusValue);
            }

            messageRepository.save(message);
            log.debug("Status da mensagem atualizado: {} -> {}", message.getMessageId(), statusValue);

        } catch (Exception e) {
            log.error("Erro ao atualizar status da mensagem: {}", e.getMessage(), e);
        }
    }
}
