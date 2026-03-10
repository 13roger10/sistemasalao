"use client";

import React, { useState, useCallback } from "react";
import type { StickerOverlay } from "@/types";

interface StickerPanelProps {
  overlays: StickerOverlay[];
  selectedId: string | null;
  onAdd: (sticker: { emoji: string; category: string }) => void;
  onUpdate: (id: string, updates: Partial<StickerOverlay>) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string | null) => void;
}

interface StickerCategory {
  id: string;
  name: string;
  stickers: string[];
}

const stickerCategories: StickerCategory[] = [
  {
    id: "emotions",
    name: "Emoções",
    stickers: ["😀", "😍", "🥰", "😎", "🤩", "😂", "🥳", "😘", "🤗", "💕"],
  },
  {
    id: "beauty",
    name: "Beleza",
    stickers: ["💄", "💋", "💅", "👄", "💇‍♀️", "💆‍♀️", "🧴", "✨", "💫", "⭐"],
  },
  {
    id: "celebration",
    name: "Celebração",
    stickers: ["🎉", "🎊", "🎈", "🎁", "🎀", "🏆", "🥇", "👑", "💎", "🌟"],
  },
  {
    id: "nature",
    name: "Natureza",
    stickers: ["🌸", "🌺", "🌹", "🌷", "💐", "🌻", "🍀", "🌿", "🦋", "🌈"],
  },
  {
    id: "gestures",
    name: "Gestos",
    stickers: ["👍", "👏", "🙌", "💪", "🤝", "✌️", "🤟", "👋", "💅", "🫶"],
  },
  {
    id: "symbols",
    name: "Símbolos",
    stickers: ["❤️", "💜", "💙", "💚", "🧡", "🖤", "🤍", "💛", "💖", "💝"],
  },
];

export function StickerPanel({
  overlays,
  selectedId,
  onAdd,
  onUpdate,
  onDelete,
  onSelect,
}: StickerPanelProps) {
  const [activeCategory, setActiveCategory] = useState(stickerCategories[0].id);
  const selectedOverlay = overlays.find((o) => o.id === selectedId);

  const handleAddSticker = useCallback(
    (emoji: string, category: string) => {
      onAdd({ emoji, category });
    },
    [onAdd]
  );

  const currentCategory = stickerCategories.find(
    (cat) => cat.id === activeCategory
  );

  return (
    <div className="bg-gray-900 rounded-xl p-4 w-80 shadow-xl border border-gray-800 max-h-[80vh] overflow-y-auto">
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
            d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Stickers
      </h3>

      {/* Category Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-3">
        {stickerCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
              activeCategory === category.id
                ? "bg-violet-600 text-white"
                : "bg-gray-800 text-white/70 hover:bg-gray-700"
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Stickers Grid */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        {currentCategory?.stickers.map((emoji, index) => (
          <button
            key={`${emoji}-${index}`}
            onClick={() => handleAddSticker(emoji, currentCategory.id)}
            className="w-12 h-12 flex items-center justify-center text-2xl bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors hover:scale-110"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Added Stickers List */}
      {overlays.length > 0 && (
        <div className="mb-4 border-t border-gray-800 pt-4">
          <p className="text-xs text-white/50 uppercase tracking-wide mb-2">
            Stickers adicionados
          </p>
          <div className="flex flex-wrap gap-2">
            {overlays.map((overlay) => (
              <button
                key={overlay.id}
                onClick={() => onSelect(overlay.id)}
                className={`w-10 h-10 flex items-center justify-center text-xl rounded-lg transition-all ${
                  selectedId === overlay.id
                    ? "bg-violet-600 ring-2 ring-violet-400"
                    : "bg-gray-800 hover:bg-gray-700"
                }`}
              >
                {overlay.src}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Edit Selected Sticker */}
      {selectedOverlay && (
        <div className="space-y-4 border-t border-gray-800 pt-4">
          <p className="text-xs text-white/50 uppercase tracking-wide">
            Editar sticker selecionado
          </p>

          {/* Size */}
          <div>
            <label className="block text-xs text-white/70 mb-1">
              Tamanho: {Math.round(selectedOverlay.width)}px
            </label>
            <input
              type="range"
              min="30"
              max="200"
              value={selectedOverlay.width}
              onChange={(e) => {
                const size = Number(e.target.value);
                onUpdate(selectedOverlay.id, { width: size, height: size });
              }}
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

          {/* Opacity */}
          <div>
            <label className="block text-xs text-white/70 mb-1">
              Opacidade: {Math.round(selectedOverlay.opacity * 100)}%
            </label>
            <input
              type="range"
              min="10"
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

          {/* Flip buttons */}
          <div className="flex gap-2">
            <button
              onClick={() =>
                onUpdate(selectedOverlay.id, {
                  flipH: !selectedOverlay.flipH,
                })
              }
              className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                selectedOverlay.flipH
                  ? "bg-violet-600 text-white"
                  : "bg-gray-800 text-white/70 hover:bg-gray-700"
              }`}
            >
              Espelhar H
            </button>
            <button
              onClick={() =>
                onUpdate(selectedOverlay.id, {
                  flipV: !selectedOverlay.flipV,
                })
              }
              className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                selectedOverlay.flipV
                  ? "bg-violet-600 text-white"
                  : "bg-gray-800 text-white/70 hover:bg-gray-700"
              }`}
            >
              Espelhar V
            </button>
          </div>

          {/* Delete button */}
          <button
            onClick={() => {
              onDelete(selectedOverlay.id);
              onSelect(null);
            }}
            className="w-full py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors flex items-center justify-center gap-2"
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
            Remover Sticker
          </button>
        </div>
      )}

      {overlays.length === 0 && (
        <p className="text-center text-white/40 text-sm py-4">
          Toque em um sticker para adicionar
        </p>
      )}
    </div>
  );
}

export default StickerPanel;
