package com.belezza.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Professional (employee) working at a salon.
 */
@Entity
@Table(name = "profissionais", indexes = {
    @Index(name = "idx_profissional_salon", columnList = "salon_id"),
    @Index(name = "idx_profissional_usuario", columnList = "usuario_id"),
    @Index(name = "idx_profissional_ativo", columnList = "ativo")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Profissional {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false, unique = true)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "salon_id", nullable = false)
    private Salon salon;

    @Column(length = 300)
    private String especialidade;

    @Column(length = 500)
    private String bio;

    @Column(length = 500)
    private String fotoUrl;

    @Column(nullable = false)
    @Builder.Default
    private boolean aceitaAgendamentoOnline = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean ativo = true;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private TipoComissao tipoComissao;

    @Column(precision = 10, scale = 2)
    private BigDecimal valorComissao;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "profissional_servicos",
        joinColumns = @JoinColumn(name = "profissional_id"),
        inverseJoinColumns = @JoinColumn(name = "servico_id")
    )
    @Builder.Default
    private List<Servico> servicos = new ArrayList<>();

    @OneToMany(mappedBy = "profissional", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<HorarioTrabalho> horarios = new ArrayList<>();

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime atualizadoEm;
}
