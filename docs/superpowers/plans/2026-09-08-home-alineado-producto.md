# Home alineado con el producto — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reescribir el home para que cuente el motor de vigilancia que ya está
construido (filtros, competidores, auditoría, alertas, diagnóstico) en vez del
lector de pliegos que hoy anuncia, con cada promesa respaldada por datos reales
y por la política de acceso.

**Architecture:** Se conserva el lenguaje visual blueprint. Cada bloque nuevo
nace como componente en `src/components/landing/`, siguiendo el patrón `S2…S6`
que ya existe, y `app/page.js` queda solo con hero, fondo y composición. Las
cifras salen de Postgres por Drizzle a través de un módulo nuevo
(`src/lib/landing/cifras.ts`) servido por el endpoint existente
`/api/landing-stats`. Tres tests nuevos impiden que el home vuelva a prometer
lo que no cumple.

**Tech Stack:** Next.js 14.2.3 (App Router), React 18, Drizzle ORM sobre
Postgres (Supabase), Vitest.

**Spec:** `docs/superpowers/specs/2026-09-08-home-alineado-producto-design.md`

## Global Constraints

- **Idioma:** todo el copy visible al usuario va en español. Los comentarios de
  código, en español, siguiendo el estilo del repo.
- **Ninguna cifra se escribe a mano en el JSX.** Toda cifra llega por props
  desde `/api/landing-stats` y debe renderizar `—` cuando el valor es `null`.
- **Ninguna cifra nueva sale de Socrata.** Las cifras nuevas se leen de Postgres
  vía Drizzle (`src/lib/db/client.ts`). `src/lib/secop/landingStats.ts` consulta
  Socrata y NO se toca en este plan.
- **Los descartes no se publican como cifra.** `al_descartes` va por
  `accountId`; no es un total del sistema.
- **Tokens de color existentes**, nunca hex nuevos inventados:
  `--accent:#0369A1`, `--bg:#FAFAF7`, tinta `#0A1F1C`, texto secundario
  `#525B5A`, mono `#6B746F`, línea `#DADAD2`, fondo del home `#FCFCF9`.
- **Fuentes por variable**, nunca literales: `var(--font-inter)`,
  `var(--font-jetbrains-mono)`, `var(--font-ibm-plex-sans-condensed)`.
- **Cada tarea termina con `npm run lint` y `npx prettier --write` sobre los
  archivos tocados.** El CI ya se puso en rojo una vez por formato (`c085ddb`).
- **No commitear en el worktree mientras corran implementadores en paralelo.**

## Mapa de archivos

| Archivo | Responsabilidad | Tarea |
|---|---|---|
| `src/lib/landing/cifras.ts` | crear — tres conteos por Drizzle, degradación individual | 1 |
| `app/api/landing-stats/route.ts` | modificar — añadir bloque `sector` | 2 |
| `src/components/landing/seccionesHome.js` | crear — datos declarativos de secciones (ruta + capacidad) | 3 |
| `src/__tests__/landing/enlaces.test.ts` | crear — ninguna ruta prometida está rota | 3 |
| `src/__tests__/landing/acceso.test.ts` | crear — etiqueta visible == `NIVEL_MINIMO` | 3 |
| `src/components/landing/S2Diagnostico.jsx` | crear — la puerta sin cuenta | 4 |
| `src/components/landing/S3Motor.jsx` | crear — los cuatro pasos | 5 |
| `src/components/landing/S4Competidores.jsx` | crear — quién compite | 6 |
| `src/components/landing/S5Descartes.jsx` | crear — qué se descarta | 7 |
| `src/components/landing/S4Invitation.jsx` | borrar — lo sustituye `S2Diagnostico` | 4 |
| `src/components/landing/S2WhyAquaLicita.jsx` | borrar — lo sustituye `S3Motor` | 5 |
| `src/components/landing/S3EverythingInOne.jsx` | borrar — lo sustituye `S3Motor` | 5 |
| `src/components/landing/IntentJourney.jsx` | borrar — código muerto, 518 líneas | 8 |
| `src/components/landing/S5DarkClosing.jsx` | modificar — quitar «Sin suscripción» y emoji | 9 |
| `src/components/landing/S6Footer.jsx` | modificar — quitar enlaces rotos, añadir rutas reales | 9 |
| `app/page.js` | modificar — cifras, hero, composición, podar rejilla | 2, 8, 10 |

---

### Task 1: Módulo de cifras del home

**Files:**
- Create: `src/lib/landing/cifras.ts`
- Test: `src/__tests__/landing/cifras.test.ts`

**Interfaces:**
- Consumes: `db` de `@/src/lib/db/client`; `proceso` de
  `@/src/lib/db/schema/hechos`; `alOferentesHistorico` y `alSanciones` de
  `@/src/lib/db/schema/aqualicita`.
- Produces:
  - `export interface CifrasSector { procesosVigilados: number | null; oferentesHistoricos: number | null; sanciones: number | null }`
  - `export async function getCifrasSector(): Promise<CifrasSector>`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/__tests__/landing/cifras.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const contar = vi.fn();

vi.mock("@/src/lib/db/client", () => ({
  db: {
    select: () => ({ from: (t: unknown) => contar(t) }),
  },
}));

import { getCifrasSector } from "@/src/lib/landing/cifras";

describe("getCifrasSector", () => {
  beforeEach(() => contar.mockReset());

  it("devuelve los tres conteos cuando todas las consultas responden", async () => {
    contar
      .mockResolvedValueOnce([{ n: 90076 }])
      .mockResolvedValueOnce([{ n: 27035 }])
      .mockResolvedValueOnce([{ n: 2114 }]);

    expect(await getCifrasSector()).toEqual({
      procesosVigilados: 90076,
      oferentesHistoricos: 27035,
      sanciones: 2114,
    });
  });

  it("degrada a null solo la cifra que falla, no las demás", async () => {
    contar
      .mockResolvedValueOnce([{ n: 90076 }])
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce([{ n: 2114 }]);

    expect(await getCifrasSector()).toEqual({
      procesosVigilados: 90076,
      oferentesHistoricos: null,
      sanciones: 2114,
    });
  });

  it("nunca lanza: si todo falla devuelve los tres en null", async () => {
    contar.mockRejectedValue(new Error("caída"));
    expect(await getCifrasSector()).toEqual({
      procesosVigilados: null,
      oferentesHistoricos: null,
      sanciones: null,
    });
  });

  it("degrada a null si la fila viene sin número utilizable", async () => {
    contar
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ n: null }])
      .mockResolvedValueOnce([{ n: 2114 }]);

    const r = await getCifrasSector();
    expect(r.procesosVigilados).toBeNull();
    expect(r.oferentesHistoricos).toBeNull();
    expect(r.sanciones).toBe(2114);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/__tests__/landing/cifras.test.ts`
Expected: FAIL — no existe el módulo `src/lib/landing/cifras.ts`.

- [ ] **Step 3: Implementar el módulo**

Crear `src/lib/landing/cifras.ts`:

```ts
/**
 * Cifras del home. Tres conteos y ninguno más: cada uno tiene una sección que
 * lo consume, para que no haya cifras huérfanas que envejezcan sin dueño.
 *
 * Salen de Postgres por Drizzle, NO de Socrata. `landingStats.ts` consulta la
 * fuente en vivo por razones históricas; lo nuevo se alimenta de la base ya
 * ingerida, que es más rápida, no gasta cuota de la API pública y refleja
 * exactamente lo que el producto vigila.
 *
 * Degradación honesta, igual que `app/api/landing-stats/route.ts`: cada conteo
 * falla por separado y devuelve `null`, nunca lanza. La UI muestra "—" y la
 * frase sigue siendo cierta sin la cifra.
 */

import { sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { db } from "@/src/lib/db/client";
import { proceso } from "@/src/lib/db/schema/hechos";
import { alOferentesHistorico, alSanciones } from "@/src/lib/db/schema/aqualicita";

export interface CifrasSector {
  /** Procesos del sector ya ingeridos y vigilados. */
  procesosVigilados: number | null;
  /** Registros de quién se presentó a qué y por cuánto. */
  oferentesHistoricos: number | null;
  /** Sanciones cruzables contra un competidor. */
  sanciones: number | null;
}

/**
 * `count(*)` sobre una tabla. Devuelve `null` si la fila no trae un número
 * utilizable; los fallos de red o SQL los recoge el `allSettled` de abajo.
 */
async function contar(tabla: PgTable): Promise<number | null> {
  const filas = await db.select({ n: sql<number>`count(*)::int` }).from(tabla);
  const n = filas[0]?.n;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function resuelto(r: PromiseSettledResult<number | null>): number | null {
  return r.status === "fulfilled" ? r.value : null;
}

export async function getCifrasSector(): Promise<CifrasSector> {
  const [procesos, oferentes, sanciones] = await Promise.allSettled([
    contar(proceso),
    contar(alOferentesHistorico),
    contar(alSanciones),
  ]);

  return {
    procesosVigilados: resuelto(procesos),
    oferentesHistoricos: resuelto(oferentes),
    sanciones: resuelto(sanciones),
  };
}
```

Nota para el implementador: el test mockea `db.select().from(t)` para que
devuelva directamente el array de filas. Si al correr resulta que la firma real
de Drizzle obliga a otra forma (por ejemplo un `await` sobre el builder), ajusta
el mock del test para que refleje la realidad de la librería — **nunca al revés**:
la implementación debe usar Drizzle de forma idiomática.

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run src/__tests__/landing/cifras.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Verificar contra la base real**

Run: `npx tsx --env-file=.env.local -e "import('./src/lib/landing/cifras.ts').then(m=>m.getCifrasSector()).then(console.log)"`
Expected: tres números del orden de `90076 / 27035 / 2114`. Si algún valor sale
`null`, la consulta está mal — no se sigue adelante.

- [ ] **Step 6: Formato, lint y commit**

```bash
npx prettier --write src/lib/landing/cifras.ts src/__tests__/landing/cifras.test.ts
npm run lint
git add src/lib/landing/cifras.ts src/__tests__/landing/cifras.test.ts
git commit -m "feat(landing): cifras del sector leídas de la base, no de Socrata"
```

---

### Task 2: Servir las cifras por `/api/landing-stats`

**Files:**
- Modify: `app/api/landing-stats/route.ts`
- Modify: `app/page.js` (solo el `useEffect` que consume el endpoint)
- Test: `src/__tests__/landing/route-stats.test.ts`

**Interfaces:**
- Consumes: `getCifrasSector` y `CifrasSector` de `@/src/lib/landing/cifras` (Task 1).
- Produces: `LandingStatsResponse` gana el campo `sector: CifrasSector`. Los
  campos existentes `nuevos7d`, `enJuego` y `destacado` **no cambian de forma**.

- [ ] **Step 1: Escribir el test que falla**

Crear `src/__tests__/landing/route-stats.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/src/lib/secop/landingStats", () => ({
  getNuevos7d: vi.fn().mockResolvedValue(12),
  getEnJuegoMes: vi.fn().mockResolvedValue({ totalCop: 5_000_000, procesos: 3 }),
  getDestacado: vi.fn().mockResolvedValue(null),
}));

const getCifrasSector = vi.fn();
vi.mock("@/src/lib/landing/cifras", () => ({ getCifrasSector }));

import { GET } from "@/app/api/landing-stats/route";

describe("GET /api/landing-stats", () => {
  it("añade el bloque sector sin alterar el contrato existente", async () => {
    getCifrasSector.mockResolvedValue({
      procesosVigilados: 90076,
      oferentesHistoricos: 27035,
      sanciones: 2114,
    });

    const body = await (await GET()).json();

    expect(body.sector).toEqual({
      procesosVigilados: 90076,
      oferentesHistoricos: 27035,
      sanciones: 2114,
    });
    expect(body.nuevos7d).toBe(12);
    expect(body.enJuego).toEqual({ totalCop: 5_000_000, procesos: 3 });
    expect(body).toHaveProperty("destacado");
  });

  it("si las cifras del sector fallan, el resto de la respuesta sigue sirviendo", async () => {
    getCifrasSector.mockRejectedValue(new Error("base caída"));

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.nuevos7d).toBe(12);
    expect(body.sector).toEqual({
      procesosVigilados: null,
      oferentesHistoricos: null,
      sanciones: null,
    });
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/__tests__/landing/route-stats.test.ts`
Expected: FAIL — `body.sector` es `undefined`.

- [ ] **Step 3: Modificar el route handler**

En `app/api/landing-stats/route.ts`, añadir el import y meter
`getCifrasSector()` como cuarta promesa del `Promise.allSettled` ya existente:

```ts
import { getCifrasSector, type CifrasSector } from "@/src/lib/landing/cifras";

const SECTOR_VACIO: CifrasSector = {
  procesosVigilados: null,
  oferentesHistoricos: null,
  sanciones: null,
};

export interface LandingStatsResponse {
  nuevos7d: number | null;
  enJuego: { totalCop: number | null; procesos: number | null };
  destacado: Awaited<ReturnType<typeof getDestacado>>;
  /** Cifras del sector leídas de la base (no de Socrata). */
  sector: CifrasSector;
}

export async function GET() {
  const [nuevos7d, enJuego, destacado, sector] = await Promise.allSettled([
    getNuevos7d(),
    getEnJuegoMes(),
    getDestacado(),
    getCifrasSector(),
  ]);

  const body: LandingStatsResponse = {
    nuevos7d: nuevos7d.status === "fulfilled" ? nuevos7d.value : null,
    enJuego: enJuego.status === "fulfilled" ? enJuego.value : { totalCop: null, procesos: null },
    destacado: destacado.status === "fulfilled" ? destacado.value : null,
    sector: sector.status === "fulfilled" ? sector.value : SECTOR_VACIO,
  };

  return NextResponse.json(body, {
    headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
  });
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run src/__tests__/landing/route-stats.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Añadir el formateador compartido**

El formateador haría falta en `page.js`, `S3Motor` y `S4Competidores`. Escrito
tres veces son tres sitios donde puede divergir, así que va una sola vez donde
ya vive la convención «`null` → `—`»: `src/components/secop/format.ts`, junto a
`formatCopFull` y `formatCopCompact`.

Añadir al final de `src/components/secop/format.ts`:

```ts
/** Conteo con separador de miles. `null` → "—", nunca "NaN". */
export function formatConteo(value: number | null): string {
  return value == null ? "—" : value.toLocaleString("es-CO");
}
```

Y su test, en el archivo de tests de format que ya exista bajo
`src/__tests__/secop/` (si no hay ninguno, crear `format.test.ts` allí):

```ts
import { describe, it, expect } from "vitest";
import { formatConteo } from "@/src/components/secop/format";

describe("formatConteo", () => {
  it("separa miles en es-CO", () => {
    expect(formatConteo(90076)).toBe("90.076");
  });
  it("null es una raya, no un NaN", () => {
    expect(formatConteo(null)).toBe("—");
  });
  it("el cero es un cero, no una raya", () => {
    expect(formatConteo(0)).toBe("0");
  });
});
```

Run: `npx vitest run src/__tests__/secop/`
Expected: PASS.

- [ ] **Step 6: Consumir las cifras en `app/page.js`**

Dentro del componente de `app/page.js`, junto al resto de estado, añadir:

```jsx
const [sector, setSector] = useState({
  procesosVigilados: null,
  oferentesHistoricos: null,
  sanciones: null,
});

useEffect(() => {
  let vivo = true;
  fetch("/api/landing-stats")
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (vivo && d?.sector) setSector(d.sector);
    })
    .catch(() => {
      /* se queda en null: la UI muestra "—" y la frase sigue siendo cierta */
    });
  return () => {
    vivo = false;
  };
}, []);
```

Y el import del formateador, que es la única vía por la que una cifra llega al DOM:

```jsx
import { formatConteo } from "@/src/components/secop/format";
```

- [ ] **Step 7: Verificar el endpoint en vivo**

Run: `npm run dev` y en otra terminal
`curl -s localhost:3000/api/landing-stats | head -c 400`
Expected: el JSON incluye `"sector":{"procesosVigilados":90076,...}`.

- [ ] **Step 8: Formato, lint y commit**

```bash
npx prettier --write app/api/landing-stats/route.ts app/page.js src/components/secop/format.ts src/__tests__/
npm run lint
git add app/api/landing-stats/route.ts app/page.js src/components/secop/format.ts src/__tests__/
git commit -m "feat(landing): servir las cifras del sector en /api/landing-stats"
```

---

### Task 3: Declarar las secciones y blindarlas con tests

Esta tarea es la que impide que el home vuelva a mentir. Va **antes** de escribir
las secciones para que cada una nazca ya sujeta a la política.

**Files:**
- Create: `src/components/landing/seccionesHome.js`
- Test: `src/__tests__/landing/enlaces.test.ts`
- Test: `src/__tests__/landing/acceso.test.ts`

**Interfaces:**
- Consumes: `Capacidad` de `@/src/lib/acceso/politica`.
- Produces: `export const SECCIONES_HOME` — array de
  `{ id: string, href: string, capacidad: Capacidad, etiqueta: string }`.
  Lo consumen las tareas 4–9 para no repetir rutas ni etiquetas a mano.
  `export const ETIQUETA_POR_NIVEL` — mapa `Nivel → string` visible.

- [ ] **Step 1: Escribir los datos de secciones**

Crear `src/components/landing/seccionesHome.js`:

```js
/**
 * Las rutas que el home promete, con la capacidad que cada una exige.
 *
 * Existe porque el home llegó a prometer "Prueba sin cuenta · Resultado en 2
 * minutos" enlazando a /licitaciones, que no es ninguna de las dos cosas. La
 * promesa y la puerta vivían en sitios distintos y se separaron.
 *
 * Aquí van juntas, y dos tests las vigilan: `enlaces.test.ts` comprueba que
 * cada `href` existe como página real, y `acceso.test.ts` que cada `etiqueta`
 * dice lo mismo que `NIVEL_MINIMO` en politica.ts. Añadir una sección al home
 * sin pasar por aquí es saltarse las dos verificaciones.
 */

/** Lo que el usuario lee. Un nivel, una frase. */
export const ETIQUETA_POR_NIVEL = {
  anonimo: "sin cuenta",
  gratis: "cuenta gratuita",
  pro: "plan pro",
};

export const SECCIONES_HOME = [
  { id: "diagnostico", href: "/diagnostico", capacidad: "diagnostico", etiqueta: "sin cuenta" },
  { id: "explorar", href: "/licitaciones", capacidad: "explorar", etiqueta: "sin cuenta" },
  { id: "veredicto", href: "/licitaciones", capacidad: "veredicto_resumen", etiqueta: "sin cuenta" },
  { id: "filtros", href: "/mis-filtros", capacidad: "filtros", etiqueta: "cuenta gratuita" },
  { id: "coincidencias", href: "/mis-coincidencias", capacidad: "coincidencias", etiqueta: "cuenta gratuita" },
  { id: "alertas", href: "/cuenta", capacidad: "alertas", etiqueta: "cuenta gratuita" },
  { id: "competidores", href: "/competidores", capacidad: "competidores", etiqueta: "cuenta gratuita" },
  { id: "auditoria", href: "/auditoria", capacidad: "filtros", etiqueta: "cuenta gratuita" },
  { id: "pliego", href: "/pliego", capacidad: "pliego_extraer", etiqueta: "plan pro" },
  { id: "asistente-ejecucion", href: "/asistente/ejecucion", capacidad: "asistentes", etiqueta: "plan pro" },
  { id: "asistente-operacion", href: "/asistente/operacion", capacidad: "asistentes", etiqueta: "plan pro" },
  { id: "soluciones", href: "/soluciones", capacidad: "explorar", etiqueta: "sin cuenta" },
  { id: "nosotros", href: "/nosotros", capacidad: "explorar", etiqueta: "sin cuenta" },
];
```

- [ ] **Step 2: Escribir el test de enlaces**

Crear `src/__tests__/landing/enlaces.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SECCIONES_HOME } from "@/src/components/landing/seccionesHome";

const RAIZ = path.resolve(__dirname, "../../../app");

/** ¿`/mis-filtros` tiene una page en `app/mis-filtros/`? Soporta .js y .tsx. */
function existeRuta(href: string): boolean {
  const limpio = href.split("?")[0].split("#")[0].replace(/^\//, "");
  const dir = path.join(RAIZ, limpio);
  if (!fs.existsSync(dir)) return false;
  return ["page.tsx", "page.ts", "page.jsx", "page.js"].some((f) =>
    fs.existsSync(path.join(dir, f))
  );
}

describe("enlaces del home", () => {
  it.each(SECCIONES_HOME)("$id apunta a una página que existe ($href)", ({ href }) => {
    expect(existeRuta(href), `${href} no tiene page en app/`).toBe(true);
  });

  it("ninguna sección enlaza a /terms o /privacy, que no existen", () => {
    const rotos = SECCIONES_HOME.filter((s) => ["/terms", "/privacy"].includes(s.href));
    expect(rotos).toEqual([]);
  });

  it("no hay ids duplicados", () => {
    const ids = SECCIONES_HOME.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

- [ ] **Step 3: Escribir el test de acceso**

Crear `src/__tests__/landing/acceso.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { puede, type Nivel } from "@/src/lib/acceso/politica";
import { SECCIONES_HOME, ETIQUETA_POR_NIVEL } from "@/src/components/landing/seccionesHome";

const NIVELES: Nivel[] = ["anonimo", "gratis", "pro"];

/** El nivel más bajo que puede ejercer la capacidad: la verdad de politica.ts. */
function nivelMinimoReal(capacidad: string): Nivel {
  const encontrado = NIVELES.find((n) => puede(n, capacidad as never));
  if (!encontrado) throw new Error(`capacidad sin nivel: ${capacidad}`);
  return encontrado;
}

describe("las etiquetas del home dicen la verdad", () => {
  it.each(SECCIONES_HOME)(
    "$id: la etiqueta «$etiqueta» coincide con politica.ts",
    ({ capacidad, etiqueta }) => {
      expect(etiqueta).toBe(ETIQUETA_POR_NIVEL[nivelMinimoReal(capacidad)]);
    }
  );

  it("toda etiqueta usada existe en el mapa de niveles", () => {
    const validas = Object.values(ETIQUETA_POR_NIVEL);
    for (const s of SECCIONES_HOME) expect(validas).toContain(s.etiqueta);
  });
});
```

- [ ] **Step 4: Correr los dos tests**

Run: `npx vitest run src/__tests__/landing/`
Expected: PASS. Si `acceso.test.ts` falla, la etiqueta de `seccionesHome.js`
está mal — **se corrige la etiqueta, nunca `politica.ts`**, que es la fuente de
verdad.

- [ ] **Step 5: Formato, lint y commit**

```bash
npx prettier --write src/components/landing/seccionesHome.js src/__tests__/landing/
npm run lint
git add src/components/landing/seccionesHome.js src/__tests__/landing/enlaces.test.ts src/__tests__/landing/acceso.test.ts
git commit -m "test(landing): el home no puede prometer rutas rotas ni accesos falsos"
```

---

### Task 4: Sección «La puerta» — diagnóstico

Sustituye a `S4Invitation`, que promete «Prueba sin cuenta · Resultado en 2
minutos» y enlaza a `/licitaciones`.

**Files:**
- Create: `src/components/landing/S2Diagnostico.jsx`
- Delete: `src/components/landing/S4Invitation.jsx`
- Modify: `app/page.js`

**Interfaces:**
- Consumes: `SECCIONES_HOME` de `./seccionesHome` (Task 3).
- Produces: `export default function S2Diagnostico()` — sin props.

- [ ] **Step 1: Crear el componente**

Crear `src/components/landing/S2Diagnostico.jsx`:

```jsx
import Link from "next/link";
import { SECCIONES_HOME } from "./seccionesHome";

const RUTA = SECCIONES_HOME.find((s) => s.id === "diagnostico");

/** Lo que devuelve `calcularDiagnostico`, en el orden en que lo lee el usuario. */
const DEVUELVE = [
  { n: "01", t: "Tu nivel de preparación", d: "Cuatro bandas, de «apenas empiezas» a «listo para presentarte»." },
  { n: "02", t: "Tu escalón de contratación", d: "A qué modalidades puedes aspirar hoy con lo que ya tienes." },
  { n: "03", t: "Tu plan de acción", d: "Qué te falta exactamente, en orden, empezando por lo que te bloquea." },
];

export default function S2Diagnostico() {
  return (
    <section style={{ padding: "80px 48px", background: "rgba(3, 105, 161, 0.04)" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <span style={{ width: 8, height: 8, background: "#0369A1" }} />
          <span
            style={{
              font: "11px var(--font-jetbrains-mono),monospace",
              color: "#0369A1",
              letterSpacing: ".12em",
              textTransform: "uppercase",
            }}
          >
            Empieza aquí · {RUTA.etiqueta}
          </span>
        </div>

        <h2
          style={{
            font: "700 clamp(28px,3.4vw,40px)/1.2 var(--font-ibm-plex-sans-condensed)",
            color: "#0A1F1C",
            margin: "0 0 16px",
            maxWidth: 720,
          }}
        >
          Antes de perseguir un contrato, sabe si puedes ganarlo
        </h2>

        <p
          style={{
            font: "15px/1.6 var(--font-inter)",
            color: "#525B5A",
            maxWidth: 620,
            margin: "0 0 40px",
          }}
        >
          Diez preguntas sobre tu empresa. Sin cuenta, sin correo y sin IA: el
          resultado se calcula con reglas fijas, así que dos veces las mismas
          respuestas dan dos veces el mismo veredicto.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
            gap: 20,
            marginBottom: 40,
          }}
        >
          {DEVUELVE.map((x) => (
            <div key={x.n} style={{ borderTop: "2px solid #0369A1", paddingTop: 16 }}>
              <span style={{ font: "10px var(--font-jetbrains-mono),monospace", color: "#6B746F" }}>
                [ {x.n} ]
              </span>
              <div style={{ font: "600 16px/1.3 var(--font-inter)", color: "#0A1F1C", margin: "8px 0 6px" }}>
                {x.t}
              </div>
              <p style={{ font: "13px/1.5 var(--font-inter)", color: "#525B5A", margin: 0 }}>{x.d}</p>
            </div>
          ))}
        </div>

        <Link
          href={RUTA.href}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 24px",
            background: "#0369A1",
            color: "#fff",
            font: "600 14px var(--font-inter)",
            borderRadius: 4,
            textDecoration: "none",
          }}
        >
          Ver si estás listo →
        </Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Sustituir en `app/page.js`**

Cambiar el import de `S4Invitation` por `S2Diagnostico` y el `<S4Invitation />`
por `<S2Diagnostico />` en la misma posición.

- [ ] **Step 3: Borrar el componente muerto**

```bash
git rm src/components/landing/S4Invitation.jsx
```

- [ ] **Step 4: Verificar que nadie más lo usaba**

Run: `grep -rn "S4Invitation" app src`
Expected: sin resultados.

- [ ] **Step 5: Correr los tests**

Run: `npx vitest run src/__tests__/landing/`
Expected: PASS.

- [ ] **Step 6: Formato, lint y commit**

```bash
npx prettier --write src/components/landing/S2Diagnostico.jsx app/page.js
npm run lint
git add -A src/components/landing app/page.js
git commit -m "feat(landing): la sección que prometía 'sin cuenta' ahora lleva al diagnóstico"
```

---

### Task 5: Sección «El motor» — los cuatro pasos

Sustituye a `S2WhyAquaLicita` y `S3EverythingInOne`, que juntas venden cuatro
pilares de los que dos (pliegos, asistentes) tienen cero uso.

**Files:**
- Create: `src/components/landing/S3Motor.jsx`
- Delete: `src/components/landing/S2WhyAquaLicita.jsx`
- Delete: `src/components/landing/S3EverythingInOne.jsx`
- Modify: `app/page.js`

**Interfaces:**
- Consumes: `SECCIONES_HOME` de `./seccionesHome` (Task 3).
- Produces: `export default function S3Motor({ procesosVigilados })` —
  `procesosVigilados: number | null`, formateado por el propio componente.

- [ ] **Step 1: Crear el componente**

Crear `src/components/landing/S3Motor.jsx`:

```jsx
import Link from "next/link";
import { formatConteo } from "@/src/components/secop/format";
import { SECCIONES_HOME } from "./seccionesHome";

const ruta = (id) => SECCIONES_HOME.find((s) => s.id === id);

export default function S3Motor({ procesosVigilados }) {
  const PASOS = [
    {
      n: "01",
      titulo: "Se vigila el sector entero",
      cuerpo: `Todo lo que publica el SECOP II pasa por una red sectorial: ${formatConteo(
        procesosVigilados
      )} procesos de agua y saneamiento clasificados, no el SECOP completo.`,
      ...ruta("explorar"),
      cta: "EXPLORAR PROCESOS",
    },
    {
      n: "02",
      titulo: "Tus reglas lo filtran",
      cuerpo:
        "Cuantía, zona, entidad, modalidad y palabras excluidas. El motor es determinista: la misma regla da siempre el mismo resultado, y puedes auditar por qué.",
      ...ruta("filtros"),
      cta: "DEFINIR FILTROS",
    },
    {
      n: "03",
      titulo: "Ves por qué calificas o por qué no",
      cuerpo:
        "Cada requisito habilitante es una compuerta con su estado. El semáforo lo ves sin cuenta; la explicación de cada compuerta, con cuenta.",
      ...ruta("coincidencias"),
      cta: "VER COINCIDENCIAS",
    },
    {
      n: "04",
      titulo: "Te avisamos, no te toca vigilar",
      cuerpo:
        "Correo diario con lo nuevo que encaja, y un enlace permanente que sigue diciendo lo mismo tres semanas después.",
      ...ruta("alertas"),
      cta: "CONFIGURAR ALERTAS",
    },
  ];

  return (
    <section style={{ padding: "80px 48px" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <span style={{ width: 8, height: 8, background: "#0369A1" }} />
          <span
            style={{
              font: "11px var(--font-jetbrains-mono),monospace",
              color: "#0369A1",
              letterSpacing: ".12em",
              textTransform: "uppercase",
            }}
          >
            Cómo funciona
          </span>
        </div>

        <h2
          style={{
            font: "700 clamp(28px,3.4vw,40px)/1.2 var(--font-ibm-plex-sans-condensed)",
            color: "#0A1F1C",
            margin: "0 0 48px",
            maxWidth: 720,
          }}
        >
          Un motor que vigila por ti, y que te enseña cómo decide
        </h2>

        <div style={{ display: "grid", gap: 0 }}>
          {PASOS.map((p) => (
            <div
              key={p.n}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0,1fr)",
                gap: 8,
                padding: "28px 0",
                borderTop: "1px solid #DADAD2",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}>
                <span style={{ font: "10px var(--font-jetbrains-mono),monospace", color: "#6B746F" }}>
                  [ {p.n} ]
                </span>
                <div style={{ font: "600 20px/1.3 var(--font-inter)", color: "#0A1F1C" }}>
                  {p.titulo}
                </div>
                <span
                  style={{
                    font: "10px var(--font-jetbrains-mono),monospace",
                    color: "#6B746F",
                    border: "1px solid #DADAD2",
                    padding: "2px 8px",
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                  }}
                >
                  {p.etiqueta}
                </span>
              </div>
              <p
                style={{
                  font: "14px/1.6 var(--font-inter)",
                  color: "#525B5A",
                  margin: 0,
                  maxWidth: 680,
                }}
              >
                {p.cuerpo}
              </p>
              <Link
                href={p.href}
                style={{
                  font: "600 12px var(--font-jetbrains-mono),monospace",
                  color: "#0369A1",
                  textDecoration: "none",
                  marginTop: 4,
                }}
              >
                [ {p.cta} → ]
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Sustituir en `app/page.js`**

Reemplazar los dos imports y las dos etiquetas `<S2WhyAquaLicita />` y
`<S3EverythingInOne />` por un solo `<S3Motor procesosVigilados={sector.procesosVigilados} />`.

- [ ] **Step 3: Borrar los componentes sustituidos**

```bash
git rm src/components/landing/S2WhyAquaLicita.jsx src/components/landing/S3EverythingInOne.jsx
```

- [ ] **Step 4: Verificar que nadie más los usaba**

Run: `grep -rn "S2WhyAquaLicita\|S3EverythingInOne" app src`
Expected: sin resultados.

- [ ] **Step 5: Correr los tests**

Run: `npx vitest run src/__tests__/landing/`
Expected: PASS.

- [ ] **Step 6: Formato, lint y commit**

```bash
npx prettier --write src/components/landing/S3Motor.jsx app/page.js
npm run lint
git add -A src/components/landing app/page.js
git commit -m "feat(landing): contar el motor en cuatro pasos en vez de cuatro pilares sin uso"
```

---

### Task 6: Sección «Quién compite»

**Files:**
- Create: `src/components/landing/S4Competidores.jsx`
- Modify: `app/page.js`

**Interfaces:**
- Consumes: `SECCIONES_HOME` de `./seccionesHome` (Task 3).
- Produces: `export default function S4Competidores({ oferentesHistoricos, sanciones })` —
  ambos `number | null`.

- [ ] **Step 1: Crear el componente**

Crear `src/components/landing/S4Competidores.jsx`:

```jsx
import Link from "next/link";
import { formatConteo } from "@/src/components/secop/format";
import { SECCIONES_HOME } from "./seccionesHome";

const RUTA = SECCIONES_HOME.find((s) => s.id === "competidores");

export default function S4Competidores({ oferentesHistoricos, sanciones }) {
  const DATOS = [
    {
      valor: formatConteo(oferentesHistoricos),
      etiqueta: "registros de quién se presentó",
      pie: "A qué proceso, contra quién y por cuánto.",
    },
    {
      valor: formatConteo(sanciones),
      etiqueta: "sanciones cruzadas",
      pie: "Para saber con quién compites antes de competir.",
    },
  ];

  return (
    <section style={{ padding: "80px 48px", background: "#FAFAF7" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <span style={{ width: 8, height: 8, background: "#0369A1" }} />
          <span
            style={{
              font: "11px var(--font-jetbrains-mono),monospace",
              color: "#0369A1",
              letterSpacing: ".12em",
              textTransform: "uppercase",
            }}
          >
            Inteligencia de mercado · {RUTA.etiqueta}
          </span>
        </div>

        <h2
          style={{
            font: "700 clamp(28px,3.4vw,40px)/1.2 var(--font-ibm-plex-sans-condensed)",
            color: "#0A1F1C",
            margin: "0 0 16px",
            maxWidth: 760,
          }}
        >
          El pliego te dice qué piden. No te dice contra quién compites
        </h2>

        <p
          style={{
            font: "15px/1.6 var(--font-inter)",
            color: "#525B5A",
            maxWidth: 640,
            margin: "0 0 40px",
          }}
        >
          Quién se presenta en tu zona, cuánto gana, a qué precio adjudica y si
          arrastra sanciones. Es información pública, pero está desperdigada en
          miles de expedientes: aquí ya está reunida.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
            gap: 32,
            marginBottom: 40,
          }}
        >
          {DATOS.map((d) => (
            <div key={d.etiqueta} style={{ borderLeft: "2px solid #0369A1", paddingLeft: 16 }}>
              <div
                style={{
                  font: "700 clamp(30px,3.6vw,42px)/1 var(--font-ibm-plex-sans-condensed)",
                  color: "#0A1F1C",
                }}
              >
                {d.valor}
              </div>
              <div
                style={{
                  font: "11px var(--font-jetbrains-mono),monospace",
                  color: "#0369A1",
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                  margin: "8px 0 6px",
                }}
              >
                {d.etiqueta}
              </div>
              <p style={{ font: "13px/1.5 var(--font-inter)", color: "#525B5A", margin: 0 }}>
                {d.pie}
              </p>
            </div>
          ))}
        </div>

        <Link
          href={RUTA.href}
          style={{
            font: "600 12px var(--font-jetbrains-mono),monospace",
            color: "#0369A1",
            textDecoration: "none",
          }}
        >
          [ VER COMPETIDORES → ]
        </Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Montar en `app/page.js`**

Importar y colocar `<S4Competidores oferentesHistoricos={sector.oferentesHistoricos} sanciones={sector.sanciones} />`
inmediatamente después de `<S3Motor …/>`.

- [ ] **Step 3: Correr los tests**

Run: `npx vitest run src/__tests__/landing/`
Expected: PASS.

- [ ] **Step 4: Formato, lint y commit**

```bash
npx prettier --write src/components/landing/S4Competidores.jsx app/page.js
npm run lint
git add src/components/landing/S4Competidores.jsx app/page.js
git commit -m "feat(landing): sacar al escaparate el histórico de competidores y sanciones"
```

---

### Task 7: Sección «Qué se descarta»

Sin cifras: `al_descartes` va por cuenta, no es un total del sistema.

**Files:**
- Create: `src/components/landing/S5Descartes.jsx`
- Modify: `app/page.js`

**Interfaces:**
- Consumes: `SECCIONES_HOME` de `./seccionesHome` (Task 3).
- Produces: `export default function S5Descartes()` — sin props, a propósito:
  esta sección no publica ninguna cifra.

- [ ] **Step 1: Crear el componente**

Crear `src/components/landing/S5Descartes.jsx`. Los motivos son copia literal
del mapa `EXPLICA` de `app/auditoria/page.tsx` — si allí cambia la redacción,
aquí también:

```jsx
import Link from "next/link";
import { SECCIONES_HOME } from "./seccionesHome";

const RUTA = SECCIONES_HOME.find((s) => s.id === "auditoria");

/**
 * Los motivos son los de `EXPLICA` en app/auditoria/page.tsx, literales.
 *
 * Esta sección NO lleva cifras a propósito: `descartesPorMotivo()` va por
 * accountId, así que cualquier total que se pusiera aquí sería el de otra
 * persona. Es el mismo error que tuvo el ticker con sus montos ficticios.
 */
const MOTIVOS = [
  "Ni el código UNSPSC ni el texto del objeto coincidieron con ningún criterio",
  "Segmento UNSPSC 80 (gestión y personal), excluido en la ingesta",
  "Contenía una de tus palabras excluidas",
  "El presupuesto queda fuera del rango que fijaste",
  "La entidad no está en las zonas que seleccionaste",
  "La entidad no está en tu lista",
  "La modalidad de contratación no está en tu lista",
];

export default function S5Descartes() {
  return (
    <section style={{ padding: "80px 48px" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <span style={{ width: 8, height: 8, background: "#0369A1" }} />
          <span
            style={{
              font: "11px var(--font-jetbrains-mono),monospace",
              color: "#0369A1",
              letterSpacing: ".12em",
              textTransform: "uppercase",
            }}
          >
            Transparencia · {RUTA.etiqueta}
          </span>
        </div>

        <h2
          style={{
            font: "700 clamp(28px,3.4vw,40px)/1.2 var(--font-ibm-plex-sans-condensed)",
            color: "#0A1F1C",
            margin: "0 0 16px",
            maxWidth: 760,
          }}
        >
          Un filtro demasiado estrecho no da errores. Da silencio
        </h2>

        <p
          style={{
            font: "15px/1.6 var(--font-inter)",
            color: "#525B5A",
            maxWidth: 640,
            margin: "0 0 36px",
          }}
        >
          Y el silencio no se ve. Por eso guardamos cada proceso que tus reglas
          descartaron, con el motivo exacto, y puedes revisarlos cuando quieras.
          Si al leerlos aparece algo que sí te interesaba, el filtro está mal —
          y ya sabes cuál.
        </p>

        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: "0 0 36px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
            gap: 12,
            maxWidth: 900,
          }}
        >
          {MOTIVOS.map((m) => (
            <li
              key={m}
              style={{
                font: "13px/1.5 var(--font-inter)",
                color: "#525B5A",
                paddingLeft: 16,
                borderLeft: "1px solid #DADAD2",
              }}
            >
              {m}
            </li>
          ))}
        </ul>

        <Link
          href={RUTA.href}
          style={{
            font: "600 12px var(--font-jetbrains-mono),monospace",
            color: "#0369A1",
            textDecoration: "none",
          }}
        >
          [ VER QUÉ SE DESCARTA → ]
        </Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Montar en `app/page.js`**

Importar y colocar `<S5Descartes />` inmediatamente después de `<S4Competidores …/>`.

- [ ] **Step 3: Verificar que los motivos siguen coincidiendo con la app**

Run: `grep -c ":" <(sed -n '/const EXPLICA/,/^};/p' app/auditoria/page.tsx)`
Expected: el bloque `EXPLICA` sigue teniendo 7 motivos. Si son otros, actualiza
`MOTIVOS` antes de continuar.

- [ ] **Step 4: Correr los tests**

Run: `npx vitest run src/__tests__/landing/`
Expected: PASS.

- [ ] **Step 5: Formato, lint y commit**

```bash
npx prettier --write src/components/landing/S5Descartes.jsx app/page.js
npm run lint
git add src/components/landing/S5Descartes.jsx app/page.js
git commit -m "feat(landing): enseñar que el motor guarda y explica lo que descarta"
```

---

### Task 8: Podar la rejilla de intención y borrar el código muerto

**Files:**
- Modify: `app/page.js` (constante `INTENT_ROUTES` y su bloque de render)
- Delete: `src/components/landing/IntentJourney.jsx`

**Interfaces:**
- Consumes: `SECCIONES_HOME` de `./seccionesHome` (Task 3).
- Produces: nada nuevo. `INTENT_ROUTES` deja de llevar `href` a mano y lo toma
  de `SECCIONES_HOME`.

- [ ] **Step 1: Borrar el componente muerto**

```bash
git rm src/components/landing/IntentJourney.jsx
```

- [ ] **Step 2: Verificar que de verdad nadie lo usaba**

Run: `grep -rn "IntentJourney" app src`
Expected: sin resultados.

- [ ] **Step 3: Reescribir `INTENT_ROUTES` en `app/page.js`**

Sustituir la constante entera por esta, que toma ruta y etiqueta del catálogo
en vez de repetirlas:

```js
import { SECCIONES_HOME } from "@/src/components/landing/seccionesHome";

const ruta = (id) => SECCIONES_HOME.find((s) => s.id === id);

// Las rutas de intención que quedan. Sale "Vendo o fabrico soluciones": la
// tarjeta ocupaba un hueco de primer nivel para algo que no existe y que en
// todo este tiempo no capturó a nadie (lista_espera_mercado, 0 filas). El
// endpoint /api/mercado/waitlist y su tabla se quedan intactos por si se
// retoma; solo deja de robar atención en la rejilla.
const INTENT_ROUTES = [
  {
    n: "01",
    title: "Tengo un pliego que descifrar",
    desc: "Requisitos habilitantes, técnicos y legales, extraídos como checklist con su cita.",
    cta: "DECODIFICAR PLIEGO",
    ...ruta("pliego"),
  },
  {
    n: "02",
    title: "Gané un contrato, ¿ahora qué?",
    desc: "Actas, pólizas, informes y liquidación con sus plazos, avisados antes del vencimiento.",
    cta: "EMPEZAR",
    ...ruta("asistente-ejecucion"),
  },
  {
    n: "03",
    title: "Opero un acueducto o una ESP",
    desc: "RAS, Res. 0330, CRA y SUI. Cada respuesta trae el artículo exacto para sustentarla.",
    cta: "CONSULTAR",
    ...ruta("asistente-operacion"),
  },
  {
    n: "04",
    title: "Tengo un problema de agua o vertimientos",
    desc: "Del diagnóstico a la alternativa técnica, y de ahí a cómo contratarla.",
    cta: "VER EL CAMINO",
    ...ruta("soluciones"),
  },
];
```

- [ ] **Step 4: Borrar el bloque de la tarjeta «Próximamente»**

En el render de la rejilla, eliminar el `<div aria-live="polite">` completo que
contiene «Vendo o fabrico soluciones» y su botón de lista de espera. Eliminar
también el estado y el handler que solo servían a esa tarjeta:
`waitlistStatus`, `waitlistError` y `handleWaitlist`.

**No se toca** `app/api/mercado/waitlist/route.ts` ni la tabla.

- [ ] **Step 5: Añadir la etiqueta de acceso a cada tarjeta**

Dentro del `<Link>` de cada tarjeta, junto al `[ {c.n} ]`, añadir:

```jsx
<span
  style={{
    font: "10px var(--font-jetbrains-mono),monospace",
    color: "#6B746F",
    border: "1px solid #DADAD2",
    padding: "2px 8px",
    textTransform: "uppercase",
    letterSpacing: ".06em",
    alignSelf: "flex-start",
  }}
>
  {c.etiqueta}
</span>
```

- [ ] **Step 6: Verificar que no quedan referencias huérfanas**

Run: `grep -n "waitlist\|Vendo o fabrico" app/page.js`
Expected: sin resultados.

- [ ] **Step 7: Correr todos los tests y el build**

Run: `npm run test && npm run build`
Expected: PASS y build limpio. El build atrapa cualquier import o variable que
haya quedado colgando tras borrar el bloque.

- [ ] **Step 8: Formato, lint y commit**

```bash
npx prettier --write app/page.js
npm run lint
git add -A app/page.js src/components/landing
git commit -m "refactor(landing): podar la rejilla de intención y borrar IntentJourney muerto"
```

---

### Task 9: Hero, cierre y pie

**Files:**
- Modify: `app/page.js` (hero)
- Modify: `src/components/landing/S5DarkClosing.jsx`
- Modify: `src/components/landing/S6Footer.jsx`

**Interfaces:**
- Consumes: `SECCIONES_HOME` (Task 3), estado `sector` y `formatConteo` (Task 2).
- Produces: `S5DarkClosing` pasa a aceptar props: `export default function S5DarkClosing()`
  sigue sin props; solo cambia su contenido.

- [ ] **Step 1: Añadir la fila de cifras bajo el hero**

En `app/page.js`, dentro de la columna izquierda del hero y justo después del
párrafo de subtítulo, insertar:

```jsx
<div
  style={{
    display: "flex",
    gap: 28,
    flexWrap: "wrap",
    margin: "28px 0 8px",
    paddingTop: 20,
    borderTop: "1px solid #DADAD2",
  }}
>
  {[
    { v: formatConteo(sector.procesosVigilados), t: "procesos del sector vigilados" },
    { v: formatConteo(sector.oferentesHistoricos), t: "registros de quién se presentó" },
    { v: formatConteo(sector.sanciones), t: "sanciones cruzadas" },
  ].map((x) => (
    <div key={x.t}>
      <div
        style={{
          font: "700 22px/1 var(--font-ibm-plex-sans-condensed)",
          color: "#0A1F1C",
        }}
      >
        {x.v}
      </div>
      <div
        style={{
          font: "10px var(--font-jetbrains-mono),monospace",
          color: "#6B746F",
          textTransform: "uppercase",
          letterSpacing: ".06em",
          marginTop: 4,
        }}
      >
        {x.t}
      </div>
    </div>
  ))}
</div>
```

- [ ] **Step 2: Apuntar el CTA primario del hero al diagnóstico**

En el bloque de botones del hero, el CTA primario pasa a
`href={ruta("diagnostico").href}` con el texto `Ver si estás listo →` y, debajo,
en mono 10px color `#6B746F`, el texto `sin cuenta · 2 minutos`. El CTA
secundario queda en `ruta("explorar").href` con el texto `Explorar procesos`.

- [ ] **Step 3: Reescribir `S5DarkClosing.jsx`**

Tres cambios, y nada más — la estructura y los colores se quedan:

1. Borrar el `<div style={{ fontSize: "48px" …}}>💧</div>`.
2. El array de checks pasa de
   `["Sin suscripción", "Datos en vivo", "Respuestas citadas"]` a
   `["Datos SECOP II a diario", "Veredicto explicado, no caja negra", "Empieza sin cuenta"]`.
   **«Sin suscripción» es falso**: `politica.ts` ya declara `pliego_extraer` y
   `asistentes` como `pro`.
3. El `<a href="/licitaciones">Acceder →</a>` pasa a `/diagnostico` con el texto
   `Ver si estás listo →`.

Y el párrafo bajo el título pasa a:

```
Clasificación sectorial, filtros que puedes auditar, competidores con
histórico y aviso diario. Todo desde un solo lugar.
```

- [ ] **Step 4: Corregir `S6Footer.jsx`**

Se quitan `/terms` y `/privacy`, que no existen como rutas (verificado: no hay
`app/terms` ni `app/privacy`). Se recuperan cuando esas páginas se escriban —
queda anotado como pendiente en la Task 10.

Sustituir el archivo entero por:

```jsx
import Link from "next/link";
import { SECCIONES_HOME } from "./seccionesHome";

/**
 * El pie enlazaba a /terms y /privacy, que nunca existieron. Ahora las rutas
 * salen de SECCIONES_HOME, que `enlaces.test.ts` verifica contra `app/`: un
 * enlace roto en el pie deja de ser algo que se descubre haciendo clic.
 */
const ETIQUETAS = {
  diagnostico: "Diagnóstico",
  explorar: "Licitaciones",
  soluciones: "Soluciones",
  coincidencias: "Mis coincidencias",
  filtros: "Mis filtros",
  competidores: "Competidores",
  auditoria: "Qué se descarta",
  alertas: "Alertas",
  nosotros: "Nosotros",
};

const COLUMNAS = [
  { grupo: "Explorar", ids: ["diagnostico", "explorar", "soluciones", "nosotros"] },
  { grupo: "Tu cuenta", ids: ["coincidencias", "filtros", "competidores", "auditoria", "alertas"] },
];

const href = (id) => SECCIONES_HOME.find((s) => s.id === id).href;

const linkStyle = {
  font: "13px var(--font-inter)",
  color: "#6B746F",
  textDecoration: "none",
  display: "block",
  padding: "3px 0",
};

export default function S6Footer() {
  return (
    <footer style={{ padding: "48px 48px 32px", background: "#070E0C" }}>
      <div
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          display: "flex",
          gap: 64,
          flexWrap: "wrap",
          marginBottom: 40,
        }}
      >
        {COLUMNAS.map((col) => (
          <div key={col.grupo}>
            <div
              style={{
                font: "10px var(--font-jetbrains-mono),monospace",
                color: "#0369A1",
                textTransform: "uppercase",
                letterSpacing: ".12em",
                marginBottom: 12,
              }}
            >
              {col.grupo}
            </div>
            {col.ids.map((id) => (
              <Link key={id} href={href(id)} style={linkStyle}>
                {ETIQUETAS[id]}
              </Link>
            ))}
          </div>
        ))}
      </div>

      <div
        style={{
          textAlign: "center",
          color: "#6B746F",
          font: "12px var(--font-inter)",
          borderTop: "1px solid #1A2724",
          paddingTop: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 6,
            marginBottom: 12,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#16A34A" }} />
          <span>Datos SECOP II · actualización diaria</span>
        </div>
        <p style={{ margin: 0 }}>© 2026 AquaLicita. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
```

Nota: `nosotros` debe existir en `SECCIONES_HOME` — está en el catálogo de la
Task 3. El `href(id)` lanza si falta un id, que es lo que se quiere: falla al
construir, no en producción.

- [ ] **Step 5: Añadir los ids del pie al catálogo si falta alguno**

Run: `npx vitest run src/__tests__/landing/enlaces.test.ts`
Expected: PASS. Si falla, es que un id de `ETIQUETAS` no está en
`SECCIONES_HOME` — se añade allí, no se codifica el `href` a mano.

- [ ] **Step 6: Correr todo**

Run: `npm run test && npm run lint && npm run build`
Expected: PASS en los tres.

- [ ] **Step 7: Commit**

```bash
npx prettier --write app/page.js src/components/landing/S5DarkClosing.jsx src/components/landing/S6Footer.jsx
git add app/page.js src/components/landing/S5DarkClosing.jsx src/components/landing/S6Footer.jsx
git commit -m "fix(landing): el cierre prometía 'sin suscripción' y el pie enlazaba a dos rutas inexistentes"
```

---

### Task 10: Verificación en navegador y cierre

No se declara terminado nada sin verlo funcionando.

**Files:**
- Modify: `app/page.js` (solo si la verificación encuentra defectos)
- Modify: `PENDIENTES.md`

- [ ] **Step 1: Levantar el servidor**

Usar la herramienta de preview del entorno (no `npm run dev` por Bash) con
`.claude/launch.json`. Si no existe, crearlo:

```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "aqualicita", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev"], "port": 3000 }
  ]
}
```

- [ ] **Step 2: Verificar el home anónimo**

Cargar `/`. Comprobar una por una:
- Las tres cifras del hero muestran números, no `—` ni `NaN`.
- Las ocho secciones aparecen en el orden del spec §3.1.
- No queda rastro de «Vendo o fabrico», «Sin suscripción» ni del emoji 💧.
- La consola del navegador está limpia.

- [ ] **Step 3: Verificar que cada CTA llega a donde promete**

Recorrer los enlaces de las secciones 2 a 7 y confirmar que:
- Los marcados *sin cuenta* cargan sin pedir login.
- Los marcados *cuenta gratuita* redirigen a `/login?next=…`, que es la
  promesa que hace la etiqueta.

- [ ] **Step 4: Verificar la degradación**

Con el servidor corriendo, forzar el fallo del endpoint (renombrar
temporalmente `src/lib/landing/cifras.ts` a `.bak` y recargar). Comprobar que
el home renderiza, muestra `—` en las tres cifras del hero y en las dos de
competidores, y que ninguna frase queda rota ni aparece un `NaN`.
Restaurar el archivo después.

> **Por qué esto es manual y no un test.** El spec (§4) pide un test de
> degradación. La capa de datos sí lo tiene automatizado —`cifras.test.ts`
> cubre los cuatro modos de fallo y `route-stats.test.ts` cubre que el
> endpoint siga sirviendo—, pero el render no: `vitest.config.ts` corre en
> `environment: "node"`, y montar el home exigiría añadir jsdom y
> `@testing-library/react`, dos dependencias nuevas para una sola aserción.
> La decisión es cubrir el render a mano aquí y dejar el contrato «`null` → `—`»
> blindado en `formatConteo`, que sí tiene test unitario y es la única vía por
> la que una cifra entra al DOM. Si más adelante entra jsdom al proyecto por
> otra razón, este paso se convierte en test.

- [ ] **Step 5: Verificar móvil**

Emular 375×812 y confirmar que ninguna sección desborda horizontalmente y que
las rejillas colapsan a una columna.

- [ ] **Step 6: Capturar la prueba**

Capturas de escritorio y móvil del home completo. Se adjuntan al reportar.

- [ ] **Step 7: Actualizar `PENDIENTES.md`**

Añadir bajo «Bajo / Documentación»:

```markdown
### 13. Páginas legales `/terms` y `/privacy` (2026-09-08)
El pie del home las enlazaba sin que existieran como rutas. Se quitaron los
enlaces al alinear el home (`docs/superpowers/plans/2026-09-08-home-alineado-producto.md`).
Falta escribir las páginas y volver a enlazarlas desde `S6Footer.jsx`.

### 14. Pliegos y asistentes: cero uso, acceso sin resolver (2026-09-08)
`pliego_proceso`, `conversacion`, `mensaje` y `documento` están a 0 filas. El
home ya no los vende como pilares, pero siguen en la rejilla de intención
marcados «plan pro» — y esa frontera aún no la aplica ningún handler (ver
CLAUDE.md §4). Decidir el acceso a `GEMINI_API_KEY` por usuario antes de
enviar tráfico ahí.
```

- [ ] **Step 8: Commit final**

```bash
git add PENDIENTES.md .claude/launch.json
git commit -m "docs(pendientes): registrar las dos deudas que dejó la alineación del home"
```

---

## Decisión pendiente del spec

**Q1 del spec (§6):** ¿pliegos y asistentes se marcan solo *pro*, o también
*en preparación*?

Este plan los marca **solo «plan pro»**, que es lo que `politica.ts` declara y
lo que el test de acceso verifica. Añadir «en preparación» exigiría una segunda
dimensión de estado que hoy no existe en ninguna parte del código, y
inventársela para el home la dejaría sin fuente de verdad — exactamente el
defecto que este trabajo viene a corregir. Queda registrado como pendiente 14
en la Task 10: la decisión real es cuándo se abre esa frontera, no cómo se
rotula mientras tanto.
