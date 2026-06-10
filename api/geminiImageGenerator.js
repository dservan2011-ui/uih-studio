import { applyUIHBranding } from "./branding.js";

function extractGeminiImageBuffer(data) {
  const candidates = data?.candidates || [];

  for (const candidate of candidates) {
    const parts = candidate?.content?.parts || [];
    for (const part of parts) {
      if (part?.inlineData?.data) {
        return Buffer.from(part.inlineData.data, "base64");
      }
      if (part?.inline_data?.data) {
        return Buffer.from(part.inline_data.data, "base64");
      }
    }
  }

  return null;
}

function extractGeminiText(data) {
  const candidates = data?.candidates || [];
  const texts = [];

  for (const candidate of candidates) {
    const parts = candidate?.content?.parts || [];
    for (const part of parts) {
      if (part?.text) texts.push(part.text);
    }
  }

  return texts.join("\n").trim();
}

export async function generateGeminiBrandedImage(prompt, outputPath, opts = {}) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Falta GEMINI_API_KEY en Render.");
  }

  if (!prompt || !prompt.trim()) {
    throw new Error("Falta el prompt para Gemini.");
  }

  const {
    model = "gemini-3-pro-image",
    aspectRatio = "4:5",
    imageSize = "2K",
    includeLogo = true,
    includeDoctor = true,
    includeWatermark = false,
  } = opts;

  const finalPrompt = `
${prompt}

IMPORTANTE:
- La imagen debe verse médica, profesional, elegante y realista.
- No inventes otro doctor como sujeto principal.
- No pongas resonadores, tomógrafos ni equipos que UIH no usa, a menos que se pidan explícitamente.
- Usa un consultorio real, sobrio, cálido y profesional.
- Evita estilo futurista exagerado.
- Mantén una estética premium con colores navy, teal, aqua y blanco.
- Deja espacio visual para branding.
`.trim();

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": process.env.GEMINI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: finalPrompt }],
          },
        ],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
          responseFormat: {
            image: {
              aspectRatio,
              imageSize,
            },
          },
        },
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Gemini ${response.status}: ${JSON.stringify(data)}`);
  }

  const imageBuffer = extractGeminiImageBuffer(data);

  if (!imageBuffer) {
    const msg = extractGeminiText(data) || "Gemini no devolvió imagen.";
    throw new Error(msg);
  }

  return applyUIHBranding(imageBuffer, outputPath, {
    includeLogo,
    includeDoctor,
    includeWatermark,
  });
}
