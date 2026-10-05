-- Mediciones previas al plan de la Ficha Viva con ciclo de vida (2026-10-05).
-- Spec: docs/superpowers/specs/2026-10-05-ficha-viva-ciclo-de-vida.md,
-- sección «Mediciones antes del plan».
--
-- SOLO LECTURA. Corre dentro de una transacción READ ONLY: si algo intentara
-- escribir, Postgres lo rechaza. Se puede pegar entero en el editor SQL de
-- Supabase o correr con:
--
--   psql "$DATABASE_URL" -f scripts/sql/medir-ciclo-de-vida.sql
--
-- "Abierto" es el de condicionAbierto() (src/lib/secop/agregados.ts):
-- estado_apertura = 'Abierto' y estado_actual en ('Publicado', 'Abierto').
-- "Desde 2026" es fecha_publicacion >= 2026-01-01 (alcance decidido el 2026-10-05).

BEGIN TRANSACTION READ ONLY;

-- =============================================================================
-- M1. Vínculo proceso ↔ contrato
-- =============================================================================
\echo '-- M1a. Procesos con al menos un contrato vinculado (todos / desde 2026)'
SELECT
  count(*)                                                        AS procesos,
  count(*) FILTER (WHERE EXISTS (SELECT 1 FROM contrato c
                                  WHERE c.proceso_id = p.id AND c.deleted_at IS NULL))
                                                                  AS con_contrato,
  count(*) FILTER (WHERE p.fecha_publicacion >= DATE '2026-01-01') AS procesos_2026,
  count(*) FILTER (WHERE p.fecha_publicacion >= DATE '2026-01-01'
                     AND EXISTS (SELECT 1 FROM contrato c
                                  WHERE c.proceso_id = p.id AND c.deleted_at IS NULL))
                                                                  AS con_contrato_2026
FROM proceso p
WHERE p.deleted_at IS NULL;

\echo '-- M1b. Contratos sin proceso vinculado'
SELECT
  count(*)                                    AS contratos,
  count(*) FILTER (WHERE proceso_id IS NULL)  AS sin_proceso,
  count(*) FILTER (WHERE fecha_firma >= DATE '2026-01-01') AS firmados_2026,
  count(*) FILTER (WHERE fecha_firma >= DATE '2026-01-01' AND proceso_id IS NULL)
                                              AS firmados_2026_sin_proceso
FROM contrato
WHERE deleted_at IS NULL;

\echo '-- M1c. Procesos con más de un contrato (la ficha tendría que elegir o listar)'
SELECT n_contratos, count(*) AS procesos
FROM (SELECT proceso_id, count(*) AS n_contratos
        FROM contrato WHERE proceso_id IS NOT NULL AND deleted_at IS NULL
       GROUP BY proceso_id) t
GROUP BY n_contratos ORDER BY n_contratos;

-- =============================================================================
-- M2. Vocabulario de estados (para fijar qué significa «no se llevó a cabo»)
-- =============================================================================
\echo '-- M2a. proceso: estado_actual × estado_apertura'
SELECT estado_actual, estado_apertura, count(*) AS n
FROM proceso WHERE deleted_at IS NULL
GROUP BY 1, 2 ORDER BY n DESC;

\echo '-- M2b. proceso: fase'
SELECT fase, count(*) AS n
FROM proceso WHERE deleted_at IS NULL
GROUP BY 1 ORDER BY n DESC;

\echo '-- M2c. proceso: adjudicado y sus campos'
SELECT adjudicado,
       count(*)                                         AS n,
       count(*) FILTER (WHERE adjudicatario IS NOT NULL) AS con_adjudicatario,
       count(*) FILTER (WHERE fecha_adjudicacion IS NOT NULL) AS con_fecha,
       count(*) FILTER (WHERE valor_adjudicacion > 0)   AS con_valor
FROM proceso WHERE deleted_at IS NULL
GROUP BY 1 ORDER BY n DESC;

\echo '-- M2d. contrato: estado_actual'
SELECT estado_actual, count(*) AS n
FROM contrato WHERE deleted_at IS NULL
GROUP BY 1 ORDER BY n DESC;

\echo '-- M2e. contrato: cobertura de fechas y pagos'
SELECT
  count(*)                                              AS contratos,
  count(*) FILTER (WHERE fecha_firma IS NOT NULL)       AS con_firma,
  count(*) FILTER (WHERE fecha_inicio IS NOT NULL)      AS con_inicio,
  count(*) FILTER (WHERE fecha_fin_actual IS NOT NULL)  AS con_fin_actual,
  count(*) FILTER (WHERE fecha_fin_actual > fecha_fin_inicial) AS prorrogados,
  count(*) FILTER (WHERE valor_actual > valor_inicial)  AS adicionados,
  count(*) FILTER (WHERE valor_pagado > 0)              AS con_pagos
FROM contrato WHERE deleted_at IS NULL;

-- =============================================================================
-- M3. Contradicciones C1–C7 (las que hoy se pueden comprobar)
-- =============================================================================
\echo '-- M3. Conteo de cada contradicción (todos / desde 2026)'
WITH pc AS (
  SELECT p.*,
         c.fecha_firma, c.fecha_inicio, c.fecha_fin_actual,
         c.valor_actual, c.estado_actual AS estado_contrato
  FROM proceso p
  LEFT JOIN LATERAL (
    SELECT * FROM contrato c
     WHERE c.proceso_id = p.id AND c.deleted_at IS NULL
     ORDER BY c.fecha_firma DESC NULLS LAST LIMIT 1
  ) c ON true
  WHERE p.deleted_at IS NULL
),
marcas AS (
  SELECT fecha_publicacion >= DATE '2026-01-01' AS es_2026,
    -- C1: cuenta como abierto y ya hay contrato firmado o adjudicación
    (estado_apertura = 'Abierto' AND estado_actual IN ('Publicado', 'Abierto')
       AND (fecha_firma IS NOT NULL OR adjudicado IS TRUE))          AS c1,
    -- C2: contrato firmado antes de publicarse el proceso
    (fecha_firma < fecha_publicacion)                               AS c2,
    -- C3: abierto con la recepción ya vencida
    (estado_apertura = 'Abierto' AND fecha_recepcion < current_date) AS c3,
    -- C4: contrato por encima del presupuesto publicado
    (valor_estimado > 0 AND valor_actual > valor_estimado)          AS c4,
    -- C5: desierto/cancelado/revocado con contrato firmado (ajustar la lista con M2a)
    (estado_actual ~* '(desiert|cancel|revoc)' AND fecha_firma IS NOT NULL) AS c5,
    -- C6: adjudicado sin adjudicatario
    (adjudicado IS TRUE AND adjudicatario IS NULL)                  AS c6,
    -- C7: fin del contrato antes de su inicio
    (fecha_fin_actual < fecha_inicio)                               AS c7
  FROM pc
)
SELECT
  count(*) FILTER (WHERE c1) AS c1, count(*) FILTER (WHERE c1 AND es_2026) AS c1_2026,
  count(*) FILTER (WHERE c2) AS c2, count(*) FILTER (WHERE c2 AND es_2026) AS c2_2026,
  count(*) FILTER (WHERE c3) AS c3, count(*) FILTER (WHERE c3 AND es_2026) AS c3_2026,
  count(*) FILTER (WHERE c4) AS c4, count(*) FILTER (WHERE c4 AND es_2026) AS c4_2026,
  count(*) FILTER (WHERE c5) AS c5, count(*) FILTER (WHERE c5 AND es_2026) AS c5_2026,
  count(*) FILTER (WHERE c6) AS c6, count(*) FILTER (WHERE c6 AND es_2026) AS c6_2026,
  count(*) FILTER (WHERE c7) AS c7, count(*) FILTER (WHERE c7 AND es_2026) AS c7_2026
FROM marcas;

-- =============================================================================
-- M4. El proceso del ejemplo (OPA-ST-07-2023)
-- =============================================================================
\echo '-- M4. CO1.REQ.5354189'
SELECT p.secop_proceso_id, p.referencia, p.fecha_publicacion, p.estado_actual,
       p.estado_apertura, p.fase, p.adjudicado, p.adjudicatario,
       p.fecha_adjudicacion, p.valor_estimado, p.portafolio_id,
       c.secop_contrato_id, c.fecha_firma, c.fecha_inicio,
       c.fecha_fin_inicial, c.fecha_fin_actual, c.valor_inicial,
       c.valor_actual, c.estado_actual AS estado_contrato
FROM proceso p
LEFT JOIN contrato c ON c.proceso_id = p.id AND c.deleted_at IS NULL
WHERE p.secop_proceso_id = 'CO1.REQ.5354189'
   OR p.referencia = 'OPA-ST-07-2023';

-- =============================================================================
-- M5. Etapa aproximada de los procesos publicados desde 2026
-- =============================================================================
-- Versión SQL provisional de la regla de precedencia del spec. La regla de
-- verdad será una función pura en TypeScript; esto solo dimensiona.
\echo '-- M5. Procesos desde 2026 por etapa (aproximada)'
WITH pc AS (
  SELECT p.*, c.fecha_firma, c.fecha_inicio, c.fecha_fin_actual
  FROM proceso p
  LEFT JOIN LATERAL (
    SELECT * FROM contrato c
     WHERE c.proceso_id = p.id AND c.deleted_at IS NULL
     ORDER BY c.fecha_firma DESC NULLS LAST LIMIT 1
  ) c ON true
  WHERE p.deleted_at IS NULL AND p.fecha_publicacion >= DATE '2026-01-01'
)
SELECT etapa, count(*) AS n FROM (
  SELECT CASE
    WHEN estado_actual ~* '(desiert|cancel|revoc)' AND fecha_firma IS NOT NULL THEN 'por_verificar'
    WHEN estado_actual ~* '(desiert|cancel|revoc)'           THEN 'no_se_llevo_a_cabo'
    WHEN fecha_firma IS NOT NULL AND fecha_inicio IS NULL     THEN 'contratado_sin_fechas'
    WHEN fecha_firma IS NOT NULL AND fecha_inicio > current_date THEN 'contratado'
    WHEN fecha_firma IS NOT NULL AND (fecha_fin_actual IS NULL OR fecha_fin_actual >= current_date)
                                                              THEN 'en_ejecucion'
    WHEN fecha_firma IS NOT NULL                              THEN 'plazo_cumplido'
    WHEN adjudicado IS TRUE                                   THEN 'adjudicado'
    WHEN estado_apertura = 'Abierto' AND (fecha_recepcion IS NULL OR fecha_recepcion >= current_date)
                                                              THEN 'recibe_ofertas'
    WHEN estado_apertura = 'Cerrado' OR fecha_recepcion < current_date THEN 'en_evaluacion'
    ELSE 'por_verificar'
  END AS etapa
  FROM pc
) t
GROUP BY etapa ORDER BY n DESC;

-- =============================================================================
-- M6. Candidatos de 2026 para el caso de prueba de la página
-- =============================================================================
\echo '-- M6. Procesos de 2026 con contrato firmado (con contradicción primero)'
SELECT p.secop_proceso_id, p.referencia, left(p.objeto, 80) AS objeto,
       p.fecha_publicacion, p.estado_actual, p.estado_apertura,
       c.fecha_firma, c.fecha_inicio, c.fecha_fin_actual,
       (p.estado_apertura = 'Abierto')        AS c1_posible,
       (c.fecha_firma < p.fecha_publicacion)  AS c2
FROM proceso p
JOIN contrato c ON c.proceso_id = p.id AND c.deleted_at IS NULL
WHERE p.deleted_at IS NULL
  AND p.fecha_publicacion >= DATE '2026-01-01'
  AND c.fecha_firma IS NOT NULL
ORDER BY (p.estado_apertura = 'Abierto') DESC,
         (c.fecha_firma < p.fecha_publicacion) DESC,
         c.fecha_firma DESC
LIMIT 10;

ROLLBACK;
