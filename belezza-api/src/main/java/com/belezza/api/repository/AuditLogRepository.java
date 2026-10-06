package com.belezza.api.repository;

import com.belezza.api.entity.AuditLog;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Locale;

/**
 * Repository for AuditLog entity.
 *
 * <p>Toda consulta deve partir de {@link #doSalao(Long)}: as consultas antigas (findAll, por
 * usuário, por ação…) não filtravam o salão e mostravam a qualquer admin as ações de todos os
 * salões (BUG-006). Os filtros opcionais são Specifications, e não JPQL com
 * {@code :param IS NULL}, que dava 500 no PostgreSQL com parâmetro nulo (BUG-020).
 */
@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long>, JpaSpecificationExecutor<AuditLog> {

    static Specification<AuditLog> doSalao(Long salonId) {
        return (root, query, cb) -> cb.equal(root.get("salonId"), salonId);
    }

    static Specification<AuditLog> usuario(Long usuarioId) {
        return usuarioId == null ? null : (root, query, cb) -> cb.equal(root.get("usuarioId"), usuarioId);
    }

    /** Entidade sem diferenciar maiúsculas (o front envia "client", o log grava "Cliente"). */
    static Specification<AuditLog> entidade(String entidade) {
        return vazio(entidade) ? null
                : (root, query, cb) -> cb.equal(cb.lower(root.get("entidade")), entidade.toLowerCase(Locale.ROOT));
    }

    static Specification<AuditLog> entidadeId(Long entidadeId) {
        return entidadeId == null ? null : (root, query, cb) -> cb.equal(root.get("entidadeId"), entidadeId);
    }

    static Specification<AuditLog> acao(String acao) {
        return vazio(acao) ? null
                : (root, query, cb) -> cb.equal(cb.upper(root.get("acao")), acao.toUpperCase(Locale.ROOT));
    }

    static Specification<AuditLog> desde(LocalDateTime inicio) {
        return inicio == null ? null : (root, query, cb) -> cb.greaterThanOrEqualTo(root.get("criadoEm"), inicio);
    }

    static Specification<AuditLog> ate(LocalDateTime fim) {
        return fim == null ? null : (root, query, cb) -> cb.lessThanOrEqualTo(root.get("criadoEm"), fim);
    }

    static Specification<AuditLog> falhas() {
        return (root, query, cb) -> cb.isFalse(root.get("sucesso"));
    }

    /** Texto livre em usuário, entidade e detalhes. */
    static Specification<AuditLog> texto(String termo) {
        if (vazio(termo)) {
            return null;
        }
        String like = "%" + termo.toLowerCase(Locale.ROOT) + "%";
        return (root, query, cb) -> cb.or(
                cb.like(cb.lower(root.get("usuarioNome")), like),
                cb.like(cb.lower(root.get("entidade")), like),
                cb.like(cb.lower(root.get("detalhes")), like));
    }

    private static boolean vazio(String s) {
        return s == null || s.isBlank();
    }
}
