/**
 * Las preguntas frecuentes de la portada. Una sola lista para el texto que se
 * ve y para el JSON-LD `FAQPage`: Google exige que el marcado repita el
 * contenido visible, y dos copias acabarían diciendo cosas distintas.
 *
 * Cada respuesta dice lo que el producto hace hoy, no lo que hará:
 * - La ingesta es una consulta programada al día (`/api/cron/tick`) que retoma
 *   donde quedó la anterior (watermark en `sync_log`).
 * - La explicación de cada requisito pide cuenta (`verdict-publico.ts`).
 * - El plan pro no tiene precio publicado (`S7Acceso`, `/precios`).
 * - Nada de alertas por correo: no se entregan en producción (PENDIENTES §0).
 */

export interface PreguntaFrecuente {
  pregunta: string;
  respuesta: string;
}

export const PREGUNTAS_FRECUENTES: readonly PreguntaFrecuente[] = [
  {
    pregunta: "¿De dónde salen los datos?",
    respuesta:
      "De los datos abiertos del SECOP II que Colombia Compra Eficiente publica en datos.gov.co. AquaLicita se queda con los procesos de agua y saneamiento y los clasifica por tipo de obra: acueducto, alcantarillado, PTAP, PTAR u otros.",
  },
  {
    pregunta: "¿Cada cuánto se actualiza?",
    respuesta:
      "Hay una consulta programada a SECOP II al día, y cada una retoma donde quedó la anterior. La franja «El mercado ahora» dice cuándo fue la última. Sus cifras de nuevos en 7 días y de dinero en juego este mes se consultan en directo.",
  },
  {
    pregunta: "¿Qué es una ficha?",
    respuesta:
      "La página de cada proceso: qué se contrata, si todavía recibe ofertas, si puedes participar según los requisitos que se pueden comprobar y qué te falta.",
  },
  {
    pregunta: "¿Es gratis?",
    respuesta:
      "Explorar procesos, abrir su ficha, ver el semáforo de cada requisito y hacer el diagnóstico no piden cuenta. Con una cuenta gratuita guardas tu perfil y tus filtros y ves la explicación de cada requisito. La extracción de pliegos y los asistentes figuran como plan pro, que todavía no tiene precio publicado.",
  },
  {
    pregunta: "¿Por qué la suma del mapa no da el total nacional?",
    respuesta:
      "Cada proceso se ubica por la sede de la entidad que contrata, y algunos no tienen ubicación resuelta: cuentan en el total de Colombia, pero en ningún departamento.",
  },
];

/** El JSON-LD `FAQPage` de schema.org, con el mismo texto que se ve. */
export function faqJsonLd(preguntas: readonly PreguntaFrecuente[] = PREGUNTAS_FRECUENTES) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: preguntas.map((p) => ({
      "@type": "Question",
      name: p.pregunta,
      acceptedAnswer: { "@type": "Answer", text: p.respuesta },
    })),
  };
}

/**
 * JSON listo para un `<script>`: `<` escapado, para que un `</script>` en un
 * texto no pueda cerrar la etiqueta.
 */
export function jsonLdSeguro(datos: unknown): string {
  return JSON.stringify(datos).replace(/</g, "\\u003c");
}
