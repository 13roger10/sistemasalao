"use client";

import { Star, Award, Trophy, Crown, Sparkles } from "lucide-react";
import type { ProfessionalLevel } from "@/types/salon";

// Configuração de cores e ícones por nível
const levelConfig: Record<
  ProfessionalLevel,
  {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
    borderColor: string;
    label: string;
    stars: number;
  }
> = {
  JUNIOR: {
    icon: Star,
    color: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    borderColor: "border-green-200 dark:border-green-800",
    label: "Junior",
    stars: 1,
  },
  PLENO: {
    icon: Star,
    color: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    borderColor: "border-blue-200 dark:border-blue-800",
    label: "Pleno",
    stars: 2,
  },
  SENIOR: {
    icon: Award,
    color: "text-purple-700 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    borderColor: "border-purple-200 dark:border-purple-800",
    label: "Senior",
    stars: 3,
  },
  ESPECIALISTA: {
    icon: Trophy,
    color: "text-orange-700 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    borderColor: "border-orange-200 dark:border-orange-800",
    label: "Especialista",
    stars: 4,
  },
  MASTER: {
    icon: Crown,
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    borderColor: "border-amber-200 dark:border-amber-800",
    label: "Master",
    stars: 5,
  },
};

interface LevelBadgeProps {
  level: ProfessionalLevel;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  showLabel?: boolean;
  showStars?: boolean;
  className?: string;
}

export function LevelBadge({
  level,
  size = "md",
  showIcon = true,
  showLabel = true,
  showStars = false,
  className = "",
}: LevelBadgeProps) {
  const config = levelConfig[level] || levelConfig.JUNIOR;
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

  const starSizes = {
    sm: "h-2.5 w-2.5",
    md: "h-3 w-3",
    lg: "h-3.5 w-3.5",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${config.bgColor} ${config.color} ${config.borderColor} ${sizeClasses[size]} ${className}`}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {showLabel && <span>{config.label}</span>}
      {showStars && (
        <span className="flex items-center gap-0.5 ml-1">
          {Array.from({ length: config.stars }).map((_, i) => (
            <Sparkles key={i} className={`${starSizes[size]} fill-current`} />
          ))}
        </span>
      )}
    </span>
  );
}

// Componente de estrelas de nível
export function LevelStars({
  level,
  size = "md",
}: {
  level: ProfessionalLevel;
  size?: "sm" | "md" | "lg";
}) {
  const config = levelConfig[level] || levelConfig.JUNIOR;

  const starSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${starSizes[size]} ${
            i < config.stars
              ? `${config.color} fill-current`
              : "text-gray-300 dark:text-gray-600"
          }`}
        />
      ))}
    </div>
  );
}

// Exportar configuração para uso externo
export { levelConfig };
export type { LevelBadgeProps };
