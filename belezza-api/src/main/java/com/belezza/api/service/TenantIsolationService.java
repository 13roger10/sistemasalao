package com.belezza.api.service;

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
}
