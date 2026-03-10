package com.belezza.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Entity representing a version of an edited image.
 * Each version tracks a specific edit operation (enhance, remove background, etc.)
 */
@Entity
@Table(name = "imagem_versoes", indexes = {
    @Index(name = "idx_versao_imagem", columnList = "imagem_id"),
    @Index(name = "idx_versao_criado_em", columnList = "criado_em")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImagemVersao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "imagem_id", nullable = false)
    private Imagem imagem;

    @Column(nullable = false, length = 1000)
    private String url;

    @Column(nullable = false, length = 50)
    private String operacao; // "enhance", "remove-bg", "blur-bg", "apply-style", "upscale", "crop"

    @Column(length = 200)
    private String parametros; // JSON string with operation parameters

    @Column(nullable = false)
    private Long tamanhoBytes;

    @Column(nullable = false)
    private int largura;

    @Column(nullable = false)
    private int altura;

    @Column(nullable = false)
    @Builder.Default
    private int numeroVersao = 1;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;
}
