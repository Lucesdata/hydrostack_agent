# Adelgazamiento de `raw_record` — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bajar la base de 474 MB a ~270 MB promoviendo a columnas los 13 campos
que se leen del payload en caliente, y convirtiendo `raw_record.payload` en un
buffer transitorio en lugar de un almacén permanente.

**Architecture:** Tres movimientos independientes. (1) Los 8 módulos que hoy leen
`raw_record.payload` pasan a leer columnas de `proceso`/`contrato`, con
`coalesce` al payload durante la transición. (2) El transform vacía el payload de
las filas que consume, así que en régimen `raw_record` solo guarda linaje. (3) Un
corte único —soltar 5 FK, `TRUNCATE raw_record`, recrear índices— devuelve
287 MB al instante, y la re-ingesta repuebla con `$select`.

**Tech Stack:** Next.js 14.2.3, Drizzle ORM sobre Postgres (Supabase), vitest,
Socrata/SODA, Supabase Storage.

**Spec:** `docs/superpowers/specs/2026-09-11-adelgazamiento-raw-record-design.md`

## Global Constraints

- **Presupuesto cero.** Ningún paso puede requerir subir de plan.
- **Ningún paso puede necesitar más de 26 MB libres**, salvo la Tarea 10, que
  corre después de soltar índices (45 MB disponibles) y está acotada a +30 MB.
- **Toda tabla nueva nace con `.enableRLS()`** (CLAUDE.md §4). Este plan no crea
  tablas; `proceso` y `contrato` ya la tienen y no se toca.
- **El idioma del código y los comentarios es español**, siguiendo el repo.
- **Nombres de columna en `snake_case`**, propiedades Drizzle en `camelCase`.
- **El cron debe estar pausado** desde la Tarea 9 hasta la Tarea 12.
- Tests: `npx vitest run <ruta>`. Suite completa: `npm run test`.
- Migraciones: `npm run db:generate` para crear, `npm run db:migrate` para
  aplicar. Hoy hay 23 aplicadas y 23 en repo, sin deriva.

---

## Estructura de archivos

| Archivo | Responsabilidad | Acción |
|---|---|---|
| `src/lib/db/schema/hechos.ts` | Columnas nuevas en `proceso` y `contrato` | Modificar |
| `src/lib/db/schema/raw.ts` | `payload` pasa a nullable | Modificar |
| `drizzle/0024_*.sql` | Migración generada | Crear |
| `src/lib/transform/mapCanonical.ts` | Proyecta los 13 campos nuevos | Modificar |
| `src/lib/transform/writers.ts` | Persiste los campos nuevos | Modificar |
| `src/lib/transform/orchestrator.ts` | Vacía el payload consumido | Modificar |
| `src/lib/secop/db-search.ts` | 9 lecturas de payload → columnas | Modificar |
| `src/lib/al/matching/buscar-candidatos.ts` | 3 lecturas → columnas | Modificar |
| `src/lib/al/notificacion/recopilar.ts` | 3 lecturas → columnas | Modificar |
| `src/lib/secop/recientes.ts` | `urlRaw` → `proceso.url` | Modificar |
| `src/lib/al/eventos/correr.ts` | Diff desde columnas | Modificar |
| `src/lib/al/historico/mapear.ts` | Firma pasa a fila canónica | Modificar |
| `src/lib/ingest/campos.ts` | **Lista `$select` derivada de FIELDS_\*** | Crear |
| `src/lib/ingest/sodaFetch.ts` | Manda `$select` | Modificar |
| `scripts/export-raw-archive.ts` | Export + verificación | Crear |
| `scripts/rellenar-columnas.ts` | Relleno retroactivo por lotes | Crear |
| `scripts/corte-raw-record.ts` | FKs + TRUNCATE + índices | Crear |
| `docs/runbook-corte-raw-record.md` | Runbook de ejecución | Crear |

**Orden de dependencias:** T1 (independiente) → T2 → T3 → T4 → T5-T8 (paralelas
entre sí) → T9 → T10 → T11 → T12.

---

### Task 1: Export del histórico a Supabase Storage

Independiente de todo lo demás. Es la red de seguridad del `TRUNCATE`, así que
va primero y su verificación es bloqueante.

**Files:**
- Create: `scripts/export-raw-archive.ts`
- Create: `src/lib/archivo/exportar.ts`
- Test: `src/__tests__/archivo/exportar.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `serializarLote(filas: FilaArchivo[]): string` — NDJSON, una línea
  por fila, terminada en `\n`. `FilaArchivo = { id: string; source: string;
  sourceRecordId: string; payloadHash: string; ingestedAt: string; payload:
  Record<string, unknown> }`.

- [ ] **Step 1: Escribir el test que falla**

```typescript
// src/__tests__/archivo/exportar.test.ts
import { describe, it, expect } from "vitest";
import { serializarLote, type FilaArchivo } from "@/src/lib/archivo/exportar";

const fila = (id: string): FilaArchivo => ({
  id,
  source: "secop_ii_procesos",
  sourceRecordId: `CO1.REQ.${id}`,
  payloadHash: "abc123",
  ingestedAt: "2026-09-12T00:00:00.000Z",
  payload: { nombre_del_procedimiento: "Acueducto", precio_base: "1000" },
});

describe("serializarLote", () => {
  it("emite una línea NDJSON por fila, terminada en salto", () => {
    const out = serializarLote([fila("1"), fila("2")]);
    const lineas = out.split("\n").filter(Boolean);
    expect(lineas).toHaveLength(2);
    expect(JSON.parse(lineas[0]).sourceRecordId).toBe("CO1.REQ.1");
    expect(out.endsWith("\n")).toBe(true);
  });

  it("conserva el payload íntegro y sin reordenar claves del contenido", () => {
    const out = serializarLote([fila("1")]);
    const parsed = JSON.parse(out.trim());
    expect(parsed.payload).toEqual({
      nombre_del_procedimiento: "Acueducto",
      precio_base: "1000",
    });
  });

  it("un lote vacío produce cadena vacía, no un salto suelto", () => {
    expect(serializarLote([])).toBe("");
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run src/__tests__/archivo/exportar.test.ts`
Expected: FAIL — `Cannot find module '@/src/lib/archivo/exportar'`

- [ ] **Step 3: Implementar lo mínimo**

```typescript
// src/lib/archivo/exportar.ts
/**
 * Serialización del archivo frío de `raw_record` (spec §D4).
 *
 * NDJSON en vez de un array JSON: permite escribir y verificar por lotes sin
 * cargar 129.511 payloads en memoria, y `wc -l` cuenta filas directamente.
 */

export interface FilaArchivo {
  id: string;
  source: string;
  sourceRecordId: string;
  payloadHash: string;
  ingestedAt: string;
  payload: Record<string, unknown>;
}

export function serializarLote(filas: FilaArchivo[]): string {
  if (filas.length === 0) return "";
  return filas.map((f) => JSON.stringify(f)).join("\n") + "\n";
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx vitest run src/__tests__/archivo/exportar.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Escribir el script de export**

```typescript
// scripts/export-raw-archive.ts
/**
 * Exporta raw_record a NDJSON gzip y lo sube a Supabase Storage.
 *
 * Lee por lotes con cursor sobre la PK (no OFFSET: con 129.511 filas el OFFSET
 * degrada a O(n²)). Mide 44 MB comprimidos para el volumen actual.
 *
 *   npx tsx scripts/export-raw-archive.ts
 */
import { createGzip } from "zlib";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { asc, gt } from "drizzle-orm";
import { db } from "@/src/lib/db/client";
import { rawRecord } from "@/src/lib/db/schema";
import { serializarLote, type FilaArchivo } from "@/src/lib/archivo/exportar";

const LOTE = 2000;
const DESTINO = "/tmp/raw-archive.ndjson.gz";

async function* lotes(): AsyncGenerator<string> {
  let cursor = "00000000-0000-0000-0000-000000000000";
  let total = 0;
  for (;;) {
    const filas = await db
      .select({
        id: rawRecord.id,
        source: rawRecord.source,
        sourceRecordId: rawRecord.sourceRecordId,
        payloadHash: rawRecord.payloadHash,
        ingestedAt: rawRecord.ingestedAt,
        payload: rawRecord.payload,
      })
      .from(rawRecord)
      .where(gt(rawRecord.id, cursor))
      .orderBy(asc(rawRecord.id))
      .limit(LOTE);

    if (filas.length === 0) break;
    cursor = filas[filas.length - 1].id;
    total += filas.length;
    process.stderr.write(`\rexportadas ${total}`);

    yield serializarLote(
      filas.map((f) => ({
        id: f.id,
        source: f.source,
        sourceRecordId: f.sourceRecordId,
        payloadHash: f.payloadHash,
        ingestedAt: f.ingestedAt.toISOString(),
        payload: f.payload as Record<string, unknown>,
      })) satisfies FilaArchivo[]
    );
  }
  process.stderr.write(`\ntotal: ${total}\n`);
}

await pipeline(Readable.from(lotes()), createGzip({ level: 9 }), createWriteStream(DESTINO));
console.log(`escrito ${DESTINO}`);
```

- [ ] **Step 6: Ejecutar el export y verificarlo**

```bash
npx tsx scripts/export-raw-archive.ts
gzip -t /tmp/raw-archive.ndjson.gz && echo "gzip íntegro"
gunzip -c /tmp/raw-archive.ndjson.gz | wc -l
```

Expected: el conteo debe coincidir **exactamente** con
`select count(*) from raw_record`. Si no coincide, PARAR: el cursor saltó filas.

- [ ] **Step 7: Verificación por hash de una muestra**

```bash
gunzip -c /tmp/raw-archive.ndjson.gz | shuf -n 1000 | \
  node -e "
    let l='';process.stdin.on('data',d=>l+=d).on('end',()=>{
      const ids=l.trim().split('\n').map(x=>JSON.parse(x));
      console.log(ids.map(r=>\`('\${r.sourceRecordId}','\${r.payloadHash}')\`).join(','));
    });" > /tmp/muestra.txt
```

Luego, contra la base:

```sql
-- 0 filas = el archivo cuadra con la base
select count(*) from (values <pegar /tmp/muestra.txt>) v(srid, h)
left join raw_record r on r.source_record_id = v.srid and r.payload_hash = v.h
where r.id is null;
```

Expected: `0`. **Si no es 0, PARAR y no continuar con el plan.**

- [ ] **Step 8: Subir a Supabase Storage (bucket privado)**

Crear el bucket `raw-archive` en el panel de Supabase, **privado**, sin
políticas para `anon` ni `authenticated` (spec §D4). Subir el fichero por el
panel o con la CLI. Guardar además una copia local fuera del repo.

- [ ] **Step 9: Commit**

```bash
git add src/lib/archivo/exportar.ts src/__tests__/archivo/exportar.test.ts scripts/export-raw-archive.ts
git commit -m "feat(archivo): export NDJSON gzip de raw_record a Storage

Red de seguridad del TRUNCATE de la fase 3. Cursor sobre la PK para no
degradar con OFFSET. 44 MB comprimidos para 129.511 filas.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Columnas nuevas en `proceso` y `contrato`

**Files:**
- Modify: `src/lib/db/schema/hechos.ts:18-50` (proceso), `:57-97` (contrato)
- Modify: `src/lib/db/schema/raw.ts` (payload nullable)
- Create: `drizzle/0024_*.sql` (generada)

**Interfaces:**
- Consumes: nada.
- Produces: las columnas Drizzle `proceso.descripcion`, `proceso.url`,
  `proceso.unspsc`, `proceso.fase`, `proceso.adjudicado`,
  `proceso.valorAdjudicacion`, `proceso.adjudicatario`,
  `proceso.nitAdjudicatario`, `proceso.fechaAdjudicacion`,
  `proceso.estadoApertura`, `proceso.fechaRecepcion`, `contrato.unspsc`,
  `contrato.url`. Todas nullable. Tipos: `text` salvo `adjudicado` (`boolean`),
  `valorAdjudicacion` (`money`, es decir `numeric(20,2)`), y
  `fechaAdjudicacion`/`fechaRecepcion` (`date`).

- [ ] **Step 1: Añadir las 11 columnas a `proceso`**

En `src/lib/db/schema/hechos.ts`, dentro de `pgTable("proceso", {...})`, justo
antes de `rawRecordIdActual`:

```typescript
    // ── Campos promovidos desde raw_record.payload (2026-09-12) ──────────────
    // Se leían en caliente por db-search, matching, digest y el detector de
    // adendas vía JOIN a raw_record. Promoverlos a columnas es lo que permite
    // vaciar el payload: los mismos datos pesan 49% como columnas y 80% como
    // jsonb, porque jsonb repite los nombres de clave en cada fila.
    descripcion: text("descripcion"), // descripci_n_del_procedimiento
    url: text("url"), // urlproceso.url
    unspsc: text("unspsc"), // codigo_principal_de_categoria, con prefijo "V1."
    fase: text("fase"),
    adjudicado: boolean("adjudicado"),
    valorAdjudicacion: money("valor_adjudicacion"),
    adjudicatario: text("adjudicatario"), // nombre_del_proveedor (NO nombre_del_adjudicador)
    nitAdjudicatario: text("nit_adjudicatario"),
    fechaAdjudicacion: date("fecha_adjudicacion"),
    estadoApertura: text("estado_apertura"), // Abierto | Cerrado — señal real de plazo
    fechaRecepcion: date("fecha_recepcion"),
```

- [ ] **Step 2: Añadir las 2 columnas a `contrato`**

En el mismo archivo, dentro de `pgTable("contrato", {...})`, antes de
`rawRecordIdActual`:

```typescript
    // ── Promovidos desde raw_record.payload (2026-09-12) ─────────────────────
    // El resto de campos de contrato ya estaba en columnas; solo estos dos se
    // leían del payload.
    unspsc: text("unspsc"), // codigo_de_categoria_principal
    url: text("url"), // urlproceso.url
```

- [ ] **Step 3: Hacer `payload` nullable**

En `src/lib/db/schema/raw.ts`, cambiar la línea de `payload`:

```typescript
    // Registro original tal cual llegó. NULLABLE desde 2026-09-12: el payload
    // es un BUFFER, no un almacén — el transform lo consume y lo vacía en el
    // mismo ciclo (ver transform/orchestrator.ts). En régimen solo tiene
    // contenido lo pendiente de transformar.
    payload: jsonb("payload"),
```

- [ ] **Step 4: Generar la migración**

Run: `npm run db:generate`
Expected: crea `drizzle/0024_*.sql` con 13 `ADD COLUMN` y un
`ALTER COLUMN payload DROP NOT NULL`.

- [ ] **Step 5: Revisar la migración a ojo**

```bash
cat drizzle/0024_*.sql
```

Expected: **solo** `ALTER TABLE ... ADD COLUMN` y `DROP NOT NULL`. Si aparece
cualquier `DROP TABLE`, `DROP COLUMN` o recreación de índices, PARAR: drizzle-kit
detectó una deriva que no es de este cambio.

- [ ] **Step 6: Verificar que las columnas nullable sin default no reescriben**

Comprobar el tamaño antes y después de aplicar: en PG 11+ un `ADD COLUMN`
nullable sin default es metadata pura.

```bash
npm run db:migrate
```

```sql
select pg_size_pretty(pg_database_size(current_database()));
```

Expected: el mismo valor que antes (±1 MB). Si subió más, algo reescribió.

- [ ] **Step 7: Correr la suite completa**

Run: `npm run test`
Expected: PASS. Las columnas nuevas son nullable y nadie las lee aún.

- [ ] **Step 8: Commit**

```bash
git add src/lib/db/schema/hechos.ts src/lib/db/schema/raw.ts drizzle/
git commit -m "feat(db): columnas promovidas en proceso y contrato; payload nullable

11 columnas en proceso y 2 en contrato para los campos que se leían del
payload en caliente. payload pasa a nullable: será un buffer que el
transform consume y vacía.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: El transform proyecta los campos nuevos

**Files:**
- Modify: `src/lib/transform/mapCanonical.ts`
- Test: `src/__tests__/transform/mapCanonical.test.ts`

**Interfaces:**
- Consumes: las columnas de la Tarea 2.
- Produces: `ProcesoProjection` gana `descripcion, url, unspsc, fase,
  adjudicado: boolean | null, valorAdjudicacion: number | null, adjudicatario,
  nitAdjudicatario, fechaAdjudicacion: string | null, estadoApertura,
  fechaRecepcion: string | null`. `ContratoProjection` gana `unspsc: string |
  null, url: string | null`. `mapProcesoRow` y `mapContratoRow` mantienen su
  firma `(row: SodaRow) => Projection`.

- [ ] **Step 1: Escribir los tests que fallan**

Añadir a `src/__tests__/transform/mapCanonical.test.ts`:

```typescript
describe("mapProcesoRow — campos promovidos", () => {
  it("extrae la url de dentro del objeto urlproceso", () => {
    const p = mapProcesoRow({
      id_del_proceso: "CO1.REQ.1",
      urlproceso: { url: "https://community.secop.gov.co/x" },
    });
    expect(p.url).toBe("https://community.secop.gov.co/x");
  });

  it("url es null cuando urlproceso no trae objeto", () => {
    expect(mapProcesoRow({ id_del_proceso: "CO1.REQ.1" }).url).toBeNull();
    expect(mapProcesoRow({ id_del_proceso: "CO1.REQ.1", urlproceso: "x" }).url).toBeNull();
  });

  it("adjudicado convierte 'Si'/'No' a boolean", () => {
    expect(mapProcesoRow({ id_del_proceso: "a", adjudicado: "Si" }).adjudicado).toBe(true);
    expect(mapProcesoRow({ id_del_proceso: "a", adjudicado: "No" }).adjudicado).toBe(false);
    expect(mapProcesoRow({ id_del_proceso: "a" }).adjudicado).toBeNull();
  });

  it("conserva el unspsc crudo con su prefijo de versión", () => {
    const p = mapProcesoRow({ id_del_proceso: "a", codigo_principal_de_categoria: "V1.83101500" });
    expect(p.unspsc).toBe("V1.83101500");
  });

  it("descripcion es independiente de objeto", () => {
    const p = mapProcesoRow({
      id_del_proceso: "a",
      nombre_del_procedimiento: "Acueducto",
      descripci_n_del_procedimiento: "Construcción de red de acueducto veredal",
    });
    expect(p.objeto).toBe("Acueducto");
    expect(p.descripcion).toBe("Construcción de red de acueducto veredal");
  });
});

describe("mapContratoRow — campos promovidos", () => {
  it("extrae unspsc y url", () => {
    const c = mapContratoRow({
      id_contrato: "CO1.PCCNTR.1",
      codigo_de_categoria_principal: "V1.83101500",
      urlproceso: { url: "https://community.secop.gov.co/y" },
    });
    expect(c.unspsc).toBe("V1.83101500");
    expect(c.url).toBe("https://community.secop.gov.co/y");
  });
});
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

Run: `npx vitest run src/__tests__/transform/mapCanonical.test.ts`
Expected: FAIL — `p.url` es `undefined`, no `null`.

- [ ] **Step 3: Añadir el helper de url y los campos a las interfaces**

En `src/lib/transform/mapCanonical.ts`, añadir tras `parseLocalizacion`:

```typescript
/**
 * `urlproceso` llega como objeto `{ url: "..." }`, no como string. Verificado
 * sobre payloads reales: 100% de las filas que lo traen usan esa forma.
 */
function urlDe(value: unknown): string | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  return cleanText((value as Record<string, unknown>)["url"]);
}
```

Añadir a `ProcesoProjection`:

```typescript
  descripcion: string | null;
  url: string | null;
  unspsc: string | null;
  fase: string | null;
  adjudicado: boolean | null;
  valorAdjudicacion: number | null;
  adjudicatario: string | null;
  nitAdjudicatario: string | null;
  fechaAdjudicacion: string | null;
  estadoApertura: string | null;
  fechaRecepcion: string | null;
```

Añadir a `ContratoProjection`:

```typescript
  unspsc: string | null;
  url: string | null;
```

- [ ] **Step 4: Poblarlos en los mapeadores**

En `mapProcesoRow`, añadir antes de `entidad:`:

```typescript
    descripcion: cleanText(row["descripci_n_del_procedimiento"]),
    url: urlDe(row["urlproceso"]),
    unspsc: cleanText(row["codigo_principal_de_categoria"]),
    fase: cleanText(row["fase"]),
    adjudicado: parseBool(row["adjudicado"]),
    valorAdjudicacion: parseMoney(row["valor_total_adjudicacion"]),
    adjudicatario: cleanText(row["nombre_del_proveedor"]),
    nitAdjudicatario: cleanText(row["nit_del_proveedor_adjudicado"]),
    fechaAdjudicacion: parseDate(row["fecha_adjudicacion"]),
    estadoApertura: cleanText(row["estado_de_apertura_del_proceso"]),
    fechaRecepcion: parseDate(row["fecha_de_recepcion_de"]),
```

En `mapContratoRow`, añadir antes de `entidad:`:

```typescript
    unspsc: cleanText(row["codigo_de_categoria_principal"]),
    url: urlDe(row["urlproceso"]),
```

- [ ] **Step 5: Correr los tests**

Run: `npx vitest run src/__tests__/transform/mapCanonical.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/transform/mapCanonical.ts src/__tests__/transform/mapCanonical.test.ts
git commit -m "feat(transform): proyecta los 13 campos promovidos

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Los writers persisten los campos nuevos

**Files:**
- Modify: `src/lib/transform/writers.ts:195-245` (procesos), bloque equivalente de contratos
- Test: `src/__tests__/transform/writers-campos.test.ts`

**Interfaces:**
- Consumes: `ProcesoProjection` y `ContratoProjection` de la Tarea 3.
- Produces: `batchUpsertProcesos` y `batchUpsertContratos` mantienen su firma
  `(db: Db, items: Item[]) => Promise<number>`, pero escriben las 13 columnas.

- [ ] **Step 1: Escribir el test que falla**

```typescript
// src/__tests__/transform/writers-campos.test.ts
import { describe, it, expect } from "vitest";
import { mapProcesoRow, mapContratoRow } from "@/src/lib/transform/mapCanonical";

/**
 * Contrato estructural: toda propiedad promovida de la proyección tiene que
 * tener una columna en el INSERT. Sin este test, añadir un campo a la
 * proyección y olvidarlo en el writer pasa desapercibido — la columna queda
 * NULL en silencio y el fallback al payload lo tapa hasta que el payload se va.
 */
const PROMOVIDOS_PROCESO = [
  "descripcion", "url", "unspsc", "fase", "adjudicado", "valorAdjudicacion",
  "adjudicatario", "nitAdjudicatario", "fechaAdjudicacion", "estadoApertura",
  "fechaRecepcion",
] as const;

const PROMOVIDOS_CONTRATO = ["unspsc", "url"] as const;

describe("proyecciones promovidas", () => {
  it("mapProcesoRow expone las 11 propiedades promovidas", () => {
    const p = mapProcesoRow({ id_del_proceso: "CO1.REQ.1" });
    for (const k of PROMOVIDOS_PROCESO) expect(p).toHaveProperty(k);
  });

  it("mapContratoRow expone las 2 propiedades promovidas", () => {
    const c = mapContratoRow({ id_contrato: "CO1.PCCNTR.1" });
    for (const k of PROMOVIDOS_CONTRATO) expect(c).toHaveProperty(k);
  });
});
```

- [ ] **Step 2: Correr el test**

Run: `npx vitest run src/__tests__/transform/writers-campos.test.ts`
Expected: PASS si la Tarea 3 está hecha. Si falla, la Tarea 3 quedó incompleta.

- [ ] **Step 3: Añadir las columnas al INSERT de procesos**

En `src/lib/transform/writers.ts`, dentro de `batchUpsertProcesos`, en el
`.values(...)`, añadir tras `estadoCodigo: proj.estadoCodigo,`:

```typescript
            descripcion: proj.descripcion,
            url: proj.url,
            unspsc: proj.unspsc,
            fase: proj.fase,
            adjudicado: proj.adjudicado,
            valorAdjudicacion:
              proj.valorAdjudicacion !== null ? String(proj.valorAdjudicacion) : null,
            adjudicatario: proj.adjudicatario,
            nitAdjudicatario: proj.nitAdjudicatario,
            fechaAdjudicacion: proj.fechaAdjudicacion,
            estadoApertura: proj.estadoApertura,
            fechaRecepcion: proj.fechaRecepcion,
```

- [ ] **Step 4: Añadirlas al `onConflictDoUpdate`**

En el mismo bloque, tras `estadoCodigo: sql\`excluded.estado_codigo\`,`:

```typescript
            descripcion: sql`excluded.descripcion`,
            url: sql`excluded.url`,
            unspsc: sql`excluded.unspsc`,
            fase: sql`excluded.fase`,
            adjudicado: sql`excluded.adjudicado`,
            valorAdjudicacion: sql`excluded.valor_adjudicacion`,
            adjudicatario: sql`excluded.adjudicatario`,
            nitAdjudicatario: sql`excluded.nit_adjudicatario`,
            fechaAdjudicacion: sql`excluded.fecha_adjudicacion`,
            estadoApertura: sql`excluded.estado_apertura`,
            fechaRecepcion: sql`excluded.fecha_recepcion`,
```

- [ ] **Step 5: Lo mismo para contratos**

En `batchUpsertContratos`, añadir al `.values(...)`:

```typescript
            unspsc: proj.unspsc,
            url: proj.url,
```

Y al `onConflictDoUpdate`:

```typescript
            unspsc: sql`excluded.unspsc`,
            url: sql`excluded.url`,
```

- [ ] **Step 6: Correr la suite completa**

Run: `npm run test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/transform/writers.ts src/__tests__/transform/writers-campos.test.ts
git commit -m "feat(transform): los writers persisten los campos promovidos

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: `db-search.ts` lee de columnas

El consumidor más grande: 9 lecturas del payload. Usa `coalesce` a payload
durante la transición — las columnas están vacías hasta la Tarea 10.

**Files:**
- Modify: `src/lib/secop/db-search.ts:126-205`
- Test: `src/__tests__/secop/db-search-columnas.test.ts`

**Interfaces:**
- Consumes: columnas de la Tarea 2.
- Produces: la forma del resultado de `buscarProcesos` **no cambia** — los
  campos siguen llamándose `nombreRaw`, `descripcionRaw`, `faseRaw`,
  `unspscRaw`, `adjudicadoRaw`, `valorAdjudicacionRaw`, `adjudicatarioRaw`,
  `estadoAperturaRaw`, `urlRaw`. Solo cambia de dónde salen.

- [ ] **Step 1: Escribir el test que falla**

```typescript
// src/__tests__/secop/db-search-columnas.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

/**
 * Test de grano grueso sobre el SQL generado: no hay base en CI, así que lo
 * que se verifica es que el módulo ya no dependa del payload para estos
 * campos. Se sustituye por asserts sobre datos reales en la Tarea 12.
 */
describe("db-search ya no lee el payload para los campos promovidos", () => {
  const src = readFileSync("src/lib/secop/db-search.ts", "utf8");

  it("no quedan accesos directos payload->>F.<campo promovido>", () => {
    for (const campo of ["nombre", "descripcion", "fase", "unspsc", "adjudicado"]) {
      expect(src).not.toMatch(new RegExp(`\\$\\{payload\\}->>\\$\\{F\\.${campo}\\}`));
    }
  });

  it("usa coalesce contra las columnas nuevas", () => {
    expect(src).toContain("coalesce");
    expect(src).toContain("proceso.descripcion");
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run src/__tests__/secop/db-search-columnas.test.ts`
Expected: FAIL — el fichero aún contiene `${payload}->>${F.nombre}`

- [ ] **Step 3: Sustituir las 9 lecturas**

En `src/lib/secop/db-search.ts`, reemplazar las expresiones. Patrón, aplicado a
cada campo:

```typescript
  // ANTES: sql`(${payload}->>${F.nombre})`
  // El coalesce es temporal: vive hasta que la Tarea 10 rellene las columnas
  // y la Tarea 12 lo retire. Mientras tanto la web funciona con cualquiera de
  // las dos fuentes, que es lo que permite desplegar esto sin ventana.
  const nombreRaw = sql<string | null>`coalesce(${proceso.objeto}, ${payload}->>${F.nombre})`;
  const descripcionRaw = sql<string | null>`coalesce(${proceso.descripcion}, ${payload}->>${F.descripcion})`;
  const faseRaw = sql<string | null>`coalesce(${proceso.fase}, ${payload}->>${F.fase})`;
  const unspscRaw = sql<string | null>`coalesce(${proceso.unspsc}, ${payload}->>${F.unspsc})`;
  const adjudicadoRaw = sql<string | null>`coalesce(case when ${proceso.adjudicado} then 'Si' when ${proceso.adjudicado} is false then 'No' end, ${payload}->>${F.adjudicado})`;
  const valorAdjudicacionRaw = sql<string | null>`coalesce(${proceso.valorAdjudicacion}::text, ${payload}->>${F.valorAdjudicacion})`;
  const adjudicatarioRaw = sql<string | null>`coalesce(${proceso.adjudicatario}, ${payload}->>${F.adjudicatario})`;
  const estadoAperturaRaw = sql<string | null>`coalesce(${proceso.estadoApertura}, ${payload}->>${F.estadoApertura})`;
  const urlRaw = sql<string | null>`coalesce(${proceso.url}, ${payload}->${F.url}->>'url')`;
```

**Ojo con `urlRaw`:** hoy devuelve el objeto `urlproceso` entero
(`${payload}->${F.url}`), no la cadena. La columna nueva guarda solo la cadena.
Revisar los consumidores de `urlRaw` en `app/` y ajustarlos para recibir
`string | null` en vez de `{ url: string }`.

- [ ] **Step 4: Correr el test**

Run: `npx vitest run src/__tests__/secop/db-search-columnas.test.ts`
Expected: PASS

- [ ] **Step 5: Comprobar los consumidores de `urlRaw`**

```bash
grep -rn "urlRaw" src app --include='*.ts' --include='*.tsx'
```

Ajustar cada uno para tratar `urlRaw` como `string | null`.

- [ ] **Step 6: Suite completa y typecheck**

Run: `npm run test && npx tsc --noEmit`
Expected: PASS ambos

- [ ] **Step 7: Commit**

```bash
git add src/lib/secop/db-search.ts src/__tests__/secop/db-search-columnas.test.ts app/
git commit -m "refactor(db-search): lee de columnas con coalesce al payload

urlRaw pasa de objeto {url} a string; consumidores ajustados.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: matching, digest y recientes leen de columnas

**Files:**
- Modify: `src/lib/al/matching/buscar-candidatos.ts:61-79`
- Modify: `src/lib/al/notificacion/recopilar.ts:50-56`
- Modify: `src/lib/secop/recientes.ts:116-121`
- Test: `src/__tests__/matching/buscar-candidatos-columnas.test.ts`

**Interfaces:**
- Consumes: columnas de la Tarea 2.
- Produces: `buscarCandidatos` mantiene `ResultadoBusqueda { items:
  ProcesoEvaluable[]; truncado: boolean }` y `ProcesoEvaluable` mantiene sus
  campos `nombre`, `descripcion`, `unspsc`. `recopilar` mantiene `titulo`,
  `entidad`, `url`.

- [ ] **Step 1: Escribir el test que falla**

```typescript
// src/__tests__/matching/buscar-candidatos-columnas.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

describe("matching ya no depende de raw_record", () => {
  const src = readFileSync("src/lib/al/matching/buscar-candidatos.ts", "utf8");

  it("no hace JOIN a raw_record", () => {
    expect(src).not.toContain("leftJoin(rawRecord");
  });

  it("lee descripcion y unspsc de proceso", () => {
    expect(src).toContain("proceso.descripcion");
    expect(src).toContain("proceso.unspsc");
  });
});
```

- [ ] **Step 2: Correr el test**

Run: `npx vitest run src/__tests__/matching/buscar-candidatos-columnas.test.ts`
Expected: FAIL — `leftJoin(rawRecord` sigue presente

- [ ] **Step 3: Reescribir el select de matching**

En `src/lib/al/matching/buscar-candidatos.ts`, sustituir el bloque del select
(líneas 61-79). Se elimina el JOIN entero: `proceso.objeto` **es**
`nombre_del_procedimiento` (verificado 19.996/20.000), así que `nombre` sale de
`objeto` y no hace falta el payload.

```typescript
  const rows = await db
    .select({
      secopProcesoId: proceso.secopProcesoId,
      objeto: proceso.objeto,
      modalidad: proceso.modalidad,
      divipola: proceso.geografiaId,
      entidadNit: entidad.nitCanonico,
      valorEstimado: sql<string | null>`${proceso.valorEstimado}::text`,
      nombre: proceso.objeto,
      descripcion: proceso.descripcion,
      unspscRaw: proceso.unspsc,
    })
    .from(proceso)
    .leftJoin(entidad, eq(entidad.id, proceso.entidadId))
    .where(and(...condiciones))
    .limit(limite);
```

Eliminar la línea `const payload = sql\`${rawRecord.payload}\`;` y el import de
`rawRecord` si queda sin uso.

- [ ] **Step 4: Reescribir el digest**

En `src/lib/al/notificacion/recopilar.ts`, sustituir el bloque SQL de los
campos de display:

```sql
  p.objeto                                      AS titulo,
  e.nombre                                      AS entidad,
  p.url                                         AS url,
```

Añadir el `LEFT JOIN entidad e ON e.id = p.entidad_id` si no está, y quitar el
JOIN a `raw_record`.

- [ ] **Step 5: Reescribir recientes**

En `src/lib/secop/recientes.ts:116`, sustituir:

```typescript
      urlRaw: proceso.url,
```

y eliminar el `.leftJoin(rawRecord, ...)` de la línea 121.

- [ ] **Step 6: Correr tests y typecheck**

Run: `npm run test && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/al/matching/buscar-candidatos.ts src/lib/al/notificacion/recopilar.ts src/lib/secop/recientes.ts src/__tests__/matching/
git commit -m "refactor(al): matching, digest y recientes leen de columnas

Eliminado el JOIN a raw_record en los tres. proceso.objeto ya es
nombre_del_procedimiento (19.996/20.000 verificado).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: eventos e histórico leen de columnas

El detector de adendas compara el payload actual contra `al_proceso_estado`.
Pasa a comparar la fila de `proceso` contra `al_proceso_estado`.

**Files:**
- Modify: `src/lib/al/eventos/correr.ts:65-125`
- Modify: `src/lib/al/historico/mapear.ts:129-170`
- Test: `src/__tests__/al/eventos-columnas.test.ts`

**Interfaces:**
- Consumes: columnas de la Tarea 2.
- Produces: `estadoDesdeProceso(fila: FilaProceso): EstadoProceso` reemplaza a
  `estadoDesdePayload(payload)`. `FilaProceso` es el row del select de
  `correr.ts`. `EstadoProceso` es el mismo tipo que ya inserta en
  `alProcesoEstado`. `filaAdjudicatario` pasa de `(payload, ctx, rawRecordId)`
  a `(fila: FilaProceso, ctx, rawRecordId)`.

- [ ] **Step 1: Escribir el test que falla**

```typescript
// src/__tests__/al/eventos-columnas.test.ts
import { describe, it, expect } from "vitest";
import { estadoDesdeProceso } from "@/src/lib/al/eventos/correr";

describe("estadoDesdeProceso", () => {
  it("mapea la fila canónica al snapshot de al_proceso_estado", () => {
    const e = estadoDesdeProceso({
      secopProcesoId: "CO1.REQ.1",
      estadoActual: "Presentación de oferta",
      estadoApertura: "Abierto",
      valorEstimado: "1000.00",
      modalidad: "Licitación pública",
      fechaRecepcion: "2026-10-01",
      adjudicado: false,
      valorAdjudicacion: null,
      nitAdjudicatario: null,
      objeto: "Acueducto",
      descripcion: "Red veredal",
    });
    expect(e.estado).toBe("Presentación de oferta");
    expect(e.estadoApertura).toBe("Abierto");
    expect(e.adjudicado).toBe(false);
    expect(e.objetoHash).toHaveLength(64);
  });

  it("el objetoHash cambia si cambia la descripción", () => {
    const base = {
      secopProcesoId: "CO1.REQ.1", estadoActual: null, estadoApertura: null,
      valorEstimado: null, modalidad: null, fechaRecepcion: null,
      adjudicado: null, valorAdjudicacion: null, nitAdjudicatario: null,
      objeto: "Acueducto",
    };
    const a = estadoDesdeProceso({ ...base, descripcion: "uno" });
    const b = estadoDesdeProceso({ ...base, descripcion: "dos" });
    expect(a.objetoHash).not.toBe(b.objetoHash);
  });
});
```

- [ ] **Step 2: Correr el test**

Run: `npx vitest run src/__tests__/al/eventos-columnas.test.ts`
Expected: FAIL — `estadoDesdeProceso` no está exportada

- [ ] **Step 3: Reescribir el select y el mapeo en `correr.ts`**

Sustituir el `leftJoin(rawRecord, ...)` y `payload: rawRecord.payload` por las
columnas de `proceso`, y renombrar `estadoDesdePayload` a `estadoDesdeProceso`
cambiando cada `payload["campo"]` por la propiedad correspondiente de la fila:

| Antes | Después |
|---|---|
| `payload[F.estado]` | `fila.estadoActual` |
| `payload[F.estadoApertura]` | `fila.estadoApertura` |
| `payload[F.precioBase]` | `fila.valorEstimado` |
| `payload[F.modalidad]` | `fila.modalidad` |
| `payload[F.fechaRecepcion]` | `fila.fechaRecepcion` |
| `payload[F.adjudicadoFlag]` | `fila.adjudicado` |
| `payload[F.valorAdjudicacion]` | `fila.valorAdjudicacion` |
| `payload[F.nitAdjudicatario]` | `fila.nitAdjudicatario` |
| `payload[F.nombre]` + `payload[F.descripcion]` | `fila.objeto` + `fila.descripcion` (para `objetoHash`) |

Exportar `estadoDesdeProceso` para que el test la vea.

- [ ] **Step 4: Cambiar la firma de `filaAdjudicatario`**

En `src/lib/al/historico/mapear.ts`, cambiar la firma para recibir la fila
canónica en lugar del payload. Sustituciones:

| Antes | Después |
|---|---|
| `payload.adjudicado` (`"si"`) | `fila.adjudicado === true` |
| `payload.nombre_del_proveedor` | `fila.adjudicatario` |
| `payload.id_del_proceso` | `fila.secopProcesoId` |
| `payload.nit_del_proveedor_adjudicado` | `fila.nitAdjudicatario` |
| `payload.nit_entidad` | `ctx.entidadNit` |
| `payload.codigo_principal_de_categoria` | `fila.unspsc` |
| `payload.modalidad_de_contratacion` | `fila.modalidad` |

- [ ] **Step 5: Actualizar los llamadores**

```bash
grep -rn "estadoDesdePayload\|filaAdjudicatario" src --include='*.ts'
```

Ajustar cada uno.

- [ ] **Step 6: Tests y typecheck**

Run: `npm run test && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/al/eventos/ src/lib/al/historico/ src/__tests__/al/
git commit -m "refactor(al): eventos e histórico leen de columnas canónicas

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: `$select` derivado de los mapas de campos

Corta el crecimiento futuro. La lista sale de `FIELDS_PROCESOS`/
`FIELDS_CONTRATOS`, nunca escrita a mano: un campo que alguien añada al mapa
entra solo, y el test lo garantiza.

**Files:**
- Create: `src/lib/ingest/campos.ts`
- Modify: `src/lib/ingest/sodaFetch.ts`, `src/lib/ingest/pagination.ts`
- Test: `src/__tests__/ingest/campos.test.ts`

**Interfaces:**
- Consumes: `FIELDS_PROCESOS`, `FIELDS_CONTRATOS` de `secop/config.ts`;
  `volatileFields` de `ingest/sources.ts`.
- Produces: `camposDe(source: IngestSourceKey): string[]` (ordenados, sin
  duplicados) y `selectDe(source: IngestSourceKey): string` (la lista separada
  por comas, lista para `$select`). `SodaPageParams` gana `$select?: string`.

- [ ] **Step 1: Escribir el test que falla**

```typescript
// src/__tests__/ingest/campos.test.ts
import { describe, it, expect } from "vitest";
import { camposDe, selectDe } from "@/src/lib/ingest/campos";
import { FIELDS_PROCESOS, FIELDS_CONTRATOS } from "@/src/lib/secop/config";
import { SOURCE_PROCESOS, SOURCE_CONTRATOS } from "@/src/lib/ingest/sources";

describe("camposDe", () => {
  it("incluye todos los campos de FIELDS_PROCESOS", () => {
    const campos = camposDe("secop_ii_procesos");
    for (const f of Object.values(FIELDS_PROCESOS)) expect(campos).toContain(f);
  });

  it("incluye todos los campos de FIELDS_CONTRATOS", () => {
    const campos = camposDe("secop_ii_contratos");
    for (const f of Object.values(FIELDS_CONTRATOS)) expect(campos).toContain(f);
  });

  it("incluye el watermark, sin el cual el incremental no avanza", () => {
    expect(camposDe("secop_ii_procesos")).toContain(SOURCE_PROCESOS.watermarkField);
    expect(camposDe("secop_ii_contratos")).toContain(SOURCE_CONTRATOS.watermarkField);
  });

  it("incluye los campos que el transform consume y no están en FIELDS_*", () => {
    const p = camposDe("secop_ii_procesos");
    for (const f of ["id_del_portafolio", "id_estado_del_procedimiento", "ordenentidad"]) {
      expect(p).toContain(f);
    }
    const c = camposDe("secop_ii_contratos");
    for (const f of ["proceso_de_compra", "localizaci_n", "es_grupo", "orden", "rama",
                     "sector", "tipodocproveedor", "nombre_representante_legal",
                     "descripcion_del_proceso"]) {
      expect(c).toContain(f);
    }
  });

  it("no tiene duplicados", () => {
    const c = camposDe("secop_ii_procesos");
    expect(new Set(c).size).toBe(c.length);
  });

  it("selectDe produce una lista separada por comas sin espacios", () => {
    const s = selectDe("secop_ii_procesos");
    expect(s).not.toContain(" ");
    expect(s.split(",")).toEqual(camposDe("secop_ii_procesos"));
  });
});
```

- [ ] **Step 2: Correr el test**

Run: `npx vitest run src/__tests__/ingest/campos.test.ts`
Expected: FAIL — módulo no encontrado

- [ ] **Step 3: Implementar**

```typescript
// src/lib/ingest/campos.ts
/**
 * Qué campos pide la ingesta a Socrata (`$select`).
 *
 * Hasta 2026-09-12 no se mandaba `$select` y aterrizaban los 61 campos del
 * dataset para usar 23. La lista se DERIVA de los mapas de campos, nunca se
 * escribe a mano: un campo nuevo en `FIELDS_*` entra solo, y el test de
 * cobertura falla si alguien lo añade a un consumidor sin añadirlo al mapa.
 *
 * `EXTRA_*` recoge lo que el transform consume directamente por nombre sin
 * pasar por `FIELDS_*` — son reales y su ausencia rompe el transform en
 * silencio (geografía o entidad quedarían nulas).
 */

import { FIELDS_PROCESOS, FIELDS_CONTRATOS } from "@/src/lib/secop/config";
import { SOURCE_PROCESOS, SOURCE_CONTRATOS, type IngestSourceKey } from "./sources";

/** Consumidos por mapProcesoRow sin estar en FIELDS_PROCESOS. */
const EXTRA_PROCESOS = [
  "id_del_portafolio", // → proceso.portafolio_id, llave de enlace con contrato (D11/H1)
  "id_estado_del_procedimiento", // → proceso.estado_codigo
  "ordenentidad", // → entidad.nivel_gobierno
] as const;

/** Consumidos por mapContratoRow sin estar en FIELDS_CONTRATOS. */
const EXTRA_CONTRATOS = [
  "proceso_de_compra", // → resolución proceso↔contrato por portafolio (D11/H1)
  "localizaci_n", // → geografía PRIMARIA en contratos (D25)
  "es_grupo", // → proveedor.es_estructura_plural
  "orden", // → entidad.nivel_gobierno
  "rama", // → entidad.raw_attrs.rama
  "sector", // → entidad.sector_administrativo
  "tipodocproveedor", // → canonicalizeNit + proveedor.tipo_documento
  "nombre_representante_legal", // → proveedor.raw_attrs.representante_legal
  "descripcion_del_proceso", // → fallback de contrato.objeto
  "el_contrato_puede_ser_prorrogado", // → contrato.prorrogable
  "fecha_de_inicio_del_contrato",
  "fecha_de_fin_del_contrato",
  "valor_facturado",
  "valor_pagado",
  "valor_pendiente_de_pago",
] as const;

export function camposDe(source: IngestSourceKey): string[] {
  const [mapa, extra, src] =
    source === "secop_ii_procesos"
      ? [FIELDS_PROCESOS, EXTRA_PROCESOS, SOURCE_PROCESOS]
      : [FIELDS_CONTRATOS, EXTRA_CONTRATOS, SOURCE_CONTRATOS];

  return [
    ...new Set<string>([
      ...Object.values(mapa as Record<string, string>),
      ...extra,
      src.watermarkField,
    ]),
  ].sort();
}

export function selectDe(source: IngestSourceKey): string {
  return camposDe(source).join(",");
}
```

- [ ] **Step 4: Correr el test**

Run: `npx vitest run src/__tests__/ingest/campos.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Mandar el `$select` en el fetch**

En `src/lib/ingest/pagination.ts`, añadir `$select?: string` a `SodaPageParams`.
En `src/lib/ingest/sodaFetch.ts`, tras la línea de `$order`:

```typescript
  if (params.$select) url.searchParams.set("$select", params.$select);
```

Y actualizar el docstring del módulo: ya no aterriza "todos los campos".

- [ ] **Step 6: Cablear el `$select` en el bucle**

En `runIngest.ts` y `runSweep`, donde se construyen los `SodaPageParams`,
añadir `$select: selectDe(source.source as IngestSourceKey)`.

- [ ] **Step 7: Verificar contra Socrata en vivo**

```bash
curl -s "https://www.datos.gov.co/resource/p6dx-8zbt.json?\$limit=1&\$select=$(node -e "
  require('tsx/cjs');
  console.log(require('./src/lib/ingest/campos.ts').selectDe('secop_ii_procesos'))")" | head -c 2000
```

Expected: JSON con solo los campos pedidos. Un `400` significa que un campo del
`$select` no existe en el dataset — corregir el nombre en `FIELDS_*` o `EXTRA_*`.

- [ ] **Step 8: Tests y commit**

```bash
npm run test && npx tsc --noEmit
git add src/lib/ingest/campos.ts src/lib/ingest/sodaFetch.ts src/lib/ingest/pagination.ts src/lib/ingest/runIngest.ts src/__tests__/ingest/campos.test.ts
git commit -m "feat(ingest): \$select derivado de FIELDS_*, deja de traer 61 campos

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: El payload pasa a ser un buffer

El transform vacía las filas que consume. Esto es lo que mantiene `raw_record`
en ~36 MB en régimen. **A partir de aquí el cron debe estar pausado.**

**Files:**
- Modify: `src/lib/transform/orchestrator.ts`
- Modify: `vercel.json`
- Test: `src/__tests__/transform/vaciado.test.ts`

**Interfaces:**
- Consumes: nada de tareas previas.
- Produces: `vaciarPayloads(db: Db, ids: string[]): Promise<number>` — devuelve
  el número de filas vaciadas. Idempotente: vaciar una fila ya vacía no falla.

- [ ] **Step 1: Pausar el cron**

En `vercel.json`, comentar la entrada de `/api/cron/tick` dejando solo alertas:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    { "path": "/api/cron/alertas", "schedule": "0 12 * * *" }
  ]
}
```

Desplegar. **Verificar en el panel de Vercel que el cron ya no aparece
programado antes de seguir.**

- [ ] **Step 2: Escribir el test que falla**

```typescript
// src/__tests__/transform/vaciado.test.ts
import { describe, it, expect, vi } from "vitest";
import { vaciarPayloads } from "@/src/lib/transform/orchestrator";

describe("vaciarPayloads", () => {
  it("no toca la base con una lista vacía", async () => {
    const db = { update: vi.fn() };
    const n = await vaciarPayloads(db as never, []);
    expect(n).toBe(0);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("vacía en un solo statement por lote", async () => {
    const returning = vi.fn().mockResolvedValue([{ id: "a" }, { id: "b" }]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    const db = { update: vi.fn().mockReturnValue({ set }) };
    const n = await vaciarPayloads(db as never, ["a", "b"]);
    expect(n).toBe(2);
    expect(db.update).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 3: Correr el test**

Run: `npx vitest run src/__tests__/transform/vaciado.test.ts`
Expected: FAIL — `vaciarPayloads` no está exportada

- [ ] **Step 4: Implementar**

En `src/lib/transform/orchestrator.ts`:

```typescript
/**
 * Vacía el payload de las filas ya transformadas (spec §D3 / §2.4).
 *
 * El payload es un BUFFER: la ingesta lo escribe, el transform lo consume y
 * aquí se suelta. Correr esto al final y solo con las filas que se
 * transformaron SIN error es lo que da la garantía de reintento — si el
 * transform falló, el payload sigue ahí para la próxima corrida.
 *
 * Idempotente: vaciar una fila ya vacía es un no-op en Postgres.
 */
export async function vaciarPayloads(db: Db, ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const filas = await db
    .update(rawRecord)
    .set({ payload: null })
    .where(inArray(rawRecord.id, ids))
    .returning({ id: rawRecord.id });
  return filas.length;
}
```

Añadir `inArray` al import de `drizzle-orm` si falta.

- [ ] **Step 5: Llamarlo al final de ambos transforms**

En `transformProcesos` y en `transformContratos`, como última sentencia de cada
función (después de los `batchUpsert*`). El array `pending` ya es exactamente el
conjunto correcto: las filas que van a cuarentena hacen `continue` antes de
entrar en él, así que **conservan su payload** y se pueden reprocesar a mano.

```typescript
  // El payload es un buffer: las filas que llegaron hasta aquí ya están
  // proyectadas a columnas, así que se suelta. Las de cuarentena no pasan por
  // `pending` y conservan el suyo — son justo las que hay que poder reprocesar.
  m.payloadsVaciados = await vaciarPayloads(
    db,
    pending.map(({ snap }) => snap.id)
  );
```

Añadir `payloadsVaciados: number` a `SourceMetrics` y a `emptyMetrics()`
(`orchestrator.ts:61` y `:82`), junto a `cuarentena`.

- [ ] **Step 6: Correr tests**

Run: `npm run test && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/transform/orchestrator.ts src/__tests__/transform/vaciado.test.ts vercel.json
git commit -m "feat(transform): el payload pasa a ser buffer; cron pausado

vaciarPayloads suelta el jsonb de las filas transformadas sin error. Las
de cuarentena lo conservan para poder reprocesarlas.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: Relleno retroactivo de las columnas

Rellena desde el payload existente, **solo los tres campos que sostienen el
buscador**, para que el corte de la Tarea 11 no se note en la web.

**Files:**
- Create: `scripts/rellenar-columnas.ts`

**Interfaces:**
- Consumes: columnas de la Tarea 2.
- Produces: nada que consuma otro código. Es un script de una sola ejecución.

- [ ] **Step 1: Soltar los índices recreables para hacer sitio**

```sql
DROP INDEX contrato_proveedor_idx;   -- 1384 kB, 0 escaneos
DROP INDEX contrato_entidad_idx;     -- 672 kB, 0 escaneos
DROP INDEX contrato_estado_idx;      -- 528 kB, 3 escaneos
DROP INDEX proceso_portafolio_idx;   -- 6656 kB, recreable
DROP INDEX proceso_doc_access_idx;   -- 1200 kB, recreable
```

Verificar: `select pg_size_pretty(pg_database_size(current_database()));`
Expected: ~455 MB (bajó ~19 MB). Margen disponible: 45 MB.

- [ ] **Step 2: Escribir el script**

```typescript
// scripts/rellenar-columnas.ts
/**
 * Relleno retroactivo de descripcion, url y unspsc en `proceso`.
 *
 * SOLO estos tres: son los que sostienen el buscador, y juntos caben en el
 * margen disponible (~30 MB de los 45 MB que deja soltar índices). El resto de
 * columnas las puebla la re-ingesta de la Tarea 12.
 *
 * Por lotes con VACUUM entre medias: cada UPDATE deja tuplas muertas, y sin
 * vacuum intermedio la tabla crece el doble de lo necesario.
 *
 *   npx tsx scripts/rellenar-columnas.ts
 */
import { sql } from "drizzle-orm";
import { db } from "@/src/lib/db/client";

const LOTE = 2000;

for (let vuelta = 1; ; vuelta++) {
  const res = await db.execute(sql`
    with pendientes as (
      select p.id,
             r.payload->>'descripci_n_del_procedimiento' as descripcion,
             r.payload->'urlproceso'->>'url'             as url,
             r.payload->>'codigo_principal_de_categoria' as unspsc
      from proceso p
      join raw_record r on r.id = p.raw_record_id_actual
      where p.descripcion is null and p.url is null and p.unspsc is null
        and r.payload is not null
      limit ${LOTE}
    )
    update proceso p
       set descripcion = pe.descripcion, url = pe.url, unspsc = pe.unspsc
      from pendientes pe
     where p.id = pe.id
    returning p.id
  `);

  const n = res.rowCount ?? 0;
  if (n === 0) break;

  await db.execute(sql`vacuum proceso`);
  const [{ size }] = (await db.execute(
    sql`select pg_size_pretty(pg_database_size(current_database())) as size`
  )) as unknown as { size: string }[];
  console.log(`vuelta ${vuelta}: ${n} filas — base ${size}`);
}

console.log("relleno terminado");
```

- [ ] **Step 3: Ejecutar y vigilar el tamaño**

```bash
npx tsx scripts/rellenar-columnas.ts
```

Expected: la base sube progresivamente hasta ~485 MB. **Si pasa de 492 MB,
INTERRUMPIR** (Ctrl-C) y saltar directamente a la Tarea 11 — el relleno es una
optimización de la experiencia, no un requisito del corte.

- [ ] **Step 4: Verificar la cobertura**

```sql
select count(*) filter (where descripcion is not null) con_descripcion,
       count(*) filter (where url is not null) con_url,
       count(*) filter (where unspsc is not null) con_unspsc,
       count(*) total
from proceso;
```

Expected: `con_url` ≈ total. `con_descripcion` menor: solo ~70% de los procesos
traen descripción (5.625 de 8.000 en la muestra medida).

- [ ] **Step 5: Commit**

```bash
git add scripts/rellenar-columnas.ts
git commit -m "chore(scripts): relleno retroactivo de descripcion, url y unspsc

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: El corte

Punto de no retorno. **No ejecutar sin la verificación de la Tarea 1 en verde.**

**Files:**
- Create: `scripts/corte-raw-record.ts`
- Create: `docs/runbook-corte-raw-record.md`

**Interfaces:**
- Consumes: el archivo verificado de la Tarea 1.
- Produces: nada. Ejecución única.

- [ ] **Step 1: Escribir el runbook**

```markdown
# Runbook — corte de raw_record (2026-09-12)

## Antes de empezar
- [ ] El archivo de la Tarea 1 está en Storage y su verificación dio 0 filas
      discrepantes.
- [ ] Hay copia local del gzip fuera del repo.
- [ ] El cron `/api/cron/tick` está pausado y verificado en el panel de Vercel.
- [ ] `select count(*) from raw_record` anotado: ______
- [ ] `select pg_size_pretty(pg_database_size(current_database()))` anotado: ______

## Ejecución
1. `npx tsx scripts/corte-raw-record.ts`
2. Verificar que la base cae a ~198 MB.
3. Recrear índices (paso 4 del script).
4. Re-ingesta: `npm run db:ingest`
5. Transform: `npm run db:transform`
6. Recrear las 5 constraints.
7. Reactivar el cron en `vercel.json` y desplegar.

## Si algo falla
- Entre 1 y 4: la web sigue sirviendo desde `proceso`/`contrato`, que no se
  tocan. No hay urgencia; diagnosticar con calma.
- Si la re-ingesta falla: el archivo de Storage tiene todo. Restaurar con
  `scripts/export-raw-archive.ts` invertido.
```

- [ ] **Step 2: Escribir el script de corte**

```typescript
// scripts/corte-raw-record.ts
/**
 * Corte: suelta las 5 FK, TRUNCATE raw_record, recrea los índices.
 *
 * TRUNCATE y no VACUUM FULL: descarta los ficheros de la relación y devuelve
 * los 287 MB al SO al instante, sin necesitar espacio libre. VACUUM FULL
 * escribiría una copia antes de soltar la vieja, y con 26 MB de margen no cabe.
 *
 * Las 5 columnas que referencian raw_record son todas nullable (verificado
 * 2026-09-11), así que soltar las constraints no toca un solo dato.
 *
 *   npx tsx scripts/corte-raw-record.ts
 */
import { sql } from "drizzle-orm";
import { db } from "@/src/lib/db/client";

const CONSTRAINTS = [
  ["proceso", "proceso_raw_record_id_actual_raw_record_id_fk"],
  ["contrato", "contrato_raw_record_id_actual_raw_record_id_fk"],
  ["transform_quarantine", "transform_quarantine_raw_record_id_raw_record_id_fk"],
  ["al_proceso_evento", "al_proceso_evento_raw_record_id_raw_record_id_fk"],
  ["al_oferentes_historico", "al_oferentes_historico_raw_record_id_raw_record_id_fk"],
] as const;

const antes = await db.execute(
  sql`select pg_size_pretty(pg_database_size(current_database())) as size,
             (select count(*) from raw_record) as filas`
);
console.log("antes:", antes);

for (const [tabla, constraint] of CONSTRAINTS) {
  await db.execute(sql.raw(`alter table ${tabla} drop constraint if exists ${constraint}`));
  console.log(`soltada ${constraint}`);
}

await db.execute(sql`truncate table raw_record`);
console.log("raw_record truncada");

for (const ddl of [
  `create index contrato_proveedor_idx on contrato (proveedor_id)`,
  `create index contrato_entidad_idx on contrato (entidad_id)`,
  `create index contrato_estado_idx on contrato (estado_actual)`,
  `create index proceso_portafolio_idx on proceso (portafolio_id)`,
  `create index proceso_doc_access_idx on proceso (document_access)`,
]) {
  await db.execute(sql.raw(ddl));
  console.log(`recreado: ${ddl.split(" ")[2]}`);
}

const despues = await db.execute(
  sql`select pg_size_pretty(pg_database_size(current_database())) as size`
);
console.log("después:", despues);
```

- [ ] **Step 3: Ejecutar el corte**

```bash
npx tsx scripts/corte-raw-record.ts
```

Expected: la base cae de ~485 MB a **~217 MB** (198 + 19 de índices recreados).

- [ ] **Step 4: Verificar**

```sql
select pg_size_pretty(pg_database_size(current_database())) db,
       (select count(*) from raw_record) raw_filas,
       (select count(*) from proceso) procesos,
       (select count(*) from contrato) contratos;
```

Expected: `raw_filas = 0`, `procesos = 90.459`, `contratos = 38.367`. **Las
tablas canónicas no pierden ni una fila.**

- [ ] **Step 5: Commit**

```bash
git add scripts/corte-raw-record.ts docs/runbook-corte-raw-record.md
git commit -m "chore(scripts): corte de raw_record — 5 FK + TRUNCATE + índices

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 12: Repoblar, recrear constraints y cerrar

**Files:**
- Modify: `src/lib/secop/db-search.ts` (retirar `coalesce`)
- Modify: `vercel.json` (reactivar cron)
- Modify: `CLAUDE.md`
- Modify: `docs/superpowers/specs/2026-09-11-adelgazamiento-raw-record-design.md`

- [ ] **Step 1: Re-ingesta completa con `$select`**

**Corregido en el whole-branch review final (2026-09-12): esto NO es una
re-ingesta completa tal cual escrito abajo.** `npm run db:ingest` arranca
desde `readLastWatermark()` = `max(sync_log.watermark_to)` con
`status in ('ok','partial')` (`src/lib/ingest/dbIngest.ts`), y el `TRUNCATE`
de la Tarea 11 no toca `sync_log`. Sin neutralizar el watermark primero, este
paso trae solo el último día incremental, no el histórico — y ~90.000
procesos quedan con las columnas de adjudicación en NULL para siempre,
porque el payload que las tenía ya fue destruido por el `TRUNCATE`. Neutralizar
antes de correr `db:ingest`:

```sql
update sync_log set status = 'superseded'
where source in ('secop_ii_procesos','secop_ii_contratos')
  and status in ('ok','partial');
```

(`sync_log.status` es `text` libre sin `enum`/`check constraint` — verificado
en `src/lib/db/schema/control.ts` — así que `'superseded'` no choca con nada;
se prefiere sobre borrar las filas porque conserva el historial de corridas.)

```bash
npm run db:ingest
```

Expected: repuebla `raw_record` con los ~25 campos, y esta vez con el
histórico completo. Vigilar el tamaño: cada lote debe crecer mucho menos que
antes. Ver `docs/runbook-corte-raw-record.md` paso 4 para el procedimiento
exacto que sigue el operador.

- [ ] **Step 2: Transform**

```bash
npm run db:transform
```

Expected: puebla las columnas restantes en `proceso` y `contrato`, y vacía los
payloads consumidos (Tarea 9).

- [ ] **Step 3: Verificar el estado final**

```sql
select pg_size_pretty(pg_database_size(current_database())) db;
select c.relname, pg_size_pretty(pg_total_relation_size(c.oid))
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where c.relkind='r' and n.nspname='public'
order by pg_total_relation_size(c.oid) desc limit 6;
select count(*) payloads_vivos from raw_record where payload is not null;
```

Criterios de aceptación (spec §9):
1. `pg_database_size` ≤ 300 MB (objetivo ~270 MB).
2. `raw_record` ≤ 40 MB.
3. `payloads_vivos` ≈ 0 (solo lo pendiente de transformar o en cuarentena).
4. Las 23 tablas siguen con RLS: `select count(*) from pg_tables t join pg_class c on c.relname=t.tablename where t.schemaname='public' and not c.relrowsecurity;` → **0**.
5. `npm run test` en verde.
6. Ninguna columna promovida quedó vacía donde el payload tenía dato.

- [ ] **Step 4: Recrear las 5 constraints**

```sql
alter table proceso add constraint proceso_raw_record_id_actual_raw_record_id_fk
  foreign key (raw_record_id_actual) references raw_record(id);
alter table contrato add constraint contrato_raw_record_id_actual_raw_record_id_fk
  foreign key (raw_record_id_actual) references raw_record(id);
alter table transform_quarantine add constraint transform_quarantine_raw_record_id_raw_record_id_fk
  foreign key (raw_record_id) references raw_record(id);
alter table al_proceso_evento add constraint al_proceso_evento_raw_record_id_raw_record_id_fk
  foreign key (raw_record_id) references raw_record(id);
alter table al_oferentes_historico add constraint al_oferentes_historico_raw_record_id_raw_record_id_fk
  foreign key (raw_record_id) references raw_record(id);
```

**Si alguna falla por violación**, hay UUIDs huérfanos de antes del corte:
`update <tabla> set <columna> = null where <columna> not in (select id from raw_record);`
y reintentar.

- [ ] **Step 5: Correr el detector de adendas en seco**

```bash
npm run al:eventos
```

Expected: **0 eventos** (spec §8-R2). Si genera cientos, el diff está
comparando mal: NO reactivar `/api/cron/alertas` hasta arreglarlo.

- [ ] **Step 6: Retirar el `coalesce` al payload**

En `db-search.ts`, sustituir cada `coalesce(${proceso.x}, ${payload}->>...)`
por `${proceso.x}` a secas. Eliminar el JOIN a `rawRecord` y la constante
`payload`.

Run: `npm run test && npx tsc --noEmit`

- [ ] **Step 7: Reactivar los dos crons**

Corregido en el whole-branch review final: `/api/cron/alertas` también se
pausó (finding importante 5 — `recopilarNovedades` lee `p.url` sin fallback
al payload, así que el digest saldría con links vacíos entre el deploy y el
backfill). Restaurar **ambas** entradas, `/api/cron/tick` y
`/api/cron/alertas`, en `vercel.json` y desplegar. No reactivar `alertas`
antes de que el Step 2 (transform) haya corrido.

- [ ] **Step 8: Actualizar la documentación**

En `CLAUDE.md`:
- §2: `raw_record` deja de ser landing permanente; es buffer de ingesta.
  El histórico crudo vive en Supabase Storage.
- §4: **borrar** la frase sobre `drizzle/0017_mushy_expediter.sql` sin aplicar —
  está aplicada (23/23 migraciones, `usuario.plan` existe, verificado 2026-09-11).
- Fecha de última actualización.

En la spec: marcar **Estado: implementado**.

- [ ] **Step 9: Observar el primer barrido**

Tras el siguiente cron, comprobar cuánto creció:

```sql
select pg_size_pretty(pg_database_size(current_database()));
```

Expected: crecimiento < 15 MB (spec §9, criterio 8).

- [ ] **Step 10: Commit final**

```bash
git add -A
git commit -m "chore: cierra el adelgazamiento de raw_record

Base de 474 MB a ~270 MB. raw_record pasa de almacén a buffer; los 13
campos que se leían en caliente viven en columnas. Histórico crudo
archivado en Supabase Storage.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Self-review

**Cobertura de la spec.** Cada sección tiene tarea: §D1 conjunto caliente → T5-T7;
§D2 ya-en-columnas → T6 paso 3; §D3 payload nullable → T2, T9; §D4 archivo →
T1; §D5 `$select` → T8; §D6 worktree y cron → T9 paso 1; §5 balance → T12 paso 3;
§6 fases 0-4 → T10, T11, T12; §8-R1 pico → T10 paso 3 con umbral de aborto;
§8-R2 adendas espurias → T12 paso 5; §9 criterios → T12 paso 3; §10 rollback →
runbook de T11.

**Riesgos que el plan añade sobre la spec:**
- `urlRaw` cambia de forma (objeto → string) y eso toca `app/`. Aislado en T5
  pasos 3 y 5, donde es explícito.
- El relleno de T10 puede no caber. Por eso lleva umbral de aborto y es
  opcional: el corte funciona igual sin él, a costa de que el buscador pierda
  descripción durante la ventana.
- Las constraints de T12 paso 4 pueden fallar por huérfanos. Tiene remedio
  documentado en el propio paso.

**Consistencia de tipos:** `ProcesoProjection.adjudicado` es `boolean | null` en
T3, se escribe como boolean en T4, y en T5 se reconvierte a `'Si'/'No'` para no
cambiar el contrato de `db-search`. `valorAdjudicacion` es `number | null` en la
proyección y `String(...)` al escribir, igual que `valorEstimado` ya hacía.
`fechaAdjudicacion`/`fechaRecepcion` son `string | null` (ISO date), coherente
con `parseDate`.
