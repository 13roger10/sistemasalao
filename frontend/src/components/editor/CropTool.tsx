"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import type { CropArea, AspectRatio } from "@/types";

interface CropToolProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  onCrop: (croppedImageData: string) => void;
  onCancel: () => void;
}

const aspectRatios: AspectRatio[] = [
  { label: "Livre", value: null },
  { label: "1:1", value: 1 },
  { label: "4:5", value: 4 / 5 },
  { label: "16:9", value: 16 / 9 },
  { label: "9:16", value: 9 / 16 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:2", value: 3 / 2 },
];

type DragHandle =
  | "nw"
  | "n"
  | "ne"
  | "w"
  | "e"
  | "sw"
  | "s"
  | "se"
  | "move"
  | null;

export function CropTool({
  imageUrl,
  imageWidth,
  imageHeight,
  onCrop,
  onCancel,
}: CropToolProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>(
    aspectRatios[0]
  );
  const [cropArea, setCropArea] = useState<CropArea>({
    x: imageWidth * 0.1,
    y: imageHeight * 0.1,
    width: imageWidth * 0.8,
    height: imageHeight * 0.8,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragHandle, setDragHandle] = useState<DragHandle>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialCrop, setInitialCrop] = useState<CropArea | null>(null);
  const [displayScale, setDisplayScale] = useState(1);

  // Calculate display scale based on container size
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight - 100; // Account for controls
        const scaleX = containerWidth / imageWidth;
        const scaleY = containerHeight / imageHeight;
        setDisplayScale(Math.min(scaleX, scaleY, 1));
      }
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [imageWidth, imageHeight]);

  // Apply aspect ratio when changed
  useEffect(() => {
    if (selectedRatio.value !== null) {
      const ratio = selectedRatio.value;
      let newWidth = cropArea.width;
      let newHeight = cropArea.width / ratio;

      if (newHeight > imageHeight) {
        newHeight = imageHeight * 0.8;
        newWidth = newHeight * ratio;
      }

      if (newWidth > imageWidth) {
        newWidth = imageWidth * 0.8;
        newHeight = newWidth / ratio;
      }

      const newX = (imageWidth - newWidth) / 2;
      const newY = (imageHeight - newHeight) / 2;

      setCropArea({
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
      });
    }
  }, [selectedRatio, imageWidth, imageHeight]);

  const getMousePosition = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / displayScale,
        y: (e.clientY - rect.top) / displayScale,
      };
    },
    [displayScale]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, handle: DragHandle) => {
      e.preventDefault();
      setIsDragging(true);
      setDragHandle(handle);
      setDragStart(getMousePosition(e));
      setInitialCrop({ ...cropArea });
    },
    [getMousePosition, cropArea]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !initialCrop || !dragHandle) return;

      const pos = getMousePosition(e);
      const deltaX = pos.x - dragStart.x;
      const deltaY = pos.y - dragStart.y;

      let newCrop = { ...initialCrop };
      const minSize = 50;

      if (dragHandle === "move") {
        newCrop.x = Math.max(
          0,
          Math.min(imageWidth - newCrop.width, initialCrop.x + deltaX)
        );
        newCrop.y = Math.max(
          0,
          Math.min(imageHeight - newCrop.height, initialCrop.y + deltaY)
        );
      } else {
        // Handle corner and edge dragging
        switch (dragHandle) {
          case "nw":
            newCrop.x = Math.max(0, initialCrop.x + deltaX);
            newCrop.y = Math.max(0, initialCrop.y + deltaY);
            newCrop.width = Math.max(
              minSize,
              initialCrop.width - (newCrop.x - initialCrop.x)
            );
            newCrop.height = Math.max(
              minSize,
              initialCrop.height - (newCrop.y - initialCrop.y)
            );
            break;
          case "ne":
            newCrop.y = Math.max(0, initialCrop.y + deltaY);
            newCrop.width = Math.max(minSize, initialCrop.width + deltaX);
            newCrop.height = Math.max(
              minSize,
              initialCrop.height - (newCrop.y - initialCrop.y)
            );
            break;
          case "sw":
            newCrop.x = Math.max(0, initialCrop.x + deltaX);
            newCrop.width = Math.max(
              minSize,
              initialCrop.width - (newCrop.x - initialCrop.x)
            );
            newCrop.height = Math.max(minSize, initialCrop.height + deltaY);
            break;
          case "se":
            newCrop.width = Math.max(minSize, initialCrop.width + deltaX);
            newCrop.height = Math.max(minSize, initialCrop.height + deltaY);
            break;
          case "n":
            newCrop.y = Math.max(0, initialCrop.y + deltaY);
            newCrop.height = Math.max(
              minSize,
              initialCrop.height - (newCrop.y - initialCrop.y)
            );
            break;
          case "s":
            newCrop.height = Math.max(minSize, initialCrop.height + deltaY);
            break;
          case "w":
            newCrop.x = Math.max(0, initialCrop.x + deltaX);
            newCrop.width = Math.max(
              minSize,
              initialCrop.width - (newCrop.x - initialCrop.x)
            );
            break;
          case "e":
            newCrop.width = Math.max(minSize, initialCrop.width + deltaX);
            break;
        }

        // Apply aspect ratio constraint
        if (selectedRatio.value !== null) {
          const ratio = selectedRatio.value;
          if (
            dragHandle === "n" ||
            dragHandle === "s" ||
            dragHandle.includes("n") ||
            dragHandle.includes("s")
          ) {
            newCrop.width = newCrop.height * ratio;
          } else {
            newCrop.height = newCrop.width / ratio;
          }
        }

        // Keep within bounds
        newCrop.width = Math.min(newCrop.width, imageWidth - newCrop.x);
        newCrop.height = Math.min(newCrop.height, imageHeight - newCrop.y);
      }

      setCropArea(newCrop);
    },
    [
      isDragging,
      initialCrop,
      dragHandle,
      dragStart,
      getMousePosition,
      imageWidth,
      imageHeight,
      selectedRatio,
    ]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragHandle(null);
    setInitialCrop(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const applyCrop = useCallback(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = cropArea.width;
    canvas.height = cropArea.height;

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      ctx.drawImage(
        img,
        cropArea.x,
        cropArea.y,
        cropArea.width,
        cropArea.height,
        0,
        0,
        cropArea.width,
        cropArea.height
      );
      const croppedData = canvas.toDataURL("image/png");
      onCrop(croppedData);
    };
    img.src = imageUrl;
  }, [cropArea, imageUrl, onCrop]);

  // Don't render if no valid image
  if (!imageUrl) {
    return null;
  }

  const handleStyle = "w-3 h-3 bg-white border-2 border-violet-500 rounded-sm absolute";

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <button
          onClick={onCancel}
          className="text-white/70 hover:text-white flex items-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          Cancelar
        </button>
        <h2 className="text-white font-medium">Recortar Imagem</h2>
        <button
          onClick={applyCrop}
          className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
        >
          Aplicar
        </button>
      </div>

      {/* Crop Area */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden flex items-center justify-center p-4"
      >
        <div
          className="relative"
          style={{
            width: imageWidth * displayScale,
            height: imageHeight * displayScale,
          }}
        >
          {/* Background Image (dimmed) */}
          <img
            src={imageUrl}
            alt="Original"
            className="absolute inset-0 w-full h-full object-contain opacity-40"
            draggable={false}
          />

          {/* Crop Preview */}
          <div
            className="absolute overflow-hidden"
            style={{
              left: cropArea.x * displayScale,
              top: cropArea.y * displayScale,
              width: cropArea.width * displayScale,
              height: cropArea.height * displayScale,
            }}
          >
            <img
              src={imageUrl}
              alt="Crop preview"
              className="absolute"
              style={{
                width: imageWidth * displayScale,
                height: imageHeight * displayScale,
                left: -cropArea.x * displayScale,
                top: -cropArea.y * displayScale,
              }}
              draggable={false}
            />
          </div>

          {/* Crop Frame */}
          <div
            className="absolute border-2 border-white cursor-move"
            style={{
              left: cropArea.x * displayScale,
              top: cropArea.y * displayScale,
              width: cropArea.width * displayScale,
              height: cropArea.height * displayScale,
            }}
            onMouseDown={(e) => handleMouseDown(e, "move")}
          >
            {/* Grid lines */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
              <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30" />
              <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
              <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
            </div>

            {/* Corner handles */}
            <div
              className={`${handleStyle} -left-1.5 -top-1.5 cursor-nw-resize`}
              onMouseDown={(e) => handleMouseDown(e, "nw")}
            />
            <div
              className={`${handleStyle} -right-1.5 -top-1.5 cursor-ne-resize`}
              onMouseDown={(e) => handleMouseDown(e, "ne")}
            />
            <div
              className={`${handleStyle} -left-1.5 -bottom-1.5 cursor-sw-resize`}
              onMouseDown={(e) => handleMouseDown(e, "sw")}
            />
            <div
              className={`${handleStyle} -right-1.5 -bottom-1.5 cursor-se-resize`}
              onMouseDown={(e) => handleMouseDown(e, "se")}
            />

            {/* Edge handles */}
            <div
              className={`${handleStyle} left-1/2 -translate-x-1/2 -top-1.5 cursor-n-resize`}
              onMouseDown={(e) => handleMouseDown(e, "n")}
            />
            <div
              className={`${handleStyle} left-1/2 -translate-x-1/2 -bottom-1.5 cursor-s-resize`}
              onMouseDown={(e) => handleMouseDown(e, "s")}
            />
            <div
              className={`${handleStyle} -left-1.5 top-1/2 -translate-y-1/2 cursor-w-resize`}
              onMouseDown={(e) => handleMouseDown(e, "w")}
            />
            <div
              className={`${handleStyle} -right-1.5 top-1/2 -translate-y-1/2 cursor-e-resize`}
              onMouseDown={(e) => handleMouseDown(e, "e")}
            />
          </div>

          {/* Dimension display */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 px-3 py-1 rounded-full text-white text-sm">
            {Math.round(cropArea.width)} x {Math.round(cropArea.height)}
          </div>
        </div>
      </div>

      {/* Aspect Ratio Selector */}
      <div className="border-t border-gray-800 bg-gray-900 p-4">
        <div className="flex gap-2 justify-center flex-wrap">
          {aspectRatios.map((ratio) => (
            <button
              key={ratio.label}
              onClick={() => setSelectedRatio(ratio)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedRatio.label === ratio.label
                  ? "bg-violet-600 text-white"
                  : "bg-gray-800 text-white/70 hover:bg-gray-700"
              }`}
            >
              {ratio.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CropTool;
