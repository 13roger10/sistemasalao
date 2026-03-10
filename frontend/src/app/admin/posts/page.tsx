"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { AdminLayout } from "@/components/layout";
import { Button } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { ScheduleModal } from "@/components/schedule";
import { postService } from "@/services/post";
import type { Post } from "@/types";

type FilterStatus = "all" | Post["status"];

const statusLabels: Record<Post["status"], string> = {
  draft: "Rascunho",
  scheduled: "Agendado",
  published: "Publicado",
};

const statusColors: Record<Post["status"], string> = {
  draft: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300",
  scheduled: "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400",
  published: "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400",
};

const platformIcons: Record<Post["platform"], string> = {
  instagram: "IG",
  facebook: "FB",
  both: "IG+FB",
};

export default function PostsPage() {
  const { success, error: showError } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedPostForSchedule, setSelectedPostForSchedule] = useState<Post | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);

  // Carregar posts
  const loadPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await postService.listPosts(
        filter !== "all" ? { status: filter } : undefined
      );
      setPosts(result.posts);
    } catch (err) {
      showError(
        "Erro ao carregar",
        err instanceof Error ? err.message : "Tente novamente"
      );
    } finally {
      setIsLoading(false);
    }
  }, [filter, showError]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este post?")) return;

    setDeletingId(id);
    try {
      await postService.deletePost(id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
      success("Post excluido", "O post foi removido com sucesso");
    } catch (err) {
      showError(
        "Erro ao excluir",
        err instanceof Error ? err.message : "Tente novamente"
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      const updated = await postService.publishPost(id);
      setPosts((prev) => prev.map((p) => (p.id === id ? updated : p)));
      success("Post publicado!", "Seu post foi publicado com sucesso");
    } catch (err) {
      showError(
        "Erro ao publicar",
        err instanceof Error ? err.message : "Tente novamente"
      );
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const duplicated = await postService.duplicatePost(id);
      setPosts((prev) => [duplicated, ...prev]);
      success("Post duplicado", "Uma copia foi criada como rascunho");
    } catch (err) {
      showError(
        "Erro ao duplicar",
        err instanceof Error ? err.message : "Tente novamente"
      );
    }
  };

  const handleSchedule = useCallback(async (scheduledDate: Date) => {
    if (!selectedPostForSchedule) return;

    setIsScheduling(true);
    try {
      const updated = await postService.schedulePost(selectedPostForSchedule.id, scheduledDate);
      setPosts((prev) => prev.map((p) => (p.id === selectedPostForSchedule.id ? updated : p)));
      success("Post agendado!", "Seu post foi agendado com sucesso");
      setSelectedPostForSchedule(null);
    } catch (err) {
      showError(
        "Erro ao agendar",
        err instanceof Error ? err.message : "Tente novamente"
      );
    } finally {
      setIsScheduling(false);
    }
  }, [selectedPostForSchedule, success, showError]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  return (
    <AdminLayout title="Meus Posts">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {(["all", "draft", "scheduled", "published"] as FilterStatus[]).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    filter === status
                      ? "bg-violet-500 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {status === "all" ? "Todos" : statusLabels[status]}
                </button>
              )
            )}
          </div>
          <Link href="/admin/capture">
            <Button size="sm">
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
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              Novo Post
            </Button>
          </Link>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && posts.length === 0 && (
          <div className="rounded-2xl bg-white dark:bg-gray-800 p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/50">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-8 w-8 text-violet-600"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
              Nenhum post encontrado
            </h3>
            <p className="mb-6 text-gray-500 dark:text-gray-400">
              {filter === "all"
                ? "Comece criando seu primeiro post!"
                : `Voce nao tem posts com status "${statusLabels[filter]}"`}
            </p>
            <Link href="/admin/capture">
              <Button>Criar primeiro post</Button>
            </Link>
          </div>
        )}

        {/* Posts Grid */}
        {!isLoading && posts.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Imagem */}
                <div className="relative aspect-square">
                  <Image
                    src={post.imageUrl}
                    alt={post.title}
                    fill
                    className="object-cover"
                  />
                  {/* Badge de status */}
                  <div className="absolute left-3 top-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[post.status]}`}
                    >
                      {statusLabels[post.status]}
                    </span>
                  </div>
                  {/* Badge de plataforma */}
                  <div className="absolute right-3 top-3">
                    <span className="rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white">
                      {platformIcons[post.platform]}
                    </span>
                  </div>
                </div>

                {/* Conteudo */}
                <div className="p-4">
                  <h3 className="mb-1 truncate font-semibold text-gray-900 dark:text-white">
                    {post.title}
                  </h3>
                  <p className="mb-3 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                    {post.caption || "Sem legenda"}
                  </p>

                  {/* Data */}
                  <div className="mb-4 text-xs text-gray-400 dark:text-gray-500">
                    {post.status === "published" && post.publishedAt
                      ? `Publicado em ${formatDate(post.publishedAt)}`
                      : post.status === "scheduled" && post.scheduledAt
                        ? `Agendado para ${formatDate(post.scheduledAt)}`
                        : `Criado em ${formatDate(post.createdAt)}`}
                  </div>

                  {/* Acoes */}
                  <div className="flex gap-2">
                    {post.status === "draft" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handlePublish(post.id)}
                        >
                          Publicar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedPostForSchedule(post)}
                          className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                          title="Agendar"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4 w-4"
                          >
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDuplicate(post.id)}
                      title="Duplicar"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <rect
                          width="14"
                          height="14"
                          x="8"
                          y="8"
                          rx="2"
                          ry="2"
                        />
                        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                      </svg>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(post.id)}
                      disabled={deletingId === post.id}
                      className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-300"
                      title="Excluir"
                    >
                      {deletingId === post.id ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-200 border-t-red-600" />
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4"
                        >
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        </svg>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="rounded-xl border border-violet-100 dark:border-violet-900 bg-violet-50 dark:bg-violet-900/20 p-4">
          <p className="text-sm text-violet-700 dark:text-violet-400">
            <strong>Dica:</strong> Posts salvos como rascunho podem ser editados
            e publicados a qualquer momento.
          </p>
        </div>

        {/* Quick Link to Schedule */}
        <Link href="/admin/schedule">
          <div className="flex items-center gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 transition-shadow hover:shadow-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-amber-600"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Ver Calendario de Agendamentos</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Visualize e gerencie seus posts agendados</p>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="ml-auto h-5 w-5 text-gray-400 dark:text-gray-500"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        </Link>
      </div>

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={!!selectedPostForSchedule}
        onClose={() => setSelectedPostForSchedule(null)}
        onSchedule={handleSchedule}
        isLoading={isScheduling}
        platform={selectedPostForSchedule?.platform}
      />
    </AdminLayout>
  );
}
