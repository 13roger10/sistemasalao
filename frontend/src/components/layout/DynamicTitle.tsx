"use client";

import { useEffect, useState } from "react";

const SETTINGS_KEY = "social_studio_settings";
const DEFAULT_TITLE = "Social Studio IA";

function getBusinessName(): string {
  if (typeof window === "undefined") return DEFAULT_TITLE;

  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const businessName = parsed?.profile?.businessName;
      if (businessName && businessName.trim()) {
        return businessName;
      }
    }
  } catch {
    // Ignora erro
  }
  return DEFAULT_TITLE;
}

export function DynamicTitle() {
  const [title, setTitle] = useState<string>(DEFAULT_TITLE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTitle(getBusinessName());

    const handleUpdate = () => {
      setTitle(getBusinessName());
    };

    // Escutar mudanças no localStorage (outras abas)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === SETTINGS_KEY) {
        handleUpdate();
      }
    };

    // Escutar evento customizado (mesma aba)
    window.addEventListener("storage", handleStorage);
    window.addEventListener("titleUpdate", handleUpdate);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("titleUpdate", handleUpdate);
    };
  }, []);

  useEffect(() => {
    if (mounted && title) {
      // Atualizar a tag title diretamente
      const titleElement = document.querySelector("title");
      if (titleElement) {
        titleElement.textContent = title;
      }
      // Também atualizar document.title como fallback
      document.title = title;
    }
  }, [title, mounted]);

  return null;
}
