// src/lib/secop/landingMetricsGenerator.ts
/**
 * Orquestación IO de la matriz de métricas del landing: pega a Socrata
 * (Procesos + Contratos) en vivo, arma el payload y lo escribe en
 * `public/landing-metrics.json` — sin base de datos (ver spec §2, revisión
 * 2026-07-18: Neon sin espacio disponible). Compartido por el CLI
 * (scripts/generate-landing-metrics.ts); no hay cron (el filesystem de
 * Vercel es de solo lectura en producción, ninguna función puede escribir
 * en `public/`).
 *
 * Nunca toca la capa canónica del pipeline ELT (Postgres) para los datos en
 * sí — mismo criterio que `landingStats.ts`: Socrata directo, agregación
 * server-side (`sum`/`count`) donde SoQL lo permite; la mediana de
 * `ciclo_proceso` requiere traer filas crudas (SoQL no la agrega), con tope
 * de `$limit` documentado en cada fetch.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sodaFetch, buildAguaWhere, buildAguaWhereContratos } from './client';
import { resolveDatasetId } from './datasetResolver';
import { FIELDS_PROCESOS, FIELDS_CONTRATOS } from './config';
import { SECTOR_KEYS, buildSectorWhere, type SectorKey } from './sectorKeywords';
import {
  buildCicloProceso,
  type LandingMetricsPayload,
  type Combinacion,
  type OportunidadActiva,
  type CicloProceso,
} from './landingMetrics';

const F = FIELDS_PROCESOS;
const C = FIELDS_CONTRATOS;

const OUTPUT_PATH = join(process.cwd(), 'public', 'landing-metrics.json');

function soqlEscape(value: string): string {
  return value.replace(/'/g, "''");
}

/** Ventana de 12 meses hacia atrás, formato floating-timestamp SoQL. Precisión
 *  de día basta para un corte de 12 meses (a diferencia del corte de "mes
 *  actual" de landingStats.ts, no hace falta el ajuste de hora Bogotá). */
function twelveMonthsAgoSoql(now: Date): string {
  const d = new Date(now);
  d.setUTCFullYear(d.getUTCFullYear() - 1);
  return d.toISOString().replace('Z', '');
}

/** Departamentos con al menos un proceso abierto del sector agua — evita
 *  iterar los 33 a la fuerza. */
async function fetchDepartamentosConActividad(): Promise<string[]> {
  const where = `${buildAguaWhere()} AND ${F.estadoApertura} = 'Abierto'`;
  const rows = await sodaFetch<Record<string, string>>(
    await resolveDatasetId('procesos'),
    { $select: `${F.departamento}, count(*) as n`, $where: where, $group: F.departamento, $limit: 60, $offset: 0 },
  );
  return rows.map((r) => r[F.departamento]).filter((d): d is string => Boolean(d));
}

async function fetchOportunidadActiva(sector: SectorKey, departamento: string): Promise<OportunidadActiva> {
  const where = [
    buildSectorWhere(sector, [F.nombre, F.descripcion]),
    `${F.estadoApertura} = 'Abierto'`,
    `upper(${F.departamento}) = '${soqlEscape(departamento.toUpperCase())}'`,
  ].join(' AND ');
  const rows = await sodaFetch<{ valor_cop?: string; n_procesos?: string }>(
    await resolveDatasetId('procesos'),
    { $select: `sum(${F.precioBase}) as valor_cop, count(*) as n_procesos`, $where: where, $limit: 1, $offset: 0 },
  );
  const valor = Number(rows[0]?.valor_cop);
  const n = Number(rows[0]?.n_procesos);
  return { valor_cop: Number.isFinite(valor) ? valor : 0, n_procesos: Number.isFinite(n) ? n : 0 };
}

/** Días crudos (fecha_de_fin − fecha_de_firma) de contratos firmados en los
 *  últimos 12 meses para una combinación. Tope $limit=1000: suficiente para
 *  cualquier combinación depto×sector realista; si se alcanza, la mediana
 *  queda calculada sobre una muestra, no sobre el universo — aceptable dado
 *  que el JSON ya expone `n_muestra` explícitamente. */
async function fetchCicloProcesoDias(sector: SectorKey, departamento: string, now: Date): Promise<number[]> {
  const where = [
    buildSectorWhere(sector, [C.objeto]),
    `${C.fechaFirma} >= '${twelveMonthsAgoSoql(now)}'`,
    `upper(${C.departamento}) = '${soqlEscape(departamento.toUpperCase())}'`,
  ].join(' AND ');
  const rows = await sodaFetch<Record<string, string>>(
    await resolveDatasetId('contratos'),
    { $select: `${C.fechaFirma}, ${C.fechaFinContrato}`, $where: where, $limit: 1000, $offset: 0 },
  );
  return rows
    .map((r) => (new Date(r[C.fechaFinContrato]).getTime() - new Date(r[C.fechaFirma]).getTime()) / 86_400_000)
    .filter((d) => Number.isFinite(d) && d >= 0);
}

async function fetchNacional(
  now: Date,
): Promise<{ oportunidad_activa: OportunidadActiva; ciclo_proceso: CicloProceso }> {
  const whereProcesos = `${buildAguaWhere()} AND ${F.estadoApertura} = 'Abierto'`;
  const procesosRows = await sodaFetch<{ valor_cop?: string; n_procesos?: string }>(
    await resolveDatasetId('procesos'),
    { $select: `sum(${F.precioBase}) as valor_cop, count(*) as n_procesos`, $where: whereProcesos, $limit: 1, $offset: 0 },
  );
  const valor = Number(procesosRows[0]?.valor_cop);
  const n = Number(procesosRows[0]?.n_procesos);
  const oportunidad_activa: OportunidadActiva = {
    valor_cop: Number.isFinite(valor) ? valor : 0,
    n_procesos: Number.isFinite(n) ? n : 0,
  };

  const whereContratos = [buildAguaWhereContratos(), `${C.fechaFirma} >= '${twelveMonthsAgoSoql(now)}'`].join(
    ' AND ',
  );
  const contratosRows = await sodaFetch<Record<string, string>>(
    await resolveDatasetId('contratos'),
    { $select: `${C.fechaFirma}, ${C.fechaFinContrato}`, $where: whereContratos, $limit: 2000, $offset: 0 },
  );
  const dias = contratosRows
    .map((r) => (new Date(r[C.fechaFinContrato]).getTime() - new Date(r[C.fechaFirma]).getTime()) / 86_400_000)
    .filter((d) => Number.isFinite(d) && d >= 0);

  return { oportunidad_activa, ciclo_proceso: buildCicloProceso(dias) };
}

/**
 * Arma el payload completo. Best-effort por combinación: si una query
 * individual falla, esa combinación se omite (se loguea, no tumba la
 * corrida). Combinaciones con `n_procesos: 0` se omiten del array.
 */
export async function generateLandingMetrics(now: Date = new Date()): Promise<LandingMetricsPayload> {
  const departamentos = await fetchDepartamentosConActividad();
  const combinaciones: Combinacion[] = [];

  for (const departamento of departamentos) {
    for (const sector of SECTOR_KEYS) {
      try {
        const [oportunidad_activa, dias] = await Promise.all([
          fetchOportunidadActiva(sector, departamento),
          fetchCicloProcesoDias(sector, departamento, now),
        ]);
        if (oportunidad_activa.n_procesos === 0) continue; // se omite del array (spec §5)
        combinaciones.push({
          departamento,
          sector,
          oportunidad_activa,
          ciclo_proceso: buildCicloProceso(dias),
        });
      } catch (err) {
        console.warn(
          `[landingMetricsGenerator] combinación ${departamento}/${sector} falló, se omite (${
            err instanceof Error ? err.message : String(err)
          })`,
        );
      }
    }
  }

  const nacional = await fetchNacional(now);

  return {
    fecha_corte: now.toISOString().slice(0, 10),
    combinaciones,
    nacional,
  };
}

/** Escribe `public/landing-metrics.json` — sin base de datos. Indentado a 2
 *  espacios para que el diff de cada regeneración sea legible en el commit. */
export function persistLandingMetrics(payload: LandingMetricsPayload): void {
  writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf-8');
}
