/**
 * api/branding.js — UIH Studio
 * Genera imágenes institucionales UIH usando:
 * 1) Fotos reales del consultorio si existen en /uih-assets
 * 2) Fondo realista generado con OpenAI solo si no hay foto real
 * 3) Logo UIH real
 * 4) Foto real del Dr. Servín
 * 5) Footer institucional
 */

import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

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

async function circularCrop(imagePath, diameter) {
  const r = Math.floor(diameter / 2);

  const mask = Buffer.from(
    `<svg viewBox="0 0 ${diameter} ${diameter}" xmlns="http://www.w3.org/2000/svg">
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
        <linearGradient id="topShade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#032548" stop-opacity="0.50"/>
          <stop offset="35%" stop-color="#032548" stop-opacity="0.18"/>
          <stop offset="75%" stop-color="#032548" stop-opacity="0.08"/>
          <stop offset="100%" stop-color="#032548" stop-opacity="0.45"/>
        </linearGradient>

        <linearGradient id="sideShade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#032548" stop-opacity="0.32"/>
          <stop offset="45%" stop-color="#017590" stop-opacity="0.05"/>
          <stop offset="100%" stop-color="#032548" stop-opacity="0.24"/>
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="${width}" height="${height}" fill="url(#topShade)"/>
      <rect x="0" y="0" width="${width}" height="${height}" fill="url(#sideShade)"/>
    </svg>`
  );
}

function footerSVG(width, height) {
  const footerH = Math.round(height * 0.13);
  const y = height - footerH;

  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="footerGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#032548" stop-opacity="0.97"/>
          <stop offset="58%" stop-color="#0B4F6C" stop-opacity="0.94"/>
          <stop offset="100%" stop-color="#017590" stop-opacity="0.92"/>
        </linearGradient>
      </defs>

      <rect x="0" y="${y}" width="${width}" height="${footerH}" fill="url(#footerGrad)"/>

      <text x="${Math.round(width * 0.055)}" y="${y + Math.round(footerH * 0.38)}"
        font-family="Arial, sans-serif"
        font-size="${Math.round(width * 0.026)}"
        font-weight="800"
        fill="#FFFFFF"
        letter-spacing="1.5">
        www.uih.mx
      </text>

      <text x="${Math.round(width * 0.055)}" y="${y + Math.round(footerH * 0.68)}"
        font-family="Arial, sans-serif"
        font-size="${Math.round(width * 0.018)}"
        font-weight="700"
        fill="#A9BECF"
        letter-spacing="1">
        COFEPRIS 25020222002A00159
      </text>

      <text x="${Math.round(width * 0.63)}" y="${y + Math.round(footerH * 0.36)}"
        font-family="Arial, sans-serif"
        font-size="${Math.round(width * 0.018)}"
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

async function createBaseFromRealClinicPhoto() {
  const clinicFile = await findFirstExisting([
    path.join(ASSETS, "consultorio-1.jpg"),
    path.join(ASSETS, "consultorio-1.jpeg"),
    path.join(ASSETS, "consultorio-1.png"),
    path.join(ASSETS, "consultorio.jpg"),
    path.join(ASSETS, "consultorio.jpeg"),
    path.join(ASSETS, "consultorio.png"),
  ]);

  if (!clinicFile) {
    return null;
  }

  console.log(`[UIH/image] Usando foto real del consultorio: ${clinicFile}`);

  const base = await sharp(clinicFile)
    .rotate()
    .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, {
      fit: "cover",
      position: "center",
    })
    .modulate({
      brightness: 0.92,
      saturation: 0.88,
    })
    .sharpen({
      sigma: 0.7,
    })
    .png()
    .toBuffer();

  const composed = await sharp(base)
    .composite([
      {
        input: clinicOverlaySVG(OUTPUT_WIDTH, OUTPUT_HEIGHT),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toBuffer();

  return composed;
}

async function createBaseWithOpenAI(prompt) {
  const { default: OpenAI } = await import("openai");

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Falta OPENAI_API_KEY en Render.");
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const finalPrompt = `
${prompt}

Crear ÚNICAMENTE un fondo médico realista para UIH — Unidad Integral Homeopática.

MUY IMPORTANTE:
No incluir personas.
No incluir doctores.
No incluir pacientes.
No generar rostros humanos.
No generar cuerpos humanos.
No generar manos humanas.
No crear médicos ficticios.
No usar texto dentro de la imagen base.
No crear estilo futurista.
No ciencia ficción.
No hologramas.
No luces exageradas.
No laboratorio tecnológico.
No hospital de lujo irreal.

La imagen debe verse como un consultorio real de medicina integral en Tijuana:
sobrio, profesional, humano, limpio, ordenado, con escritorio médico,
silla, área de consulta, iluminación natural o clínica suave.
Puede tener una ligera estética UIH con tonos navy, teal y aqua,
pero de forma discreta y realista.

El sistema agregará después el logo UIH, datos institucionales y la foto real del Dr. Luis Alfonso Servín Villanueva.
Evitar imágenes exageradas, sensacionalistas o con promesas médicas.
`;

  console.log("[UIH/image] No hay consultorio real. Generando fondo realista con OpenAI...");

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

  return Buffer.from(b64, "base64");
}

export async function applyUIHBranding(input, outputPath, opts = {}) {
  const {
    includeLogo = true,
    includeDoctor = true,
    includeFooter = true,
    includeWatermark = true,
  } = opts;

  const baseBuffer = await sharp(input)
    .rotate()
    .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, {
      fit: "cover",
      position: "center",
    })
    .png()
    .toBuffer();

  const base = sharp(baseBuffer).png();
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
        .rotate()
        .resize(logoW, null, {
          fit: "inside",
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
      console.warn("[UIH/branding] No existe uih-assets/logo-uih.png. Se omite logo.");
    }
  }

  if (includeDoctor) {
    const doctorFile = path.join(ASSETS, "dr-servin.png");

    if (await fileExists(doctorFile)) {
      const size = Math.round(width * 0.23);
      const margin = Math.round(width * 0.035);
      const border = Math.max(8, Math.round(width * 0.006));
      const borderSize = size + border * 2;

      const borderBuf = Buffer.from(
        `<svg viewBox="0 0 ${borderSize} ${borderSize}" xmlns="http://www.w3.org/2000/svg">
          <circle cx="${borderSize / 2}" cy="${borderSize / 2}" r="${borderSize / 2}" fill="#F6FBFB" opacity="0.98"/>
          <circle cx="${borderSize / 2}" cy="${borderSize / 2}" r="${borderSize / 2 - 4}" fill="none" stroke="#46EFF4" stroke-width="4" opacity="0.95"/>
          <circle cx="${borderSize / 2}" cy="${borderSize / 2}" r="${borderSize / 2 - 10}" fill="none" stroke="#017590" stroke-width="2" opacity="0.65"/>
        </svg>`
      );

      const doctorBuf = await circularCrop(doctorFile, size);

      layers.push({
        input: borderBuf,
        top: margin - border,
        left: width - borderSize - margin,
      });

      layers.push({
        input: doctorBuf,
        top: margin,
        left: width - size - margin - border,
      });
    } else {
      console.warn("[UIH/branding] No existe uih-assets/dr-servin.png. Se omite foto del doctor.");
    }
  }

  if (includeFooter) {
    layers.push({
      input: footerSVG(width, height),
      top: 0,
      left: 0,
    });
  }

  const result = await base
    .composite(layers)
    .png()
    .toBuffer();

  if (outputPath) {
    await fs.mkdir(path.dirname(outputPath), {
      recursive: true,
    });

    await fs.writeFile(outputPath, result);

    console.log(`[UIH/branding] Imagen guardada: ${outputPath}`);
  }

  return result;
}

export async function generateBrandedImage(prompt, outputPath) {
  let imageBuffer = await createBaseFromRealClinicPhoto();

  if (!imageBuffer) {
    imageBuffer = await createBaseWithOpenAI(prompt);
  }

  console.log("[UIH/image] Aplicando branding UIH con imagen real del Dr. Servín...");

  return applyUIHBranding(imageBuffer, outputPath, {
    includeLogo: true,
    includeDoctor: true,
    includeFooter: true,
    includeWatermark: true,
  });
}
