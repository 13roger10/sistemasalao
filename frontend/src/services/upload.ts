// Serviço de upload de imagens
import { api } from "@/lib/api";

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  id: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  size: number;
  format: string;
}

export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  optimize?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

// Verificar se está em modo desenvolvimento
const isDev = process.env.NODE_ENV === "development";

// Gerar ID único para arquivos
const generateFileId = () => {
  return `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

// Simular delay de rede
const simulateNetworkDelay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Converter base64 para Blob
export const base64ToBlob = (base64: string): Blob => {
  const parts = base64.split(",");
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

// Obter dimensões da imagem
export const getImageDimensions = (
  imageData: string
): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.src = imageData;
  });
};

// Otimizar imagem (redimensionar e comprimir)
export const optimizeImage = async (
  imageData: string,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  } = {}
): Promise<string> => {
  const { maxWidth = 1920, maxHeight = 1080, quality = 0.85 } = options;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      // Calcular novas dimensões mantendo proporção
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      // Criar canvas e desenhar imagem redimensionada
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
      }

      // Converter para base64 com qualidade especificada
      const optimized = canvas.toDataURL("image/jpeg", quality);
      resolve(optimized);
    };
    img.src = imageData;
  });
};

// Criar thumbnail
export const createThumbnail = async (
  imageData: string,
  size: number = 300
): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const { width, height } = img;
      const ratio = Math.min(size / width, size / height);
      const newWidth = width * ratio;
      const newHeight = height * ratio;

      const canvas = document.createElement("canvas");
      canvas.width = newWidth;
      canvas.height = newHeight;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, newWidth, newHeight);
      }

      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.src = imageData;
  });
};

export const uploadService = {
  // Upload de imagem
  async uploadImage(
    imageData: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const {
      onProgress,
      optimize = true,
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 0.85,
    } = options;

    // Otimizar imagem se necessário
    let processedImage = imageData;
    if (optimize) {
      processedImage = await optimizeImage(imageData, {
        maxWidth,
        maxHeight,
        quality,
      });
    }

    // Obter dimensões
    const dimensions = await getImageDimensions(processedImage);

    // Criar thumbnail
    const thumbnail = await createThumbnail(processedImage);

    // Converter para blob
    const blob = base64ToBlob(processedImage);

    // Em desenvolvimento, simular upload
    if (isDev) {
      const totalSteps = 10;
      for (let i = 1; i <= totalSteps; i++) {
        await simulateNetworkDelay(100);
        if (onProgress) {
          onProgress({
            loaded: (blob.size / totalSteps) * i,
            total: blob.size,
            percentage: Math.round((i / totalSteps) * 100),
          });
        }
      }

      const fileId = generateFileId();

      // Salvar no localStorage para persistência em dev
      const uploadedImages = JSON.parse(
        localStorage.getItem("uploaded_images") || "[]"
      );
      uploadedImages.push({
        id: fileId,
        url: processedImage,
        thumbnailUrl: thumbnail,
        ...dimensions,
        size: blob.size,
        format: "jpeg",
        uploadedAt: new Date().toISOString(),
      });
      localStorage.setItem("uploaded_images", JSON.stringify(uploadedImages));

      return {
        id: fileId,
        url: processedImage,
        thumbnailUrl: thumbnail,
        ...dimensions,
        size: blob.size,
        format: "jpeg",
      };
    }

    // Em produção, fazer upload real para API
    const formData = new FormData();
    formData.append("image", blob, "image.jpg");
    formData.append("thumbnail", base64ToBlob(thumbnail), "thumbnail.jpg");

    const response = await api.post<UploadResult>("/upload/image", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          onProgress({
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage: Math.round(
              (progressEvent.loaded / progressEvent.total) * 100
            ),
          });
        }
      },
    });

    return response.data;
  },

  // Deletar imagem
  async deleteImage(imageId: string): Promise<void> {
    if (isDev) {
      const uploadedImages = JSON.parse(
        localStorage.getItem("uploaded_images") || "[]"
      );
      const filtered = uploadedImages.filter(
        (img: UploadResult) => img.id !== imageId
      );
      localStorage.setItem("uploaded_images", JSON.stringify(filtered));
      return;
    }

    await api.delete(`/upload/image/${imageId}`);
  },

  // Listar imagens uploaded
  async listImages(): Promise<UploadResult[]> {
    if (isDev) {
      return JSON.parse(localStorage.getItem("uploaded_images") || "[]");
    }

    const response = await api.get<UploadResult[]>("/upload/images");
    return response.data;
  },
};
