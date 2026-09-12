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

## Antes de empezar (checklist de pre-vuelo)

Marcar cada casilla con evidencia real (un comando corrido, un pantallazo, un
link), no de memoria:

- [ ] **Archivo de la Tarea 1 en Storage.** El bucket `raw-archive` en
      Supabase (privado, sin políticas para `anon`/`authenticated`) contiene
      el `.ndjson.gz` subido en el Step 8 de la Tarea 1.
- [ ] **Verificación de conteo (Tarea 1, Step 6) en verde.**
      `gunzip -c raw-archive.ndjson.gz | wc -l` coincide **exactamente** con
      `select count(*) from raw_record`. Si no coincide: NO seguir, el
      cursor del export saltó filas — investigar el export antes de tocar
      nada más.
- [ ] **Verificación por hash de muestra (Tarea 1, Step 7) en verde.** La
      consulta de 1000 filas al azar contra `raw_record` por
      `(source_record_id, payload_hash)` devuelve `0` discrepancias.
- [ ] **Copia local del gzip fuera del repo**, en un disco que no sea el que
      corre este script (Storage es la copia autoritativa; la local es la
      segunda red bajo la red).
- [ ] **Cron pausado.** `/api/cron/tick` está deshabilitado y verificado en el
      panel de Vercel (no solo comentado en `vercel.json` sin desplegar) —
      una ingesta o transform corriendo a mitad del corte puede escribir en
      `raw_record` entre el `DROP CONSTRAINT` y el `TRUNCATE`.
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
   npx tsx scripts/corte-raw-record.ts
   ```
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

4. **Re-ingesta** (repuebla `raw_record` con el payload reducido de la
   Tarea 9, ~27 campos en vez de 61):
   ```bash
   npm run db:ingest
   ```

5. **Transform** (procesa lo recién ingerido hacia las tablas canónicas):
   ```bash
   npm run db:transform
   ```

6. **Recrear las 5 constraints** que el script soltó en el paso 2 (no las
   recrea el script — quedan sueltas a propósito hasta confirmar que la
   re-ingesta funcionó; ver DDL exacto en el docstring de
   `scripts/corte-raw-record.ts`).

7. **Reactivar el cron**: revertir el cambio en `vercel.json` y desplegar.
   Confirmar en el panel de Vercel que `/api/cron/tick` vuelve a correr en
   su horario.

---

## Si algo falla

- **Entre los pasos 2 y 4** (constraints sueltas o `raw_record` truncada,
  pero antes de que la re-ingesta termine): la web sigue sirviendo desde
  `proceso`/`contrato`, que el corte no toca. No hay urgencia — diagnosticar
  con calma antes de reintentar. `raw_record` vacía no rompe nada que lea
  las tablas canónicas.
- **Si la re-ingesta (paso 4) falla o se cuelga**: el archivo de Storage
  tiene el histórico completo. Restaurar con `scripts/export-raw-archive.ts`
  invertido (leer el NDJSON, reinsertar por lotes) antes de reintentar la
  ingesta en vivo.
- **Si el transform (paso 5) falla a mitad de camino**: es re-corrible sin
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
