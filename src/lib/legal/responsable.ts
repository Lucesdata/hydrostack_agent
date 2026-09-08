// src/lib/legal/responsable.ts

/**
 * Identificación del responsable del tratamiento, en un solo sitio.
 *
 * El artículo 13 del Decreto 1377 de 2013 exige que la política de tratamiento
 * publique nombre, domicilio, dirección, correo y teléfono del responsable. Los
 * dos documentos legales (/privacy y /terms) tienen que decir exactamente lo
 * mismo sobre esto: si divergen, el que valga es indeterminable. Por eso viven
 * aquí y no incrustados en el JSX de cada página.
 *
 * PENDIENTE: `direccion` y `telefono` están en null a propósito, no por
 * descuido — no hay dirección física ni línea de atención fijadas todavía, e
 * inventarlas en un documento legal es peor que omitirlas. Las páginas detectan
 * el null y declaran el correo como canal único, que es lo que hoy es cierto.
 * Al fijarlos, rellénalos aquí y aparecen en ambos documentos a la vez.
 */

export const RESPONSABLE = {
  /** Persona natural, no sociedad: decisión del titular del proyecto. */
  nombre: "Giovanny Guevara Duque",
  calidad: "persona natural",
  pais: "Colombia",
  correo: "lucesproject@gmail.com",
  direccion: null as string | null,
  telefono: null as string | null,
} as const;

/** Fecha de entrada en vigor de la versión publicada de ambos documentos. */
export const VIGENCIA = "8 de septiembre de 2026";
