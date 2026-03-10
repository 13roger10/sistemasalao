"use client";

import React, { useState, useCallback } from "react";
import type { TextOverlayConfig } from "@/types";

interface TextOverlayPanelProps {
  overlays: TextOverlayConfig[];
  selectedId: string | null;
  onAdd: (config: Omit<TextOverlayConfig, "id">) => void;
  onUpdate: (id: string, updates: Partial<TextOverlayConfig>) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string | null) => void;
}

const fontFamilies = [
  { label: "Sans Serif", value: "Inter, system-ui, sans-serif" },
  { label: "Serif", value: "Georgia, serif" },
  { label: "Mono", value: "Fira Code, monospace" },
  { label: "Cursive", value: "Pacifico, cursive" },
  { label: "Display", value: "Bebas Neue, sans-serif" },
];

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
  "#6B7280",
];

export function TextOverlayPanel({
  overlays,
  selectedId,
  onAdd,
  onUpdate,
  onDelete,
  onSelect,
}: TextOverlayPanelProps) {
  const [newText, setNewText] = useState("Seu texto aqui");
  const selectedOverlay = overlays.find((o) => o.id === selectedId);

  const handleAddText = useCallback(() => {
    onAdd({
      text: newText,
      x: 50,
      y: 50,
      fontSize: 32,
      fontFamily: fontFamilies[0].value,
      fontWeight: "normal",
      fontStyle: "normal",
      color: "#FFFFFF",
      rotation: 0,
      opacity: 1,
      textAlign: "center",
      shadow: {
        color: "rgba(0,0,0,0.5)",
        blur: 4,
        offsetX: 2,
        offsetY: 2,
      },
    });
    setNewText("Seu texto aqui");
  }, [newText, onAdd]);

  return (
    <div className="bg-gray-900 rounded-xl p-4 w-80 shadow-xl border border-gray-800">
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
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
            d="M4 6h16M4 12h8m-8 6h16"
          />
        </svg>
        Adicionar Texto
      </h3>

      {/* Add new text */}
      <div className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Digite seu texto..."
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
          />
          <button
            onClick={handleAddText}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Text list */}
      {overlays.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-xs text-white/50 uppercase tracking-wide">
            Textos adicionados
          </p>
          {overlays.map((overlay) => (
            <div
              key={overlay.id}
              onClick={() => onSelect(overlay.id)}
              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                selectedId === overlay.id
                  ? "bg-violet-600/30 border border-violet-500"
                  : "bg-gray-800 border border-transparent hover:border-gray-700"
              }`}
            >
              <span className="text-white text-sm truncate max-w-[180px]">
                {overlay.text}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(overlay.id);
                }}
                className="text-red-400 hover:text-red-300 p-1"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Edit selected text */}
      {selectedOverlay && (
        <div className="space-y-4 border-t border-gray-800 pt-4">
          <p className="text-xs text-white/50 uppercase tracking-wide">
            Editar texto selecionado
          </p>

          {/* Text content */}
          <div>
            <label className="block text-xs text-white/70 mb-1">Conteúdo</label>
            <input
              type="text"
              value={selectedOverlay.text}
              onChange={(e) =>
                onUpdate(selectedOverlay.id, { text: e.target.value })
              }
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* Font size */}
          <div>
            <label className="block text-xs text-white/70 mb-1">
              Tamanho: {selectedOverlay.fontSize}px
            </label>
            <input
              type="range"
              min="12"
              max="120"
              value={selectedOverlay.fontSize}
              onChange={(e) =>
                onUpdate(selectedOverlay.id, {
                  fontSize: Number(e.target.value),
                })
              }
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
            />
          </div>

          {/* Font family */}
          <div>
            <label className="block text-xs text-white/70 mb-1">Fonte</label>
            <select
              value={selectedOverlay.fontFamily}
              onChange={(e) =>
                onUpdate(selectedOverlay.id, { fontFamily: e.target.value })
              }
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
            >
              {fontFamilies.map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>

          {/* Font style buttons */}
          <div className="flex gap-2">
            <button
              onClick={() =>
                onUpdate(selectedOverlay.id, {
                  fontWeight:
                    selectedOverlay.fontWeight === "bold" ? "normal" : "bold",
                })
              }
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                selectedOverlay.fontWeight === "bold"
                  ? "bg-violet-600 text-white"
                  : "bg-gray-800 text-white/70 hover:bg-gray-700"
              }`}
            >
              B
            </button>
            <button
              onClick={() =>
                onUpdate(selectedOverlay.id, {
                  fontStyle:
                    selectedOverlay.fontStyle === "italic" ? "normal" : "italic",
                })
              }
              className={`flex-1 py-2 rounded-lg text-sm italic transition-colors ${
                selectedOverlay.fontStyle === "italic"
                  ? "bg-violet-600 text-white"
                  : "bg-gray-800 text-white/70 hover:bg-gray-700"
              }`}
            >
              I
            </button>
            <button
              onClick={() =>
                onUpdate(selectedOverlay.id, { textAlign: "left" })
              }
              className={`flex-1 py-2 rounded-lg transition-colors ${
                selectedOverlay.textAlign === "left"
                  ? "bg-violet-600 text-white"
                  : "bg-gray-800 text-white/70 hover:bg-gray-700"
              }`}
            >
              <svg
                className="w-4 h-4 mx-auto"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h10M4 18h14"
                />
              </svg>
            </button>
            <button
              onClick={() =>
                onUpdate(selectedOverlay.id, { textAlign: "center" })
              }
              className={`flex-1 py-2 rounded-lg transition-colors ${
                selectedOverlay.textAlign === "center"
                  ? "bg-violet-600 text-white"
                  : "bg-gray-800 text-white/70 hover:bg-gray-700"
              }`}
            >
              <svg
                className="w-4 h-4 mx-auto"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M6 12h12M5 18h14"
                />
              </svg>
            </button>
            <button
              onClick={() =>
                onUpdate(selectedOverlay.id, { textAlign: "right" })
              }
              className={`flex-1 py-2 rounded-lg transition-colors ${
                selectedOverlay.textAlign === "right"
                  ? "bg-violet-600 text-white"
                  : "bg-gray-800 text-white/70 hover:bg-gray-700"
              }`}
            >
              <svg
                className="w-4 h-4 mx-auto"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M10 12h10M6 18h14"
                />
              </svg>
            </button>
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs text-white/70 mb-2">Cor</label>
            <div className="flex gap-2 flex-wrap">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() =>
                    onUpdate(selectedOverlay.id, { color: color })
                  }
                  className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                    selectedOverlay.color === color
                      ? "border-violet-500 scale-110"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Opacity */}
          <div>
            <label className="block text-xs text-white/70 mb-1">
              Opacidade: {Math.round(selectedOverlay.opacity * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={selectedOverlay.opacity * 100}
              onChange={(e) =>
                onUpdate(selectedOverlay.id, {
                  opacity: Number(e.target.value) / 100,
                })
              }
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
            />
          </div>

          {/* Rotation */}
          <div>
            <label className="block text-xs text-white/70 mb-1">
              Rotação: {selectedOverlay.rotation}°
            </label>
            <input
              type="range"
              min="-180"
              max="180"
              value={selectedOverlay.rotation}
              onChange={(e) =>
                onUpdate(selectedOverlay.id, {
                  rotation: Number(e.target.value),
                })
              }
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
            />
          </div>
        </div>
      )}

      {overlays.length === 0 && (
        <p className="text-center text-white/40 text-sm py-4">
          Nenhum texto adicionado ainda
        </p>
      )}
    </div>
  );
}

export default TextOverlayPanel;
