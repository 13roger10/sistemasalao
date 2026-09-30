package com.belezza.api.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for forgot password.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ForgotPasswordRequest {

    @NotBlank(message = "Email é obrigatório")
    @Email(message = "Email deve ser válido")
    private String email;

    /** Espaços nas pontas não invalidam o e-mail ("  ana@x.com " → "ana@x.com") — BUG-041. */
    public void setEmail(String email) {
        this.email = email != null ? email.trim() : null;
    }
}
