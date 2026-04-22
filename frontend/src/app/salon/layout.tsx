"use client";

import { ReactNode } from "react";
import { SalonAuthProvider } from "@/contexts/SalonAuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { UnitProvider } from "@/contexts/UnitContext";
import { SalonNotificacaoProvider } from "@/contexts/SalonNotificacaoContext";

interface SalonLayoutProps {
  children: ReactNode;
}

export default function SalonLayout({ children }: SalonLayoutProps) {
  return (
    <ThemeProvider>
      <SalonAuthProvider>
        <SalonNotificacaoProvider>
          <UnitProvider>
            {children}
          </UnitProvider>
        </SalonNotificacaoProvider>
      </SalonAuthProvider>
    </ThemeProvider>
  );
}
