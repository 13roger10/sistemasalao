package com.belezza.api.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Lembretes automáticos por WhatsApp de um salão (BUG-026). Sem registro, o salão usa o padrão:
 * lembretes ligados, 24 h e 2 h antes do horário.
 */
@Entity
@Table(name = "configuracao_lembretes_salao")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConfiguracaoLembretesSalon {

    @Id
    @Column(name = "salon_id")
    private Long salonId;

    @Column(nullable = false)
    @Builder.Default
    private boolean ativo = true;

    @Column(name = "lembrete_24h", nullable = false)
    @Builder.Default
    private boolean lembrete24h = true;

    @Column(name = "lembrete_2h", nullable = false)
    @Builder.Default
    private boolean lembrete2h = true;

    @Column(name = "atualizado_em", nullable = false)
    private LocalDateTime atualizadoEm;

    @PrePersist
    @PreUpdate
    void marcarAtualizacao() {
        atualizadoEm = LocalDateTime.now();
    }

    public static ConfiguracaoLembretesSalon padrao(Long salonId) {
        return ConfiguracaoLembretesSalon.builder().salonId(salonId).build();
    }

    public boolean envia24h() {
        return ativo && lembrete24h;
    }

    public boolean envia2h() {
        return ativo && lembrete2h;
    }
}
