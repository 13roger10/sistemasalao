"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CameraCapture, ImagePicker, ImagePreview } from "@/components/capture";
import { imageStorage } from "@/services/imageStorage";

type CaptureMode = "select" | "camera" | "preview";

export default function CapturePage() {
  const router = useRouter();
  const [mode, setMode] = useState<CaptureMode>("select");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const handleCapture = useCallback((imageData: string) => {
    setCapturedImage(imageData);
    setMode("preview");
  }, []);

  const handleRetake = useCallback(() => {
    setCapturedImage(null);
    setMode("camera");
  }, []);

  const handleCancel = useCallback(() => {
    if (mode === "preview") {
      setMode("select");
      setCapturedImage(null);
    } else {
      router.back();
    }
  }, [mode, router]);

  const handleConfirm = useCallback(async () => {
    if (capturedImage) {
      try {
        // Salvar imagem no IndexedDB para o editor
        await imageStorage.setItem("capturedImage", capturedImage);
        router.push("/admin/editor");
      } catch (error) {
        console.error("Failed to save captured image:", error);
      }
    }
  }, [capturedImage, router]);

  // Atualizar imagem quando transformacoes sao aplicadas no preview
  const handleImageChange = useCallback((newImageData: string) => {
    setCapturedImage(newImageData);
  }, []);

  const handleSelectFromGallery = useCallback((imageData: string) => {
    setCapturedImage(imageData);
    setMode("preview");
  }, []);

  // Modo Preview
  if (mode === "preview" && capturedImage) {
    return (
      <div className="h-screen">
        <ImagePreview
          imageData={capturedImage}
          onConfirm={handleConfirm}
          onRetake={handleRetake}
          onCancel={handleCancel}
          onImageChange={handleImageChange}
        />
      </div>
    );
  }

  // Modo Câmera
  if (mode === "camera") {
    return (
      <div className="h-screen">
        <CameraCapture
          onCapture={handleCapture}
          onCancel={() => setMode("select")}
        />
      </div>
    );
  }

  // Modo Seleção (padrão)
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-violet-50 to-purple-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-violet-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 px-4 py-3 backdrop-blur-sm">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 dark:text-gray-400 transition-colors hover:text-gray-900 dark:hover:text-white"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2 h-5 w-5"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Voltar
        </button>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Nova publicação</h1>
        <div className="w-16" /> {/* Spacer para centralizar título */}
      </header>

      {/* Conteúdo */}
      <main className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          {/* Ícone */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-violet-500 shadow-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-10 w-10 text-white"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Escolha uma imagem
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Capture uma foto ou escolha da galeria
            </p>
          </div>

          {/* Opções */}
          <div className="space-y-4">
            {/* Opção Câmera */}
            <button
              onClick={() => setMode("camera")}
              className="flex w-full items-center gap-4 rounded-2xl bg-white dark:bg-gray-800 p-4 shadow-md transition-all hover:shadow-lg active:scale-[0.98]"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/50">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-7 w-7 text-violet-600 dark:text-violet-400"
                >
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-gray-900 dark:text-white">Tirar foto</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Use a câmera do dispositivo
                </p>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-gray-400 dark:text-gray-500"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>

            {/* Opção Galeria */}
            <ImagePicker onSelect={handleSelectFromGallery}>
              <div className="flex w-full items-center gap-4 rounded-2xl bg-white dark:bg-gray-800 p-4 shadow-md transition-all hover:shadow-lg active:scale-[0.98]">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/50">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-7 w-7 text-purple-600 dark:text-purple-400"
                  >
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Escolher da galeria
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Selecione uma imagem existente
                  </p>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5 text-gray-400 dark:text-gray-500"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </div>
            </ImagePicker>
          </div>

          {/* Dica */}
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Formatos suportados: JPG, PNG, WebP (máx. 10MB)
          </p>
        </div>
      </main>
    </div>
  );
}
