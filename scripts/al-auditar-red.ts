/**
 * Auditoría de la RED DE INGESTA (capa 'ingesta' de `al_descartes`, SDD §6.2).
 *
 *   npm run al:auditar-red -- --dias=7 --limite=2000
 *
 * El SDD pedía registrar lo que la red descarta, pero esos procesos **nunca
 * llegan a `raw_record`**: la red se aplica como `$where` en Socrata, así que lo
 * rechazado se queda en la fuente. Auditarlo no es leer la base, es ir a buscar
 * a la fuente lo que decidimos no traer.
 *
 * Por eso esto es un SONDEO por muestra, no un registro exhaustivo: se piden los
 * procesos publicados en los últimos N días SIN el filtro sectorial y se evalúan
 * contra la misma red. Lo que la red rechaza se guarda con su motivo, y de ahí
 * sale la pregunta que el producto no puede responder de otra forma: **¿qué nos
 * estamos perdiendo?**
 *
 * No corre en el cron: es caro (trae todo, no solo el sector) y su valor está en
 * ejecutarlo a mano cuando se toca la red o el diccionario.
 */

import "./_env";
import { sodaFetchPage } from "@/src/lib/ingest/sodaFetch";
import { DATASETS, FIELDS_PROCESOS as F } from "@/src/lib/secop/config";
import { SECTOR_NET_PROCESOS } from "@/src/lib/secop/ingest-net";
import { motivoRedSectorial } from "@/src/lib/al/matching/red-sectorial";
import { registrarDescartes, type DescarteInput } from "@/src/lib/al/matching/registrar-descartes";
import { VERSION_RED } from "@/src/lib/al/matching/tipos";

function arg(nombre: string, porDefecto: number): number {
  const a = process.argv.slice(2).find((x) => x.startsWith(`--${nombre}=`));
  return a ? Number(a.split("=")[1]) : porDefecto;
}

async function main() {
  const dias = arg("dias", 7);
  const limite = arg("limite", 2000);

  const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  console.log(`Sondeando procesos publicados desde ${desde} (tope ${limite}), SIN filtro sectorial`);

  const page = await sodaFetchPage(DATASETS.procesos, {
    $order: `${F.fechaPublicacion} DESC`,
    $limit: limite,
    $where: `${F.fechaPublicacion} >= '${desde}T00:00:00.000'`,
  });

  const descartes: DescarteInput[] = [];
  let pasan = 0;

  for (const row of page) {
    const motivo = motivoRedSectorial(row, SECTOR_NET_PROCESOS);
    if (motivo === null) {
      pasan++;
      continue;
    }
    const id = row[F.id];
    if (typeof id !== "string") continue;
    descartes.push({
      secopProcesoId: id,
      objetoResumen: [row[F.nombre], row[F.descripcion]].filter(Boolean).join(" — ") || null,
      unspscObservado: (row[F.unspsc] as string) ?? null,
      valorEstimado: null,
      entidadNit: (row[F.nitEntidad] as string) ?? null,
      divipola: null,
      motivo,
      evidencia: { modalidad: row[F.modalidad] ?? null, entidad: row[F.entidad] ?? null },
      redVersion: VERSION_RED,
    });
  }

  const escritos = await registrarDescartes("ingesta", descartes);

  const porMotivo = descartes.reduce<Record<string, number>>((acc, d) => {
    acc[d.motivo] = (acc[d.motivo] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`\nMuestra: ${page.length} procesos`);
  console.log(`  pasan la red:  ${pasan} (${((100 * pasan) / page.length).toFixed(1)}%)`);
  console.log(`  descartados:   ${escritos}`);
  for (const [m, n] of Object.entries(porMotivo)) console.log(`    ${m}: ${n}`);
  console.log(`\nMuestrear a ojo lo descartado:`);
  console.log(
    `  psql "$DATABASE_URL" -c "SELECT secop_proceso_id, left(objeto_resumen,70), motivo FROM al_descartes WHERE capa='ingesta' ORDER BY random() LIMIT 25;"`
  );
  process.exit(0);
}

main().catch((e) => {
  console.error("✖", e instanceof Error ? e.message : e);
  process.exit(1);
});
