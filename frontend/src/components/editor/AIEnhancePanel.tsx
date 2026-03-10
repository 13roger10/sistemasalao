"use client";

import React, { useState } from "react";
import type { AIEnhancementOptions, AIProcessingState } from "@/types";

interface AIEnhancePanelProps {
  onEnhance: (options: Partial<AIEnhancementOptions>) => Promise<unknown>;
  processing: AIProcessingState;
  onCancel: () => void;
}

export function AIEnhancePanel({
  onEnhance,
  processing,
  onCancel,
}: AIEnhancePanelProps) {
  const [quality, setQuality] = useState<"low" | "medium" | "high" | "ultra">(
    "high"
  );
  const [upscale, setUpscale] = useState(false);
  const [upscaleFactor, setUpscaleFactor] = useState<1 | 2 | 4>(2);
  const [denoise, setDenoise] = useState(true);
  const [sharpen, setSharpen] = useState(true);
  const [autoColor, setAutoColor] = useState(true);
  const [autoContrast, setAutoContrast] = useState(true);

  const isProcessing = processing.status === "processing";

  const handleEnhance = async () => {
    await onEnhance({
      quality,
      upscale,
      upscaleFactor,
      denoise,
      denoiseStrength: 0.5,
      sharpen,
      sharpenStrength: 0.3,
      autoColor,
      autoContrast,
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 w-80">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span className="text-2xl">✨</span>
          Aprimorar com IA
        </h3>
      </div>

      {/* Quality Preset */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Qualidade
        </label>
        <div className="grid grid-cols-4 gap-2">
          {(["low", "medium", "high", "ultra"] as const).map((q) => (
            <button
              key={q}
              onClick={() => setQuality(q)}
              disabled={isProcessing}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                quality === q
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              } ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {q === "low"
                ? "Baixa"
                : q === "medium"
                ? "Média"
                : q === "high"
                ? "Alta"
                : "Ultra"}
            </button>
          ))}
        </div>
      </div>

      {/* Upscale Option */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">
            Aumentar resolução
          </label>
          <button
            onClick={() => setUpscale(!upscale)}
            disabled={isProcessing}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              upscale ? "bg-purple-600" : "bg-gray-300"
            } ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                upscale ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>
        {upscale && (
          <div className="flex gap-2 mt-2">
            {([2, 4] as const).map((factor) => (
              <button
                key={factor}
                onClick={() => setUpscaleFactor(factor)}
                disabled={isProcessing}
                className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                  upscaleFactor === factor
                    ? "bg-purple-600 text-white"
                    : "bg-white text-gray-700 border border-gray-200"
                }`}
              >
                {factor}x
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Enhancement Options */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">Reduzir ruído</span>
          <button
            onClick={() => setDenoise(!denoise)}
            disabled={isProcessing}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              denoise ? "bg-purple-600" : "bg-gray-300"
            } ${isProcessing ? "opacity-50" : ""}`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                denoise ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">Nitidez</span>
          <button
            onClick={() => setSharpen(!sharpen)}
            disabled={isProcessing}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              sharpen ? "bg-purple-600" : "bg-gray-300"
            } ${isProcessing ? "opacity-50" : ""}`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                sharpen ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">Correção de cor</span>
          <button
            onClick={() => setAutoColor(!autoColor)}
            disabled={isProcessing}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              autoColor ? "bg-purple-600" : "bg-gray-300"
            } ${isProcessing ? "opacity-50" : ""}`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                autoColor ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">Auto contraste</span>
          <button
            onClick={() => setAutoContrast(!autoContrast)}
            disabled={isProcessing}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              autoContrast ? "bg-purple-600" : "bg-gray-300"
            } ${isProcessing ? "opacity-50" : ""}`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                autoContrast ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
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
            onClick={handleEnhance}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all shadow-md"
          >
            Aplicar Melhorias
          </button>
        )}
      </div>
    </div>
  );
}

export default AIEnhancePanel;
