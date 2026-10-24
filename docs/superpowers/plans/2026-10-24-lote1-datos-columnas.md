# Plan: Lote 1 de datos (duración, recursos, prórroga, liquidación)

**Fecha:** 2026-10-24 · **Estado:** plan para aprobar, **nada implementado**. Spec:
`docs/superpowers/specs/2026-10-24-lote1-datos-columnas.md`. Toca esquema, ingesta y una
ruta pública, así que **necesita aprobación** antes de la primera línea (`docs/CONDUCTA.md` §4).

## 1. Reconocimiento (lo que ya existe)

| Pieza | Dónde | Qué importa |
|---|---|---|
| Campos que pide la ingesta | `src/lib/ingest/campos.ts` (`FIELDS_*` de `src/lib/secop/config.ts` + `EXTRA_*`) | `$select` desde 2026-09-12; **los campos nuevos hay que añadirlos aquí**; `campos.test.ts` vigila la cobertura |
| Mapeo | `src/lib/transform/mapCanonical.ts` (`mapProcesoRow`, `mapContratoRow`) | puro; usa `cleanText` (centinelas «No Definido»/«No aplica» → `null`), `parseBool` («Si»/«No»), `parseMoney` |
| Escritura | `src/lib/transform/writers.ts` (upserts de `proceso` y `contrato`, listas `set:` de `onConflictDoUpdate`) | contrato: `valor_inicial`/`fecha_fin_inicial` inmutables; el resto `excluded.*` |
| Hash del payload | `src/lib/ingest/sources.ts` (`volatileFields`) | los campos del lote **no** están en la lista de volátiles: un cambio en ellos sí dispara la transformación. El hash crudo no lo usa nadie para saltarse el transform (solo `al/eventos` tiene su propio hash) |
| Relleno retroactivo | `scripts/rellenar-columnas.ts` (descripción, url, unspsc, 2026-09-12) | patrón a reutilizar: lotes, `VACUUM` entre vueltas, umbral de aborto por tamaño |
| Lectura de la ficha | `src/lib/secop/ficha.ts` (`COLUMNAS_FICHA`, `contratosDeProcesos`) | `contratosDeProcesos` la comparten la ficha y las tarjetas de la vitrina: **no** conviene engordarla para las tarjetas |
| «Cómo se contrató» | `src/lib/secop/como-se-contrato.ts`, sección `#como-se-contrato` de `app/licitaciones/[slug]/page.tsx` | solo desde 2026 y solo contratista con NIT; ya calcula la prórroga **por fechas** |
| Glosario | `src/lib/secop/glosario.ts`, `terminosDeFicha()` | única fuente de definiciones (R7) |
| `raw_attrs` | `src/lib/transform/writers.ts` | solo se escribe: ningún código de la app lo lee |

## 2. Decisiones técnicas

**D-T1 — Esquema** (una migración aditiva, todas las columnas nulables, sin tabla nueva ni
`.enableRLS()` que añadir, sin reescritura de tabla):

| Tabla | Columna | Tipo | Notas |
|---|---|---|---|
| `proceso` | `duracion_valor` | `integer` | `> 0` o `null` |
| `proceso` | `duracion_unidad` | `text` | `dias` · `semanas` · `meses` · `anos`; fuera de ese conjunto, `null` |
| `contrato` | `origen_recursos` | `text` | valor literal de la fuente (R7 del spec) |
| `contrato` | `destino_gasto` | `text` | literal; «No Definido» → `null` |
| `contrato` | `fuentes_recursos` | `jsonb` | solo claves con valor > 0: `sgp`, `propios`, `pgn`, `credito`, `regalias`; sin ninguna → `null`. Una columna `jsonb` en vez de cinco `bigint`: es dispersa (la mayoría vale 0) y no se consulta por valor |
| `contrato` | `dias_adicionados` | `integer` | `> 0` o `null` |
| `contrato` | `liquidado` | `boolean` | `parseBool(liquidaci_n)` |

La migración se **genera** con `drizzle-kit generate` sobre `main` en el momento del merge
(no a mano): su número lo fija el orden de merge (`2026-10-24-reconciliacion-migraciones.md`,
#156). Aplicarla es operación del propietario, con el registro de Drizzle ya reconciliado.

**D-T2 — Política de escritura.** Las columnas nuevas se escriben con
`coalesce(excluded.x, tabla.x)`: un payload que no las trae (por ejemplo, uno aterrizado
antes del despliegue y transformado después, tras un reintento) **no borra** un valor ya
rellenado. Coste asumido: si la entidad retira un valor, el nuestro queda; aceptable y
coherente con `entidad_id`/`proceso_id`. (No se usa `excluded.x` a secas como en las demás
columnas del contrato.)

**D-T3 — Relleno por identificador, no por re-ingesta.** Re-aterrizar 2026 por la ingesta
metería 20.000 filas con todos sus campos en `raw_record` y dispararía el transform. En su
lugar, un script nuevo pide a Socrata **solo** `id` + los campos del lote para los
identificadores de 2026 que ya tenemos y hace `UPDATE` directo. No toca `raw_record`, no
transforma, es idempotente y acotado: **15.320 procesos y 5.172 contratos**.

**D-T4 — Mapeo en funciones puras compartidas.** El mapeo de los campos del lote vive en
una función pura (`mapLote1Proceso`, `mapLote1Contrato`) que usan **a la vez** el transform
y el script de relleno. Un solo lugar define qué es «sin dato».

**D-T5 — Lectura de la ficha.** `COLUMNAS_FICHA` añade las dos columnas de `proceso`
(ya se lee esa fila). Los contratos se piden con un parámetro `detalle` en
`contratosDeProcesos`: con `detalle: true` (solo la ficha) trae las columnas nuevas; la
vitrina sigue como hoy. **Cero consultas nuevas.**

**D-T6 — Presentación.** Una función pura `datosLote1()` (`src/lib/secop/datos-lote1.ts`) que
recibe proceso y contratos y devuelve las filas a pintar, aplicando R1–R7: duración legible
(«12 meses»), fuentes en palabras («Sistema General de Participaciones y recursos propios»),
prórroga declarada frente a la deducida (si difieren, las dos), liquidado Sí/No. El
componente solo pinta lo que devuelve. Sin dato, devuelve vacío y la ficha no cambia.

## 3. Archivos

| Archivo | Cambio |
|---|---|
| `src/lib/db/schema/hechos.ts` | las 7 columnas |
| `drizzle/00NN_*.sql`, `meta/*` | **generados** por `drizzle-kit generate` |
| `src/lib/secop/config.ts` + `src/lib/ingest/campos.ts` | campos nuevos a `$select` (`FIELDS_*`/`EXTRA_*`) |
| `src/lib/transform/lote1.ts` (nuevo) | `mapLote1Proceso`, `mapLote1Contrato` (puras) |
| `src/lib/transform/mapCanonical.ts` | las proyecciones incluyen los campos |
| `src/lib/transform/writers.ts` | valores y `set:` con `coalesce` (D-T2) |
| `scripts/relleno-lote1.ts` (nuevo) | relleno por id (D-T3) |
| `src/lib/secop/ficha.ts` | `COLUMNAS_FICHA` y `contratosDeProcesos(ids, { detalle })` |
| `src/lib/secop/datos-lote1.ts` (nuevo) | presentación pura (D-T6) |
| `src/lib/secop/glosario.ts` | términos nuevos |
| `app/licitaciones/[slug]/page.tsx`, componente de «Cómo se contrató» | pintar las filas |

No se toca: `etapa.ts`, `agregados.ts`, el hash volátil, `raw_record`, la vitrina.

## 4. Tareas (en orden; cada una se verifica antes de la siguiente)

**PR 1 — datos que entran** (esquema + ingesta + transform; sin cambio visible)

1. **Mapeo puro (TDD).** `lote1.ts` con pruebas: `duracion` «12» + «Mes(es)» → `{12, 'meses'}`;
   `0`, vacío y unidad desconocida → `null`; «No Definido» → `null`; fuentes: solo las > 0,
   ninguna → `null`; `dias_adicionados` `0` → `null`; `liquidaci_n` «Si»/«No» → boolean.
2. **Esquema y migración.** Columnas en `hechos.ts`; `drizzle-kit generate`; probar con
   PGlite (`migrate` aplica y las columnas existen, nulables).
3. **`$select`.** Añadir los campos a `config.ts`/`campos.ts`; `campos.test.ts` pasa y se
   añade una aserción de que cada campo del lote está en `selectDe()`.
4. **Transform y escritura.** Proyecciones + `writers.ts` con `coalesce`. Pruebas con PGlite
   (patrón de `writers-campos.test.ts`): inserta con valores; un segundo upsert **sin** los
   campos conserva los valores; un upsert con valores nuevos los actualiza.
5. **Verificación de PR 1:** `vitest` completo, `eslint`, `prettier`, `npm run build`.

**PR 2 — relleno** (script; la ejecución contra la base viva la hace el propietario)

6. **Script `relleno-lote1.ts`.**
   - Por defecto **seco** (cuenta y muestra, no escribe); `--aplicar` escribe.
   - Universo: procesos con `fecha_publicacion >= 2026-01-01` y los contratos de esos procesos.
   - Lotes de 200 identificadores: `$select=<id>,<campos>&$where=<id> in (…)` al dataset
     resuelto con `resolveDatasetId` (mismo que la ingesta), con reintentos y pausa entre
     peticiones; ≈ 77 + 26 peticiones.
   - Cada fila pasa por `mapLote1*` (D-T4) y se escribe con `UPDATE … FROM (VALUES …)` en
     lotes de 500, con `statement_timeout` corto, **solo** las siete columnas.
   - `VACUUM` entre vueltas y **aborto** si la base pasa de **420 MB** (medida al inicio y
     por vuelta), como `rellenar-columnas.ts`.
   - Informe final: ids pedidos / encontrados / sin fila en la fuente, y cuántos quedaron con
     cada campo poblado y nulo.
7. **Pruebas del script:** `fetch` simulado + PGlite; modo seco no escribe; es idempotente;
   un id ausente en la fuente no rompe; el umbral de tamaño aborta.
8. **Ejecución (no automatizable aquí):** el propietario la corre **fuera de la ventana del
   `tick`** (11:00–12:30 UTC), primero en seco y luego con `--aplicar`. Evidencia que la
   cierra: `scripts/sql/medir-espacio-ingesta.sql` antes y después (< 10 MB de diferencia) y
   una consulta de cobertura por columna que debe acercarse a la medida (89 % duración, 14 %
   días adicionados…).

**PR 3 — ficha** (presentación)

9. **`datos-lote1.ts` (TDD):** duración legible; fuentes; prórroga declarada vs deducida
   (iguales → una; distintas → ambas rotuladas); liquidado; **sin dato → vacío**.
10. **Lectura:** `COLUMNAS_FICHA` y `contratosDeProcesos(ids, { detalle })`; prueba de que la
    vitrina **no** pide las columnas nuevas.
11. **Glosario:** definir fuentes de recursos, SGP, destino del gasto, liquidación y
    «prórroga declarada» (sin «Distribuido» hasta resolver Q1).
12. **Página:** pintar duración en «¿En qué va el proceso?» y el resto en «Cómo se contrató»,
    solo desde 2026. Pruebas de render (`FichaPublica.test.tsx`): con dato, sin dato (salida
    idéntica a la de hoy), «0» y «No definido» nunca pintados, procesos anteriores a 2026 sin
    cambios.
13. **Verificación visual** a 320, 390 y 1440 px con datos reales (tras el relleno); sin
    datos vivos, degradación explícita, como en #153.

## 5. Orden de despliegue y reversión

| Paso | Efecto | Reversión |
|---|---|---|
| Migración | columnas nulas | no necesita revertirse (nulables, ignoradas); quitarlas es otra migración aprobada aparte |
| Código de PR 1 | llegan datos nuevos en filas nuevas | revertir el commit; los valores guardados quedan sin leer |
| Relleno | 20.000 `UPDATE` | idempotente; no hay que deshacerlo: reponer a `null` con un `UPDATE` explícito si hiciera falta |
| PR 3 | se ven los datos | revertir el commit; la ficha vuelve a la de hoy |

Dependencias: el PR #155 (hoy en Colombia una vez por consulta) debería estar desplegado
antes del relleno, y la numeración de la migración depende de reconciliar las `0025`.

## 6. Riesgos y comprobaciones

- **CPU compartida:** el relleno corre en lotes pequeños, con pausas, fuera de la ventana del
  `tick` y con `statement_timeout`; se comprueba `get_runtime_errors` los días siguientes.
- **Espacio:** estimado ≈ 3 MB; aborto a 420 MB; los `UPDATE` dejan tuplas muertas: de ahí el
  `VACUUM` entre vueltas (aprendido en `rellenar-columnas.ts`).
- **Socrata:** el nombre de campo puede cambiar (ya pasó con dos del spec anterior). Un test de
  contrato mínimo contra una respuesta guardada, y el modo seco del script, lo detectan.
- **Cobertura baja (14 % y 1–29 %):** se asume y se comunica; no se rellena por defecto.
- **Datos personales:** ninguno de los campos lo es (R6 del spec); no se añade nada más al
  `$select`. El representante legal ya guardado se trata aparte (D4 del spec).

## 7. Lo que necesito aprobar antes de empezar

1. Esquema D-T1 (incluida la columna `jsonb`) y la política `coalesce` (D-T2).
2. Relleno por identificador y sin pasar por `raw_record` (D-T3).
3. Orden PR 1 → 2 → 3 y que PR 3 espere al relleno ejecutado.
4. Resolver Q1 («Distribuido») o aceptar mostrarlo literal y rotulado.
5. D6 (la liquidación no cambia la etapa en este lote) y D4 corregida (qué hacer con
   `representante_legal`, aparte).
