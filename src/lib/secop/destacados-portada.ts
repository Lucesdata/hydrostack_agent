/**
 * Los tres destacados del hero de la portada: el proceso más relevante de agua
 * potable, de agua residual y de redes (spec 2026-10-07-hero-tres-destacados).
 * Sustituye a `muestraPortada()`, que sorteaba hasta 30 abiertos al azar; su
 * estado previo está en git.
 *
 * «Más relevante» es una regla escrita, no un juicio: el de **mayor
 * presupuesto** entre los que reciben ofertas, prefiriendo los que tienen al
 * menos `DIAS_MINIMOS_DESTACADO` días por delante. Si ninguno de la familia
 * los tiene, el de mayor presupuesto igualmente, marcado `holgado: false`.
 * Sin presupuesto publicado (nulo o el 0 del SECOP) no compite: «mayor
 * presupuesto» no se puede afirmar de quien no lo publica.
 *
 * **Una consulta**: `DISTINCT ON (familia)` con el orden de la regla. La llama
 * `app/page.js` al regenerarse (ISR de 6 h), así que la elección viaja en el
 * HTML y no hay sorteo ni petición en el navegador.
 */

import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "../db/client";
import { entidad, geografia, proceso } from "../db/schema";
import { anclaDe, CODIGOS_CON_ANCLA } from "../mapa/etiquetas-procesos";
import {
  DIAS_MINIMOS_DESTACADO,
  FAMILIAS_DESTACADAS,
  tiposDeFamilia,
  type DestacadoPortada,
  type FamiliaDestacada,
} from "../landing/destacados-portada";
import { procesoPortadaDesdeFila, type FilaProcesoPortada } from "../landing/proceso-portada";
import { condicionAbierto } from "./agregados";

/**
 * Elegibles: abiertos según `condicionAbierto()` —recepción de ofertas
 * vigente—, con número de proceso y objeto publicados, un id con la forma que
 * resuelve la ficha y un departamento que el mapa sabe anclar.
 */
function condicionElegible() {
  return and(
    condicionAbierto(),
    isNotNull(proceso.referencia),
    sql`btrim(${proceso.referencia}) <> ''`,
    isNotNull(proceso.objeto),
    sql`btrim(${proceso.objeto}) <> ''`,
    sql`${proceso.secopProcesoId} ~* '^CO1\\.[A-Z]+\\.[0-9]+$'`,
    isNotNull(geografia.departamentoNombre),
    inArray(geografia.departamentoCodigo, CODIGOS_CON_ANCLA)
  );
}

/**
 * La familia de cada fila, con los tipos de `COLOR_TIPO` (nada escrito a mano).
 * Va con literales y no con parámetros: `DISTINCT ON` exige que su expresión
 * sea idéntica a la primera del `ORDER BY`, y con parámetros cada aparición
 * lleva números distintos ($1… frente a $56…) y Postgres las rechaza. Los
 * valores son constantes del código, no entrada del usuario; aun así se
 * comprueba su forma antes de escribirlos.
 */
const literal = (v: string) => {
  if (!/^[a-z_]+$/.test(v)) throw new Error(`[destacados-portada] valor inesperado: ${v}`);
  return `'${v}'`;
};

function familiaSql() {
  const ramas = FAMILIAS_DESTACADAS.map(
    (f) =>
      `when "proceso"."tipo_proyecto" in (${tiposDeFamilia(f).map(literal).join(", ")}) then ${literal(f)}`
  ).join(" ");
  return sql<FamiliaDestacada>`(case ${sql.raw(ramas)} end)`;
}

export async function destacadosPortada(): Promise<DestacadoPortada[]> {
  const familia = familiaSql();
  const holgado = sql<boolean>`(${proceso.fechaRecepcion} >= (now() at time zone 'America/Bogota')::date + ${DIAS_MINIMOS_DESTACADO}::int)`;
  const tipos = FAMILIAS_DESTACADAS.flatMap(tiposDeFamilia);

  const filas: (FilaProcesoPortada & { familia: FamiliaDestacada; holgado: boolean })[] = await db
    .selectDistinctOn([familia], {
      familia,
      holgado,
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
        condicionElegible(),
        inArray(proceso.tipoProyecto, tipos),
        sql`${proceso.valorEstimado} > 0`
      )
    )
    // El id desempata: la misma base da siempre el mismo destacado.
    .orderBy(familia, desc(holgado), desc(proceso.valorEstimado), proceso.secopProcesoId);

  return FAMILIAS_DESTACADAS.map((f) => {
    const fila = filas.find((x) => x.familia === f);
    const p = fila ? procesoPortadaDesdeFila(fila) : null;
    // La consulta ya filtra lo mismo; si algo se cuela, se registra y la
    // pestaña dice que no hay, en vez de pintar una tarjeta rota.
    if (fila && (!p || !anclaDe(p.departamentoCodigo))) {
      console.warn("[destacados-portada] proceso excluido:", fila.secopProcesoId ?? "(sin id)");
    }
    const valido = p && anclaDe(p.departamentoCodigo) ? p : null;
    return {
      familia: f,
      proceso: valido,
      cierre: valido ? (fila?.fechaRecepcion ?? null) : null,
      holgado: valido ? Boolean(fila?.holgado) : false,
    };
  });
}
