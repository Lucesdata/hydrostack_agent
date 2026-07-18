# Landing · Métricas interactivas (oportunidad activa + ciclo del proceso) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir una sección interactiva al landing (`LandingMetrics.jsx`) con dos métricas reales de SECOP — oportunidad activa y tiempo de ejecución contractual — filtrables por departamento × sector (acueducto/alcantarillado/PTAR/PSMV/ETAP) sin disparar queries en vivo al interactuar, leyendo de una matriz precalculada.

**Architecture:** Un script (`scripts/generate-landing-metrics.ts`) pega a Socrata en vivo, arma la matriz completa y la guarda en una tabla Postgres/Neon (`landing_metrics_cache`, DELETE+INSERT). Un route handler (`GET /api/landing-metrics`) sirve la fila más reciente con cache de 1h. El componente cliente hace un solo fetch al montar y el selector filtra el array ya cargado en memoria — cero red al interactuar. Un cron (`/api/cron/landing-metrics`, mismo patrón que `/api/cron/ingest`) regenera la matriz periódicamente; el script también corre a mano vía `npm run db:generate-landing-metrics`.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Drizzle ORM + Neon Postgres, Socrata SODA API (datos.gov.co), Vitest.

**Spec:** [docs/superpowers/specs/2026-07-18-landing-metrics-interactive-design.md](../specs/2026-07-18-landing-metrics-interactive-design.md)

---

## Antes de empezar

Todos los comandos abajo corren desde la raíz del repo:
`/Users/giovannyguevaraduque/Desktop/claude_trabajo/hydrostack 2`

Requiere `DATABASE_URL` en `.env.local` (ya debería existir, el proyecto ya usa Postgres/Neon para la ingesta). Los tests unitarios (`npm test`) NO requieren red ni DB — todo lo testeado en este plan es lógica pura.

---

### Task 1: Taxonomía de sectores — `sectorKeywords.ts`

**Files:**
- Create: `src/lib/secop/sectorKeywords.ts`
- Test: `src/__tests__/secop/sectorKeywords.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
// src/__tests__/secop/sectorKeywords.test.ts
import { describe, it, expect } from 'vitest';
import { SECTOR_KEYS, SECTOR_LABELS, buildSectorWhere } from '@/src/lib/secop/sectorKeywords';

describe('SECTOR_KEYS / SECTOR_LABELS', () => {
  it('expone los 5 sectores esperados', () => {
    expect([...SECTOR_KEYS].sort()).toEqual(
      ['acueducto', 'alcantarillado', 'etap', 'psmv', 'ptar'].sort(),
    );
  });

  it('el label de "etap" es ETAP aunque la keyword real sea PTAP', () => {
    expect(SECTOR_LABELS.etap).toBe('ETAP');
  });
});

describe('buildSectorWhere', () => {
  it('construye un OR de todas las keywords contra todos los campos', () => {
    const w = buildSectorWhere('psmv', ['nombre_del_procedimiento', 'descripci_n_del_procedimiento']);
    expect(w).toContain("upper(nombre_del_procedimiento) like '%PSMV%'");
    expect(w).toContain("upper(descripci_n_del_procedimiento) like '%PSMV%'");
    expect(w).toContain('PLAN DE SANEAMIENTO Y MANEJO DE VERTIMIENTOS');
  });

  it('el bucket "etap" busca PTAP (keyword real), no la palabra literal "etap"', () => {
    const w = buildSectorWhere('etap', ['objeto_del_contrato']);
    expect(w).toContain('PTAP');
    expect(w).not.toMatch(/'%ETAP%'/);
  });
});
```

- [ ] **Step 2: Correr el test, confirmar que falla**

Run: `npm test -- sectorKeywords`
Expected: FAIL — `Cannot find module '@/src/lib/secop/sectorKeywords'`

- [ ] **Step 3: Implementar**

```ts
// src/lib/secop/sectorKeywords.ts
/**
 * Taxonomía de 5 sub-sectores agua/saneamiento para las métricas
 * interactivas del landing. NO existía antes de este trabajo — auditado
 * contra `SectorialGate`/`KEYWORDS_AGUA` (ver docs/superpowers/specs/
 * 2026-07-18-landing-metrics-interactive-design.md §1). Un proceso puede
 * matchear más de un bucket — no son mutuamente excluyentes.
 *
 * "ETAP" (Estación de Tratamiento de Agua Potable) es el label que pidió
 * producto, pero como keyword de búsqueda es ruido puro: "ETAP" matchea la
 * palabra "etapa/etapas" en miles de contratos no relacionados (verificado
 * contra Socrata real: 74.018 falsos positivos, todos "etapa(s)"). Colombia
 * usa PTAP (Planta de Tratamiento de Agua Potable) para este concepto — se
 * siembra con esa keyword real; el label de UI sigue diciendo "ETAP".
 */
export const SECTOR_KEYWORDS = {
  acueducto: [
    'acueducto', 'agua potable', 'abastecimiento de agua', 'potabilizacion',
    'captación', 'aducción', 'red de distribución de agua', 'micromedición',
    'macromedición',
  ],
  alcantarillado: [
    'alcantarillado', 'aguas residuales', 'agua residual', 'colector',
    'interceptor', 'emisario', 'red de alcantarillado', 'vertimiento',
  ],
  ptar: ['PTAR', 'planta de tratamiento de aguas residuales'],
  psmv: ['PSMV', 'plan de saneamiento y manejo de vertimientos'],
  etap: [
    'PTAP', 'planta de tratamiento de agua potable',
    'estación de tratamiento de agua potable',
  ],
} as const;

export type SectorKey = keyof typeof SECTOR_KEYWORDS;

export const SECTOR_KEYS = Object.keys(SECTOR_KEYWORDS) as SectorKey[];

export const SECTOR_LABELS: Record<SectorKey, string> = {
  acueducto: 'Acueducto',
  alcantarillado: 'Alcantarillado',
  ptar: 'PTAR',
  psmv: 'PSMV',
  etap: 'ETAP',
};

function soqlEscape(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Cláusula $where SoQL para un sector: OR de todas sus keywords contra todos
 * los `fields` dados (mismo patrón que `buildAguaWhere` en client.ts).
 */
export function buildSectorWhere(sector: SectorKey, fields: readonly string[]): string {
  const clauses = SECTOR_KEYWORDS[sector].map((kw) => {
    const k = soqlEscape(kw.toUpperCase());
    const perField = fields.map((f) => `upper(${f}) like '%${k}%'`).join(' OR ');
    return `(${perField})`;
  });
  return `(${clauses.join(' OR ')})`;
}
```

- [ ] **Step 4: Correr el test, confirmar que pasa**

Run: `npm test -- sectorKeywords`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/secop/sectorKeywords.ts src/__tests__/secop/sectorKeywords.test.ts
git commit -m "feat(secop): taxonomía de 5 sub-sectores agua (acueducto/alcantarillado/PTAR/PSMV/ETAP)"
```

---

### Task 2: Campos faltantes en `config.ts` (fecha fin de contrato, `$group` en SODA)

**Files:**
- Modify: `src/lib/secop/config.ts:85-100` (FIELDS_CONTRATOS)
- Modify: `src/lib/secop/client.ts:70-77` (SodaParams)

- [ ] **Step 1: Agregar `fechaFinContrato` a `FIELDS_CONTRATOS`**

En `src/lib/secop/config.ts`, dentro de `FIELDS_CONTRATOS` (verificado en vivo contra `jbjy-vk9h` el 2026-07-18: `fecha_de_fin_del_contrato` existe y tiene 100% completitud en la muestra probada):

```ts
export const FIELDS_CONTRATOS = {
  id: "id_contrato",
  referencia: "referencia_del_contrato",
  objeto: "objeto_del_contrato",
  entidad: "nombre_entidad",
  nitEntidad: "nit_entidad",
  departamento: "departamento",
  ciudad: "ciudad",
  estado: "estado_contrato",
  proveedor: "proveedor_adjudicado",
  nitProveedor: "documento_proveedor",
  fechaFirma: "fecha_de_firma",
  /** Verificado en vivo 2026-07-18: 100% de completitud en contratos del
   *  sector agua (muestra de 15). Insumo de la métrica "tiempo de ejecución
   *  contractual" del landing. */
  fechaFinContrato: "fecha_de_fin_del_contrato",
  valor: "valor_del_contrato",
  unspsc: "codigo_de_categoria_principal",
  url: "urlproceso",
} as const;
```

- [ ] **Step 2: Agregar `$group` a `SodaParams`**

En `src/lib/secop/client.ts`, la interfaz `SodaParams` (líneas 70-77):

```ts
interface SodaParams {
  $select?: string;
  $where?: string;
  $q?: string;
  $group?: string;
  $order?: string;
  $limit: number;
  $offset: number;
}
```

- [ ] **Step 3: Verificar que el build de tipos no rompe nada**

Run: `npx tsc --noEmit`
Expected: sin nuevos errores (0 exit code, o los mismos errores preexistentes si los hubiera — confirmar con `git stash` que no son nuevos)

- [ ] **Step 4: Commit**

```bash
git add src/lib/secop/config.ts src/lib/secop/client.ts
git commit -m "feat(secop): agrega fecha_de_fin_del_contrato y \$group a SodaParams"
```

---

### Task 3: Extraer `buildAguaWhereContratos()` (DRY)

El `$where` de agua para Contratos está hoy inline dentro de `searchContratos` (`client.ts:260-265`). Se extrae a una función exportada para reusarla en el generador de métricas del landing (Task 8), sin duplicar la lista de keywords.

**Files:**
- Modify: `src/lib/secop/client.ts:56-63` (junto a `buildAguaWhere`), `:251-287` (`searchContratos`)
- Test: `src/__tests__/secop/client-query.test.ts`

- [ ] **Step 1: Escribir el test que falla**

En `src/__tests__/secop/client-query.test.ts`, el archivo empieza así hoy:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildProcesosWhere, ORDER_SOQL, countProcesos } from '@/src/lib/secop/client';
import { FIELDS_PROCESOS } from '@/src/lib/secop/config';

const F = FIELDS_PROCESOS;
```

Reemplazar esas 3 líneas de import + la constante `F` por (agrega `buildAguaWhereContratos` al primer import, `FIELDS_CONTRATOS` al segundo, y una constante `C` nueva — no dupliques los imports existentes):

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildProcesosWhere, ORDER_SOQL, countProcesos, buildAguaWhereContratos } from '@/src/lib/secop/client';
import { FIELDS_PROCESOS, FIELDS_CONTRATOS } from '@/src/lib/secop/config';

const F = FIELDS_PROCESOS;
const C = FIELDS_CONTRATOS;
```

Luego, al final del archivo (después del último `describe` existente), agregar:

```ts
describe('buildAguaWhereContratos', () => {
  it('construye el OR de keywords contra objeto_del_contrato', () => {
    const w = buildAguaWhereContratos();
    expect(w).toContain(`upper(${C.objeto}) like '%ACUEDUCTO%'`);
    expect(w).toContain(`upper(${C.objeto}) like '%PTAR%'`);
    expect(w).toContain(' OR ');
  });
});
```

- [ ] **Step 2: Correr el test, confirmar que falla**

Run: `npm test -- client-query`
Expected: FAIL — `buildAguaWhereContratos is not a function` (o error de import)

- [ ] **Step 3: Implementar — extraer la función y reusarla**

En `src/lib/secop/client.ts`, agregar justo después de `buildAguaWhere` (línea 63):

```ts
/** Construye la cláusula $where del sector agua para CONTRATOS (campo objeto). */
export function buildAguaWhereContratos(): string {
  const clauses = KEYWORDS_AGUA.map((kw) => {
    const k = soqlEscape(kw.toUpperCase());
    return `upper(${FIELDS_CONTRATOS.objeto}) like '%${k}%'`;
  });
  return `(${clauses.join(' OR ')})`;
}
```

Y reemplazar el bloque inline en `searchContratos` (líneas ~260-265):

```ts
  const aguaWhere = query.soloAgua !== false ? buildAguaWhereContratos() : null;
```

(elimina el `KEYWORDS_AGUA.map(...)` inline que estaba ahí antes).

- [ ] **Step 4: Correr el test, confirmar que pasa**

Run: `npm test -- client-query`
Expected: PASS (todos los tests del archivo, incluido el nuevo)

- [ ] **Step 5: Commit**

```bash
git add src/lib/secop/client.ts src/__tests__/secop/client-query.test.ts
git commit -m "refactor(secop): extrae buildAguaWhereContratos (DRY, reusable por el generador de métricas)"
```

---

### Task 4: Wiring de `SecopQuery.sector` en las 3 capas (Socrata, Postgres, parseo de URL)

Esto es lo que hace que el CTA "Ver estos procesos" del landing filtre de verdad en `/licitaciones`. Hay que tocar las tres capas porque `/api/secop` intenta Postgres primero y solo cae a Socrata si Postgres falla (`app/api/secop/route.ts`).

**Files:**
- Modify: `src/lib/secop/types.ts:60-77` (`SecopQuery`)
- Modify: `src/lib/secop/client.ts` (`buildProcesosWhere`)
- Modify: `src/lib/secop/db-search.ts:113-143` (`prepare`)
- Modify: `src/lib/secop/parse-query.ts`
- Test: `src/__tests__/secop/client-query.test.ts`, `src/__tests__/secop/route-parse.test.ts`

- [ ] **Step 1: Escribir los tests que fallan**

Agregar a `src/__tests__/secop/client-query.test.ts`, dentro del `describe('buildProcesosWhere', ...)` existente:

```ts
  it('agrega el filtro de sub-sector cuando se pide', () => {
    const w = buildProcesosWhere({ soloAgua: false, sector: 'ptar' });
    expect(w).toContain('PTAR');
  });
```

Agregar a `src/__tests__/secop/route-parse.test.ts`:

```ts
  it('acepta sector válido y rechaza valores desconocidos', () => {
    expect(parseQuery(new URLSearchParams('sector=ptar')).sector).toBe('ptar');
    expect(parseQuery(new URLSearchParams('sector=nope')).sector).toBeUndefined();
    expect(parseQuery(new URLSearchParams()).sector).toBeUndefined();
  });
```

- [ ] **Step 2: Correr los tests, confirmar que fallan**

Run: `npm test -- client-query route-parse`
Expected: FAIL — `sector` no existe en `SecopQuery` (error de tipos) / el where no contiene "PTAR" / `.sector` es `undefined` siempre

- [ ] **Step 3: `SecopQuery.sector` en `types.ts`**

En `src/lib/secop/types.ts`, agregar el import y el campo:

```ts
import type { DocumentAccess } from './document-access';
import type { SectorKey } from './sectorKeywords';
```

```ts
export interface SecopQuery {
  q?: string;
  departamento?: string;
  estado?: string;
  valorMin?: number;
  desde?: string;
  apertura?: EstadoApertura;
  orden?: 'fecha' | 'valor';
  soloAgua?: boolean;
  /** Filtra por sub-sector (taxonomía nueva: acueducto/alcantarillado/ptar/psmv/etap). */
  sector?: SectorKey;
  page?: number;
  pageSize?: number;
}
```

- [ ] **Step 4: `buildProcesosWhere` en `client.ts`**

Agregar el import:

```ts
import { buildSectorWhere } from "./sectorKeywords";
```

Y en `buildProcesosWhere`:

```ts
export function buildProcesosWhere(query: SecopQuery): string {
  return andWhere(
    query.soloAgua !== false ? buildAguaWhere() : null,
    query.sector ? buildSectorWhere(query.sector, [F.nombre, F.descripcion]) : null,
    query.departamento
      ? `upper(${F.departamento}) = '${soqlEscape(query.departamento.toUpperCase())}'`
      : null,
    query.estado ? `${F.estado} = '${soqlEscape(query.estado)}'` : null,
    query.valorMin != null ? `${F.precioBase} >= ${query.valorMin}` : null,
    query.desde ? `${F.fechaPublicacion} >= '${soqlEscape(query.desde)}'` : null,
    query.apertura ? `${F.estadoApertura} = '${soqlEscape(query.apertura)}'` : null,
  );
}
```

- [ ] **Step 5: `prepare()` en `db-search.ts` (path primario de Postgres)**

Agregar el import en `src/lib/secop/db-search.ts`:

```ts
import { SECTOR_KEYWORDS } from './sectorKeywords';
```

Y dentro de `prepare()`, justo debajo del bloque `aguaClauses`:

```ts
  const aguaClauses =
    query.soloAgua !== false
      ? KEYWORDS_AGUA.flatMap((kw) => [ilike(nombreRaw, `%${kw}%`), ilike(descripcionRaw, `%${kw}%`)])
      : [];

  const sectorClauses = query.sector
    ? SECTOR_KEYWORDS[query.sector].flatMap((kw) => [ilike(nombreRaw, `%${kw}%`), ilike(descripcionRaw, `%${kw}%`)])
    : [];

  const conditions = [
    isNull(proceso.deletedAt),
    aguaClauses.length > 0 ? or(...aguaClauses) : undefined,
    sectorClauses.length > 0 ? or(...sectorClauses) : undefined,
    query.departamento ? ilike(geografia.departamentoNombre, `%${query.departamento}%`) : undefined,
    query.estado ? eq(proceso.estadoActual, query.estado) : undefined,
    query.valorMin != null ? gte(proceso.valorEstimado, String(query.valorMin)) : undefined,
    query.desde ? gte(proceso.fechaPublicacion, query.desde) : undefined,
    query.apertura ? eq(aperturaRaw, query.apertura) : undefined,
    query.q ? or(ilike(proceso.objeto, `%${query.q}%`), ilike(entidad.nombre, `%${query.q}%`)) : undefined,
  ].filter((c): c is NonNullable<typeof c> => c !== undefined);
```

- [ ] **Step 6: Parseo del query param en `parse-query.ts`**

```ts
import type { SecopQuery, EstadoApertura } from "./types";
import { SECTOR_KEYS, type SectorKey } from "./sectorKeywords";

export function parseQuery(sp: URLSearchParams): SecopQuery {
  const num = (k: string) => {
    const v = sp.get(k);
    return v != null && v !== "" ? Number(v) : undefined;
  };
  const apertura = sp.get("apertura") as EstadoApertura | null;
  const orden = sp.get("orden");
  const sector = sp.get("sector");
  return {
    q: sp.get("q") ?? undefined,
    departamento: sp.get("departamento") ?? undefined,
    estado: sp.get("estado") ?? undefined,
    valorMin: num("valorMin"),
    desde: sp.get("desde") ?? undefined,
    apertura:
      apertura !== null && (["Abierto", "Cerrado"] as const).includes(apertura)
        ? apertura
        : undefined,
    orden: orden === "valor" || orden === "fecha" ? orden : undefined,
    soloAgua: sp.get("soloAgua") === "false" ? false : true,
    sector: sector !== null && (SECTOR_KEYS as string[]).includes(sector) ? (sector as SectorKey) : undefined,
    page: num("page"),
    pageSize: num("pageSize"),
  };
}
```

- [ ] **Step 7: Correr los tests, confirmar que pasan**

Run: `npm test -- client-query route-parse`
Expected: PASS (todos)

- [ ] **Step 8: Correr la suite completa (nada se rompió en secop/)**

Run: `npm test -- secop`
Expected: PASS (todos los archivos de `src/__tests__/secop/`)

- [ ] **Step 9: Commit**

```bash
git add src/lib/secop/types.ts src/lib/secop/client.ts src/lib/secop/db-search.ts src/lib/secop/parse-query.ts src/__tests__/secop/client-query.test.ts src/__tests__/secop/route-parse.test.ts
git commit -m "feat(secop): filtro de sub-sector en SecopQuery (Socrata live + Postgres + parseo de URL)"
```

---

### Task 5: Compartir `formatCopMilM` (mover a `format.ts`)

`LandingCards.jsx` ya tiene un `formatCopMilM` local; `LandingMetrics.jsx` (Task 13) lo necesita también. Se mueve a `format.ts` para no duplicarlo.

**Files:**
- Modify: `src/components/secop/format.ts`
- Modify: `src/components/landing/LandingCards.jsx:1-25`
- Test: `src/__tests__/secop/format.test.ts`

- [ ] **Step 1: Escribir el test que falla**

En `src/__tests__/secop/format.test.ts`, el import ya trae `formatCopCompact` de otras pruebas existentes:

```ts
import {
  sentenceCaseTitle,
  formatCopCompact,
  formatCopFull,
  formatShortDate,
  verdictScore,
} from '@/src/components/secop/format';
```

Agregar `formatCopMilM` a esa misma lista de imports (no duplicar el import):

```ts
import {
  sentenceCaseTitle,
  formatCopCompact,
  formatCopFull,
  formatShortDate,
  formatCopMilM,
  verdictScore,
} from '@/src/components/secop/format';
```

Luego, al final del archivo, agregar:

```ts
describe('formatCopMilM', () => {
  it('usa formatCopCompact bajo mil millones', () => {
    expect(formatCopMilM(450_000_000)).toBe(formatCopCompact(450_000_000));
  });

  it('pasa a "mil M" desde mil millones', () => {
    expect(formatCopMilM(2_400_000_000)).toBe('$2,4 mil M');
  });

  it('null → null', () => {
    expect(formatCopMilM(null)).toBeNull();
  });
});
```

- [ ] **Step 2: Correr el test, confirmar que falla**

Run: `npm test -- format`
Expected: FAIL — `formatCopMilM is not exported`

- [ ] **Step 3: Mover la función a `format.ts`**

Agregar al final de `src/components/secop/format.ts`:

```ts
/**
 * Sumas grandes del landing (precio_base agregado por mes, proceso de mayor
 * cuantía) que en millones quedarían con 5+ cifras. Se queda en "$X M" hasta
 * mil millones, donde pasa a "$X mil M".
 */
export function formatCopMilM(value: number | null): string | null {
  if (value == null) return null;
  if (value < 1_000_000_000) return formatCopCompact(value);
  const milMillones = (value / 1_000_000_000).toLocaleString('es-CO', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `$${milMillones} mil M`;
}
```

- [ ] **Step 4: Quitar la copia local de `LandingCards.jsx` y usar la importada**

En `src/components/landing/LandingCards.jsx`, eliminar la función local `formatCopMilM` (líneas 17-25) y cambiar el import (línea 8):

```jsx
import { formatCopCompact, formatCopMilM, formatShortDate, sentenceCaseTitle } from "@/src/components/secop/format";
```

- [ ] **Step 5: Correr el test, confirmar que pasa**

Run: `npm test -- format`
Expected: PASS

- [ ] **Step 6: Verificar visualmente que LandingCards no se rompió**

Run: `npm run dev` (si no está corriendo), abrir `http://localhost:3000` y confirmar que las 3 cards del landing siguen mostrando cifras (mismo aspecto que antes — este task es un refactor puro, sin cambio de comportamiento).

- [ ] **Step 7: Commit**

```bash
git add src/components/secop/format.ts src/components/landing/LandingCards.jsx src/__tests__/secop/format.test.ts
git commit -m "refactor(landing): mueve formatCopMilM a format.ts para compartirlo con LandingMetrics"
```

---

### Task 6: Módulo puro de estadística — `landingMetrics.ts`

Tipos del payload + mediana/promedio + el armado de `ciclo_proceso`. Sin red, 100% testeable.

**Files:**
- Create: `src/lib/secop/landingMetrics.ts`
- Test: `src/__tests__/secop/landingMetrics.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
// src/__tests__/secop/landingMetrics.test.ts
import { describe, it, expect } from 'vitest';
import { median, average, buildCicloProceso, MIN_SAMPLE_SIZE } from '@/src/lib/secop/landingMetrics';

describe('median', () => {
  it('lista impar: el valor central', () => {
    expect(median([1, 3, 2])).toBe(2);
  });
  it('lista par: promedio de los dos centrales', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
  it('no muta el array original', () => {
    const nums = [3, 1, 2];
    median(nums);
    expect(nums).toEqual([3, 1, 2]);
  });
});

describe('average', () => {
  it('promedio simple', () => {
    expect(average([10, 20, 30])).toBe(20);
  });
});

describe('buildCicloProceso', () => {
  it('n=0: todo null, muestra_suficiente=false', () => {
    expect(buildCicloProceso([])).toEqual({
      promedio_dias: null,
      mediana_dias: null,
      n_muestra: 0,
      muestra_suficiente: false,
    });
  });

  it('n < MIN_SAMPLE_SIZE: calcula valores pero marca muestra insuficiente', () => {
    const r = buildCicloProceso([10, 20, 30]);
    expect(r.n_muestra).toBe(3);
    expect(r.muestra_suficiente).toBe(false);
    expect(r.promedio_dias).toBe(20);
    expect(r.mediana_dias).toBe(20);
  });

  it('n >= MIN_SAMPLE_SIZE: muestra_suficiente=true', () => {
    const r = buildCicloProceso([10, 20, 30, 40, 50]);
    expect(r.n_muestra).toBe(5);
    expect(r.muestra_suficiente).toBe(true);
    expect(MIN_SAMPLE_SIZE).toBe(5);
  });

  it('redondea promedio y mediana a días enteros', () => {
    const r = buildCicloProceso([1, 2, 3, 3, 3, 100]);
    expect(Number.isInteger(r.promedio_dias)).toBe(true);
    expect(Number.isInteger(r.mediana_dias)).toBe(true);
  });
});
```

- [ ] **Step 2: Correr el test, confirmar que falla**

Run: `npm test -- landingMetrics`
Expected: FAIL — `Cannot find module '@/src/lib/secop/landingMetrics'`

- [ ] **Step 3: Implementar**

```ts
// src/lib/secop/landingMetrics.ts
/**
 * Tipos y lógica pura (sin red, sin DB) de la matriz de métricas
 * interactivas del landing. Los nombres de propiedad son snake_case a
 * propósito: mapean 1:1 al JSON servido por `/api/landing-metrics` (spec
 * §5) — no hay capa de traducción entre "forma interna" y "forma de red".
 */
import type { SectorKey } from './sectorKeywords';

/** Mínimo de contratos firmados en la ventana para reportar promedio/mediana
 *  con confianza; si no, `muestra_suficiente: false`. */
export const MIN_SAMPLE_SIZE = 5;

export interface OportunidadActiva {
  valor_cop: number;
  n_procesos: number;
}

export interface CicloProceso {
  promedio_dias: number | null;
  mediana_dias: number | null;
  n_muestra: number;
  muestra_suficiente: boolean;
}

export interface Combinacion {
  departamento: string;
  sector: SectorKey;
  oportunidad_activa: OportunidadActiva;
  ciclo_proceso: CicloProceso;
}

export interface LandingMetricsPayload {
  fecha_corte: string; // YYYY-MM-DD
  combinaciones: Combinacion[];
  nacional: {
    oportunidad_activa: OportunidadActiva;
    ciclo_proceso: CicloProceso;
  };
}

/** Mediana de una lista de números. No muta el array de entrada. */
export function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function average(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/**
 * Arma el bloque `ciclo_proceso` a partir de la lista cruda de días
 * (fecha_de_fin_del_contrato − fecha_de_firma) de una combinación.
 */
export function buildCicloProceso(diasArray: number[]): CicloProceso {
  const n = diasArray.length;
  if (n === 0) {
    return { promedio_dias: null, mediana_dias: null, n_muestra: 0, muestra_suficiente: false };
  }
  return {
    promedio_dias: Math.round(average(diasArray)),
    mediana_dias: Math.round(median(diasArray)),
    n_muestra: n,
    muestra_suficiente: n >= MIN_SAMPLE_SIZE,
  };
}
```

- [ ] **Step 4: Correr el test, confirmar que pasa**

Run: `npm test -- landingMetrics`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/secop/landingMetrics.ts src/__tests__/secop/landingMetrics.test.ts
git commit -m "feat(secop): módulo puro de estadística para la matriz de métricas del landing"
```

---

### Task 7: Tabla `landing_metrics_cache` + migración

**Files:**
- Create: `src/lib/db/schema/landingMetrics.ts`
- Modify: `src/lib/db/schema/index.ts`

- [ ] **Step 1: Crear el schema**

```ts
// src/lib/db/schema/landingMetrics.ts
import { pgTable, uuid, jsonb, timestamp } from 'drizzle-orm/pg-core';
import type { LandingMetricsPayload } from '@/src/lib/secop/landingMetrics';

/**
 * Cache de la matriz precalculada de métricas del landing (departamento ×
 * sector). El generador (`src/lib/secop/landingMetricsGenerator.ts`, corrido
 * desde `scripts/generate-landing-metrics.ts` o el cron) hace DELETE+INSERT
 * en cada corrida — una sola fila vigente, sin historial.
 */
export const landingMetricsCache = pgTable('landing_metrics_cache', {
  id: uuid('id').defaultRandom().primaryKey(),
  data: jsonb('data').$type<LandingMetricsPayload>().notNull(),
  generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow().notNull(),
});
```

- [ ] **Step 2: Registrar el export**

En `src/lib/db/schema/index.ts`, agregar:

```ts
export * from './landingMetrics';
```

- [ ] **Step 3: Generar la migración**

Run: `npm run db:generate`
Expected: crea un nuevo archivo `drizzle/000X_<nombre>.sql` con `CREATE TABLE "landing_metrics_cache" (...)`. Confirmar con:

```bash
git status --short drizzle/
```

Expected: un nuevo `.sql` sin trackear en `drizzle/`.

- [ ] **Step 4: Aplicar la migración**

Run: `npm run db:migrate`
Expected: log de drizzle-kit confirmando que la migración se aplicó sin error.

- [ ] **Step 5: Verificar la tabla existe**

Run: `npm run db:studio` (abre Drizzle Studio) o, más rápido:

```bash
npx tsx -e "
import './scripts/_env';
import { pool } from './src/lib/db/client';
pool.query(\"select to_regclass('public.landing_metrics_cache')\").then(r => { console.log(r.rows); return pool.end(); });
"
```

Expected: `[ { to_regclass: 'landing_metrics_cache' } ]` (no `null`)

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/schema/landingMetrics.ts src/lib/db/schema/index.ts drizzle/
git commit -m "feat(db): tabla landing_metrics_cache para la matriz precalculada del landing"
```

---

### Task 8: Orquestación IO — `landingMetricsGenerator.ts`

Vive en `src/lib/`, no en `scripts/`, siguiendo el mismo patrón que `runIngestPipeline` (`src/lib/ingest/pipeline.ts`): tanto el CLI (Task 9) como el cron HTTP (Task 11) importan esta función directamente, sin que ninguno de los dos ejecute lógica de "programa principal" del otro. Pega a Socrata real — no se testea con mocks de red (mismo criterio que `landingStats.ts`, que tampoco tiene test file).

**Files:**
- Create: `src/lib/secop/landingMetricsGenerator.ts`

- [ ] **Step 1: Implementar**

```ts
// src/lib/secop/landingMetricsGenerator.ts
/**
 * Orquestación IO de la matriz de métricas del landing: pega a Socrata
 * (Procesos + Contratos) en vivo, arma el payload y lo persiste en
 * `landing_metrics_cache`. Compartido por el CLI (scripts/generate-landing-
 * metrics.ts) y el cron HTTP (app/api/cron/landing-metrics/route.ts) — igual
 * que `runIngestPipeline` es compartido por `run-ingest.ts` y
 * `app/api/cron/ingest`.
 *
 * Nunca toca la capa canónica del pipeline ELT (Postgres) para los datos en
 * sí — mismo criterio que `landingStats.ts`: Socrata directo, agregación
 * server-side (`sum`/`count`) donde SoQL lo permite; la mediana de
 * `ciclo_proceso` requiere traer filas crudas (SoQL no la agrega), con tope
 * de `$limit` documentado en cada fetch.
 */
import { db } from '@/src/lib/db/client';
import { landingMetricsCache } from '@/src/lib/db/schema';
import { sodaFetch, buildAguaWhere, buildAguaWhereContratos } from './client';
import { resolveDatasetId } from './datasetResolver';
import { FIELDS_PROCESOS, FIELDS_CONTRATOS } from './config';
import { SECTOR_KEYS, buildSectorWhere, type SectorKey } from './sectorKeywords';
import {
  buildCicloProceso,
  type LandingMetricsPayload,
  type Combinacion,
  type OportunidadActiva,
  type CicloProceso,
} from './landingMetrics';

const F = FIELDS_PROCESOS;
const C = FIELDS_CONTRATOS;

function soqlEscape(value: string): string {
  return value.replace(/'/g, "''");
}

/** Ventana de 12 meses hacia atrás, formato floating-timestamp SoQL. Precisión
 *  de día basta para un corte de 12 meses (a diferencia del corte de "mes
 *  actual" de landingStats.ts, no hace falta el ajuste de hora Bogotá). */
function twelveMonthsAgoSoql(now: Date): string {
  const d = new Date(now);
  d.setUTCFullYear(d.getUTCFullYear() - 1);
  return d.toISOString().replace('Z', '');
}

/** Departamentos con al menos un proceso abierto del sector agua — evita
 *  iterar los 33 a la fuerza. */
async function fetchDepartamentosConActividad(): Promise<string[]> {
  const where = `${buildAguaWhere()} AND ${F.estadoApertura} = 'Abierto'`;
  const rows = await sodaFetch<Record<string, string>>(
    await resolveDatasetId('procesos'),
    { $select: `${F.departamento}, count(*) as n`, $where: where, $group: F.departamento, $limit: 60, $offset: 0 },
  );
  return rows.map((r) => r[F.departamento]).filter((d): d is string => Boolean(d));
}

async function fetchOportunidadActiva(sector: SectorKey, departamento: string): Promise<OportunidadActiva> {
  const where = [
    buildSectorWhere(sector, [F.nombre, F.descripcion]),
    `${F.estadoApertura} = 'Abierto'`,
    `upper(${F.departamento}) = '${soqlEscape(departamento.toUpperCase())}'`,
  ].join(' AND ');
  const rows = await sodaFetch<{ valor_cop?: string; n_procesos?: string }>(
    await resolveDatasetId('procesos'),
    { $select: `sum(${F.precioBase}) as valor_cop, count(*) as n_procesos`, $where: where, $limit: 1, $offset: 0 },
  );
  const valor = Number(rows[0]?.valor_cop);
  const n = Number(rows[0]?.n_procesos);
  return { valor_cop: Number.isFinite(valor) ? valor : 0, n_procesos: Number.isFinite(n) ? n : 0 };
}

/** Días crudos (fecha_de_fin − fecha_de_firma) de contratos firmados en los
 *  últimos 12 meses para una combinación. Tope $limit=1000: suficiente para
 *  cualquier combinación depto×sector realista; si se alcanza, la mediana
 *  queda calculada sobre una muestra, no sobre el universo — aceptable dado
 *  que el JSON ya expone `n_muestra` explícitamente. */
async function fetchCicloProcesoDias(sector: SectorKey, departamento: string, now: Date): Promise<number[]> {
  const where = [
    buildSectorWhere(sector, [C.objeto]),
    `${C.fechaFirma} >= '${twelveMonthsAgoSoql(now)}'`,
    `upper(${C.departamento}) = '${soqlEscape(departamento.toUpperCase())}'`,
  ].join(' AND ');
  const rows = await sodaFetch<Record<string, string>>(
    await resolveDatasetId('contratos'),
    { $select: `${C.fechaFirma}, ${C.fechaFinContrato}`, $where: where, $limit: 1000, $offset: 0 },
  );
  return rows
    .map((r) => (new Date(r[C.fechaFinContrato]).getTime() - new Date(r[C.fechaFirma]).getTime()) / 86_400_000)
    .filter((d) => Number.isFinite(d) && d >= 0);
}

async function fetchNacional(
  now: Date,
): Promise<{ oportunidad_activa: OportunidadActiva; ciclo_proceso: CicloProceso }> {
  const whereProcesos = `${buildAguaWhere()} AND ${F.estadoApertura} = 'Abierto'`;
  const procesosRows = await sodaFetch<{ valor_cop?: string; n_procesos?: string }>(
    await resolveDatasetId('procesos'),
    { $select: `sum(${F.precioBase}) as valor_cop, count(*) as n_procesos`, $where: whereProcesos, $limit: 1, $offset: 0 },
  );
  const valor = Number(procesosRows[0]?.valor_cop);
  const n = Number(procesosRows[0]?.n_procesos);
  const oportunidad_activa: OportunidadActiva = {
    valor_cop: Number.isFinite(valor) ? valor : 0,
    n_procesos: Number.isFinite(n) ? n : 0,
  };

  const whereContratos = [buildAguaWhereContratos(), `${C.fechaFirma} >= '${twelveMonthsAgoSoql(now)}'`].join(
    ' AND ',
  );
  const contratosRows = await sodaFetch<Record<string, string>>(
    await resolveDatasetId('contratos'),
    { $select: `${C.fechaFirma}, ${C.fechaFinContrato}`, $where: whereContratos, $limit: 2000, $offset: 0 },
  );
  const dias = contratosRows
    .map((r) => (new Date(r[C.fechaFinContrato]).getTime() - new Date(r[C.fechaFirma]).getTime()) / 86_400_000)
    .filter((d) => Number.isFinite(d) && d >= 0);

  return { oportunidad_activa, ciclo_proceso: buildCicloProceso(dias) };
}

/**
 * Arma el payload completo. Best-effort por combinación: si una query
 * individual falla, esa combinación se omite (se loguea, no tumba la
 * corrida). Combinaciones con `n_procesos: 0` se omiten del array.
 */
export async function generateLandingMetrics(now: Date = new Date()): Promise<LandingMetricsPayload> {
  const departamentos = await fetchDepartamentosConActividad();
  const combinaciones: Combinacion[] = [];

  for (const departamento of departamentos) {
    for (const sector of SECTOR_KEYS) {
      try {
        const [oportunidad_activa, dias] = await Promise.all([
          fetchOportunidadActiva(sector, departamento),
          fetchCicloProcesoDias(sector, departamento, now),
        ]);
        if (oportunidad_activa.n_procesos === 0) continue;
        combinaciones.push({
          departamento,
          sector,
          oportunidad_activa,
          ciclo_proceso: buildCicloProceso(dias),
        });
      } catch (err) {
        console.warn(
          `[landingMetricsGenerator] combinación ${departamento}/${sector} falló, se omite (${
            err instanceof Error ? err.message : String(err)
          })`,
        );
      }
    }
  }

  const nacional = await fetchNacional(now);

  return {
    fecha_corte: now.toISOString().slice(0, 10),
    combinaciones,
    nacional,
  };
}

/** DELETE + INSERT: una sola fila vigente, sin historial (ver diseño §4). */
export async function persistLandingMetrics(payload: LandingMetricsPayload): Promise<void> {
  await db.delete(landingMetricsCache);
  await db.insert(landingMetricsCache).values({ data: payload });
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 3: Commit**

```bash
git add src/lib/secop/landingMetricsGenerator.ts
git commit -m "feat(secop): orquestación IO del generador de métricas del landing (Socrata + persistencia)"
```

---

### Task 9: CLI — `scripts/generate-landing-metrics.ts`

**Files:**
- Create: `scripts/generate-landing-metrics.ts`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Implementar el CLI**

```ts
// scripts/generate-landing-metrics.ts
/**
 * Genera la matriz precalculada departamento × sector para las métricas
 * interactivas del landing (oportunidad activa + tiempo de ejecución
 * contractual) y la guarda en `landing_metrics_cache`.
 *
 *   npm run db:generate-landing-metrics
 *
 * Requiere DATABASE_URL en .env.local (igual que los demás scripts db:*).
 * Cáscara CLI delgada — toda la orquestación vive en
 * src/lib/secop/landingMetricsGenerator.ts, compartida con el cron HTTP
 * (app/api/cron/landing-metrics).
 */
import './_env';
import { pool } from '@/src/lib/db/client';
import { generateLandingMetrics, persistLandingMetrics } from '@/src/lib/secop/landingMetricsGenerator';

async function main() {
  console.log('[generate-landing-metrics] iniciando…');
  const payload = await generateLandingMetrics();
  await persistLandingMetrics(payload);
  console.log(
    `[generate-landing-metrics] listo: ${payload.combinaciones.length} combinaciones, fecha_corte=${payload.fecha_corte}`,
  );
}

main()
  .catch((err) => {
    console.error('[generate-landing-metrics] falló:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
```

- [ ] **Step 2: Agregar el script a `package.json`**

En la sección `"scripts"`, junto a los demás `db:*`:

```json
    "db:generate-landing-metrics": "tsx scripts/generate-landing-metrics.ts"
```

- [ ] **Step 3: Verificar que compila (no correrlo todavía contra la red real — eso es Task 15)**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-landing-metrics.ts package.json
git commit -m "feat(scripts): CLI para regenerar la matriz de métricas del landing"
```

---

### Task 10: `GET /api/landing-metrics`

**Files:**
- Create: `app/api/landing-metrics/route.ts`

- [ ] **Step 1: Implementar**

```ts
// app/api/landing-metrics/route.ts
/**
 * Sirve la matriz precalculada de métricas del landing (última fila de
 * `landing_metrics_cache`). El front (`LandingMetrics.jsx`) hace un solo
 * fetch aquí al montar; el selector departamento×sector filtra el array ya
 * cargado, sin pegarle a esta ruta de nuevo.
 */
import { NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { db } from '@/src/lib/db/client';
import { landingMetricsCache } from '@/src/lib/db/schema';

export const runtime = 'nodejs';
export const revalidate = 3600;

export async function GET() {
  const rows = await db
    .select({ data: landingMetricsCache.data, generatedAt: landingMetricsCache.generatedAt })
    .from(landingMetricsCache)
    .orderBy(desc(landingMetricsCache.generatedAt))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return NextResponse.json({ error: 'landing-metrics aún no se ha generado' }, { status: 503 });
  }

  return NextResponse.json(row.data, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
  });
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 3: Commit**

```bash
git add app/api/landing-metrics/route.ts
git commit -m "feat(api): GET /api/landing-metrics sirve la matriz precalculada"
```

---

### Task 11: Cron — `app/api/cron/landing-metrics`

**Files:**
- Create: `app/api/cron/landing-metrics/route.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Implementar el route handler, mismo patrón que `app/api/cron/ingest`**

```ts
// app/api/cron/landing-metrics/route.ts
/**
 * Route handler:  GET /api/cron/landing-metrics
 *
 * Disparador HTTP de la regeneración periódica de la matriz de métricas del
 * landing. Lo invoca Vercel Cron según `vercel.json`. Mismo patrón que
 * `app/api/cron/ingest`: reusa la orquestación compartida
 * (`src/lib/secop/landingMetricsGenerator.ts`), NO llama `pool.end()` (el
 * pool es un singleton de larga vida del servidor corriendo, a diferencia
 * del CLI que sí lo cierra al terminar).
 *
 * Seguridad: mismo `CRON_SECRET` que `cron/ingest` — si está definido, se
 * exige como Bearer y se rechaza con 401 si no coincide.
 */
import { NextResponse } from 'next/server';
import { generateLandingMetrics, persistLandingMetrics } from '@/src/lib/secop/landingMetricsGenerator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    if (request.headers.get('authorization') !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }
  } else {
    console.warn('[cron/landing-metrics] CRON_SECRET no definido — endpoint sin protección');
  }

  try {
    console.log('[cron/landing-metrics] start', new Date().toISOString());
    const payload = await generateLandingMetrics();
    await persistLandingMetrics(payload);
    console.log(`[cron/landing-metrics] ok: ${payload.combinaciones.length} combinaciones`);
    return NextResponse.json({ ok: true, combinaciones: payload.combinaciones.length, fecha_corte: payload.fecha_corte });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[cron/landing-metrics] falló:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Agregar la entrada de cron a `vercel.json`**

> **Nota:** Vercel Hobby limita el número/frecuencia de cron jobs. Verificar cupo disponible en el dashboard de Vercel junto al cron de `/api/cron/ingest` ya existente antes de asumir que este correrá automáticamente — si no hay cupo, la regeneración queda solo manual (`npm run db:generate-landing-metrics`) sin bloquear el resto del trabajo (ver spec §2).

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    { "path": "/api/cron/ingest", "schedule": "0 11 * * *" },
    { "path": "/api/cron/landing-metrics", "schedule": "0 12 * * *" }
  ]
}
```

- [ ] **Step 3: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 4: Commit**

```bash
git add app/api/cron/landing-metrics/route.ts vercel.json
git commit -m "feat(cron): regeneración periódica de la matriz de métricas del landing"
```

---

### Task 12: `SecopExplorer` lee `departamento`/`sector` de la URL + selector de sector

**Files:**
- Modify: `src/components/secop/SecopExplorer.tsx`

- [ ] **Step 1: Import de `useSearchParams` y del tipo/labels de sector**

Al inicio del archivo, junto a los demás imports:

```tsx
import { useSearchParams } from "next/navigation";
import { SECTOR_KEYS, SECTOR_LABELS, type SectorKey } from "@/src/lib/secop/sectorKeywords";
```

- [ ] **Step 2: `Filters` gana `sector`, el estado inicial lee la URL una vez**

Cambiar la interfaz y el `useState`:

```tsx
interface Filters {
  q: string;
  departamento: string;
  estado: string;
  valorMin: string;
  sector: string;
}
```

```tsx
export default function SecopExplorer() {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<Filters>(() => ({
    q: "",
    departamento: searchParams.get("departamento") ?? "",
    estado: "",
    valorMin: "",
    sector: (SECTOR_KEYS as string[]).includes(searchParams.get("sector") ?? "")
      ? (searchParams.get("sector") as string)
      : "",
  }));
```

(el resto de `useState`/hooks que ya existían sigue igual, sin tocar)

- [ ] **Step 3: Enviar `sector` en el fetch a `/api/secop`**

En `fetchData`, junto a los demás `params.set(...)`:

```tsx
      if (filters.departamento) params.set("departamento", filters.departamento);
      if (filters.estado) params.set("estado", filters.estado);
      if (filters.valorMin) params.set("valorMin", filters.valorMin);
      if (filters.sector) params.set("sector", filters.sector);
```

- [ ] **Step 4: Agregar el `<select>` de sector en los controles**

Justo después del `<select>` de departamento en el JSX de `clr-wb-controls`:

```tsx
          <select className="clr-select" value={filters.departamento} onChange={set("departamento")}>
            <option value="">Todos los departamentos</option>
            {DEPARTAMENTOS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="clr-select" value={filters.sector} onChange={set("sector")}>
            <option value="">Todos los sub-sectores</option>
            {SECTOR_KEYS.map((s) => (
              <option key={s} value={s}>{SECTOR_LABELS[s as SectorKey]}</option>
            ))}
          </select>
```

- [ ] **Step 5: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 6: Verificación manual en navegador**

Con el dev server corriendo (`npm run dev`), navegar a
`http://localhost:3000/licitaciones/explorar?departamento=VALLE%20DEL%20CAUCA&sector=ptar` y confirmar:
- el selector de departamento arranca en "VALLE DEL CAUCA" (no vacío)
- el selector de sub-sector arranca en "PTAR" (no vacío)
- la lista de resultados refleja el filtro (menos procesos que sin filtrar)

- [ ] **Step 7: Commit**

```bash
git add src/components/secop/SecopExplorer.tsx
git commit -m "feat(licitaciones): SecopExplorer lee departamento/sector de la URL + selector de sub-sector"
```

---

### Task 13: Componente `LandingMetrics.jsx`

**Files:**
- Create: `src/components/landing/LandingMetrics.jsx`

- [ ] **Step 1: Implementar**

```jsx
// src/components/landing/LandingMetrics.jsx
// Métricas interactivas del landing: oportunidad activa + tiempo de
// ejecución contractual, filtrables por departamento × sector. Lee
// /api/landing-metrics (matriz precalculada) UNA sola vez al montar — el
// selector filtra en memoria, cero fetch adicional al interactuar.
"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatCopMilM } from "@/src/components/secop/format";
import { SECTOR_KEYS, SECTOR_LABELS } from "@/src/lib/secop/sectorKeywords";

const METRICS_CSS = `
.lm-section { padding: 0 0 var(--space-14); }
.lm-container { max-width: 1100px; margin: 0 auto; padding: 0 28px; }
.lm-header { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: var(--space-4); margin-bottom: var(--space-6); }
.lm-title { font-size: var(--fs-lg); font-weight: 700; color: var(--ink-900); margin: 0; }
.lm-fecha-corte { font-family: var(--font-mono); font-size: var(--fs-xs); color: var(--ink-300); }
.lm-controls { display: flex; flex-wrap: wrap; gap: var(--space-4); margin-bottom: var(--space-6); }
.lm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6); }
@media (max-width: 720px) { .lm-grid { grid-template-columns: 1fr; } }
.lm-stat-card { min-height: 170px; justify-content: space-between; }
.lm-stat-label { font-family: var(--font-mono); font-size: var(--fs-xs); letter-spacing: 0.12em; text-transform: uppercase; color: var(--accent); }
.lm-stat-value { font-size: var(--fs-xl); font-weight: 700; letter-spacing: -0.02em; color: var(--ink-900); font-variant-numeric: tabular-nums; }
.lm-stat-desc { font-size: var(--fs-sm); color: var(--ink-600); line-height: var(--lh-base); margin: 0; }
.lm-stat-fallback { font-size: var(--fs-sm); color: var(--ink-300); }
.lm-skeleton { display: inline-block; height: 0.68em; width: 80px; border-radius: 4px; background: linear-gradient(90deg, var(--line-soft) 25%, var(--line) 50%, var(--line-soft) 75%); background-size: 200% 100%; animation: lm-shimmer 1.6s ease-in-out infinite; }
@keyframes lm-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.lm-cta-row { margin-top: var(--space-6); }
.lm-cta-btn { display: inline-flex; align-items: center; gap: 8px; padding: 13px 24px; background: var(--accent); color: #fff; font-weight: 600; font-size: 14px; border-radius: 10px; text-decoration: none; transition: transform .18s, box-shadow .18s; }
.lm-cta-btn:hover { transform: translateY(-2px); box-shadow: var(--shadow-card-hover); }
`;

/** Espeja StatValue de LandingCards.jsx (mismo patrón visual, sin compartir
 *  código entre los dos archivos — es un componente de 6 líneas). */
function StatValue({ status, value }) {
  if (status === "loading") return <span className="lm-skeleton" aria-hidden="true" />;
  if (value == null) return <span className="lm-stat-fallback">—</span>;
  return <>{value}</>;
}

function useLandingMetrics() {
  const [state, setState] = useState({ status: "loading", data: null });

  useEffect(() => {
    let cancel = false;
    fetch("/api/landing-metrics")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        if (!cancel) setState({ status: "ready", data });
      })
      .catch(() => {
        if (!cancel) setState({ status: "error", data: null });
      });
    return () => {
      cancel = true;
    };
  }, []);

  return state;
}

function formatFechaCorte(iso) {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("es-CO", { month: "long", year: "numeric" }).replace(/\bde\s+/g, "");
}

const ZERO_COMBINACION = {
  oportunidad_activa: { valor_cop: 0, n_procesos: 0 },
  ciclo_proceso: { promedio_dias: null, mediana_dias: null, n_muestra: 0, muestra_suficiente: false },
};

export default function LandingMetrics() {
  const { status, data } = useLandingMetrics();
  const [departamento, setDepartamento] = useState("");
  const [sector, setSector] = useState("");

  const departamentos = useMemo(() => {
    const set = new Set((data?.combinaciones ?? []).map((c) => c.departamento));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [data]);

  const combinacion = useMemo(() => {
    if (!data) return null;
    if (!departamento && !sector) return data.nacional;
    const match = data.combinaciones.find(
      (c) => (!departamento || c.departamento === departamento) && (!sector || c.sector === sector),
    );
    return match ?? ZERO_COMBINACION;
  }, [data, departamento, sector]);

  const fechaCorte = formatFechaCorte(data?.fecha_corte);

  const ctaHref = useMemo(() => {
    const params = new URLSearchParams();
    if (departamento) params.set("departamento", departamento);
    if (sector) params.set("sector", sector);
    const qs = params.toString();
    return qs ? `/licitaciones/explorar?${qs}` : "/licitaciones/explorar";
  }, [departamento, sector]);

  if (status === "error") {
    return (
      <section className="lm-section" aria-label="Métricas de contratación pública en agua y saneamiento">
        <style dangerouslySetInnerHTML={{ __html: METRICS_CSS }} />
        <div className="lm-container">
          <p className="lm-stat-fallback">No pudimos cargar las métricas en este momento.</p>
        </div>
      </section>
    );
  }

  const oa = combinacion?.oportunidad_activa;
  const cp = combinacion?.ciclo_proceso;

  return (
    <section className="lm-section" aria-label="Métricas de contratación pública en agua y saneamiento">
      <style dangerouslySetInnerHTML={{ __html: METRICS_CSS }} />
      <div className="lm-container">
        <div className="lm-header">
          <h2 className="lm-title">Oportunidad en tu región</h2>
          {fechaCorte && <span className="lm-fecha-corte">Datos SECOP, corte: {fechaCorte}</span>}
        </div>

        <div className="lm-controls">
          <select
            className="clr-select"
            value={departamento}
            onChange={(e) => setDepartamento(e.target.value)}
            aria-label="Filtrar por departamento"
          >
            <option value="">Todo el país</option>
            {departamentos.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            className="clr-select"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            aria-label="Filtrar por sector"
          >
            <option value="">Todos los sectores</option>
            {SECTOR_KEYS.map((s) => (
              <option key={s} value={s}>{SECTOR_LABELS[s]}</option>
            ))}
          </select>
        </div>

        <div className="lm-grid">
          <div className="clr-card lm-stat-card">
            <span className="lm-stat-label">Oportunidad activa</span>
            <span className="lm-stat-value">
              <StatValue status={status} value={oa ? formatCopMilM(oa.valor_cop) : null} />
            </span>
            <p className="lm-stat-desc">
              {status === "loading"
                ? "Cargando…"
                : oa
                  ? `${oa.n_procesos.toLocaleString("es-CO")} procesos abiertos`
                  : "Sin datos para este filtro"}
            </p>
          </div>

          <div className="clr-card lm-stat-card">
            <span className="lm-stat-label">Tiempo de ejecución contractual</span>
            <span className="lm-stat-value">
              <StatValue
                status={status}
                value={cp ? (cp.muestra_suficiente ? `${cp.mediana_dias} días` : "Muestra insuficiente") : null}
              />
            </span>
            <p className="lm-stat-desc">
              {status === "loading"
                ? "Cargando…"
                : cp && cp.n_muestra > 0
                  ? `Mediana sobre ${cp.n_muestra.toLocaleString("es-CO")} contratos firmados (últimos 12 meses); promedio ${cp.promedio_dias} días`
                  : "Sin contratos firmados en los últimos 12 meses para este filtro"}
            </p>
          </div>
        </div>

        <div className="lm-cta-row">
          <Link href={ctaHref} className="lm-cta-btn">
            Ver estos procesos <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos (el archivo es `.jsx`, no se type-checkea directamente, pero sus imports desde `.ts` sí deben resolver).

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/LandingMetrics.jsx
git commit -m "feat(landing): componente LandingMetrics con selector interactivo departamento×sector"
```

---

### Task 14: Montar `LandingMetrics` en la landing

**Files:**
- Modify: `app/page.js:1-10, ~396`

- [ ] **Step 1: Import + montaje debajo de `LandingCards`**

```js
import LandingMetrics from "@/src/components/landing/LandingMetrics";
```

```jsx
      <LandingCards />
      <LandingMetrics />
```

- [ ] **Step 2: Commit**

```bash
git add app/page.js
git commit -m "feat(landing): monta LandingMetrics debajo de las dashboard cards"
```

---

### Task 15: Generar la matriz real y verificar en navegador

Este es el único paso que pega a Socrata de verdad y depende de `DATABASE_URL` local. Sin este paso, `/api/landing-metrics` devuelve 503 y `LandingMetrics.jsx` muestra el fallback.

**Files:** ninguno (solo verificación)

- [ ] **Step 1: Correr todos los tests unitarios (nada roto por los tasks anteriores)**

Run: `npm test`
Expected: PASS — todos los archivos, incluidos los nuevos de este plan.

- [ ] **Step 2: Correr el generador contra Socrata real**

Run: `npm run db:generate-landing-metrics`
Expected: log final tipo
`[generate-landing-metrics] listo: N combinaciones, fecha_corte=2026-07-18`
con `N > 0`. Si `N` es sospechosamente bajo (p. ej. 0), revisar el warning de cada combinación fallida en el log — no hay `try/catch` silencioso, cada falla se imprime.

- [ ] **Step 3: Levantar el dev server y pedir el JSON directo**

Run: `npm run dev` (si no está corriendo), luego en otra terminal:

```bash
curl -s http://localhost:3000/api/landing-metrics | python3 -m json.tool | head -40
```

Expected: JSON con `fecha_corte`, `combinaciones` (array no vacío) y `nacional.oportunidad_activa.n_procesos > 0`.

- [ ] **Step 4: Verificación visual en el navegador**

Con el Browser tool (o navegador normal), abrir `http://localhost:3000` y:
1. Confirmar que aparece la sección "Oportunidad en tu región" debajo de las 3 cards existentes, con la fecha de corte visible.
2. Cambiar el selector de departamento y de sector — confirmar en las DevTools (Network tab) que **no** se dispara ningún fetch nuevo a `/api/landing-metrics` al cambiar el selector (el único fetch debe ser el del montaje inicial).
3. Confirmar que las cifras cambian al cambiar el selector, y que una combinación sin datos muestra "0 procesos abiertos" / "Sin contratos firmados..." en vez de un placeholder ambiguo o un crash.
4. Click en "Ver estos procesos" con un departamento+sector seleccionados — confirmar que navega a `/licitaciones/explorar?departamento=...&sector=...` y que el workbench arranca ya filtrado con esos valores (selectores pre-poblados, lista de resultados acorde).

- [ ] **Step 5: Si todo lo anterior pasa, no hay commit adicional — este task es solo verificación.**

---

## Resumen de archivos tocados

**Nuevos:**
- `src/lib/secop/sectorKeywords.ts`
- `src/lib/secop/landingMetrics.ts`
- `src/lib/secop/landingMetricsGenerator.ts`
- `src/lib/db/schema/landingMetrics.ts`
- `scripts/generate-landing-metrics.ts`
- `app/api/landing-metrics/route.ts`
- `app/api/cron/landing-metrics/route.ts`
- `src/components/landing/LandingMetrics.jsx`
- Tests: `sectorKeywords.test.ts`, `landingMetrics.test.ts`, adiciones a `client-query.test.ts`, `route-parse.test.ts`, `format.test.ts`

**Modificados:**
- `src/lib/secop/config.ts` (campo `fechaFinContrato`)
- `src/lib/secop/client.ts` (`SodaParams.$group`, `buildAguaWhereContratos`, `buildProcesosWhere` + sector)
- `src/lib/secop/db-search.ts` (`sectorClauses` en `prepare()`)
- `src/lib/secop/parse-query.ts` (parseo de `sector`)
- `src/lib/secop/types.ts` (`SecopQuery.sector`)
- `src/lib/db/schema/index.ts` (export de la tabla nueva)
- `src/components/secop/format.ts` (`formatCopMilM` compartido)
- `src/components/landing/LandingCards.jsx` (usa el `formatCopMilM` compartido)
- `src/components/secop/SecopExplorer.tsx` (URL params + selector de sector)
- `app/page.js` (monta `LandingMetrics`)
- `package.json` (script `db:generate-landing-metrics`)
- `vercel.json` (cron nuevo)
- `drizzle/` (migración nueva)
