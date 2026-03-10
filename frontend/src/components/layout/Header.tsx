"use client";

import { Menu } from "lucide-react";
import { NotificationCenter } from "@/components/notifications";
import { UserProfileMenu } from "@/components/profile";
import { ThemeToggle } from "@/components/theme";

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
}

export function Header({ title, onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-4 dark:border-gray-800 dark:bg-gray-900 lg:px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <NotificationCenter />
        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
        <UserProfileMenu />
      </div>
    </header>
  );
}
