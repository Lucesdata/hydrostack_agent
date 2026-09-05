/**
 * Evaluación de un proceso contra un filtro de usuario (SDD §4.2, §6.3).
 *
 * PURO: sin SQL, sin IO. Se prueba con literales y es el único sitio donde vive
 * la semántica del filtro.
 *
 * **Regla que no se puede reinterpretar: un array vacío o NULL significa "sin
 * restricción", nunca "no coincide con nada".** Un filtro recién creado, sin
 * criterios, debe devolver todo el sector — no silencio.
 *
 * El motivo reportado es la PRIMERA condición que falla, en el orden en que
 * están escritas. El orden importa para la auditoría, no para el resultado: un
 * proceso rechazado lo estaría igual en cualquier orden, pero el motivo que se
 * guarda en `al_descartes` es el primero, y por eso se declara aquí en vez de
 * quedar al azar.
 */

import { stripAccents } from "@/src/lib/transform/normalize";
import type { FiltroValidado } from "@/src/lib/al/filtros/tipos";
import type { ProcesoEvaluable, ResultadoEvaluacion } from "./tipos";

const MATCH: ResultadoEvaluacion = { motivo: null, evidencia: null };

/**
 * Comparación insensible a mayúsculas y tildes.
 *
 * Ojo con la asimetría respecto a la red de ingesta: allí las keywords deben
 * escribirse SIN tilde porque el `upper()` de SoQL no las quita
 * (`secop/ingest-net.ts`). Aquí sí se quitan, en las dos partes, así que
 * "CAPTACIÓN" en el filtro encuentra "CAPTACION" en el objeto. No copiar la
 * regla de allí sin pensar.
 */
function normalizar(s: string): string {
  return stripAccents(s).toUpperCase();
}

function textoDe(p: ProcesoEvaluable): string {
  return normalizar([p.objeto, p.nombre, p.descripcion].filter(Boolean).join("  "));
}

/** `true` si la lista está vacía: sin restricción. */
function sinRestriccion(a: string[] | null | undefined): boolean {
  return !a || a.length === 0;
}

export function evaluarFiltro(
  filtro: FiltroValidado,
  proceso: ProcesoEvaluable
): ResultadoEvaluacion {
  const texto = textoDe(proceso);

  // 1. Coincidencia positiva: UNSPSC union palabras clave.
  // Si el usuario no declaró ninguno de los dos, no hay nada que exigir.
  if (!sinRestriccion(filtro.unspsc) || !sinRestriccion(filtro.palabrasClave)) {
    const unspscHit =
      proceso.unspsc !== null &&
      (filtro.unspsc ?? []).some(
        (c) => proceso.unspsc.startsWith(c) || c.startsWith(proceso.unspsc)
      );
    const keywordHit = (filtro.palabrasClave ?? []).find((k) => texto.includes(normalizar(k)));

    if (!unspscHit && keywordHit === undefined) {
      return {
        motivo: "sin_unspsc_ni_keyword",
        evidencia: {
          unspscProceso: proceso.unspsc,
          unspscFiltro: filtro.unspsc,
          palabrasProbadas: filtro.palabrasClave,
        },
      };
    }
  }

  // 2. Veto por palabra excluida.
  const excluida = (filtro.palabrasExcluidas ?? []).find((k) => texto.includes(normalizar(k)));
  if (excluida !== undefined) {
    return { motivo: "palabra_excluida", evidencia: { termino: excluida } };
  }

  // 3. Entidad.
  if (!sinRestriccion(filtro.entidadesNit)) {
    if (proceso.entidadNit === null || !filtro.entidadesNit.includes(proceso.entidadNit)) {
      return {
        motivo: "entidad_no_listada",
        evidencia: { entidadProceso: proceso.entidadNit, listadas: filtro.entidadesNit },
      };
    }
  }

  // 4. Zona. Un DIVIPOLA de 2 dígitos es el departamento entero: "05" cubre "05001".
  if (!sinRestriccion(filtro.divipola)) {
    const dentro =
      proceso.divipola !== null && filtro.divipola.some((d) => proceso.divipola.startsWith(d));
    if (!dentro) {
      return {
        motivo: "fuera_de_zona",
        evidencia: { divipolaProceso: proceso.divipola, zonas: filtro.divipola },
      };
    }
  }

  // 5. Modalidad.
  if (!sinRestriccion(filtro.modalidades)) {
    const m = proceso.modalidad === null ? null : normalizar(proceso.modalidad);
    const dentro = m !== null && filtro.modalidades.some((x) => normalizar(x) === m);
    if (!dentro) {
      return {
        motivo: "modalidad_no_listada",
        evidencia: { modalidadProceso: proceso.modalidad, listadas: filtro.modalidades },
      };
    }
  }

  // 6. Cuantía.
  // Un proceso SIN valor estimado no se descarta: la fuente publica
  // `precio_base = 0` con frecuencia y castigar ese hueco escondería procesos
  // reales. Es la decisión conservadora: ante la duda, mostrar.
  if (proceso.valorEstimado !== null && (filtro.valorMin !== null || filtro.valorMax !== null)) {
    const v = Number(proceso.valorEstimado);
    const min = filtro.valorMin === null ? -Infinity : Number(filtro.valorMin);
    const max = filtro.valorMax === null ? Infinity : Number(filtro.valorMax);
    if (Number.isFinite(v) && (v < min || v > max)) {
      return {
        motivo: "fuera_de_cuantia",
        evidencia: { valor: proceso.valorEstimado, min: filtro.valorMin, max: filtro.valorMax },
      };
    }
  }

  return MATCH;
}
