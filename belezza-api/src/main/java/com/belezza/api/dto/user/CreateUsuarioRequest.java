package com.belezza.api.dto.user;

import com.belezza.api.entity.Plano;
import com.belezza.api.entity.Role;
import com.belezza.api.validation.SenhaForte;
import com.belezza.api.validation.Telefone;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for creating a new user.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateUsuarioRequest {

    @NotBlank(message = "Nome é obrigatório")
    @Size(min = 2, max = 100, message = "Nome deve ter entre 2 e 100 caracteres")
    private String nome;

    @NotBlank(message = "Email é obrigatório")
    @Email(message = "Email inválido")
    @Size(max = 255, message = "Email deve ter no máximo 255 caracteres")
    private String email;

    @NotBlank(message = "Senha é obrigatória")
    @SenhaForte
    private String password;

    @Size(max = 20, message = "Telefone deve ter no máximo 20 caracteres")
    @Telefone
    private String telefone;

    @NotBlank(message = "WhatsApp é obrigatório")
    @Size(max = 20, message = "WhatsApp deve ter no máximo 20 caracteres")
    @Telefone
    private String whatsapp;

    @NotNull(message = "Data de aniversário é obrigatória")
    @jakarta.validation.constraints.Past(message = "Data de aniversário deve estar no passado")
    private java.time.LocalDate dataNascimento;

    @Size(max = 500, message = "URL do avatar deve ter no máximo 500 caracteres")
    private String avatarUrl;

    @NotNull(message = "Role é obrigatória")
    private Role role;

    private Plano plano;

    // Para vincular profissional a um salão específico
    private Long salonId;

    /** Espaços nas pontas não invalidam o e-mail ("  ana@x.com " → "ana@x.com") — BUG-041. */
    public void setEmail(String email) {
        this.email = email != null ? email.trim() : null;
    }
}
