package com.belezza.api.dto.salon;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Dados cadastrais de uma unidade (criação e edição). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UnidadeRequest {

    @NotBlank(message = "Nome da unidade é obrigatório")
    @Size(max = 150, message = "Nome deve ter no máximo 150 caracteres")
    private String nome;

    @Size(max = 20, message = "Telefone deve ter no máximo 20 caracteres")
    private String telefone;

    @Size(max = 20, message = "CNPJ deve ter no máximo 20 caracteres")
    private String cnpj;

    @Size(max = 500, message = "Descrição deve ter no máximo 500 caracteres")
    private String descricao;

    @Size(max = 300, message = "Endereço deve ter no máximo 300 caracteres")
    private String endereco;

    @Size(max = 100, message = "Cidade deve ter no máximo 100 caracteres")
    private String cidade;

    @Pattern(regexp = "^$|^[A-Za-z]{2}$", message = "Estado deve ser a sigla com 2 letras (ex.: SP)")
    private String estado;

    @Size(max = 10, message = "CEP deve ter no máximo 10 caracteres")
    private String cep;
}
