package com.belezza.api.dto.profissional;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProfissionalRequest {

    @NotNull(message = "ID do usuário é obrigatório")
    private Long usuarioId;

    @Size(max = 300)
    private String especialidade;

    @Size(max = 500)
    private String bio;

    private Boolean aceitaAgendamentoOnline;

    private List<Long> servicoIds;
}
