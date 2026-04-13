package com.belezza.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

/**
 * API Key for third-party integrations with the Belezza Public API.
 * The actual key is shown only once on creation; only a SHA-256 hash is stored.
 */
@Entity
@Table(
    name = "api_keys",
    indexes = {
        @Index(name = "idx_api_keys_salon", columnList = "salon_id"),
        @Index(name = "idx_api_keys_hash",  columnList = "key_hash"),
        @Index(name = "idx_api_keys_ativo", columnList = "ativo")
    }
)
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiKey {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "salon_id", nullable = false)
    private Salon salon;

    /** Human-readable label for this key (e.g. "Website integration"). */
    @Column(nullable = false, length = 100)
    private String nome;

    /** First 8 characters of the raw key shown in the UI. */
    @Column(name = "key_prefix", nullable = false, length = 10)
    private String keyPrefix;

    /** SHA-256 hex digest of the full raw key. */
    @Column(name = "key_hash", nullable = false, unique = true, length = 64)
    private String keyHash;

    /** Comma-separated scopes: "read", "write". */
    @Column(nullable = false, length = 500)
    @Builder.Default
    private String escopos = "read";

    @Column(nullable = false)
    @Builder.Default
    private Boolean ativo = true;

    @Column(name = "ultimo_uso_em")
    private LocalDateTime ultimoUsoEm;

    /** Null = never expires. */
    @Column(name = "expira_em")
    private LocalDateTime expiraEm;

    @CreatedDate
    @Column(name = "criado_em", nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    @LastModifiedDate
    @Column(name = "atualizado_em", nullable = false)
    private LocalDateTime atualizadoEm;

    // ── Helpers ──────────────────────────────────────────────────────────────

    public List<String> escoposList() {
        return Arrays.asList(escopos.split(","));
    }

    public boolean hasScope(String scope) {
        return escoposList().contains(scope);
    }

    public boolean isExpired() {
        return expiraEm != null && LocalDateTime.now().isAfter(expiraEm);
    }

    public boolean isValid() {
        return Boolean.TRUE.equals(ativo) && !isExpired();
    }
}
