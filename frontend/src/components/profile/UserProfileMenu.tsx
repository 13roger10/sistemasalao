"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { User, Settings, LogOut, ChevronDown, HelpCircle } from "lucide-react";

export function UserProfileMenu() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    setIsOpen(false);
    logout();
  };

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-sm font-bold text-white">
          {user?.name?.charAt(0).toUpperCase() || "U"}
        </div>
        <div className="hidden text-left sm:block">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {user?.name || "Usuario"}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email || ""}</p>
        </div>
        <ChevronDown className="hidden h-4 w-4 text-gray-400 sm:block" />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl bg-white py-1 shadow-xl dark:bg-gray-800">
            {/* User Info (mobile) */}
            <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700 sm:hidden">
              <p className="font-medium text-gray-900 dark:text-white">{user?.name || "Usuario"}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email || ""}</p>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              <Link
                href="/admin/settings"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <User className="h-4 w-4 text-gray-400" />
                Meu Perfil
              </Link>
              <Link
                href="/admin/settings"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <Settings className="h-4 w-4 text-gray-400" />
                Configuracoes
              </Link>
              <a
                href="#"
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <HelpCircle className="h-4 w-4 text-gray-400" />
                Ajuda
              </a>
            </div>

            {/* Logout */}
            <div className="border-t border-gray-100 py-1 dark:border-gray-700">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
