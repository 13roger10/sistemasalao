"use client";

import { forwardRef, InputHTMLAttributes, useState } from "react";
import { Eye, EyeOff, AlertCircle } from "lucide-react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showPasswordToggle?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      showPasswordToggle = false,
      type = "text",
      className = "",
      id,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    const isPassword = type === "password";
    const inputType = isPassword && showPassword ? "text" : type;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={inputType}
            className={`
              w-full rounded-lg border bg-white dark:bg-gray-700 px-4 py-2.5
              text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500
              transition-all duration-200
              focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20
              disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-500 dark:disabled:text-gray-400
              ${leftIcon ? "pl-10" : ""}
              ${rightIcon || (isPassword && showPasswordToggle) ? "pr-10" : ""}
              ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : "border-gray-300 dark:border-gray-600"}
              ${className}
            `}
            {...props}
          />

          {isPassword && showPasswordToggle ? (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          ) : rightIcon ? (
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
              {rightIcon}
            </div>
          ) : null}
        </div>

        {error && (
          <p className="mt-1.5 flex items-center gap-1 text-sm text-red-500 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        )}

        {hint && !error && (
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
