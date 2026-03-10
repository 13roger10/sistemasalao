"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui";

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onCancel: () => void;
}

type FacingMode = "user" | "environment";

export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isMountedRef = useRef(true);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<FacingMode>("environment");
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  // Stop all tracks from current stream
  const stopCurrentStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async (facing: FacingMode) => {
    if (!isMountedRef.current) return;

    setIsLoading(true);
    setError(null);

    // Stop previous stream
    stopCurrentStream();

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Check if component is still mounted
      if (!isMountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // Handle play with proper error handling for AbortError
        try {
          await videoRef.current.play();
        } catch (playError) {
          // Ignore AbortError - it's expected when component unmounts or stream changes
          if (playError instanceof Error && playError.name === "AbortError") {
            return;
          }
          throw playError;
        }
      }

      // Check mounted state before updating state
      if (!isMountedRef.current) return;

      // Check for multiple cameras
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");

      if (isMountedRef.current) {
        setHasMultipleCameras(videoDevices.length > 1);
      }
    } catch (err) {
      if (!isMountedRef.current) return;

      console.error("Erro ao acessar câmera:", err);
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          setError("Permissão negada. Por favor, permita o acesso à câmera.");
        } else if (err.name === "NotFoundError") {
          setError("Nenhuma câmera encontrada no dispositivo.");
        } else if (err.name !== "AbortError") {
          setError("Erro ao acessar a câmera. Tente novamente.");
        }
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [stopCurrentStream]);

  useEffect(() => {
    isMountedRef.current = true;
    startCamera(facingMode);

    return () => {
      isMountedRef.current = false;
      stopCurrentStream();
    };
  }, [facingMode, startCamera, stopCurrentStream]);

  const handleCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    // Definir tamanho do canvas igual ao vídeo
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Se for câmera frontal, espelhar a imagem
    if (facingMode === "user") {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }

    // Desenhar frame do vídeo no canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Converter para base64
    const imageData = canvas.toDataURL("image/jpeg", 0.9);
    onCapture(imageData);
  }, [facingMode, onCapture]);

  const toggleCamera = useCallback(() => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  }, []);

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-black p-6 text-center">
        <div className="mb-4 rounded-full bg-red-500/20 p-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8 text-red-500"
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
        </div>
        <p className="mb-6 text-white">{error}</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel}>
            Voltar
          </Button>
          <Button onClick={() => startCamera(facingMode)}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col bg-black">
      {/* Área do vídeo */}
      <div className="relative flex-1 overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`h-full w-full object-cover ${
            facingMode === "user" ? "scale-x-[-1]" : ""
          }`}
        />

        {/* Canvas oculto para captura */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Guias de enquadramento */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-64 w-64 rounded-lg border-2 border-white/30 sm:h-80 sm:w-80" />
        </div>
      </div>

      {/* Controles */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent pb-8 pt-16">
        <div className="flex items-center justify-center gap-8">
          {/* Botão Cancelar */}
          <button
            onClick={onCancel}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
            aria-label="Cancelar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>

          {/* Botão Capturar */}
          <button
            onClick={handleCapture}
            disabled={isLoading}
            className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white/20 backdrop-blur-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            aria-label="Capturar foto"
          >
            <div className="h-14 w-14 rounded-full bg-white" />
          </button>

          {/* Botão Alternar Câmera */}
          {hasMultipleCameras ? (
            <button
              onClick={toggleCamera}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
              aria-label="Alternar câmera"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6"
              >
                <path d="M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
                <path d="M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5" />
                <circle cx="12" cy="12" r="3" />
                <path d="m18 22-3-3 3-3" />
                <path d="m6 2 3 3-3 3" />
              </svg>
            </button>
          ) : (
            <div className="h-12 w-12" /> // Placeholder para manter alinhamento
          )}
        </div>
      </div>
    </div>
  );
}
