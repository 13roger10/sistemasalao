"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/layout";
import { Button } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { ScheduleCalendar, ScheduleModal } from "@/components/schedule";
import { postService } from "@/services/post";
import type { Post } from "@/types";

export default function SchedulePage() {
  const { success, error: showError } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Carregar posts
  const loadPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await postService.listPosts();
      setPosts(result.posts);
    } catch (err) {
      showError(
        "Erro ao carregar",
        err instanceof Error ? err.message : "Tente novamente"
      );
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Cancelar agendamento (voltar para rascunho)
  const handleCancelSchedule = useCallback(async (post: Post) => {
    if (!confirm("Tem certeza que deseja cancelar o agendamento? O post voltara para rascunhos.")) {
      return;
    }

    try {
      const updated = await postService.updatePost({
        id: post.id,
        status: "draft",
        scheduledAt: undefined,
      });
      setPosts((prev) => prev.map((p) => (p.id === post.id ? updated : p)));
      success("Agendamento cancelado", "O post voltou para rascunhos");
    } catch (err) {
      showError(
        "Erro ao cancelar",
        err instanceof Error ? err.message : "Tente novamente"
      );
    }
  }, [success, showError]);

  // Publicar agora
  const handlePublishNow = useCallback(async (post: Post) => {
    if (!confirm("Tem certeza que deseja publicar este post agora?")) {
      return;
    }

    try {
      const updated = await postService.publishPost(post.id);
      setPosts((prev) => prev.map((p) => (p.id === post.id ? updated : p)));
      success("Post publicado!", "Seu post foi publicado com sucesso");
    } catch (err) {
      showError(
        "Erro ao publicar",
        err instanceof Error ? err.message : "Tente novamente"
      );
    }
  }, [success, showError]);

  // Abrir modal de reagendamento
  const handleReschedule = useCallback((post: Post) => {
    setSelectedPost(post);
    setShowRescheduleModal(true);
  }, []);

  // Confirmar reagendamento
  const handleConfirmReschedule = useCallback(async (date: Date) => {
    if (!selectedPost) return;

    setIsRescheduling(true);
    try {
      const updated = await postService.schedulePost(selectedPost.id, date);
      setPosts((prev) => prev.map((p) => (p.id === selectedPost.id ? updated : p)));
      success("Post reagendado!", "A nova data foi definida com sucesso");
      setShowRescheduleModal(false);
      setSelectedPost(null);
    } catch (err) {
      showError(
        "Erro ao reagendar",
        err instanceof Error ? err.message : "Tente novamente"
      );
    } finally {
      setIsRescheduling(false);
    }
  }, [selectedPost, success, showError]);

  // Contagens
  const scheduledCount = posts.filter((p) => p.status === "scheduled").length;
  const draftCount = posts.filter((p) => p.status === "draft").length;
  const publishedCount = posts.filter((p) => p.status === "published").length;

  // Posts agendados para as proximas 24h
  const upcomingPosts = posts.filter((p) => {
    if (p.status !== "scheduled" || !p.scheduledAt) return false;
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const scheduledDate = new Date(p.scheduledAt);
    return scheduledDate >= now && scheduledDate <= tomorrow;
  });

  return (
    <AdminLayout title="Agendamentos">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.open('https://wa.me/', '_blank')}
              className="flex items-center gap-2 rounded-xl border-2 border-green-500 dark:border-green-600 bg-white dark:bg-gray-800 px-4 py-2 text-green-600 dark:text-green-400 transition-all hover:bg-green-50 dark:hover:bg-green-900/30 hover:shadow-md"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </button>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Agendamentos</h1>
              <p className="mt-1 text-gray-500 dark:text-gray-400">
                Gerencie seus posts agendados e visualize o calendario de publicacoes
              </p>
            </div>
            <Link href="/admin/capture">
              <Button>
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Novo Post
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/50">
                <svg className="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{scheduledCount}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Posts Agendados</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700">
                <svg className="h-6 w-6 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{draftCount}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Rascunhos</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/50">
                <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{publishedCount}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Publicados</p>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Posts Alert */}
        {upcomingPosts.length > 0 && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-200 dark:bg-amber-800">
                <svg className="h-4 w-4 text-amber-700 dark:text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-amber-900 dark:text-amber-300">Proximos Posts</h4>
                <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                  Voce tem {upcomingPosts.length} post{upcomingPosts.length > 1 ? "s" : ""} agendado{upcomingPosts.length > 1 ? "s" : ""} para as proximas 24 horas
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {upcomingPosts.slice(0, 3).map((post) => (
                    <span
                      key={post.id}
                      className="inline-flex items-center gap-1 rounded-full bg-amber-200 dark:bg-amber-800 px-2 py-1 text-xs font-medium text-amber-800 dark:text-amber-200"
                    >
                      {post.scheduledAt && new Intl.DateTimeFormat("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(post.scheduledAt))}
                      {" - "}
                      {post.title.substring(0, 15)}...
                    </span>
                  ))}
                  {upcomingPosts.length > 3 && (
                    <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/50 px-2 py-1 text-xs text-amber-700 dark:text-amber-400">
                      +{upcomingPosts.length - 3} mais
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-violet-200 dark:border-violet-800 border-t-violet-600 dark:border-t-violet-400" />
              <p className="text-gray-500 dark:text-gray-400">Carregando agendamentos...</p>
            </div>
          </div>
        )}

        {/* Calendar */}
        {!isLoading && (
          <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm">
            <ScheduleCalendar
              posts={posts}
              onReschedule={handleReschedule}
              onCancelSchedule={handleCancelSchedule}
              onPublishNow={handlePublishNow}
            />
          </div>
        )}

        {/* Tips */}
        <div className="rounded-xl border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20 p-4">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 flex-shrink-0 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-300">Dicas de Agendamento</h4>
              <ul className="mt-2 space-y-1 text-sm text-blue-700 dark:text-blue-400">
                <li>• Melhores horarios para Instagram: 11h-13h e 19h-21h</li>
                <li>• Melhores horarios para Facebook: 9h-10h e 13h-14h</li>
                <li>• Mantenha uma frequencia consistente de postagens</li>
                <li>• Evite postar mais de 3 vezes por dia na mesma plataforma</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/admin/posts">
            <div className="flex items-center gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 transition-shadow hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/50">
                <svg className="h-5 w-5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Ver Todos os Posts</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie rascunhos e publicados</p>
              </div>
              <svg className="ml-auto h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link href="/admin/capture">
            <div className="flex items-center gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 transition-shadow hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/50">
                <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Criar Novo Post</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Capture e edite uma nova imagem</p>
              </div>
              <svg className="ml-auto h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>
      </div>

      {/* Reschedule Modal */}
      <ScheduleModal
        isOpen={showRescheduleModal}
        onClose={() => {
          setShowRescheduleModal(false);
          setSelectedPost(null);
        }}
        onSchedule={handleConfirmReschedule}
        isLoading={isRescheduling}
        initialDate={selectedPost?.scheduledAt ? new Date(selectedPost.scheduledAt) : undefined}
        platform={selectedPost?.platform}
      />
    </AdminLayout>
  );
}
