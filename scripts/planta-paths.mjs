// scripts/planta-paths.mjs
// Uso:
//   node scripts/planta-paths.mjs --strip-bg entrada.png public/planta-tratamiento.png
//   node scripts/planta-paths.mjs public/planta-tratamiento.png src/components/landing/plantaPaths.js
import fs from "node:fs";
import { PNG } from "pngjs";

const args = process.argv.slice(2);

function read(p) {
  return PNG.sync.read(fs.readFileSync(p));
}

/* ── Modo 1: quitar fondo blanco y recortar ─────────────────────────────── */
if (args[0] === "--strip-bg") {
  const src = read(args[1]);
  const { width: W, height: H, data } = src;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const mn = Math.min(r, g, b), mx = Math.max(r, g, b);
    if (mn > 243 && mx - mn < 12) data[i + 3] = 0;
  }
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (data[(y * W + x) * 4 + 3] > 10) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  const out = new PNG({ width: x1 - x0 + 1, height: y1 - y0 + 1 });
  PNG.bitblt(src, out, x0, y0, out.width, out.height, 0, 0);
  fs.writeFileSync(args[2], PNG.sync.write(out));
  console.log("recortado a", out.width + "x" + out.height, "(se espera 1021x759)");
  process.exit(0);
}

/* ── Modo 2: extraer paths de agua y ventanas ───────────────────────────── */
const png = read(args[0]);
const { width: W, height: H, data } = png;
console.log("imagen", W + "x" + H);

// Runs horizontales -> un solo path SVG (rectángulos de 1px de alto, fusionados verticalmente).
function runsToPath(rows) {
  const runs = [];
  for (const [y, xs] of rows) {
    xs.sort((a, b) => a - b);
    let s = xs[0], prev = xs[0];
    for (let k = 1; k <= xs.length; k++) {
      if (k === xs.length || xs[k] !== prev + 1) { runs.push([s, y, prev - s + 1]); s = xs[k]; }
      prev = xs[k];
    }
  }
  const used = new Array(runs.length).fill(false);
  let d = "";
  for (let i = 0; i < runs.length; i++) {
    if (used[i]) continue;
    let [x, y, w] = runs[i], h = 1; used[i] = true;
    for (let j = i + 1; j < runs.length; j++) {
      if (used[j]) continue;
      const [x2, y2, w2] = runs[j];
      if (y2 === y + h && x2 === x && w2 === w) { used[j] = true; h++; }
      else if (y2 > y + h) break;
    }
    d += `M${x} ${y}h${w}v${h}h${-w}z`;
  }
  return d;
}

const at = (x, y) => (y * W + x) * 4;

// A) Agua de los tanques de aireación (zona central-baja, debajo del 2º clarificador).
const waterRows = [];
for (let y = 276; y < 450; y++) {
  const xs = [];
  for (let x = 260; x < 640; x++) {
    const i = at(x, y);
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (data[i + 3] > 200 && b > 110 && b - r > 25 && g >= r - 10 && b > g - 5) xs.push(x);
  }
  if (xs.length) waterRows.push([y, xs]);
}
const WATER_CLIP = runsToPath(waterRows);

// B) Ventanas encendidas (amarillo) de los dos edificios, como componentes conexos.
const isY = (i) =>
  data[i + 3] > 200 && data[i] > 195 && data[i + 1] > 140 && data[i + 1] < 215 &&
  data[i + 2] < 130 && data[i] - data[i + 2] > 90;

const seen = new Uint8Array(W * H);
const windows = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const p = y * W + x;
  if (seen[p] || !isY(p * 4)) continue;
  const stack = [p], px = []; seen[p] = 1;
  while (stack.length) {
    const q = stack.pop(); px.push(q);
    const qx = q % W, qy = (q - qx) / W;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = qx + dx, ny = qy + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const np = ny * W + nx;
      if (!seen[np] && isY(np * 4)) { seen[np] = 1; stack.push(np); }
    }
  }
  if (px.length < 18) continue;
  const xs = px.map((q) => q % W), ys = px.map((q) => (q - (q % W)) / W);
  const bx = Math.min(...xs), by = Math.min(...ys);
  // Solo los dos edificios de oficinas; descarta la maquinaria roja y los paneles sueltos.
  const edificioA = bx > 260 && bx < 360 && by > 140 && by < 240;
  const edificioB = bx > 380 && bx < 580 && by > 470 && by < 580;
  if (!edificioA && !edificioB) continue;
  const rows = new Map();
  px.forEach((q) => { const x2 = q % W, y2 = (q - x2) / W; if (!rows.has(y2)) rows.set(y2, []); rows.get(y2).push(x2); });
  windows.push(runsToPath([...rows.entries()].sort((a, b) => a[0] - b[0])));
}
console.log("ventanas detectadas:", windows.length, "(se esperan ~22)");

fs.writeFileSync(
  args[1],
  "// GENERADO por scripts/planta-paths.mjs — no editar a mano.\n" +
    "// Recórrelo de nuevo si cambia public/planta-tratamiento.png\n\n" +
    "export const WATER_CLIP = " + JSON.stringify(WATER_CLIP) + ";\n\n" +
    "export const WINDOWS = " + JSON.stringify(windows) + ";\n"
);
console.log("escrito", args[1]);
