// Types e interfaces globais do projeto Social Studio IA

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface Post {
  id: string;
  userId: string;
  imageUrl: string;
  title: string;
  caption: string;
  hashtags: string[];
  platform: 'instagram' | 'facebook' | 'both';
  status: 'draft' | 'scheduled' | 'published';
  scheduledAt?: Date;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImageProcessingOptions {
  enhanceQuality: boolean;
  removeBackground: boolean;
  adjustLighting: boolean;
  filters?: string[];
}

export interface TextGenerationContext {
  serviceType: string;
  targetAudience: string;
  tone: 'professional' | 'casual' | 'fun' | 'elegant';
  keywords?: string[];
}

export interface GeneratedText {
  title: string;
  caption: string;
  hashtags: string[];
}

export type SocialPlatform = 'instagram' | 'facebook';

export interface SocialAccount {
  id: string;
  platform: SocialPlatform;
  username: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

// ===== AI Image Editing Types (Fase 7) =====

export type AIProcessingStatus = 'idle' | 'processing' | 'success' | 'error';

export interface AIProcessingState {
  status: AIProcessingStatus;
  progress: number;
  message?: string;
  error?: string;
}

export interface AIEnhancementOptions {
  quality: 'low' | 'medium' | 'high' | 'ultra';
  upscale: boolean;
  upscaleFactor: 1 | 2 | 4;
  denoise: boolean;
  denoiseStrength: number;
  sharpen: boolean;
  sharpenStrength: number;
  autoColor: boolean;
  autoContrast: boolean;
}

export interface AIBackgroundOptions {
  mode: 'remove' | 'blur' | 'replace';
  blurStrength?: number;
  replacementColor?: string;
  replacementImage?: string;
}

export interface DetectedObject {
  id: string;
  label: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ObjectDetectionResult {
  objects: DetectedObject[];
  processingTime: number;
}

export interface AIImageResult {
  imageData: string;
  originalSize: { width: number; height: number };
  processedSize: { width: number; height: number };
  processingTime: number;
  appliedEffects: string[];
}

export interface EditingHistoryEntry {
  id: string;
  timestamp: number;
  action: string;
  imageData: string;
  metadata?: Record<string, unknown>;
}

export interface EditorState {
  originalImage: string;
  currentImage: string;
  history: EditingHistoryEntry[];
  historyIndex: number;
  selectedTool: EditorTool;
  aiProcessing: AIProcessingState;
  detectedObjects: DetectedObject[];
  zoom: number;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
}

export type EditorTool =
  | 'select'
  | 'crop'
  | 'filter'
  | 'adjust'
  | 'text'
  | 'draw'
  | 'sticker'
  | 'ai-enhance'
  | 'ai-background'
  | 'ai-objects'
  | 'ai-generate';

export interface AIGenerativeOptions {
  prompt: string;
  style: 'realistic' | 'artistic' | 'cartoon' | 'sketch';
  strength: number;
  preserveOriginal: boolean;
}

export interface AICaptionResult {
  caption: string;
  hashtags: string[];
  alternativeCaptions: string[];
  tone: string;
  language: string;
}

// ===== AI Caption Generation Types (Fase 9) =====

export type CaptionTone =
  | 'professional'
  | 'casual'
  | 'fun'
  | 'elegant'
  | 'inspirational'
  | 'promotional'
  | 'educational';

export type CaptionLength = 'short' | 'medium' | 'long';

export type ContentCategory =
  | 'beauty'
  | 'hair'
  | 'nails'
  | 'skincare'
  | 'makeup'
  | 'wellness'
  | 'promotion'
  | 'before_after'
  | 'tutorial'
  | 'testimonial';

export interface CaptionGenerationOptions {
  tone: CaptionTone;
  length: CaptionLength;
  category: ContentCategory;
  platform: 'instagram' | 'facebook' | 'both';
  includeEmoji: boolean;
  includeCallToAction: boolean;
  keywords?: string[];
  businessName?: string;
  targetAudience?: string;
  language: 'pt-BR' | 'en-US' | 'es';
}

export interface GeneratedCaption {
  id: string;
  text: string;
  hashtags: string[];
  characterCount: number;
  estimatedEngagement: 'low' | 'medium' | 'high';
  tone: CaptionTone;
}

export interface CaptionGenerationResult {
  mainCaption: GeneratedCaption;
  alternatives: GeneratedCaption[];
  suggestedHashtags: string[];
  suggestedEmojis: string[];
  tips: string[];
  generatedAt: number;
}

export interface CaptionTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  category: ContentCategory;
  tone: CaptionTone;
  variables: string[];
}

// ===== Manual Editing Types (Fase 8) =====

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AspectRatio {
  label: string;
  value: number | null; // null = free aspect ratio
}

export interface TextOverlayConfig {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: string;
  backgroundColor?: string;
  rotation: number;
  opacity: number;
  textAlign: 'left' | 'center' | 'right';
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
}

export interface DrawingPath {
  id: string;
  points: { x: number; y: number }[];
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
  tool: 'pen' | 'brush' | 'eraser' | 'highlighter';
}

export interface Sticker {
  id: string;
  src: string;
  name: string;
  category: string;
}

export interface StickerOverlay {
  id: string;
  stickerId: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  flipH: boolean;
  flipV: boolean;
}

export interface ManualEditingState {
  cropArea: CropArea | null;
  selectedAspectRatio: AspectRatio | null;
  textOverlays: TextOverlayConfig[];
  selectedTextId: string | null;
  drawingPaths: DrawingPath[];
  currentDrawingPath: DrawingPath | null;
  stickerOverlays: StickerOverlay[];
  selectedStickerId: string | null;
}

// ===== Text Editing Types (Fase 10) =====

export interface EmojiCategory {
  id: string;
  name: string;
  icon: string;
  emojis: string[];
}

export interface HashtagSuggestion {
  tag: string;
  popularity: 'low' | 'medium' | 'high';
  category?: string;
}

export interface TextTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  category: 'cta' | 'greeting' | 'promo' | 'bio' | 'booking' | 'general';
  variables?: string[];
}

export interface PostPreviewData {
  imageUrl: string;
  caption: string;
  hashtags: string[];
  platform: 'instagram' | 'facebook';
  username?: string;
  avatarUrl?: string;
}

export interface PlatformLimits {
  maxCaptionLength: number;
  maxHashtags: number;
  recommendedHashtags: number;
  maxTitleLength?: number;
}

export const PLATFORM_LIMITS: Record<'instagram' | 'facebook', PlatformLimits> = {
  instagram: {
    maxCaptionLength: 2200,
    maxHashtags: 30,
    recommendedHashtags: 5,
  },
  facebook: {
    maxCaptionLength: 63206,
    maxHashtags: 30,
    recommendedHashtags: 3,
  },
};

export interface CaptionEditorState {
  text: string;
  hashtags: string[];
  cursorPosition: number;
  selectedText: string;
  charCount: number;
  wordCount: number;
  hashtagCount: number;
}

// ===== User Management Types (Sprint 2) =====

export type UserRole = 'ADMIN' | 'PROFISSIONAL' | 'CLIENTE';
export type UserPlano = 'FREE' | 'PRO' | 'PREMIUM';

export interface UsuarioListItem {
  id: number;
  email: string;
  nome: string;
  telefone?: string;
  avatarUrl?: string;
  role: UserRole;
  roleDescription: string;
  plano: UserPlano;
  ativo: boolean;
  emailVerificado: boolean;
  criadoEm: string;
  ultimoLogin?: string;
  salonId?: number;
  salonNome?: string;
}

export interface UsuarioPageResponse {
  content: UsuarioListItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface CreateUsuarioRequest {
  nome: string;
  email: string;
  password: string;
  telefone?: string;
  avatarUrl?: string;
  role: UserRole;
  plano?: UserPlano;
  salonId?: number;
}

export interface UpdateUsuarioRequest {
  nome?: string;
  email?: string;
  password?: string;
  telefone?: string;
  avatarUrl?: string;
  role?: UserRole;
  plano?: UserPlano;
  ativo?: boolean;
  emailVerificado?: boolean;
  salonId?: number;
}

export interface RoleOption {
  value: string;
  label: string;
  authority: string;
}
