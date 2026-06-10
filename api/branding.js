/**
 * api/branding.js — UIH Studio
 * Versión corregida:
 * - NO genera doctores inventados
 * - NO genera pacientes
 * - NO genera resonadores, tomógrafos, quirófanos ni equipo que UIH no usa
 * - NO genera texto dentro de la imagen base
 * - Usa foto real del Dr. Servín
 * - Usa logo real UIH
 * - Si existe foto real del consultorio, la usa primero
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

function escapeXML(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function splitText(text = "", maxChars = 28) {
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

function inferCopyFromPrompt(prompt = "") {
  const p = String(prompt || "").toLowerCase();

  if (p.includes("primera vez") || p.includes("homeopatía personalizada") || p.includes("homeopatia personalizada")) {
    return {
      title: "CONSULTA DE PRIMERA VEZ",
      subtitle: "Atención médica integral y personalizada.",
      bullets: [
        "Historia clínica completa",
        "Escáner intersticial",
        "Medicamento homeopático por un mes",
        "Seguimiento médico personalizado",
      ],
      ctaLabel: "Agenda tu cita",
    };
  }

  if (p.includes("epigen")) {
    return {
      title: "ESTUDIO EPIGENÉTICO",
      subtitle: "Valoración complementaria con muestra de cabello.",
      bullets: [
        "Adultos, niños y deportistas",
        "Orientación personalizada",
        "Apoyo para plan integral",
      ],
      ctaLabel: "Solicita información",
    };
  }

  if (p.includes("suero") || p.includes("iv") || p.includes("intravenoso")) {
    return {
      title: "SUEROS INTRAVENOSOS",
      subtitle: "Aplicación bajo valoración médica previa.",
      bullets: [
        "Protocolos personalizados",
        "Opciones según valoración",
        "Supervisión médica",
      ],
      ctaLabel: "Solicita valoración",
    };
  }

  if (p.includes("hidroterapia") || p.includes("colon")) {
    return {
      title: "HIDROTERAPIA DE COLON",
      subtitle: "Procedimiento con equipo especializado.",
      bullets: [
        "Valoración previa indispensable",
        "Atención profesional",
        "Seguimiento médico",
      ],
      ctaLabel: "Pide informes",
    };
  }

  if (p.includes("regenerativa") || p.includes("células madre") || p.includes("celulas madre")) {
    return {
      title: "MEDICINA REGENERATIVA",
      subtitle: "Enfoque médico individualizado bajo valoración.",
      bullets: [
        "Valoración médica previa",
        "Plan personalizado",
        "Seguimiento profesional",
      ],
      ctaLabel: "Solicita valoración",
    };
  }

  if (p.includes("videollamada") || p.includes("video llamada")) {
    return {
      title: "CONSULTA POR VIDEOLLAMADA",
      subtitle: "Atención médica para pacientes a distancia.",
      bullets: [
        "Historia clínica completa",
        "Revisión de estudios",
        "Plan y seguimiento",
      ],
      ctaLabel: "Agenda por WhatsApp",
    };
  }

  return {
    title: "ATENCIÓN MÉDICA INTEGRAL",
    subtitle: "Enfoque profesional, ético y personalizado.",
    bullets: [
      "Valoración médica completa",
      "Plan individualizado",
      "Seguimiento personalizado",
    ],
    ctaLabel: "Agenda tu cita",
  };
}

function clinicOverlaySVG(width, height) {
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#032548" stop-opacity="0.20"/>
          <stop offset="55%" stop-color="#032548" stop-opacity="0.04"/>
          <stop offset="100%" stop-color="#032548" stop-opacity="0.42"/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${width}" height="${height}" fill="url(#shade)"/>
    </svg>`
  );
}

function infoPanelSVG(width, height, data) {
  const titleLines = splitText(data.title, 24).slice(0, 2);
  const subtitleLines = splitText(data.subtitle, 42).slice(0, 2);
  const bullets = Array.isArray(data.bullets) ? data.bullets.slice(0, 4) : [];

  const panelH = Math.round(height * 0.31);
  const panelY = height - panelH;
  const padX = Math.round(width * 0.055);
  const titleSize = Math.round(width * 0.041);
  const subtitleSize = Math.round(width * 0.023);
  const bulletSize = Math.round(width * 0.020);

  let y = panelY + Math.round(width * 0.075);

  let titleSVG = "";
  for (const line of titleLines) {
    titleSVG += `
      <text x="${padX}" y="${y}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${titleSize}"
        font-weight="900"
        fill="#FFFFFF"
        letter-spacing="1">
        ${escapeXML(line)}
      </text>
    `;
    y += Math.round(width * 0.052);
  }

  y += Math.round(width * 0.012);

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
    y += Math.round(width * 0.033);
  }

  y += Math.round(width * 0.018);

  let bulletSVG = "";
  for (const bullet of bullets) {
    bulletSVG += `
      <circle cx="${padX + 8}" cy="${y - 6}" r="4" fill="#46EFF4"/>
      <text x="${padX + 26}" y="${y}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${bulletSize}"
        font-weight="600"
        fill="#FFFFFF">
        ${escapeXML(bullet)}
      </text>
    `;
    y += Math.round(width * 0.034);
  }

  const ctaW = Math.round(width * 0.31);
  const ctaH = Math.round(height * 0.070);
  const ctaX = width - ctaW - padX;
  const ctaY = height - ctaH - Math.round(height * 0.050);

  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="panelGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#032548" stop-opacity="0.95"/>
          <stop offset="60%" stop-color="#0B4F6C" stop-opacity="0.92"/>
          <stop offset="100%" stop-color="#017590" stop-opacity="0.88"/>
        </linearGradient>
        <linearGradient id="ctaGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#017590"/>
          <stop offset="100%" stop-color="#41AAD4"/>
        </linearGradient>
      </defs>

      <rect x="0" y="${panelY}" width="${width}" height="${panelH}" fill="url(#panelGrad)"/>
      <rect x="${padX}" y="${panelY + 28}" width="${Math.round(width * 0.18)}" height="6" rx="3" fill="#46EFF4"/>

      ${titleSVG}
      ${subtitleSVG}
      ${bulletSVG}

      <rect x="${ctaX}" y="${ctaY}" width="${ctaW}" height="${ctaH}" rx="18" fill="url(#ctaGrad)"/>
      <text x="${ctaX + ctaW / 2}" y="${ctaY + 34}"
        text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${Math.round(width * 0.019)}"
        font-weight="800"
        fill="#FFFFFF">
        ${escapeXML(String(data.ctaLabel || "Agenda tu cita").toUpperCase())}
      </text>
      <text x="${ctaX + ctaW / 2}" y="${ctaY + 70}"
        text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${Math.round(width * 0.031)}"
        font-weight="900"
        fill="#FFFFFF">
        664-628-2202
      </text>

      <text x="${padX}" y="${height - 34}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${Math.round(width * 0.017)}"
        font-weight="700"
        fill="#B8D4E0">
        www.uih.mx
      </text>

      <text x="${padX}" y="${height - 12}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${Math.round(width * 0.012)}"
        font-weight="600"
        fill="#9EC0CF">
        COFEPRIS 25020222002A00159
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
    .sharpen({ sigma: 0.5 })
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

async function createSafeBaseWithOpenAI(prompt) {
  const { default: OpenAI } = await import("openai");

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Falta OPENAI_API_KEY en Render.");
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const safePrompt = `
Crear una imagen vertical realista para fondo publicitario de UIH.

SOLO FONDO DE CONSULTORIO.
NO personas.
NO doctores.
NO pacientes.
NO caras.
NO cuerpos.
NO manos.
NO texto.
NO letras.
NO títulos.
NO logotipos inventados.
NO resonador magnético.
NO tomógrafo.
NO MRI.
NO CT scan.
NO rayos X.
NO quirófano.
NO laboratorio futurista.
NO hologramas.
NO ciencia ficción.
NO equipo hospitalario que no sea de consultorio.

Escena permitida:
consultorio médico realista, sobrio, humano, limpio y ordenado,
pared neutra, escritorio médico, silla de paciente, silla médica,
elementos simples de oficina clínica, iluminación natural o clínica suave,
estética parecida a un consultorio real en Tijuana,
toques discretos de azul marino, teal y blanco,
sin verse lujoso irreal ni tecnológico exagerado.

Debe quedar espacio limpio para colocar textos y branding encima.
Fotografía realista editorial, no render 3D.
`;

  console.log("[UIH/image] Generando fondo seguro sin personas ni equipo falso...");

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
  const copy = inferCopyFromPrompt(prompt);

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

  const logoFile = path.join(ASSETS, "logo-uih.png");
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
  }

  const doctorFile = path.join(ASSETS, "dr-servin.png");
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
  }

  layers.push({
    input: infoPanelSVG(width, height, copy),
    top: 0,
    left: 0,
  });

  const result = await base.composite(layers).png().toBuffer();

  if (outputPath) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, result);
    console.log(`[UIH/branding] Imagen guardada: ${outputPath}`);
  }

  return result;
}

export async function generateBrandedImage(prompt, outputPath, opts = {}) {
  let imageBuffer = await createBaseFromRealClinicPhoto();

  if (!imageBuffer) {
    imageBuffer = await createSafeBaseWithOpenAI(prompt);
  }

  console.log("[UIH/image] Aplicando branding UIH seguro...");

  return applyUIHBranding(imageBuffer, outputPath, {
    ...opts,
    prompt,
  });
}
