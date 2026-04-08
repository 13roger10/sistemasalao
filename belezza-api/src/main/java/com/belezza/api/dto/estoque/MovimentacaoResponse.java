package com.belezza.api.dto.estoque;

import com.belezza.api.entity.MovimentacaoEstoque;
import com.belezza.api.entity.MotivoMovimentacao;
import com.belezza.api.entity.TipoMovimentacao;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MovimentacaoResponse {

    private Long id;
    private Long produtoId;
    private String produtoNome;
    private TipoMovimentacao tipo;
    private String tipoDescricao;
    private MotivoMovimentacao motivo;
    private String motivoDescricao;
    private int quantidade;
    private int estoqueAnterior;
    private int estoqueNovo;
    private BigDecimal custoUnitario;
    private BigDecimal custoTotal;
    private Long usuarioId;
    private String usuarioNome;
    private String observacoes;
    private LocalDateTime criadoEm;

    public static MovimentacaoResponse fromEntity(MovimentacaoEstoque mov) {
        return MovimentacaoResponse.builder()
                .id(mov.getId())
                .produtoId(mov.getProduto().getId())
                .produtoNome(mov.getProduto().getNome())
                .tipo(mov.getTipo())
                .tipoDescricao(mov.getTipo().getDescricao())
                .motivo(mov.getMotivo())
                .motivoDescricao(mov.getMotivo().getDescricao())
                .quantidade(mov.getQuantidade())
                .estoqueAnterior(mov.getEstoqueAnterior())
                .estoqueNovo(mov.getEstoqueNovo())
                .custoUnitario(mov.getCustoUnitario())
                .custoTotal(mov.getCustoTotal())
                .usuarioId(mov.getUsuario().getId())
                .usuarioNome(mov.getUsuario().getNome())
                .observacoes(mov.getObservacoes())
                .criadoEm(mov.getCriadoEm())
                .build();
    }
}
