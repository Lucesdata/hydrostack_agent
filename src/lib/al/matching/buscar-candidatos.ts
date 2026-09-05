/**
 * Universo de candidatos para un filtro de usuario (SDD §6.3).
 *
 * **SQL acota el universo; NO aplica ningún criterio del usuario.** La consulta
 * solo restringe por estado del proceso y borrado lógico, que son alcance, no
 * criterio. Entidad, zona, modalidad, cuantía, texto y UNSPSC los decide entero
 * `evaluarFiltro`.
 *
 * Dos razones, y las dos se aprendieron a golpes en este módulo:
 *
 * 1. **Un criterio aplicado en SQL es un descarte que `al_descartes` nunca ve.**
 *    La primera versión filtraba zona y cuantía en el `WHERE`, y el resultado
 *    fue que `fuera_de_zona`, `fuera_de_cuantia`, `entidad_no_listada` y
 *    `modalidad_no_listada` no podían aparecer jamás en la auditoría: cuatro de
 *    los siete motivos eran código muerto. El usuario no podía saber que perdió
 *    una licitación por estar fuera de su departamento — que es justo el tipo de
 *    silencio que este módulo existe para hacer visible.
 * 2. **Duplicar la semántica en SoQL y en TS es cómo divergen.** Ya hay que
 *    mantener la comparación de texto insensible a tildes en un solo sitio;
 *    mantener además el resto de predicados en dos lenguajes es pedir que se
 *    separen, y el síntoma de que se separen vuelve a ser silencio.
 *
 * El coste es despreciable: la red sectorial ya se aplicó en ingesta, así que el
 * universo abierto son ~550 procesos, no 90.000.
 */

import { and, eq, isNull, sql, type SQL } from "drizzle-orm";
import { db } from "@/src/lib/db/client";
import { proceso } from "@/src/lib/db/schema/hechos";
import { entidad } from "@/src/lib/db/schema/catalogos";
import { rawRecord } from "@/src/lib/db/schema/raw";
import { FIELDS_PROCESOS as F } from "@/src/lib/secop/config";
import { UNSPSC_PREFIX } from "@/src/lib/secop/ingest-net";
import type { ProcesoEvaluable } from "./tipos";

export interface OpcionesBusqueda {
  /** Estado del proceso. `null` = cualquiera. Por defecto solo lo que sigue abierto. */
  estado?: string | null;
  limit?: number;
}

const LIMITE_DEFECTO = 2000;

export interface ResultadoBusqueda {
  items: ProcesoEvaluable[];
  /**
   * `true` si se alcanzó el tope y hay candidatos sin mirar. En este módulo eso
   * NO puede pasar en silencio: un truncamiento es exactamente el fallo que
   * `al_descartes` existe para hacer visible. El caller debe reportarlo.
   */
  truncado: boolean;
}

export async function buscarCandidatos(opts: OpcionesBusqueda = {}): Promise<ResultadoBusqueda> {
  const estado = opts.estado === undefined ? "Abierto" : opts.estado;
  const limite = opts.limit ?? LIMITE_DEFECTO;

  const condiciones: SQL[] = [isNull(proceso.deletedAt)];
  if (estado !== null) condiciones.push(eq(proceso.estadoActual, estado));

  const payload = sql`${rawRecord.payload}`;

  const rows = await db
    .select({
      secopProcesoId: proceso.secopProcesoId,
      objeto: proceso.objeto,
      modalidad: proceso.modalidad,
      divipola: proceso.geografiaId,
      entidadNit: entidad.nitCanonico,
      valorEstimado: sql<string | null>`${proceso.valorEstimado}::text`,
      nombre: sql<string | null>`(${payload}->>${F.nombre})`,
      descripcion: sql<string | null>`(${payload}->>${F.descripcion})`,
      unspscRaw: sql<string | null>`(${payload}->>${F.unspsc})`,
    })
    .from(proceso)
    .leftJoin(entidad, eq(entidad.id, proceso.entidadId))
    .leftJoin(rawRecord, eq(rawRecord.id, proceso.rawRecordIdActual))
    .where(and(...condiciones))
    .limit(limite);

  const items = rows.map((r) => ({
    secopProcesoId: r.secopProcesoId,
    objeto: r.objeto,
    nombre: r.nombre,
    descripcion: r.descripcion,
    unspsc: normalizarUnspsc(r.unspscRaw),
    entidadNit: r.entidadNit,
    divipola: r.divipola,
    modalidad: r.modalidad,
    valorEstimado: r.valorEstimado,
  }));

  return { items, truncado: rows.length >= limite };
}

/** "V1.83101500" -> "83101500". El prefijo es de versión, no del código. */
function normalizarUnspsc(raw: string | null): string | null {
  if (!raw) return null;
  const s = raw.startsWith(UNSPSC_PREFIX) ? raw.slice(UNSPSC_PREFIX.length) : raw;
  const d = s.replace(/\D/g, "");
  return d || null;
}
