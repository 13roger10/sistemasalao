package com.belezza.api.dto.user;

import com.belezza.api.entity.Plano;
import com.belezza.api.entity.Profissional;
import com.belezza.api.entity.Role;
import com.belezza.api.entity.Usuario;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Response DTO for user listing with salon information (for multi-unit support).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UsuarioListResponse {

    private Long id;
    private String email;
    private String nome;
    private String telefone;
    private String avatarUrl;
    private Role role;
    private String roleDescription;
    private Plano plano;
    private boolean ativo;
    private boolean emailVerificado;
    private LocalDateTime criadoEm;
    private LocalDateTime ultimoLogin;

    // Informações do salão (para multi-unidade)
    private Long salonId;
    private String salonNome;

    public static UsuarioListResponse fromEntity(Usuario usuario) {
        return UsuarioListResponse.builder()
                .id(usuario.getId())
                .email(usuario.getEmail())
                .nome(usuario.getNome())
                .telefone(usuario.getTelefone())
                .avatarUrl(usuario.getAvatarUrl())
                .role(usuario.getRole())
                .roleDescription(usuario.getRole().getDescription())
                .plano(usuario.getPlano())
                .ativo(usuario.isAtivo())
                .emailVerificado(usuario.isEmailVerificado())
                .criadoEm(usuario.getCriadoEm())
                .ultimoLogin(usuario.getUltimoLogin())
                .build();
    }

    public static UsuarioListResponse fromEntityWithProfissional(Usuario usuario, Profissional profissional) {
        UsuarioListResponse response = fromEntity(usuario);
        if (profissional != null && profissional.getSalon() != null) {
            response.setSalonId(profissional.getSalon().getId());
            response.setSalonNome(profissional.getSalon().getNome());
        }
        return response;
    }
}
