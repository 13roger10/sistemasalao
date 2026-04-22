/**
 * Testes de isolamento de dados por profissional.
 *
 * Valida que as funções de filtro usadas nos componentes
 * (appointments, commission, reviews, clients) isolam corretamente
 * os dados pelo professionalId do usuário logado.
 *
 * Todas as funções são pure-logic — sem React, sem mocks de módulo.
 */

// ---------------------------------------------------------------------------
// Tipos mínimos necessários para os testes
// ---------------------------------------------------------------------------

interface Appointment {
  id: string;
  professionalId: string;
  clientName: string;
}

interface Commission {
  id: string;
  professionalId: string;
  amount: number;
}

interface Review {
  id: string;
  professionalId: string;
  rating: number;
}

interface Professional {
  id: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Funções de filtro (replicam a lógica dos componentes)
// ---------------------------------------------------------------------------

/**
 * Replica o filtro de appointments/page.tsx:
 *   const effectiveProfId = user.role === 'PROFESSIONAL'
 *     ? (user.professionalId ?? selectedProfessionalId)
 *     : selectedProfessionalId;
 *   const final = effectiveProfId
 *     ? list.filter(a => a.professionalId === String(effectiveProfId))
 *     : list;
 */
function filterAppointments(
  list: Appointment[],
  role: string,
  professionalId: string | undefined,
  selectedProfessionalId: string | null,
): Appointment[] {
  const effectiveProfId =
    role === "PROFESSIONAL"
      ? (professionalId ?? selectedProfessionalId)
      : selectedProfessionalId;

  return effectiveProfId
    ? list.filter((a) => a.professionalId === String(effectiveProfId))
    : list;
}

/**
 * Replica o filtro de displayProfessionals (appointments/page.tsx useMemo):
 *   if (role === 'PROFESSIONAL' && professionalId)
 *     return professionals.filter(p => p.id === String(professionalId));
 */
function filterProfessionalsList(
  professionals: Professional[],
  role: string,
  professionalId: string | undefined,
  selectedProfessionalId: string | null,
): Professional[] {
  if (role === "PROFESSIONAL" && professionalId) {
    return professionals.filter((p) => p.id === String(professionalId));
  }
  if (selectedProfessionalId) {
    return professionals.filter((p) => p.id === selectedProfessionalId);
  }
  return professionals;
}

/**
 * Replica o filtro de commission/page.tsx:
 *   const filtered = isProfessional && user.professionalId
 *     ? data.filter(c => c.professionalId === String(user.professionalId))
 *     : data;
 */
function filterCommissions(
  list: Commission[],
  role: string,
  professionalId: string | undefined,
): Commission[] {
  const isProfessional = role === "PROFESSIONAL";
  return isProfessional && professionalId
    ? list.filter((c) => c.professionalId === String(professionalId))
    : list;
}

/**
 * Replica o filtro de reviews/page.tsx (dentro do useMemo filteredReviews):
 *   if (isProfessional && user.professionalId &&
 *       review.professionalId !== String(user.professionalId)) return false;
 */
function filterReviews(
  list: Review[],
  role: string,
  professionalId: string | undefined,
): Review[] {
  const isProfessional = role === "PROFESSIONAL";
  if (!isProfessional || !professionalId) return list;
  return list.filter(
    (r) => r.professionalId === String(professionalId),
  );
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const APPOINTMENTS: Appointment[] = [
  { id: "a1", professionalId: "10", clientName: "Alice" },
  { id: "a2", professionalId: "10", clientName: "Bob" },
  { id: "a3", professionalId: "20", clientName: "Carol" },
  { id: "a4", professionalId: "30", clientName: "Dave" },
];

const PROFESSIONALS: Professional[] = [
  { id: "10", name: "Carlos" },
  { id: "20", name: "Ana" },
  { id: "30", name: "Roberto" },
];

const COMMISSIONS: Commission[] = [
  { id: "c1", professionalId: "10", amount: 100 },
  { id: "c2", professionalId: "10", amount: 150 },
  { id: "c3", professionalId: "20", amount: 200 },
];

const REVIEWS: Review[] = [
  { id: "r1", professionalId: "10", rating: 5 },
  { id: "r2", professionalId: "20", rating: 4 },
  { id: "r3", professionalId: "10", rating: 3 },
];

// ---------------------------------------------------------------------------
// filterAppointments
// ---------------------------------------------------------------------------

describe("filterAppointments — isolamento PROFESSIONAL", () => {
  it("retorna apenas agendamentos do próprio profissional", () => {
    const result = filterAppointments(APPOINTMENTS, "PROFESSIONAL", "10", null);
    expect(result).toHaveLength(2);
    result.forEach((a) => expect(a.professionalId).toBe("10"));
  });

  it("não retorna agendamentos de outros profissionais", () => {
    const result = filterAppointments(APPOINTMENTS, "PROFESSIONAL", "10", null);
    expect(result.find((a) => a.professionalId === "20")).toBeUndefined();
    expect(result.find((a) => a.professionalId === "30")).toBeUndefined();
  });

  it("ignora selectedProfessionalId quando role é PROFESSIONAL", () => {
    // selectedProfessionalId aponta para profissional 20, mas o usuário é profissional 10
    const result = filterAppointments(APPOINTMENTS, "PROFESSIONAL", "10", "20");
    result.forEach((a) => expect(a.professionalId).toBe("10"));
  });

  it("retorna lista vazia se profissional não tem agendamentos", () => {
    const result = filterAppointments(APPOINTMENTS, "PROFESSIONAL", "99", null);
    expect(result).toHaveLength(0);
  });
});

describe("filterAppointments — ADMIN vê todos", () => {
  it("sem filtro selecionado: retorna todos", () => {
    const result = filterAppointments(APPOINTMENTS, "ADMIN", undefined, null);
    expect(result).toHaveLength(APPOINTMENTS.length);
  });

  it("com filtro selecionado: aplica filtro normalmente", () => {
    const result = filterAppointments(APPOINTMENTS, "ADMIN", undefined, "20");
    expect(result).toHaveLength(1);
    expect(result[0].professionalId).toBe("20");
  });
});

describe("filterAppointments — RECEPCIONIST vê todos (sem filtro)", () => {
  it("sem filtro selecionado: retorna todos", () => {
    const result = filterAppointments(APPOINTMENTS, "RECEPCIONIST", undefined, null);
    expect(result).toHaveLength(APPOINTMENTS.length);
  });
});

// ---------------------------------------------------------------------------
// filterProfessionalsList
// ---------------------------------------------------------------------------

describe("filterProfessionalsList — isolamento PROFESSIONAL", () => {
  it("retorna apenas o próprio profissional", () => {
    const result = filterProfessionalsList(PROFESSIONALS, "PROFESSIONAL", "10", null);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("10");
  });

  it("não inclui profissionais de outros IDs", () => {
    const result = filterProfessionalsList(PROFESSIONALS, "PROFESSIONAL", "10", null);
    expect(result.find((p) => p.id === "20")).toBeUndefined();
    expect(result.find((p) => p.id === "30")).toBeUndefined();
  });

  it("retorna lista vazia se próprio ID não está na lista", () => {
    const result = filterProfessionalsList(PROFESSIONALS, "PROFESSIONAL", "99", null);
    expect(result).toHaveLength(0);
  });
});

describe("filterProfessionalsList — ADMIN vê todos", () => {
  it("sem filtro: retorna todos os profissionais", () => {
    const result = filterProfessionalsList(PROFESSIONALS, "ADMIN", undefined, null);
    expect(result).toHaveLength(PROFESSIONALS.length);
  });

  it("com filtro: aplica filtro normalmente", () => {
    const result = filterProfessionalsList(PROFESSIONALS, "ADMIN", undefined, "20");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("20");
  });
});

// ---------------------------------------------------------------------------
// filterCommissions
// ---------------------------------------------------------------------------

describe("filterCommissions — isolamento PROFESSIONAL", () => {
  it("retorna apenas comissões do próprio profissional", () => {
    const result = filterCommissions(COMMISSIONS, "PROFESSIONAL", "10");
    expect(result).toHaveLength(2);
    result.forEach((c) => expect(c.professionalId).toBe("10"));
  });

  it("não inclui comissões de outros profissionais", () => {
    const result = filterCommissions(COMMISSIONS, "PROFESSIONAL", "10");
    expect(result.find((c) => c.professionalId === "20")).toBeUndefined();
  });

  it("retorna lista vazia se profissional sem comissões", () => {
    const result = filterCommissions(COMMISSIONS, "PROFESSIONAL", "99");
    expect(result).toHaveLength(0);
  });
});

describe("filterCommissions — ADMIN vê todas", () => {
  it("retorna todas as comissões sem filtro", () => {
    const result = filterCommissions(COMMISSIONS, "ADMIN", undefined);
    expect(result).toHaveLength(COMMISSIONS.length);
  });
});

describe("filterCommissions — RECEPCIONIST vê todas", () => {
  it("retorna todas as comissões sem filtro", () => {
    const result = filterCommissions(COMMISSIONS, "RECEPCIONIST", undefined);
    expect(result).toHaveLength(COMMISSIONS.length);
  });
});

// ---------------------------------------------------------------------------
// filterReviews
// ---------------------------------------------------------------------------

describe("filterReviews — isolamento PROFESSIONAL", () => {
  it("retorna apenas avaliações do próprio profissional", () => {
    const result = filterReviews(REVIEWS, "PROFESSIONAL", "10");
    expect(result).toHaveLength(2);
    result.forEach((r) => expect(r.professionalId).toBe("10"));
  });

  it("não inclui avaliações de outros profissionais", () => {
    const result = filterReviews(REVIEWS, "PROFESSIONAL", "10");
    expect(result.find((r) => r.professionalId === "20")).toBeUndefined();
  });

  it("retorna lista vazia se profissional sem avaliações", () => {
    const result = filterReviews(REVIEWS, "PROFESSIONAL", "99");
    expect(result).toHaveLength(0);
  });
});

describe("filterReviews — ADMIN vê todas", () => {
  it("retorna todas as avaliações sem filtro", () => {
    const result = filterReviews(REVIEWS, "ADMIN", undefined);
    expect(result).toHaveLength(REVIEWS.length);
  });
});

// ---------------------------------------------------------------------------
// Invariantes cross-role
// ---------------------------------------------------------------------------

describe("Invariantes cross-role de isolamento", () => {
  it("PROFESSIONAL nunca vê mais dados que ADMIN (appointments)", () => {
    const adminResult = filterAppointments(APPOINTMENTS, "ADMIN", undefined, null);
    const profResult = filterAppointments(APPOINTMENTS, "PROFESSIONAL", "10", null);
    expect(profResult.length).toBeLessThanOrEqual(adminResult.length);
  });

  it("PROFESSIONAL nunca vê mais dados que ADMIN (commissions)", () => {
    const adminResult = filterCommissions(COMMISSIONS, "ADMIN", undefined);
    const profResult = filterCommissions(COMMISSIONS, "PROFESSIONAL", "10");
    expect(profResult.length).toBeLessThanOrEqual(adminResult.length);
  });

  it("PROFESSIONAL nunca vê mais dados que ADMIN (reviews)", () => {
    const adminResult = filterReviews(REVIEWS, "ADMIN", undefined);
    const profResult = filterReviews(REVIEWS, "PROFESSIONAL", "10");
    expect(profResult.length).toBeLessThanOrEqual(adminResult.length);
  });

  it("dados de um PROFESSIONAL não aparecem na visão isolada de outro PROFESSIONAL", () => {
    const prof10 = filterAppointments(APPOINTMENTS, "PROFESSIONAL", "10", null);
    const prof20 = filterAppointments(APPOINTMENTS, "PROFESSIONAL", "20", null);

    const ids10 = new Set(prof10.map((a) => a.id));
    const ids20 = new Set(prof20.map((a) => a.id));

    // Interseção deve ser vazia
    const intersection = [...ids10].filter((id) => ids20.has(id));
    expect(intersection).toHaveLength(0);
  });

  it("união de todos os PROFESSIONALS cobre todos os agendamentos (sem gaps)", () => {
    const prof10 = filterAppointments(APPOINTMENTS, "PROFESSIONAL", "10", null);
    const prof20 = filterAppointments(APPOINTMENTS, "PROFESSIONAL", "20", null);
    const prof30 = filterAppointments(APPOINTMENTS, "PROFESSIONAL", "30", null);

    const allIds = new Set([
      ...prof10.map((a) => a.id),
      ...prof20.map((a) => a.id),
      ...prof30.map((a) => a.id),
    ]);

    expect(allIds.size).toBe(APPOINTMENTS.length);
  });
});
