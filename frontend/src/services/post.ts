// Serviço de gerenciamento de posts
import { api } from "@/lib/api";
import type { Post } from "@/types";

export interface CreatePostData {
  imageUrl: string;
  thumbnailUrl?: string;
  title: string;
  caption: string;
  hashtags: string[];
  platform: "instagram" | "facebook" | "both";
  status: "draft" | "scheduled" | "published";
  scheduledAt?: Date;
}

export interface UpdatePostData extends Partial<CreatePostData> {
  id: string;
}

// Verificar se está em modo desenvolvimento
const isDev = process.env.NODE_ENV === "development";

// Chave de armazenamento local
const POSTS_STORAGE_KEY = "social_studio_posts";

// Gerar ID único para posts
const generatePostId = () => {
  return `post_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

// Simular delay de rede
const simulateNetworkDelay = (ms: number = 300) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Obter posts do localStorage
const getStoredPosts = (): Post[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(POSTS_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored).map((post: Post) => ({
      ...post,
      createdAt: new Date(post.createdAt),
      updatedAt: new Date(post.updatedAt),
      scheduledAt: post.scheduledAt ? new Date(post.scheduledAt) : undefined,
      publishedAt: post.publishedAt ? new Date(post.publishedAt) : undefined,
    }));
  } catch {
    return [];
  }
};

// Salvar posts no localStorage
const saveStoredPosts = (posts: Post[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts));
};

// Obter ID do usuário atual
const getCurrentUserId = (): string => {
  if (typeof window === "undefined") return "unknown";
  try {
    const userStr = localStorage.getItem("auth_user");
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.id || "unknown";
    }
  } catch {
    // Ignora erro
  }
  return "admin-001"; // ID padrão em desenvolvimento
};

export const postService = {
  // Criar novo post
  async createPost(data: CreatePostData): Promise<Post> {
    if (isDev) {
      await simulateNetworkDelay();

      const now = new Date();
      const newPost: Post = {
        id: generatePostId(),
        userId: getCurrentUserId(),
        imageUrl: data.imageUrl,
        title: data.title,
        caption: data.caption,
        hashtags: data.hashtags,
        platform: data.platform,
        status: data.status,
        scheduledAt: data.scheduledAt,
        createdAt: now,
        updatedAt: now,
      };

      const posts = getStoredPosts();
      posts.unshift(newPost); // Adicionar no início
      saveStoredPosts(posts);

      return newPost;
    }

    const response = await api.post<Post>("/posts", data);
    return response.data;
  },

  // Atualizar post
  async updatePost(data: UpdatePostData): Promise<Post> {
    const { id, ...updateData } = data;

    if (isDev) {
      await simulateNetworkDelay();

      const posts = getStoredPosts();
      const index = posts.findIndex((p) => p.id === id);

      if (index === -1) {
        throw new Error("Post não encontrado");
      }

      const updatedPost: Post = {
        ...posts[index],
        ...updateData,
        updatedAt: new Date(),
      };

      posts[index] = updatedPost;
      saveStoredPosts(posts);

      return updatedPost;
    }

    const response = await api.put<Post>(`/posts/${id}`, updateData);
    return response.data;
  },

  // Buscar post por ID
  async getPost(id: string): Promise<Post | null> {
    if (isDev) {
      await simulateNetworkDelay(100);

      const posts = getStoredPosts();
      return posts.find((p) => p.id === id) || null;
    }

    try {
      const response = await api.get<Post>(`/posts/${id}`);
      return response.data;
    } catch {
      return null;
    }
  },

  // Listar posts
  async listPosts(filters?: {
    status?: Post["status"];
    platform?: Post["platform"];
    limit?: number;
    offset?: number;
  }): Promise<{ posts: Post[]; total: number }> {
    if (isDev) {
      await simulateNetworkDelay(200);

      let posts = getStoredPosts();

      // Aplicar filtros
      if (filters?.status) {
        posts = posts.filter((p) => p.status === filters.status);
      }
      if (filters?.platform) {
        posts = posts.filter(
          (p) => p.platform === filters.platform || p.platform === "both"
        );
      }

      const total = posts.length;

      // Aplicar paginação
      if (filters?.offset) {
        posts = posts.slice(filters.offset);
      }
      if (filters?.limit) {
        posts = posts.slice(0, filters.limit);
      }

      return { posts, total };
    }

    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.platform) params.append("platform", filters.platform);
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.offset) params.append("offset", filters.offset.toString());

    const response = await api.get<{ posts: Post[]; total: number }>(
      `/posts?${params.toString()}`
    );
    return response.data;
  },

  // Deletar post
  async deletePost(id: string): Promise<void> {
    if (isDev) {
      await simulateNetworkDelay();

      const posts = getStoredPosts();
      const filtered = posts.filter((p) => p.id !== id);
      saveStoredPosts(filtered);
      return;
    }

    await api.delete(`/posts/${id}`);
  },

  // Publicar post (mudar status para published)
  async publishPost(id: string): Promise<Post> {
    if (isDev) {
      await simulateNetworkDelay(500); // Simular tempo de publicação

      const posts = getStoredPosts();
      const index = posts.findIndex((p) => p.id === id);

      if (index === -1) {
        throw new Error("Post não encontrado");
      }

      const now = new Date();
      const updatedPost: Post = {
        ...posts[index],
        status: "published",
        publishedAt: now,
        updatedAt: now,
      };

      posts[index] = updatedPost;
      saveStoredPosts(posts);

      return updatedPost;
    }

    const response = await api.post<Post>(`/posts/${id}/publish`);
    return response.data;
  },

  // Agendar post
  async schedulePost(id: string, scheduledAt: Date): Promise<Post> {
    if (isDev) {
      await simulateNetworkDelay();

      const posts = getStoredPosts();
      const index = posts.findIndex((p) => p.id === id);

      if (index === -1) {
        throw new Error("Post não encontrado");
      }

      const updatedPost: Post = {
        ...posts[index],
        status: "scheduled",
        scheduledAt,
        updatedAt: new Date(),
      };

      posts[index] = updatedPost;
      saveStoredPosts(posts);

      return updatedPost;
    }

    const response = await api.post<Post>(`/posts/${id}/schedule`, {
      scheduledAt,
    });
    return response.data;
  },

  // Cancelar agendamento (voltar para rascunho)
  async cancelSchedule(id: string): Promise<Post> {
    if (isDev) {
      await simulateNetworkDelay();

      const posts = getStoredPosts();
      const index = posts.findIndex((p) => p.id === id);

      if (index === -1) {
        throw new Error("Post não encontrado");
      }

      const updatedPost: Post = {
        ...posts[index],
        status: "draft",
        scheduledAt: undefined,
        updatedAt: new Date(),
      };

      posts[index] = updatedPost;
      saveStoredPosts(posts);

      return updatedPost;
    }

    const response = await api.post<Post>(`/posts/${id}/cancel-schedule`);
    return response.data;
  },

  // Listar posts agendados
  async listScheduledPosts(): Promise<{ posts: Post[]; total: number }> {
    return this.listPosts({ status: "scheduled" });
  },

  // Obter proximos posts agendados (proximas 24h)
  async getUpcomingPosts(): Promise<Post[]> {
    const { posts } = await this.listScheduledPosts();
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return posts.filter((post) => {
      if (!post.scheduledAt) return false;
      const scheduledDate = new Date(post.scheduledAt);
      return scheduledDate >= now && scheduledDate <= tomorrow;
    });
  },

  // Duplicar post
  async duplicatePost(id: string): Promise<Post> {
    if (isDev) {
      await simulateNetworkDelay();

      const posts = getStoredPosts();
      const original = posts.find((p) => p.id === id);

      if (!original) {
        throw new Error("Post não encontrado");
      }

      const now = new Date();
      const duplicated: Post = {
        ...original,
        id: generatePostId(),
        title: `${original.title} (cópia)`,
        status: "draft",
        scheduledAt: undefined,
        publishedAt: undefined,
        createdAt: now,
        updatedAt: now,
      };

      posts.unshift(duplicated);
      saveStoredPosts(posts);

      return duplicated;
    }

    const response = await api.post<Post>(`/posts/${id}/duplicate`);
    return response.data;
  },
};
