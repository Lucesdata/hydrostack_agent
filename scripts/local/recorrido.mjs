/**
 * Recorrido de la vitrina contra el entorno local (docs/entorno-local.md).
 *
 *   scripts/local/entorno.sh dev          # en otra terminal
 *   node scripts/local/recorrido.mjs      # capturas en .local/recorrido/
 *
 * Necesita `playwright` con Chromium, que no es dependencia del repo para no
 * cargarlo en cada instalación: `npm i --no-save playwright && npx playwright
 * install chromium` la primera vez (o AQ_PLAYWRIGHT con la ruta a uno ya
 * instalado). Comprueba lo que una persona haría a mano y deja una captura de
 * cada paso; termina con código 1 si algún paso falla.
 */
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";

const { chromium } = await import(process.env.AQ_PLAYWRIGHT ?? "playwright").catch(() => {
  console.error("Falta playwright: npm i --no-save playwright && npx playwright install chromium");
  process.exit(1);
});

const BASE = process.env.AQ_URL ?? "http://localhost:3000";
const SALIDA = ".local/recorrido";
const ANA = "00000000-0000-4000-8000-00000000a001"; // con perfil
const BETO = "00000000-0000-4000-8000-00000000a002"; // sin perfil

// «Para ti», «Avisarme» y el tipo en /mis-filtros llegan con la fase 3 (#112):
// en una rama sin ella esos pasos se omiten, avisando, en vez de fallar.
const FASE3 = existsSync("src/components/secop/vitrina/EstanteParaTi.tsx");

const resultados = [];
async function paso(nombre, fn, { fase3 = false } = {}) {
  if (fase3 && !FASE3) {
    resultados.push(["omitido", nombre]);
    console.log(`– ${nombre} (omitido: llega con la fase 3, #112)`);
    return;
  }
  try {
    await fn();
    resultados.push(["ok", nombre]);
    console.log(`✓ ${nombre}`);
  } catch (e) {
    resultados.push(["falla", nombre, e.message.split("\n")[0]]);
    console.log(`✗ ${nombre}\n    ${e.message.split("\n")[0]}`);
  }
}
function exigir(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje);
}

await mkdir(SALIDA, { recursive: true });
const navegador = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {}
);

async function contexto(usuario, ancho = 1280) {
  const ctx = await navegador.newContext({
    viewport: { width: ancho, height: 900 },
    locale: "es-CO",
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(60_000);
  if (usuario) await page.goto(`${BASE}/dev/sesion?usuario=${usuario}&next=/`);
  return { ctx, page };
}
// La barra pide la sesión al montar (/api/sesion): sin esperar a la red, la
// captura puede salir con «Ingresar» aunque haya sesión.
async function foto(page, nombre) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.screenshot({ path: `${SALIDA}/${nombre}.png`, fullPage: false });
}

// 1. Anónimo
{
  const { ctx, page } = await contexto(null);
  await paso("anónimo: la vitrina carga con tarjetas", async () => {
    await page.goto(`${BASE}/licitaciones`);
    exigir((await page.locator(".vt-rejilla > li").count()) > 0, "no hay tarjetas");
    await foto(page, "01-anonimo-vitrina");
  });
  await paso("anónimo: sin estante «Para ti»", async () => {
    exigir((await page.locator(".pt-resumen").count()) === 0, "aparece «Para ti» sin sesión");
  });
  await paso("anónimo: «Guardar» bajo la tarjeta pide entrar", async () => {
    // Mientras carga el estado de la cuenta el botón es un enlace «Guardar» a
    // secas; sin sesión acaba en «Guardar · entrar».
    const enlace = page.locator(".vt-guardar a", { hasText: "Guardar · entrar" }).first();
    await enlace.waitFor();
    exigir((await enlace.getAttribute("href")).startsWith("/login"), "no lleva a /login");
    await foto(page, "02-anonimo-guardar");
  });
  await ctx.close();
}

// 1b. Un solo buscador (2026-10-05): el modal del hero, el número y Explorar
{
  const { ctx, page } = await contexto(null);
  await paso("buscador: el modal del hero lleva a la vitrina con los filtros", async () => {
    await page.goto(`${BASE}/`);
    await page.getByRole("button", { name: "Buscar procesos" }).first().click();
    await page.getByRole("button", { name: /Agua residual/ }).click();
    await page.locator("dialog select[name=actividad]").selectOption("obras");
    await page.locator("dialog form[role=search] button[type=submit]").first().click();
    await page.waitForURL(/\/licitaciones\?/);
    const url = new URL(page.url());
    exigir(url.pathname === "/licitaciones", `fue a ${url.pathname}`);
    exigir(url.searchParams.get("tipo") === "residual", `tipo=${url.searchParams.get("tipo")}`);
    exigir(url.searchParams.get("actividad") === "obras", "falta actividad");
    await foto(page, "01b-hero-a-vitrina");
  });
  await paso("buscador: por número encuentra también cerrados", async () => {
    // Un cerrado de la muestra, para que la prueba no dependa de un id fijo.
    await page.goto(`${BASE}/licitaciones/adjudicados`);
    const id = await page.locator(".vt-rejilla [data-id]").first().getAttribute("data-id");
    exigir(id, "no hay adjudicados en la muestra");
    await page.goto(`${BASE}/licitaciones?numero=${encodeURIComponent(id.toLowerCase())}`);
    await page.locator(".vt-conteo", { hasText: "abiertos y cerrados" }).waitFor();
    const primero = await page.locator(".vt-rejilla [data-id]").first().getAttribute("data-id");
    exigir(primero === id, `primero ${primero}, esperaba ${id}`);
    await foto(page, "01c-numero");
  });
  await paso("buscador: /licitaciones/explorar redirige traduciendo parámetros", async () => {
    await page.goto(`${BASE}/licitaciones/explorar?modo=tema&sistema=ptar&orden=fecha`);
    const url = new URL(page.url());
    exigir(url.pathname === "/licitaciones", `quedó en ${url.pathname}`);
    exigir(url.search === "?tipo=ptar&orden=recientes", `query ${url.search}`);
  });
  await ctx.close();
}

// 2. Ana, con perfil
{
  const { ctx, page } = await contexto(ANA);
  await paso(
    "Ana: estante «Para ti» con tarjetas",
    async () => {
      await page.goto(`${BASE}/licitaciones`);
      await page.locator(".pt-resumen").waitFor();
      const n = await page.locator(".pt-tarjeta").count();
      exigir(
        n > 0,
        `«Para ti» sin tarjetas (${await page
          .locator(".pt-vacio")
          .textContent()
          .catch(() => "")})`
      );
      await foto(page, "03-ana-para-ti");
    },
    { fase3: true }
  );
  let guardadoId;
  await paso("Ana: «Guardar» en una tarjeta pasa a «Guardado · quitar»", async () => {
    await page.goto(`${BASE}/licitaciones`);
    const boton = page.locator(".vt-guardar button", { hasText: /^Guardar$/ }).first();
    await boton.waitFor();
    guardadoId = (await boton.getAttribute("aria-label")).replace(/^Guardar /, "");
    await boton.click();
    await page.locator(".vt-guardar button", { hasText: "Guardado · quitar" }).first().waitFor();
    await foto(page, "04-ana-guardado");
  });
  await paso("Ana: el Radar abre el detalle y su «Guardar» refleja el estado", async () => {
    await page.locator(".vt-rejilla > li a.fc").nth(1).click();
    await page.locator(".vr-acciones button").first().waitFor();
    await foto(page, "05-ana-radar");
  });
  await paso("Ana: lo guardado aparece en /mis-procesos", async () => {
    await page.goto(`${BASE}/mis-procesos`);
    await page.locator("#guardados-titulo").waitFor();
    const texto = await page.locator("section[aria-labelledby=guardados-titulo]").innerText();
    exigir(texto.includes(guardadoId), `no aparece ${guardadoId}`);
    await foto(page, "06-ana-mis-procesos");
  });
  await paso(
    "Ana: «Avisarme» con tipo y departamento crea el filtro",
    async () => {
      await page.goto(`${BASE}/licitaciones?tipo=ptar&departamento=antioquia`);
      await page.locator(".va-resumen").click();
      await page.locator(".va-boton").click();
      await page.locator(".va-hecho").waitFor();
      await foto(page, "07-ana-alerta");
    },
    { fase3: true }
  );
  await paso(
    "Ana: /mis-filtros muestra el filtro con PTAR y lo conserva al pausar",
    async () => {
      await page.goto(`${BASE}/mis-filtros`);
      await page.getByText("PTAR", { exact: false }).first().waitFor();
      await page.getByRole("button", { name: "Pausar" }).first().click();
      await page.getByRole("button", { name: "Activar" }).first().waitFor();
      await page.getByRole("button", { name: "Activar" }).first().click();
      await page.getByRole("button", { name: "Pausar" }).first().waitFor();
      await page.reload();
      await page.getByText("PTAR", { exact: false }).first().waitFor();
      await foto(page, "08-ana-mis-filtros");
    },
    { fase3: true }
  );
  await ctx.close();
}

// 3. Beto, sin perfil
{
  const { ctx, page } = await contexto(BETO);
  await paso("Beto: sin perfil no hay «Para ti»", async () => {
    await page.goto(`${BASE}/licitaciones`);
    await page.locator(".vt-rejilla > li").first().waitFor();
    exigir((await page.locator(".pt-tarjeta").count()) === 0, "aparece «Para ti» sin perfil");
  });
  await ctx.close();
}

// 4. Móvil
{
  const { ctx, page } = await contexto(ANA, 390);
  await paso("móvil: tarjeta y «Guardar» sin solaparse", async () => {
    await page.goto(`${BASE}/licitaciones`);
    const li = page.locator(".vt-rejilla > li").first();
    await li.locator(".vt-guardar button, .vt-guardar a").first().waitFor();
    const tarjeta = await li.locator("a.fc").boundingBox();
    const guardar = await li.locator(".vt-guardar").boundingBox();
    exigir(guardar.y >= tarjeta.y + tarjeta.height - 1, "«Guardar» se monta sobre la tarjeta");
    await foto(page, "09-movil");
  });
  await ctx.close();
}

await navegador.close();
const fallas = resultados.filter((r) => r[0] === "falla");
const hechos = resultados.filter((r) => r[0] !== "omitido");
const omitidos = resultados.length - hechos.length;
console.log(
  `\n${hechos.length - fallas.length}/${hechos.length} pasos bien` +
    (omitidos ? ` (${omitidos} omitidos)` : "") +
    ` · capturas en ${SALIDA}/`
);
process.exitCode = fallas.length ? 1 : 0;
