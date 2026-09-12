/**
 * Exporta raw_record a NDJSON gzip en disco local y VERIFICA el resultado
 * contra la base (recuenta las líneas del gzip escrito y las compara contra
 * `select count(*) from raw_record`).
 *
 * NO sube nada a Supabase Storage — eso es un paso manual documentado en
 * `docs/runbook-corte-raw-record.md` (Tarea 1, comando `supabase storage cp`
 * o el panel de Storage). Este script solo produce y verifica el archivo
 * local; subirlo y confirmarlo en Storage es responsabilidad del operador.
 *
 * Lee por lotes con cursor sobre la PK (no OFFSET: con 129.511 filas el OFFSET
 * degrada a O(n²)). Mide 44 MB comprimidos para el volumen actual.
 *
 * La verificación de conteo es BLOQUEANTE (spec §Riesgos): un export parcial
 * silencioso es la única forma de que este script traicione al `TRUNCATE`
 * que le sigue. Si el conteo no coincide, el script sale con código != 0 y
 * un mensaje en mayúsculas — no se limita a advertir.
 *
 *   npx tsx scripts/export-raw-archive.ts [ruta-destino.ndjson.gz]
 */
import { createGzip, createGunzip } from "zlib";
import { createWriteStream, createReadStream } from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { createInterface } from "readline";
import { asc, gt, sql } from "drizzle-orm";
import { db, pool } from "@/src/lib/db/client";
import { rawRecord } from "@/src/lib/db/schema";
import { serializarLote, type FilaArchivo } from "@/src/lib/archivo/exportar";

const LOTE = 2000;
// Argumento posicional con el valor anterior como default: un reboot entre el
// export y el corte no debe dejar la única copia local dependiendo de /tmp.
const DESTINO = process.argv[2] ?? "/tmp/raw-archive.ndjson.gz";

async function* lotes(): AsyncGenerator<string> {
  let cursor = "00000000-0000-0000-0000-000000000000";
  let total = 0;
  for (;;) {
    const filas = await db
      .select({
        id: rawRecord.id,
        source: rawRecord.source,
        sourceRecordId: rawRecord.sourceRecordId,
        payloadHash: rawRecord.payloadHash,
        ingestedAt: rawRecord.ingestedAt,
        payload: rawRecord.payload,
      })
      .from(rawRecord)
      .where(gt(rawRecord.id, cursor))
      .orderBy(asc(rawRecord.id))
      .limit(LOTE);

    if (filas.length === 0) break;
    cursor = filas[filas.length - 1].id;
    total += filas.length;
    process.stderr.write(`\rexportadas ${total}`);

    yield serializarLote(
      filas.map((f) => ({
        id: f.id,
        source: f.source,
        sourceRecordId: f.sourceRecordId,
        payloadHash: f.payloadHash,
        ingestedAt: f.ingestedAt.toISOString(),
        payload: f.payload as Record<string, unknown>,
      })) satisfies FilaArchivo[]
    );
  }
  process.stderr.write(`\ntotal: ${total}\n`);
}

/** Cuenta líneas del gzip escrito, releyéndolo del disco (no del buffer en memoria). */
async function contarLineasGzip(ruta: string): Promise<number> {
  let n = 0;
  const rl = createInterface({ input: createReadStream(ruta).pipe(createGunzip()) });
  for await (const linea of rl) {
    if (linea.length > 0) n++;
  }
  return n;
}

async function contarRawRecord(): Promise<number> {
  const [row] = await db.select({ total: sql<number>`count(*)::int` }).from(rawRecord);
  return row?.total ?? 0;
}

try {
  await pipeline(Readable.from(lotes()), createGzip({ level: 9 }), createWriteStream(DESTINO));
  console.log(`escrito ${DESTINO}`);

  const [lineasArchivo, filasTabla] = await Promise.all([
    contarLineasGzip(DESTINO),
    contarRawRecord(),
  ]);

  if (lineasArchivo !== filasTabla) {
    process.stderr.write(
      `\nEXPORT INCOMPLETO — NO USAR ESTE ARCHIVO COMO RESPALDO.\n` +
        `  líneas en ${DESTINO}: ${lineasArchivo}\n` +
        `  filas en raw_record:  ${filasTabla}\n` +
        `El export se saltó filas o la tabla cambió a mitad de la corrida. ` +
        `No subir este archivo a Storage ni continuar con el corte hasta ` +
        `investigar la discrepancia.\n`
    );
    process.exitCode = 1;
  } else {
    console.log(`verificado: ${lineasArchivo} filas en el archivo == ${filasTabla} en raw_record`);
  }
} catch (err) {
  process.stderr.write(`\nexport fallido: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
} finally {
  // Sin esto el pool (`keepAlive: true`) deja el event loop vivo y el
  // script nunca termina: es la red de seguridad de un TRUNCATE, así que
  // tiene que salir solo, sin que alguien lo mate a mano.
  await pool.end();
}
