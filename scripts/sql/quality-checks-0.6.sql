-- Fase 0.6 — Chequeos de calidad
-- 5 secciones: C1 huérfanos, C2 nulos críticos, C3 rangos, C4/C5 protocolo externo.
-- Uso: psql "$DATABASE_URL" -f scripts/sql/quality-checks-0.6.sql

\echo '====================================================================='
\echo 'C1 — Huérfanos'
\echo '====================================================================='

\echo '-- C1.1 contratos sin proceso (EXENTO masivo: artefacto BDOS, 0.2 §5.1)'
SELECT COUNT(*) FILTER (WHERE proceso_id IS NULL) AS contratos_sin_proceso_total,
       COUNT(*) AS contratos_total
FROM contrato;

\echo '-- C1.2 procesos sin entidad (NO debería pasar — entidad es FK obligatoria)'
SELECT COUNT(*) AS procesos_sin_entidad FROM proceso WHERE entidad_id IS NULL;

\echo '-- C1.3 contratos sin entidad (NO debería pasar)'
SELECT COUNT(*) AS contratos_sin_entidad FROM contrato WHERE entidad_id IS NULL;

\echo '-- C1.4 raw que NO mapeó a canónica (latest snapshot por source_record_id)'
WITH latest_procesos AS (
  SELECT DISTINCT ON (source_record_id) id, source_record_id
  FROM raw_record WHERE source='secop_ii_procesos'
  ORDER BY source_record_id, ingested_at DESC
),
latest_contratos AS (
  SELECT DISTINCT ON (source_record_id) id, source_record_id
  FROM raw_record WHERE source='secop_ii_contratos'
  ORDER BY source_record_id, ingested_at DESC
)
SELECT
  (SELECT COUNT(*) FROM latest_procesos lp
    WHERE NOT EXISTS (SELECT 1 FROM proceso p WHERE p.secop_proceso_id = lp.source_record_id))
    AS procesos_raw_sin_canonica,
  (SELECT COUNT(*) FROM latest_contratos lc
    WHERE NOT EXISTS (SELECT 1 FROM contrato c WHERE c.secop_contrato_id = lc.source_record_id))
    AS contratos_raw_sin_canonica;

\echo '====================================================================='
\echo 'C2 — Nulos críticos'
\echo '====================================================================='

\echo '-- C2.1 proveedor: nit_canonico nunca debería ser NULL (es la UNIQUE)'
SELECT COUNT(*) AS proveedor_sin_nit FROM proveedor WHERE nit_canonico IS NULL;

\echo '-- C2.2 contrato: campos obligatorios'
SELECT
  COUNT(*) FILTER (WHERE secop_contrato_id IS NULL) AS sin_secop_id,
  COUNT(*) FILTER (WHERE valor_inicial IS NULL)     AS sin_valor_inicial,
  COUNT(*) FILTER (WHERE estado_actual IS NULL)     AS sin_estado_actual,
  COUNT(*) FILTER (WHERE fecha_inicio IS NULL)      AS sin_fecha_inicio,
  COUNT(*)                                          AS total
FROM contrato;

\echo '-- C2.3 proceso: campos obligatorios'
SELECT
  COUNT(*) FILTER (WHERE secop_proceso_id IS NULL) AS sin_secop_id,
  COUNT(*) FILTER (WHERE objeto IS NULL)           AS sin_objeto,
  COUNT(*) FILTER (WHERE estado_actual IS NULL)    AS sin_estado_actual,
  COUNT(*)                                         AS total
FROM proceso;

\echo '====================================================================='
\echo 'C3 — Rangos'
\echo '====================================================================='

\echo '-- C3.1 valor_inicial <= 0 (sospechoso; 0 puede ser válido pero raro)'
SELECT COUNT(*) FILTER (WHERE valor_inicial = 0)  AS valor_inicial_cero,
       COUNT(*) FILTER (WHERE valor_inicial < 0)  AS valor_inicial_negativo
FROM contrato;

\echo '-- C3.2 valor_actual < valor_inicial (no debería pasar: adiciones suben)'
SELECT COUNT(*) AS valor_actual_menor_que_inicial
FROM contrato WHERE valor_actual < valor_inicial;

\echo '-- C3.3 fecha_fin_actual < fecha_inicio'
SELECT COUNT(*) AS fecha_fin_antes_que_inicio
FROM contrato WHERE fecha_fin_actual < fecha_inicio;

\echo '-- C3.4 ingested_at futuro (reloj mal)'
SELECT COUNT(*) AS ingested_futuro FROM raw_record WHERE ingested_at > NOW();

\echo '====================================================================='
\echo 'Cobertura geográfica (informativo, alimenta T3)'
\echo '====================================================================='

\echo '-- Cobertura por tabla'
SELECT 'proceso' tabla,
       COUNT(*) FILTER (WHERE geografia_id IS NOT NULL) AS con_geo,
       COUNT(*) AS total,
       ROUND(100.0 * COUNT(*) FILTER (WHERE geografia_id IS NOT NULL) / NULLIF(COUNT(*),0), 1) AS pct
FROM proceso
UNION ALL
SELECT 'contrato',
       COUNT(*) FILTER (WHERE geografia_id IS NOT NULL),
       COUNT(*),
       ROUND(100.0 * COUNT(*) FILTER (WHERE geografia_id IS NOT NULL) / NULLIF(COUNT(*),0), 1)
FROM contrato;

\echo '-- Top 30 textos crudos NO resueltos (contratos): entrada para extender DANE en T3'
SELECT payload->>'localizaci_n' AS localizacion_raw, COUNT(*) AS n
FROM raw_record r
JOIN contrato c ON c.secop_contrato_id = r.source_record_id
WHERE r.source='secop_ii_contratos'
  AND r.id = c.raw_record_id_actual
  AND c.geografia_id IS NULL
  AND payload->>'localizaci_n' IS NOT NULL
GROUP BY payload->>'localizaci_n'
ORDER BY n DESC
LIMIT 30;
