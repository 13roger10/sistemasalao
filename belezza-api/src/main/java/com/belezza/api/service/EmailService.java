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

    /**
     * Sends appointment confirmation email to client.
     *
     * @param email            Client email
     * @param userName         Client name
     * @param data             Appointment date (dd/MM/yyyy)
     * @param hora             Appointment time (HH:mm)
     * @param servico          Service name(s)
     * @param profissional     Professional name
     * @param linkConfirmacao  Confirmation link
     */
    void sendAppointmentConfirmationEmail(String email, String userName, String data, String hora,
                                          String servico, String profissional, String linkConfirmacao);

    /**
     * Sends appointment cancellation email to client.
     *
     * @param email          Client email
     * @param userName       Client name
     * @param data           Cancelled appointment date
     * @param hora           Cancelled appointment time
     * @param servico        Service name
     * @param motivo         Cancellation reason
     * @param linkReagendar  Link to reschedule
     */
    void sendAppointmentCancelledEmail(String email, String userName, String data, String hora,
                                       String servico, String motivo, String linkReagendar);

    /**
     * Sends rescheduled appointment email to client.
     *
     * @param email     Client email
     * @param userName  Client name
     * @param novaData  New appointment date
     * @param novaHora  New appointment time
     * @param servico   Service name
     */
    void sendAppointmentRescheduledEmail(String email, String userName, String novaData, String novaHora, String servico);
}
