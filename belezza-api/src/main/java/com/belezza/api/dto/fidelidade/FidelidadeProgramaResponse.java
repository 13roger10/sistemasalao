package com.belezza.api.dto.fidelidade;

import com.belezza.api.entity.FidelidadePrograma;
import com.belezza.api.entity.TipoRecompensa;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.util.Locale;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FidelidadeProgramaResponse {

    private Long id;
    private Long salonId;
    private String nome;
    private String descricao;
    private int visitasNecessarias;
    private TipoRecompensa recompensaTipo;
    private BigDecimal recompensaValor;
    private String recompensaValorFormatado;
    private Long servicoRecompensaId;
    private String servicoRecompensaNome;
    private boolean ativo;
    private LocalDateTime criadoEm;
    private LocalDateTime atualizadoEm;

    private static final NumberFormat CURRENCY_FORMAT = NumberFormat.getCurrencyInstance(new Locale("pt", "BR"));

    public static FidelidadeProgramaResponse fromEntity(FidelidadePrograma programa) {
        String recompensaFormatada = null;
        if (programa.getRecompensaValor() != null) {
            if (programa.getRecompensaTipo() == TipoRecompensa.DESCONTO_PERCENTUAL) {
                recompensaFormatada = programa.getRecompensaValor().intValue() + "%";
            } else {
                recompensaFormatada = CURRENCY_FORMAT.format(programa.getRecompensaValor());
            }
        }

        return FidelidadeProgramaResponse.builder()
                .id(programa.getId())
                .salonId(programa.getSalon().getId())
                .nome(programa.getNome())
                .descricao(programa.getDescricao())
                .visitasNecessarias(programa.getVisitasNecessarias())
                .recompensaTipo(programa.getRecompensaTipo())
                .recompensaValor(programa.getRecompensaValor())
                .recompensaValorFormatado(recompensaFormatada)
                .servicoRecompensaId(programa.getServicoRecompensa() != null ? programa.getServicoRecompensa().getId() : null)
                .servicoRecompensaNome(programa.getServicoRecompensa() != null ? programa.getServicoRecompensa().getNome() : null)
                .ativo(programa.isAtivo())
                .criadoEm(programa.getCriadoEm())
                .atualizadoEm(programa.getAtualizadoEm())
                .build();
    }
}
