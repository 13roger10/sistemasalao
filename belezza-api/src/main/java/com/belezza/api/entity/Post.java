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
 * Social media post entity for the Social Studio module.
 */
@Entity
@Table(name = "posts", indexes = {
    @Index(name = "idx_post_salon", columnList = "salon_id"),
    @Index(name = "idx_post_criador", columnList = "criador_id"),
    @Index(name = "idx_post_status", columnList = "status"),
    @Index(name = "idx_post_agendado_para", columnList = "agendado_para")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "salon_id", nullable = false)
    private Salon salon;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "criador_id", nullable = false)
    private Usuario criador;

    @Column(length = 1000)
    private String imagemUrl;

    @Column(length = 1000)
    private String imagemOriginalUrl;

    @Column(length = 1000)
    private String thumbnailUrl;

    @Column(columnDefinition = "TEXT")
    private String legenda;

    @ElementCollection
    @CollectionTable(name = "post_hashtags", joinColumns = @JoinColumn(name = "post_id"))
    @Column(name = "hashtag", length = 100)
    @Builder.Default
    private List<String> hashtags = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private StatusPost status = StatusPost.RASCUNHO;

    @ElementCollection
    @CollectionTable(name = "post_plataformas", joinColumns = @JoinColumn(name = "post_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "plataforma", length = 20)
    @Builder.Default
    private List<PlataformaSocial> plataformas = new ArrayList<>();

    private LocalDateTime agendadoPara;

    private LocalDateTime publicadoEm;

    @Column(length = 200)
    private String publishErrorMessage;

    @Column(nullable = false)
    @Builder.Default
    private int tentativasPublicacao = 0;

    // Social metrics
    @Column(nullable = false)
    @Builder.Default
    private int curtidas = 0;

    @Column(nullable = false)
    @Builder.Default
    private int comentarios = 0;

    @Column(nullable = false)
    @Builder.Default
    private int compartilhamentos = 0;

    @Column(nullable = false)
    @Builder.Default
    private int alcance = 0;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime atualizadoEm;
}
