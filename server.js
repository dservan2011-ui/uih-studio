/**
 * server.js — UIH Studio
 * Servidor Express que sirve el frontend (index.html)
 * y expone las APIs de generación de imágenes y videos.
 */

import "dotenv/config";
import express  from "express";
import cors     from "cors";
import path     from "path";
import { fileURLToPath } from "url";

// ── Rutas de API ──────────────────────────────────────────────────────────────
import { textToVoice, pollVideoStatus } from "./api/videoGenerator.js";
import { generateBrandedImage }         from "./api/branding.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Servir el frontend (index.html y assets generados)
app.use(express.static(__dirname));
app.use("/generated", express.static(path.join(__dirname, "generated")));

// ── POST /api/generate/image ──────────────────────────────────────────────────
app.post("/api/generate/image", async (req, res) => {
  try {
    const { prompt, filename = `uih-${Date.now()}.png` } = req.body;
    if (!prompt) return res.status(400).json({ error: "Falta el campo 'prompt'." });

    const outputPath = path.join(__dirname, "generated", filename);
    await generateBrandedImage(prompt, outputPath);

    res.json({
      ok:      true,
      url:     `/generated/${filename}`,
      message: "Imagen generada con branding UIH",
    });
  } catch (err) {
    console.error("[UIH/image]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/generate/video ──────────────────────────────────────────────────
app.post("/api/generate/video", async (req, res) => {
  try {
    const { script, style = "normal" } = req.body;
    if (!script) return res.status(400).json({ error: "Falta el campo 'script'." });

    res.json({ ok: true, message: "Video en proceso. Esto puede tardar 1-3 minutos." });

    (async () => {
      try {
        const { generateDrVideo } = await import("./api/videoGenerator.js");
        const url = await generateDrVideo(script, { avatarStyle: style });
        console.log(`[UIH/video] ✓ Listo: ${url}`);
      } catch (e) {
        console.error("[UIH/video] Error:", e.message);
      }
    })();

  } catch (err) {
    console.error("[UIH/video]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/generate/voice-preview ─────────────────────────────────────────
app.post("/api/generate/voice-preview", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Falta el campo 'text'." });

    const audioBuffer = await textToVoice(text);

    res.set("Content-Type", "audio/mpeg");
    res.set("Content-Disposition", "inline; filename=preview-dr-servin.mp3");
    res.send(audioBuffer);

  } catch (err) {
    console.error("[UIH/voice]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Fallback: cualquier ruta devuelve index.html ──────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ── Iniciar servidor ──────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[UIH] Servidor corriendo en http://localhost:${PORT}`);
});