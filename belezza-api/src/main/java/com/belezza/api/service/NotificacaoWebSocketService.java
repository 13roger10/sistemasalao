package com.belezza.api.service;

import com.belezza.api.dto.notificacao.NotificacaoResponse;
import com.belezza.api.entity.Notificacao;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Pushes notifications to connected WebSocket clients in real time.
 *
 * Destination pattern: /user/{email}/queue/notificacoes
 *
 * The client subscribes to /user/queue/notificacoes — Spring automatically
 * prefixes the user's name (email), so each user only receives their own messages.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificacaoWebSocketService {

    private final SimpMessagingTemplate messagingTemplate;

    private static final String DEST_NOTIFICACOES = "/queue/notificacoes";
    private static final String DEST_CONTADOR     = "/queue/notificacoes/contador";

    /**
     * Sends a single notification to the user's personal queue.
     * Runs asynchronously so it never blocks the DB transaction that created the notification.
     *
     * @param email       the target user's email (used as STOMP principal name)
     * @param notificacao the persisted entity to deliver
     */
    @Async
    public void enviarParaUsuario(String email, Notificacao notificacao) {
        try {
            NotificacaoResponse payload = NotificacaoResponse.fromEntity(notificacao);
            messagingTemplate.convertAndSendToUser(email, DEST_NOTIFICACOES, payload);
            log.debug("WebSocket notification sent to {}: [{}] {}", email, notificacao.getTipo(), notificacao.getTitulo());
        } catch (Exception e) {
            // Non-critical: user may simply be offline — notification is still in DB
            log.warn("Failed to send WebSocket notification to {}: {}", email, e.getMessage());
        }
    }

    /**
     * Pushes an updated unread-count badge to the user.
     * Called after marking notifications as read so the badge updates instantly.
     *
     * @param email       target user's email
     * @param totalNaoLidas current unread count
     */
    @Async
    public void enviarContador(String email, long totalNaoLidas) {
        try {
            messagingTemplate.convertAndSendToUser(
                email, DEST_CONTADOR, new ContadorPayload(totalNaoLidas));
            log.debug("WebSocket unread count sent to {}: {}", email, totalNaoLidas);
        } catch (Exception e) {
            log.warn("Failed to send WebSocket counter to {}: {}", email, e.getMessage());
        }
    }

    /** Minimal payload for the unread-count badge. */
    public record ContadorPayload(long naoLidas) {}
}
