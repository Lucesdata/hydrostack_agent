/**
 * Siembra `geografia` y `geografia_alias` con el crosswalk DANE (data/dane/).
 *
 * Pre-requisito DURO de 0.4 (cf. 0.2.2 §10): si la geografía no está sembrada,
 * todos los `geografia_id` salen NULL en el transform. Este script se corre
 * UNA vez por base nueva, antes de `db:transform`.
 *
 * Idempotente: upsert por PK (geografia.codigo_divipola) y por texto único
 * (geografia_alias.texto_normalizado). Re-ejecutar no duplica.
 */

import './_env';
import { db, pool } from '@/src/lib/db/client';
import { geografia, geografiaAlias } from '@/src/lib/db/schema';
import { sql } from 'drizzle-orm';
import { ALL_DIVIPOLA, type DivipolaEntry } from '@/data/dane/divipola';
import { normalizeGeoText } from '@/src/lib/transform/geo';

function aliasesFor(entry: DivipolaEntry): string[] {
  const out = new Set<string>();
  // Nombre canónico normalizado (municipio si es muni, dept si es dept-only)
  const primary =
    entry.municipioNombre !== null
      ? normalizeGeoText(entry.municipioNombre)
      : normalizeGeoText(entry.departamentoNombre);
  if (primary) out.add(primary);
  // Aliases extra declarados en la entrada
  for (const a of entry.aliases ?? []) {
    const n = normalizeGeoText(a);
    if (n) out.add(n);
  }
  return [...out];
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL no definida. Provisiona la Neon branch.');
  }

  // 1. Upsert geografia
  let inserted = 0;
  let updated = 0;
  for (const e of ALL_DIVIPOLA) {
    const result = await db
      .insert(geografia)
      .values({
        codigoDivipola: e.divipola,
        departamentoCodigo: e.departamentoCodigo,
        departamentoNombre: e.departamentoNombre,
        municipioCodigo: e.municipioCodigo,
        municipioNombre: e.municipioNombre,
      })
      .onConflictDoUpdate({
        target: geografia.codigoDivipola,
        set: {
          departamentoCodigo: e.departamentoCodigo,
          departamentoNombre: e.departamentoNombre,
          municipioCodigo: e.municipioCodigo,
          municipioNombre: e.municipioNombre,
        },
      })
      .returning({ id: geografia.codigoDivipola });
    if (result.length) inserted++;
  }
  process.stdout.write(`geografia: ${inserted} filas upserteadas\n`);

  // 2. Upsert geografia_alias
  let aliasUpserts = 0;
  for (const e of ALL_DIVIPOLA) {
    for (const texto of aliasesFor(e)) {
      // Drizzle: insert ... on conflict do update — usa el constraint por texto.
      await db
        .insert(geografiaAlias)
        .values({ textoNormalizado: texto, codigoDivipola: e.divipola })
        .onConflictDoUpdate({
          target: geografiaAlias.textoNormalizado,
          set: { codigoDivipola: e.divipola },
        });
      aliasUpserts++;
    }
  }
  process.stdout.write(`geografia_alias: ${aliasUpserts} aliases upserteados\n`);

  // 3. Reporte rápido
  const [g] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(geografia);
  const [a] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(geografiaAlias);
  process.stdout.write(`total geografia: ${g?.n} · aliases: ${a?.n}\n`);

  await pool.end();
}

main().catch((e) => {
  process.stderr.write(`✖ ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
