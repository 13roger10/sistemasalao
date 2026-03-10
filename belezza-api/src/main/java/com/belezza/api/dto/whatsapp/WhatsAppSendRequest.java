package com.belezza.api.dto.whatsapp;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for sending WhatsApp messages.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WhatsAppSendRequest {

    @NotBlank(message = "Telefone é obrigatório")
    @Pattern(regexp = "^\\+?[1-9]\\d{10,14}$", message = "Telefone deve estar no formato internacional (ex: +5511999999999)")
    private String telefone;

    @NotBlank(message = "Mensagem é obrigatória")
    @Size(max = 4096, message = "Mensagem deve ter no máximo 4096 caracteres")
    private String mensagem;

    private Long agendamentoId;

    private Long salonId;
}
