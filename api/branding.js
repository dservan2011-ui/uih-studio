/**
 * api/branding.js — UIH Studio
 * Genera imágenes con OpenAI y aplica branding institucional UIH.
 */

import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.resolve(__dirname, "../uih-assets");

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function circularCrop(imagePath, diameter) {
  const r = Math.floor(diameter / 2);

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

function footerSVG(width, height) {
  const footerH = Math.round(height * 0.13);
  const y = height - footerH;

  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="footerGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#032548" stop-opacity="0.96"/>
          <stop offset="55%" stop-color="#0B4F6C" stop-opacity="0.92"/>
          <stop offset="100%" stop-color="#017590" stop-opacity="0.90"/>
        </linearGradient>
      </defs>

      <rect x="0" y="${y}" width="${width}" height="${footerH}" fill="url(#footerGrad)"/>

      <text x="${Math.round(width * 0.055)}" y="${y + Math.round(footerH * 0.38)}"
        font-family="Arial, sans-serif"
        font-size="${Math.round(width * 0.026)}"
        font-weight="800"
        fill="#FFFFFF"
        letter-spacing="2">
        www.uih.mx
      </text>

      <text x="${Math.round(width * 0.055)}" y="${y + Math.round(footerH * 0.67)}"
        font-family="Arial, sans-serif"
        font-size="${Math.round(width * 0.019)}"
        font-weight="700"
        fill="#A9BECF"
        letter-spacing="1">
        COFEPRIS 25020222002A00159
      </text>

      <text x="${Math.round(width * 0.63)}" y="${y + Math.round(footerH * 0.36)}"
        font-family="Arial, sans-serif"
        font-size="${Math.round(width * 0.019)}"
        font-weight="800"
        fill="#46EFF4"
        letter-spacing="2">
        AGENDA TU CITA
      </text>

      <text x="${Math.round(width * 0.63)}" y="${y + Math.round(footerH * 0.72)}"
        font-family="Arial, sans-serif"
        font-size="${Math.round(width * 0.034)}"
        font-weight="900"
        fill="#FFFFFF">
        664-628-2202
      </text>
    </svg>`
  );
}

function subtleWatermarkSVG(width, height) {
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text x="${width / 2}" y="${height / 2}"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family="Arial, sans-serif"
        font-size="${Math.round(width * 0.16)}"
        font-weight="900"
        fill="#46EFF4"
        opacity="0.045"
        letter-spacing="12">
        UIH
      </text>
    </svg>`
  );
}

export async function applyUIHBranding(input, outputPath, opts = {}) {
  const {
    includeLogo = true,
    includeDoctor = true,
    includeFooter = true,
    includeWatermark = true,
  } = opts;

  const base = sharp(input).png();
  const { width, height } = await base.metadata();
  const layers = [];

  if (includeWatermark) {
    layers.push({
      input: subtleWatermarkSVG(width, height),
      top: 0,
      left: 0,
    });
  }

  if (includeLogo) {
    const logoFile = path.join(ASSETS, "logo-uih.png");

    if (await fileExists(logoFile)) {
      const logoW = Math.round(width * 0.20);
      const margin = Math.round(width * 0.055);

      const logoBuf = await sharp(logoFile)
        .resize(logoW, null, { fit: "inside" })
        .png()
        .toBuffer();

      layers.push({
        input: logoBuf,
        top: margin,
        left: margin,
      });
    } else {
      console.warn("[UIH/branding] No existe assets/logo-uih.png. Se omite logo.");
    }
  }

  if (includeDoctor) {
    const doctorFile = path.join(ASSETS, "dr-servin.png");

    if (await fileExists(doctorFile)) {
      const size = Math.round(width * 0.13);
      const margin = Math.round(width * 0.045);
      const border = 6;

      const borderBuf = Buffer.from(
        `<svg viewBox="0 0 ${size + border * 2} ${size + border * 2}" xmlns="http://www.w3.org/2000/svg">
          <circle cx="${size / 2 + border}" cy="${size / 2 + border}" r="${size / 2 + border}" fill="#F6FBFB" opacity="0.95"/>
          <circle cx="${size / 2 + border}" cy="${size / 2 + border}" r="${size / 2 + border - 2}" fill="none" stroke="#46EFF4" stroke-width="3" opacity="0.9"/>
        </svg>`
      );

      const doctorBuf = await circularCrop(doctorFile, size);

      layers.push({
        input: borderBuf,
        top: margin - border,
        left: width - size - margin - border,
      });

      layers.push({
        input: doctorBuf,
        top: margin,
        left: width - size - margin,
      });
    } else {
      console.warn("[UIH/branding] No existe assets/dr-servin.png. Se omite foto del doctor.");
    }
  }

  if (includeFooter) {
    layers.push({
      input: footerSVG(width, height),
      top: 0,
      left: 0,
    });
  }

  const result = await base.composite(layers).png().toBuffer();

  if (outputPath) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, result);
    console.log(`[UIH/branding] Imagen guardada: ${outputPath}`);
  }

  return result;
}

export async function generateBrandedImage(prompt, outputPath) {
  const { default: OpenAI } = await import("openai");

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Falta OPENAI_API_KEY en Render.");
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

const finalPrompt = `
${prompt}

Crear ÚNICAMENTE un fondo médico premium para UIH — Unidad Integral Homeopática.
No incluir personas.
No incluir doctores.
No incluir pacientes.
No generar rostros humanos.
No generar cuerpos humanos.
No generar manos humanas.
No crear médicos ficticios.
No usar texto dentro de la imagen base.

La imagen debe ser un escenario clínico moderno, elegante y profesional:
consultorio médico premium, escritorio médico, iluminación navy, teal y aqua,
sensación de tecnología, confianza médica, limpieza, orden y atención integral.

El sistema agregará después el logo UIH, datos institucionales y la foto real del Dr. Luis Alfonso Servín Villanueva.
Evitar imágenes exageradas, irreales, sensacionalistas o con promesas médicas.
`;

  console.log("[UIH/image] Generando imagen con OpenAI...");

  const response = await openai.images.generate({
    model: "gpt-image-1",
    prompt: finalPrompt,
    size: "1024x1536",
    quality: "high",
    n: 1,
  });

  const b64 = response?.data?.[0]?.b64_json;

  if (!b64) {
    throw new Error("OpenAI no devolvió imagen en base64.");
  }

  const imageBuffer = Buffer.from(b64, "base64");

  console.log("[UIH/image] Aplicando branding UIH...");

  return applyUIHBranding(imageBuffer, outputPath, {
    includeLogo: true,
    includeDoctor: true,
    includeFooter: true,
    includeWatermark: true,
  });
}
