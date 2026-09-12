/**
 * Exporta raw_record a NDJSON gzip y lo sube a Supabase Storage.
 *
 * Lee por lotes con cursor sobre la PK (no OFFSET: con 129.511 filas el OFFSET
 * degrada a O(n²)). Mide 44 MB comprimidos para el volumen actual.
 *
 *   npx tsx scripts/export-raw-archive.ts
 */
import { createGzip } from "zlib";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { asc, gt } from "drizzle-orm";
import { db, pool } from "@/src/lib/db/client";
import { rawRecord } from "@/src/lib/db/schema";
import { serializarLote, type FilaArchivo } from "@/src/lib/archivo/exportar";

const LOTE = 2000;
const DESTINO = "/tmp/raw-archive.ndjson.gz";

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

try {
  await pipeline(Readable.from(lotes()), createGzip({ level: 9 }), createWriteStream(DESTINO));
  console.log(`escrito ${DESTINO}`);
} catch (err) {
  process.stderr.write(`\nexport fallido: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
} finally {
  // Sin esto el pool (`keepAlive: true`) deja el event loop vivo y el
  // script nunca termina: es la red de seguridad de un TRUNCATE, así que
  // tiene que salir solo, sin que alguien lo mate a mano.
  await pool.end();
}
