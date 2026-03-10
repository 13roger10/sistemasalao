"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react";

const SETTINGS_KEY = "social_studio_settings";
const DEFAULT_APP_TITLE = "Social Studio IA";

interface SettingsContextType {
  businessName: string;
  refreshSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [businessName, setBusinessName] = useState<string>(DEFAULT_APP_TITLE);
  const hasInitialized = useRef(false);

  // Load business name from localStorage
  const loadBusinessName = useCallback(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const name = parsed?.profile?.businessName;
        if (name && name.trim()) {
          return name;
        }
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
    return DEFAULT_APP_TITLE;
  }, []);

  // Initialize on mount
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const name = loadBusinessName();
    setBusinessName(name);
    document.title = name;
  }, [loadBusinessName]);

  // Listen for storage changes (from other tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === SETTINGS_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          const name = parsed?.profile?.businessName;
          if (name && name.trim()) {
            setBusinessName(name);
            document.title = name;
          } else {
            setBusinessName(DEFAULT_APP_TITLE);
            document.title = DEFAULT_APP_TITLE;
          }
        } catch (error) {
          console.error("Failed to parse settings from storage event:", error);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Update document title when businessName changes
  useEffect(() => {
    document.title = businessName;
  }, [businessName]);

  // Refresh settings from localStorage and update title
  const refreshSettings = useCallback(() => {
    const name = loadBusinessName();
    setBusinessName(name);
    document.title = name;
  }, [loadBusinessName]);

  return (
    <SettingsContext.Provider
      value={{
        businessName,
        refreshSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings deve ser usado dentro de SettingsProvider");
  }
  return context;
}
