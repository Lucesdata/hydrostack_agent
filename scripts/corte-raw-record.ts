/**
 * Corte: suelta las 5 FK, TRUNCATE raw_record, recrea los índices.
 *
 * TRUNCATE y no VACUUM FULL: descarta los ficheros de la relación y devuelve
 * los 287 MB al SO al instante, sin necesitar espacio libre. VACUUM FULL
 * escribiría una copia antes de soltar la vieja, y con 26 MB de margen no
 * cabe.
 *
 * Las 5 columnas que referencian raw_record son todas nullable (verificado
 * 2026-09-11: `proceso.raw_record_id_actual`, `contrato.raw_record_id_actual`,
 * `transform_quarantine.raw_record_id`, `al_proceso_evento.raw_record_id` y
 * `al_oferentes_historico.raw_record_id` se declaran con `.references()` sin
 * `.notNull()` en el esquema Drizzle), así que soltar las constraints no toca
 * un solo dato — ninguna fila deja de cumplir su propio esquema por perder la
 * referencia.
 *
 * Todo el DDL es idempotente (`drop ... if exists` / `create index if not
 * exists`): la Tarea 10 (relleno retroactivo) es opcional y tiene su propio
 * umbral de aborto que puede dejarla a medias, o el operador puede saltarla
 * del todo. Si ese script llegó a soltar los índices recreables pero no el
 * corte, o si este script se reintenta después de un fallo parcial, ninguna
 * sentencia debe morir por "ya existe" — sobre todo porque un `create index`
 * que sí muere así, sin `if not exists`, lo haría **después** del `TRUNCATE`,
 * que para entonces ya corrió.
 *
 * No hace rollback automático de lo ya soltado/truncado si un paso posterior
 * falla — ver la sección "Si algo falla" de docs/runbook-corte-raw-record.md.
 *
 *   CONFIRM_CORTE=si npx tsx scripts/corte-raw-record.ts
 */
import { sql } from "drizzle-orm";

// Compuerta antes de tocar la base o siquiera abrir el pool: sin esta
// variable exacta, el script no debe poder truncar 129.511 filas por
// accidente (doble Enter, copiar el comando equivocado, un cron mal
// configurado). El operador la agrega a mano después de confirmar el
// checklist de pre-vuelo del runbook — no es un flag decorativo.
if (process.env.CONFIRM_CORTE !== "si") {
  process.stderr.write(
    "\nrefused: este script suelta 5 foreign keys y hace TRUNCATE sobre " +
      "`raw_record` (129.511 filas, irreversible).\n" +
      "Antes de correrlo: el archivo NDJSON gzip de la Tarea 1 debe existir " +
      "en Storage y estar verificado (conteo exacto + hash de muestra) — " +
      "ver docs/runbook-corte-raw-record.md, checklist de pre-vuelo.\n" +
      "Si ya lo verificaste, vuelve a correr:\n" +
      "  CONFIRM_CORTE=si npx tsx scripts/corte-raw-record.ts\n"
  );
  process.exit(1);
}

const { db, pool } = await import("@/src/lib/db/client");

const CONSTRAINTS = [
  ["proceso", "proceso_raw_record_id_actual_raw_record_id_fk"],
  ["contrato", "contrato_raw_record_id_actual_raw_record_id_fk"],
  ["transform_quarantine", "transform_quarantine_raw_record_id_raw_record_id_fk"],
  ["al_proceso_evento", "al_proceso_evento_raw_record_id_raw_record_id_fk"],
  ["al_oferentes_historico", "al_oferentes_historico_raw_record_id_raw_record_id_fk"],
] as const;

const INDICES = [
  "create index if not exists contrato_proveedor_idx on contrato (proveedor_id)",
  "create index if not exists contrato_entidad_idx on contrato (entidad_id)",
  "create index if not exists contrato_estado_idx on contrato (estado_actual)",
  "create index if not exists proceso_portafolio_idx on proceso (portafolio_id)",
  "create index if not exists proceso_doc_access_idx on proceso (document_access)",
];

async function estadoBase(): Promise<{ size: string; filas: string }> {
  const [fila] = (await db.execute(
    sql`select pg_size_pretty(pg_database_size(current_database())) as size,
               (select count(*) from raw_record) as filas`
  )) as unknown as { size: string; filas: string }[];
  return fila;
}

async function main() {
  const antes = await estadoBase();
  console.log("antes:", antes);

  for (const [tabla, constraint] of CONSTRAINTS) {
    await db.execute(sql.raw(`alter table ${tabla} drop constraint if exists ${constraint}`));
    console.log(`soltada ${constraint}`);
  }

  await db.execute(sql`truncate table raw_record`);
  console.log("raw_record truncada");

  for (const ddl of INDICES) {
    await db.execute(sql.raw(ddl));
    console.log(`recreado: ${ddl.split(" ")[5]}`);
  }

  const despues = await estadoBase();
  console.log("después:", despues);
}

try {
  await main();
} catch (err) {
  process.stderr.write(
    `\ncorte fallido a mitad de camino: ${err instanceof Error ? err.message : String(err)}\n` +
      "revisar manualmente qué constraints/índices quedaron sueltos antes de reintentar " +
      "(ver docs/runbook-corte-raw-record.md, sección \"Si algo falla\").\n"
  );
  process.exitCode = 1;
} finally {
  // Sin esto el pool (`keepAlive: true`) deja el event loop vivo y el
  // script nunca termina — igual que en export-raw-archive.ts.
  await pool.end();
}
