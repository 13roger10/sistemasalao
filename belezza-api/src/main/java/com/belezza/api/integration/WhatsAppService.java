package com.belezza.api.integration;

import java.util.Map;

/**
 * Service for WhatsApp Business API integration (Meta Cloud API).
 * Handles sending messages, templates, and media via WhatsApp.
 */
public interface WhatsAppService {

    /**
     * Send a template message to a phone number.
     *
     * @param telefone Phone number in international format (e.g., +5511999999999)
     * @param templateName Template name registered in WhatsApp Business
     * @param params Template parameters (placeholders)
     * @return Message ID from WhatsApp API
     */
    String enviarMensagem(String telefone, String templateName, Map<String, String> params);

    /**
     * Send a direct text message to a phone number.
     *
     * @param telefone Phone number in international format
     * @param mensagem Message text
     * @return Message ID from WhatsApp API
     */
    String enviarMensagemDireta(String telefone, String mensagem);

    /**
     * Send an image with optional caption.
     *
     * @param telefone Phone number in international format
     * @param imageUrl URL of the image to send
     * @param caption Optional caption for the image
     * @return Message ID from WhatsApp API
     */
    String enviarImagem(String telefone, String imageUrl, String caption);

    /**
     * Send a template message using the confirmation template.
     *
     * @param telefone Phone number
     * @param nomeCliente Client name
     * @param data Appointment date
     * @param hora Appointment time
     * @param servico Service name
     * @param profissional Professional name
     * @param endereco Salon address
     * @param linkConfirmacao Confirmation link
     * @return Message ID
     */
    String enviarConfirmacaoAgendamento(
        String telefone,
        String nomeCliente,
        String data,
        String hora,
        String servico,
        String profissional,
        String endereco,
        String linkConfirmacao
    );

    /**
     * Send a 24-hour reminder.
     *
     * @param telefone Phone number
     * @param nomeCliente Client name
     * @param data Appointment date
     * @param hora Appointment time
     * @param servico Service name
     * @param linkConfirmacao Confirmation link
     * @return Message ID
     */
    String enviarLembrete24h(
        String telefone,
        String nomeCliente,
        String data,
        String hora,
        String servico,
        String linkConfirmacao
    );

    /**
     * Send a 2-hour reminder.
     *
     * @param telefone Phone number
     * @param nomeCliente Client name
     * @param hora Appointment time
     * @param servico Service name
     * @param endereco Salon address
     * @return Message ID
     */
    String enviarLembrete2h(
        String telefone,
        String nomeCliente,
        String hora,
        String servico,
        String endereco
    );

    /**
     * Send post-appointment thank you message.
     *
     * @param telefone Phone number
     * @param nomeCliente Client name
     * @param linkAvaliacao Review link
     * @return Message ID
     */
    String enviarPosAtendimento(
        String telefone,
        String nomeCliente,
        String linkAvaliacao
    );

    /**
     * Send cancellation notification message.
     *
     * @param telefone Phone number
     * @param nomeCliente Client name
     * @param data Cancelled appointment date
     * @param hora Cancelled appointment time
     * @param servico Service name
     * @param motivoCancelamento Cancellation reason
     * @param linkReagendar Link to reschedule
     * @return Message ID
     */
    String enviarCancelamento(
        String telefone,
        String nomeCliente,
        String data,
        String hora,
        String servico,
        String motivoCancelamento,
        String linkReagendar
    );
}
