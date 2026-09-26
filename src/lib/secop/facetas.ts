/**
 * Rutas facetadas: `/licitaciones/{departamento|tipo|entidad}/[slug]`.
 *
 * Son la superficie de entrada orgánica del producto. Hoy el sitio no tiene
 * ninguna: `/licitaciones` es una lista sin recortes y el explorador es un
 * cliente sin URL propia, así que no hay una sola página que un buscador pueda
 * indexar como "licitaciones de PTAR en Antioquia".
 *
 * Cada faceta resuelve un slug estable a un filtro y a los textos de su
 * metadata. Los slugs salen de las mismas constantes que la portada
 * (`TIPO_PROYECTO`, `CLASE_ENTIDAD`, `slugificar` sobre el nombre del
 * departamento), no de una lista escrita aparte: una faceta que se anuncia en
 * la portada y no existe como ruta es un 404 servido a un buscador.
 */

import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { entidad, geografia, proceso } from "../db/schema";
import { TIPO_POR_SLUG, TIPO_PROYECTO, type TipoProyecto } from "../classify/tipo-proyecto";
import { CLASE_ENTIDAD, CLASE_ENTIDAD_POR_SLUG, sqlClaseEntidad } from "./clase-entidad";
import { condicionAbierto, procesosPorDepartamento, slugificar } from "./agregados";

export const FAMILIAS_FACETA = ["departamento", "tipo", "entidad"] as const;
export type FamiliaFaceta = (typeof FAMILIAS_FACETA)[number];

export interface Faceta {
  familia: FamiliaFaceta;
  slug: string;
  /** Lo que lee el usuario: "Antioquia", "PTAR", "Empresas de servicios públicos". */
  label: string;
  /** Una frase para la metadata de la ruta. */
  descripcion: string;
  /**
   * Procesos abiertos de la faceta, cuando se conoce sin consulta extra (el
   * departamento lo trae al resolverse) o el llamador lo añade. Solo lo usa la
   * metadata (`faceta-metadata.ts`).
   */
  abiertos?: number | null;
}

/**
 * Resuelve un slug a su faceta, o `null` si no existe — el llamador responde
 * 404. Los departamentos se resuelven contra la base porque su lista no es una
 * constante: sale de `geografia`, y sembrar un departamento nuevo debe crear su
 * ruta sin tocar código.
 */
export async function resolverFaceta(familia: FamiliaFaceta, slug: string): Promise<Faceta | null> {
  if (familia === "tipo") {
    const tipo = TIPO_POR_SLUG[slug];
    if (!tipo) return null;
    return {
      familia,
      slug,
      label: TIPO_PROYECTO[tipo].label,
      descripcion: TIPO_PROYECTO[tipo].descripcion,
    };
  }

  if (familia === "entidad") {
    const clase = CLASE_ENTIDAD_POR_SLUG[slug];
    if (!clase) return null;
    return {
      familia,
      slug,
      label: CLASE_ENTIDAD[clase].label,
      descripcion: CLASE_ENTIDAD[clase].descripcion,
    };
  }

  const departamentos = await procesosPorDepartamento();
  const dep = departamentos.find((d) => d.slug === slug);
  if (!dep) return null;
  return {
    familia,
    slug,
    label: dep.label,
    descripcion: `Procesos de agua y saneamiento abiertos en ${dep.label}.`,
    abiertos: dep.n,
  };
}

/** Todas las facetas existentes, para el sitemap y para `generateStaticParams`. */
export async function todasLasFacetas(): Promise<Faceta[]> {
  const departamentos = await procesosPorDepartamento();
  return [
    ...Object.values(TIPO_PROYECTO).map((t) => ({
      familia: "tipo" as const,
      slug: t.slug,
      label: t.label,
      descripcion: t.descripcion,
    })),
    ...Object.values(CLASE_ENTIDAD).map((c) => ({
      familia: "entidad" as const,
      slug: c.slug,
      label: c.label,
      descripcion: c.descripcion,
    })),
    ...departamentos.map((d) => ({
      familia: "departamento" as const,
      slug: d.slug,
      label: d.label,
      descripcion: `Procesos de agua y saneamiento abiertos en ${d.label}.`,
    })),
  ];
}

/**
 * `slugificar()` traducido a SQL. Tiene que dar exactamente lo mismo: el slug
 * lo genera TypeScript para pintar el enlace y lo resuelve Postgres para
 * filtrar, así que una diferencia de un guion rompe la ruta en silencio.
 */
const SQL_SLUG_DEPARTAMENTO = `regexp_replace(
  lower(regexp_replace(
    translate(coalesce(geografia.departamento_nombre,''),'áéíóúüÁÉÍÓÚÜñÑ','aeiouuAEIOUUnN'),
    '[^a-zA-Z0-9]+', '-', 'g')),
  '^-+|-+$', '', 'g')`;

/** La condición SQL que define cada faceta. */
function condicionDeFaceta(faceta: Faceta) {
  if (faceta.familia === "tipo") {
    return eq(proceso.tipoProyecto, TIPO_POR_SLUG[faceta.slug] as TipoProyecto);
  }
  if (faceta.familia === "entidad") {
    const clase = CLASE_ENTIDAD_POR_SLUG[faceta.slug];
    // Subconsulta y no un CASE sobre la fila unida: la clase depende SOLO de la
    // entidad, así que evaluarla en el join la calcula una vez por proceso —
    // 21.262 veces para la faceta de ESP— en lugar de una vez por entidad, que
    // son 4.223. Medido: 2.612 ms con el CASE en el join.
    return sql`${proceso.entidadId} in (
      select id from entidad where ${sql.raw(sqlClaseEntidad("nombre", "nivel_gobierno"))} = ${clase}
    )`;
  }
  // El slug no se guarda en ninguna columna: se compara contra el nombre
  // slugificado. Son 33 departamentos, así que el coste es irrelevante frente a
  // añadir una columna solo para esto.
  //
  // El `trim` de guiones NO es cosmético: sin él "Bogotá D.C." produce
  // `bogota-d-c-` aquí y `bogota-d-c` en `slugificar()`, y la ruta que la
  // portada anuncia devuelve una lista vacía. Es la misma clase de desajuste
  // TS/SQL que vigila `clase-entidad`, y aquí se comprobó sobre los 33 nombres.
  return sql`${sql.raw(SQL_SLUG_DEPARTAMENTO)} = ${faceta.slug}`;
}

export interface ProcesoDeFaceta {
  id: string;
  secopProcesoId: string;
  objeto: string | null;
  entidadNombre: string | null;
  departamento: string | null;
  municipio: string | null;
  valorEstimado: string | null;
  fechaPublicacion: string | null;
  estadoActual: string | null;
  estadoApertura: string | null;
  fechaRecepcion: string | null;
  tipoProyecto: TipoProyecto | null;
  url: string | null;
}

export interface PaginaDeFaceta {
  items: ProcesoDeFaceta[];
  total: number;
  pagina: number;
  porPagina: number;
}

export const POR_PAGINA = 25;

/**
 * Los procesos abiertos de una faceta, paginados. Ordenados por publicación más
 * reciente y NO por cierre más próximo: el dataset del SECOP no trae fecha de
 * cierre —está documentado en `discovery.ts`— y solo 121 de los 35.222 abiertos
 * tienen una `fecha_recepcion` futura. Ordenar por un campo que falta en el 99%
 * de las filas es ordenar por nada.
 */
export async function procesosDeFaceta(faceta: Faceta, pagina = 1): Promise<PaginaDeFaceta> {
  const where = and(condicionAbierto(), condicionDeFaceta(faceta));
  const offset = (pagina - 1) * POR_PAGINA;

  const [items, totalFilas] = await Promise.all([
    db
      .select({
        id: proceso.id,
        secopProcesoId: proceso.secopProcesoId,
        objeto: proceso.objeto,
        entidadNombre: entidad.nombre,
        departamento: geografia.departamentoNombre,
        municipio: geografia.municipioNombre,
        valorEstimado: proceso.valorEstimado,
        fechaPublicacion: proceso.fechaPublicacion,
        estadoActual: proceso.estadoActual,
        estadoApertura: proceso.estadoApertura,
        fechaRecepcion: proceso.fechaRecepcion,
        tipoProyecto: sql<TipoProyecto | null>`${proceso.tipoProyecto}`,
        url: proceso.url,
      })
      .from(proceso)
      .leftJoin(entidad, eq(entidad.id, proceso.entidadId))
      .leftJoin(geografia, eq(geografia.codigoDivipola, proceso.geografiaId))
      .where(where)
      .orderBy(desc(proceso.fechaPublicacion))
      .limit(POR_PAGINA)
      .offset(offset),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(proceso)
      .leftJoin(entidad, eq(entidad.id, proceso.entidadId))
      .leftJoin(geografia, eq(geografia.codigoDivipola, proceso.geografiaId))
      .where(where),
  ]);

  return { items, total: totalFilas[0]?.n ?? 0, pagina, porPagina: POR_PAGINA };
}
