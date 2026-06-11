/**
 * api/branding.js — UIH Studio
 *
 * Modo seguro Real UIH:
 * - Prioriza fotos reales del consultorio.
 * - Usa logo real UIH.
 * - Usa foto real del Dr. Servín.
 * - Usa textos aprobados desde config/uihImagePolicy.js.
 * - Evita que la IA genere doctores, pacientes, resonadores o equipo falso.
 */

import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

import {
  uihImagePolicy,
  getUIHServiceVisualCopy,
  buildSafeMedicalImagePrompt,
} from "../config/uihImagePolicy.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.resolve(__dirname, "../uih-assets");

const OUTPUT_WIDTH = 1024;
const OUTPUT_HEIGHT = 1536;

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findFirstExisting(files) {
  for (const file of files) {
    if (await fileExists(file)) return file;
  }
  return null;
}

function escapeXML(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function splitText(text = "", maxChars = 30) {
  const words = String(text).trim().split(/\s+/);
  const lines = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;

    if (test.length <= maxChars) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

async function circularCrop(imagePath, diameter) {
  const r = Math.floor(diameter / 2);

  const mask = Buffer.from(
    `<svg width="${diameter}" height="${diameter}" viewBox="0 0 ${diameter} ${diameter}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${r}" cy="${r}" r="${r}" fill="white"/>
    </svg>`
  );

  return sharp(imagePath)
    .rotate()
    .resize(diameter, diameter, {
      fit: "cover",
      position: "top",
    })
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

function clinicOverlaySVG(width, height) {
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="shadeTop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#032548" stop-opacity="0.26"/>
          <stop offset="45%" stop-color="#032548" stop-opacity="0.06"/>
          <stop offset="72%" stop-color="#032548" stop-opacity="0.16"/>
          <stop offset="100%" stop-color="#032548" stop-opacity="0.72"/>
        </linearGradient>

        <linearGradient id="shadeSide" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#032548" stop-opacity="0.24"/>
          <stop offset="50%" stop-color="#017590" stop-opacity="0.04"/>
          <stop offset="100%" stop-color="#032548" stop-opacity="0.22"/>
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="${width}" height="${height}" fill="url(#shadeTop)"/>
      <rect x="0" y="0" width="${width}" height="${height}" fill="url(#shadeSide)"/>
    </svg>`
  );
}

function watermarkSVG(width, height) {
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text x="${width / 2}" y="${height * 0.45}"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${Math.round(width * 0.15)}"
        font-weight="900"
        fill="#46EFF4"
        opacity="0.035"
        letter-spacing="12">
        UIH
      </text>
    </svg>`
  );
}

function infoPanelSVG(width, height, copy) {
  const title = copy.title || "ATENCIÓN MÉDICA INTEGRAL";
  const subtitle =
    copy.subtitle || "Enfoque profesional, ético y personalizado.";
  const bullets = Array.isArray(copy.bullets) ? copy.bullets.slice(0, 4) : [];
  const ctaLabel = copy.ctaLabel || "Agenda tu cita";

  const panelH = Math.round(height * 0.34);
  const panelY = height - panelH;
  const padX = Math.round(width * 0.055);

  const titleSize = Math.round(width * 0.040);
  const subtitleSize = Math.round(width * 0.022);
  const bulletSize = Math.round(width * 0.019);

  const titleLines = splitText(title, 24).slice(0, 2);
  const subtitleLines = splitText(subtitle, 43).slice(0, 3);

  let y = panelY + Math.round(width * 0.075);

  let titleSVG = "";
  for (const line of titleLines) {
    titleSVG += `
      <text x="${padX}" y="${y}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${titleSize}"
        font-weight="900"
        fill="#FFFFFF"
        letter-spacing="1.2">
        ${escapeXML(line)}
      </text>
    `;
    y += Math.round(width * 0.050);
  }

  y += Math.round(width * 0.010);

  let subtitleSVG = "";
  for (const line of subtitleLines) {
    subtitleSVG += `
      <text x="${padX}" y="${y}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${subtitleSize}"
        font-weight="500"
        fill="#D9EEF6">
        ${escapeXML(line)}
      </text>
    `;
    y += Math.round(width * 0.031);
  }

  y += Math.round(width * 0.018);

  let bulletSVG = "";
  for (const bullet of bullets) {
    const bulletLines = splitText(bullet, 34).slice(0, 2);

    bulletSVG += `
      <circle cx="${padX + 8}" cy="${y - 6}" r="4" fill="#46EFF4"/>
      <text x="${padX + 26}" y="${y}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${bulletSize}"
        font-weight="700"
        fill="#FFFFFF">
        ${escapeXML(bulletLines[0] || "")}
      </text>
    `;

    y += Math.round(width * 0.030);

    if (bulletLines[1]) {
      bulletSVG += `
        <text x="${padX + 26}" y="${y}"
          font-family="Arial, Helvetica, sans-serif"
          font-size="${bulletSize}"
          font-weight="700"
          fill="#FFFFFF">
          ${escapeXML(bulletLines[1])}
        </text>
      `;

      y += Math.round(width * 0.030);
    }
  }

  const ctaW = Math.round(width * 0.32);
  const ctaH = Math.round(height * 0.070);
  const ctaX = width - ctaW - padX;
  const ctaY = height - ctaH - Math.round(height * 0.052);

  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="panelGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#032548" stop-opacity="0.96"/>
          <stop offset="58%" stop-color="#0B4F6C" stop-opacity="0.93"/>
          <stop offset="100%" stop-color="#017590" stop-opacity="0.90"/>
        </linearGradient>

        <linearGradient id="ctaGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#017590"/>
          <stop offset="100%" stop-color="#41AAD4"/>
        </linearGradient>
      </defs>

      <rect x="0" y="${panelY}" width="${width}" height="${panelH}" fill="url(#panelGrad)"/>

      <rect x="${padX}" y="${panelY + 28}" width="${Math.round(
        width * 0.18
      )}" height="6" rx="3" fill="#46EFF4"/>

      ${titleSVG}
      ${subtitleSVG}
      ${bulletSVG}

      <rect x="${ctaX}" y="${ctaY}" width="${ctaW}" height="${ctaH}" rx="18" fill="url(#ctaGrad)"/>

      <text x="${ctaX + ctaW / 2}" y="${ctaY + 34}"
        text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${Math.round(width * 0.018)}"
        font-weight="900"
        fill="#FFFFFF">
        ${escapeXML(String(ctaLabel).toUpperCase())}
      </text>

      <text x="${ctaX + ctaW / 2}" y="${ctaY + 70}"
        text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${Math.round(width * 0.030)}"
        font-weight="900"
        fill="#FFFFFF">
        ${escapeXML(uihImagePolicy.phone)}
      </text>

      <text x="${padX}" y="${height - 38}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${Math.round(width * 0.016)}"
        font-weight="700"
        fill="#B8D4E0">
        ${escapeXML(uihImagePolicy.website)}
      </text>

      <text x="${padX}" y="${height - 16}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${Math.round(width * 0.012)}"
        font-weight="600"
        fill="#9EC0CF">
        ${escapeXML(uihImagePolicy.cofepris)}
      </text>
    </svg>`
  );
}

async function createBaseFromRealClinicPhoto() {
  const clinicFiles = (uihImagePolicy.assets.clinicPhotos || []).map((file) =>
    path.join(ASSETS, file)
  );

  const clinicFile = await findFirstExisting(clinicFiles);

  if (!clinicFile) return null;

  console.log(`[UIH/image] Usando foto real del consultorio: ${clinicFile}`);

  const base = await sharp(clinicFile)
    .rotate()
    .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, {
      fit: "cover",
      position: "center",
    })
    .modulate({
      brightness: 0.94,
      saturation: 0.92,
    })
    .sharpen({
      sigma: 0.5,
    })
    .png()
    .toBuffer();

  return sharp(base)
    .composite([
      {
        input: clinicOverlaySVG(OUTPUT_WIDTH, OUTPUT_HEIGHT),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toBuffer();
}

async function createSafeBaseWithOpenAI(prompt, opts = {}) {
  const { default: OpenAI } = await import("openai");

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Falta OPENAI_API_KEY en Render.");
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const safePrompt = buildSafeMedicalImagePrompt({
    theme: prompt,
    service: opts.service || "",
    engine: "openai",
  });

  console.log(
    "[UIH/image] No hay foto real. Generando fondo seguro con OpenAI..."
  );

  const response = await openai.images.generate({
    model: "gpt-image-1",
    prompt: safePrompt,
    size: "1024x1536",
    quality: "high",
    n: 1,
  });

  const b64 = response?.data?.[0]?.b64_json;

  if (!b64) {
    throw new Error("OpenAI no devolvió imagen en base64.");
  }

  return Buffer.from(b64, "base64");
}

export async function applyUIHBranding(input, outputPath, opts = {}) {
  const prompt = opts.prompt || "";
  const copy = opts.copy || getUIHServiceVisualCopy(prompt);

  const baseBuffer = await sharp(input)
    .rotate()
    .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, {
      fit: "cover",
      position: "center",
    })
    .png()
    .toBuffer();

  const base = sharp(baseBuffer);
  const { width, height } = await base.metadata();

  const layers = [];

  if (opts.includeWatermark) {
    layers.push({
      input: watermarkSVG(width, height),
      top: 0,
      left: 0,
    });
  }

  const logoFile = path.join(ASSETS, uihImagePolicy.assets.logo);

  if (await fileExists(logoFile)) {
    const logoW = Math.round(width * 0.18);
    const margin = Math.round(width * 0.055);

    const logoBuf = await sharp(logoFile)
      .rotate()
      .resize(logoW, logoW, {
        fit: "contain",
        withoutEnlargement: true,
      })
      .png()
      .toBuffer();

    layers.push({
      input: logoBuf,
      top: margin,
      left: margin,
    });
  } else {
    console.warn(`[UIH/branding] No existe logo: ${logoFile}`);
  }

  const doctorFile = path.join(ASSETS, uihImagePolicy.assets.doctor);

  if (await fileExists(doctorFile)) {
    const size = Math.round(width * 0.23);
    const margin = Math.round(width * 0.045);
    const border = Math.max(8, Math.round(width * 0.006));
    const borderSize = size + border * 2;

    const doctorBuf = await circularCrop(doctorFile, size);

    const borderBuf = Buffer.from(
      `<svg width="${borderSize}" height="${borderSize}" viewBox="0 0 ${borderSize} ${borderSize}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${borderSize / 2}" cy="${borderSize / 2}" r="${borderSize / 2}" fill="#F6FBFB" opacity="0.98"/>
        <circle cx="${borderSize / 2}" cy="${borderSize / 2}" r="${borderSize / 2 - 5}" fill="none" stroke="#46EFF4" stroke-width="4" opacity="0.95"/>
        <circle cx="${borderSize / 2}" cy="${borderSize / 2}" r="${borderSize / 2 - 12}" fill="none" stroke="#017590" stroke-width="2" opacity="0.65"/>
      </svg>`
    );

    const left = width - borderSize - margin;
    const top = margin;

    layers.push({
      input: borderBuf,
      top,
      left,
    });

    layers.push({
      input: doctorBuf,
      top: top + border,
      left: left + border,
    });
  } else {
    console.warn(`[UIH/branding] No existe foto doctor: ${doctorFile}`);
  }

  layers.push({
    input: infoPanelSVG(width, height, copy),
    top: 0,
    left: 0,
  });

  const result = await base.composite(layers).png().toBuffer();

  if (outputPath) {
    await fs.mkdir(path.dirname(outputPath), {
      recursive: true,
    });

    await fs.writeFile(outputPath, result);

    console.log(`[UIH/branding] Imagen guardada: ${outputPath}`);
  }

  return result;
}

export async function generateBrandedImage(prompt, outputPath, opts = {}) {
  const copy = getUIHServiceVisualCopy(`${prompt} ${opts.service || ""}`);

  let imageBuffer = await createBaseFromRealClinicPhoto();

  if (!imageBuffer) {
    imageBuffer = await createSafeBaseWithOpenAI(prompt, opts);
  }

  console.log("[UIH/image] Aplicando branding UIH seguro con política visual...");

  return applyUIHBranding(imageBuffer, outputPath, {
    ...opts,
    prompt,
    copy,
    includeWatermark: false,
  });
}
