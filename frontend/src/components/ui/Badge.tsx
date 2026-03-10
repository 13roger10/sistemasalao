"use client";

import { HTMLAttributes, forwardRef } from "react";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "purple";
type BadgeSize = "sm" | "md" | "lg";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  removable?: boolean;
  onRemove?: () => void;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  success: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  error: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  info: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  purple: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
};

const dotColors: Record<BadgeVariant, string> = {
  default: "bg-gray-500",
  success: "bg-green-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
  info: "bg-blue-500",
  purple: "bg-violet-500",
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-sm",
  lg: "px-3 py-1.5 text-base",
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = "default",
      size = "md",
      dot = false,
      removable = false,
      onRemove,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    return (
      <span
        ref={ref}
        className={`
          inline-flex items-center gap-1.5 rounded-full font-medium
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {dot && (
          <span
            className={`h-1.5 w-1.5 rounded-full ${dotColors[variant]}`}
            aria-hidden="true"
          />
        )}
        {children}
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            className="ml-0.5 -mr-1 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            aria-label="Remover"
          >
            <svg
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </span>
    );
  }
);

Badge.displayName = "Badge";

// Status Badge for specific states
interface StatusBadgeProps {
  status: "active" | "inactive" | "pending" | "completed" | "canceled" | "confirmed" | "in_progress" | "no_show";
  size?: BadgeSize;
  showDot?: boolean;
}

const statusConfig: Record<
  StatusBadgeProps["status"],
  { variant: BadgeVariant; label: string }
> = {
  active: { variant: "success", label: "Ativo" },
  inactive: { variant: "default", label: "Inativo" },
  pending: { variant: "warning", label: "Pendente" },
  completed: { variant: "success", label: "Concluído" },
  canceled: { variant: "error", label: "Cancelado" },
  confirmed: { variant: "info", label: "Confirmado" },
  in_progress: { variant: "purple", label: "Em andamento" },
  no_show: { variant: "error", label: "Não compareceu" },
};

export function StatusBadge({ status, size = "sm", showDot = true }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge variant={config.variant} size={size} dot={showDot}>
      {config.label}
    </Badge>
  );
}

// Loyalty Level Badge
interface LoyaltyBadgeProps {
  level: "bronze" | "silver" | "gold";
  size?: BadgeSize;
}

const loyaltyConfig: Record<
  LoyaltyBadgeProps["level"],
  { color: string; label: string; icon: string }
> = {
  bronze: {
    color: "bg-amber-700 text-white",
    label: "Bronze",
    icon: "🥉",
  },
  silver: {
    color: "bg-gray-400 text-white",
    label: "Prata",
    icon: "🥈",
  },
  gold: {
    color: "bg-yellow-500 text-white",
    label: "Ouro",
    icon: "🥇",
  },
};

export function LoyaltyBadge({ level, size = "md" }: LoyaltyBadgeProps) {
  const config = loyaltyConfig[level];
  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        ${config.color}
        ${sizeStyles[size]}
      `}
    >
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}
