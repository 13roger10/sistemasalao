package com.belezza.api.dto.whatsapp;

import com.belezza.api.entity.WhatsAppMessage;
import com.belezza.api.entity.WhatsAppMessageStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Response DTO for WhatsApp message data.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WhatsAppMessageResponse {

    private Long id;
    private String messageId;
    private String telefone;
    private String tipo;
    private String templateName;
    private String conteudo;
    private WhatsAppMessageStatus status;
    private String errorMessage;
    private Long agendamentoId;
    private Long salonId;
    private String salonNome;
    private LocalDateTime criadoEm;
    private LocalDateTime entregueEm;
    private LocalDateTime lidoEm;
    private int tentativas;

    /**
     * Convert entity to response DTO.
     */
    public static WhatsAppMessageResponse fromEntity(WhatsAppMessage message) {
        return WhatsAppMessageResponse.builder()
                .id(message.getId())
                .messageId(message.getMessageId())
                .telefone(message.getTelefone())
                .tipo(message.getTipo())
                .templateName(message.getTemplateName())
                .conteudo(message.getConteudo())
                .status(message.getStatus())
                .errorMessage(message.getErrorMessage())
                .agendamentoId(message.getAgendamento() != null ? message.getAgendamento().getId() : null)
                .salonId(message.getSalon() != null ? message.getSalon().getId() : null)
                .salonNome(message.getSalon() != null ? message.getSalon().getNome() : null)
                .criadoEm(message.getCriadoEm())
                .entregueEm(message.getEntregueEm())
                .lidoEm(message.getLidoEm())
                .tentativas(message.getTentativas())
                .build();
    }
}
