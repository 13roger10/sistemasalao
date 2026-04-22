package com.belezza.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Registro de coloração realizada no cliente.
 */
@Entity
@Table(name = "historico_coloracao", indexes = {
    @Index(name = "idx_hist_cor_ficha", columnList = "ficha_id"),
    @Index(name = "idx_hist_cor_cliente", columnList = "cliente_id"),
    @Index(name = "idx_hist_cor_profissional", columnList = "profissional_id"),
    @Index(name = "idx_hist_cor_data", columnList = "data_servico")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HistoricoColoracao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ficha_id", nullable = false)
    private FichaColoracao ficha;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "profissional_id", nullable = false)
    private Profissional profissional;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agendamento_id")
    private Agendamento agendamento;

    @Column(nullable = false)
    private LocalDateTime dataServico;

    // Técnica e produtos
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TecnicaColoracao tecnica;

    @Column(length = 100)
    private String marcaTinta;

    @Column(length = 100)
    private String nomeCor;

    @Column(length = 50)
    private String numeroCor;

    @Column(length = 100)
    private String oxidante;

    @Column(length = 200)
    private String formulacao;

    // Tempos
    @Column
    private Integer tempoAplicacao;

    @Column
    private Integer tempoPausa;

    // Resultados
    @Column(length = 50)
    private String corAntes;

    @Column(length = 50)
    private String corDepois;

    @Column(length = 50)
    private String resultadoObtido;

    @Column
    @Builder.Default
    private int satisfacaoCliente = 5; // 1-5

    // Fotos (URLs)
    @Column(length = 500)
    private String fotoAntes;

    @Column(length = 500)
    private String fotoDepois;

    // Observações
    @Column(length = 1000)
    private String observacoes;

    @Column(length = 500)
    private String recomendacoes;

    @Column
    private LocalDateTime proximaManutencao;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;
}
