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
    /**
     * Nota interna da equipe. Visível para ADMIN, PROFISSIONAL e RECEPCIONISTA;
     * NUNCA populada quando hideInternalNotes=true (CLIENTE ou chamada anônima/via token).
     */
    private String notasInternas;
    private String motivoCancelamento;
    private BigDecimal valorCobrado;
    private LocalDateTime criadoEm;
    private LocalDateTime atualizadoEm;

    @SuppressWarnings("deprecation")
    public static AgendamentoResponse fromEntity(Agendamento a) {
        return fromEntity(a, false, false);
    }

    /**
     * Creates an AgendamentoResponse with restricted data for professionals.
     * Excludes: clienteTelefone, observacoes (sensitive client data).
     * Still includes notasInternas — professionals are staff and must see it.
     *
     * @param a The appointment entity
     * @return AgendamentoResponse without client contact data, but with internal notes
     */
    @SuppressWarnings("deprecation")
    public static AgendamentoResponse fromEntityForProfessional(Agendamento a) {
        return fromEntity(a, true, false);
    }

    /**
     * Creates an AgendamentoResponse safe to return to a CLIENTE or an unauthenticated
     * caller (e.g. token-based confirm/cancel links). Excludes clienteTelefone, observacoes
     * AND notasInternas — internal notes must never reach the client.
     *
     * @param a The appointment entity
     * @return AgendamentoResponse safe for client-facing contexts
     */
    @SuppressWarnings("deprecation")
    public static AgendamentoResponse fromEntityForClient(Agendamento a) {
        return fromEntity(a, true, true);
    }

    /**
     * Internal method that creates AgendamentoResponse with optional data restriction.
     *
     * @param a The appointment entity
     * @param restrictSensitiveData If true, excludes telefone and observacoes
     * @param hideInternalNotes If true, excludes notasInternas (must be true for CLIENTE/anonymous callers)
     * @return AgendamentoResponse
     */
    @SuppressWarnings("deprecation")
    public static AgendamentoResponse fromEntity(Agendamento a, boolean restrictSensitiveData, boolean hideInternalNotes) {
        // Map services list
        List<ServicoAgendadoDTO> servicosList = new ArrayList<>();
        if (a.getServicos() != null && !a.getServicos().isEmpty()) {
            // Multiple services (new approach)
            servicosList = a.getServicos().stream()
                .map(ServicoAgendadoDTO::fromEntity)
                .collect(Collectors.toList());
        } else if (a.getServico() != null) {
            // Single service (legacy fallback)
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

        // Derive legacy single-service fields from the resolved list
        ServicoAgendadoDTO primeiroServico = servicosList.isEmpty() ? null : servicosList.get(0);

        return AgendamentoResponse.builder()
                .id(a.getId())
                .salonId(a.getSalon().getId())
                .salonNome(a.getSalon().getNome())
                .clienteId(a.getCliente().getId())
                .clienteNome(a.getCliente().getUsuario().getNome())
                // Restrict sensitive data for professionals
                .clienteTelefone(restrictSensitiveData ? null : a.getCliente().getUsuario().getTelefone())
                .profissionalId(a.getProfissional().getId())
                .profissionalNome(a.getProfissional().getUsuario().getNome())
                // Legacy fields (deprecated) — derived from servicosList to avoid repeated getServico() calls
                .servicoId(primeiroServico != null ? primeiroServico.getServicoId() : null)
                .servicoNome(primeiroServico != null ? primeiroServico.getServicoNome() : null)
                .servicoDuracaoMinutos(primeiroServico != null ? primeiroServico.getDuracaoPrevistaMinutos() : 0)
                // New fields
                .servicos(servicosList)
                .duracaoTotalMinutos(a.getDuracaoTotalMinutos())
                .dataHora(a.getDataHora())
                .fimPrevisto(a.getFimPrevisto())
                .status(a.getStatus())
                .statusDescricao(a.getStatus().getDescription())
                // Restrict sensitive data for professionals
                .observacoes(restrictSensitiveData ? null : a.getObservacoes())
                // Nota interna: nunca vai para o cliente, independente de restrictSensitiveData
                .notasInternas(hideInternalNotes ? null : a.getNotasInternas())
                .motivoCancelamento(a.getMotivoCancelamento())
                .valorCobrado(a.getValorCobrado())
                .criadoEm(a.getCriadoEm())
                .atualizadoEm(a.getAtualizadoEm())
                .build();
    }
}
