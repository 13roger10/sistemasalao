package com.belezza.api.dto.auth;

import com.belezza.api.entity.Role;
import com.belezza.api.validation.SenhaForte;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for user registration.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {

    @NotBlank(message = "Email é obrigatório")
    @Email(message = "Email deve ser válido")
    @Size(max = 255, message = "Email deve ter no máximo 255 caracteres")
    private String email;

    @NotBlank(message = "Senha é obrigatória")
    @SenhaForte
    private String password;

    @NotBlank(message = "Nome é obrigatório")
    @Size(min = 2, max = 100, message = "Nome deve ter entre 2 e 100 caracteres")
    private String nome;

    @Pattern(regexp = "^\\+?[1-9]\\d{10,14}$", message = "Telefone deve ser válido")
    private String telefone;

    @NotNull(message = "Role é obrigatório")
    private Role role;

    // ID do salão para vincular o cliente (obrigatório quando role = CLIENTE)
    private Long salonId;

    /** Espaços nas pontas não invalidam o e-mail ("  ana@x.com " → "ana@x.com") — BUG-041. */
    public void setEmail(String email) {
        this.email = email != null ? email.trim() : null;
    }
}
