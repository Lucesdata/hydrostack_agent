/**
 * Corrida de la línea base y los cambios de contrato (CI-07, migración C).
 *
 * Lee las columnas de `contrato` (no `raw_record.payload`, vaciado el
 * 2026-09-12), las compara con `ci_contrato_estado` y escribe en
 * `ci_contrato_cambio` lo que cambió. Mismo patrón que `al/eventos/correr.ts`
 * para procesos, y por la misma lección de `contrato_evento`: una tabla de
 * historial sin tope crece hasta ahogar la base, así que la retención va
 * dentro de la corrida (los `RETENCION_CAMBIOS` más recientes por contrato).
 *
 * Decisiones:
 *  · La línea base se SIEMBRA en silencio la primera vez; solo se reescribe
 *    cuando algo cambió (en régimen normal casi nada cambia de un día a otro).
 *    Por eso `visto_en` es «cuándo cambió la foto», no «cuándo se revisó».
 *  · Recorre por llave (`id > último`), no por OFFSET: la tabla se escribe
 *    mientras se recorre.
 *  · Cada lote es una transacción serializada por un advisory lock de
 *    transacción (el de sesión no sobrevive al pooler en modo transacción).
 *  · Se detiene si la base crece más de `maxCrecimientoMb` (la base vive cerca
 *    de su techo; `backfill-tipo-proyecto.ts` hace lo mismo).
 *  · Instrumentado por etapa (CONDUCTA §5): lectura, linea_base, cambios, poda.
 *  · Si el mismo valor vuelve (A→B→A) la fila existente se actualiza en vez de
 *    perderse: la unicidad de `ci_contrato_cambio` es (contrato, campo, valor nuevo).
 *
 * NO está conectada al cron `/api/cron/tick`: eso es una decisión de despliegue
 * aparte, y las tablas aún no existen en la base viva.
 */
import { and, asc, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/src/lib/db/client";
import { ciContratoCambio, ciContratoEstado, contrato } from "@/src/lib/db/schema";
import {
  detectarCambiosContrato,
  normalizarEstado,
  type CambioContrato,
  type EstadoContrato,
} from "./cambios";

export const RETENCION_CAMBIOS = 20;
const LOTE = 1000;
const CRECIMIENTO_MAX_MB = 60;

export interface EtapaMedida {
  nombre: "lectura" | "linea_base" | "cambios" | "poda";
  ms: number;
  filas: number;
}

export interface ResumenBaseContratos {
  dryRun: boolean;
  evaluados: number;
  sembrados: number;
  contratosConCambios: number;
  cambiosDetectados: number;
  podados: number;
  abortado: null | "crecimiento";
  etapas: EtapaMedida[];
}

export interface OpcionesBaseContratos {
  lote?: number;
  dryRun?: boolean;
  maxCrecimientoMb?: number;
  /** Inyectable para pruebas; por defecto mide la base en MB. */
  medirTamanoMb?: () => Promise<number>;
}

async function tamanoMb(): Promise<number> {
  const r = await db.execute(
    sql`select pg_database_size(current_database())::float8 / 1048576 as mb`
  );
  return Number((r.rows[0] as { mb: number | string }).mb);
}

export async function correrBaseCambiosContratos(
  opts: OpcionesBaseContratos = {}
): Promise<ResumenBaseContratos> {
  const lote = opts.lote ?? LOTE;
  const dryRun = opts.dryRun ?? false;
  const maxMb = opts.maxCrecimientoMb ?? CRECIMIENTO_MAX_MB;
  const medir = opts.medirTamanoMb ?? tamanoMb;

  const etapas: Record<EtapaMedida["nombre"], EtapaMedida> = {
    lectura: { nombre: "lectura", ms: 0, filas: 0 },
    linea_base: { nombre: "linea_base", ms: 0, filas: 0 },
    cambios: { nombre: "cambios", ms: 0, filas: 0 },
    poda: { nombre: "poda", ms: 0, filas: 0 },
  };
  const medirEtapa = async <T>(n: EtapaMedida["nombre"], f: () => Promise<T>): Promise<T> => {
    const t0 = performance.now();
    try {
      return await f();
    } finally {
      etapas[n].ms += Math.round(performance.now() - t0);
    }
  };

  const r: ResumenBaseContratos = {
    dryRun,
    evaluados: 0,
    sembrados: 0,
    contratosConCambios: 0,
    cambiosDetectados: 0,
    podados: 0,
    abortado: null,
    etapas: [],
  };

  const tamanoInicial = await medir();
  let ultimo: string | null = null;

  for (;;) {
    if ((await medir()) - tamanoInicial > maxMb) {
      r.abortado = "crecimiento";
      break;
    }

    const filas = await medirEtapa("lectura", () =>
      db
        .select({
          id: contrato.id,
          valorActual: sql<string | null>`${contrato.valorActual}::text`,
          fechaFinActual: sql<string | null>`${contrato.fechaFinActual}::text`,
          estadoActual: contrato.estadoActual,
          tieneBase: sql<boolean>`${ciContratoEstado.contratoId} is not null`,
          baseValor: sql<string | null>`${ciContratoEstado.valorActual}::text`,
          baseFechaFin: sql<string | null>`${ciContratoEstado.fechaFinActual}::text`,
          baseEstado: ciContratoEstado.estadoActual,
        })
        .from(contrato)
        .leftJoin(ciContratoEstado, eq(ciContratoEstado.contratoId, contrato.id))
        .where(
          ultimo === null
            ? isNull(contrato.deletedAt)
            : and(isNull(contrato.deletedAt), gt(contrato.id, ultimo))
        )
        .orderBy(asc(contrato.id))
        .limit(lote)
    );
    etapas.lectura.filas += filas.length;
    if (filas.length === 0) break;
    ultimo = filas[filas.length - 1].id;

    const semillas: (typeof ciContratoEstado.$inferInsert)[] = [];
    const actualizaciones: { id: string; base: EstadoContrato }[] = [];
    const cambios: (typeof ciContratoCambio.$inferInsert)[] = [];
    const conCambios = new Set<string>();

    for (const f of filas) {
      r.evaluados++;
      const nuevo: EstadoContrato = normalizarEstado({
        valorActual: f.valorActual,
        fechaFinActual: f.fechaFinActual,
        estadoActual: f.estadoActual,
      });
      if (!f.tieneBase) {
        semillas.push({
          contratoId: f.id,
          valorActual: nuevo.valorActual,
          fechaFinActual: nuevo.fechaFinActual,
          estadoActual: nuevo.estadoActual,
          vistoEn: new Date(),
        });
        continue;
      }
      const anterior: EstadoContrato = {
        valorActual: f.baseValor,
        fechaFinActual: f.baseFechaFin,
        estadoActual: f.baseEstado,
      };
      const detectados: CambioContrato[] = detectarCambiosContrato(anterior, nuevo);
      if (detectados.length === 0) continue;
      conCambios.add(f.id);
      const baseAnterior = normalizarEstado(anterior);
      actualizaciones.push({
        id: f.id,
        // Los blancos de la fuente no pisan lo que ya se sabía.
        base: {
          valorActual: nuevo.valorActual ?? baseAnterior.valorActual,
          fechaFinActual: nuevo.fechaFinActual ?? baseAnterior.fechaFinActual,
          estadoActual: nuevo.estadoActual ?? baseAnterior.estadoActual,
        },
      });
      for (const c of detectados) cambios.push({ contratoId: f.id, ...c });
    }

    r.sembrados += semillas.length;
    r.cambiosDetectados += cambios.length;
    r.contratosConCambios += conCambios.size;
    if (dryRun) continue;

    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext('ci_contrato_base'))`);

      await medirEtapa("linea_base", async () => {
        if (semillas.length > 0) {
          await tx.insert(ciContratoEstado).values(semillas).onConflictDoNothing();
        }
        for (const u of actualizaciones) {
          await tx
            .update(ciContratoEstado)
            .set({ ...u.base, vistoEn: new Date() })
            .where(eq(ciContratoEstado.contratoId, u.id));
        }
        etapas.linea_base.filas += semillas.length + actualizaciones.length;
      });

      await medirEtapa("cambios", async () => {
        if (cambios.length > 0) {
          await tx
            .insert(ciContratoCambio)
            .values(cambios)
            .onConflictDoUpdate({
              target: [
                ciContratoCambio.contratoId,
                ciContratoCambio.campo,
                ciContratoCambio.valorNuevo,
              ],
              set: {
                valorAnterior: sql`excluded.valor_anterior`,
                detectadoEn: sql`now()`,
              },
            });
        }
        etapas.cambios.filas += cambios.length;
      });

      await medirEtapa("poda", async () => {
        if (conCambios.size === 0) return;
        const ids = sql.join(
          [...conCambios].map((id) => sql`${id}::uuid`),
          sql`, `
        );
        const borrados = await tx.execute(sql`
          delete from ci_contrato_cambio
           where id in (
             select id from (
               select id, row_number() over (
                 partition by contrato_id order by detectado_en desc, id desc
               ) as rn
                 from ci_contrato_cambio
                where contrato_id in (${ids})
             ) t
              where t.rn > ${RETENCION_CAMBIOS}
           )
          returning id`);
        r.podados += borrados.rows.length;
        etapas.poda.filas += borrados.rows.length;
      });
    });

    if (filas.length < lote) break;
  }

  r.etapas = [etapas.lectura, etapas.linea_base, etapas.cambios, etapas.poda];
  return r;
}
