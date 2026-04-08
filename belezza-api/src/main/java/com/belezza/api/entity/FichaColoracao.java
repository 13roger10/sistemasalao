package com.belezza.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Ficha de coloração do cliente com análise de tom de pele e histórico.
 */
@Entity
@Table(name = "fichas_coloracao", indexes = {
    @Index(name = "idx_ficha_cliente", columnList = "cliente_id"),
    @Index(name = "idx_ficha_salon", columnList = "salon_id")
}, uniqueConstraints = {
    @UniqueConstraint(name = "uk_ficha_cliente_salon", columnNames = {"cliente_id", "salon_id"})
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FichaColoracao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "salon_id", nullable = false)
    private Salon salon;

    // Análise de pele
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private TomPele tomPele;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private SubtomPele subtomPele;

    // Características do cabelo
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private TipoCabelo tipoCabelo;

    @Column(length = 50)
    private String corNatural;

    @Column(length = 50)
    private String corAtual;

    @Column(length = 20)
    private String porcentagemBrancos;

    @Column(length = 50)
    private String texturaCabelo;

    @Column(length = 50)
    private String porosidade;

    @Column(length = 50)
    private String elasticidade;

    // Histórico químico
    @Column(nullable = false)
    @Builder.Default
    private boolean temQuimica = false;

    @Column(length = 500)
    private String historicoQuimico;

    @Column
    private LocalDateTime ultimaQuimica;

    // Alergias e sensibilidades
    @Column(nullable = false)
    @Builder.Default
    private boolean temAlergia = false;

    @Column(length = 500)
    private String alergias;

    @Column(nullable = false)
    @Builder.Default
    private boolean sensibilidadeCouro = false;

    // Preferências
    @Column(length = 500)
    private String preferenciaCores;

    @Column(length = 500)
    private String coresEvitar;

    @Column(length = 1000)
    private String observacoes;

    // Fotos de referência (URLs)
    @Column(length = 500)
    private String fotoReferencia1;

    @Column(length = 500)
    private String fotoReferencia2;

    @Column(length = 500)
    private String fotoReferencia3;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime atualizadoEm;
}
