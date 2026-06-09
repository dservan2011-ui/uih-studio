import { uihBrand } from "../config/uihBrand.js";

function getServiceDescription(serviceName) {
  const service = uihBrand.services.find(
    (item) =>
      item.name.toLowerCase() === String(serviceName || "").toLowerCase()
  );

  if (service) {
    return service.description;
  }

  return "Servicio médico integral de UIH con valoración médica previa.";
}

export async function generateCampaign({
  theme,
  service,
  objective,
  audience,
  location,
  module = "TODO",
}) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    throw new Error("Falta OPENAI_API_KEY en Render o en variables de entorno.");
  }

  const serviceDescription = getServiceDescription(service);

  const systemPrompt = `
Eres el generador oficial de campañas de UIH — Unidad Integral Homeopática.

Tu trabajo es crear campañas médicas profesionales, claras, humanas, responsables y visualmente premium para redes sociales.

Debes respetar siempre la identidad de UIH:
- Marca: ${uihBrand.clinicName}
- Doctor: ${uihBrand.doctorName}
- Firma: ${uihBrand.doctorTitle}
- Web: ${uihBrand.website}
- WhatsApp: ${uihBrand.whatsapp}
- Dirección: ${uihBrand.address}
- COFEPRIS: ${uihBrand.cofepris}

Frase institucional obligatoria:
"${uihBrand.institutionalPhrase}"

Reglas médicas obligatorias:
- No prometas curaciones.
- No prometas resultados garantizados.
- No diagnostiques.
- No digas que el paciente tiene una enfermedad.
- No uses frases agresivas como “si sufres de...”, “tú tienes...”, “cura definitiva”.
- Usa lenguaje prudente, profesional y seguro.
- Siempre menciona que todo tratamiento requiere valoración médica previa.
- Siempre indica que los resultados pueden variar según cada paciente.

Estilo de comunicación:
Médico, profesional, humano, claro, premium, confiable y respetuoso.

Estilo visual:
Clínico moderno, tecnológico, navy/teal/aqua, alto contraste, glow suave, logo UIH, foto real del doctor y footer institucional.

Responde SIEMPRE en JSON válido.
No agregues texto fuera del JSON.
`;

  const userPrompt = `
Genera una campaña completa para UIH con estos datos:

Tema de salud:
${theme}

Servicio:
${service}

Descripción del servicio:
${serviceDescription}

Objetivo:
${objective}

Público:
${audience}

Zona:
${location}

Módulo solicitado:
${module}

Datos institucionales:
Clínica: ${uihBrand.clinicName}
Doctor: ${uihBrand.doctorName}
Firma: ${uihBrand.doctorTitle}
Web: ${uihBrand.website}
WhatsApp: ${uihBrand.whatsapp}
Teléfono: ${uihBrand.phone}
Dirección: ${uihBrand.address}
Instagram: ${uihBrand.instagram}
Facebook: ${uihBrand.facebook}
TikTok: ${uihBrand.tiktok}
YouTube: ${uihBrand.youtube}
COFEPRIS: ${uihBrand.cofepris}

Necesito que generes:

1. Estrategia breve.
2. Título principal.
3. Subtítulo.
4. Copy principal.
5. Copy corto.
6. Caption para Instagram.
7. Caption para Facebook.
8. Texto para TikTok.
9. Descripción para YouTube Shorts.
10. Carrusel de 7 diapositivas.
11. Guion para reel de 30 a 45 segundos.
12. Mensaje de WhatsApp.
13. Texto de anuncio Meta.
14. Hashtags.
15. Disclaimer médico.
16. Prompt para imagen 4K.
17. Prompt para video HeyGen.
18. Texto limpio para ElevenLabs.

El resultado debe tener esta estructura JSON exacta:

{
  "strategy": {
    "summary": "",
    "angle": "",
    "audience": "",
    "objective": "",
    "cta": ""
  },
  "campaign": {
    "title": "",
    "subtitle": "",
    "main_copy": "",
    "short_copy": ""
  },
  "captions": {
    "instagram": "",
    "facebook": "",
    "tiktok": "",
    "youtube": ""
  },
  "carousel": [
    { "slide": 1, "heading": "", "body": "" },
    { "slide": 2, "heading": "", "body": "" },
    { "slide": 3, "heading": "", "body": "" },
    { "slide": 4, "heading": "", "body": "" },
    { "slide": 5, "heading": "", "body": "" },
    { "slide": 6, "heading": "", "body": "" },
    { "slide": 7, "heading": "", "body": "" }
  ],
  "reel": {
    "hook": "",
    "script": "",
    "cta": ""
  },
  "whatsapp": "",
  "ads": {
    "primary_text": "",
    "headline": "",
    "description": ""
  },
  "hashtags": [],
  "disclaimer": "",
  "image_prompt": "",
  "heygen_prompt": "",
  "elevenlabs_script": "",
  "safety_review": {
    "status": "aprobado",
    "notes": ""
  }
}
`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message || "Error al generar campaña con OpenAI."
    );
  }

  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI no devolvió contenido de campaña.");
  }

  return JSON.parse(content);
}
