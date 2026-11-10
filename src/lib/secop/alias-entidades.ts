/**
 * Siglas con las que se conoce a una entidad y que NO aparecen en su razón
 * social, por lo que la búsqueda por nombre no las encuentra.
 *
 * Caso real (2026-11-10): «EMCALI» devolvía solo EMCALIMA (NIT 805011107), que es
 * otra entidad; la empresa de Cali está registrada como «EMPRESAS MUNICIPALES DE
 * CALI» (NIT 890399003). Un alias es una decisión explícita y verificable, por
 * NIT —el identificador estable—, nunca una coincidencia aproximada. Cada NIT se
 * comprobó contra la tabla `entidad` de la base viva (un NIT por entidad).
 */

export interface AliasEntidad {
  /** NIT canónico (9 dígitos, sin dígito de verificación). */
  nit: string;
  /** Aviso para el usuario cuando hay otra entidad con nombre parecido. */
  nota: string | null;
}

export const ALIAS_ENTIDADES: Readonly<Record<string, AliasEntidad>> = {
  emcali: {
    nit: "890399003",
    nota: "EMCALI es «Empresas Municipales de Cali» (NIT 890399003). EMCALIMA (NIT 805011107) es otra entidad.",
  },
  uaesp: { nit: "900126860", nota: null },
  eaab: { nit: "899999094", nota: null },
};

/** Sigla exacta (una sola palabra, sin tildes ni mayúsculas) → su entidad. */
export function aliasDeBusqueda(texto: string): (AliasEntidad & { clave: string }) | null {
  const clave = texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  const alias = ALIAS_ENTIDADES[clave];
  return alias ? { clave, ...alias } : null;
}
