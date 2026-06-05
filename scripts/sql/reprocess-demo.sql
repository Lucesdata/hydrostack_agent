-- ─────────────────────────────────────────────────────────────────────────────
-- Fase 0.3 — Prueba de reproceso desde la capa cruda raw_record.
--
-- Demuestra que se reconstruye información SIN volver a descargar de Socrata:
-- todo sale del payload JSONB ya aterrizado. La capa canónica (0.4) hará este
-- mismo trabajo de forma sistemática; estas consultas prueban que el insumo
-- crudo es suficiente y autónomo.
--
--   psql "$DATABASE_URL" -f scripts/sql/reprocess-demo.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Inventario: snapshots crudos y registros distintos por fuente.
SELECT source,
       count(*)                          AS snapshots,
       count(DISTINCT source_record_id)  AS registros_distintos,
       min(ingested_at)                  AS primera_carga,
       max(ingested_at)                  AS ultima_carga
FROM raw_record
GROUP BY source
ORDER BY source;

-- 2) Reconstrucción canónica PARCIAL de contratos desde el JSONB crudo
--    (el mismo mapeo que hará 0.4, aquí sin red ni transformación persistida).
SELECT payload->>'id_contrato'                    AS secop_contrato_id,
       payload->>'proceso_de_compra'              AS portafolio_id,   -- llave de join (D11)
       payload->>'nombre_entidad'                 AS entidad,
       (payload->>'valor_del_contrato')::numeric  AS valor,
       payload->>'estado_contrato'                AS estado,
       left(payload->>'objeto_del_contrato', 60)  AS objeto
FROM raw_record
WHERE source = 'secop_ii_contratos'
ORDER BY ingested_at DESC
LIMIT 10;

-- 3) Consulta JSONB por CONTAINMENT (acelerable por el índice GIN del payload):
--    contratos en un estado dado, agrupados por entidad.
SELECT payload->>'nombre_entidad' AS entidad,
       count(*)                   AS contratos
FROM raw_record
WHERE source = 'secop_ii_contratos'
  AND payload @> '{"estado_contrato": "Borrador"}'::jsonb
GROUP BY 1
ORDER BY contratos DESC
LIMIT 10;

-- 4) Filtro sectorial agua sobre el crudo (text match del objeto — scan, no GIN;
--    el clasificador real con score/auditoría es 0.2.1 → 0.4).
SELECT payload->>'nombre_entidad' AS entidad,
       count(*)                   AS contratos_agua
FROM raw_record
WHERE source = 'secop_ii_contratos'
  AND upper(payload->>'objeto_del_contrato') ~ '(ACUEDUCTO|ALCANTARILLADO|PTAR|PTAP|AGUA POTABLE|AGUAS RESIDUALES)'
GROUP BY 1
ORDER BY contratos_agua DESC
LIMIT 10;

-- 5) Idempotencia / append-only: registros con más de un snapshot.
--    Tras UNA sola carga de la muestra → 0 filas. Si una carga posterior trae el
--    mismo registro con contenido cambiado, aquí aparecería con snapshots = 2.
SELECT source, source_record_id, count(*) AS snapshots
FROM raw_record
GROUP BY source, source_record_id
HAVING count(*) > 1
ORDER BY snapshots DESC, source_record_id
LIMIT 10;
