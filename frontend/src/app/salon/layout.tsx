"use client";

import { ReactNode } from "react";
import { SalonAuthProvider } from "@/contexts/SalonAuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { UnitProvider } from "@/contexts/UnitContext";

interface SalonLayoutProps {
  children: ReactNode;
}

export default function SalonLayout({ children }: SalonLayoutProps) {
  return (
    <ThemeProvider>
      <SalonAuthProvider>
        <UnitProvider>
          {children}
        </UnitProvider>
      </SalonAuthProvider>
    </ThemeProvider>
  );
}
