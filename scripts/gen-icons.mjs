// Genera los íconos (PWA + favicon) con el logo de Organiasado:
// el ícono "beef" de Lucide en brick-ember sobre fondo jasmine (paleta Ocean Sunset).
// Uso: node scripts/gen-icons.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const BRAND = "#e5383b"; // strawberry-red (logo)
const BG = "#0b090a"; // onyx

// Path del ícono "beef" de Lucide (viewBox 24x24, stroke)
const beef = `
  <circle cx="12.5" cy="8.5" r="2.5"/>
  <path d="M12.5 2a6.5 6.5 0 0 0-6.22 4.6c-1.1 3.13-.78 3.9-3.18 6.08A3 3 0 0 0 5 18c4 0 8.4-1.8 11.4-4.3A6.5 6.5 0 0 0 12.5 2Z"/>
  <path d="m18.5 6 2.19 4.5a6.48 6.48 0 0 1 .31 2 6.49 6.49 0 0 1-2.6 5.2C15.4 20.2 11 22 7 22a3 3 0 0 1-2.68-1.66L2.4 16.5"/>
`;

// scale: cuánto agranda el ícono de 24px. radius: redondeo del fondo.
const svg = ({ scale, radius }) => `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${radius}" fill="${BG}"/>
  <g transform="translate(256 256) scale(${scale}) translate(-12 -12)"
     fill="none" stroke="${BRAND}" stroke-width="1.9"
     stroke-linecap="round" stroke-linejoin="round">
    ${beef}
  </g>
</svg>`;

mkdirSync("public/icons", { recursive: true });

const jobs = [
  { file: "public/icons/icon-192.png", size: 192, scale: 13, radius: 96 },
  { file: "public/icons/icon-512.png", size: 512, scale: 13, radius: 96 },
  // maskable: más padding (safe zone) y fondo a sangre
  { file: "public/icons/icon-512-maskable.png", size: 512, scale: 9.5, radius: 0 },
  { file: "public/icons/apple-touch-icon.png", size: 180, scale: 13, radius: 0 },
  // favicon web (convención app/icon.png de Next.js)
  { file: "app/icon.png", size: 256, scale: 13, radius: 56 },
];

for (const job of jobs) {
  await sharp(Buffer.from(svg(job)))
    .resize(job.size, job.size)
    .png()
    .toFile(job.file);
  console.log("OK", job.file);
}
