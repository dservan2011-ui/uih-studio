/**
 * server.js — UIH Studio
 * Servidor Express que sirve el frontend (index.html)
 * y expone APIs para:
 * - campañas
 * - imágenes OpenAI
 * - imágenes Gemini / Nano Banana Pro
 * - voz ElevenLabs
 * - video HeyGen
 */

import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// ── APIs internas ─────────────────────────────────────────────────────────────
import { textToVoice, pollVideoStatus } from "./api/videoGenerator.js";
import { generateBrandedImage } from "./api/branding.js";
import { generateCampaign } from "./api/campaignGenerator.js";
import { generateGeminiBrandedImage } from "./api/geminiImageGenerator.js";

// ── Config base ───────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Carpeta de generados
const GENERATED_DIR = path.join(__dirname, "generated");

// Asegurar que exista
if (!fs.existsSync(GENERATED_DIR)) {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
}

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// ── Archivos estáticos ────────────────────────────────────────────────────────
app.use(express.static(__dirname));
app.use("/generated", express.static(GENERATED_DIR));

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "uih-studio-api",
    status: "running",
    timestamp: new Date().toISOString(),
  });
});

// ── POST /api/generate/campaign ───────────────────────────────────────────────
app.post("/api/generate/campaign", async (req, res) => {
  try {
    const {
      theme,
      service,
      objective,
      audience,
      location,
      module = "TODO",
    } = req.body || {};

    if (!theme && !service) {
      return res.status(400).json({
        ok: false,
        error: "Falta 'theme' o 'service'.",
      });
    }

    const result = await generateCampaign({
      theme: theme || service,
      service: service || theme,
      objective,
      audience,
      location,
      module,
    });

    res.json(result);
  } catch (err) {
    console.error("[UIH/campaign]", err);
    res.status(500).json({
      ok: false,
      error: err.message || "Error generando campaña.",
    });
  }
});

// ── POST /api/generate/image (OpenAI) ─────────────────────────────────────────
app.post("/api/generate/image", async (req, res) => {
  try {
    const { prompt, filename = `uih-${Date.now()}.png` } = req.body || {};

    if (!prompt) {
      return res.status(400).json({
        ok: false,
        error: "Falta el campo 'prompt'.",
      });
    }

    const safeFilename = String(filename)
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 120);

    const outputPath = path.join(GENERATED_DIR, safeFilename);

    await generateBrandedImage(prompt, outputPath);

    res.json({
      ok: true,
      engine: "openai",
      url: `/generated/${safeFilename}`,
      message: "Imagen generada con branding UIH",
    });
  } catch (err) {
    console.error("[UIH/image]", err);
    res.status(500).json({
      ok: false,
      error: err.message || "Error generando imagen OpenAI.",
    });
  }
});

// ── POST /api/generate/gemini-image (Gemini / Nano Banana Pro) ───────────────
app.post("/api/generate/gemini-image", async (req, res) => {
  try {
    const {
      prompt,
      filename = `uih-gemini-${Date.now()}.png`,
      model = "gemini-2.5-flash-image-preview",
      aspectRatio = "4:5",
      imageSize = "2K",
    } = req.body || {};

    if (!prompt) {
      return res.status(400).json({
        ok: false,
        error: "Falta el campo 'prompt'.",
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        ok: false,
        error: "Falta GEMINI_API_KEY en Render.",
      });
    }

    const safeFilename = String(filename)
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 120);

    const outputPath = path.join(GENERATED_DIR, safeFilename);

    await generateGeminiBrandedImage(prompt, outputPath, {
      model,
      aspectRatio,
      imageSize,
      includeLogo: true,
      includeDoctor: true,
      includeWatermark: false,
    });

    res.json({
      ok: true,
      engine: "gemini",
      model,
      url: `/generated/${safeFilename}`,
      message: "Imagen generada con Gemini/Nano Banana Pro y branding UIH",
    });
  } catch (err) {
    console.error("[UIH/gemini-image]", err);
    res.status(500).json({
      ok: false,
      error: err.message || "Error generando imagen Gemini.",
    });
  }
});

// ── POST /api/generate/voice-preview ──────────────────────────────────────────
app.post("/api/generate/voice-preview", async (req, res) => {
  try {
    const { text } = req.body || {};

    if (!text) {
      return res.status(400).json({
        ok: false,
        error: "Falta el campo 'text'.",
      });
    }

    const audioBuffer = await textToVoice(text);

    res.set("Content-Type", "audio/mpeg");
    res.set("Content-Disposition", "inline; filename=preview-dr-servin.mp3");
    res.send(audioBuffer);
  } catch (err) {
    console.error("[UIH/voice]", err);
    res.status(500).json({
      ok: false,
      error: err.message || "Error generando voz.",
    });
  }
});

// ── POST /api/generate/video ──────────────────────────────────────────────────
app.post("/api/generate/video", async (req, res) => {
  try {
    const { script, style = "normal" } = req.body || {};

    if (!script) {
      return res.status(400).json({
        ok: false,
        error: "Falta el campo 'script'.",
      });
    }

    res.json({
      ok: true,
      message: "Video en proceso. Esto puede tardar 1-3 minutos.",
    });

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
    console.error("[UIH/video]", err);
    res.status(500).json({
      ok: false,
      error: err.message || "Error generando video.",
    });
  }
});

// ── POST /api/generate/video-full ─────────────────────────────────────────────
app.post("/api/generate/video-full", async (req, res) => {
  try {
    const {
      script,
      heygenKey,
      heygenAvatar,
      elevenKey,
      elevenVoice,
    } = req.body || {};

    if (!script) {
      return res.status(400).json({
        ok: false,
        error: "Falta el script.",
      });
    }

    if (!heygenKey || !heygenAvatar || !elevenKey || !elevenVoice) {
      return res.status(400).json({
        ok: false,
        error: "Faltan datos de HeyGen o ElevenLabs.",
      });
    }

    // 1) Generar audio con ElevenLabs
    const audioRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${elevenVoice}`,
      {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": elevenKey,
        },
        body: JSON.stringify({
          text: script,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.2,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!audioRes.ok) {
      throw new Error(`ElevenLabs ${audioRes.status}`);
    }

    const audioBuffer = Buffer.from(await audioRes.arrayBuffer());

    // 2) Subir audio a HeyGen
    const { FormData, Blob } = await import("formdata-node");

    const formData = new FormData();
    formData.set(
      "file",
      new Blob([audioBuffer], { type: "audio/mpeg" }),
      "voz-dr-servin.mp3"
    );

    const uploadRes = await fetch("https://upload.heygen.com/v1/asset", {
      method: "POST",
      headers: {
        "X-Api-Key": heygenKey,
      },
      body: formData,
    });

    const uploadData = await uploadRes.json();

    if (!uploadRes.ok || !uploadData?.data?.id) {
      throw new Error(`HeyGen upload: ${JSON.stringify(uploadData)}`);
    }

    // 3) Crear video
    const videoRes = await fetch("https://api.heygen.com/v2/video/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": heygenKey,
      },
      body: JSON.stringify({
        video_inputs: [
          {
            character: {
              type: "avatar",
              avatar_id: heygenAvatar,
              avatar_style: "normal",
            },
            voice: {
              type: "audio",
              audio_asset_id: uploadData.data.id,
            },
            background: {
              type: "color",
              value: "#032548",
            },
          },
        ],
        dimension: { width: 1080, height: 1920 },
        test: false,
      }),
    });

    const videoData = await videoRes.json();

    if (!videoRes.ok || !videoData?.data?.video_id) {
      throw new Error(`HeyGen video: ${JSON.stringify(videoData)}`);
    }

    res.json({
      ok: true,
      video_id: videoData.data.video_id,
    });
  } catch (err) {
    console.error("[UIH/video-full]", err);
    res.status(500).json({
      ok: false,
      error: err.message || "Error generando video completo.",
    });
  }
});

// ── GET /api/video-status/:id ─────────────────────────────────────────────────
app.get("/api/video-status/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        ok: false,
        error: "Falta el video_id.",
      });
    }

    const result = await pollVideoStatus(id);
    res.json({
      ok: true,
      ...result,
    });
  } catch (err) {
    console.error("[UIH/video-status]", err);
    res.status(500).json({
      ok: false,
      error: err.message || "Error consultando estado del video.",
    });
  }
});

// ── Fallback ──────────────────────────────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ── Iniciar servidor ──────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[UIH] Servidor corriendo en http://localhost:${PORT}`);
});
