package com.belezza.api.dto.fidelidade;

import com.belezza.api.entity.FidelidadeTransacao;
import com.belezza.api.entity.TipoTransacaoFidelidade;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FidelidadeTransacaoResponse {

    private Long id;
    private Long fidelidadeClienteId;
    private TipoTransacaoFidelidade tipo;
    private String tipoDescricao;
    private int visitas;
    private int creditos;
    private Long agendamentoId;
    private String descricao;
    private LocalDateTime criadoEm;
    private String criadoEmFormatado;
    private String icone;
    private String cor;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    public static FidelidadeTransacaoResponse fromEntity(FidelidadeTransacao ft) {
        String tipoDescricao;
        String icone;
        String cor;

        switch (ft.getTipo()) {
            case VISITA -> {
                tipoDescricao = "Visita registrada";
                icone = "check-circle";
                cor = "#22c55e"; // green
            }
            case RESGATE -> {
                tipoDescricao = "Resgate de recompensa";
                icone = "gift";
                cor = "#8b5cf6"; // purple
            }
            case BONUS -> {
                tipoDescricao = "Bônus recebido";
                icone = "star";
                cor = "#f59e0b"; // amber
            }
            case AJUSTE -> {
                tipoDescricao = "Ajuste manual";
                icone = "edit";
                cor = "#3b82f6"; // blue
            }
            case EXPIRACAO -> {
                tipoDescricao = "Créditos expirados";
                icone = "clock";
                cor = "#ef4444"; // red
            }
            default -> {
                tipoDescricao = ft.getTipo().name();
                icone = "info";
                cor = "#6b7280"; // gray
            }
        }

        return FidelidadeTransacaoResponse.builder()
                .id(ft.getId())
                .fidelidadeClienteId(ft.getFidelidadeCliente().getId())
                .tipo(ft.getTipo())
                .tipoDescricao(tipoDescricao)
                .visitas(ft.getVisitas())
                .creditos(ft.getCreditos())
                .agendamentoId(ft.getAgendamento() != null ? ft.getAgendamento().getId() : null)
                .descricao(ft.getDescricao())
                .criadoEm(ft.getCriadoEm())
                .criadoEmFormatado(ft.getCriadoEm() != null ? ft.getCriadoEm().format(DATE_FORMATTER) : null)
                .icone(icone)
                .cor(cor)
                .build();
    }
}
