/**
 * Slugs de la superficie pública: facetas y fichas.
 *
 * Funciones puras, sin base de datos, en su propio módulo para que los
 * componentes de navegador (el buscador del hero) puedan construir el enlace de
 * una ficha sin arrastrar el cliente de Postgres. `agregados.ts` y `ficha.ts`
 * las reexportan: las importaciones de siempre no cambian.
 */

/** Acentos fuera, espacios y signos a guiones. Estable: es superficie SEO. */
export function slugificar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * El slug de una ficha: texto legible + el id nativo, separados por `--`.
 *
 * El doble guion no es capricho: el slug del objeto puede contener guiones
 * simples, así que partir por el último `-` daría un id truncado. Los 90.622
 * identificadores del SECOP tienen la misma forma (`CO1.REQ.<dígitos>`, 11 a 16
 * caracteres) y ninguno trae un carácter que haya que escapar en una URL — se
 * comprobó—, así que el id viaja tal cual y la resolución es exacta, sin
 * transformarlo de ida y vuelta.
 */
export function slugDeProceso(objeto: string | null, secopProcesoId: string): string {
  const texto = slugificar(objeto ?? "")
    .split("-")
    .slice(0, 9)
    .join("-");
  return texto ? `${texto}--${secopProcesoId}` : secopProcesoId;
}

/** Extrae el id nativo de un slug. `null` si el slug no lo lleva. */
export function idDesdeSlug(slug: string): string | null {
  const id = slug.includes("--") ? slug.slice(slug.lastIndexOf("--") + 2) : slug;
  return /^CO1\.[A-Z]+\.\d+$/i.test(id) ? id.toUpperCase() : null;
}
