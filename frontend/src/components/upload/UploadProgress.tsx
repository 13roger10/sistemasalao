"use client";

import { useEffect, useState } from "react";
import type { UploadPhase } from "@/hooks/useUpload";

// Manter compatibilidade com o tipo antigo
export type UploadStatus = UploadPhase | "idle" | "optimizing" | "uploading" | "processing" | "complete" | "error";

interface UploadProgressProps {
  status: UploadStatus;
  progress: number;
  error?: string;
  fileName?: string;
  fileSize?: number | null;
  estimatedTime?: number | null;
  onCancel?: () => void;
  onRetry?: () => void;
  variant?: "default" | "compact" | "overlay";
}

const statusMessages: Record<string, string> = {
  idle: "Aguardando...",
  validating: "Validando arquivo...",
  optimizing: "Otimizando imagem...",
  uploading: "Enviando...",
  processing: "Processando...",
  complete: "Upload concluido!",
  error: "Erro no upload",
  cancelled: "Upload cancelado",
};

const statusColors: Record<string, string> = {
  idle: "bg-gray-400",
  validating: "bg-blue-400",
  optimizing: "bg-blue-500",
  uploading: "bg-violet-500",
  processing: "bg-amber-500",
  complete: "bg-green-500",
  error: "bg-red-500",
  cancelled: "bg-gray-500",
};

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case "complete":
      return (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
          <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    case "error":
      return (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100">
          <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      );
    case "cancelled":
      return (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100">
          <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      );
    case "validating":
      return (
        <svg className="h-6 w-6 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      );
    case "optimizing":
      return (
        <svg className="h-6 w-6 animate-pulse text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case "uploading":
      return (
        <svg className="h-6 w-6 animate-bounce text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      );
    case "processing":
      return (
        <svg className="h-6 w-6 animate-spin text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      );
    case "idle":
    default:
      return <div className="h-6 w-6 rounded-full bg-gray-200" />;
  }
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s restantes`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s restantes`;
}

export function UploadProgress({
  status,
  progress,
  error,
  fileName,
  fileSize,
  estimatedTime,
  onCancel,
  onRetry,
  variant = "default",
}: UploadProgressProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progress);
    }, 50);
    return () => clearTimeout(timer);
  }, [progress]);

  const isActive = ["validating", "optimizing", "uploading", "processing"].includes(status);
  const showCancel = isActive && onCancel;
  const showRetry = (status === "error" || status === "cancelled") && onRetry;

  // Variante compacta
  if (variant === "compact") {
    return (
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <StatusIcon status={status} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <span className="truncate text-sm font-medium text-gray-700">
              {statusMessages[status] || status}
            </span>
            {isActive && (
              <span className="ml-2 text-sm font-semibold text-violet-600">
                {Math.round(animatedProgress)}%
              </span>
            )}
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full transition-all duration-300 ease-out ${statusColors[status] || "bg-gray-400"}`}
              style={{ width: `${animatedProgress}%` }}
            />
          </div>
        </div>
        {showCancel && (
          <button
            onClick={onCancel}
            className="flex-shrink-0 text-gray-400 transition-colors hover:text-gray-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  // Variante overlay
  if (variant === "overlay") {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 scale-150">
          <StatusIcon status={status} />
        </div>
        <p className="mb-2 text-sm font-medium text-white">
          {statusMessages[status] || status}
        </p>
        {isActive && (
          <p className="mb-3 text-2xl font-bold text-white">
            {Math.round(animatedProgress)}%
          </p>
        )}
        <div className="h-2 w-48 overflow-hidden rounded-full bg-white/30">
          <div
            className={`h-full transition-all duration-300 ease-out ${status === "complete" ? "bg-green-400" : "bg-white"}`}
            style={{ width: `${animatedProgress}%` }}
          />
        </div>
        {estimatedTime && estimatedTime > 0 && (
          <p className="mt-2 text-xs text-white/70">
            {formatTime(estimatedTime)}
          </p>
        )}
        {status === "error" && error && (
          <p className="mt-3 text-sm text-red-300">{error}</p>
        )}
        {(showCancel || showRetry) && (
          <div className="mt-4 flex gap-2">
            {showCancel && (
              <button
                onClick={onCancel}
                className="rounded-lg bg-white/20 px-4 py-2 text-sm text-white transition-colors hover:bg-white/30"
              >
                Cancelar
              </button>
            )}
            {showRetry && (
              <button
                onClick={onRetry}
                className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-violet-600 transition-colors hover:bg-violet-50"
              >
                Tentar novamente
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Variante default
  return (
    <div className="w-full rounded-xl bg-white p-4 shadow-lg">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon status={status} />
          <div>
            <span className="text-sm font-medium text-gray-700">
              {statusMessages[status] || status}
            </span>
            {fileName && (
              <p className="truncate text-xs text-gray-500">{fileName}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {fileSize && status === "complete" && (
            <span className="text-xs text-gray-500">
              {formatFileSize(fileSize)}
            </span>
          )}
          {isActive && (
            <span className="text-sm font-semibold text-violet-600">
              {Math.round(animatedProgress)}%
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full transition-all duration-300 ease-out ${statusColors[status] || "bg-gray-400"}`}
          style={{ width: `${animatedProgress}%` }}
        />
      </div>

      {/* Estimated Time */}
      {estimatedTime && estimatedTime > 0 && isActive && (
        <p className="mt-1 text-right text-xs text-gray-400">
          {formatTime(estimatedTime)}
        </p>
      )}

      {/* Error Message */}
      {status === "error" && error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}

      {/* Cancelled Message */}
      {status === "cancelled" && (
        <p className="mt-2 text-sm text-gray-500">O upload foi cancelado</p>
      )}

      {/* Actions */}
      {(showCancel || showRetry) && (
        <div className="mt-3 flex justify-end gap-2">
          {showCancel && (
            <button
              onClick={onCancel}
              className="rounded-lg px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100"
            >
              Cancelar
            </button>
          )}
          {showRetry && (
            <button
              onClick={onRetry}
              className="rounded-lg bg-violet-100 px-3 py-1.5 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-200"
            >
              Tentar novamente
            </button>
          )}
        </div>
      )}
    </div>
  );
}
