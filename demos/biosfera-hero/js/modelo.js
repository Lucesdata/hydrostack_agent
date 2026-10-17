// Carga y adaptación del modelo de la planta. Contrato de nombres: docs/CONTRATO-MODELO.md
//
// El resto de la escena (recorrido del lote, resaltado, marcadores, mecanismos) solo habla con la
// "planta adaptada" que devuelve adaptar(); no sabe si viene de un .glb o de la geometría de código.
import * as THREE from "three";
import { EQUIPOS } from "./data.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export const GRUPOS = EQUIPOS.map((e) => e.id); // tolva, cinta, tromel, cribado, plataforma, rechazo
export const ANCLAS_REQUERIDAS = [
  "a_tolva_pila",
  "a_tolva_salida",
  "a_banda_ini",
  "a_banda_fin",
  "a_tromel_ini",
  "a_tromel_fin",
  "a_cribado_caida",
  "a_cribado_canal",
  "a_cribado_pila",
  "a_rechazo_boca",
  "a_rechazo_canal",
  "a_rechazo_pila",
];

// Los nombres de nodo que lee three.js están saneados (sin puntos ni espacios); se comparan igual.
const san = (n) => THREE.PropertyBinding.sanitizeNodeName(n);

function mundo(root, nombre) {
  const o = root.getObjectByName(san(nombre));
  return o ? o.getWorldPosition(new THREE.Vector3()) : null;
}

// Aplica un mapa de nodos (JSON) que traduce los nombres de un modelo ajeno al contrato:
// agrupa nodos en grupo_*, marca el nodo que gira, crea anclas y puntos por coordenadas mundo.
function aplicarMapa(root, mapa, informe) {
  root.updateMatrixWorld(true);
  const todos = [];
  root.traverse((o) => {
    if (o !== root) todos.push(o);
  });
  const buscar = (sel) => {
    if (typeof sel === "string") {
      const o = root.getObjectByName(san(sel));
      if (!o) informe.avisos.push(`Mapa: no existe el nodo «${sel}»`);
      return o ? [o] : [];
    }
    const ambito = sel.en ? root.getObjectByName(san(sel.en)) : root;
    if (!ambito) {
      informe.avisos.push(`Mapa: no existe el ámbito «${sel.en}»`);
      return [];
    }
    const re = new RegExp(sel.re),
      res = [];
    if (sel.nivel === 1) return ambito.children.filter((o) => re.test(o.name));
    ambito.traverse((o) => {
      if (o !== ambito && re.test(o.name)) res.push(o);
    });
    return res;
  };
  const resolver = (lista) => {
    const set = new Set(lista.flatMap(buscar));
    return [...set].filter((o) => {
      for (let p = o.parent; p && p !== root; p = p.parent) if (set.has(p)) return false;
      return true;
    });
  };
  for (const [id, sels] of Object.entries(mapa.grupos || {})) {
    const g = new THREE.Group();
    g.name = san("grupo_" + id);
    root.add(g);
    const nodos = resolver(sels);
    if (!nodos.length) informe.avisos.push(`Mapa: el grupo «${id}» no encontró nodos`);
    nodos.forEach((n) => g.attach(n));
  }
  (mapa.ocultar || []).forEach((sel) =>
    resolver([sel]).forEach((n) => {
      n.visible = false;
    })
  );
  if (mapa.mecanismos?.tromel) {
    const n = root.getObjectByName(san(mapa.mecanismos.tromel));
    if (n) n.name = "mec_tromel";
    else informe.avisos.push("Mapa: no existe el nodo del tromel");
  }
  if (mapa.mecanismos?.banda) {
    const n = root.getObjectByName(san(mapa.mecanismos.banda));
    if (n) n.name = "mec_banda";
  }
  const ancla = (pref, tabla) =>
    Object.entries(tabla || {}).forEach(([n, c]) => {
      const o = new THREE.Object3D();
      o.name = san(pref + n);
      o.position.set(...c);
      root.add(o);
    });
  ancla("a_", mapa.anclas);
  ancla("p_", mapa.puntos);
  root.updateMatrixWorld(true);
}

// Une las mallas estáticas de cada grupo por material: menos llamadas de dibujo sin cambiar el aspecto.
function fusionar(root, grupos, rot, informe) {
  let antes = 0,
    despues = 0;
  for (const g of Object.values(grupos)) {
    const porMat = new Map();
    g.traverse((o) => {
      if (!o.isMesh || Array.isArray(o.material) || o.isSkinnedMesh) return;
      for (let p = o.parent; p; p = p.parent) if (p === rot) return;
      if (/^mec_/.test(o.name)) return;
      antes++;
      if (!porMat.has(o.material)) porMat.set(o.material, []);
      porMat.get(o.material).push(o);
    });
    for (const [mat, mallas] of porMat) {
      const geos = mallas.map((m) => {
        // Atributos a Float32 (los modelos comprimidos vienen cuantizados) y solo posición y normal
        const ge = new THREE.BufferGeometry();
        for (const n of ["position", "normal"]) {
          const a = m.geometry.attributes[n];
          if (!a) continue;
          const f = new Float32Array(a.count * 3);
          for (let i = 0; i < a.count; i++) {
            f[i * 3] = a.getX(i);
            f[i * 3 + 1] = a.getY(i);
            f[i * 3 + 2] = a.getZ(i);
          }
          ge.setAttribute(n, new THREE.BufferAttribute(f, 3));
        }
        if (m.geometry.index) ge.setIndex(m.geometry.index.clone());
        ge.applyMatrix4(m.matrixWorld);
        if (!ge.attributes.normal) ge.computeVertexNormals();
        return ge.index ? ge.toNonIndexed() : ge;
      });
      const union = mergeGeometries(geos);
      if (!union) continue;
      mallas.forEach((m) => m.parent.remove(m));
      const fusion = new THREE.Mesh(union, mat);
      fusion.name = "fusion_" + g.name;
      g.add(fusion);
      despues++;
    }
  }
  informe.fusion = { antes, despues };
}

export function adaptar(root, { origen, mapa }) {
  root.updateMatrixWorld(true);
  const informe = { origen, errores: [], avisos: [], mallas: 0, triangulos: 0 };
  if (mapa) aplicarMapa(root, mapa, informe);

  // Grupos resaltables
  const grupos = {},
    materiales = {};
  GRUPOS.forEach((id) => {
    const nodo = root.getObjectByName(san("grupo_" + id));
    if (!nodo) {
      informe.errores.push(`Falta el nodo «grupo_${id}»`);
      return;
    }
    grupos[id] = nodo;
    materiales[id] = new Set();
    // Materiales propios por grupo (con cache por material de origen): resaltar uno no toca al resto.
    const copias = new Map();
    nodo.traverse((o) => {
      if (!o.isMesh) return;
      const lista = Array.isArray(o.material) ? o.material : [o.material];
      const nuevos = lista.map((m) => {
        if (!("emissive" in m)) {
          informe.avisos.push(`«${o.name}» usa un material sin emisivo: no se resaltará`);
          return m;
        }
        if (!copias.has(m)) {
          const c = m.clone();
          copias.set(m, c);
          materiales[id].add(c);
        }
        return copias.get(m);
      });
      o.material = Array.isArray(o.material) ? nuevos : nuevos[0];
    });
  });

  // Anclas
  const anclas = {};
  ANCLAS_REQUERIDAS.forEach((n) => {
    const p = mundo(root, n);
    if (!p) informe.errores.push(`Falta el ancla «${n}»`);
    else anclas[n.slice(2)] = p;
  });
  root.traverse((o) => {
    if (/^a_(cribado|rechazo)_via\d+$/.test(o.name))
      anclas[o.name.slice(2)] = o.getWorldPosition(new THREE.Vector3());
  });
  const puntos = {};
  EQUIPOS.forEach((e) => {
    const p = mundo(root, "p_" + e.id);
    if (p) puntos[e.id] = p.toArray();
    else informe.avisos.push(`Sin «p_${e.id}»: el marcador usa la posición por defecto`);
  });

  // Mecanismos
  const rot = root.getObjectByName(san("mec_tromel")) || null;
  if (!rot) informe.avisos.push("Sin «mec_tromel»: el tromel no girará");
  const qBase = rot ? rot.quaternion.clone() : null,
    ejeX = new THREE.Vector3(1, 0, 0),
    qGiro = new THREE.Quaternion();
  const girar = (ang) => {
    if (rot) rot.quaternion.copy(qBase).multiply(qGiro.setFromAxisAngle(ejeX, ang));
  };
  if (mapa && mapa.fusionar !== false) fusionar(root, grupos, rot, informe);
  const banda = root.getObjectByName(san("mec_banda")) || null;
  let texBanda = null;
  if (banda && banda.isMesh) {
    const m = Array.isArray(banda.material) ? banda.material[0] : banda.material;
    texBanda = m && m.map ? m.map : null;
    if (texBanda) texBanda.wrapS = texBanda.wrapT = THREE.RepeatWrapping;
    else informe.avisos.push("«mec_banda» no tiene textura (map): la banda no se animará");
  } else informe.avisos.push("Sin «mec_banda»: la banda no se animará");

  // Mallas, sombras y oclusores (el suelo no tapa marcadores ni cuenta para el encuadre)
  const oclusores = [],
    oclusoresTodos = [],
    caja = new THREE.Box3();
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    informe.mallas++;
    const g = o.geometry;
    informe.triangulos += g.index ? g.index.count / 3 : g.attributes.position.count / 3;
    oclusoresTodos.push(o);
    if (!/^suelo/.test(o.name)) {
      oclusores.push(o);
      caja.expandByObject(o);
    }
  });
  if (!oclusores.length) informe.errores.push("El modelo no contiene mallas");
  if (informe.triangulos > 300000)
    informe.avisos.push(
      `Modelo pesado (${Math.round(informe.triangulos / 1000)}k triángulos): puede ir lento en móvil`
    );

  // Encuadre automático a partir del volumen del modelo
  const tam = caja.getSize(new THREE.Vector3()),
    centro = caja.getCenter(new THREE.Vector3());
  const encuadre = { centro, ancho: Math.max(tam.x, tam.z) * 1.1, tam };
  if (!isFinite(tam.x) || tam.x < 3 || tam.x > 200)
    informe.errores.push(
      `Tamaño del modelo fuera de rango (${tam.x.toFixed(2)} m en X): ¿unidades en metros?`
    );

  return {
    root,
    grupos,
    materiales,
    oclusores,
    rot,
    girar,
    texBanda,
    anclas,
    puntos,
    encuadre,
    informe,
    parametros: (mapa && mapa.parametros) || {},
    nota: (mapa && mapa.nota) || "",
    camara: (mapa && mapa.camara) || null,
    tieneSuelo: oclusoresTodos.some((o) => /^suelo/.test(o.name)),
    esExterno: origen === "glb",
  };
}

// Intenta cargar un .glb; si no existe o no cumple el contrato, usa la planta de código.
export async function cargarPlanta({ ruta, mapa: rutaMapa, construirPropia }) {
  if (!ruta) return adaptar(construirPropia(), { origen: "procedural" });
  try {
    const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
      import("three/addons/loaders/GLTFLoader.js"),
      import("three/addons/libs/meshopt_decoder.module.js"),
    ]);
    const cargador = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    let gltf;
    if (/\.glb\.js$/.test(ruta)) {
      // Alojamientos que no sirven .glb: el modelo viaja como módulo JS con el binario en base64 (export default)
      const b64 = (await import(new URL(ruta, document.baseURI).href)).default;
      gltf = await cargador.parseAsync(
        Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer,
        ""
      );
    } else gltf = await cargador.loadAsync(ruta);
    const mapa = rutaMapa ? await (await fetch(rutaMapa)).json() : null;
    const planta = adaptar(gltf.scene, { origen: "glb", mapa });
    if (planta.informe.errores.length)
      throw new Error(
        "El modelo no cumple el contrato:\n - " + planta.informe.errores.join("\n - ")
      );
    planta.informe.url = ruta;
    if (planta.informe.avisos.length)
      console.warn("[biosfera] avisos del modelo:\n - " + planta.informe.avisos.join("\n - "));
    return planta;
  } catch (err) {
    console.warn(
      "[biosfera] no se pudo usar «" + ruta + "»; se usa la planta de respaldo.",
      err.message || err
    );
    const planta = adaptar(construirPropia(), { origen: "procedural" });
    planta.informe.motivoRespaldo = err.message || String(err);
    return planta;
  }
}
