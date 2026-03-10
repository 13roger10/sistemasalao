"use client";

import React from "react";
import type { EditingHistoryEntry } from "@/types";

interface EditingHistoryProps {
  history: EditingHistoryEntry[];
  currentIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onJumpTo?: (index: number) => void;
}

const actionLabels: Record<string, string> = {
  initial: "Original",
  reset: "Resetar",
  rotate_90: "Girar 90°",
  rotate_180: "Girar 180°",
  rotate_270: "Girar 270°",
  flip_horizontal: "Espelhar H",
  flip_vertical: "Espelhar V",
  ai_enhance: "IA Aprimorar",
  ai_background: "IA Fundo",
  ai_generative: "IA Estilo",
  filter_grayscale: "P&B",
  filter_sepia: "Sépia",
  filter_saturate: "Saturar",
  filter_contrast: "Contraste",
  filter_brightness: "Brilho",
  filter_vintage: "Vintage",
  filter_cool: "Frio",
  filter_warm: "Quente",
  crop: "Recortar",
  adjust: "Ajustar",
};

export function EditingHistory({
  history,
  currentIndex,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: EditingHistoryProps) {
  const getActionLabel = (action: string): string => {
    // Check exact match first
    if (actionLabels[action]) {
      return actionLabels[action];
    }

    // Check prefix matches
    for (const [key, label] of Object.entries(actionLabels)) {
      if (action.startsWith(key.replace("_", ""))) {
        return label;
      }
    }

    // Check for filter_ prefix
    if (action.startsWith("filter_")) {
      const filterName = action.replace("filter_", "");
      return `Filtro ${filterName}`;
    }

    // Check for adjust_ prefix
    if (action.startsWith("adjust_")) {
      return "Ajuste";
    }

    return action;
  };

  return (
    <div className="flex items-center gap-2">
      {/* Undo Button */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all ${
          canUndo
            ? "bg-white text-gray-700 hover:bg-gray-100 shadow-md"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
        }`}
        title="Desfazer (Ctrl+Z)"
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
            d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
          />
        </svg>
      </button>

      {/* History Counter */}
      <div className="flex items-center gap-1 px-3 py-2 bg-white rounded-lg shadow-md">
        <span className="text-sm font-medium text-gray-700">
          {currentIndex + 1}
        </span>
        <span className="text-sm text-gray-400">/</span>
        <span className="text-sm text-gray-500">{history.length}</span>
      </div>

      {/* Redo Button */}
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all ${
          canRedo
            ? "bg-white text-gray-700 hover:bg-gray-100 shadow-md"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
        }`}
        title="Refazer (Ctrl+Y)"
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
            d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6"
          />
        </svg>
      </button>

      {/* Current Action Label */}
      {history[currentIndex] && (
        <div className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
          {getActionLabel(history[currentIndex].action)}
        </div>
      )}
    </div>
  );
}

export default EditingHistory;
