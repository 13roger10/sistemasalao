package com.belezza.api.messaging;

/**
 * Abstraction over the post-publishing dispatch mechanism.
 *
 * Two implementations are available:
 *   - {@link RabbitPostPublishGateway}  — active when belezza.rabbitmq.enabled=true
 *   - {@link DirectPostPublishGateway}  — active by default (dev / no RabbitMQ)
 *
 * Callers (e.g. {@code PublicacaoAgendadaJob}) depend only on this interface
 * and are unaware of whether messages go through RabbitMQ or run inline.
 */
public interface PostPublishGateway {

    /**
     * Dispatches a publish job for the given post.
     * The implementation decides whether to enqueue asynchronously or run inline.
     *
     * @param postId   ID of the post to publish
     * @param salonId  ID of the salon that owns the post
     */
    void enqueue(Long postId, Long salonId);
}
