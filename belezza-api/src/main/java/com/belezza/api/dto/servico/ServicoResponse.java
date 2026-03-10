package com.belezza.api.dto.servico;

import com.belezza.api.entity.Servico;
import com.belezza.api.entity.TipoServico;
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
public class ServicoResponse {

    private Long id;
    private String nome;
    private String descricao;
    private BigDecimal preco;
    private int duracaoMinutos;
    private TipoServico tipo;
    private String tipoDescricao;
    private String imagemUrl;
    private boolean ativo;
    private Long salonId;
    private LocalDateTime criadoEm;

    public static ServicoResponse fromEntity(Servico servico) {
        return ServicoResponse.builder()
                .id(servico.getId())
                .nome(servico.getNome())
                .descricao(servico.getDescricao())
                .preco(servico.getPreco())
                .duracaoMinutos(servico.getDuracaoMinutos())
                .tipo(servico.getTipo())
                .tipoDescricao(servico.getTipo().getDescription())
                .imagemUrl(servico.getImagemUrl())
                .ativo(servico.isAtivo())
                .salonId(servico.getSalon().getId())
                .criadoEm(servico.getCriadoEm())
                .build();
    }
}
