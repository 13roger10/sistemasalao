"use client";

import React, { useState, useCallback } from "react";
import type {
  CaptionGenerationOptions,
  CaptionGenerationResult,
  GeneratedCaption,
  CaptionLength,
} from "@/types";
import { getAllCategories, getAllTones } from "@/services/caption-ai";

interface CaptionGeneratorPanelProps {
  onGenerate: (options: CaptionGenerationOptions) => Promise<void>;
  result: CaptionGenerationResult | null;
  isGenerating: boolean;
  progress: number;
  onSelectCaption: (caption: GeneratedCaption) => void;
  selectedCaptionId: string | null;
  onRegenerate: () => void;
}

const categories = getAllCategories();
const tones = getAllTones();

const lengths: { id: CaptionLength; label: string }[] = [
  { id: "short", label: "Curta" },
  { id: "medium", label: "Média" },
  { id: "long", label: "Longa" },
];

const platforms: { id: "instagram" | "facebook" | "both"; label: string }[] = [
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "both", label: "Ambos" },
];

export function CaptionGeneratorPanel({
  onGenerate,
  result,
  isGenerating,
  progress,
  onSelectCaption,
  selectedCaptionId,
  onRegenerate,
}: CaptionGeneratorPanelProps) {
  const [options, setOptions] = useState<CaptionGenerationOptions>({
    tone: "casual",
    length: "medium",
    category: "beauty",
    platform: "instagram",
    includeEmoji: true,
    includeCallToAction: true,
    keywords: [],
    businessName: "",
    language: "pt-BR",
  });

  const [keywordsInput, setKeywordsInput] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleGenerate = useCallback(() => {
    const keywords = keywordsInput
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    onGenerate({ ...options, keywords });
  }, [options, keywordsInput, onGenerate]);

  const updateOption = <K extends keyof CaptionGenerationOptions>(
    key: K,
    value: CaptionGenerationOptions[K]
  ) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  const copyToClipboard = (text: string, hashtags: string[]) => {
    const fullText = `${text}\n\n${hashtags.join(" ")}`;
    navigator.clipboard.writeText(fullText);
  };

  return (
    <div className="space-y-6">
      {/* Options Panel */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
          <svg
            className="h-5 w-5 text-violet-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          Configurar Legenda
        </h3>

        {/* Category */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Categoria do conteúdo
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => updateOption("category", cat.id)}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  options.category === cat.id
                    ? "bg-violet-500 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tone */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Tom da mensagem
          </label>
          <div className="flex flex-wrap gap-2">
            {tones.map((tone) => (
              <button
                key={tone.id}
                onClick={() => updateOption("tone", tone.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  options.tone === tone.id
                    ? "bg-violet-500 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {tone.label}
              </button>
            ))}
          </div>
        </div>

        {/* Length & Platform */}
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Tamanho
            </label>
            <div className="flex gap-2">
              {lengths.map((len) => (
                <button
                  key={len.id}
                  onClick={() => updateOption("length", len.id)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    options.length === len.id
                      ? "bg-violet-500 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {len.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Plataforma
            </label>
            <div className="flex gap-2">
              {platforms.map((plat) => (
                <button
                  key={plat.id}
                  onClick={() => updateOption("platform", plat.id)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    options.platform === plat.id
                      ? "bg-violet-500 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {plat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Toggles */}
        <div className="mb-4 flex gap-4">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={options.includeEmoji}
              onChange={(e) => updateOption("includeEmoji", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-violet-500 focus:ring-violet-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Incluir emojis</span>
          </label>

          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={options.includeCallToAction}
              onChange={(e) =>
                updateOption("includeCallToAction", e.target.checked)
              }
              className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-violet-500 focus:ring-violet-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Chamada para ação</span>
          </label>
        </div>

        {/* Advanced Options Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="mb-4 flex items-center gap-1 text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300"
        >
          <svg
            className={`h-4 w-4 transition-transform ${
              showAdvanced ? "rotate-90" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          Opções avançadas
        </button>

        {showAdvanced && (
          <div className="mb-4 space-y-4 rounded-lg bg-gray-50 dark:bg-gray-700 p-4">
            {/* Keywords */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Palavras-chave (separadas por vírgula)
              </label>
              <input
                type="text"
                value={keywordsInput}
                onChange={(e) => setKeywordsInput(e.target.value)}
                placeholder="ex: loiro, balayage, verão"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>

            {/* Business Name */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nome do negócio (opcional)
              </label>
              <input
                type="text"
                value={options.businessName || ""}
                onChange={(e) => updateOption("businessName", e.target.value)}
                placeholder="ex: Studio Beleza"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:from-violet-600 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <svg
                className="h-5 w-5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Gerando... {progress}%
            </>
          ) : (
            <>
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              Gerar Legenda com IA
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Main Caption */}
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold text-gray-900">
                <svg
                  className="h-5 w-5 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Legenda Principal
              </h3>
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${
                  result.mainCaption.estimatedEngagement === "high"
                    ? "bg-green-100 text-green-700"
                    : result.mainCaption.estimatedEngagement === "medium"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                Engajamento:{" "}
                {result.mainCaption.estimatedEngagement === "high"
                  ? "Alto"
                  : result.mainCaption.estimatedEngagement === "medium"
                  ? "Médio"
                  : "Baixo"}
              </span>
            </div>

            <CaptionCard
              caption={result.mainCaption}
              isSelected={selectedCaptionId === result.mainCaption.id}
              onSelect={() => onSelectCaption(result.mainCaption)}
              onCopy={() =>
                copyToClipboard(
                  result.mainCaption.text,
                  result.mainCaption.hashtags
                )
              }
            />
          </div>

          {/* Alternative Captions */}
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-semibold text-gray-900">
              Alternativas ({result.alternatives.length})
            </h3>
            <div className="space-y-3">
              {result.alternatives.map((caption) => (
                <CaptionCard
                  key={caption.id}
                  caption={caption}
                  isSelected={selectedCaptionId === caption.id}
                  onSelect={() => onSelectCaption(caption)}
                  onCopy={() => copyToClipboard(caption.text, caption.hashtags)}
                  compact
                />
              ))}
            </div>
          </div>

          {/* Suggested Hashtags */}
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="mb-3 font-semibold text-gray-900">
              Hashtags Sugeridas
            </h3>
            <div className="flex flex-wrap gap-2">
              {result.suggestedHashtags.map((tag, i) => (
                <button
                  key={i}
                  onClick={() => navigator.clipboard.writeText(tag)}
                  className="rounded-full bg-violet-100 px-3 py-1 text-sm text-violet-700 transition-colors hover:bg-violet-200"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Tips */}
          {result.tips.length > 0 && (
            <div className="rounded-xl border border-violet-100 bg-violet-50 p-4">
              <h4 className="mb-2 flex items-center gap-2 font-medium text-violet-800">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                Dicas de Engajamento
              </h4>
              <ul className="space-y-1">
                {result.tips.map((tip, i) => (
                  <li key={i} className="text-sm text-violet-700">
                    • {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Regenerate Button */}
          <button
            onClick={onRegenerate}
            disabled={isGenerating}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-violet-200 bg-white px-6 py-3 font-medium text-violet-600 transition-colors hover:bg-violet-50 disabled:opacity-50"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Gerar Novas Opções
          </button>
        </>
      )}
    </div>
  );
}

// Caption Card Component
interface CaptionCardProps {
  caption: GeneratedCaption;
  isSelected: boolean;
  onSelect: () => void;
  onCopy: () => void;
  compact?: boolean;
}

function CaptionCard({
  caption,
  isSelected,
  onSelect,
  onCopy,
  compact,
}: CaptionCardProps) {
  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
        isSelected
          ? "border-violet-500 bg-violet-50"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <p
        className={`whitespace-pre-wrap text-gray-800 ${
          compact ? "text-sm" : ""
        }`}
      >
        {caption.text}
      </p>

      {!compact && (
        <div className="mt-3 flex flex-wrap gap-1">
          {caption.hashtags.slice(0, 5).map((tag, i) => (
            <span
              key={i}
              className="text-xs text-violet-600"
            >
              {tag}
            </span>
          ))}
          {caption.hashtags.length > 5 && (
            <span className="text-xs text-gray-500">
              +{caption.hashtags.length - 5}
            </span>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {caption.characterCount} caracteres
        </span>
        <div className="flex gap-2">
          {isSelected && (
            <span className="flex items-center gap-1 text-xs font-medium text-violet-600">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Selecionada
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCopy();
            }}
            className="flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200"
          >
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
              />
            </svg>
            Copiar
          </button>
        </div>
      </div>
    </div>
  );
}

export default CaptionGeneratorPanel;
