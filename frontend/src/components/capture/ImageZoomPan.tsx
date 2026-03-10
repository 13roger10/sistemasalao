"use client";

import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
  type TouchEvent,
  type MouseEvent,
  type WheelEvent,
} from "react";

interface Point {
  x: number;
  y: number;
}

interface ImageZoomPanProps {
  children: ReactNode;
  minScale?: number;
  maxScale?: number;
  onZoomChange?: (scale: number) => void;
  disabled?: boolean;
}

export function ImageZoomPan({
  children,
  minScale = 1,
  maxScale = 5,
  onZoomChange,
  disabled = false,
}: ImageZoomPanProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const lastPointRef = useRef<Point>({ x: 0, y: 0 });
  const lastTouchDistanceRef = useRef<number>(0);

  // Reset position when scale is 1
  useEffect(() => {
    if (scale <= 1) {
      setPosition({ x: 0, y: 0 });
    }
  }, [scale]);

  // Notify parent of zoom changes
  useEffect(() => {
    onZoomChange?.(scale);
  }, [scale, onZoomChange]);

  // Calculate distance between two touch points
  const getTouchDistance = useCallback((touches: React.TouchList): number => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Get center point of touches
  const getTouchCenter = useCallback((touches: React.TouchList): Point => {
    if (touches.length < 2) {
      return { x: touches[0].clientX, y: touches[0].clientY };
    }
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  }, []);

  // Clamp scale within bounds
  const clampScale = useCallback(
    (newScale: number): number => {
      return Math.min(maxScale, Math.max(minScale, newScale));
    },
    [minScale, maxScale]
  );

  // Clamp position to keep image within bounds
  const clampPosition = useCallback(
    (pos: Point, currentScale: number): Point => {
      if (currentScale <= 1) {
        return { x: 0, y: 0 };
      }

      const container = containerRef.current;
      if (!container) return pos;

      const rect = container.getBoundingClientRect();
      const maxX = (rect.width * (currentScale - 1)) / 2;
      const maxY = (rect.height * (currentScale - 1)) / 2;

      return {
        x: Math.min(maxX, Math.max(-maxX, pos.x)),
        y: Math.min(maxY, Math.max(-maxY, pos.y)),
      };
    },
    []
  );

  // Handle touch start
  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled) return;

      if (e.touches.length === 2) {
        lastTouchDistanceRef.current = getTouchDistance(e.touches);
        lastPointRef.current = getTouchCenter(e.touches);
      } else if (e.touches.length === 1 && scale > 1) {
        setIsDragging(true);
        lastPointRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }
    },
    [disabled, getTouchDistance, getTouchCenter, scale]
  );

  // Handle touch move
  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (disabled) return;

      if (e.touches.length === 2) {
        e.preventDefault();

        // Pinch zoom
        const currentDistance = getTouchDistance(e.touches);
        const distanceChange = currentDistance - lastTouchDistanceRef.current;
        const scaleChange = distanceChange * 0.01;
        const newScale = clampScale(scale + scaleChange);

        setScale(newScale);
        lastTouchDistanceRef.current = currentDistance;

        // Pan while zooming
        const currentCenter = getTouchCenter(e.touches);
        if (newScale > 1) {
          const dx = currentCenter.x - lastPointRef.current.x;
          const dy = currentCenter.y - lastPointRef.current.y;
          setPosition((prev) =>
            clampPosition({ x: prev.x + dx, y: prev.y + dy }, newScale)
          );
        }
        lastPointRef.current = currentCenter;
      } else if (e.touches.length === 1 && isDragging && scale > 1) {
        e.preventDefault();

        const currentPoint = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
        const dx = currentPoint.x - lastPointRef.current.x;
        const dy = currentPoint.y - lastPointRef.current.y;

        setPosition((prev) =>
          clampPosition({ x: prev.x + dx, y: prev.y + dy }, scale)
        );
        lastPointRef.current = currentPoint;
      }
    },
    [
      disabled,
      getTouchDistance,
      getTouchCenter,
      clampScale,
      clampPosition,
      scale,
      isDragging,
    ]
  );

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    lastTouchDistanceRef.current = 0;
  }, []);

  // Handle mouse wheel for desktop zoom
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (disabled) return;

      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.2 : 0.2;
      const newScale = clampScale(scale + delta);
      setScale(newScale);
      setPosition((prev) => clampPosition(prev, newScale));
    },
    [disabled, clampScale, clampPosition, scale]
  );

  // Handle mouse drag for desktop pan
  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (disabled || scale <= 1) return;

      setIsDragging(true);
      lastPointRef.current = { x: e.clientX, y: e.clientY };
    },
    [disabled, scale]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || disabled || scale <= 1) return;

      const dx = e.clientX - lastPointRef.current.x;
      const dy = e.clientY - lastPointRef.current.y;

      setPosition((prev) =>
        clampPosition({ x: prev.x + dx, y: prev.y + dy }, scale)
      );
      lastPointRef.current = { x: e.clientX, y: e.clientY };
    },
    [isDragging, disabled, scale, clampPosition]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Double tap/click to reset zoom
  const lastTapRef = useRef<number>(0);
  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap detected
      if (scale > 1) {
        setScale(1);
        setPosition({ x: 0, y: 0 });
      } else {
        setScale(2);
      }
    }
    lastTapRef.current = now;
  }, [scale]);

  // Reset zoom function
  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden touch-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleDoubleTap}
    >
      <div
        className="h-full w-full transition-transform duration-75"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default",
        }}
      >
        {children}
      </div>

      {/* Zoom indicator */}
      {scale > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
          <div className="rounded-full bg-black/70 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
            {Math.round(scale * 100)}%
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              resetZoom();
            }}
            className="rounded-full bg-black/70 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
            aria-label="Resetar zoom"
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
          </button>
        </div>
      )}
    </div>
  );
}
