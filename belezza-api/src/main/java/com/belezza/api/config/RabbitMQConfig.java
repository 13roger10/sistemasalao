package com.belezza.api.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.config.RetryInterceptorBuilder;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.rabbit.retry.RepublishMessageRecoverer;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.retry.interceptor.RetryOperationsInterceptor;

/**
 * RabbitMQ topology and infrastructure configuration.
 *
 * Only active when belezza.rabbitmq.enabled=true.
 *
 * Topology:
 *   belezza.exchange (topic, durable)
 *     └─ belezza.posts.publish  ← routing key: posts.publish
 *           │  (x-dead-letter-exchange → belezza.dlq.exchange)
 *           └─ on failure → belezza.posts.publish.dlq
 *
 *   belezza.dlq.exchange (direct, durable)
 *     └─ belezza.posts.publish.dlq ← routing key: posts.publish.dead
 *
 * Retry policy (consumer-side):
 *   3 attempts, 2 s / 5 s / 10 s back-off → on exhaustion → DLQ via RepublishMessageRecoverer
 */
@Slf4j
@Configuration
@ConditionalOnProperty(name = "belezza.rabbitmq.enabled", havingValue = "true")
public class RabbitMQConfig {

    @Value("${belezza.rabbitmq.exchange}")
    private String exchange;

    @Value("${belezza.rabbitmq.dlq-exchange}")
    private String dlqExchange;

    @Value("${belezza.rabbitmq.queues.posts-publish}")
    private String postsPublishQueue;

    @Value("${belezza.rabbitmq.queues.posts-publish-dlq}")
    private String postsPublishDlq;

    @Value("${belezza.rabbitmq.routing-keys.posts-publish}")
    private String postsPublishKey;

    @Value("${belezza.rabbitmq.routing-keys.posts-publish-dead}")
    private String postsPublishDeadKey;

    // ─── Exchanges ────────────────────────────────────────────────────────────

    @Bean
    TopicExchange belezzaExchange() {
        return ExchangeBuilder.topicExchange(exchange).durable(true).build();
    }

    @Bean
    DirectExchange belezzaDlqExchange() {
        return ExchangeBuilder.directExchange(dlqExchange).durable(true).build();
    }

    // ─── Queues ───────────────────────────────────────────────────────────────

    @Bean
    Queue postsPublishQueue() {
        return QueueBuilder.durable(postsPublishQueue)
            .withArgument("x-dead-letter-exchange", dlqExchange)
            .withArgument("x-dead-letter-routing-key", postsPublishDeadKey)
            .build();
    }

    @Bean
    Queue postsPublishDlq() {
        return QueueBuilder.durable(postsPublishDlq).build();
    }

    // ─── Bindings ─────────────────────────────────────────────────────────────

    @Bean
    Binding postsPublishBinding(Queue postsPublishQueue, TopicExchange belezzaExchange) {
        return BindingBuilder.bind(postsPublishQueue)
            .to(belezzaExchange)
            .with(postsPublishKey);
    }

    @Bean
    Binding postsPublishDlqBinding(Queue postsPublishDlq, DirectExchange belezzaDlqExchange) {
        return BindingBuilder.bind(postsPublishDlq)
            .to(belezzaDlqExchange)
            .with(postsPublishDeadKey);
    }

    // ─── Message Converter ────────────────────────────────────────────────────

    @Bean
    @SuppressWarnings("null")
    MessageConverter jacksonMessageConverter(ObjectMapper objectMapper) {
        return new Jackson2JsonMessageConverter(objectMapper);
    }

    // ─── RabbitTemplate ───────────────────────────────────────────────────────

    @Bean
    @SuppressWarnings("null")
    RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory,
                                  MessageConverter jacksonMessageConverter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jacksonMessageConverter);
        // Confirm publishes (requires publisher-confirms=true in connection factory)
        template.setMandatory(true);
        return template;
    }

    // ─── Listener Container Factory (with retry + DLQ recoverer) ─────────────

    @Bean
    SimpleRabbitListenerContainerFactory rabbitListenerContainerFactory(
            ConnectionFactory connectionFactory,
            MessageConverter jacksonMessageConverter,
            RabbitTemplate rabbitTemplate) {

        RetryOperationsInterceptor retryInterceptor = RetryInterceptorBuilder.stateless()
            .maxAttempts(3)
            .backOffOptions(2_000, 2.5, 10_000) // 2 s → 5 s → 10 s
            .recoverer(new RepublishMessageRecoverer(rabbitTemplate, dlqExchange, postsPublishDeadKey))
            .build();

        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        factory.setMessageConverter(jacksonMessageConverter);
        factory.setAdviceChain(retryInterceptor);
        factory.setDefaultRequeueRejected(false); // do not re-queue — let DLQ handle it
        factory.setConcurrentConsumers(2);
        factory.setMaxConcurrentConsumers(5);
        return factory;
    }
}
