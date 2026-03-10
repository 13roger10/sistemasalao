"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AdminLayout } from "@/components/layout";
import { Button, Input } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { UploadProgress } from "@/components/upload";
import { useUpload } from "@/hooks/useUpload";
import { postService } from "@/services/post";
import { imageStorage } from "@/services/imageStorage";
import {
  RichCaptionEditor,
  HashtagManager,
  TextTemplates,
  PostPreview,
} from "@/components/text";
import type { UploadResult } from "@/services/upload";

type Platform = "instagram" | "facebook" | "both";
type ViewMode = "edit" | "preview";

export default function CreatePostPage() {
  const router = useRouter();
  const { warning, success, error: showError } = useToast();

  // Estados da imagem
  const [imageData, setImageData] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<UploadResult | null>(null);

  // Hook de upload
  const {
    phase: uploadStatus,
    progress: uploadProgress,
    error: uploadError,
    result: uploadResult,
    fileName,
    fileSize,
    estimatedTimeRemaining,
    upload,
    cancel,
    retry,
    isComplete: isUploadComplete,
    isIdle: isUploadIdle,
  } = useUpload({
    maxWidth: 1080,
    maxHeight: 1080,
    quality: 0.9,
    autoOptimize: true,
    onComplete: (result) => {
      setUploadedImage(result);
      success("Upload concluido!", "Imagem enviada com sucesso");
    },
    onError: (err) => {
      showError("Erro no upload", err.message || "Nao foi possivel enviar a imagem");
    },
  });

  // Estados do formulario
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [platform, setPlatform] = useState<Platform>("both");
  const [isSaving, setIsSaving] = useState(false);

  // Estados da UI
  const [viewMode, setViewMode] = useState<ViewMode>("edit");
  const [showTemplates, setShowTemplates] = useState(false);
  const [activeSection, setActiveSection] = useState<"caption" | "hashtags">("caption");

  // Carregar imagem do IndexedDB
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedImage = await imageStorage.getItem("editedImage");
        if (storedImage) {
          setImageData(storedImage);
        } else {
          warning("Nenhuma imagem", "Selecione e edite uma imagem primeiro");
          router.push("/admin/capture");
        }

        // Carregar legenda gerada pela IA (se existir)
        const storedCaption = sessionStorage.getItem("generatedCaption");
        if (storedCaption) {
          try {
            const captionData = JSON.parse(storedCaption);
            if (captionData.text) {
              setCaption(captionData.text);
            }
            if (captionData.hashtags && Array.isArray(captionData.hashtags)) {
              setHashtags(captionData.hashtags);
            }
            // Limpar apos carregar
            sessionStorage.removeItem("generatedCaption");
          } catch {
            // Ignora erro de parse
          }
        }
      } catch (error) {
        console.error("Failed to load image:", error);
        warning("Erro ao carregar", "Não foi possível carregar a imagem");
        router.push("/admin/capture");
      }
    };
    loadData();
  }, [router, warning]);

  // Iniciar upload quando a imagem for carregada
  useEffect(() => {
    if (imageData && isUploadIdle) {
      upload(imageData);
    }
  }, [imageData, isUploadIdle, upload]);

  // Atualizar uploadedImage quando o resultado chegar
  useEffect(() => {
    if (uploadResult) {
      setUploadedImage(uploadResult);
    }
  }, [uploadResult]);

  // Funcao de retry
  const handleRetry = useCallback(() => {
    if (imageData) {
      retry(imageData);
    }
  }, [imageData, retry]);

  // Redirecionar para pagina de geracao de legenda com IA
  const handleGenerateCaption = useCallback(() => {
    router.push("/admin/caption");
  }, [router]);

  // Ir para pagina de preview avancado
  const handleGoToPreview = useCallback(() => {
    // Salvar dados do post no sessionStorage
    const postData = {
      imageData,
      uploadedImage,
      title,
      caption,
      hashtags,
      platform,
    };
    sessionStorage.setItem("previewPostData", JSON.stringify(postData));
    router.push("/admin/preview");
  }, [imageData, uploadedImage, title, caption, hashtags, platform, router]);

  // Inserir template na legenda
  const handleInsertTemplate = useCallback((text: string) => {
    setCaption((prev) => prev + text);
    setShowTemplates(false);
  }, []);

  // Salvar rascunho
  const handleSaveDraft = async () => {
    if (!uploadedImage) {
      warning("Aguarde", "O upload da imagem ainda nao foi concluido");
      return;
    }

    setIsSaving(true);

    try {
      await postService.createPost({
        imageUrl: uploadedImage.url,
        thumbnailUrl: uploadedImage.thumbnailUrl,
        title: title || "Sem titulo",
        caption,
        hashtags,
        platform,
        status: "draft",
      });

      success("Rascunho salvo!", "Seu post foi salvo como rascunho");
      sessionStorage.removeItem("capturedImage");
      sessionStorage.removeItem("editedImage");
      router.push("/admin/posts");
    } catch (err) {
      showError(
        "Erro ao salvar",
        err instanceof Error ? err.message : "Tente novamente"
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Publicar post
  const handlePublish = async () => {
    if (!uploadedImage) {
      warning("Aguarde", "O upload da imagem ainda nao foi concluido");
      return;
    }

    if (!title.trim()) {
      warning("Titulo obrigatorio", "Adicione um titulo para o post");
      return;
    }

    setIsSaving(true);

    try {
      const post = await postService.createPost({
        imageUrl: uploadedImage.url,
        thumbnailUrl: uploadedImage.thumbnailUrl,
        title,
        caption,
        hashtags,
        platform,
        status: "draft",
      });

      await postService.publishPost(post.id);

      success("Publicado!", "Seu post foi publicado com sucesso");
      sessionStorage.removeItem("capturedImage");
      sessionStorage.removeItem("editedImage");
      router.push("/admin/posts");
    } catch (err) {
      showError(
        "Erro ao publicar",
        err instanceof Error ? err.message : "Tente novamente"
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Stats da legenda
  const captionStats = useMemo(() => {
    const charCount = caption.length;
    const wordCount = caption.trim() ? caption.trim().split(/\s+/).length : 0;
    return { charCount, wordCount };
  }, [caption]);

  if (!imageData) {
    return null;
  }

  const canSave = isUploadComplete && !isSaving;

  return (
    <AdminLayout title="Criar Publicacao">
      <div className="mx-auto max-w-6xl">
        {/* View Mode Toggle */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
            <button
              onClick={() => setViewMode("edit")}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === "edit"
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Editar
              </span>
            </button>
            <button
              onClick={() => setViewMode("preview")}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === "preview"
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Preview
              </span>
            </button>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span>{captionStats.charCount} caracteres</span>
            <span>{captionStats.wordCount} palavras</span>
            <span>{hashtags.length} hashtags</span>
          </div>
        </div>

        {viewMode === "edit" ? (
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Left Column - Image */}
            <div className="lg:col-span-2">
              <div className="sticky top-6 space-y-4">
                {/* Preview da imagem */}
                <div className="overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-sm">
                  <div className="relative aspect-square w-full">
                    <Image
                      src={imageData}
                      alt="Imagem do post"
                      fill
                      className="object-cover"
                    />

                    {/* Overlay de upload */}
                    {!isUploadComplete && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <div className="w-3/4 max-w-xs">
                          <UploadProgress
                            status={uploadStatus}
                            progress={uploadProgress}
                            error={uploadError || undefined}
                            fileName={fileName || undefined}
                            fileSize={fileSize}
                            estimatedTime={estimatedTimeRemaining}
                            onRetry={handleRetry}
                            onCancel={cancel}
                            variant="overlay"
                          />
                        </div>
                      </div>
                    )}

                    {/* Badge de sucesso */}
                    {isUploadComplete && (
                      <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-green-500 px-3 py-1.5 text-sm font-medium text-white shadow-lg">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Enviado
                      </div>
                    )}
                  </div>

                  {/* Info da imagem */}
                  {uploadedImage && (
                    <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {uploadedImage.width} x {uploadedImage.height} px |{" "}
                        {(uploadedImage.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  )}
                </div>

                {/* Titulo */}
                <div className="rounded-2xl bg-white dark:bg-gray-800 p-4 shadow-sm">
                  <label className="mb-2 block font-semibold text-gray-900 dark:text-white">
                    Titulo
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Digite um titulo para seu post..."
                    maxLength={100}
                  />
                  <p className="mt-1 text-right text-xs text-gray-500 dark:text-gray-400">
                    {title.length}/100
                  </p>
                </div>

                {/* Plataforma */}
                <div className="rounded-2xl bg-white dark:bg-gray-800 p-4 shadow-sm">
                  <label className="mb-3 block font-semibold text-gray-900 dark:text-white">
                    Publicar em
                  </label>
                  <div className="flex gap-2">
                    {[
                      { value: "instagram" as Platform, label: "Instagram", icon: (
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>
                      )},
                      { value: "facebook" as Platform, label: "Facebook", icon: (
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                      )},
                      { value: "both" as Platform, label: "Ambos", icon: (
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                        </svg>
                      )},
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setPlatform(option.value)}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                          platform === option.value
                            ? "border-violet-500 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400"
                            : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500"
                        }`}
                      >
                        {option.icon}
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Text Editing */}
            <div className="lg:col-span-3 space-y-6">
              {/* Section Tabs */}
              <div className="flex items-center gap-2 rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
                <button
                  onClick={() => setActiveSection("caption")}
                  className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    activeSection === "caption"
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  Legenda
                </button>
                <button
                  onClick={() => setActiveSection("hashtags")}
                  className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    activeSection === "hashtags"
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  Hashtags ({hashtags.length})
                </button>
              </div>

              {/* Legenda Section */}
              {activeSection === "caption" && (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-white dark:bg-gray-800 p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <label className="font-semibold text-gray-900 dark:text-white">Legenda</label>
                      <button
                        onClick={() => setShowTemplates(!showTemplates)}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                        </svg>
                        Templates
                      </button>
                    </div>

                    <RichCaptionEditor
                      value={caption}
                      onChange={setCaption}
                      platform={platform}
                      onGenerateWithAI={handleGenerateCaption}
                    />
                  </div>

                  {/* Templates Panel */}
                  {showTemplates && (
                    <div className="animate-in slide-in-from-top-2">
                      <TextTemplates
                        onInsert={handleInsertTemplate}
                        onClose={() => setShowTemplates(false)}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Hashtags Section */}
              {activeSection === "hashtags" && (
                <div className="rounded-2xl bg-white dark:bg-gray-800 p-4 shadow-sm">
                  <label className="mb-3 block font-semibold text-gray-900 dark:text-white">
                    Gerenciar Hashtags
                  </label>
                  <HashtagManager
                    hashtags={hashtags}
                    onChange={setHashtags}
                    platform={platform}
                  />
                </div>
              )}

              {/* Acoes */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  fullWidth
                  onClick={handleSaveDraft}
                  disabled={!canSave}
                  isLoading={isSaving}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-2 h-4 w-4"
                  >
                    <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
                    <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
                    <path d="M7 3v4a1 1 0 0 0 1 1h7" />
                  </svg>
                  Salvar rascunho
                </Button>
                <Button
                  fullWidth
                  onClick={handlePublish}
                  disabled={!canSave}
                  isLoading={isSaving}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-2 h-4 w-4"
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                  Publicar agora
                </Button>
              </div>

              {/* Info */}
              <div className="rounded-xl border border-violet-100 dark:border-violet-900/50 bg-violet-50 dark:bg-violet-900/20 p-4">
                <p className="text-sm text-violet-700 dark:text-violet-400">
                  <strong>Dica:</strong> Use a geracao por IA para criar legendas
                  otimizadas para engajamento nas redes sociais. Clique no botao
                  &quot;Gerar com IA&quot; na barra de ferramentas da legenda.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Preview Mode */
          <div className="mx-auto max-w-2xl">
            <PostPreview
              imageUrl={imageData}
              caption={caption}
              hashtags={hashtags}
              platform={platform === "both" ? "instagram" : platform}
            />

            {/* Link to Full Preview */}
            <div className="mt-4 flex justify-center">
              <button
                onClick={handleGoToPreview}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 px-4 py-2 text-sm font-medium text-white transition-all hover:from-violet-600 hover:to-purple-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
                Ver Preview em Instagram e Facebook
              </button>
            </div>

            {/* Actions in Preview Mode */}
            <div className="mt-6 flex gap-3">
              <Button
                variant="outline"
                fullWidth
                onClick={() => setViewMode("edit")}
              >
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Voltar a Editar
              </Button>
              <Button
                fullWidth
                onClick={handlePublish}
                disabled={!canSave}
                isLoading={isSaving}
              >
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                Publicar agora
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
