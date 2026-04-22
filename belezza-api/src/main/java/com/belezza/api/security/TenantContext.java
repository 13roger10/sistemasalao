package com.belezza.api.security;

/**
 * ThreadLocal holder for the current request's salon (tenant) ID.
 * Populated by JwtAuthenticationFilter after JWT validation.
 * Must be cleared in the filter's finally block to avoid thread pool leaks.
 */
public final class TenantContext {

    private static final ThreadLocal<Long> CURRENT_TENANT = new ThreadLocal<>();

    private TenantContext() {}

    public static void setCurrentTenant(Long salonId) {
        CURRENT_TENANT.set(salonId);
    }

    public static Long getCurrentTenant() {
        return CURRENT_TENANT.get();
    }

    public static void clear() {
        CURRENT_TENANT.remove();
    }
}
