"use client";

import { useState, useEffect, useMemo, useRef } from "react";

interface ImageInfo {
  width: number;
  height: number;
  size: number;
  type: string;
  aspectRatio: string;
  quality: "high" | "medium" | "low";
}

interface ImageMetadataProps {
  imageData: string;
  variant?: "compact" | "full";
  className?: string;
}

// Calculate quality based on dimensions
function getImageQuality(
  width: number,
  height: number
): "high" | "medium" | "low" {
  const pixels = width * height;
  if (pixels >= 1920 * 1080) return "high";
  if (pixels >= 1280 * 720) return "medium";
  return "low";
}

// Calculate aspect ratio
function getAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  const ratioW = width / divisor;
  const ratioH = height / divisor;

  // Simplify common ratios
  const ratio = width / height;
  if (Math.abs(ratio - 1) < 0.01) return "1:1";
  if (Math.abs(ratio - 16 / 9) < 0.05) return "16:9";
  if (Math.abs(ratio - 9 / 16) < 0.05) return "9:16";
  if (Math.abs(ratio - 4 / 5) < 0.05) return "4:5";
  if (Math.abs(ratio - 5 / 4) < 0.05) return "5:4";
  if (Math.abs(ratio - 4 / 3) < 0.05) return "4:3";
  if (Math.abs(ratio - 3 / 4) < 0.05) return "3:4";
  if (Math.abs(ratio - 3 / 2) < 0.05) return "3:2";
  if (Math.abs(ratio - 2 / 3) < 0.05) return "2:3";

  // Return simplified ratio if not a common one
  if (ratioW <= 20 && ratioH <= 20) {
    return `${ratioW}:${ratioH}`;
  }

  return `${ratio.toFixed(2)}:1`;
}

// Format file size
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Extract image type from data URL
function getImageType(dataUrl: string): string {
  const match = dataUrl.match(/data:image\/(\w+)/);
  return match ? match[1].toUpperCase() : "UNKNOWN";
}

// Estimate file size from base64
function estimateSize(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1];
  if (!base64) return 0;
  // Base64 string length * 0.75 gives approximate byte size
  return Math.round(base64.length * 0.75);
}

export function ImageMetadata({
  imageData,
  variant = "compact",
  className = "",
}: ImageMetadataProps) {
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
  const [isLoading, setIsLoading] = useState(() => !!imageData);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (!imageData) {
      return;
    }

    if (loadingRef.current) return;
    loadingRef.current = true;

    const img = new window.Image();
    img.onload = () => {
      const info: ImageInfo = {
        width: img.naturalWidth,
        height: img.naturalHeight,
        size: estimateSize(imageData),
        type: getImageType(imageData),
        aspectRatio: getAspectRatio(img.naturalWidth, img.naturalHeight),
        quality: getImageQuality(img.naturalWidth, img.naturalHeight),
      };
      setImageInfo(info);
      setIsLoading(false);
    };
    img.onerror = () => {
      setIsLoading(false);
    };
    img.src = imageData;
  }, [imageData]);

  const qualityConfig = useMemo(() => {
    if (!imageInfo) return null;

    const configs = {
      high: {
        label: "Alta",
        color: "text-green-400",
        bgColor: "bg-green-500/20",
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22,4 12,14.01 9,11.01" />
          </svg>
        ),
      },
      medium: {
        label: "Media",
        color: "text-yellow-400",
        bgColor: "bg-yellow-500/20",
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
        ),
      },
      low: {
        label: "Baixa",
        color: "text-red-400",
        bgColor: "bg-red-500/20",
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" x2="9" y1="9" y2="15" />
            <line x1="9" x2="15" y1="9" y2="15" />
          </svg>
        ),
      },
    };

    return configs[imageInfo.quality];
  }, [imageInfo]);

  if (isLoading) {
    return (
      <div
        className={`flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 backdrop-blur-sm ${className}`}
      >
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        <span className="text-sm text-white/70">Carregando...</span>
      </div>
    );
  }

  if (!imageInfo) return null;

  if (variant === "compact") {
    return (
      <div
        className={`flex flex-wrap items-center gap-2 text-xs text-white/80 ${className}`}
      >
        {/* Dimensions */}
        <div className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 backdrop-blur-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 w-3"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" />
          </svg>
          <span>
            {imageInfo.width} x {imageInfo.height}
          </span>
        </div>

        {/* Aspect Ratio */}
        <div className="rounded-full bg-white/10 px-2 py-1 backdrop-blur-sm">
          {imageInfo.aspectRatio}
        </div>

        {/* File Size */}
        <div className="rounded-full bg-white/10 px-2 py-1 backdrop-blur-sm">
          {formatSize(imageInfo.size)}
        </div>

        {/* Quality Badge */}
        {qualityConfig && (
          <div
            className={`flex items-center gap-1 rounded-full ${qualityConfig.bgColor} px-2 py-1 ${qualityConfig.color}`}
          >
            {qualityConfig.icon}
            <span>{qualityConfig.label}</span>
          </div>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div
      className={`rounded-xl bg-white/10 p-4 backdrop-blur-sm ${className}`}
    >
      <h3 className="mb-3 text-sm font-medium text-white/90">
        Informacoes da imagem
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {/* Dimensions */}
        <div className="space-y-1">
          <p className="text-xs text-white/50">Dimensoes</p>
          <p className="font-medium text-white">
            {imageInfo.width} x {imageInfo.height} px
          </p>
        </div>

        {/* Aspect Ratio */}
        <div className="space-y-1">
          <p className="text-xs text-white/50">Proporcao</p>
          <p className="font-medium text-white">{imageInfo.aspectRatio}</p>
        </div>

        {/* File Size */}
        <div className="space-y-1">
          <p className="text-xs text-white/50">Tamanho</p>
          <p className="font-medium text-white">{formatSize(imageInfo.size)}</p>
        </div>

        {/* Format */}
        <div className="space-y-1">
          <p className="text-xs text-white/50">Formato</p>
          <p className="font-medium text-white">{imageInfo.type}</p>
        </div>
      </div>

      {/* Quality Indicator */}
      {qualityConfig && (
        <div className="mt-4 border-t border-white/10 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">Qualidade</span>
            <div
              className={`flex items-center gap-1.5 rounded-full ${qualityConfig.bgColor} px-2.5 py-1 text-xs font-medium ${qualityConfig.color}`}
            >
              {qualityConfig.icon}
              <span>Qualidade {qualityConfig.label}</span>
            </div>
          </div>

          {/* Quality Bar */}
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full transition-all ${
                imageInfo.quality === "high"
                  ? "w-full bg-green-500"
                  : imageInfo.quality === "medium"
                    ? "w-2/3 bg-yellow-500"
                    : "w-1/3 bg-red-500"
              }`}
            />
          </div>

          {imageInfo.quality === "low" && (
            <p className="mt-2 text-xs text-yellow-400/80">
              Resolucao baixa pode afetar a qualidade do post
            </p>
          )}
        </div>
      )}
    </div>
  );
}
