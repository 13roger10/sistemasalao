package com.belezza.api.dto.notificacao;

import com.belezza.api.entity.Notificacao;
import com.belezza.api.entity.TipoNotificacao;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificacaoResponse {

    private Long id;
    private TipoNotificacao tipo;
    private String titulo;
    private String mensagem;
    private String link;
    private String icone;
    private boolean lida;
    private Long agendamentoId;
    private LocalDateTime criadoEm;
    private String criadoEmFormatado;
    private String tempoRelativo;

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    public static NotificacaoResponse fromEntity(Notificacao notificacao) {
        String icone = getIconeParaTipo(notificacao.getTipo());
        String tempoRelativo = calcularTempoRelativo(notificacao.getCriadoEm());

        return NotificacaoResponse.builder()
                .id(notificacao.getId())
                .tipo(notificacao.getTipo())
                .titulo(notificacao.getTitulo())
                .mensagem(notificacao.getMensagem())
                .link(notificacao.getLink())
                .icone(notificacao.getIcone() != null ? notificacao.getIcone() : icone)
                .lida(notificacao.isLida())
                .agendamentoId(notificacao.getAgendamentoId())
                .criadoEm(notificacao.getCriadoEm())
                .criadoEmFormatado(notificacao.getCriadoEm() != null ? notificacao.getCriadoEm().format(FORMATTER) : null)
                .tempoRelativo(tempoRelativo)
                .build();
    }

    private static String getIconeParaTipo(TipoNotificacao tipo) {
        return switch (tipo) {
            case AGENDAMENTO_CONFIRMADO -> "calendar-check";
            case AGENDAMENTO_CANCELADO -> "calendar-x";
            case AGENDAMENTO_REAGENDADO -> "calendar-edit";
            case LEMBRETE_24H, LEMBRETE_2H -> "bell";
            case AVALIACAO_RECEBIDA -> "star";
            case FIDELIDADE_CREDITO -> "gift";
            case FIDELIDADE_NIVEL -> "award";
            case PROMOCAO -> "tag";
            case SISTEMA -> "info";
        };
    }

    private static String calcularTempoRelativo(LocalDateTime dataHora) {
        if (dataHora == null) return "";

        LocalDateTime agora = LocalDateTime.now();
        long minutos = java.time.Duration.between(dataHora, agora).toMinutes();

        if (minutos < 1) return "agora";
        if (minutos < 60) return minutos + " min atrás";
        if (minutos < 1440) return (minutos / 60) + "h atrás";
        if (minutos < 10080) return (minutos / 1440) + "d atrás";
        return dataHora.format(DateTimeFormatter.ofPattern("dd/MM"));
    }
}
