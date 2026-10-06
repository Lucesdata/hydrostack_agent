-- ¿Qué hay dentro de tipo_documento = 'OTRO'? (PENDIENTES §57, 2026-10-06)
-- Para el SQL Editor de Supabase: una sola consulta de lectura, no modifica nada.
--
-- Hoy la ficha solo nombra contratistas con NIT; 'OTRO' (284 contratos en la
-- medición del 2026-10-05) se trata como persona natural. Esto dice si son
-- empresas (consorcios, uniones temporales, extranjeras con otro registro) o
-- personas, para decidir si se pueden mostrar.
--
-- Devuelve: medicion | resultado (JSON).

WITH otros AS (
  SELECT pv.id, pv.razon_social, pv.es_estructura_plural, pv.nit_canonico,
         c.fecha_firma, c.valor_actual
  FROM contrato c
  JOIN proveedor pv ON pv.id = c.proveedor_id
  WHERE c.deleted_at IS NULL AND upper(trim(pv.tipo_documento)) = 'OTRO'
),
resumen AS (
  SELECT jsonb_build_object(
    'contratos', count(*),
    'proveedores_distintos', count(DISTINCT id),
    'estructura_plural', count(*) FILTER (WHERE es_estructura_plural),
    'firmados_2026', count(*) FILTER (WHERE fecha_firma >= DATE '2026-01-01'),
    -- Señales de persona jurídica en la razón social.
    'con_sigla_societaria', count(*) FILTER (
      WHERE razon_social ~* '(s\.?\s?a\.?\s?s\.?|s\.?\s?a\.?$|ltda|e\.?s\.?p|consorcio|uni[oó]n temporal|corporaci[oó]n|fundaci[oó]n|asociaci[oó]n|cooperativa|inc\.?|llc|gmbh|s\.?l\.?$)'
    ),
    'largo_nit_9_digitos', count(*) FILTER (WHERE length(nit_canonico) = 9)
  ) r FROM otros
),
muestra AS (
  -- Solo la razón social y el tipo de estructura: sin documentos de identidad.
  SELECT coalesce(jsonb_agg(x), '[]') r FROM (
    SELECT jsonb_build_object(
      'razon_social', left(razon_social, 60),
      'plural', es_estructura_plural,
      'contratos', count(*)
    ) x
    FROM otros
    GROUP BY razon_social, es_estructura_plural
    ORDER BY count(*) DESC
    LIMIT 25
  ) t
)
SELECT 'Resumen de OTRO' AS medicion, r AS resultado FROM resumen
UNION ALL SELECT 'Razones sociales más frecuentes' AS medicion, r AS resultado FROM muestra;
