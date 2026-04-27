"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  Calendar,
  LogOut,
  Users,
  CreditCard,
  CalendarCheck,
  UserCheck,
  MessageCircle,
  List,
  ScanLine,
  Timer,
  Scissors,
  LayoutDashboard,
  X,
  Menu,
  Bell,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Navigation items ─────────────────────────────────────────────────────────

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/recepcao/agenda",               label: "Agenda",       icon: Calendar,      color: "text-violet-600", bgColor: "bg-violet-50" },
  { href: "/recepcao/clientes",             label: "Clientes",     icon: Users,         color: "text-blue-600",   bgColor: "bg-blue-50"   },
  { href: "/recepcao/pagamentos",           label: "Pagamentos",   icon: CreditCard,    color: "text-green-600",  bgColor: "bg-green-50"  },
  { href: "/recepcao/confirmacao-pagamento",label: "Confirmação",  icon: CalendarCheck, color: "text-emerald-600",bgColor: "bg-emerald-50"},
  { href: "/recepcao/atendimento",          label: "Atendimento",  icon: UserCheck,     color: "text-blue-600",   bgColor: "bg-blue-50"   },
  { href: "/recepcao/comunicacao",          label: "Comunicação",  icon: MessageCircle, color: "text-violet-600", bgColor: "bg-violet-50" },
  { href: "/recepcao/lista-do-dia",         label: "Lista do Dia", icon: List,          color: "text-orange-600", bgColor: "bg-orange-50" },
  { href: "/recepcao/checkin",              label: "Check-in",     icon: ScanLine,      color: "text-teal-600",   bgColor: "bg-teal-50"   },
  { href: "/recepcao/fila",                 label: "Fila / Encaixe",icon: Timer,        color: "text-amber-600",  bgColor: "bg-amber-50"  },
];

const SIDEBAR_NAV = [
  { href: "/recepcao", label: "Início", icon: LayoutDashboard },
  ...NAV_ITEMS.map(({ href, label, icon }) => ({ href, label, icon })),
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  onLogout: () => void;
  pathname: string;
}

function ReceptionSidebar({ isOpen, onClose, userName, onLogout, pathname }: SidebarProps) {
  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-64 flex-col bg-white shadow-xl transition-transform duration-300 dark:bg-gray-900 lg:static lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand */}
        <div className="flex h-16 items-center justify-between border-b px-4 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500">
              <Scissors className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Belezza</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Recepção</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-4">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Módulos
          </p>
          <ul className="space-y-1">
            {SIDEBAR_NAV.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/recepcao" && pathname.startsWith(item.href + "/"));
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5",
                        isActive ? "text-violet-500 dark:text-violet-400" : "text-gray-400"
                      )}
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User footer */}
        <div className="border-t p-4 dark:border-gray-800">
          <div className="mb-3 flex items-center gap-3 px-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-600 dark:bg-teal-900/50">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{userName}</p>
              <span className="inline-flex items-center rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
                Recepcionista
              </span>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <LogOut className="h-5 w-5" />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}

// ─── Hub content ──────────────────────────────────────────────────────────────

function RecepcaoHub() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const firstName = user?.name?.split(" ")[0] || "Recepcionista";
  const initial = user?.name?.charAt(0).toUpperCase() || "R";

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <ReceptionSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userName={user?.name || "Recepcionista"}
        onLogout={logout}
        pathname={pathname}
      />

      <div className="flex flex-1 flex-col min-w-0">
        {/* Top header */}
        <header className="flex h-16 items-center justify-between border-b bg-white px-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-base font-semibold text-gray-900 dark:text-white">Recepção</h1>
          </div>

          <div className="flex items-center gap-2">
            <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">
              <Bell className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-700 dark:bg-teal-900/50 dark:text-teal-400">
                {initial}
              </div>
              <span className="hidden text-sm font-medium text-gray-700 dark:text-gray-300 sm:block">
                {firstName}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {/* Welcome banner */}
          <div className="mb-6 rounded-2xl bg-gradient-to-r from-teal-500 to-violet-600 p-6 text-white shadow-lg">
            <p className="text-sm font-medium capitalize text-white/80">{today}</p>
            <h2 className="mt-1 text-2xl font-bold">Olá, {firstName}!</h2>
            <p className="mt-1 text-sm text-white/75">Bem-vinda à área de recepção do salão.</p>
          </div>

          {/* Module grid */}
          <div>
            <p className="mb-4 text-sm font-semibold text-gray-500 dark:text-gray-400">
              Módulos disponíveis
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex flex-col items-center gap-3 rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
                  >
                    <div className={cn("rounded-xl p-3", item.bgColor)}>
                      <Icon className={cn("h-6 w-6", item.color)} />
                    </div>
                    <span className="text-center text-sm font-medium text-gray-800 dark:text-gray-200">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function RecepcaoPage() {
  return (
    <ProtectedRoute requiredRole="receptionist">
      <RecepcaoHub />
    </ProtectedRoute>
  );
}
