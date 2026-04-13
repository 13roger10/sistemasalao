package com.belezza.api.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response returned when 2FA setup is initiated.
 * Contains the QR code URI to be scanned in Google Authenticator / Authy.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TwoFactorSetupResponse {

    private String qrCodeUri;
    private String message;
}
