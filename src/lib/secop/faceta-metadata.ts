import type { Faceta } from "./facetas";

/**
 * Título y descripción de una ruta facetada (`/licitaciones/{familia}/{slug}`).
 *
 * Con la cifra de abiertos cuando se conoce: "Licitaciones de agua en
 * Antioquia · 5.155 procesos abiertos" dice más en un resultado de búsqueda que
 * "Antioquia · Licitaciones de agua y saneamiento", y es lo que alguien busca.
 * Sin cifra —la base no respondió, o la familia no la calcula— se queda en la
 * forma de siempre: nunca una cifra inventada.
 *
 * El layout añade " · AquaLicita" con su `template`.
 */

const numero = new Intl.NumberFormat("es-CO");

/** "Acueducto" → "acueducto"; las siglas (PTAR) se quedan como están. */
const enFrase = (label: string) => (label === label.toUpperCase() ? label : label.toLowerCase());

/** De qué se habla, dicho dentro de una frase. */
function tema(faceta: Faceta): string {
  if (faceta.familia === "departamento") return `de agua y saneamiento en ${faceta.label}`;
  if (faceta.familia === "tipo") {
    return faceta.slug === "otros"
      ? "de agua y saneamiento sin subsistema identificado"
      : `de ${enFrase(faceta.label)} en Colombia`;
  }
  return `de agua y saneamiento de ${enFrase(faceta.label)}`;
}

export function metadataDeFaceta(faceta: Faceta) {
  const n = faceta.abiertos;
  const conCifra = n != null && n > 0;
  const procesos = n === 1 ? "1 proceso abierto" : `${numero.format(n ?? 0)} procesos abiertos`;
  const titulo =
    faceta.familia === "departamento"
      ? `Licitaciones de agua en ${faceta.label}`
      : `Licitaciones ${tema(faceta)}`;
  // La frase de la faceta solo cuando dice algo más: en un tipo explica el
  // subsistema; en un departamento repetiría "abiertos en Antioquia".
  const extra = faceta.familia === "departamento" ? "" : ` ${faceta.descripcion}`;

  return {
    title: conCifra
      ? `${titulo} · ${procesos}`
      : `${faceta.label} · Licitaciones de agua y saneamiento`,
    description: conCifra
      ? `${procesos[0].toUpperCase()}${procesos.slice(1)} ${tema(faceta)} en el SECOP II, cada uno con su ficha: qué se contrata, si puedes participar y qué te falta.${extra}`
      : faceta.descripcion,
    alternates: { canonical: `/licitaciones/${faceta.familia}/${faceta.slug}` },
  };
}
