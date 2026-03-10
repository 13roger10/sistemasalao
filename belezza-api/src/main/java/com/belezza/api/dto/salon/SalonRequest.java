package com.belezza.api.dto.salon;

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
public class SalonRequest {

    @NotBlank(message = "Nome é obrigatório")
    @Size(max = 150, message = "Nome deve ter no máximo 150 caracteres")
    private String nome;

    @Size(max = 500)
    private String descricao;

    @Size(max = 300)
    private String endereco;

    @Size(max = 100)
    private String cidade;

    @Size(max = 2)
    private String estado;

    @Size(max = 10)
    private String cep;

    @Size(max = 20)
    private String telefone;

    @Size(max = 20)
    private String cnpj;

    private String horarioAbertura;
    private String horarioFechamento;

    private Integer intervaloAgendamentoMinutos;
    private Integer antecedenciaMinimaHoras;
    private Integer cancelamentoMinimoHoras;
    private Integer maxNoShowsPermitidos;
    private Boolean aceitaAgendamentoOnline;
}
