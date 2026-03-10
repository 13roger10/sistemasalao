// Hook para gerenciamento de estado do editor de imagens - Fase 7 & 8

import { useState, useCallback, useRef, useEffect } from "react";
import type {
  EditorState,
  EditorTool,
  AIProcessingState,
  EditingHistoryEntry,
  DetectedObject,
  AIEnhancementOptions,
  AIBackgroundOptions,
  AIGenerativeOptions,
  TextOverlayConfig,
  StickerOverlay,
  DrawingPath,
} from "@/types";
import {
  enhanceImage,
  processBackground,
  detectObjects,
  applyGenerativeEdit,
} from "@/services/image-ai";

const MAX_HISTORY_SIZE = 20;

const generateId = (): string => {
  return `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const initialAIProcessingState: AIProcessingState = {
  status: "idle",
  progress: 0,
  message: undefined,
  error: undefined,
};

export function useImageEditor(initialImage: string) {
  // Estado principal
  const [originalImage, setOriginalImage] = useState<string>(initialImage);
  const [currentImage, setCurrentImage] = useState<string>(initialImage);
  const [selectedTool, setSelectedTool] = useState<EditorTool>("select");
  const [aiProcessing, setAIProcessing] = useState<AIProcessingState>(
    initialAIProcessingState
  );
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);

  // Histórico para undo/redo
  const [history, setHistory] = useState<EditingHistoryEntry[]>(() => [
    {
      id: generateId(),
      timestamp: Date.now(),
      action: "initial",
      imageData: initialImage,
    },
  ]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Sync state when initialImage changes (e.g., loaded from IndexedDB)
  useEffect(() => {
    if (initialImage && !currentImage) {
      setOriginalImage(initialImage);
      setCurrentImage(initialImage);
      setHistory([
        {
          id: generateId(),
          timestamp: Date.now(),
          action: "initial",
          imageData: initialImage,
        },
      ]);
      setHistoryIndex(0);
    }
  }, [initialImage, currentImage]);

  // Ref para cancelar operações
  const abortControllerRef = useRef<AbortController | null>(null);

  // ===== Manual Editing State (Fase 8) =====
  const [textOverlays, setTextOverlays] = useState<TextOverlayConfig[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [stickerOverlays, setStickerOverlays] = useState<StickerOverlay[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [drawingPaths, setDrawingPaths] = useState<DrawingPath[]>([]);
  const [showCropTool, setShowCropTool] = useState<boolean>(false);
  const [showDrawingTool, setShowDrawingTool] = useState<boolean>(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }>({
    width: 800,
    height: 800,
  });

  // ===== History Management =====

  const addToHistory = useCallback(
    (action: string, imageData: string, metadata?: Record<string, unknown>) => {
      setHistory((prev) => {
        // Remove itens após o índice atual (descarta redo history)
        const newHistory = prev.slice(0, historyIndex + 1);

        // Adiciona novo item
        newHistory.push({
          id: generateId(),
          timestamp: Date.now(),
          action,
          imageData,
          metadata,
        });

        // Limita tamanho do histórico
        if (newHistory.length > MAX_HISTORY_SIZE) {
          newHistory.shift();
        }

        return newHistory;
      });

      setHistoryIndex((prev) =>
        Math.min(prev + 1, MAX_HISTORY_SIZE - 1)
      );
    },
    [historyIndex]
  );

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCurrentImage(history[newIndex].imageData);
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCurrentImage(history[newIndex].imageData);
    }
  }, [historyIndex, history]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // ===== Image Updates =====

  const updateImage = useCallback(
    (newImageData: string, action: string) => {
      setCurrentImage(newImageData);
      addToHistory(action, newImageData);
    },
    [addToHistory]
  );

  const resetToOriginal = useCallback(() => {
    setCurrentImage(originalImage);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setZoom(1);
    setDetectedObjects([]);
    addToHistory("reset", originalImage);
  }, [originalImage, addToHistory]);

  // ===== Transform Operations =====

  const rotate = useCallback(
    (degrees: number) => {
      const newRotation = (rotation + degrees) % 360;
      setRotation(newRotation);

      // Aplica rotação na imagem
      applyTransform(currentImage, newRotation, flipH, flipV).then(
        (result) => {
          updateImage(result, `rotate_${degrees}`);
        }
      );
    },
    [currentImage, rotation, flipH, flipV, updateImage]
  );

  const flip = useCallback(
    (direction: "horizontal" | "vertical") => {
      const newFlipH = direction === "horizontal" ? !flipH : flipH;
      const newFlipV = direction === "vertical" ? !flipV : flipV;

      setFlipH(newFlipH);
      setFlipV(newFlipV);

      applyTransform(currentImage, rotation, newFlipH, newFlipV).then(
        (result) => {
          updateImage(result, `flip_${direction}`);
        }
      );
    },
    [currentImage, rotation, flipH, flipV, updateImage]
  );

  // ===== AI Operations =====

  const cancelAIOperation = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setAIProcessing(initialAIProcessingState);
  }, []);

  const runAIEnhance = useCallback(
    async (options: Partial<AIEnhancementOptions> = {}) => {
      abortControllerRef.current = new AbortController();

      setAIProcessing({
        status: "processing",
        progress: 0,
        message: "Aprimorando imagem com IA...",
      });

      try {
        const result = await enhanceImage(currentImage, options, (progress) => {
          setAIProcessing((prev) => ({
            ...prev,
            progress,
            message: getEnhanceMessage(progress),
          }));
        });

        setCurrentImage(result.imageData);
        addToHistory("ai_enhance", result.imageData, {
          effects: result.appliedEffects,
          processingTime: result.processingTime,
        });

        setAIProcessing({
          status: "success",
          progress: 100,
          message: `Concluído em ${(result.processingTime / 1000).toFixed(1)}s`,
        });

        // Reset status após 2s
        setTimeout(() => {
          setAIProcessing(initialAIProcessingState);
        }, 2000);

        return result;
      } catch (error) {
        setAIProcessing({
          status: "error",
          progress: 0,
          error:
            error instanceof Error
              ? error.message
              : "Erro ao processar imagem",
        });
        throw error;
      }
    },
    [currentImage, addToHistory]
  );

  const runBackgroundProcess = useCallback(
    async (options: AIBackgroundOptions) => {
      abortControllerRef.current = new AbortController();

      setAIProcessing({
        status: "processing",
        progress: 0,
        message: "Processando fundo...",
      });

      try {
        const result = await processBackground(
          currentImage,
          options,
          (progress) => {
            setAIProcessing((prev) => ({
              ...prev,
              progress,
              message: getBackgroundMessage(progress, options.mode),
            }));
          }
        );

        setCurrentImage(result.imageData);
        addToHistory("ai_background", result.imageData, {
          mode: options.mode,
          processingTime: result.processingTime,
        });

        setAIProcessing({
          status: "success",
          progress: 100,
          message: "Fundo processado com sucesso!",
        });

        setTimeout(() => {
          setAIProcessing(initialAIProcessingState);
        }, 2000);

        return result;
      } catch (error) {
        setAIProcessing({
          status: "error",
          progress: 0,
          error:
            error instanceof Error
              ? error.message
              : "Erro ao processar fundo",
        });
        throw error;
      }
    },
    [currentImage, addToHistory]
  );

  const runObjectDetection = useCallback(async () => {
    abortControllerRef.current = new AbortController();

    setAIProcessing({
      status: "processing",
      progress: 0,
      message: "Detectando objetos...",
    });

    try {
      const result = await detectObjects(currentImage, (progress) => {
        setAIProcessing((prev) => ({
          ...prev,
          progress,
          message: "Analisando imagem...",
        }));
      });

      setDetectedObjects(result.objects);

      setAIProcessing({
        status: "success",
        progress: 100,
        message: `${result.objects.length} objeto(s) detectado(s)`,
      });

      setTimeout(() => {
        setAIProcessing(initialAIProcessingState);
      }, 2000);

      return result;
    } catch (error) {
      setAIProcessing({
        status: "error",
        progress: 0,
        error:
          error instanceof Error
            ? error.message
            : "Erro na detecção de objetos",
      });
      throw error;
    }
  }, [currentImage]);

  const runGenerativeEdit = useCallback(
    async (options: AIGenerativeOptions) => {
      abortControllerRef.current = new AbortController();

      setAIProcessing({
        status: "processing",
        progress: 0,
        message: "Aplicando estilo com IA...",
      });

      try {
        const result = await applyGenerativeEdit(
          currentImage,
          options,
          (progress) => {
            setAIProcessing((prev) => ({
              ...prev,
              progress,
              message: getGenerativeMessage(progress, options.style),
            }));
          }
        );

        setCurrentImage(result.imageData);
        addToHistory("ai_generative", result.imageData, {
          style: options.style,
          prompt: options.prompt,
          processingTime: result.processingTime,
        });

        setAIProcessing({
          status: "success",
          progress: 100,
          message: "Estilo aplicado com sucesso!",
        });

        setTimeout(() => {
          setAIProcessing(initialAIProcessingState);
        }, 2000);

        return result;
      } catch (error) {
        setAIProcessing({
          status: "error",
          progress: 0,
          error:
            error instanceof Error
              ? error.message
              : "Erro ao aplicar estilo",
        });
        throw error;
      }
    },
    [currentImage, addToHistory]
  );

  // ===== Filter Operations =====

  const applyFilter = useCallback(
    async (filterName: string) => {
      const result = await applyCanvasFilter(currentImage, filterName);
      updateImage(result, `filter_${filterName}`);
    },
    [currentImage, updateImage]
  );

  const applyAdjustment = useCallback(
    async (type: string, value: number) => {
      const result = await applyCanvasAdjustment(currentImage, type, value);
      updateImage(result, `adjust_${type}_${value}`);
    },
    [currentImage, updateImage]
  );

  // ===== Manual Editing Operations (Fase 8) =====

  // Load image dimensions
  const loadImageDimensions = useCallback((imageData: string) => {
    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.width, height: img.height });
    };
    img.src = imageData;
  }, []);

  // Text Overlay Operations
  const addTextOverlay = useCallback(
    (config: Omit<TextOverlayConfig, "id">) => {
      const newText: TextOverlayConfig = {
        ...config,
        id: generateId(),
      };
      setTextOverlays((prev) => [...prev, newText]);
      setSelectedTextId(newText.id);
    },
    []
  );

  const updateTextOverlay = useCallback(
    (id: string, updates: Partial<TextOverlayConfig>) => {
      setTextOverlays((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
      );
    },
    []
  );

  const deleteTextOverlay = useCallback((id: string) => {
    setTextOverlays((prev) => prev.filter((t) => t.id !== id));
    setSelectedTextId((prev) => (prev === id ? null : prev));
  }, []);

  // Sticker Overlay Operations
  const addStickerOverlay = useCallback(
    (sticker: { emoji: string; category: string }) => {
      const newSticker: StickerOverlay = {
        id: generateId(),
        stickerId: sticker.emoji,
        src: sticker.emoji,
        x: imageDimensions.width / 2 - 40,
        y: imageDimensions.height / 2 - 40,
        width: 80,
        height: 80,
        rotation: 0,
        opacity: 1,
        flipH: false,
        flipV: false,
      };
      setStickerOverlays((prev) => [...prev, newSticker]);
      setSelectedStickerId(newSticker.id);
    },
    [imageDimensions]
  );

  const updateStickerOverlay = useCallback(
    (id: string, updates: Partial<StickerOverlay>) => {
      setStickerOverlays((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
      );
    },
    []
  );

  const deleteStickerOverlay = useCallback((id: string) => {
    setStickerOverlays((prev) => prev.filter((s) => s.id !== id));
    setSelectedStickerId((prev) => (prev === id ? null : prev));
  }, []);

  // Drawing Operations
  const addDrawingPath = useCallback((path: Omit<DrawingPath, "id">) => {
    const newPath: DrawingPath = {
      ...path,
      id: generateId(),
    };
    setDrawingPaths((prev) => [...prev, newPath]);
  }, []);

  const undoDrawingPath = useCallback(() => {
    setDrawingPaths((prev) => prev.slice(0, -1));
  }, []);

  const clearDrawingPaths = useCallback(() => {
    setDrawingPaths([]);
  }, []);

  // Apply Drawing to Image
  const applyDrawing = useCallback(
    (mergedImageData: string) => {
      updateImage(mergedImageData, "draw");
      setDrawingPaths([]);
      setShowDrawingTool(false);
    },
    [updateImage]
  );

  // Crop Operation
  const applyCrop = useCallback(
    (croppedImageData: string) => {
      updateImage(croppedImageData, "crop");
      setShowCropTool(false);
      loadImageDimensions(croppedImageData);
    },
    [updateImage, loadImageDimensions]
  );

  // Merge all overlays into the final image
  const mergeOverlaysToImage = useCallback(async (): Promise<string> => {
    if (!currentImage) {
      throw new Error("No image to merge");
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onerror = () => {
        reject(new Error("Failed to load image for merging"));
      };

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;

        // Draw base image
        ctx.drawImage(img, 0, 0);

        // Draw stickers
        stickerOverlays.forEach((sticker) => {
          ctx.save();
          ctx.globalAlpha = sticker.opacity;
          ctx.translate(
            sticker.x + sticker.width / 2,
            sticker.y + sticker.height / 2
          );
          ctx.rotate((sticker.rotation * Math.PI) / 180);
          if (sticker.flipH) ctx.scale(-1, 1);
          if (sticker.flipV) ctx.scale(1, -1);

          ctx.font = `${sticker.height}px serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(sticker.src, 0, 0);

          ctx.restore();
        });

        // Draw text overlays
        textOverlays.forEach((text) => {
          ctx.save();
          ctx.globalAlpha = text.opacity;
          ctx.translate(text.x, text.y);
          ctx.rotate((text.rotation * Math.PI) / 180);

          ctx.font = `${text.fontStyle} ${text.fontWeight} ${text.fontSize}px ${text.fontFamily}`;
          ctx.fillStyle = text.color;
          ctx.textAlign = text.textAlign;

          if (text.shadow) {
            ctx.shadowColor = text.shadow.color;
            ctx.shadowBlur = text.shadow.blur;
            ctx.shadowOffsetX = text.shadow.offsetX;
            ctx.shadowOffsetY = text.shadow.offsetY;
          }

          if (text.backgroundColor) {
            const metrics = ctx.measureText(text.text);
            const padding = 8;
            ctx.fillStyle = text.backgroundColor;
            ctx.fillRect(
              text.textAlign === "center"
                ? -metrics.width / 2 - padding
                : text.textAlign === "right"
                ? -metrics.width - padding
                : -padding,
              -text.fontSize - padding / 2,
              metrics.width + padding * 2,
              text.fontSize + padding
            );
            ctx.fillStyle = text.color;
          }

          ctx.fillText(text.text, 0, 0);
          ctx.restore();
        });

        resolve(canvas.toDataURL("image/png"));
      };
      img.src = currentImage;
    });
  }, [currentImage, textOverlays, stickerOverlays]);

  // Flatten overlays (apply to image and clear overlays)
  const flattenOverlays = useCallback(async () => {
    if (textOverlays.length === 0 && stickerOverlays.length === 0) return;

    const mergedImage = await mergeOverlaysToImage();
    updateImage(mergedImage, "flatten_overlays");
    setTextOverlays([]);
    setStickerOverlays([]);
    setSelectedTextId(null);
    setSelectedStickerId(null);
  }, [textOverlays, stickerOverlays, mergeOverlaysToImage, updateImage]);

  // ===== State Getters =====

  const getState = useCallback((): EditorState => {
    return {
      originalImage,
      currentImage,
      history,
      historyIndex,
      selectedTool,
      aiProcessing,
      detectedObjects,
      zoom,
      rotation,
      flipH,
      flipV,
    };
  }, [
    originalImage,
    currentImage,
    history,
    historyIndex,
    selectedTool,
    aiProcessing,
    detectedObjects,
    zoom,
    rotation,
    flipH,
    flipV,
  ]);

  return {
    // State
    originalImage,
    currentImage,
    selectedTool,
    aiProcessing,
    detectedObjects,
    zoom,
    rotation,
    flipH,
    flipV,
    history,
    historyIndex,

    // Manual Editing State
    textOverlays,
    selectedTextId,
    stickerOverlays,
    selectedStickerId,
    drawingPaths,
    showCropTool,
    showDrawingTool,
    imageDimensions,

    // Actions
    setSelectedTool,
    setZoom,
    updateImage,
    resetToOriginal,

    // History
    undo,
    redo,
    canUndo,
    canRedo,

    // Transforms
    rotate,
    flip,

    // AI Operations
    runAIEnhance,
    runBackgroundProcess,
    runObjectDetection,
    runGenerativeEdit,
    cancelAIOperation,

    // Filters
    applyFilter,
    applyAdjustment,

    // Manual Editing Operations
    loadImageDimensions,
    addTextOverlay,
    updateTextOverlay,
    deleteTextOverlay,
    setSelectedTextId,
    addStickerOverlay,
    updateStickerOverlay,
    deleteStickerOverlay,
    setSelectedStickerId,
    addDrawingPath,
    undoDrawingPath,
    clearDrawingPaths,
    applyDrawing,
    setShowDrawingTool,
    applyCrop,
    setShowCropTool,
    mergeOverlaysToImage,
    flattenOverlays,

    // Utils
    getState,
  };
}

// ===== Helper Functions =====

async function applyTransform(
  imageData: string,
  rotation: number,
  flipH: boolean,
  flipV: boolean
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;

      // Ajusta dimensões para rotação
      if (rotation === 90 || rotation === 270) {
        canvas.width = img.height;
        canvas.height = img.width;
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      if (flipH) ctx.scale(-1, 1);
      if (flipV) ctx.scale(1, -1);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();

      resolve(canvas.toDataURL("image/jpeg", 0.95));
    };
    img.src = imageData;
  });
}

async function applyCanvasFilter(
  imageData: string,
  filterName: string
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;

      canvas.width = img.width;
      canvas.height = img.height;

      // Aplica filtro CSS
      const filters: Record<string, string> = {
        grayscale: "grayscale(100%)",
        sepia: "sepia(100%)",
        saturate: "saturate(200%)",
        contrast: "contrast(150%)",
        brightness: "brightness(120%)",
        blur: "blur(2px)",
        invert: "invert(100%)",
        vintage: "sepia(50%) contrast(90%) brightness(90%)",
        cool: "hue-rotate(180deg) saturate(120%)",
        warm: "hue-rotate(-30deg) saturate(130%)",
      };

      ctx.filter = filters[filterName] || "none";
      ctx.drawImage(img, 0, 0);

      resolve(canvas.toDataURL("image/jpeg", 0.95));
    };
    img.src = imageData;
  });
}

async function applyCanvasAdjustment(
  imageData: string,
  type: string,
  value: number
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;

      canvas.width = img.width;
      canvas.height = img.height;

      const adjustments: Record<string, string> = {
        brightness: `brightness(${value}%)`,
        contrast: `contrast(${value}%)`,
        saturation: `saturate(${value}%)`,
        hue: `hue-rotate(${value}deg)`,
        blur: `blur(${value}px)`,
      };

      ctx.filter = adjustments[type] || "none";
      ctx.drawImage(img, 0, 0);

      resolve(canvas.toDataURL("image/jpeg", 0.95));
    };
    img.src = imageData;
  });
}

function getEnhanceMessage(progress: number): string {
  if (progress < 30) return "Analisando imagem...";
  if (progress < 50) return "Detectando detalhes...";
  if (progress < 70) return "Aplicando melhorias...";
  if (progress < 90) return "Otimizando cores...";
  return "Finalizando...";
}

function getBackgroundMessage(progress: number, mode: string): string {
  const modeText =
    mode === "remove"
      ? "Removendo"
      : mode === "blur"
      ? "Desfocando"
      : "Substituindo";

  if (progress < 30) return "Detectando bordas...";
  if (progress < 50) return "Segmentando imagem...";
  if (progress < 80) return `${modeText} fundo...`;
  return "Finalizando...";
}

function getGenerativeMessage(progress: number, style: string): string {
  const styleText =
    style === "artistic"
      ? "artístico"
      : style === "cartoon"
      ? "cartoon"
      : style === "sketch"
      ? "sketch"
      : "realístico";

  if (progress < 30) return "Analisando composição...";
  if (progress < 60) return `Aplicando estilo ${styleText}...`;
  if (progress < 90) return "Refinando detalhes...";
  return "Finalizando...";
}

export default useImageEditor;
