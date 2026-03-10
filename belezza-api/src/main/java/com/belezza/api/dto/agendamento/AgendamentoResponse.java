package com.belezza.api.dto.agendamento;

import com.belezza.api.entity.Agendamento;
import com.belezza.api.entity.StatusAgendamento;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgendamentoResponse {

    private Long id;
    private Long salonId;
    private String salonNome;
    private Long clienteId;
    private String clienteNome;
    private String clienteTelefone;
    private Long profissionalId;
    private String profissionalNome;

    /**
     * Single service (legacy field for backward compatibility).
     * @deprecated Use {@link #servicos} for appointments with multiple services
     */
    @Deprecated
    private Long servicoId;

    /**
     * Single service name (legacy field for backward compatibility).
     * @deprecated Use {@link #servicos} for appointments with multiple services
     */
    @Deprecated
    private String servicoNome;

    /**
     * Single service duration (legacy field for backward compatibility).
     * @deprecated Use {@link #duracaoTotalMinutos} for total duration
     */
    @Deprecated
    private int servicoDuracaoMinutos;

    /**
     * List of services for appointments with multiple services.
     * For single-service appointments, this will contain one item.
     */
    private List<ServicoAgendadoDTO> servicos;

    /**
     * Total duration in minutes (sum of all services + preparation time).
     */
    private int duracaoTotalMinutos;

    private LocalDateTime dataHora;
    private LocalDateTime fimPrevisto;
    private StatusAgendamento status;
    private String statusDescricao;
    private String observacoes;
    private String motivoCancelamento;
    private BigDecimal valorCobrado;
    private LocalDateTime criadoEm;
    private LocalDateTime atualizadoEm;

    public static AgendamentoResponse fromEntity(Agendamento a) {
        // Map services list
        List<ServicoAgendadoDTO> servicosList = new ArrayList<>();
        if (a.getServicos() != null && !a.getServicos().isEmpty()) {
            // Multiple services (new approach)
            servicosList = a.getServicos().stream()
                .map(ServicoAgendadoDTO::fromEntity)
                .collect(Collectors.toList());
        } else if (a.getServico() != null) {
            // Single service (legacy approach)
            servicosList.add(ServicoAgendadoDTO.builder()
                .servicoId(a.getServico().getId())
                .servicoNome(a.getServico().getNome())
                .servicoDescricao(a.getServico().getDescricao())
                .servicoPreco(a.getServico().getPreco())
                .ordem(1)
                .duracaoPrevistaMinutos(a.getServico().getDuracaoMinutos())
                .tempoPreparacaoMinutos(0)
                .build());
        }

        return AgendamentoResponse.builder()
                .id(a.getId())
                .salonId(a.getSalon().getId())
                .salonNome(a.getSalon().getNome())
                .clienteId(a.getCliente().getId())
                .clienteNome(a.getCliente().getUsuario().getNome())
                .clienteTelefone(a.getCliente().getUsuario().getTelefone())
                .profissionalId(a.getProfissional().getId())
                .profissionalNome(a.getProfissional().getUsuario().getNome())
                // Legacy fields (deprecated)
                .servicoId(a.getServico() != null ? a.getServico().getId() : null)
                .servicoNome(a.getServico() != null ? a.getServico().getNome() : null)
                .servicoDuracaoMinutos(a.getServico() != null ? a.getServico().getDuracaoMinutos() : 0)
                // New fields
                .servicos(servicosList)
                .duracaoTotalMinutos(a.getDuracaoTotalMinutos())
                .dataHora(a.getDataHora())
                .fimPrevisto(a.getFimPrevisto())
                .status(a.getStatus())
                .statusDescricao(a.getStatus().getDescription())
                .observacoes(a.getObservacoes())
                .motivoCancelamento(a.getMotivoCancelamento())
                .valorCobrado(a.getValorCobrado())
                .criadoEm(a.getCriadoEm())
                .atualizadoEm(a.getAtualizadoEm())
                .build();
    }
}
