/**
 * branding.js — UIH Studio
 * Superpone logo UIH y foto del Dr. Servín sobre imágenes generadas por OpenAI.
 *
 * Dependencia: npm install sharp
 *
 * Assets requeridos en /public/assets/:
 *   logo-uih.png      — Logo UIH con fondo transparente (PNG)
 *   dr-servin.png     — Foto del Dr. Servín (PNG o JPG)
 */

import sharp from "sharp";
import path  from "path";
import fs    from "fs/promises";

const ASSETS = path.resolve("public/assets");

// ─── Configuración de branding ────────────────────────────────────────────────

const BRAND_CONFIG = {
  logo: {
    file:    "logo-uih.png",
    width:   220,           // px en imagen 1920×1080
    gravity: "southeast",  // esquina inferior derecha
    margin:  32,            // px desde el borde
  },
  doctor: {
    file:    "dr-servin.png",
    size:    130,           // diámetro del círculo
    top:     28,
    left:    28,
  },
  watermark: {
    text:     "UIH — Unidad Integral Homeopática",
    opacity:  0.18,        // sutil pero visible
  },
};

// ─── Helpers internos ─────────────────────────────────────────────────────────

/** Recorta una imagen en círculo y devuelve un Buffer PNG */
async function circularCrop(imagePath, diameter) {
  const r = Math.floor(diameter / 2);
  const circleMask = Buffer.from(
    `<svg viewBox="0 0 ${diameter} ${diameter}" xmlns="http://www.w3.org/2000/svg">
       <circle cx="${r}" cy="${r}" r="${r}" fill="white"/>
     </svg>`
  );

  return sharp(imagePath)
    .resize(diameter, diameter, { fit: "cover", position: "top" })
    .composite([{ input: circleMask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

/** Genera un PNG de texto semitransparente para watermark */
function watermarkSVG(text, width, height) {
  const fontSize = Math.round(width * 0.018);
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
       <text
         x="${width / 2}"
         y="${height - 18}"
         text-anchor="middle"
         font-family="Arial, sans-serif"
         font-size="${fontSize}"
         fill="white"
         opacity="${BRAND_CONFIG.watermark.opacity}"
       >${text}</text>
     </svg>`
  );
}

// ─── Función principal ────────────────────────────────────────────────────────

/**
 * Aplica branding UIH sobre una imagen generada.
 *
 * @param {Buffer|string} input   — Buffer de imagen O ruta al archivo
 * @param {string}        output  — Ruta donde guardar la imagen final
 * @param {object}        opts    — Opciones opcionales
 * @param {boolean}       opts.includeDoctor    — Incluir foto del Dr. Servín (default: true)
 * @param {boolean}       opts.includeLogo      — Incluir logo UIH (default: true)
 * @param {boolean}       opts.includeWatermark — Incluir texto footer (default: true)
 * @returns {Buffer}  — Imagen con branding aplicado
 *
 * @example
 * import { applyUIHBranding } from "./lib/branding.js";
 *
 * // Después de generar con OpenAI:
 * const imageBuffer = await downloadOpenAIImage(url);
 * await applyUIHBranding(imageBuffer, "output/imagen-uih.png");
 */
export async function applyUIHBranding(input, output, opts = {}) {
  const {
    includeDoctor    = true,
    includeLogo      = true,
    includeWatermark = true,
  } = opts;

  const baseImage = sharp(input);
  const { width, height } = await baseImage.metadata();

  const layers = [];

  // 1. Logo UIH — esquina inferior derecha
  if (includeLogo) {
    const logoPath = path.join(ASSETS, BRAND_CONFIG.logo.file);
    const logoW    = Math.round(width * (BRAND_CONFIG.logo.width / 1920));
    const margin   = Math.round(width * (BRAND_CONFIG.logo.margin / 1920));

    const logoBuffer = await sharp(logoPath)
      .resize(logoW, null, { fit: "inside" })
      .toBuffer();

    const logoMeta = await sharp(logoBuffer).metadata();
    layers.push({
      input:  logoBuffer,
      top:    height - logoMeta.height - margin,
      left:   width  - logoMeta.width  - margin,
    });
  }

  // 2. Foto del Dr. Servín — esquina superior izquierda, recortada en círculo
  if (includeDoctor) {
    const doctorPath = path.join(ASSETS, BRAND_CONFIG.doctor.file);
    const size       = Math.round(width * (BRAND_CONFIG.doctor.size / 1920));
    const margin     = Math.round(width * (BRAND_CONFIG.doctor.top  / 1920));

    const doctorBuffer = await circularCrop(doctorPath, size);

    // Borde blanco sutil alrededor del círculo
    const borderSize = size + 6;
    const circleBorder = Buffer.from(
      `<svg viewBox="0 0 ${borderSize} ${borderSize}" xmlns="http://www.w3.org/2000/svg">
         <circle cx="${borderSize/2}" cy="${borderSize/2}" r="${borderSize/2}"
                 fill="white" opacity="0.9"/>
       </svg>`
    );

    layers.push({ input: circleBorder, top: margin - 3, left: margin - 3 });
    layers.push({ input: doctorBuffer, top: margin,     left: margin     });
  }

  // 3. Watermark de texto — pie de imagen
  if (includeWatermark) {
    const wmBuffer = watermarkSVG(BRAND_CONFIG.watermark.text, width, height);
    layers.push({ input: wmBuffer, top: 0, left: 0 });
  }

  // Componer todo y guardar
  const result = await baseImage
    .composite(layers)
    .toBuffer();

  if (output) {
    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(output, result);
    console.log(`[UIH] ✓ Imagen con branding guardada: ${output}`);
  }

  return result;
}

// ─── Integración con OpenAI gpt-image-1 ──────────────────────────────────────

/**
 * Genera una imagen con OpenAI y aplica branding UIH automáticamente.
 *
 * @param {string} prompt     — Prompt médico para la imagen
 * @param {string} outputPath — Ruta donde guardar (ej: "output/imagen.png")
 * @returns {Buffer}
 *
 * @example
 * const buf = await generateBrandedImage(
 *   "Ilustración médica profesional de homeopatía, estilo moderno",
 *   "output/campana-uih.png"
 * );
 */
export async function generateBrandedImage(prompt, outputPath) {
  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  console.log("[UIH] Generando imagen con OpenAI gpt-image-1...");
  const response = await openai.images.generate({
    model:   "gpt-image-1",
    prompt:  `${prompt}. Estilo profesional médico, alta resolución, fondo limpio.`,
    size:    "1792x1024",  // Formato horizontal 4K
    quality: "high",
    n:       1,
  });

  // La API devuelve base64
  const imageBuffer = Buffer.from(response.data[0].b64_json, "base64");

  console.log("[UIH] Aplicando branding UIH...");
  return applyUIHBranding(imageBuffer, outputPath);
}