"use client";

import { useState } from "react";
import { InstagramPreview } from "./InstagramPreview";
import { FacebookPreview } from "./FacebookPreview";

type Platform = "instagram" | "facebook" | "both";
type ComparisonMode = "side-by-side" | "single";

interface PreviewComparisonProps {
  imageUrl: string;
  caption: string;
  hashtags: string[];
  username?: string;
  avatarUrl?: string;
  platform?: Platform;
  onPlatformChange?: (platform: Platform) => void;
}

export function PreviewComparison({
  imageUrl,
  caption,
  hashtags,
  username = "seu_perfil",
  avatarUrl,
  platform = "both",
  onPlatformChange,
}: PreviewComparisonProps) {
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>(
    platform === "both" ? "side-by-side" : "single"
  );
  const [activePlatform, setActivePlatform] = useState<"instagram" | "facebook">(
    platform === "facebook" ? "facebook" : "instagram"
  );

  // Don't render if no valid image
  if (!imageUrl) {
    return null;
  }

  const handlePlatformChange = (newPlatform: Platform) => {
    if (newPlatform === "both") {
      setComparisonMode("side-by-side");
    } else {
      setComparisonMode("single");
      setActivePlatform(newPlatform);
    }
    onPlatformChange?.(newPlatform);
  };

  return (
    <div className="space-y-6">
      {/* Platform Selector */}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2 rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => handlePlatformChange("instagram")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              (comparisonMode === "single" && activePlatform === "instagram")
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            Instagram
          </button>
          <button
            onClick={() => handlePlatformChange("facebook")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              (comparisonMode === "single" && activePlatform === "facebook")
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Facebook
          </button>
          <button
            onClick={() => handlePlatformChange("both")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              comparisonMode === "side-by-side"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            Comparar
          </button>
        </div>

        {/* Info Badge */}
        <div className="flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1.5 text-sm text-violet-700">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {comparisonMode === "side-by-side"
            ? "Comparando previews lado a lado"
            : `Visualizando ${activePlatform === "instagram" ? "Instagram" : "Facebook"}`
          }
        </div>
      </div>

      {/* Preview Area */}
      {comparisonMode === "side-by-side" ? (
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Instagram Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600">
                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Instagram</h3>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4">
              <InstagramPreview
                imageUrl={imageUrl}
                caption={caption}
                hashtags={hashtags}
                username={username}
                avatarUrl={avatarUrl}
              />
            </div>
          </div>

          {/* Facebook Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1877f2]">
                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Facebook</h3>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4">
              <FacebookPreview
                imageUrl={imageUrl}
                caption={caption}
                hashtags={hashtags}
                username={username}
                avatarUrl={avatarUrl}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl bg-gray-50 p-6">
            {activePlatform === "instagram" ? (
              <InstagramPreview
                imageUrl={imageUrl}
                caption={caption}
                hashtags={hashtags}
                username={username}
                avatarUrl={avatarUrl}
              />
            ) : (
              <FacebookPreview
                imageUrl={imageUrl}
                caption={caption}
                hashtags={hashtags}
                username={username}
                avatarUrl={avatarUrl}
              />
            )}
          </div>
        </div>
      )}

      {/* Comparison Tips */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <svg className="h-5 w-5 flex-shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <div>
            <h4 className="font-semibold text-blue-900">Dicas de Otimizacao</h4>
            <ul className="mt-2 space-y-1 text-sm text-blue-700">
              <li>• <strong>Instagram:</strong> Use ate 30 hashtags, legendas de ate 2.200 caracteres</li>
              <li>• <strong>Facebook:</strong> Hashtags menos relevantes, foco em texto envolvente</li>
              <li>• <strong>Stories:</strong> Texto curto e impactante, use CTAs claros</li>
              <li>• <strong>Ambos:</strong> Imagens quadradas (1:1) funcionam bem em ambas plataformas</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
