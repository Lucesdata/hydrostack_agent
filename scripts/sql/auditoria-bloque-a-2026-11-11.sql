-- Bloque A: diagnóstico operativo SECOP II (SOLO LECTURA).
-- Ejecutar con un rol de solo lectura en la base de producción.
-- No incluye operaciones INSERT/UPDATE/DELETE ni EXPLAIN ANALYZE.
-- Capturar fecha UTC, duración y resultados por separado. No publicar identificadores privados.

-- A1. Estado de las últimas 30 corridas por fuente.
SELECT source, started_at, finished_at, status, records_ingested, records_failed,
       watermark_from, watermark_to, left(error_summary, 250) AS error_summary,
       CASE WHEN finished_at IS NOT NULL
            THEN round(extract(epoch FROM (finished_at-started_at))::numeric, 1)
       END AS duration_seconds
FROM sync_log
WHERE source IN ('secop_ii_procesos', 'secop_ii_contratos')
ORDER BY started_at DESC LIMIT 30;

-- A2. Corridas fallidas, parciales o colgadas (14 días).
SELECT source, status, count(*) AS runs, max(started_at) AS last_started
FROM sync_log
WHERE started_at >= now() - interval '14 days'
  AND (status <> 'ok' OR finished_at IS NULL)
GROUP BY source, status ORDER BY source, status;

-- A3. Frescura del último éxito por fuente y desfase del watermark.
SELECT source,
       max(finished_at) FILTER (WHERE status = 'ok') AS last_complete_at,
       max(finished_at) FILTER (WHERE status = 'partial') AS last_partial_at,
       max(watermark_to) FILTER (WHERE status IN ('ok','partial')) AS latest_watermark,
       count(*) FILTER (WHERE status = 'running' AND started_at < now() - interval '15 minutes') AS stale_running
FROM sync_log
WHERE source IN ('secop_ii_procesos','secop_ii_contratos')
GROUP BY source ORDER BY source;

-- A4. Integridad de aterrizaje. payload NULL puede ser normal tras transformación.
SELECT source,
       count(*) AS raw_rows,
       count(*) FILTER (WHERE source_record_id = '') AS empty_source_ids,
       count(*) FILTER (WHERE source_updated_at IS NULL) AS without_source_timestamp,
       count(*) FILTER (WHERE payload IS NOT NULL) AS pending_payloads,
       max(ingested_at) AS last_ingested_at
FROM raw_record
WHERE source IN ('secop_ii_procesos','secop_ii_contratos')
GROUP BY source ORDER BY source;

-- A5. Cobertura de datos canónicos y geografía. La ubicación es SEDE de la entidad.
SELECT count(*) AS active_processes,
       count(*) FILTER (WHERE geografia_id IS NULL) AS without_geo,
       count(*) FILTER (WHERE tipo_proyecto IS NULL OR tipo_proyecto = 'otros') AS unclassified,
       count(*) FILTER (WHERE fecha_recepcion IS NULL) AS without_reception_date,
       count(*) FILTER (WHERE estado_apertura = 'Abierto'
                         AND estado_actual IN ('Publicado','Abierto')
                         AND fecha_recepcion >= (now() AT TIME ZONE 'America/Bogota')::date)
         AS currently_receiving_offers,
       max(updated_at) AS max_internal_transform_at
FROM proceso WHERE deleted_at IS NULL;

-- A6. Relación contrato/proceso y potenciales huérfanos.
SELECT count(*) AS active_contracts,
       count(*) FILTER (WHERE proceso_id IS NULL) AS without_linked_process,
       count(*) FILTER (WHERE fecha_firma IS NULL) AS without_signature_date,
       max(updated_at) AS max_internal_transform_at
FROM contrato WHERE deleted_at IS NULL;

-- A7. Tamaño de las tablas y límites de almacenamiento.
SELECT relname AS table_name,
       pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_catalog.pg_statio_user_tables
WHERE relname IN ('raw_record','sync_log','proceso','contrato')
ORDER BY pg_total_relation_size(relid) DESC;

-- A8. Consultas costosas (opcional: solo si pg_stat_statements está instalado).
-- SELECT queryid, calls, round(mean_exec_time::numeric, 1) AS mean_ms,
--        round(max_exec_time::numeric, 1) AS max_ms, rows, left(query, 160) AS query
-- FROM pg_stat_statements
-- WHERE query ILIKE '%proceso%' OR query ILIKE '%contrato%'
-- ORDER BY total_exec_time DESC LIMIT 15;
