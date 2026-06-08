/**
 * api/branding.js — UIH Studio
 * Superpone logo UIH y foto del Dr. Servín sobre imágenes generadas por OpenAI.
 */

import sharp from "sharp";
import path  from "path";
import fs    from "fs/promises";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS    = path.resolve(__dirname, "../assets");

async function circularCrop(imagePath, diameter) {
  const r   = Math.floor(diameter / 2);
  const mask = Buffer.from(
    `<svg viewBox="0 0 ${diameter} ${diameter}" xmlns="http://www.w3.org/2000/svg">
       <circle cx="${r}" cy="${r}" r="${r}" fill="white"/>
     </svg>`
  );
  return sharp(imagePath)
    .resize(diameter, diameter, { fit: "cover", position: "top" })
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

function watermarkSVG(width, height) {
  const fontSize = Math.max(14, Math.round(width * 0.016));
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
       <text x="${width / 2}" y="${height - 16}"
         text-anchor="middle"
         font-family="Arial, sans-serif"
         font-size="${fontSize}"
         fill="white"
         opacity="0.22"
       >UIH — Unidad Integral Homeopática · uih-studio.onrender.com</text>
     </svg>`
  );
}

export async function applyUIHBranding(input, outputPath, opts = {}) {
  const {
    includeLogo      = true,
    includeDoctor    = true,
    includeWatermark = true,
  } = opts;

  const base              = sharp(input);
  const { width, height } = await base.metadata();
  const layers            = [];

  if (includeLogo) {
    const logoFile = path.join(ASSETS, "logo-uih.png");
    const logoW    = Math.round(width * 0.12);
    const margin   = Math.round(width * 0.02);
    const logoBuf  = await sharp(logoFile).resize(logoW, null, { fit: "inside" }).toBuffer();
    const logoMeta = await sharp(logoBuf).metadata();
    layers.push({
      input: logoBuf,
      top:   height - logoMeta.height - margin,
      left:  width  - logoMeta.width  - margin,
    });
  }

  if (includeDoctor) {
    const doctorFile = path.join(ASSETS, "dr-servin.png");
    const size       = Math.round(width * 0.07);
    const margin     = Math.round(width * 0.015);
    const border     = 4;
    const borderBuf  = Buffer.from(
      `<svg viewBox="0 0 ${size + border * 2} ${size + border * 2}" xmlns="http://www.w3.org/2000/svg">
         <circle cx="${size/2 + border}" cy="${size/2 + border}" r="${size/2 + border}"
                 fill="white" opacity="0.9"/>
       </svg>`
    );
    const doctorBuf = await circularCrop(doctorFile, size);
    layers.push({ input: borderBuf, top: margin - border, left: margin - border });
    layers.push({ input: doctorBuf, top: margin,          left: margin          });
  }

  if (includeWatermark) {
    layers.push({ input: watermarkSVG(width, height), top: 0, left: 0 });
  }

  const result = await base.composite(layers).png().toBuffer();

  if (outputPath) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, result);
    console.log(`[UIH] ✓ Imagen guardada: ${outputPath}`);
  }

  return result;
}

export async function generateBrandedImage(prompt, outputPath) {
  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  console.log("[UIH] Generando imagen con OpenAI gpt-image-1...");
  const response = await openai.images.generate({
    model:   "gpt-image-1",
    prompt:  `${prompt}. Estilo médico profesional, alta resolución, composición limpia.`,
    size:    "1792x1024",
    quality: "high",
    n:       1,
  });

  const imageBuffer = Buffer.from(response.data[0].b64_json, "base64");

  console.log("[UIH] Aplicando branding UIH...");
  return applyUIHBranding(imageBuffer, outputPath);
}