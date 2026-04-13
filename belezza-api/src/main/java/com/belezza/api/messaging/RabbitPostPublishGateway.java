package com.belezza.api.messaging;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * RabbitMQ-backed implementation of {@link PostPublishGateway}.
 *
 * Sends a {@link PublishPostMessage} to the belezza.exchange topic exchange.
 * The consumer ({@link PostPublishConsumer}) picks it up asynchronously,
 * decoupling the scheduler from the actual Meta API call.
 *
 * Active only when belezza.rabbitmq.enabled=true.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "belezza.rabbitmq.enabled", havingValue = "true")
public class RabbitPostPublishGateway implements PostPublishGateway {

    private final RabbitTemplate rabbitTemplate;

    @Value("${belezza.rabbitmq.exchange}")
    private String exchange;

    @Value("${belezza.rabbitmq.routing-keys.posts-publish}")
    private String routingKey;

    @Override
    public void enqueue(Long postId, Long salonId) {
        PublishPostMessage message = new PublishPostMessage(postId, salonId);
        rabbitTemplate.convertAndSend(exchange, routingKey, message);
        log.info("Post {} (salon {}) enqueued for async publishing via RabbitMQ", postId, salonId);
    }
}
