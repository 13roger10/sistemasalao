package com.belezza.api.dto.estoque;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FornecedorRequest {

    @NotBlank(message = "Nome é obrigatório")
    @Size(max = 150, message = "Nome deve ter no máximo 150 caracteres")
    private String nome;

    @Size(max = 150)
    private String nomeFantasia;

    @Size(max = 20)
    private String cnpj;

    @Size(max = 100)
    private String contatoNome;

    @Size(max = 20)
    private String telefone;

    @Size(max = 255)
    private String email;

    @Size(max = 255)
    private String website;

    @Size(max = 300)
    private String endereco;

    @Size(max = 100)
    private String cidade;

    @Size(max = 2)
    private String estado;

    @Size(max = 10)
    private String cep;

    @Size(max = 200)
    private String condicoesPagamento;

    @Size(max = 500)
    private String observacoes;
}
