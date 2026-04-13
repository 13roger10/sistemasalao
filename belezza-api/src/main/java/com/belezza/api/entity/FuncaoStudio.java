package com.belezza.api.entity;

/**
 * Studio-level role for a team member inside a specific salon's Social Studio.
 *
 * <p>Hierarchy (highest → lowest): PROPRIETARIO > GESTOR > EDITOR > VISUALIZADOR.
 *
 * <p>System-level {@link Role#ADMIN} always bypasses these checks.
 */
public enum FuncaoStudio {

    /** Full access: manage team, connect/disconnect social accounts, publish, edit, view. */
    PROPRIETARIO(4),

    /** Can publish, schedule, create/edit posts and view analytics.  Cannot manage the team. */
    GESTOR(3),

    /** Can create, edit and schedule draft posts.  Cannot publish directly. */
    EDITOR(2),

    /** Read-only: can see posts, scheduled content and analytics. */
    VISUALIZADOR(1);

    /** Numeric level used to compare roles (higher = more privilege). */
    private final int nivel;

    FuncaoStudio(int nivel) {
        this.nivel = nivel;
    }

    /** Returns {@code true} if this role has at least the same privilege as {@code minimo}. */
    public boolean temAcesso(FuncaoStudio minimo) {
        return this.nivel >= minimo.nivel;
    }

    public int getNivel() {
        return nivel;
    }
}
