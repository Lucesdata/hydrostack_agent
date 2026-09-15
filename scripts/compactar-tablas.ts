/**
 * Compacta con VACUUM FULL las tres tablas grandes y reporta el antes/después.
 *
 * ── Por qué hace falta ──────────────────────────────────────────────────────
 * Medido el 2026-09-15: la base ocupa 506 MB contra el techo de 500 MB del plan
 * Free de Supabase, pero solo 120 MB son datos reales. El resto es espacio
 * libre dentro de los archivos, sobre todo en `raw_record` (226 MB de archivo
 * para 22 MB de datos).
 *
 * El hueco lo dejó el vaciado del `payload`: la ingesta lo escribe, el
 * transform lo consume y `vaciarPayloads()` lo pone en NULL. Ese UPDATE libera
 * el espacio DENTRO del archivo, pero un VACUUM normal nunca lo devuelve al
 * disco — y la cuota de Supabase mide el archivo, no los datos. VACUUM FULL
 * reescribe la tabla entera en un archivo nuevo y sí devuelve el espacio.
 *
 * ── Cuidado al ejecutarlo ───────────────────────────────────────────────────
 * VACUUM FULL toma un ACCESS EXCLUSIVE: la tabla no responde mientras dura. Por
 * eso `lock_timeout` es corto — si la tabla está ocupada preferimos fallar
 * rápido antes que encolar detrás del lock las lecturas que lleguen después,
 * que es como un mantenimiento tumba un sitio. `statement_timeout` va a 0
 * porque el VACUUM en sí puede tardar más que el límite por defecto.
 *
 * No borra ni modifica una sola fila. La columna `payload` se queda: es un
 * buffer por diseño (ver `src/lib/transform/orchestrator.ts`), no un residuo.
 */
import { config } from "dotenv";
import { Client } from "pg";

const TABLAS = ["raw_record", "proceso", "contrato"] as const;

const MB = (b: number | string) => (Number(b) / 1048576).toFixed(1) + " MB";

async function main() {
  config({ path: ".env.local" });
  config({ path: ".env" });

  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  const filas = async (s: string) => (await c.query(s)).rows;
  const tamBase = async () => (await filas("select pg_database_size(current_database()) b"))[0].b;
  const tamTabla = async (t: string) =>
    (await filas(`select pg_total_relation_size('public.${t}') b`))[0].b;

  await c.query("set lock_timeout = '20s'");
  await c.query("set statement_timeout = 0");

  const antes = await tamBase();
  console.log("BASE ANTES:", MB(antes));
  console.log("");

  for (const t of TABLAS) {
    const a = await tamTabla(t);
    const t0 = Date.now();
    try {
      await c.query(`vacuum (full, analyze) public.${t}`);
      const d = await tamTabla(t);
      const seg = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(
        `OK   ${t.padEnd(11)} ${MB(a).padStart(9)} -> ${MB(d).padStart(9)}` +
          `   libera ${MB(Number(a) - Number(d)).padStart(9)}   (${seg}s)`
      );
    } catch (e) {
      console.log(`FALLO ${t.padEnd(11)} ${(e as Error).message}`);
    }
  }

  const despues = await tamBase();
  console.log("");
  console.log("BASE DESPUES:", MB(despues));
  console.log("LIBERADO:", MB(Number(antes) - Number(despues)));
  console.log(
    "USO DEL TECHO (500 MB):",
    ((Number(despues) / 1048576 / 500) * 100).toFixed(1) + "%"
  );

  await c.end();
}

main().catch((e) => {
  console.error("ERROR:", (e as Error).message);
  process.exit(1);
});
