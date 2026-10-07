package com.belezza.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

/**
 * User entity representing all types of users in the system.
 */
@Entity
@Table(name = "usuarios", indexes = {
    @Index(name = "idx_usuario_email", columnList = "email", unique = true),
    @Index(name = "idx_usuario_telefone", columnList = "telefone")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Usuario implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    // SEC-020: nunca serializar a senha (hash) em JSON — evita vazamento em audit logs
    // e em qualquer serialização acidental da entidade.
    @JsonIgnore
    @Column(nullable = false)
    private String password;

    /**
     * Momento da última troca de senha, truncado ao segundo como o {@code iat} do JWT. Tokens
     * emitidos antes dele são recusados (BUG-016): antes, quem tivesse roubado a sessão continuava
     * dentro mesmo depois de a vítima trocar a senha. Nulo = senha nunca trocada.
     */
    @JsonIgnore
    @Column(name = "senha_alterada_em")
    private LocalDateTime senhaAlteradaEm;

    /** Grava a nova senha (já codificada) e invalida as sessões abertas antes dela. */
    public void trocarSenha(String senhaCodificada) {
        this.password = senhaCodificada;
        this.senhaAlteradaEm = LocalDateTime.now().truncatedTo(java.time.temporal.ChronoUnit.SECONDS);
    }

    /** Conta de auto-cadastro que ainda não abriu o link de confirmação enviado por e-mail. */
    public boolean confirmacaoDeEmailPendente() {
        return !emailVerificado && emailVerificationToken != null;
    }

    /** O token emitido em {@code emitidoEm} é anterior à última troca de senha? */
    public boolean tokenAnteriorATrocaDeSenha(java.util.Date emitidoEm) {
        if (senhaAlteradaEm == null || emitidoEm == null) {
            return false;
        }
        LocalDateTime emissao = LocalDateTime.ofInstant(emitidoEm.toInstant(), java.time.ZoneId.systemDefault());
        return emissao.isBefore(senhaAlteradaEm);
    }

    @Column(nullable = false, length = 100)
    private String nome;

    @Column(length = 20)
    private String telefone;

    // WhatsApp e aniversário: obrigatórios no cadastro de novos usuários (todos os perfis)
    @Column(length = 20)
    private String whatsapp;

    private java.time.LocalDate dataNascimento;

    @Column(length = 500)
    private String avatarUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    /**
     * Salão ao qual este usuário pertence. Usado para RECEPCIONISTA (que não tem
     * uma entidade própria como Profissional/Cliente) para saber a quem notificar
     * e escopar dados por salão. Nulo para ADMIN (dono, via Salon.admin) e para
     * PROFISSIONAL/CLIENTE (que já têm o vínculo pelas suas próprias entidades).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "salon_id")
    private Salon salon;

    /**
     * Unidade em que o ADMIN está trabalhando (ele pode ter várias). Define o salão do token no
     * login e na renovação da sessão; nula enquanto ele não troca de unidade (vale a primeira).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unidade_ativa_id")
    private Salon unidadeAtiva;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Plano plano = Plano.FREE;

    @Column(nullable = false)
    @Builder.Default
    private boolean ativo = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean emailVerificado = false;

    // SEC-020: tokens sensíveis nunca devem ser serializados em JSON.
    @JsonIgnore
    @Column(length = 100)
    private String resetPasswordToken;

    private LocalDateTime resetPasswordExpires;

    @JsonIgnore
    @Column(length = 100)
    private String emailVerificationToken;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime atualizadoEm;

    private LocalDateTime ultimoLogin;

    /** Senhas (ou códigos 2FA) erradas seguidas desde o último login certo. */
    @JsonIgnore
    @Column(name = "tentativas_login_falhas", nullable = false)
    @Builder.Default
    private int tentativasLoginFalhas = 0;

    /**
     * Conta bloqueada por excesso de senhas erradas: só volta com a redefinição de senha ou o
     * desbloqueio pelo admin. Nulo = não bloqueada.
     */
    @Column(name = "login_bloqueado_em")
    private LocalDateTime loginBloqueadoEm;

    // 2FA / TOTP fields
    // SEC-020: o segredo TOTP nunca deve ser serializado em JSON.
    @JsonIgnore
    @Column(length = 255)
    private String totpSecret;

    @Column(nullable = false)
    @Builder.Default
    private boolean totpEnabled = false;

    /** BUG-017: todo e-mail vai para o banco em minúsculas e sem espaços, venha de onde vier. */
    @PrePersist
    @PreUpdate
    void normalizarEmail() {
        if (email != null) {
            email = email.trim().toLowerCase();
        }
    }

    // UserDetails implementation

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority(role.getAuthority()));
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return ativo;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return ativo;
    }
}
