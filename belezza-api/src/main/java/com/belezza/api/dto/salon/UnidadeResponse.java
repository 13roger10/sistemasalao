package com.belezza.api.dto.salon;

import com.belezza.api.entity.Salon;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Unidade do administrador. {@code sede} é a primeira unidade criada; {@code atual}, aquela em que
 * ele está trabalhando agora (a do token). Os totais são da própria unidade; o faturamento, dos
 * últimos 30 dias.
 */
public record UnidadeResponse(
        Long id,
        String nome,
        String telefone,
        String cnpj,
        String descricao,
        String endereco,
        String cidade,
        String estado,
        String cep,
        boolean ativo,
        boolean sede,
        boolean atual,
        long totalProfissionais,
        long totalClientes,
        long totalServicos,
        BigDecimal faturamentoMes,
        LocalDateTime criadoEm
) {
    public static UnidadeResponse of(Salon s, boolean sede, boolean atual, long profissionais,
                                     long clientes, long servicos, BigDecimal faturamentoMes) {
        return new UnidadeResponse(s.getId(), s.getNome(), s.getTelefone(), s.getCnpj(), s.getDescricao(),
                s.getEndereco(), s.getCidade(), s.getEstado(), s.getCep(), s.isAtivo(), sede, atual,
                profissionais, clientes, servicos, faturamentoMes, s.getCriadoEm());
    }
}
