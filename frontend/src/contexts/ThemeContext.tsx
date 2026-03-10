"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = "social_studio_theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const hasInitialized = useRef(false);

  // Detectar preferencia do sistema
  const getSystemTheme = useCallback((): "light" | "dark" => {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }, []);

  // Aplicar tema
  const applyTheme = useCallback((newTheme: "light" | "dark") => {
    const root = document.documentElement;
    if (newTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    setResolvedTheme(newTheme);
  }, []);

  // Resolver tema
  const resolveTheme = useCallback((themeValue: Theme): "light" | "dark" => {
    if (themeValue === "system") {
      return getSystemTheme();
    }
    return themeValue;
  }, [getSystemTheme]);

  // Inicializar tema
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    const stored = localStorage.getItem(THEME_KEY) as Theme | null;
    const initialTheme = stored || "light";
    setThemeState(initialTheme);
    applyTheme(resolveTheme(initialTheme));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escutar mudancas na preferencia do sistema
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      applyTheme(getSystemTheme());
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, applyTheme, getSystemTheme]);

  // Definir tema
  const setTheme = useCallback((newTheme: Theme) => {
    localStorage.setItem(THEME_KEY, newTheme);
    setThemeState(newTheme);
    applyTheme(resolveTheme(newTheme));
  }, [applyTheme, resolveTheme]);

  // Alternar tema
  const toggleTheme = useCallback(() => {
    const newTheme = resolvedTheme === "light" ? "dark" : "light";
    setTheme(newTheme);
  }, [resolvedTheme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme deve ser usado dentro de ThemeProvider");
  }
  return context;
}
