"use client";

import { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  max?: number;
  size?: "sm" | "md" | "lg" | "xl";
  readonly?: boolean;
  showValue?: boolean;
  showCount?: boolean;
  count?: number;
  className?: string;
}

const sizeStyles = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
  xl: "h-8 w-8",
};

const gapStyles = {
  sm: "gap-0.5",
  md: "gap-1",
  lg: "gap-1",
  xl: "gap-1.5",
};

export function StarRating({
  value,
  onChange,
  max = 5,
  size = "md",
  readonly = false,
  showValue = false,
  showCount = false,
  count,
  className = "",
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0);

  const displayValue = hoverValue || value;

  const handleClick = (rating: number) => {
    if (!readonly && onChange) {
      onChange(rating);
    }
  };

  const handleMouseEnter = (rating: number) => {
    if (!readonly) {
      setHoverValue(rating);
    }
  };

  const handleMouseLeave = () => {
    setHoverValue(0);
  };

  return (
    <div className={`inline-flex items-center ${gapStyles[size]} ${className}`}>
      <div className={`flex ${gapStyles[size]}`}>
        {Array.from({ length: max }).map((_, index) => {
          const rating = index + 1;
          const isFilled = rating <= displayValue;
          const isHalf = !isFilled && rating - 0.5 <= displayValue;

          return (
            <button
              key={index}
              type="button"
              onClick={() => handleClick(rating)}
              onMouseEnter={() => handleMouseEnter(rating)}
              onMouseLeave={handleMouseLeave}
              disabled={readonly}
              className={`
                relative
                ${readonly ? "cursor-default" : "cursor-pointer"}
                focus:outline-none
              `}
              aria-label={`Avaliar ${rating} de ${max} estrelas`}
            >
              {/* Background star (empty) */}
              <Star
                className={`
                  ${sizeStyles[size]}
                  text-gray-300 dark:text-gray-600
                  transition-colors
                `}
              />

              {/* Filled star (overlay) */}
              {(isFilled || isHalf) && (
                <Star
                  className={`
                    ${sizeStyles[size]}
                    absolute inset-0
                    text-yellow-400 fill-yellow-400
                    transition-colors
                    ${isHalf ? "clip-half" : ""}
                  `}
                  style={isHalf ? { clipPath: "inset(0 50% 0 0)" } : undefined}
                />
              )}
            </button>
          );
        })}
      </div>

      {showValue && (
        <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          {value.toFixed(1)}
        </span>
      )}

      {showCount && count !== undefined && (
        <span className="ml-1 text-sm text-gray-500 dark:text-gray-400">
          ({count})
        </span>
      )}
    </div>
  );
}

// Rating Display Component (read-only with more info)
interface RatingDisplayProps {
  value: number;
  count?: number;
  size?: "sm" | "md" | "lg";
  showBreakdown?: boolean;
  breakdown?: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  className?: string;
}

export function RatingDisplay({
  value,
  count,
  size = "md",
  showBreakdown = false,
  breakdown,
  className = "",
}: RatingDisplayProps) {
  const totalReviews = breakdown
    ? Object.values(breakdown).reduce((a, b) => a + b, 0)
    : count || 0;

  return (
    <div className={className}>
      <div className="flex items-center gap-3">
        <span className="text-3xl font-bold text-gray-900 dark:text-white">
          {value.toFixed(1)}
        </span>
        <div>
          <StarRating value={value} size={size} readonly />
          {totalReviews > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {totalReviews} {totalReviews === 1 ? "avaliação" : "avaliações"}
            </p>
          )}
        </div>
      </div>

      {showBreakdown && breakdown && (
        <div className="mt-4 space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => {
            const ratingCount = breakdown[rating as keyof typeof breakdown];
            const percentage = totalReviews > 0 ? (ratingCount / totalReviews) * 100 : 0;

            return (
              <div key={rating} className="flex items-center gap-2">
                <span className="w-8 text-sm text-gray-600 dark:text-gray-400">
                  {rating} ★
                </span>
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-12 text-sm text-gray-500 dark:text-gray-400 text-right">
                  {ratingCount}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Rating Input with labels
interface RatingInputProps {
  value: number;
  onChange: (value: number) => void;
  labels?: string[];
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function RatingInput({
  value,
  onChange,
  labels = ["Péssimo", "Ruim", "Regular", "Bom", "Excelente"],
  size = "lg",
  className = "",
}: RatingInputProps) {
  const [hoverValue, setHoverValue] = useState(0);
  const displayValue = hoverValue || value;
  const label = displayValue > 0 ? labels[displayValue - 1] : "";

  return (
    <div className={`text-center ${className}`}>
      <StarRating
        value={value}
        onChange={onChange}
        size={size}
      />
      <p
        className={`
          mt-2 text-sm font-medium transition-all duration-200
          ${displayValue > 0 ? "text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-500"}
        `}
        style={{ minHeight: "1.5rem" }}
      >
        {label || "Selecione uma nota"}
      </p>
    </div>
  );
}
