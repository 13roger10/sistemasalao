"use client";

import { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { DynamicTitle } from "@/components/layout";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <AuthProvider>
          <ToastProvider position="top-right">
            <DynamicTitle />
            {children}
          </ToastProvider>
        </AuthProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
