/**
 * Saca el mapa a una imagen para poder MIRARLO, que es lo único que descubre
 * que una isla se dibuja fuera de su recuadro o que la leyenda envuelve mal.
 * `getComputedStyle` no ve formas feas.
 *
 *   npx tsx --tsconfig scripts/exploration/tsconfig.render.json \
 *     scripts/exploration/render-mapa.tsx /tmp/mapa.html
 *   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless \
 *     --screenshot=/tmp/mapa.png --window-size=520,780 file:///tmp/mapa.html
 *
 * El tsconfig aparte existe porque tsx compila el JSX con el runtime clásico y
 * los componentes del producto usan el automático.
 *
 * Los conteos son los reales medidos el 2026-09-22 con `medir-departamentos.ts`.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import ColombiaChoropleth from "@/src/components/mapa/ColombiaChoropleth";
import { ESTILOS_MAPA } from "@/src/components/mapa/estilos";
import { slugificar, type FilaAgregado } from "@/src/lib/secop/agregados";

// Los conteos reales medidos en la base viva el 2026-09-22.
const CRUDO: Array<[string, string, number]> = [
  ["05", "Antioquia", 5155],
  ["25", "Cundinamarca", 3357],
  ["11", "Bogotá D.C.", 2658],
  ["76", "Valle del Cauca", 2346],
  ["17", "Caldas", 1747],
  ["68", "Santander", 1709],
  ["41", "Huila", 1293],
  ["52", "Nariño", 1240],
  ["19", "Cauca", 1000],
  ["50", "Meta", 821],
  ["47", "Magdalena", 810],
  ["66", "Risaralda", 800],
  ["20", "Cesar", 799],
  ["73", "Tolima", 708],
  ["63", "Quindío", 708],
  ["86", "Putumayo", 659],
  ["15", "Boyacá", 643],
  ["85", "Casanare", 635],
  ["13", "Bolívar", 541],
  ["70", "Sucre", 386],
  ["18", "Caquetá", 353],
  ["54", "Norte de Santander", 339],
  ["95", "Guaviare", 249],
  ["23", "Córdoba", 224],
  ["08", "Atlántico", 220],
  ["44", "La Guajira", 147],
  ["81", "Arauca", 121],
  ["88", "Archipiélago de San Andrés, Providencia y Santa Catalina", 81],
  ["91", "Amazonas", 53],
  ["27", "Chocó", 26],
  ["94", "Guainía", 8],
  ["97", "Vaupés", 3],
  ["99", "Vichada", 1],
];

const filas: FilaAgregado[] = CRUDO.map(([clave, label, n]) => ({
  clave,
  label,
  slug: slugificar(label),
  n,
}));

const markup = renderToStaticMarkup(<ColombiaChoropleth filas={filas} totalAbiertos={35518} />);

const html = `<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="file://${process.cwd()}/app/globals.css">
<style>${ESTILOS_MAPA}</style>
<body style="background:var(--bg);margin:0;padding:20px;font-family:system-ui">
<div style="max-width:460px">${markup}</div>
</body>`;

writeFileSync(process.argv[2], html);
console.log("markup:", markup.length, "bytes | paths:", (markup.match(/<path/g) ?? []).length);
