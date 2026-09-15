/**
 * Guardarraíl: el layout raíz no puede leer la sesión en el servidor.
 *
 * ── Qué desastre evita ──────────────────────────────────────────────────────
 * El 2026-09-15 se desplegó un `app/layout.js` que llamaba a
 * `getSessionDisplayUser()` para pintar el Navbar. Como el layout envuelve TODAS
 * las páginas, ese `cookies()` arrastró a dinámicas las rutas facetadas —que se
 * declaran estáticas a propósito— y las 43 devolvieron 500 en producción:
 * "Page changed from static to dynamic at runtime ... reason: cookies".
 *
 * ── Por qué un test que lee el archivo, y no uno normal ─────────────────────
 * Porque NINGUNA de las puertas existentes lo vio: 933 tests en verde,
 * `prettier --check` limpio, `npm run build` sin una queja, `tsc --noEmit` sin
 * errores y el preview de Vercel sirviendo esas mismas rutas en 200. El fallo
 * solo aparece al pedir una ruta `●` en un build de producción con caché frío,
 * que es precisamente lo que un `next build` no hace.
 *
 * Así que la única defensa automatizable es estructural: mirar qué importa el
 * layout. Es tosco, pero es la diferencia entre enterarse aquí o en producción.
 *
 * Si algún día hace falta sesión en el servidor para todo el sitio, la respuesta
 * NO es relajar este test: es que las rutas facetadas dejen de ser estáticas, y
 * esa es una decisión de coste que se toma a propósito, no de refilón.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const RAIZ = process.cwd();

/**
 * Se compara contra el CÓDIGO, no contra la prosa.
 *
 * El layout lleva un comentario que explica por qué no debe llamar a `cookies()`
 * — y sin quitar comentarios, esa explicación hace fallar al test que la
 * defiende. Un guardarraíl que castiga documentar el guardarraíl acaba
 * borrándose, no respetándose.
 */
function soloCodigo(fuente: string): string {
  return fuente.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** Módulos que acaban llamando a `cookies()` y por tanto vuelven dinámico al que los use. */
const IMPORTS_PROHIBIDOS = ["supabase/server", "get-session-user", "next/headers"];

describe("app/layout.js — el layout raíz no lee la sesión en servidor", () => {
  const layout = soloCodigo(readFileSync(join(RAIZ, "app/layout.js"), "utf8"));

  for (const prohibido of IMPORTS_PROHIBIDOS) {
    it(`no importa "${prohibido}"`, () => {
      const importa = new RegExp(
        `import[^;]*from\\s*["'][^"']*${prohibido.replace("/", "\\/")}`
      ).test(layout);

      expect(
        importa,
        `app/layout.js importa "${prohibido}", que usa cookies(). Eso vuelve ` +
          `dinámicas TODAS las páginas, y las rutas facetadas (que son ● a ` +
          `propósito) fallarán en producción con 500 "static to dynamic at ` +
          `runtime". La sesión del Navbar se pide desde el cliente a /api/sesion.`
      ).toBe(false);
    });
  }

  it("no llama a cookies() ni resuelve la sesión al renderizar", () => {
    expect(layout).not.toMatch(/\bcookies\s*\(/);
    expect(layout).not.toMatch(/getSessionDisplayUser|getSessionUser/);
  });
});
