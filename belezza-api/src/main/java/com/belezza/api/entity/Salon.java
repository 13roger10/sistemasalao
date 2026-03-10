package com.belezza.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Beauty salon entity. Each ADMIN user owns one salon.
 */
@Entity
@Table(name = "salons", indexes = {
    @Index(name = "idx_salon_admin", columnList = "admin_id"),
    @Index(name = "idx_salon_ativo", columnList = "ativo")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Salon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String nome;

    @Column(length = 500)
    private String descricao;

    @Column(length = 300)
    private String endereco;

    @Column(length = 100)
    private String cidade;

    @Column(length = 2)
    private String estado;

    @Column(length = 10)
    private String cep;

    @Column(length = 20)
    private String telefone;

    @Column(length = 500)
    private String logoUrl;

    @Column(length = 500)
    private String bannerUrl;

    @Column(length = 20)
    private String cnpj;

    @Column(nullable = false)
    private LocalTime horarioAbertura;

    @Column(nullable = false)
    private LocalTime horarioFechamento;

    @Column(nullable = false)
    @Builder.Default
    private int intervaloAgendamentoMinutos = 30;

    @Column(nullable = false)
    @Builder.Default
    private int antecedenciaMinimaHoras = 2;

    @Column(nullable = false)
    @Builder.Default
    private int cancelamentoMinimoHoras = 2;

    @Column(nullable = false)
    @Builder.Default
    private int maxNoShowsPermitidos = 3;

    @Column(nullable = false)
    @Builder.Default
    private boolean aceitaAgendamentoOnline = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean ativo = true;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private TipoComissao tipoComissaoPadrao = TipoComissao.PORCENTAGEM;

    @Column(precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal valorComissaoPadrao = BigDecimal.valueOf(10.00);

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_id", nullable = false, unique = true)
    private Usuario admin;

    @OneToMany(mappedBy = "salon", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Profissional> profissionais = new ArrayList<>();

    @OneToMany(mappedBy = "salon", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Servico> servicos = new ArrayList<>();

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime atualizadoEm;
}
