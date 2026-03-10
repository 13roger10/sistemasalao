package com.belezza.api.dto.notificacao;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificacoesResumoResponse {

    private long totalNaoLidas;
    private List<NotificacaoResponse> recentes;
}
