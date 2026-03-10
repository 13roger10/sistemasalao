"use client";

import { useState, useEffect, useCallback, ReactNode, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { useImageEditor } from "@/hooks/useImageEditor";
import {
  AIEnhancePanel,
  AIBackgroundPanel,
  AIStylePanel,
  AIProcessingOverlay,
  EditingHistory,
  CropTool,
  TextOverlayPanel,
  DrawingPanel,
  StickerPanel,
} from "@/components/editor";
import type { EditorTool as EditorToolType } from "@/types";
import { imageStorage } from "@/services/imageStorage";

interface Tool {
  id: EditorToolType;
  label: string;
  icon: ReactNode;
  isAI?: boolean;
}

const tools: Tool[] = [
  {
    id: "crop",
    label: "Cortar",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <path d="M6 2v14a2 2 0 0 0 2 2h14" />
        <path d="M18 22V8a2 2 0 0 0-2-2H2" />
      </svg>
    ),
  },
  {
    id: "filter",
    label: "Filtros",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a7 7 0 1 0 7 7" />
      </svg>
    ),
  },
  {
    id: "adjust",
    label: "Ajustes",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <line x1="4" x2="4" y1="21" y2="14" />
        <line x1="4" x2="4" y1="10" y2="3" />
        <line x1="12" x2="12" y1="21" y2="12" />
        <line x1="12" x2="12" y1="8" y2="3" />
        <line x1="20" x2="20" y1="21" y2="16" />
        <line x1="20" x2="20" y1="12" y2="3" />
        <line x1="2" x2="6" y1="14" y2="14" />
        <line x1="10" x2="14" y1="8" y2="8" />
        <line x1="18" x2="22" y1="16" y2="16" />
      </svg>
    ),
  },
  {
    id: "text",
    label: "Texto",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <polyline points="4 7 4 4 20 4 20 7" />
        <line x1="9" x2="15" y1="20" y2="20" />
        <line x1="12" x2="12" y1="4" y2="20" />
      </svg>
    ),
  },
  {
    id: "draw",
    label: "Desenhar",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <path d="M12 19l7-7 3 3-7 7-3-3z" />
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
        <path d="M2 2l7.586 7.586" />
        <circle cx="11" cy="11" r="2" />
      </svg>
    ),
  },
  {
    id: "sticker",
    label: "Stickers",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <line x1="9" x2="9.01" y1="9" y2="9" />
        <line x1="15" x2="15.01" y1="9" y2="9" />
      </svg>
    ),
  },
  {
    id: "ai-enhance",
    label: "IA Melhorar",
    isAI: true,
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <path d="M12 3l1.912 5.813a2 2 0 001.272 1.272L21 12l-5.816 1.915a2 2 0 00-1.272 1.272L12 21l-1.912-5.813a2 2 0 00-1.272-1.272L3 12l5.816-1.915a2 2 0 001.272-1.272L12 3z" />
      </svg>
    ),
  },
  {
    id: "ai-background",
    label: "IA Fundo",
    isAI: true,
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
      </svg>
    ),
  },
  {
    id: "ai-generate",
    label: "IA Estilos",
    isAI: true,
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="7.5 4.21 12 6.81 16.5 4.21" />
        <polyline points="7.5 19.79 7.5 14.6 3 12" />
        <polyline points="21 12 16.5 14.6 16.5 19.79" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" x2="12" y1="22.08" y2="12" />
      </svg>
    ),
  },
];

const filters = [
  { id: "none", label: "Original", class: "" },
  { id: "grayscale", label: "P&B", class: "grayscale" },
  { id: "sepia", label: "Sépia", class: "sepia" },
  { id: "saturate", label: "Vívido", class: "saturate-150" },
  { id: "contrast", label: "Contraste", class: "contrast-125" },
  { id: "brightness", label: "Claro", class: "brightness-110" },
  { id: "vintage", label: "Vintage", class: "sepia-[.35] contrast-[1.1] brightness-[0.9]" },
  { id: "cool", label: "Frio", class: "hue-rotate-180 saturate-[1.2]" },
  { id: "warm", label: "Quente", class: "-hue-rotate-15 saturate-[1.3]" },
];

export default function EditorPage() {
  const router = useRouter();
  const { warning, success } = useToast();
  const [initialImage, setInitialImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState("none");
  const [showAIPanel, setShowAIPanel] = useState<
    "enhance" | "background" | "style" | null
  >(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const hasCheckedImage = useRef(false);

  // Estado de ajustes
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);

  // Drag state for overlays
  const [draggedOverlay, setDraggedOverlay] = useState<{
    type: "text" | "sticker";
    id: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  } | null>(null);

  // Container scale for overlays (updated via effect, not during render)
  const [containerScale, setContainerScale] = useState(1);

  // Load captured image from IndexedDB
  useEffect(() => {
    const loadImage = async () => {
      try {
        const captured = await imageStorage.getItem("capturedImage");
        setInitialImage(captured);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to load image:", error);
        setIsLoading(false);
      }
    };
    loadImage();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (hasCheckedImage.current) return;
    hasCheckedImage.current = true;
    if (!initialImage) {
      warning("Nenhuma imagem", "Selecione uma imagem primeiro");
      router.push("/admin/capture");
    }
  }, [initialImage, isLoading, router, warning]);

  // Hook do editor (só inicializa quando temos imagem)
  const editor = useImageEditor(initialImage || "");

  // Load image dimensions when image changes
  const { currentImage, loadImageDimensions, imageDimensions } = editor;
  useEffect(() => {
    if (currentImage) {
      loadImageDimensions(currentImage);
    }
  }, [currentImage, loadImageDimensions]);

  // Update container scale when dimensions change
  useEffect(() => {
    const updateScale = () => {
      if (imageContainerRef.current && imageDimensions.width > 0) {
        const scale = imageContainerRef.current.clientWidth / imageDimensions.width;
        setContainerScale(scale);
      }
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [imageDimensions.width]);

  const handleBack = useCallback(() => {
    router.push("/admin/capture");
  }, [router]);

  const handleContinue = useCallback(async () => {
    try {
      // Verify image exists
      const imageToSave = editor.currentImage || initialImage;
      if (!imageToSave) {
        warning("Erro", "Nenhuma imagem para salvar");
        return;
      }

      // Flatten overlays before saving
      if (editor.textOverlays.length > 0 || editor.stickerOverlays.length > 0) {
        const mergedImage = await editor.mergeOverlaysToImage();
        await imageStorage.setItem("editedImage", mergedImage);
      } else {
        await imageStorage.setItem("editedImage", imageToSave);
      }
      success("Imagem salva", "Continuando para gerar legenda...");
      router.push("/admin/caption");
    } catch (error) {
      console.error("Failed to save image:", error);
      warning("Erro ao salvar", "Não foi possível salvar a imagem editada");
    }
  }, [editor, initialImage, router, success, warning]);

  const handleToolSelect = useCallback(
    (toolId: EditorToolType) => {
      editor.setSelectedTool(toolId === editor.selectedTool ? "select" : toolId);
      setShowAIPanel(null);

      // Handle special tool actions
      if (toolId === "crop") {
        editor.setShowCropTool(true);
      } else if (toolId === "draw") {
        editor.setShowDrawingTool(true);
      } else if (toolId === "ai-enhance") {
        setShowAIPanel("enhance");
      } else if (toolId === "ai-background") {
        setShowAIPanel("background");
      } else if (toolId === "ai-generate") {
        setShowAIPanel("style");
      }
    },
    [editor]
  );

  const handleFilterSelect = useCallback(
    async (filterId: string) => {
      setSelectedFilter(filterId);
      if (filterId !== "none") {
        await editor.applyFilter(filterId);
      }
    },
    [editor]
  );

  const handleAdjustmentChange = useCallback(
    async (type: string, value: number) => {
      switch (type) {
        case "brightness":
          setBrightness(value);
          break;
        case "contrast":
          setContrast(value);
          break;
        case "saturation":
          setSaturation(value);
          break;
      }
      await editor.applyAdjustment(type, value);
    },
    [editor]
  );

  const getAdjustmentStyle = useCallback(() => {
    return {
      filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
    };
  }, [brightness, contrast, saturation]);

  const getCurrentFilterClass = useCallback(() => {
    const filter = filters.find((f) => f.id === selectedFilter);
    return filter?.class || "";
  }, [selectedFilter]);

  // Drag handlers for overlays
  const handleOverlayMouseDown = useCallback(
    (
      e: React.MouseEvent,
      type: "text" | "sticker",
      id: string,
      currentX: number,
      currentY: number
    ) => {
      e.preventDefault();
      e.stopPropagation();
      setDraggedOverlay({
        type,
        id,
        startX: e.clientX,
        startY: e.clientY,
        initialX: currentX,
        initialY: currentY,
      });

      if (type === "text") {
        editor.setSelectedTextId(id);
      } else {
        editor.setSelectedStickerId(id);
      }
    },
    [editor]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggedOverlay || !imageContainerRef.current) return;

      const rect = imageContainerRef.current.getBoundingClientRect();
      const scaleX = editor.imageDimensions.width / rect.width;
      const scaleY = editor.imageDimensions.height / rect.height;

      const deltaX = (e.clientX - draggedOverlay.startX) * scaleX;
      const deltaY = (e.clientY - draggedOverlay.startY) * scaleY;

      const newX = draggedOverlay.initialX + deltaX;
      const newY = draggedOverlay.initialY + deltaY;

      if (draggedOverlay.type === "text") {
        editor.updateTextOverlay(draggedOverlay.id, { x: newX, y: newY });
      } else {
        editor.updateStickerOverlay(draggedOverlay.id, { x: newX, y: newY });
      }
    },
    [draggedOverlay, editor]
  );

  const handleMouseUp = useCallback(() => {
    setDraggedOverlay(null);
  }, []);

  // Render text overlays using memoized components
  const textOverlayElements = useMemo(() => {
    return editor.textOverlays.map((text) => (
      <div
        key={text.id}
        className={`absolute cursor-move select-none ${
          editor.selectedTextId === text.id
            ? "ring-2 ring-violet-500 ring-offset-2 ring-offset-transparent"
            : ""
        }`}
        style={{
          left: text.x * containerScale,
          top: text.y * containerScale,
          fontSize: text.fontSize * containerScale,
          fontFamily: text.fontFamily,
          fontWeight: text.fontWeight,
          fontStyle: text.fontStyle,
          color: text.color,
          backgroundColor: text.backgroundColor,
          opacity: text.opacity,
          transform: `rotate(${text.rotation}deg)`,
          textAlign: text.textAlign,
          textShadow: text.shadow
            ? `${text.shadow.offsetX}px ${text.shadow.offsetY}px ${text.shadow.blur}px ${text.shadow.color}`
            : undefined,
          padding: "4px 8px",
        }}
        onMouseDown={(e) =>
          handleOverlayMouseDown(e, "text", text.id, text.x, text.y)
        }
      >
        {text.text}
      </div>
    ));
  }, [editor.textOverlays, editor.selectedTextId, containerScale, handleOverlayMouseDown]);

  // Render sticker overlays using memoized components
  const stickerOverlayElements = useMemo(() => {
    return editor.stickerOverlays.map((sticker) => (
      <div
        key={sticker.id}
        className={`absolute cursor-move select-none ${
          editor.selectedStickerId === sticker.id
            ? "ring-2 ring-violet-500 ring-offset-2 ring-offset-transparent"
            : ""
        }`}
        style={{
          left: sticker.x * containerScale,
          top: sticker.y * containerScale,
          width: sticker.width * containerScale,
          height: sticker.height * containerScale,
          fontSize: sticker.height * containerScale * 0.8,
          opacity: sticker.opacity,
          transform: `rotate(${sticker.rotation}deg) ${
            sticker.flipH ? "scaleX(-1)" : ""
          } ${sticker.flipV ? "scaleY(-1)" : ""}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onMouseDown={(e) =>
          handleOverlayMouseDown(e, "sticker", sticker.id, sticker.x, sticker.y)
        }
      >
        {sticker.src}
      </div>
    ));
  }, [editor.stickerOverlays, editor.selectedStickerId, containerScale, handleOverlayMouseDown]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
      </div>
    );
  }

  if (!initialImage) {
    return null;
  }

  return (
    <div className="flex h-screen flex-col bg-gray-900">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-800 bg-gray-900 px-4 py-3">
        <button
          onClick={handleBack}
          className="flex items-center text-white/70 transition-colors hover:text-white"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2 h-5 w-5"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Voltar
        </button>

        {/* History Controls */}
        <div className="flex items-center gap-2">
          <EditingHistory
            history={editor.history}
            currentIndex={editor.historyIndex}
            canUndo={editor.canUndo}
            canRedo={editor.canRedo}
            onUndo={editor.undo}
            onRedo={editor.redo}
          />
        </div>

        <Button onClick={handleContinue} size="sm">
          Continuar
        </Button>
      </header>

      {/* Área de edição */}
      <div
        className="relative flex-1 overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="flex h-full items-center justify-center p-4">
          <div
            ref={imageContainerRef}
            className="relative max-h-full max-w-full"
          >
            {(editor.currentImage || initialImage) && (
              <Image
                src={editor.currentImage || initialImage}
                alt="Imagem para editar"
                width={800}
                height={800}
                className={`max-h-[55vh] w-auto rounded-lg object-contain transition-all ${getCurrentFilterClass()}`}
                style={
                  editor.selectedTool === "adjust"
                    ? getAdjustmentStyle()
                    : undefined
                }
                priority
                draggable={false}
              />
            )}

            {/* Render Text Overlays */}
            {textOverlayElements}

            {/* Render Sticker Overlays */}
            {stickerOverlayElements}
          </div>
        </div>

        {/* AI Processing Overlay */}
        <AIProcessingOverlay
          processing={editor.aiProcessing}
          onCancel={editor.cancelAIOperation}
        />

        {/* AI Panels */}
        {showAIPanel === "enhance" && (
          <div className="absolute right-4 top-4 z-40">
            <AIEnhancePanel
              onEnhance={editor.runAIEnhance}
              processing={editor.aiProcessing}
              onCancel={editor.cancelAIOperation}
            />
          </div>
        )}

        {showAIPanel === "background" && (
          <div className="absolute right-4 top-4 z-40">
            <AIBackgroundPanel
              onProcess={editor.runBackgroundProcess}
              processing={editor.aiProcessing}
              onCancel={editor.cancelAIOperation}
            />
          </div>
        )}

        {showAIPanel === "style" && (
          <div className="absolute right-4 top-4 z-40">
            <AIStylePanel
              onApplyStyle={editor.runGenerativeEdit}
              processing={editor.aiProcessing}
              onCancel={editor.cancelAIOperation}
            />
          </div>
        )}

        {/* Manual Editing Panels */}
        {editor.selectedTool === "text" && (
          <div className="absolute right-4 top-4 z-40">
            <TextOverlayPanel
              overlays={editor.textOverlays}
              selectedId={editor.selectedTextId}
              onAdd={editor.addTextOverlay}
              onUpdate={editor.updateTextOverlay}
              onDelete={editor.deleteTextOverlay}
              onSelect={editor.setSelectedTextId}
            />
          </div>
        )}

        {editor.selectedTool === "sticker" && (
          <div className="absolute right-4 top-4 z-40">
            <StickerPanel
              overlays={editor.stickerOverlays}
              selectedId={editor.selectedStickerId}
              onAdd={editor.addStickerOverlay}
              onUpdate={editor.updateStickerOverlay}
              onDelete={editor.deleteStickerOverlay}
              onSelect={editor.setSelectedStickerId}
            />
          </div>
        )}
      </div>

      {/* Crop Tool Modal */}
      {editor.showCropTool && (
        <CropTool
          imageUrl={editor.currentImage}
          imageWidth={editor.imageDimensions.width}
          imageHeight={editor.imageDimensions.height}
          onCrop={editor.applyCrop}
          onCancel={() => editor.setShowCropTool(false)}
        />
      )}

      {/* Drawing Tool Modal */}
      {editor.showDrawingTool && (
        <DrawingPanel
          imageUrl={editor.currentImage}
          imageWidth={editor.imageDimensions.width}
          imageHeight={editor.imageDimensions.height}
          paths={editor.drawingPaths}
          onAddPath={editor.addDrawingPath}
          onUndo={editor.undoDrawingPath}
          onClear={editor.clearDrawingPaths}
          onApply={editor.applyDrawing}
          onCancel={() => editor.setShowDrawingTool(false)}
        />
      )}

      {/* Painel de ferramenta ativa */}
      {editor.selectedTool === "filter" && (
        <div className="border-t border-gray-800 bg-gray-900 p-4">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => handleFilterSelect(filter.id)}
                className={`flex flex-col items-center gap-2 ${
                  selectedFilter === filter.id
                    ? "text-violet-400"
                    : "text-white/70"
                }`}
              >
                <div
                  className={`h-16 w-16 overflow-hidden rounded-lg border-2 ${
                    selectedFilter === filter.id
                      ? "border-violet-500"
                      : "border-transparent"
                  }`}
                >
                  <Image
                    src={initialImage}
                    alt={filter.label}
                    width={64}
                    height={64}
                    className={`h-full w-full object-cover ${filter.class}`}
                  />
                </div>
                <span className="text-xs">{filter.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {editor.selectedTool === "adjust" && (
        <div className="border-t border-gray-800 bg-gray-900 p-4">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="w-20 text-sm text-white/70">Brilho</span>
              <input
                type="range"
                min="50"
                max="150"
                value={brightness}
                onChange={(e) =>
                  handleAdjustmentChange("brightness", Number(e.target.value))
                }
                className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-700 accent-violet-500"
              />
              <span className="w-12 text-right text-sm text-white/50">
                {brightness}%
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="w-20 text-sm text-white/70">Contraste</span>
              <input
                type="range"
                min="50"
                max="150"
                value={contrast}
                onChange={(e) =>
                  handleAdjustmentChange("contrast", Number(e.target.value))
                }
                className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-700 accent-violet-500"
              />
              <span className="w-12 text-right text-sm text-white/50">
                {contrast}%
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="w-20 text-sm text-white/70">Saturação</span>
              <input
                type="range"
                min="0"
                max="200"
                value={saturation}
                onChange={(e) =>
                  handleAdjustmentChange("saturation", Number(e.target.value))
                }
                className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-700 accent-violet-500"
              />
              <span className="w-12 text-right text-sm text-white/50">
                {saturation}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Barra de ferramentas */}
      <div className="border-t border-gray-800 bg-gray-900 px-2 py-3">
        <div className="flex justify-around overflow-x-auto">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => handleToolSelect(tool.id)}
              className={`flex flex-col items-center gap-1 rounded-lg px-2 py-2 transition-colors ${
                editor.selectedTool === tool.id
                  ? tool.isAI
                    ? "bg-gradient-to-br from-purple-500/30 to-pink-500/30 text-pink-400"
                    : "bg-violet-500/20 text-violet-400"
                  : "text-white/70 hover:text-white"
              }`}
            >
              {tool.isAI && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
              )}
              <div className="relative">
                {tool.icon}
                {tool.isAI && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse" />
                )}
              </div>
              <span className="text-xs">{tool.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="flex items-center justify-between border-t border-gray-800 bg-gray-950 px-4 py-2">
        <button
          onClick={editor.resetToOriginal}
          className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          Resetar
        </button>

        <div className="flex items-center gap-4">
          {(editor.textOverlays.length > 0 ||
            editor.stickerOverlays.length > 0) && (
            <button
              onClick={editor.flattenOverlays}
              className="flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" x2="12" y1="15" y2="3" />
              </svg>
              Mesclar
            </button>
          )}

          <button
            onClick={() => editor.rotate(90)}
            className="flex items-center gap-1 text-sm text-white/60 hover:text-white transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
            Girar
          </button>

          <button
            onClick={() => editor.flip("horizontal")}
            className="flex items-center gap-1 text-sm text-white/60 hover:text-white transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M8 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h3" />
              <path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" />
              <path d="M12 20v2" />
              <path d="M12 14v2" />
              <path d="M12 8v2" />
              <path d="M12 2v2" />
            </svg>
            Espelhar
          </button>
        </div>
      </div>
    </div>
  );
}
