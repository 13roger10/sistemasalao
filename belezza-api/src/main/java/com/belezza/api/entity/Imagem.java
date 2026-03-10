package com.belezza.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Entity representing an uploaded image with AI processing capabilities.
 * Supports versioning for edit history tracking.
 */
@Entity
@Table(name = "imagens", indexes = {
    @Index(name = "idx_imagem_salon", columnList = "salon_id"),
    @Index(name = "idx_imagem_criador", columnList = "criador_id"),
    @Index(name = "idx_imagem_criado_em", columnList = "criado_em")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Imagem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "salon_id", nullable = false)
    private Salon salon;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "criador_id", nullable = false)
    private Usuario criador;

    @Column(nullable = false, length = 1000)
    private String urlOriginal;

    @Column(length = 1000)
    private String urlAtual;

    @Column(length = 1000)
    private String thumbnailUrl;

    @Column(nullable = false, length = 100)
    private String nomeArquivo;

    @Column(nullable = false)
    private Long tamanhoBytes;

    @Column(nullable = false, length = 50)
    private String tipoMime;

    @Column(nullable = false)
    private int largura;

    @Column(nullable = false)
    private int altura;

    @Column(length = 200)
    private String descricao;

    @Column(nullable = false)
    @Builder.Default
    private int totalVersoes = 1;

    @OneToMany(mappedBy = "imagem", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ImagemVersao> versoes = new ArrayList<>();

    @Column(nullable = false)
    @Builder.Default
    private boolean ativo = true;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime atualizadoEm;

    // Helper methods
    public void addVersao(ImagemVersao versao) {
        versoes.add(versao);
        versao.setImagem(this);
        this.totalVersoes = versoes.size() + 1; // +1 para contar o original
    }

    public void removeVersao(ImagemVersao versao) {
        versoes.remove(versao);
        versao.setImagem(null);
        this.totalVersoes = versoes.size() + 1;
    }
}
