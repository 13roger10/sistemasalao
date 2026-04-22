/**
 * Testes de proteção de rotas para o perfil PROFESSIONAL.
 *
 * Valida que SalonProtectedRoute:
 *   1. Redireciona para /salon/login quando não autenticado
 *   2. Redireciona PROFESSIONAL para /salon/professional ao acessar página de ADMIN
 *   3. Permite PROFESSIONAL acessar páginas de PROFESSIONAL
 *   4. Permite ADMIN acessar páginas de ADMIN
 *   5. Redireciona PROFESSIONAL corretamente (não para /salon/dashboard)
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { SalonProtectedRoute } from "@/components/auth/SalonProtectedRoute";

// ---------------------------------------------------------------------------
// Mock de useSalonAuth
// ---------------------------------------------------------------------------

jest.mock("@/contexts/SalonAuthContext");

import { useSalonAuth } from "@/contexts/SalonAuthContext";

const mockUseSalonAuth = useSalonAuth as jest.MockedFunction<typeof useSalonAuth>;

// ---------------------------------------------------------------------------
// Mock de next/navigation com instância compartilhada
// ---------------------------------------------------------------------------

const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
};

jest.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

/** Retorna as chamadas de router.push() capturadas */
function getPushCalls(): string[] {
  return mockPush.mock.calls.map(([path]: [string]) => path);
}

beforeEach(() => {
  mockPush.mockClear();
});

/** Constrói um usuário PROFESSIONAL mínimo */
function makeProfessionalUser(professionalId = "42") {
  return {
    id: "user-1",
    email: "carlos@salon.com",
    name: "Carlos",
    role: "PROFESSIONAL" as const,
    permissions: [
      "appointments.view",
      "appointments.confirm",
      "appointments.complete",
      "commissions.view",
      "reviews.view",
      "clients.view",
      "clients.view_history",
      "services.view",
    ] as import("@/types/salon/auth").AuthPermission[],
    professionalId,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/** Constrói um usuário ADMIN mínimo */
function makeAdminUser() {
  return {
    id: "user-2",
    email: "admin@salon.com",
    name: "Admin",
    role: "ADMIN" as const,
    permissions: [
      "dashboard.view",
      "dashboard.view_full",
      "system.settings",
    ] as import("@/types/salon/auth").AuthPermission[],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/** Monta estado "carregando" */
function mockLoading() {
  mockUseSalonAuth.mockReturnValue({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    can: jest.fn().mockReturnValue(false),
    canAll: jest.fn().mockReturnValue(false),
    canAny: jest.fn().mockReturnValue(false),
    isRole: jest.fn().mockReturnValue(false),
    logout: jest.fn(),
    login: jest.fn(),
    refreshAuth: jest.fn(),
  } as unknown as ReturnType<typeof useSalonAuth>);
}

/** Monta estado "não autenticado" */
function mockUnauthenticated() {
  mockUseSalonAuth.mockReturnValue({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    can: jest.fn().mockReturnValue(false),
    canAll: jest.fn().mockReturnValue(false),
    canAny: jest.fn().mockReturnValue(false),
    isRole: jest.fn().mockReturnValue(false),
    logout: jest.fn(),
    login: jest.fn(),
    refreshAuth: jest.fn(),
  } as unknown as ReturnType<typeof useSalonAuth>);
}

/** Monta estado autenticado com o usuário fornecido */
function mockAuthenticated(
  user: ReturnType<typeof makeProfessionalUser> | ReturnType<typeof makeAdminUser>,
) {
  const permissions = user.permissions;
  mockUseSalonAuth.mockReturnValue({
    user,
    isAuthenticated: true,
    isLoading: false,
    can: jest.fn((p: string) => permissions.includes(p as never)),
    canAll: jest.fn((ps: string[]) => ps.every((p) => permissions.includes(p as never))),
    canAny: jest.fn((ps: string[]) => ps.some((p) => permissions.includes(p as never))),
    isRole: jest.fn((r: string | string[]) => {
      const roles = Array.isArray(r) ? r : [r];
      return roles.includes(user.role);
    }),
    logout: jest.fn(),
    login: jest.fn(),
    refreshAuth: jest.fn(),
  } as unknown as ReturnType<typeof useSalonAuth>);
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe("SalonProtectedRoute — não autenticado", () => {
  it("redireciona para /salon/login quando não há sessão", () => {
    mockUnauthenticated();

    render(
      <SalonProtectedRoute requiredRole="PROFESSIONAL">
        <div>Conteúdo protegido</div>
      </SalonProtectedRoute>,
    );

    const pushCalls = getPushCalls();
    expect(pushCalls).toContain("/salon/login");
  });

  it("não exibe o conteúdo protegido", () => {
    mockUnauthenticated();

    render(
      <SalonProtectedRoute requiredRole="PROFESSIONAL">
        <div>Conteúdo secreto</div>
      </SalonProtectedRoute>,
    );

    expect(screen.queryByText("Conteúdo secreto")).not.toBeInTheDocument();
  });

  it("exibe mensagem de redirecionamento para login", () => {
    mockUnauthenticated();

    render(
      <SalonProtectedRoute requiredRole="ADMIN">
        <div>Admin area</div>
      </SalonProtectedRoute>,
    );

    expect(screen.getByText(/Redirecionando para login/i)).toBeInTheDocument();
  });
});

describe("SalonProtectedRoute — estado de carregamento", () => {
  it("exibe spinner enquanto verifica autenticação", () => {
    mockLoading();

    render(
      <SalonProtectedRoute requiredRole="PROFESSIONAL">
        <div>Conteúdo</div>
      </SalonProtectedRoute>,
    );

    expect(screen.getByText(/Verificando autenticação/i)).toBeInTheDocument();
    expect(screen.queryByText("Conteúdo")).not.toBeInTheDocument();
  });
});

describe("SalonProtectedRoute — PROFESSIONAL acessa página de ADMIN", () => {
  it("redireciona para /salon/professional (não para /salon/dashboard)", () => {
    mockAuthenticated(makeProfessionalUser());

    render(
      <SalonProtectedRoute requiredRole="ADMIN">
        <div>Dashboard Admin</div>
      </SalonProtectedRoute>,
    );

    const pushCalls = getPushCalls();
    expect(pushCalls).toContain("/salon/professional");
    expect(pushCalls).not.toContain("/salon/dashboard");
  });

  it("não exibe conteúdo da página de ADMIN", () => {
    mockAuthenticated(makeProfessionalUser());

    render(
      <SalonProtectedRoute requiredRole="ADMIN">
        <div>Área restrita ao Admin</div>
      </SalonProtectedRoute>,
    );

    expect(screen.queryByText("Área restrita ao Admin")).not.toBeInTheDocument();
  });
});

describe("SalonProtectedRoute — PROFESSIONAL acessa página de RECEPCIONIST+", () => {
  it("redireciona para /salon/professional ao tentar acessar página de RECEPCIONIST", () => {
    mockAuthenticated(makeProfessionalUser());

    render(
      <SalonProtectedRoute requiredRole={["ADMIN", "RECEPCIONIST"]}>
        <div>Área de recepção</div>
      </SalonProtectedRoute>,
    );

    const pushCalls = getPushCalls();
    expect(pushCalls).toContain("/salon/professional");
  });
});

describe("SalonProtectedRoute — PROFESSIONAL acessa sua própria área", () => {
  it("renderiza o conteúdo da página de PROFESSIONAL", () => {
    mockAuthenticated(makeProfessionalUser());

    render(
      <SalonProtectedRoute requiredRole="PROFESSIONAL">
        <div>Área do profissional</div>
      </SalonProtectedRoute>,
    );

    expect(screen.getByText("Área do profissional")).toBeInTheDocument();
  });

  it("não redireciona", () => {
    mockAuthenticated(makeProfessionalUser());

    render(
      <SalonProtectedRoute requiredRole="PROFESSIONAL">
        <div>Conteúdo profissional</div>
      </SalonProtectedRoute>,
    );

    const pushCalls = getPushCalls();
    expect(pushCalls).toHaveLength(0);
  });
});

describe("SalonProtectedRoute — PROFESSIONAL acessa página com roles múltiplas incluindo PROFESSIONAL", () => {
  it("permite acesso quando PROFESSIONAL está na lista de roles permitidas", () => {
    mockAuthenticated(makeProfessionalUser());

    render(
      <SalonProtectedRoute requiredRole={["ADMIN", "RECEPCIONIST", "PROFESSIONAL"]}>
        <div>Agendamentos</div>
      </SalonProtectedRoute>,
    );

    expect(screen.getByText("Agendamentos")).toBeInTheDocument();
  });
});

describe("SalonProtectedRoute — ADMIN acessa sua área", () => {
  it("renderiza o conteúdo de ADMIN normalmente", () => {
    mockAuthenticated(makeAdminUser());

    render(
      <SalonProtectedRoute requiredRole="ADMIN">
        <div>Painel Administrativo</div>
      </SalonProtectedRoute>,
    );

    expect(screen.getByText("Painel Administrativo")).toBeInTheDocument();
  });

  it("não redireciona o ADMIN", () => {
    mockAuthenticated(makeAdminUser());

    render(
      <SalonProtectedRoute requiredRole="ADMIN">
        <div>Admin content</div>
      </SalonProtectedRoute>,
    );

    const pushCalls = getPushCalls();
    expect(pushCalls).toHaveLength(0);
  });
});

describe("SalonProtectedRoute — permissão granular", () => {
  it("PROFESSIONAL com appointments.view acessa rota protegida por essa permissão", () => {
    mockAuthenticated(makeProfessionalUser());

    render(
      <SalonProtectedRoute requiredPermissions="appointments.view">
        <div>Agenda</div>
      </SalonProtectedRoute>,
    );

    expect(screen.getByText("Agenda")).toBeInTheDocument();
  });

  it("PROFESSIONAL sem dashboard.view não acessa rota protegida por essa permissão", () => {
    mockAuthenticated(makeProfessionalUser());

    render(
      <SalonProtectedRoute requiredPermissions="dashboard.view">
        <div>Dashboard</div>
      </SalonProtectedRoute>,
    );

    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });

  it("showUnauthorized exibe mensagem 'Acesso Negado' ao PROFESSIONAL em rota de ADMIN", () => {
    mockAuthenticated(makeProfessionalUser());

    render(
      <SalonProtectedRoute requiredRole="ADMIN" showUnauthorized>
        <div>Admin dashboard</div>
      </SalonProtectedRoute>,
    );

    expect(screen.getByText(/Acesso Negado/i)).toBeInTheDocument();
    expect(screen.queryByText("Admin dashboard")).not.toBeInTheDocument();
  });
});
