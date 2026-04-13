"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { NotificacaoProvider } from "@/contexts/NotificacaoContext";

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <NotificacaoProvider>{children}</NotificacaoProvider>
    </AuthProvider>
  );
}
