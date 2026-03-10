"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserCircle,
  Scissors,
  Calendar,
  DollarSign,
  Percent,
  Gift,
  Package,
  Star,
  Building2,
  Settings,
  LogOut,
  X,
  ChevronDown,
  ChevronRight,
  Share2,
  type LucideIcon,
} from "lucide-react";
import { useSalonAuth } from "@/contexts/SalonAuthContext";
import { AuthPermission, AuthUserRole, AUTH_ROLE_LABELS, AUTH_ROLE_COLORS } from "@/types/salon/auth";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface SalonSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// ===== Definição dos itens de menu =====
interface MenuItem {
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: AuthPermission;
  roles?: AuthUserRole[];
  badge?: string;
  children?: Omit<MenuItem, 'children' | 'icon'>[];
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

// Menu completo organizado por seções
const MENU_SECTIONS: MenuSection[] = [
  {
    title: "Principal",
    items: [
      {
        label: "Dashboard",
        href: "/salon/dashboard",
        icon: LayoutDashboard,
        permission: "dashboard.view",
      },
    ],
  },
  {
    title: "Gestão",
    items: [
      {
        label: "Usuários",
        href: "/salon/users",
        icon: Users,
        permission: "users.view",
        roles: ["ADMIN"],
      },
      {
        label: "Clientes",
        href: "/salon/clients",
        icon: UserCircle,
        permission: "clients.view",
        roles: ["ADMIN", "RECEPCIONIST", "PROFESSIONAL"],
      },
      {
        label: "Profissionais",
        href: "/salon/professionals",
        icon: Scissors,
        permission: "professionals.view",
        roles: ["ADMIN", "RECEPCIONIST"],
      },
      {
        label: "Serviços",
        href: "/salon/services",
        icon: Scissors,
        permission: "services.view",
      },
    ],
  },
  {
    title: "Agendamento",
    items: [
      {
        label: "Agenda",
        href: "/salon/appointments",
        icon: Calendar,
        permission: "appointments.view",
      },
    ],
  },
  {
    title: "Financeiro",
    items: [
      {
        label: "Caixa",
        href: "/salon/finance/cash",
        icon: DollarSign,
        permission: "finance.view",
        roles: ["ADMIN", "RECEPCIONIST"],
      },
      {
        label: "Relatórios",
        href: "/salon/finance/reports",
        icon: DollarSign,
        permission: "finance.view_all",
        roles: ["ADMIN"],
      },
      {
        label: "Comissões",
        href: "/salon/commission",
        icon: Percent,
        permission: "commissions.view",
        roles: ["ADMIN", "PROFESSIONAL"],
      },
    ],
  },
  {
    title: "Marketing",
    items: [
      {
        label: "Gerenciar Rede Social",
        href: "/admin/dashboard",
        icon: Share2,
        roles: ["ADMIN"],
      },
      {
        label: "Promoções",
        href: "/salon/promotions",
        icon: Gift,
        permission: "promotions.view",
        roles: ["ADMIN", "RECEPCIONIST"],
      },
      {
        label: "Fidelidade",
        href: "/salon/loyalty",
        icon: Star,
        permission: "loyalty.view",
        roles: ["ADMIN"],
      },
    ],
  },
  {
    title: "Estoque",
    items: [
      {
        label: "Produtos",
        href: "/salon/stock",
        icon: Package,
        permission: "stock.view",
        roles: ["ADMIN"],
      },
    ],
  },
  {
    title: "Avançado",
    items: [
      {
        label: "Avaliações",
        href: "/salon/reviews",
        icon: Star,
        permission: "reviews.view_all",
        roles: ["ADMIN"],
      },
      {
        label: "Unidades",
        href: "/salon/units",
        icon: Building2,
        permission: "units.view_all",
        roles: ["ADMIN"],
      },
    ],
  },
  {
    title: "Sistema",
    items: [
      {
        label: "Configurações",
        href: "/salon/settings",
        icon: Settings,
        permission: "system.settings",
        roles: ["ADMIN"],
      },
    ],
  },
];

// Menu específico para clientes
const CLIENT_MENU: MenuItem[] = [
  {
    label: "Meus Agendamentos",
    href: "/salon/client/appointments",
    icon: Calendar,
  },
  {
    label: "Novo Agendamento",
    href: "/salon/client/book",
    icon: Calendar,
  },
  {
    label: "Meus Pontos",
    href: "/salon/client/loyalty",
    icon: Star,
  },
  {
    label: "Minhas Avaliações",
    href: "/salon/client/reviews",
    icon: Star,
  },
  {
    label: "Meu Perfil",
    href: "/salon/client/profile",
    icon: UserCircle,
  },
];

export function SalonSidebar({ isOpen, onClose }: SalonSidebarProps) {
  const pathname = usePathname();
  const { logout, user, can, isRole } = useSalonAuth();
  const [expandedSections, setExpandedSections] = useState<string[]>(["Principal", "Gestão", "Agendamento", "Financeiro", "Marketing"]);

  const handleLogout = () => {
    logout();
  };

  const toggleSection = (title: string) => {
    setExpandedSections(prev =>
      prev.includes(title)
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  // Filtra itens baseado nas permissões e roles do usuário
  const canAccessItem = (item: MenuItem): boolean => {
    // Verifica role
    if (item.roles && !isRole(item.roles)) {
      return false;
    }

    // Verifica permissão
    if (item.permission && !can(item.permission)) {
      return false;
    }

    return true;
  };

  // Filtra seções e itens visíveis
  const visibleSections = MENU_SECTIONS.map(section => ({
    ...section,
    items: section.items.filter(canAccessItem),
  })).filter(section => section.items.length > 0);

  // Se for cliente, usa menu específico
  const isClient = user?.role === "CLIENT";
  const menuItems = isClient ? CLIENT_MENU : null;

  const roleColors = user ? AUTH_ROLE_COLORS[user.role] : { bg: "", text: "" };

  return (
    <>
      {/* Overlay para mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-64 flex-col bg-white shadow-xl transition-transform duration-300 dark:bg-gray-900 dark:shadow-gray-900/50 lg:static lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header da Sidebar */}
        <div className="flex h-16 items-center justify-between border-b px-4 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500">
              <Scissors className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-gray-900 dark:text-white truncate max-w-[120px]">
                Belezza
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Salão & Barbearia
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navegação */}
        <nav className="flex-1 overflow-y-auto p-4">
          {/* Menu para Cliente */}
          {isClient && menuItems && (
            <ul className="space-y-1">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
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
          )}

          {/* Menu para outros perfis */}
          {!isClient && visibleSections.map((section) => (
            <div key={section.title} className="mb-4">
              <button
                onClick={() => toggleSection(section.title)}
                className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                {section.title}
                {expandedSections.includes(section.title) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>

              {expandedSections.includes(section.title) && (
                <ul className="mt-1 space-y-1">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
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
                          <span className="flex-1">{item.label}</span>
                          {item.badge && (
                            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-600 dark:bg-violet-900/50 dark:text-violet-400">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </nav>

        {/* Footer da Sidebar */}
        <div className="border-t p-4 dark:border-gray-800">
          <div className="mb-3 flex items-center gap-3 px-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-600 dark:bg-violet-900/50 dark:text-violet-400">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                {user?.name || "Usuário"}
              </p>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                  roleColors.bg,
                  roleColors.text
                )}>
                  {user ? AUTH_ROLE_LABELS[user.role] : ""}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
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
