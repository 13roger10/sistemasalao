package com.belezza.api.exception;

import com.belezza.api.dto.agendamento.AgendamentoAfetadoResponse;
import org.springframework.http.HttpStatus;

import java.util.List;

/**
 * A ação atinge agendamentos marcados e precisa da escolha da equipe (BUG-033): repetir o pedido
 * com {@code acao=cancelar} (cancela e avisa os clientes) ou {@code acao=manter} (remanejar à mão).
 * Responde 409 com a lista em {@code agendamentosAfetados}.
 */
public class AgendamentosAfetadosException extends BusinessException {

    public static final String CODIGO = "AGENDAMENTOS_AFETADOS";

    private final List<AgendamentoAfetadoResponse> afetados;

    public AgendamentosAfetadosException(String message, List<AgendamentoAfetadoResponse> afetados) {
        super(message, HttpStatus.CONFLICT, CODIGO);
        this.afetados = afetados;
    }

    public List<AgendamentoAfetadoResponse> getAfetados() {
        return afetados;
    }
}
