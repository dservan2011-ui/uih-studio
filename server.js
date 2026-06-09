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
import { generateCampaign }             from "./api/campaignGenerator.js";

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
// ── POST /api/generate/video-full ─────────────────────────────────────────────
// Recibe guión, genera audio con ElevenLabs, sube a HeyGen y genera video
app.post("/api/generate/video-full", async (req, res) => {
  try {
    const { script, heygenKey, heygenAvatar, elevenKey, elevenVoice } = req.body;
    if (!script) return res.status(400).json({ error: "Falta el script." });

    // 1. Generar audio con ElevenLabs
    const audioRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elevenVoice}`, {
      method: "POST",
      headers: { "Accept": "audio/mpeg", "Content-Type": "application/json", "xi-api-key": elevenKey },
      body: JSON.stringify({ text: script, model_id: "eleven_turbo_v2_5", voice_settings: { stability: 0.50, similarity_boost: 0.75, style: 0.20, use_speaker_boost: true } })
    });
    if (!audioRes.ok) throw new Error(`ElevenLabs ${audioRes.status}`);
    const audioBuffer = Buffer.from(await audioRes.arrayBuffer());

    // 2. Subir audio a HeyGen
    const { FormData, Blob } = await import("formdata-node");
    const formData = new FormData();
    formData.set("file", new Blob([audioBuffer], { type: "audio/mpeg" }), "voz-dr-servin.mp3");

    const uploadRes = await fetch("https://upload.heygen.com/v1/asset", {
      method: "POST",
      headers: { "X-Api-Key": heygenKey },
      body: formData
    });
    const uploadData = await uploadRes.json();
    if (!uploadRes.ok || !uploadData.data?.id) throw new Error(`HeyGen upload: ${JSON.stringify(uploadData)}`);

    // 3. Crear video
    const videoRes = await fetch("https://api.heygen.com/v2/video/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": heygenKey },
      body: JSON.stringify({
        video_inputs: [{ character: { type: "avatar", avatar_id: heygenAvatar, avatar_style: "normal" }, voice: { type: "audio", audio_asset_id: uploadData.data.id }, background: { type: "color", value: "#032548" } }],
        dimension: { width: 1080, height: 1920 }, test: false
      })
    });
    const videoData = await videoRes.json();
    if (!videoRes.ok || !videoData.data?.video_id) throw new Error(`HeyGen video: ${JSON.stringify(videoData)}`);

    res.json({ ok: true, video_id: videoData.data.video_id });
  } catch (err) {
    console.error("[UIH/video-full]", err.message);
    res.status(500).json({ error: err.message });
  }
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
    } = req.body;

    if (!theme) {
      return res.status(400).json({ error: "Falta el campo 'theme'." });
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
    console.error("[UIH/campaign]", err.message);
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
