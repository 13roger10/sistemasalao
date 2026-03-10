package com.belezza.api.dto.user;

import com.belezza.api.entity.Plano;
import com.belezza.api.entity.Role;
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
    @Size(min = 6, max = 100, message = "Senha deve ter entre 6 e 100 caracteres")
    private String password;

    @Size(max = 20, message = "Telefone deve ter no máximo 20 caracteres")
    private String telefone;

    @Size(max = 500, message = "URL do avatar deve ter no máximo 500 caracteres")
    private String avatarUrl;

    @NotNull(message = "Role é obrigatória")
    private Role role;

    private Plano plano;

    // Para vincular profissional a um salão específico
    private Long salonId;
}
