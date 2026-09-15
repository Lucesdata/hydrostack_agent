/**
 * Clase de entidad contratante — la faceta "Por entidad" de la portada.
 *
 * Es una clasificación DERIVADA del nombre y del nivel de gobierno, igual que
 * el tipo de proyecto lo es del objeto. Y por el mismo motivo vive en una sola
 * constante: la usan la tarjeta de faceta, la ruta `/licitaciones/entidad/[slug]`
 * y la ficha, y tres copias del mismo `case` se desincronizan a la primera.
 *
 * ── Por qué la regla se escribe una vez y se emite a SQL ────────────────────
 * El tipo de proyecto hubo que persistirlo porque su regla —podar la razón
 * social antes de puntuar— no se puede expresar en un `WHERE`. Esta sí: son
 * patrones sobre el nombre. Así que en vez de una columna nueva y su migración,
 * `sqlClaseEntidad()` genera el `CASE` desde los MISMOS patrones que usa
 * `claseDeEntidad()`. Una definición, dos consumidores, cero migraciones.
 *
 * Los patrones no son adivinados: salen de medir los 4.223 nombres reales de la
 * tabla `entidad` (2026-09-15).
 */

/** Los cinco valores. `otras` va al final, como en la taxonomía de proyecto. */
export const CLASES_ENTIDAD = ["esp", "alcaldia", "gobernacion", "nacional", "otras"] as const;

export type ClaseEntidad = (typeof CLASES_ENTIDAD)[number];

interface MetaClaseEntidad {
  label: string;
  slug: string;
  descripcion: string;
  /**
   * Patrones sobre el nombre normalizado (minúsculas, sin tildes). El orden de
   * CLASES_ENTIDAD es el de evaluación: la primera que casa, gana.
   */
  patrones: readonly string[];
}

export const CLASE_ENTIDAD: Record<ClaseEntidad, MetaClaseEntidad> = {
  esp: {
    label: "Empresas de servicios públicos",
    slug: "esp",
    descripcion: "Prestadores del servicio: acueductos municipales, empresas de aguas y ESP.",
    // "empresas publicas de X" y "aguas de X" son las dos formas más comunes de
    // nombrar un prestador; "e.s.p." es la coletilla de razón social.
    patrones: [
      "empresa.*servicios publicos",
      "empresas publicas",
      "e\\.?s\\.?p\\.?( |$)",
      "aguas de ",
      "acueducto",
      "alcantarillado",
      "empocab|empoduitama|empocaldas|emcali|epm|triple a",
    ],
  },
  alcaldia: {
    label: "Alcaldías y municipios",
    slug: "alcaldias",
    descripcion: "Administraciones municipales y distritales.",
    patrones: ["alcaldia", "^municipio de", " municipio de", "distrito de"],
  },
  gobernacion: {
    label: "Gobernaciones",
    slug: "gobernaciones",
    descripcion: "Administraciones departamentales.",
    patrones: ["gobernacion", "^departamento de", "^departamento del"],
  },
  nacional: {
    label: "Nivel nacional",
    slug: "nacional",
    descripcion: "Ministerios, institutos, corporaciones autónomas y demás entidades nacionales.",
    // Aquí el nivel de gobierno manda sobre el nombre: lo trae la fuente y es
    // más fiable que adivinar por la razón social. El patrón queda para los
    // casos en que el nivel viene vacío.
    patrones: ["ministerio", "instituto nacional", "unidad nacional", "corporacion autonoma"],
  },
  otras: {
    label: "Otras entidades",
    slug: "otras",
    descripcion: "Entidades contratantes que no encajan en las categorías anteriores.",
    patrones: [],
  },
};

export const CLASE_ENTIDAD_POR_SLUG: Record<string, ClaseEntidad> = Object.fromEntries(
  CLASES_ENTIDAD.map((c) => [CLASE_ENTIDAD[c].slug, c])
) as Record<string, ClaseEntidad>;

/** Orden de evaluación: el primero que casa gana. `otras` nunca casa, es el resto. */
const ORDEN: ReadonlyArray<Exclude<ClaseEntidad, "otras">> = [
  "esp",
  "alcaldia",
  "gobernacion",
  "nacional",
];

function normalizar(s: string | null | undefined): string {
  if (!s) return "";
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Clasifica una entidad. `nivelGobierno` es el que trae la fuente
 * (`territorial | nacional | corporacion_autonoma | otro`, D24) y **gana sobre
 * el nombre** cuando dice "nacional" o "corporación autónoma": es un dato
 * declarado, no una inferencia sobre una cadena de texto.
 */
export function claseDeEntidad(
  nombre: string | null | undefined,
  nivelGobierno?: string | null
): ClaseEntidad {
  const n = normalizar(nombre);
  const nivel = normalizar(nivelGobierno);

  // Una ESP con nivel "territorial" sigue siendo ESP: el nivel solo decide
  // cuando el nombre no delata a un prestador.
  if (new RegExp(CLASE_ENTIDAD.esp.patrones.join("|")).test(n)) return "esp";
  if (nivel === "nacional" || nivel === "corporacion autonoma") return "nacional";

  for (const clase of ORDEN) {
    if (clase === "esp") continue;
    const p = CLASE_ENTIDAD[clase].patrones;
    if (p.length > 0 && new RegExp(p.join("|")).test(n)) return clase;
  }
  return "otras";
}

/**
 * El mismo criterio, emitido como expresión SQL para poder AGRUPAR y FILTRAR
 * por clase sin una columna nueva.
 *
 * Duplicar una regla en dos lenguajes es justo lo que suele desincronizarse, así
 * que no se deja a la confianza: `clase-entidad.test.ts` compara las dos
 * implementaciones sobre los 4.223 nombres reales de la tabla y falla si
 * discrepan en uno solo. La duplicación es segura porque está vigilada.
 *
 * Recibe los fragmentos ya construidos por el llamador (columna de nombre y de
 * nivel) para no importar el esquema aquí y poder usarse con alias distintos.
 */
export function sqlClaseEntidad(nombreCol: string, nivelCol: string): string {
  const norm = (c: string) =>
    `lower(translate(coalesce(${c},''),'áéíóúüÁÉÍÓÚÜñÑ','aeiouuAEIOUUnN'))`;
  const n = norm(nombreCol);
  const nivel = norm(nivelCol);
  const casa = (clase: Exclude<ClaseEntidad, "otras">) =>
    `${n} ~ '${CLASE_ENTIDAD[clase].patrones.join("|")}'`;

  // El orden replica exactamente el de `claseDeEntidad()`.
  return `case
    when ${casa("esp")} then 'esp'
    when ${nivel} in ('nacional','corporacion autonoma') then 'nacional'
    when ${casa("alcaldia")} then 'alcaldia'
    when ${casa("gobernacion")} then 'gobernacion'
    when ${casa("nacional")} then 'nacional'
    else 'otras' end`;
}
