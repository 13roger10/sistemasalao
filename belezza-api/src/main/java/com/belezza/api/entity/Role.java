package com.belezza.api.entity;

/**
 * User roles in the Belezza system.
 *
 * <ul>
 *   <li>ADMIN - Salon owner with full access</li>
 *   <li>PROFISSIONAL - Employee/professional with limited access</li>
 *   <li>CLIENTE - Customer with minimal access</li>
 * </ul>
 */
public enum Role {

    ADMIN("ROLE_ADMIN", "Administrador do Salão"),
    PROFISSIONAL("ROLE_PROFISSIONAL", "Profissional/Funcionário"),
    CLIENTE("ROLE_CLIENTE", "Cliente");

    private final String authority;
    private final String description;

    Role(String authority, String description) {
        this.authority = authority;
        this.description = description;
    }

    public String getAuthority() {
        return authority;
    }

    public String getDescription() {
        return description;
    }
}
