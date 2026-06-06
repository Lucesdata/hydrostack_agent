-- Fase 0.6 — Tres preguntas SQL de cierre.
-- Demuestran que la canónica responde sin tocar raw_record.

\echo '====================================================================='
\echo '(a) Top 5 proveedores por valor adjudicado'
\echo '====================================================================='
SELECT
  p.nit_canonico,
  p.razon_social,
  COUNT(c.id) AS nro_contratos,
  SUM(c.valor_actual) AS valor_total
FROM contrato c
JOIN proveedor p ON p.id = c.proveedor_id
GROUP BY p.id, p.nit_canonico, p.razon_social
ORDER BY valor_total DESC
LIMIT 5;

\echo '====================================================================='
\echo '(b) Contratos activos por municipio'
\echo '====================================================================='
-- Estados en la muestra: 'Aprobado' y 'Modificado' son los más cercanos
-- a contrato activo en ejecución. La muestra refleja el flujo de firma
-- SECOP II, no el ciclo de ejecución — hallazgo documentado en cierre.
SELECT
  COALESCE(g.municipio_nombre, '(sin geografía)') AS municipio,
  COALESCE(g.departamento_nombre, '(sin geografía)') AS departamento,
  COUNT(*) AS contratos_activos
FROM contrato c
LEFT JOIN geografia g ON g.codigo_divipola = c.geografia_id
WHERE c.estado_actual IN ('Aprobado', 'Modificado')
GROUP BY g.municipio_nombre, g.departamento_nombre
ORDER BY contratos_activos DESC;

\echo '-- contratos Aprobado/Modificado SIN geografía (informativo)'
SELECT COUNT(*) AS activos_sin_geo
FROM contrato
WHERE estado_actual IN ('Aprobado', 'Modificado')
  AND geografia_id IS NULL;

\echo '====================================================================='
\echo '(c) Entidades que adjudicaron >=2 contratos al mismo proveedor'
\echo '====================================================================='
SELECT
  e.nombre AS entidad,
  p.razon_social AS proveedor,
  COUNT(*) AS nro_contratos,
  SUM(c.valor_actual) AS valor_total
FROM contrato c
JOIN entidad e   ON e.id = c.entidad_id
JOIN proveedor p ON p.id = c.proveedor_id
GROUP BY e.id, e.nombre, p.id, p.razon_social
HAVING COUNT(*) >= 2
ORDER BY nro_contratos DESC, valor_total DESC
LIMIT 20;
