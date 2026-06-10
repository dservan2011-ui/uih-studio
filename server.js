/**
 * server.js — UIH Studio
 * Backend principal:
 * - Sirve index.html
 * - Genera campañas OpenAI
 * - Genera imágenes OpenAI con branding UIH
 * - Genera imágenes Gemini / Nano Banana Pro con branding UIH
 * - Maneja voz y video
 */

import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import { textToVoice, pollVideoStatus } from "./api/videoGenerator.js";
import { generateBrandedImage } from "./api/branding.js";
import { generateCampaign } from "./api/campaignGenerator.js";
import { generateGeminiBrandedImage } from "./api/geminiImageGenerator.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

const GENERATED_DIR = path.join(__dirname, "generated");

if (!fs.existsSync(GENERATED_DIR)) {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

app.use(express.static(__dirname));
app.use("/generated", express.static(GENERATED_DIR));

function safeFilename(name, fallback = "uih-image.png") {
  const raw = String(name || fallback);

  const cleaned = raw
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

  return cleaned || fallback;
}

/* ────────────────────────────────────────────────────────────── */
/* HEALTH                                                        */
/* ────────────────────────────────────────────────────────────── */

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "uih-studio-api",
    status: "running",
    openai: Boolean(process.env.OPENAI_API_KEY),
    gemini: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

/* ────────────────────────────────────────────────────────────── */
/* CAMPAÑA OPENAI                                                */
/* ────────────────────────────────────────────────────────────── */

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

    if (!theme) {
      return res.status(400).json({
        ok: false,
        error: "Falta el campo 'theme'.",
      });
    }

    const campaign = await generateCampaign({
      theme,
      service,
      objective,
      audience,
      location,
      module,
    });

    res.json({
      ok: true,
      campaign,
    });
  } catch (err) {
    console.error("[UIH/campaign]", err);
    res.status(500).json({
      ok: false,
      error: err.message || "Error generando campaña.",
    });
  }
});

/* ────────────────────────────────────────────────────────────── */
/* IMAGEN OPENAI + BRANDING UIH                                  */
/* ────────────────────────────────────────────────────────────── */

app.post("/api/generate/image", async (req, res) => {
  try {
    const {
      prompt,
      filename = `uih-openai-${Date.now()}.png`,
    } = req.body || {};

    if (!prompt) {
      return res.status(400).json({
        ok: false,
        error: "Falta el campo 'prompt'.",
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        ok: false,
        error: "Falta OPENAI_API_KEY en Render.",
      });
    }

    const finalFilename = safeFilename(filename, `uih-openai-${Date.now()}.png`);
    const outputPath = path.join(GENERATED_DIR, finalFilename);

    await generateBrandedImage(prompt, outputPath);

    res.json({
      ok: true,
      engine: "openai",
      url: `/generated/${finalFilename}`,
      message: "Imagen generada con OpenAI y branding UIH",
    });
  } catch (err) {
    console.error("[UIH/image]", err);
    res.status(500).json({
      ok: false,
      error: err.message || "Error generando imagen OpenAI.",
    });
  }
});

/* ────────────────────────────────────────────────────────────── */
/* IMAGEN GEMINI / NANO BANANA PRO + BRANDING UIH                */
/* ────────────────────────────────────────────────────────────── */

app.post("/api/generate/gemini-image", async (req, res) => {
  try {
    const {
      prompt,
      filename = `uih-gemini-${Date.now()}.png`,
      model = "gemini-3-pro-image",
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

    const finalFilename = safeFilename(filename, `uih-gemini-${Date.now()}.png`);
    const outputPath = path.join(GENERATED_DIR, finalFilename);

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
      url: `/generated/${finalFilename}`,
      message: "Imagen generada con Gemini / Nano Banana Pro y branding UIH",
    });
  } catch (err) {
    console.error("[UIH/gemini-image]", err);
    res.status(500).json({
      ok: false,
      error: err.message || "Error generando imagen Gemini.",
    });
  }
});

/* ────────────────────────────────────────────────────────────── */
/* VOZ ELEVENLABS                                                */
/* ────────────────────────────────────────────────────────────── */

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

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", "inline; filename=preview-dr-servin.mp3");
    res.send(audioBuffer);
  } catch (err) {
    console.error("[UIH/voice]", err);
    res.status(500).json({
      ok: false,
      error: err.message || "Error generando voz.",
    });
  }
});

/* ────────────────────────────────────────────────────────────── */
/* VIDEO SIMPLE                                                  */
/* ────────────────────────────────────────────────────────────── */

app.post("/api/generate/video", async (req, res) => {
  try {
    const {
      script,
      style = "normal",
    } = req.body || {};

    if (!script) {
      return res.status(400).json({
        ok: false,
        error: "Falta el campo 'script'.",
      });
    }

    const { generateDrVideo } = await import("./api/videoGenerator.js");

    const result = await generateDrVideo(script, {
      avatarStyle: style,
    });

    res.json({
      ok: true,
      result,
      message: "Video generado o enviado a proceso.",
    });
  } catch (err) {
    console.error("[UIH/video]", err);
    res.status(500).json({
      ok: false,
      error: err.message || "Error generando video.",
    });
  }
});

/* ────────────────────────────────────────────────────────────── */
/* VIDEO FULL — ELEVENLABS + HEYGEN                              */
/* ────────────────────────────────────────────────────────────── */

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
      const errText = await audioRes.text();
      throw new Error(`ElevenLabs ${audioRes.status}: ${errText}`);
    }

    const audioBuffer = Buffer.from(await audioRes.arrayBuffer());

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
        dimension: {
          width: 1080,
          height: 1920,
        },
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
      message: "Video enviado a HeyGen.",
    });
  } catch (err) {
    console.error("[UIH/video-full]", err);
    res.status(500).json({
      ok: false,
      error: err.message || "Error generando video completo.",
    });
  }
});

/* ────────────────────────────────────────────────────────────── */
/* ESTADO VIDEO                                                  */
/* ────────────────────────────────────────────────────────────── */

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
      error: err.message || "Error consultando video.",
    });
  }
});

/* ────────────────────────────────────────────────────────────── */
/* FRONTEND FALLBACK                                             */
/* ────────────────────────────────────────────────────────────── */

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

/* ────────────────────────────────────────────────────────────── */
/* START                                                         */
/* ────────────────────────────────────────────────────────────── */

app.listen(PORT, () => {
  console.log(`[UIH] Servidor corriendo en puerto ${PORT}`);
});
