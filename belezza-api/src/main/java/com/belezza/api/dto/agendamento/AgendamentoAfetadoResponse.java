package com.belezza.api.dto.agendamento;

import com.belezza.api.entity.Agendamento;
import com.belezza.api.entity.AgendamentoServico;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Agendamento atingido por uma ausência do profissional ou pela desativação de um profissional ou
 * serviço (BUG-033) — o suficiente para a equipe decidir e avisar o cliente.
 */
public record AgendamentoAfetadoResponse(
        Long id,
        LocalDateTime dataHora,
        String status,
        String clienteNome,
        String clienteTelefone,
        String profissionalNome,
        List<String> servicos
) {

    @SuppressWarnings("deprecation")
    public static AgendamentoAfetadoResponse fromEntity(Agendamento a) {
        List<String> servicos = a.getServicos() != null && !a.getServicos().isEmpty()
                ? a.getServicos().stream().map(AgendamentoServico::getServico).map(s -> s.getNome()).toList()
                : a.getServico() != null ? List.of(a.getServico().getNome()) : List.of();
        var usuarioCliente = a.getCliente() != null ? a.getCliente().getUsuario() : null;
        var usuarioProf = a.getProfissional() != null ? a.getProfissional().getUsuario() : null;
        return new AgendamentoAfetadoResponse(
                a.getId(),
                a.getDataHora(),
                a.getStatus().name(),
                usuarioCliente != null ? usuarioCliente.getNome() : null,
                usuarioCliente != null ? usuarioCliente.getTelefone() : null,
                usuarioProf != null ? usuarioProf.getNome() : null,
                servicos);
    }
}
