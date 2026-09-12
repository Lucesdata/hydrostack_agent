# Adelgazamiento de `raw_record`: del payload jsonb a columnas canónicas

- **Fecha:** 2026-09-11
- **Estado:** propuesta, pendiente de aprobación
- **Contexto:** la base ocupa 474 MB de los 500 MB del plan Free de Supabase.
  El panel marca 512/500 MB y el proyecto como `EXCEEDING USAGE LIMITS`.
- **Opción elegida:** «B — adelgazar el payload». Subir de plan queda
  descartado por presupuesto, así que el diseño no puede comprar margen.
- **Revisión:** la primera versión usaba `VACUUM FULL` y concluía que hacía
  falta un mes de Pro. Sustituido por `TRUNCATE`, que no necesita espacio
  libre. Ver §6 y §12.

---

## 1. El problema, y la restricción que lo hace difícil

`raw_record` pesa 287 MB (60% de la base): 161 MB de heap, 113 MB de TOAST y
13 MB de índices, sobre 129.511 filas. No hay desperdicio que recuperar: la
ingesta deduplica (1,00 versiones por `source_record_id`), no hay bloat
(0 tuplas muertas), no hay huérfanos relevantes (24 filas) y los índices
muertos ya se retiraron en agosto de 2026.

El crecimiento va a saltos. Un día normal entran 100–400 filas; un barrido
mete decenas de MB de golpe. El del 10 de septiembre añadió 18.144 filas y
38 MB. **Con 26 MB de margen, el próximo barrido cruza el límite.**

La restricción que condiciona todo el diseño no es el tamaño, es el margen:

> Con 26 MB libres, ninguna operación que **reescriba** cabe. `VACUUM FULL`
> sobre `raw_record` necesitaría 287 MB. `pg_repack` igual. Copiar a una tabla
> nueva, igual. Y un `VACUUM` normal no devuelve páginas al sistema operativo:
> marca espacio reutilizable *dentro* de la tabla, pero `pg_database_size` no
> baja.
>
> La salida es que existe **una** operación que devuelve el espacio sin
> necesitar un solo byte libre, porque descarta ficheros en vez de reescribir:
> `TRUNCATE`. Sobre ella se construye la §6.

Esa restricción es la que dicta el orden de ejecución de la sección 6, y es la
razón de que este documento sea más largo que el cambio que describe.

**Presupuesto: cero.** Subir de plan no es una opción disponible, así que el
diseño no puede apoyarse en comprar margen.

---

## 2. Evidencia: lo que se midió, y lo que descartó

Todas las cifras vienen de mediciones sobre la base viva el 2026-09-11, no de
estimaciones. Las variantes se compararon montando tablas temporales reales y
leyendo `pg_total_relation_size`, porque medir `pg_column_size` sobre una
expresión compara un valor sin comprimir contra uno almacenado y comprimido —
un error que invierte el resultado.

### 2.1 Anatomía del payload

| Métrica | Valor |
|---|---|
| Claves por fila (media) | 61 |
| Bytes solo de **nombres de clave** | 1.215 |
| Bytes de valores | 1.283 |
| Texto plano | 2.863 |
| En disco (pglz) | 1.687 |
| Claves distintas en el dataset | 137 |
| Claves referenciadas en el código | 69 |
| Claves **nunca referenciadas** | 68 |

El dato que gobierna todo: **el 42% del payload son nombres de clave
repetidos 129.511 veces.**

### 2.2 Variantes medidas

| Variante | % del tamaño actual | Ahorro en `raw_record` |
|---|---|---|
| payload completo, pglz (hoy) | 100% | — |
| payload completo + **lz4** | **100%** | **0 MB** |
| solo las 69 claves referenciadas (jsonb) | 93% | 19 MB |
| conjunto caliente real, 48 campos (jsonb) | 80% | 56 MB |
| 23 campos caliente como **columnas nativas** | **49%** | — |
| solo 5 campos (jsonb) | 29% | 195 MB |
| payload NULL | 2% | 268 MB |

### 2.3 Tres vías quedan cerradas

- **Compresión (lz4).** Cero ahorro, medido. `pglz` ya comprime 1,7× y lo que
  comprime son precisamente los nombres de clave repetidos. Cerrada.
- **Recorte conservador.** Quitar las 68 claves que el código nunca menciona
  ahorra 19 MB (7%). No resuelve nada.
- **Recorte al conjunto caliente manteniendo jsonb.** Descarta más de la mitad
  de las claves (29 de 52 en procesos, 55 de 82 en contratos) y solo ahorra
  56 MB. Tampoco resuelve.

**Conclusión:** mientras el dato siga siendo jsonb, no hay ahorro que importe.
La ganancia está en dejar de repetir los nombres de clave, y eso significa
columnas nativas. Los mismos 23 campos pesan 80% como jsonb y **49% como
columnas**.

---

## 3. Decisiones de diseño

### D1 — El conjunto caliente son 48 campos, no 5

El documento de partida decía que «cinco claves sostienen matching y
notificaciones». El cruce del código contra las 137 claves reales dice otra
cosa. Los consumidores son ocho, no dos:

| Módulo | Campos del payload que lee |
|---|---|
| `secop/db-search.ts` (buscador principal) | nombre, descripción, fase, unspsc, adjudicado, valorAdjudicacion, adjudicatario, estadoApertura, url |
| `al/eventos/campos.ts` (detección de adendas) | 11 campos vigilados |
| `al/matching/buscar-candidatos.ts` | nombre, descripción, unspsc |
| `al/notificacion/recopilar.ts` (digest) | nombre, entidad, url |
| `al/historico/mapear.ts` | adjudicado, proveedor, nit, unspsc, modalidad, … |
| `secop/recientes.ts` | urlproceso |
| `al/sanciones/mapear.ts` | payload de su propia fuente |
| `transform/orchestrator.ts` | **el payload entero**, para re-derivar |

### D2 — Buena parte del conjunto caliente ya está en columnas

Verificado sobre 20.000 filas: `proceso.objeto` **es**
`nombre_del_procedimiento` (19.996/20.000 coinciden exactamente), y
`modalidad`, `estado_actual`, `referencia` y `portafolio_id` coinciden
20.000/20.000. `entidad` está normalizada con FK en 90.459/90.459.
`al_proceso_estado` ya guarda en columnas 8 de los 11 campos vigilados por el
detector de adendas.

Es decir: el trabajo de promoción está hecho a medias desde hace tiempo. Esta
propuesta lo termina, no lo inventa.

### D3 — `payload` pasa a `NULL`; la columna se conserva

`raw_record` deja de ser una landing de payloads y queda como **tabla de
linaje**: qué se ingirió, cuándo, de qué lote, con qué hash. La columna
`payload` se mantiene (`nullable`) para que la ingesta pueda seguir
escribiéndola durante una ventana de transición y para no romper los tipos de
Drizzle en un solo golpe.

**Coste aceptado y explícito:** se pierde la capacidad de re-transformar sin
volver a descargar de SECOP. Es la razón de existir de una tabla raw, y se
renuncia a ella a cambio de 187 MB. El mitigante es D4.

### D4 — El histórico se archiva fuera de Postgres

Export completo a NDJSON comprimido: **44 MB en gzip, medido** (no estimado)
sobre una muestra real de 3.000 payloads. Destino: **Supabase Storage**, bucket
privado, mismo proyecto, accedido con el service role. En el plan Free son 1 GB
y **se contabilizan aparte de los 500 MB de base**.

Storage tiene políticas propias en `storage.objects`, ajenas al RLS de las 23
tablas de `public`. El bucket debe crearse privado y sin políticas para `anon`
ni `authenticated`: el único acceso es por service role desde el servidor.

Descartado Google Drive: sus ToS prohíben usarlo como backend de aplicación,
no tiene motor de consulta, y los refresh tokens de una app OAuth sin verificar
caducan a los 7 días, lo que rompería producción cada semana.

### D5 — La ingesta filtra campos en origen con `$select`

`sources.ts` ya construye un `$where` sectorial, pero `sodaFetch.ts` nunca
manda `$select` — su propio comentario lo dice: «todos los campos, sin
filtrar». Cada fila nueva aterriza 61 campos para usar 23. Añadir `$select`
corta el crecimiento futuro y es el cambio que evita repetir este problema
dentro de un año.

### D6 — Se hace en un worktree, con la ingesta pausada

La ingesta diaria corre por cron de Vercel a las 11:00 UTC
(`/api/cron/tick`). Durante la migración se pausa quitando la entrada de
`vercel.json` y desplegando, no borrando el endpoint.

---

## 4. Arquitectura objetivo

```
ANTES                                  DESPUÉS
SECOP/Socrata                          SECOP/Socrata
  │ 61 campos                            │ $select: 23-27 campos
  ▼                                      ▼
raw_record.payload  (287 MB)           raw_record  (36 MB, solo linaje)
  │ leído en caliente por 8 módulos      │
  ▼                                      ▼
proceso / contrato  (139 MB)           proceso / contrato  (203 MB)
                                         ▲ los 8 módulos leen de aquí
                                       Supabase Storage
                                         └─ raw-archive/*.ndjson.gz (44 MB)
```

Columnas nuevas en `proceso` (11): `descripcion`, `url`, `unspsc`, `fase`,
`adjudicado`, `valor_adjudicacion`, `adjudicatario`, `nit_adjudicatario`,
`fecha_adjudicacion`, `estado_apertura`, `fecha_recepcion`.
(`precio_base` ya existe como `valor_estimado`.)

Columnas nuevas en `contrato` (2): `unspsc`, `url`.

Verificado leyendo `mapCanonical.ts`: `contrato` **ya persiste** objeto,
referencia, modalidad, tipo, valores, fechas, estado y prorrogable, y el
transform ya consume `es_grupo`, `orden`, `rama`, `sector`, `localizaci_n`,
`tipodocproveedor`, `nombre_representante_legal` y `proceso_de_compra`
volcándolos en `entidad`, `proveedor` y `geografia`. Esos campos deben seguir
llegando en el `$select`, pero **no** necesitan columna nueva.

Esto separa dos conjuntos que no hay que confundir:

- **Conjunto `$select`** — lo que la ingesta descarga para que el transform
  funcione (~27 en procesos, ~25 en contratos).
- **Conjunto columnas** — lo que se lee del payload *después* del transform, en
  caliente, y por tanto hay que persistir: 11 en `proceso`, 2 en `contrato`.

Toda tabla nueva nacería con `.enableRLS()` (CLAUDE.md §4). Aquí no se crean
tablas, solo columnas: la RLS de `proceso` y `contrato` ya está activa y no se
toca.

---

## 5. Balance de espacio

| Objeto | Hoy | Después | Δ |
|---|---|---|---|
| `raw_record` | 287 MB | 36 MB | **−251 MB** |
| `proceso` | 95 MB | 136 MB | +41 MB |
| `contrato` | 44 MB | 50 MB | +6 MB |
| resto (20 tablas) | 48 MB | 48 MB | 0 |
| **Total** | **474 MB** | **~270 MB** | **−204 MB** |

Resultado: **54% de la cuota**, con 230 MB de margen. Y con `$select` el
crecimiento por barrido baja sustancialmente, porque ya no se escriben 38 MB de
jsonb sino columnas.

---

## 6. Secuencia de ejecución

El orden está construido para que **ningún paso necesite espacio libre**. La
pieza que lo hace posible es `TRUNCATE`: a diferencia de `VACUUM FULL`, que
escribe una copia nueva antes de soltar la vieja, `TRUNCATE` descarta los
ficheros de la relación y devuelve el espacio al sistema operativo de
inmediato, sin necesitar un solo byte libre.

Verificado: las cinco columnas que referencian `raw_record` son **todas
nullable**, así que las constraints se pueden soltar y recrear sin tocar datos.

| Tabla | Columna | Nullable | Filas que apuntan |
|---|---|---|---|
| `proceso` | `raw_record_id_actual` | sí | 90.459 |
| `contrato` | `raw_record_id_actual` | sí | 38.367 |
| `al_oferentes_historico` | `raw_record_id` | sí | 13.606 |
| `al_proceso_evento` | `raw_record_id` | sí | 1.311 |
| `transform_quarantine` | `raw_record_id` | sí | 0 |

### Fase 0 — Preparación (sin tocar datos)

0.1 Pausar el cron: quitar `/api/cron/tick` de `vercel.json`, desplegar.
0.2 `DROP INDEX` de los índices recreables para hacer sitio a la fase 2:
    `contrato_proveedor_idx`, `contrato_entidad_idx`, `contrato_estado_idx`
    (0 escaneos), `proceso_portafolio_idx` y `proceso_doc_access_idx`.
    Devuelve ~19 MB al SO de inmediato. Margen: 26 → 45 MB.
0.3 Snapshot de referencia (§9).

### Fase 1 — Archivar (no toca la base)

1.1 `scripts/export-raw-archive.ts`: NDJSON gzip por `source` a Supabase
    Storage, bucket privado. 44 MB medidos.
1.2 **Verificación bloqueante**: descargar, descomprimir, contar líneas
    (129.511) y comparar SHA-256 de 1.000 payloads al azar contra la base.
1.3 Copia local adicional, fuera del repo.

### Fase 2 — Código y columnas

2.1 Migración: `ADD COLUMN` de las 27 columnas. En PG 11+ una columna nullable
    sin default es instantánea y **no reescribe la tabla**: coste cero.
2.2 Reescribir los 8 consumidores para leer de las columnas nuevas, con
    `coalesce(...)` al payload mientras estén vacías.
2.3 `transform/mapCanonical.ts` y `orchestrator.ts` pueblan las columnas.
2.4 **El payload pasa a ser un buffer, no un almacén.** El transform lo lee de
    `raw_record` como hoy, y al terminar con éxito vacía las filas que
    consumió (`UPDATE raw_record SET payload = NULL WHERE id = ANY(...)`).
    En régimen, `raw_record` solo tiene payload de lo pendiente de
    transformar: unos miles de filas, pocos MB.
    Esto es lo que mantiene la tabla en 36 MB; re-ingerir con `$select` pero
    seguir guardando el jsonb la dejaría en ~219 MB (80%, §2.2) y no
    resolvería nada. Si el transform falla, el payload sigue ahí: el vaciado
    es la confirmación de que se consumió, no un paso aparte.
2.5 Tests en verde. Desplegar.
2.6 Rellenar en lotes **solo** `descripcion`, `url` y `unspsc` de `proceso`
    (+30 MB; caben en los 45 MB de la fase 0). Son los tres campos que
    sostienen el buscador, así que tras este paso la web no nota nada de lo
    que sigue.

### Fase 3 — El corte

3.1 `ALTER TABLE ... DROP CONSTRAINT` de las 5 claves foráneas.
3.2 `TRUNCATE raw_record`. **Instantáneo, sin espacio temporal.**
    `pg_database_size`: ~485 → **~198 MB**.
3.3 Recrear los índices soltados en 0.2 (+19 MB).

### Fase 4 — Repoblar

4.1 Añadir `$select` en `sodaFetch.ts`, con la lista derivada de
    `FIELDS_PROCESOS`/`FIELDS_CONTRATOS` (fuente única, no una lista a mano).
4.2 Re-ingesta completa con la maquinaria existente: repuebla el linaje de
    `raw_record` y el transform puebla las columnas nuevas de `proceso` y
    `contrato`. Duración estimada: 30–60 min para 129.511 registros.
4.3 Recrear las 5 constraints.
4.4 Retirar el `coalesce` al payload de los 8 consumidores.
4.5 Reactivar el cron. Observar el primer barrido.

> **Ventana de degradación:** entre 3.2 y 4.2. `proceso` y `contrato` conservan
> todas sus filas y columnas; solo faltan las columnas nuevas que 2.6 no
> rellenó. El buscador funciona íntegro. Matching y digest quedan degradados,
> pero su cron está pausado desde 0.1, así que nadie lo ve. Con 3 usuarios y
> ejecutándolo de madrugada, el impacto real es nulo.

## 7. Cambios de código

| Archivo | Cambio |
|---|---|
| `src/lib/db/schema/aqualicita.ts` | +12 columnas en `proceso`, +15 en `contrato` |
| `src/lib/db/schema/raw.ts` | `payload` pasa a nullable |
| `drizzle/0024_*.sql` | migración generada con `npm run db:generate` |
| `src/lib/secop/db-search.ts` | 9 lecturas de payload → columnas |
| `src/lib/al/matching/buscar-candidatos.ts` | 3 lecturas → columnas; elimina el `leftJoin(rawRecord)` |
| `src/lib/al/notificacion/recopilar.ts` | 3 lecturas → columnas |
| `src/lib/al/eventos/correr.ts` | `estadoDesdePayload` → `estadoDesdeProceso` |
| `src/lib/al/historico/mapear.ts` | firma pasa de `payload` a fila de `contrato` |
| `src/lib/secop/recientes.ts` | `urlRaw` → `proceso.url` |
| `src/lib/transform/mapCanonical.ts` | proyecta las columnas nuevas |
| `src/lib/transform/orchestrator.ts` | escribe las columnas nuevas |
| `src/lib/ingest/sodaFetch.ts` | añade `$select` |
| `scripts/export-raw-archive.ts` | **nuevo** |
| `scripts/rellenar-columnas.ts` | **nuevo**, fase 2.6, por lotes con VACUUM |
| `scripts/corte-raw-record.ts` | **nuevo**, fase 3: suelta las 5 FK, `TRUNCATE`, recrea índices |
| `src/lib/ingest/dbIngest.ts` | deja de persistir `payload`; el hash se calcula en memoria |
| `vercel.json` | pausa y reactivación del cron |
| `CLAUDE.md` | §2 y §4: el nuevo papel de `raw_record`; borrar la nota obsoleta de `0017` (ya aplicada, verificado) |

---

## 8. Riesgos

**R1 — El pico de la fase 2.6 roza la cuota. `[medio]`**
Tras rellenar los tres campos del buscador la base llega a ~485 MB, a 15 MB
del límite. Si un barrido entrara ahí, cruzaría.
*Mitigación:* el cron está pausado desde 0.1, así que no hay escrituras
concurrentes. Y 2.6 es opcional: saltárselo ahorra los 30 MB a cambio de que
el buscador pierda la descripción durante la ventana de la fase 3.

**R1b — `TRUNCATE` es irreversible. `[alto, cubierto]`**
Una vez ejecutado 3.2 no hay vuelta atrás dentro de Postgres.
*Mitigación:* la verificación bloqueante de 1.2, y que SECOP sigue publicando
el histórico completo — la fase 4 lo re-descarga.

**R2 — `payload_hash` cambia para todas las filas al aplicar `$select`. `[alto]`**
El hash se calcula sobre el payload completo menos los volátiles. Con menos
campos, todos los hashes cambian: la ingesta verá 129.511 registros
«modificados» y el detector de adendas podría emitir una adenda por proceso en
la primera corrida — el correo diario se vuelve ruido para los tres usuarios.
*Mitigación:* el detector compara contra `al_proceso_estado` (columnas), no
contra el hash, así que el diff real dará vacío. Aun así: correr
`al:eventos` en seco tras la fase 4 y verificar que no genera eventos antes de
reactivar `/api/cron/alertas`.

**R3 — Pérdida de re-transformabilidad. `[medio, aceptado]`**
Ver D3. Mitigado por el archivo de D4 y por que SECOP sigue publicando el
histórico.

**R4 — `proceso.objeto` no es idéntico a `nombre_del_procedimiento` en 4 de
cada 20.000 filas. `[bajo]`**
*Mitigación:* la columna `nombre` nueva se puebla desde el payload, no desde
`objeto`; no se asume la equivalencia.

**R5 — El export se corrompe o queda incompleto. `[bajo, cubierto]`**
Cubierto por la verificación 1.2, que es bloqueante.

**R6 — `$select` omite un campo que algún módulo usa. `[medio]`**
*Mitigación:* la lista sale de `FIELDS_PROCESOS`/`FIELDS_CONTRATOS`, y un test
comprueba que todo campo referenciado en el código está en el `$select`.

---

## 9. Verificación

Antes y después, mismos comandos, resultados comparables:

```sql
-- tamaño total y por tabla
select pg_size_pretty(pg_database_size(current_database()));
select c.relname, pg_size_pretty(pg_total_relation_size(c.oid))
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where c.relkind='r' and n.nspname='public'
order by pg_total_relation_size(c.oid) desc limit 10;

-- ninguna columna promovida quedó vacía donde el payload tenía dato
select count(*) from proceso p join raw_record r on r.id=p.raw_record_id_actual
where p.descripcion is null and r.payload->>'descripci_n_del_procedimiento' is not null;
```

Criterios de aceptación:

1. `pg_database_size` ≤ 300 MB (objetivo ~287 MB).
1b. `raw_record` ≤ 40 MB y `select count(*) from raw_record where payload is not null` = 0.
2. Las 23 tablas de `public` siguen con RLS activo; 0 sin RLS.
3. `npm run test` en verde.
4. El buscador devuelve los mismos resultados para 10 consultas guardadas.
5. `al:eventos` en seco genera **0 eventos** en la primera corrida posterior.
6. El digest diario renderiza título, entidad y URL en los 3 usuarios.
7. El archivo de Storage tiene 129.511 líneas y su muestra cuadra por SHA-256.
8. El primer barrido tras la fase 4 escribe menos de 15 MB.

---

## 10. Rollback

| Fase | Reversión |
|---|---|
| 0 | `CREATE INDEX` de los tres índices; restaurar `vercel.json` |
| 1 | Nada que revertir: no toca la base |
| 2 | `git revert` del despliegue. Las columnas nuevas quedan vacías e inertes |
| 2.6 | `UPDATE ... SET col = NULL`; las columnas vuelven a estar vacías |
| 3.1 | Recrear las constraints |
| 3.2 | **Punto de no retorno.** La vuelta atrás es la fase 4, o restaurar el archivo de la fase 1 |
| 4 | Quitar `$select`; recrear las constraints |

El rollback real de la fase 3 en adelante es el archivo de Storage. Por eso la
verificación 1.2 es bloqueante.

---

## 11. Lo que este diseño NO hace

- **No toca la compresión.** lz4 da 0%, medido.
- **No borra histórico por antigüedad.** Los 25.415 procesos de 2015–2022 se
  quedan: con el payload fuera, pesan poco y son el activo del producto.
- **No revoca los GRANT de `anon`/`authenticated`.** Refuerzo pendiente
  legítimo (CLAUDE.md §4), pero ajeno a la cuota.
- **No mueve la autenticación.** Supabase Auth se queda donde está.
- **No introduce almacenamiento externo en la ruta de servicio.** El archivo es
  frío: se toca para restaurar, nunca para responder a un usuario.

---

## 12. Recomendación

**Ejecutar la opción B, sin pagar nada.** Los 187 MB están verificados y la
secuencia de la §6 no necesita espacio libre en ningún paso.

Una versión anterior de esta spec usaba `VACUUM FULL` en la fase 3 y de ahí
concluía que hacía falta un mes de plan Pro para tener margen. Era un error de
diseño, no una restricción: `TRUNCATE` hace el mismo trabajo, al instante y con
cero espacio temporal. Con las cinco columnas FK nullable (verificado), el
corte es limpio.

Lo que sí es irreversible es el `TRUNCATE`. La red de seguridad no es el
dinero: es la verificación bloqueante de 1.2 y el hecho de que SECOP sigue
publicando el histórico.
