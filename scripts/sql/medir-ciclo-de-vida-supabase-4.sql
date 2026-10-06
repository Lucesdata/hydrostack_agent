-- Mediciones de la Ficha Viva con ciclo de vida — PARTE 4, para el SQL Editor de
-- Supabase. Solo lectura: no crea, borra ni modifica nada.
-- Sale de los resultados de las partes 1-2 (2026-10-05): C1 casi no ocurre, pero
-- hay muchos procesos «abiertos» y la contradicción C4 es enorme. Esto mide
-- (M7) cuántos abiertos siguen así años después y por qué, y (M8) si C4 es real
-- o un artefacto de lotes / presupuestos en cero.

WITH
p AS (SELECT * FROM proceso WHERE deleted_at IS NULL),
c AS (SELECT * FROM contrato WHERE deleted_at IS NULL),
suma AS (
  -- Todos los contratos de cada proceso, en una pasada (contrato no tiene
  -- índice por proceso_id).
  SELECT proceso_id, count(*) AS n_contratos, sum(valor_actual) AS valor_contratos,
         max(valor_actual) AS valor_max, bool_or(fecha_firma IS NOT NULL) AS alguno_firmado
  FROM c WHERE proceso_id IS NOT NULL GROUP BY proceso_id
),
pc AS (SELECT p.*, s.n_contratos, s.valor_contratos, s.valor_max, s.alguno_firmado
       FROM p LEFT JOIN suma s ON s.proceso_id = p.id),
-- M7a: los que hoy cuentan como abiertos (condicionAbierto) por año de publicación
m7a AS (
  SELECT jsonb_object_agg(anio, x ORDER BY anio) r FROM (
    SELECT coalesce(extract(year FROM fecha_publicacion)::text, 'sin_fecha') AS anio,
      jsonb_build_object(
        'abiertos', count(*),
        'sin_fecha_recepcion', count(*) FILTER (WHERE fecha_recepcion IS NULL),
        'recepcion_vencida', count(*) FILTER (WHERE fecha_recepcion < current_date),
        'recepcion_vigente', count(*) FILTER (WHERE fecha_recepcion >= current_date),
        'con_contrato', count(*) FILTER (WHERE n_contratos IS NOT NULL),
        'adjudicados', count(*) FILTER (WHERE adjudicado IS TRUE)
      ) x
    FROM pc
    WHERE estado_apertura = 'Abierto' AND estado_actual IN ('Publicado', 'Abierto')
    GROUP BY 1
  ) t
),
-- M7b: procesos de 2026 con apertura «Abierto», por estado del proceso
m7b AS (
  SELECT jsonb_agg(x ORDER BY (x->>'n')::int DESC) r FROM (
    SELECT jsonb_build_object(
      'estado', estado_actual, 'n', count(*),
      'sin_fecha_recepcion', count(*) FILTER (WHERE fecha_recepcion IS NULL),
      'recepcion_vencida', count(*) FILTER (WHERE fecha_recepcion < current_date),
      'recepcion_vigente', count(*) FILTER (WHERE fecha_recepcion >= current_date),
      'con_contrato', count(*) FILTER (WHERE n_contratos IS NOT NULL)
    ) x
    FROM pc
    WHERE estado_apertura = 'Abierto' AND fecha_publicacion >= DATE '2026-01-01'
    GROUP BY estado_actual
  ) t
),
-- M8: C4 (contrato por encima del presupuesto) — ¿real o artefacto?
c4 AS (
  SELECT *, valor_max / nullif(valor_estimado, 0) AS razon
  FROM pc WHERE valor_estimado > 0 AND valor_max > valor_estimado
),
m8 AS (
  SELECT jsonb_build_object(
    'casos', count(*),
    'con_varios_contratos', count(*) FILTER (WHERE n_contratos > 1),
    'razon_hasta_1_1', count(*) FILTER (WHERE razon <= 1.1),
    'razon_1_1_a_2', count(*) FILTER (WHERE razon > 1.1 AND razon <= 2),
    'razon_2_a_10', count(*) FILTER (WHERE razon > 2 AND razon <= 10),
    'razon_mas_de_10', count(*) FILTER (WHERE razon > 10),
    'presupuesto_menor_1_millon', count(*) FILTER (WHERE valor_estimado < 1000000),
    'mediana_razon', percentile_cont(0.5) WITHIN GROUP (ORDER BY razon)
  ) r FROM c4
),
m8b AS (
  SELECT coalesce(jsonb_agg(x), '[]') r FROM (
    SELECT jsonb_build_object('id', secop_proceso_id, 'referencia', referencia,
      'objeto', left(objeto, 70), 'presupuesto', valor_estimado,
      'contrato_mayor', valor_max, 'n_contratos', n_contratos,
      'razon', round(razon, 2)) x
    FROM c4 WHERE fecha_publicacion >= DATE '2026-01-01'
    ORDER BY razon DESC LIMIT 8
  ) t
)
SELECT 'M7a abiertos por anio de publicacion' AS medicion, r AS resultado FROM m7a
UNION ALL SELECT 'M7b 2026 con apertura Abierto por estado' AS medicion, r AS resultado FROM m7b
UNION ALL SELECT 'M8 C4 contrato mayor que presupuesto' AS medicion, r AS resultado FROM m8
UNION ALL SELECT 'M8b C4 ejemplos 2026' AS medicion, r AS resultado FROM m8b;
