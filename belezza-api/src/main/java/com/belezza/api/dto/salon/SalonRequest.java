package com.belezza.api.dto.salon;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
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

    // Limites (BUG-032): antes qualquer número era salvo
    @Min(value = 5, message = "Intervalo entre horários deve ser de pelo menos 5 minutos")
    @Max(value = 240, message = "Intervalo entre horários deve ser de no máximo 240 minutos")
    private Integer intervaloAgendamentoMinutos;

    @Min(value = 0, message = "Antecedência mínima não pode ser negativa")
    @Max(value = 720, message = "Antecedência mínima deve ser de no máximo 720 horas (30 dias)")
    private Integer antecedenciaMinimaHoras;

    @Min(value = 0, message = "Prazo de cancelamento não pode ser negativo")
    @Max(value = 720, message = "Prazo de cancelamento deve ser de no máximo 720 horas (30 dias)")
    private Integer cancelamentoMinimoHoras;

    @Min(value = 1, message = "Máximo de faltas deve ser de pelo menos 1")
    @Max(value = 50, message = "Máximo de faltas deve ser de no máximo 50")
    private Integer maxNoShowsPermitidos;
    private Boolean aceitaAgendamentoOnline;
}
