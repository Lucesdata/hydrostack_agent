/**
 * El panel de una región del hero (spec 2026-10-07-hero-tres-destacados, PR 3):
 * al pulsar un departamento en el mapa contado por familia, sus procesos de esa
 * familia publicados en 2026, de mayor a menor presupuesto.
 *
 * Dos consultas pequeñas en paralelo: el conteo, con las mismas condiciones que
 * `conteosPorFamilia()` para que el panel diga el mismo número que el mapa, y
 * los primeros `LIMITE_REGION`, que además exigen lo que la ficha necesita para
 * enlazarse (número, objeto, id `CO1.<X>.<n>`). Sin presupuesto publicado van
 * al final, nunca como «$0».
 */

import { and, desc, eq, gte, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "../db/client";
import { entidad, geografia, proceso } from "../db/schema";
import { CODIGOS_CON_ANCLA } from "../mapa/etiquetas-procesos";
import {
  FAMILIAS_DESTACADAS,
  tiposDeFamilia,
  type FamiliaDestacada,
} from "../landing/destacados-portada";
import { DESDE_CONTEOS, LIMITE_REGION, type RegionFamilia } from "../landing/conteos-familia";
import { procesoPortadaDesdeFila } from "../landing/proceso-portada";
import { condicionAbierto } from "./agregados";

export function esRegionValida(dpto: unknown, familia: unknown): familia is FamiliaDestacada {
  return (
    typeof dpto === "string" &&
    CODIGOS_CON_ANCLA.includes(dpto) &&
    typeof familia === "string" &&
    (FAMILIAS_DESTACADAS as readonly string[]).includes(familia)
  );
}

export async function regionFamilia(
  dpto: string,
  familia: FamiliaDestacada
): Promise<RegionFamilia> {
  const base = and(
    isNull(proceso.deletedAt),
    gte(proceso.fechaPublicacion, DESDE_CONTEOS),
    inArray(proceso.tipoProyecto, tiposDeFamilia(familia)),
    eq(geografia.departamentoCodigo, dpto)
  );

  const [[conteo], filas] = await Promise.all([
    db
      .select({
        nombre: sql<string | null>`min(${geografia.departamentoNombre})`,
        n: sql<number>`count(*)::int`,
        abiertos: sql<number>`(count(*) filter (where ${condicionAbierto()}))::int`,
      })
      .from(proceso)
      .innerJoin(geografia, eq(geografia.codigoDivipola, proceso.geografiaId))
      .where(base),
    db
      .select({
        secopProcesoId: proceso.secopProcesoId,
        referencia: proceso.referencia,
        objeto: proceso.objeto,
        descripcion: proceso.descripcion,
        entidadNombre: entidad.nombre,
        estadoActual: proceso.estadoActual,
        estadoApertura: proceso.estadoApertura,
        fechaRecepcion: proceso.fechaRecepcion,
        tipoProyecto: proceso.tipoProyecto,
        valorEstimado: proceso.valorEstimado,
        departamentoCodigo: geografia.departamentoCodigo,
        departamentoNombre: geografia.departamentoNombre,
        municipioNombre: geografia.municipioNombre,
      })
      .from(proceso)
      .innerJoin(geografia, eq(geografia.codigoDivipola, proceso.geografiaId))
      .leftJoin(entidad, eq(proceso.entidadId, entidad.id))
      .where(
        and(
          base,
          isNotNull(proceso.referencia),
          sql`btrim(${proceso.referencia}) <> ''`,
          isNotNull(proceso.objeto),
          sql`btrim(${proceso.objeto}) <> ''`,
          sql`${proceso.secopProcesoId} ~* '^CO1\\.[A-Z]+\\.[0-9]+$'`
        )
      )
      // El 0 del SECOP se guarda como NULL: va al final con los que no lo publican.
      .orderBy(
        sql`${proceso.valorEstimado} desc nulls last`,
        desc(proceso.fechaPublicacion),
        proceso.secopProcesoId
      )
      .limit(LIMITE_REGION),
  ]);

  const procesos = filas.flatMap((f) => {
    const p = procesoPortadaDesdeFila(f);
    return p ? [{ ...p, cierre: f.fechaRecepcion ?? null }] : [];
  });

  return {
    dpto,
    nombre: conteo?.nombre ?? procesos[0]?.departamento ?? dpto,
    familia,
    conteo: { n: conteo?.n ?? 0, abiertos: conteo?.abiertos ?? 0 },
    procesos,
  };
}
