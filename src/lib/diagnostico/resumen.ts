/**
 * Resúmenes de texto del diagnóstico para vistas compactas.
 *
 * Vive en lib y no dentro del componente porque es lógica pura con ramas, y
 * porque un .tsx no se puede importar desde un test: el tsconfig de Next usa
 * `jsx: "preserve"` y esbuild no transforma el JSX bajo Vitest. Misma razón por
 * la que el repo no tiene tests de componentes.
 */

const MAX_LISTADOS = 3;

/**
 * Cuántos pendientes quedan fuera de los que el panel alcanza a listar.
 * Cadena vacía si no queda ninguno.
 */
export function restantesTexto(duros: number, blandos: number): string {
  const durosOcultos = Math.max(0, duros - MAX_LISTADOS);
  const total = durosOcultos + blandos;
  if (total === 0) return "";
  if (durosOcultos === 0) {
    return `${blandos} mejora${blandos === 1 ? "" : "s"} más por delante`;
  }
  return `${total} pendiente${total === 1 ? "" : "s"} más`;
}

export { MAX_LISTADOS };
