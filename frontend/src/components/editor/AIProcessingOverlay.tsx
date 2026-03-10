"use client";

import React from "react";
import type { AIProcessingState } from "@/types";

interface AIProcessingOverlayProps {
  processing: AIProcessingState;
  onCancel?: () => void;
}

export function AIProcessingOverlay({
  processing,
  onCancel,
}: AIProcessingOverlayProps) {
  if (processing.status === "idle") return null;

  const isProcessing = processing.status === "processing";
  const isSuccess = processing.status === "success";
  const isError = processing.status === "error";

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          {isProcessing && (
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-purple-600 animate-spin"
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
                </div>
              </div>
            </div>
          )}

          {isSuccess && (
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-600"
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
            </div>
          )}

          {isError && (
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-center text-lg font-semibold text-gray-900 mb-2">
          {isProcessing && "Processando com IA"}
          {isSuccess && "Concluído!"}
          {isError && "Erro no processamento"}
        </h3>

        {/* Message */}
        <p className="text-center text-sm text-gray-600 mb-4">
          {processing.message || processing.error}
        </p>

        {/* Progress Bar (only when processing) */}
        {isProcessing && (
          <div className="mb-4">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                style={{ width: `${processing.progress}%` }}
              />
            </div>
            <p className="text-center text-xs text-gray-500 mt-2">
              {processing.progress}% concluído
            </p>
          </div>
        )}

        {/* AI Animation */}
        {isProcessing && (
          <div className="flex justify-center gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-purple-500"
                style={{
                  animation: `bounce 1s infinite ${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Cancel Button (only when processing) */}
        {isProcessing && onCancel && (
          <button
            onClick={onCancel}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
        )}
      </div>

      <style jsx>{`
        @keyframes bounce {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }
      `}</style>
    </div>
  );
}

export default AIProcessingOverlay;
