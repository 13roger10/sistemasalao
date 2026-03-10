package com.belezza.api.dto.auth;

import com.belezza.api.dto.user.UserResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response DTO for authentication operations.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    private UserResponse user;
    private String accessToken;
    private String refreshToken;
    private String tokenType;
    private long expiresIn;

    public static AuthResponse of(UserResponse user, String accessToken, String refreshToken, long expiresIn) {
        return AuthResponse.builder()
                .user(user)
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(expiresIn)
                .build();
    }
}
