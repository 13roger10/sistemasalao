"use client";

import { useRef, useCallback } from "react";

interface ImagePickerProps {
  onSelect: (imageData: string) => void;
  accept?: string;
  maxSizeMB?: number;
  children: React.ReactNode;
}

export function ImagePicker({
  onSelect,
  accept = "image/jpeg,image/png,image/webp",
  maxSizeMB = 10,
  children,
}: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validar tipo
      const validTypes = accept.split(",").map((t) => t.trim());
      if (!validTypes.includes(file.type)) {
        alert("Formato de imagem não suportado. Use JPG, PNG ou WebP.");
        return;
      }

      // Validar tamanho
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        alert(`A imagem deve ter no máximo ${maxSizeMB}MB.`);
        return;
      }

      // Converter para base64
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        onSelect(result);
      };
      reader.readAsDataURL(file);

      // Limpar input para permitir selecionar a mesma imagem novamente
      e.target.value = "";
    },
    [accept, maxSizeMB, onSelect]
  );

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
        aria-hidden="true"
      />
      <div onClick={handleClick} className="cursor-pointer">
        {children}
      </div>
    </>
  );
}
