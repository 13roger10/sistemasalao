package com.belezza.api.dto.equipe;

import com.belezza.api.entity.FuncaoStudio;
import com.belezza.api.entity.MembroStudio;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class MembroStudioResponse {

    private Long id;
    private Long usuarioId;
    private String nome;
    private String email;
    private String avatarUrl;
    private FuncaoStudio funcao;
    private String funcaoLabel;
    private LocalDateTime criadoEm;

    public static MembroStudioResponse fromEntity(MembroStudio m) {
        return MembroStudioResponse.builder()
                .id(m.getId())
                .usuarioId(m.getUsuario().getId())
                .nome(m.getUsuario().getNome())
                .email(m.getUsuario().getEmail())
                .avatarUrl(m.getUsuario().getAvatarUrl())
                .funcao(m.getFuncao())
                .funcaoLabel(labelFor(m.getFuncao()))
                .criadoEm(m.getCriadoEm())
                .build();
    }

    private static String labelFor(FuncaoStudio f) {
        return switch (f) {
            case PROPRIETARIO -> "Proprietário";
            case GESTOR       -> "Gestor";
            case EDITOR       -> "Editor";
            case VISUALIZADOR -> "Visualizador";
        };
    }
}
