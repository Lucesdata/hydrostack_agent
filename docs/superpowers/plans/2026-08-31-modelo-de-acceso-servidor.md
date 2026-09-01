# Modelo de acceso por niveles (capa de servidor) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el veredicto de elegibilidad muestre su resultado a cualquiera pero reserve la explicación (`reason`) para quien tenga cuenta, decidido en un único módulo de política en vez de en tres lugares que se contradicen.

**Architecture:** Un módulo puro `src/lib/acceso/politica.ts` con una tabla declarativa capacidad → nivel mínimo, y un módulo puro `src/lib/secop/verdict-publico.ts` que construye la versión redactada del veredicto. `POST /api/secop/verdict` los combina. La política decide *si* se redacta; el dominio sabe *cómo*.

**Tech Stack:** Next.js 14.2.3 (App Router), TypeScript, Drizzle ORM sobre Postgres (Supabase), Vitest (`environment: "node"`).

**Spec:** `docs/superpowers/specs/2026-08-31-modelo-de-acceso-servidor-design.md`

## Global Constraints

- **Idioma:** todo comentario, docstring, mensaje de commit y nombre de prueba va en español. Es la convención del repo entero.
- **`text` y no `pgEnum`** para columnas con valores cerrados: agregar un valor no debe pedir migración. Precedentes: `contrato_evento.tipo_evento`, `envio_log.tipo`.
- **Toda tabla nueva nace con `.enableRLS()`** (CLAUDE.md §4). Este plan no crea tablas, pero no debe quitar el `.enableRLS()` existente de `usuario`.
- **La redacción se construye campo por campo**, nunca con spread-y-borrar. Un `delete g.reason` o un `{...g, reason: undefined}` deja el campo en el JSON y es exactamente el fallo que este trabajo debe impedir.
- **No aplicar migraciones contra la base viva.** `npm run db:generate` sí; `npm run db:migrate` lo decide la persona dueña del repo, no el ejecutor de este plan.
- **Verificación al cierre de cada tarea:** `npm test` y `npx next lint` deben pasar antes de commitear.

---

## Desviaciones del spec

El spec viaja con este plan y los ejecutores leen los dos, así que las tres
diferencias van dichas y no escondidas:

1. **El spec §9 lista `src/__tests__/api/verdict-redaccion.test.ts` como archivo
   nuevo.** El plan no lo crea: extiende `src/__tests__/api/secop-verdict-route.test.ts`,
   que ya existe y ya tiene los fixtures de proceso, perfil y los mocks de la
   ruta. Dos archivos de prueba para el mismo handler se desincronizan.
2. **El spec §8 pedía cubrir el caso `overall === "FAIL"` en la prueba de ruta.**
   Se cubre en Task 2, sobre un fixture controlado. Razonado en la nota de
   diseño de Task 4.
3. **El spec §9 no lista `src/components/secop/format.ts` como modificado.** Hay
   que tocarlo: `verdictScore` solo acepta `Verdict` y debe aceptar también el
   redactado. Es una omisión del spec, no un cambio de alcance.

---

### Task 1: Módulo de política de acceso

**Files:**
- Create: `src/lib/acceso/politica.ts`
- Test: `src/__tests__/acceso/politica.test.ts`

**Interfaces:**
- Consumes: `SessionUser` de `@/src/lib/supabase/get-session-user` (forma: `{ id: string; email: string }`).
- Produces: `type Nivel = "anonimo" | "gratis" | "pro"`, `type Capacidad` (10 valores literales), `nivelDe(user: SessionUser | null, plan?: string | null): Nivel`, `puede(nivel: Nivel, capacidad: Capacidad): boolean`.

- [ ] **Step 1: Escribir la prueba que falla**

Crear `src/__tests__/acceso/politica.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { nivelDe, puede, type Capacidad, type Nivel } from "@/src/lib/acceso/politica";

const USUARIO = { id: "u1", email: "u1@example.com" };

describe("nivelDe", () => {
  it("sin usuario es anonimo", () => {
    expect(nivelDe(null)).toBe("anonimo");
  });

  it("con usuario y sin plan explícito es gratis", () => {
    expect(nivelDe(USUARIO)).toBe("gratis");
  });

  it("con usuario y plan 'gratis' es gratis", () => {
    expect(nivelDe(USUARIO, "gratis")).toBe("gratis");
  });

  it("con usuario y plan 'pro' es pro", () => {
    expect(nivelDe(USUARIO, "pro")).toBe("pro");
  });

  it("un plan desconocido degrada a gratis, no a pro", () => {
    expect(nivelDe(USUARIO, "enterprise")).toBe("gratis");
    expect(nivelDe(USUARIO, null)).toBe("gratis");
  });

  it("un plan sin usuario sigue siendo anonimo: la sesión manda", () => {
    expect(nivelDe(null, "pro")).toBe("anonimo");
  });
});

describe("puede", () => {
  const abiertas: Capacidad[] = [
    "explorar",
    "detalle_proceso",
    "veredicto_resumen",
    "diagnostico",
  ];
  const conCuenta: Capacidad[] = [
    "veredicto_detalle",
    "perfil_guardar",
    "coincidencias",
    "alertas",
  ];
  const dePago: Capacidad[] = ["pliego_extraer", "asistentes"];

  it("el anónimo puede exactamente lo abierto", () => {
    for (const cap of abiertas) expect(puede("anonimo", cap)).toBe(true);
    for (const cap of [...conCuenta, ...dePago]) expect(puede("anonimo", cap)).toBe(false);
  });

  it("gratis puede lo abierto y lo de cuenta, pero no lo de pago", () => {
    for (const cap of [...abiertas, ...conCuenta]) expect(puede("gratis", cap)).toBe(true);
    for (const cap of dePago) expect(puede("gratis", cap)).toBe(false);
  });

  it("pro puede todo", () => {
    for (const cap of [...abiertas, ...conCuenta, ...dePago]) {
      expect(puede("pro", cap)).toBe(true);
    }
  });

  it("es monótona: lo que puede un nivel lo puede el siguiente", () => {
    const orden: Nivel[] = ["anonimo", "gratis", "pro"];
    const todas: Capacidad[] = [...abiertas, ...conCuenta, ...dePago];
    for (let i = 0; i < orden.length - 1; i++) {
      for (const cap of todas) {
        if (puede(orden[i], cap)) expect(puede(orden[i + 1], cap)).toBe(true);
      }
    }
  });
});
```

- [ ] **Step 2: Correr la prueba y confirmar que falla**

Run: `npx vitest run src/__tests__/acceso/politica.test.ts`
Expected: FAIL — no resuelve el módulo `@/src/lib/acceso/politica`.

- [ ] **Step 3: Implementar el módulo**

Crear `src/lib/acceso/politica.ts`:

```ts
/**
 * Política de acceso por niveles — única fuente de verdad de "quién puede qué".
 *
 * Antes de este módulo la respuesta estaba repartida entre `PROTECTED_PREFIXES`
 * de middleware.ts, una veintena de llamadas sueltas a `getSessionUser()` y
 * gates dentro de componentes. Las tres se separaron de la realidad: el
 * docstring de middleware.ts llegó a documentar un gate que no existía. La
 * tabla de abajo existe para que esa pregunta se responda leyendo una pantalla.
 *
 * Deliberadamente no importa nada del dominio de SECOP ni de la base: es una
 * función de (nivel, capacidad) → booleano y nada más. Quien redacta un
 * veredicto o protege una ruta consulta aquí y aplica el resultado en su
 * propia capa.
 */

import type { SessionUser } from "@/src/lib/supabase/get-session-user";

/** Ordinales: cada nivel puede todo lo del anterior. */
export type Nivel = "anonimo" | "gratis" | "pro";

const ORDEN: Record<Nivel, number> = {
  anonimo: 0,
  gratis: 1,
  pro: 2,
};

export type Capacidad =
  | "explorar"
  | "detalle_proceso"
  | "veredicto_resumen"
  | "veredicto_detalle"
  | "diagnostico"
  | "perfil_guardar"
  | "coincidencias"
  | "alertas"
  | "pliego_extraer"
  | "asistentes";

/**
 * La tabla. `veredicto_resumen` es el semáforo agregado y el estado de cada
 * compuerta; `veredicto_detalle` es el `reason` que explica cada estado — esa
 * es la frontera de captura de leads del producto.
 *
 * `pliego_extraer` y `asistentes` están en `pro` pero la frontera todavía no se
 * aplica: hoy esas rutas exigen cuenta vía `PROTECTED_PREFIXES` y con eso
 * siguen. Activarlas es cambiar sus handlers para consultar `puede()`.
 */
const NIVEL_MINIMO: Record<Capacidad, Nivel> = {
  explorar: "anonimo",
  detalle_proceso: "anonimo",
  veredicto_resumen: "anonimo",
  veredicto_detalle: "gratis",
  diagnostico: "anonimo",
  perfil_guardar: "gratis",
  coincidencias: "gratis",
  alertas: "gratis",
  pliego_extraer: "pro",
  asistentes: "pro",
};

/**
 * El nivel de quien hace la petición. La sesión manda: sin usuario es
 * `anonimo` aunque llegue un plan por parámetro. Un plan desconocido degrada a
 * `gratis` — nunca se otorga `pro` por un valor que no reconocemos.
 */
export function nivelDe(user: SessionUser | null, plan?: string | null): Nivel {
  if (!user) return "anonimo";
  return plan === "pro" ? "pro" : "gratis";
}

export function puede(nivel: Nivel, capacidad: Capacidad): boolean {
  return ORDEN[nivel] >= ORDEN[NIVEL_MINIMO[capacidad]];
}
```

- [ ] **Step 4: Correr la prueba y confirmar que pasa**

Run: `npx vitest run src/__tests__/acceso/politica.test.ts`
Expected: PASS, 10 pruebas.

- [ ] **Step 5: Verificar y commitear**

```bash
npm test && npx next lint
git add src/lib/acceso/politica.ts src/__tests__/acceso/politica.test.ts
git commit -m "feat(acceso): tabla de política de niveles como única fuente de verdad"
```

---

### Task 2: Redacción del veredicto

**Files:**
- Create: `src/lib/secop/verdict-publico.ts`
- Test: `src/__tests__/secop/verdict-publico.test.ts`

**Interfaces:**
- Consumes: `GateResult`, `GateStatus`, `Verdict` de `@/src/lib/secop/verdict`. Formas exactas ya en el repo:
  - `GateResult = { status: GateStatus; reason: string; resolvedBy: "metadata" | "document"; requiredLevel: 0 | 2 }`
  - `Verdict = { procesoId: string; overall: GateStatus; gates: { sectorial; cuantia; plazo; ubicacion; habilitacion }: GateResult; level: 0 | 2; evaluatedAt: string }`
- Produces: `GateResultPublico`, `VerdictPublico`, `VerdictRespuesta`, `redactarVerdict(v: Verdict): VerdictPublico`, `razonDe(g: GateResult | GateResultPublico): string | null`.

- [ ] **Step 1: Escribir la prueba que falla**

Crear `src/__tests__/secop/verdict-publico.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { redactarVerdict, razonDe } from "@/src/lib/secop/verdict-publico";
import type { GateResult, GateStatus, Verdict } from "@/src/lib/secop/verdict";

/**
 * Centinelas: cadenas improbables y distinguibles entre sí. La prueba de fuga
 * busca estas cadenas en el JSON serializado, no el campo `reason` — el modo
 * de fallo real es que la explicación sobreviva en cualquier parte del objeto.
 */
const CENTINELA = {
  sectorial: "CENTINELA-SECTORIAL-9f2a",
  cuantia: "CENTINELA-CUANTIA-9f2b",
  plazo: "CENTINELA-PLAZO-9f2c",
  ubicacion: "CENTINELA-UBICACION-9f2d",
  habilitacion: "CENTINELA-HABILITACION-9f2e",
} as const;

function gate(status: GateStatus, reason: string): GateResult {
  return { status, reason, resolvedBy: "metadata", requiredLevel: 0 };
}

/** Veredicto con un estado por compuerta y su centinela como `reason`. */
function verdict(estados: Record<keyof Verdict["gates"], GateStatus>, overall: GateStatus): Verdict {
  return {
    procesoId: "CO1.REQ.42",
    overall,
    gates: {
      sectorial: gate(estados.sectorial, CENTINELA.sectorial),
      cuantia: gate(estados.cuantia, CENTINELA.cuantia),
      plazo: gate(estados.plazo, CENTINELA.plazo),
      ubicacion: gate(estados.ubicacion, CENTINELA.ubicacion),
      habilitacion: gate(estados.habilitacion, CENTINELA.habilitacion),
    },
    level: 0,
    evaluatedAt: "2026-08-31T00:00:00.000Z",
  };
}

const TODAS_PASS = verdict(
  {
    sectorial: "PASS",
    cuantia: "PASS",
    plazo: "WARN",
    ubicacion: "PASS",
    habilitacion: "PASS",
  },
  "WARN"
);

describe("redactarVerdict — caso base sin excepciones", () => {
  it("ningún centinela sobrevive al JSON serializado", () => {
    const json = JSON.stringify(redactarVerdict(TODAS_PASS));
    for (const c of Object.values(CENTINELA)) {
      expect(json).not.toContain(c);
    }
  });

  it("conserva lo que no es explicación: semáforo, estados y metadatos", () => {
    const r = redactarVerdict(TODAS_PASS);
    expect(r.redactado).toBe(true);
    expect(r.procesoId).toBe("CO1.REQ.42");
    expect(r.overall).toBe("WARN");
    expect(r.level).toBe(0);
    expect(r.evaluatedAt).toBe("2026-08-31T00:00:00.000Z");
    expect(r.gates.cuantia.status).toBe("PASS");
    expect(r.gates.plazo.status).toBe("WARN");
    expect(r.gates.cuantia.requiredLevel).toBe(0);
    expect(r.gates.cuantia.resolvedBy).toBe("metadata");
  });

  it("marca cada compuerta como redactada", () => {
    const r = redactarVerdict(TODAS_PASS);
    for (const g of Object.values(r.gates)) expect(g.redactado).toBe(true);
  });
});

describe("redactarVerdict — excepción overall FAIL", () => {
  const conFail = verdict(
    {
      sectorial: "PASS",
      cuantia: "FAIL",
      plazo: "PASS",
      ubicacion: "FAIL",
      habilitacion: "PASS",
    },
    "FAIL"
  );

  it("las compuertas que fallaron conservan su explicación", () => {
    const json = JSON.stringify(redactarVerdict(conFail));
    expect(json).toContain(CENTINELA.cuantia);
    expect(json).toContain(CENTINELA.ubicacion);
  });

  it("las compuertas que no fallaron siguen redactadas", () => {
    const json = JSON.stringify(redactarVerdict(conFail));
    expect(json).not.toContain(CENTINELA.sectorial);
    expect(json).not.toContain(CENTINELA.plazo);
    expect(json).not.toContain(CENTINELA.habilitacion);
  });

  it("una compuerta FAIL sin overall FAIL no abre la excepción", () => {
    const soloUna = verdict(
      {
        sectorial: "PASS",
        cuantia: "FAIL",
        plazo: "PASS",
        ubicacion: "PASS",
        habilitacion: "PASS",
      },
      "WARN" // overall inconsistente a propósito: la excepción mira `overall`
    );
    expect(JSON.stringify(redactarVerdict(soloUna))).not.toContain(CENTINELA.cuantia);
  });
});

describe("redactarVerdict — excepción UNKNOWN", () => {
  const conUnknown = verdict(
    {
      sectorial: "PASS",
      cuantia: "PASS",
      plazo: "PASS",
      ubicacion: "PASS",
      habilitacion: "UNKNOWN",
    },
    "PASS"
  );

  it("una compuerta UNKNOWN conserva su explicación: no hay secreto que guardar", () => {
    expect(JSON.stringify(redactarVerdict(conUnknown))).toContain(CENTINELA.habilitacion);
  });

  it("sus vecinas siguen redactadas", () => {
    const json = JSON.stringify(redactarVerdict(conUnknown));
    expect(json).not.toContain(CENTINELA.sectorial);
    expect(json).not.toContain(CENTINELA.cuantia);
  });
});

describe("razonDe", () => {
  it("devuelve null para una compuerta redactada", () => {
    const r = redactarVerdict(TODAS_PASS);
    expect(razonDe(r.gates.sectorial)).toBeNull();
  });

  it("devuelve la explicación de una compuerta no redactada", () => {
    const r = redactarVerdict(
      verdict(
        {
          sectorial: "PASS",
          cuantia: "PASS",
          plazo: "PASS",
          ubicacion: "PASS",
          habilitacion: "UNKNOWN",
        },
        "PASS"
      )
    );
    expect(razonDe(r.gates.habilitacion)).toBe(CENTINELA.habilitacion);
  });

  it("devuelve la explicación de un GateResult completo, sin redactar", () => {
    expect(razonDe(gate("PASS", "explicación cruda"))).toBe("explicación cruda");
  });
});
```

- [ ] **Step 2: Correr la prueba y confirmar que falla**

Run: `npx vitest run src/__tests__/secop/verdict-publico.test.ts`
Expected: FAIL — no resuelve `@/src/lib/secop/verdict-publico`.

- [ ] **Step 3: Implementar el módulo**

Crear `src/lib/secop/verdict-publico.ts`:

```ts
/**
 * Versión pública del veredicto: el resultado sin la explicación.
 *
 * Vive junto a `verdict.ts` y no en `src/lib/acceso/` a propósito — la política
 * decide *si* se redacta, este módulo sabe *cómo*. Así `politica.ts` no importa
 * tipos de SECOP y se sigue leyendo de un vistazo.
 *
 * La frontera del producto: el anónimo ve el semáforo agregado y el estado de
 * cada compuerta; el `reason` que explica ese estado pide cuenta. Con dos
 * excepciones, ambas por la misma razón —cobrar un correo por algo que no
 * ayuda quema la confianza que la frontera intenta construir:
 *
 *  1. `overall === "FAIL"`: quien no puede participar merece saber por qué sin
 *     pagar nada. No perdemos un lead; perdemos uno que no lo era para ese
 *     proceso.
 *  2. Compuertas `UNKNOWN`: en Nivel 0 `habilitacion` casi siempre lo es, y su
 *     `reason` solo dice que hace falta revisar el pliego. Redactarlo no oculta
 *     nada y hace ver el muro más grande de lo que es.
 *
 * En una frase: si no puedes participar, te decimos por qué sin pedirte nada;
 * si puedes, la explicación pide cuenta.
 */

import type { GateResult, Verdict } from "./verdict";

type ClaveGate = keyof Verdict["gates"];

/**
 * Unión discriminada y no `reason?: string`. Un campo opcional debilitaría el
 * tipo también para el veredicto completo y nadie se enteraría de que hay un
 * caso redactado que manejar; con la unión, el compilador señala cada punto de
 * consumo.
 */
export type GateResultPublico =
  | ({ redactado: false } & GateResult)
  | ({ redactado: true } & Omit<GateResult, "reason">);

export interface VerdictPublico extends Omit<Verdict, "gates"> {
  /** Pasó por la redacción; qué compuertas se redactaron lo dice cada una. */
  redactado: true;
  gates: Record<ClaveGate, GateResultPublico>;
}

export type VerdictRespuesta = ({ redactado: false } & Verdict) | VerdictPublico;

/** Una compuerta conserva su explicación si el veredicto entero falló y ella
 *  es una de las que falló, o si no se pudo resolver. */
function conservaExplicacion(g: GateResult, overall: Verdict["overall"]): boolean {
  if (g.status === "UNKNOWN") return true;
  return overall === "FAIL" && g.status === "FAIL";
}

/**
 * Construye un objeto nuevo campo por campo. Nunca `{ ...g }` seguido de borrar
 * `reason`, ni `reason: undefined`: las dos formas dejan rastro en el JSON, que
 * es precisamente la fuga que este módulo existe para impedir.
 */
export function redactarVerdict(v: Verdict): VerdictPublico {
  const claves = Object.keys(v.gates) as ClaveGate[];
  const gates = {} as Record<ClaveGate, GateResultPublico>;

  for (const clave of claves) {
    const g = v.gates[clave];
    gates[clave] = conservaExplicacion(g, v.overall)
      ? {
          redactado: false,
          status: g.status,
          reason: g.reason,
          resolvedBy: g.resolvedBy,
          requiredLevel: g.requiredLevel,
        }
      : {
          redactado: true,
          status: g.status,
          resolvedBy: g.resolvedBy,
          requiredLevel: g.requiredLevel,
        };
  }

  return {
    redactado: true,
    procesoId: v.procesoId,
    overall: v.overall,
    level: v.level,
    evaluatedAt: v.evaluatedAt,
    gates,
  };
}

/**
 * La explicación de una compuerta, o `null` si fue redactada. Existe para que
 * los consumidores de UI no tengan que conocer la forma de la unión.
 */
export function razonDe(g: GateResult | GateResultPublico): string | null {
  if ("redactado" in g && g.redactado) return null;
  return g.reason;
}
```

- [ ] **Step 4: Correr la prueba y confirmar que pasa**

Run: `npx vitest run src/__tests__/secop/verdict-publico.test.ts`
Expected: PASS, 11 pruebas.

- [ ] **Step 5: Verificar y commitear**

```bash
npm test && npx next lint
git add src/lib/secop/verdict-publico.ts src/__tests__/secop/verdict-publico.test.ts
git commit -m "feat(secop): redacción del veredicto con excepciones para FAIL y UNKNOWN"
```

---

### Task 3: Columna `plan` en `usuario`

**Files:**
- Modify: `src/lib/db/schema/cuentas.ts:30-36` (definición de `usuario`)
- Create: `drizzle/0017_*.sql` (la genera `drizzle-kit`, no se escribe a mano)

**Interfaces:**
- Consumes: nada.
- Produces: `usuario.plan`, columna `text NOT NULL DEFAULT 'gratis'`. **Todavía no tiene ningún lector en runtime** — `nivelDe` la acepta como parámetro, pero la ruta del veredicto no la consulta porque `veredicto_detalle` solo exige `gratis`. Es la pieza que deja el nivel `pro` listo para activarse.

- [ ] **Step 1: Agregar la columna al esquema**

En `src/lib/db/schema/cuentas.ts`, reemplazar la definición de `usuario`:

```ts
export const usuario = pgTable("usuario", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  /**
   * Nivel de acceso de la cuenta: 'gratis' | 'pro' — ver
   * `src/lib/acceso/politica.ts`. `text` y no enum por la misma razón que
   * `envio_log.tipo`: agregar un valor no debe pedir migración.
   *
   * Hoy toda cuenta es 'gratis' y ningún handler la lee: la frontera de `pro`
   * (pliego_extraer, asistentes) está declarada en la política pero no
   * aplicada, y esas rutas ya exigen cuenta por `PROTECTED_PREFIXES`.
   */
  plan: text("plan").notNull().default("gratis"),
}).enableRLS();
```

- [ ] **Step 2: Generar la migración**

Run: `npm run db:generate`
Expected: se crea `drizzle/0017_<nombre>.sql` con un único `ALTER TABLE "usuario" ADD COLUMN "plan" text DEFAULT 'gratis' NOT NULL;`

- [ ] **Step 3: Revisar la migración generada**

Run: `cat drizzle/0017_*.sql`
Expected: exactamente ese `ALTER TABLE`. Si el archivo contiene cualquier otra sentencia —un `DROP`, un cambio sobre otra tabla, un `ALTER ... DISABLE ROW LEVEL SECURITY`— **detenerse y reportarlo**: significa que el snapshot de Drizzle estaba desincronizado con la base, y aplicar eso a ciegas sobre Supabase haría daño.

- [ ] **Step 4: Confirmar que el build y las pruebas siguen sanos**

Run: `npm test && npx next lint`
Expected: PASS. No hay pruebas nuevas en esta tarea — la columna no tiene lector todavía, y una prueba que solo afirme que una columna existe repite lo que ya dice el esquema.

- [ ] **Step 5: Commitear**

```bash
git add src/lib/db/schema/cuentas.ts drizzle/
git commit -m "feat(cuentas): columna plan en usuario, default gratis"
```

**No correr `npm run db:migrate`.** Aplicar la migración escribe sobre la base de producción de Supabase; esa decisión es de la persona dueña del repo. El commit deja la migración lista, nada más.

---

### Task 4: Cablear la política en el route handler

**Files:**
- Modify: `app/api/secop/verdict/route.ts:76-83` (el bloque final, desde `const user = await getSessionUser()`)
- Test: `src/__tests__/api/secop-verdict-route.test.ts` (existente — se agregan casos, no se reescribe)

**Interfaces:**
- Consumes: `nivelDe`, `puede` (Task 1); `redactarVerdict` (Task 2).
- Produces: la respuesta de `POST /api/secop/verdict` pasa de `{ verdict: Verdict }` a `{ verdict: VerdictRespuesta }`. Todo consumidor debe discriminar sobre `verdict.redactado`.

**Nota de diseño — desviación deliberada del spec.** El spec (§8, prueba 3) pedía cubrir aquí el caso `overall === "FAIL"`. Se cubre en Task 2, donde el fixture del veredicto se controla por completo. Forzar un `FAIL` real en la prueba de ruta obligaría a calibrar perfil y proceso contra la matemática de las compuertas, y ataría esta prueba a esa calibración: cambiar una banda de cuantía rompería una prueba de redacción que no tiene nada que ver. Aquí se prueba solo el enrutamiento —¿con sesión o sin ella?—, que es el trabajo del handler.

- [ ] **Step 1: Escribir las pruebas que fallan**

Agregar al final de `src/__tests__/api/secop-verdict-route.test.ts`, dentro del `describe` existente (el `beforeEach` ya deja `mockAuth` en `null` y `mockLimit` en `[]`):

```ts
  it("sin sesión devuelve el veredicto redactado", async () => {
    const res = await POST(postReq({ proceso, perfil }));
    const body = await res.json();
    expect(body.verdict.redactado).toBe(true);
  });

  it("con sesión devuelve el veredicto completo", async () => {
    mockAuth.mockResolvedValue({ id: "u1", email: "u1@example.com" });
    const res = await POST(postReq({ proceso, perfil }));
    const body = await res.json();
    expect(body.verdict.redactado).toBe(false);
  });

  it("el semáforo y los estados por compuerta sobreviven a la redacción", async () => {
    const res = await POST(postReq({ proceso, perfil }));
    const body = await res.json();
    expect(body.verdict.overall).toBeDefined();
    for (const clave of ["sectorial", "cuantia", "plazo", "ubicacion", "habilitacion"]) {
      expect(body.verdict.gates[clave].status).toBeDefined();
    }
  });

  it("redactar no cuesta una consulta más: la sesión basta, el plan no se lee", async () => {
    mockLimit.mockClear();
    await POST(postReq({ proceso, perfil }));
    // La única consulta del handler sigue siendo la de requisitos cacheados.
    expect(mockLimit).toHaveBeenCalledTimes(1);
  });
```

- [ ] **Step 2: Correr las pruebas y confirmar que fallan**

Run: `npx vitest run src/__tests__/api/secop-verdict-route.test.ts`
Expected: FAIL — `body.verdict.redactado` es `undefined` en los dos primeros casos.

- [ ] **Step 3: Cablear la política en el handler**

En `app/api/secop/verdict/route.ts`, agregar a los imports:

```ts
import { nivelDe, puede } from "@/src/lib/acceso/politica";
import { redactarVerdict } from "@/src/lib/secop/verdict-publico";
```

Y reemplazar el bloque final de `POST` (desde `const user = await getSessionUser();` hasta el `return`) por:

```ts
  const user = await getSessionUser();
  if (user) {
    await recordUserSignal(user.id, "oferente");
  }

  // `veredicto_detalle` exige `gratis`, no `pro`: basta con saber si hay
  // sesión, así que no hace falta consultar `usuario.plan` y esta ruta no gana
  // una query. La redacción se hace aquí y no en el cliente — ocultar los
  // `reason` en el render los dejaría visibles en la pestaña de red.
  const nivel = nivelDe(user);
  const respuesta = puede(nivel, "veredicto_detalle")
    ? { redactado: false as const, ...verdict }
    : redactarVerdict(verdict);

  return NextResponse.json({ verdict: respuesta });
```

Actualizar además el docstring del archivo: donde dice `Body: { proceso: SecopProceso, perfil: OferenteProfile }`, agregar debajo:

```
 * Respuesta: { verdict: VerdictRespuesta } — completo con sesión, redactado
 * sin ella. Ver src/lib/secop/verdict-publico.ts.
```

- [ ] **Step 4: Correr las pruebas y confirmar que pasan**

Run: `npx vitest run src/__tests__/api/secop-verdict-route.test.ts`
Expected: PASS, incluidas las 8 pruebas que ya existían.

- [ ] **Step 5: Verificar y commitear**

```bash
npm test && npx next lint
git add app/api/secop/verdict/route.ts src/__tests__/api/secop-verdict-route.test.ts
git commit -m "feat(secop): la ruta de veredicto redacta según el nivel de acceso"
```

---

### Task 5: Manejo mínimo del veredicto redactado en la UI

**Files:**
- Modify: `src/components/secop/format.ts:78` (firma de `verdictScore`)
- Modify: `src/components/secop/ProcessDetail.tsx` — import de tipos, prop `verdict`, y el bloque de compuertas en las líneas 182-207
- Test: `src/__tests__/secop/format.test.ts` (existente — se agrega un caso)

**Interfaces:**
- Consumes: `VerdictRespuesta`, `razonDe` (Task 2).
- Produces: nada que otra tarea consuma. Es el punto final de la cadena.

**Alcance:** esto es el manejo mínimo, no el muro. Sin copy pulido, sin CTA, sin diseño — la pantalla del muro se especifica y construye con el dashboard. Aquí solo se impide que el componente renderice `undefined` donde antes había una explicación.

- [ ] **Step 1: Escribir la prueba que falla**

Agregar a `src/__tests__/secop/format.test.ts`:

El archivo ya importa `verdictScore`, `Verdict`, `GateResult` y `GateStatus`, y
ya define un helper `gate(status, requiredLevel)`. Solo hay que agregar un
import y el bloque nuevo.

Agregar al final de los imports:

```ts
import { redactarVerdict } from "@/src/lib/secop/verdict-publico";
```

Y al final del archivo:

```ts
describe("verdictScore sobre un veredicto redactado", () => {
  it("da el mismo marcador que sobre el completo: el teaser sobrevive", () => {
    const completo: Verdict = {
      procesoId: "CO1.REQ.7",
      overall: "WARN",
      gates: {
        sectorial: gate("PASS"),
        cuantia: gate("PASS"),
        plazo: gate("PASS"),
        ubicacion: gate("WARN"),
        habilitacion: gate("PASS"),
      },
      level: 0,
      evaluatedAt: "2026-08-31T00:00:00.000Z",
    };

    expect(verdictScore(redactarVerdict(completo))).toEqual(verdictScore(completo));
  });
});
```

- [ ] **Step 2: Correr la prueba y confirmar que falla**

Run: `npx vitest run src/__tests__/secop/format.test.ts`
Expected: FAIL de tipos — `verdictScore` solo acepta `Verdict` y recibe un `VerdictPublico`.

- [ ] **Step 3: Ensanchar `verdictScore`**

En `src/components/secop/format.ts`, cambiar solo la firma:

Agregar el import del tipo:

```ts
import type { VerdictPublico } from "@/src/lib/secop/verdict-publico";
```

Y cambiar solo la firma:

```ts
/**
 * Marcador "N de M compuertas". Acepta tanto el veredicto completo como el
 * redactado: solo lee `status`, que la redacción conserva — por eso el
 * marcador sigue existiendo para quien no tiene cuenta.
 */
export function verdictScore(v: Verdict | VerdictPublico): VerdictScore {
```

El cuerpo no cambia: `Object.values(v.gates).map((g) => g.status)` funciona igual
sobre las dos formas.

Se acepta la unión y no un tipo estructural como
`{ gates: Record<string, { status: GateStatus }> }` porque ese depende de que
TypeScript conceda índices implícitos a `Verdict["gates"]`, que es una sutileza
innecesaria cuando la unión dice exactamente lo que se quiere decir.

- [ ] **Step 4: Correr la prueba y confirmar que pasa**

Run: `npx vitest run src/__tests__/secop/format.test.ts`
Expected: PASS.

- [ ] **Step 5: Adaptar `ProcessDetail`**

En `src/components/secop/ProcessDetail.tsx`:

a) Agregar a los imports de tipos:

```ts
import { razonDe, type VerdictRespuesta } from "@/src/lib/secop/verdict-publico";
```

b) Agregar junto a `STATUS` (después de su declaración, alrededor de la línea 38):

```ts
/** Lo que se muestra cuando la explicación está redactada. */
const ESTADO_PALABRA: Record<GateStatus, string> = {
  PASS: "Cumple",
  WARN: "Revisar",
  FAIL: "No cumple",
  UNKNOWN: "Sin datos",
};
```

c) Cambiar el tipo de la prop `verdict` en la interfaz `Props`:

```ts
  /** Veredicto Nivel 0, calculado on-demand vía POST /api/secop/verdict.
   *  Puede venir redactado si no hay sesión — ver verdict-publico.ts. */
  verdict?: VerdictRespuesta;
```

d) Reemplazar el bloque `<ul className="clr-elig-gates">` completo —desde esa etiqueta hasta su `</ul>`— por lo siguiente. **Localizarlo por la etiqueta, no por número de línea:** el paso (b) ya insertó `ESTADO_PALABRA` más arriba y corrió todo lo que sigue.

```tsx
          <ul className="clr-elig-gates">
            {GATE_LABEL.map(([key, label]) => {
              const g = v.gates[key];
              const s = STATUS[g.status];
              const razon = razonDe(g);
              const esHabilitacion = key === "habilitacion";
              const partes = esHabilitacion && razon ? razon.split(" · ") : null;
              return (
                <li key={key} className="clr-elig-gate">
                  <span className={`clr-elig-glyph clr-elig-glyph--${s.cls}`}>{s.glyph}</span>
                  <span className="clr-elig-name">{label}</span>
                  <span className="clr-elig-reason">
                    {partes && partes.length > 1 ? (
                      <ul className="clr-elig-subgates">
                        {partes.map((parte, i) => (
                          <li key={i}>{parte}</li>
                        ))}
                      </ul>
                    ) : (
                      <>
                        {razon ?? ESTADO_PALABRA[g.status]}
                        {razon && g.requiredLevel === 2 && key !== "habilitacion"
                          ? " · requiere revisar pliego (nivel 2)"
                          : ""}
                      </>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
```

Nada más cambia: la barra de segmentos (el bloque `<div className="clr-elig-bar">`) y el aviso de `habilitacion.status === "FAIL"` leen solo `status`, que la redacción conserva.

- [ ] **Step 6: Verificar que compila y que el resto sigue pasando**

Run: `npm test && npx next lint && npx next build`
Expected: PASS en los tres. El `build` importa aquí: es lo que verifica que no quedó ningún consumidor de `verdict.gates[k].reason` sin adaptar.

- [ ] **Step 7: Commitear**

```bash
git add src/components/secop/format.ts src/components/secop/ProcessDetail.tsx src/__tests__/secop/format.test.ts
git commit -m "feat(secop): ProcessDetail maneja el veredicto redactado"
```

---

### Task 6: Sincronizar la documentación con la realidad

**Files:**
- Modify: `middleware.ts:8-19` (el docstring)
- Modify: `CLAUDE.md` (§4 Seguridad)

**Interfaces:**
- Consumes: nada.
- Produces: nada.

Esta tarea existe por separado porque su falla es la que originó todo el trabajo: un docstring que describe un gate inexistente. Plegarla a otra tarea es exactamente cómo se pierde.

- [ ] **Step 1: Corregir el docstring del middleware**

En `middleware.ts`, reemplazar las dos últimas frases del docstring —las que empiezan en "El resto del gating (evaluación de elegibilidad, embebida en /licitaciones) no es una ruta dedicada"— por:

```
 * Este archivo hace UNA sola distinción: anónimo o con sesión, por prefijo de
 * ruta. No puede hacer más: corre en el runtime Edge y no puede consultar
 * Postgres, así que no puede leer `usuario.plan` ni decidir nada sobre el
 * nivel `pro`. Esa frontera se aplica en route handlers y Server Components.
 *
 * La evaluación de elegibilidad NO se protege aquí ni en un componente: se
 * redacta en el servidor, dentro de POST /api/secop/verdict, según
 * `src/lib/acceso/politica.ts`. Una versión anterior de este comentario
 * afirmaba que el gate vivía en ProcessDetail/OferenteWizard; era falso, y esa
 * contradicción es la razón por la que la política ahora vive en un solo sitio.
```

- [ ] **Step 2: Documentar el modelo de acceso en CLAUDE.md**

En `CLAUDE.md`, agregar al final de la sección **4. Seguridad**:

```markdown
- **Modelo de acceso por niveles** (`src/lib/acceso/politica.ts`): tres niveles
  ordinales `anonimo < gratis < pro` y una tabla `NIVEL_MINIMO` que mapea
  capacidad → nivel mínimo. Es la única fuente de verdad de "quién puede qué";
  antes la respuesta estaba repartida entre `PROTECTED_PREFIXES`, ~20 llamadas
  sueltas a `getSessionUser()` y gates en componentes, y las tres se
  contradecían. Cualquier capacidad nueva se declara ahí, no con un `if (user)`
  suelto.
- La frontera visible hoy está en el veredicto de elegibilidad: el anónimo ve el
  semáforo y el estado de cada compuerta, la explicación (`reason`) pide cuenta
  — `src/lib/secop/verdict-publico.ts`. Dos excepciones se muestran sin cuenta:
  `overall === "FAIL"` (quien no puede participar merece saber por qué) y las
  compuertas `UNKNOWN` (no hay nada que ocultar). La redacción es del servidor;
  hacerla en el render dejaría los `reason` en la pestaña de red.
- `usuario.plan` (`text`, default `'gratis'`) existe pero **ningún handler la
  lee todavía**: `pliego_extraer` y `asistentes` están declaradas como `pro` en
  la política y siguen protegidas solo por `PROTECTED_PREFIXES`. Activar esa
  frontera es hacer que sus handlers consulten `puede()`.
```

Actualizar también la línea final del archivo:

```markdown
Última actualización: 2026-08-31 (modelo de acceso por niveles).
```

- [ ] **Step 3: Verificar y commitear**

```bash
npm test && npx next lint
git add middleware.ts CLAUDE.md
git commit -m "docs(acceso): el docstring del middleware ya no describe un gate inexistente"
```

---

## Cierre

Al terminar las 6 tareas:

```bash
npm test && npx next lint && npx next build
```

**Verificación manual, la que las pruebas no cubren.** Levantar el dev server y abrir `/licitaciones/explorar`:

1. **Con sesión**, con un perfil de oferente guardado: seleccionar un proceso y confirmar que la tarjeta de elegibilidad muestra las explicaciones completas, igual que antes del cambio.
2. **Sin sesión**, en una ventana privada: el wizard de perfil sigue cerrado para anónimos, así que **no se llega al veredicto por la UI**. Es lo esperado en este alcance — el veredicto anónimo se activa con el spec del dashboard, que abre el wizard. Para ver la redacción funcionando, llamar la ruta directamente:

```bash
curl -s -X POST http://localhost:3000/api/secop/verdict \
  -H 'Content-Type: application/json' \
  -d @/tmp/verdict-body.json | jq '.verdict.redactado, .verdict.gates'
```

con un `verdict-body.json` que contenga `{ "proceso": …, "perfil": … }` — se pueden copiar los fixtures de `src/__tests__/api/secop-verdict-route.test.ts`. Sin cookie de sesión debe responder `redactado: true` y las compuertas sin `reason`.
