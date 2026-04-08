package com.belezza.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Alerta de estoque baixo ou outros problemas.
 */
@Entity
@Table(name = "alertas_estoque", indexes = {
    @Index(name = "idx_alerta_produto", columnList = "produto_id"),
    @Index(name = "idx_alerta_salon", columnList = "salon_id"),
    @Index(name = "idx_alerta_tipo", columnList = "tipo"),
    @Index(name = "idx_alerta_reconhecido", columnList = "reconhecido")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertaEstoque {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "produto_id", nullable = false)
    private Produto produto;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "salon_id", nullable = false)
    private Salon salon;

    @Column(nullable = false, length = 30)
    private String tipo; // ESTOQUE_BAIXO, SEM_ESTOQUE, VENCENDO

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String severidade = "AVISO"; // AVISO, CRITICO

    @Column(nullable = false)
    private int estoqueAtual;

    @Column(nullable = false)
    private int estoqueMinimo;

    @Column(nullable = false)
    @Builder.Default
    private boolean reconhecido = false;

    private LocalDateTime reconhecidoEm;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reconhecido_por_id")
    private Usuario reconhecidoPor;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;
}
