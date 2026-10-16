// Carga y adaptación del modelo de la planta. Contrato de nombres: docs/CONTRATO-MODELO.md
//
// El resto de la escena (recorrido del lote, resaltado, marcadores, mecanismos) solo habla con la
// "planta adaptada" que devuelve adaptar(); no sabe si viene de un .glb o de la geometría de código.
import * as THREE from "three";
import { EQUIPOS } from "./data.js";

export const GRUPOS = EQUIPOS.map((e) => e.id); // tolva, cinta, tromel, cribado, plataforma, rechazo
export const ANCLAS_REQUERIDAS = [
  "a_tolva_pila", "a_tolva_salida", "a_banda_ini", "a_banda_fin", "a_tromel_ini", "a_tromel_fin",
  "a_cribado_caida", "a_cribado_canal", "a_cribado_pila", "a_rechazo_boca", "a_rechazo_canal", "a_rechazo_pila",
];

// Los nombres de nodo que lee three.js están saneados (sin puntos ni espacios); se comparan igual.
const san = (n) => THREE.PropertyBinding.sanitizeNodeName(n);

function mundo(root, nombre) {
  const o = root.getObjectByName(san(nombre));
  return o ? o.getWorldPosition(new THREE.Vector3()) : null;
}

export function adaptar(root, { origen }) {
  root.updateMatrixWorld(true);
  const informe = { origen, errores: [], avisos: [], mallas: 0, triangulos: 0 };

  // Grupos resaltables
  const grupos = {}, materiales = {};
  GRUPOS.forEach((id) => {
    const nodo = root.getObjectByName(san("grupo_" + id));
    if (!nodo) { informe.errores.push(`Falta el nodo «grupo_${id}»`); return; }
    grupos[id] = nodo; materiales[id] = new Set();
    // Materiales propios por grupo (con cache por material de origen): resaltar uno no toca al resto.
    const copias = new Map();
    nodo.traverse((o) => {
      if (!o.isMesh) return;
      const lista = Array.isArray(o.material) ? o.material : [o.material];
      const nuevos = lista.map((m) => {
        if (!("emissive" in m)) { informe.avisos.push(`«${o.name}» usa un material sin emisivo: no se resaltará`); return m; }
        if (!copias.has(m)) { const c = m.clone(); copias.set(m, c); materiales[id].add(c); }
        return copias.get(m);
      });
      o.material = Array.isArray(o.material) ? nuevos : nuevos[0];
    });
  });

  // Anclas
  const anclas = {};
  ANCLAS_REQUERIDAS.forEach((n) => {
    const p = mundo(root, n);
    if (!p) informe.errores.push(`Falta el ancla «${n}»`); else anclas[n.slice(2)] = p;
  });
  const puntos = {};
  EQUIPOS.forEach((e) => {
    const p = mundo(root, "p_" + e.id);
    if (p) puntos[e.id] = p.toArray(); else informe.avisos.push(`Sin «p_${e.id}»: el marcador usa la posición por defecto`);
  });

  // Mecanismos
  const rot = root.getObjectByName(san("mec_tromel")) || null;
  if (!rot) informe.avisos.push("Sin «mec_tromel»: el tromel no girará");
  const banda = root.getObjectByName(san("mec_banda")) || null;
  let texBanda = null;
  if (banda && banda.isMesh) {
    const m = Array.isArray(banda.material) ? banda.material[0] : banda.material;
    texBanda = m && m.map ? m.map : null;
    if (texBanda) texBanda.wrapS = texBanda.wrapT = THREE.RepeatWrapping;
    else informe.avisos.push("«mec_banda» no tiene textura (map): la banda no se animará");
  } else informe.avisos.push("Sin «mec_banda»: la banda no se animará");

  // Mallas, sombras y oclusores (el suelo no tapa marcadores ni cuenta para el encuadre)
  const oclusores = [], caja = new THREE.Box3();
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true;
    informe.mallas++;
    const g = o.geometry; informe.triangulos += g.index ? g.index.count / 3 : g.attributes.position.count / 3;
    if (!/^suelo/.test(o.name)) { oclusores.push(o); caja.expandByObject(o); }
  });
  if (!oclusores.length) informe.errores.push("El modelo no contiene mallas");
  if (informe.triangulos > 300000) informe.avisos.push(`Modelo pesado (${Math.round(informe.triangulos / 1000)}k triángulos): puede ir lento en móvil`);

  // Encuadre automático a partir del volumen del modelo
  const tam = caja.getSize(new THREE.Vector3()), centro = caja.getCenter(new THREE.Vector3());
  const encuadre = { centro, ancho: Math.max(tam.x, tam.z) * 1.1, tam };
  if (!isFinite(tam.x) || tam.x < 3 || tam.x > 200) informe.errores.push(`Tamaño del modelo fuera de rango (${tam.x.toFixed(2)} m en X): ¿unidades en metros?`);

  return { root, grupos, materiales, oclusores, rot, texBanda, anclas, puntos, encuadre, informe, esExterno: origen === "glb" };
}

// Intenta cargar un .glb; si no existe o no cumple el contrato, usa la planta de código.
export async function cargarPlanta({ ruta, construirPropia }) {
  if (!ruta) return adaptar(construirPropia(), { origen: "procedural" });
  try {
    const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
    const gltf = await new GLTFLoader().loadAsync(ruta);
    const planta = adaptar(gltf.scene, { origen: "glb" });
    if (planta.informe.errores.length) throw new Error("El modelo no cumple el contrato:\n - " + planta.informe.errores.join("\n - "));
    planta.informe.url = ruta;
    if (planta.informe.avisos.length) console.warn("[biosfera] avisos del modelo:\n - " + planta.informe.avisos.join("\n - "));
    return planta;
  } catch (err) {
    console.warn("[biosfera] no se pudo usar «" + ruta + "»; se usa la planta de respaldo.", err.message || err);
    const planta = adaptar(construirPropia(), { origen: "procedural" });
    planta.informe.motivoRespaldo = err.message || String(err);
    return planta;
  }
}
