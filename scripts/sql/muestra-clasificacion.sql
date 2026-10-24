-- Muestra estratificada para medir la clasificación sectorial (spec 2026-10-24-calidad-clasificacion-extractor).
-- Para el SQL Editor de Supabase: solo lectura, no modifica nada.
--
-- Devuelve 200 procesos publicados desde 2026 (50 por estrato, orden fijo por md5, así que
-- repetir la consulta da la misma muestra) con lo necesario para etiquetarlos a mano:
--   estrato     = tipado_alta | tipado_media | otros_con_palabra_de_agua | otros_sin_palabra
--   pertenece   = (columna a rellenar) agua | no_agua | dudoso
--   subsistema  = (columna a rellenar) acueducto | alcantarillado | ptap | ptar | otros
--
-- Etiquetar con el objeto Y la descripción. El objeto puede traer nombres de personas
-- naturales (R8): la hoja de etiquetado NO se sube al repo; se guardan solo
-- secop_proceso_id y las etiquetas.
--
-- Precisión del sector = agua / (agua + no_agua) en los estratos tipados.
-- Pérdida (falsos negativos) = agua / (agua + no_agua) en los estratos `otros_*`.

WITH base AS (
  SELECT
    p.secop_proceso_id,
    p.tipo_proyecto,
    p.tipo_proyecto_confianza,
    p.unspsc,
    p.objeto,
    p.descripcion,
    (coalesce(p.objeto, '') || ' ' || coalesce(p.descripcion, '')) ~*
      '(acueduct|alcantaril|\magua|potable|residual|saneamiento|\mptap|\mptar|vertimient|hidr[aá]ulic|hidrosanit|tuber[ií]a|bombeo|\mpozo|s[eé]ptic|\mplanta de tratamiento)' AS palabra_de_agua,
    CASE
      WHEN p.tipo_proyecto <> 'otros' AND p.tipo_proyecto_confianza = 'alta' THEN 'tipado_alta'
      WHEN p.tipo_proyecto <> 'otros' THEN 'tipado_media'
      WHEN (coalesce(p.objeto, '') || ' ' || coalesce(p.descripcion, '')) ~*
        '(acueduct|alcantaril|\magua|potable|residual|saneamiento|\mptap|\mptar|vertimient|hidr[aá]ulic|hidrosanit|tuber[ií]a|bombeo|\mpozo|s[eé]ptic|\mplanta de tratamiento)'
        THEN 'otros_con_palabra_de_agua'
      ELSE 'otros_sin_palabra'
    END AS estrato
  FROM proceso p
  WHERE p.deleted_at IS NULL AND p.fecha_publicacion >= DATE '2026-01-01'
),
numerada AS (
  SELECT *, row_number() OVER (PARTITION BY estrato ORDER BY md5(secop_proceso_id || 'clasif')) AS rn
  FROM base
)
SELECT estrato, secop_proceso_id, tipo_proyecto, tipo_proyecto_confianza, unspsc,
       left(regexp_replace(objeto, '\s+', ' ', 'g'), 200) AS objeto,
       left(regexp_replace(coalesce(descripcion, ''), '\s+', ' ', 'g'), 300) AS descripcion,
       NULL::text AS pertenece, NULL::text AS subsistema
FROM numerada
WHERE rn <= 50
ORDER BY estrato, rn;
