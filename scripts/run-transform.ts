/**
 * Corrida del transform raw → canónico (0.4).
 *
 *   npm run db:transform
 *
 * Requiere:
 *   1. DATABASE_URL en .env.local (Neon dev branch).
 *   2. Migración 0001 aplicada (`npm run db:migrate`).
 *   3. Geografía sembrada (`npm run db:seed-geografia`).
 *   4. Capa cruda poblada (`npm run db:load-sample`).
 *
 * Idempotente: re-correr sobre el mismo raw_record deja el mismo estado
 * canónico. La transformación NUNCA llama a Socrata — todo sale de raw_record.
 */

import './_env';
import { pool } from '@/src/lib/db/client';
import { runTransform, type SourceMetrics } from '@/src/lib/transform/orchestrator';
import type { EventMetrics } from '@/src/lib/transform/eventWriter';

function fmt(label: string, m: SourceMetrics): string {
  return [
    `${label}:`,
    `  snapshots crudos:           ${m.totalSnapshots}`,
    `  registros únicos (latest):  ${m.uniqueRecords}`,
    `  entidades upsert:           ${m.entidadesUpsert}`,
    label.startsWith('contratos')
      ? `  proveedores upsert:         ${m.proveedoresUpsert}`
      : null,
    label.startsWith('contratos')
      ? `  proveedor centinela (→raw): ${m.proveedorCentinela}`
      : null,
    label.startsWith('procesos')
      ? `  procesos upsert:            ${m.procesosUpsert}`
      : `  contratos upsert:           ${m.contratosUpsert}`,
    `  geografía resuelta:         ${m.geografiaResuelta}`,
    `  geografía no resuelta:      ${m.geografiaNoResuelta}`,
    label.startsWith('contratos')
      ? `  proceso no encontrado:      ${m.procesoNoEncontrado} (ventana BDOS — 0.2 §5.1)`
      : null,
    `  cuarentena (errores duros): ${m.cuarentena}`,
  ]
    .filter((x): x is string => x !== null)
    .join('\n');
}

function fmtEventos(m: EventMetrics): string {
  return [
    'eventos (contrato_evento):',
    `  grupos total:               ${m.gruposTotal}`,
    `  grupos multi-snapshot:      ${m.gruposMultiSnapshot}`,
    `  eventos insertados:         ${m.eventosInsertados}`,
    `    adicion:                  ${m.porTipo.adicion}`,
    `    prorroga:                 ${m.porTipo.prorroga}`,
    `    suspension:               ${m.porTipo.suspension}`,
    `    terminacion:              ${m.porTipo.terminacion}`,
    `    cesion:                   ${m.porTipo.cesion}`,
    `  cesiones sin proveedor FK:  ${m.cesionesSinProveedorFk}`,
    `  grupos sin contrato:        ${m.gruposSinContrato}`,
    `  grupos con error:           ${m.gruposConError}`,
  ].join('\n');
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL no definida. Provisiona la Neon branch y ponla en .env.local.');
  }
  const t0 = Date.now();
  const summary = await runTransform();
  const ms = Date.now() - t0;

  process.stdout.write(`\nbatchId: ${summary.batchId}\n`);
  process.stdout.write(`${fmt('procesos (secop_ii_procesos)', summary.procesos)}\n\n`);
  process.stdout.write(`${fmt('contratos (secop_ii_contratos)', summary.contratos)}\n\n`);
  process.stdout.write(`${fmtEventos(summary.eventos)}\n\n`);
  process.stdout.write(`transform terminado en ${ms}ms\n`);

  await pool.end();
}

main().catch((e) => {
  process.stderr.write(`✖ ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
