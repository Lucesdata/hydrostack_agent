# Runbook — corte de `raw_record` (2026-09-12)

Punto de no retorno del plan de adelgazamiento (`.superpowers/sdd/2026-09-12-adelgazamiento-raw-record/`).
Este documento es lo que sigue el operador mientras ejecuta `scripts/corte-raw-record.ts`
contra la base viva de Supabase. **No improvisar sobre la marcha** — si algo
no coincide con lo esperado en un paso, parar ahí y leer la sección
"Si algo falla" antes de seguir.

Quién lo ejecuta: el operador humano, con el usuario presente. Ningún agente
corre estos comandos por su cuenta — ver la restricción de alcance de la
Tarea 11 en el plan.

---

## Qué hace el corte y por qué es irreversible

`scripts/corte-raw-record.ts`:

1. Suelta 5 constraints de foreign key que apuntan a `raw_record`.
2. `TRUNCATE raw_record` — borra las 129.511 filas de la tabla y devuelve
   sus ~287 MB al sistema operativo al instante.
3. Recrea los 5 índices que la Tarea 10 (opcional) pudo haber soltado.

El `TRUNCATE` no tiene deshacer. La única copia de esas 129.511 filas después
de este paso es el archivo NDJSON gzip de la Tarea 1. Si ese archivo no existe
o no fue verificado, **el corte destruye datos sin copia de respaldo.**

---

## Orden de despliegue

`0023` (columnas promovidas en `proceso`/`contrato`, `payload` nullable) es
**aditiva e instantánea** — no reescribe filas existentes, no bloquea, no
tiene downtime propio. Aun así el orden importa:

1. **`npm run db:migrate` PRIMERO, antes del deploy del branch.** Si el
   deploy sale antes que la migración, `db-search.ts`, `recientes.ts` y
   `buscar-candidatos.ts` referencian columnas que todavía no existen en la
   Supabase viva y **toda consulta de búsqueda falla con `42703`**
   (`column does not exist`) hasta que la migración corra. `npm run build`
   no migra solo.
2. Deploy del branch (con los crons ya pausados, ver checklist debajo).
3. El resto de este runbook (export → corte → re-ingesta → transform).

---

## Antes de empezar (checklist de pre-vuelo)

Marcar cada casilla con evidencia real (un comando corrido, un pantallazo, un
link), no de memoria:

- [ ] **Export corrido y auto-verificado.** `scripts/export-raw-archive.ts`
      escribe el `.ndjson.gz` local y, desde este round, **se verifica solo**:
      relee el gzip, cuenta líneas, compara contra
      `select count(*) from raw_record`, y sale con código != 0 y un mensaje
      en mayúsculas si no coinciden. Correrlo así, con la ruta que quede
      fuera del repo y en un disco que no sea el que corre el script (un
      reboot entre el export y el corte no debe perder la única copia local):
      ```bash
      npx tsx scripts/export-raw-archive.ts /ruta/fuera/del/repo/raw-archive.ndjson.gz
      ```
      Si el script sale con código != 0, **NO seguir** — investigar la
      discrepancia antes de tocar nada más. Un exit limpio (0) con la línea
      `verificado: N filas en el archivo == N en raw_record` es la única
      señal válida de que el archivo es un respaldo completo.
- [ ] **Archivo subido a Supabase Storage.** No hay script para esto — es un
      paso manual. Con el bucket privado `raw-archive` ya creado (sin
      políticas para `anon`/`authenticated`):
      ```bash
      supabase storage cp /ruta/fuera/del/repo/raw-archive.ndjson.gz \
        ss:///raw-archive/raw-archive-$(date +%Y%m%d).ndjson.gz \
        --experimental
      ```
      o, sin la CLI de Supabase, subir el archivo a mano desde el panel de
      Storage del proyecto. Confirmar en el panel que el objeto quedó con el
      tamaño esperado (~44 MB para el volumen actual) antes de marcar esta
      casilla.
- [ ] **Copia local del gzip conservada** en el disco donde se corrió el
      export (Storage es la copia autoritativa; la local es la segunda red
      bajo la red) — no borrarla hasta confirmar el corte completo.
- [ ] **Cron pausado.** `/api/cron/tick` **y** `/api/cron/alertas` están
      deshabilitados y verificados en el panel de Vercel (no solo comentados
      en `vercel.json` sin desplegar) — una ingesta o transform corriendo a
      mitad del corte puede escribir en `raw_record` entre el
      `DROP CONSTRAINT` y el `TRUNCATE`, y el digest diario de `alertas` lee
      `proceso.url` sin fallback al payload: entre el deploy de este branch y
      el backfill (paso 1 más abajo) saldría con todos los links vacíos si
      quedara corriendo.
- [ ] **Conteos de referencia anotados**, para comparar después:
      - `select count(*) from raw_record` → ______
      - `select count(*) from proceso` → ______
      - `select count(*) from contrato` → ______
      - `select pg_size_pretty(pg_database_size(current_database()))` → ______
- [ ] **Nadie más con una sesión abierta a la base** (drizzle-kit studio,
      un cliente psql, un dev server con `DB_DRIVER=node` apuntando a prod)
      que pueda competir por locks durante el `TRUNCATE` o leer un estado
      intermedio.

Si cualquier casilla queda sin marcar, **no ejecutar el script**. Ninguna
prisa justifica saltarse la red de seguridad de un `TRUNCATE`.

---

## Ejecución

Seguir el orden exacto. No paralelizar pasos.

1. **Relleno opcional (Tarea 10), si no se corrió ya:**
   ```bash
   npx tsx scripts/rellenar-columnas.ts
   ```
   Puede abortar solo si la base supera 492 MB — es intencional, seguir al
   paso 2 igual.

2. **Correr el corte:**
   ```bash
   CONFIRM_CORTE=si npx tsx scripts/corte-raw-record.ts
   ```
   Sin `CONFIRM_CORTE=si` el script se niega a correr (no toca el pool ni la
   base) e imprime en stderr qué va a destruir y qué verificar antes de
   reintentar. Ponla solo después de marcar el checklist de pre-vuelo.
   El script imprime el tamaño y el conteo de `raw_record` antes de tocar
   nada, cada constraint que suelta, la confirmación del `TRUNCATE`, cada
   índice que recrea, y el tamaño final. Leer esa salida en vivo, no solo
   el código de salida al terminar.

3. **Verificar el tamaño resultante:**
   ```sql
   select pg_size_pretty(pg_database_size(current_database())) db,
          (select count(*) from raw_record) raw_filas,
          (select count(*) from proceso) procesos,
          (select count(*) from contrato) contratos;
   ```
   Esperado: la base cae a **~217 MB** (198 MB del `TRUNCATE` + ~19 MB de los
   índices recreados), `raw_filas = 0`, y `procesos`/`contratos` **iguales**
   a los conteos anotados en el pre-vuelo — el corte no debe quitar ni una
   fila de las tablas canónicas.

4. **Neutralizar el watermark ANTES de re-ingestar.** `npm run db:ingest`
   arranca desde `max(sync_log.watermark_to)` con `status in ('ok','partial')`
   (`src/lib/ingest/dbIngest.ts`) — y el `TRUNCATE` del paso 2 **no toca
   `sync_log`**. Sin este paso, `db:ingest` no re-descarga el histórico: solo
   trae el día más reciente, y ~90.000 procesos quedan con `fase`,
   `adjudicado`, `valor_adjudicacion`, `adjudicatario`, `nit_adjudicatario`,
   `fecha_adjudicacion`, `estado_apertura` y `fecha_recepcion` en NULL para
   siempre, con el payload que los tenía ya destruido por el `TRUNCATE`.
   ```sql
   update sync_log set status = 'superseded'
   where source in ('secop_ii_procesos','secop_ii_contratos')
     and status in ('ok','partial');
   ```
   `sync_log.status` es `text` libre, sin `enum` ni `check constraint`
   (`src/lib/db/schema/control.ts`) — `'superseded'` no choca con nada. Esto
   preserva el historial de corridas (no se borran filas) y hace que
   `windowStart(null)` en `src/lib/ingest/watermark.ts` devuelva `null` = sin
   cota inferior = backfill completo en el próximo `db:ingest`.

5. **Re-ingesta** (repuebla `raw_record` con el payload reducido de la
   Tarea 9, ~27 campos en vez de 61 — y ahora sí trae el histórico completo,
   gracias al paso 4):
   ```bash
   npm run db:ingest
   ```

6. **Transform** (procesa lo recién ingerido hacia las tablas canónicas):
   ```bash
   npm run db:transform
   ```

7. **Recrear las 5 constraints** que el script soltó en el paso 2 (no las
   recrea el script — quedan sueltas a propósito hasta confirmar que la
   re-ingesta funcionó):
   ```sql
   alter table proceso
     add constraint proceso_raw_record_id_actual_raw_record_id_fk
     foreign key (raw_record_id_actual) references raw_record(id);

   alter table contrato
     add constraint contrato_raw_record_id_actual_raw_record_id_fk
     foreign key (raw_record_id_actual) references raw_record(id);

   alter table transform_quarantine
     add constraint transform_quarantine_raw_record_id_raw_record_id_fk
     foreign key (raw_record_id) references raw_record(id);

   alter table al_proceso_evento
     add constraint al_proceso_evento_raw_record_id_raw_record_id_fk
     foreign key (raw_record_id) references raw_record(id);

   alter table al_oferentes_historico
     add constraint al_oferentes_historico_raw_record_id_raw_record_id_fk
     foreign key (raw_record_id) references raw_record(id);
   ```
   Si alguna falla por UUIDs huérfanos que quedaron de antes del corte
   (filas cuya columna apunta a un `raw_record.id` que la re-ingesta nunca
   volvió a crear), limpiarlos y reintentar esa constraint:
   ```sql
   update <tabla> set <columna> = null
    where <columna> is not null
      and <columna> not in (select id from raw_record);
   ```

8. **Reactivar los dos crons**: revertir el cambio en `vercel.json`
   (`/api/cron/tick` y `/api/cron/alertas` de vuelta al array) y desplegar.
   Confirmar en el panel de Vercel que ambos vuelven a correr en su horario.
   No reactivar `alertas` antes de que el transform (paso 6) haya corrido al
   menos una vez sobre la re-ingesta — si no, el primer digest después del
   corte sale con links vacíos otra vez.

---

## Si algo falla

- **Entre los pasos 2 y 5** (constraints sueltas o `raw_record` truncada,
  pero antes de que la re-ingesta termine): la web sigue sirviendo desde
  `proceso`/`contrato`, que el corte no toca. No hay urgencia — diagnosticar
  con calma antes de reintentar. `raw_record` vacía no rompe nada que lea
  las tablas canónicas.
- **Si la re-ingesta (paso 5) falla o se cuelga**: el archivo de Storage
  tiene el histórico completo, pero **no existe ningún script de restore** —
  `scripts/export-raw-archive.ts` solo exporta y verifica, no tiene modo
  inverso. Restaurar es un procedimiento manual:
  1. Descargar el objeto de Storage al disco local:
     `supabase storage cp ss:///raw-archive/<archivo>.ndjson.gz ./restaurado.ndjson.gz --experimental`
     (o desde el panel de Storage).
  2. Reinsertar por lotes contra `raw_record`, por ejemplo con `psql` y
     `\copy` sobre un NDJSON convertido, o un script ad-hoc que lea
     `gunzip -c restaurado.ndjson.gz` línea a línea y haga
     `insert into raw_record (id, source, source_record_id, payload_hash, ingested_at, payload) values (...) on conflict (id) do nothing`
     por lotes — este script no existe todavía en el repo; escribirlo en el
     momento si se llega a este punto, reusando `serializarLote`/`FilaArchivo`
     de `src/lib/archivo/exportar.ts` como referencia del formato de cada línea.
  3. Solo después de confirmar el conteo restaurado, reintentar `db:ingest`
     (con el watermark ya neutralizado en el paso 4).
- **Si el transform (paso 6) falla a mitad de camino**: es re-corrible sin
  efectos secundarios — vuelve a procesar solo lo pendiente. No requiere
  deshacer nada del corte.
- **Si algo en el paso 2 sale mal y el script muere a mitad** (por ejemplo,
  una de las `create index if not exists` falla por una razón distinta a
  "ya existe"): el script no hace rollback automático de lo ya soltado o
  truncado — revisar manualmente qué constraints/índices quedaron en el
  estado esperado con `\d raw_record`, `\d proceso`, `\d contrato` antes de
  volver a correrlo. Los `drop`/`create` son idempotentes (`if exists` /
  `if not exists`), así que re-correr el script completo es seguro.
- **Si el tamaño después del corte no baja a ~217 MB**: no seguir con la
  re-ingesta. Puede significar que el `TRUNCATE` no corrió (revisar la
  salida del script) o que hay otra tabla creciendo en paralelo — investigar
  antes de repoblar `raw_record`.
