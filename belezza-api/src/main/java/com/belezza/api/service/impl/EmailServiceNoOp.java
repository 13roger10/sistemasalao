package com.belezza.api.service.impl;

import com.belezza.api.service.EmailService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

/**
 * No-operation implementation of EmailService.
 * Used when mail is disabled (e.g., in local development).
 * Logs email operations instead of sending them.
 */
@Service
@Slf4j
@ConditionalOnProperty(name = "spring.mail.enabled", havingValue = "false")
public class EmailServiceNoOp implements EmailService {

    public EmailServiceNoOp() {
        log.warn("Mail is disabled - Using no-op email service. Emails will only be logged.");
    }

    @Override
    public void sendPasswordResetEmail(String email, String resetToken, String userName) {
        log.info("[NO-OP EMAIL] Password reset email - To: {}, User: {}, Token: {}",
            email, userName, resetToken);
    }

    @Override
    public void sendEmailVerificationEmail(String email, String verificationToken, String userName) {
        log.info("[NO-OP EMAIL] Email verification - To: {}, User: {}, Token: {}",
            email, userName, verificationToken);
    }

    @Override
    public void sendWelcomeEmail(String email, String userName) {
        log.info("[NO-OP EMAIL] Welcome email - To: {}, User: {}", email, userName);
    }
}
