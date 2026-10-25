# Runbook — aplicar la migración del Lote 1 y ejecutar el relleno sin saturar la base

**Escrito el 2026-10-25**, tras revisar (solo lectura) cómo se aplicaría la migración `0026` de
#158 y qué carga tiene el relleno de #159. Lo ejecuta el propietario. **Nada de esto se ha
aplicado.** Spec y plan: `docs/superpowers/specs/2026-10-24-lote1-datos-columnas.md` y
`docs/superpowers/plans/2026-10-24-lote1-datos-columnas.md` (#157).

## Veredicto

La preocupación es fundada, **no por el tamaño del cambio** (siete `ADD COLUMN` nulables, sin
reescritura de tabla: milisegundos) **sino por los bloqueos**. Aplicarla con `npm run db:migrate`
tal cual **no es seguro** hoy. El procedimiento de abajo evita los tres riesgos medidos.

## Qué se midió

| # | Hallazgo | Evidencia |
|---|---|---|
| 1 | **`db:migrate` aplica todas las migraciones pendientes en una sola transacción**, y los bloqueos se mantienen hasta el final | `drizzle-orm/pg-core/dialect.js` (`session.transaction`) |
| 2 | Pendientes hoy: `0025_indices` **y** `0026`. Los tres índices de `0025` **ya existen** y son idénticos a los del archivo, pero `CREATE INDEX IF NOT EXISTS` sobre un índice existente **igualmente toma un bloqueo `SHARE`** sobre `proceso`, `contrato` y `al_oferentes_historico` (comprobado en una base de prueba). `SHARE` **bloquea escrituras**: la ingesta y el relleno | prueba en PGlite; índices comprobados en la base viva |
| 3 | `ADD COLUMN` toma `ACCESS EXCLUSIVE` (bloquea **también las lecturas**) sobre `contrato` y `proceso` | idem |
| 4 | Si una consulta lenta tiene la tabla abierta, el `ALTER` **espera**, y **todas las consultas nuevas sobre esa tabla hacen cola detrás de él**: eso es lo que satura el pooler. Hoy las consultas de «abiertos» siguen tardando **5–12 s** (media 3,8 s en el conteo por departamento), porque **#155 no está desplegado** | `pg_stat_statements`; #155 sigue en borrador |
| 5 | La migración correría por `DATABASE_URL_SESSION` (pooler en modo sesión, **15 plazas**; ya se agotó una vez, `PENDIENTES.md` §40) | `drizzle.config.ts` |
| 6 | El registro de Drizzle (`drizzle.__drizzle_migrations`) tiene **25 filas** y le falta la de `0025_indices` | consulta a la base viva |

Estado de la base **al revisar** (2026-10-25): 10 conexiones de 60, 0 activas, 0 «idle in
transaction», 0 bloqueos en espera, ninguna transacción abierta. Es decir, **hoy está tranquila**;
el riesgo es de coincidencia con consultas lentas o con la ingesta, no un problema presente.

## Orden de despliegue

1. **#155** (hoy en Colombia una vez por consulta) **desplegado y comprobado**: baja las consultas
   largas de segundos a décimas. Es lo que más reduce el riesgo del bloqueo del punto 4.
2. **Migración** (este runbook).
3. **#158** (código que escribe las columnas): **después** de la migración. Desplegado antes, la
   ingesta fallaría al escribir columnas inexistentes.
4. **Relleno** (#159), en el orden de la sección 3.

## 1. Aplicar la migración sin los tres riesgos

**No ejecutes `npm run db:migrate` ni `drizzle-kit migrate`.** Se aplica a mano, con `lock_timeout`,
una tabla por vez y registrando las migraciones sin ejecutar los `CREATE INDEX` que ya existen.
Todo en el SQL Editor de Supabase (rol `postgres`).

**Cuándo:** madrugada de Colombia (≈ 05:00–10:00 UTC), **nunca entre las 11:00 y las 12:30 UTC**
(ingesta del `tick`). Una persona, sin otra ejecución simultánea.

### 1.0 Comprobaciones previas (todas deben salir como se indica)

```sql
-- (a) Nada lento ni abierto. Debe devolver 0 filas.
select pid, now() - query_start as dur, state, left(query, 80) as consulta
from pg_stat_activity
where datname = current_database() and pid <> pg_backend_pid()
  and ((state = 'active' and now() - query_start > interval '2 seconds')
       or state like 'idle in transaction%');

-- (b) El registro tiene 25 filas y las columnas no existen. Debe dar 25 y 0.
select (select count(*) from drizzle.__drizzle_migrations) as registro,
       (select count(*) from information_schema.columns
         where table_schema = 'public'
           and ((table_name = 'proceso'  and column_name in ('duracion_valor','duracion_unidad'))
             or (table_name = 'contrato' and column_name in ('origen_recursos','destino_gasto',
                 'fuentes_recursos','dias_adicionados','liquidado')))) as columnas;

-- (c) Los tres índices de 0025 existen y son válidos. Debe devolver 3 filas, todas `true`.
select indexname, (select indisvalid from pg_index where indexrelid = ('public.' || indexname)::regclass)
from pg_indexes
where schemaname = 'public'
  and indexname in ('contrato_proceso_idx', 'proceso_geografia_tipo_idx', 'al_hist_proceso_idx');
```

Si (a) devuelve filas, **espera** y repite. Si (c) no da 3 filas válidas, **detente**: entonces sí
habría que crear los índices (con `CREATE INDEX CONCURRENTLY`, fuera de una transacción).

### 1.1 Registrar `0025_indices` sin ejecutarla (sin ningún bloqueo de tabla)

Los índices ya existen; solo falta la fila del registro. Hash y fecha son los que calcula Drizzle
(verificados: el mismo método reproduce el hash de la `0024` que ya consta en el registro).

```sql
insert into drizzle.__drizzle_migrations (hash, created_at)
select '20982c0066c26f4624feb62f53000430e28f4fe7996da9fa684b1878821f2538', 1791663572057
where not exists (select 1 from drizzle.__drizzle_migrations
                  where hash = '20982c0066c26f4624feb62f53000430e28f4fe7996da9fa684b1878821f2538');
```

### 1.2 Las columnas, una tabla por vez y con tope de espera

Cada bloque es **su propia ejecución**. Si falla con `lock_timeout` (error `55P03`), no pasó nada:
ejecuta `rollback;` y repite en un par de minutos. Con 3 s de tope, lo peor que ocurre es que las
consultas de esa tabla esperen hasta 3 s.

```sql
begin;
set local lock_timeout = '3s';
set local statement_timeout = '15s';
alter table proceso
  add column if not exists duracion_valor integer,
  add column if not exists duracion_unidad text;
commit;
```

```sql
begin;
set local lock_timeout = '3s';
set local statement_timeout = '15s';
alter table contrato
  add column if not exists origen_recursos text,
  add column if not exists destino_gasto text,
  add column if not exists fuentes_recursos jsonb,
  add column if not exists dias_adicionados integer,
  add column if not exists liquidado boolean;
commit;
```

### 1.3 Registrar `0026`

```sql
insert into drizzle.__drizzle_migrations (hash, created_at)
select '0c2cb6197e1bf8f7b81ec8847c85c699b1fdc1b047e9c177c28aa9b3c2ec41af', 1792847665430
where not exists (select 1 from drizzle.__drizzle_migrations
                  where hash = '0c2cb6197e1bf8f7b81ec8847c85c699b1fdc1b047e9c177c28aa9b3c2ec41af');
```

> **Si la migración se regenera** (porque otro PR con `0025`/`0026` se fusionó antes), el hash y
> la fecha cambian. Recalcúlalos del archivo final: el hash es
> `shasum -a 256 drizzle/<archivo>.sql` y la fecha es el campo `when` de su entrada en
> `drizzle/meta/_journal.json`. No uses los de arriba con otro archivo.

### 1.4 Comprobación posterior (debe dar 27 y 7)

```sql
select (select count(*) from drizzle.__drizzle_migrations) as registro,
       (select count(*) from information_schema.columns
         where table_schema = 'public'
           and ((table_name = 'proceso'  and column_name in ('duracion_valor','duracion_unidad'))
             or (table_name = 'contrato' and column_name in ('origen_recursos','destino_gasto',
                 'fuentes_recursos','dias_adicionados','liquidado')))) as columnas;
```

Con esto, un `drizzle-kit migrate` posterior ya no tiene nada pendiente. Las demás migraciones en
espera (#39, #97, #112) se regeneran con su número después (ver
`docs/superpowers/specs/2026-10-24-reconciliacion-migraciones.md`).

**Reversión:** las columnas son nulables y nadie las lee hasta desplegar #158; no hace falta
deshacer nada. Quitarlas sería otra migración (`ALTER … DROP COLUMN`, mismo cuidado con el bloqueo).

## 2. Qué carga tiene el relleno

| Medida | Valor |
|---|---|
| Filas a escribir | ≈ 15.320 procesos y ≈ 5.172 contratos (solo las que la fuente trae con dato) |
| Plan del `UPDATE` | `Index Scan` por `proceso_secop_id_uq` / `contrato_secop_id_uq` (comprobado con `EXPLAIN`): barato por fila |
| Actualizaciones «HOT» | **proceso 13 %, contrato 34 %** (`fillfactor` 100): la mayoría **no** es HOT, así que cada fila escribe una versión nueva de la fila y entradas en sus 6 índices |
| Basura generada | tuplas muertas ≈ filas escritas hasta que corre el `VACUUM`; el script lo corre cada 10 lotes (2.000 filas) y al final. Antes de esto, `proceso` tenía el último autovacuum el 09-12 |
| Espacio | transitorio de ≈ 2 MB por cada 10 lotes antes del vacío; neto esperado < 10 MB. Base actual 334,5 MB; el script aborta a 420 MB |
| Registro de escrituras (WAL) | del orden de 15–25 MB en total |
| Coste de red | ≈ 77 + 26 peticiones a Socrata, 1 s de pausa |

El relleno **no bloquea lecturas** (`UPDATE` por fila y `VACUUM` ordinario no toman bloqueos de tabla
que las frenen), pero **compite por CPU** con la web en una base de CPU compartida.

## 3. Ejecutar el relleno (en este orden, parando si algo no cuadra)

Siempre desde una sesión con **#155 ya desplegado** y **fuera de las 11:00–12:30 UTC** (el script se
niega a escribir dentro de esa ventana).

1. **Seco completo** (solo lectura): `npx tsx scripts/relleno-lote1.ts`. Revisa las coberturas.
2. **Prueba pequeña:** `npx tsx scripts/relleno-lote1.ts --max-ids 400 --aplicar`.
3. **Comprueba** (solo lectura): tamaño con `scripts/sql/medir-espacio-ingesta.sql`; que
   `get_runtime_errors` de Vercel no muestre más timeouts; que la consulta de «0 activas / 0 en
   espera» de 1.0 siga igual **mientras** corre.
4. **Contratos y procesos por separado**, una fuente por ejecución:
   `--fuente procesos --aplicar` y luego `--fuente contratos --aplicar`.

**Parar (Ctrl-C) si:** aparecen errores nuevos de `statement timeout` o `EAUTHQUERY` en Vercel, hay
bloqueos en espera, o el tamaño sube más de lo previsto. Es seguro: cada lote es independiente,
idempotente y solo rellena (`coalesce`); se reanuda repitiendo el comando.

## 4. Lo que **no** se ha hecho

No se aplicó ninguna migración, no se escribió en `drizzle.__drizzle_migrations`, no se ejecutó el
relleno con `--aplicar` y no se desplegó nada. Las únicas ejecuciones fueron lecturas
(`SELECT`/`EXPLAIN`) y el modo seco del script sobre 200 ids.
