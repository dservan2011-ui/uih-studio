/**
 * api/videoGenerator.js — UIH Studio
 * Pipeline: texto → voz ElevenLabs → video HeyGen con avatar del Dr. Servín
 */

const ELEVENLABS_API = "https://api.elevenlabs.io/v1";
const HEYGEN_API     = "https://api.heygen.com";
const HEYGEN_UPLOAD  = "https://upload.heygen.com/v1";

export async function textToVoice(text) {
  const voiceId = process.env.ELEVENLABS_VOICE_ID;

  text = text
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/\.\.\./g, ",")
    .replace(/—/g, ",")
    .replace(/\n+/g, " ")
    .trim();

  const res = await fetch(`${ELEVENLABS_API}/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key":   process.env.ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
      "Accept":       "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_turbo_v2_5",
      voice_settings: {
        stability:         0.50,
        similarity_boost:  0.75,
        style:             0.20,
        use_speaker_boost: true,
      },
    }),
  });

  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

async function uploadAudioToHeyGen(audioBuffer) {
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([audioBuffer], { type: "audio/mpeg" }),
    "voz-dr-servin.mp3"
  );

  const res = await fetch(`${HEYGEN_UPLOAD}/asset`, {
    method:  "POST",
    headers: { "X-Api-Key": process.env.HEYGEN_API_KEY },
    body:    formData,
  });

  if (!res.ok) throw new Error(`HeyGen upload ${res.status}: ${await res.text()}`);
  const { data } = await res.json();
  return data.id;
}

async function createHeyGenVideo(audioAssetId, options = {}) {
  const {
    width       = 1920,
    height      = 1080,
    background  = { type: "color", value: "#FFFFFF" },
    avatarStyle = "normal",
  } = options;

  const res = await fetch(`${HEYGEN_API}/v2/video/generate`, {
    method:  "POST",
    headers: {
      "X-Api-Key":    process.env.HEYGEN_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      video_inputs: [{
        character: {
          type:         "avatar",
          avatar_id:    process.env.HEYGEN_AVATAR_ID,
          avatar_style: avatarStyle,
        },
        voice: {
          type:           "audio",
          audio_asset_id: audioAssetId,
        },
        background,
      }],
      dimension: { width, height },
      caption:   false,
    }),
  });

  if (!res.ok) throw new Error(`HeyGen generate ${res.status}: ${await res.text()}`);
  const { data } = await res.json();
  return data.video_id;
}

export async function pollVideoStatus(videoId, maxWaitMs = 600_000) {
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    const res = await fetch(
      `${HEYGEN_API}/v1/video_status.get?video_id=${videoId}`,
      { headers: { "X-Api-Key": process.env.HEYGEN_API_KEY } }
    );
    const { data } = await res.json();

    if (data.status === "completed") return data.video_url;
    if (data.status === "failed")    throw new Error(`HeyGen falló: ${data.error}`);

    await new Promise(r => setTimeout(r, 8_000));
  }

  throw new Error("Timeout esperando video de HeyGen");
}

export async function generateDrVideo(script, options = {}) {
  console.log("[UIH] Sintetizando voz...");
  const audioBuffer = await textToVoice(script);

  console.log("[UIH] Subiendo audio a HeyGen...");
  const audioAssetId = await uploadAudioToHeyGen(audioBuffer);

  console.log("[UIH] Creando video...");
  const videoId = await createHeyGenVideo(audioAssetId, options);

  console.log(`[UIH] Esperando renderizado (ID: ${videoId})...`);
  const videoUrl = await pollVideoStatus(videoId);

  console.log(`[UIH] ✓ Video: ${videoUrl}`);
  return videoUrl;
}