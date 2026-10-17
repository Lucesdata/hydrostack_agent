// Lote ilustrativo: tierra (terrones oscuros y redondeados) y fragmentos metálicos (láminas claras y brillantes).
// La posición de cada pieza es una función pura del tiempo del recorrido T: permite pausar, revisar un paso y reiniciar sin estado oculto.
// Las dos corrientes de salida son una VISUALIZACIÓN CONCEPTUAL: no afirman ningún mecanismo de separación.
import * as THREE from "three";

const N_TIERRA = 170;
const N_METAL = 70;

function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const ease = { lin: (u) => u, in: (u) => u * u, out: (u) => 1 - (1 - u) * (1 - u) };

const viasDe = (A, pref) =>
  Object.keys(A)
    .filter((n) => n.startsWith(pref + "_via"))
    .sort()
    .map((n) => A[n]);
const tramo = (a, b, vel = 2.0, min = 0.6, max = 3) =>
  Math.min(max, Math.max(min, a.distanceTo(b) / vel));

function construir(tipo, rand, idx, total, A, P) {
  const k = P.escala; // 1 = planta de respaldo; un modelo más pequeño usa un valor menor
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  // pila dentro de la tolva
  const ang = rand() * Math.PI * 2,
    rr = Math.sqrt(rand()) * 0.9 * k;
  const pila = v(
    A.tolva_pila.x + Math.cos(ang) * rr,
    A.tolva_pila.y + (0.25 - 0.55 * (rr / (0.9 * k)) + rand() * 0.18) * k,
    A.tolva_pila.z + Math.sin(ang) * rr
  );
  const d = 0.3 + (idx / total) * 4.6 + rand() * 0.3; // inicio de la caída
  const liberar = 6.0 + rand() * 3.6; // sale hacia la banda
  const zl = (rand() - 0.5) * 0.72 * k;
  const z = (rand() - 0.5) * 0.9 * k;
  const sal = A.tolva_salida,
    bi = A.banda_ini,
    bf = A.banda_fin,
    ti = A.tromel_ini,
    tf = A.tromel_fin;
  const seg = [
    {
      p: v(sal.x + (rand() - 0.5) * 0.2 * k, sal.y, sal.z + (rand() - 0.5) * 0.2 * k),
      dur: 0.8,
      m: "in",
    },
    { p: v(bi.x, bi.y, bi.z + zl), dur: 0.5, m: "in" },
    { p: v(bf.x, bf.y, bf.z + zl), dur: 6.0, m: "lin" },
    { p: v(ti.x, ti.y, ti.z + z), dur: 0.8, m: "in" },
  ];
  const mont = (c, rx, rz, alt) => {
    const a = rand() * Math.PI * 2,
      r = Math.sqrt(rand());
    return v(
      c.x + Math.cos(a) * r * rx * k,
      c.y + alt * k * (1 - r) + rand() * 0.05 * k,
      c.z + Math.sin(a) * r * rz * k
    );
  };
  const tramos = (desde, lista) =>
    lista.forEach((p) => {
      seg.push({ p, dur: tramo(desde.p || desde, p), m: "lin" });
      desde = p;
    });
  if (tipo === "tierra") {
    const cai = A.cribado_caida,
      can = A.cribado_canal;
    const xs = ti.x + (tf.x - ti.x) * (0.3 + rand() * 0.25);
    seg.push({ p: v(xs, ti.y, ti.z + z), dur: 2.3 + rand() * 0.3, m: "tumble" });
    const caida = v(xs, cai.y, cai.z);
    seg.push({ p: caida, dur: 0.6, m: "in" });
    const lat = (xs - cai.x) * 0.8;
    const camino = [...viasDe(A, "cribado"), can].map((q) =>
      v(q.x + (q === can ? lat : 0), q.y, q.z + (rand() - 0.5) * 0.2 * k)
    );
    tramos(caida, camino);
    seg.push({ p: mont(A.cribado_pila, 1.2, 0.9, 0.38), dur: 0.5, m: "in" });
  } else {
    const bo = A.rechazo_boca,
      can = A.rechazo_canal;
    seg.push({ p: v(tf.x, tf.y, tf.z + z), dur: 3.9 + rand() * 0.3, m: "tumble" });
    const boca = v(bo.x, bo.y, bo.z);
    seg.push({ p: boca, dur: 0.5, m: "in" });
    const camino = [...viasDe(A, "rechazo"), can].map((q) =>
      v(q.x + (rand() - 0.5) * 0.3 * k, q.y, q.z + (q === can ? 0 : (rand() - 0.5) * 0.12 * k))
    );
    tramos(boca, camino);
    seg.push({ p: mont(A.rechazo_pila, 0.55, 0.55, 0.45), dur: 0.5, m: "in" });
  }
  return {
    tipo,
    pila,
    spawnY: A.tolva_pila.y + 5.5 * k,
    d,
    liberar,
    seg,
    fase: rand() * 6.28,
    giro: new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(4),
    rot0: new THREE.Euler(rand() * 6, rand() * 6, rand() * 6),
    s: (tipo === "tierra" ? 0.7 + rand() * 0.7 : 0.8 + rand() * 0.6) * k,
    forma: new THREE.Vector3(1 + rand() * 0.6, 0.35 + rand() * 0.5, 0.8 + rand() * 0.6),
    salto: 0.3 * k,
    ondula: 0.22 * k,
  };
}

export function crearLote(escena, anclas, parametros = {}) {
  const P = { escala: 1, ...parametros };
  const rand = rng(20261016);
  const piezas = [];
  for (let i = 0; i < N_TIERRA; i++) piezas.push(construir("tierra", rand, i, N_TIERRA, anclas, P));
  for (let i = 0; i < N_METAL; i++) piezas.push(construir("metal", rand, i, N_METAL, anclas, P));
  // el metal llega algo disperso entre la tierra: se mezclan los instantes de caída
  const tierra = piezas.filter((p) => p.tipo === "tierra"),
    metal = piezas.filter((p) => p.tipo === "metal");

  const gT = new THREE.DodecahedronGeometry(0.17, 0);
  const mT = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });
  const iT = new THREE.InstancedMesh(gT, mT, tierra.length);
  const gM = new THREE.BoxGeometry(0.3, 0.3, 0.3);
  const mM = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.28,
    metalness: 0.95,
    flatShading: true,
  });
  const iM = new THREE.InstancedMesh(gM, mM, metal.length);
  const cT = [0x4e3320, 0x6a4628, 0x7b5733, 0x5c3d24, 0x3f2a1a].map((c) => new THREE.Color(c));
  const cM = [0xd7dbe0, 0xb4bcc6, 0xeef0f2, 0x9aa5b1, 0xc8ccd2].map((c) => new THREE.Color(c));
  tierra.forEach((p, i) => iT.setColorAt(i, cT[Math.floor(rand() * cT.length)]));
  metal.forEach((p, i) => iM.setColorAt(i, cM[Math.floor(rand() * cM.length)]));
  [iT, iM].forEach((m) => {
    m.castShadow = true;
    m.frustumCulled = false;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    escena.add(m);
  });

  const o = new THREE.Object3D(),
    tmp = new THREE.Vector3(),
    q = new THREE.Euler();

  function posicion(p, T, out) {
    if (T < p.d) return false;
    const caida = 1.1;
    if (T < p.d + caida) {
      const u = (T - p.d) / caida;
      out.set(p.pila.x, p.spawnY + (p.pila.y - p.spawnY) * ease.in(u), p.pila.z);
      return true;
    }
    if (T < p.liberar) {
      out.copy(p.pila);
      return true;
    }
    let t = T - p.liberar,
      prev = p.pila;
    for (const s of p.seg) {
      if (t <= s.dur) {
        const u = t / s.dur,
          e = ease[s.m === "tumble" ? "lin" : s.m](u);
        out.lerpVectors(prev, s.p, e);
        if (s.m === "tumble") {
          const k = Math.max(1, Math.round(s.dur * 1.3));
          out.y += p.salto * Math.abs(Math.sin(u * Math.PI * k + p.fase * 0));
          out.z += p.ondula * Math.sin(u * Math.PI * 2 + p.fase);
        }
        return true;
      }
      t -= s.dur;
      prev = s.p;
    }
    out.copy(prev);
    return true;
  }

  function aplicar(inst, lista, T) {
    lista.forEach((p, i) => {
      if (!posicion(p, T, tmp)) {
        o.scale.setScalar(0);
        o.position.set(0, -10, 0);
      } else {
        o.position.copy(tmp);
        const mov =
          T > p.liberar && T < p.liberar + p.seg.reduce((a, s) => a + s.dur, 0) ? T - p.liberar : 0;
        q.set(p.rot0.x + p.giro.x * mov, p.rot0.y + p.giro.y * mov, p.rot0.z + p.giro.z * mov);
        o.rotation.copy(q);
        if (p.tipo === "tierra") o.scale.setScalar(p.s);
        else o.scale.set(p.forma.x * p.s, p.forma.y * p.s, p.forma.z * p.s);
      }
      o.updateMatrix();
      inst.setMatrixAt(i, o.matrix);
    });
    inst.instanceMatrix.needsUpdate = true;
  }

  return {
    update(T) {
      aplicar(iT, tierra, T);
      aplicar(iM, metal, T);
    },
    meshes: [iT, iM],
  };
}
