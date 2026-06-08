/**
 * videoGenerator.js — UIH Studio
 * Genera videos del Dr. Servín usando ElevenLabs (voz) + HeyGen (avatar)
 *
 * Variables de entorno requeridas (.env):
 *   ELEVENLABS_API_KEY
 *   ELEVENLABS_VOICE_ID
 *   HEYGEN_API_KEY
 *   HEYGEN_AVATAR_ID
 */

const ELEVENLABS_API = "https://api.elevenlabs.io/v1";
const HEYGEN_API     = "https://api.heygen.com";
const HEYGEN_UPLOAD  = "https://upload.heygen.com/v1";

// ─── 1. Síntesis de voz con ElevenLabs ───────────────────────────────────────

/**
 * Convierte texto a audio con la voz clonada del Dr. Servín.
 * @param {string} text  — Script médico
 * @returns {Buffer}     — Audio MP3 en memoria
 */
export async function textToVoice(text) {
  const voiceId = process.env.ELEVENLABS_VOICE_ID;

  const res = await fetch(`${ELEVENLABS_API}/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key":   process.env.ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
      "Accept":       "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",  // Soporte nativo en español
      voice_settings: {
        stability:        0.65,  // Voz médica: clara y consistente
        similarity_boost: 0.80,
        style:            0.30,
        use_speaker_boost: true,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs error ${res.status}: ${err}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ─── 2. Subir audio a HeyGen como asset ──────────────────────────────────────

/**
 * Sube el buffer de audio a HeyGen y devuelve el asset ID.
 * @param {Buffer} audioBuffer
 * @returns {string} audioAssetId
 */
async function uploadAudioToHeyGen(audioBuffer) {
  const { Blob } = await import("buffer");
  const formData = new FormData();
  formData.append("file", new Blob([audioBuffer], { type: "audio/mpeg" }), "voz-dr-servin.mp3");

  const res = await fetch(`${HEYGEN_UPLOAD}/asset`, {
    method: "POST",
    headers: { "X-Api-Key": process.env.HEYGEN_API_KEY },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HeyGen upload error ${res.status}: ${err}`);
  }

  const { data } = await res.json();
  return data.id;
}

// ─── 3. Crear video con avatar + audio ───────────────────────────────────────

/**
 * Genera un video del avatar del Dr. Servín con audio de ElevenLabs.
 * @param {string} audioAssetId  — ID del audio subido a HeyGen
 * @param {object} options       — Opciones opcionales
 * @returns {{ videoId: string, estimatedSeconds: number }}
 */
async function createHeyGenVideo(audioAssetId, options = {}) {
  const {
    width       = 1920,
    height      = 1080,
    background  = { type: "color", value: "#FFFFFF" },
    avatarStyle = "normal",  // "normal" | "circle" | "closeup"
  } = options;

  const res = await fetch(`${HEYGEN_API}/v2/video/generate`, {
    method: "POST",
    headers: {
      "X-Api-Key":     process.env.HEYGEN_API_KEY,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      video_inputs: [{
        character: {
          type:       "avatar",
          avatar_id:  process.env.HEYGEN_AVATAR_ID,
          avatar_style: avatarStyle,
        },
        voice: {
          type:           "audio",
          audio_asset_id: audioAssetId,
        },
        background,
      }],
      dimension:  { width, height },
      caption:    false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HeyGen generate error ${res.status}: ${err}`);
  }

  const { data } = await res.json();
  // HeyGen devuelve un video_id; el video se renderiza de forma asíncrona
  return { videoId: data.video_id, estimatedSeconds: 60 };
}

// ─── 4. Esperar a que el video esté listo ────────────────────────────────────

/**
 * Hace polling hasta que HeyGen termine de renderizar el video.
 * @param {string} videoId
 * @param {number} maxWaitMs  — Timeout máximo (default: 10 minutos)
 * @returns {string} URL pública del video
 */
export async function pollVideoStatus(videoId, maxWaitMs = 600_000) {
  const interval = 8_000; // revisar cada 8 segundos
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    const res = await fetch(`${HEYGEN_API}/v1/video_status.get?video_id=${videoId}`, {
      headers: { "X-Api-Key": process.env.HEYGEN_API_KEY },
    });
    const { data } = await res.json();

    if (data.status === "completed") return data.video_url;
    if (data.status === "failed")    throw new Error(`HeyGen render failed: ${data.error}`);

    await new Promise(r => setTimeout(r, interval));
  }

  throw new Error("Timeout esperando video de HeyGen");
}

// ─── 5. Función principal ─────────────────────────────────────────────────────

/**
 * Pipeline completo: texto → voz ElevenLabs → video HeyGen.
 *
 * @param {string} script    — Texto del Dr. Servín
 * @param {object} options   — { width, height, background, avatarStyle }
 * @returns {string}         — URL pública del video terminado
 *
 * @example
 * import { generateDrVideo } from "./lib/videoGenerator.js";
 * const url = await generateDrVideo("Hola, soy el Dr. Servín...");
 */
export async function generateDrVideo(script, options = {}) {
  console.log("[UIH] Sintetizando voz con ElevenLabs...");
  const audioBuffer = await textToVoice(script);

  console.log("[UIH] Subiendo audio a HeyGen...");
  const audioAssetId = await uploadAudioToHeyGen(audioBuffer);

  console.log("[UIH] Enviando solicitud de video a HeyGen...");
  const { videoId } = await createHeyGenVideo(audioAssetId, options);

  console.log(`[UIH] Video en cola (ID: ${videoId}). Esperando renderizado...`);
  const videoUrl = await pollVideoStatus(videoId);

  console.log(`[UIH] ✓ Video listo: ${videoUrl}`);
  return videoUrl;
}