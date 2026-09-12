# Rediseño de jerarquía de la landing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que la portada de AquaLicita persiga una sola acción — explorar procesos en `/licitaciones` — en vez de empujar el diagnóstico tres veces, y que explique de una vez qué se ve sin cuenta.

**Architecture:** No hay lógica nueva de negocio: es reordenar el scroll de `app/page.js`, recortar copy en cuatro componentes de `src/components/landing/`, añadir uno (`S7Acceso.jsx`) y ajustar tres media queries. La única pieza con sustancia es que `seccionesHome.js` gana dos exports (`NOMBRE_POR_ID` y `seccionesPorNivel()`) para que la sección nueva se genere a partir de la tabla de rutas en vez de una lista escrita a mano — el mismo principio que ya sostienen `enlaces.test.ts` y `acceso.test.ts`.

**Tech Stack:** Next.js 14.2.3 (App Router), React 18, vitest (`environment: "node"`, sin jsdom ni testing-library — **no hay forma de montar componentes en un test aquí**, así que toda lógica que merezca test se extrae a función pura), CSS plano con tokens de `app/globals.css`.

**Spec:** `docs/superpowers/specs/2026-09-12-landing-jerarquia-design.md`

## Global Constraints

- `PlantaHero.jsx` no se toca. `ProcesosTicker.jsx` solo en lo que dice la Task 8.
- No se introducen colores, fuentes ni radios nuevos: solo tokens ya definidos en `app/globals.css` (`--accent` `#0369A1`, `--accent-faint` `rgba(3,105,161,0.04)`, `--accent-river` `#7dd3fc`, `--line` `#e5e5e0`, `--ink-600`, `--ink-900`).
- Sin librerías nuevas. Sin cambios de esquema de base de datos ni de API.
- **Ninguna cifra ni dato de proceso escrito a mano en el JSX.** Todo sale del estado `sector` / `heroStats`, que vienen del único fetch a `/api/landing-stats`.
- **Ningún `href` ni etiqueta de acceso escritos a mano.** Siempre por `ruta(id)` de `src/components/landing/seccionesHome.js`.
- Accesibilidad: objetivos táctiles ≥ 44px (clase `.tap-target`), contraste de texto ≥ 4.5:1, `prefers-reduced-motion` respetado como ya lo hace `BLUEPRINT_CSS`.
- `npm run test` y `npm run build` en verde al final de **cada** task.
- Ningún párrafo de la portada pasa de ~45 palabras.
- Idioma: todo el copy, los comentarios y los mensajes de commit en español, como el resto del repo.

---

### Task 1: `NOMBRE_POR_ID` y `seccionesPorNivel()` en la tabla de rutas

Es la base de las Tasks 2 y 5. Hoy el nombre legible de cada ruta vive dentro de `S6Footer.jsx` como `ETIQUETAS`, donde solo el pie puede leerlo; `S7Acceso.jsx` necesita los mismos strings y copiarlos crearía dos listas que se desincronizan. El agrupado por nivel se extrae como función pura y no como un `.filter()` dentro del render porque el entorno de vitest de este repo es `node`: un componente montado no es testeable, una función sí — y el criterio de aceptación de T-06 exige poder demostrarlo.

**Files:**
- Modify: `src/components/landing/seccionesHome.js` (añadir al final, después de `ruta()`)
- Test: `src/__tests__/landing/nombres.test.ts` (crear)

**Interfaces:**
- Consumes: `SECCIONES_HOME`, `ETIQUETA_POR_NIVEL` (ya existen en ese archivo).
- Produces:
  - `NOMBRE_POR_ID: Record<string, string>` — id de sección → nombre legible.
  - `seccionesPorNivel(): Array<{ nivel: string, etiqueta: string, secciones: Array<{ id, href, capacidad, etiqueta, nombre }> }>` — un grupo por clave de `ETIQUETA_POR_NIVEL`, en ese orden (`anonimo`, `gratis`, `pro`). Las Tasks 2 y 5 consumen ambos.

- [ ] **Step 1: Escribir el test que falla**

Crear `src/__tests__/landing/nombres.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  SECCIONES_HOME,
  ETIQUETA_POR_NIVEL,
  NOMBRE_POR_ID,
  seccionesPorNivel,
} from "@/src/components/landing/seccionesHome";

/** `seccionesHome.js` es JS: al indexar por un string suelto hay que ayudar a TS. */
const nombre = (id: string): string | undefined =>
  (NOMBRE_POR_ID as Record<string, string>)[id];

describe("NOMBRE_POR_ID", () => {
  it("no nombra ninguna sección que no exista en SECCIONES_HOME", () => {
    const ids = new Set(SECCIONES_HOME.map((s) => s.id));
    const huerfanos = Object.keys(NOMBRE_POR_ID).filter((id) => !ids.has(id));
    expect(huerfanos, "sobran nombres para ids que ya no existen").toEqual([]);
  });
});

describe("seccionesPorNivel", () => {
  it("devuelve un grupo por nivel, en el orden de ETIQUETA_POR_NIVEL", () => {
    expect(seccionesPorNivel().map((g) => g.nivel)).toEqual(Object.keys(ETIQUETA_POR_NIVEL));
  });

  it("cada grupo lleva la etiqueta que le corresponde a su nivel", () => {
    for (const g of seccionesPorNivel()) {
      expect(g.etiqueta).toBe((ETIQUETA_POR_NIVEL as Record<string, string>)[g.nivel]);
      for (const s of g.secciones) expect(s.etiqueta).toBe(g.etiqueta);
    }
  });

  it("ningún nivel queda vacío: los tres tienen algo que mostrar", () => {
    // Es lo que impide que la columna "plan pro" del home salga en blanco
    // justo donde debe explicar qué cuesta dinero.
    for (const g of seccionesPorNivel()) {
      expect(
        g.secciones.length,
        `el nivel ${g.nivel} no tiene ninguna sección con nombre en NOMBRE_POR_ID`
      ).toBeGreaterThan(0);
    }
  });

  it("omite las secciones sin nombre en vez de inventarles uno", () => {
    const listadas = seccionesPorNivel().flatMap((g) => g.secciones.map((s) => s.id));
    // `veredicto` no es una página aparte, es una parte de /licitaciones: no
    // tiene nombre propio y no debe aparecer como si lo tuviera.
    expect(listadas).not.toContain("veredicto");
    for (const id of listadas) expect(nombre(id)).toBeTruthy();
  });

  it("toda sección con nombre aparece en exactamente un grupo", () => {
    // El criterio de aceptación de T-06: añadir una sección a SECCIONES_HOME
    // con nombre en NOMBRE_POR_ID la hace aparecer sin tocar S7Acceso.jsx.
    const listadas = seccionesPorNivel().flatMap((g) => g.secciones.map((s) => s.id));
    const nombradas = SECCIONES_HOME.filter((s) => nombre(s.id)).map((s) => s.id);
    expect([...listadas].sort()).toEqual([...nombradas].sort());
  });

  it("cada grupo expone el nombre legible junto a la sección", () => {
    for (const g of seccionesPorNivel()) {
      for (const s of g.secciones) expect(s.nombre).toBe(nombre(s.id));
    }
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npm run test -- src/__tests__/landing/nombres.test.ts`
Expected: FAIL — `NOMBRE_POR_ID` y `seccionesPorNivel` no están exportados (`SyntaxError` o `TypeError: seccionesPorNivel is not a function`).

- [ ] **Step 3: Implementar**

Añadir al final de `src/components/landing/seccionesHome.js`, después de la función `ruta()`:

```js
/**
 * El nombre legible de cada sección.
 *
 * Vivía como `ETIQUETAS` dentro de `S6Footer.jsx`, donde solo el pie podía
 * leerlo. `S7Acceso.jsx` necesita exactamente los mismos strings, y copiarlos
 * habría dejado dos listas que se desincronizan en el primer renombrado.
 *
 * Los tres nombres de `plan pro` no son invención de esta sección: son
 * literalmente los que ya usa la navegación en `src/components/Navbar.js`
 * — "Pliegos" en `NAV_ITEMS`, "Asistente: ejecución" y "Asistente: operación"
 * en `ACCOUNT_ITEMS`.
 *
 * Una sección sin entrada aquí no se lista en ningún índice. Hoy la única es
 * `veredicto`, que no es una página aparte sino una parte de /licitaciones.
 */
export const NOMBRE_POR_ID = {
  diagnostico: "Diagnóstico",
  explorar: "Licitaciones",
  soluciones: "Soluciones",
  coincidencias: "Mis coincidencias",
  filtros: "Mis filtros",
  competidores: "Competidores",
  auditoria: "Qué se descarta",
  alertas: "Alertas",
  nosotros: "Nosotros",
  pliego: "Pliegos",
  "asistente-ejecucion": "Asistente: ejecución",
  "asistente-operacion": "Asistente: operación",
};

/**
 * Las secciones nombrables agrupadas por nivel de acceso, en el orden de
 * `ETIQUETA_POR_NIVEL` (anónimo → gratis → pro).
 *
 * Es una función pura exportada y no un `.filter()` dentro del render de
 * `S7Acceso.jsx` a propósito: el entorno de vitest de este repo es "node",
 * sin jsdom, así que un componente montado no se puede testear pero esto sí.
 * El criterio de aceptación de la sección ("añadir una ruta con nombre la
 * hace aparecer en su columna sin tocar el componente") deja de ser una
 * promesa y pasa a estar en `src/__tests__/landing/nombres.test.ts`.
 */
export function seccionesPorNivel() {
  return Object.entries(ETIQUETA_POR_NIVEL).map(([nivel, etiqueta]) => ({
    nivel,
    etiqueta,
    secciones: SECCIONES_HOME.filter((s) => s.etiqueta === etiqueta && NOMBRE_POR_ID[s.id]).map(
      (s) => ({ ...s, nombre: NOMBRE_POR_ID[s.id] })
    ),
  }));
}
```

- [ ] **Step 4: Correr los tests**

Run: `npm run test -- src/__tests__/landing`
Expected: PASS — los 7 casos nuevos, más `acceso`, `enlaces`, `explica` y `cifras` que ya estaban.

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: compila sin errores de tipo.

- [ ] **Step 6: Commit**

```bash
git add src/components/landing/seccionesHome.js src/__tests__/landing/nombres.test.ts
git commit -m "feat(landing): la tabla de rutas gana nombre legible y agrupado por nivel"
```

---

### Task 2: La deuda del correo se mueve de la portada a donde se activa (T-05)

La portada promete un aviso por correo que en producción no se entrega (`AUTH_RESEND_KEY` no está en Vercel, PENDIENTES §0 y §21). Hoy eso se confiesa en un párrafo al pie del motor, que es el peor sitio: se lo lee todo el que pasa y no se lo lee quien va a activar la alerta. El aviso baja a `/cuenta`, junto al control, y el enlace del pie desaparece mientras tanto.

**Files:**
- Modify: `src/components/landing/S3Motor.jsx:120-137` (borrar el párrafo final y su comentario)
- Modify: `src/components/landing/S6Footer.jsx:9-24,72` (consumir `NOMBRE_POR_ID`, sacar `alertas`)
- Modify: `app/cuenta/page.tsx:70,84` (aviso nuevo + su CSS)

**Interfaces:**
- Consumes: `NOMBRE_POR_ID` de la Task 1.
- Produces: nada que otra task consuma.

- [ ] **Step 1: Borrar el párrafo del correo de `S3Motor.jsx`**

Eliminar el bloque completo entre `</div>` (cierre del grid de pasos, línea 118) y `</div>` (cierre del contenedor, línea 138) — es decir el comentario `{/* El aviso por correo era el cuarto paso... */}` y el `<p style={{...}}>El aviso por correo de lo nuevo que encaja...</p>` que le sigue. El archivo queda con el grid de `PASOS` como último hijo del `<div style={{ maxWidth: 1440 ...}}>`.

- [ ] **Step 2: `S6Footer.jsx` consume el mapa compartido y suelta `alertas`**

Reemplazar el `import` y las constantes `ETIQUETAS` / `COLUMNAS` (líneas 1-24) por:

```jsx
import Link from "next/link";
import { NOMBRE_POR_ID, ruta } from "./seccionesHome";

/**
 * El pie enlazaba a /terms y /privacy, que nunca existieron. Ahora las rutas
 * salen de SECCIONES_HOME, que `enlaces.test.ts` verifica contra `app/`: un
 * enlace roto en el pie deja de ser algo que se descubre haciendo clic.
 *
 * Los nombres visibles ya no viven aquí: están en `NOMBRE_POR_ID`
 * (seccionesHome.js), que este pie comparte con `S7Acceso.jsx`.
 */
const COLUMNAS = [
  { grupo: "Explorar", ids: ["diagnostico", "explorar", "soluciones", "nosotros"] },
  // `alertas` (→ /cuenta) sale de esta columna mientras el envío por correo no
  // esté configurado: AUTH_RESEND_KEY no existe en Vercel y el diario no se
  // entrega (PENDIENTES §0 y §21). No es que la página no exista — se llega a
  // ella desde el menú de usuario del navbar; es que anunciarla como "Alertas"
  // en el pie promete un envío que hoy no ocurre. Vuelve a la lista en cuanto
  // esa env var esté puesta y el envío se verifique en producción.
  { grupo: "Tu cuenta", ids: ["coincidencias", "filtros", "competidores", "auditoria"] },
];
```

Y en el render, cambiar `{ETIQUETAS[id]}` por `{NOMBRE_POR_ID[id]}` (línea 72).

- [ ] **Step 3: El aviso aparece en `/cuenta`, junto al control**

En `app/cuenta/page.tsx`, añadir la regla al bloque `<style>` justo después de `.clr-cuenta-prefs-title` (línea 57):

```css
        .clr-cuenta-prefs-aviso{
          font-size: 12px; line-height: 1.5; color: var(--ink-600);
          background: var(--accent-faint); border-left: 2px solid var(--accent);
          padding: 8px 10px; margin: 0 0 14px;
        }
```

Y en el JSX, justo debajo de `<p className="clr-cuenta-prefs-title">Alertas por correo</p>` (línea 84):

```tsx
            {/* El mismo aviso honesto que estaba al pie del motor en la
                portada (S3Motor). Se lo leía todo el que pasaba por el home y
                no lo leía quien venía justo a activar la alerta. Aquí está
                donde se toma la decisión. Se borra cuando AUTH_RESEND_KEY esté
                en Vercel y el envío diario se verifique (PENDIENTES §0 y §21). */}
            <p className="clr-cuenta-prefs-aviso">
              El aviso por correo de lo nuevo que encaja está construido y se activará en cuanto
              quede configurado el envío. Hasta entonces, las coincidencias se consultan en el
              panel.
            </p>
```

- [ ] **Step 4: Correr los tests**

Run: `npm run test`
Expected: PASS. Ningún test toca `COLUMNAS`, así que sacar `alertas` del pie no rompe nada — `acceso.test.ts` y `enlaces.test.ts` verifican `SECCIONES_HOME`, que no cambia.

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: verde.

- [ ] **Step 6: Commit**

```bash
git add src/components/landing/S3Motor.jsx src/components/landing/S6Footer.jsx app/cuenta/page.tsx
git commit -m "fix(landing): el aviso del correo baja de la portada a las preferencias de alerta"
```

---

### Task 3: `S5Descartes` se absorbe en `S3Motor` como paso 04 (T-04)

La sección de descartes es un paso del motor contado aparte: mismo tema, mismo destino (`/auditoria`), tres pantallas más abajo. Entra como paso `04` y el componente se borra — **opción (a) de la spec**. Verificado antes de planificar: los únicos consumidores del export `MOTIVOS` de `S5Descartes.jsx` son el propio componente y `explica.test.ts`; `app/auditoria/explica.ts` queda como dueño único, consumido por `app/auditoria/page.tsx`. (La `MOTIVOS` de `src/lib/al/matching/tipos.ts` es otra cosa — códigos de descarte, no redacción — y no se toca.)

**Files:**
- Modify: `src/components/landing/S3Motor.jsx:6-32` (añadir el paso 04 al array `PASOS`)
- Delete: `src/components/landing/S5Descartes.jsx`
- Delete: `src/__tests__/landing/explica.test.ts`
- Modify: `app/page.js:14,793` (quitar el import y el `<S5Descartes />`)
- Modify: `app/auditoria/explica.ts:11-13` (el comentario que apunta a S5Descartes deja de ser cierto)

**Interfaces:**
- Consumes: nada de tasks anteriores.
- Produces: `PASOS` de `S3Motor` pasa de 3 a 4 elementos; la Task 7 no depende de eso.

- [ ] **Step 1: Comprobar que nadie más usa el export antes de borrarlo**

Run:
```bash
grep -rn "S5Descartes" app src --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx"
```
Expected: exactamente cinco líneas — `app/page.js:14`, `app/page.js:793`, el comentario de `app/auditoria/explica.ts`, la definición en `S5Descartes.jsx` y el import de `explica.test.ts`. Si aparece cualquier otra, **parar** y reportarlo: el borrado deja de ser seguro.

- [ ] **Step 2: Añadir el paso 04 a `S3Motor.jsx`**

Al final del array `PASOS` (después del objeto `n: "03"`, línea 31):

```jsx
    {
      n: "04",
      titulo: "Un filtro demasiado estrecho no da errores. Da silencio",
      cuerpo:
        "Guardamos cada proceso que tus reglas descartaron, con el motivo exacto. Si al revisarlos aparece algo que sí te interesaba, el filtro está mal — y ya sabes cuál.",
      ...ruta("auditoria"),
      cta: "VER QUÉ SE DESCARTA",
    },
```

No hace falta tocar el render: el `PASOS.map(...)` ya pinta `n`, `titulo`, `etiqueta`, `cuerpo`, `href` y `cta`, y `...ruta("auditoria")` aporta `href` y `etiqueta`.

- [ ] **Step 3: Borrar el componente, su test y su montaje**

```bash
git rm src/components/landing/S5Descartes.jsx src/__tests__/landing/explica.test.ts
```

En `app/page.js`, borrar la línea 14 (`import S5Descartes from "@/src/components/landing/S5Descartes";`) y el bloque de la línea 792-793:

```jsx
        {/* S5 — Qué se descarta: transparencia del motor de filtros */}
        <S5Descartes />
```

- [ ] **Step 4: Corregir el comentario de `app/auditoria/explica.ts`**

Reemplazar el último párrafo del bloque de documentación (las líneas que empiezan por `* Se exporta porque \`S5Descartes.jsx\` mantiene una copia literal...`) por:

```
 * Es la fuente única de estos textos. Hubo una copia literal en el home
 * (`MOTIVOS` en S5Descartes.jsx) vigilada por un test; esa sección se absorbió
 * en S3Motor como paso 04 el 2026-09-12 y la copia se borró con ella, así que
 * ya no hay dos listas que puedan divergir.
```

- [ ] **Step 5: Correr los tests**

Run: `npm run test`
Expected: PASS, con **un archivo de test menos** (`explica.test.ts` ya no existe). Confirmar en la salida que `nombres`, `acceso`, `enlaces` y `cifras` siguen pasando.

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: verde. Un import huérfano de `S5Descartes` en `app/page.js` haría fallar aquí — si falla, es que quedó la línea 14 o el `<S5Descartes />`.

- [ ] **Step 7: Commit**

```bash
git add -A src/components/landing src/__tests__/landing app/page.js app/auditoria/explica.ts
git commit -m "refactor(landing): S5Descartes se absorbe en S3Motor como paso 04

Opción (a) de la spec: se borra el componente y su test explica.test.ts.
MOTIVOS era una copia literal de EXPLICA que solo existía para el home;
con la sección absorbida, app/auditoria/explica.ts vuelve a ser la fuente
única y no hay dos listas que sincronizar."
```

---

### Task 4: `S2Diagnostico` se comprime (T-03, la parte del componente)

El diagnóstico deja de ser la puerta de entrada y pasa a ser un paso previo opcional. El eyebrow y el párrafo lo dicen; las tres tarjetas de `DEVUELVE` se quedan. El cambio de posición en el scroll es de la Task 7.

**Files:**
- Modify: `src/components/landing/S2Diagnostico.jsx:38,61-64`

**Interfaces:** ninguna compartida.

- [ ] **Step 1: Cambiar el eyebrow**

Línea 38, reemplazar `Empieza aquí · {RUTA.etiqueta}` por:

```jsx
            Paso previo · opcional · {RUTA.etiqueta}
```

- [ ] **Step 2: Comprimir el párrafo a una sola frase**

Reemplazar el contenido del `<p>` (líneas 61-64) por:

```jsx
          Diez preguntas, sin cuenta y sin IA: reglas fijas, así que las mismas respuestas dan
          siempre el mismo veredicto.
```

(19 palabras — muy por debajo del tope de 45.)

- [ ] **Step 3: Correr los tests y el build**

Run: `npm run test && npm run build`
Expected: ambos verdes. Nada testea este copy; el build confirma que el JSX sigue siendo válido.

- [ ] **Step 4: Commit**

```bash
git add src/components/landing/S2Diagnostico.jsx
git commit -m "copy(landing): el diagnóstico se anuncia como paso previo opcional"
```

---

### Task 5: Sección nueva — "Qué te llevas sin pagar" (T-06)

Tres columnas, una por nivel de acceso, generadas con `seccionesPorNivel()`. La columna "sin cuenta" lleva el mismo recurso visual que `.bp-card` (borde de acento y esquinas de plano) y cierra con el CTA principal. El montaje en la página es de la Task 7.

Los estilos van inline, como en el resto de `src/components/landing/` — no se añade una clase a `globals.css` para algo que solo usa esta sección.

**Files:**
- Create: `src/components/landing/S7Acceso.jsx`

**Interfaces:**
- Consumes: `ruta`, `seccionesPorNivel` de la Task 1.
- Produces: `export default function S7Acceso()` — sin props. La Task 7 lo monta.

- [ ] **Step 1: Crear el componente**

`src/components/landing/S7Acceso.jsx`:

```jsx
import Link from "next/link";
import { ruta, seccionesPorNivel } from "./seccionesHome";

const RUTA_EXPLORAR = ruta("explorar");

/**
 * Qué te llevas sin pagar: el modelo de acceso, dicho una vez y entero.
 *
 * Las tres columnas no son listas escritas a mano: salen de
 * `seccionesPorNivel()`, que agrupa SECCIONES_HOME por su etiqueta de acceso.
 * Añadir una ruta con nombre en NOMBRE_POR_ID la hace aparecer en su columna
 * sin tocar este archivo — que es justo lo que evita que la promesa del home y
 * la puerta real vuelvan a separarse. `nombres.test.ts` lo verifica.
 *
 * Aquí no hay cifras ni precios: la spec deja el contenido comercial del plan
 * pro fuera de alcance, así que la columna pro nombra las funciones y nada más.
 */
export default function S7Acceso() {
  const grupos = seccionesPorNivel();

  return (
    <section className="section-pad" style={{ background: "#FAFAF7" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <span style={{ width: 8, height: 8, background: "var(--accent)" }} />
          <span
            style={{
              font: "11px var(--font-jetbrains-mono),monospace",
              color: "var(--accent)",
              letterSpacing: ".08em",
            }}
          >
            Qué te llevas sin pagar
          </span>
        </div>

        <h2
          style={{
            font: "700 var(--step-h2)/1.2 var(--font-ibm-plex-sans-condensed)",
            color: "#0A1F1C",
            margin: "0 0 40px",
            maxWidth: 760,
          }}
        >
          Todo lo que decide si te presentas se ve sin cuenta
        </h2>

        <div className="grid-cards">
          {grupos.map((g) => {
            const libre = g.nivel === "anonimo";
            return (
              <div
                key={g.nivel}
                style={{
                  position: "relative",
                  border: `1px solid ${libre ? "var(--accent)" : "var(--line)"}`,
                  background: libre ? "#fff" : "transparent",
                  padding: 22,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                {/* Las esquinas de plano, el mismo recurso visual que .bp-card
                    usa en las tarjetas de intención del hero. Solo en la
                    columna libre: son la marca de "esto es lo que miras
                    primero". */}
                {libre && (
                  <>
                    <span
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        top: -1,
                        left: -1,
                        width: 10,
                        height: 10,
                        borderTop: "2px solid var(--accent)",
                        borderLeft: "2px solid var(--accent)",
                      }}
                    />
                    <span
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        bottom: -1,
                        right: -1,
                        width: 10,
                        height: 10,
                        borderBottom: "2px solid var(--accent)",
                        borderRight: "2px solid var(--accent)",
                      }}
                    />
                  </>
                )}

                <span
                  style={{
                    font: "10px var(--font-jetbrains-mono),monospace",
                    color: libre ? "var(--accent)" : "#6B746F",
                    background: libre ? "var(--accent-faint)" : "transparent",
                    border: `1px solid ${libre ? "var(--accent)" : "var(--line)"}`,
                    padding: "2px 8px",
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                    alignSelf: "flex-start",
                  }}
                >
                  {g.etiqueta}
                </span>

                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    flexGrow: 1,
                  }}
                >
                  {g.secciones.map((s) => (
                    <li
                      key={s.id}
                      style={{
                        font: "14px/1.5 var(--font-inter)",
                        color: "#0A1F1C",
                        paddingLeft: 14,
                        borderLeft: `1px solid ${libre ? "var(--accent)" : "var(--line)"}`,
                      }}
                    >
                      {s.nombre}
                    </li>
                  ))}
                </ul>

                {libre && (
                  <Link
                    href={RUTA_EXPLORAR.href}
                    className="tap-target"
                    style={{
                      font: "600 12px var(--font-jetbrains-mono),monospace",
                      color: "var(--accent)",
                      textDecoration: "none",
                    }}
                  >
                    [ EXPLORAR PROCESOS ]
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Correr los tests**

Run: `npm run test -- src/__tests__/landing/nombres.test.ts`
Expected: PASS — es el test que cubre el contrato de datos de esta sección (los tres grupos existen, ninguno vacío, sin nombres inventados). El componente en sí no se puede testear: vitest corre en `environment: "node"`, sin jsdom.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: verde. El componente todavía no está montado, así que Next lo compila pero no aparece en la página — eso es correcto: lo monta la Task 7.

- [ ] **Step 4: Commit**

```bash
git add src/components/landing/S7Acceso.jsx
git commit -m "feat(landing): sección nueva que explica el modelo de acceso por niveles"
```

---

### Task 6: El cierre apunta a explorar y abre una salida a Nosotros (T-07)

**Files:**
- Modify: `src/components/landing/S5DarkClosing.jsx:1-3,32-48`
- Modify: `app/globals.css:1518-1531` (la fila de acciones se centra en ≥768px, como ya hace `.checks-cierre`)

**Interfaces:** ninguna compartida.

- [ ] **Step 1: Reescribir el bloque de acciones de `S5DarkClosing.jsx`**

Reemplazar las tres primeras líneas del archivo por:

```jsx
import Link from "next/link";
import { ruta } from "./seccionesHome";

const RUTA_EXPLORAR = ruta("explorar");
const RUTA_NOSOTROS = ruta("nosotros");
```

Y el `<a>` del botón blanco (líneas 32-48) por:

```jsx
        <div
          className="acciones-cierre"
          style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", marginBottom: 32 }}
        >
          <Link
            href={RUTA_EXPLORAR.href}
            className="tap-target"
            style={{
              gap: 8,
              padding: "12px 24px",
              background: "white",
              color: "#0369A1",
              font: "600 14px var(--font-inter)",
              borderRadius: 4,
              textDecoration: "none",
              cursor: "pointer",
            }}
          >
            Explorar procesos →
          </Link>
          {/* El único camino a Nosotros para quien llegó hasta abajo: el navbar
              lo mete en la hamburguesa por debajo de 1024px. --accent-river
              (#7dd3fc) sobre #0A1F1C da ~9:1, muy por encima del 4.5 exigido. */}
          <Link
            href={RUTA_NOSOTROS.href}
            className="tap-target"
            style={{
              color: "var(--accent-river)",
              font: "14px var(--font-inter)",
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            Quién está detrás
          </Link>
        </div>
```

- [ ] **Step 2: Centrar la fila en escritorio**

En `app/globals.css`, en el bloque que hoy dice `.checks-cierre { justify-content: flex-start; }` y su media query de 768px, añadir el selector nuevo a los dos sitios:

```css
/* El bloque de cierre, su fila de acciones y su fila de checks: en bandera
   hasta 768px, centrados a partir de ahí — misma regla que .center-md,
   aplicada al eje del flex. */
.checks-cierre,
.acciones-cierre {
  justify-content: flex-start;
}

@media (min-width: 768px) {
  .checks-cierre,
  .acciones-cierre {
    justify-content: center;
  }

  .bp-page .center-md p {
    margin-inline: auto;
  }
}
```

- [ ] **Step 3: Correr los tests y el build**

Run: `npm run test && npm run build`
Expected: verdes. `enlaces.test.ts` ya garantizaba que `/nosotros` y `/licitaciones` existen como páginas.

- [ ] **Step 4: Commit**

```bash
git add src/components/landing/S5DarkClosing.jsx app/globals.css
git commit -m "feat(landing): el cierre lleva a explorar y abre la salida a Nosotros"
```

---

### Task 7: El scroll de la portada — H1, CTA único y reorden (T-01, T-02, y el montaje de T-03 y T-06)

La task grande. Todo en `app/page.js`. El orden final del scroll queda:

```
ProcesosTicker → hero → rutas de intención → S3Motor → S4Competidores
→ S2Diagnostico → S7Acceso → S5DarkClosing → S6Footer
```

**Files:**
- Modify: `app/page.js` — imports (7-18), `BLUEPRINT_CSS` (52-63 el `.bp-h1`, y añadir reglas nuevas), el `<h1>` (~532-545), el bloque de CTAs (~600-648), la tira de cifras del sector (~558-598), y el orden de secciones (~778-880).

**Interfaces:**
- Consumes: `S7Acceso` (Task 5), `ETIQUETA_POR_NIVEL` (ya existía), `seccionesPorNivel` no se usa aquí.
- Produces: nada.

- [ ] **Step 1: Imports**

En la cabecera de `app/page.js`: añadir `S7Acceso` y ampliar el import de `seccionesHome`.

```jsx
import S7Acceso from "@/src/components/landing/S7Acceso";
```
(junto a los demás imports de `landing/`, después de `S5DarkClosing`)

```jsx
import { ETIQUETA_POR_NIVEL, ruta } from "@/src/components/landing/seccionesHome";
```
(reemplaza `import { ruta } from "@/src/components/landing/seccionesHome";`)

- [ ] **Step 2: Un helper de nivel para las tarjetas de intención**

Justo después del array `INTENT_ROUTES` (línea ~50):

```jsx
/**
 * ¿Esta tarjeta se puede usar sin cuenta? Se pregunta por la etiqueta contra
 * ETIQUETA_POR_NIVEL y no comparando con el string "sin cuenta" a mano: si
 * mañana la redacción del nivel cambia en seccionesHome.js, esto la sigue.
 */
const esLibre = (etiqueta) => etiqueta === ETIQUETA_POR_NIVEL.anonimo;
```

- [ ] **Step 3: El H1 nombra la categoría**

Reemplazar el `<h1 className="bp-h1">…</h1>` completo por:

```jsx
              <h1 className="bp-h1">
                <span className="hero-mask hero-mask-1">
                  <span>
                    Los procesos de{" "}
                    <span style={{ whiteSpace: "nowrap" }}>
                      <span className="hero-draw">agua</span>
                    </span>{" "}
                    del SECOP II,
                  </span>
                </span>
                <span className="hero-mask hero-mask-2">
                  <span>filtrados por tus reglas.</span>
                </span>
              </h1>
```

Y ampliar el `max-width` de `.bp-h1` en `BLUEPRINT_CSS` (línea ~62), porque la primera línea ahora tiene 34 caracteres y con `22ch` se partiría en dos:

```css
  max-width: min(100%, 30ch);
```

(El valor exacto se confirma a ojo en la Task 9 a 1440px: la primera línea debe caber entera con «agua» dentro. Si a 30ch todavía se parte, subir a 34ch. Envolver en `nowrap` **no** es opción: a 360px reventaría el ancho.)

- [ ] **Step 4: Marcar la tira de cifras del sector para poder ocultarla en móvil**

Al `<div>` que envuelve las tres cifras del sector (`procesos del sector vigilados` / `registros de quién se presentó` / `sanciones registradas`, línea ~562), añadirle `className="bp-hero-sector"` conservando su `style` inline tal cual.

- [ ] **Step 5: Un solo CTA**

Reemplazar el `<div>` que hoy contiene los dos botones (línea ~600-648, desde el `<div style={{ display:"flex", alignItems:"center", gap:12 …}}>` hasta su cierre) por:

```jsx
              <div className="bp-hero-cta">
                <div className="hero-fade-up bp-hero-cta-main" style={{ animationDelay: ".9s" }}>
                  <Link
                    href={ruta("explorar").href}
                    className="bp-cta bp-cta-dark"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      background: "#0369A1",
                      color: "#fff",
                      font: "600 13px var(--font-jetbrains-mono),monospace",
                      letterSpacing: ".04em",
                    }}
                  >
                    Explorar procesos →
                  </Link>
                  {/* La cifra sale del mismo fetch que el resto; si viene en
                      null la frase se acorta en vez de quedar "sin cuenta · —
                      procesos del sector", que se lee como un error. */}
                  <div className="bp-hero-cta-nota">
                    {sector.procesosVigilados == null
                      ? "sin cuenta"
                      : `sin cuenta · ${formatConteo(sector.procesosVigilados)} procesos del sector`}
                  </div>
                </div>
                <Link
                  href={ruta("diagnostico").href}
                  className="hero-fade-up tap-target bp-hero-cta-alt"
                  style={{ animationDelay: ".92s" }}
                >
                  o mira antes si estás listo · 3 min
                </Link>
              </div>
```

- [ ] **Step 6: Las reglas CSS del CTA, en `BLUEPRINT_CSS`**

Añadir después del bloque `.bp-cta-dark:focus-visible` (línea ~152):

```css
.bp-hero-cta { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin: 30px 0 20px; }
.bp-hero-cta-nota { margin-top: 6px; font: 10px var(--font-jetbrains-mono),monospace; color: #6B746F; }
/* El subrayado necesita ganarle a `.bp-page a { text-decoration: none }` de
   arriba, y una clase sola no basta: hace falta el mismo peso de selector. */
.bp-page a.bp-hero-cta-alt {
  font: 500 13px var(--font-inter);
  color: #525B5A;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.bp-page a.bp-hero-cta-alt:hover { color: #0369A1; }
```

- [ ] **Step 7: Reordenar las secciones**

Reemplazar todo lo que hay entre el cierre del `.bp-hero-wrap` y `<S6Footer />` por este orden. El markup del bloque de intención no cambia salvo el badge del Step 8 — se mueve entero, tal cual, desde donde estaba (debajo de `<S5Descartes />`) a aquí:

```jsx
        {/* Rutas de intención — ¿En qué momento estás?
            Sube justo debajo del hero: es la bifurcación real del visitante y
            estaba enterrada bajo cuatro secciones. */}
        <div className="bp-pillars-wrap" id="asistentes-proyecto" style={{ paddingTop: 80 }}>
          … (el bloque existente, sin cambios salvo el badge del Step 8) …
        </div>

        {/* S3 — El motor: cuatro pasos, el 04 absorbió los descartes */}
        <S3Motor procesosVigilados={sector.procesosVigilados} />

        {/* S4 — Quién compite: histórico de oferentes y sanciones */}
        <S4Competidores
          oferentesHistoricos={sector.oferentesHistoricos}
          sanciones={sector.sanciones}
        />

        {/* S2 — Paso previo opcional: diagnóstico de preparación. Baja hasta
            aquí: dejó de ser la puerta de entrada. */}
        <S2Diagnostico />

        {/* S7 — Qué te llevas sin pagar: el modelo de acceso, dicho una vez */}
        <S7Acceso />

        {/* Banda oscura de cierre */}
        <S5DarkClosing />

        {/* Pie */}
        <S6Footer />
```

- [ ] **Step 8: El badge de nivel de cada tarjeta de intención**

Dentro del `INTENT_ROUTES.map`, reemplazar el `<span>` de `{c.etiqueta}` por:

```jsx
                <span
                  style={{
                    font: "10px var(--font-jetbrains-mono),monospace",
                    color: esLibre(c.etiqueta) ? "var(--accent)" : "#6B746F",
                    background: esLibre(c.etiqueta) ? "var(--accent-faint)" : "transparent",
                    border: `1px solid ${esLibre(c.etiqueta) ? "var(--accent)" : "#DADAD2"}`,
                    padding: "2px 8px",
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                    alignSelf: "flex-start",
                  }}
                >
                  {c.etiqueta}
                </span>
```

- [ ] **Step 9: Correr los tests**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 10: Build**

Run: `npm run build`
Expected: verde. Si falla por `S5Descartes` no definido, es que la Task 3 quedó a medias.

- [ ] **Step 11: Verificar el criterio de aceptación de T-01**

Run:
```bash
grep -n "bp-cta-dark\|bp-cta " app/page.js
```
Expected: el único `<Link>` con `className="bp-cta bp-cta-dark"` apunta a `ruta("explorar").href`. No debe quedar ningún otro elemento del hero con fondo de acento.

- [ ] **Step 12: Commit**

```bash
git add app/page.js
git commit -m "feat(landing): un solo CTA, el H1 nombra la categoría y el scroll se reordena

El hero pedía diagnóstico y ofrecía explorar como alternativa en contorno;
ahora el único botón sólido va a /licitaciones y el diagnóstico queda como
enlace de texto. Las rutas de intención suben bajo el hero, el diagnóstico
baja tras los competidores y entra S7Acceso antes del cierre."
```

---

### Task 8: Móvil (T-08)

Cinco arreglos independientes, agrupados porque comparten el criterio (360px) y se revisan de una sola pasada.

**Files:**
- Modify: `src/components/landing/ProcesosTicker.jsx:127-134` (el bloque `@media (max-width: 640px)` de `TICKER_CSS`)
- Modify: `app/page.js` (`BLUEPRINT_CSS`, el bloque `@media (max-width: 640px)` del final)
- Modify: `src/components/Navbar.js` (enlace directo + su CSS en `AUTH_CSS`)

**Interfaces:** ninguna compartida.

- [ ] **Step 1: El ticker respira**

En `TICKER_CSS`, dentro del `@media (max-width: 640px)` que ya existe, sustituir la regla de `.ptr-cap` y la de `.ptr-entidad`:

```css
@media (max-width: 640px) {
  .ptr-bar { height: 48px; }
  /* El rótulo "EN VIVO" se come un tercio de la barra en un móvil y no dice
     nada que el diamante pulsante no diga ya. Se va; el diamante se queda
     como prueba de vida, que es lo único que esta barra tiene que demostrar. */
  .ptr-cap { display: none; }
  .ptr-item { padding: 0 14px; }
  .ptr-row1 { font-size: 10.5px; }
  /* Sin tope: con el rótulo fuera, la entidad puede usar el ancho que hay. */
  .ptr-entidad { max-width: none; }
  .ptr-row2 { font-size: 9px; }
}
```

- [ ] **Step 2: El hero suelta las cifras del sector en móvil**

En `BLUEPRINT_CSS`, dentro del `@media (max-width: 640px)` del final, añadir:

```css
  /* Las tres cifras del sector se repiten más abajo, en S3Motor (procesos
     vigilados) y S4Competidores (oferentes y sanciones), que es donde
     significan algo. En un móvil, aquí solo empujan el CTA fuera de pantalla.
     Quedan las dos cifras vivas y la credencial de .bp-hero-metrics. */
  .bp-hero-sector { display: none; }
  .bp-hero-cta { flex-direction: column; align-items: stretch; gap: 12px; }
  .bp-hero-cta-main { width: 100%; }
  .bp-hero-cta-main .bp-cta { display: flex; width: 100%; justify-content: center; }
  .bp-hero-cta-nota { text-align: center; }
  .bp-page a.bp-hero-cta-alt { justify-content: center; text-align: center; }
```

- [ ] **Step 3: El navbar deja el destino a la vista bajo 1024px**

En `src/components/Navbar.js`, añadir junto a los demás imports de rutas — el archivo hoy no importa `seccionesHome`, así que la línea es nueva:

```jsx
import { ruta } from "./landing/seccionesHome";
```

y bajo los arrays de items:

```jsx
// El único destino que la portada persigue. Por debajo de 1024px el navbar
// esconde toda la navegación en la hamburguesa; dejar "Licitaciones" fuera
// del menú es la diferencia entre un destino y un destino que hay que buscar.
const RUTA_EXPLORAR = ruta("explorar");
```

En el JSX, justo **antes** del `<button className="clr-hamburger" …>`:

```jsx
        <Link href={RUTA_EXPLORAR.href} className="clr-nav-explorar" onClick={close}>
          Licitaciones
        </Link>
```

Y en `AUTH_CSS`, después del bloque de `.clr-nav-auth-cta:hover`:

```css
.clr-nav-explorar{
  display: flex; align-items: center; margin-left: auto; margin-right: 10px;
  font: 600 11px var(--font-mono, monospace); letter-spacing: .1em;
  text-transform: uppercase; white-space: nowrap;
  color: #fff; background: var(--accent, #0369A1); text-decoration: none;
  padding: 0 12px; min-height: 34px;
}
.clr-nav-explorar:hover{ opacity: .9; }
@media (min-width: 1024px) { .clr-nav-explorar{ display: none; } }
```

(`.clr-hamburger` conserva su propio `margin-left:auto`: con dos `auto` en la misma fila, el primero se lleva el espacio y el segundo no hace nada, así que no hay que tocarlo.)

- [ ] **Step 4: Revisar el párrafo de `S4Competidores`**

Run:
```bash
node -e "console.log('Quién se presenta en el sector, cuánto gana, a qué precio adjudica y si arrastra sanciones. Es información pública, pero está desperdigada en miles de expedientes: aquí ya está reunida.'.split(/\s+/).length)"
```
Expected: `30`. Está por debajo del tope de ~45 palabras, así que **no se toca**. (El de `S5Descartes`, que sí lo pasaba, desapareció en la Task 3; el nuevo paso 04 de `S3Motor` tiene 30.) Si el conteo saliera por encima de 45, recortarlo a dos frases; si sale 30, dejarlo y anotarlo en el commit.

- [ ] **Step 5: Correr los tests y el build**

Run: `npm run test && npm run build`
Expected: verdes.

- [ ] **Step 6: Commit**

```bash
git add src/components/landing/ProcesosTicker.jsx app/page.js src/components/Navbar.js
git commit -m "fix(landing): la portada deja de estar rota en 360px

Ticker sin rótulo (cabía un ítem y medio), hero sin las tres cifras del
sector (se repiten donde significan algo), CTA a ancho completo y un
enlace directo a Licitaciones fuera de la hamburguesa. El párrafo de
S4Competidores se midió: 30 palabras, no necesita recorte."
```

---

### Task 9: Verificación (T-09)

Nada de esto se puede comprobar con `npm run test`: es la parte que exige mirar la página.

**Files:** ninguno, salvo los arreglos que salgan.

- [ ] **Step 1: Suite completa y build limpio**

Run: `npm run test && npm run build`
Expected: ambos verdes. Anotar el número de tests que pasan.

- [ ] **Step 2: Levantar la portada**

Usar `preview_start` con `.claude/launch.json` (crearlo si no existe, con `npm run dev` y puerto 3000). **No** arrancar el servidor con Bash.

- [ ] **Step 3: Repasar los cinco anchos**

Con `resize_window`, mirar 360, 768, 1024, 1199 y 1440px. En cada uno:
- el H1 ocupa dos líneas y «agua» queda en la primera (a 1440px; en móvil puede partirse más);
- hay **un** solo elemento con fondo de acento en el hero;
- nada desborda horizontalmente (`document.documentElement.scrollWidth <= window.innerWidth`, comprobable con `javascript_tool`);
- a 1024 y 1199px el navbar sigue entero — es la banda que ya tiene reglas propias en `globals.css` y en `AUTH_CSS`, y el enlace nuevo no debe aparecer ahí (está en `display:none` desde 1024px);
- a 360px el ticker muestra más de un ítem y el CTA es de ancho completo.

- [ ] **Step 4: La portada aguanta sin cifras**

Con `javascript_tool`, interceptar el endpoint y recargar:

```js
const orig = window.fetch;
window.fetch = (u, o) =>
  String(u).includes("/api/landing-stats")
    ? Promise.resolve(new Response("", { status: 500 }))
    : orig(u, o);
location.reload();
```

(Un `location.reload()` restaura el `fetch` original, así que hay que aplicar el parche desde un `beforeunload` o, más simple, recargar primero y ejecutar el parche antes de que React monte. Alternativa fiable: parar el dev server, tocar `app/api/landing-stats/route.ts` para que devuelva 500, recargar, y revertir el cambio después — **sin commitearlo**.)

Expected: las cifras salen como `—`, la nota bajo el CTA dice solo `sin cuenta` (sin `—` pegado), y ninguna frase queda falsa.

- [ ] **Step 5: `prefers-reduced-motion`**

Con `resize_window` no se puede; usar `javascript_tool` para comprobar que las reglas existen, o el emulador de Chrome DevTools vía CDP si está disponible. Como mínimo, verificar que el bloque `@media (prefers-reduced-motion: reduce)` de `BLUEPRINT_CSS` sigue cubriendo `.hero-mask > span`, `.hero-fade-up` y `.hero-panel-enter`, y que ninguna clase nueva (`.bp-hero-cta*`) introduce animación de entrada propia. Ninguna la tiene por diseño: heredan `hero-fade-up`, que ya está cubierto.

- [ ] **Step 6: Capturar la prueba**

Screenshot a 360px y a 1440px. Adjuntarlos al reporte final con `SendUserFile`.

- [ ] **Step 7: Commit de los arreglos que hayan salido**

Solo si la revisión visual obligó a tocar algo (el `max-width` del H1 es el candidato más probable):

```bash
git add -A
git commit -m "fix(landing): ajustes de la revisión visual a 360-1440px"
```

---

## Self-Review

**Cobertura de la spec:**

| Requisito | Task |
|---|---|
| T-01 CTA único + nota con cifra | 7 (steps 5, 6, 11) |
| T-02 intención sube + badge por nivel | 7 (steps 2, 7, 8) |
| T-03 S2Diagnostico comprime y baja | 4 (copy) + 7 (posición) |
| T-04 paso 04 + borrar S5Descartes | 3 |
| T-05 nota del correo fuera | 2 |
| T-06 S7Acceso + NOMBRE_POR_ID | 1 (datos) + 5 (componente) + 7 (montaje) |
| T-07 cierre → explorar + Nosotros | 6 |
| T-08 móvil (5 puntos) | 8 |
| T-09 verificación | 9 |
| H1 nombra la categoría (decisión cerrada) | 7 (step 3) |

**Riesgos conocidos, ya anotados en las tasks:**

- El `max-width: 22ch` de `.bp-h1` parte el H1 nuevo. Se sube a 30ch en la Task 7 y se confirma a ojo en la Task 9; el valor puede necesitar 34ch.
- El enlace nuevo del navbar convive con dos `margin-left:auto` en la misma fila. A 360px la barra lleva logo + estado + botón + hamburguesa; si desborda, acortar la etiqueta o el `padding` (Task 9, step 3).
- `S6Footer` pierde el enlace a `/cuenta`, pero la página sigue alcanzable desde el menú de usuario del navbar (`ACCOUNT_ITEMS`). No queda huérfana.
