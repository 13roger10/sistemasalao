"use client";

import React, { useState } from "react";
import type { AIBackgroundOptions, AIProcessingState } from "@/types";

interface AIBackgroundPanelProps {
  onProcess: (options: AIBackgroundOptions) => Promise<unknown>;
  processing: AIProcessingState;
  onCancel: () => void;
}

const backgroundColors = [
  { name: "Branco", value: "#FFFFFF" },
  { name: "Preto", value: "#000000" },
  { name: "Rosa", value: "#FFC0CB" },
  { name: "Azul", value: "#87CEEB" },
  { name: "Verde", value: "#90EE90" },
  { name: "Roxo", value: "#DDA0DD" },
  { name: "Dourado", value: "#FFD700" },
  { name: "Coral", value: "#FF7F50" },
];

export function AIBackgroundPanel({
  onProcess,
  processing,
  onCancel,
}: AIBackgroundPanelProps) {
  const [mode, setMode] = useState<"remove" | "blur" | "replace">("remove");
  const [blurStrength, setBlurStrength] = useState(10);
  const [selectedColor, setSelectedColor] = useState("#FFFFFF");

  const isProcessing = processing.status === "processing";

  const handleProcess = async () => {
    await onProcess({
      mode,
      blurStrength: mode === "blur" ? blurStrength : undefined,
      replacementColor: mode === "replace" ? selectedColor : undefined,
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 w-80">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span className="text-2xl">🖼️</span>
          Fundo com IA
        </h3>
      </div>

      {/* Mode Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Modo
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setMode("remove")}
            disabled={isProcessing}
            className={`flex flex-col items-center p-3 rounded-lg transition-all ${
              mode === "remove"
                ? "bg-purple-100 border-2 border-purple-500"
                : "bg-gray-50 border-2 border-transparent hover:bg-gray-100"
            } ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <span className="text-2xl mb-1">✂️</span>
            <span className="text-xs font-medium">Remover</span>
          </button>

          <button
            onClick={() => setMode("blur")}
            disabled={isProcessing}
            className={`flex flex-col items-center p-3 rounded-lg transition-all ${
              mode === "blur"
                ? "bg-purple-100 border-2 border-purple-500"
                : "bg-gray-50 border-2 border-transparent hover:bg-gray-100"
            } ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <span className="text-2xl mb-1">🔵</span>
            <span className="text-xs font-medium">Desfocar</span>
          </button>

          <button
            onClick={() => setMode("replace")}
            disabled={isProcessing}
            className={`flex flex-col items-center p-3 rounded-lg transition-all ${
              mode === "replace"
                ? "bg-purple-100 border-2 border-purple-500"
                : "bg-gray-50 border-2 border-transparent hover:bg-gray-100"
            } ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <span className="text-2xl mb-1">🎨</span>
            <span className="text-xs font-medium">Substituir</span>
          </button>
        </div>
      </div>

      {/* Blur Strength (when blur mode is selected) */}
      {mode === "blur" && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Intensidade do desfoque
            </label>
            <span className="text-sm font-bold text-purple-600">
              {blurStrength}px
            </span>
          </div>
          <input
            type="range"
            min="5"
            max="30"
            value={blurStrength}
            onChange={(e) => setBlurStrength(Number(e.target.value))}
            disabled={isProcessing}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Sutil</span>
            <span>Intenso</span>
          </div>
        </div>
      )}

      {/* Color Selection (when replace mode is selected) */}
      {mode === "replace" && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cor de fundo
          </label>
          <div className="grid grid-cols-4 gap-2">
            {backgroundColors.map((color) => (
              <button
                key={color.value}
                onClick={() => setSelectedColor(color.value)}
                disabled={isProcessing}
                className={`relative w-full aspect-square rounded-lg transition-all ${
                  selectedColor === color.value
                    ? "ring-2 ring-purple-500 ring-offset-2"
                    : "hover:scale-105"
                } ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
                style={{ backgroundColor: color.value }}
                title={color.name}
              >
                {selectedColor === color.value && (
                  <span className="absolute inset-0 flex items-center justify-center text-lg">
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Custom Color */}
          <div className="mt-3 flex items-center gap-2">
            <input
              type="color"
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              disabled={isProcessing}
              className="w-10 h-10 rounded cursor-pointer border-0"
            />
            <span className="text-sm text-gray-600">Cor personalizada</span>
          </div>
        </div>
      )}

      {/* Mode Description */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-xs text-blue-800">
          {mode === "remove" && (
            <>
              <strong>Remover fundo:</strong> Remove o fundo da imagem, deixando
              apenas o objeto principal com transparência.
            </>
          )}
          {mode === "blur" && (
            <>
              <strong>Desfocar fundo:</strong> Aplica desfoque no fundo mantendo
              o objeto principal em foco. Ideal para efeito bokeh.
            </>
          )}
          {mode === "replace" && (
            <>
              <strong>Substituir fundo:</strong> Troca o fundo original por uma
              cor sólida de sua escolha.
            </>
          )}
        </p>
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
            onClick={handleProcess}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all shadow-md"
          >
            {mode === "remove"
              ? "Remover Fundo"
              : mode === "blur"
              ? "Aplicar Desfoque"
              : "Substituir Fundo"}
          </button>
        )}
      </div>
    </div>
  );
}

export default AIBackgroundPanel;
