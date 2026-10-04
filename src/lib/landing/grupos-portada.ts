/**
 * Los grupos de procesos del hero (2026-10-04, opción D: recorrido + «Ver otros
 * 5 procesos»).
 *
 * El servidor sortea hasta `TAMANO_MUESTRA` procesos en la misma consulta de
 * siempre (`muestraPortada`) y el hero los muestra de `TAMANO_GRUPO` en
 * `TAMANO_GRUPO`. El mapa del servidor dibuja las etiquetas de todos los grupos
 * y el navegador solo enciende el visible: cambiar de grupo no pide nada a la
 * red ni manda geometría al cliente.
 *
 * Puro: lo usan el mapa (servidor) y el hero (cliente), así que los dos parten
 * la lista exactamente igual.
 */

import { familiaDe, type ProcesoPortada } from "./proceso-portada";

export const TAMANO_GRUPO = 5;
/** Seis grupos de cinco: suficiente variedad sin cargar el HTML. */
export const TAMANO_MUESTRA = 30;

/** La lista en grupos de `TAMANO_GRUPO`, en su orden; el último puede ser menor. */
export function gruposDe<T>(procesos: T[], tamano = TAMANO_GRUPO): T[][] {
  const grupos: T[][] = [];
  for (let i = 0; i < procesos.length; i += tamano) grupos.push(procesos.slice(i, i + tamano));
  return grupos;
}

/**
 * La familia de color de cada departamento con procesos en el grupo: la de
 * todos ellos si coinciden, "mixta" si no (resaltado neutro, spec §7.6).
 */
export function familiasPorDepartamento(
  procesos: Pick<ProcesoPortada, "departamentoCodigo" | "tipoProyecto">[]
): Map<string, string> {
  const out = new Map<string, string>();
  for (const p of procesos) {
    const f = familiaDe(p.tipoProyecto);
    const previa = out.get(p.departamentoCodigo);
    out.set(p.departamentoCodigo, previa && previa !== f ? "mixta" : f);
  }
  return out;
}
