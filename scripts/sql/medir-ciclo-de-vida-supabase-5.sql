-- Mediciones de la Ficha Viva con ciclo de vida — PARTE 5, para el SQL Editor de
-- Supabase. Solo lectura: no crea, borra ni modifica nada.
-- Sale de la parte 4 (2026-10-05): de los ~36.000 procesos que hoy cuentan como
-- abiertos, el 81 % se publicó antes de 2026 y casi ninguno trae fecha de
-- recepción de ofertas. Esto mide qué son (modalidad) y desde cuándo están
-- publicados, para fijar la regla de antigüedad de «Recibe ofertas».

WITH abiertos AS (
  SELECT * FROM proceso
  WHERE deleted_at IS NULL
    AND estado_apertura = 'Abierto' AND estado_actual IN ('Publicado', 'Abierto')
),
-- M9a: abiertos por modalidad, con y sin fecha de recepción (todos los años)
m9a AS (
  SELECT jsonb_agg(x ORDER BY (x->>'n')::int DESC) r FROM (
    SELECT jsonb_build_object(
      'modalidad', modalidad, 'n', count(*),
      'desde_2026', count(*) FILTER (WHERE fecha_publicacion >= DATE '2026-01-01'),
      'con_fecha_recepcion', count(*) FILTER (WHERE fecha_recepcion IS NOT NULL)
    ) x
    FROM abiertos GROUP BY modalidad
  ) t
),
-- M9b: abiertos sin fecha de recepción publicados en 2026, por antigüedad
m9b AS (
  SELECT jsonb_build_object(
    'ultimos_7_dias',   count(*) FILTER (WHERE fecha_publicacion >= current_date - 7),
    'de_8_a_30_dias',   count(*) FILTER (WHERE fecha_publicacion <  current_date - 7
                                           AND fecha_publicacion >= current_date - 30),
    'de_31_a_90_dias',  count(*) FILTER (WHERE fecha_publicacion <  current_date - 30
                                           AND fecha_publicacion >= current_date - 90),
    'mas_de_90_dias',   count(*) FILTER (WHERE fecha_publicacion <  current_date - 90)
  ) r
  FROM abiertos
  WHERE fecha_recepcion IS NULL AND fecha_publicacion >= DATE '2026-01-01'
),
-- M9c: los que tienen fecha de recepción vigente, por modalidad (las oportunidades verificables)
m9c AS (
  SELECT coalesce(jsonb_object_agg(coalesce(modalidad, 'sin_modalidad'), n), '{}') r FROM (
    SELECT modalidad, count(*) n FROM abiertos
    WHERE fecha_recepcion >= current_date GROUP BY modalidad
  ) t
)
SELECT 'M9a abiertos por modalidad' AS medicion, r AS resultado FROM m9a
UNION ALL SELECT 'M9b 2026 sin fecha de recepcion por antiguedad' AS medicion, r AS resultado FROM m9b
UNION ALL SELECT 'M9c con recepcion vigente por modalidad' AS medicion, r AS resultado FROM m9c;
