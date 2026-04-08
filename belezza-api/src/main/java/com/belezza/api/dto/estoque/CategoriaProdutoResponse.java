package com.belezza.api.dto.estoque;

import com.belezza.api.entity.CategoriaProduto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoriaProdutoResponse {

    private Long id;
    private String nome;
    private String descricao;
    private String icone;
    private String cor;
    private int ordem;
    private boolean ativo;
    private LocalDateTime criadoEm;

    public static CategoriaProdutoResponse fromEntity(CategoriaProduto categoria) {
        return CategoriaProdutoResponse.builder()
                .id(categoria.getId())
                .nome(categoria.getNome())
                .descricao(categoria.getDescricao())
                .icone(categoria.getIcone())
                .cor(categoria.getCor())
                .ordem(categoria.getOrdem())
                .ativo(categoria.isAtivo())
                .criadoEm(categoria.getCriadoEm())
                .build();
    }
}
