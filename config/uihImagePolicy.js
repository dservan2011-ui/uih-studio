/**
 * config/uihImagePolicy.js — Cerebro visual UIH
 *
 * Este archivo controla lo que SÍ y NO puede aparecer
 * en imágenes publicitarias de UIH.
 *
 * Objetivo:
 * - Evitar doctores falsos.
 * - Evitar pacientes inventados.
 * - Evitar resonadores/tomógrafos/equipo no usado por UIH.
 * - Priorizar fotos reales del consultorio, Dr. Servín y logo UIH.
 * - Usar textos médicos prudentes y aprobados.
 */

export const uihImagePolicy = {
  brandName: "UIH — Unidad Integral Homeopática",
  doctorName: "Dr. Luis Alfonso Servín Villanueva",
  doctorTitle: "Médico Cirujano | Médico Homeópata Especialista",

  website: "www.uih.mx",
  phone: "664-628-2202",
  cofepris: "COFEPRIS 25020222002A00159",

  defaultEngine: "real-uih",

  engines: {
    realUIH: "real-uih",
    openAI: "openai",
    gemini: "gemini",
    imagen4: "imagen4",
  },

  assets: {
    folder: "uih-assets",
    logo: "logo-uih.png",
    doctor: "dr-servin.png",
    clinicPhotos: [
      "consultorio-1.jpg",
      "consultorio-2.jpg",
      "consultorio-3.jpg",
      "consultorio.jpg",
      "consultorio.jpeg",
      "consultorio.png",
    ],
  },

  visualStyle: {
    tone: "médico, sobrio, humano, profesional, realista",
    colors: [
      "#032548",
      "#132249",
      "#017590",
      "#0B4F6C",
      "#46EFF4",
      "#41AAD4",
      "#F6FBFB",
      "#A9BECF",
    ],
    words: [
      "consultorio real UIH",
      "medicina integral",
      "ambiente profesional",
      "confianza médica",
      "limpieza",
      "orden",
      "atención humana",
      "colores navy, teal, aqua y blanco",
    ],
  },

  allowedVisuals: [
    "foto real del consultorio UIH",
    "foto real del Dr. Luis Alfonso Servín Villanueva",
    "logo real UIH",
    "pared clínica real",
    "escritorio médico",
    "silla de paciente",
    "silla médica",
    "área de consulta",
    "consultorio sobrio",
    "elementos clínicos sencillos",
    "iluminación natural o clínica suave",
    "textura profesional navy y teal discreta",
  ],

  forbiddenVisuals: [
    "doctor inventado",
    "médico falso",
    "paciente inventado",
    "rostros generados por IA",
    "cuerpos generados por IA",
    "manos generadas por IA",
    "personas generadas por IA",
    "resonador magnético",
    "MRI",
    "tomógrafo",
    "CT scan",
    "rayos X",
    "quirófano",
    "cirugía",
    "hospital de lujo falso",
    "laboratorio futurista",
    "hologramas",
    "ciencia ficción",
    "robot médico",
    "ADN futurista exagerado",
    "equipo médico que UIH no usa",
    "logo falso",
    "texto generado por IA dentro de la imagen base",
    "letras deformes",
    "promesas de curación",
    "antes y después",
    "imágenes sensacionalistas",
  ],

  fixedRules: [
    "Usar fotos reales siempre que existan.",
    "No generar doctores, pacientes ni personas con IA.",
    "No generar equipo médico que UIH no usa.",
    "No generar texto dentro de la imagen base.",
    "El texto publicitario debe agregarse después con Sharp/control de diseño.",
    "Todo tratamiento debe presentarse con valoración médica previa.",
    "No prometer curaciones.",
    "No prometer resultados garantizados.",
    "No diagnosticar en la publicidad.",
    "Usar lenguaje médico prudente, ético y profesional.",
  ],

  disclaimer:
    "Todo tratamiento requiere valoración médica previa. Los resultados pueden variar según cada paciente.",

  institutionalPhrase:
    "En UIH valoramos cada tratamiento desde un enfoque médico seguro, siempre con valoración previa, ética profesional y respeto por cada paciente.",
};

/**
 * Textos aprobados por servicio.
 * Estos textos son los que deben aparecer en imagen, carrusel, post y CTA.
 */
export const uihServiceVisualCopy = {
  "consulta-primera-vez": {
    aliases: [
      "consulta de primera vez",
      "primera vez",
      "homeopatía personalizada",
      "homeopatia personalizada",
      "consulta inicial",
      "consulta homeopática",
      "consulta homeopatica",
    ],
    title: "CONSULTA DE PRIMERA VEZ",
    subtitle:
      "Atención médica integral, personalizada y enfocada en comprender al paciente más allá del síntoma.",
    bullets: [
      "Historia clínica completa",
      "Escáner intersticial",
      "Medicamento homeopático por un mes",
      "Seguimiento médico personalizado",
    ],
    ctaLabel: "Agenda tu cita",
    shortCopy:
      "Consulta integral con historia clínica completa, escáner intersticial, medicamento homeopático por un mes y seguimiento personalizado.",
  },

  "consulta-subsecuente": {
    aliases: [
      "consulta subsecuente",
      "revisión",
      "revision",
      "seguimiento mensual",
      "consulta de seguimiento",
    ],
    title: "CONSULTA SUBSECUENTE",
    subtitle:
      "Seguimiento médico para valorar evolución y continuar el programa de atención.",
    bullets: [
      "Valoración de evolución",
      "Ajuste del plan",
      "Continuidad del tratamiento",
      "Seguimiento médico",
    ],
    ctaLabel: "Agenda tu seguimiento",
    shortCopy:
      "Consulta mensual para dar continuidad al plan médico y valorar evolución.",
  },

  "epigenetica": {
    aliases: [
      "epigenética",
      "epigenetica",
      "estudio epigenético",
      "estudio epigenetico",
      "cabello",
      "estudio con cabello",
    ],
    title: "ESTUDIO EPIGENÉTICO",
    subtitle:
      "Estudio complementario con muestra de cabello para orientar un plan integral personalizado.",
    bullets: [
      "Adultos, niños y deportistas",
      "Muestra de cabello",
      "Orientación personalizada",
      "Apoyo al plan integral",
    ],
    ctaLabel: "Solicita información",
    shortCopy:
      "Estudio complementario con muestra de cabello para orientar un plan integral personalizado.",
  },

  "sueroterapia-iv": {
    aliases: [
      "sueroterapia",
      "suero",
      "sueros",
      "suero intravenoso",
      "sueros intravenosos",
      "iv",
      "vitaminado",
      "vitaminados",
    ],
    title: "SUEROS INTRAVENOSOS",
    subtitle:
      "Protocolos de apoyo aplicados bajo valoración médica previa y supervisión profesional.",
    bullets: [
      "Valoración previa",
      "Protocolos personalizados",
      "Supervisión médica",
      "Opciones según cada caso",
    ],
    ctaLabel: "Solicita valoración",
    shortCopy:
      "Sueros intravenosos bajo valoración médica previa, con protocolos personalizados según cada caso.",
  },

  "medicina-regenerativa": {
    aliases: [
      "medicina regenerativa",
      "regenerativa",
      "células madre",
      "celulas madre",
      "terapia regenerativa",
      "regeneración",
      "regeneracion",
    ],
    title: "MEDICINA REGENERATIVA",
    subtitle:
      "Enfoque médico individualizado orientado al apoyo de procesos de reparación y función.",
    bullets: [
      "Valoración médica previa",
      "Plan personalizado",
      "Seguimiento profesional",
      "Enfoque regenerativo",
    ],
    ctaLabel: "Solicita valoración",
    shortCopy:
      "Medicina regenerativa bajo valoración médica previa, con enfoque individualizado y seguimiento profesional.",
  },

  "hidroterapia-colon": {
    aliases: [
      "hidroterapia",
      "hidroterapia de colon",
      "colon",
      "colónico",
      "colonico",
    ],
    title: "HIDROTERAPIA DE COLON",
    subtitle:
      "Procedimiento con equipo especializado, realizado bajo valoración y cuidado profesional.",
    bullets: [
      "Equipo especializado",
      "Valoración previa",
      "Procedimiento guiado",
      "Atención profesional",
    ],
    ctaLabel: "Pide informes",
    shortCopy:
      "Hidroterapia de colon con equipo especializado, valoración previa y atención profesional.",
  },

  "terapia-neural": {
    aliases: [
      "terapia neural",
      "neural",
      "dolor",
      "dolor crónico",
      "dolor cronico",
    ],
    title: "TERAPIA NEURAL",
    subtitle:
      "Enfoque complementario aplicado bajo valoración médica y seguimiento personalizado.",
    bullets: [
      "Valoración individual",
      "Atención profesional",
      "Seguimiento médico",
      "Enfoque complementario",
    ],
    ctaLabel: "Solicita valoración",
    shortCopy:
      "Terapia neural con valoración médica individual y seguimiento profesional.",
  },

  "nebulizacion": {
    aliases: [
      "nebulización",
      "nebulizacion",
      "nebulizaciones",
      "nebulización homeopática",
      "nebulizacion homeopatica",
    ],
    title: "NEBULIZACIÓN",
    subtitle:
      "Apoyo terapéutico indicado según valoración médica y plan individualizado.",
    bullets: [
      "Valoración médica previa",
      "Plan individualizado",
      "Supervisión profesional",
      "Seguimiento médico",
    ],
    ctaLabel: "Solicita información",
    shortCopy:
      "Nebulización como apoyo terapéutico bajo valoración médica y plan individualizado.",
  },

  "videollamada": {
    aliases: [
      "videollamada",
      "video llamada",
      "consulta por videollamada",
      "consulta a distancia",
      "consulta online",
      "consulta remota",
    ],
    title: "CONSULTA POR VIDEOLLAMADA",
    subtitle:
      "Atención médica para pacientes que no pueden acudir de forma presencial.",
    bullets: [
      "Historia clínica completa",
      "Revisión de estudios",
      "Plan de tratamiento",
      "Seguimiento a distancia",
    ],
    ctaLabel: "Agenda por WhatsApp",
    shortCopy:
      "Consulta por videollamada con historia clínica completa, revisión de estudios, plan y seguimiento.",
  },

  "bienestar-integral": {
    aliases: [
      "bienestar integral",
      "medicina preventiva",
      "fatiga crónica",
      "fatiga cronica",
      "suplementación",
      "suplementacion",
      "suplementos",
      "tdah",
      "déficit de atención",
      "deficit de atencion",
    ],
    title: "ATENCIÓN MÉDICA INTEGRAL",
    subtitle:
      "Enfoque profesional, ético y personalizado para acompañar cada caso.",
    bullets: [
      "Valoración médica completa",
      "Plan individualizado",
      "Orientación integral",
      "Seguimiento personalizado",
    ],
    ctaLabel: "Agenda tu cita",
    shortCopy:
      "Atención médica integral con valoración completa, plan individualizado y seguimiento personalizado.",
  },
};

export function normalizeText(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .trim();
}

export function detectUIHServiceKey(input = "") {
  const text = normalizeText(input);

  for (const [key, item] of Object.entries(uihServiceVisualCopy)) {
    const aliases = item.aliases || [];

    for (const alias of aliases) {
      const cleanAlias = normalizeText(alias);

      if (text.includes(cleanAlias)) {
        return key;
      }
    }
  }

  return "bienestar-integral";
}

export function getUIHServiceVisualCopy(input = "") {
  const key = detectUIHServiceKey(input);
  return {
    key,
    ...uihServiceVisualCopy[key],
  };
}

export function buildForbiddenVisualPrompt() {
  return `
PROHIBIDO ABSOLUTAMENTE:
${uihImagePolicy.forbiddenVisuals.map((item) => `- ${item}`).join("\\n")}
`.trim();
}

export function buildAllowedVisualPrompt() {
  return `
PERMITIDO / DESEADO:
${uihImagePolicy.allowedVisuals.map((item) => `- ${item}`).join("\\n")}
`.trim();
}

export function buildSafeMedicalImagePrompt({
  theme = "",
  service = "",
  engine = "openai",
} = {}) {
  const copy = getUIHServiceVisualCopy(`${theme} ${service}`);

  return `
Crear únicamente una imagen base para publicidad médica de ${uihImagePolicy.brandName}.

SERVICIO:
${copy.title}

ESTILO:
${uihImagePolicy.visualStyle.tone}
Colores discretos: navy, teal, aqua, blanco.
Ambiente realista, sobrio, humano, profesional.

REGLA PRINCIPAL:
No generar personas. No generar doctores. No generar pacientes.
El sistema agregará después la foto real del ${uihImagePolicy.doctorName}, el logo real UIH y los textos.

${buildAllowedVisualPrompt()}

${buildForbiddenVisualPrompt()}

MOTOR SOLICITADO:
${engine}

IMPORTANTE:
No escribir texto dentro de la imagen base.
Dejar espacio limpio para branding, título, CTA y datos institucionales.
`.trim();
}
