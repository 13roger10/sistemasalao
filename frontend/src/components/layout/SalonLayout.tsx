"use client";

import { useState, ReactNode } from "react";
import { SalonSidebar } from "./SalonSidebar";
import { SalonHeader } from "./SalonHeader";
import { SalonProtectedRoute } from "@/components/auth/SalonProtectedRoute";
import { AuthPermission, AuthUserRole } from "@/types/salon/auth";

interface SalonLayoutProps {
  children: ReactNode;
  /** Role(s) necessária(s) para acessar esta página */
  requiredRole?: AuthUserRole | AuthUserRole[];
  /** Permissão(ões) necessária(s) para acessar esta página */
  requiredPermissions?: AuthPermission | AuthPermission[];
  /** Se true, precisa de TODAS as permissões. Se false, qualquer uma */
  requireAll?: boolean;
  /** Título da página para o header */
  pageTitle?: string;
}

export function SalonLayout({
  children,
  requiredRole,
  requiredPermissions,
  requireAll = true,
  pageTitle,
}: SalonLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <SalonProtectedRoute
      requiredRole={requiredRole}
      requiredPermissions={requiredPermissions}
      requireAll={requireAll}
      showUnauthorized
    >
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Sidebar */}
        <SalonSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main Content */}
        {/* min-w-0 lets this flex item actually shrink to the viewport instead of stretching
            to its widest content's intrinsic width — without it, some pages (content whose
            children don't wrap) push the whole layout wider than the screen on mobile. */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <SalonHeader
            onMenuClick={() => setSidebarOpen(true)}
            pageTitle={pageTitle}
          />

          {/* Page Content */}
          <main className="flex-1 overflow-auto p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </SalonProtectedRoute>
  );
}
