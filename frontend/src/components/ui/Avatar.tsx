"use client";

import { forwardRef, ImgHTMLAttributes, useState } from "react";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "size" | "src"> {
  src?: string | null;
  name?: string;
  size?: AvatarSize;
  status?: "online" | "offline" | "busy" | "away";
  showStatus?: boolean;
}

const sizeStyles: Record<AvatarSize, { avatar: string; text: string; status: string }> = {
  xs: { avatar: "h-6 w-6", text: "text-xs", status: "h-1.5 w-1.5 border" },
  sm: { avatar: "h-8 w-8", text: "text-xs", status: "h-2 w-2 border" },
  md: { avatar: "h-10 w-10", text: "text-sm", status: "h-2.5 w-2.5 border-2" },
  lg: { avatar: "h-12 w-12", text: "text-base", status: "h-3 w-3 border-2" },
  xl: { avatar: "h-16 w-16", text: "text-lg", status: "h-4 w-4 border-2" },
  "2xl": { avatar: "h-24 w-24", text: "text-2xl", status: "h-5 w-5 border-2" },
};

const statusColors: Record<string, string> = {
  online: "bg-green-500",
  offline: "bg-gray-400",
  busy: "bg-red-500",
  away: "bg-amber-500",
};

// Generate consistent color based on name
function getColorFromName(name: string): string {
  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-yellow-500",
    "bg-lime-500",
    "bg-green-500",
    "bg-emerald-500",
    "bg-teal-500",
    "bg-cyan-500",
    "bg-sky-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-purple-500",
    "bg-fuchsia-500",
    "bg-pink-500",
    "bg-rose-500",
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string, maxLength: number = 2): string {
  return name
    .split(" ")
    .filter((word) => word.length > 0)
    .map((word) => word[0].toUpperCase())
    .slice(0, maxLength)
    .join("");
}

export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(
  (
    {
      src,
      name = "",
      size = "md",
      status,
      showStatus = false,
      className = "",
      alt,
      ...props
    },
    ref
  ) => {
    const [imageError, setImageError] = useState(false);
    const styles = sizeStyles[size];
    const initials = getInitials(name);
    const bgColor = getColorFromName(name || "User");

    const showImage = src && !imageError;

    return (
      <span
        ref={ref}
        className={`relative inline-flex shrink-0 ${className}`}
      >
        {showImage ? (
          <img
            src={src}
            alt={alt || name || "Avatar"}
            onError={() => setImageError(true)}
            className={`
              ${styles.avatar}
              rounded-full object-cover
              ring-2 ring-white dark:ring-gray-800
            `}
            {...props}
          />
        ) : (
          <span
            className={`
              ${styles.avatar}
              ${bgColor}
              rounded-full flex items-center justify-center
              text-white font-medium
              ${styles.text}
              ring-2 ring-white dark:ring-gray-800
            `}
          >
            {initials || "?"}
          </span>
        )}

        {showStatus && status && (
          <span
            className={`
              absolute bottom-0 right-0
              ${styles.status}
              ${statusColors[status]}
              rounded-full border-white dark:border-gray-800
            `}
            aria-label={`Status: ${status}`}
          />
        )}
      </span>
    );
  }
);

Avatar.displayName = "Avatar";

// Avatar Group
interface AvatarGroupProps {
  avatars: { src?: string | null; name?: string }[];
  max?: number;
  size?: AvatarSize;
  className?: string;
}

export function AvatarGroup({
  avatars,
  max = 4,
  size = "md",
  className = "",
}: AvatarGroupProps) {
  const visibleAvatars = avatars.slice(0, max);
  const remaining = avatars.length - max;
  const styles = sizeStyles[size];

  return (
    <div className={`flex -space-x-2 ${className}`}>
      {visibleAvatars.map((avatar, index) => (
        <Avatar
          key={index}
          src={avatar.src}
          name={avatar.name}
          size={size}
          className="ring-2 ring-white dark:ring-gray-800"
        />
      ))}
      {remaining > 0 && (
        <span
          className={`
            ${styles.avatar}
            flex items-center justify-center
            rounded-full bg-gray-200 dark:bg-gray-700
            text-gray-600 dark:text-gray-300 font-medium
            ${styles.text}
            ring-2 ring-white dark:ring-gray-800
          `}
        >
          +{remaining}
        </span>
      )}
    </div>
  );
}

// Avatar with Name
interface AvatarWithNameProps extends AvatarProps {
  subtitle?: string;
  orientation?: "horizontal" | "vertical";
}

export function AvatarWithName({
  name,
  subtitle,
  orientation = "horizontal",
  size = "md",
  ...props
}: AvatarWithNameProps) {
  return (
    <div
      className={`
        flex items-center gap-3
        ${orientation === "vertical" ? "flex-col text-center" : ""}
      `}
    >
      <Avatar name={name} size={size} {...props} />
      <div>
        <p className="font-medium text-gray-900 dark:text-white">{name}</p>
        {subtitle && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
