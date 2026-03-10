import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { authService } from "@/services/auth";

// Mock auth service
jest.mock("@/services/auth", () => ({
  authService: {
    login: jest.fn(),
    logout: jest.fn(),
    verifyToken: jest.fn().mockResolvedValue(false),
  },
}));

const mockAuthService = authService as jest.Mocked<typeof authService>;

// Test Login Form Component
function LoginForm() {
  const { login, isLoading, isAuthenticated, user } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  };

  if (isAuthenticated) {
    return (
      <div>
        <h1>Welcome, {user?.name}</h1>
        <p data-testid="user-email">{user?.email}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={error ? " " : undefined}
      />
      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p data-testid="error-message">{error}</p>}
      <Button type="submit" isLoading={isLoading}>
        Login
      </Button>
    </form>
  );
}

import React from "react";

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>
    <AuthProvider>{children}</AuthProvider>
  </ThemeProvider>
);

describe("Login Flow Integration", () => {
  const mockUser = {
    id: "test-user-001",
    name: "Test User",
    email: "test@example.com",
    role: "admin" as const,
    avatar: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it("should render login form", async () => {
    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
      expect(screen.getByLabelText("Password")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
    });
  });

  it("should login successfully with valid credentials", async () => {
    const user = userEvent.setup();

    mockAuthService.login.mockResolvedValue({
      user: mockUser,
      token: "test-token",
    });

    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(`Welcome, ${mockUser.name}`)).toBeInTheDocument();
      expect(screen.getByTestId("user-email")).toHaveTextContent(mockUser.email);
    });
  });

  it("should show error on failed login", async () => {
    const user = userEvent.setup();

    mockAuthService.login.mockRejectedValue(new Error("Invalid credentials"));

    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText("Email"), "wrong@email.com");
    await user.type(screen.getByLabelText("Password"), "wrongpass");
    await user.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByTestId("error-message")).toHaveTextContent(
        "Invalid credentials"
      );
    });
  });

  it("should show loading state while logging in", async () => {
    const user = userEvent.setup();

    // Create a delayed promise
    let resolveLogin: (value: unknown) => void;
    const loginPromise = new Promise((resolve) => {
      resolveLogin = resolve;
    });

    mockAuthService.login.mockReturnValue(loginPromise as Promise<{
      user: typeof mockUser;
      token: string;
    }>);

    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: /login/i }));

    // Button should be disabled during loading
    expect(screen.getByRole("button")).toBeDisabled();

    // Resolve the login
    resolveLogin!({ user: mockUser, token: "test-token" });

    await waitFor(() => {
      expect(screen.getByText(`Welcome, ${mockUser.name}`)).toBeInTheDocument();
    });
  });

  it("should store auth data in localStorage after login", async () => {
    const user = userEvent.setup();

    mockAuthService.login.mockResolvedValue({
      user: mockUser,
      token: "test-token",
    });

    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(`Welcome, ${mockUser.name}`)).toBeInTheDocument();
    });

    expect(localStorage.getItem("auth_token")).toBe("test-token");
    const storedUser = JSON.parse(localStorage.getItem("auth_user") || "{}");
    expect(storedUser.id).toBe(mockUser.id);
    expect(storedUser.name).toBe(mockUser.name);
    expect(storedUser.email).toBe(mockUser.email);
    expect(storedUser.role).toBe(mockUser.role);
  });
});
