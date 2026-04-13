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

    // True when the user has 2FA enabled and no totpCode was provided in the login request.
    // Client must re-submit login with the totpCode field populated.
    private boolean requiresTwoFactor;

    public static AuthResponse of(UserResponse user, String accessToken, String refreshToken, long expiresIn) {
        return AuthResponse.builder()
                .user(user)
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(expiresIn)
                .requiresTwoFactor(false)
                .build();
    }

    public static AuthResponse requireTwoFactor() {
        return AuthResponse.builder()
                .requiresTwoFactor(true)
                .build();
    }
}
