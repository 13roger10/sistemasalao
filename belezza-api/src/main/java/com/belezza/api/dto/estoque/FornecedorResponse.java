package com.belezza.api.dto.estoque;

import com.belezza.api.entity.Fornecedor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FornecedorResponse {

    private Long id;
    private String nome;
    private String nomeFantasia;
    private String cnpj;
    private String contatoNome;
    private String telefone;
    private String email;
    private String website;
    private String endereco;
    private String cidade;
    private String estado;
    private String cep;
    private String condicoesPagamento;
    private String observacoes;
    private Long salonId;
    private int totalCompras;
    private LocalDateTime ultimaCompra;
    private boolean ativo;
    private LocalDateTime criadoEm;

    public static FornecedorResponse fromEntity(Fornecedor fornecedor) {
        return FornecedorResponse.builder()
                .id(fornecedor.getId())
                .nome(fornecedor.getNome())
                .nomeFantasia(fornecedor.getNomeFantasia())
                .cnpj(fornecedor.getCnpj())
                .contatoNome(fornecedor.getContatoNome())
                .telefone(fornecedor.getTelefone())
                .email(fornecedor.getEmail())
                .website(fornecedor.getWebsite())
                .endereco(fornecedor.getEndereco())
                .cidade(fornecedor.getCidade())
                .estado(fornecedor.getEstado())
                .cep(fornecedor.getCep())
                .condicoesPagamento(fornecedor.getCondicoesPagamento())
                .observacoes(fornecedor.getObservacoes())
                .salonId(fornecedor.getSalon().getId())
                .totalCompras(fornecedor.getTotalCompras())
                .ultimaCompra(fornecedor.getUltimaCompra())
                .ativo(fornecedor.isAtivo())
                .criadoEm(fornecedor.getCriadoEm())
                .build();
    }
}
