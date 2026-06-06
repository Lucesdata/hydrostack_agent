/**
 * Fase 0.6 — Auditoría de proveedores (E1).
 * 3 reportes: R1.1 razones sociales múltiples, R1.2 NIT basura nueva,
 * R1.3 tipo_documento mal asignado.
 *
 * Uso: tsx scripts/audit-proveedores.ts
 */
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function r11_razonesMultiples() {
  console.log('\n=== R1.1 — NITs con razones sociales múltiples ===');
  // proveedor es UNIQUE por nit_canonico → si hay >1 razón social vemos
  // colisiones en raw_record. Las miramos vía payload del último snapshot.
  const { rows } = await pool.query(`
    WITH razones_por_nit AS (
      SELECT
        regexp_replace(coalesce(payload->>'documento_proveedor',''), '\\D', '', 'g') AS nit_raw,
        payload->>'proveedor_adjudicado' AS razon
      FROM raw_record
      WHERE source = 'secop_ii_contratos'
        AND payload->>'documento_proveedor' IS NOT NULL
        AND payload->>'proveedor_adjudicado' IS NOT NULL
    ),
    agrupados AS (
      SELECT nit_raw, COUNT(DISTINCT razon) AS n_razones,
             array_agg(DISTINCT razon) AS razones
      FROM razones_por_nit
      WHERE length(nit_raw) >= 5
      GROUP BY nit_raw
      HAVING COUNT(DISTINCT razon) > 1
    )
    SELECT COUNT(*) AS total_nits_con_multiples FROM agrupados;
  `);
  console.log(`  total NITs con >1 razón social: ${rows[0].total_nits_con_multiples}`);

  const top = await pool.query(`
    WITH razones_por_nit AS (
      SELECT
        regexp_replace(coalesce(payload->>'documento_proveedor',''), '\\D', '', 'g') AS nit_raw,
        payload->>'proveedor_adjudicado' AS razon
      FROM raw_record
      WHERE source = 'secop_ii_contratos'
        AND payload->>'documento_proveedor' IS NOT NULL
        AND payload->>'proveedor_adjudicado' IS NOT NULL
    )
    SELECT nit_raw, COUNT(DISTINCT razon) AS n_razones,
           (array_agg(DISTINCT razon))[1:3] AS muestra
    FROM razones_por_nit
    WHERE length(nit_raw) >= 5
    GROUP BY nit_raw
    HAVING COUNT(DISTINCT razon) > 1
    ORDER BY n_razones DESC
    LIMIT 10;
  `);
  console.log('  top 10:');
  for (const row of top.rows) {
    console.log(`    ${row.nit_raw} (${row.n_razones} razones): ${row.muestra.join(' | ')}`);
  }
}

async function r12_nitBasura() {
  console.log('\n=== R1.2 — Patrones de NIT basura no contemplados ===');
  // Los actuales contemplados: regex de centinelas en normalize.ts +
  // el chequeo "documento sin dígitos". Buscamos textos que entraron como
  // proveedor_raw (proveedor_id IS NULL) y agrupamos.
  const { rows } = await pool.query(`
    SELECT proveedor_raw, COUNT(*) AS n
    FROM contrato
    WHERE proveedor_id IS NULL AND proveedor_raw IS NOT NULL
    GROUP BY proveedor_raw
    ORDER BY n DESC
    LIMIT 20;
  `);
  if (!rows.length) {
    console.log('  (sin filas con proveedor_id NULL — el normalizador resolvió todo)');
    return;
  }
  console.log('  patrones que terminaron en proveedor_raw:');
  for (const row of rows) {
    console.log(`    [${row.n}] ${row.proveedor_raw}`);
  }
  console.log('  → si hay patrones que NO son centinela legítimo, ampliar normalize.ts SENTINELS');
}

async function r13_tipoDocMal() {
  console.log('\n=== R1.3 — tipo_documento sospechoso ===');
  // Caso 1: tipo_documento = NIT pero el número tiene <= 7 dígitos (más típico de CC)
  const cc = await pool.query(`
    SELECT COUNT(*) AS n_nit_corto FROM proveedor
    WHERE tipo_documento='NIT' AND length(nit_canonico) <= 7;
  `);
  console.log(`  proveedores con tipo_documento='NIT' y length(nit_canonico)<=7: ${cc.rows[0].n_nit_corto}`);

  // Caso 2: tipo_documento != NIT pero el número tiene >= 9 dígitos (típico NIT empresa)
  const nit = await pool.query(`
    SELECT tipo_documento, COUNT(*) AS n_largo
    FROM proveedor
    WHERE tipo_documento <> 'NIT' AND length(nit_canonico) >= 9
    GROUP BY tipo_documento;
  `);
  console.log('  proveedores con tipo_documento != NIT y length(nit_canonico)>=9:');
  for (const row of nit.rows) {
    console.log(`    ${row.tipo_documento}: ${row.n_largo}`);
  }
  console.log('  → si los conteos son significativos, revisar normalizeTipoDoc en nit.ts');
}

async function main() {
  await r11_razonesMultiples();
  await r12_nitBasura();
  await r13_tipoDocMal();
  await pool.end();
}

main().catch((e) => {
  console.error('audit-proveedores falló:', e);
  pool.end().catch(() => {}).finally(() => process.exit(1));
});
