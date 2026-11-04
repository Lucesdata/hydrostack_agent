# Diagnóstico: ingesta del 18, 20 y 21 de octubre y timeouts de la ficha

**Fecha:** 2026-10-24 · **Método:** solo lectura (Vercel `get_runtime_errors`, Supabase
`execute_sql` con `SELECT` y `EXPLAIN ANALYZE` de consultas `SELECT`; nada escrito, nada
aplicado). Base viva: proyecto `hydrostacks` (eu-west-1), 334 MB.

## Resumen

1. **La ingesta no estuvo caída.** `sync_log` muestra `secop_ii_procesos` en `ok` todos
   los días del 13 al 24 de octubre. Solo falló **una** corrida: `secop_ii_contratos` del
   2026-10-20 (`[57014] canceling statement due to statement timeout`, tras ≈4 min,
   `watermark_to` nulo), y se recuperó al día siguiente (21-oct: 66 contratos, mismo
   `watermark_from` del 15). Los fallos del 18 y el 20 que reportó Vercel son el
   `insert into raw_record` de **contratos**; el del 18 no dejó fila `failed` en
   `sync_log` (esa corrida figura `ok`): consta el error, no si hubo reintento.
2. **El timeout de 300 s del 21** no fue de la ingesta (ambas fuentes terminaron `ok` en
   ≈2 s ese día). Tuvo que ser una etapa posterior del `tick` (detección de eventos,
   filtros, sanciones): **no está diagnosticado**; Hobby retiene 1 h de logs y no hay
   instrumentación por etapa persistida.
3. **Causa principal medida de los timeouts de lectura:** el predicado de «abierto».
   `condicionAbierto()` compara `fecha_recepcion >= (now() at time zone
   'America/Bogota')::date` **dentro del filtro de un seq scan**, y Postgres lo evalúa
   fila a fila (consulta de conteo por departamento de la portada):

   | Variante | Plan | Tiempo |
   |---|---|---|
   | Actual (`(now() at time zone 'America/Bogota')::date` en el `WHERE`) | Seq Scan de `proceso` (93.717 filas), 10.514 páginas en caché | **8.364 ms** |
   | Fecha calculada una vez (`(select (now() at time zone 'America/Bogota')::date)`, InitPlan) | Index Scan `proceso_geografia_tipo_idx` | **174 ms** |
   | Referencia: `count(*)` de `proceso` sin ese filtro | Seq Scan | 362 ms |

   Mismo trabajo y mismas páginas: **48 veces más rápido** con solo calcular la fecha
   una vez. El patrón entró con #119 (2026-10-06, «Abierto» exige recepción vigente) y
   los primeros errores son del 2026-10-09.
4. **`pg_stat_statements` coincide**: las consultas con mayor tiempo total son
   agregados sobre `proceso` con ese filtro (por departamento: 266 llamadas, media
   3,8 s, máx. 12 s; conteo de vitrina: 45 llamadas, media 5,8 s; destacados del hero:
   50, media 4,9 s; mapa por familia: 50, media 2,5 s; entidades: 26, media 3,5 s). Cada
   regeneración ISR de estas páginas ocupa el pool 5–12 s.
5. **Hipótesis de cómo llega a la ficha** (correlación, no probada): las regeneraciones
   lentas ocupan las pocas conexiones del pooler (tope de 3 por instancia) y la CPU
   compartida; la lectura del proceso de la ficha (una consulta por clave única,
   trivial) falla entonces con `EAUTHQUERY auth_query secret check timed out` — el
   pooler no pudo autenticar a tiempo —, 108 veces entre el 9 y el 20. El fallo de
   contratos del 20 (11:56–12:00) cae dentro de la ventana de errores de `/licitaciones`
   de ese día (19-oct 11:11 a 20-oct 12:58). No se pudo leer el log de Postgres de ese
   día (el análisis de Supabase cubre 24 h).
6. **Consulta de competidores** (`al_oferentes_historico ⋈ proceso`, en la ficha): 2.210
   llamadas, media 551 ms, máx. 4,8 s; 38 timeouts. Su índice (`al_hist_proceso_idx`)
   existe. Es el segundo candidato, pero cuesta un orden de magnitud menos que el anterior.

## Estado de índices y migraciones (hallazgo adicional)

- `drizzle.__drizzle_migrations` tiene 25 filas; la última es la de 2026-09-15
  (`0024`). La migración `0025_indices_proceso_id_ficha` **no consta como aplicada**,
  pero sus tres índices (`contrato_proceso_idx`, `proceso_geografia_tipo_idx`,
  `al_hist_proceso_idx`) **sí existen** en la base: se crearon a mano, fuera del
  registro de Drizzle. Cuando se reconcilien las `0025` (PR C) hay que tenerlo en
  cuenta: re-ejecutarla es inocua (`IF NOT EXISTS`), pero el registro y el journal
  seguirán desalineados hasta que se corrija.
- No hay índice sobre `estado_apertura` ni `fecha_recepcion`; con la fecha constante el
  plan ya es de 174 ms, así que no es lo urgente.

## Propuesta (no aplicada)

1. **Arreglo mínimo y reversible:** calcular «hoy en Colombia» una vez por consulta.
   Ocurrencias: `agregados.ts:56` (`condicionAbierto`), `vitrina.ts:158` y `:208`,
   `destacados-portada.ts:74`. Dos formas equivalentes: un subselect escalar (InitPlan) o
   pasar la fecha como parámetro desde el servidor. Sin migración, sin esquema; la
   semántica (día de Colombia) no cambia. Pruebas: las de `condicionAbierto` y vitrina
   contra PGlite, más una prueba que fije que el predicado no se evalúa por fila
   (plan sin la expresión en el filtro) o, al menos, que el SQL generado la contiene como
   subselect.
2. Medir antes y después con `pg_stat_statements` (reiniciar contadores no es necesario:
   comparar medias por consulta) y vigilar `get_runtime_errors` 7 días.
3. Después, instrumentar por etapa el `tick` (duración y resultado de cada etapa en
   `sync_log` o logs), para poder explicar un timeout de 300 s.
4. Solo entonces, la decisión de frescura de `2026-10-24-frescura-ficha.md`.
