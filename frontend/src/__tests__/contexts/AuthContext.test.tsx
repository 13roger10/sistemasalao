import { renderHook, act, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { authService, getTokenExpiry } from "@/services/auth";

// Mock the auth service
jest.mock("@/services/auth", () => ({
  authService: {
    login: jest.fn(),
    logout: jest.fn(),
    verifyToken: jest.fn(),
    getProfile: jest.fn(),
    refreshToken: jest.fn(),
  },
  // Sem expiração legível, o contexto não agenda a renovação automática do token
  getTokenExpiry: jest.fn(() => null),
}));

const mockAuthService = authService as jest.Mocked<typeof authService>;

describe("AuthContext", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  const mockUser = {
    id: "test-user-001",
    name: "Test User",
    email: "test@example.com",
    role: "admin" as const,
    avatar: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockToken = "test-token-123";

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getTokenExpiry).mockReturnValue(null);
    localStorage.clear();
    // Reset document.cookie
    document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  });

  describe("useAuth hook", () => {
    it("should throw error when used outside AuthProvider", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow("useAuth must be used within an AuthProvider");

      consoleSpy.mockRestore();
    });

    it("should return auth context values", async () => {
      mockAuthService.verifyToken.mockResolvedValue(false);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current).toHaveProperty("user");
      expect(result.current).toHaveProperty("token");
      expect(result.current).toHaveProperty("isAuthenticated");
      expect(result.current).toHaveProperty("isLoading");
      expect(result.current).toHaveProperty("login");
      expect(result.current).toHaveProperty("logout");
      expect(result.current).toHaveProperty("checkAuth");
    });
  });

  describe("Initial state", () => {
    it("should start with loading state", async () => {
      mockAuthService.verifyToken.mockResolvedValue(false);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Initial state should be loading true, then quickly becomes false
      // Due to the async nature and refs, we test for eventual non-loading state
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should be unauthenticated without stored credentials", async () => {
      mockAuthService.verifyToken.mockResolvedValue(false);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
    });
  });

  describe("login", () => {
    it("should authenticate user on successful login", async () => {
      mockAuthService.login.mockResolvedValue({
        user: mockUser,
        token: mockToken,
      });
      mockAuthService.verifyToken.mockResolvedValue(false);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login("test@example.com", "password");
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.token).toBe(mockToken);
    });

    it("should store credentials in localStorage", async () => {
      mockAuthService.login.mockResolvedValue({
        user: mockUser,
        token: mockToken,
      });
      mockAuthService.verifyToken.mockResolvedValue(false);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login("test@example.com", "password");
      });

      expect(localStorage.getItem("auth_token")).toBe(mockToken);
      // Dates are serialized as strings in localStorage
      const storedUser = JSON.parse(localStorage.getItem("auth_user") || "{}");
      expect(storedUser.id).toBe(mockUser.id);
      expect(storedUser.email).toBe(mockUser.email);
      expect(storedUser.name).toBe(mockUser.name);
      expect(storedUser.role).toBe(mockUser.role);
    });

    it("should throw error on failed login", async () => {
      const loginError = new Error("Invalid credentials");
      mockAuthService.login.mockRejectedValue(loginError);
      mockAuthService.verifyToken.mockResolvedValue(false);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.login("wrong@email.com", "wrongpassword");
        })
      ).rejects.toThrow("Invalid credentials");

      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe("logout", () => {
    it("should clear authentication state", async () => {
      mockAuthService.login.mockResolvedValue({
        user: mockUser,
        token: mockToken,
      });
      mockAuthService.verifyToken.mockResolvedValue(false);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Login first
      await act(async () => {
        await result.current.login("test@example.com", "password");
      });

      expect(result.current.isAuthenticated).toBe(true);

      // Then logout
      act(() => {
        result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
    });

    it("should clear localStorage on logout", async () => {
      mockAuthService.login.mockResolvedValue({
        user: mockUser,
        token: mockToken,
      });
      mockAuthService.verifyToken.mockResolvedValue(false);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Login first
      await act(async () => {
        await result.current.login("test@example.com", "password");
      });

      // Then logout
      act(() => {
        result.current.logout();
      });

      expect(localStorage.getItem("auth_token")).toBeNull();
      expect(localStorage.getItem("auth_user")).toBeNull();
    });

    it("should call authService.logout", async () => {
      mockAuthService.verifyToken.mockResolvedValue(false);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.logout();
      });

      expect(mockAuthService.logout).toHaveBeenCalled();
    });
  });

  describe("checkAuth", () => {
    it("should restore session from localStorage", async () => {
      localStorage.setItem("auth_token", mockToken);
      localStorage.setItem("auth_user", JSON.stringify(mockUser));
      mockAuthService.verifyToken.mockResolvedValue(true);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(true);
      // Dates are restored from localStorage as strings, so compare key fields
      expect(result.current.user?.id).toBe(mockUser.id);
      expect(result.current.user?.email).toBe(mockUser.email);
      expect(result.current.user?.name).toBe(mockUser.name);
      expect(result.current.user?.role).toBe(mockUser.role);
    });

    // A sessão guardada é restaurada e a renovação é agendada para antes do vencimento; um token já
    // vencido é renovado na hora, e se a renovação falhar a sessão é encerrada.
    it("should clear the session when an expired token cannot be refreshed", async () => {
      localStorage.setItem("auth_token", "expired-token");
      localStorage.setItem("auth_user", JSON.stringify(mockUser));
      jest.mocked(getTokenExpiry).mockReturnValue(Math.floor(Date.now() / 1000) - 60);
      mockAuthService.refreshToken.mockRejectedValue(new Error("Sessão expirada"));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
      });
      expect(result.current.user).toBeNull();
      expect(mockAuthService.logout).toHaveBeenCalled();
    });

    it("should keep the session when the expired token is refreshed", async () => {
      localStorage.setItem("auth_token", "expired-token");
      localStorage.setItem("auth_user", JSON.stringify(mockUser));
      jest.mocked(getTokenExpiry).mockReturnValueOnce(Math.floor(Date.now() / 1000) - 60);
      mockAuthService.refreshToken.mockResolvedValue({ user: mockUser, token: "new-token" });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(mockAuthService.refreshToken).toHaveBeenCalledWith("expired-token");
      });
      await waitFor(() => {
        expect(localStorage.getItem("auth_token")).toBe("new-token");
      });
      expect(result.current.isAuthenticated).toBe(true);
    });
  });
});
