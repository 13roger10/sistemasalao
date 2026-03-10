package com.belezza.api.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * WhatsApp message log entity.
 * Tracks all messages sent via WhatsApp Business API.
 */
@Entity
@Table(name = "whatsapp_messages")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WhatsAppMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * WhatsApp message ID returned by the API.
     */
    @Column(name = "message_id", unique = true)
    private String messageId;

    /**
     * Recipient phone number (international format).
     */
    @Column(nullable = false)
    private String telefone;

    /**
     * Message type: template, text, image.
     */
    @Column(nullable = false)
    private String tipo;

    /**
     * Template name (if type = template).
     */
    private String templateName;

    /**
     * Message content or caption.
     */
    @Column(columnDefinition = "TEXT")
    private String conteudo;

    /**
     * Current status: sent, delivered, read, failed.
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WhatsAppMessageStatus status;

    /**
     * Error message if failed.
     */
    @Column(columnDefinition = "TEXT")
    private String errorMessage;

    /**
     * Related appointment (optional).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agendamento_id")
    private Agendamento agendamento;

    /**
     * Related salon.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "salon_id")
    private Salon salon;

    /**
     * When the message was created/sent.
     */
    @Column(nullable = false)
    private LocalDateTime criadoEm;

    /**
     * When the message was delivered.
     */
    private LocalDateTime entregueEm;

    /**
     * When the message was read.
     */
    private LocalDateTime lidoEm;

    /**
     * Number of retry attempts.
     */
    @Builder.Default
    @Column(nullable = false)
    private int tentativas = 0;

    @PrePersist
    protected void onCreate() {
        criadoEm = LocalDateTime.now();
        if (status == null) {
            status = WhatsAppMessageStatus.SENT;
        }
    }
}
