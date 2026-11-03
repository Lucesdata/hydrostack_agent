-- Reparación de sede por identidad oficial, nunca por coincidencia en el objeto.
-- Caldas: https://caldas.gov.co/130-informacion-general/3550-direccion-fisica
-- Guayatá: https://fps.gov.co/assets/files/news/news_files/CIRCULAR%20BDME%20-%20MAYO%202025.pdf
-- 15000 es el código departamental sintético ya usado por AquaLicita.
INSERT INTO geografia (codigo_divipola, departamento_codigo, departamento_nombre, municipio_codigo, municipio_nombre)
SELECT v.codigo, v.depto_codigo, v.depto_nombre, v.municipio_codigo, v.municipio_nombre
FROM (VALUES ('17001', '17', 'Caldas', '001', 'Manizales', '890801052'),
             ('15000', '15', 'Boyacá', '000', NULL, '891800896'))
  AS v(codigo, depto_codigo, depto_nombre, municipio_codigo, municipio_nombre, nit)
WHERE EXISTS (SELECT 1 FROM entidad e WHERE e.nit_canonico = v.nit)
ON CONFLICT (codigo_divipola) DO NOTHING;
--> statement-breakpoint
UPDATE entidad SET geografia_id = CASE nit_canonico
  WHEN '890801052' THEN '17001' WHEN '891800896' THEN '15000' END,
  updated_at = now()
WHERE nit_canonico IN ('890801052', '891800896')
  AND geografia_id IS DISTINCT FROM CASE nit_canonico
    WHEN '890801052' THEN '17001' WHEN '891800896' THEN '15000' END;
--> statement-breakpoint
-- En p6dx-8zbt la geografía del proceso es la ubicación de la entidad.
-- No se actualiza contrato.geografia_id: pertenece a la localización contractual.
UPDATE proceso p SET geografia_id = e.geografia_id, updated_at = now()
FROM entidad e
WHERE p.entidad_id = e.id AND e.nit_canonico IN ('890801052', '891800896')
  AND p.geografia_id IS DISTINCT FROM e.geografia_id;
