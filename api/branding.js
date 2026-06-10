/**
 * api/branding.js — UIH Studio
 * Genera imagen con OpenAI y luego superpone branding UIH:
 * - Logo UIH
 * - Foto real del Dr. Servín
 * - Panel informativo profesional
 * - CTA
 *
 * Pensado para posts verticales tipo Instagram 1080x1350 aprox.
 */

import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Busca assets primero en /uih-assets y luego en /assets
 * porque en tu repo ahorita los subiste a uih-assets.
 */
async function resolveAsset(filename) {
  const candidates = [
    path.resolve(__dirname, "../uih-assets", filename),
    path.resolve(__dirname, "../assets", filename),
  ];

  for (const file of candidates) {
    try {
      await fs.access(file);
      return file;
    } catch (_) {}
  }

  throw new Error(`No se encontró el asset: ${filename}`);
}

/* ────────────────────────────────────────────────────────────── */
/* Helpers                                                       */
/* ────────────────────────────────────────────────────────────── */

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

function fitBulletLines(items = [], maxChars = 34, maxLinesPerBullet = 2) {
  const out = [];
  for (const item of items) {
    const lines = splitText(item, maxChars).slice(0, maxLinesPerBullet);
    out.push(lines);
  }
  return out;
}

async function circularCrop(imagePath, diameter) {
  const r = Math.floor(diameter / 2);

  const mask = Buffer.from(
    `<svg width="${diameter}" height="${diameter}" viewBox="0 0 ${diameter} ${diameter}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${r}" cy="${r}" r="${r}" fill="white"/>
    </svg>`
  );

  return sharp(imagePath)
    .resize(diameter, diameter, { fit: "cover", position: "top" })
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

function inferCopyFromPrompt(prompt = "") {
  const p = prompt.toLowerCase();

  if (p.includes("consulta de primera vez")) {
    return {
      title: "CONSULTA DE PRIMERA VEZ",
      subtitle: "Atención médica integral, personalizada y profesional.",
      bullets: [
        "Historia clínica completa",
        "Escáner intersticial",
        "Medicamento homeopático por un mes",
        "Seguimiento personalizado",
      ],
      ctaLabel: "Agenda tu cita",
      ctaPhone: "664-628-2202",
    };
  }

  if (p.includes("subsecuente")) {
    return {
      title: "CONSULTA SUBSECUENTE",
      subtitle: "Seguimiento médico para continuar tu programa de atención.",
      bullets: [
        "Valoración de evolución",
        "Ajuste de tratamiento",
        "Seguimiento personalizado",
      ],
      ctaLabel: "Agenda tu seguimiento",
      ctaPhone: "664-628-2202",
    };
  }

  if (p.includes("epigenetica") || p.includes("epigenética")) {
    return {
      title: "ESTUDIO EPIGENÉTICO",
      subtitle: "Valoración con muestra de cabello para apoyo en tu plan integral.",
      bullets: [
        "Adultos, niños y deportistas",
        "Enfoque complementario",
        "Orientación personalizada",
      ],
      ctaLabel: "Solicita información",
      ctaPhone: "664-628-2202",
    };
  }

  if (p.includes("suero") || p.includes("intravenoso")) {
    return {
      title: "SUEROS INTRAVENOSOS",
      subtitle: "Aplicación bajo valoración médica previa y enfoque seguro.",
      bullets: [
        "Vitaminados",
        "Apoyo desinflamatorio",
        "Opciones según valoración",
      ],
      ctaLabel: "Solicita valoración",
      ctaPhone: "664-628-2202",
    };
  }

  if (p.includes("video llamada") || p.includes("videollamada")) {
    return {
      title: "CONSULTA POR VIDEOLLAMADA",
      subtitle: "Una alternativa cómoda y segura para pacientes que no pueden acudir.",
      bullets: [
        "Historia clínica completa",
        "Revisión de resultados",
        "Plan de tratamiento y seguimiento",
      ],
      ctaLabel: "Agenda por WhatsApp",
      ctaPhone: "664-628-2202",
    };
  }

  if (p.includes("hidroterapia de colon")) {
    return {
      title: "HIDROTERAPIA DE COLON",
      subtitle: "Procedimiento realizado bajo valoración y respeto médico.",
      bullets: [
        "Equipo especializado",
        "Procedimiento guiado",
        "Valoración previa indispensable",
      ],
      ctaLabel: "Pide informes",
      ctaPhone: "664-628-2202",
    };
  }

  if (p.includes("terapia neural")) {
    return {
      title: "TERAPIA NEURAL",
      subtitle: "Enfoque complementario aplicado bajo valoración médica.",
      bullets: [
        "Valoración individual",
        "Atención profesional",
        "Seguimiento personalizado",
      ],
      ctaLabel: "Solicita valoración",
      ctaPhone: "664-628-2202",
    };
  }

  return {
    title: "ATENCIÓN MÉDICA INTEGRAL",
    subtitle: "Enfoque profesional, ético y personalizado para cada paciente.",
    bullets: [
      "Valoración médica completa",
      "Tratamiento individualizado",
      "Seguimiento personalizado",
    ],
    ctaLabel: "Agenda tu cita",
    ctaPhone: "664-628-2202",
  };
}

function buildOverlaySVG(width, height, data = {}) {
  const {
    title = "ATENCIÓN MÉDICA INTEGRAL",
    subtitle = "Enfoque profesional, ético y personalizado para cada paciente.",
    bullets = [],
    ctaLabel = "Agenda tu cita",
    ctaPhone = "664-628-2202",
    website = "www.uih.mx",
    cofepris = "COFEPRIS 25020222002A00159",
  } = data;

  const titleLines = splitText(title, 24).slice(0, 2);
  const subtitleLines = splitText(subtitle, 40).slice(0, 3);
  const bulletLines = fitBulletLines(bullets, 34, 2);

  const leftPad = Math.round(width * 0.06);
  const panelH = Math.round(height * 0.28);
  const panelY = height - panelH;

  const logoBoxX = leftPad;
  const textX = leftPad;
  let cursorY = panelY + 60;

  let titleSvg = "";
  for (const line of titleLines) {
    titleSvg += `
      <text x="${textX}" y="${cursorY}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${Math.round(width * 0.040)}"
        font-weight="700"
        fill="#FFFFFF">${escapeXML(line)}</text>
    `;
    cursorY += Math.round(width * 0.050);
  }

  cursorY += 8;

  let subtitleSvg = "";
  for (const line of subtitleLines) {
    subtitleSvg += `
      <text x="${textX}" y="${cursorY}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${Math.round(width * 0.022)}"
        font-weight="400"
        fill="#D9EEF6">${escapeXML(line)}</text>
    `;
    cursorY += Math.round(width * 0.030);
  }

  cursorY += 12;

  let bulletsSvg = "";
  const bulletFont = Math.round(width * 0.020);
  const bulletGap = Math.round(width * 0.028);

  for (const group of bulletLines.slice(0, 4)) {
    const first = group[0] || "";
    bulletsSvg += `
      <circle cx="${textX + 8}" cy="${cursorY - 5}" r="4" fill="#46EFF4"/>
      <text x="${textX + 24}" y="${cursorY}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${bulletFont}"
        fill="#FFFFFF">${escapeXML(first)}</text>
    `;
    cursorY += bulletGap;

    if (group[1]) {
      bulletsSvg += `
        <text x="${textX + 24}" y="${cursorY}"
          font-family="Arial, Helvetica, sans-serif"
          font-size="${bulletFont}"
          fill="#FFFFFF">${escapeXML(group[1])}</text>
      `;
      cursorY += bulletGap;
    }
  }

  const ctaW = Math.round(width * 0.28);
  const ctaH = Math.round(height * 0.075);
  const ctaX = width - ctaW - leftPad;
  const ctaY = height - ctaH - Math.round(height * 0.035);

  return Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="panelGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#032548" stop-opacity="0.92"/>
          <stop offset="100%" stop-color="#0B4F6C" stop-opacity="0.88"/>
        </linearGradient>

        <linearGradient id="ctaGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#017590"/>
          <stop offset="100%" stop-color="#41AAD4"/>
        </linearGradient>
      </defs>

      <!-- Sombra superior ligera -->
      <rect x="0" y="${panelY - 20}" width="${width}" height="${panelH + 20}" fill="url(#panelGrad)"/>

      <!-- Línea de acento -->
      <rect x="${leftPad}" y="${panelY + 26}" width="${Math.round(width * 0.18)}" height="6" rx="3" fill="#46EFF4"/>

      ${titleSvg}
      ${subtitleSvg}
      ${bulletsSvg}

      <!-- CTA -->
      <rect x="${ctaX}" y="${ctaY}" width="${ctaW}" height="${ctaH}" rx="18" fill="url(#ctaGrad)"/>
      <text x="${ctaX + ctaW / 2}" y="${ctaY + 34}"
        text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${Math.round(width * 0.020)}"
        font-weight="700"
        fill="#FFFFFF">${escapeXML(ctaLabel.toUpperCase())}</text>

      <text x="${ctaX + ctaW / 2}" y="${ctaY + 68}"
        text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${Math.round(width * 0.030)}"
        font-weight="700"
        fill="#FFFFFF">${escapeXML(ctaPhone)}</text>

      <!-- Footer -->
      <text x="${leftPad}" y="${height - 28}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${Math.round(width * 0.016)}"
        fill="#B8D4E0">${escapeXML(website)}</text>

      <text x="${leftPad}" y="${height - 8}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${Math.round(width * 0.012)}"
        fill="#9EC0CF">${escapeXML(cofepris)}</text>
    </svg>
  `);
}

/* ────────────────────────────────────────────────────────────── */
/* Branding principal                                            */
/* ────────────────────────────────────────────────────────────── */

export async function applyUIHBranding(input, outputPath, opts = {}) {
  const defaults = inferCopyFromPrompt(opts.prompt || "");

  const settings = {
    includeLogo: true,
    includeDoctor: true,
    includeOverlay: true,
    title: opts.title || defaults.title,
    subtitle: opts.subtitle || defaults.subtitle,
    bullets: opts.bullets || defaults.bullets,
    ctaLabel: opts.ctaLabel || defaults.ctaLabel,
    ctaPhone: opts.ctaPhone || defaults.ctaPhone,
    website: opts.website || "www.uih.mx",
    cofepris: opts.cofepris || "COFEPRIS 25020222002A00159",
    ...opts,
  };

  const base = sharp(input);
  const meta = await base.metadata();

  const width = meta.width || 1024;
  const height = meta.height || 1536;

  const layers = [];

  /* Logo */
  if (settings.includeLogo) {
    const logoFile = await resolveAsset("logo-uih.png");
    const logoW = Math.round(width * 0.18);
    const margin = Math.round(width * 0.05);

    const logoBuf = await sharp(logoFile)
      .resize(logoW, logoW, { fit: "contain" })
      .png()
      .toBuffer();

    layers.push({
      input: logoBuf,
      left: margin,
      top: margin,
    });
  }

  /* Foto doctor */
  if (settings.includeDoctor) {
    const doctorFile = await resolveAsset("dr-servin.png");

    const size = Math.round(width * 0.20); // antes estaba muy chica
    const margin = Math.round(width * 0.05);
    const border = Math.max(6, Math.round(width * 0.006));

    const doctorBuf = await circularCrop(doctorFile, size);

    const borderBuf = Buffer.from(`
      <svg width="${size + border * 2}" height="${size + border * 2}" viewBox="0 0 ${size + border * 2} ${size + border * 2}" xmlns="http://www.w3.org/2000/svg">
        <circle
          cx="${(size + border * 2) / 2}"
          cy="${(size + border * 2) / 2}"
          r="${size / 2 + border - 1}"
          fill="#FFFFFF"
          opacity="0.95"
        />
        <circle
          cx="${(size + border * 2) / 2}"
          cy="${(size + border * 2) / 2}"
          r="${size / 2 + border - 5}"
          fill="none"
          stroke="#46EFF4"
          stroke-width="4"
          opacity="0.95"
        />
      </svg>
    `);

    const left = width - size - border * 2 - margin;
    const top = margin;

    layers.push({
      input: borderBuf,
      left,
      top,
    });

    layers.push({
      input: doctorBuf,
      left: left + border,
      top: top + border,
    });
  }

  /* Panel con texto */
  if (settings.includeOverlay) {
    const overlaySvg = buildOverlaySVG(width, height, settings);
    layers.push({
      input: overlaySvg,
      left: 0,
      top: 0,
    });
  }

  const result = await base.composite(layers).png().toBuffer();

  if (outputPath) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, result);
    console.log(`[UIH] ✓ Imagen guardada: ${outputPath}`);
  }

  return result;
}

/* ────────────────────────────────────────────────────────────── */
/* Generación de imagen con OpenAI                               */
/* ────────────────────────────────────────────────────────────── */

export async function generateBrandedImage(prompt, outputPath, opts = {}) {
  const { default: OpenAI } = await import("openai");

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Falta OPENAI_API_KEY en variables de entorno.");
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const enhancedPrompt = `
${prompt}

Genera una imagen fotográfica vertical, muy realista y profesional.
Debe verse como consultorio médico real, elegante y humano.
Evita estilo futurista, ciencia ficción, luces exageradas o render 3D.
Usa ambiente clínico real, limpio, profesional y cálido.
Paleta visual acorde a UIH: navy, teal, aqua, blanco.
Si aparece un consultorio, que se vea moderno pero realista.
Si aparece personal médico, que luzca profesional y natural.
Deja espacio visual limpio en la parte inferior para agregar información comercial.
No incrustes títulos publicitarios dentro de la escena.
Calidad alta, composición premium, apariencia editorial.
`;

  console.log("[UIH] Generando imagen con OpenAI...");

  const response = await openai.images.generate({
    model: "gpt-image-1",
    prompt: enhancedPrompt,
    size: "1024x1536",
    quality: "high",
    n: 1,
  });

  const imageBuffer = Buffer.from(response.data[0].b64_json, "base64");

  console.log("[UIH] Aplicando branding UIH...");

  return applyUIHBranding(imageBuffer, outputPath, {
    ...opts,
    prompt,
  });
}
