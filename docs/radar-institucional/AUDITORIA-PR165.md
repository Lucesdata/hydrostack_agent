# Auditoría PR #165 — Radar institucional y proyectos adjudicados (2026-11-03)

## Datos medidos en la base viva (solo lecturas)
- `entidad` es 1:1 con NIT (4.320 entidades, 4.320 NIT): no hay NIT repetidos, así que una secretaría con otro NIT no se funde con su alcaldía.
- **EMCALI EICE ESP no existe con ese nombre**: es «EMPRESAS MUNICIPALES DE CALI», NIT 890399003 (477 procesos). **EMCALIMA** (NIT 805011107) es otra entidad y no debe consolidarse con ella.
- UAESP: «UNIDAD ADMINISTRATIVA ESPECIAL DE SERVICIOS PÚBLICOS.», NIT 900126860 (12 procesos, 6 adjudicados). EAAB: NIT 899999094 (5.858 procesos, 0 adjudicados en la base).
- «Alcaldía de Cali»: bajo el NIT 890399011 solo aparece la Secretaría del Deporte; no hay registro de la alcaldía como tal. No se inventó ninguno.
- `adjudicado = true` en 13.871 procesos, pero 99 no están en estado «Seleccionado» (Abierto, Evaluación, Publicado, Cancelado) y 15 no tienen adjudicatario. 2 del top de octubre eran de ese tipo.
- `valor_adjudicacion = valor_estimado` en 5.145 de 13.871: es el valor publicado por la fuente, pero a menudo coincide con el presupuesto.
- Octubre 2026: 21 procesos con fecha de adjudicación (118 en septiembre); la ingesta del mes cerrado puede estar incompleta.

## Errores corregidos
1. Enlaces de ficha (`objeto-id`) → 404; la ruta exige `objeto--id`. Ahora `slugDeProceso()`.
2. Adjudicación = Seleccionado + adjudicatario; deduplicado por entidad+referencia.
3. `periodoAnterior()` (ahora − 32 días) fallaba a inicios de mes.
4. Ficha institucional: etiqueta de tipo solapada con el título; tipo con nombre legible.
5. Radar: 50 tarjetas seguidas → 12 con «Mostrar más».
6. Móvil: el fondo del hero tapaba el texto.
7. `tsc`: faltaba declaración `*.css`.

## Segunda tanda
- **Búsqueda en servidor** (`GET /api/radar/entidades?q=&clase=`, `src/lib/secop/buscar-entidades.ts`): recorre toda la tabla `entidad` por nombre (todas las palabras, sin tildes) o NIT, aunque la entidad no tenga procesos abiertos. Dos pasos (entidades, luego una agregación de abiertos): la versión con unión tardaba 8,4 s en la base viva; separada, ~230 ms. Caché CDN de 1 h.
- **Ilustraciones por tipo**: `public/ilustraciones/tipo-{ptap,ptar,acueducto,alcantarillado}.svg`, con la paleta de `tipo-color.ts` (azul potable, marrón residual, gris redes). En proyectos adjudicados, el primero va como franja grande y los demás como miniatura; todas rotuladas «Ilustración conceptual, no es una foto de la obra».

## Pendientes
- **Índice faltante (no aplicado):** `proceso` no tiene índice por `entidad_id`. Las consultas por entidad (ficha institucional, conteos del Radar) recorren las ~94.000 filas (~230 ms por consulta medida en la base viva). Recomendado: `CREATE INDEX CONCURRENTLY proceso_entidad_idx ON proceso (entidad_id)` en una migración aparte; no se aplicó ni se añadió migración a esta PR.
- Clasificación: un convenio de «mejoramientos de vivienda» quedó como acueducto.
- La portada añade una sección entre hero y TuPerfil; CLAUDE.md pide no apilar más secciones sin razón medida.
- Seguimiento/alertas institucionales: no implementados, no se ofrecen.
- Las capturas usan la base local de muestra (500 procesos), no la viva.
