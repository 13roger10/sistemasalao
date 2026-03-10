"use client";

import { useRef, useCallback, useState } from "react";
import Image from "next/image";
import { useUpload, type UseUploadOptions } from "@/hooks/useUpload";
import { UploadProgress } from "./UploadProgress";

interface ImageUploaderProps extends UseUploadOptions {
  onUploadComplete?: (result: { url: string; id: string }) => void;
  onUploadError?: (error: Error) => void;
  previewImage?: string | null;
  showPreview?: boolean;
  className?: string;
}

export function ImageUploader({
  onUploadComplete,
  onUploadError,
  previewImage,
  showPreview = true,
  className = "",
  ...uploadOptions
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

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
      onUploadComplete?.({ url: result.url, id: result.id });
      uploadOptions.onComplete?.(result);
    },
    onError: (error) => {
      onUploadError?.(error);
      uploadOptions.onError?.(error);
    },
  });

  const handleFileSelect = useCallback(
    async (file: File) => {
      // Mostrar preview local imediatamente
      const reader = new FileReader();
      reader.onload = (e) => {
        setLocalPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Iniciar upload
      await upload(file);
    },
    [upload]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
      // Limpar input para permitir selecionar o mesmo arquivo novamente
      e.target.value = "";
    },
    [handleFileSelect]
  );

  const handleClick = useCallback(() => {
    if (!isUploading) {
      inputRef.current?.click();
    }
  }, [isUploading]);

  const handleRetry = useCallback(() => {
    if (localPreview) {
      reset();
      upload(localPreview);
    } else {
      reset();
      inputRef.current?.click();
    }
  }, [localPreview, reset, upload]);

  const handleRemove = useCallback(() => {
    reset();
    setLocalPreview(null);
  }, [reset]);

  const displayImage = previewImage || localPreview || (result?.url ?? null);
  const showUploadArea = !displayImage && isIdle;
  const showImagePreview = displayImage && showPreview;

  return (
    <div className={`relative ${className}`}>
      {/* Input oculto */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleInputChange}
        className="hidden"
        aria-hidden="true"
      />

      {/* Area de upload vazia */}
      {showUploadArea && (
        <button
          type="button"
          onClick={handleClick}
          className="flex aspect-square w-full flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-violet-400 hover:bg-violet-50"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-100">
            <svg
              className="h-8 w-8 text-violet-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div className="text-center">
            <p className="font-medium text-gray-700">Clique para selecionar</p>
            <p className="mt-1 text-sm text-gray-500">
              JPG, PNG ou WebP (max. 10MB)
            </p>
          </div>
        </button>
      )}

      {/* Preview da imagem */}
      {showImagePreview && (
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-gray-100">
          <Image
            src={displayImage}
            alt="Preview"
            fill
            className="object-cover"
          />

          {/* Overlay de upload em progresso */}
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="w-3/4 max-w-xs">
                <UploadProgress
                  status={phase}
                  progress={progress}
                  error={error || undefined}
                  fileName={fileName || undefined}
                  fileSize={fileSize}
                  estimatedTime={estimatedTimeRemaining}
                  onCancel={cancel}
                  variant="overlay"
                />
              </div>
            </div>
          )}

          {/* Overlay de sucesso */}
          {isComplete && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500">
                    <svg
                      className="h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-white">
                    Upload concluido
                  </span>
                </div>
                <button
                  onClick={handleRemove}
                  className="rounded-lg bg-white/20 px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/30"
                >
                  Remover
                </button>
              </div>
            </div>
          )}

          {/* Overlay de erro */}
          {isError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="w-3/4 max-w-xs">
                <UploadProgress
                  status="error"
                  progress={0}
                  error={error || "Erro no upload"}
                  onRetry={handleRetry}
                />
              </div>
            </div>
          )}

          {/* Botao de trocar imagem (quando idle com imagem) */}
          {isIdle && !previewImage && (
            <button
              onClick={handleClick}
              className="absolute right-3 top-3 rounded-lg bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Progress bar compacta (sem preview) */}
      {!showPreview && (isUploading || isError) && (
        <UploadProgress
          status={phase}
          progress={progress}
          error={error || undefined}
          fileName={fileName || undefined}
          fileSize={fileSize}
          estimatedTime={estimatedTimeRemaining}
          onCancel={cancel}
          onRetry={handleRetry}
          variant="compact"
        />
      )}
    </div>
  );
}
