"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AdminLayout } from "@/components/layout";
import { Button } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { CaptionGeneratorPanel } from "@/components/caption";
import { generateCaption } from "@/services/caption-ai";
import { imageStorage } from "@/services/imageStorage";
import type {
  CaptionGenerationOptions,
  CaptionGenerationResult,
  GeneratedCaption,
} from "@/types";

export default function CaptionPage() {
  const router = useRouter();
  const { warning, success, error: showError } = useToast();

  // Estados
  const [imageData, setImageData] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<CaptionGenerationResult | null>(null);
  const [selectedCaption, setSelectedCaption] = useState<GeneratedCaption | null>(null);
  const [lastOptions, setLastOptions] = useState<CaptionGenerationOptions | null>(null);

  // Carregar imagem do IndexedDB
  useEffect(() => {
    const loadImage = async () => {
      try {
        const storedImage = await imageStorage.getItem("editedImage");
        if (storedImage) {
          setImageData(storedImage);
        } else {
          warning("Nenhuma imagem", "Edite uma imagem primeiro");
          router.push("/admin/capture");
        }
      } catch (error) {
        console.error("Failed to load edited image:", error);
        warning("Erro ao carregar", "Não foi possível carregar a imagem");
        router.push("/admin/capture");
      }
    };
    loadImage();
  }, [router, warning]);

  // Gerar legenda
  const handleGenerate = useCallback(
    async (options: CaptionGenerationOptions) => {
      if (!imageData) return;

      setIsGenerating(true);
      setProgress(0);
      setLastOptions(options);

      try {
        const captionResult = await generateCaption(
          imageData,
          options,
          (p) => setProgress(p)
        );

        setResult(captionResult);
        setSelectedCaption(captionResult.mainCaption);
        success("Legenda gerada!", "Selecione a melhor opção para seu post");
      } catch (err) {
        showError(
          "Erro ao gerar",
          err instanceof Error ? err.message : "Tente novamente"
        );
      } finally {
        setIsGenerating(false);
      }
    },
    [imageData, success, showError]
  );

  // Regenerar
  const handleRegenerate = useCallback(() => {
    if (lastOptions) {
      handleGenerate(lastOptions);
    }
  }, [lastOptions, handleGenerate]);

  // Selecionar legenda
  const handleSelectCaption = useCallback((caption: GeneratedCaption) => {
    setSelectedCaption(caption);
  }, []);

  // Voltar para editor
  const handleBack = useCallback(() => {
    router.push("/admin/editor");
  }, [router]);

  // Continuar para criar post
  const handleContinue = useCallback(() => {
    if (selectedCaption) {
      // Salvar legenda selecionada na sessão
      sessionStorage.setItem(
        "generatedCaption",
        JSON.stringify({
          text: selectedCaption.text,
          hashtags: selectedCaption.hashtags,
        })
      );
    }
    router.push("/admin/post/create");
  }, [selectedCaption, router]);

  // Pular geração de legenda
  const handleSkip = useCallback(() => {
    router.push("/admin/post/create");
  }, [router]);

  if (!imageData) {
    return (
      <AdminLayout title="Gerar Legenda">
        <div className="flex h-64 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Gerar Legenda com IA">
      <div className="mx-auto max-w-6xl">
        {/* Header Actions */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 transition-colors hover:text-gray-900 dark:hover:text-white"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Voltar ao Editor
          </button>

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleSkip}>
              Pular
            </Button>
            <Button onClick={handleContinue} disabled={!selectedCaption && !result}>
              {selectedCaption ? "Usar Legenda Selecionada" : "Continuar sem Legenda"}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Preview da Imagem */}
          <div className="lg:col-span-2">
            <div className="sticky top-6">
              <div className="overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-sm">
                <div className="relative aspect-square w-full">
                  <Image
                    src={imageData}
                    alt="Imagem do post"
                    fill
                    className="object-cover"
                  />
                </div>

                {/* Selected Caption Preview */}
                {selectedCaption && (
                  <div className="border-t border-gray-100 dark:border-gray-700 p-4">
                    <h4 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Legenda selecionada:
                    </h4>
                    <p className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 line-clamp-4">
                      {selectedCaption.text}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {selectedCaption.hashtags.slice(0, 3).map((tag, i) => (
                        <span key={i} className="text-xs text-violet-600 dark:text-violet-400">
                          {tag}
                        </span>
                      ))}
                      {selectedCaption.hashtags.length > 3 && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          +{selectedCaption.hashtags.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Info Card */}
              <div className="mt-4 rounded-xl border border-violet-100 dark:border-violet-900 bg-violet-50 dark:bg-violet-900/20 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-violet-100 dark:bg-violet-900/50 p-2">
                    <svg
                      className="h-5 w-5 text-violet-600 dark:text-violet-400"
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
                  </div>
                  <div>
                    <h4 className="font-medium text-violet-800 dark:text-violet-300">
                      IA para Legendas
                    </h4>
                    <p className="mt-1 text-sm text-violet-700 dark:text-violet-400">
                      Nossa IA gera legendas otimizadas para engajamento,
                      incluindo hashtags relevantes e chamadas para ação.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Caption Generator Panel */}
          <div className="lg:col-span-3">
            <CaptionGeneratorPanel
              onGenerate={handleGenerate}
              result={result}
              isGenerating={isGenerating}
              progress={progress}
              onSelectCaption={handleSelectCaption}
              selectedCaptionId={selectedCaption?.id || null}
              onRegenerate={handleRegenerate}
            />
          </div>
        </div>

        {/* Progress Indicator - quando gerando */}
        {isGenerating && (
          <div className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-lg">
            <div className="mx-auto max-w-2xl">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      Gerando legendas com IA...
                    </span>
                    <span className="text-violet-600 dark:text-violet-400">{progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
