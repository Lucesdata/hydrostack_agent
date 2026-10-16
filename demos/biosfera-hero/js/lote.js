// Lote ilustrativo: tierra (terrones oscuros y redondeados) y fragmentos metálicos (láminas claras y brillantes).
// La posición de cada pieza es una función pura del tiempo del recorrido T: permite pausar, revisar un paso y reiniciar sin estado oculto.
// Las dos corrientes de salida son una VISUALIZACIÓN CONCEPTUAL: no afirman ningún mecanismo de separación.
import * as THREE from "three";
import { GEOM } from "./machinery.js";

const N_TIERRA = 170;
const N_METAL = 70;

function rng(seed) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const ease = { lin: (u) => u, in: (u) => u * u, out: (u) => 1 - (1 - u) * (1 - u) };

function construir(tipo, rand, idx, total) {
  const { tromel: T, tolva: H, beltA: A, beltB: B, bin, bag } = GEOM;
  const x0 = T.cx - T.len / 2, x1 = T.cx + T.len / 2;
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  // pila dentro de la tolva
  const ang = rand() * Math.PI * 2, rr = Math.sqrt(rand()) * 0.9;
  const pila = v(H.x + Math.cos(ang) * rr, 3.55 - 0.55 * (rr / 0.9) + rand() * 0.18, Math.sin(ang) * rr);
  const d = 0.3 + (idx / total) * 4.6 + rand() * 0.3;              // inicio de la caída
  const liberar = 6.0 + rand() * 3.6;                                // sale hacia la banda
  const dir = new THREE.Vector3().subVectors(B, A).normalize();
  const n = new THREE.Vector3(-dir.y, dir.x, 0);
  const zl = (rand() - 0.5) * 0.72;
  const enBanda = (s) => v(0, 0, zl).add(new THREE.Vector3().copy(A).addScaledVector(dir, s).addScaledVector(n, 0.2));
  const Lb = B.distanceTo(A);
  const z = (rand() - 0.5) * 0.9;
  const seg = [
    { p: v(H.x + (rand() - 0.5) * 0.2, 2.1, (rand() - 0.5) * 0.2), dur: 0.8, m: "in" },
    { p: enBanda(0.8), dur: 0.5, m: "in" },
    { p: enBanda(Lb - 0.5), dur: 6.0, m: "lin" },
    { p: v(x0 + 0.9, 2.4, z), dur: 0.8, m: "in" },
  ];
  const mont = (cx, cz, rx, rz, y0, alt) => {
    const a = rand() * Math.PI * 2, r = Math.sqrt(rand());
    return v(cx + Math.cos(a) * r * rx, y0 + alt * (1 - r) + rand() * 0.05, cz + Math.sin(a) * r * rz);
  };
  if (tipo === "tierra") {
    const xs = 2.3 + rand() * 1.2;
    seg.push({ p: v(xs, 2.4, z), dur: 2.3 + rand() * 0.3, m: "tumble" });
    seg.push({ p: v(xs, 1.3, 0.1), dur: 0.6, m: "in" });
    seg.push({ p: v(bin.x + (xs - 3) * 0.8, 0.8, 3.1), dur: 1.4, m: "lin" });
    seg.push({ p: mont(bin.x, bin.z, 1.2, 0.9, 0.22, 0.38), dur: 0.5, m: "in" });
  } else {
    seg.push({ p: v(x1 - 0.3, 2.4, z), dur: 3.9 + rand() * 0.3, m: "tumble" });
    seg.push({ p: v(x1 + 0.4, 2.3, 0.25), dur: 0.5, m: "in" });
    seg.push({ p: v(bag.x - 0.3 + (rand() - 0.5) * 0.3, 1.78, bag.z - 0.3), dur: 1.2, m: "lin" });
    seg.push({ p: mont(bag.x, bag.z, 0.55, 0.55, 0.2, 0.45), dur: 0.5, m: "in" });
  }
  return { tipo, pila, d, liberar, seg, fase: rand() * 6.28, giro: new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(4), rot0: new THREE.Euler(rand() * 6, rand() * 6, rand() * 6),
    s: tipo === "tierra" ? 0.7 + rand() * 0.7 : 0.8 + rand() * 0.6, forma: new THREE.Vector3(1 + rand() * 0.6, 0.35 + rand() * 0.5, 0.8 + rand() * 0.6) };
}

export function crearLote(escena) {
  const rand = rng(20261016);
  const piezas = [];
  for (let i = 0; i < N_TIERRA; i++) piezas.push(construir("tierra", rand, i, N_TIERRA));
  for (let i = 0; i < N_METAL; i++) piezas.push(construir("metal", rand, i, N_METAL));
  // el metal llega algo disperso entre la tierra: se mezclan los instantes de caída
  const tierra = piezas.filter((p) => p.tipo === "tierra"), metal = piezas.filter((p) => p.tipo === "metal");

  const gT = new THREE.DodecahedronGeometry(0.17, 0);
  const mT = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, flatShading: true });
  const iT = new THREE.InstancedMesh(gT, mT, tierra.length);
  const gM = new THREE.BoxGeometry(0.3, 0.3, 0.3);
  const mM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.28, metalness: 0.95, flatShading: true });
  const iM = new THREE.InstancedMesh(gM, mM, metal.length);
  const cT = [0x4e3320, 0x6a4628, 0x7b5733, 0x5c3d24, 0x3f2a1a].map((c) => new THREE.Color(c));
  const cM = [0xd7dbe0, 0xb4bcc6, 0xeef0f2, 0x9aa5b1, 0xc8ccd2].map((c) => new THREE.Color(c));
  tierra.forEach((p, i) => iT.setColorAt(i, cT[Math.floor(rand() * cT.length)]));
  metal.forEach((p, i) => iM.setColorAt(i, cM[Math.floor(rand() * cM.length)]));
  [iT, iM].forEach((m) => { m.castShadow = true; m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); escena.add(m); });

  const o = new THREE.Object3D(), tmp = new THREE.Vector3(), q = new THREE.Euler();

  function posicion(p, T, out) {
    if (T < p.d) return false;
    const caida = 1.1;
    if (T < p.d + caida) {
      const u = (T - p.d) / caida;
      out.set(p.pila.x, 8 + (p.pila.y - 8) * ease.in(u), p.pila.z); return true;
    }
    if (T < p.liberar) { out.copy(p.pila); return true; }
    let t = T - p.liberar, prev = p.pila;
    for (const s of p.seg) {
      if (t <= s.dur) {
        const u = t / s.dur, e = ease[s.m === "tumble" ? "lin" : s.m](u);
        out.lerpVectors(prev, s.p, e);
        if (s.m === "tumble") {
          const k = Math.max(1, Math.round(s.dur * 1.3));
          out.y += 0.3 * Math.abs(Math.sin(u * Math.PI * k + p.fase * 0));
          out.z += 0.22 * Math.sin(u * Math.PI * 2 + p.fase);
        }
        return true;
      }
      t -= s.dur; prev = s.p;
    }
    out.copy(prev); return true;
  }

  function aplicar(inst, lista, T) {
    lista.forEach((p, i) => {
      if (!posicion(p, T, tmp)) { o.scale.setScalar(0); o.position.set(0, -10, 0); }
      else {
        o.position.copy(tmp);
        const mov = T > p.liberar && T < p.liberar + p.seg.reduce((a, s) => a + s.dur, 0) ? T - p.liberar : 0;
        q.set(p.rot0.x + p.giro.x * mov, p.rot0.y + p.giro.y * mov, p.rot0.z + p.giro.z * mov);
        o.rotation.copy(q);
        if (p.tipo === "tierra") o.scale.setScalar(p.s);
        else o.scale.set(p.forma.x * p.s, p.forma.y * p.s, p.forma.z * p.s);
      }
      o.updateMatrix(); inst.setMatrixAt(i, o.matrix);
    });
    inst.instanceMatrix.needsUpdate = true;
  }

  return {
    update(T) { aplicar(iT, tierra, T); aplicar(iM, metal, T); },
    meshes: [iT, iM],
  };
}
