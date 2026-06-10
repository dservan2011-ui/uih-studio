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

function uniqueList(items) {
  return [...new Set(items.filter(Boolean))];
}

async function callGeminiImageModel({ model, prompt }) {
  const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`;

  const response = await fetch(url, {
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
              text: prompt,
            },
          ],
        },
      ],
    }),
  });

  let data;

  try {
    data = await response.json();
  } catch {
    const raw = await response.text();
    throw new Error(`Gemini ${response.status} ${model}: ${raw}`);
  }

  if (!response.ok) {
    throw new Error(`Gemini ${response.status} ${model}: ${JSON.stringify(data)}`);
  }

  return data;
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

  const modelsToTry = uniqueList([
    model,
    "gemini-3-pro-image",
    "gemini-3.1-flash-image",
    "gemini-2.5-flash-image",
    "gemini-2.5-flash-image-preview",
  ]);

  const finalPrompt = `
${prompt}

OBJETIVO:
Crear UNA imagen vertical realista para publicidad médica institucional de UIH.

FORMATO VISUAL:
- Imagen vertical tipo post 4:5.
- Fondo médico sobrio, realista, humano y profesional.
- Consultorio médico limpio, ordenado, cálido, de medicina integral.
- Colores discretos navy, teal, aqua, blanco.
- Dejar espacio visual limpio para que el sistema agregue logo, doctor real y textos.

PROHIBIDO:
- No generar doctores.
- No generar pacientes.
- No generar personas.
- No generar rostros.
- No generar cuerpos.
- No generar manos.
- No generar resonador magnético.
- No generar tomógrafo.
- No generar rayos X.
- No generar quirófano.
- No generar laboratorio futurista.
- No generar hologramas.
- No generar ciencia ficción.
- No agregar texto dentro de la imagen.
- No agregar logotipos inventados.
- No inventar equipo médico que UIH no usa.

IMPORTANTE:
El sistema agregará después el logo UIH, la foto real del Dr. Luis Alfonso Servín Villanueva, teléfono, web y COFEPRIS.
`.trim();

  const errors = [];

  for (const currentModel of modelsToTry) {
    try {
      console.log(`[UIH/Gemini] Probando modelo: ${currentModel}`);

      const data = await callGeminiImageModel({
        model: currentModel,
        prompt: finalPrompt,
      });

      const imageBuffer = extractGeminiImageBuffer(data);

      if (!imageBuffer) {
        const text = extractGeminiText(data);
        throw new Error(text || "Gemini respondió, pero no devolvió imagen.");
      }

      console.log(`[UIH/Gemini] Imagen generada con modelo: ${currentModel}`);

      return applyUIHBranding(imageBuffer, outputPath, {
        includeLogo,
        includeDoctor,
        includeWatermark,
        prompt,
        geminiModelUsed: currentModel,
      });
    } catch (err) {
      console.warn(`[UIH/Gemini] Falló ${currentModel}: ${err.message}`);
      errors.push(`${currentModel}: ${err.message}`);
    }
  }

  throw new Error(
    "No se pudo generar imagen con Gemini. Intentos:\n" + errors.join("\n\n")
  );
}
