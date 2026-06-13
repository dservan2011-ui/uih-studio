/**
 * api/branding.js — UIH Studio
 * Branding real con fotos del consultorio + logo + foto del Dr. Servín
 * Diseño vertical tipo post premium 1080x1350
 */

import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.resolve(__dirname, "../uih-assets");

const BRAND = {
  navy: "#032548",
  navyDeep: "#132249",
  teal: "#017590",
  tealDark: "#0B4F6C",
  aqua: "#46EFF4",
  cyan: "#41AAD4",
  white: "#F6F9FB",
  gray: "#C7D3DB",
  graySoft: "#9AA8B2"
};

const CANVAS = {
  width: 1080,
  height: 1350
};

const EXCLUDE_FILES = new Set([
  ".gitkeep",
  "dr-servin.png",
  "logo-uih.png"
]);

/* =========================================================
   HELPERS
========================================================= */

function escapeXml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(text = "", maxChars = 36) {
  const words = String(text).split(/\s+/).filter(Boolean);
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

function chunkBullets(items = [], maxChars = 34) {
  const out = [];
  for (const item of items) {
    const lines = wrapText(item, maxChars);
    out.push(lines);
  }
  return out;
}

function sanitizeFilename(name = "uih-post.png") {
  return String(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

async function circularCrop(imagePath, diameter) {
  const r = Math.floor(diameter / 2);
  const mask = Buffer.from(
    `<svg width="${diameter}" height="${diameter}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${r}" cy="${r}" r="${r}" fill="white"/>
    </svg>`
  );

  return sharp(imagePath)
    .resize(diameter, diameter, { fit: "cover", position: "center" })
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

function makeCircleBorder(diameter, border = 8) {
  const total = diameter + border * 2;
  const radius = total / 2;

  return Buffer.from(
    `<svg width="${total}" height="${total}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${radius}" cy="${radius}" r="${radius - 2}"
        fill="rgba(255,255,255,0.95)"
        stroke="${BRAND.aqua}"
        stroke-width="${border}"/>
    </svg>`
  );
}

async function getBackgroundFiles() {
  const files = await fs.readdir(ASSETS);
  return files.filter((file) => {
    const lower = file.toLowerCase();

    if (EXCLUDE_FILES.has(file)) return false;
    if (lower === "assets") return false;

    return [".jpg", ".jpeg", ".png", ".webp"].some((ext) => lower.endsWith(ext));
  });
}

function chooseBackground(files, preferredName = null) {
  if (!files.length) {
    throw new Error("No hay fotos de fondo en uih-assets.");
  }

  if (preferredName && files.includes(preferredName)) {
    return preferredName;
  }

  // Random real para que NO salga siempre la misma foto
  const index = Math.floor(Math.random() * files.length);
  return files[index];
}

function getThemeContent(prompt = "") {
  const p = String(prompt).toLowerCase();

  if (p.includes("consulta") && p.includes("primera")) {
    return {
      title: "CONSULTA DE PRIMERA VEZ",
      subtitle: "Atención médica integral, personalizada y enfocada en comprender al paciente más allá del síntoma.",
      bullets: [
        "Historia clínica completa",
        "Escáner intersticial",
        "Medicamento homeopático por un mes",
        "Seguimiento médico personalizado"
      ],
      cta: "AGENDA TU CITA",
      phone: "664-628-2202",
      website: "www.uih.mx",
      footer: "COFEPRIS 25020222002A00159"
    };
  }

  if (p.includes("tdah") || p.includes("déficit") || p.includes("deficit")) {
    return {
      title: "TDAH / DÉFICIT DE ATENCIÓN",
      subtitle: "Abordaje integral con valoración médica, enfoque personalizado y seguimiento profesional.",
      bullets: [
        "Valoración individual del paciente",
        "Tratamiento homeopático personalizado",
        "Seguimiento continuo",
        "Orientación integral a la familia"
      ],
      cta: "SOLICITA INFORMES",
      phone: "664-628-2202",
      website: "www.uih.mx",
      footer: "COFEPRIS 25020222002A00159"
    };
  }

  if (p.includes("epigenet")) {
    return {
      title: "EPIGENÉTICA",
      subtitle: "Herramienta complementaria para un enfoque integral y personalizado del bienestar.",
      bullets: [
        "Valoración integral",
        "Enfoque personalizado",
        "Seguimiento profesional",
        "Atención continua"
      ],
      cta: "AGENDA TU CITA",
      phone: "664-628-2202",
      website: "www.uih.mx",
      footer: "COFEPRIS 25020222002A00159"
    };
  }

  return {
    title: "UNIDAD INTEGRAL HOMEOPÁTICA",
    subtitle: "Atención médica integral, personalizada y con seguimiento profesional.",
    bullets: [
      "Valoración médica",
      "Enfoque personalizado",
      "Seguimiento continuo",
      "Atención profesional"
    ],
    cta: "AGENDA TU CITA",
    phone: "664-628-2202",
    website: "www.uih.mx",
    footer: "COFEPRIS 25020222002A00159"
  };
}

function makeOverlaySvg(content, bgFileName = "") {
  const { width, height } = CANVAS;

  const titleLines = wrapText(content.title, 24);
  const subtitleLines = wrapText(content.subtitle, 46);
  const bullets = chunkBullets(content.bullets, 34);

  let titleTspans = "";
  let titleY = 1028;
  titleLines.forEach((line, i) => {
    titleTspans += `<tspan x="82" y="${titleY + i * 54}">${escapeXml(line)}</tspan>`;
  });

  let subtitleTspans = "";
  const subtitleStart = titleY + titleLines.length * 54 + 26;
  subtitleLines.forEach((line, i) => {
    subtitleTspans += `<tspan x="82" y="${subtitleStart + i * 30}">${escapeXml(line)}</tspan>`;
  });

  let bulletsSvg = "";
  let y = subtitleStart + subtitleLines.length * 30 + 24;

  for (const group of bullets) {
    const first = group[0] || "";
    bulletsSvg += `
      <circle cx="92" cy="${y - 7}" r="4.5" fill="${BRAND.aqua}" />
      <text x="108" y="${y}" font-family="Arial, sans-serif" font-size="24" fill="${BRAND.white}" font-weight="600">
        ${escapeXml(first)}
      </text>
    `;
    y += 34;

    if (group.length > 1) {
      for (let i = 1; i < group.length; i++) {
        bulletsSvg += `
          <text x="108" y="${y}" font-family="Arial, sans-serif" font-size="24" fill="${BRAND.white}" font-weight="600">
            ${escapeXml(group[i])}
          </text>
        `;
        y += 30;
      }
    }
  }

  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fullShade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(3,37,72,0.15)"/>
          <stop offset="55%" stop-color="rgba(3,37,72,0.10)"/>
          <stop offset="100%" stop-color="rgba(3,37,72,0.18)"/>
        </linearGradient>

        <linearGradient id="bottomPanel" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="rgba(3,37,72,0.96)"/>
          <stop offset="100%" stop-color="rgba(1,117,144,0.92)"/>
        </linearGradient>

        <linearGradient id="fadeTop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(3,37,72,0.00)"/>
          <stop offset="100%" stop-color="rgba(3,37,72,0.10)"/>
        </linearGradient>
      </defs>

      <!-- sombreado general -->
      <rect x="0" y="0" width="${width}" height="${height}" fill="url(#fullShade)"/>

      <!-- sombreado suave arriba -->
      <rect x="0" y="0" width="${width}" height="240" fill="url(#fadeTop)"/>

      <!-- panel inferior para tapar letras del fondo -->
      <rect x="0" y="930" width="${width}" height="420" fill="url(#bottomPanel)"/>

      <!-- acento línea -->
      <rect x="82" y="989" width="140" height="6" rx="3" fill="${BRAND.aqua}"/>

      <!-- título -->
      <text font-family="Arial, sans-serif" font-size="58" font-weight="800" fill="${BRAND.white}">
        ${titleTspans}
      </text>

      <!-- subtítulo -->
      <text font-family="Arial, sans-serif" font-size="26" font-weight="500" fill="${BRAND.white}">
        ${subtitleTspans}
      </text>

      <!-- bullets -->
      ${bulletsSvg}

      <!-- botón CTA -->
      <rect x="720" y="1215" width="270" height="86" rx="18" fill="${BRAND.cyan}" opacity="0.98"/>
      <text x="855" y="1246" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="${BRAND.white}">
        ${escapeXml(content.cta)}
      </text>
      <text x="855" y="1280" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="800" fill="${BRAND.white}">
        ${escapeXml(content.phone)}
      </text>

      <!-- footer -->
      <text x="82" y="1276" font-family="Arial, sans-serif" font-size="18" font-weight="600" fill="${BRAND.white}">
        ${escapeXml(content.website)}
      </text>
      <text x="82" y="1303" font-family="Arial, sans-serif" font-size="13" font-weight="500" fill="${BRAND.gray}">
        ${escapeXml(content.footer)}
      </text>

      <!-- etiqueta discreta fondo usado -->
      <text x="995" y="918" text-anchor="end" font-family="Arial, sans-serif" font-size="12" fill="rgba(255,255,255,0.15)">
        ${escapeXml(bgFileName)}
      </text>
    </svg>
  `);
}

/* =========================================================
   BRANDING SIMPLE SOBRE UNA IMAGEN EXISTENTE
========================================================= */

export async function applyUIHBranding(input, outputPath, opts = {}) {
  const {
    includeLogo = true,
    includeDoctor = true,
    includeBottomPanel = true,
    title = "",
    subtitle = "",
    phone = "664-628-2202"
  } = opts;

  const base = sharp(input);
  const meta = await base.metadata();
  const width = meta.width || 1080;
  const height = meta.height || 1350;

  const layers = [];

  // sombreado general
  layers.push({
    input: Buffer.from(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${width}" height="${height}" fill="rgba(3,37,72,0.10)"/>
      </svg>
    `),
    top: 0,
    left: 0
  });

  if (includeBottomPanel) {
    layers.push({
      input: Buffer.from(`
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="panel" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="rgba(3,37,72,0.92)"/>
              <stop offset="100%" stop-color="rgba(1,117,144,0.90)"/>
            </linearGradient>
          </defs>
          <rect x="0" y="${height - 280}" width="${width}" height="280" fill="url(#panel)"/>
        </svg>
      `),
      top: 0,
      left: 0
    });
  }

  if (includeLogo) {
    const logoPath = path.join(ASSETS, "logo-uih.png");
    const logoBuf = await sharp(logoPath)
      .resize(Math.round(width * 0.20), Math.round(width * 0.20), { fit: "inside" })
      .png()
      .toBuffer();

    layers.push({
      input: logoBuf,
      top: Math.round(height * 0.05),
      left: Math.round(width * 0.05)
    });
  }

  if (includeDoctor) {
    const doctorPath = path.join(ASSETS, "dr-servin.png");
    const size = Math.round(width * 0.18);
    const border = 8;

    const doctorBuf = await circularCrop(doctorPath, size);
    const borderBuf = makeCircleBorder(size, border);

    layers.push({
      input: borderBuf,
      top: Math.round(height * 0.05) - border,
      left: width - size - Math.round(width * 0.05) - border
    });

    layers.push({
      input: doctorBuf,
      top: Math.round(height * 0.05),
      left: width - size - Math.round(width * 0.05)
    });
  }

  if (title || subtitle) {
    const t = escapeXml(title);
    const s = escapeXml(subtitle);

    layers.push({
      input: Buffer.from(`
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <text x="60" y="${height - 200}" font-family="Arial, sans-serif" font-size="48" font-weight="800" fill="${BRAND.white}">
            ${t}
          </text>
          <text x="60" y="${height - 150}" font-family="Arial, sans-serif" font-size="24" font-weight="500" fill="${BRAND.white}">
            ${s}
          </text>
          <rect x="${width - 260}" y="${height - 120}" width="220" height="70" rx="16" fill="${BRAND.cyan}" />
          <text x="${width - 150}" y="${height - 92}" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="${BRAND.white}">
            AGENDA TU CITA
          </text>
          <text x="${width - 150}" y="${height - 65}" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="800" fill="${BRAND.white}">
            ${escapeXml(phone)}
          </text>
        </svg>
      `),
      top: 0,
      left: 0
    });
  }

  const result = await base.composite(layers).png().toBuffer();

  if (outputPath) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, result);
    console.log(`[UIH] ✓ Imagen con branding guardada: ${outputPath}`);
  }

  return result;
}

/* =========================================================
   GENERADOR PRINCIPAL: USA FOTOS REALES DEL CONSULTORIO
========================================================= */

export async function generateBrandedImage(prompt, outputPath, opts = {}) {
  const {
    backgroundName = null
  } = opts;

  const bgFiles = await getBackgroundFiles();
  const selectedBg = chooseBackground(bgFiles, backgroundName);

  const backgroundPath = path.join(ASSETS, selectedBg);
  const doctorPath = path.join(ASSETS, "dr-servin.png");
  const logoPath = path.join(ASSETS, "logo-uih.png");

  const content = getThemeContent(prompt);

  console.log(`[UIH] Fondo seleccionado: ${selectedBg}`);

  const background = await sharp(backgroundPath)
    .resize(CANVAS.width, CANVAS.height, {
      fit: "cover",
      position: "attention"
    })
    .png()
    .toBuffer();

  const logoBuf = await sharp(logoPath)
    .resize(185, 185, { fit: "inside" })
    .png()
    .toBuffer();

  const doctorSize = 182;
  const doctorBuf = await circularCrop(doctorPath, doctorSize);
  const doctorBorderBuf = makeCircleBorder(doctorSize, 8);

  const overlaySvg = makeOverlaySvg(content, selectedBg);

  const result = await sharp(background)
    .composite([
      {
        input: logoBuf,
        top: 42,
        left: 54
      },
      {
        input: doctorBorderBuf,
        top: 32,
        left: 844
      },
      {
        input: doctorBuf,
        top: 40,
        left: 852
      },
      {
        input: overlaySvg,
        top: 0,
        left: 0
      }
    ])
    .png()
    .toBuffer();

  if (outputPath) {
    const safeName = sanitizeFilename(path.basename(outputPath));
    const finalPath = path.join(path.dirname(outputPath), safeName);

    await fs.mkdir(path.dirname(finalPath), { recursive: true });
    await fs.writeFile(finalPath, result);

    console.log(`[UIH] ✓ Post real generado: ${finalPath}`);
    return result;
  }

  return result;
}
