import { postService, CreatePostData } from "@/services/post";

// Set NODE_ENV to development for tests
const originalEnv = process.env.NODE_ENV;

describe("postService", () => {
  const POSTS_STORAGE_KEY = "social_studio_posts";

  const mockPostData: CreatePostData = {
    imageUrl: "/images/test.jpg",
    title: "Test Post",
    caption: "Test caption",
    hashtags: ["test", "sample"],
    platform: "instagram",
    status: "draft",
  };

  beforeAll(() => {
    Object.defineProperty(process.env, "NODE_ENV", { value: "development" });
  });

  afterAll(() => {
    Object.defineProperty(process.env, "NODE_ENV", { value: originalEnv });
  });

  beforeEach(() => {
    localStorage.clear();
    // Set mock user for getCurrentUserId
    localStorage.setItem(
      "auth_user",
      JSON.stringify({ id: "test-user-001", name: "Test User" })
    );
  });

  describe("createPost", () => {
    it("should create a new post", async () => {
      const post = await postService.createPost(mockPostData);

      expect(post).toHaveProperty("id");
      expect(post.title).toBe(mockPostData.title);
      expect(post.caption).toBe(mockPostData.caption);
      expect(post.hashtags).toEqual(mockPostData.hashtags);
      expect(post.platform).toBe(mockPostData.platform);
      expect(post.status).toBe(mockPostData.status);
      expect(post.userId).toBe("test-user-001");
    });

    it("should store post in localStorage", async () => {
      await postService.createPost(mockPostData);

      const stored = JSON.parse(localStorage.getItem(POSTS_STORAGE_KEY) || "[]");
      expect(stored.length).toBe(1);
      expect(stored[0].title).toBe(mockPostData.title);
    });

    it("should generate unique IDs", async () => {
      const post1 = await postService.createPost(mockPostData);
      const post2 = await postService.createPost({
        ...mockPostData,
        title: "Second Post",
      });

      expect(post1.id).not.toBe(post2.id);
    });

    it("should set createdAt and updatedAt", async () => {
      const post = await postService.createPost(mockPostData);

      expect(post.createdAt).toBeDefined();
      expect(post.updatedAt).toBeDefined();
      expect(post.createdAt.getTime()).toBe(post.updatedAt.getTime());
    });
  });

  describe("getPost", () => {
    it("should return post by ID", async () => {
      const created = await postService.createPost(mockPostData);
      const found = await postService.getPost(created.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.title).toBe(mockPostData.title);
    });

    it("should return null for non-existent ID", async () => {
      const found = await postService.getPost("non-existent-id");
      expect(found).toBeNull();
    });
  });

  describe("updatePost", () => {
    it("should update post", async () => {
      const created = await postService.createPost(mockPostData);

      const updated = await postService.updatePost({
        id: created.id,
        title: "Updated Title",
        caption: "Updated caption",
      });

      expect(updated.id).toBe(created.id);
      expect(updated.title).toBe("Updated Title");
      expect(updated.caption).toBe("Updated caption");
    });

    it("should update updatedAt timestamp", async () => {
      const created = await postService.createPost(mockPostData);
      const originalUpdatedAt = created.updatedAt;

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await postService.updatePost({
        id: created.id,
        title: "Updated Title",
      });

      expect(updated.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      );
    });

    it("should throw error for non-existent post", async () => {
      await expect(
        postService.updatePost({
          id: "non-existent-id",
          title: "Updated",
        })
      ).rejects.toThrow("Post não encontrado");
    });
  });

  describe("deletePost", () => {
    it("should delete post", async () => {
      const created = await postService.createPost(mockPostData);

      await postService.deletePost(created.id);

      const found = await postService.getPost(created.id);
      expect(found).toBeNull();
    });

    it("should not affect other posts", async () => {
      const post1 = await postService.createPost(mockPostData);
      const post2 = await postService.createPost({
        ...mockPostData,
        title: "Second Post",
      });

      await postService.deletePost(post1.id);

      const remaining = await postService.getPost(post2.id);
      expect(remaining).not.toBeNull();
      expect(remaining?.title).toBe("Second Post");
    });
  });

  describe("listPosts", () => {
    beforeEach(async () => {
      // Create test posts
      await postService.createPost({ ...mockPostData, title: "Post 1" });
      await postService.createPost({
        ...mockPostData,
        title: "Post 2",
        status: "published",
      });
      await postService.createPost({
        ...mockPostData,
        title: "Post 3",
        status: "scheduled",
        platform: "facebook",
      });
    });

    it("should return all posts", async () => {
      const { posts, total } = await postService.listPosts();

      expect(posts.length).toBe(3);
      expect(total).toBe(3);
    });

    it("should filter by status", async () => {
      const { posts, total } = await postService.listPosts({ status: "draft" });

      expect(posts.length).toBe(1);
      expect(total).toBe(1);
      expect(posts[0].status).toBe("draft");
    });

    it("should filter by platform", async () => {
      const { posts, total } = await postService.listPosts({
        platform: "facebook",
      });

      expect(posts.length).toBe(1);
      expect(total).toBe(1);
      expect(posts[0].platform).toBe("facebook");
    });

    it("should apply limit", async () => {
      const { posts, total } = await postService.listPosts({ limit: 2 });

      expect(posts.length).toBe(2);
      expect(total).toBe(3);
    });

    it("should apply offset", async () => {
      const { posts, total } = await postService.listPosts({ offset: 1 });

      expect(posts.length).toBe(2);
      expect(total).toBe(3);
    });

    it("should apply limit and offset together", async () => {
      const { posts, total } = await postService.listPosts({
        offset: 1,
        limit: 1,
      });

      expect(posts.length).toBe(1);
      expect(total).toBe(3);
    });
  });

  describe("publishPost", () => {
    it("should change status to published", async () => {
      const created = await postService.createPost(mockPostData);

      const published = await postService.publishPost(created.id);

      expect(published.status).toBe("published");
      expect(published.publishedAt).toBeDefined();
    });

    it("should set publishedAt timestamp", async () => {
      const created = await postService.createPost(mockPostData);

      const published = await postService.publishPost(created.id);

      expect(published.publishedAt).toBeInstanceOf(Date);
    });

    it("should throw error for non-existent post", async () => {
      await expect(postService.publishPost("non-existent-id")).rejects.toThrow(
        "Post não encontrado"
      );
    });
  });

  describe("schedulePost", () => {
    it("should change status to scheduled", async () => {
      const created = await postService.createPost(mockPostData);
      const scheduledDate = new Date(Date.now() + 86400000);

      const scheduled = await postService.schedulePost(created.id, scheduledDate);

      expect(scheduled.status).toBe("scheduled");
      expect(scheduled.scheduledAt).toEqual(scheduledDate);
    });

    it("should throw error for non-existent post", async () => {
      await expect(
        postService.schedulePost("non-existent-id", new Date())
      ).rejects.toThrow("Post não encontrado");
    });
  });

  describe("cancelSchedule", () => {
    it("should change status back to draft", async () => {
      const created = await postService.createPost({
        ...mockPostData,
        status: "scheduled",
        scheduledAt: new Date(),
      });

      const cancelled = await postService.cancelSchedule(created.id);

      expect(cancelled.status).toBe("draft");
      expect(cancelled.scheduledAt).toBeUndefined();
    });

    it("should throw error for non-existent post", async () => {
      await expect(
        postService.cancelSchedule("non-existent-id")
      ).rejects.toThrow("Post não encontrado");
    });
  });

  describe("duplicatePost", () => {
    it("should create a copy of the post", async () => {
      const original = await postService.createPost(mockPostData);

      const duplicate = await postService.duplicatePost(original.id);

      expect(duplicate.id).not.toBe(original.id);
      expect(duplicate.title).toBe(`${original.title} (cópia)`);
      expect(duplicate.caption).toBe(original.caption);
      expect(duplicate.status).toBe("draft");
    });

    it("should clear schedule info on duplicate", async () => {
      const original = await postService.createPost({
        ...mockPostData,
        status: "scheduled",
        scheduledAt: new Date(),
      });

      const duplicate = await postService.duplicatePost(original.id);

      expect(duplicate.scheduledAt).toBeUndefined();
      expect(duplicate.publishedAt).toBeUndefined();
    });

    it("should throw error for non-existent post", async () => {
      await expect(postService.duplicatePost("non-existent-id")).rejects.toThrow(
        "Post não encontrado"
      );
    });
  });

  describe("getUpcomingPosts", () => {
    it("should return posts scheduled for the next 24 hours", async () => {
      const now = new Date();
      const in12Hours = new Date(now.getTime() + 12 * 60 * 60 * 1000);
      const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      // Create scheduled posts
      await postService.createPost({
        ...mockPostData,
        title: "Upcoming",
        status: "scheduled",
        scheduledAt: in12Hours,
      });

      await postService.createPost({
        ...mockPostData,
        title: "Future",
        status: "scheduled",
        scheduledAt: in48Hours,
      });

      const upcoming = await postService.getUpcomingPosts();

      expect(upcoming.length).toBe(1);
      expect(upcoming[0].title).toBe("Upcoming");
    });

    it("should not return past scheduled posts", async () => {
      const pastDate = new Date(Date.now() - 86400000);

      await postService.createPost({
        ...mockPostData,
        title: "Past",
        status: "scheduled",
        scheduledAt: pastDate,
      });

      const upcoming = await postService.getUpcomingPosts();

      expect(upcoming.length).toBe(0);
    });
  });
});
