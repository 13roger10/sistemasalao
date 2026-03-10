import React, { ReactElement, ReactNode } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

// Mock user data
export const mockUser = {
  id: "test-user-001",
  name: "Test User",
  email: "test@example.com",
  role: "admin" as const,
  avatar: undefined,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

// Mock post data
export const mockPost = {
  id: "post-001",
  userId: "test-user-001",
  imageUrl: "/images/test-image.jpg",
  title: "Test Post",
  caption: "This is a test caption",
  hashtags: ["test", "sample"],
  platform: "instagram" as const,
  status: "draft" as const,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

// Mock auth token
export const mockToken = btoa(
  JSON.stringify({
    userId: mockUser.id,
    email: mockUser.email,
    exp: Date.now() + 24 * 60 * 60 * 1000,
  })
);

// Custom render with providers
interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  initialAuthState?: {
    isAuthenticated?: boolean;
    user?: typeof mockUser | null;
  };
}

const AllTheProviders = ({ children }: { children: ReactNode }) => {
  return (
    <ThemeProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: CustomRenderOptions
) => {
  return render(ui, { wrapper: AllTheProviders, ...options });
};

// Re-export everything from testing-library
export * from "@testing-library/react";
export { customRender as render };

// Helper to setup localStorage mock
export const setupLocalStorageMock = (initialData: Record<string, string> = {}) => {
  const store: Record<string, string> = { ...initialData };

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
    get store() {
      return store;
    },
  };
};

// Helper to wait for async operations
export const waitForLoadingToFinish = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

// Helper to create mock posts array
export const createMockPosts = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    ...mockPost,
    id: `post-${i + 1}`,
    title: `Test Post ${i + 1}`,
    createdAt: new Date(Date.now() - i * 86400000),
    updatedAt: new Date(Date.now() - i * 86400000),
  }));
};
