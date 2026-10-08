package com.belezza.api.service;

import com.belezza.api.entity.Role;
import com.belezza.api.entity.Usuario;
import com.belezza.api.security.TenantContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

/**
 * Validates that the entity being accessed belongs to the current request's tenant (salon).
 * Uses TenantContext populated by JwtAuthenticationFilter.
 * No-op when TenantContext is empty (unauthenticated / public routes).
 */
@Service
@Slf4j
public class TenantIsolationService {

    /**
     * Asserts that entitySalonId matches the current tenant.
     * Throws AccessDeniedException if they differ.
     */
    public void assertCurrentTenant(Long entitySalonId) {
        Long currentTenant = TenantContext.getCurrentTenant();
        if (currentTenant == null || entitySalonId == null) {
            // No tenant context (public route or CLIENTE without fixed salon) — allow
            return;
        }
        if (!currentTenant.equals(entitySalonId)) {
            log.warn("Tenant isolation violation: current={}, entity={}", currentTenant, entitySalonId);
            throw new AccessDeniedException("Acesso negado: recurso pertence a outro estabelecimento");
        }
    }

    /**
     * Asserts that the requested salonId matches the current tenant.
     * Use when a controller receives a salonId path/query param.
     */
    public void assertRequestedSalon(Long requestedSalonId) {
        assertCurrentTenant(requestedSalonId);
    }

    /**
     * Strict variant for staff-only routes (ADMIN/PROFISSIONAL/RECEPCIONISTA): unlike
     * {@link #assertCurrentTenant}, a missing tenant is a denial, not an allow — a staff token
     * without a salonId (e.g. an ADMIN who has not created a salon yet) must not read or change
     * any salon's data.
     */
    public void assertStaffTenant(Long salonId) {
        Long currentTenant = TenantContext.getCurrentTenant();
        if (currentTenant == null || salonId == null || !currentTenant.equals(salonId)) {
            log.warn("Tenant isolation violation (staff): current={}, entity={}", currentTenant, salonId);
            throw new AccessDeniedException("Acesso negado: recurso pertence a outro estabelecimento");
        }
    }

    /**
     * BUG-E2E-001: variante ciente do papel para rotas que servem tanto a equipe quanto o público
     * (ex.: listar profissionais de um salão, usada no agendamento online).
     *
     * <ul>
     *   <li><b>Equipe</b> (ADMIN/PROFISSIONAL/RECEPCIONISTA): {@link #assertStaffTenant} — precisa
     *       de um salão no token e só acessa o próprio. Fecha o furo em que um token de equipe sem
     *       {@code salonId} (ex.: admin antes de criar o salão) lia qualquer salão pelo ID.</li>
     *   <li><b>Cliente/anônimo</b>: {@link #assertCurrentTenant} (lenient) — pode ver o subconjunto
     *       público; os dados sensíveis (contato) já são ocultados na resposta pelo controller.</li>
     * </ul>
     */
    public void assertStaffRequestedSalon(Long salonId, Usuario quem) {
        boolean equipe = quem != null && quem.getRole() != Role.CLIENTE;
        if (equipe) {
            assertStaffTenant(salonId);
        } else {
            assertCurrentTenant(salonId);
        }
    }
}
