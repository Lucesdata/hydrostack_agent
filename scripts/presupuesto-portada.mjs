// Presupuesto de peso de la portada. Corre después de `next build` (en CI, en
// el job `lint`) y falla si la portada engorda más de lo acordado.
//
// Mide solo lo que controlamos y no depende de la red ni de una base:
//   · JavaScript de primera carga de "/" (gzip, lo que baja el navegador).
//   · Fuentes que la portada precarga (<link rel="preload"> en su HTML).
//
// LCP y CLS no se miden aquí: necesitan un navegador y varían entre máquinas.
// La referencia medida con Lighthouse (móvil simulado, mediana de 3) el
// 2026-09-26 fue rendimiento 96, LCP 2,7 s, CLS 0, 289 KiB — ver PENDIENTES §45.
// Si subir un límite es la decisión correcta, se sube aquí con su porqué.
import { readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";

const PRESUPUESTO = {
  /**
   * Medido: 126,7 kB (Next imprime ~121 kB con su propio criterio de gzip).
   * Subido de 125 a 128 kB el 2026-11-12 con el rediseño «carta hidrográfica»
   * del hero (#183/#184): ~2,5 kB de código de cliente pedido por el usuario
   * (cifras que cuentan, inclinación del mapa hacia el puntero, baliza del
   * proceso activo, barra que cambia al desplazar). Antes del rediseño eran
   * 124,2 kB; un import de `escena.js` que arrastraba los GeoJSON del mapa
   * llegó a sumar 14 kB y se arregló (`src/lib/mapa/viewbox.ts`), no se
   * absorbió en el límite. Quedan 1,3 kB de margen: la próxima subida debe
   * justificarse igual.
   */
  jsPrimeraCarga: 128 * 1024,
  /** Medido: 89,1 kB — Inter (47) y JetBrains Mono 400/500 (42). */
  fuentesPrecargadas: 100 * 1024,
};

const kb = (n) => `${(n / 1024).toFixed(1)} kB`;

const manifiesto = JSON.parse(readFileSync(".next/app-build-manifest.json", "utf8")).pages;
const js = [...new Set([...(manifiesto["/layout"] ?? []), ...(manifiesto["/page"] ?? [])])].filter(
  (f) => f.endsWith(".js")
);
if (js.length === 0) throw new Error("No se encontró la portada en app-build-manifest.json");
const jsGzip = js.reduce((t, f) => t + gzipSync(readFileSync(`.next/${f}`)).length, 0);

const html = readFileSync(".next/server/app/index.html", "utf8");
const fuentes = [
  ...html.matchAll(/rel="preload" href="\/_next\/(static\/media\/[^"]+\.woff2)"/g),
].map((m) => m[1]);
const fuentesBytes = fuentes.reduce((t, f) => t + statSync(`.next/${f}`).size, 0);

const filas = [
  ["JS de primera carga (gzip)", jsGzip, PRESUPUESTO.jsPrimeraCarga],
  [`Fuentes precargadas (${fuentes.length})`, fuentesBytes, PRESUPUESTO.fuentesPrecargadas],
];

let excedido = false;
for (const [nombre, valor, limite] of filas) {
  const ok = valor <= limite;
  excedido ||= !ok;
  console.log(`${ok ? "✓" : "✗"} ${nombre}: ${kb(valor)} de ${kb(limite)}`);
}
if (excedido) {
  console.error("\nLa portada supera su presupuesto de peso (scripts/presupuesto-portada.mjs).");
  process.exit(1);
}
