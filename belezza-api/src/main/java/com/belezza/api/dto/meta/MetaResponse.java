package com.belezza.api.dto.meta;

import com.belezza.api.entity.Meta;
import com.belezza.api.entity.PeriodoMeta;
import com.belezza.api.entity.TipoMeta;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MetaResponse {

    private Long id;
    private String nome;
    private String descricao;
    private TipoMeta tipo;
    private String tipoDescricao;
    private String tipoUnidade;
    private PeriodoMeta periodo;
    private String periodoDescricao;
    private BigDecimal valorMeta;
    private BigDecimal valorAtual;
    private BigDecimal percentualProgresso;
    private LocalDate dataInicio;
    private LocalDate dataFim;
    private Long salonId;
    private Long profissionalId;
    private String profissionalNome;
    private Long criadoPorId;
    private String criadoPorNome;
    private boolean notificarProgresso;
    private int notificarAoAtingir;
    private boolean atingida;
    private boolean dentroDoPeriodo;
    private LocalDateTime criadoEm;
    private LocalDateTime atualizadoEm;

    public static MetaResponse fromEntity(Meta meta) {
        return MetaResponse.builder()
                .id(meta.getId())
                .nome(meta.getNome())
                .descricao(meta.getDescricao())
                .tipo(meta.getTipo())
                .tipoDescricao(meta.getTipo().getDescricao())
                .tipoUnidade(meta.getTipo().getUnidade())
                .periodo(meta.getPeriodo())
                .periodoDescricao(meta.getPeriodo().getDescricao())
                .valorMeta(meta.getValorMeta())
                .valorAtual(meta.getValorAtual())
                .percentualProgresso(meta.getPercentualProgresso())
                .dataInicio(meta.getDataInicio())
                .dataFim(meta.getDataFim())
                .salonId(meta.getSalon().getId())
                .profissionalId(meta.getProfissional() != null ? meta.getProfissional().getId() : null)
                .profissionalNome(meta.getProfissional() != null ? meta.getProfissional().getUsuario().getNome() : null)
                .criadoPorId(meta.getCriadoPor().getId())
                .criadoPorNome(meta.getCriadoPor().getNome())
                .notificarProgresso(meta.isNotificarProgresso())
                .notificarAoAtingir(meta.getNotificarAoAtingir())
                .atingida(meta.isAtingida())
                .dentroDoPeriodo(meta.isDentroDoPeriodo())
                .criadoEm(meta.getCriadoEm())
                .atualizadoEm(meta.getAtualizadoEm())
                .build();
    }
}
