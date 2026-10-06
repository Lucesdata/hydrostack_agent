-- ¿Cabe más ingesta? (spec 2026-10-06-ficha-viva-datos-nuevos, M11)
-- Para el SQL Editor de Supabase: una sola consulta de lectura, no modifica nada.
--
-- Devuelve: medicion | resultado (JSON).
--   1. Tamaño de la base frente a los 500 MB del plan Free.
--   2. Las diez tablas más pesadas (datos + índices + TOAST).
--   3. Filas de raw_record por fuente y cuántas conservan payload.
--   4. Procesos y contratos de agua desde 2026: el universo que habría que
--      volver a pedir a Socrata para rellenar los campos nuevos.

WITH base AS (
  SELECT jsonb_build_object(
    'mb_base', round(pg_database_size(current_database()) / 1048576.0, 1),
    'mb_cuota_free', 500
  ) r
),
tablas AS (
  SELECT coalesce(jsonb_agg(x ORDER BY (x->>'mb')::numeric DESC), '[]') r FROM (
    SELECT jsonb_build_object(
      'tabla', c.relname,
      'mb', round(pg_total_relation_size(c.oid) / 1048576.0, 1),
      'filas_aprox', c.reltuples::bigint
    ) x
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY pg_total_relation_size(c.oid) DESC
    LIMIT 10
  ) t
),
raw AS (
  SELECT coalesce(jsonb_agg(x), '[]') r FROM (
    SELECT jsonb_build_object(
      'source', source,
      'filas', count(*),
      'con_payload', count(*) FILTER (WHERE payload IS NOT NULL)
    ) x
    FROM raw_record
    GROUP BY source
  ) t
),
universo AS (
  SELECT jsonb_build_object(
    'procesos_2026', (SELECT count(*) FROM proceso
                      WHERE deleted_at IS NULL AND fecha_publicacion >= DATE '2026-01-01'),
    'contratos_de_procesos_2026', (SELECT count(*) FROM contrato c
                      WHERE c.deleted_at IS NULL AND c.proceso_id IN (
                        SELECT id FROM proceso
                        WHERE deleted_at IS NULL AND fecha_publicacion >= DATE '2026-01-01'))
  ) r
)
SELECT 'Tamaño de la base' AS medicion, r AS resultado FROM base
UNION ALL SELECT 'Tablas más pesadas', r FROM tablas
UNION ALL SELECT 'raw_record por fuente', r FROM raw
UNION ALL SELECT 'Universo desde 2026', r FROM universo;
