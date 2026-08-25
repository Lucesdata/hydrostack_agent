# Panel autenticado — plan de implementación

> **Para agentes ejecutores:** SUB-SKILL OBLIGATORIA: usa
> `superpowers:subagent-driven-development` (recomendado) o
> `superpowers:executing-plans` para implementar tarea por tarea. Los pasos
> usan casillas (`- [ ]`) para seguimiento.

**Objetivo:** dar al área autenticada una carcasa de aplicación y una home
`/panel` que se abre al terminar el registro, con los módulos existentes
dentro y con «Seguidos» funcionando de punta a punta.

**Arquitectura:** un `layout.tsx` de Next App Router bajo `app/panel/`
envuelve todas las rutas autenticadas con menú lateral, barra superior y
rail de AguaLicita. Las páginas son server components que leen de Postgres
vía Drizzle y delegan en la lógica ya existente (`verdict.ts`,
`matching/`, `pliego/`). La única capa nueva de datos es `proceso_seguido`.
Toda regla real vive en funciones puras testeables sin base de datos; los
componentes solo pintan.

**Stack:** Next.js 14.2.3 (App Router) · React 18 · TypeScript · Drizzle
ORM sobre Postgres (Neon) · Supabase Auth · Vitest.

**Spec:** [`docs/fase-b/SPEC-panel.md`](../../fase-b/SPEC-panel.md) — léelo
antes de empezar. Este plan argumenta desde él; cuando discrepen, manda el
spec.

## Restricciones globales

Aplican a **todas** las tareas. No se repiten en cada una.

- **Cero tokens nuevos.** Todo color, radio, sombra y tamaño de fuente sale
  de `app/globals.css`. Si necesitas un valor que no existe, para y
  pregunta — no lo inventes.
- **No se toca:** `src/lib/secop/verdict.ts`, `src/lib/matching/*`,
  `src/lib/pliego/extractPliegoHybrid.ts`, `src/lib/pliego/validate.ts`,
  `src/lib/alertas/*`, `PerfilForm`, `SectorZonaSetup`, `app/page.js` y
  toda la cara pública. Si crees que necesitas cambiarlos, el diseño está
  mal: para y pregunta.
- **No hay RLS en Postgres** (`CLAUDE.md` §4). Toda consulta sobre una tabla
  con datos por usuario lleva `WHERE usuarioId = …` explícito en código de
  aplicación. Sin excepción.
- **Degradación honesta.** Si un dato no se puede obtener, la interfaz
  muestra `—`, nunca `0` ni un valor inventado. Patrón de referencia:
  `app/api/landing-stats/route.ts`.
- **Reutiliza la ingesta. No consultes SECOP en vivo ni escribas consultas
  nuevas sobre `proceso`.** Ya existe una capa completa sobre los datos
  ingeridos y es la que hay que usar:
  - `searchProcesosDb(query)` y `countProcesosDb(query)` en
    `src/lib/secop/db-search.ts` — consultan `proceso` con sus joins a
    `entidad`, `geografia` y `raw_record`, y aceptan el mismo `SecopQuery`
    que la búsqueda en vivo.
  - `mapDbRowToProceso(row)` en el mismo archivo — convierte una fila de la
    base en un `SecopProceso`, que es **exactamente el tipo que consume
    `verdict.ts`**. Esa función es la bisagra entre la ingesta y el
    semáforo: úsala en vez de armar el objeto a mano.
  - `searchProcesosDbCached` / `countProcesosDbCached` en
    `cached-db-search.ts` — memoización por combinación de filtros. **Usa
    siempre las versiones cacheadas en render de página**; el filtro de
    agua es un escaneo sin índice de ~10 s en frío.
  - `KEYWORDS_AGUA` en `config.ts` — la única definición del sector. No
    escribas otra lista ni otro `ILIKE`.

  Si necesitas un dato que esta capa no expone, **amplíala** (por ejemplo,
  añadiendo un filtro a `SecopQuery`) en vez de escribir una consulta
  paralela. Duplicar el filtro de sector es el error más caro que puedes
  cometer aquí: son dos definiciones de qué es «agua y saneamiento».
- **Id de proceso:** siempre el id NATIVO de SECOP (`text`, formato
  `CO1.REQ.xxxx`), nunca el uuid interno de la tabla `proceso`. Es el
  criterio de `coincidencia.procesoId` y `pliego_proceso.procesoId`.
- **Idioma:** todo el texto de interfaz, los comentarios de código y los
  nombres de test van en español, como el resto del repositorio.
- **Iconos:** SVG en línea, trazo `1.6`, rejilla `18px`, `currentColor`.
  Ni un emoji. Ninguna librería de iconos.
- **Commits:** uno por tarea como mínimo, en español, formato
  `tipo(ámbito): descripción`.
- **Tests:** `npm test` (vitest). Los tests nuevos van bajo
  `src/__tests__/<módulo>/`. Estilo de la casa: `vi.mock` sobre
  `@/src/lib/db/client` con builders encadenados — ver
  `src/__tests__/oferente/perfil-store.test.ts`.

---

## Estructura de archivos

**Se crea:**

| Archivo | Responsabilidad |
|---|---|
| `src/lib/oferente/completitud.ts` | `perfilCompletitud()` — pura, sin base |
| `src/lib/seguimiento/estado.ts` | Máquina de estados pura, sin base |
| `src/lib/db/schema/seguimiento.ts` | Tabla `proceso_seguido` |
| `drizzle/0013_*.sql` | Migración |
| `src/lib/seguimiento/guardar.ts` | Seguir / dejar de seguir (idempotente) |
| `src/lib/seguimiento/listar.ts` | Listar y contar por usuario |
| `src/lib/seguimiento/avisos.ts` | `construirAvisos()` — pura |
| `src/lib/panel/serie-mensual.ts` | Serie de seis meses desde `proceso` |
| `src/components/panel/icons.tsx` | Los diez SVG |
| `src/components/panel/Sidebar.tsx` | Menú en dos mitades |
| `src/components/panel/Topbar.tsx` | Migas, buscador-enlace, sincronía |
| `src/components/panel/AguaLicitaPanel.tsx` | Estados A y B, sin lógica |
| `src/components/panel/VerdictCard.tsx` | Tarjeta de coincidencia con porqués |
| `src/components/panel/AvisoRow.tsx` | Fila de «Lo que corre» |
| `src/components/panel/EstadoSelect.tsx` | Cambio de estado (client) |
| `src/components/panel/PrimerIngreso.tsx` | Las tres tarjetas de P1-a |
| `src/lib/seguimiento/actions.ts` | Server actions de seguimiento |
| `src/components/panel/SeguirButton.tsx` | Botón seguir (client) |
| `app/panel/layout.tsx` + 7 `page.tsx` | Las rutas |

**Se modifica:** `middleware.ts` · `app/registro/page.tsx` ·
`app/login/page.tsx` · `src/lib/supabase/actions.ts` ·
`app/auth/callback/route.ts` · `app/mis-coincidencias/page.tsx` ·
`app/cuenta/page.tsx` · `app/perfil/page.tsx` · `app/globals.css`.

---

## Orden y dependencias

Las quince tareas se ejecutan **en orden numérico**, con dos salvedades:

1. **La Tarea 10 depende de `VerdictCard`, que se crea en la Tarea 12.**
   Dos formas válidas de resolverlo: hacer la 12 antes que la 10, o hacer
   la 10 dejando su paso 3 (coincidencias nuevas) para después de la 12.
   Elige una y dilo en el commit. No dupliques el componente.
2. **La Tarea 13 depende de la 3** (las funciones de escritura). Ya va
   después, pero si por lo que sea reordenas, esa dependencia es dura.

Las tareas 1 a 6 son de librería pura y no dependen de ninguna decisión
pendiente: se pueden hacer seguidas y sin ver una sola pantalla. Las tareas
9 a 15 son de interfaz y necesitan la carcasa (Tarea 7) montada.

**Puntos de corte razonables** si hay que entregar a medias: tras la Tarea
8 hay un panel navegable aunque vacío; tras la 11, una home completa; tras
la 13, «Seguidos» cerrado de punta a punta.

---

## Pre-vuelo — antes de la Tarea 3

**Obligatorio. No lo saltes: la Tarea 3 escribe una migración.**

La base de Neon tiene un límite de 512 MB y estuvo al 96 % en julio de
2026. El `DROP INDEX "raw_record_payload_gin_idx"` que libera ~101 MB está
escrito en `drizzle/0003_spotty_jack_power.sql`, pero **en ningún sitio del
repositorio consta que se haya aplicado en producción**.

- [ ] **Comprobar tamaño e índice antes de generar SQL nuevo**

```bash
psql "$DATABASE_URL" -c "SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size;"
psql "$DATABASE_URL" -c "SELECT indexrelname, pg_size_pretty(pg_relation_size(indexrelid)) AS size, idx_scan FROM pg_stat_user_indexes WHERE relname = 'raw_record';"
```

Interpretación:
- Si `raw_record_payload_gin_idx` **aparece**: la migración `0003` no se
  aplicó. Aplícala (`npm run db:migrate`) y vuelve a medir **antes** de
  seguir.
- Si `db_size` supera ~480 MB tras eso: **para y avisa al owner.** No
  fuerces una migración contra una base al límite — el error `53100`
  (`throttle_or_fail_extension`) ya bloqueó una migración en julio.
- Si no aparece y hay holgura: sigue a la Tarea 3.

> `npm run db:migrate` se colgó sin tocar la base en una sesión anterior.
> Si vuelve a pasar, no insistas ni improvises: avisa.

---

## Tarea 1: `perfilCompletitud()` — la función que nombra el hueco

**Archivos:**
- Crear: `src/lib/oferente/completitud.ts`
- Test: `src/__tests__/oferente/completitud.test.ts`

**Interfaces:**
- Consume: `PerfilGuardado`, `isPerfilCompleto` de
  `@/src/lib/oferente/perfil-minimo`; `OferenteProfile` de
  `@/src/lib/oferente/types`.
- Produce: `interface Completitud { pct: number; faltan: string[] }` y
  `perfilCompletitud(p: PerfilGuardado | null): Completitud`. Lo consumen
  la Tarea 8 (columna B) y la Tarea 6 (P1-b).

La interfaz **nombra** lo que falta, no solo lo mide: por eso `faltan` es
una lista de etiquetas legibles, no un número.

- [ ] **Paso 1: escribir el test que falla**

```ts
// src/__tests__/oferente/completitud.test.ts
import { describe, it, expect } from "vitest";
import { perfilCompletitud } from "@/src/lib/oferente/completitud";
import type { PerfilMinimo } from "@/src/lib/oferente/perfil-minimo";
import type { OferenteProfile } from "@/src/lib/oferente/types";

const minimo: PerfilMinimo = {
  id: "u1",
  sectoresUnspsc: ["83101"],
  cobertura: { departamentos: ["05"], municipios: [] },
};

const completo: OferenteProfile = {
  id: "u1",
  tipoPersona: "juridica",
  sectoresUnspsc: ["83101"],
  capacidadFinanciera: {
    capitalTrabajoCop: 500_000_000,
    indiceLiquidez: 2.1,
    indiceEndeudamiento: 0.3,
    razonCoberturaIntereses: 4,
    fuente: "manual",
    vigenciaHasta: null,
  },
  kCapacidadResidualCop: 2_980_000_000,
  cobertura: { departamentos: ["05"], municipios: [] },
  cuantiaObjetivo: { minCop: 100_000_000, maxCop: 2_500_000_000 },
};

describe("perfilCompletitud", () => {
  it("un perfil nulo es 0% y lo lista todo", () => {
    const r = perfilCompletitud(null);
    expect(r.pct).toBe(0);
    expect(r.faltan).toHaveLength(4);
  });

  it("un perfil mínimo tiene sector y zona, le faltan cuantía y RUP", () => {
    const r = perfilCompletitud(minimo);
    expect(r.pct).toBe(50);
    expect(r.faltan).toEqual(["Cuantía objetivo", "Indicadores financieros del RUP"]);
  });

  it("un perfil completo es 100% y no le falta nada", () => {
    const r = perfilCompletitud(completo);
    expect(r.pct).toBe(100);
    expect(r.faltan).toEqual([]);
  });

  it("no cuenta un sector vacío como puesto", () => {
    const r = perfilCompletitud({ ...minimo, sectoresUnspsc: [] });
    expect(r.faltan).toContain("Sector");
    expect(r.pct).toBe(25);
  });

  it("no cuenta una cobertura sin departamentos como puesta", () => {
    const r = perfilCompletitud({ ...minimo, cobertura: { departamentos: [], municipios: [] } });
    expect(r.faltan).toContain("Zona");
  });

  it("el RUP con índice de liquidez en 0 cuenta como no diligenciado", () => {
    const sinRup: OferenteProfile = {
      ...completo,
      capacidadFinanciera: { ...completo.capacidadFinanciera, indiceLiquidez: 0 },
    };
    const r = perfilCompletitud(sinRup);
    expect(r.faltan).toEqual(["Indicadores financieros del RUP"]);
    expect(r.pct).toBe(75);
  });
});
```

- [ ] **Paso 2: correr el test y verificar que falla**

Run: `npx vitest run src/__tests__/oferente/completitud.test.ts`
Esperado: FAIL — no se resuelve el módulo `completitud`.

- [ ] **Paso 3: implementación mínima**

```ts
// src/lib/oferente/completitud.ts

/**
 * Completitud del perfil de oferente, en porcentaje y con la lista de lo
 * que falta. La interfaz nombra el hueco (SPEC-panel §6.3), así que no
 * basta con un booleano — `isPerfilCompleto()` sigue siendo la fuente de
 * verdad de "está completo", esto solo lo desglosa para poder mostrarlo.
 *
 * Función pura: sin consulta a base, se testea sola.
 */

import { isPerfilCompleto, type PerfilGuardado } from "@/src/lib/oferente/perfil-minimo";

export interface Completitud {
  /** 0, 25, 50, 75 o 100 — cuatro tramos de igual peso. */
  pct: number;
  /** Etiquetas legibles de lo que falta, en orden de aparición en la UI. */
  faltan: string[];
}

const TRAMOS = ["Sector", "Zona", "Cuantía objetivo", "Indicadores financieros del RUP"] as const;

export function perfilCompletitud(p: PerfilGuardado | null): Completitud {
  if (!p) return { pct: 0, faltan: [...TRAMOS] };

  const completo = isPerfilCompleto(p);

  const puestos = [
    p.sectoresUnspsc.length > 0,
    p.cobertura.departamentos.length > 0,
    completo && (p.cuantiaObjetivo.minCop > 0 || p.cuantiaObjetivo.maxCop > 0),
    completo && p.capacidadFinanciera.indiceLiquidez > 0,
  ];

  const faltan = TRAMOS.filter((_, i) => !puestos[i]);
  const pct = Math.round((puestos.filter(Boolean).length / TRAMOS.length) * 100);

  return { pct, faltan };
}
```

- [ ] **Paso 4: correr el test y verificar que pasa**

Run: `npx vitest run src/__tests__/oferente/completitud.test.ts`
Esperado: PASS, 6 tests.

- [ ] **Paso 5: commit**

```bash
git add src/lib/oferente/completitud.ts src/__tests__/oferente/completitud.test.ts
git commit -m "feat(oferente): perfilCompletitud() desglosa qué falta en el perfil"
```

---

## Tarea 2: la máquina de estados de seguimiento

**Archivos:**
- Crear: `src/lib/seguimiento/estado.ts`
- Test: `src/__tests__/seguimiento/estado.test.ts`

**Interfaces:**
- Consume: nada.
- Produce: `type EstadoSeguimiento`, `ESTADOS_ORDEN`, `ESTADO_LABEL`,
  `ESTADO_INICIAL`, `puedeTransicionar(desde, hasta)`,
  `transicionesPermitidas(desde)`. Lo consumen las Tareas 3, 8 y 10.

Los seis estados los fija `PLAN-recorrido-oferente.md`. Sin base de datos:
esto es la única parte de «Seguidos» con reglas de verdad, así que se
testea sola.

- [ ] **Paso 1: escribir el test que falla**

```ts
// src/__tests__/seguimiento/estado.test.ts
import { describe, it, expect } from "vitest";
import {
  ESTADOS_ORDEN,
  ESTADO_INICIAL,
  ESTADO_LABEL,
  puedeTransicionar,
  transicionesPermitidas,
} from "@/src/lib/seguimiento/estado";

describe("estados de seguimiento", () => {
  it("son los seis del plan de recorrido, en orden", () => {
    expect(ESTADOS_ORDEN).toEqual([
      "en_revision",
      "voy_a_presentar",
      "presentada",
      "subsanando",
      "adjudicada",
      "no_adjudicada",
    ]);
  });

  it("todo estado tiene etiqueta legible", () => {
    for (const e of ESTADOS_ORDEN) expect(ESTADO_LABEL[e]).toBeTruthy();
  });

  it("seguir un proceso lo deja en revisión", () => {
    expect(ESTADO_INICIAL).toBe("en_revision");
  });
});

describe("puedeTransicionar", () => {
  it("avanza por el camino normal", () => {
    expect(puedeTransicionar("en_revision", "voy_a_presentar")).toBe(true);
    expect(puedeTransicionar("voy_a_presentar", "presentada")).toBe(true);
    expect(puedeTransicionar("presentada", "subsanando")).toBe(true);
    expect(puedeTransicionar("subsanando", "presentada")).toBe(true);
  });

  it("permite abandonar antes de presentar", () => {
    expect(puedeTransicionar("voy_a_presentar", "en_revision")).toBe(true);
  });

  it("no permite saltar de en revisión a presentada", () => {
    expect(puedeTransicionar("en_revision", "presentada")).toBe(false);
  });

  it("no permite volver atrás desde un desenlace", () => {
    expect(puedeTransicionar("adjudicada", "presentada")).toBe(false);
    expect(puedeTransicionar("no_adjudicada", "subsanando")).toBe(false);
  });

  it("los desenlaces son terminales", () => {
    expect(transicionesPermitidas("adjudicada")).toEqual([]);
    expect(transicionesPermitidas("no_adjudicada")).toEqual([]);
  });

  it("quedarse en el mismo estado no es una transición", () => {
    expect(puedeTransicionar("presentada", "presentada")).toBe(false);
  });
});
```

- [ ] **Paso 2: correr el test y verificar que falla**

Run: `npx vitest run src/__tests__/seguimiento/estado.test.ts`
Esperado: FAIL — no se resuelve el módulo `estado`.

- [ ] **Paso 3: implementación mínima**

```ts
// src/lib/seguimiento/estado.ts

/**
 * Los seis estados de un proceso seguido y las transiciones permitidas
 * entre ellos — tal como los fija docs/fase-b/PLAN-recorrido-oferente.md:
 * En revisión → Voy a presentar → Presentada → Subsanando →
 * Adjudicada / No adjudicada.
 *
 * `subsanando` no existe en el régimen español que inspira la referencia:
 * es propio del colombiano, y por eso el camino Presentada ↔ Subsanando va
 * en los dos sentidos (se subsana y se vuelve a quedar presentada).
 *
 * Función pura, sin base de datos. La escritura vive en guardar.ts.
 */

export type EstadoSeguimiento =
  | "en_revision"
  | "voy_a_presentar"
  | "presentada"
  | "subsanando"
  | "adjudicada"
  | "no_adjudicada";

export const ESTADOS_ORDEN: EstadoSeguimiento[] = [
  "en_revision",
  "voy_a_presentar",
  "presentada",
  "subsanando",
  "adjudicada",
  "no_adjudicada",
];

export const ESTADO_LABEL: Record<EstadoSeguimiento, string> = {
  en_revision: "En revisión",
  voy_a_presentar: "Voy a presentar",
  presentada: "Presentada",
  subsanando: "Subsanando",
  adjudicada: "Adjudicada",
  no_adjudicada: "No adjudicada",
};

/** Seguir un proceso siempre empieza aquí. */
export const ESTADO_INICIAL: EstadoSeguimiento = "en_revision";

const TRANSICIONES: Record<EstadoSeguimiento, EstadoSeguimiento[]> = {
  en_revision: ["voy_a_presentar"],
  voy_a_presentar: ["en_revision", "presentada"],
  presentada: ["subsanando", "adjudicada", "no_adjudicada"],
  subsanando: ["presentada", "adjudicada", "no_adjudicada"],
  adjudicada: [],
  no_adjudicada: [],
};

export function transicionesPermitidas(desde: EstadoSeguimiento): EstadoSeguimiento[] {
  return TRANSICIONES[desde];
}

export function puedeTransicionar(desde: EstadoSeguimiento, hasta: EstadoSeguimiento): boolean {
  return TRANSICIONES[desde].includes(hasta);
}
```

- [ ] **Paso 4: correr el test y verificar que pasa**

Run: `npx vitest run src/__tests__/seguimiento/estado.test.ts`
Esperado: PASS, 9 tests.

- [ ] **Paso 5: commit**

```bash
git add src/lib/seguimiento/estado.ts src/__tests__/seguimiento/estado.test.ts
git commit -m "feat(seguimiento): máquina de estados de proceso seguido"
```

---

## Tarea 3: la tabla `proceso_seguido` y su escritura

**Archivos:**
- Crear: `src/lib/db/schema/seguimiento.ts`
- Crear (generado): `drizzle/0013_*.sql`
- Crear: `src/lib/seguimiento/guardar.ts`
- Modificar: `src/lib/db/schema/index.ts`
- Test: `src/__tests__/seguimiento/guardar.test.ts`

**Interfaces:**
- Consume: `EstadoSeguimiento`, `ESTADO_INICIAL`, `puedeTransicionar` de la
  Tarea 2; `usuario` de `@/src/lib/db/schema/cuentas`.
- Produce: `procesoSeguido` (tabla) y tres funciones —
  `seguirProceso(usuarioId, procesoId)`,
  `dejarDeSeguir(usuarioId, procesoId)`,
  `cambiarEstado(usuarioId, procesoId, hasta)` — todas devolviendo
  `ResultadoSeguimiento`. La tabla la consume la Tarea 4; las tres
  funciones, la Tarea 13 (server actions).

**Pre-vuelo obligatorio antes de este paso.** Ver la sección de arriba.

- [ ] **Paso 1: escribir el esquema**

```ts
// src/lib/db/schema/seguimiento.ts

/**
 * Proceso que un usuario decidió seguir, con su estado en el recorrido.
 * Es la entidad que le da memoria al producto (movimiento 2 de
 * PLAN-recorrido-oferente.md): conecta el pliego extraído con el proceso
 * que lo originó y sostiene los avisos de cronograma.
 *
 * `procesoId` es el id NATIVO de SECOP (tipo "CO1.REQ.xxxx"), no el uuid
 * interno de la tabla `proceso` — mismo criterio que `coincidencia` en
 * cuentas.ts y `pliego_proceso` en pliego.ts: el motor de matching solo
 * conoce el id nativo.
 *
 * Multi-tenant SIN RLS (ver CLAUDE.md §4): toda consulta sobre esta tabla
 * DEBE filtrar por `usuarioId` en código de aplicación. No hay red debajo.
 */

import { pgTable, text, uuid, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { usuario } from "./cuentas";

export const procesoSeguido = pgTable(
  "proceso_seguido",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    usuarioId: text("usuario_id")
      .notNull()
      .references(() => usuario.id, { onDelete: "cascade" }),
    procesoId: text("proceso_id").notNull(),
    /** EstadoSeguimiento (src/lib/seguimiento/estado.ts) */
    estado: text("estado").notNull().default("en_revision"),
    creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
    actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    // Seguir dos veces el mismo proceso es idempotente, no un duplicado.
    uniqueIndex("proceso_seguido_usuario_proceso_uq").on(t.usuarioId, t.procesoId),
    index("proceso_seguido_usuario_estado_idx").on(t.usuarioId, t.estado),
  ]
);
```

- [ ] **Paso 2: exportar desde el índice del esquema**

Abre `src/lib/db/schema/index.ts` y añade la reexportación siguiendo
exactamente el patrón de las líneas vecinas (mismo orden alfabético y misma
forma que usan `pliego` y `eligibility`):

```ts
export * from "./seguimiento";
```

- [ ] **Paso 3: generar la migración**

```bash
npm run db:generate
```

Abre el `drizzle/0013_*.sql` generado y **léelo antes de seguir**. Debe
contener exactamente un `CREATE TABLE "proceso_seguido"`, un
`CREATE UNIQUE INDEX` y un `CREATE INDEX`, más el `ALTER TABLE … ADD
CONSTRAINT` de la clave foránea. Si trae cualquier otra cosa —un `DROP`,
una alteración de otra tabla— **para y avisa**: significa que el esquema
del repositorio y el de la base están desincronizados, y aplicar eso puede
destruir datos.

- [ ] **Paso 4: escribir el test que falla**

```ts
// src/__tests__/seguimiento/guardar.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const insertValuesMock = vi.fn();
const onConflictMock = vi.fn().mockResolvedValue(undefined);
const deleteWhereMock = vi.fn().mockResolvedValue(undefined);
const selectRowsMock = vi.fn().mockResolvedValue([{ estado: "en_revision" }]);
const updateSetMock = vi.fn();
const updateWhereMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/src/lib/db/client", () => ({
  db: {
    insert: () => ({
      values: (...a: unknown[]) => {
        insertValuesMock(...a);
        return { onConflictDoNothing: (...c: unknown[]) => onConflictMock(...c) };
      },
    }),
    delete: () => ({ where: (...a: unknown[]) => deleteWhereMock(...a) }),
    select: () => ({ from: () => ({ where: () => ({ limit: () => selectRowsMock() }) }) }),
    update: () => ({
      set: (...a: unknown[]) => {
        updateSetMock(...a);
        return { where: (...w: unknown[]) => updateWhereMock(...w) };
      },
    }),
  },
}));

import { seguirProceso, dejarDeSeguir, cambiarEstado } from "@/src/lib/seguimiento/guardar";

beforeEach(() => {
  vi.clearAllMocks();
  selectRowsMock.mockResolvedValue([{ estado: "en_revision" }]);
  onConflictMock.mockResolvedValue(undefined);
});

describe("seguirProceso", () => {
  it("inserta en estado inicial y devuelve ok", async () => {
    const r = await seguirProceso("u1", "CO1.REQ.999");
    expect(r).toEqual({ ok: true });
    expect(insertValuesMock).toHaveBeenCalledWith({
      usuarioId: "u1",
      procesoId: "CO1.REQ.999",
      estado: "en_revision",
    });
  });

  it("es idempotente: seguir dos veces no es error", async () => {
    await seguirProceso("u1", "CO1.REQ.999");
    const r = await seguirProceso("u1", "CO1.REQ.999");
    expect(r).toEqual({ ok: true });
    expect(onConflictMock).toHaveBeenCalledTimes(2);
  });

  it("degrada a DB_UNAVAILABLE si la base no responde", async () => {
    onConflictMock.mockRejectedValueOnce(new Error("connection refused"));
    const r = await seguirProceso("u1", "CO1.REQ.999");
    expect(r).toEqual({ ok: false, error: "DB_UNAVAILABLE" });
  });
});

describe("dejarDeSeguir", () => {
  it("borra y devuelve ok", async () => {
    const r = await dejarDeSeguir("u1", "CO1.REQ.999");
    expect(r).toEqual({ ok: true });
    expect(deleteWhereMock).toHaveBeenCalledTimes(1);
  });

  it("degrada a DB_UNAVAILABLE si la base no responde", async () => {
    deleteWhereMock.mockRejectedValueOnce(new Error("boom"));
    const r = await dejarDeSeguir("u1", "CO1.REQ.999");
    expect(r).toEqual({ ok: false, error: "DB_UNAVAILABLE" });
  });
});

describe("cambiarEstado", () => {
  it("aplica una transición permitida", async () => {
    const r = await cambiarEstado("u1", "CO1.REQ.999", "voy_a_presentar");
    expect(r).toEqual({ ok: true });
    expect(updateSetMock).toHaveBeenCalledWith(
      expect.objectContaining({ estado: "voy_a_presentar" })
    );
  });

  it("rechaza una transición no permitida sin tocar la base", async () => {
    const r = await cambiarEstado("u1", "CO1.REQ.999", "adjudicada");
    expect(r).toEqual({ ok: false, error: "TRANSICION_INVALIDA" });
    expect(updateSetMock).not.toHaveBeenCalled();
  });

  it("devuelve NO_ENCONTRADO si el usuario no sigue ese proceso", async () => {
    selectRowsMock.mockResolvedValueOnce([]);
    const r = await cambiarEstado("u1", "CO1.REQ.404", "voy_a_presentar");
    expect(r).toEqual({ ok: false, error: "NO_ENCONTRADO" });
    expect(updateSetMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Paso 5: correr el test y verificar que falla**

Run: `npx vitest run src/__tests__/seguimiento/guardar.test.ts`
Esperado: FAIL — no se resuelve el módulo `guardar`.

- [ ] **Paso 6: implementación mínima**

```ts
// src/lib/seguimiento/guardar.ts

/**
 * Escritura de proceso_seguido. Toda función filtra por usuarioId — no hay
 * RLS (CLAUDE.md §4) y esta tabla es multi-tenant.
 *
 * La validación de la transición se delega en estado.ts y ocurre ANTES de
 * tocar la base: una transición inválida no debe generar tráfico.
 */

import { and, eq } from "drizzle-orm";
import { db } from "@/src/lib/db/client";
import { procesoSeguido } from "@/src/lib/db/schema/seguimiento";
import {
  ESTADO_INICIAL,
  puedeTransicionar,
  type EstadoSeguimiento,
} from "@/src/lib/seguimiento/estado";

export type ResultadoSeguimiento =
  | { ok: true }
  | { ok: false; error: "DB_UNAVAILABLE" | "TRANSICION_INVALIDA" | "NO_ENCONTRADO" };

export async function seguirProceso(
  usuarioId: string,
  procesoId: string
): Promise<ResultadoSeguimiento> {
  try {
    await db
      .insert(procesoSeguido)
      .values({ usuarioId, procesoId, estado: ESTADO_INICIAL })
      .onConflictDoNothing({
        target: [procesoSeguido.usuarioId, procesoSeguido.procesoId],
      });
    return { ok: true };
  } catch {
    return { ok: false, error: "DB_UNAVAILABLE" };
  }
}

export async function dejarDeSeguir(
  usuarioId: string,
  procesoId: string
): Promise<ResultadoSeguimiento> {
  try {
    await db
      .delete(procesoSeguido)
      .where(
        and(eq(procesoSeguido.usuarioId, usuarioId), eq(procesoSeguido.procesoId, procesoId))
      );
    return { ok: true };
  } catch {
    return { ok: false, error: "DB_UNAVAILABLE" };
  }
}

export async function cambiarEstado(
  usuarioId: string,
  procesoId: string,
  hasta: EstadoSeguimiento
): Promise<ResultadoSeguimiento> {
  try {
    const filas = await db
      .select({ estado: procesoSeguido.estado })
      .from(procesoSeguido)
      .where(
        and(eq(procesoSeguido.usuarioId, usuarioId), eq(procesoSeguido.procesoId, procesoId))
      )
      .limit(1);

    const actual = filas[0]?.estado as EstadoSeguimiento | undefined;
    if (!actual) return { ok: false, error: "NO_ENCONTRADO" };
    if (!puedeTransicionar(actual, hasta)) return { ok: false, error: "TRANSICION_INVALIDA" };

    await db
      .update(procesoSeguido)
      .set({ estado: hasta, actualizadoEn: new Date() })
      .where(
        and(eq(procesoSeguido.usuarioId, usuarioId), eq(procesoSeguido.procesoId, procesoId))
      );
    return { ok: true };
  } catch {
    return { ok: false, error: "DB_UNAVAILABLE" };
  }
}
```

- [ ] **Paso 7: correr el test y verificar que pasa**

Run: `npx vitest run src/__tests__/seguimiento/guardar.test.ts`
Esperado: PASS, 8 tests.

- [ ] **Paso 8: aplicar la migración**

```bash
npm run db:migrate
```

Verifica que la tabla existe:

```bash
psql "$DATABASE_URL" -c "\d proceso_seguido"
```

Si `db:migrate` se cuelga sin devolver, **no insistas**: mátalo, avisa y
para. Es un fallo conocido del CLI de drizzle-kit en este proyecto.

- [ ] **Paso 9: commit**

```bash
git add src/lib/db/schema/seguimiento.ts src/lib/db/schema/index.ts drizzle/ \
        src/lib/seguimiento/guardar.ts src/__tests__/seguimiento/guardar.test.ts
git commit -m "feat(seguimiento): tabla proceso_seguido y su escritura"
```

---

## Tarea 4: leer y contar procesos seguidos

**Archivos:**
- Crear: `src/lib/seguimiento/listar.ts`
- Test: `src/__tests__/seguimiento/listar.test.ts`

**Interfaces:**
- Consume: `procesoSeguido` (Tarea 3), `ESTADOS_ORDEN`, `EstadoSeguimiento`
  (Tarea 2).
- Produce: `interface SeguidoRow { procesoId: string; estado:
  EstadoSeguimiento; creadoEn: Date; actualizadoEn: Date }`,
  `listarSeguidos(usuarioId): Promise<SeguidoRow[]>`,
  `agruparPorEstado(rows): Record<EstadoSeguimiento, SeguidoRow[]>` (pura),
  `contarPorEstado(rows): Record<EstadoSeguimiento, number>` (pura). Lo
  consumen las Tareas 7, 9 y 11.

El agrupado y el conteo son **puros y separados de la consulta** para poder
testearlos sin base — mismo criterio que `mapPliegoRow` en
`pliego-status.ts`, que también deja el SELECT sin test directo.

- [ ] **Paso 1: escribir el test que falla**

```ts
// src/__tests__/seguimiento/listar.test.ts
import { describe, it, expect, vi } from "vitest";

const selectRowsMock = vi.fn().mockResolvedValue([]);

vi.mock("@/src/lib/db/client", () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ orderBy: () => selectRowsMock() }) }) }),
  },
}));

import { listarSeguidos, agruparPorEstado, contarPorEstado } from "@/src/lib/seguimiento/listar";
import type { SeguidoRow } from "@/src/lib/seguimiento/listar";

const filas: SeguidoRow[] = [
  { procesoId: "A", estado: "en_revision", creadoEn: new Date(1), actualizadoEn: new Date(1) },
  { procesoId: "B", estado: "en_revision", creadoEn: new Date(2), actualizadoEn: new Date(2) },
  { procesoId: "C", estado: "presentada", creadoEn: new Date(3), actualizadoEn: new Date(3) },
];

describe("agruparPorEstado", () => {
  it("agrupa y deja vacíos los estados sin filas", () => {
    const g = agruparPorEstado(filas);
    expect(g.en_revision.map((r) => r.procesoId)).toEqual(["A", "B"]);
    expect(g.presentada.map((r) => r.procesoId)).toEqual(["C"]);
    expect(g.subsanando).toEqual([]);
    expect(g.adjudicada).toEqual([]);
  });

  it("con lista vacía devuelve los seis estados vacíos", () => {
    const g = agruparPorEstado([]);
    expect(Object.keys(g)).toHaveLength(6);
    expect(Object.values(g).every((v) => v.length === 0)).toBe(true);
  });
});

describe("contarPorEstado", () => {
  it("cuenta por estado incluyendo los ceros", () => {
    expect(contarPorEstado(filas)).toEqual({
      en_revision: 2,
      voy_a_presentar: 0,
      presentada: 1,
      subsanando: 0,
      adjudicada: 0,
      no_adjudicada: 0,
    });
  });
});

describe("listarSeguidos", () => {
  it("devuelve las filas de la base", async () => {
    selectRowsMock.mockResolvedValueOnce(filas);
    expect(await listarSeguidos("u1")).toEqual(filas);
  });

  it("degrada a lista vacía si la base no responde", async () => {
    selectRowsMock.mockRejectedValueOnce(new Error("boom"));
    expect(await listarSeguidos("u1")).toEqual([]);
  });
});
```

- [ ] **Paso 2: correr el test y verificar que falla**

Run: `npx vitest run src/__tests__/seguimiento/listar.test.ts`
Esperado: FAIL — no se resuelve el módulo `listar`.

- [ ] **Paso 3: implementación mínima**

```ts
// src/lib/seguimiento/listar.ts

/**
 * Lectura de proceso_seguido. El SELECT filtra por usuarioId (no hay RLS,
 * ver CLAUDE.md §4); el agrupado y el conteo son puros y viven aparte para
 * poder testearse sin base — mismo criterio que mapPliegoRow en
 * pliego-status.ts.
 *
 * `listarSeguidos` degrada a lista vacía si la base no responde: el panel
 * prefiere no mostrar el bloque a mostrar un error (SPEC-panel §6).
 */

import { desc, eq } from "drizzle-orm";
import { db } from "@/src/lib/db/client";
import { procesoSeguido } from "@/src/lib/db/schema/seguimiento";
import { ESTADOS_ORDEN, type EstadoSeguimiento } from "@/src/lib/seguimiento/estado";

export interface SeguidoRow {
  procesoId: string;
  estado: EstadoSeguimiento;
  creadoEn: Date;
  actualizadoEn: Date;
}

export async function listarSeguidos(usuarioId: string): Promise<SeguidoRow[]> {
  try {
    const filas = await db
      .select({
        procesoId: procesoSeguido.procesoId,
        estado: procesoSeguido.estado,
        creadoEn: procesoSeguido.creadoEn,
        actualizadoEn: procesoSeguido.actualizadoEn,
      })
      .from(procesoSeguido)
      .where(eq(procesoSeguido.usuarioId, usuarioId))
      .orderBy(desc(procesoSeguido.actualizadoEn));
    return filas as SeguidoRow[];
  } catch {
    return [];
  }
}

export function agruparPorEstado(rows: SeguidoRow[]): Record<EstadoSeguimiento, SeguidoRow[]> {
  const out = Object.fromEntries(ESTADOS_ORDEN.map((e) => [e, [] as SeguidoRow[]])) as Record<
    EstadoSeguimiento,
    SeguidoRow[]
  >;
  for (const r of rows) out[r.estado]?.push(r);
  return out;
}

export function contarPorEstado(rows: SeguidoRow[]): Record<EstadoSeguimiento, number> {
  const grupos = agruparPorEstado(rows);
  return Object.fromEntries(ESTADOS_ORDEN.map((e) => [e, grupos[e].length])) as Record<
    EstadoSeguimiento,
    number
  >;
}
```

- [ ] **Paso 4: correr el test y verificar que pasa**

Run: `npx vitest run src/__tests__/seguimiento/listar.test.ts`
Esperado: PASS, 5 tests.

- [ ] **Paso 5: commit**

```bash
git add src/lib/seguimiento/listar.ts src/__tests__/seguimiento/listar.test.ts
git commit -m "feat(seguimiento): listar, agrupar y contar procesos seguidos"
```

---

## Tarea 5: `construirAvisos()` — «Lo que corre»

**Archivos:**
- Crear: `src/lib/seguimiento/avisos.ts`
- Test: `src/__tests__/seguimiento/avisos.test.ts`

**Interfaces:**
- Consume: `EstadoSeguimiento` (Tarea 2).
- Produce: `type AvisoTipo`, `interface AvisoEntrada`, `interface Aviso`,
  `construirAvisos(entradas: AvisoEntrada[], ahora: Date): Aviso[]`. Lo
  consume la Tarea 10.

**Leer antes de empezar: SPEC-panel §6.4b.** `fechaCierre` **no existe en el
dataset Procesos de SECOP** — vive en el cronograma del pliego y solo está
disponible vía `getPliegoStatusForProcesos()`. Por eso `AvisoEntrada` la
recibe ya resuelta y anulable, y un proceso sin pliego **nunca** genera
aviso de cierre. No inventes una fecha ni la deduzcas de
`fechaPublicacion`.

Función pura: recibe todo ya cargado y devuelve la lista ordenada. Sin I/O.

- [ ] **Paso 1: escribir el test que falla**

```ts
// src/__tests__/seguimiento/avisos.test.ts
import { describe, it, expect } from "vitest";
import { construirAvisos, type AvisoEntrada } from "@/src/lib/seguimiento/avisos";

const AHORA = new Date("2026-08-25T12:00:00Z");
const enDias = (d: number) => new Date(AHORA.getTime() + d * 86_400_000).toISOString();

const base: AvisoEntrada = {
  procesoId: "CO1.REQ.1",
  titulo: "Optimización de red de acueducto",
  entidad: "MUNICIPIO DE SOACHA",
  referencia: "LP-2026-041",
  estado: "voy_a_presentar",
  fechaCierre: null,
  tienePliego: false,
};

describe("construirAvisos — cierre", () => {
  it("no emite aviso de cierre sin pliego, aunque haya fecha", () => {
    const r = construirAvisos([{ ...base, fechaCierre: enDias(3), tienePliego: false }], AHORA);
    expect(r.filter((a) => a.tipo === "cierre")).toEqual([]);
  });

  it("emite severidad alta a 4 días", () => {
    const r = construirAvisos([{ ...base, fechaCierre: enDias(4), tienePliego: true }], AHORA);
    expect(r[0]).toMatchObject({ tipo: "cierre", diasRestantes: 4, severidad: "alta" });
  });

  it("emite severidad media a 9 días", () => {
    const r = construirAvisos([{ ...base, fechaCierre: enDias(9), tienePliego: true }], AHORA);
    expect(r[0]).toMatchObject({ tipo: "cierre", diasRestantes: 9, severidad: "media" });
  });

  it("no emite nada a 30 días: no corre prisa", () => {
    const r = construirAvisos([{ ...base, fechaCierre: enDias(30), tienePliego: true }], AHORA);
    expect(r).toEqual([]);
  });

  it("no emite nada si el cierre ya pasó", () => {
    const r = construirAvisos([{ ...base, fechaCierre: enDias(-2), tienePliego: true }], AHORA);
    expect(r).toEqual([]);
  });

  it("ignora una fecha de cierre corrupta en vez de reventar", () => {
    const r = construirAvisos([{ ...base, fechaCierre: "no-es-fecha", tienePliego: true }], AHORA);
    expect(r).toEqual([]);
  });

  it("no avisa de procesos ya resueltos", () => {
    const r = construirAvisos(
      [{ ...base, estado: "adjudicada", fechaCierre: enDias(3), tienePliego: true }],
      AHORA
    );
    expect(r).toEqual([]);
  });
});

describe("construirAvisos — pliego sin analizar", () => {
  it("avisa de un proceso seguido sin pliego", () => {
    const r = construirAvisos([{ ...base, tienePliego: false }], AHORA);
    expect(r[0]).toMatchObject({
      tipo: "pliego_sin_analizar",
      procesoId: "CO1.REQ.1",
      severidad: "neutra",
      diasRestantes: null,
    });
  });

  it("no avisa si el pliego ya está", () => {
    const r = construirAvisos([{ ...base, tienePliego: true }], AHORA);
    expect(r).toEqual([]);
  });
});

describe("construirAvisos — orden y tope", () => {
  it("ordena por urgencia: cierre antes que pliego, y menos días primero", () => {
    const r = construirAvisos(
      [
        { ...base, procesoId: "P", tienePliego: false },
        { ...base, procesoId: "C9", fechaCierre: enDias(9), tienePliego: true },
        { ...base, procesoId: "C2", fechaCierre: enDias(2), tienePliego: true },
      ],
      AHORA
    );
    expect(r.map((a) => a.procesoId)).toEqual(["C2", "C9", "P"]);
  });

  it("nunca devuelve más de tres", () => {
    const muchos = Array.from({ length: 7 }, (_, i) => ({
      ...base,
      procesoId: `P${i}`,
      tienePliego: false,
    }));
    expect(construirAvisos(muchos, AHORA)).toHaveLength(3);
  });

  it("sin entradas devuelve lista vacía, no un aviso de 'todo en orden'", () => {
    expect(construirAvisos([], AHORA)).toEqual([]);
  });
});
```

- [ ] **Paso 2: correr el test y verificar que falla**

Run: `npx vitest run src/__tests__/seguimiento/avisos.test.ts`
Esperado: FAIL — no se resuelve el módulo `avisos`.

- [ ] **Paso 3: implementación mínima**

```ts
// src/lib/seguimiento/avisos.ts

/**
 * «Lo que corre»: los avisos del panel sobre procesos seguidos.
 *
 * IMPORTANTE (SPEC-panel §6.4b): `fechaCierre` NO existe en el dataset
 * Procesos de SECOP — vive en el cronograma del pliego, y el caller la
 * obtiene de getPliegoStatusForProcesos(). Un proceso sin pliego extraído
 * no puede generar aviso de cierre, y no se deduce de fechaPublicacion ni
 * de ninguna otra cosa: se calla.
 *
 * El tipo `adenda` del diseño NO se implementa aquí — necesita el paso 9
 * del plan de recorrido (comparar versiones ingeridas). No se simula.
 *
 * Función pura: recibe todo cargado, sin I/O.
 */

import type { EstadoSeguimiento } from "@/src/lib/seguimiento/estado";

export type AvisoTipo = "cierre" | "pliego_sin_analizar";
export type AvisoSeveridad = "alta" | "media" | "neutra";

/** Umbrales en días naturales. Fuera de CIERRE_MEDIA no corre prisa. */
const CIERRE_ALTA = 5;
const CIERRE_MEDIA = 10;
const MAX_AVISOS = 3;

/** Estados en los que ya no hay nada que hacer con el proceso. */
const RESUELTOS: EstadoSeguimiento[] = ["adjudicada", "no_adjudicada"];

export interface AvisoEntrada {
  procesoId: string;
  titulo: string;
  entidad: string;
  referencia: string | null;
  estado: EstadoSeguimiento;
  /** ISO, ya resuelta desde el pliego por el caller. null si no hay pliego. */
  fechaCierre: string | null;
  tienePliego: boolean;
}

export interface Aviso {
  tipo: AvisoTipo;
  severidad: AvisoSeveridad;
  procesoId: string;
  titulo: string;
  entidad: string;
  referencia: string | null;
  estado: EstadoSeguimiento;
  /** Solo para el tipo `cierre`. */
  diasRestantes: number | null;
}

function diasHasta(iso: string, ahora: Date): number | null {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - ahora.getTime()) / 86_400_000);
}

export function construirAvisos(entradas: AvisoEntrada[], ahora: Date): Aviso[] {
  const cierres: Aviso[] = [];
  const pliegos: Aviso[] = [];

  for (const e of entradas) {
    if (RESUELTOS.includes(e.estado)) continue;

    const comun = {
      procesoId: e.procesoId,
      titulo: e.titulo,
      entidad: e.entidad,
      referencia: e.referencia,
      estado: e.estado,
    };

    // Cierre: exige pliego extraído (§6.4b).
    if (e.tienePliego && e.fechaCierre) {
      const dias = diasHasta(e.fechaCierre, ahora);
      if (dias !== null && dias >= 0 && dias <= CIERRE_MEDIA) {
        cierres.push({
          ...comun,
          tipo: "cierre",
          severidad: dias <= CIERRE_ALTA ? "alta" : "media",
          diasRestantes: dias,
        });
      }
    }

    if (!e.tienePliego) {
      pliegos.push({
        ...comun,
        tipo: "pliego_sin_analizar",
        severidad: "neutra",
        diasRestantes: null,
      });
    }
  }

  cierres.sort((a, b) => (a.diasRestantes ?? 0) - (b.diasRestantes ?? 0));
  return [...cierres, ...pliegos].slice(0, MAX_AVISOS);
}
```

- [ ] **Paso 4: correr el test y verificar que pasa**

Run: `npx vitest run src/__tests__/seguimiento/avisos.test.ts`
Esperado: PASS, 12 tests.

- [ ] **Paso 5: commit**

```bash
git add src/lib/seguimiento/avisos.ts src/__tests__/seguimiento/avisos.test.ts
git commit -m "feat(seguimiento): construirAvisos() para el bloque Lo que corre"
```

---

## Tarea 6: la serie de seis meses — sobre la ingesta, no sobre Socrata

**Archivos:**
- Modificar: `src/lib/secop/db-search.ts` (añadir `countProcesosPorMesDb`)
- Crear: `src/lib/panel/serie-mensual.ts`
- Test: `src/__tests__/panel/serie-mensual.test.ts`

**Interfaces:**
- Consume: `countProcesosPorMesDb` (que añades aquí a `db-search.ts`).
- Produce: `interface PuntoMes { etiqueta: string; anio: number; mes: number;
  procesos: number }`, `ultimosSeisMeses(ahora)` (pura),
  `rellenarSerie(crudo, meses)` (pura),
  `getSerieMensual(ahora?): Promise<PuntoMes[] | null>`. Lo consume la
  Tarea 11.

> ### Lee esto antes de escribir una sola línea
>
> **`clasificacion_sectorial` está vacía.** Lo documenta la cabecera de
> `src/lib/secop/cached-db-search.ts`, y `PENDIENTES.md` lo arrastra desde
> julio. Una consulta que filtre por `sector_agua = true` devolverá **cero
> en los seis meses** y parecerá que el mes está muerto.
>
> El filtro de sector que **sí funciona hoy** es el de
> `db-search.ts` → `prepare()`: `ILIKE` de `KEYWORDS_AGUA` sobre
> `nombre` y `descripción` extraídos de `raw_record.payload`. Es la única
> definición viva de «agua y saneamiento» sobre datos ingeridos.
>
> Por eso esta tarea **no escribe una consulta nueva**: añade una función
> al archivo que ya tiene ese predicado, para que la definición de sector
> siga siendo una sola.
>
> **Coste:** ese `ILIKE` escanea sin índice — ~10 s en frío, medido en dev.
> Por eso la serie se resuelve en **una** consulta agrupada, no en seis
> llamadas a `countProcesosDb`.

- [ ] **Paso 1: añadir el agregado a `db-search.ts`**

Va **en `db-search.ts`**, junto a `countProcesosDb`, para que reuse
`prepare()` y con él el predicado de agua. No lo pongas en otro archivo.

```ts
/**
 * Procesos por mes de publicación, para la serie del panel. Reusa el mismo
 * `prepare()` que la búsqueda —y por tanto el mismo filtro KEYWORDS_AGUA—
 * para que no existan dos definiciones de "sector agua" sobre la base.
 *
 * Una sola consulta agrupada en vez de N llamadas a countProcesosDb: el
 * predicado de agua escanea sin índice y repetirlo seis veces es seis
 * veces el coste.
 */
export async function countProcesosPorMesDb(
  desde: string,
  query: SecopQuery = {}
): Promise<{ anio: number; mes: number; procesos: number }[]> {
  const { db, sql, where, proceso, entidad, geografia, rawRecord } = await prepare({
    ...query,
    desde,
  });
  const { eq } = await import("drizzle-orm");

  const filas = await db
    .select({
      anio: sql<number>`EXTRACT(YEAR FROM ${proceso.fechaPublicacion})::int`,
      mes: sql<number>`EXTRACT(MONTH FROM ${proceso.fechaPublicacion})::int`,
      procesos: sql<number>`COUNT(*)::int`,
    })
    .from(proceso)
    .leftJoin(entidad, eq(proceso.entidadId, entidad.id))
    .leftJoin(geografia, eq(proceso.geografiaId, geografia.codigoDivipola))
    .leftJoin(rawRecord, eq(proceso.rawRecordIdActual, rawRecord.id))
    .where(where)
    .groupBy(sql`1, 2`)
    .orderBy(sql`1, 2`);

  return filas.map((f) => ({
    anio: Number(f.anio),
    mes: Number(f.mes),
    procesos: Number(f.procesos),
  }));
}
```

**Los tres `leftJoin` son obligatorios** aunque el `SELECT` no use sus
columnas: el `where` que devuelve `prepare()` referencia `raw_record.payload`
(el filtro de agua) y `geografia` (el de departamento). Sin ellos, Postgres
falla.

- [ ] **Paso 2: escribir el test que falla**

```ts
// src/__tests__/panel/serie-mensual.test.ts
import { describe, it, expect, vi } from "vitest";

const porMesMock = vi.fn().mockResolvedValue([]);
vi.mock("@/src/lib/secop/db-search", () => ({
  countProcesosPorMesDb: (...a: unknown[]) => porMesMock(...a),
}));

import { ultimosSeisMeses, rellenarSerie, getSerieMensual } from "@/src/lib/panel/serie-mensual";

const AHORA = new Date("2026-08-25T12:00:00Z");

describe("ultimosSeisMeses", () => {
  it("devuelve seis meses terminando en el actual", () => {
    expect(ultimosSeisMeses(AHORA)).toEqual([
      { anio: 2026, mes: 3 }, { anio: 2026, mes: 4 }, { anio: 2026, mes: 5 },
      { anio: 2026, mes: 6 }, { anio: 2026, mes: 7 }, { anio: 2026, mes: 8 },
    ]);
  });

  it("cruza el cambio de año hacia atrás", () => {
    expect(ultimosSeisMeses(new Date("2026-02-10T00:00:00Z"))[0]).toEqual({ anio: 2025, mes: 9 });
  });
});

describe("rellenarSerie", () => {
  it("pone 0 en los meses sin filas y respeta el orden", () => {
    const s = rellenarSerie([{ anio: 2026, mes: 8, procesos: 14 }], ultimosSeisMeses(AHORA));
    expect(s).toHaveLength(6);
    expect(s[5]).toEqual({ etiqueta: "AGO", anio: 2026, mes: 8, procesos: 14 });
    expect(s[0]).toEqual({ etiqueta: "MAR", anio: 2026, mes: 3, procesos: 0 });
  });

  it("ignora filas fuera de la ventana", () => {
    const s = rellenarSerie([{ anio: 2020, mes: 1, procesos: 99 }], ultimosSeisMeses(AHORA));
    expect(s.every((p) => p.procesos === 0)).toBe(true);
  });
});

describe("getSerieMensual", () => {
  it("pide a la capa de búsqueda desde el primer día de la ventana", async () => {
    await getSerieMensual(AHORA);
    expect(porMesMock).toHaveBeenCalledWith("2026-03-01");
  });

  it("mapea las filas a la serie rellenada", async () => {
    porMesMock.mockResolvedValueOnce([{ anio: 2026, mes: 8, procesos: 14 }]);
    const s = await getSerieMensual(AHORA);
    expect(s?.[5].procesos).toBe(14);
  });

  it("devuelve null si la consulta falla", async () => {
    porMesMock.mockRejectedValueOnce(new Error("boom"));
    expect(await getSerieMensual(AHORA)).toBeNull();
  });
});
```

- [ ] **Paso 3: correr el test y verificar que falla**

Run: `npx vitest run src/__tests__/panel/serie-mensual.test.ts`
Esperado: FAIL — no se resuelve el módulo `serie-mensual`.

- [ ] **Paso 4: implementación mínima**

```ts
// src/lib/panel/serie-mensual.ts

/**
 * Procesos de agua y saneamiento abiertos por mes, últimos seis meses.
 * Alimenta el bloque "Agosto en SECOP II" del panel (SPEC-panel §4 P2).
 *
 * Se resuelve contra la INGESTA (tabla `proceso`) reutilizando
 * countProcesosPorMesDb, que a su vez reusa el predicado KEYWORDS_AGUA de
 * db-search.ts. No consulta Socrata y no define su propio filtro de sector:
 * una sola definición de "agua" sobre la base.
 *
 * El troceado y el relleno son puros y viven aparte para testearse sin
 * base. Devuelve null si la consulta falla: el panel oculta el bloque en
 * vez de dibujar seis ceros que no son verdad.
 */

import { countProcesosPorMesDb } from "@/src/lib/secop/db-search";

export interface PuntoMes {
  /** Versalitas de tres letras para el eje: MAR, ABR… */
  etiqueta: string;
  anio: number;
  mes: number;
  procesos: number;
}

export interface FilaCruda {
  anio: number;
  mes: number;
  procesos: number;
}

const ETIQUETAS = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];

export function ultimosSeisMeses(ahora: Date): { anio: number; mes: number }[] {
  const out: { anio: number; mes: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() - i, 1));
    out.push({ anio: d.getUTCFullYear(), mes: d.getUTCMonth() + 1 });
  }
  return out;
}

export function rellenarSerie(
  crudo: FilaCruda[],
  meses: { anio: number; mes: number }[]
): PuntoMes[] {
  return meses.map(({ anio, mes }) => {
    const fila = crudo.find((c) => Number(c.anio) === anio && Number(c.mes) === mes);
    return { etiqueta: ETIQUETAS[mes - 1], anio, mes, procesos: Number(fila?.procesos ?? 0) };
  });
}

export async function getSerieMensual(ahora: Date = new Date()): Promise<PuntoMes[] | null> {
  const meses = ultimosSeisMeses(ahora);
  const desde = `${meses[0].anio}-${String(meses[0].mes).padStart(2, "0")}-01`;
  try {
    return rellenarSerie(await countProcesosPorMesDb(desde), meses);
  } catch {
    return null;
  }
}
```

- [ ] **Paso 5: correr el test y verificar que pasa**

Run: `npx vitest run src/__tests__/panel/serie-mensual.test.ts`
Esperado: PASS, 7 tests. Corre también la suite de búsqueda para
comprobar que no rompiste `prepare()`:
`npx vitest run src/__tests__/secop`

- [ ] **Paso 6: medir el coste real contra la base**

```bash
npx tsx -e "import('./src/lib/panel/serie-mensual.ts').then(async m => { const t = Date.now(); console.log(await m.getSerieMensual()); console.log('ms:', Date.now() - t); })"
```

Anota el tiempo en el commit. **Si tarda más de ~3 s**, la Tarea 11 debe
envolver la llamada en la memoización de `cached-db-search.ts` (mismo
patrón `globalThis` + TTL) antes de ponerla en el render del panel. No
metas la serie en la página sin haber medido esto.

Si la serie sale plana a cero con datos reales, no cambies la consulta para
maquillarlo: significa que la ingesta no tiene procesos de agua en la
ventana. Anótalo y avisa.

- [ ] **Paso 7: commit**

```bash
git add src/lib/secop/db-search.ts src/lib/panel/serie-mensual.ts \
        src/__tests__/panel/serie-mensual.test.ts
git commit -m "feat(panel): serie mensual sobre la ingesta, reusando el filtro de agua"
```

---

> **Nota para las tareas 7 a 15.** Este repositorio **no tiene tests de
> componentes** — las 63 suites de `src/__tests__/` son todas de librería.
> No montes React Testing Library para esto: sería introducir un andamiaje
> nuevo a mitad de una tarea de interfaz. La verificación de las tareas de
> UI es, en este orden: `npm run lint` → `npm run build` → **abrir la ruta
> en el navegador y mirarla**. Cada tarea dice exactamente qué mirar.
>
> La referencia visual son los mockups aprobados:
> <https://claude.ai/code/artifact/21a499e3-38e9-46c8-804d-26bfeb41794d>

---

## Tarea 7: la carcasa

**Archivos:**
- Crear: `src/components/panel/icons.tsx`
- Crear: `src/components/panel/Sidebar.tsx`
- Crear: `src/components/panel/Topbar.tsx`
- Crear: `src/components/panel/AguaLicitaPanel.tsx`
- Crear: `app/panel/layout.tsx`
- Crear: `app/panel/page.tsx` (provisional, se completa en la Tarea 9)
- Modificar: `app/globals.css` (añadir al final, clases `.pnl-*`)

**Interfaces:**
- Consume: `getSessionUser` de `@/src/lib/supabase/get-session-user`;
  `getPerfilDb` de `@/src/lib/oferente/perfil-store`; `perfilCompletitud`
  (Tarea 1); `listarSeguidos` (Tarea 4).
- Produce: `<Sidebar conteos={SidebarConteos} usuario={SidebarUsuario} />`
  (client, resuelve el ítem activo con `usePathname()`);
  `<Topbar migas={string[]} />`; `<AguaLicitaPanel abierto={boolean} />`;
  y los diez iconos de `icons.tsx`.
  Lo consumen las Tareas 9 a 15.

- [ ] **Paso 1: añadir las clases al final de `app/globals.css`**

Van **al final del archivo**, tras el bloque de `.clr-verdict-*`, con su
propio comentario de sección. Ningún token nuevo: todo son `var(--…)` que
ya existen.

```css
/* ── Panel autenticado — carcasa (pnl-*) ──────────────────────────────────
   Área autenticada bajo /panel. Reusa los tokens del tema claro "clear";
   no define ninguno propio. Ver docs/fase-b/SPEC-panel.md §3.
──────────────────────────────────────────────────────────────────────────── */
.pnl-shell {
  display: flex;
  min-height: 100vh;
  background: var(--bg);
  color: var(--ink-900);
  font-family: var(--font-sans);
  cursor: auto;
}
.pnl-side {
  width: 248px;
  flex-shrink: 0;
  background: var(--surface);
  border-right: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  padding: 16px 12px;
  gap: 22px;
}
.pnl-brand { display: flex; align-items: center; gap: 9px; padding: 0 6px; }
.pnl-brand-mark {
  width: 28px; height: 28px; border-radius: 8px;
  background: linear-gradient(155deg, var(--accent-river) 0%, var(--accent-ocean) 100%);
  color: #fff; display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 13px;
  box-shadow: var(--shadow-logo), inset 0 1px 0 rgba(255, 255, 255, 0.22);
}
.pnl-group { display: flex; flex-direction: column; gap: 3px; }
.pnl-group-label {
  font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--ink-300); padding: 0 10px; margin: 0 0 6px;
}
.pnl-item {
  display: flex; align-items: center; gap: 10px;
  min-height: 44px; padding: 7px 10px;
  border-radius: var(--radius-md); font-size: var(--fs-sm);
  color: var(--ink-600); line-height: 1.2; text-decoration: none;
  transition: background 0.15s, color 0.15s;
}
.pnl-item:hover { background: var(--surface-alt); color: var(--ink-900); }
.pnl-item[aria-current="page"] {
  background: var(--accent-faint); color: var(--accent);
  font-weight: 600; box-shadow: inset 2px 0 0 var(--accent);
}
.pnl-item:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
.pnl-count { margin-left: auto; font-family: var(--font-mono); font-size: 11px; color: var(--ink-300); }
.pnl-count--on { color: var(--accent); font-weight: 600; }

.pnl-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.pnl-top {
  height: var(--nav-h); flex-shrink: 0;
  border-bottom: 1px solid var(--line); background: var(--surface);
  display: flex; align-items: center; padding: 0 24px; gap: 10px;
}
.pnl-crumb {
  font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--ink-300);
}
.pnl-crumb--last { color: var(--ink-900); }
.pnl-search {
  display: flex; align-items: center; gap: 8px; min-width: 300px;
  border: 1px solid var(--line); border-radius: var(--radius-pill);
  padding: 6px 14px 6px 12px; background: var(--bg);
  font-size: var(--fs-sm); color: var(--ink-300); text-decoration: none;
}
.pnl-search:hover { border-color: var(--accent-soft); }
.pnl-content { flex: 1; padding: 28px 32px; display: flex; flex-direction: column; gap: 22px; }

.pnl-card {
  background: var(--surface); border: 1px solid var(--line);
  border-radius: var(--radius-lg); padding: 20px;
  display: flex; flex-direction: column; gap: 13px;
}
.pnl-h2 { font-size: var(--fs-sm); font-weight: 600; letter-spacing: -0.01em; margin: 0; }
.pnl-meta {
  font-family: var(--font-mono); font-size: 10.5px;
  color: var(--ink-300); letter-spacing: 0.04em;
}

.pnl-rail {
  width: 56px; flex-shrink: 0; background: var(--surface);
  border-left: 1px solid var(--line);
  display: flex; flex-direction: column; align-items: center; padding: 10px 0; gap: 8px;
}
.pnl-rail-btn {
  width: 36px; height: 36px; border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  color: var(--accent); background: var(--accent-faint);
}
.pnl-rail-label {
  font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.18em;
  text-transform: uppercase; color: var(--ink-300);
  writing-mode: vertical-rl; margin-top: 6px;
}
.pnl-ia { width: 340px; flex-shrink: 0; background: var(--surface); border-left: 1px solid var(--line); display: flex; flex-direction: column; }

@media (max-width: 1024px) {
  .pnl-side { position: fixed; inset: 0 auto 0 0; z-index: var(--z-overlay); transform: translateX(-100%); transition: transform 0.2s; }
  .pnl-side.is-open { transform: translateX(0); }
  .pnl-rail, .pnl-ia { display: none; }
  .pnl-content { padding: 20px 16px; }
}
```

- [ ] **Paso 2: los diez iconos**

```tsx
// src/components/panel/icons.tsx

/**
 * Los diez iconos del panel. SVG en línea, trazo 1.6, rejilla 18px,
 * `currentColor` — sin librería y sin emoji (SPEC-panel §3.2).
 */

type P = { size?: number };
const base = (size: number) => ({
  width: size, height: size, viewBox: "0 0 24 24",
  fill: "none", stroke: "currentColor", strokeWidth: 1.6,
  strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
});

export const IconBuscar = ({ size = 18 }: P) => (
  <svg {...base(size)}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
);
export const IconDiana = ({ size = 18 }: P) => (
  <svg {...base(size)}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.2" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2" /></svg>
);
export const IconGuia = ({ size = 18 }: P) => (
  <svg {...base(size)}><path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H11v17H5.5A2.5 2.5 0 0 0 3 22.5z" /><path d="M21 5.5A2.5 2.5 0 0 0 18.5 3H13v17h5.5a2.5 2.5 0 0 1 2.5 2.5z" /></svg>
);
export const IconMarcador = ({ size = 18 }: P) => (
  <svg {...base(size)}><path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4-7 4V4.5a1 1 0 0 1 1-1z" /></svg>
);
export const IconDocumento = ({ size = 18 }: P) => (
  <svg {...base(size)}><path d="M14 3H7a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 7 21h10a1.5 1.5 0 0 0 1.5-1.5V7.5z" /><path d="M14 3v4.5h4.5" /><path d="M9 12.5h6M9 16h4" /></svg>
);
export const IconCampana = ({ size = 18 }: P) => (
  <svg {...base(size)}><path d="M18 8.5a6 6 0 1 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 14.5 18 8.5z" /><path d="M13.7 20a2 2 0 0 1-3.4 0" /></svg>
);
export const IconPersona = ({ size = 18 }: P) => (
  <svg {...base(size)}><circle cx="12" cy="8.5" r="3.8" /><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" /></svg>
);
export const IconControles = ({ size = 18 }: P) => (
  <svg {...base(size)}><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2.2" /><circle cx="8" cy="17" r="2.2" /></svg>
);
export const IconDestello = ({ size = 18 }: P) => (
  <svg {...base(size)}><path d="M12 3l1.9 5.4L19.5 10l-5.6 1.6L12 17l-1.9-5.4L4.5 10l5.6-1.6z" /><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" /></svg>
);
export const IconFlecha = ({ size = 14 }: P) => (
  <svg {...base(size)} strokeWidth={2}><path d="M5 12h13M13 6l6 6-6 6" /></svg>
);
```

- [ ] **Paso 3: el menú**

```tsx
// src/components/panel/Sidebar.tsx

"use client";

/**
 * Menú del panel, partido en dos mitades — Descubrir (lo que todavía no es
 * tuyo) y Mis procesos (lo que ya decidiste mirar). SPEC-panel §5.1.
 *
 * Los conteos son `number | null`: null se pinta como "—", nunca como 0
 * (restricción global de degradación honesta).
 *
 * Client component SOLO por `usePathname()`: el ítem activo depende de la
 * ruta, y el layout que lo monta no la conoce. Los datos (conteos, usuario)
 * llegan ya cargados como props desde el server component — aquí no hay
 * fetch ni acceso a base.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconBuscar, IconDiana, IconGuia, IconMarcador,
  IconDocumento, IconCampana, IconPersona, IconControles,
} from "./icons";

export interface SidebarConteos {
  procesos: number | null;
  coincidencias: number | null;
  seguidos: number | null;
  pliegos: number | null;
  perfilPct: number | null;
}

export interface SidebarUsuario {
  nombre: string;
  detalle: string;
  iniciales: string;
}

const num = (n: number | null) => (n === null ? "—" : String(n));

export function Sidebar({
  conteos,
  usuario,
}: {
  conteos: SidebarConteos;
  usuario: SidebarUsuario;
}) {
  const pathname = usePathname();
  // Coincidencia por prefijo para que /panel/pliegos/CO1.REQ.x marque
  // "Pliegos analizados". /panel es exacto: si no, marcaría todo.
  const item = (href: string) => {
    const activo = href === "/panel" ? pathname === href : pathname.startsWith(href);
    return activo ? { "aria-current": "page" as const } : {};
  };

  return (
    <aside className="pnl-side">
      <div className="pnl-brand">
        <div className="pnl-brand-mark">H</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.01em" }}>HydroStack</span>
          <span className="pnl-group-label" style={{ padding: 0, margin: 0, fontSize: 9 }}>
            Agua y saneamiento
          </span>
        </div>
      </div>

      <nav className="pnl-group" aria-label="Descubrir">
        <p className="pnl-group-label">Descubrir</p>
        <Link href="/licitaciones/explorar" className="pnl-item" {...item("/licitaciones/explorar")}>
          <IconBuscar /><span>Procesos abiertos</span>
          <span className="pnl-count">{num(conteos.procesos)}</span>
        </Link>
        <Link href="/panel/coincidencias" className="pnl-item" {...item("/panel/coincidencias")}>
          <IconDiana /><span>Mis coincidencias</span>
          <span className={`pnl-count${conteos.coincidencias ? " pnl-count--on" : ""}`}>
            {num(conteos.coincidencias)}
          </span>
        </Link>
        <Link href="/licitaciones/como-participar" className="pnl-item" {...item("/licitaciones/como-participar")}>
          <IconGuia /><span>Cómo participar</span>
        </Link>
      </nav>

      <nav className="pnl-group" aria-label="Mis procesos">
        <p className="pnl-group-label">Mis procesos</p>
        <Link href="/panel/seguidos" className="pnl-item" {...item("/panel/seguidos")}>
          <IconMarcador /><span>Seguidos</span>
          <span className="pnl-count">{num(conteos.seguidos)}</span>
        </Link>
        <Link href="/panel/pliegos" className="pnl-item" {...item("/panel/pliegos")}>
          <IconDocumento /><span>Pliegos analizados</span>
          <span className="pnl-count">{num(conteos.pliegos)}</span>
        </Link>
        <Link href="/panel/preferencias" className="pnl-item" {...item("/panel/preferencias")}>
          <IconCampana /><span>Alertas</span>
        </Link>
      </nav>

      <div className="pnl-group" style={{ marginTop: "auto" }}>
        <div style={{ height: 1, background: "var(--line)", margin: "0 10px 12px" }} />
        <Link href="/panel/perfil" className="pnl-item" {...item("/panel/perfil")}>
          <IconPersona /><span>Mi perfil</span>
          <span className="pnl-count" style={{ color: "var(--warning)" }}>
            {conteos.perfilPct === null ? "—" : `${conteos.perfilPct}%`}
          </span>
        </Link>
        <Link href="/panel/preferencias" className="pnl-item" {...item("/panel/preferencias")}>
          <IconControles /><span>Preferencias</span>
        </Link>

        <div style={{
          display: "flex", alignItems: "center", gap: 9, marginTop: 12, padding: "9px 10px",
          border: "1px solid var(--line)", borderRadius: 10, background: "var(--surface-alt)",
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: "50%", background: "var(--accent-faint)",
            border: "1px solid var(--accent-soft)", color: "var(--accent)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, flexShrink: 0,
          }}>{usuario.iniciales}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {usuario.nombre}
            </span>
            <span className="pnl-meta" style={{ fontSize: 9 }}>{usuario.detalle}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Paso 4: la barra superior**

```tsx
// src/components/panel/Topbar.tsx

/**
 * Barra superior: migas de pan y el campo de búsqueda.
 *
 * El campo NO es un buscador: es un enlace a /licitaciones/explorar
 * (SPEC-panel §9.3). Colapsar las tres rutas de búsqueda en una es el paso
 * 11 del plan de recorrido y no entra aquí — no implementes una paleta de
 * comandos.
 */

import Link from "next/link";
import { IconBuscar } from "./icons";

export function Topbar({ migas }: { migas: string[] }) {
  return (
    <header className="pnl-top">
      {migas.map((m, i) => (
        <span key={m} style={{ display: "contents" }}>
          {i > 0 && <span style={{ color: "var(--ink-300)", fontSize: 12 }}>/</span>}
          <span className={`pnl-crumb${i === migas.length - 1 ? " pnl-crumb--last" : ""}`}>{m}</span>
        </span>
      ))}
      <div style={{ flexGrow: 1 }} />
      <Link href="/licitaciones/explorar" className="pnl-search">
        <IconBuscar size={15} />
        <span>Buscar proceso, entidad o NIT</span>
      </Link>
    </header>
  );
}
```

> **El indicador «SECOP II · sincronizado 06:12» del mockup no entra en
> v1.** El dato existe (`sync_log`, ver `src/lib/db/schema/control.ts`),
> pero leerlo obligaría a consultar la base en cada render de la barra, en
> todas las rutas del panel, para un adorno. Si más adelante se quiere,
> sale de la última fila de `sync_log`; no lo improvises ahora con una hora
> fija ni con `new Date()`, que sería mentir sobre cuándo se sincronizó.

- [ ] **Paso 5: el panel de AguaLicita**

```tsx
// src/components/panel/AguaLicitaPanel.tsx

/**
 * AguaLicita — espacio RESERVADO, sin lógica (SPEC-panel §7).
 *
 * NO añadas aquí llamadas a ningún modelo, historial ni componente de
 * conversación. El campo de entrada está atenuado y no acepta foco a
 * propósito: prometer menos de lo que hay es la línea del producto.
 *
 * Estado A (rail, 56px) es el de los módulos; estado B (340px) es el del
 * panel. El estado C (activo) NO está diseñado.
 *
 * FECHA DE REVISIÓN: 2026-10-25. Si para entonces AguaLicita no tiene
 * lógica, se retira el estado B y se queda solo el rail.
 */

import { IconDestello } from "./icons";

export function AguaLicitaPanel({ abierto }: { abierto: boolean }) {
  if (!abierto) {
    return (
      <aside className="pnl-rail" aria-label="AguaLicita (próximamente)">
        <div className="pnl-rail-btn"><IconDestello /></div>
        <span className="pnl-rail-label">AguaLicita</span>
      </aside>
    );
  }

  return (
    <aside className="pnl-ia" aria-label="AguaLicita (próximamente)">
      <header className="pnl-top" style={{ padding: "0 18px", borderLeft: 0 }}>
        <span style={{ color: "var(--accent)", display: "flex" }}><IconDestello size={17} /></span>
        <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-.01em" }}>AguaLicita</span>
        <span className="pnl-crumb" style={{ border: "1px solid var(--line)", borderRadius: 4, padding: "2px 6px", fontSize: 9 }}>
          Pronto
        </span>
      </header>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 18, padding: "28px 24px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-.015em", margin: 0, lineHeight: 1.3, textWrap: "pretty" }}>
            El espacio de AguaLicita está reservado
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: "var(--ink-600)", lineHeight: 1.6, textWrap: "pretty" }}>
            Este panel ocupa 340&nbsp;px a la derecha en todas las pantallas, para que el día que
            exista no haya que rehacer el layout. Todavía no responde nada.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <span className="pnl-group-label" style={{ padding: 0, margin: 0 }}>
            Lo que sabrá de la pantalla activa
          </span>
          {[
            "El proceso abierto y su veredicto",
            "Tu perfil de oferente y lo que le falta",
            "El pliego extraído, con cita textual",
          ].map((t) => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 9, border: "1px solid var(--line)", borderRadius: 8, padding: "10px 12px", background: "var(--bg)" }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, color: "var(--ink-600)" }}>{t}</span>
            </div>
          ))}
        </div>

        <p style={{ margin: 0, fontSize: 11.5, color: "var(--ink-300)", lineHeight: 1.55, borderTop: "1px solid var(--line-soft)", paddingTop: 14, textWrap: "pretty" }}>
          Acotado a lo que hay en pantalla, no un chat general. Igual que el extractor, cada
          respuesta tendrá que decir de dónde salió.
        </p>
      </div>
    </aside>
  );
}
```

- [ ] **Paso 6: el layout**

```tsx
// app/panel/layout.tsx

/**
 * Carcasa del área autenticada. Server component: carga una sola vez los
 * conteos del menú y los pasa al Sidebar, para que cada página no repita
 * la consulta.
 *
 * El gate de sesión real está en middleware.ts (Tarea 8); este redirect es
 * el cinturón sobre los tirantes — si el middleware cambiara, no queremos
 * que el panel se sirva sin sesión.
 */

import { redirect } from "next/navigation";
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import { getPerfilDb } from "@/src/lib/oferente/perfil-store";
import { perfilCompletitud } from "@/src/lib/oferente/completitud";
import { listarSeguidos } from "@/src/lib/seguimiento/listar";
import { Sidebar, type SidebarConteos, type SidebarUsuario } from "@/src/components/panel/Sidebar";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/panel");

  const [perfil, seguidos] = await Promise.all([getPerfilDb(user.id), listarSeguidos(user.id)]);

  const conteos: SidebarConteos = {
    procesos: null,
    coincidencias: null,
    seguidos: seguidos.length,
    pliegos: null,
    perfilPct: perfilCompletitud(perfil).pct,
  };

  const nombre = user.email.split("@")[0];
  const usuario: SidebarUsuario = {
    nombre,
    detalle: user.email,
    iniciales: nombre.slice(0, 2).toUpperCase(),
  };

  return (
    <div className="pnl-shell">
      <Sidebar conteos={conteos} usuario={usuario} />
      {children}
    </div>
  );
}
```

> **Sobre el ítem activo:** `Sidebar` es el único client component de la
> carcasa, y lo es solo para leer `usePathname()`. El layout sigue siendo
> server component y hace las consultas; el menú recibe los datos ya
> cargados. No muevas las consultas al cliente.
>
> Ojo con «Alertas» y «Preferencias»: ambos apuntan a `/panel/preferencias`
> a propósito (SPEC-panel §5.3 fusiona `/cuenta` ahí), así que los dos se
> marcarán activos a la vez. Es correcto y deliberado.

- [ ] **Paso 7: una página provisional para poder mirar la carcasa**

```tsx
// app/panel/page.tsx
import { Topbar } from "@/src/components/panel/Topbar";
import { AguaLicitaPanel } from "@/src/components/panel/AguaLicitaPanel";

export default function PanelPage() {
  return (
    <>
      <div className="pnl-main">
        <Topbar migas={["Panel"]} />
        <main className="pnl-content">
          <h1 style={{ fontSize: "var(--fs-xl)", fontWeight: 700, letterSpacing: "-.02em", margin: 0 }}>
            Tu panel
          </h1>
        </main>
      </div>
      <AguaLicitaPanel abierto />
    </>
  );
}
```

- [ ] **Paso 8: verificar**

```bash
npm run lint && npm run build
```

Luego levanta el servidor (`mockup-panel` no; el de la app) y entra a
`/panel` con sesión iniciada. **Qué mirar, en este orden:**

1. El menú tiene los dos encabezados en versalitas y los seis ítems, y el
   ítem de la ruta actual está resaltado con la barra azul a la izquierda.
2. `Seguidos` muestra `0`; `Procesos abiertos`, `Mis coincidencias` y
   `Pliegos analizados` muestran `—`, **no `0`**.
3. El panel de AguaLicita ocupa 340 px a la derecha y dice «Pronto».
4. A 1024 px de ancho el menú se sale de pantalla y el panel desaparece.
5. Ningún color se ve fuera de la paleta: fondo hueso, acento azul.

- [ ] **Paso 9: commit**

```bash
git add app/globals.css src/components/panel/ app/panel/
git commit -m "feat(panel): carcasa con menú en dos mitades, barra y rail de AguaLicita"
```

---

## Tarea 8: el panel se abre solo al registrarse

**Archivos:**
- Modificar: `middleware.ts` (constante `PROTECTED_PREFIXES`)
- Modificar: `app/registro/page.tsx` (valor por defecto de `next`)
- Modificar: `app/login/page.tsx` (valor por defecto de `next`)
- Modificar: `src/lib/supabase/actions.ts` (reserva de `safeNext`)
- Modificar: `app/auth/callback/route.ts` (reserva de `next`)

**Interfaces:**
- Consume: nada nuevo.
- Produce: nada importable. El efecto es de enrutado.

Es el encargo literal del usuario: *«el dashboard se abrirá automáticamente
apenas el usuario se registre»*. El mecanismo ya existe — solo cambia el
destino por defecto en los cuatro sitios que lo fijan.

**No toques `safeNext()` en sí.** Su defensa contra open-redirect (solo
rutas internas, no `//`) es correcta y se queda igual; lo único que cambia
es el valor al que cae.

- [ ] **Paso 1: proteger la ruta**

En `middleware.ts`, añade `"/panel"` a `PROTECTED_PREFIXES`, junto a
`"/pliego"` y `"/cuenta"`. Actualiza el comentario de bloque de arriba para
mencionar el panel — ese comentario documenta por qué cada prefijo está
ahí, y dejarlo desactualizado es peor que no tenerlo.

- [ ] **Paso 2: cambiar los cuatro destinos por defecto**

| Archivo | Qué cambia |
|---|---|
| `app/registro/page.tsx` | `const next = params.next?.startsWith("/") ? params.next : "/panel"` |
| `app/login/page.tsx` | el mismo cambio, misma línea |
| `src/lib/supabase/actions.ts` | en `safeNext`, `: "/"` pasa a `: "/panel"` (dos sitios: el valor inicial y el de retorno) |
| `app/auth/callback/route.ts` | `const rawNext = searchParams.get("next") ?? "/panel"` |

- [ ] **Paso 3: verificar los tres caminos de alta a mano**

No hay test automatizado para esto: son redirecciones de Supabase. Prueba
los tres:

1. **Sin sesión, a `/panel`** → debe llevar a `/login?next=/panel`, y tras
   entrar, de vuelta a `/panel`.
2. **Registro con correo** → si tu proyecto de Supabase tiene la
   confirmación activada, aterriza en `/login?notice=check_email`; tras
   pulsar el enlace del correo, `/panel`. Si no la tiene, `/panel` directo.
3. **Google OAuth** → `/auth/callback` → `/panel`.

Comprueba además que **un `next` malicioso sigue bloqueado**: entra a
`/login?next=//evil.com` y confirma que acabas en `/panel`, no fuera del
sitio.

- [ ] **Paso 4: verificar que no se rompió nada**

```bash
npm test && npm run lint && npm run build
```

- [ ] **Paso 5: commit**

```bash
git add middleware.ts app/registro/page.tsx app/login/page.tsx \
        src/lib/supabase/actions.ts app/auth/callback/route.ts
git commit -m "feat(panel): el registro y el login aterrizan en /panel"
```

---

## Tarea 9: la home — primer ingreso (P1-a y P1-b)

**Archivos:**
- Modificar: `app/panel/page.tsx` (reemplaza la provisional de la Tarea 7)
- Crear: `src/components/panel/PrimerIngreso.tsx`

**Interfaces:**
- Consume: `getPerfilDb`, `isPerfilCompleto`, `perfilCompletitud` (Tarea 1),
  `getMatchesForPerfilMinimo` / `getMatchesForPerfil`, `getPreferencias`,
  `SectorZonaSetup`.
- Produce: `<PrimerIngreso perfilPuesto={boolean} … />`.

**Lee SPEC-panel §4 P1 entero antes de empezar.** Son dos estados y el que
vas a ver en tu máquina casi siempre es **P1-b**, porque P1-a depende de la
decisión bloqueada del §9.1.

Regla que decide cuál se pinta: si `getPerfilDb(user.id)` devuelve `null` o
un perfil sin sector ni zona → **P1-b**. Si hay sector y zona **y** la
cuenta se creó hoy → **P1-a**. Si hay perfil y la cuenta es más vieja →
**P2** (Tareas 10 y 11).

- [ ] **Paso 1: P1-b — la pantalla que sí se puede construir hoy**

En `app/panel/page.tsx`, cuando no hay perfil, monta `SectorZonaSetup` en
línea, con este titular y sin ninguna redirección intermedia:

- Chip: `Cuenta lista`
- H1: `Dinos dos cosas y calculamos tus coincidencias`
- Sub: `En qué trabajas y dónde. Con eso cruzamos los procesos abiertos de este mes contra tu perfil — y puedes cambiarlo cuando quieras.`

**No copies el componente ni lo modifiques**: impórtalo tal cual de
`@/src/components/oferente/SectorZonaSetup`. Está en la lista de intocables
de las restricciones globales.

- [ ] **Paso 2: P1-a — las tres tarjetas**

Se pinta solo si hay perfil y la cuenta es de hoy. Tres tarjetas numeradas
`01/02/03` con la hairline de acento superior (el mismo
`linear-gradient(to right, var(--accent), transparent)` de `.clr-card::after`,
aquí siempre visible):

| # | Título | Cuerpo | Pie en mono |
|---|---|---|---|
| 01 | `N coincidencias` | cuántos procesos abiertos hay y cuántos cruzan | `n EN VERDE · n EN ÁMBAR · n EN ROJO` |
| 02 | `Alerta diaria activa` | la hora real de `alerta_preferencias.horaEnvio` | `HH:00 · AMÉRICA/BOGOTÁ` |
| 03 | `Perfil guardado` | qué se guardó | `SECTOR · ZONA` |

> La tarjeta 03 del mockup dice «Perfil precargado» y cita el NIT contra la
> tabla `contrato`. **Eso es P1-a con el §9.1 resuelto.** Mientras siga
> bloqueado, el título es `Perfil guardado` y no se menciona el NIT ni la
> procedencia. No implementes el autocompletado por NIT en esta tarea.

- [ ] **Paso 3: «Empieza por estas dos»**

Las coincidencias en verde, máximo dos, con botón `Seguir este proceso`
(el de la Tarea 11). Si no hay ninguna en verde, el bloque cambia de
titular a `Empieza por revisar estas dos`, toma las de ámbar, y el botón
pasa a `Ver por qué`. Si tampoco hay ámbar, el bloque **no se renderiza**.

- [ ] **Paso 4: la franja de honestidad**

Al pie, con `perfilCompletitud().faltan`. Si `faltan` está vacío, la franja
no se renderiza. Texto cuando falta el RUP:

> Sin los indicadores financieros del RUP, la compuerta de habilitación se
> queda en `?` en los N procesos. Preferimos decírtelo así antes que darte
> un verde que no podemos sostener.

- [ ] **Paso 5: verificar los dos estados**

```bash
npm run lint && npm run build
```

En el navegador, con sesión:

1. **Borra tu fila de `oferente_perfil`** y entra a `/panel` → debe salir
   P1-b con el formulario de sector y zona. **Ninguna pantalla en blanco.**
2. Guarda sector y zona → la misma ruta re-renderiza con coincidencias, sin
   pasar por otra URL.
3. Comprueba que los conteos del pie de las tarjetas cuadran con lo que
   muestra `/panel/coincidencias`.

- [ ] **Paso 6: commit**

```bash
git add app/panel/page.tsx src/components/panel/PrimerIngreso.tsx
git commit -m "feat(panel): primer ingreso con y sin perfil, sin pantalla vacía"
```

---

## Tarea 10: la home — columna A («Lo que corre» y coincidencias nuevas)

**Archivos:**
- Modificar: `app/panel/page.tsx`
- Crear: `src/components/panel/AvisoRow.tsx`

**Interfaces:**
- Consume: `construirAvisos`, `AvisoEntrada` (Tarea 5); `listarSeguidos`
  (Tarea 4); `getPliegoStatusForProcesos` de
  `@/src/lib/secop/pliego-status`; `searchProcesosDb`, `mapDbRowToProceso`
  y `countProcesosDbCached` de la capa de ingesta.
- Modifica: `src/lib/secop/types.ts` (`SecopQuery.procesoIds`) y
  `src/lib/secop/db-search.ts` (`prepare()`).
- Produce: `<AvisoRow aviso={Aviso} />`.

**El punto delicado de esta tarea es de dónde sale `fechaCierre`.** No está
en la tabla `proceso`: sale de `getPliegoStatusForProcesos()`, y solo para
los procesos que tienen pliego extraído (SPEC-panel §6.4b). El armado de
`AvisoEntrada[]` es exactamente eso:

```ts
const seguidos = await listarSeguidos(user.id);
const pliegos = await getPliegoStatusForProcesos(seguidos.map((s) => s.procesoId));

const entradas: AvisoEntrada[] = seguidos.map((s) => {
  const pliego = pliegos.get(s.procesoId);
  return {
    procesoId: s.procesoId,
    titulo: /* del proceso, ver paso 2 */ "",
    entidad: "",
    referencia: null,
    estado: s.estado,
    fechaCierre: pliego?.fechaCierre ?? null,
    tienePliego: pliego !== undefined,
  };
});

const avisos = construirAvisos(entradas, new Date());
```

- [ ] **Paso 1: la fila de aviso**

`AvisoRow` pinta borde izquierdo de `2px` según `aviso.severidad`:
`alta` → `var(--danger)`, `media` → `var(--warning)`, `neutra` →
`var(--line)`. Para el tipo `cierre`, a la izquierda va el número de días
en mono a 19px sobre la palabra `días` en versalitas de 9px. Para
`pliego_sin_analizar`, va el icono de documento.

Etiquetas: `cierre` → `Cierra la presentación — {titulo}`;
`pliego_sin_analizar` → `Pliego sin analizar desde que lo guardaste`.
Acción a la derecha: `Abrir taller →` / `Extraer →`.

> El tercer tipo de aviso del mockup, **adenda nueva, no se implementa**
> (SPEC-panel §6.4a): necesita el paso 9 del plan de recorrido. No lo
> simules ni dejes un caso muerto en el `switch`.

- [ ] **Paso 2: resolver título y entidad de cada proceso seguido**

`proceso_seguido` solo guarda el id nativo. **No escribas un join nuevo
para hidratarlo.** `db-search.ts` ya tiene todo:

- `searchProcesosDb` hace el join a `entidad` y `geografia`.
- `mapDbRowToProceso` convierte la fila en un `SecopProceso`, con `nombre`,
  `entidad`, `referencia` y `estadoApertura` ya resueltos — y es el mismo
  tipo que consume `verdict.ts`, así que la misma hidratación sirve para
  los avisos y para las tarjetas de veredicto.

Lo único que falta es filtrar por una lista de ids nativos, y `SecopQuery`
no lo contempla. **Amplíala** (así se hace en este plan cuando la capa
existente no llega, según las restricciones globales): añade
`procesoIds?: string[]` a `SecopQuery` en `src/lib/secop/types.ts`, y en
`prepare()` de `db-search.ts` la condición correspondiente:

```ts
query.procesoIds?.length ? inArray(proceso.secopProcesoId, query.procesoIds) : undefined,
```

**Importante:** cuando pases `procesoIds`, pasa también `soloAgua: false`.
El usuario ya decidió seguir ese proceso; volver a filtrarlo por palabras
clave podría hacerlo desaparecer de sus propios avisos, y además evita el
escaneo caro.

Un proceso seguido cuyo id no vuelva en el resultado (fue purgado, o se
siguió desde una búsqueda en vivo que nunca se ingirió) **se omite del
bloque de avisos**, no se pinta con el título vacío.

- [ ] **Paso 3: coincidencias nuevas**

Hasta dos tarjetas usando `VerdictCard`. **Ese componente se crea en la
Tarea 12** — ver «Orden y dependencias» arriba. Enlace `Ver las N →` a
`/panel/coincidencias`. Si no hay coincidencias, el bloque no se renderiza.

- [ ] **Paso 4: el encabezado con las cifras del mes**

```
Este mes SECOP II abrió {N} procesos de agua y saneamiento.
{M} cruzan con tu sector y tu zona.
```

**`N` sale de la ingesta, no de Socrata.** `getEnJuegoMes()` en
`landingStats.ts` consulta la API en vivo (`sodaFetch`): sirve para la
portada pública, donde no hay sesión ni base garantizada, pero dentro del
panel contradice la regla de reutilizar la ingesta y hace depender la home
autenticada de una API externa. Usa:

```ts
const N = await countProcesosDbCached({ apertura: "Abierto", desde: inicioDeMesBogota });
```

`M` es el número de coincidencias, que ya tienes cargadas.

**El monto en pesos (`$8.412 M`) del mockup no entra en v1.**
`countProcesosDb` cuenta filas, no suma `valorEstimado`, y añadir un
`SUM()` significa otro escaneo con el predicado caro. La frase se queda sin
la cifra de dinero. Si más adelante se quiere, va como un segundo agregado
en `countProcesosPorMesDb`, no como una llamada a Socrata.

Degradación: si la consulta falla, variante corta —
`Tienes {M} coincidencias abiertas este mes.` Si `M` es 0 —
`Este mes no hay ningún proceso que cruce con tu perfil.` Nunca un cero
inventado.

- [ ] **Paso 5: verificar**

```bash
npm run lint && npm run build
```

En el navegador:

1. Sin procesos seguidos → «Lo que corre» **no aparece**. No debe salir una
   tarjeta vacía ni un «todo en orden».
2. Sigue un proceso **sin pliego** → aparece el aviso neutro de pliego sin
   analizar, y **ningún** aviso de cierre ni cuenta atrás.
3. **Comprueba que la home no llama a Socrata.** Con el servidor en
   marcha, mira los logs mientras cargas `/panel`: no debe aparecer
   ninguna petición a `datos.gov.co`. Si aparece, algo quedó apuntando a
   `landingStats` o al cliente en vivo.

- [ ] **Paso 6: commit**

```bash
git add app/panel/page.tsx src/components/panel/AvisoRow.tsx
git commit -m "feat(panel): columna A del panel — avisos y coincidencias nuevas"
```

---

## Tarea 11: la home — columna B (perfil, pipeline, serie)

**Archivos:**
- Modificar: `app/panel/page.tsx`

**Interfaces:**
- Consume: `perfilCompletitud` (Tarea 1); `contarPorEstado`,
  `listarSeguidos` (Tarea 4); `getSerieMensual` (Tarea 6); `ESTADO_LABEL`,
  `ESTADOS_ORDEN` (Tarea 2).

Rejilla `1.55fr / 1fr` con la columna A. Tres tarjetas `.pnl-card`.

- [ ] **Paso 1: Tu perfil**

Barra de completitud (`4px`, radio pill, relleno `var(--warning)` si
`pct < 100`, `var(--success)` si 100), el porcentaje en mono, y la frase de
consecuencia construida desde `faltan`. Botón `Completar el RUP` a
`/panel/perfil`. Si `pct === 100`, la tarjeta entera no se renderiza.

- [ ] **Paso 2: Mis procesos**

Cinco filas. **Seis estados, cinco filas**: `adjudicada` y `no_adjudicada`
se muestran juntas en la última como `Adjudicada / no adjudicada` con la
suma de ambas. Los estados en cero se pintan atenuados (`var(--ink-300)`)
con `—`, **no se ocultan**: la forma del pipeline es información.

Punto de color por estado: `en_revision` → `--ink-300`, `voy_a_presentar`
→ `--accent`, `presentada` → `--success`, `subsanando` → `--warning`,
desenlaces → `--line`.

- [ ] **Paso 3: la serie de seis meses**

Seis barras con altura relativa al máximo, la del mes actual en
`var(--accent)` y las demás en `var(--accent-soft)`. Eje en mono con las
etiquetas de tres letras. Pie:

> Procesos abiertos por mes en agua y saneamiento. Es un mercado de
> decenas, no de miles — por eso aquí no hay filtros de criba.

**Si `getSerieMensual()` devuelve `null`, la tarjeta no se renderiza.** Y
si devuelve seis ceros (porque `clasificacion_sectorial` está vacía, ver
Tarea 6 paso 5), tampoco: seis barras a cero no informan de nada y parecen
un error. Condición: renderiza solo si algún punto tiene `procesos > 0`.

- [ ] **Paso 4: verificar**

```bash
npm run lint && npm run build
```

En el navegador: con perfil al 100 % la primera tarjeta desaparece; con
`clasificacion_sectorial` vacía la tercera desaparece; el pipeline muestra
`—` en los estados sin procesos, no `0`.

- [ ] **Paso 5: commit**

```bash
git add app/panel/page.tsx
git commit -m "feat(panel): columna B del panel — perfil, pipeline y serie mensual"
```

---

## Tarea 12: `/panel/coincidencias`

**Archivos:**
- Crear: `app/panel/coincidencias/page.tsx`
- Crear: `src/components/panel/VerdictCard.tsx`
- Modificar: `app/mis-coincidencias/page.tsx` → redirección permanente

**Interfaces:**
- Consume: `getMatchesForPerfil`, `getMatchesForPerfilMinimo`,
  `markCoincidenciasVistas`, `getPliegoStatusForProcesos`,
  `coincideEnLabel`, y los formateadores de
  `@/src/components/secop/format` (`sentenceCaseTitle`, `formatCopCompact`,
  `formatShortDate`).
- Produce: `<VerdictCard match={…} pliego={PliegoStatus | undefined} />`.
  Lo consume también la Tarea 10.

**La lógica de matching y el veredicto no se tocan.** Esta tarea traslada
`app/mis-coincidencias/page.tsx` a la carcasa y le cambia la jerarquía. Lee
ese archivo entero antes de escribir nada: ya resuelve los dos tipos de
perfil, el banner de envío, el registro de señales y el marcado de vistas.
Todo eso se conserva.

- [ ] **Paso 1: `VerdictCard`**

Anatomía, de arriba abajo:

1. Borde izquierdo de `2px` con el color del `overall`.
2. Título en `sentenceCaseTitle`, 16px, peso 600.
3. Línea mono: `ENTIDAD · REFERENCIA · DEPARTAMENTO · UNSPSC`.
4. A la derecha: cuantía con `formatCopCompact`, y debajo el plazo.
   **El plazo es cuenta atrás solo si `pliego?.fechaCierre` existe**; si
   no, `Abierto` o `Cerrado` desde `estadoApertura`; si tampoco, `—`
   (SPEC-panel §6.4b).
5. Píldora del veredicto **primero**, luego las cinco compuertas en orden
   `Sector · Cuantía · Plazo · Ubicación · Habilitación` con los glifos
   `✓ ! ✕ ?`. Reusa las clases `.clr-verdict-*` que ya existen.
6. **Obligatorio:** bajo una separación punteada, una línea de porqué por
   cada compuerta en `WARN` o `FAIL`, con el nombre de la compuerta en mono
   versalitas y `gate.reason` en prosa. Para `UNKNOWN`, qué haría falta
   para resolverlo. **Una tarjeta con ámbar o rojo y sin porqué es un bug**
   — `verdict.ts` ya devuelve `reason` en cada `GateResult`, así que el
   dato está: solo hay que pintarlo.

Etiquetas del veredicto (SPEC-panel §3 hoja de sistema): `PASS` →
`Puedes ofertar`, `WARN` → `Revísalo`, `FAIL` → `No aplica`, `UNKNOWN` →
`Falta el pliego`.

- [ ] **Paso 2: los cuatro segmentos**

`Las N` · `Puedes ofertar · n` · `Revísalo · n` · `No aplica · n`, en
píldora sobre `--surface-alt`. **No son filtros facetados**: son cuatro
cortes fijos sobre una lista corta, resueltos con un search param
(`?ver=verde`) y filtrado en servidor. No añadas estado de cliente.

- [ ] **Paso 3: los FAIL se atenúan, no se ocultan**

`opacity: .78`, y como única acción `Ocultar de mi lista`. Nota: esa acción
necesita persistencia que **no existe** — déjala como texto sin `onClick`
en esta tarea y anótalo en el commit. No inventes una tabla para ella.

- [ ] **Paso 4: el pie de los que no cruzaron**

Cuenta y clasifica los procesos del mes que no dieron coincidencia, con
enlace a `/licitaciones/explorar`. Si no puedes obtener el desglose por
motivo con las consultas que ya existen, pon solo el conteo: `Los otros N
procesos del mes no cruzan con tu perfil.` **No inventes el desglose.**

- [ ] **Paso 5: la redirección**

`app/mis-coincidencias/page.tsx` pasa a ser solo:

```tsx
import { permanentRedirect } from "next/navigation";
export default function MisCoincidenciasPage() {
  permanentRedirect("/panel/coincidencias");
}
```

**La redirección se queda para siempre:** hay correos de alerta ya enviados
que apuntan a esa URL y `envio_log` no se reescribe. No la borres «cuando
ya nadie la use».

- [ ] **Paso 6: verificar**

```bash
npm test && npm run lint && npm run build
```

En el navegador:

1. `/mis-coincidencias` redirige a `/panel/coincidencias`.
2. **Cada tarjeta en ámbar o rojo tiene su línea de porqué.** Si encuentras
   una sin ella, es un bug de esta tarea.
3. Un proceso sin pliego muestra `Abierto`/`Cerrado`, no una cuenta atrás.
4. El badge de coincidencias sin ver se apaga tras visitar la página
   (`markCoincidenciasVistas` sigue llamándose).

- [ ] **Paso 7: commit**

```bash
git add app/panel/coincidencias/ src/components/panel/VerdictCard.tsx app/mis-coincidencias/
git commit -m "feat(panel): coincidencias en la carcasa, con el porqué de cada ámbar"
```

---

## Tarea 13: `/panel/seguidos` y los botones de seguimiento

**Archivos:**
- Crear: `app/panel/seguidos/page.tsx`
- Crear: `src/components/panel/SeguirButton.tsx`
- Crear: `src/components/panel/EstadoSelect.tsx`
- Crear: `src/lib/seguimiento/actions.ts`

**Interfaces:**
- Consume: `seguirProceso`, `dejarDeSeguir`, `cambiarEstado` (Tarea 3);
  `listarSeguidos`, `agruparPorEstado` (Tarea 4); `transicionesPermitidas`,
  `ESTADO_LABEL`, `ESTADOS_ORDEN` (Tarea 2).
- Produce: server actions `seguirAction`, `dejarDeSeguirAction`,
  `cambiarEstadoAction`; `<SeguirButton procesoId siguiendo />`;
  `<EstadoSelect procesoId estado />`.

- [ ] **Paso 1: las server actions**

En `src/lib/seguimiento/actions.ts`, con `"use server"`. Cada una obtiene
el usuario con `getSessionUser()` y **rechaza si no hay sesión** — nunca
tomes el `usuarioId` de un campo del formulario, que sería una vía directa
a escribir en la cuenta de otro. Sigue el patrón de
`src/lib/oferente/actions.ts`, que ya lo hace bien. Tras escribir, llama a
`revalidatePath("/panel")` y `revalidatePath("/panel/seguidos")`.

- [ ] **Paso 2: `EstadoSelect`**

Client component. Un `<select>` con **solo** las transiciones que
`transicionesPermitidas(estadoActual)` devuelve, más el estado actual como
opción seleccionada. En un desenlace (`adjudicada` / `no_adjudicada`) la
lista queda vacía: renderiza la etiqueta como texto plano, sin control.

La validación del servidor (Tarea 3) es la que manda; esto solo evita
ofrecer lo imposible.

- [ ] **Paso 3: la página**

Procesos agrupados por estado, en el orden de `ESTADOS_ORDEN`, con la misma
fusión de la Tarea 11 para los dos desenlaces. Cada grupo con su encabezado
y su conteo. **Un grupo vacío no se renderiza** (a diferencia del resumen
del panel, aquí una lista vacía sí es ruido).

Si el usuario no sigue nada, la página muestra un estado inicial con
enlace a `/panel/coincidencias`:

> Todavía no sigues ningún proceso. Cuando marques uno, aquí verás en qué
> punto está y qué se te viene encima.

- [ ] **Paso 4: verificar**

```bash
npm test && npm run lint && npm run build
```

En el navegador:

1. Seguir un proceso desde `/panel/coincidencias` → aparece en
   `/panel/seguidos` en `En revisión`, y el conteo del menú sube.
2. Seguirlo **dos veces** → sigue habiendo una sola fila (idempotencia).
3. Mover a `Voy a presentar` → se refleja sin recargar a mano.
4. Desde `Presentada`, el `<select>` **no** ofrece `En revisión`.
5. Desde `Adjudicada` no hay control, solo la etiqueta.

- [ ] **Paso 5: commit**

```bash
git add app/panel/seguidos/ src/components/panel/SeguirButton.tsx \
        src/components/panel/EstadoSelect.tsx src/lib/seguimiento/actions.ts
git commit -m "feat(panel): seguir procesos y moverlos entre estados"
```

---

## Tarea 14: `/panel/pliegos` y la lectura de una extracción

**Archivos:**
- Crear: `app/panel/pliegos/page.tsx`
- Crear: `app/panel/pliegos/[procesoId]/page.tsx`

**Interfaces:**
- Consume: `pliegoProceso` de `@/src/lib/db/schema/pliego`;
  `PliegoExtraction` de `@/src/lib/pliego/schema`; `ValidationReport` de
  `@/src/lib/pliego/validate`; `formatCopFull` de
  `@/src/components/secop/format`.

**No hay tabla nueva ni migración en esta tarea** (SPEC-panel §6.2): la
extracción y el informe de validación **ya están persistidos** en
`pliego_proceso` desde `uploadPliego()`. Esto es una vista de lectura sobre
datos que ya están en Postgres.

`/pliego` (la página suelta de subida) **no se toca** en esta tarea.

- [ ] **Paso 1: el índice**

Lista de las extracciones que existen, con título del proceso, entidad,
fecha de extracción y si pasó el gate matemático. Consulta filtrada a los
procesos **seguidos por el usuario** — `pliego_proceso` no tiene dueño (el
pliego es un documento público, ver el comentario de cabecera del esquema),
así que el filtro por usuario se hace por el join con `proceso_seguido`.

- [ ] **Paso 2: la vista de detalle**

Dos columnas iguales, según SPEC-panel §4 P4:

- **Requisitos habilitantes**: glifo de resultado, enunciado, valor del
  usuario a la derecha, y **la cita textual** con página y párrafo en mono
  sobre `var(--bg)` con filete izquierdo de `2px`.
- **Marca de origen por campo**: chip `Reglas` (neutro) o `LLM · confianza`
  (acento). Lo que propuso el modelo lleva además la línea explícita de
  «verifícalo en el documento antes de darlo por cierto». **Este es el
  rasgo que separa este producto de los que piden confiar a ciegas — no lo
  omitas por ahorrar espacio.**
- **Presupuesto oficial**: tabla de ítems con código en mono; el ítem con
  aritmética incoherente resaltado con `rgba(217,119,6,.05)` y el cálculo
  esperado bajo el total impreso; al pie, suma de ítems contra presupuesto
  declarado.
- **«Lo que no cuadra en este pliego»**: las inconsistencias del
  `ValidationReport` como tarjetas con severidad, enunciado y ubicación.

- [ ] **Paso 3: lo que NO va**

- El botón `Abrir el taller de la oferta` **no se renderiza** (SPEC-panel
  §9.2): no existe el destino. Un botón que no lleva a ninguna parte es
  peor que su ausencia.
- `Exportar para la audiencia` **tampoco**, salvo que lo implementes de
  verdad. Si no, quítalo.

- [ ] **Paso 4: verificar**

```bash
npm run lint && npm run build
```

En el navegador, con un proceso que tenga pliego extraído: comprueba que
cada requisito muestra su cita con página, que los campos de origen `llm`
llevan su chip y su advertencia, y que el ítem con error aritmético está
resaltado. Si no tienes ninguno, sube uno desde `/mis-coincidencias` con
`PliegoUploadBlock` — el flujo ya funciona.

- [ ] **Paso 5: commit**

```bash
git add app/panel/pliegos/
git commit -m "feat(panel): lectura de pliegos extraídos, con origen y cita por campo"
```

---

## Tarea 15: perfil, preferencias y las redirecciones que quedan

**Archivos:**
- Crear: `app/panel/perfil/page.tsx`
- Crear: `app/panel/preferencias/page.tsx`
- Modificar: `app/perfil/page.tsx` → redirección permanente
- Modificar: `app/cuenta/page.tsx` → redirección permanente

- [ ] **Paso 1: mover el contenido**

`app/panel/perfil/page.tsx` monta `PerfilForm` **sin tocarlo** (está en los
intocables). `app/panel/preferencias/page.tsx` recibe el contenido actual
de `app/cuenta/page.tsx` — incluidas sus dos server actions
(`handleTogglePausa`, `handleGuardarHora`), que se mueven tal cual y cuyo
`revalidatePath("/cuenta")` pasa a `revalidatePath("/panel/preferencias")`.

`app/cuenta/page.tsx` inyecta sus estilos con
`dangerouslySetInnerHTML` en un `<style>` en línea. **Al moverlo, pásalo a
las clases `.pnl-*` de la Tarea 7** y borra ese bloque: dentro de la
carcasa desentona y duplica tokens.

- [ ] **Paso 2: las redirecciones**

Las dos, con `permanentRedirect`, igual que en la Tarea 12. `/cuenta`
aparece en enlaces de correos de alerta antiguos: **su redirección se queda
para siempre**.

- [ ] **Paso 3: limpiar `PROTECTED_PREFIXES`**

`/cuenta` sigue en la lista del middleware. Déjalo: la redirección la sirve
la ruta, y quitarlo haría que un usuario sin sesión llegara al redirect en
vez de al login. Añade un comentario de una línea diciendo exactamente eso,
para que nadie lo «limpie» más adelante.

- [ ] **Paso 4: verificar**

```bash
npm test && npm run lint && npm run build
```

En el navegador: `/perfil` y `/cuenta` redirigen; el formulario de perfil
guarda igual que antes; la hora de la alerta se puede cambiar y persiste;
y **sin sesión**, `/cuenta` lleva a `/login`, no al redirect.

- [ ] **Paso 5: commit**

```bash
git add app/panel/perfil/ app/panel/preferencias/ app/perfil/ app/cuenta/ middleware.ts
git commit -m "feat(panel): perfil y preferencias dentro de la carcasa"
```

---

## Cierre

- [ ] **Suite completa y build limpio**

```bash
npm test && npm run lint && npm run build
```

- [ ] **Actualizar la documentación**

- `CLAUDE.md`: añadir `/panel` al mapa mental del producto si procede.
- `docs/fase-b/SPEC-panel.md` §10: marcar los puntos que se hayan
  resuelto durante la implementación.
- `PENDIENTES.md`: si el §11 sigue sin decidirse, anotar que ahora además
  bloquea el estado P1-a del panel.

- [ ] **Lo que queda explícitamente fuera, y hay que decirlo al entregar**

1. **P1-a** (primer ingreso con perfil precargado por NIT) — bloqueado por
   `PENDIENTES.md` §11.
2. **El aviso de adenda nueva** — necesita el paso 9 del plan de recorrido.
3. **El taller de la oferta** — movimiento 3, sin especificar.
4. **Un solo buscador** — paso 11 del plan; el campo de la barra superior
   sigue siendo un enlace.
5. **`Ocultar de mi lista`** en los FAIL — sin persistencia.
6. **AguaLicita estado C** — se diseña cuando exista la lógica.
   **Revisión comprometida: 2026-10-25.**
