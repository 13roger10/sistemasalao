package com.belezza.api.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response with the current 2FA status for the authenticated user.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TwoFactorStatusResponse {

    private boolean enabled;
    private long remainingBackupCodes;
}
