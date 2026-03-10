package com.belezza.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Inscricao de um cliente em um programa de fidelidade.
 * Rastreia visitas, creditos e nivel do cliente.
 */
@Entity
@Table(name = "fidelidade_clientes", indexes = {
    @Index(name = "idx_fidelidade_clientes_cliente", columnList = "cliente_id"),
    @Index(name = "idx_fidelidade_clientes_programa", columnList = "programa_id"),
    @Index(name = "idx_fidelidade_clientes_nivel", columnList = "nivel")
}, uniqueConstraints = {
    @UniqueConstraint(name = "uk_fidelidade_cliente_programa", columnNames = {"cliente_id", "programa_id"})
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FidelidadeCliente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "programa_id", nullable = false)
    private FidelidadePrograma programa;

    @Column(nullable = false)
    @Builder.Default
    private int visitasAtuais = 0;

    @Column(nullable = false)
    @Builder.Default
    private int totalVisitas = 0;

    @Column(nullable = false)
    @Builder.Default
    private int totalResgates = 0;

    @Column(nullable = false)
    @Builder.Default
    private int creditosDisponiveis = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private NivelFidelidade nivel = NivelFidelidade.BRONZE;

    @Column(nullable = false)
    @Builder.Default
    private int pontosNivel = 0;

    @Column(nullable = false)
    @Builder.Default
    private boolean ativo = true;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime atualizadoEm;

    /**
     * Incrementa uma visita e verifica se atingiu o limite para ganhar credito.
     */
    public boolean incrementarVisita() {
        this.visitasAtuais++;
        this.totalVisitas++;
        this.pontosNivel++;
        this.nivel = NivelFidelidade.calcularNivel(this.pontosNivel);

        if (this.visitasAtuais >= this.programa.getVisitasNecessarias()) {
            this.creditosDisponiveis++;
            this.visitasAtuais = 0;
            return true; // Ganhou credito
        }
        return false;
    }

    /**
     * Resgata um credito.
     */
    public boolean resgatarCredito() {
        if (this.creditosDisponiveis > 0) {
            this.creditosDisponiveis--;
            this.totalResgates++;
            return true;
        }
        return false;
    }
}
