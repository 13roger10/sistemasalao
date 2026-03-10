import { renderHook, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";

describe("ThemeContext", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ThemeProvider>{children}</ThemeProvider>
  );

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    // Remove dark class from document
    document.documentElement.classList.remove("dark");
    // Reset matchMedia mock
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  describe("useTheme hook", () => {
    it("should throw error when used outside ThemeProvider", () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        renderHook(() => useTheme());
      }).toThrow("useTheme deve ser usado dentro de ThemeProvider");

      consoleSpy.mockRestore();
    });

    it("should return theme context values", () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current).toHaveProperty("theme");
      expect(result.current).toHaveProperty("resolvedTheme");
      expect(result.current).toHaveProperty("setTheme");
      expect(result.current).toHaveProperty("toggleTheme");
    });
  });

  describe("Initial theme", () => {
    it("should default to light theme", () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.theme).toBe("light");
      expect(result.current.resolvedTheme).toBe("light");
    });

    it("should load theme from localStorage", () => {
      localStorage.setItem("social_studio_theme", "dark");

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.theme).toBe("dark");
      expect(result.current.resolvedTheme).toBe("dark");
    });
  });

  describe("setTheme", () => {
    it("should set light theme", () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setTheme("light");
      });

      expect(result.current.theme).toBe("light");
      expect(result.current.resolvedTheme).toBe("light");
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("should set dark theme", () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setTheme("dark");
      });

      expect(result.current.theme).toBe("dark");
      expect(result.current.resolvedTheme).toBe("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("should set system theme", () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setTheme("system");
      });

      expect(result.current.theme).toBe("system");
      // resolvedTheme depends on matchMedia mock (defaults to light)
      expect(result.current.resolvedTheme).toBe("light");
    });

    it("should persist theme to localStorage", () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setTheme("dark");
      });

      expect(localStorage.getItem("social_studio_theme")).toBe("dark");
    });
  });

  describe("toggleTheme", () => {
    it("should toggle from light to dark", () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setTheme("light");
      });

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.resolvedTheme).toBe("dark");
    });

    it("should toggle from dark to light", () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setTheme("dark");
      });

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.resolvedTheme).toBe("light");
    });
  });

  describe("System theme", () => {
    it("should detect dark system preference", () => {
      // Mock dark mode preference
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
          matches: query === "(prefers-color-scheme: dark)",
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setTheme("system");
      });

      expect(result.current.theme).toBe("system");
      expect(result.current.resolvedTheme).toBe("dark");
    });

    it("should detect light system preference", () => {
      // Mock light mode preference
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setTheme("system");
      });

      expect(result.current.theme).toBe("system");
      expect(result.current.resolvedTheme).toBe("light");
    });
  });

  describe("Dark class manipulation", () => {
    it("should add dark class when dark theme is set", () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setTheme("dark");
      });

      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("should remove dark class when light theme is set", () => {
      document.documentElement.classList.add("dark");

      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setTheme("light");
      });

      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
  });
});
