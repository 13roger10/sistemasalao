"use client";

import { forwardRef, useRef, useState, ButtonHTMLAttributes, MouseEvent } from "react";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-violet-500 text-white hover:bg-violet-600 active:bg-violet-700 shadow-sm",
  secondary:
    "bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300",
  outline:
    "border-2 border-violet-500 text-violet-500 hover:bg-violet-50 active:bg-violet-100",
  ghost:
    "text-gray-600 hover:bg-gray-100 active:bg-gray-200",
  danger:
    "bg-red-500 text-white hover:bg-red-600 active:bg-red-700 shadow-sm",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm gap-1.5",
  md: "px-4 py-2 text-base gap-2",
  lg: "px-6 py-3 text-lg gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className = "",
      disabled,
      children,
      onClick,
      ...props
    },
    ref
  ) => {
    // Duplo clique (BUG-024): enquanto a ação assíncrona do clique não termina, os cliques
    // seguintes são ignorados — o isLoading da tela só desabilita depois do próximo render.
    const emAndamento = useRef(false);
    const [aguardando, setAguardando] = useState(false);
    const isDisabled = disabled || isLoading || aguardando;

    const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
      if (emAndamento.current) {
        e.preventDefault();
        return;
      }
      const resultado = onClick?.(e) as unknown;
      if (resultado instanceof Promise) {
        emAndamento.current = true;
        setAguardando(true);
        resultado
          .catch(() => {})
          .finally(() => {
            emAndamento.current = false;
            setAguardando(false);
          });
      }
    };

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center font-medium rounded-lg
          transition-all duration-200 ease-out
          focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? "w-full" : ""}
          ${className}
        `}
        {...props}
        onClick={handleClick}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";
