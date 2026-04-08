package com.belezza.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Fornecedor de produtos do salão.
 */
@Entity
@Table(name = "fornecedores", indexes = {
    @Index(name = "idx_fornecedor_salon", columnList = "salon_id"),
    @Index(name = "idx_fornecedor_cnpj", columnList = "cnpj"),
    @Index(name = "idx_fornecedor_ativo", columnList = "ativo")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Fornecedor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String nome;

    @Column(length = 150)
    private String nomeFantasia;

    @Column(length = 20)
    private String cnpj;

    @Column(length = 100)
    private String contatoNome;

    @Column(length = 20)
    private String telefone;

    @Column(length = 255)
    private String email;

    @Column(length = 255)
    private String website;

    @Column(length = 300)
    private String endereco;

    @Column(length = 100)
    private String cidade;

    @Column(length = 2)
    private String estado;

    @Column(length = 10)
    private String cep;

    @Column(length = 200)
    private String condicoesPagamento;

    @Column(length = 500)
    private String observacoes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "salon_id", nullable = false)
    private Salon salon;

    @Column(nullable = false)
    @Builder.Default
    private int totalCompras = 0;

    private LocalDateTime ultimaCompra;

    @Column(nullable = false)
    @Builder.Default
    private boolean ativo = true;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime atualizadoEm;
}
