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

    /**
     * Notifies a user that a scheduled social media post failed permanently
     * after all retry attempts were exhausted.
     *
     * @param email        User email
     * @param userName     User name
     * @param postId       Post identifier
     * @param errorMessage Last error message from the publishing attempt
     */
    void sendPostFailureEmail(String email, String userName, String postId, String errorMessage);
}
