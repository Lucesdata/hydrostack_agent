# FichaCard y vitrina paginada — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el `FichaCard` con sus tres variantes y la vitrina paginada de fichas, montada en `/licitaciones`, sin depender del TopoJSON que bloquea el hero.

**Architecture:** Toda la lógica va en módulos puros con test (`ficha-card.ts`, `vitrina.ts`); los componentes son presentacionales y se verifican en el navegador. Es el patrón que ya sigue el repo: `semaforo.ts` calcula y `Semaforo.tsx` pinta. La vitrina **compone** lo que existe —`compuertasAbsolutas`, `Semaforo`, `condicionAbierto`, `slugDeProceso`— y no reimplementa nada. Las rutas son estáticas y paginan por camino, nunca por `searchParams`.

**Tech Stack:** Next.js 14 App Router · React 18 Server Components · Drizzle ORM sobre Postgres (Supabase) · Vitest (`environment: "node"`) · CSS como string exportado e inyectado con `<style dangerouslySetInnerHTML>`.

**Spec:** `docs/rediseno-2026-09/AUDITORIA-SPECS-LANDING-MAPA.md` (las once decisiones cerradas el 2026-09-21) sobre el spec de landing v1.2, §8 y §9. Las decisiones mandan sobre el spec allí donde lo contradicen.

## Global Constraints

- **Ninguna ruta pública lee `searchParams`.** Leerlo la marca como dinámica y cada visita pasa a ser una invocación facturable. La paginación va en el camino (`/pagina/2`), como ya hacen las facetas.
- **`generateStaticParams` devuelve `[]`** en toda ruta dinámica nueva. Prerrenderizar ata el build a la base de producción y las consultas fallan contra el pooler.
- **La tarjeta entera es un solo enlace.** Nada de enlaces anidados: el `Semaforo` se pasa en `disposicion="linea"`, que no renderiza ningún `<Link>`.
- **La cifra o la compuerta, nunca las dos.** Si se muestra el semáforo, el cuerpo de la tarjeta no repite cuantía, lugar ni tipo: sus compuertas ya los enuncian (decisión B; precedente medido en `FilaProceso.tsx`).
- **Nunca se inventa un valor.** Cada campo ausente tiene su texto explícito, definido en la Task 1.
- **Toda función nueva de dominio nace con su test.** Los componentes no se prueban con tests: el repo no tiene jsdom ni testing-library (`vitest.config.ts` usa `environment: "node"`), y se verifican en el navegador.
- **No se tocan los tokens de color.** `--bg #FAFAF7`, `--accent #0369A1` y el semáforo en el escalón -700 (decisión F).
- **Copia de interfaz en español**, con "Fichas de procesos" como nombre del contenido (decisión C). La ruta sigue siendo `/licitaciones`.
- **Antes de cada commit:** `npm test` (942 en verde hoy), `npm run lint`, `npx prettier --check "src/**/*" "app/**/*"`. El `npm run build` solo con el servidor de desarrollo **parado**, o `.next` queda pisado y la página sale en negro.

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/lib/secop/ficha-card.ts` | **Crear.** Modelo de vista puro de la tarjeta: etapa, textos y todos los campos ausentes |
| `src/__tests__/secop/ficha-card.test.ts` | **Crear.** Sus pruebas |
| `src/components/secop/ficha-card/FichaCard.tsx` | **Crear.** El componente, tres variantes |
| `src/components/secop/ficha-card/estilos.ts` | **Crear.** Su CSS, exportado como string |
| `src/lib/secop/vitrina.ts` | **Crear.** Pestañas, orden, paginación y la consulta |
| `src/__tests__/secop/vitrina.test.ts` | **Crear.** Pruebas de las partes puras |
| `src/components/secop/vitrina/Vitrina.tsx` | **Crear.** Cabecera, pestañas, rejilla, paginación y estados |
| `src/components/secop/vitrina/estilos.ts` | **Crear.** Su CSS |
| `app/licitaciones/page.js` | **Modificar.** Pasa de `ProcesosRecientes` a la vitrina |
| `app/licitaciones/pagina/[n]/page.tsx` | **Crear.** Página N de la pestaña de abiertos |
| `app/licitaciones/adjudicados/page.tsx` | **Crear.** Pestaña de adjudicados |
| `app/licitaciones/adjudicados/pagina/[n]/page.tsx` | **Crear.** Página N de adjudicados |

`src/components/secop/ProcesosRecientes.tsx` y `src/lib/secop/recientes.ts` **no se borran**: dejan de usarse en `/licitaciones` y quedan intactos, de modo que la Task 5 se revierte con un `git revert` si no convence.

### Lo que este plan NO hace, y por qué

- **No monta la vitrina en la portada.** `app/page.js` se rehace entero cuando llegue el TopoJSON; meter ahí una sección ahora es diseñarla dos veces. Los componentes quedan listos para montarse como S3 el día que se desbloquee.
- **No tiene selector de departamento** (spec 8.2). Con la decisión D, la ruta facetada `/licitaciones/departamento/[slug]` **es** la vitrina filtrada: ya existe, está indexada y pagina. Un segundo filtro sería una manera distinta de ver lo mismo.
- **No tiene pestaña `Cierran pronto`** (decisión A): cubriría 88 procesos de 35.518.
- **No toca el `SecopExplorer`** ni su segmento UNKNOWN invisible (`PENDIENTES.md` §22). Esa superficie es `/licitaciones/explorar`, no `/licitaciones`.

---

### Task 1: Modelo de vista del FichaCard

**Files:**
- Create: `src/lib/secop/ficha-card.ts`
- Test: `src/__tests__/secop/ficha-card.test.ts`

**Interfaces:**
- Consumes: `formatCopCompact` de `@/src/components/secop/format`.
- Produces: `ProcesoParaCard`, `FichaCardVista`, `EtapaVista`, `ClaveEtapa`, `vistaFichaCard(p: ProcesoParaCard, hoy: Date): FichaCardVista`, `ETAPA_POR_ESTADO`.

- [ ] **Step 1: Write the failing test**

Crear `src/__tests__/secop/ficha-card.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  ETAPA_POR_ESTADO,
  vistaFichaCard,
  type ProcesoParaCard,
} from "@/src/lib/secop/ficha-card";

const HOY = new Date("2026-09-21T12:00:00Z");

const base: ProcesoParaCard = {
  secopProcesoId: "CO1.REQ.1234567",
  objeto: "Optimización de la red de alcantarillado del sector nororiental",
  entidadNombre: "Empresas Municipales de Cali — EMCALI",
  departamento: "Valle del Cauca",
  municipio: "Cali",
  valorEstimado: "2340000000",
  estadoActual: "Publicado",
  estadoApertura: "Abierto",
  fechaRecepcion: null,
  adjudicatario: null,
  valorAdjudicacion: null,
  fechaAdjudicacion: null,
};

describe("la etapa sale de los estados que la fuente publica de verdad", () => {
  it("mapea los nueve valores reales de estado_actual", () => {
    expect(ETAPA_POR_ESTADO["Publicado"].label).toBe("ABIERTO");
    expect(ETAPA_POR_ESTADO["Abierto"].label).toBe("ABIERTO");
    expect(ETAPA_POR_ESTADO["Evaluación"].label).toBe("EN EVALUACIÓN");
    expect(ETAPA_POR_ESTADO["En aprobación"].label).toBe("EN EVALUACIÓN");
    expect(ETAPA_POR_ESTADO["Aprobado"].label).toBe("EN EVALUACIÓN");
    expect(ETAPA_POR_ESTADO["Seleccionado"].label).toBe("ADJUDICADO");
    expect(ETAPA_POR_ESTADO["Cancelado"].label).toBe("CANCELADO");
    expect(ETAPA_POR_ESTADO["Suspendido"].label).toBe("SUSPENDIDO");
    expect(ETAPA_POR_ESTADO["Borrador"].label).toBe("BORRADOR");
  });

  it("no inventa DESIERTO: ese estado no existe en la fuente", () => {
    expect(Object.values(ETAPA_POR_ESTADO).map((e) => e.label)).not.toContain("DESIERTO");
  });

  it("un estado desconocido o nulo cae en SIN ESTADO, no en blanco", () => {
    expect(vistaFichaCard({ ...base, estadoActual: null }, HOY).etapa.label).toBe("SIN ESTADO");
    expect(vistaFichaCard({ ...base, estadoActual: "Vaya usted a saber" }, HOY).etapa.label).toBe(
      "SIN ESTADO"
    );
  });
});

describe("el plazo dice lo que hay, no lo que se deduce", () => {
  it("sin fecha de recepción y abierto, enuncia la ventana binaria", () => {
    expect(vistaFichaCard(base, HOY).plazo).toBe("Abierto a ofertas");
  });

  it("sin fecha de recepción y cerrado, lo dice", () => {
    expect(vistaFichaCard({ ...base, estadoApertura: "Cerrado" }, HOY).plazo).toBe(
      "Cerrado a ofertas"
    );
  });

  it("con fecha futura añade la cuenta atrás", () => {
    const v = vistaFichaCard({ ...base, fechaRecepcion: "2026-09-29" }, HOY);
    expect(v.plazo).toBe("Recepción hasta el 29 sep 2026 · faltan 8 días");
  });

  it("con fecha de hoy no dice «faltan 0 días»", () => {
    const v = vistaFichaCard({ ...base, fechaRecepcion: "2026-09-21" }, HOY);
    expect(v.plazo).toBe("Recepción hasta el 21 sep 2026 · último día");
  });

  it("con fecha pasada no cuenta hacia atrás", () => {
    const v = vistaFichaCard({ ...base, fechaRecepcion: "2026-09-01" }, HOY);
    expect(v.plazo).toBe("Recepción cerrada el 01 sep 2026");
  });
});

describe("los campos ausentes tienen texto, nunca hueco", () => {
  it("entidad sin resolver", () => {
    expect(vistaFichaCard({ ...base, entidadNombre: null }, HOY).entidad).toBe(
      "Entidad no informada"
    );
  });

  it("objeto sin publicar", () => {
    expect(vistaFichaCard({ ...base, objeto: null }, HOY).objeto).toBe("Objeto no publicado");
  });

  it("cuantía sin publicar, y el cero no es una cuantía", () => {
    expect(vistaFichaCard({ ...base, valorEstimado: null }, HOY).cuantia).toBe(
      "Cuantía no publicada"
    );
    expect(vistaFichaCard({ ...base, valorEstimado: "0" }, HOY).cuantia).toBe(
      "Cuantía no publicada"
    );
  });

  it("ubicación: municipio y departamento, solo departamento, o nada", () => {
    expect(vistaFichaCard(base, HOY).ubicacion).toBe("Cali, Valle del Cauca");
    expect(vistaFichaCard({ ...base, municipio: null }, HOY).ubicacion).toBe("Valle del Cauca");
    expect(
      vistaFichaCard({ ...base, municipio: null, departamento: null }, HOY).ubicacion
    ).toBe("Ubicación no informada");
  });
});

describe("la adjudicación sustituye al plazo cuando existe", () => {
  it("con proveedor y valor", () => {
    const v = vistaFichaCard(
      {
        ...base,
        fechaAdjudicacion: "2026-09-17",
        adjudicatario: "Constructora del Pacífico S.A.S.",
        valorAdjudicacion: "1980000000",
      },
      HOY
    );
    expect(v.adjudicacion).toBe("Adjudicado a Constructora del Pacífico S.A.S. · $1.980 M");
  });

  it("adjudicado sin proveedor publicado", () => {
    const v = vistaFichaCard(
      { ...base, fechaAdjudicacion: "2026-09-17", valorAdjudicacion: "1980000000" },
      HOY
    );
    expect(v.adjudicacion).toBe("Adjudicatario no publicado · $1.980 M");
  });

  it("sin adjudicación es null, y entonces manda el plazo", () => {
    expect(vistaFichaCard(base, HOY).adjudicacion).toBeNull();
  });
});

describe("el id", () => {
  it("se muestra tal cual, porque es la clave y nunca falta", () => {
    expect(vistaFichaCard(base, HOY).id).toBe("CO1.REQ.1234567");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/secop/ficha-card.test.ts`
Expected: FAIL — `Cannot find module '@/src/lib/secop/ficha-card'`

- [ ] **Step 3: Write minimal implementation**

Crear `src/lib/secop/ficha-card.ts`:

```ts
/**
 * El modelo de vista del FichaCard.
 *
 * Mismo reparto que `semaforo.ts`: aquí QUÉ dice la tarjeta, en el componente
 * CÓMO se dibuja. Puro y probable sin montar React.
 *
 * Los textos de ausencia no son decorativos: `requisitos_proceso`,
 * `pliego_proceso` y `documento` están a 0 filas, y solo 242 de 35.518 procesos
 * abiertos traen fecha de cierre. La tarjeta se pasa la vida enseñando huecos,
 * así que cada hueco dice por qué lo es en vez de quedarse en blanco.
 */

import { formatCopCompact } from "@/src/components/secop/format";

export type ClaveEtapa =
  | "abierto"
  | "evaluacion"
  | "adjudicado"
  | "cancelado"
  | "suspendido"
  | "borrador"
  | "desconocido";

export interface EtapaVista {
  clave: ClaveEtapa;
  label: string;
}

/**
 * Los nueve valores que `proceso.estado_actual` tiene de verdad, medidos sobre
 * la base el 2026-09-21. El spec pedía ABIERTO · EN EVALUACIÓN · ADJUDICADO ·
 * DESIERTO · CANCELADO; "Desierto" no existe en la fuente y "Seleccionado" —que
 * son 37.188 filas— es el que de verdad significa adjudicado.
 */
export const ETAPA_POR_ESTADO: Record<string, EtapaVista> = {
  Publicado: { clave: "abierto", label: "ABIERTO" },
  Abierto: { clave: "abierto", label: "ABIERTO" },
  Evaluación: { clave: "evaluacion", label: "EN EVALUACIÓN" },
  "En aprobación": { clave: "evaluacion", label: "EN EVALUACIÓN" },
  Aprobado: { clave: "evaluacion", label: "EN EVALUACIÓN" },
  Seleccionado: { clave: "adjudicado", label: "ADJUDICADO" },
  Cancelado: { clave: "cancelado", label: "CANCELADO" },
  Suspendido: { clave: "suspendido", label: "SUSPENDIDO" },
  Borrador: { clave: "borrador", label: "BORRADOR" },
};

const ETAPA_DESCONOCIDA: EtapaVista = { clave: "desconocido", label: "SIN ESTADO" };

export interface ProcesoParaCard {
  secopProcesoId: string;
  objeto: string | null;
  entidadNombre: string | null;
  departamento: string | null;
  municipio: string | null;
  valorEstimado: string | number | null;
  estadoActual: string | null;
  estadoApertura: string | null;
  fechaRecepcion: string | null;
  adjudicatario?: string | null;
  valorAdjudicacion?: string | number | null;
  fechaAdjudicacion?: string | null;
}

export interface FichaCardVista {
  id: string;
  etapa: EtapaVista;
  entidad: string;
  objeto: string;
  /** Solo la pinta la variante `compacta`: donde hay semáforo, lo dice su compuerta. */
  cuantia: string;
  ubicacion: string;
  plazo: string;
  /** Sustituye al plazo cuando el proceso ya se adjudicó. `null` si no aplica. */
  adjudicacion: string | null;
}

/** 24 sep 2026. Sin año no se puede comparar un proceso de 2025 con uno de 2026. */
function fechaCorta(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Días naturales entre dos fechas, ignorando la hora. */
function diasHasta(iso: string, hoy: Date): number {
  const dia = 24 * 60 * 60 * 1000;
  const a = Date.parse(`${iso}T12:00:00Z`);
  const b = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate(), 12);
  return Math.round((a - b) / dia);
}

function numero(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * El plazo (decisión A del 2026-09-21).
 *
 * El dataset no publica fecha de cierre: 242 de 35.518 abiertos traen
 * `fecha_recepcion`. La señal fiable es `estado_apertura`, que es binaria y está
 * en el 100 % de las filas. La cuenta atrás solo aparece donde hay fecha.
 */
function plazoDe(p: ProcesoParaCard, hoy: Date): string {
  if (p.fechaRecepcion) {
    const dias = diasHasta(p.fechaRecepcion, hoy);
    const cuando = fechaCorta(p.fechaRecepcion);
    if (dias < 0) return `Recepción cerrada el ${cuando}`;
    if (dias === 0) return `Recepción hasta el ${cuando} · último día`;
    return `Recepción hasta el ${cuando} · faltan ${dias} días`;
  }
  return p.estadoApertura === "Abierto" ? "Abierto a ofertas" : "Cerrado a ofertas";
}

function adjudicacionDe(p: ProcesoParaCard): string | null {
  if (!p.fechaAdjudicacion) return null;
  const quien = p.adjudicatario ?? "Adjudicatario no publicado";
  const cuanto = numero(p.valorAdjudicacion);
  const texto = p.adjudicatario ? `Adjudicado a ${quien}` : quien;
  return cuanto === null ? texto : `${texto} · ${formatCopCompact(cuanto)}`;
}

export function vistaFichaCard(p: ProcesoParaCard, hoy: Date): FichaCardVista {
  const valor = numero(p.valorEstimado);
  const lugar = [p.municipio, p.departamento].filter(Boolean).join(", ");

  return {
    id: p.secopProcesoId,
    etapa: (p.estadoActual && ETAPA_POR_ESTADO[p.estadoActual]) || ETAPA_DESCONOCIDA,
    entidad: p.entidadNombre ?? "Entidad no informada",
    objeto: p.objeto ?? "Objeto no publicado",
    cuantia: valor === null ? "Cuantía no publicada" : formatCopCompact(valor),
    ubicacion: lugar || "Ubicación no informada",
    plazo: plazoDe(p, hoy),
    adjudicacion: adjudicacionDe(p),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/secop/ficha-card.test.ts`
Expected: PASS, 15 tests.

Los valores del formato están comprobados contra la implementación real:
`formatCopCompact(2340000000)` da `$2.340 M` y `formatCopCompact(1980000000)` da
`$1.980 M`. Si alguno fallara, el error está en el test o en la entrada, no en
`format.ts`, que es compartido y tiene sus propias pruebas.

- [ ] **Step 5: Commit**

```bash
git add src/lib/secop/ficha-card.ts src/__tests__/secop/ficha-card.test.ts
git commit -m "feat(ficha-card): modelo de vista con los estados reales de la fuente"
```

---

### Task 2: El componente FichaCard y sus tres variantes

**Files:**
- Create: `src/components/secop/ficha-card/FichaCard.tsx`
- Create: `src/components/secop/ficha-card/estilos.ts`

**Interfaces:**
- Consumes: `vistaFichaCard`, `FichaCardVista` (Task 1); `compuertasAbsolutas` de `@/src/lib/secop/semaforo`; `Semaforo` de `@/src/components/secop/semaforo/Semaforo`; `ESTILOS_SEMAFORO` de `@/src/components/secop/semaforo/estilos`; `hrefDeProceso` de `@/src/components/secop/lista/PaginaFaceta`.
- Produces: `FichaCard` (default export), `ESTILOS_FICHA_CARD`, `type VarianteFicha = "destacada" | "vitrina" | "compacta"`.

No lleva test propio: es presentacional y el repo no tiene entorno de pruebas de componentes. Se verifica en el navegador en la Task 5.

- [ ] **Step 1: Escribir los estilos**

Crear `src/components/secop/ficha-card/estilos.ts`:

```ts
/**
 * CSS de la tarjeta, como string exportado e inyectado por quien la monta.
 * Es el patrón del repo (ver `lista/estilos.ts` y `semaforo/estilos.ts`).
 *
 * Los colores salen de los tokens de `globals.css`. Ninguno se escribe a mano:
 * `contraste.test.ts` lee los tokens reales y fallaría si se colara un literal.
 */
export const ESTILOS_FICHA_CARD = `
.fc {
  position: relative;
  display: block;
  background: var(--card, #FFFFFF);
  border: 1px solid var(--border, #E6E4DD);
  border-radius: 4px;
  padding: 18px 20px;
  color: inherit;
  transition: border-color .16s ease, transform .16s ease, box-shadow .16s ease;
}
.fc:hover {
  border-color: color-mix(in srgb, var(--accent) 40%, transparent);
  transform: translateY(-4px);
  box-shadow: 0 10px 24px rgba(10, 31, 28, 0.08);
}
.fc:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

.fc-cab { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.fc-id { font: 11px var(--mono); color: var(--text-muted, #6B746F); letter-spacing: .02em; }
.fc-etapa {
  font: 600 10px var(--mono);
  letter-spacing: .08em;
  padding: 3px 8px;
  border-radius: 3px;
  white-space: nowrap;
  background: var(--surface-alt, #F1EFE8);
  color: var(--text-muted, #6B746F);
}
.fc-etapa--abierto { background: color-mix(in srgb, var(--success) 12%, transparent); color: var(--success); }
.fc-etapa--adjudicado { background: color-mix(in srgb, var(--accent) 12%, transparent); color: var(--accent-deep, var(--accent)); }
.fc-etapa--cancelado { background: color-mix(in srgb, var(--danger) 12%, transparent); color: var(--danger); }
.fc-etapa--evaluacion, .fc-etapa--suspendido { background: color-mix(in srgb, var(--warning) 12%, transparent); color: var(--warning); }

.fc-entidad { font: 12px var(--sans); color: var(--text-muted, #6B746F); margin: 0 0 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fc-objeto {
  font: 600 15px/1.35 var(--sans);
  color: var(--text-primary, #0A1F1C);
  margin: 0 0 14px;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.fc-plazo { font: 12px var(--mono); color: var(--text-muted, #6B746F); margin: 0 0 14px; }
.fc-sep { height: 1px; background: var(--border, #E6E4DD); margin: 0 0 12px; }
.fc-pie { display: flex; align-items: center; justify-content: flex-end; margin-top: 12px; }
.fc-ver { font: 600 12px var(--mono); color: var(--accent); }

/* destacada: sobre el mapa del hero, más aire y sombra propia */
.fc--destacada { padding: 24px 26px; box-shadow: 0 16px 40px rgba(10, 31, 28, 0.12); }
.fc--destacada .fc-objeto { font-size: 17px; -webkit-line-clamp: 3; }

/* compacta: listas y correo. Sin semáforo, así que aquí SÍ va la cuantía. */
.fc--compacta { padding: 12px 14px; }
.fc--compacta .fc-objeto { font-size: 13px; margin-bottom: 8px; }
.fc-cuantia { font: 600 13px var(--mono); color: var(--text-primary, #0A1F1C); }

@media (max-width: 640px) {
  .fc { padding: 14px 16px; }
  .fc-cab { flex-wrap: wrap; }
}
`;
```

- [ ] **Step 2: Escribir el componente**

Crear `src/components/secop/ficha-card/FichaCard.tsx`:

```tsx
import Link from "next/link";
import { vistaFichaCard, type ProcesoParaCard } from "@/src/lib/secop/ficha-card";
import { compuertasAbsolutas } from "@/src/lib/secop/semaforo";
import Semaforo from "../semaforo/Semaforo";
import type { TipoProyecto } from "@/src/lib/classify/tipo-proyecto";

/**
 * La tarjeta de un proceso. Es el componente central del producto: lo usan la
 * vitrina, el hero y —en su variante compacta— las listas y el correo.
 *
 * ── Una sola cifra por eje ──────────────────────────────────────────────────
 * Donde hay semáforo no hay cuantía en el cuerpo: la compuerta de Cuantía ya la
 * enuncia, y repetirla fue el fallo que se corrigió en la fila densa. La
 * variante `compacta` no lleva semáforo, así que allí la cifra sí aparece.
 *
 * ── Un solo enlace ──────────────────────────────────────────────────────────
 * Toda la tarjeta es el enlace, así que nada de dentro puede serlo. El semáforo
 * va en `disposicion="linea"`, la única que no renderiza un `<Link>`.
 */

export type VarianteFicha = "destacada" | "vitrina" | "compacta";

export interface FichaCardProps {
  proceso: ProcesoParaCard & { tipoProyecto: TipoProyecto | null };
  href: string;
  variante?: VarianteFicha;
  /** Inyectable para que la cuenta atrás sea determinista en pruebas. */
  hoy?: Date;
}

export default function FichaCard({
  proceso,
  href,
  variante = "vitrina",
  hoy = new Date(),
}: FichaCardProps) {
  const v = vistaFichaCard(proceso, hoy);
  const conSemaforo = variante !== "compacta";

  return (
    <Link href={href} className={`fc fc--${variante}`}>
      <div className="fc-cab">
        <span className="fc-id">{v.id}</span>
        <span className={`fc-etapa fc-etapa--${v.etapa.clave}`}>{v.etapa.label}</span>
      </div>

      <p className="fc-entidad" title={v.entidad}>
        {v.entidad}
      </p>
      <p className="fc-objeto">{v.objeto}</p>

      {/* La adjudicación manda sobre el plazo: en un proceso ya resuelto, la
          ventana de ofertas no informa de nada. */}
      <p className="fc-plazo">{v.adjudicacion ?? v.plazo}</p>

      {conSemaforo ? (
        <>
          <div className="fc-sep" />
          <Semaforo compuertas={compuertasAbsolutas(proceso)} />
        </>
      ) : (
        <p className="fc-cuantia">{v.cuantia}</p>
      )}

      <div className="fc-pie">
        <span className="fc-ver">Ver ficha →</span>
      </div>
    </Link>
  );
}
```

- [ ] **Step 3: Comprobar que compila y que el formato pasa**

Run: `npx tsc --noEmit` y `npx prettier --check "src/components/secop/ficha-card/*"`
Expected: sin errores. `compuertasAbsolutas` acepta `proceso` porque `ProcesoParaCard & { tipoProyecto }` cubre `ProcesoParaSemaforo`; si `tsc` se queja, **no relajar el tipo con `as`**: añadir el campo que falte a `ProcesoParaCard`.

- [ ] **Step 4: Commit**

```bash
git add src/components/secop/ficha-card
git commit -m "feat(ficha-card): el componente y sus tres variantes"
```

---

### Task 3: Capa de datos de la vitrina

**Files:**
- Create: `src/lib/secop/vitrina.ts`
- Test: `src/__tests__/secop/vitrina.test.ts`

**Interfaces:**
- Consumes: `condicionAbierto` de `@/src/lib/secop/agregados`; `db` de `@/src/lib/db/client`; `proceso`, `entidad`, `geografia` de `@/src/lib/db/schema`.
- Produces: `PESTANAS_VITRINA`, `PestanaVitrina`, `POR_PAGINA_VITRINA`, `DIAS_ADJUDICACION_RECIENTE`, `ProcesoDeVitrina`, `PaginaDeVitrina`, `paginaValida(raw: string): number | null`, `rutaVitrina(pestana: PestanaVitrina, pagina: number): string`, `procesosDeVitrina(pestana: PestanaVitrina, pagina?: number): Promise<PaginaDeVitrina>`.

- [ ] **Step 1: Write the failing test**

Crear `src/__tests__/secop/vitrina.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  PESTANAS_VITRINA,
  POR_PAGINA_VITRINA,
  paginaValida,
  rutaVitrina,
} from "@/src/lib/secop/vitrina";

describe("las pestañas", () => {
  it("son dos: «Cierran pronto» se cayó con la decisión A", () => {
    expect([...PESTANAS_VITRINA]).toEqual(["abiertos", "adjudicados"]);
  });

  it("la rejilla es de 9, que es la decisión D5 del spec", () => {
    expect(POR_PAGINA_VITRINA).toBe(9);
  });
});

describe("la página viene del camino, no de un query string", () => {
  it("acepta enteros mayores que 1", () => {
    expect(paginaValida("2")).toBe(2);
    expect(paginaValida("137")).toBe(137);
  });

  it("rechaza la página 1: su ruta canónica es la base, sin sufijo", () => {
    expect(paginaValida("1")).toBeNull();
  });

  it("rechaza lo que no es un entero positivo", () => {
    expect(paginaValida("0")).toBeNull();
    expect(paginaValida("-3")).toBeNull();
    expect(paginaValida("2.5")).toBeNull();
    expect(paginaValida("abc")).toBeNull();
    expect(paginaValida("")).toBeNull();
    expect(paginaValida("02")).toBeNull();
  });
});

describe("las rutas", () => {
  it("la primera página de abiertos es /licitaciones a secas", () => {
    expect(rutaVitrina("abiertos", 1)).toBe("/licitaciones");
  });

  it("las demás cuelgan del camino", () => {
    expect(rutaVitrina("abiertos", 3)).toBe("/licitaciones/pagina/3");
    expect(rutaVitrina("adjudicados", 1)).toBe("/licitaciones/adjudicados");
    expect(rutaVitrina("adjudicados", 2)).toBe("/licitaciones/adjudicados/pagina/2");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/secop/vitrina.test.ts`
Expected: FAIL — `Cannot find module '@/src/lib/secop/vitrina'`

- [ ] **Step 3: Write minimal implementation**

Crear `src/lib/secop/vitrina.ts`:

```ts
/**
 * La capa de datos de la vitrina de fichas.
 *
 * Dos pestañas y nada más. `Cierran pronto` se cayó al medir: cubriría 88
 * procesos de 35.518, porque el dataset no publica fecha de cierre (decisión A,
 * 2026-09-21). El filtro por departamento tampoco vive aquí: la ruta facetada
 * `/licitaciones/departamento/[slug]` ya es esta misma vitrina filtrada
 * (decisión D).
 *
 * La definición de "abierto" se importa de `agregados.ts`. No se reescribe: si
 * cada superficie define la suya, la portada enseña cuatro cifras distintas del
 * mismo hecho.
 */

import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "../db/client";
import { entidad, geografia, proceso } from "../db/schema";
import { condicionAbierto } from "./agregados";
import type { TipoProyecto } from "../classify/tipo-proyecto";

export const PESTANAS_VITRINA = ["abiertos", "adjudicados"] as const;
export type PestanaVitrina = (typeof PESTANAS_VITRINA)[number];

/** Decisión D5 del spec: rejilla de 3×3 en escritorio. */
export const POR_PAGINA_VITRINA = 9;

/** "Reciente" para una adjudicación. Con 30 días son ~191 procesos. */
export const DIAS_ADJUDICACION_RECIENTE = 30;

export interface ProcesoDeVitrina {
  id: string;
  secopProcesoId: string;
  objeto: string | null;
  entidadNombre: string | null;
  departamento: string | null;
  municipio: string | null;
  valorEstimado: string | null;
  estadoActual: string | null;
  estadoApertura: string | null;
  fechaRecepcion: string | null;
  tipoProyecto: TipoProyecto | null;
  adjudicatario: string | null;
  valorAdjudicacion: string | null;
  fechaAdjudicacion: string | null;
}

export interface PaginaDeVitrina {
  items: ProcesoDeVitrina[];
  total: number;
  pagina: number;
  porPagina: number;
  pestana: PestanaVitrina;
}

/**
 * Valida el segmento `[n]` de la ruta. Devuelve `null` —y la ruta responde 404—
 * para cualquier cosa que no sea un entero mayor que 1, incluido el "1": su
 * ruta canónica es la base, y servir el mismo listado en dos URLs parte la
 * señal de SEO en dos.
 */
export function paginaValida(raw: string): number | null {
  if (!/^[1-9][0-9]*$/.test(raw)) return null;
  const n = Number(raw);
  return n > 1 ? n : null;
}

export function rutaVitrina(pestana: PestanaVitrina, pagina: number): string {
  const base = pestana === "abiertos" ? "/licitaciones" : "/licitaciones/adjudicados";
  return pagina <= 1 ? base : `${base}/pagina/${pagina}`;
}

const CAMPOS = {
  id: proceso.id,
  secopProcesoId: proceso.secopProcesoId,
  objeto: proceso.objeto,
  entidadNombre: entidad.nombre,
  departamento: geografia.departamentoNombre,
  municipio: geografia.municipioNombre,
  valorEstimado: proceso.valorEstimado,
  estadoActual: proceso.estadoActual,
  estadoApertura: proceso.estadoApertura,
  fechaRecepcion: proceso.fechaRecepcion,
  tipoProyecto: proceso.tipoProyecto,
  adjudicatario: proceso.adjudicatario,
  valorAdjudicacion: proceso.valorAdjudicacion,
  fechaAdjudicacion: proceso.fechaAdjudicacion,
};

/** El filtro de cada pestaña, en un solo sitio: la cuenta y la página deben cuadrar. */
function condicionDe(pestana: PestanaVitrina) {
  if (pestana === "abiertos") return condicionAbierto();
  return and(
    isNull(proceso.deletedAt),
    gte(
      proceso.fechaAdjudicacion,
      sql`current_date - ${DIAS_ADJUDICACION_RECIENTE}`
    )
  );
}

export async function procesosDeVitrina(
  pestana: PestanaVitrina,
  pagina = 1
): Promise<PaginaDeVitrina> {
  const where = condicionDe(pestana);
  const orden =
    pestana === "abiertos" ? desc(proceso.fechaPublicacion) : desc(proceso.fechaAdjudicacion);

  const [filas, [{ total }]] = await Promise.all([
    db
      .select(CAMPOS)
      .from(proceso)
      .leftJoin(entidad, eq(entidad.id, proceso.entidadId))
      .leftJoin(geografia, eq(geografia.codigoDivipola, proceso.geografiaId))
      .where(where)
      .orderBy(orden)
      .limit(POR_PAGINA_VITRINA)
      .offset((pagina - 1) * POR_PAGINA_VITRINA),
    db.select({ total: sql<number>`count(*)::int` }).from(proceso).where(where),
  ]);

  return {
    items: filas as ProcesoDeVitrina[],
    total,
    pagina,
    porPagina: POR_PAGINA_VITRINA,
    pestana,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/secop/vitrina.test.ts`
Expected: PASS, 7 tests.

Si `entidad.nombre` no es el nombre exacto de la columna, mirar `src/lib/db/schema/catalogos.ts` y usar el que haya. No inventar un alias.

- [ ] **Step 5: Comprobar la consulta contra la base real**

El repo no prueba SQL con base de por medio (`agregados.ts` tampoco lo hace: su
test cubre las partes puras). Así que la consulta se ejecuta una vez a mano,
cargando el entorno como hacen los scripts del proyecto:

```bash
npx tsx -e "
import './scripts/_env';
import { procesosDeVitrina } from './src/lib/secop/vitrina';
for (const p of ['abiertos', 'adjudicados']) {
  const r = await procesosDeVitrina(p, 1);
  console.log(p, '→ total', r.total, '| items', r.items.length);
  console.log('  primera:', r.items[0]?.secopProcesoId, '|', r.items[0]?.entidadNombre);
}
process.exit(0);
"
```

Expected: `abiertos → total 35518 | items 9` y `adjudicados → total 191 | items 9`,
con los totales medidos el 2026-09-21 (variarán con la ingesta diaria, pero el
orden de magnitud no). Si `adjudicados` da 0, el fallo está en la comparación de
`current_date - 30` contra la columna `date`, no en el componente.

- [ ] **Step 6: Commit**

```bash
git add src/lib/secop/vitrina.ts src/__tests__/secop/vitrina.test.ts
git commit -m "feat(vitrina): pestañas, orden y paginación por camino"
```

---

### Task 4: El componente Vitrina

**Files:**
- Create: `src/components/secop/vitrina/Vitrina.tsx`
- Create: `src/components/secop/vitrina/estilos.ts`

**Interfaces:**
- Consumes: `PaginaDeVitrina`, `PestanaVitrina`, `rutaVitrina` (Task 3); `FichaCard`, `ESTILOS_FICHA_CARD` (Task 2); `ESTILOS_SEMAFORO`; `hrefDeProceso` de `@/src/components/secop/lista/PaginaFaceta`.
- Produces: `Vitrina` (default export).

- [ ] **Step 1: Escribir los estilos**

Crear `src/components/secop/vitrina/estilos.ts`:

```ts
export const ESTILOS_VITRINA = `
.vt-cab { margin-bottom: 20px; }
.vt-h1 { font: 700 clamp(24px, 3vw, 32px)/1.15 var(--sans); color: var(--text-primary, #0A1F1C); margin: 0 0 6px; }
.vt-apoyo { font: 14px var(--sans); color: var(--text-muted, #6B746F); margin: 0; }
.vt-conteo { font: 12px var(--mono); color: var(--text-muted, #6B746F); margin: 10px 0 0; }

.vt-tabs { display: flex; gap: 8px; margin: 18px 0 22px; border-bottom: 1px solid var(--border, #E6E4DD); }
.vt-tab {
  font: 600 13px var(--sans);
  padding: 9px 14px;
  color: var(--text-muted, #6B746F);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.vt-tab[aria-current="page"] { color: var(--accent); border-bottom-color: var(--accent); }

.vt-rejilla { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; list-style: none; margin: 0; padding: 0; }
.vt-rejilla > li { display: flex; }
.vt-rejilla > li > a { flex: 1; }

.vt-vacio { font: 14px var(--sans); color: var(--text-muted, #6B746F); padding: 32px 0; }
.vt-vacio-accion { display: inline-block; margin-top: 10px; font: 600 13px var(--mono); color: var(--accent); }

.vt-pag { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 26px; }
.vt-pag-info { font: 12px var(--mono); color: var(--text-muted, #6B746F); }
.vt-pag-link { font: 600 13px var(--mono); color: var(--accent); }

@media (max-width: 1023px) { .vt-rejilla { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px) { .vt-rejilla { grid-template-columns: 1fr; } .vt-tabs { overflow-x: auto; } }
`;
```

- [ ] **Step 2: Escribir el componente**

Crear `src/components/secop/vitrina/Vitrina.tsx`:

```tsx
import Link from "next/link";
import FichaCard from "../ficha-card/FichaCard";
import { ESTILOS_FICHA_CARD } from "../ficha-card/estilos";
import { ESTILOS_SEMAFORO } from "../semaforo/estilos";
import { ESTILOS_VITRINA } from "./estilos";
import { hrefDeProceso } from "../lista/PaginaFaceta";
import { rutaVitrina, type PaginaDeVitrina, type PestanaVitrina } from "@/src/lib/secop/vitrina";

/**
 * La vitrina: cabecera con conteo, pestañas, rejilla de nueve fichas y
 * paginación por camino.
 *
 * Las pestañas son enlaces, no estado de cliente: cada una tiene su URL, se
 * comparte, se indexa y no obliga a que la página lea `searchParams` —que es lo
 * que la volvería dinámica y facturable en cada visita.
 */

const TABS: { pestana: PestanaVitrina; label: string }[] = [
  { pestana: "abiertos", label: "Abiertos" },
  { pestana: "adjudicados", label: "Adjudicados recientes" },
];

const VACIO: Record<PestanaVitrina, { texto: string; accion: string; href: string }> = {
  abiertos: {
    texto: "No hay procesos abiertos ahora mismo.",
    accion: "Ver adjudicados recientes",
    href: "/licitaciones/adjudicados",
  },
  adjudicados: {
    texto: "No hay adjudicaciones en los últimos 30 días.",
    accion: "Ver procesos abiertos",
    href: "/licitaciones",
  },
};

export default function Vitrina({ pagina }: { pagina: PaginaDeVitrina }) {
  const totalPaginas = Math.max(1, Math.ceil(pagina.total / pagina.porPagina));
  const vacio = VACIO[pagina.pestana];

  return (
    <div className="clr-page">
      <style
        dangerouslySetInnerHTML={{
          __html: ESTILOS_VITRINA + ESTILOS_FICHA_CARD + ESTILOS_SEMAFORO,
        }}
      />
      <div className="clr-container">
        <header className="vt-cab">
          <h1 className="vt-h1">Fichas de procesos</h1>
          <p className="vt-apoyo">
            Abra cualquier ficha para ver requisitos, fechas y documentos.
          </p>
          <p className="vt-conteo">
            {pagina.total.toLocaleString("es-CO")}{" "}
            {pagina.pestana === "abiertos"
              ? pagina.total === 1
                ? "proceso abierto"
                : "procesos abiertos"
              : pagina.total === 1
                ? "adjudicación en 30 días"
                : "adjudicaciones en 30 días"}
          </p>
        </header>

        <nav className="vt-tabs" aria-label="Pestañas de la vitrina">
          {TABS.map((t) => (
            <Link
              key={t.pestana}
              className="vt-tab"
              href={rutaVitrina(t.pestana, 1)}
              aria-current={t.pestana === pagina.pestana ? "page" : undefined}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        {pagina.items.length === 0 ? (
          <div className="vt-vacio">
            <p style={{ margin: 0 }}>{vacio.texto}</p>
            <Link className="vt-vacio-accion" href={vacio.href}>
              {vacio.accion} →
            </Link>
          </div>
        ) : (
          <ul className="vt-rejilla">
            {pagina.items.map((p) => (
              <li key={p.id}>
                <FichaCard proceso={p} href={hrefDeProceso(p)} variante="vitrina" />
              </li>
            ))}
          </ul>
        )}

        {totalPaginas > 1 && (
          <nav className="vt-pag" aria-label="Paginación">
            <span className="vt-pag-info">
              Página {pagina.pagina} de {totalPaginas.toLocaleString("es-CO")}
            </span>
            <span style={{ display: "flex", gap: 16 }}>
              {pagina.pagina > 1 && (
                <Link
                  className="vt-pag-link"
                  href={rutaVitrina(pagina.pestana, pagina.pagina - 1)}
                >
                  ← Anterior
                </Link>
              )}
              {pagina.pagina < totalPaginas && (
                <Link
                  className="vt-pag-link"
                  href={rutaVitrina(pagina.pestana, pagina.pagina + 1)}
                >
                  Siguiente →
                </Link>
              )}
            </span>
          </nav>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Comprobar tipos y formato**

Run: `npx tsc --noEmit && npx prettier --check "src/components/secop/vitrina/*"`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/components/secop/vitrina
git commit -m "feat(vitrina): cabecera, pestañas, rejilla y paginación"
```

---

### Task 5: Montar la vitrina en `/licitaciones` y verificarla

**Files:**
- Modify: `app/licitaciones/page.js`
- Create: `app/licitaciones/pagina/[n]/page.tsx`
- Create: `app/licitaciones/adjudicados/page.tsx`
- Create: `app/licitaciones/adjudicados/pagina/[n]/page.tsx`

**Interfaces:**
- Consumes: `procesosDeVitrina`, `paginaValida`, `rutaVitrina` (Task 3); `Vitrina` (Task 4).
- Produces: las cuatro rutas.

`adjudicados` como segmento estático convive con `app/licitaciones/[slug]`: Next da precedencia al estático, y ningún slug de ficha puede llamarse así porque todos terminan en `--CO1.REQ.N`. Ya hay cinco hermanos estáticos (`explorar`, `descubrir`, `tipo`, `departamento`, `entidad`).

- [ ] **Step 1: Reemplazar la página del listado**

Sustituir el contenido de `app/licitaciones/page.js` por:

```jsx
import Vitrina from "@/src/components/secop/vitrina/Vitrina";
import { procesosDeVitrina } from "@/src/lib/secop/vitrina";

export const metadata = {
  title: "Fichas de procesos · agua y saneamiento en SECOP II",
  description:
    "Fichas claras de los procesos de agua y saneamiento publicados en SECOP II: cuantía, zona, plazo y quién puede participar.",
};

/**
 * 6 h, la misma cadencia que las facetas. No es el coste lo que manda sino la
 * ingesta: corre una vez al día y las altas llegan a saltos, así que revalidar
 * más a menudo regenera un dato que no ha cambiado.
 */
export const revalidate = 21600;

export default async function LicitacionesPage() {
  return <Vitrina pagina={await procesosDeVitrina("abiertos", 1)} />;
}
```

- [ ] **Step 2: Crear las tres rutas restantes**

`app/licitaciones/adjudicados/page.tsx`:

```tsx
import Vitrina from "@/src/components/secop/vitrina/Vitrina";
import { procesosDeVitrina } from "@/src/lib/secop/vitrina";

export const metadata = {
  title: "Adjudicados recientes · AquaLicita",
  description:
    "Procesos de agua y saneamiento adjudicados en los últimos 30 días, con su adjudicatario y su valor.",
};

export const revalidate = 21600;

export default async function AdjudicadosPage() {
  return <Vitrina pagina={await procesosDeVitrina("adjudicados", 1)} />;
}
```

`app/licitaciones/pagina/[n]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import Vitrina from "@/src/components/secop/vitrina/Vitrina";
import { paginaValida, procesosDeVitrina } from "@/src/lib/secop/vitrina";

export const revalidate = 21600;

/** Vacío a propósito: prerrenderizar ataría el build a la base de producción. */
export function generateStaticParams() {
  return [];
}

export default async function PaginaAbiertos({ params }: { params: { n: string } }) {
  const n = paginaValida(params.n);
  if (n === null) notFound();
  const pagina = await procesosDeVitrina("abiertos", n);
  if (pagina.items.length === 0) notFound();
  return <Vitrina pagina={pagina} />;
}
```

`app/licitaciones/adjudicados/pagina/[n]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import Vitrina from "@/src/components/secop/vitrina/Vitrina";
import { paginaValida, procesosDeVitrina } from "@/src/lib/secop/vitrina";

export const revalidate = 21600;

/** Vacío a propósito: prerrenderizar ataría el build a la base de producción. */
export function generateStaticParams() {
  return [];
}

export default async function PaginaAdjudicados({ params }: { params: { n: string } }) {
  const n = paginaValida(params.n);
  if (n === null) notFound();
  const pagina = await procesosDeVitrina("adjudicados", n);
  if (pagina.items.length === 0) notFound();
  return <Vitrina pagina={pagina} />;
}
```

- [ ] **Step 3: Los cuatro estados de 8.5**

Dos ya están: los dos vacíos, con su acción, viven en el componente (Task 4).
Faltan los otros dos, y uno de ellos **no se implementa, se explica**:

- **Cargando.** El spec pide nueve esqueletos. No aplica aquí: estas rutas son
  estáticas con ISR y el HTML llega ya renderizado, así que no hay ventana de
  carga que rellenar. Meter un `loading.tsx` añadiría un parpadeo donde hoy no
  lo hay. Cuando la vitrina se monte en la portada con filtros de cliente, se
  revisa.
- **Error.** Sí hace falta. Crear `app/licitaciones/error.tsx`:

```tsx
"use client";

/**
 * Frontera de error del listado. Sin ella, un fallo de la base cae en la
 * pantalla genérica de Next, que no ofrece salida.
 *
 * `reset()` reintenta el render en el cliente; si el fallo era de la consulta y
 * ya pasó, la página vuelve sin recargar.
 */
export default function ErrorLicitaciones({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="clr-page">
      <div className="clr-container" style={{ padding: "64px 0" }}>
        <h1 style={{ font: "700 24px var(--sans)", margin: "0 0 10px" }}>
          No pudimos cargar las fichas.
        </h1>
        <p style={{ font: "14px var(--sans)", color: "var(--text-muted)", margin: "0 0 18px" }}>
          El listado no respondió. Puede volver a intentarlo.
        </p>
        <button
          onClick={reset}
          style={{
            font: "600 13px var(--mono)",
            color: "var(--accent)",
            background: "none",
            border: "1px solid var(--accent)",
            borderRadius: 3,
            padding: "9px 16px",
            cursor: "pointer",
          }}
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
```

No se registra en Sentry: no está instalado y la decisión G dice no instalarlo.
Next ya manda el error a los logs de la función, que es donde se mira hoy.

Sobre el "scroll al inicio" de 8.4: sale gratis. Al paginar por camino hay
navegación de página completa y el navegador empieza arriba; no hace falta
`scrollIntoView`.

- [ ] **Step 4: Verificar en el navegador**

1. `preview_start` con la configuración `hydrostack`.
2. Abrir `/licitaciones` y comprobar: el conteo de la cabecera dice **35.518 procesos abiertos**, hay nueve tarjetas, cada una lleva su semáforo de cinco compuertas y ninguna repite la cuantía en el cuerpo.
3. Abrir `/licitaciones/adjudicados`: el conteo dice **191**, y cada tarjeta muestra "Adjudicado a … · $…" en lugar del plazo.
4. `/licitaciones/pagina/2` carga; `/licitaciones/pagina/0` y `/licitaciones/pagina/abc` dan 404.
5. Con `read_console_messages` comprobar que no hay errores.
6. Con `javascript_tool`, confirmar que ninguna tarjeta tiene enlaces anidados:
   `document.querySelectorAll('.fc a').length` debe ser **0**.
7. `resize_window` a 375×812: la rejilla pasa a una columna y las pestañas siguen alcanzables.

- [ ] **Step 5: Verificar que no se rompió nada**

```bash
npm test
npm run lint
npx prettier --check "src/**/*" "app/**/*"
```

Parar el preview y entonces:

```bash
rm -rf .next && npm run build
```

Comprobar en la salida que `/licitaciones` sigue marcada `○` (estática) y que su First Load JS no sube respecto a los 95,1 kB de hoy. Si aparece `ƒ`, algo está leyendo `searchParams` o la petición: buscarlo antes de seguir.

- [ ] **Step 6: Commit**

```bash
git add app/licitaciones
git commit -m "feat(vitrina): montarla en /licitaciones con sus cuatro rutas"
```

---

## Qué queda fuera y dónde continúa

| Pieza del spec | Dónde vive ahora |
|---|---|
| Variante `destacada` en el hero (6.5) | Construida en la Task 2, sin montar: el hero está bloqueado por el TopoJSON |
| Variante `compacta` en correo y `/mis-coincidencias` | Construida, sin montar |
| Banda de datos vivos (S2) | Plan aparte; su regla de frescura sale de `sync_log` |
| Fila de perfil en la vitrina | Espera a la decisión J: persistencia sin cuenta con el patrón de `diagnostico` |
| Contador de descartados | Depende de `al_descartes`, del motor de filtros |
| Mapa y hero | Bloqueados hasta que llegue el TopoJSON |
