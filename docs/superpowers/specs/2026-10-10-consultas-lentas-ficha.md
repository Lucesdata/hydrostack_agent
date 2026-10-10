# Consultas lentas en la ficha: análisis (2026-10-10)

Estado: **análisis, sin código ni migración.** Nada de lo propuesto está aplicado.
Cualquier índice es una migración y, por `docs/CONDUCTA.md` §4, necesita plan aprobado.

## Qué se observó

Errores de producción de las últimas 24 h (Vercel, `get_runtime_errors`, 10 grupos),
todos tras el despliegue `dpl_HRG6m8Z…` (PR #134) hasta las 17:36 UTC del 10-oct:

| Consulta | Errores | Origen |
|---|---|---|
| `competidoresComparables` (`al_oferentes_historico` ⋈ `proceso` ⋈ `geografia`) | 62 | `/licitaciones/[slug]` |
| `contratosDeProceso` (`contrato` ⋈ `proveedor` por `proceso_id`) | 30 | `/licitaciones/[slug]` |
| lectura del proceso de la ficha | 24 | `/licitaciones/[slug]` |
| agregados de `/informe`, `/licitaciones/entidades`, portada | 1–2 c/u | páginas ISR |
| «Task timed out after 300 seconds» | 2 | `/informe`, ficha |

Mensaje dominante: `canceling statement due to statement timeout` (SQLSTATE 57014).
Los primeros son del 9-oct 13:03 UTC, **antes** del incidente de las 16:41 y de
activar el SMTP. Con el pool limitado (#134) y el webhook corregido ya no aparecen
`ECHECKOUTTIMEOUT` ni `Gateway Timeout` de Auth.

## Lo que el código dice (verificado leyendo el repo)

1. **`al_oferentes_historico` no tiene índice por `proceso_id`.** La consulta de
   competidores empieza en `proceso` (filtro por `tipo_proyecto`, único índice
   útil: `proceso_tipo_proyecto_idx`), une `geografia` y luego el histórico por
   `h.proceso_id = proceso.id`. Los índices del histórico son
   `(secop_proceso_id, proveedor_key)` único, `(proveedor_nit, fecha_adjudicacion)`,
   `(entidad_id, …)`, `unspsc` y `adjudicado`: ninguno sirve para ese join.
   La tabla es pequeña (~27.000 filas según el comentario de `ficha.ts`), así que
   por sí sola **no debería** tardar segundos.
2. **`contrato` no tiene índice por `proceso_id`.** Sus índices son
   `secop_contrato_id`, `proveedor_id`, `entidad_id`, `estado_actual`. La consulta
   `WHERE proceso_id IN ($1) AND deleted_at IS NULL ORDER BY fecha_firma DESC`
   recorre la tabla entera. Ya estaba anotado en `PENDIENTES.md` §56. `contrato` es
   mucho mayor que el histórico.
3. **La ficha se genera bajo demanda.** `generateStaticParams()` devuelve `[]` y
   `revalidate = 43200`: cada ficha no visitada en 12 h se regenera en la primera
   visita (crawlers incluidos), con cuatro consultas en paralelo
   (`competidoresComparables`, `pliegoDeProceso`, `contratosDeProceso`,
   `cambiosDeProceso`). Muchas fichas a la vez = muchas consultas a la vez.

## Lo que NO está verificado

- **No hay plan de ejecución real.** No tengo acceso a Supabase. No sé si el
  cuello es la falta de índice, la CPU/IO del plan Free o ambos.
- La consulta de competidores toca pocas filas; que agote el tiempo sugiere que la
  base está lenta en general (también fallan `count(*)` simples sobre `proceso`).
  Con ~39.000 filas, el índice faltante de `contrato` es un coste menor, no la causa
  (ver «Corrección»).
- No se ha medido cuánto tarda cada consulta en condiciones normales.

## Corrección (mismo día): los índices faltantes no explican los timeouts

`PENDIENTES.md` §56 y §57 ya medían `contrato` en ~39.000 filas, y el histórico en
~27.000. Un recorrido secuencial de tablas así cuesta milisegundos. Que consultas
tan baratas agoten `statement_timeout`, y que fallen también `count(*)` simples
sobre `proceso`, apunta a **una base sin recursos** (CPU/IO limitados del plan
Free, disco al límite de cuota, bloqueos o conexiones colgadas), no a un índice.
Por eso las opciones A y B de abajo **no se recomiendan como arreglo de la
saturación**: añadirían una migración sin evidencia de que ayude. Lo que decide es
lo que muestra Supabase (Reports → Database, consulta 4 y `show statement_timeout`).

## Qué mediría el propietario (Supabase → SQL Editor, solo lectura)

```sql
-- 1. Tamaños
select relname, n_live_tup from pg_stat_user_tables
where relname in ('proceso','contrato','al_oferentes_historico','geografia') order by 2 desc;

-- 2. Plan de la consulta de contratos (sustituir el uuid por uno real de proceso)
explain (analyze, buffers)
select c.proceso_id, c.fecha_firma, p.razon_social
from contrato c left join proveedor p on p.id = c.proveedor_id
where c.proceso_id in ('<uuid>') and c.deleted_at is null order by c.fecha_firma desc;

-- 3. Plan de competidores (tipo y departamento reales; uuid de la ficha)
explain (analyze, buffers)
select h.proveedor_key, max(h.proveedor_nombre), count(*), count(*) filter (where h.adjudicado)
from proceso pr
join al_oferentes_historico h on h.proceso_id = pr.id
join geografia g on g.codigo_divipola = pr.geografia_id
where pr.tipo_proyecto = 'acueducto' and g.departamento_codigo = '85' and pr.id <> '<uuid>'
group by h.proveedor_key order by count(*) desc, count(*) filter (where h.adjudicado) desc limit 6;

-- 4. Qué ocupa conexiones ahora
select state, wait_event_type, now() - query_start as dur, left(query, 120)
from pg_stat_activity where datname = current_database() and state <> 'idle' order by dur desc limit 20;

-- 5. Límite de tiempo vigente
show statement_timeout;
```

Si el plan 2 muestra `Seq Scan on contrato`, el índice por `proceso_id` está
justificado con evidencia. Si el 3 muestra `Seq Scan on al_oferentes_historico`
con tiempo pequeño, el índice de `proceso_id` ahí no es la causa.

## Opciones, de menor a mayor riesgo

| # | Cambio | Toca | Riesgo | Cuándo |
|---|---|---|---|---|
| A | Índice `contrato(proceso_id)` (`CREATE INDEX CONCURRENTLY`) | esquema / migración | bajo en lectura; el build del índice usa I/O en una base ya cargada | solo si el plan 2 lo confirma |
| B | Índice `al_oferentes_historico(proceso_id)` | esquema / migración | bajo | solo si el plan 3 lo confirma |
| C | Que la ficha degrade sin bloquear: tiempo máximo por consulta y bloque vacío si falla (ya hay `error` en el historial de cambios) | `ficha.ts`, `page.tsx` | medio: cambia lo que ve el visitante en fallo | si A/B no bastan |
| D | Precalcular competidores comparables por (tipo, departamento) en el `tick` diario | ingesta / esquema | alto: tabla nueva con RLS | solo si lo medido lo exige |
| E | Subir de plan o cambiar de región de Vercel (`iad1` ↔ base en `eu-west-1`) | cuenta / infraestructura | decisión de coste del propietario | fuera de código |

Recomendación: **no escribir código ni migraciones.** Ejecutar las consultas 2, 3, 4 y 5 y
decidir con el plan real. Si el plan 2 muestra el recorrido secuencial, A es un
cambio pequeño y reversible (`DROP INDEX`); crear el índice con `CONCURRENTLY`
fuera de una transacción de migración y fuera de la hora de ingesta (11:00 UTC).

## Criterios de aceptación de cualquier arreglo

- `get_runtime_errors` a 24 h sin `57014` en `/licitaciones/[slug]`.
- El tiempo de `EXPLAIN ANALYZE` de las consultas 2 y 3 baja de segundos a
  milisegundos con los mismos parámetros.
- Ninguna ficha deja de renderizar si una consulta falla.

## Medición en Supabase y arreglo aplicado (2026-10-10, lecturas + una migración)

Con el conector de Supabase (proyecto `hydrostacks`, plan Free, 327 MB, 25 de 60
conexiones, `statement_timeout` 2 min). `pg_stat_statements` antes del arreglo:

| Consulta | Llamadas | Media | Total | Máximo |
|---|---|---|---|---|
| competidores comparables | 28.441 | 2,0 s | 57.419 s | 109 s |
| contratos de la ficha | 8.407 | 1,8 s | 15.400 s | 118 s |

Los planes mostraban `Seq Scan on contrato` (5.108 buffers) y un `Bitmap Heap Scan`
de 32.213 filas de `proceso` para quedarse con 642, todo en caché: la CPU del plan
Free es lo que convierte ese trabajo en segundos. **Esto corrige la sección
anterior:** con una CPU tan escasa, los índices sí importan.

Aplicado en producción (migración `indices_proceso_id_ficha`, `IF NOT EXISTS`):
`contrato(proceso_id)`, `al_oferentes_historico(proceso_id)` y
`proceso(geografia_id, tipo_proyecto)`. Resultado con los mismos parámetros:

| Consulta | Antes | Después |
|---|---|---|
| contratos de una ficha | 2.557 ms, 5.108 buffers | 4,5 ms, 10 buffers |
| competidores (acueducto, dpto 85) | 2.582 ms, 10.906 buffers | 395 ms, 2.056 buffers |

Reversión: `DROP INDEX contrato_proceso_idx, al_hist_proceso_idx, proceso_geografia_tipo_idx;`

Pendiente: competidores sigue en ~400 ms con esta CPU. Si los errores `57014` no
desaparecen, la siguiente medida es cachear ese resultado por (tipo, departamento),
unas 165 combinaciones frente a decenas de miles de ejecuciones.
