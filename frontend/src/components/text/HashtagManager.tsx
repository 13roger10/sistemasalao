"use client";

import { useState, useCallback, useMemo } from "react";
import type { HashtagSuggestion, PlatformLimits } from "@/types";
import { PLATFORM_LIMITS } from "@/types";

interface HashtagManagerProps {
  hashtags: string[];
  onChange: (hashtags: string[]) => void;
  platform: "instagram" | "facebook" | "both";
  maxHashtags?: number;
}

// Hashtags sugeridas por categoria
const SUGGESTED_HASHTAGS: Record<string, HashtagSuggestion[]> = {
  beauty: [
    { tag: "beleza", popularity: "high" },
    { tag: "beauty", popularity: "high" },
    { tag: "beautycare", popularity: "medium" },
    { tag: "skincare", popularity: "high" },
    { tag: "selfcare", popularity: "high" },
    { tag: "beautytips", popularity: "medium" },
    { tag: "beautyblogger", popularity: "medium" },
    { tag: "beautyinfluencer", popularity: "medium" },
  ],
  hair: [
    { tag: "cabelo", popularity: "high" },
    { tag: "hair", popularity: "high" },
    { tag: "hairstyle", popularity: "high" },
    { tag: "haircut", popularity: "medium" },
    { tag: "haircolor", popularity: "high" },
    { tag: "cabeleireiro", popularity: "medium" },
    { tag: "salaodebeleza", popularity: "medium" },
    { tag: "cabelobonito", popularity: "low" },
  ],
  nails: [
    { tag: "unhas", popularity: "high" },
    { tag: "nails", popularity: "high" },
    { tag: "nailart", popularity: "high" },
    { tag: "manicure", popularity: "high" },
    { tag: "naildesign", popularity: "medium" },
    { tag: "unhasdecoradas", popularity: "medium" },
    { tag: "nailsofinstagram", popularity: "medium" },
    { tag: "pedicure", popularity: "medium" },
  ],
  makeup: [
    { tag: "maquiagem", popularity: "high" },
    { tag: "makeup", popularity: "high" },
    { tag: "makeupartist", popularity: "high" },
    { tag: "makeuplover", popularity: "medium" },
    { tag: "makeuptutorial", popularity: "medium" },
    { tag: "makeupoftheday", popularity: "low" },
    { tag: "maquiadora", popularity: "medium" },
    { tag: "produtosdebeleza", popularity: "low" },
  ],
  wellness: [
    { tag: "bemestar", popularity: "high" },
    { tag: "wellness", popularity: "high" },
    { tag: "saude", popularity: "high" },
    { tag: "relaxamento", popularity: "medium" },
    { tag: "spa", popularity: "high" },
    { tag: "massagem", popularity: "medium" },
    { tag: "qualidadedevida", popularity: "medium" },
    { tag: "autocuidado", popularity: "high" },
  ],
  general: [
    { tag: "love", popularity: "high" },
    { tag: "instagood", popularity: "high" },
    { tag: "photooftheday", popularity: "high" },
    { tag: "beautiful", popularity: "high" },
    { tag: "happy", popularity: "high" },
    { tag: "followme", popularity: "medium" },
    { tag: "style", popularity: "high" },
    { tag: "instalike", popularity: "medium" },
  ],
};

export function HashtagManager({
  hashtags,
  onChange,
  platform,
  maxHashtags,
}: HashtagManagerProps) {
  const [inputValue, setInputValue] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("beauty");

  const limits: PlatformLimits =
    platform === "both"
      ? PLATFORM_LIMITS.instagram // Use Instagram limits as they're more restrictive
      : PLATFORM_LIMITS[platform];

  const effectiveMaxHashtags = maxHashtags || limits.maxHashtags;

  const isAtLimit = hashtags.length >= effectiveMaxHashtags;
  const isOverRecommended = hashtags.length > limits.recommendedHashtags;

  // Add hashtag
  const addHashtag = useCallback(
    (tag: string) => {
      const cleanTag = tag.replace(/^#/, "").trim().toLowerCase();
      if (!cleanTag) return;
      if (hashtags.includes(cleanTag)) return;
      if (hashtags.length >= effectiveMaxHashtags) return;

      onChange([...hashtags, cleanTag]);
    },
    [hashtags, onChange, effectiveMaxHashtags]
  );

  // Remove hashtag
  const removeHashtag = useCallback(
    (tag: string) => {
      onChange(hashtags.filter((h) => h !== tag));
    },
    [hashtags, onChange]
  );

  // Handle input
  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addHashtag(inputValue);
        setInputValue("");
      } else if (e.key === "Backspace" && !inputValue && hashtags.length > 0) {
        removeHashtag(hashtags[hashtags.length - 1]);
      }
    },
    [inputValue, hashtags, addHashtag, removeHashtag]
  );

  // Handle paste (multiple hashtags separated by spaces or commas)
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pastedText = e.clipboardData.getData("text");
      const tags = pastedText.split(/[\s,#]+/).filter(Boolean);
      const newHashtags = [...hashtags];

      tags.forEach((tag) => {
        const cleanTag = tag.toLowerCase().trim();
        if (cleanTag && !newHashtags.includes(cleanTag) && newHashtags.length < effectiveMaxHashtags) {
          newHashtags.push(cleanTag);
        }
      });

      onChange(newHashtags);
      setInputValue("");
    },
    [hashtags, onChange, effectiveMaxHashtags]
  );

  // Get popularity color
  const getPopularityColor = (popularity: "low" | "medium" | "high") => {
    switch (popularity) {
      case "high":
        return "text-green-600";
      case "medium":
        return "text-yellow-600";
      case "low":
        return "text-gray-500";
    }
  };

  // Get popularity icon - reserved for future use
  const _getPopularityIcon = (popularity: "low" | "medium" | "high") => {
    const bars = popularity === "high" ? 3 : popularity === "medium" ? 2 : 1;
    return (
      <div className="flex items-end gap-0.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-1 rounded-sm ${
              i <= bars ? getPopularityColor(popularity) : "bg-gray-200"
            }`}
            style={{ height: `${i * 4}px`, backgroundColor: i <= bars ? undefined : undefined }}
          />
        ))}
      </div>
    );
  };

  const suggestions = useMemo(
    () => SUGGESTED_HASHTAGS[selectedCategory] || SUGGESTED_HASHTAGS.general,
    [selectedCategory]
  );

  const filteredSuggestions = useMemo(
    () => suggestions.filter((s) => !hashtags.includes(s.tag)),
    [suggestions, hashtags]
  );

  return (
    <div className="space-y-4">
      {/* Hashtag Input */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
        {/* Tags Display */}
        <div className="flex flex-wrap gap-2 mb-3">
          {hashtags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-violet-100 dark:bg-violet-900/50 px-3 py-1 text-sm font-medium text-violet-700 dark:text-violet-400"
            >
              #{tag}
              <button
                onClick={() => removeHashtag(tag)}
                className="ml-1 rounded-full p-0.5 hover:bg-violet-200 dark:hover:bg-violet-800"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
          {!isAtLimit && (
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleInputKeyDown}
              onPaste={handlePaste}
              placeholder={hashtags.length === 0 ? "Digite hashtags..." : "Adicionar..."}
              className="flex-1 min-w-[100px] border-none bg-transparent text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none"
            />
          )}
        </div>

        {/* Counter & Warning */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className={isAtLimit ? "text-red-500 dark:text-red-400" : isOverRecommended ? "text-yellow-600 dark:text-yellow-400" : "text-gray-500 dark:text-gray-400"}>
              {hashtags.length}/{effectiveMaxHashtags} hashtags
            </span>
            {isOverRecommended && !isAtLimit && (
              <span className="text-yellow-600 dark:text-yellow-400">
                (recomendado: {limits.recommendedHashtags})
              </span>
            )}
          </div>
          {hashtags.length > 0 && (
            <button
              onClick={() => onChange([])}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              Limpar todas
            </button>
          )}
        </div>
      </div>

      {/* Category Selector */}
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Sugestoes por categoria</p>
        <div className="flex flex-wrap gap-2">
          {Object.keys(SUGGESTED_HASHTAGS).map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedCategory === category
                  ? "bg-violet-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Suggestions */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3">
        <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
          Clique para adicionar
        </p>
        <div className="flex flex-wrap gap-2">
          {filteredSuggestions.map((suggestion) => (
            <button
              key={suggestion.tag}
              onClick={() => addHashtag(suggestion.tag)}
              disabled={isAtLimit}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors ${
                isAtLimit
                  ? "cursor-not-allowed border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
                  : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-violet-300 dark:hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/30"
              }`}
            >
              <span>#{suggestion.tag}</span>
              <span className={`text-xs ${getPopularityColor(suggestion.popularity)}`}>
                {suggestion.popularity === "high" ? "🔥" : suggestion.popularity === "medium" ? "📈" : ""}
              </span>
            </button>
          ))}
          {filteredSuggestions.length === 0 && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Todas as sugestoes ja foram adicionadas
            </span>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3">
        <div className="flex items-start gap-2">
          <svg className="h-4 w-4 text-blue-500 dark:text-blue-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-xs text-blue-700 dark:text-blue-400">
            <p className="font-medium">Dicas para hashtags:</p>
            <ul className="mt-1 list-disc list-inside space-y-0.5">
              <li>Use 3-5 hashtags relevantes para melhor alcance</li>
              <li>Misture hashtags populares com nicho especifico</li>
              <li>Evite hashtags muito genericas como #love</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
