/**
 * La ficha pública de un proceso: `/licitaciones/[slug]`.
 *
 * Es la superficie de entrada orgánica que el producto no tenía. Hasta hoy el
 * detalle de un proceso vivía dentro de `SecopExplorer`, un componente de
 * cliente sin URL: no había una sola página que un buscador pudiera indexar
 * como "licitación de PTAR en Anapoima", y desde las rutas facetadas había que
 * salir al SECOP II para ver algo más.
 *
 * ── Qué se puede contar y qué no ────────────────────────────────────────────
 * Medido el 2026-09-15 sobre la base viva. Hay datos para la cabecera, el
 * semáforo, el presupuesto y los competidores; NO los hay para los requisitos
 * habilitantes, el cronograma ni los documentos: `requisitos_proceso`,
 * `pliego_proceso` y `documento` están las tres a cero, y `document_access` es
 * UNKNOWN en 90.454 de 90.622 filas. Los tres bloques se construyen igual, con
 * un estado vacío que dice qué falta y por qué — que es lo que pide el spec, en
 * vez de inventar una cifra o dejar un hueco mudo.
 */

import { and, desc, eq, isNull, ne, sql } from "drizzle-orm";
import { db } from "../db/client";
import { entidad, geografia, proceso } from "../db/schema";
import type { TipoProyecto } from "../classify/tipo-proyecto";
// Puras y sin base: viven en ./slug para que el navegador pueda importarlas.
import { idDesdeSlug, slugDeProceso } from "./slug";
import type { SecopProceso } from "./types";

export { idDesdeSlug, slugDeProceso };

export interface ProcesoFicha {
  id: string;
  secopProcesoId: string;
  referencia: string | null;
  objeto: string | null;
  descripcion: string | null;
  modalidad: string | null;
  tipoContrato: string | null;
  unspsc: string | null;
  estadoActual: string | null;
  estadoApertura: string | null;
  fechaPublicacion: string | null;
  fechaRecepcion: string | null;
  valorEstimado: string | null;
  documentAccess: string | null;
  url: string | null;
  tipoProyecto: TipoProyecto | null;
  entidadNombre: string | null;
  entidadNit: string | null;
  departamento: string | null;
  departamentoCodigo: string | null;
  municipio: string | null;
}

export async function procesoPorSlug(slug: string): Promise<ProcesoFicha | null> {
  const id = idDesdeSlug(slug);
  if (!id) return null;

  const [fila] = await db
    .select({
      id: proceso.id,
      secopProcesoId: proceso.secopProcesoId,
      referencia: proceso.referencia,
      objeto: proceso.objeto,
      descripcion: proceso.descripcion,
      modalidad: proceso.modalidad,
      tipoContrato: proceso.tipoContrato,
      unspsc: proceso.unspsc,
      estadoActual: proceso.estadoActual,
      estadoApertura: proceso.estadoApertura,
      fechaPublicacion: proceso.fechaPublicacion,
      fechaRecepcion: proceso.fechaRecepcion,
      valorEstimado: proceso.valorEstimado,
      documentAccess: proceso.documentAccess,
      url: proceso.url,
      tipoProyecto: sql<TipoProyecto | null>`${proceso.tipoProyecto}`,
      entidadNombre: entidad.nombre,
      entidadNit: entidad.nitCanonico,
      departamento: geografia.departamentoNombre,
      departamentoCodigo: geografia.departamentoCodigo,
      municipio: geografia.municipioNombre,
    })
    .from(proceso)
    .leftJoin(entidad, eq(entidad.id, proceso.entidadId))
    .leftJoin(geografia, eq(geografia.codigoDivipola, proceso.geografiaId))
    .where(and(eq(proceso.secopProcesoId, id), isNull(proceso.deletedAt)))
    .limit(1);

  return fila ?? null;
}

/**
 * `ProcesoFicha` → `SecopProceso`, la forma que espera POST /api/secop/verdict.
 *
 * La ficha lee de Postgres y el endpoint del veredicto habla el vocabulario del
 * explorador, que nació contra Socrata. En vez de relajar la validación del
 * endpoint —que es lo que protege de que le manden cualquier cosa— se traduce
 * aquí, en el servidor, y el objeto viaja ya formado al componente de cliente.
 * Así el cliente no reconstruye nada ni necesita saber de la forma de la base.
 *
 * Los campos que la ficha no tiene se rellenan con el vacío que la compuerta
 * correspondiente entiende, nunca con un valor inventado: `fase` y `ciudad` en
 * blanco, `adjudicado` en false. Ninguna compuerta de Nivel 0 los lee.
 */
export function aSecopProceso(p: ProcesoFicha): SecopProceso {
  return {
    id: p.secopProcesoId,
    referencia: p.referencia ?? p.secopProcesoId,
    nombre: p.objeto ?? "",
    descripcion: p.descripcion ?? "",
    entidad: p.entidadNombre ?? "",
    departamento: p.departamento ?? "",
    ciudad: p.municipio ?? "",
    estado: p.estadoActual ?? "",
    fase: "",
    modalidad: p.modalidad ?? "",
    tipoContrato: p.tipoContrato ?? "",
    fechaPublicacion: p.fechaPublicacion,
    precioBase: p.valorEstimado === null ? null : Number(p.valorEstimado),
    adjudicado: false,
    valorAdjudicacion: null,
    unspsc: p.unspsc,
    adjudicatario: null,
    url: p.url,
    estadoApertura: (p.estadoApertura as SecopProceso["estadoApertura"]) ?? null,
    documentAccess: (p.documentAccess as SecopProceso["documentAccess"]) ?? "UNKNOWN",
    accessMessage: "",
  };
}

export interface Competidor {
  nombre: string | null;
  presentados: number;
  ganados: number;
}

/**
 * Quién suele competir en procesos comparables.
 *
 * "Comparable" es mismo tipo de proyecto y mismo departamento. No es el mismo
 * proceso —eso no existiría, el proceso está abierto— sino el histórico de
 * quién se presentó a lo parecido: 27.035 registros sobre 14.245 procesos ya
 * cerrados, de los que 13.606 llevan adjudicación.
 *
 * Se excluye el proceso en curso por si su histórico ya existiera, para no
 * contarse a sí mismo.
 */
export async function competidoresComparables(
  p: Pick<ProcesoFicha, "id" | "tipoProyecto" | "departamentoCodigo">,
  limite = 6
): Promise<Competidor[]> {
  if (!p.tipoProyecto || !p.departamentoCodigo) return [];

  const presentados = sql<number>`count(*)::int`;
  const ganados = sql<number>`count(*) filter (where h.adjudicado)::int`;

  // Se arranca desde `proceso` y se une el histórico como SQL crudo, y no al
  // revés: Drizzle no tipa un `.from(sql\`...\`)` y la cadena entera se queda
  // en `never`. Mismo patrón que `procesosPorClaseEntidad` en agregados.ts.
  return db
    .select({ nombre: sql<string | null>`h.proveedor_nombre`, presentados, ganados })
    .from(proceso)
    .innerJoin(sql`al_oferentes_historico h`, sql`h.proceso_id = ${proceso.id}`)
    .innerJoin(geografia, eq(geografia.codigoDivipola, proceso.geografiaId))
    .where(
      and(
        eq(proceso.tipoProyecto, p.tipoProyecto),
        eq(geografia.departamentoCodigo, p.departamentoCodigo),
        ne(proceso.id, p.id)
      )
    )
    .groupBy(sql`h.proveedor_nombre`)
    .orderBy(desc(presentados), desc(ganados))
    .limit(limite);
}

/** Los slugs de las fichas más recientes, para el sitemap. */
export async function slugsRecientes(
  limite = 2000
): Promise<Array<{ slug: string; fecha: string | null }>> {
  const filas = await db
    .select({
      objeto: proceso.objeto,
      secopProcesoId: proceso.secopProcesoId,
      fecha: proceso.fechaPublicacion,
    })
    .from(proceso)
    .where(and(isNull(proceso.deletedAt), eq(proceso.estadoApertura, "Abierto")))
    .orderBy(desc(proceso.fechaPublicacion))
    .limit(limite);

  return filas.map((f) => ({ slug: slugDeProceso(f.objeto, f.secopProcesoId), fecha: f.fecha }));
}
