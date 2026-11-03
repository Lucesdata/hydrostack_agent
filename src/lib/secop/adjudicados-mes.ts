/**
 * «Proyectos adjudicados»: los cinco procesos de agua potable y saneamiento
 * básico de mayor valor adjudicado en el último mes completo.
 *
 * Reglas (escritas aquí porque la página las enuncia tal cual):
 * - **Mes completo** en hora de Colombia (`mesDelInforme()`), como el informe
 *   mensual: una lista publicada no cambia cada día.
 * - **Solo obra del sector**: `tipo_proyecto` acueducto, alcantarillado, PTAP
 *   o PTAR. `otros` y sin tipo quedan fuera: ahí caen contratos de la entidad
 *   del agua que no son obra de agua (facturación, vigilancia…).
 * - **«Más importante» = mayor valor adjudicado** (`valor_total_adjudicacion`
 *   del SECOP), con `adjudicado = true` y valor > 0. El 0 del SECOP no es dato.
 * - **Personas naturales fuera del nombre**: el adjudicatario solo se nombra si
 *   su NIT casa con un proveedor de tipo de documento NIT (misma regla que
 *   «Cómo se contrató», `esPersonaJuridica`). El proceso sí entra en la lista.
 *
 * Una consulta, pagada por revalidación de la página (24 h), no por visita.
 */

import { and, asc, desc, eq, gt, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import { db } from "../db/client";
import { entidad, geografia, proceso, proveedor } from "../db/schema";
import type { TipoProyecto } from "../classify/tipo-proyecto";
import { esPersonaJuridica } from "./como-se-contrato";
import { mesDelInforme, type MesInforme } from "./informe";
import { slugDeProceso } from "./slug";

/** Los subsistemas que cuentan como agua potable y saneamiento básico. */
export const TIPOS_ADJUDICADOS: readonly TipoProyecto[] = [
  "acueducto",
  "alcantarillado",
  "ptap",
  "ptar",
];

export const CUANTOS_ADJUDICADOS = 5;

export interface Adjudicado {
  secopProcesoId: string;
  referencia: string | null;
  objeto: string | null;
  tipoProyecto: TipoProyecto;
  entidad: string | null;
  departamento: string | null;
  municipio: string | null;
  modalidad: string | null;
  presupuesto: number | null;
  valorAdjudicado: number;
  /** Lo adjudicado frente al presupuesto oficial, en %; `null` sin presupuesto. */
  frentePresupuesto: number | null;
  /** `null` si es persona natural o el NIT no se resolvió: no se nombra. */
  adjudicatario: string | null;
  fechaAdjudicacion: string | null;
  hrefFicha: string;
  urlSecop: string | null;
}

export interface FilaAdjudicado {
  secopProcesoId: string;
  referencia: string | null;
  objeto: string | null;
  tipoProyecto: string | null;
  entidad: string | null;
  departamento: string | null;
  municipio: string | null;
  modalidad: string | null;
  valorEstimado: string | number | null;
  valorAdjudicacion: string | number | null;
  adjudicatario: string | null;
  tipoDocumentoProveedor: string | null;
  razonSocialProveedor: string | null;
  fechaAdjudicacion: string | null;
  url: string | null;
}

const positivo = (v: string | number | null | undefined): number | null => {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Puro: de la fila de la base a lo que pinta la página. */
export function adjudicadoDesdeFila(f: FilaAdjudicado): Adjudicado | null {
  const valor = positivo(f.valorAdjudicacion);
  const tipo = f.tipoProyecto as TipoProyecto | null;
  if (!valor || !tipo || !TIPOS_ADJUDICADOS.includes(tipo)) return null;
  const presupuesto = positivo(f.valorEstimado);
  const juridica = esPersonaJuridica(f.tipoDocumentoProveedor);
  return {
    secopProcesoId: f.secopProcesoId,
    referencia: f.referencia,
    objeto: f.objeto,
    tipoProyecto: tipo,
    entidad: f.entidad,
    departamento: f.departamento,
    municipio: f.municipio,
    modalidad: f.modalidad,
    presupuesto,
    valorAdjudicado: valor,
    frentePresupuesto: presupuesto ? Math.round((1000 * valor) / presupuesto) / 10 : null,
    adjudicatario: juridica ? (f.razonSocialProveedor ?? f.adjudicatario ?? null) : null,
    fechaAdjudicacion: f.fechaAdjudicacion ? f.fechaAdjudicacion.slice(0, 10) : null,
    hrefFicha: `/licitaciones/${slugDeProceso(f.objeto, f.secopProcesoId)}`,
    urlSecop: f.url && /^https:\/\//.test(f.url) ? f.url : null,
  };
}

export interface AdjudicadosDelMes {
  mes: MesInforme;
  items: Adjudicado[];
}

export async function adjudicadosDelMes(
  mes: MesInforme = mesDelInforme(),
  limite = CUANTOS_ADJUDICADOS
): Promise<AdjudicadosDelMes> {
  // El NIT del proceso viene como lo publica la fuente (puntos, guion, DV);
  // `nit_canonico` es solo dígitos sin DV. Se compara por los dígitos.
  const nitDelProceso = sql`regexp_replace(split_part(${proceso.nitAdjudicatario}, '-', 1), '[^0-9]', '', 'g')`;

  const filas = await db
    .select({
      secopProcesoId: proceso.secopProcesoId,
      referencia: proceso.referencia,
      objeto: proceso.objeto,
      tipoProyecto: proceso.tipoProyecto,
      entidad: entidad.nombre,
      departamento: geografia.departamentoNombre,
      municipio: geografia.municipioNombre,
      modalidad: proceso.modalidad,
      valorEstimado: proceso.valorEstimado,
      valorAdjudicacion: proceso.valorAdjudicacion,
      adjudicatario: proceso.adjudicatario,
      tipoDocumentoProveedor: proveedor.tipoDocumento,
      razonSocialProveedor: proveedor.razonSocial,
      fechaAdjudicacion: sql<string | null>`${proceso.fechaAdjudicacion}::text`,
      url: proceso.url,
    })
    .from(proceso)
    .leftJoin(entidad, eq(entidad.id, proceso.entidadId))
    .leftJoin(geografia, eq(geografia.codigoDivipola, proceso.geografiaId))
    .leftJoin(proveedor, sql`${proveedor.nitCanonico} = ${nitDelProceso}`)
    .where(
      and(
        isNull(proceso.deletedAt),
        eq(proceso.adjudicado, true),
        gte(proceso.fechaAdjudicacion, mes.desde),
        lt(proceso.fechaAdjudicacion, mes.hasta),
        gt(proceso.valorAdjudicacion, "0"),
        inArray(proceso.tipoProyecto, [...TIPOS_ADJUDICADOS])
      )
    )
    .orderBy(desc(proceso.valorAdjudicacion), asc(proceso.id))
    .limit(limite);

  return {
    mes,
    items: filas
      .map((f) => adjudicadoDesdeFila(f as FilaAdjudicado))
      .filter((a): a is Adjudicado => a !== null),
  };
}
