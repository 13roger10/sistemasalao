package com.belezza.api.service.impl;

import com.belezza.api.service.EmailService;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Implementation of EmailService for sending emails.
 * Only active when mail is enabled.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "spring.mail.enabled", havingValue = "true")
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.from:noreply@belezza.ai}")
    private String fromEmail;

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    @Value("${spring.mail.enabled:true}")
    private boolean emailEnabled;

    @Override
    @Async
    public void sendPasswordResetEmail(String email, String resetToken, String userName) {
        if (!emailEnabled) {
            log.info("Email sending disabled. Would send password reset to: {}", email);
            return;
        }

        try {
            String resetUrl = frontendUrl + "/reset-password?token=" + resetToken;

            String subject = "Redefinição de Senha - Belezza.ai";
            String htmlContent = buildPasswordResetEmail(userName, resetUrl);

            sendHtmlEmail(email, subject, htmlContent);
            log.info("Password reset email sent to: {}", email);
        } catch (Exception e) {
            log.error("Failed to send password reset email to: {}", email, e);
        }
    }

    @Override
    @Async
    public void sendEmailVerificationEmail(String email, String verificationToken, String userName) {
        if (!emailEnabled) {
            log.info("Email sending disabled. Would send verification to: {}", email);
            return;
        }

        try {
            String verificationUrl = frontendUrl + "/verify-email?token=" + verificationToken;

            String subject = "Verificação de Email - Belezza.ai";
            String htmlContent = buildEmailVerificationEmail(userName, verificationUrl);

            sendHtmlEmail(email, subject, htmlContent);
            log.info("Email verification sent to: {}", email);
        } catch (Exception e) {
            log.error("Failed to send email verification to: {}", email, e);
        }
    }

    @Override
    @Async
    public void sendWelcomeEmail(String email, String userName) {
        if (!emailEnabled) {
            log.info("Email sending disabled. Would send welcome email to: {}", email);
            return;
        }

        try {
            String subject = "Bem-vindo ao Belezza.ai";
            String htmlContent = buildWelcomeEmail(userName);

            sendHtmlEmail(email, subject, htmlContent);
            log.info("Welcome email sent to: {}", email);
        } catch (Exception e) {
            log.error("Failed to send welcome email to: {}", email, e);
        }
    }

    @Override
    @Async
    public void sendPostFailureEmail(String email, String userName, String postId, String errorMessage) {
        if (!emailEnabled) {
            log.info("Email sending disabled. Would send post failure notification to: {}", email);
            return;
        }

        try {
            String postsUrl = frontendUrl + "/admin/social-studio";
            String subject = "Falha na publicacao do seu post - Belezza.ai";
            String htmlContent = buildPostFailureEmail(userName, postId, errorMessage, postsUrl);

            sendHtmlEmail(email, subject, htmlContent);
            log.info("Post failure email sent to: {}", email);
        } catch (Exception e) {
            log.error("Failed to send post failure email to: {}", email, e);
        }
    }

    private String buildPostFailureEmail(String userName, String postId, String errorMessage, String postsUrl) {
        String safeError = (errorMessage != null && !errorMessage.isBlank()) ? errorMessage : "Erro desconhecido";
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #e53e3e 0%%, #c53030 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .error-box { background: #fff5f5; border: 1px solid #feb2b2; border-radius: 6px; padding: 15px; margin: 15px 0; font-family: monospace; font-size: 13px; color: #742a2a; word-break: break-all; }
                    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Falha na Publicacao</h1>
                    </div>
                    <div class="content">
                        <p>Ola <strong>%s</strong>,</p>
                        <p>Infelizmente nao foi possivel publicar seu post <strong>#%s</strong> mesmo apos todas as tentativas automaticas.</p>
                        <p><strong>Motivo do erro:</strong></p>
                        <div class="error-box">%s</div>
                        <p>Por favor, verifique se sua conta de rede social esta ainda conectada e tente publicar novamente.</p>
                        <p style="text-align: center;">
                            <a href="%s" class="button">Acessar Social Studio</a>
                        </p>
                        <p style="font-size: 13px; color: #666;">Se o problema persistir, entre em contato com nosso suporte.</p>
                    </div>
                    <div class="footer">
                        <p>&copy; 2025 Belezza.ai - Social Studio para Saloes de Beleza</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(userName, postId, safeError, postsUrl);
    }

    @SuppressWarnings("null")
    private void sendHtmlEmail(String to, String subject, String htmlContent) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom(fromEmail);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(htmlContent, true);

        mailSender.send(message);
    }

    @Override
    @Async
    public void sendAppointmentConfirmationEmail(String email, String userName, String data, String hora,
                                                 String servico, String profissional, String linkConfirmacao) {
        if (!emailEnabled) {
            log.info("Email disabled. Would send appointment confirmation to: {}", email);
            return;
        }
        try {
            String subject = "Agendamento Confirmado - Belezza.ai";
            String html = """
                <!DOCTYPE html><html><head><meta charset="UTF-8">
                <style>
                  body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
                  .container{max-width:600px;margin:0 auto;padding:20px}
                  .header{background:linear-gradient(135deg,#7c3aed 0%%,#5b21b6 100%%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}
                  .content{background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px}
                  .info-box{background:white;border-left:4px solid #7c3aed;border-radius:4px;padding:16px;margin:16px 0}
                  .info-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0}
                  .info-label{color:#666;font-size:14px}
                  .info-value{font-weight:600;font-size:14px}
                  .button{display:inline-block;padding:12px 30px;background:#7c3aed;color:white;text-decoration:none;border-radius:6px;margin:20px 0}
                  .footer{text-align:center;margin-top:20px;color:#666;font-size:12px}
                </style></head><body>
                <div class="container">
                  <div class="header"><h1>Agendamento Confirmado!</h1></div>
                  <div class="content">
                    <p>Ola <strong>%s</strong>, seu agendamento foi realizado com sucesso!</p>
                    <div class="info-box">
                      <div class="info-row"><span class="info-label">Servico</span><span class="info-value">%s</span></div>
                      <div class="info-row"><span class="info-label">Profissional</span><span class="info-value">%s</span></div>
                      <div class="info-row"><span class="info-label">Data</span><span class="info-value">%s</span></div>
                      <div class="info-row"><span class="info-label">Horario</span><span class="info-value">%s</span></div>
                    </div>
                    <p style="text-align:center"><a href="%s" class="button">Confirmar Agendamento</a></p>
                    <p style="font-size:13px;color:#666">Lembre-se de chegar com 5 minutos de antecedencia. Ate logo!</p>
                  </div>
                  <div class="footer"><p>&copy; 2025 Belezza.ai</p></div>
                </div></body></html>
                """.formatted(userName, servico, profissional, data, hora, linkConfirmacao);
            sendHtmlEmail(email, subject, html);
            log.info("Appointment confirmation email sent to: {}", email);
        } catch (Exception e) {
            log.error("Failed to send appointment confirmation email to: {}", email, e);
        }
    }

    @Override
    @Async
    public void sendAppointmentCancelledEmail(String email, String userName, String data, String hora,
                                              String servico, String motivo, String linkReagendar) {
        if (!emailEnabled) {
            log.info("Email disabled. Would send cancellation email to: {}", email);
            return;
        }
        try {
            String subject = "Agendamento Cancelado - Belezza.ai";
            String motivoTexto = (motivo != null && !motivo.isBlank()) ? motivo : "Nao informado";
            String html = """
                <!DOCTYPE html><html><head><meta charset="UTF-8">
                <style>
                  body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
                  .container{max-width:600px;margin:0 auto;padding:20px}
                  .header{background:linear-gradient(135deg,#dc2626 0%%,#991b1b 100%%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}
                  .content{background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px}
                  .info-box{background:white;border-left:4px solid #dc2626;border-radius:4px;padding:16px;margin:16px 0}
                  .info-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0}
                  .info-label{color:#666;font-size:14px}
                  .info-value{font-weight:600;font-size:14px}
                  .button{display:inline-block;padding:12px 30px;background:#7c3aed;color:white;text-decoration:none;border-radius:6px;margin:20px 0}
                  .footer{text-align:center;margin-top:20px;color:#666;font-size:12px}
                </style></head><body>
                <div class="container">
                  <div class="header"><h1>Agendamento Cancelado</h1></div>
                  <div class="content">
                    <p>Ola <strong>%s</strong>, informamos que seu agendamento foi cancelado.</p>
                    <div class="info-box">
                      <div class="info-row"><span class="info-label">Servico</span><span class="info-value">%s</span></div>
                      <div class="info-row"><span class="info-label">Data</span><span class="info-value">%s</span></div>
                      <div class="info-row"><span class="info-label">Horario</span><span class="info-value">%s</span></div>
                      <div class="info-row"><span class="info-label">Motivo</span><span class="info-value">%s</span></div>
                    </div>
                    <p style="text-align:center"><a href="%s" class="button">Agendar Novamente</a></p>
                  </div>
                  <div class="footer"><p>&copy; 2025 Belezza.ai</p></div>
                </div></body></html>
                """.formatted(userName, servico, data, hora, motivoTexto, linkReagendar);
            sendHtmlEmail(email, subject, html);
            log.info("Appointment cancellation email sent to: {}", email);
        } catch (Exception e) {
            log.error("Failed to send appointment cancellation email to: {}", email, e);
        }
    }

    @Override
    @Async
    public void sendAppointmentRescheduledEmail(String email, String userName, String novaData, String novaHora, String servico) {
        if (!emailEnabled) {
            log.info("Email disabled. Would send rescheduled email to: {}", email);
            return;
        }
        try {
            String subject = "Agendamento Reagendado - Belezza.ai";
            String html = """
                <!DOCTYPE html><html><head><meta charset="UTF-8">
                <style>
                  body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
                  .container{max-width:600px;margin:0 auto;padding:20px}
                  .header{background:linear-gradient(135deg,#2563eb 0%%,#1d4ed8 100%%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}
                  .content{background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px}
                  .info-box{background:white;border-left:4px solid #2563eb;border-radius:4px;padding:16px;margin:16px 0}
                  .info-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0}
                  .info-label{color:#666;font-size:14px}
                  .info-value{font-weight:600;font-size:14px}
                  .footer{text-align:center;margin-top:20px;color:#666;font-size:12px}
                </style></head><body>
                <div class="container">
                  <div class="header"><h1>Agendamento Reagendado</h1></div>
                  <div class="content">
                    <p>Ola <strong>%s</strong>, seu agendamento foi reagendado para uma nova data!</p>
                    <div class="info-box">
                      <div class="info-row"><span class="info-label">Servico</span><span class="info-value">%s</span></div>
                      <div class="info-row"><span class="info-label">Nova Data</span><span class="info-value">%s</span></div>
                      <div class="info-row"><span class="info-label">Novo Horario</span><span class="info-value">%s</span></div>
                    </div>
                    <p style="font-size:13px;color:#666">Lembre-se de chegar com 5 minutos de antecedencia. Ate logo!</p>
                  </div>
                  <div class="footer"><p>&copy; 2025 Belezza.ai</p></div>
                </div></body></html>
                """.formatted(userName, servico, novaData, novaHora);
            sendHtmlEmail(email, subject, html);
            log.info("Appointment rescheduled email sent to: {}", email);
        } catch (Exception e) {
            log.error("Failed to send appointment rescheduled email to: {}", email, e);
        }
    }

    private String buildPasswordResetEmail(String userName, String resetUrl) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔒 Redefinição de Senha</h1>
                    </div>
                    <div class="content">
                        <p>Olá <strong>%s</strong>,</p>
                        <p>Recebemos uma solicitação para redefinir sua senha no Belezza.ai.</p>
                        <p>Clique no botão abaixo para criar uma nova senha:</p>
                        <p style="text-align: center;">
                            <a href="%s" class="button">Redefinir Senha</a>
                        </p>
                        <p><strong>Este link expira em 2 horas.</strong></p>
                        <p>Se você não solicitou a redefinição de senha, ignore este email. Sua senha permanecerá inalterada.</p>
                        <hr>
                        <p style="font-size: 12px; color: #666;">
                            Se o botão não funcionar, copie e cole este link no navegador:<br>
                            <a href="%s">%s</a>
                        </p>
                    </div>
                    <div class="footer">
                        <p>&copy; 2025 Belezza.ai - Social Studio para Salões de Beleza</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(userName, resetUrl, resetUrl, resetUrl);
    }

    private String buildEmailVerificationEmail(String userName, String verificationUrl) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>✉️ Verifique seu Email</h1>
                    </div>
                    <div class="content">
                        <p>Olá <strong>%s</strong>,</p>
                        <p>Obrigado por se cadastrar no Belezza.ai!</p>
                        <p>Para completar seu cadastro, por favor verifique seu endereço de email clicando no botão abaixo:</p>
                        <p style="text-align: center;">
                            <a href="%s" class="button">Verificar Email</a>
                        </p>
                        <p>Após a verificação, você terá acesso completo à plataforma.</p>
                        <hr>
                        <p style="font-size: 12px; color: #666;">
                            Se o botão não funcionar, copie e cole este link no navegador:<br>
                            <a href="%s">%s</a>
                        </p>
                    </div>
                    <div class="footer">
                        <p>&copy; 2025 Belezza.ai - Social Studio para Salões de Beleza</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(userName, verificationUrl, verificationUrl, verificationUrl);
    }

    private String buildWelcomeEmail(String userName) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .feature { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #667eea; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 Bem-vindo ao Belezza.ai!</h1>
                    </div>
                    <div class="content">
                        <p>Olá <strong>%s</strong>,</p>
                        <p>Estamos muito felizes em tê-lo(a) conosco! O Belezza.ai é a plataforma completa para transformar a presença digital do seu salão.</p>

                        <h3>✨ O que você pode fazer:</h3>

                        <div class="feature">
                            <strong>📅 Agendamento Inteligente</strong><br>
                            Gerencie agendamentos com lembretes automáticos via WhatsApp
                        </div>

                        <div class="feature">
                            <strong>🎨 Social Studio com IA</strong><br>
                            Edite fotos e crie legendas profissionais com inteligência artificial
                        </div>

                        <div class="feature">
                            <strong>📱 Publicação Automática</strong><br>
                            Agende posts para Instagram e Facebook diretamente da plataforma
                        </div>

                        <div class="feature">
                            <strong>📊 Métricas e Relatórios</strong><br>
                            Acompanhe o desempenho do seu salão em tempo real
                        </div>

                        <p>Acesse sua conta e comece a transformar seu negócio hoje mesmo!</p>

                        <p style="text-align: center;">
                            <a href="%s" style="display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">Acessar Plataforma</a>
                        </p>

                        <p>Se tiver alguma dúvida, nossa equipe está à disposição para ajudar!</p>
                    </div>
                    <div class="footer">
                        <p>&copy; 2025 Belezza.ai - Social Studio para Salões de Beleza</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(userName, frontendUrl + "/login");
    }
}
