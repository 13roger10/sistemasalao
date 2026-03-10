"use client";

import { useRef, useCallback, useState, type DragEvent } from "react";
import { useUpload, type UseUploadOptions } from "@/hooks/useUpload";
import { UploadProgress } from "./UploadProgress";

interface UploadZoneProps extends UseUploadOptions {
  onUploadComplete?: (result: { url: string; id: string; thumbnailUrl: string }) => void;
  onUploadError?: (error: Error) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function UploadZone({
  onUploadComplete,
  onUploadError,
  accept = "image/jpeg,image/png,image/webp",
  multiple = false,
  disabled = false,
  className = "",
  children,
  ...uploadOptions
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const {
    phase,
    progress,
    error,
    result,
    fileName,
    fileSize,
    estimatedTimeRemaining,
    upload,
    cancel,
    reset,
    isUploading,
    isComplete,
    isError,
    isIdle,
  } = useUpload({
    ...uploadOptions,
    onComplete: (result) => {
      onUploadComplete?.({ url: result.url, id: result.id, thumbnailUrl: result.thumbnailUrl });
      uploadOptions.onComplete?.(result);
    },
    onError: (error) => {
      onUploadError?.(error);
      uploadOptions.onError?.(error);
    },
  });

  const validateFile = useCallback(
    (file: File): boolean => {
      const validTypes = accept.split(",").map((t) => t.trim());
      if (!validTypes.includes(file.type)) {
        return false;
      }
      const maxSize = (uploadOptions.maxSizeMB || 10) * 1024 * 1024;
      if (file.size > maxSize) {
        return false;
      }
      return true;
    },
    [accept, uploadOptions.maxSizeMB]
  );

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0 || disabled) return;

      const file = files[0]; // Por enquanto, apenas o primeiro arquivo
      if (!validateFile(file)) {
        onUploadError?.(new Error("Arquivo invalido"));
        return;
      }

      await upload(file);
    },
    [disabled, validateFile, upload, onUploadError]
  );

  const handleDragEnter = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current++;
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        setIsDragging(true);
      }
    },
    []
  );

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter.current = 0;

      if (disabled || isUploading) return;

      const files = e.dataTransfer.files;
      handleFiles(files);
    },
    [disabled, isUploading, handleFiles]
  );

  const handleClick = useCallback(() => {
    if (!disabled && !isUploading) {
      inputRef.current?.click();
    }
  }, [disabled, isUploading]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
      e.target.value = "";
    },
    [handleFiles]
  );

  const handleRetry = useCallback(() => {
    reset();
    inputRef.current?.click();
  }, [reset]);

  return (
    <div
      className={`relative ${className}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
        aria-hidden="true"
        disabled={disabled}
      />

      {/* Estado idle - area de drop */}
      {isIdle && (
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled}
          className={`
            flex w-full flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-8 transition-all
            ${isDragging
              ? "border-violet-500 bg-violet-50 scale-[1.02]"
              : "border-gray-300 bg-gray-50 hover:border-violet-400 hover:bg-violet-50"
            }
            ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
          `}
        >
          {children || (
            <>
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-full transition-colors ${
                  isDragging ? "bg-violet-200" : "bg-violet-100"
                }`}
              >
                <svg
                  className={`h-8 w-8 transition-colors ${
                    isDragging ? "text-violet-600" : "text-violet-500"
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-700">
                  {isDragging ? "Solte a imagem aqui" : "Arraste uma imagem ou clique"}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  JPG, PNG ou WebP (max. {uploadOptions.maxSizeMB || 10}MB)
                </p>
              </div>
            </>
          )}
        </button>
      )}

      {/* Estado de upload */}
      {(isUploading || isError || isComplete) && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <UploadProgress
            status={phase}
            progress={progress}
            error={error || undefined}
            fileName={fileName || undefined}
            fileSize={fileSize}
            estimatedTime={estimatedTimeRemaining}
            onCancel={cancel}
            onRetry={handleRetry}
          />

          {isComplete && result && (
            <div className="mt-4 flex items-center gap-3">
              <div className="h-12 w-12 overflow-hidden rounded-lg bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={result.thumbnailUrl || result.url}
                  alt="Uploaded"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-gray-700">
                  {fileName || "imagem.jpg"}
                </p>
                <p className="text-xs text-gray-500">
                  {result.width} x {result.height} px
                </p>
              </div>
              <button
                onClick={() => {
                  reset();
                }}
                className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-200"
              >
                Nova imagem
              </button>
            </div>
          )}
        </div>
      )}

      {/* Overlay de drag */}
      {isDragging && !isIdle && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl border-2 border-dashed border-violet-500 bg-violet-50/90">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-violet-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="mt-2 font-medium text-violet-600">Solte para fazer upload</p>
          </div>
        </div>
      )}
    </div>
  );
}
