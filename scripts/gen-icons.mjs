// Genera los íconos PWA (placeholder hasta tener branding definitivo).
// Uso: node scripts/gen-icons.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const svg = (padding) => `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${padding ? 0 : 96}" fill="#ea580c"/>
  <!-- llama estilizada -->
  <path transform="translate(256 280) scale(${padding ? 0.72 : 0.9})" fill="#fff" d="
    M0 -160
    C 40 -110, 90 -80, 90 -10
    C 90 55, 50 105, 0 105
    C -50 105, -90 55, -90 -10
    C -90 -45, -75 -75, -55 -95
    C -55 -60, -40 -45, -25 -45
    C -45 -90, -30 -130, 0 -160 Z"/>
  <circle cx="256" cy="256" r="0" fill="none"/>
</svg>`;

mkdirSync("public/icons", { recursive: true });

const jobs = [
  { file: "public/icons/icon-192.png", size: 192, maskable: false },
  { file: "public/icons/icon-512.png", size: 512, maskable: false },
  { file: "public/icons/icon-512-maskable.png", size: 512, maskable: true },
  { file: "public/icons/apple-touch-icon.png", size: 180, maskable: true },
];

for (const job of jobs) {
  await sharp(Buffer.from(svg(job.maskable)))
    .resize(job.size, job.size)
    .png()
    .toFile(job.file);
  console.log("OK", job.file);
}
