-- Fase 0.4 — Validación de reconstrucción contrato canónico ↔ raw_record.
--
-- Tres preguntas que cierran el checkpoint:
--   (a) ¿Un contrato se reconstruye CORRECTO desde lo crudo, campo por campo?
--   (b) ¿La transformación es reprocesable e idempotente sin re-descargar?
--   (c) ¿Qué quedó marcado como pendiente para 0.6?
--
-- Para (a): elegir 5 contratos cubriendo casos distintos (caso feliz, CC,
-- consorcio, geo fallback, proveedor centinela) y comparar columna por columna.
-- Las queries de abajo asumen 5 IDs externos via psql:
--
--   psql "$DATABASE_URL" -v c1="'CO1.PCCNTR.XXXX'" -v c2="..." -f validate-reconstruction.sql
--
-- O bien, descomenta el bloque de auto-selección (§0) para que el SQL escoja
-- 5 candidatos representativos automáticamente desde lo cargado.

-- =============================================================================
-- §0. Auto-selección de 5 contratos representativos (corre antes que el resto)
-- =============================================================================

CREATE TEMP TABLE _validation_picks AS
SELECT secop_contrato_id, kind FROM (
  -- (1) Caso feliz: NIT (no CC), geografía resuelta, proveedor presente
  (SELECT c.secop_contrato_id, '1_caso_feliz' AS kind, c.created_at
     FROM contrato c
     JOIN proveedor p ON c.proveedor_id = p.id
    WHERE p.tipo_documento = 'NIT' AND c.geografia_id IS NOT NULL
    ORDER BY c.valor_inicial DESC NULLS LAST
    LIMIT 1)

  UNION ALL

  -- (2) Persona natural con cédula (CC)
  (SELECT c.secop_contrato_id, '2_cedula' AS kind, c.created_at
     FROM contrato c
     JOIN proveedor p ON c.proveedor_id = p.id
    WHERE p.tipo_documento = 'CC'
    ORDER BY c.created_at DESC
    LIMIT 1)

  UNION ALL

  -- (3) Consorcio / unión temporal
  (SELECT c.secop_contrato_id, '3_consorcio' AS kind, c.created_at
     FROM contrato c
     JOIN proveedor p ON c.proveedor_id = p.id
    WHERE p.es_estructura_plural = true
    ORDER BY c.created_at DESC
    LIMIT 1)

  UNION ALL

  -- (4) Geografía resuelta via fallback (entidad geo, no localizaci_n)
  -- Heurística: contratos con geografia_id resuelta cuyo payload.localizaci_n
  -- trae centinela "No Definido".
  (SELECT c.secop_contrato_id, '4_geo_fallback' AS kind, c.created_at
     FROM contrato c
     JOIN raw_record r ON c.raw_record_id_actual = r.id
    WHERE c.geografia_id IS NOT NULL
      AND (r.payload->>'localizaci_n') ILIKE '%No Definido%'
    ORDER BY c.created_at DESC
    LIMIT 1)

  UNION ALL

  -- (5) Proveedor centinela (proveedor_id NULL, proveedor_raw poblado)
  (SELECT c.secop_contrato_id, '5_prov_centinela' AS kind, c.created_at
     FROM contrato c
    WHERE c.proveedor_id IS NULL AND c.proveedor_raw IS NOT NULL
    ORDER BY c.created_at DESC
    LIMIT 1)
) picks
ORDER BY kind;

SELECT '=== picks ===' AS section, * FROM _validation_picks;

-- =============================================================================
-- §1. Reconstrucción campo a campo: canónica ↔ payload crudo
-- =============================================================================

SELECT '=== reconstruccion ===' AS section;

SELECT
  v.kind                                 AS caso,
  c.secop_contrato_id,
  -- valor / estado
  c.valor_inicial::text                  AS canon_valor_inicial,
  r.payload->>'valor_del_contrato'       AS raw_valor,
  c.estado_actual                        AS canon_estado,
  r.payload->>'estado_contrato'          AS raw_estado,
  -- fechas
  c.fecha_fin_inicial::text              AS canon_fecha_fin,
  substr(r.payload->>'fecha_de_fin_del_contrato', 1, 10) AS raw_fecha_fin,
  -- proveedor
  p.nit_canonico                         AS canon_nit,
  p.nit_dv                               AS canon_dv_calc,
  p.tipo_documento                       AS canon_tipo_doc,
  p.es_estructura_plural                 AS canon_consorcio,
  r.payload->>'documento_proveedor'      AS raw_documento,
  r.payload->>'tipodocproveedor'         AS raw_tipodoc,
  r.payload->>'es_grupo'                 AS raw_es_grupo,
  -- entidad
  e.nit_canonico                         AS canon_nit_entidad,
  e.nombre                               AS canon_entidad_nombre,
  e.sector_administrativo                AS canon_sector_admin,
  e.raw_attrs->>'rama'                   AS canon_rama_raw_attrs,
  r.payload->>'nit_entidad'              AS raw_nit_entidad,
  r.payload->>'nombre_entidad'           AS raw_entidad_nombre,
  r.payload->>'sector'                   AS raw_sector,
  r.payload->>'rama'                     AS raw_rama,
  -- proceso (D11)
  pr.secop_proceso_id                    AS canon_proceso_co1req,
  pr.portafolio_id                       AS canon_portafolio,
  r.payload->>'proceso_de_compra'        AS raw_bdos,
  -- geografía (D25)
  g.departamento_nombre || ' / ' || COALESCE(g.municipio_nombre, '(dept-only)')
                                         AS canon_geografia,
  r.payload->>'localizaci_n'             AS raw_localizacion,
  r.payload->>'departamento'             AS raw_departamento,
  r.payload->>'ciudad'                   AS raw_ciudad,
  -- proveedor_raw (D3)
  c.proveedor_raw                        AS canon_proveedor_raw
FROM _validation_picks v
JOIN contrato     c  ON c.secop_contrato_id = v.secop_contrato_id
JOIN raw_record   r  ON c.raw_record_id_actual = r.id
LEFT JOIN proveedor p  ON c.proveedor_id = p.id
LEFT JOIN entidad   e  ON c.entidad_id   = e.id
LEFT JOIN proceso   pr ON c.proceso_id   = pr.id
LEFT JOIN geografia g  ON c.geografia_id = g.codigo_divipola
ORDER BY v.kind;

-- =============================================================================
-- §2. Conteos agregados — denominadores para 0.6
-- =============================================================================

SELECT '=== contadores ===' AS section;

WITH stats AS (
  SELECT
    (SELECT COUNT(*) FROM proveedor)        AS proveedores,
    (SELECT COUNT(*) FROM entidad)          AS entidades,
    (SELECT COUNT(*) FROM proceso)          AS procesos,
    (SELECT COUNT(*) FROM contrato)         AS contratos,
    (SELECT COUNT(*) FROM contrato WHERE proceso_id IS NULL)    AS contrato_sin_proceso,
    (SELECT COUNT(*) FROM contrato WHERE proveedor_id IS NULL
       AND proveedor_raw IS NOT NULL)                            AS contrato_prov_centinela,
    (SELECT COUNT(*) FROM contrato WHERE geografia_id IS NULL)  AS contrato_sin_geografia,
    (SELECT COUNT(*) FROM proceso  WHERE geografia_id IS NULL)  AS proceso_sin_geografia,
    (SELECT COUNT(*) FROM transform_quarantine)                  AS cuarentena
)
SELECT * FROM stats;

-- =============================================================================
-- §3. Idempotencia (b) — debe coincidir antes y después de una segunda corrida
-- =============================================================================

SELECT '=== idempotencia ===' AS section;

SELECT
  source,
  COUNT(*)                              AS snapshots_crudos,
  COUNT(DISTINCT source_record_id)      AS registros_unicos
FROM raw_record
GROUP BY source
ORDER BY source;

-- =============================================================================
-- §4. Lista de no-resueltos geográficos — material para 0.6
-- =============================================================================

SELECT '=== geografia no resuelta (top 30) ===' AS section;

SELECT
  COALESCE(r.payload->>'localizaci_n',
           r.payload->>'departamento_entidad',
           r.payload->>'departamento') AS texto_origen,
  r.source,
  COUNT(*) AS n
FROM raw_record r
LEFT JOIN contrato c ON c.raw_record_id_actual = r.id
LEFT JOIN proceso  p ON p.raw_record_id_actual = r.id
WHERE (c.geografia_id IS NULL AND c.id IS NOT NULL)
   OR (p.geografia_id IS NULL AND p.id IS NOT NULL)
GROUP BY texto_origen, r.source
ORDER BY n DESC
LIMIT 30;
