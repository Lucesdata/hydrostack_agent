/**
 * Empresas de servicios públicos (Ley 142) — por qué el escalón calla ahí.
 *
 * El diagnóstico calcula un escalón sobre la escalera de la Ley 80/1150
 * (mínima cuantía → menor cuantía → licitación pública). Las E.S.P. no están
 * en esa escalera: el artículo 31 de la Ley 142 de 1994, modificado por la Ley
 * 689 de 2001, somete sus contratos **al derecho privado**, y cada empresa fija
 * sus propias modalidades y topes en un manual de contratación que aprueba su
 * junta directiva. No hay regla nacional que un cuestionario pueda evaluar.
 *
 * Por eso `normalizarModalidad` devuelve `null` para "Contratación régimen
 * especial" y la tarjeta se queda sin aviso. Este módulo existe para que ese
 * silencio se explique en vez de parecer un olvido: no dice si el oferente
 * puede participar —nadie puede saberlo sin el manual de esa empresa— sino por
 * qué su escalón no aplica ahí.
 *
 * ATENCIÓN: "régimen especial" NO es sinónimo de Ley 142. En ese mismo cajón
 * publican hospitales (E.S.E., Ley 100), universidades (Ley 30), Ecopetrol y
 * el Banco de la República. Como no existe ningún campo en los datos que
 * marque a una E.S.P., hay que reconocerla por el nombre de la entidad, y de
 * ahí las exclusiones explícitas de abajo. Medición sobre datos reales en
 * docs/diagnostico/03-variante-ley-142.md §1.
 */

/** minúsculas y sin acentos, para comparar nombres de entidad. */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Entidades que están en el cajón de régimen especial pero NO son E.S.P.
 * Se evalúan primero: `e.s.e.` y `e.s.p.` se distinguen por una letra, y
 * confundirlas le diría a alguien que un hospital se rige por la Ley 142.
 */
const NO_ES_ESP: readonly RegExp[] = [
  /(^|[^a-z])e\.?\s?s\.?\s?e\.?([^a-z]|$)/, // empresa social del estado (salud)
  /hospital|servicios de salud|clinica/,
  /universidad|colegio mayor|escuela superior/,
  /banco de la republica/,
  /ecopetrol|empresa colombiana de petroleos/,
  // Reguladores y ministerios del sector: llevan "agua potable y saneamiento
  // basico" en el nombre pero no prestan el servicio. La CRA es el caso real.
  /comision de regulacion|superintendencia|ministerio|departamento nacional/,
];

/**
 * Señales de E.S.P. Varias empresas reales no llevan la sigla —"EMPRESAS
 * MUNICIPALES DE CALI", "ACUASAN"— así que además de `E.S.P.` se buscan las
 * formas largas y el objeto social.
 */
const ES_ESP: readonly RegExp[] = [
  /(^|[^a-z])e\.?\s?s\.?\s?p\.?([^a-z]|$)/,
  /empresas? (municipal(es)?|publicas?|de servicios publicos)/,
  /servicios publicos/,
  /acueducto|alcantarillado|(^|[^a-z])aguas( |$)|acuavalle|acuasan/,
  // "EMPRESA DE AGUA POTABLE Y SANEAMIENTO BASICO DE ORITO" y similares: son
  // E.S.P. de agua sin la sigla ni la palabra "acueducto" en el nombre.
  /agua potable|saneamiento basico/,
];

/**
 * ¿El nombre de la entidad parece una empresa de servicios públicos?
 * Heurística, no dato: ante la duda devuelve `false`, porque un falso positivo
 * le muestra al usuario una explicación jurídica que no le corresponde.
 */
export function pareceEsp(nombreEntidad: string | null | undefined): boolean {
  if (!nombreEntidad) return false;
  const nombre = normalizar(nombreEntidad);
  if (NO_ES_ESP.some((re) => re.test(nombre))) return false;
  return ES_ESP.some((re) => re.test(nombre));
}

/** ¿La modalidad del proceso es régimen especial (con o sin ofertas)? */
export function esRegimenEspecial(modalidad: string | null | undefined): boolean {
  if (!modalidad) return false;
  return normalizar(modalidad).includes("regimen especial");
}

/**
 * Etiqueta corta para la tarjeta, o `null` si no hay nada que explicar.
 * Solo cuando ambas cosas se cumplen: régimen especial Y entidad que parece
 * E.S.P. Un proceso de régimen especial de una universidad no es Ley 142 y
 * aquí se calla, que es lo correcto: no sabemos qué régimen lo gobierna.
 */
export function avisoRegimenPrivado(
  modalidad: string | null | undefined,
  nombreEntidad: string | null | undefined
): string | null {
  if (!esRegimenEspecial(modalidad) || !pareceEsp(nombreEntidad)) return null;
  return "Ley 142 · régimen privado";
}

/** Explicación larga, para mostrar UNA vez sobre la lista, no por tarjeta. */
export const NOTA_REGIMEN_PRIVADO =
  "Algunos de estos procesos los publica una empresa de servicios públicos, que contrata bajo derecho privado (Ley 142 de 1994). Ahí no existen la mínima cuantía ni la licitación pública: cada empresa fija sus requisitos en su propio manual de contratación, así que tu escalón no te dice si puedes participar. Consulta el manual de la entidad antes de preparar la oferta.";
