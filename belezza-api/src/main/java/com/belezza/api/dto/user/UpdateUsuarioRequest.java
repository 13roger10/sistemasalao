package com.belezza.api.dto.user;

import com.belezza.api.entity.Plano;
import com.belezza.api.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for updating an existing user.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUsuarioRequest {

    @Size(min = 2, max = 100, message = "Nome deve ter entre 2 e 100 caracteres")
    private String nome;

    @Email(message = "Email inválido")
    @Size(max = 255, message = "Email deve ter no máximo 255 caracteres")
    private String email;

    @Size(min = 6, max = 100, message = "Senha deve ter entre 6 e 100 caracteres")
    private String password;

    @Size(max = 20, message = "Telefone deve ter no máximo 20 caracteres")
    private String telefone;

    @Size(max = 500, message = "URL do avatar deve ter no máximo 500 caracteres")
    private String avatarUrl;

    private Role role;

    private Plano plano;

    private Boolean ativo;

    private Boolean emailVerificado;

    // Para alterar o salão do profissional
    private Long salonId;
}
