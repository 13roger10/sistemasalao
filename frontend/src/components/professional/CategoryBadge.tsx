"use client";

import {
  Scissors,
  Palette,
  Sparkles,
  Eye,
  Heart,
  Users,
  Crown,
  Briefcase,
  Phone,
  HelpCircle,
  Brush,
  Hand,
  Gem,
  Flower2,
} from "lucide-react";
import type { ProfessionalCategory } from "@/types/salon";

// Configuração de cores e ícones por categoria
const categoryConfig: Record<
  ProfessionalCategory,
  {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
    borderColor: string;
    label: string;
  }
> = {
  PROPRIETARIO: {
    icon: Crown,
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    borderColor: "border-amber-200 dark:border-amber-800",
    label: "Proprietário",
  },
  GERENTE: {
    icon: Briefcase,
    color: "text-indigo-700 dark:text-indigo-400",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
    borderColor: "border-indigo-200 dark:border-indigo-800",
    label: "Gerente",
  },
  RECEPCIONISTA: {
    icon: Phone,
    color: "text-cyan-700 dark:text-cyan-400",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
    borderColor: "border-cyan-200 dark:border-cyan-800",
    label: "Recepcionista",
  },
  CABELEIREIRO: {
    icon: Scissors,
    color: "text-purple-700 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    borderColor: "border-purple-200 dark:border-purple-800",
    label: "Cabeleireiro(a)",
  },
  COLORISTA: {
    icon: Palette,
    color: "text-pink-700 dark:text-pink-400",
    bgColor: "bg-pink-100 dark:bg-pink-900/30",
    borderColor: "border-pink-200 dark:border-pink-800",
    label: "Colorista",
  },
  MANICURE_PEDICURE: {
    icon: Hand,
    color: "text-rose-700 dark:text-rose-400",
    bgColor: "bg-rose-100 dark:bg-rose-900/30",
    borderColor: "border-rose-200 dark:border-rose-800",
    label: "Manicure/Pedicure",
  },
  NAIL_DESIGNER: {
    icon: Gem,
    color: "text-fuchsia-700 dark:text-fuchsia-400",
    bgColor: "bg-fuchsia-100 dark:bg-fuchsia-900/30",
    borderColor: "border-fuchsia-200 dark:border-fuchsia-800",
    label: "Nail Designer",
  },
  MAQUIADOR: {
    icon: Brush,
    color: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    borderColor: "border-red-200 dark:border-red-800",
    label: "Maquiador(a)",
  },
  DESIGNER_SOBRANCELHAS: {
    icon: Eye,
    color: "text-orange-700 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    borderColor: "border-orange-200 dark:border-orange-800",
    label: "Designer Sobrancelhas",
  },
  LASH_DESIGNER: {
    icon: Sparkles,
    color: "text-violet-700 dark:text-violet-400",
    bgColor: "bg-violet-100 dark:bg-violet-900/30",
    borderColor: "border-violet-200 dark:border-violet-800",
    label: "Lash Designer",
  },
  ESTETICISTA: {
    icon: Heart,
    color: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    label: "Esteticista",
  },
  BARBEIRO: {
    icon: Scissors,
    color: "text-slate-700 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-900/30",
    borderColor: "border-slate-200 dark:border-slate-800",
    label: "Barbeiro",
  },
  AUXILIAR: {
    icon: Users,
    color: "text-gray-700 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-900/30",
    borderColor: "border-gray-200 dark:border-gray-800",
    label: "Auxiliar",
  },
  OUTRO: {
    icon: HelpCircle,
    color: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    borderColor: "border-blue-200 dark:border-blue-800",
    label: "Outro",
  },
};

interface CategoryBadgeProps {
  category: ProfessionalCategory;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  showLabel?: boolean;
  className?: string;
}

export function CategoryBadge({
  category,
  size = "md",
  showIcon = true,
  showLabel = true,
  className = "",
}: CategoryBadgeProps) {
  const config = categoryConfig[category] || categoryConfig.OUTRO;
  const Icon = config.icon;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-2.5 py-1 text-sm gap-1.5",
    lg: "px-3 py-1.5 text-base gap-2",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${config.bgColor} ${config.color} ${config.borderColor} ${sizeClasses[size]} ${className}`}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

// Componente de ícone de categoria (apenas ícone)
export function CategoryIcon({
  category,
  size = "md",
  className = "",
}: {
  category: ProfessionalCategory;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const config = categoryConfig[category] || categoryConfig.OUTRO;
  const Icon = config.icon;

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <div
      className={`inline-flex items-center justify-center rounded-lg p-2 ${config.bgColor} ${config.color} ${className}`}
    >
      <Icon className={iconSizes[size]} />
    </div>
  );
}

// Card de categoria com contador
interface CategoryCardProps {
  category: ProfessionalCategory;
  count: number;
  onClick?: () => void;
  selected?: boolean;
}

export function CategoryCard({
  category,
  count,
  onClick,
  selected = false,
}: CategoryCardProps) {
  const config = categoryConfig[category] || categoryConfig.OUTRO;
  const Icon = config.icon;

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg border p-4 transition-all hover:shadow-md ${
        selected
          ? `${config.bgColor} ${config.borderColor} ring-2 ring-offset-2`
          : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
      }`}
    >
      <div className={`rounded-lg p-2 ${config.bgColor} ${config.color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-left">
        <p className="font-medium text-gray-900 dark:text-white">
          {config.label}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {count} {count === 1 ? "profissional" : "profissionais"}
        </p>
      </div>
    </button>
  );
}

// Exportar configuração para uso externo
export { categoryConfig };
export type { CategoryBadgeProps, CategoryCardProps };
