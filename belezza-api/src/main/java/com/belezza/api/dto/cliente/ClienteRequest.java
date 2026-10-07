package com.belezza.api.dto.cliente;

import com.belezza.api.validation.Telefone;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClienteRequest {

    @NotBlank(message = "Nome é obrigatório")
    @Size(min = 2, max = 100, message = "Nome deve ter entre 2 e 100 caracteres")
    private String name;

    @NotBlank(message = "Telefone é obrigatório")
    @Size(max = 20, message = "Telefone deve ter no máximo 20 caracteres")
    @Telefone
    private String phone;

    @Email(message = "Email inválido")
    @Size(max = 255, message = "Email deve ter no máximo 255 caracteres")
    private String email;

    @Size(max = 20, message = "WhatsApp deve ter no máximo 20 caracteres")
    @Telefone(message = "WhatsApp inválido: informe o DDD e o número (10 ou 11 dígitos)")
    private String whatsapp;

    @Past(message = "Data de nascimento deve estar no passado")
    private LocalDate birthDate;

    // BUG-018: a coluna clientes.observacoes tem 500 caracteres; acima disso o banco recusava (erro 500)
    @Size(max = 500, message = "Observações devem ter no máximo 500 caracteres")
    private String notes;

    private Boolean acceptsMarketing;

    private Boolean acceptsWhatsApp;

    private Boolean acceptsEmail;

    private Long salonId;

    /** Espaços nas pontas não invalidam o e-mail ("  ana@x.com " → "ana@x.com") — BUG-041. */
    public void setEmail(String email) {
        this.email = email != null ? email.trim() : null;
    }
}
