import { authService } from "@/services/auth";

// Set NODE_ENV to development for tests
const originalEnv = process.env.NODE_ENV;

describe("authService", () => {
  beforeAll(() => {
    Object.defineProperty(process.env, "NODE_ENV", { value: "development" });
  });

  afterAll(() => {
    Object.defineProperty(process.env, "NODE_ENV", { value: originalEnv });
  });

  beforeEach(() => {
    localStorage.clear();
    document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  });

  describe("login", () => {
    it("should login with valid credentials", async () => {
      const result = await authService.login(
        "admin@socialstudio.com",
        "Admin@2024!Secure"
      );

      expect(result).toHaveProperty("user");
      expect(result).toHaveProperty("token");
      expect(result.user.email).toBe("admin@socialstudio.com");
      expect(result.user.role).toBe("admin");
    });

    it("should throw error with invalid credentials", async () => {
      await expect(
        authService.login("wrong@email.com", "wrongpassword")
      ).rejects.toThrow("Credenciais inválidas");
    });

    it("should throw error with wrong password", async () => {
      await expect(
        authService.login("admin@socialstudio.com", "wrongpassword")
      ).rejects.toThrow("Credenciais inválidas");
    });

    it("should set auth cookie on successful login", async () => {
      await authService.login("admin@socialstudio.com", "Admin@2024!Secure");

      expect(document.cookie).toContain("auth_token=");
    });
  });

  describe("verifyToken", () => {
    it("should return true for valid token", async () => {
      const { token } = await authService.login(
        "admin@socialstudio.com",
        "Admin@2024!Secure"
      );

      const isValid = await authService.verifyToken(token);
      expect(isValid).toBe(true);
    });

    it("should return false for invalid token", async () => {
      const isValid = await authService.verifyToken("invalid-token");
      expect(isValid).toBe(false);
    });

    it("should return false for malformed token", async () => {
      const isValid = await authService.verifyToken("not-base64");
      expect(isValid).toBe(false);
    });

    it("should return false for expired token", async () => {
      // Create an expired token
      const expiredPayload = {
        userId: "test",
        email: "test@test.com",
        exp: Date.now() - 1000, // Expired
      };
      const expiredToken = btoa(JSON.stringify(expiredPayload));

      const isValid = await authService.verifyToken(expiredToken);
      expect(isValid).toBe(false);
    });
  });

  describe("getProfile", () => {
    it("should return user profile for valid token", async () => {
      const { token } = await authService.login(
        "admin@socialstudio.com",
        "Admin@2024!Secure"
      );

      const profile = await authService.getProfile(token);

      expect(profile).toHaveProperty("id");
      expect(profile).toHaveProperty("name");
      expect(profile).toHaveProperty("email");
      expect(profile.email).toBe("admin@socialstudio.com");
    });

    it("should throw error for invalid token", async () => {
      await expect(authService.getProfile("invalid-token")).rejects.toThrow(
        "Token inválido"
      );
    });
  });

  describe("refreshToken", () => {
    it("should return new token for valid token", async () => {
      const { token: originalToken } = await authService.login(
        "admin@socialstudio.com",
        "Admin@2024!Secure"
      );

      const result = await authService.refreshToken(originalToken);

      expect(result).toHaveProperty("user");
      expect(result).toHaveProperty("token");
      // Token may or may not be different depending on timing
      expect(typeof result.token).toBe("string");
      expect(result.token.length).toBeGreaterThan(0);
    });

    it("should throw error for invalid token", async () => {
      await expect(authService.refreshToken("invalid-token")).rejects.toThrow(
        "Token inválido"
      );
    });
  });

  describe("logout", () => {
    it("should clear auth cookie", async () => {
      await authService.login("admin@socialstudio.com", "Admin@2024!Secure");
      expect(document.cookie).toContain("auth_token=");

      authService.logout();

      // Cookie should be cleared (expired)
      const cookies = document.cookie.split(";");
      const authCookie = cookies.find((c) => c.trim().startsWith("auth_token="));
      expect(authCookie?.split("=")[1]).toBeFalsy();
    });

    it("should clear localStorage", async () => {
      localStorage.setItem("auth_token", "test-token");
      localStorage.setItem("auth_user", "{}");

      authService.logout();

      expect(localStorage.getItem("auth_token")).toBeNull();
      expect(localStorage.getItem("auth_user")).toBeNull();
    });
  });
});
