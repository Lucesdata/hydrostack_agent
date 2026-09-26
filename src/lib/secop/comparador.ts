/**
 * Lógica pura del comparador de departamentos (`/licitaciones/comparar`).
 *
 * La selección vive en el hash de la URL (`#05,76,11`) y no en la query: leer
 * `searchParams` volvería dinámica una ruta pública, que es justo lo que el
 * proyecto evita (PENDIENTES §40). El hash no llega al servidor, así que la
 * página sigue siendo estática y la selección se puede compartir igual.
 */

export const MAX_COMPARADOS = 3;

/** "#05,76" → ["05","76"]: solo claves que existen, sin repetir, como mucho tres. */
export function clavesDesdeHash(hash: string, validas: ReadonlySet<string>): string[] {
  const vistas = new Set<string>();
  for (const c of hash.replace(/^#/, "").split(",")) {
    const clave = decodeURIComponent(c).trim();
    if (validas.has(clave)) vistas.add(clave);
    if (vistas.size === MAX_COMPARADOS) break;
  }
  return [...vistas];
}

export function hashDesdeClaves(claves: readonly (string | null)[]): string {
  const limpias = claves.filter((c): c is string => !!c);
  return limpias.length ? `#${limpias.join(",")}` : "";
}

/** Los dos con más procesos: una comparación con sentido para quien llega sin elegir. */
export function seleccionInicial<T extends { clave: string; n: number }>(
  filas: readonly T[]
): string[] {
  return [...filas]
    .sort((a, b) => b.n - a.n)
    .slice(0, 2)
    .map((f) => f.clave);
}
