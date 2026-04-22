package com.belezza.api.dto.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request carrying a TOTP code (6 digits) or a backup code (8 alphanumeric chars).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TwoFactorCodeRequest {

    @NotBlank(message = "Código é obrigatório")
    private String code;
}
