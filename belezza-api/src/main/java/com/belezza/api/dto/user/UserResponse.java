package com.belezza.api.dto.user;

import com.belezza.api.entity.Plano;
import com.belezza.api.entity.Role;
import com.belezza.api.entity.Usuario;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Response DTO for user data.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {

    private Long id;
    private String email;
    private String nome;
    private String telefone;
    private String avatarUrl;
    private Role role;
    private Plano plano;
    private boolean emailVerificado;
    private LocalDateTime criadoEm;
    private LocalDateTime ultimoLogin;

    public static UserResponse fromEntity(Usuario usuario) {
        return UserResponse.builder()
                .id(usuario.getId())
                .email(usuario.getEmail())
                .nome(usuario.getNome())
                .telefone(usuario.getTelefone())
                .avatarUrl(usuario.getAvatarUrl())
                .role(usuario.getRole())
                .plano(usuario.getPlano())
                .emailVerificado(usuario.isEmailVerificado())
                .criadoEm(usuario.getCriadoEm())
                .ultimoLogin(usuario.getUltimoLogin())
                .build();
    }
}
