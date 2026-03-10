"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import type { DrawingPath } from "@/types";

interface DrawingPanelProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  paths: DrawingPath[];
  onAddPath: (path: Omit<DrawingPath, "id">) => void;
  onUndo: () => void;
  onClear: () => void;
  onApply: (mergedImageData: string) => void;
  onCancel: () => void;
}

type DrawTool = "pen" | "brush" | "highlighter" | "eraser";

const colors = [
  "#FFFFFF",
  "#000000",
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
];

const brushSizes = [2, 4, 8, 12, 20, 30];

export function DrawingPanel({
  imageUrl,
  imageWidth,
  imageHeight,
  paths,
  onAddPath,
  onUndo,
  onClear,
  onApply,
  onCancel,
}: DrawingPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<DrawTool>("pen");
  const [strokeColor, setStrokeColor] = useState("#FFFFFF");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>(
    []
  );
  const [displayScale, setDisplayScale] = useState(1);

  // Calculate display scale
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight - 80;
        const scaleX = containerWidth / imageWidth;
        const scaleY = containerHeight / imageHeight;
        setDisplayScale(Math.min(scaleX, scaleY, 1));
      }
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [imageWidth, imageHeight]);

  // Redraw canvas when paths change
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all paths
    paths.forEach((path) => {
      if (path.points.length < 2) return;

      ctx.beginPath();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      switch (path.tool) {
        case "pen":
          ctx.strokeStyle = path.strokeColor;
          ctx.lineWidth = path.strokeWidth;
          ctx.globalAlpha = path.opacity;
          break;
        case "brush":
          ctx.strokeStyle = path.strokeColor;
          ctx.lineWidth = path.strokeWidth * 1.5;
          ctx.globalAlpha = path.opacity * 0.8;
          break;
        case "highlighter":
          ctx.strokeStyle = path.strokeColor;
          ctx.lineWidth = path.strokeWidth * 2;
          ctx.globalAlpha = 0.4;
          break;
        case "eraser":
          ctx.globalCompositeOperation = "destination-out";
          ctx.lineWidth = path.strokeWidth * 2;
          ctx.globalAlpha = 1;
          break;
      }

      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
      }
      ctx.stroke();

      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    });

    // Draw current stroke
    if (currentPoints.length >= 2) {
      ctx.beginPath();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      switch (currentTool) {
        case "pen":
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = strokeWidth;
          ctx.globalAlpha = 1;
          break;
        case "brush":
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = strokeWidth * 1.5;
          ctx.globalAlpha = 0.8;
          break;
        case "highlighter":
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = strokeWidth * 2;
          ctx.globalAlpha = 0.4;
          break;
        case "eraser":
          ctx.globalCompositeOperation = "destination-out";
          ctx.lineWidth = strokeWidth * 2;
          ctx.globalAlpha = 1;
          break;
      }

      ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
      for (let i = 1; i < currentPoints.length; i++) {
        ctx.lineTo(currentPoints[i].x, currentPoints[i].y);
      }
      ctx.stroke();

      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    }
  }, [paths, currentPoints, currentTool, strokeColor, strokeWidth]);

  const getCanvasPosition = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const clientX =
        "touches" in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
      const clientY =
        "touches" in e ? e.touches[0]?.clientY ?? 0 : e.clientY;

      return {
        x: (clientX - rect.left) / displayScale,
        y: (clientY - rect.top) / displayScale,
      };
    },
    [displayScale]
  );

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const pos = getCanvasPosition(e);
      setIsDrawing(true);
      setCurrentPoints([pos]);
    },
    [getCanvasPosition]
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing) return;
      e.preventDefault();
      const pos = getCanvasPosition(e);
      setCurrentPoints((prev) => [...prev, pos]);
    },
    [isDrawing, getCanvasPosition]
  );

  const endDrawing = useCallback(() => {
    if (!isDrawing || currentPoints.length < 2) {
      setIsDrawing(false);
      setCurrentPoints([]);
      return;
    }

    onAddPath({
      points: currentPoints,
      strokeColor,
      strokeWidth,
      opacity: 1,
      tool: currentTool,
    });

    setIsDrawing(false);
    setCurrentPoints([]);
  }, [isDrawing, currentPoints, strokeColor, strokeWidth, currentTool, onAddPath]);

  const handleApply = useCallback(() => {
    // Merge drawing with image
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = imageWidth;
    canvas.height = imageHeight;

    // Draw original image
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      ctx.drawImage(img, 0, 0);

      // Draw paths
      if (canvasRef.current) {
        ctx.drawImage(canvasRef.current, 0, 0);
      }

      const mergedData = canvas.toDataURL("image/png");
      onApply(mergedData);
    };
    img.src = imageUrl;
  }, [imageUrl, imageWidth, imageHeight, onApply]);

  const toolButtons: { tool: DrawTool; icon: React.ReactNode; label: string }[] = [
    {
      tool: "pen",
      label: "Caneta",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      ),
    },
    {
      tool: "brush",
      label: "Pincel",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      ),
    },
    {
      tool: "highlighter",
      label: "Marca-texto",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      tool: "eraser",
      label: "Borracha",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
    },
  ];

  // Don't render if no valid image
  if (!imageUrl) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <button
          onClick={onCancel}
          className="text-white/70 hover:text-white flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Cancelar
        </button>
        <h2 className="text-white font-medium">Desenho Livre</h2>
        <button
          onClick={handleApply}
          className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
        >
          Aplicar
        </button>
      </div>

      {/* Canvas Area */}
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
          {/* Background Image */}
          <img
            src={imageUrl}
            alt="Background"
            className="absolute inset-0 w-full h-full object-contain"
            draggable={false}
          />

          {/* Drawing Canvas */}
          <canvas
            ref={canvasRef}
            width={imageWidth}
            height={imageHeight}
            className="absolute inset-0 cursor-crosshair"
            style={{
              width: imageWidth * displayScale,
              height: imageHeight * displayScale,
            }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={endDrawing}
            onMouseLeave={endDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={endDrawing}
          />
        </div>
      </div>

      {/* Tools Panel */}
      <div className="border-t border-gray-800 bg-gray-900 p-4">
        <div className="flex flex-col gap-4 max-w-2xl mx-auto">
          {/* Tool Selector */}
          <div className="flex justify-center gap-2">
            {toolButtons.map((btn) => (
              <button
                key={btn.tool}
                onClick={() => setCurrentTool(btn.tool)}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                  currentTool === btn.tool
                    ? "bg-violet-600 text-white"
                    : "bg-gray-800 text-white/70 hover:bg-gray-700"
                }`}
              >
                {btn.icon}
                <span className="text-xs">{btn.label}</span>
              </button>
            ))}
          </div>

          {/* Color and Size */}
          <div className="flex items-center justify-center gap-6">
            {/* Colors */}
            <div className="flex gap-2">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => setStrokeColor(color)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                    strokeColor === color
                      ? "border-violet-500 scale-110"
                      : "border-gray-600"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            {/* Brush Size */}
            <div className="flex items-center gap-2">
              {brushSizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setStrokeWidth(size)}
                  className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                    strokeWidth === size
                      ? "bg-violet-600"
                      : "bg-gray-800 hover:bg-gray-700"
                  }`}
                >
                  <div
                    className="bg-white rounded-full"
                    style={{ width: Math.min(size, 20), height: Math.min(size, 20) }}
                  />
                </button>
              ))}
            </div>

            {/* Undo / Clear */}
            <div className="flex gap-2">
              <button
                onClick={onUndo}
                disabled={paths.length === 0}
                className="px-3 py-2 bg-gray-800 text-white/70 rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </button>
              <button
                onClick={onClear}
                disabled={paths.length === 0}
                className="px-3 py-2 bg-gray-800 text-white/70 rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DrawingPanel;
