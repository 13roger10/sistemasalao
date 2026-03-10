package com.belezza.api.service;

/**
 * Service interface for email operations.
 */
public interface EmailService {

    /**
     * Sends password reset email to user.
     *
     * @param email User email
     * @param resetToken Password reset token
     * @param userName User name
     */
    void sendPasswordResetEmail(String email, String resetToken, String userName);

    /**
     * Sends email verification email to user.
     *
     * @param email User email
     * @param verificationToken Email verification token
     * @param userName User name
     */
    void sendEmailVerificationEmail(String email, String verificationToken, String userName);

    /**
     * Sends welcome email to new user.
     *
     * @param email User email
     * @param userName User name
     */
    void sendWelcomeEmail(String email, String userName);
}
