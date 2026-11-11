// Genera el fondo del hero: curvas de nivel de un relieve inventado.
//
//   node scripts/portada/curvas-nivel.mjs > public/portada/hero/curvas-nivel.svg
//
// Es un dibujo original y determinístico (sin azar ni datos reales): un campo
// de alturas hecho de lomas gaussianas y dos ondas largas, cortado en isolíneas
// con «marching squares». No representa ningún territorio; es decorativo. Las
// lomas se colocan donde el hero deja aire (detrás del mapa y en las esquinas).
const W = 1600;
const H = 1000;
const PASO = 16; // lado de la celda de muestreo
const NIVELES = 17;

// [cx, cy, radio, altura]
const LOMAS = [
  [1130, 430, 330, 1.0],
  [1480, 860, 260, 0.75],
  [760, 60, 280, 0.6],
  [260, 820, 300, 0.7],
  [420, 300, 220, -0.45],
  [930, 780, 200, -0.5],
  [1560, 180, 220, 0.5],
  [60, 120, 240, 0.45],
];

function altura(x, y) {
  let h = 0.16 * Math.sin(x / 210 + 0.7) * Math.cos(y / 170 - 0.4) + 0.1 * Math.sin((x + y) / 330);
  for (const [cx, cy, r, a] of LOMAS) {
    const d2 = ((x - cx) ** 2 + (y - cy) ** 2) / (r * r);
    h += a * Math.exp(-d2);
  }
  return h;
}

const nx = Math.floor(W / PASO) + 1;
const ny = Math.floor(H / PASO) + 1;
const campo = [];
let min = Infinity;
let max = -Infinity;
for (let j = 0; j < ny; j++) {
  const fila = [];
  for (let i = 0; i < nx; i++) {
    const v = altura(i * PASO, j * PASO);
    fila.push(v);
    if (v < min) min = v;
    if (v > max) max = v;
  }
  campo.push(fila);
}

/** Los segmentos de una isolínea, celda a celda. */
function segmentos(nivel) {
  const segs = [];
  const corte = (x1, y1, v1, x2, y2, v2) => {
    const t = (nivel - v1) / (v2 - v1);
    return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t];
  };
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const x = i * PASO;
      const y = j * PASO;
      const a = campo[j][i];
      const b = campo[j][i + 1];
      const c = campo[j + 1][i + 1];
      const d = campo[j + 1][i];
      const caso =
        (a > nivel ? 8 : 0) | (b > nivel ? 4 : 0) | (c > nivel ? 2 : 0) | (d > nivel ? 1 : 0);
      if (caso === 0 || caso === 15) continue;
      const N = () => corte(x, y, a, x + PASO, y, b);
      const E = () => corte(x + PASO, y, b, x + PASO, y + PASO, c);
      const S = () => corte(x, y + PASO, d, x + PASO, y + PASO, c);
      const O = () => corte(x, y, a, x, y + PASO, d);
      const pares = {
        1: [[O, S]],
        2: [[S, E]],
        3: [[O, E]],
        4: [[N, E]],
        5: [
          [O, N],
          [S, E],
        ],
        6: [[N, S]],
        7: [[O, N]],
        8: [[O, N]],
        9: [[N, S]],
        10: [
          [N, E],
          [O, S],
        ],
        11: [[N, E]],
        12: [[O, E]],
        13: [[S, E]],
        14: [[O, S]],
      }[caso];
      for (const [p, q] of pares) segs.push([p(), q()]);
    }
  }
  return segs;
}

/** Une segmentos sueltos en polilíneas por sus extremos. */
function unir(segs) {
  const clave = ([x, y]) => `${Math.round(x * 20)},${Math.round(y * 20)}`;
  const porExtremo = new Map();
  segs.forEach((s, k) => {
    for (const p of s) {
      const c = clave(p);
      if (!porExtremo.has(c)) porExtremo.set(c, []);
      porExtremo.get(c).push(k);
    }
  });
  const usado = new Array(segs.length).fill(false);
  const lineas = [];
  const crecer = (linea, alFinal) => {
    for (;;) {
      const punta = alFinal ? linea[linea.length - 1] : linea[0];
      const k = (porExtremo.get(clave(punta)) ?? []).find((i) => !usado[i]);
      if (k == null) return;
      usado[k] = true;
      const [p, q] = segs[k];
      const otro = clave(p) === clave(punta) ? q : p;
      if (alFinal) linea.push(otro);
      else linea.unshift(otro);
    }
  };
  segs.forEach((s, k) => {
    if (usado[k]) return;
    usado[k] = true;
    const linea = [s[0], s[1]];
    crecer(linea, true);
    crecer(linea, false);
    lineas.push(linea);
  });
  return lineas;
}

/** Douglas–Peucker: menos puntos, misma forma. */
function simplificar(pts, tol) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  let lejos = 0;
  let idx = 0;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const largo = Math.hypot(dx, dy) || 1;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs(dy * (pts[i][0] - a[0]) - dx * (pts[i][1] - a[1])) / largo;
    if (d > lejos) [lejos, idx] = [d, i];
  }
  if (lejos <= tol) return [a, b];
  return [
    ...simplificar(pts.slice(0, idx + 1), tol).slice(0, -1),
    ...simplificar(pts.slice(idx), tol),
  ];
}

const n = (v) => String(Math.round(v));
/** B-spline cuadrática por puntos medios: `T` reutiliza el control reflejado. */
function trazo(pts) {
  if (pts.length < 3) return "";
  const medio = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const m0 = medio(pts[0], pts[1]);
  let d = `M${n(m0[0])} ${n(m0[1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const m = medio(pts[i], pts[i + 1]);
    d +=
      i === 1 ? `Q${n(pts[i][0])} ${n(pts[i][1])} ${n(m[0])} ${n(m[1])}` : `T${n(m[0])} ${n(m[1])}`;
  }
  return d;
}

const finas = [];
const maestras = [];
for (let k = 1; k <= NIVELES; k++) {
  const nivel = min + ((max - min) * k) / (NIVELES + 1);
  for (const linea of unir(segmentos(nivel))) {
    // Las isolíneas diminutas (una loma de dos celdas) solo ensucian.
    if (linea.length < 14) continue;
    // Un anillo cerrado empieza y acaba en el mismo punto: se simplifica por
    // mitades, o Douglas–Peucker lo reduciría a ese único punto.
    const cerrada = Math.hypot(linea[0][0] - linea.at(-1)[0], linea[0][1] - linea.at(-1)[1]) < 1;
    const mitad = linea.length >> 1;
    const pts = cerrada
      ? [
          ...simplificar(linea.slice(0, mitad + 1), 1.6).slice(0, -1),
          ...simplificar(linea.slice(mitad), 1.6),
        ]
      : simplificar(linea, 1.6);
    if (pts.length < 3) continue;
    // Para que el trazo cierre, se repiten los dos primeros puntos al final.
    if (cerrada) pts.push(pts[1], pts[2]);
    // Cada cuarta curva es «maestra», como en una carta topográfica.
    (k % 4 === 0 ? maestras : finas).push(trazo(pts));
  }
}

process.stdout.write(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" fill="none" stroke="#7fd4ff" stroke-linecap="round">` +
    `<path stroke-width="1" stroke-opacity=".5" d="${finas.join("")}"/>` +
    `<path stroke-width="1.6" stroke-opacity=".9" d="${maestras.join("")}"/>` +
    `</svg>\n`
);
