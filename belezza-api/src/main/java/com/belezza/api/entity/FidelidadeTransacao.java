package com.belezza.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Historico de transacoes de fidelidade.
 * Registra visitas, resgates, bonus e ajustes.
 */
@Entity
@Table(name = "fidelidade_transacoes", indexes = {
    @Index(name = "idx_fidelidade_transacoes_cliente", columnList = "fidelidade_cliente_id"),
    @Index(name = "idx_fidelidade_transacoes_tipo", columnList = "tipo"),
    @Index(name = "idx_fidelidade_transacoes_data", columnList = "criado_em")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FidelidadeTransacao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fidelidade_cliente_id", nullable = false)
    private FidelidadeCliente fidelidadeCliente;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TipoTransacaoFidelidade tipo;

    @Column(nullable = false)
    @Builder.Default
    private int visitas = 0;

    @Column(nullable = false)
    @Builder.Default
    private int creditos = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agendamento_id")
    private Agendamento agendamento;

    @Column(length = 255)
    private String descricao;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    /**
     * Cria uma transacao de visita.
     */
    public static FidelidadeTransacao criarVisita(FidelidadeCliente fc, Agendamento agendamento, boolean ganhouCredito) {
        return FidelidadeTransacao.builder()
                .fidelidadeCliente(fc)
                .tipo(TipoTransacaoFidelidade.VISITA)
                .visitas(1)
                .creditos(ganhouCredito ? 1 : 0)
                .agendamento(agendamento)
                .descricao(ganhouCredito ? "Visita + credito de recompensa" : "Visita registrada")
                .build();
    }

    /**
     * Cria uma transacao de resgate.
     */
    public static FidelidadeTransacao criarResgate(FidelidadeCliente fc, Agendamento agendamento, String descricao) {
        return FidelidadeTransacao.builder()
                .fidelidadeCliente(fc)
                .tipo(TipoTransacaoFidelidade.RESGATE)
                .visitas(0)
                .creditos(-1)
                .agendamento(agendamento)
                .descricao(descricao != null ? descricao : "Resgate de recompensa")
                .build();
    }

    /**
     * Cria uma transacao de bonus.
     */
    public static FidelidadeTransacao criarBonus(FidelidadeCliente fc, int creditos, String descricao) {
        return FidelidadeTransacao.builder()
                .fidelidadeCliente(fc)
                .tipo(TipoTransacaoFidelidade.BONUS)
                .visitas(0)
                .creditos(creditos)
                .descricao(descricao)
                .build();
    }
}
