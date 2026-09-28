package com.belezza.api.dto.user;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO para AUTO-SERVIÇO — usado quando o próprio usuário atualiza o seu
 * perfil via {@code PUT /api/usuarios/me}.
 *
 * SEC-002 (Mass Assignment / Privilege Escalation): este DTO expõe apenas a
 * allowlist de campos que o usuário pode alterar em si mesmo. Campos
 * administrativos (role, plano, ativo, emailVerificado, salonId, email) NÃO
 * existem aqui, de modo que é estruturalmente impossível um cliente elevar o
 * próprio plano, autoverificar o e-mail ou alterar seu papel/tenant. Alterações
 * administrativas continuam disponíveis somente para ADMIN via
 * {@code PUT /api/usuarios/{id}} (UpdateUsuarioRequest).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateMeuPerfilRequest {

    @Size(min = 2, max = 100, message = "Nome deve ter entre 2 e 100 caracteres")
    private String nome;

    @Size(max = 20, message = "Telefone deve ter no máximo 20 caracteres")
    private String telefone;

    @Size(max = 500, message = "URL do avatar deve ter no máximo 500 caracteres")
    private String avatarUrl;

    /** Nova senha do próprio usuário (opcional). */
    @Size(min = 6, max = 100, message = "Senha deve ter entre 6 e 100 caracteres")
    private String password;
}
