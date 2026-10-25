/**
 * Relleno del Lote 1 por identificador (spec 2026-10-24-lote1-datos-columnas, D-T3).
 *
 * Pide a Socrata **solo** el id y los campos del lote para los procesos publicados
 * desde 2026 (y los contratos de esos procesos) y los escribe con `UPDATE` directo.
 * No toca `raw_record`, no pasa por el transform y es idempotente: repetirlo da lo
 * mismo. Reutiliza `mapLote1*` (un solo lugar define qué es «sin dato»).
 *
 * Política de escritura = la del transform (D-T2): `coalesce(valor_nuevo, valor_actual)`.
 * La ausencia en la fuente nunca borra lo que ya hay. No toca `updated_at`: un relleno
 * no es un cambio del proceso en el SECOP.
 *
 * Seguridad operativa: **seco por defecto**; con `aplicar` escribe, aborta si la base
 * pasa del límite de tamaño y no corre dentro de la ventana del `tick` (CLI).
 * La red, la base, el vacío y la pausa se inyectan para poder probar todo sin ellas.
 */

import { sql } from "drizzle-orm";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";
import { chunk } from "@/src/lib/db/batch";
import type { SodaPageParams } from "./pagination";
import type * as schema from "@/src/lib/db/schema";
import { DESDE_CICLO_DE_VIDA } from "@/src/lib/secop/como-se-contrato";
import {
  CAMPOS_LOTE1_CONTRATOS,
  CAMPOS_LOTE1_PROCESOS,
  mapLote1Contrato,
  mapLote1Proceso,
  type Lote1Contrato,
  type Lote1Proceso,
} from "@/src/lib/transform/lote1";

type Db = NeonDatabase<typeof schema>;
type SodaRow = Record<string, unknown>;

export type FuenteRelleno = "procesos" | "contratos";

export type FilaProcesoLote1 = { id: string } & Lote1Proceso;
export type FilaContratoLote1 = { id: string } & Lote1Contrato;

export const CAMPO_ID: Record<FuenteRelleno, string> = {
  procesos: "id_del_proceso",
  contratos: "id_contrato",
};

/** `$select` del relleno: el id y nada más que los campos del lote. */
export function selectDeRelleno(fuente: FuenteRelleno): string {
  const campos = fuente === "procesos" ? CAMPOS_LOTE1_PROCESOS : CAMPOS_LOTE1_CONTRATOS;
  return [CAMPO_ID[fuente], ...campos].join(",");
}

export interface RellenoDeps {
  ids(fuente: FuenteRelleno): Promise<string[]>;
  fetchFilas(fuente: FuenteRelleno, ids: string[]): Promise<SodaRow[]>;
  aplicarProcesos(filas: FilaProcesoLote1[]): Promise<number>;
  aplicarContratos(filas: FilaContratoLote1[]): Promise<number>;
  tamanoMb(): Promise<number>;
  vacuum(tabla: "proceso" | "contrato"): Promise<void>;
  pausa(ms: number): Promise<void>;
}

export interface OpcionesRelleno {
  /** `false` (por defecto): seco, no escribe. */
  aplicar?: boolean;
  tamLote?: number;
  tamUpdate?: number;
  limiteMb?: number;
  pausaMs?: number;
  vacuumCadaLotes?: number;
  /** Acota el universo (prueba pequeña). */
  maxIds?: number;
}

export interface InformeRelleno {
  fuente: FuenteRelleno;
  aplicar: boolean;
  pedidos: number;
  encontrados: number;
  sinFila: number;
  /** Cuántos identificadores quedaron con cada campo poblado (dato útil, no nulo). */
  poblados: Record<string, number>;
  aplicados: number;
  abortado: boolean;
}

const POR_DEFECTO = {
  tamLote: 200,
  tamUpdate: 500,
  limiteMb: 420,
  pausaMs: 1000,
  vacuumCadaLotes: 10,
};

/** Primer dato presente de cada campo, en el orden en que llegaron las filas. */
function fusionarProcesos(filas: SodaRow[]): FilaProcesoLote1 | null {
  let id: string | null = null;
  let fusion: Lote1Proceso = { duracionValor: null, duracionUnidad: null };
  for (const f of filas) {
    id ??= String(f[CAMPO_ID.procesos] ?? "");
    const m = mapLote1Proceso(f);
    if (fusion.duracionValor === null && m.duracionValor !== null) fusion = m;
  }
  return id ? { id, ...fusion } : null;
}

function fusionarContratos(filas: SodaRow[]): FilaContratoLote1 | null {
  let id: string | null = null;
  const fusion: Lote1Contrato = {
    origenRecursos: null,
    destinoGasto: null,
    fuentesRecursos: null,
    diasAdicionados: null,
    liquidado: null,
  };
  for (const f of filas) {
    id ??= String(f[CAMPO_ID.contratos] ?? "");
    const m = mapLote1Contrato(f);
    fusion.origenRecursos ??= m.origenRecursos;
    fusion.destinoGasto ??= m.destinoGasto;
    fusion.fuentesRecursos ??= m.fuentesRecursos;
    fusion.diasAdicionados ??= m.diasAdicionados;
    fusion.liquidado ??= m.liquidado;
  }
  return id ? { id, ...fusion } : null;
}

function agruparPorId(filas: SodaRow[], campo: string): Map<string, SodaRow[]> {
  const porId = new Map<string, SodaRow[]>();
  for (const f of filas) {
    const id = String(f[campo] ?? "");
    if (!id) continue;
    porId.set(id, [...(porId.get(id) ?? []), f]);
  }
  return porId;
}

const tieneDato = (f: FilaProcesoLote1 | FilaContratoLote1) =>
  Object.entries(f).some(([k, v]) => k !== "id" && v !== null);

export async function rellenarLote1(
  fuente: FuenteRelleno,
  deps: RellenoDeps,
  opciones: OpcionesRelleno = {}
): Promise<InformeRelleno> {
  const o = { ...POR_DEFECTO, ...opciones };
  const aplicar = opciones.aplicar === true;
  let ids = await deps.ids(fuente);
  if (o.maxIds !== undefined) ids = ids.slice(0, o.maxIds);

  const informe: InformeRelleno = {
    fuente,
    aplicar,
    pedidos: ids.length,
    encontrados: 0,
    sinFila: 0,
    poblados: {},
    aplicados: 0,
    abortado: false,
  };
  const tabla = fuente === "procesos" ? "proceso" : "contrato";
  const lotes = chunk(ids, o.tamLote);
  let procesadosIds = 0;

  for (const [i, lote] of lotes.entries()) {
    if (aplicar && (await deps.tamanoMb()) > o.limiteMb) {
      informe.abortado = true;
      break;
    }
    const crudas = await deps.fetchFilas(fuente, lote);
    const porId = agruparPorId(crudas, CAMPO_ID[fuente]);
    const filas = [...porId.values()].map((fs) =>
      fuente === "procesos" ? fusionarProcesos(fs) : fusionarContratos(fs)
    ) as (FilaProcesoLote1 | FilaContratoLote1)[];

    procesadosIds += lote.length;
    informe.encontrados += filas.length;
    for (const f of filas) {
      for (const [k, v] of Object.entries(f)) {
        if (k !== "id" && v !== null) informe.poblados[k] = (informe.poblados[k] ?? 0) + 1;
      }
    }

    if (aplicar) {
      for (const parte of chunk(filas.filter(tieneDato), o.tamUpdate)) {
        informe.aplicados +=
          fuente === "procesos"
            ? await deps.aplicarProcesos(parte as FilaProcesoLote1[])
            : await deps.aplicarContratos(parte as FilaContratoLote1[]);
      }
      if ((i + 1) % o.vacuumCadaLotes === 0) await deps.vacuum(tabla);
    }
    if (i < lotes.length - 1) await deps.pausa(o.pausaMs);
  }

  if (aplicar && informe.aplicados > 0) await deps.vacuum(tabla);
  informe.sinFila = procesadosIds - informe.encontrados;
  return informe;
}

// ── Base ────────────────────────────────────────────────────────────────────

/** Identificadores del universo: desde 2026, sin borrados; contratos solo de esos procesos. */
export async function idsDelUniverso(db: Db, fuente: FuenteRelleno): Promise<string[]> {
  const res =
    fuente === "procesos"
      ? await db.execute(sql`
          select secop_proceso_id as id from proceso
          where deleted_at is null and fecha_publicacion >= ${DESDE_CICLO_DE_VIDA}::date
          order by secop_proceso_id`)
      : await db.execute(sql`
          select c.secop_contrato_id as id from contrato c
          join proceso p on p.id = c.proceso_id
          where c.deleted_at is null and p.deleted_at is null
            and p.fecha_publicacion >= ${DESDE_CICLO_DE_VIDA}::date
          order by c.secop_contrato_id`);
  return (res.rows as { id: string }[]).map((r) => r.id);
}

export async function aplicarProcesos(db: Db, filas: FilaProcesoLote1[]): Promise<number> {
  if (filas.length === 0) return 0;
  const valores = sql.join(
    filas.map((f) => sql`(${f.id}::text, ${f.duracionValor}::int, ${f.duracionUnidad}::text)`),
    sql`, `
  );
  const res = await db.execute(sql`
    update proceso p
       set duracion_valor  = coalesce(v.valor, p.duracion_valor),
           duracion_unidad = coalesce(v.unidad, p.duracion_unidad)
      from (values ${valores}) as v(id, valor, unidad)
     where p.secop_proceso_id = v.id and p.deleted_at is null
    returning p.id`);
  return res.rows.length;
}

export async function aplicarContratos(db: Db, filas: FilaContratoLote1[]): Promise<number> {
  if (filas.length === 0) return 0;
  const valores = sql.join(
    filas.map(
      (f) => sql`(${f.id}::text, ${f.origenRecursos}::text, ${f.destinoGasto}::text,
        ${f.fuentesRecursos === null ? null : JSON.stringify(f.fuentesRecursos)}::jsonb,
        ${f.diasAdicionados}::int, ${f.liquidado}::boolean)`
    ),
    sql`, `
  );
  const res = await db.execute(sql`
    update contrato c
       set origen_recursos  = coalesce(v.origen, c.origen_recursos),
           destino_gasto    = coalesce(v.destino, c.destino_gasto),
           fuentes_recursos = coalesce(v.fuentes, c.fuentes_recursos),
           dias_adicionados = coalesce(v.dias, c.dias_adicionados),
           liquidado        = coalesce(v.liquidado, c.liquidado)
      from (values ${valores}) as v(id, origen, destino, fuentes, dias, liquidado)
     where c.secop_contrato_id = v.id and c.deleted_at is null
    returning c.id`);
  return res.rows.length;
}

export async function tamanoBaseMb(db: Db): Promise<number> {
  const res = await db.execute(sql`select pg_database_size(current_database()) as bytes`);
  return Number((res.rows[0] as { bytes: string | number }).bytes) / (1024 * 1024);
}

// ── Operación ───────────────────────────────────────────────────────────────

/**
 * La ingesta diaria (`/api/cron/tick`) corre a las 11:00 UTC y comparte 300 s con las
 * demás etapas; el relleno no debe competir con ella por una base de CPU compartida.
 * Vedada de 11:00 a 12:30 UTC, ambos extremos incluidos.
 */
export function enVentanaDelTick(ahora: Date): boolean {
  const min = ahora.getUTCHours() * 60 + ahora.getUTCMinutes();
  return min >= 11 * 60 && min <= 12 * 60 + 30;
}

// ── Red ─────────────────────────────────────────────────────────────────────

/** Una página SODA; en producción es `sodaFetchPage` (app token, sin caché). */
export type SodaFetch = (dataset: string, params: SodaPageParams) => Promise<SodaRow[]>;

/**
 * `fetchFilas` para el relleno: pide `id in (…)` con solo los campos del lote y
 * reintenta con espera creciente ante un fallo de red o de la API. Un mismo proceso
 * puede devolver varias filas (una por proveedor), por eso el `$limit` es holgado.
 */
export function crearFetchFilas(opts: {
  dataset: (fuente: FuenteRelleno) => Promise<string>;
  soda: SodaFetch;
  esperar: (ms: number) => Promise<void>;
  intentos?: number;
}): RellenoDeps["fetchFilas"] {
  const intentos = opts.intentos ?? 3;
  return async (fuente, ids) => {
    const dataset = await opts.dataset(fuente);
    const campoId = CAMPO_ID[fuente];
    const params: SodaPageParams = {
      $order: campoId,
      $limit: Math.max(1000, ids.length * 5),
      $where: `${campoId} in (${ids.map((i) => `'${i.replace(/'/g, "''")}'`).join(",")})`,
      $select: selectDeRelleno(fuente),
    };
    let ultimo: unknown;
    for (let n = 1; n <= intentos; n++) {
      try {
        return await opts.soda(dataset, params);
      } catch (e) {
        ultimo = e;
        if (n < intentos) await opts.esperar(2000 * n);
      }
    }
    throw ultimo instanceof Error ? ultimo : new Error(String(ultimo));
  };
}
