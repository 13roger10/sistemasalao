import { authService } from "@/services/auth";
import { api } from "@/lib/api";
import { encerrarSessaoNoServidor } from "@/lib/session-refresh";

// O login passa pela rota do Next (/api/auth/login), que conversa com o backend. Antes este teste
// cobria um login simulado com usuário fixo, que não existe mais fora do modo de desenvolvimento.
jest.mock("@/lib/api", () => ({ api: { get: jest.fn() } }));
jest.mock("@/lib/session-refresh", () => ({ encerrarSessaoNoServidor: jest.fn() }));

const usuarioDoBackend = {
  id: 7,
  email: "ana@salao.com",
  nome: "Ana",
  telefone: "11999990000",
  role: "ADMIN" as const,
  plano: "FREE",
  emailVerificado: true,
  criadoEm: "2026-01-01T10:00:00",
};

function resposta(status: number, corpo: unknown) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(corpo),
  } as Response);
}

const fetchMock = jest.fn();

describe("authService", () => {
  beforeAll(() => {
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  beforeEach(() => {
    fetchMock.mockReset();
    jest.mocked(api.get).mockReset();
    jest.mocked(encerrarSessaoNoServidor).mockReset();
    localStorage.clear();
    document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  });

  describe("login", () => {
    it("entra, guarda o refresh token e grava o cookie", async () => {
      fetchMock.mockReturnValue(
        resposta(200, { user: usuarioDoBackend, accessToken: "acesso-1", refreshToken: "refresh-1" })
      );

      const result = await authService.login("ana@salao.com", "Senha@123");

      expect(fetchMock).toHaveBeenCalledWith("/api/auth/login", expect.objectContaining({ method: "POST" }));
      expect(result.token).toBe("acesso-1");
      expect(result.user.email).toBe("ana@salao.com");
      expect(result.user.role).toBe("admin");
      expect(localStorage.getItem("refresh_token")).toBe("refresh-1");
      expect(document.cookie).toContain("auth_token=acesso-1");
    });

    it("mostra a mensagem do backend quando o login é recusado", async () => {
      fetchMock.mockReturnValue(resposta(403, { message: "Confirme seu e-mail antes de entrar." }));

      await expect(authService.login("ana@salao.com", "Senha@123")).rejects.toThrow(
        "Confirme seu e-mail antes de entrar."
      );
      expect(document.cookie).not.toContain("auth_token=acesso");
    });

    it("usa a mensagem padrão quando o backend não manda uma", async () => {
      fetchMock.mockReturnValue(resposta(401, {}));

      await expect(authService.login("ana@salao.com", "errada")).rejects.toThrow("Credenciais inválidas");
    });

    it("pede o código 2FA sem guardar tokens", async () => {
      fetchMock.mockReturnValue(resposta(200, { requiresTwoFactor: true }));

      const result = await authService.login("ana@salao.com", "Senha@123");

      expect(result.requiresTwoFactor).toBe(true);
      expect(localStorage.getItem("refresh_token")).toBeNull();
    });
  });

  describe("verifyToken", () => {
    it("token aceito pela API é válido", async () => {
      jest.mocked(api.get).mockResolvedValue({ data: {} });

      await expect(authService.verifyToken("token")).resolves.toBe(true);
    });

    it("token recusado pela API é inválido", async () => {
      jest.mocked(api.get).mockRejectedValue(new Error("401"));

      await expect(authService.verifyToken("token")).resolves.toBe(false);
    });
  });

  describe("refreshToken", () => {
    it("sem refresh token guardado, pede novo login", async () => {
      await expect(authService.refreshToken("qualquer")).rejects.toThrow("Refresh token não encontrado");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("troca o refresh token por um par novo", async () => {
      localStorage.setItem("refresh_token", "refresh-1");
      fetchMock.mockReturnValue(
        resposta(200, { user: usuarioDoBackend, accessToken: "acesso-2", refreshToken: "refresh-2" })
      );

      const result = await authService.refreshToken("acesso-1");

      expect(result.token).toBe("acesso-2");
      expect(localStorage.getItem("refresh_token")).toBe("refresh-2");
    });

    it("refresh recusado encerra a sessão", async () => {
      localStorage.setItem("refresh_token", "refresh-1");
      fetchMock.mockReturnValue(resposta(401, {}));

      await expect(authService.refreshToken("acesso-1")).rejects.toThrow("Sessão expirada");
    });
  });

  describe("logout", () => {
    it("revoga os tokens no servidor e limpa o navegador", () => {
      localStorage.setItem("auth_token", "acesso-1");
      localStorage.setItem("refresh_token", "refresh-1");
      localStorage.setItem("auth_user", "{}");
      document.cookie = "auth_token=acesso-1; path=/";

      authService.logout();

      expect(encerrarSessaoNoServidor).toHaveBeenCalledWith("acesso-1", "refresh-1");
      expect(localStorage.getItem("refresh_token")).toBeNull();
      expect(localStorage.getItem("auth_user")).toBeNull();
      expect(document.cookie).not.toContain("auth_token=acesso-1");
    });
  });
});
