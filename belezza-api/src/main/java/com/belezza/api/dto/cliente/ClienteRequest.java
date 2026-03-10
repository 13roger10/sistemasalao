package com.belezza.api.dto.cliente;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
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
    @Size(min = 10, max = 20, message = "Telefone inválido")
    private String phone;

    @Email(message = "Email inválido")
    private String email;

    private String whatsapp;

    private LocalDate birthDate;

    private String notes;

    private Boolean acceptsMarketing;

    private Boolean acceptsWhatsApp;

    private Boolean acceptsEmail;

    private Long salonId;
}
