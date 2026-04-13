package com.belezza.api.messaging;

import com.belezza.api.service.PostService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * RabbitMQ consumer for asynchronous social media post publishing.
 *
 * Main queue: {@code belezza.posts.publish}
 *   Receives {@link PublishPostMessage}, calls {@link PostService#publishPost}.
 *   On failure, Spring AMQP retries up to 3 times (configured in {@code RabbitMQConfig})
 *   then routes the message to the DLQ via {@code RepublishMessageRecoverer}.
 *
 * DLQ: {@code belezza.posts.publish.dlq}
 *   Receives messages that exhausted all retry attempts at the broker level.
 *   The post is already marked FALHOU in the database by PostService; here we
 *   only log for operational visibility (alerts/dashboards).
 *
 * Active only when belezza.rabbitmq.enabled=true.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "belezza.rabbitmq.enabled", havingValue = "true")
public class PostPublishConsumer {

    private final PostService postService;

    // ─── Main queue listener ───────────────────────────────────────────────────

    @RabbitListener(
        queues    = "${belezza.rabbitmq.queues.posts-publish}",
        containerFactory = "rabbitListenerContainerFactory"
    )
    public void onPublishPost(PublishPostMessage message) {
        log.info("Received publish job — postId={}, salonId={}", message.postId(), message.salonId());

        // publishPost handles its own FALHOU state + back-off scheduling (ITEM 3).
        // If it throws an unchecked exception, Spring AMQP will trigger broker-level retries.
        postService.publishPost(message.salonId(), message.postId());

        log.info("Publish job completed — postId={}", message.postId());
    }

    // ─── Dead Letter Queue listener ───────────────────────────────────────────

    @RabbitListener(
        queues    = "${belezza.rabbitmq.queues.posts-publish-dlq}",
        containerFactory = "rabbitListenerContainerFactory"
    )
    public void onDeadLetterPost(PublishPostMessage message) {
        // The post is already marked FALHOU with notifications sent by PostService.
        // This handler exists purely for operational observability.
        log.error("[DLQ] Post {} (salon {}) exhausted all broker-level retries and landed in the dead-letter queue. " +
                  "Check RabbitMQ management UI and post status in the database.",
                  message.postId(), message.salonId());
    }
}
