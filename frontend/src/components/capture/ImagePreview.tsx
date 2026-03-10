"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui";
import { ImageZoomPan } from "./ImageZoomPan";
import { ImageMetadata } from "./ImageMetadata";

interface ImagePreviewProps {
  imageData: string;
  onConfirm: () => void;
  onRetake: () => void;
  onCancel: () => void;
  onImageChange?: (newImageData: string) => void;
}

type RotationDegree = 0 | 90 | 180 | 270;

export function ImagePreview({
  imageData,
  onConfirm,
  onRetake,
  onCancel,
  onImageChange,
}: ImagePreviewProps) {
  const [rotation, setRotation] = useState<RotationDegree>(0);
  const [isFlippedH, setIsFlippedH] = useState(false);
  const [showMetadata, setShowMetadata] = useState(true);
  const [currentZoom, setCurrentZoom] = useState(1);
  const [processedImage, setProcessedImage] = useState<string>(imageData);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Apply transformations to image
  const applyTransformations = useCallback(async () => {
    if (rotation === 0 && !isFlippedH) {
      setProcessedImage(imageData);
      return;
    }

    return new Promise<void>((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) {
          resolve();
          return;
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve();
          return;
        }

        // Set canvas size based on rotation
        const isRotated90or270 = rotation === 90 || rotation === 270;
        canvas.width = isRotated90or270 ? img.height : img.width;
        canvas.height = isRotated90or270 ? img.width : img.height;

        // Apply transformations
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        if (isFlippedH) {
          ctx.scale(-1, 1);
        }
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();

        const newImageData = canvas.toDataURL("image/jpeg", 0.92);
        setProcessedImage(newImageData);
        resolve();
      };
      img.src = imageData;
    });
  }, [imageData, rotation, isFlippedH]);

  // Apply transformations when rotation or flip changes
  useEffect(() => {
    applyTransformations();
  }, [applyTransformations]);

  // Rotate image 90 degrees clockwise
  const handleRotate = useCallback(() => {
    setRotation((prev) => ((prev + 90) % 360) as RotationDegree);
  }, []);

  // Flip image horizontally
  const handleFlipHorizontal = useCallback(() => {
    setIsFlippedH((prev) => !prev);
  }, []);

  // Reset transformations
  const handleReset = useCallback(() => {
    setRotation(0);
    setIsFlippedH(false);
    setProcessedImage(imageData);
  }, [imageData]);

  // Confirm with processed image
  const handleConfirm = useCallback(() => {
    if (onImageChange && (rotation !== 0 || isFlippedH)) {
      onImageChange(processedImage);
    }
    onConfirm();
  }, [onConfirm, onImageChange, processedImage, rotation, isFlippedH]);

  const hasTransformations = rotation !== 0 || isFlippedH;

  return (
    <div className="flex h-full flex-col bg-black">
      {/* Header com controles */}
      <header className="absolute left-0 right-0 top-0 z-20 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={onCancel}
            className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20"
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
              <path d="m15 18-6-6 6-6" />
            </svg>
            Voltar
          </button>

          <div className="flex items-center gap-2">
            {/* Toggle Metadata */}
            <button
              onClick={() => setShowMetadata((prev) => !prev)}
              className={`rounded-full p-2.5 backdrop-blur-sm transition-colors ${
                showMetadata
                  ? "bg-violet-500/30 text-violet-300"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
              aria-label={showMetadata ? "Ocultar informacoes" : "Mostrar informacoes"}
            >
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
                <line x1="12" x2="12" y1="16" y2="12" />
                <line x1="12" x2="12.01" y1="8" y2="8" />
              </svg>
            </button>
          </div>
        </div>

        {/* Metadata Display */}
        {showMetadata && (
          <div className="px-4 pb-4">
            <ImageMetadata imageData={processedImage} variant="compact" />
          </div>
        )}
      </header>

      {/* Zona da imagem com zoom */}
      <div className="relative flex-1 overflow-hidden">
        <ImageZoomPan onZoomChange={setCurrentZoom}>
          <div className="flex h-full items-center justify-center">
            <Image
              src={processedImage}
              alt="Preview da imagem"
              fill
              className="object-contain"
              priority
            />
          </div>
        </ImageZoomPan>

        {/* Dica de zoom */}
        {currentZoom === 1 && (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center">
            <div className="rounded-full bg-black/50 px-3 py-1.5 text-xs text-white/60 backdrop-blur-sm">
              Toque duplo ou scroll para zoom
            </div>
          </div>
        )}

        {/* Canvas oculto para processamento */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Ferramentas de edicao rapida */}
      <div className="border-b border-white/10 bg-black/80 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-4">
          {/* Rotate */}
          <button
            onClick={handleRotate}
            className="flex flex-col items-center gap-1 rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
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
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
            <span className="text-xs">Girar</span>
          </button>

          {/* Flip Horizontal */}
          <button
            onClick={handleFlipHorizontal}
            className={`flex flex-col items-center gap-1 rounded-lg p-2 transition-colors ${
              isFlippedH
                ? "bg-violet-500/20 text-violet-400"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
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
              <path d="M8 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h3" />
              <path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" />
              <path d="M12 20v2" />
              <path d="M12 14v2" />
              <path d="M12 8v2" />
              <path d="M12 2v2" />
            </svg>
            <span className="text-xs">Espelhar</span>
          </button>

          {/* Reset */}
          {hasTransformations && (
            <button
              onClick={handleReset}
              className="flex flex-col items-center gap-1 rounded-lg p-2 text-yellow-400/80 transition-colors hover:bg-yellow-500/10 hover:text-yellow-400"
            >
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
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              <span className="text-xs">Resetar</span>
            </button>
          )}

          {/* Rotation indicator */}
          {rotation !== 0 && (
            <div className="flex items-center gap-1 rounded-full bg-violet-500/20 px-2 py-1 text-xs text-violet-300">
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
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
              </svg>
              {rotation}
            </div>
          )}
        </div>
      </div>

      {/* Controles principais */}
      <div className="bg-gradient-to-t from-black/90 to-black/70 p-6 backdrop-blur-sm">
        <div className="mx-auto max-w-md space-y-4">
          {/* Botao principal */}
          <Button onClick={handleConfirm} fullWidth className="h-14 text-lg">
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
              <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z" />
            </svg>
            {hasTransformations ? "Aplicar e editar" : "Editar imagem"}
          </Button>

          {/* Botoes secundarios */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onRetake}
              fullWidth
              className="border-white/30 text-white hover:bg-white/10"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2 h-4 w-4"
              >
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
              Nova foto
            </Button>

            <Button
              variant="ghost"
              onClick={onCancel}
              fullWidth
              className="text-white/70 hover:bg-white/10 hover:text-white"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2 h-4 w-4"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
              Cancelar
            </Button>
          </div>

          {/* Transformation info */}
          {hasTransformations && (
            <p className="text-center text-xs text-white/50">
              As alteracoes serao aplicadas ao continuar
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
