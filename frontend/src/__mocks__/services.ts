import { mockUser, mockPost, mockToken } from "@/__tests__/utils/test-utils";

// Auth Service Mock
export const mockAuthService = {
  login: jest.fn().mockResolvedValue({
    user: mockUser,
    token: mockToken,
  }),
  logout: jest.fn(),
  verifyToken: jest.fn().mockResolvedValue(true),
  getProfile: jest.fn().mockResolvedValue(mockUser),
  refreshToken: jest.fn().mockResolvedValue({
    user: mockUser,
    token: mockToken,
  }),
};

// Post Service Mock
export const mockPostService = {
  createPost: jest.fn().mockResolvedValue(mockPost),
  updatePost: jest.fn().mockResolvedValue(mockPost),
  getPost: jest.fn().mockResolvedValue(mockPost),
  listPosts: jest.fn().mockResolvedValue({ posts: [mockPost], total: 1 }),
  deletePost: jest.fn().mockResolvedValue(undefined),
  publishPost: jest.fn().mockResolvedValue({ ...mockPost, status: "published" }),
  schedulePost: jest.fn().mockResolvedValue({ ...mockPost, status: "scheduled" }),
  cancelSchedule: jest.fn().mockResolvedValue({ ...mockPost, status: "draft" }),
  listScheduledPosts: jest.fn().mockResolvedValue({ posts: [], total: 0 }),
  getUpcomingPosts: jest.fn().mockResolvedValue([]),
  duplicatePost: jest.fn().mockResolvedValue({
    ...mockPost,
    id: "post-duplicate",
    title: `${mockPost.title} (cópia)`,
  }),
};

// Caption AI Service Mock
export const mockCaptionAIService = {
  generateCaption: jest.fn().mockResolvedValue({
    caption: "Generated caption",
    hashtags: ["generated", "hashtags"],
  }),
};

// Image AI Service Mock
export const mockImageAIService = {
  analyzeImage: jest.fn().mockResolvedValue({
    description: "Image description",
    tags: ["tag1", "tag2"],
  }),
  enhanceImage: jest.fn().mockResolvedValue({
    enhancedUrl: "/images/enhanced.jpg",
  }),
};

// Upload Service Mock
export const mockUploadService = {
  uploadImage: jest.fn().mockResolvedValue({
    url: "/images/uploaded.jpg",
    thumbnailUrl: "/images/uploaded-thumb.jpg",
  }),
};

// Reset all mocks
export const resetAllMocks = () => {
  jest.clearAllMocks();
};
