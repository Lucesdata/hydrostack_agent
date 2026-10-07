/**
 * Los conteos del mapa del hero por familia y departamento (spec
 * 2026-10-07-hero-tres-destacados, PR 2). Lo puro —tipos, escalones, textos—
 * está en `src/lib/landing/conteos-familia.ts`.
 *
 * **Una consulta**, agrupada por departamento con `count(*) FILTER` por familia:
 * publicados desde `DESDE_CONTEOS` en cualquier etapa y, de ellos, los que
 * reciben ofertas hoy (`condicionAbierto()`). La llama `app/page.js` al
 * regenerarse (ISR de 6 h), junto a `destacadosPortada()`.
 *
 * Solo departamentos que el mapa sabe dibujar; los procesos sin geografía
 * resuelta no se reparten (mismo criterio que `procesosPorDepartamento()`).
 */

import { and, eq, gte, inArray, isNull, sql, type SQL } from "drizzle-orm";
import { db } from "../db/client";
import { geografia, proceso } from "../db/schema";
import { CODIGOS_CON_ANCLA } from "../mapa/etiquetas-procesos";
import { FAMILIAS_DESTACADAS, tiposDeFamilia } from "../landing/destacados-portada";
import { DESDE_CONTEOS, type ConteoDepartamento } from "../landing/conteos-familia";
import { condicionAbierto } from "./agregados";

const cuenta = (condicion: SQL | undefined) =>
  sql<number>`(count(*) filter (where ${condicion}))::int`;

export async function conteosPorFamilia(): Promise<ConteoDepartamento[]> {
  const deFamilia = Object.fromEntries(
    FAMILIAS_DESTACADAS.map((f) => [f, inArray(proceso.tipoProyecto, tiposDeFamilia(f))])
  ) as Record<(typeof FAMILIAS_DESTACADAS)[number], SQL>;

  const filas = await db
    .select({
      dpto: geografia.departamentoCodigo,
      nombre: sql<string>`min(${geografia.departamentoNombre})`,
      potableN: cuenta(deFamilia.potable),
      potableA: cuenta(and(deFamilia.potable, condicionAbierto())),
      residualN: cuenta(deFamilia.residual),
      residualA: cuenta(and(deFamilia.residual, condicionAbierto())),
      redesN: cuenta(deFamilia.redes),
      redesA: cuenta(and(deFamilia.redes, condicionAbierto())),
    })
    .from(proceso)
    .innerJoin(geografia, eq(geografia.codigoDivipola, proceso.geografiaId))
    .where(
      and(
        isNull(proceso.deletedAt),
        gte(proceso.fechaPublicacion, DESDE_CONTEOS),
        inArray(proceso.tipoProyecto, FAMILIAS_DESTACADAS.flatMap(tiposDeFamilia)),
        inArray(geografia.departamentoCodigo, CODIGOS_CON_ANCLA)
      )
    )
    .groupBy(geografia.departamentoCodigo);

  return filas
    .filter((f): f is typeof f & { dpto: string } => f.dpto != null)
    .map((f) => ({
      dpto: f.dpto,
      nombre: f.nombre,
      potable: { n: f.potableN, abiertos: f.potableA },
      residual: { n: f.residualN, abiertos: f.residualA },
      redes: { n: f.redesN, abiertos: f.redesA },
    }));
}
