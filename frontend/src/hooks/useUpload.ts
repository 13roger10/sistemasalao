"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  uploadService,
  UploadResult,
  UploadProgress as UploadProgressType,
  optimizeImage,
  getImageDimensions,
  base64ToBlob,
} from "@/services/upload";

export type UploadPhase =
  | "idle"
  | "validating"
  | "optimizing"
  | "uploading"
  | "processing"
  | "complete"
  | "error"
  | "cancelled";

export interface UploadState {
  phase: UploadPhase;
  progress: number;
  error: string | null;
  result: UploadResult | null;
  fileName: string | null;
  fileSize: number | null;
  startTime: number | null;
  estimatedTimeRemaining: number | null;
}

export interface UseUploadOptions {
  maxSizeMB?: number;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  allowedTypes?: string[];
  autoOptimize?: boolean;
  onProgress?: (progress: UploadProgressType) => void;
  onComplete?: (result: UploadResult) => void;
  onError?: (error: Error) => void;
}

const DEFAULT_OPTIONS: UseUploadOptions = {
  maxSizeMB: 10,
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.85,
  allowedTypes: ["image/jpeg", "image/png", "image/webp"],
  autoOptimize: true,
};

const initialState: UploadState = {
  phase: "idle",
  progress: 0,
  error: null,
  result: null,
  fileName: null,
  fileSize: null,
  startTime: null,
  estimatedTimeRemaining: null,
};

export function useUpload(options: UseUploadOptions = {}) {
  // Merge options with defaults using ref to avoid stale closures
  const optsRef = useRef({ ...DEFAULT_OPTIONS, ...options });

  // Update ref in effect to avoid updating during render
  useEffect(() => {
    optsRef.current = { ...DEFAULT_OPTIONS, ...options };
  }, [options]);
  const [state, setState] = useState<UploadState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Resetar estado
  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(initialState);
  }, []);

  // Cancelar upload
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState((prev) => ({
      ...prev,
      phase: "cancelled",
      error: "Upload cancelado pelo usuario",
    }));
  }, []);

  // Validar arquivo
  const validateFile = useCallback(
    (file: File | string): { valid: boolean; error?: string } => {
      if (typeof file === "string") {
        // Validar base64
        if (!file.startsWith("data:image/")) {
          return { valid: false, error: "Formato de imagem invalido" };
        }
        return { valid: true };
      }

      // Validar tipo
      if (optsRef.current.allowedTypes && !optsRef.current.allowedTypes.includes(file.type)) {
        return {
          valid: false,
          error: `Tipo de arquivo nao permitido. Use: ${optsRef.current.allowedTypes.join(", ")}`,
        };
      }

      // Validar tamanho
      const maxBytes = (optsRef.current.maxSizeMB || 10) * 1024 * 1024;
      if (file.size > maxBytes) {
        return {
          valid: false,
          error: `Arquivo muito grande. Maximo: ${optsRef.current.maxSizeMB}MB`,
        };
      }

      return { valid: true };
    },
    []
  );

  // Converter File para base64
  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
      reader.readAsDataURL(file);
    });
  }, []);

  // Calcular tempo restante estimado
  const calculateEstimatedTime = useCallback(
    (loaded: number, total: number): number | null => {
      if (!startTimeRef.current || loaded === 0) return null;

      const elapsed = Date.now() - startTimeRef.current;
      const rate = loaded / elapsed; // bytes por ms
      const remaining = total - loaded;

      if (rate <= 0) return null;
      return Math.ceil(remaining / rate / 1000); // segundos
    },
    []
  );

  // Fazer upload
  const upload = useCallback(
    async (input: File | string): Promise<UploadResult | null> => {
      try {
        // Resetar estado
        abortControllerRef.current = new AbortController();
        startTimeRef.current = Date.now();

        // Fase: Validando
        setState({
          ...initialState,
          phase: "validating",
          progress: 5,
          fileName: input instanceof File ? input.name : "imagem",
          fileSize: input instanceof File ? input.size : null,
          startTime: Date.now(),
        });

        // Validar
        const validation = validateFile(input);
        if (!validation.valid) {
          setState((prev) => ({
            ...prev,
            phase: "error",
            error: validation.error || "Arquivo invalido",
          }));
          optsRef.current.onError?.(new Error(validation.error));
          return null;
        }

        // Converter para base64 se necessario
        let imageData: string;
        if (input instanceof File) {
          imageData = await fileToBase64(input);
        } else {
          imageData = input;
        }

        // Fase: Otimizando
        setState((prev) => ({
          ...prev,
          phase: "optimizing",
          progress: 15,
        }));

        let processedImage = imageData;
        if (optsRef.current.autoOptimize) {
          processedImage = await optimizeImage(imageData, {
            maxWidth: optsRef.current.maxWidth,
            maxHeight: optsRef.current.maxHeight,
            quality: optsRef.current.quality,
          });
        }

        // Obter dimensoes (para validação futura se necessário)
        await getImageDimensions(processedImage);

        setState((prev) => ({
          ...prev,
          progress: 30,
        }));

        // Fase: Uploading
        setState((prev) => ({
          ...prev,
          phase: "uploading",
          progress: 35,
        }));

        const result = await uploadService.uploadImage(processedImage, {
          onProgress: (progress) => {
            const estimatedTime = calculateEstimatedTime(
              progress.loaded,
              progress.total
            );

            setState((prev) => ({
              ...prev,
              progress: 35 + Math.round(progress.percentage * 0.5), // 35% a 85%
              estimatedTimeRemaining: estimatedTime,
            }));

            optsRef.current.onProgress?.(progress);
          },
          optimize: false, // Ja otimizamos acima
        });

        // Fase: Processando
        setState((prev) => ({
          ...prev,
          phase: "processing",
          progress: 90,
        }));

        // Simular processamento final
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Fase: Completo
        setState({
          phase: "complete",
          progress: 100,
          error: null,
          result,
          fileName: input instanceof File ? input.name : "imagem",
          fileSize: base64ToBlob(processedImage).size,
          startTime: startTimeRef.current,
          estimatedTimeRemaining: null,
        });

        optsRef.current.onComplete?.(result);
        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Erro desconhecido no upload";

        setState((prev) => ({
          ...prev,
          phase: "error",
          error: errorMessage,
        }));

        optsRef.current.onError?.(
          error instanceof Error ? error : new Error(errorMessage)
        );
        return null;
      }
    },
    [
      validateFile,
      fileToBase64,
      calculateEstimatedTime,
    ]
  );

  // Retry
  const retry = useCallback(
    async (input: File | string): Promise<UploadResult | null> => {
      reset();
      return upload(input);
    },
    [reset, upload]
  );

  return {
    ...state,
    upload,
    cancel,
    reset,
    retry,
    isUploading: ["validating", "optimizing", "uploading", "processing"].includes(
      state.phase
    ),
    isComplete: state.phase === "complete",
    isError: state.phase === "error",
    isCancelled: state.phase === "cancelled",
    isIdle: state.phase === "idle",
  };
}

export type UseUploadReturn = ReturnType<typeof useUpload>;
