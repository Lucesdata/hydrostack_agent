/**
 * CI-02b — genera la hoja de etiquetado para dos revisores.
 *
 * SOLO LECTURA sobre la base indicada en DATABASE_URL (una consulta SELECT).
 * Toma los contratos del Valle del Cauca firmados desde 2026 con contratista
 * NIT (los 217 del spike, por defecto) y escribe tres CSV en la carpeta de salida:
 *
 *   hoja-revisor.csv      id + objeto + columnas vacías. Se entrega IGUAL a los dos
 *                         revisores y NO muestra lo que dice el clasificador
 *                         (etiquetado ciego, para no anclarlos).
 *   clave-clasificador.csv   id + candidatos del clasificador. Solo para evaluar.
 *   (ninguno incluye nombres de contratistas, NIT ni datos de personas.)
 *
 * Uso:
 *   npx tsx scripts/tecnologia-hoja-etiquetado.ts [carpeta] [--limite N]
 * La carpeta por defecto es `.local/etiquetado/` (ignorada por git).
 */
import { config } from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { clasificarTecnologia } from "../src/lib/tecnologia/clasificador";
import { aCsv } from "../src/lib/tecnologia/evaluacion";

config({ path: ".env.local" });

const args = process.argv.slice(2);
const iLim = args.indexOf("--limite");
const limite = iLim >= 0 ? Number(args[iLim + 1]) : null;
const carpeta =
  args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--limite") ?? ".local/etiquetado";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no está definida");
  const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
    await c.query("set transaction read only").catch(() => undefined);
    const r = await c.query<{ id: string; objeto: string }>(
      `select c.secop_contrato_id as id, regexp_replace(c.objeto, '\\s+', ' ', 'g') as objeto
         from contrato c
         join proveedor p on p.id = c.proveedor_id
         join geografia g on g.codigo_divipola = c.geografia_id
        where c.fecha_firma >= '2026-01-01'
          and p.tipo_documento = 'NIT'
          and g.departamento_codigo = '76'
          and c.objeto is not null
        order by md5(c.secop_contrato_id)
        ${limite ? `limit ${Number(limite)}` : ""}`
    );

    mkdirSync(carpeta, { recursive: true });
    const hoja = [["id", "objeto", "actividad", "bien_explicito", "categorias", "observaciones"]];
    const clave = [["id", "candidatos"]];
    for (const f of r.rows) {
      hoja.push([f.id, f.objeto, "", "", "", ""]);
      const cand = clasificarTecnologia(f.objeto).candidatos.map((x) => x.codigo);
      clave.push([f.id, cand.join(";")]);
    }
    writeFileSync(join(carpeta, "hoja-revisor.csv"), aCsv(hoja), "utf8");
    writeFileSync(join(carpeta, "clave-clasificador.csv"), aCsv(clave), "utf8");
    console.log(
      `${r.rows.length} contratos → ${carpeta}/ (hoja-revisor.csv, clave-clasificador.csv)`
    );
  } finally {
    await c.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
