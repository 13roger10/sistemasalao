"use client";

import { useEffect, useState, useMemo } from "react";
import { AdminLayout } from "@/components/layout";
import { ImagePlus, FileText, Calendar, TrendingUp, Clock, Eye, Bell } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { postService } from "@/services/post";
import { useSettings } from "@/contexts/SettingsContext";
import type { Post } from "@/types";

interface DashboardStats {
  total: number;
  drafts: number;
  scheduled: number;
  published: number;
}

export default function DashboardPage() {
  const { businessName } = useSettings();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    drafts: 0,
    scheduled: 0,
    published: 0,
  });

  // Carregar posts e calcular estatisticas
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const result = await postService.listPosts();
      setPosts(result.posts);

      // Calcular estatisticas
      const drafts = result.posts.filter((p) => p.status === "draft").length;
      const scheduled = result.posts.filter((p) => p.status === "scheduled").length;
      const published = result.posts.filter((p) => p.status === "published").length;

      setStats({
        total: result.total,
        drafts,
        scheduled,
        published,
      });
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Posts recentes (ultimos 5)
  const recentPosts = useMemo(() => {
    return posts.slice(0, 5);
  }, [posts]);

  // Posts agendados para as proximas 24h
  const upcomingPosts = useMemo(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return posts
      .filter((p) => {
        if (p.status !== "scheduled" || !p.scheduledAt) return false;
        const scheduledDate = new Date(p.scheduledAt);
        return scheduledDate >= now && scheduledDate <= tomorrow;
      })
      .sort((a, b) => {
        const dateA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
        const dateB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
        return dateA - dateB;
      })
      .slice(0, 3);
  }, [posts]);

  // Formatar data
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  // Formatar hora
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const statsCards = [
    {
      label: "Total de Posts",
      value: stats.total.toString(),
      icon: FileText,
      color: "bg-blue-500",
      bgLight: "bg-blue-50",
      textColor: "text-blue-600",
    },
    {
      label: "Rascunhos",
      value: stats.drafts.toString(),
      icon: FileText,
      color: "bg-gray-500",
      bgLight: "bg-gray-50",
      textColor: "text-gray-600",
    },
    {
      label: "Agendados",
      value: stats.scheduled.toString(),
      icon: Calendar,
      color: "bg-amber-500",
      bgLight: "bg-amber-50",
      textColor: "text-amber-600",
    },
    {
      label: "Publicados",
      value: stats.published.toString(),
      icon: TrendingUp,
      color: "bg-green-500",
      bgLight: "bg-green-50",
      textColor: "text-green-600",
    },
  ];

  const quickActions = [
    {
      label: "Criar Novo Post",
      description: "Capture ou escolha uma imagem",
      href: "/admin/capture",
      icon: ImagePlus,
      color: "bg-violet-500",
    },
    {
      label: "Ver Meus Posts",
      description: "Visualize e edite seus posts",
      href: "/admin/posts",
      icon: FileText,
      color: "bg-blue-500",
    },
    {
      label: "Agendamentos",
      description: "Gerencie publicacoes agendadas",
      href: "/admin/schedule",
      icon: Calendar,
      color: "bg-amber-500",
    },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        {/* Boas-vindas */}
        <div className="rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 p-6 text-white">
          <h2 className="text-2xl font-bold">Bem-vindo ao {businessName}!</h2>
          <p className="mt-2 text-violet-100">
            Crie posts incriveis para suas redes sociais com ajuda da
            Inteligencia Artificial.
          </p>
        </div>

        {/* Estatisticas */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statsCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800"
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.color}`}
                >
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  {isLoading ? (
                    <div className="h-8 w-12 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                  ) : (
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stat.value}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Grid Principal */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Acoes Rapidas */}
          <div className="lg:col-span-2">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Acoes Rapidas
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="group rounded-xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:bg-gray-800"
                  >
                    <div
                      className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${action.color}`}
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <h4 className="font-semibold text-gray-900 group-hover:text-violet-600 dark:text-white dark:group-hover:text-violet-400">
                      {action.label}
                    </h4>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {action.description}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Proximos Posts */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Proximos Posts
              </h3>
              <Link
                href="/admin/schedule"
                className="text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
              >
                Ver todos
              </Link>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-12 w-12 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : upcomingPosts.length === 0 ? (
                <div className="py-8 text-center">
                  <Clock className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Nenhum post agendado para as proximas 24h
                  </p>
                  <Link
                    href="/admin/capture"
                    className="mt-2 inline-block text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                  >
                    Criar novo post
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingPosts.map((post) => (
                    <div key={post.id} className="flex items-center gap-3">
                      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg">
                        <Image
                          src={post.imageUrl}
                          alt={post.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                          {post.title}
                        </p>
                        <p className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                          <Clock className="h-3 w-3" />
                          {post.scheduledAt && formatTime(post.scheduledAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Posts Recentes */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Posts Recentes
            </h3>
            <Link
              href="/admin/posts"
              className="text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
            >
              Ver todos
            </Link>
          </div>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="rounded-xl bg-white p-3 shadow-sm dark:bg-gray-800">
                  <div className="aspect-square animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
                  <div className="mt-3 space-y-2">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentPosts.length === 0 ? (
            <div className="rounded-xl bg-white p-8 text-center shadow-sm dark:bg-gray-800">
              <Eye className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-500 dark:text-gray-400">Nenhum post criado ainda</p>
              <Link
                href="/admin/capture"
                className="mt-2 inline-block text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
              >
                Criar primeiro post
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {recentPosts.map((post) => (
                <Link
                  key={post.id}
                  href="/admin/posts"
                  className="group rounded-xl bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:bg-gray-800"
                >
                  <div className="relative aspect-square overflow-hidden rounded-lg">
                    <Image
                      src={post.imageUrl}
                      alt={post.title}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                    {/* Status Badge */}
                    <div className="absolute left-2 top-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          post.status === "published"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400"
                            : post.status === "scheduled"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {post.status === "published"
                          ? "Publicado"
                          : post.status === "scheduled"
                            ? "Agendado"
                            : "Rascunho"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {post.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(post.createdAt)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Dica */}
        <div className="rounded-xl border border-violet-100 bg-violet-50 p-4 dark:border-violet-900/50 dark:bg-violet-900/20">
          <div className="flex items-start gap-3">
            <Bell className="h-5 w-5 flex-shrink-0 text-violet-500 dark:text-violet-400" />
            <div>
              <p className="font-medium text-violet-900 dark:text-violet-300">Dica do dia</p>
              <p className="mt-1 text-sm text-violet-700 dark:text-violet-400">
                Os melhores horarios para postar no Instagram sao entre 11h-13h e 19h-21h.
                Agende seus posts para esses horarios para melhor engajamento!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Botao Flutuante - Nova Publicacao */}
      <Link
        href="/admin/capture"
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-violet-500 text-white shadow-lg transition-all hover:scale-105 hover:bg-violet-600 active:scale-95"
        aria-label="Criar nova publicacao"
      >
        <ImagePlus className="h-6 w-6" />
      </Link>
    </AdminLayout>
  );
}
