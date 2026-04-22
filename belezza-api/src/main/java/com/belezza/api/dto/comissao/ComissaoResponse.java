package com.belezza.api.dto.comissao;

import com.belezza.api.entity.Comissao;
import com.belezza.api.entity.StatusComissao;
import com.belezza.api.entity.TipoComissao;
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
public class ComissaoResponse {

    private Long id;
    private Long salonId;
    private Long profissionalId;
    private String profissionalNome;
    private Long agendamentoId;
    private LocalDateTime dataAgendamento;
    private Long clienteId;
    private String clienteNome;
    private Long servicoId;
    private String servicoNome;
    private BigDecimal valorServico;
    private TipoComissao tipoComissao;
    private String tipoComissaoDescricao;
    private BigDecimal taxaComissao;
    private BigDecimal valorComissao;
    private StatusComissao status;
    private String statusDescricao;
    private Long pagamentoProfissionalId;
    private LocalDateTime criadoEm;

    public static ComissaoResponse fromEntity(Comissao comissao) {
        String profissionalNome = null;
        if (comissao.getProfissional() != null && comissao.getProfissional().getUsuario() != null) {
            profissionalNome = comissao.getProfissional().getUsuario().getNome();
        }

        LocalDateTime dataAgendamento = null;
        Long clienteId = null;
        String clienteNome = null;
        Long servicoId = null;
        String servicoNome = null;

        if (comissao.getAgendamento() != null) {
            var agendamento = comissao.getAgendamento();
            dataAgendamento = agendamento.getDataHora();

            // Client name via Cliente → Usuario
            if (agendamento.getCliente() != null) {
                clienteId = agendamento.getCliente().getId();
                if (agendamento.getCliente().getUsuario() != null) {
                    clienteNome = agendamento.getCliente().getUsuario().getNome();
                }
            }

            // Service name: prefer multi-service list (ordem=1), fall back to single servico
            if (agendamento.getServicos() != null && !agendamento.getServicos().isEmpty()) {
                var primary = agendamento.getServicos().stream()
                        .min(java.util.Comparator.comparingInt(s -> s.getOrdem()))
                        .orElse(null);
                if (primary != null && primary.getServico() != null) {
                    servicoId = primary.getServico().getId();
                    servicoNome = primary.getServico().getNome();
                }
            } else if (agendamento.getServico() != null) {
                servicoId = agendamento.getServico().getId();
                servicoNome = agendamento.getServico().getNome();
            }
        }

        return ComissaoResponse.builder()
                .id(comissao.getId())
                .salonId(comissao.getSalon().getId())
                .profissionalId(comissao.getProfissional().getId())
                .profissionalNome(profissionalNome)
                .agendamentoId(comissao.getAgendamento().getId())
                .dataAgendamento(dataAgendamento)
                .clienteId(clienteId)
                .clienteNome(clienteNome)
                .servicoId(servicoId)
                .servicoNome(servicoNome)
                .valorServico(comissao.getValorServico())
                .tipoComissao(comissao.getTipoComissao())
                .tipoComissaoDescricao(comissao.getTipoComissao().getDescription())
                .taxaComissao(comissao.getTaxaComissao())
                .valorComissao(comissao.getValorComissao())
                .status(comissao.getStatus())
                .statusDescricao(comissao.getStatus().getDescription())
                .pagamentoProfissionalId(comissao.getPagamentoProfissional() != null ?
                        comissao.getPagamentoProfissional().getId() : null)
                .criadoEm(comissao.getCriadoEm())
                .build();
    }
}
