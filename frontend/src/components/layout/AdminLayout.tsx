"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { ProtectedRoute } from "@/components/auth";

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex flex-1 flex-col">
          <Header title={title} onMenuClick={() => setSidebarOpen(true)} />

          <main className="flex-1 p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
