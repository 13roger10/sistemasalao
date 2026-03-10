"use client";

import React, { useState } from "react";
import type { AIGenerativeOptions, AIProcessingState } from "@/types";

interface AIStylePanelProps {
  onApplyStyle: (options: AIGenerativeOptions) => Promise<unknown>;
  processing: AIProcessingState;
  onCancel: () => void;
}

const styles = [
  {
    id: "realistic",
    name: "Realístico",
    icon: "📷",
    description: "Melhora realista mantendo a naturalidade",
  },
  {
    id: "artistic",
    name: "Artístico",
    icon: "🎨",
    description: "Cores vibrantes e saturação aumentada",
  },
  {
    id: "cartoon",
    name: "Cartoon",
    icon: "🎬",
    description: "Efeito de desenho animado",
  },
  {
    id: "sketch",
    name: "Sketch",
    icon: "✏️",
    description: "Efeito de desenho a lápis",
  },
] as const;

export function AIStylePanel({
  onApplyStyle,
  processing,
  onCancel,
}: AIStylePanelProps) {
  const [selectedStyle, setSelectedStyle] = useState<
    "realistic" | "artistic" | "cartoon" | "sketch"
  >("realistic");
  const [strength, setStrength] = useState(0.7);
  const [preserveOriginal, setPreserveOriginal] = useState(true);
  const [prompt, setPrompt] = useState("");

  const isProcessing = processing.status === "processing";

  const handleApply = async () => {
    await onApplyStyle({
      prompt: prompt || `Aplicar estilo ${selectedStyle}`,
      style: selectedStyle,
      strength,
      preserveOriginal,
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 w-80">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span className="text-2xl">🪄</span>
          Estilos com IA
        </h3>
      </div>

      {/* Style Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Escolha o estilo
        </label>
        <div className="grid grid-cols-2 gap-2">
          {styles.map((style) => (
            <button
              key={style.id}
              onClick={() => setSelectedStyle(style.id)}
              disabled={isProcessing}
              className={`flex flex-col items-center p-3 rounded-lg transition-all ${
                selectedStyle === style.id
                  ? "bg-gradient-to-br from-purple-100 to-pink-100 border-2 border-purple-500"
                  : "bg-gray-50 border-2 border-transparent hover:bg-gray-100"
              } ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <span className="text-3xl mb-1">{style.icon}</span>
              <span className="text-sm font-medium">{style.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Style Description */}
      <div className="mb-4 p-3 bg-purple-50 rounded-lg">
        <p className="text-xs text-purple-800">
          {styles.find((s) => s.id === selectedStyle)?.description}
        </p>
      </div>

      {/* Strength Slider */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">
            Intensidade
          </label>
          <span className="text-sm font-bold text-purple-600">
            {Math.round(strength * 100)}%
          </span>
        </div>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.1"
          value={strength}
          onChange={(e) => setStrength(Number(e.target.value))}
          disabled={isProcessing}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Sutil</span>
          <span>Intenso</span>
        </div>
      </div>

      {/* Preserve Original Toggle */}
      <div className="mb-4 flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div>
          <span className="text-sm font-medium text-gray-700">
            Preservar detalhes
          </span>
          <p className="text-xs text-gray-500">
            Mantém características originais
          </p>
        </div>
        <button
          onClick={() => setPreserveOriginal(!preserveOriginal)}
          disabled={isProcessing}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            preserveOriginal ? "bg-purple-600" : "bg-gray-300"
          } ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <span
            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
              preserveOriginal ? "translate-x-7" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Custom Prompt (Advanced) */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Prompt personalizado (opcional)
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isProcessing}
          placeholder="Ex: Adicionar luz dourada, estilo vintage..."
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          rows={2}
        />
      </div>

      {/* Processing Status */}
      {isProcessing && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600">{processing.message}</span>
            <span className="text-xs font-medium text-purple-600">
              {processing.progress}%
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
              style={{ width: `${processing.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {isProcessing ? (
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition-colors"
          >
            Cancelar
          </button>
        ) : (
          <button
            onClick={handleApply}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all shadow-md"
          >
            Aplicar Estilo
          </button>
        )}
      </div>
    </div>
  );
}

export default AIStylePanel;
