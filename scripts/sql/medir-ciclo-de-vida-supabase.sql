-- Mediciones de la Ficha Viva con ciclo de vida — versión para el SQL Editor de Supabase.
-- Misma lógica que scripts/sql/medir-ciclo-de-vida.sql, en UNA sola consulta de
-- lectura (el editor solo muestra el resultado de la última sentencia).
-- Devuelve una fila por medición: columna `medicion` y columna `resultado` (JSON).
-- No crea, borra ni modifica nada.

WITH
p AS (SELECT * FROM proceso WHERE deleted_at IS NULL),
c AS (SELECT * FROM contrato WHERE deleted_at IS NULL),
pc AS (
  SELECT p.*, u.fecha_firma, u.fecha_inicio, u.fecha_fin_actual,
         u.valor_actual, u.estado_actual AS estado_contrato,
         u.id IS NOT NULL AS tiene_contrato
  FROM p
  LEFT JOIN LATERAL (
    SELECT * FROM c WHERE c.proceso_id = p.id
    ORDER BY c.fecha_firma DESC NULLS LAST LIMIT 1
  ) u ON true
),
m1a AS (
  SELECT jsonb_build_object(
    'procesos', count(*),
    'con_contrato', count(*) FILTER (WHERE tiene_contrato),
    'procesos_2026', count(*) FILTER (WHERE fecha_publicacion >= DATE '2026-01-01'),
    'con_contrato_2026', count(*) FILTER (WHERE fecha_publicacion >= DATE '2026-01-01' AND tiene_contrato)
  ) r FROM pc
),
m1b AS (
  SELECT jsonb_build_object(
    'contratos', count(*),
    'sin_proceso', count(*) FILTER (WHERE proceso_id IS NULL),
    'firmados_2026', count(*) FILTER (WHERE fecha_firma >= DATE '2026-01-01'),
    'firmados_2026_sin_proceso', count(*) FILTER (WHERE fecha_firma >= DATE '2026-01-01' AND proceso_id IS NULL)
  ) r FROM c
),
m1c AS (
  SELECT coalesce(jsonb_object_agg(n_contratos, procesos), '{}') r FROM (
    SELECT n_contratos, count(*) procesos FROM (
      SELECT proceso_id, count(*) n_contratos FROM c WHERE proceso_id IS NOT NULL GROUP BY 1
    ) t GROUP BY 1
  ) t
),
m2a AS (
  SELECT jsonb_agg(jsonb_build_object('estado', estado_actual, 'apertura', estado_apertura, 'n', n) ORDER BY n DESC) r
  FROM (SELECT estado_actual, estado_apertura, count(*) n FROM p GROUP BY 1, 2) t
),
m2b AS (
  SELECT jsonb_agg(jsonb_build_object('fase', fase, 'n', n) ORDER BY n DESC) r
  FROM (SELECT fase, count(*) n FROM p GROUP BY 1) t
),
m2c AS (
  SELECT jsonb_agg(jsonb_build_object('adjudicado', adjudicado, 'n', n,
           'con_adjudicatario', ca, 'con_fecha', cf, 'con_valor', cv)) r
  FROM (SELECT adjudicado, count(*) n,
               count(*) FILTER (WHERE adjudicatario IS NOT NULL) ca,
               count(*) FILTER (WHERE fecha_adjudicacion IS NOT NULL) cf,
               count(*) FILTER (WHERE valor_adjudicacion > 0) cv
          FROM p GROUP BY 1) t
),
m2d AS (
  SELECT jsonb_agg(jsonb_build_object('estado', estado_actual, 'n', n) ORDER BY n DESC) r
  FROM (SELECT estado_actual, count(*) n FROM c GROUP BY 1) t
),
m2e AS (
  SELECT jsonb_build_object(
    'contratos', count(*),
    'con_firma', count(*) FILTER (WHERE fecha_firma IS NOT NULL),
    'con_inicio', count(*) FILTER (WHERE fecha_inicio IS NOT NULL),
    'con_fin_actual', count(*) FILTER (WHERE fecha_fin_actual IS NOT NULL),
    'prorrogados', count(*) FILTER (WHERE fecha_fin_actual > fecha_fin_inicial),
    'adicionados', count(*) FILTER (WHERE valor_actual > valor_inicial),
    'con_pagos', count(*) FILTER (WHERE valor_pagado > 0)
  ) r FROM c
),
marcas AS (
  SELECT fecha_publicacion >= DATE '2026-01-01' AS es_2026,
    (estado_apertura = 'Abierto' AND estado_actual IN ('Publicado', 'Abierto')
       AND (fecha_firma IS NOT NULL OR adjudicado IS TRUE))                 AS c1,
    (fecha_firma < fecha_publicacion)                                      AS c2,
    (estado_apertura = 'Abierto' AND fecha_recepcion < current_date)       AS c3,
    (valor_estimado > 0 AND valor_actual > valor_estimado)                 AS c4,
    (estado_actual ~* '(desiert|cancel|revoc)' AND fecha_firma IS NOT NULL) AS c5,
    (adjudicado IS TRUE AND adjudicatario IS NULL)                         AS c6,
    (fecha_fin_actual < fecha_inicio)                                      AS c7
  FROM pc
),
m3 AS (
  SELECT jsonb_build_object(
    'c1', count(*) FILTER (WHERE c1), 'c1_2026', count(*) FILTER (WHERE c1 AND es_2026),
    'c2', count(*) FILTER (WHERE c2), 'c2_2026', count(*) FILTER (WHERE c2 AND es_2026),
    'c3', count(*) FILTER (WHERE c3), 'c3_2026', count(*) FILTER (WHERE c3 AND es_2026),
    'c4', count(*) FILTER (WHERE c4), 'c4_2026', count(*) FILTER (WHERE c4 AND es_2026),
    'c5', count(*) FILTER (WHERE c5), 'c5_2026', count(*) FILTER (WHERE c5 AND es_2026),
    'c6', count(*) FILTER (WHERE c6), 'c6_2026', count(*) FILTER (WHERE c6 AND es_2026),
    'c7', count(*) FILTER (WHERE c7), 'c7_2026', count(*) FILTER (WHERE c7 AND es_2026)
  ) r FROM marcas
),
m4 AS (
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', p.secop_proceso_id, 'referencia', p.referencia, 'publicacion', p.fecha_publicacion,
    'estado', p.estado_actual, 'apertura', p.estado_apertura, 'fase', p.fase,
    'adjudicado', p.adjudicado, 'adjudicatario', p.adjudicatario,
    'contrato', c.secop_contrato_id, 'firma', c.fecha_firma, 'inicio', c.fecha_inicio,
    'fin', c.fecha_fin_actual, 'valor_contrato', c.valor_actual, 'estado_contrato', c.estado_actual
  )), '[]') r
  FROM p LEFT JOIN c ON c.proceso_id = p.id
  WHERE p.secop_proceso_id = 'CO1.REQ.5354189' OR p.referencia = 'OPA-ST-07-2023'
),
m5 AS (
  SELECT jsonb_object_agg(etapa, n) r FROM (
    SELECT etapa, count(*) n FROM (
      SELECT CASE
        WHEN estado_actual ~* '(desiert|cancel|revoc)' AND fecha_firma IS NOT NULL THEN 'por_verificar'
        WHEN estado_actual ~* '(desiert|cancel|revoc)'             THEN 'no_se_llevo_a_cabo'
        WHEN fecha_firma IS NOT NULL AND fecha_inicio IS NULL       THEN 'contratado_sin_fechas'
        WHEN fecha_firma IS NOT NULL AND fecha_inicio > current_date THEN 'contratado'
        WHEN fecha_firma IS NOT NULL AND (fecha_fin_actual IS NULL OR fecha_fin_actual >= current_date)
                                                                    THEN 'en_ejecucion'
        WHEN fecha_firma IS NOT NULL                                THEN 'plazo_cumplido'
        WHEN adjudicado IS TRUE                                     THEN 'adjudicado'
        WHEN estado_apertura = 'Abierto' AND (fecha_recepcion IS NULL OR fecha_recepcion >= current_date)
                                                                    THEN 'recibe_ofertas'
        WHEN estado_apertura = 'Cerrado' OR fecha_recepcion < current_date THEN 'en_evaluacion'
        ELSE 'por_verificar'
      END AS etapa
      FROM pc WHERE fecha_publicacion >= DATE '2026-01-01'
    ) t GROUP BY 1
  ) t
),
m6 AS (
  SELECT coalesce(jsonb_agg(x), '[]') r FROM (
    SELECT jsonb_build_object(
      'id', secop_proceso_id, 'referencia', referencia, 'objeto', left(objeto, 80),
      'publicacion', fecha_publicacion, 'estado', estado_actual, 'apertura', estado_apertura,
      'firma', fecha_firma, 'inicio', fecha_inicio, 'fin', fecha_fin_actual,
      'c2_firma_antes_de_publicar', fecha_firma < fecha_publicacion
    ) x
    FROM pc
    WHERE fecha_publicacion >= DATE '2026-01-01' AND fecha_firma IS NOT NULL
    ORDER BY (estado_apertura = 'Abierto') DESC, (fecha_firma < fecha_publicacion) DESC, fecha_firma DESC
    LIMIT 10
  ) t
)
SELECT 'M1a procesos con contrato' AS medicion, r AS resultado FROM m1a
UNION ALL SELECT 'M1b contratos sin proceso', r FROM m1b
UNION ALL SELECT 'M1c procesos por numero de contratos', r FROM m1c
UNION ALL SELECT 'M2a estado x apertura (proceso)', r FROM m2a
UNION ALL SELECT 'M2b fase (proceso)', r FROM m2b
UNION ALL SELECT 'M2c adjudicacion (proceso)', r FROM m2c
UNION ALL SELECT 'M2d estado (contrato)', r FROM m2d
UNION ALL SELECT 'M2e fechas y pagos (contrato)', r FROM m2e
UNION ALL SELECT 'M3 contradicciones C1-C7', r FROM m3
UNION ALL SELECT 'M4 caso OPA-ST-07-2023', r FROM m4
UNION ALL SELECT 'M5 etapas desde 2026', r FROM m5
UNION ALL SELECT 'M6 candidatos 2026 con contrato', r FROM m6;
