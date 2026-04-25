package com.belezza.api.dto.recepcao;

import com.belezza.api.dto.agendamento.AgendamentoResponse;
import com.belezza.api.dto.pagamento.PagamentoResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReceptionAppointmentResponse {

    private Long id;
    private Long clienteId;
    private String clienteNome;
    private String clienteTelefone;
    private Long profissionalId;
    private String profissionalNome;
    private List<String> servicos;
    private LocalDateTime dataHora;
    private LocalDateTime fimPrevisto;
    private String status;
    private String statusDescricao;

    // Payment info (null when no payment registered yet)
    private Long pagamentoId;
    private String pagamentoStatus;
    private String pagamentoStatusDescricao;
    private BigDecimal valorPago;
    private String formaPagamento;

    public static ReceptionAppointmentResponse from(AgendamentoResponse appt, PagamentoResponse pag) {
        List<String> servicoNomes;
        if (appt.getServicos() != null && !appt.getServicos().isEmpty()) {
            servicoNomes = appt.getServicos().stream()
                    .map(s -> s.getServicoNome())
                    .collect(Collectors.toList());
        } else if (appt.getServicoNome() != null) {
            servicoNomes = List.of(appt.getServicoNome());
        } else {
            servicoNomes = List.of();
        }

        return ReceptionAppointmentResponse.builder()
                .id(appt.getId())
                .clienteId(appt.getClienteId())
                .clienteNome(appt.getClienteNome())
                .clienteTelefone(appt.getClienteTelefone())
                .profissionalId(appt.getProfissionalId())
                .profissionalNome(appt.getProfissionalNome())
                .servicos(servicoNomes)
                .dataHora(appt.getDataHora())
                .fimPrevisto(appt.getFimPrevisto())
                .status(appt.getStatus().name())
                .statusDescricao(appt.getStatusDescricao())
                .pagamentoId(pag != null ? pag.getId() : null)
                .pagamentoStatus(pag != null ? pag.getStatus().name() : null)
                .pagamentoStatusDescricao(pag != null ? pag.getStatusDescricao() : null)
                .valorPago(pag != null ? pag.getValor() : null)
                .formaPagamento(pag != null ? pag.getFormaDescricao() : null)
                .build();
    }
}
