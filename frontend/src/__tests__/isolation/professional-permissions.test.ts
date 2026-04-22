/**
 * Testes de isolamento de permissões por perfil.
 *
 * Garante que PROFESSIONAL não tem acesso a permissões administrativas
 * e que a separação entre roles está correta conforme implementado em
 * src/types/salon/auth.ts.
 */

import {
  AUTH_ROLE_PERMISSIONS,
  AUTH_ROLE_LABELS,
} from "@/types/salon/auth";

// ---------------------------------------------------------------------------
// PROFESSIONAL
// ---------------------------------------------------------------------------

describe("Permissões do perfil PROFESSIONAL", () => {
  const permissions = AUTH_ROLE_PERMISSIONS.PROFESSIONAL;

  // --- Dashboard ---
  it("não deve ter dashboard.view (dashboard geral do salão)", () => {
    expect(permissions).not.toContain("dashboard.view");
  });

  it("não deve ter dashboard.view_full", () => {
    expect(permissions).not.toContain("dashboard.view_full");
  });

  // --- Financeiro ---
  it("não deve ter permissões financeiras globais", () => {
    expect(permissions).not.toContain("finance.view");
    expect(permissions).not.toContain("finance.view_all");
    expect(permissions).not.toContain("finance.register_payment");
    expect(permissions).not.toContain("finance.manage_cash");
    expect(permissions).not.toContain("finance.export_reports");
    expect(permissions).not.toContain("finance.view_commissions");
  });

  // --- Usuários ---
  it("não deve ter permissões de gestão de usuários", () => {
    expect(permissions).not.toContain("users.view");
    expect(permissions).not.toContain("users.create");
    expect(permissions).not.toContain("users.edit");
    expect(permissions).not.toContain("users.delete");
    expect(permissions).not.toContain("users.manage_roles");
  });

  // --- Profissionais ---
  it("não deve poder criar, editar ou excluir outros profissionais", () => {
    expect(permissions).not.toContain("professionals.create");
    expect(permissions).not.toContain("professionals.edit");
    expect(permissions).not.toContain("professionals.delete");
  });

  it("não deve ver comissões de outros profissionais", () => {
    expect(permissions).not.toContain("professionals.view_commissions");
  });

  // --- Agendamentos ---
  it("não deve ter agendamentos.view_all (todos os profissionais)", () => {
    expect(permissions).not.toContain("appointments.view_all");
  });

  it("não deve poder criar ou editar agendamentos de outros", () => {
    expect(permissions).not.toContain("appointments.create");
    expect(permissions).not.toContain("appointments.edit");
    expect(permissions).not.toContain("appointments.cancel");
    expect(permissions).not.toContain("appointments.manage_waitlist");
  });

  // --- Comissões ---
  it("não deve ver comissões de todos os profissionais", () => {
    expect(permissions).not.toContain("commissions.view_all");
  });

  it("não deve gerenciar nem pagar comissões", () => {
    expect(permissions).not.toContain("commissions.manage");
    expect(permissions).not.toContain("commissions.pay");
  });

  // --- Marketing / Fidelidade ---
  it("não deve ter permissões de promoções", () => {
    expect(permissions).not.toContain("promotions.create");
    expect(permissions).not.toContain("promotions.edit");
    expect(permissions).not.toContain("promotions.delete");
    expect(permissions).not.toContain("promotions.manage_campaigns");
  });

  it("não deve gerenciar fidelidade", () => {
    expect(permissions).not.toContain("loyalty.manage");
  });

  // --- Estoque ---
  it("não deve ter acesso a estoque", () => {
    expect(permissions).not.toContain("stock.view");
    expect(permissions).not.toContain("stock.manage");
    expect(permissions).not.toContain("stock.register_movement");
  });

  // --- Sistema ---
  it("não deve ter permissões de sistema", () => {
    expect(permissions).not.toContain("system.settings");
    expect(permissions).not.toContain("system.backup");
    expect(permissions).not.toContain("system.logs");
  });

  // --- Multi-unidade ---
  it("não deve ter acesso a múltiplas unidades", () => {
    expect(permissions).not.toContain("units.view_all");
    expect(permissions).not.toContain("units.manage");
  });

  // --- Permissões devidas ---
  it("deve ter exatamente as permissões necessárias para sua área de trabalho", () => {
    expect(permissions).toContain("appointments.view");
    expect(permissions).toContain("appointments.confirm");
    expect(permissions).toContain("appointments.complete");
    expect(permissions).toContain("commissions.view");
    expect(permissions).toContain("reviews.view");
    expect(permissions).toContain("clients.view");
    expect(permissions).toContain("clients.view_history");
    expect(permissions).toContain("services.view");
  });

  it("conjunto de permissões não deve crescer sem revisão intencional", () => {
    // Trava o número de permissões para evitar expansão acidental.
    // Se adicionar permissões intencionalmente, atualize este número.
    expect(permissions).toHaveLength(8);
  });
});

// ---------------------------------------------------------------------------
// ADMIN
// ---------------------------------------------------------------------------

describe("Permissões do perfil ADMIN", () => {
  const permissions = AUTH_ROLE_PERMISSIONS.ADMIN;

  it("deve ter acesso ao dashboard completo", () => {
    expect(permissions).toContain("dashboard.view");
    expect(permissions).toContain("dashboard.view_full");
  });

  it("deve ter todas as permissões financeiras", () => {
    expect(permissions).toContain("finance.view");
    expect(permissions).toContain("finance.view_all");
    expect(permissions).toContain("finance.register_payment");
    expect(permissions).toContain("finance.manage_cash");
    expect(permissions).toContain("finance.export_reports");
  });

  it("deve ter permissões de sistema", () => {
    expect(permissions).toContain("system.settings");
    expect(permissions).toContain("system.backup");
    expect(permissions).toContain("system.logs");
  });

  it("deve ter acesso completo a agendamentos", () => {
    expect(permissions).toContain("appointments.view");
    expect(permissions).toContain("appointments.view_all");
    expect(permissions).toContain("appointments.create");
    expect(permissions).toContain("appointments.edit");
    expect(permissions).toContain("appointments.cancel");
  });

  it("deve poder pagar comissões", () => {
    expect(permissions).toContain("commissions.manage");
    expect(permissions).toContain("commissions.pay");
    expect(permissions).toContain("commissions.view_all");
  });
});

// ---------------------------------------------------------------------------
// RECEPCIONIST
// ---------------------------------------------------------------------------

describe("Permissões do perfil RECEPCIONIST", () => {
  const permissions = AUTH_ROLE_PERMISSIONS.RECEPCIONIST;

  it("deve ter dashboard.view mas não dashboard.view_full", () => {
    expect(permissions).toContain("dashboard.view");
    expect(permissions).not.toContain("dashboard.view_full");
  });

  it("não deve ter permissões de sistema", () => {
    expect(permissions).not.toContain("system.settings");
    expect(permissions).not.toContain("system.backup");
    expect(permissions).not.toContain("system.logs");
  });

  it("não deve pagar comissões", () => {
    expect(permissions).not.toContain("commissions.pay");
    expect(permissions).not.toContain("commissions.manage");
  });
});

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

describe("AUTH_ROLE_LABELS", () => {
  it("todos os roles têm rótulo em português", () => {
    expect(AUTH_ROLE_LABELS.ADMIN).toBe("Administrador");
    expect(AUTH_ROLE_LABELS.RECEPCIONIST).toBe("Recepcionista");
    expect(AUTH_ROLE_LABELS.PROFESSIONAL).toBe("Profissional");
    expect(AUTH_ROLE_LABELS.CLIENT).toBe("Cliente");
  });
});
