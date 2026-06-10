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
      if (part?.text) {
        texts.push(part.text);
      }
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
    includeLogo = true,
    includeDoctor = true,
    includeWatermark = false,
  } = opts;

  const finalPrompt = `
${prompt}

FORMATO:
Crear imagen vertical para publicación médica en formato 4:5, alta calidad, estilo editorial profesional.

REGLAS IMPORTANTES PARA UIH:
- Crear únicamente una imagen médica realista y profesional.
- No inventar otro doctor como protagonista.
- No inventar pacientes.
- No poner resonador magnético, tomógrafo, quirófano, rayos X ni equipo que UIH no usa.
- No escribir texto dentro de la imagen base.
- No agregar logos inventados.
- No estilo futurista.
- No ciencia ficción.
- No hologramas.
- No laboratorio tecnológico.
- Preferir consultorio sobrio, humano, realista y limpio.
- Usar colores navy, teal, aqua y blanco de forma discreta.
- Dejar espacio visual para que el sistema agregue branding UIH.
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
            parts: [
              {
                text: finalPrompt,
              },
            ],
          },
        ],
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
    prompt,
  });
}
