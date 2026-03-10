"use client";

import { HTMLAttributes } from "react";

interface LoadingProps extends HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "spinner" | "dots" | "pulse" | "bars";
  color?: "primary" | "white" | "gray";
  text?: string;
  fullScreen?: boolean;
}

const sizeMap = {
  sm: { spinner: "h-4 w-4", dots: "h-2 w-2", bars: "h-4 w-1" },
  md: { spinner: "h-6 w-6", dots: "h-3 w-3", bars: "h-6 w-1.5" },
  lg: { spinner: "h-8 w-8", dots: "h-4 w-4", bars: "h-8 w-2" },
  xl: { spinner: "h-12 w-12", dots: "h-5 w-5", bars: "h-12 w-2.5" },
};

const colorMap = {
  primary: "border-violet-500 bg-violet-500",
  white: "border-white bg-white",
  gray: "border-gray-400 bg-gray-400",
};

// Spinner Component
function Spinner({ size = "md", color = "primary" }: { size?: LoadingProps["size"]; color?: LoadingProps["color"] }) {
  return (
    <div
      className={`
        ${sizeMap[size!].spinner}
        animate-spin rounded-full
        border-2 border-t-transparent
        ${colorMap[color!].split(" ")[0]}
      `}
    />
  );
}

// Dots Component
function Dots({ size = "md", color = "primary" }: { size?: LoadingProps["size"]; color?: LoadingProps["color"] }) {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`
            ${sizeMap[size!].dots}
            rounded-full
            ${colorMap[color!].split(" ")[1]}
            animate-bounce
          `}
          style={{
            animationDelay: `${i * 0.15}s`,
            animationDuration: "0.6s",
          }}
        />
      ))}
    </div>
  );
}

// Pulse Component
function Pulse({ size = "md", color = "primary" }: { size?: LoadingProps["size"]; color?: LoadingProps["color"] }) {
  return (
    <div className="relative flex items-center justify-center">
      <div
        className={`
          ${sizeMap[size!].spinner}
          rounded-full
          ${colorMap[color!].split(" ")[1]}
          animate-ping absolute opacity-75
        `}
      />
      <div
        className={`
          ${sizeMap[size!].spinner}
          rounded-full
          ${colorMap[color!].split(" ")[1]}
        `}
      />
    </div>
  );
}

// Bars Component
function Bars({ size = "md", color = "primary" }: { size?: LoadingProps["size"]; color?: LoadingProps["color"] }) {
  return (
    <div className="flex items-end gap-0.5">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`
            ${sizeMap[size!].bars}
            rounded-sm
            ${colorMap[color!].split(" ")[1]}
            animate-pulse
          `}
          style={{
            animationDelay: `${i * 0.15}s`,
            animationDuration: "0.8s",
            transform: `scaleY(${0.5 + (i % 2) * 0.5})`,
          }}
        />
      ))}
    </div>
  );
}

export function Loading({
  size = "md",
  variant = "spinner",
  color = "primary",
  text,
  fullScreen = false,
  className = "",
  ...props
}: LoadingProps) {
  const LoadingComponent = {
    spinner: Spinner,
    dots: Dots,
    pulse: Pulse,
    bars: Bars,
  }[variant];

  const content = (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
      {...props}
    >
      <LoadingComponent size={size} color={color} />
      {text && (
        <p className={`text-sm font-medium ${color === "white" ? "text-white" : "text-gray-600"}`}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
}

// Page Loading Component (for route transitions)
export function PageLoading({ text = "Carregando..." }: { text?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 to-purple-100">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500 shadow-lg">
          <Loading variant="spinner" size="lg" color="white" />
        </div>
        <p className="text-lg font-medium text-gray-700">{text}</p>
      </div>
    </div>
  );
}

// Skeleton Component for content loading
interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string;
  height?: string;
  rounded?: "none" | "sm" | "md" | "lg" | "full";
}

const roundedMap = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  full: "rounded-full",
};

export function Skeleton({
  width = "100%",
  height = "1rem",
  rounded = "md",
  className = "",
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 ${roundedMap[rounded]} ${className}`}
      style={{ width, height, ...style }}
      {...props}
    />
  );
}
