package com.belezza.api.messaging;

import com.belezza.api.service.PostService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Direct (synchronous) implementation of {@link PostPublishGateway}.
 *
 * Used in local development when RabbitMQ is not running.
 * Calls {@link PostService#publishPost} inline on the caller's thread —
 * no broker, no async behaviour.
 *
 * Active when belezza.rabbitmq.enabled=false (default).
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "belezza.rabbitmq.enabled", havingValue = "false", matchIfMissing = true)
public class DirectPostPublishGateway implements PostPublishGateway {

    private final PostService postService;

    @Override
    public void enqueue(Long postId, Long salonId) {
        log.debug("RabbitMQ disabled — publishing post {} (salon {}) synchronously", postId, salonId);
        postService.publishPost(salonId, postId);
    }
}
