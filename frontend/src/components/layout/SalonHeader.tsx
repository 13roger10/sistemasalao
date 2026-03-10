"use client";

import { Menu, Bell, Sun, Moon, Building2, ChevronDown, Check } from "lucide-react";
import { useSalonAuth } from "@/contexts/SalonAuthContext";
import { useUnit } from "@/contexts/UnitContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AUTH_ROLE_LABELS, AUTH_ROLE_COLORS } from "@/types/salon/auth";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface SalonHeaderProps {
  onMenuClick: () => void;
  pageTitle?: string;
}

export function SalonHeader({ onMenuClick, pageTitle }: SalonHeaderProps) {
  const { user } = useSalonAuth();
  const { theme, setTheme } = useTheme();
  const { selectedUnit, selectedUnitId, availableUnits, selectUnit, canChangeUnit, canViewAllUnits } = useUnit();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUnitSelector, setShowUnitSelector] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const roleColors = user ? AUTH_ROLE_COLORS[user.role] : { bg: "", text: "" };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-4 dark:border-gray-800 dark:bg-gray-900 lg:px-6">
      {/* Left side */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {pageTitle && (
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            {pageTitle}
          </h1>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Unit Selector - only show if user has multiple units or is admin */}
        {canViewAllUnits && availableUnits.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowUnitSelector(!showUnitSelector)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                selectedUnit
                  ? "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-900/30 dark:text-violet-400"
                  : "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              )}
            >
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">
                {selectedUnit ? selectedUnit.name : "Todas Unidades"}
              </span>
              <ChevronDown className="h-4 w-4" />
            </button>

            {showUnitSelector && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUnitSelector(false)}
                />
                <div className="absolute right-0 top-full mt-2 z-50 w-56 rounded-lg border bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                  <div className="border-b p-2 dark:border-gray-700">
                    <p className="px-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Selecionar Unidade
                    </p>
                  </div>
                  <div className="max-h-64 overflow-y-auto p-1">
                    {/* All units option */}
                    {canViewAllUnits && (
                      <button
                        onClick={() => {
                          selectUnit(null);
                          setShowUnitSelector(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                          selectedUnitId === null
                            ? "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                            : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                        )}
                      >
                        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-600">
                          <Building2 className="h-3.5 w-3.5" />
                        </div>
                        <span className="flex-1 text-left">Todas Unidades</span>
                        {selectedUnitId === null && (
                          <Check className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                        )}
                      </button>
                    )}
                    {/* Individual units */}
                    {availableUnits.map((unit) => (
                      <button
                        key={unit.id}
                        onClick={() => {
                          selectUnit(unit.id);
                          setShowUnitSelector(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                          selectedUnitId === unit.id
                            ? "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                            : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                        )}
                      >
                        <div
                          className="flex h-6 w-6 items-center justify-center rounded-lg text-white"
                          style={{ backgroundColor: unit.color || "#8B5CF6" }}
                        >
                          <Building2 className="h-3.5 w-3.5" />
                        </div>
                        <span className="flex-1 text-left">{unit.name}</span>
                        {selectedUnitId === unit.id && (
                          <Check className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Show current unit badge for non-admin users */}
        {!canViewAllUnits && selectedUnit && (
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-white"
            style={{ backgroundColor: selectedUnit.color || "#8B5CF6" }}
          >
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">{selectedUnit.name}</span>
          </div>
        )}

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          title={theme === "dark" ? "Modo claro" : "Modo escuro"}
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <Bell className="h-5 w-5" />
            {/* Badge de notificações */}
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              3
            </span>
          </button>

          {/* Dropdown de notificações */}
          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifications(false)}
              />
              <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-lg border bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                <div className="border-b p-3 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Notificações
                  </h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {/* Exemplo de notificações */}
                  <div className="border-b p-3 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Novo agendamento
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      João Silva agendou corte para 14:00
                    </p>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      Há 5 minutos
                    </p>
                  </div>
                  <div className="border-b p-3 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Estoque baixo
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Pomada modeladora abaixo do mínimo
                    </p>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      Há 1 hora
                    </p>
                  </div>
                  <div className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Cliente aniversariante
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Carlos Oliveira faz aniversário hoje!
                    </p>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      Há 2 horas
                    </p>
                  </div>
                </div>
                <div className="border-t p-2 dark:border-gray-700">
                  <button className="w-full rounded-lg p-2 text-center text-sm font-medium text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-900/20">
                    Ver todas
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User info - hidden on mobile */}
        <div className="hidden items-center gap-3 border-l pl-4 dark:border-gray-700 md:flex">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-600 dark:bg-violet-900/50 dark:text-violet-400">
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {user?.name || "Usuário"}
            </span>
            <span className={cn(
              "inline-flex items-center text-xs",
              roleColors.text
            )}>
              {user ? AUTH_ROLE_LABELS[user.role] : ""}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
