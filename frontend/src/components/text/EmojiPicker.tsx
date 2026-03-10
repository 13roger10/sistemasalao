"use client";

import { useState, useCallback, useMemo } from "react";
import type { EmojiCategory } from "@/types";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose?: () => void;
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: "beauty",
    name: "Beleza",
    icon: "💄",
    emojis: ["💄", "💅", "💇", "💇‍♀️", "💆", "💆‍♀️", "🧖", "🧖‍♀️", "✨", "💫", "🌟", "⭐", "💎", "👑", "🎀", "🌸", "🌺", "🌹", "💐", "🌷"],
  },
  {
    id: "faces",
    name: "Rostos",
    icon: "😊",
    emojis: ["😊", "😍", "🥰", "😘", "🤩", "😎", "🥳", "😁", "💕", "❤️", "💖", "💗", "💝", "💞", "💓", "🔥", "✌️", "👏", "🙌", "💪"],
  },
  {
    id: "hands",
    name: "Gestos",
    icon: "👋",
    emojis: ["👋", "🤚", "✋", "🖐️", "👌", "🤌", "✨", "👍", "👎", "👊", "✊", "🤛", "🤜", "🤝", "🙏", "💅", "🤳", "💆", "🙋", "🙋‍♀️"],
  },
  {
    id: "symbols",
    name: "Simbolos",
    icon: "❤️",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "✨", "⭐"],
  },
  {
    id: "arrows",
    name: "Setas",
    icon: "➡️",
    emojis: ["➡️", "⬅️", "⬆️", "⬇️", "↗️", "↘️", "↙️", "↖️", "↕️", "↔️", "🔄", "🔃", "🔙", "🔚", "🔛", "🔜", "🔝", "▶️", "⏩", "⏭️"],
  },
  {
    id: "objects",
    name: "Objetos",
    icon: "📱",
    emojis: ["📱", "💻", "🖥️", "📷", "📸", "🎬", "🎥", "📞", "☎️", "🕐", "⏰", "📅", "🗓️", "📌", "📍", "🔖", "🏷️", "💰", "💳", "🛒"],
  },
  {
    id: "nature",
    name: "Natureza",
    icon: "🌿",
    emojis: ["🌿", "🍃", "🌱", "🌲", "🌳", "🌴", "🌵", "🌾", "🌸", "🌺", "🌻", "🌼", "🌷", "🌹", "💐", "☀️", "🌤️", "⛅", "🌈", "🦋"],
  },
  {
    id: "food",
    name: "Comida",
    icon: "☕",
    emojis: ["☕", "🍵", "🧃", "🥤", "🍷", "🍸", "🍹", "🍾", "🧁", "🍰", "🎂", "🍩", "🍪", "🍫", "🍬", "🍭", "🍿", "🧈", "🥐", "🥯"],
  },
];

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("beauty");
  const [searchQuery, setSearchQuery] = useState("");

  const currentCategory = useMemo(
    () => EMOJI_CATEGORIES.find((c) => c.id === selectedCategory),
    [selectedCategory]
  );

  const filteredEmojis = useMemo(() => {
    if (!searchQuery) {
      return currentCategory?.emojis || [];
    }
    // Search across all categories
    const allEmojis = EMOJI_CATEGORIES.flatMap((c) => c.emojis);
    return [...new Set(allEmojis)];
  }, [currentCategory, searchQuery]);

  const handleEmojiClick = useCallback(
    (emoji: string) => {
      onSelect(emoji);
    },
    [onSelect]
  );

  return (
    <div className="w-72 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 px-3 py-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Emojis</span>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="border-b border-gray-100 dark:border-gray-700 px-3 py-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar emoji..."
          className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
        />
      </div>

      {/* Categories */}
      <div className="flex gap-1 border-b border-gray-100 dark:border-gray-700 px-2 py-2">
        {EMOJI_CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            title={category.name}
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-lg transition-colors ${
              selectedCategory === category.id
                ? "bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400"
                : "hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            {category.icon}
          </button>
        ))}
      </div>

      {/* Emoji Grid */}
      <div className="max-h-48 overflow-y-auto p-2">
        <div className="grid grid-cols-8 gap-1">
          {filteredEmojis.map((emoji, index) => (
            <button
              key={`${emoji}-${index}`}
              onClick={() => handleEmojiClick(emoji)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-xl transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {emoji}
            </button>
          ))}
        </div>
        {filteredEmojis.length === 0 && (
          <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Nenhum emoji encontrado
          </div>
        )}
      </div>

      {/* Frequently Used */}
      <div className="border-t border-gray-100 dark:border-gray-700 px-3 py-2">
        <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">Mais usados</p>
        <div className="flex gap-1">
          {["✨", "💖", "🔥", "💅", "💇‍♀️", "😍", "❤️", "💫"].map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleEmojiClick(emoji)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
