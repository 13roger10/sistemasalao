package com.belezza.api.config;

import com.belezza.api.security.WebSocketAuthChannelInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * STOMP over WebSocket configuration.
 *
 * Endpoint : /ws  (SockJS fallback enabled)
 * App prefix: /app  — client sends to  /app/...
 * Broker    : /topic  (broadcast)
 *           : /user   (user-specific queue via convertAndSendToUser)
 *
 * Notifications are delivered to:
 *   /user/{email}/queue/notificacoes
 */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final WebSocketAuthChannelInterceptor authChannelInterceptor;

    @Override
    @SuppressWarnings("null")
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
            .setAllowedOriginPatterns("*")   // restricted further by CORS config
            .withSockJS();                    // SockJS fallback for browsers that lack WS
    }

    @Override
    @SuppressWarnings("null")
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Prefix for messages routed to @MessageMapping controllers
        registry.setApplicationDestinationPrefixes("/app");

        // In-memory broker for /topic (broadcast) and /user (point-to-point)
        registry.enableSimpleBroker("/topic", "/user");

        // Prefix Spring adds internally to user destinations
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    @SuppressWarnings("null")
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // Validate JWT on every STOMP CONNECT frame
        registration.interceptors(authChannelInterceptor);
    }
}
