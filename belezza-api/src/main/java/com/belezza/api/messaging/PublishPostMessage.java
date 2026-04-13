package com.belezza.api.messaging;

import java.io.Serial;
import java.io.Serializable;

/**
 * Message payload sent to the post-publish RabbitMQ queue.
 *
 * Serializable so Spring AMQP can convert it via Jackson (JSON).
 * Fields are intentionally minimal — the consumer re-loads the post
 * from the database before publishing, ensuring it has the latest state.
 */
public record PublishPostMessage(Long postId, Long salonId) implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;
}
