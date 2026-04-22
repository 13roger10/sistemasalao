package com.belezza.api.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;

/**
 * Validates the JWT token on every STOMP CONNECT frame.
 *
 * The frontend sends the token in the STOMP headers:
 *   { "Authorization": "Bearer eyJhbG..." }
 *
 * On success the authenticated principal is attached to the session so that
 * Spring can route user-specific messages to /user/{email}/queue/notificacoes.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketAuthChannelInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    @SuppressWarnings("null")
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
            MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null || !StompCommand.CONNECT.equals(accessor.getCommand())) {
            return message;
        }

        String authHeader = accessor.getFirstNativeHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.warn("WebSocket CONNECT rejected: missing or malformed Authorization header");
            throw new IllegalArgumentException("Token JWT ausente ou malformado.");
        }

        String token = authHeader.substring(7);
        try {
            String email = jwtService.extractUsername(token);
            UserDetails userDetails = userDetailsService.loadUserByUsername(email);

            if (!jwtService.isTokenValid(token, userDetails)) {
                log.warn("WebSocket CONNECT rejected: invalid token for {}", email);
                throw new IllegalArgumentException("Token JWT inválido ou expirado.");
            }

            UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());

            accessor.setUser(auth);
            log.debug("WebSocket CONNECT authenticated: {}", email);

        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.warn("WebSocket CONNECT rejected: {}", e.getMessage());
            throw new IllegalArgumentException("Falha na autenticação WebSocket.");
        }

        return message;
    }
}
