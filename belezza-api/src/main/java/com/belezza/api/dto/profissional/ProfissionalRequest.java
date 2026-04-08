package com.belezza.api.dto.profissional;

import com.belezza.api.entity.CategoriaProfissional;
import com.belezza.api.entity.NivelProfissional;
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

    private CategoriaProfissional categoria;

    private NivelProfissional nivel;

    @Size(max = 300)
    private String especialidade;

    @Size(max = 200)
    private String especializacoes;

    @Size(max = 500)
    private String bio;

    private Boolean aceitaAgendamentoOnline;

    private List<Long> servicoIds;
}
