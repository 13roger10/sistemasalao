#!/usr/bin/env node
// Script para gerar ícones PWA em diferentes tamanhos

import sharp from "sharp";
import { mkdir } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Tamanhos necessários para o PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// SVG do ícone
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <rect width="512" height="512" rx="128" fill="#8b5cf6"/>
  <path d="M256 120c-75.1 0-136 60.9-136 136s60.9 136 136 136 136-60.9 136-136-60.9-136-136-136zm0 240c-57.3 0-104-46.7-104-104s46.7-104 104-104 104 46.7 104 104-46.7 104-104 104z" fill="white"/>
  <circle cx="256" cy="256" r="48" fill="white"/>
  <path d="M380 132c0 17.7-14.3 32-32 32s-32-14.3-32-32 14.3-32 32-32 32 14.3 32 32z" fill="white"/>
</svg>`;

async function generateIcons() {
  const iconsDir = join(__dirname, "..", "public", "icons");

  // Garantir que o diretório existe
  await mkdir(iconsDir, { recursive: true });

  console.log("Gerando ícones PWA...\n");

  for (const size of sizes) {
    const outputPath = join(iconsDir, `icon-${size}x${size}.png`);

    await sharp(Buffer.from(svgIcon))
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`✓ icon-${size}x${size}.png`);
  }

  // Gerar também favicon.ico (usando 32x32)
  const faviconPath = join(__dirname, "..", "public", "favicon.ico");
  await sharp(Buffer.from(svgIcon)).resize(32, 32).png().toFile(faviconPath);
  console.log("✓ favicon.ico");

  // Gerar apple-touch-icon
  const appleTouchPath = join(
    __dirname,
    "..",
    "public",
    "apple-touch-icon.png"
  );
  await sharp(Buffer.from(svgIcon)).resize(180, 180).png().toFile(appleTouchPath);
  console.log("✓ apple-touch-icon.png");

  console.log("\nTodos os ícones foram gerados com sucesso!");
}

generateIcons().catch(console.error);
