// Construcción de la planta (geometría simplificada). Unidades ≈ metros. Eje x = eje del tromel, y = arriba, z = hacia el espectador.
import * as THREE from "three";
import { EQUIPOS } from "./data.js";

export const GEOM = {
  tromel: { cx: 3, cy: 3.6, r: 1.5, len: 6 },
  tolva: { x: -6.6, outletY: 2.0, topY: 4.0 },
  beltA: new THREE.Vector3(-7.2, 1.2, 0),
  beltB: new THREE.Vector3(-0.5, 4.1, 0),
  bin: { x: 2.4, z: 4.1 },
  bag: { x: 8.2, z: 2.6 },
};

const C = {
  amarillo: 0xe0a21b, azul: 0x1f5fae, verde: 0x5cb52a, naranja: 0xf08a1c,
  acero: 0x9aa1a8, aceroOscuro: 0x4b5258, hormigon: 0xb9b4a6, gris: 0xc9ccd0,
  banda: 0x1d2024, bolsa: 0xe3e0d6, panel: 0xdfe3e6,
};

function mat(color, o = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.45, ...o });
}

function perforacion() {
  const s = 128, c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d");
  g.fillStyle = "#fff"; g.fillRect(0, 0, s, s);
  g.fillStyle = "#000";
  const r = s * 0.15;
  [[s * 0.25, s * 0.25], [s * 0.75, s * 0.75], [s * 0.25 + s, s * 0.25], [s * 0.75 - s, s * 0.75]].forEach(([x, y]) => {
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  });
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

function texturaBanda() {
  const c = document.createElement("canvas");
  c.width = 64; c.height = 64;
  const g = c.getContext("2d");
  g.fillStyle = "#23272b"; g.fillRect(0, 0, 64, 64);
  g.fillStyle = "#3a4046"; g.fillRect(0, 0, 64, 8);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildPlant() {
  const root = new THREE.Group();
  const grupos = {};          // id -> THREE.Group (resaltables)
  const materiales = {};      // id -> materiales propios de ese grupo
  const oclusores = [];       // mallas que tapan marcadores
  const G = (id) => {
    const g = new THREE.Group(); g.name = "grupo_" + id; grupos[id] = g; materiales[id] = new Set(); root.add(g); return g;
  };
  const base = new THREE.Group(); root.add(base);

  const add = (grupo, mesh, id) => {
    grupo.add(mesh);
    mesh.castShadow = true; mesh.receiveShadow = true;
    if (id) materiales[id].add(mesh.material);
    oclusores.push(mesh);
    return mesh;
  };
  const box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); return o; };
  const cyl = (rt, rb, h, m, x, y, z, seg = 24) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); o.position.set(x, y, z); return o; };

  // Cada grupo con materiales propios, para resaltar sin tocar a los demás.
  const M = (id, color, o) => { const m = mat(color, o); materiales[id].add(m); return m; };

  // ---------- Hormigón ----------
  const hormigon = mat(C.hormigon, { roughness: 0.95, metalness: 0 });
  const zapata = (x, z) => add(base, box(0.95, 0.5, 0.95, hormigon, x, 0.25, z));

  // ---------- Bastidor azul del tromel ----------
  const azul = mat(C.azul, { roughness: 0.5, metalness: 0.35 });
  const { cx, cy, r, len } = GEOM.tromel;
  const x0 = cx - len / 2, x1 = cx + len / 2;
  const patasX = [x0 + 0.4, cx - 1.1, cx + 1.1, x1 - 0.4];
  [-1.8, 1.8].forEach((z) => {
    patasX.forEach((x) => { zapata(x, z); add(base, box(0.28, 1.6, 0.28, azul, x, 1.3, z)); });
    add(base, box(len + 0.8, 0.28, 0.3, azul, cx, 2.0, z));
    // diagonales
    for (let i = 0; i < patasX.length - 1; i++) {
      const a = patasX[i], b = patasX[i + 1];
      const d = new THREE.Mesh(new THREE.BoxGeometry(0.12, Math.hypot(b - a, 1.4), 0.12), azul);
      d.position.set((a + b) / 2, 1.25, z); d.rotation.z = Math.atan2(b - a, 1.4); add(base, d);
    }
  });
  patasX.forEach((x) => add(base, box(0.3, 0.28, 3.9, azul, x, 2.0, 0)));
  // apoyos del tromel (rodillos)
  const aceroOsc = mat(C.aceroOscuro, { roughness: 0.4, metalness: 0.7 });
  [cx - 1.6, cx + 1.6].forEach((x) => [-0.95, 0.95].forEach((z) => {
    const rod = cyl(0.17, 0.17, 0.5, aceroOsc, x, 2.3, z, 16); rod.rotation.x = Math.PI / 2; add(base, rod);
  }));

  // ---------- Tromel ----------
  const gT = G("tromel");
  const rot = new THREE.Group(); rot.name = "mec_tromel"; rot.position.set(cx, cy, 0); gT.add(rot);
  const perf = perforacion(); perf.repeat.set(40, 13);
  const matShell = M("tromel", 0x8d949b, { side: THREE.DoubleSide, alphaMap: perf, alphaTest: 0.5, metalness: 0.75, roughness: 0.42 });
  const shellG = new THREE.CylinderGeometry(r, r, len, 72, 1, true); shellG.rotateZ(Math.PI / 2);
  const shell = new THREE.Mesh(shellG, matShell); shell.castShadow = true; shell.receiveShadow = true; rot.add(shell);
  oclusores.push(shell);
  const matAro = M("tromel", C.aceroOscuro, { metalness: 0.7, roughness: 0.4 });
  [-len / 2 + 0.05, -len / 6, len / 6, len / 2 - 0.05].forEach((dx) => {
    const t = new THREE.Mesh(new THREE.TorusGeometry(r + 0.04, 0.1, 10, 72), matAro);
    t.rotation.y = Math.PI / 2; t.position.x = dx; t.castShadow = true; rot.add(t);
  });
  const matBarra = M("tromel", 0x6c747b, { metalness: 0.7, roughness: 0.45 });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const b = new THREE.Mesh(new THREE.BoxGeometry(len, 0.07, 0.14), matBarra);
    b.position.set(0, Math.cos(a) * (r + 0.05), Math.sin(a) * (r + 0.05)); b.rotation.x = -a; rot.add(b);
  }
  // aro azul de accionamiento en la entrada
  const aroAzul = new THREE.Mesh(new THREE.TorusGeometry(r + 0.1, 0.15, 12, 72), M("tromel", C.azul, { metalness: 0.4 }));
  aroAzul.rotation.y = Math.PI / 2; aroAzul.position.x = -len / 2 + 0.28; aroAzul.castShadow = true; rot.add(aroAzul);
  // motor del tromel
  add(gT, cyl(0.38, 0.38, 0.8, M("tromel", 0x2f7ec8, { metalness: 0.5 }), x0 + 0.9, 2.55, 1.85), "tromel").rotation.x = Math.PI / 2;
  oclusores.push(shell);

  // ---------- Tolvas grises bajo el tromel + salida de material cribado ----------
  const gC = G("cribado");
  const grisM = M("cribado", 0x8e959a, { metalness: 0.6, roughness: 0.5, side: THREE.DoubleSide });
  [x0 + 1.2, cx, x1 - 1.2].forEach((x) => {
    const g = new THREE.CylinderGeometry(1.1, 0.4, 1.0, 4, 1, true); g.rotateY(Math.PI / 4);
    const m = new THREE.Mesh(g, grisM); m.position.set(x, 1.5, 0); m.scale.set(1.15, 1, 1); add(gC, m);
  });
  const canal = (grupo, id, a, b, w, color) => {
    const dir = new THREE.Vector3().subVectors(b, a); const L = dir.length();
    const g = new THREE.Group(); g.position.copy(a).add(b).multiplyScalar(0.5); g.lookAt(b);
    const m = M(id, color, { metalness: 0.65, roughness: 0.5 });
    const f = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, L), m); g.add(f);
    [-1, 1].forEach((s) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, L), m); l.position.set(s * w / 2, 0.13, 0); g.add(l); });
    g.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; oclusores.push(o); } });
    grupo.add(g); return g;
  };
  canal(gC, "cribado", new THREE.Vector3(cx, 1.1, 0.0), new THREE.Vector3(GEOM.bin.x, 0.75, 3.3), 1.5, 0x8e959a);
  // contenedor abierto
  const bx = GEOM.bin.x, bz = GEOM.bin.z, mb = M("cribado", 0x7d858b, { metalness: 0.55, roughness: 0.6 });
  add(gC, box(3.0, 0.08, 2.4, mb, bx, 0.12, bz), "cribado");
  [[3.0, 0.7, 0.08, 0, 1.2], [3.0, 0.7, 0.08, 0, -1.2], [0.08, 0.7, 2.4, 1.5, 0], [0.08, 0.7, 2.4, -1.5, 0]]
    .forEach(([w, h, d, dx, dz]) => add(gC, box(w, h, d, mb, bx + dx, 0.45, bz + dz), "cribado"));

  // ---------- Salida de rechazo + bolsa grande ----------
  const gR = G("rechazo");
  canal(gR, "rechazo", new THREE.Vector3(x1 + 0.1, 2.15, 0.2), new THREE.Vector3(GEOM.bag.x - 0.2, 1.65, GEOM.bag.z - 0.3), 1.1, 0x8e959a);
  const mbolsa = M("rechazo", C.bolsa, { metalness: 0, roughness: 0.95, side: THREE.DoubleSide });
  const bgx = GEOM.bag.x, bgz = GEOM.bag.z;
  add(gR, box(1.5, 0.06, 1.5, mbolsa, bgx, 0.06, bgz), "rechazo");
  [[1.5, 1.45, 0.05, 0, 0.75], [1.5, 1.45, 0.05, 0, -0.75], [0.05, 1.45, 1.5, 0.75, 0], [0.05, 1.45, 1.5, -0.75, 0]]
    .forEach(([w, h, d, dx, dz]) => add(gR, box(w, h, d, mbolsa, bgx + dx, 0.78, bgz + dz), "rechazo"));

  // ---------- Plataforma de operación ----------
  const gP = G("plataforma");
  const verde = M("plataforma", C.verde, { roughness: 0.55, metalness: 0.3 });
  const naranja = M("plataforma", C.naranja, { roughness: 0.5, metalness: 0.25 });
  const px0 = 6.7, px1 = 10, pz0 = -3.4, pz1 = 0, py = 2.6;
  add(gP, box(px1 - px0, 0.12, pz1 - pz0, M("plataforma", 0xa7adb2, { metalness: 0.6 }), (px0 + px1) / 2, py, (pz0 + pz1) / 2), "plataforma");
  [pz0, pz1].forEach((z) => add(gP, box(px1 - px0, 0.22, 0.18, verde, (px0 + px1) / 2, py - 0.1, z)));
  [px0, px1].forEach((x) => add(gP, box(0.18, 0.22, pz1 - pz0, verde, x, py - 0.1, (pz0 + pz1) / 2)));
  [[px0 + 0.3, pz0 + 0.3], [px1 - 0.3, pz0 + 0.3], [px0 + 0.3, pz1 - 0.3], [px1 - 0.3, pz1 - 0.3]].forEach(([x, z]) => {
    zapata(x, z); add(gP, box(0.24, py - 0.5, 0.24, verde, x, 0.5 + (py - 0.5) / 2, z));
  });
  // barandillas (lados +x, -z, +z; el lado del tromel queda abierto)
  const rail = (ax, az, bx2, bz2) => {
    const L = Math.hypot(bx2 - ax, bz2 - az), n = Math.max(2, Math.round(L / 1.1));
    [0.55, 1.05].forEach((h) => {
      const r2 = box(L, 0.07, 0.07, naranja, (ax + bx2) / 2, py + h, (az + bz2) / 2); r2.rotation.y = -Math.atan2(bz2 - az, bx2 - ax); add(gP, r2, "plataforma");
    });
    for (let i = 0; i <= n; i++) add(gP, box(0.08, 1.1, 0.08, naranja, ax + ((bx2 - ax) * i) / n, py + 0.55, az + ((bz2 - az) * i) / n), "plataforma");
  };
  rail(px1, pz0, px1, pz1); rail(px0, pz0, px1, pz0); rail(px0 + 1.2, pz1, px1, pz1);
  // armarios de control
  const mp = M("plataforma", C.panel, { metalness: 0.3, roughness: 0.6 });
  add(gP, box(0.9, 1.3, 0.5, mp, 9.2, py + 0.75, pz0 + 0.6), "plataforma");
  add(gP, box(0.7, 0.9, 0.4, mp, 7.2, py + 0.55, pz0 + 0.5), "plataforma");

  // ---------- Tolva amarilla ----------
  const gTo = G("tolva");
  const amarillo = M("tolva", C.amarillo, { metalness: 0.35, roughness: 0.5, side: THREE.DoubleSide });
  const tg = new THREE.CylinderGeometry(2.9, 0.75, GEOM.tolva.topY - GEOM.tolva.outletY, 4, 1, true); tg.rotateY(Math.PI / 4);
  const cono = new THREE.Mesh(tg, amarillo); cono.position.set(GEOM.tolva.x, (GEOM.tolva.topY + GEOM.tolva.outletY) / 2, 0); add(gTo, cono, "tolva");
  const hs = 2.9 / Math.SQRT2, hx = GEOM.tolva.x;
  [[2 * hs, 0.12, 0.16, 0, hs], [2 * hs, 0.12, 0.16, 0, -hs], [0.16, 0.12, 2 * hs, hs, 0], [0.16, 0.12, 2 * hs, -hs, 0]]
    .forEach(([w, h, d, dx, dz]) => add(gTo, box(w, h, d, amarillo, hx + dx, GEOM.tolva.topY + 0.04, dz), "tolva"));
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    zapata(hx + sx * 1.7, sz * 1.7); add(base, box(0.26, 1.7, 0.26, azul, hx + sx * 1.7, 1.35, sz * 1.7));
  });
  [-1.7, 1.7].forEach((z) => add(base, box(3.7, 0.2, 0.2, azul, hx, 2.15, z)));
  [-1.7, 1.7].forEach((x) => add(base, box(0.2, 0.2, 3.7, azul, hx + x, 2.15, 0)));

  // ---------- Banda transportadora ----------
  const gB = G("cinta");
  const { beltA: A, beltB: B } = GEOM;
  const dir = new THREE.Vector3().subVectors(B, A), L = dir.length(), ang = Math.atan2(dir.y, dir.x);
  const belt = new THREE.Group(); belt.position.copy(A).add(B).multiplyScalar(0.5); belt.rotation.z = ang; gB.add(belt);
  const mv = M("cinta", C.verde, { roughness: 0.5, metalness: 0.3 });
  [-0.62, 0.62].forEach((z) => { const r2 = box(L, 0.5, 0.16, mv, 0, 0.1, z); r2.castShadow = r2.receiveShadow = true; belt.add(r2); oclusores.push(r2); });
  const texB = texturaBanda(); texB.repeat.set(L * 1.6, 1);
  const mBanda = new THREE.MeshStandardMaterial({ map: texB, roughness: 0.9, metalness: 0.1 });
  materiales.cinta.add(mBanda);
  const sup = box(L, 0.08, 1.1, mBanda, 0, 0.14, 0); sup.name = "mec_banda"; sup.receiveShadow = true; belt.add(sup); oclusores.push(sup);
  const inf = box(L, 0.05, 1.1, mBanda, 0, -0.14, 0); belt.add(inf);
  [-1, 1].forEach((s) => { const rol = cyl(0.22, 0.22, 1.2, M("cinta", 0x30363b, { metalness: 0.7 }), s * (L / 2 - 0.15), 0, 0, 20); rol.rotation.x = Math.PI / 2; rol.castShadow = true; belt.add(rol); });
  // motor azul en el extremo bajo
  const motor = cyl(0.36, 0.36, 0.9, M("cinta", 0x2f7ec8, { metalness: 0.5 }), A.x - 0.1, A.y - 0.05, 0.95, 20); motor.rotation.x = Math.PI / 2; add(gB, motor, "cinta");
  add(gB, box(0.6, 0.6, 0.35, M("cinta", C.panel), A.x + 0.3, 0.8, 1.25), "cinta");
  // patas verdes
  for (let i = 0; i < 5; i++) {
    const t = (i + 0.4) / 4.6, p = new THREE.Vector3().lerpVectors(A, B, Math.min(1, t));
    const h = p.y - 0.3 - 0.5;
    [-0.62, 0.62].forEach((z) => { add(gB, box(0.16, h, 0.16, mv, p.x, 0.5 + h / 2, z), "cinta"); });
    zapata(p.x, -0.62); zapata(p.x, 0.62);
  }
  // canaleta de descarga de la banda hacia la boca del tromel
  canal(gB, "cinta", new THREE.Vector3(B.x - 0.1, B.y - 0.2, 0), new THREE.Vector3(x0 + 0.7, cy - 0.6, 0), 1.1, 0x8e959a);
  // canaleta de salida de la tolva sobre la banda
  canal(gTo, "tolva", new THREE.Vector3(GEOM.tolva.x, 2.0, 0), new THREE.Vector3(GEOM.tolva.x + 0.1, 1.55, 0), 0.9, C.amarillo);

  // ---------- Operarios simplificados ----------
  const trabajador = (x, y, z, ry) => {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry;
    const cuerpo = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.85, 4, 8), mat(0x24457a, { metalness: 0.1, roughness: 0.8 })); cuerpo.position.y = 0.85;
    const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), mat(0xd6a47c, { metalness: 0, roughness: 0.8 })); cabeza.position.y = 1.58;
    const casco = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xf2c40f, { metalness: 0.1 })); casco.position.y = 1.62;
    const pierna = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.5, 0.2), mat(0x1c3560, { metalness: 0.1 })); pierna.position.y = 0.25;
    [cuerpo, cabeza, casco, pierna].forEach((m) => { m.castShadow = true; g.add(m); });
    base.add(g);
  };
  trabajador(-5.6, 0.5, 1.5, 0.6); trabajador(-8.2, 0.5, 0.2, 1.2);
  trabajador(8.4, py + 0.06, -2.2, 3.6); trabajador(4.6, 0.5, 3.4, 4.2);

  // ---------- Anclas (ver docs/CONTRATO-MODELO.md): puntos del recorrido y de los marcadores ----------
  const ancla = (n, x, y, z) => { const o = new THREE.Object3D(); o.name = n; o.position.set(x, y, z); root.add(o); };
  const dn = dir.clone().normalize(), nn = new THREE.Vector3(-dn.y, dn.x, 0);
  const enBanda = (s) => new THREE.Vector3().copy(A).addScaledVector(dn, s).addScaledVector(nn, 0.2);
  ancla("a_tolva_pila", GEOM.tolva.x, 3.3, 0);
  ancla("a_tolva_salida", GEOM.tolva.x, 2.1, 0);
  const bi = enBanda(0.8), bf = enBanda(L - 0.5);
  ancla("a_banda_ini", bi.x, bi.y, bi.z); ancla("a_banda_fin", bf.x, bf.y, bf.z);
  ancla("a_tromel_ini", x0 + 0.9, 2.4, 0); ancla("a_tromel_fin", x1 - 0.3, 2.4, 0);
  ancla("a_cribado_caida", cx, 1.3, 0.1); ancla("a_cribado_canal", GEOM.bin.x, 0.8, 3.1); ancla("a_cribado_pila", GEOM.bin.x, 0.22, GEOM.bin.z);
  ancla("a_rechazo_boca", x1 + 0.4, 2.3, 0.25); ancla("a_rechazo_canal", GEOM.bag.x - 0.3, 1.78, GEOM.bag.z - 0.3); ancla("a_rechazo_pila", GEOM.bag.x, 0.2, GEOM.bag.z);
  EQUIPOS.forEach((e) => ancla("p_" + e.id, ...e.punto));

  // Losa de la planta (solo en el modelo propio; un modelo externo trae su suelo)
  const losa = new THREE.Mesh(new THREE.BoxGeometry(22.5, 0.3, 11.5), new THREE.MeshStandardMaterial({ color: 0xdde2d3, roughness: 0.95, metalness: 0 }));
  losa.name = "suelo"; losa.position.set(0.8, -0.15, 0.9); losa.receiveShadow = true; root.add(losa);
  const borde = new THREE.LineSegments(new THREE.EdgesGeometry(losa.geometry), new THREE.LineBasicMaterial({ color: 0x13392a }));
  borde.name = "suelo_borde"; borde.position.copy(losa.position); root.add(borde);

  return root;
}
