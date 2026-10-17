// Escena Three.js: renderer, cámara, controles, resaltado y proyección de los marcadores HTML.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { crearLote } from "./lote.js";

const OBJETIVO = new THREE.Vector3(1.2, 2.3, 0.4); // se sustituye por el centro del modelo
const DIR_3D = new THREE.Vector3(13, 11, 19).normalize(); // un modelo puede cambiarla con «camara.dir» en su mapa
const DIR_PLANTA = new THREE.Vector3(0.0, 1, 0.14).normalize();
const RESALTE = new THREE.Color(0x35d07f);

export function webglDisponible() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch { return false; }
}

export function crearEscena({ host, equipos, marcadores, reducirMovimiento, pedirCuadro, planta }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.prepend(renderer.domElement);

  const escena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  escena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  escena.add(new THREE.HemisphereLight(0xffffff, 0xc9cdbd, 0.55));
  const sol = new THREE.DirectionalLight(0xfff6e6, 2.2);
  sol.position.set(10, 22, 12);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  Object.assign(sol.shadow.camera, { left: -17, right: 17, top: 14, bottom: -14, near: 1, far: 60 });
  sol.shadow.bias = -0.0004; sol.shadow.normalBias = 0.03;
  escena.add(sol);

  escena.add(planta.root);
  OBJETIVO.copy(planta.encuadre.centro);
  if (planta.camara && planta.camara.dir) DIR_3D.set(...planta.camara.dir).normalize();
  // Losa de apoyo (recibe sombras) si el modelo no trae suelo propio
  if (!planta.tieneSuelo) {
    const { tam, centro } = planta.encuadre, margen = 1.6;
    const losa = new THREE.Mesh(new THREE.BoxGeometry(tam.x + margen * 2, 0.3, tam.z + margen * 2), new THREE.MeshStandardMaterial({ color: 0xdde2d3, roughness: 0.95, metalness: 0 }));
    losa.position.set(centro.x, -0.15, centro.z); losa.receiveShadow = true; escena.add(losa);
    const borde = new THREE.LineSegments(new THREE.EdgesGeometry(losa.geometry), new THREE.LineBasicMaterial({ color: 0x13392a }));
    borde.position.copy(losa.position); escena.add(borde);
  }
  const lote = crearLote(escena, planta.anclas, planta.parametros);
  // Las sombras abarcan el modelo, sea cual sea su tamaño
  const radio = Math.max(planta.encuadre.tam.x, planta.encuadre.tam.z) * 0.75;
  Object.assign(sol.shadow.camera, { left: -radio, right: radio, top: radio * 0.85, bottom: -radio * 0.85, far: radio * 4 });
  sol.position.set(radio * 0.5, radio * 1.1, radio * 0.6).add(OBJETIVO); sol.target.position.copy(OBJETIVO); escena.add(sol.target);
  sol.shadow.camera.updateProjectionMatrix();

  const camara = new THREE.PerspectiveCamera(20, 1, 0.5, 300);
  const controles = new OrbitControls(camara, renderer.domElement);
  Object.assign(controles, { enableDamping: true, dampingFactor: 0.09, enablePan: false, rotateSpeed: 0.7, zoomSpeed: 0.8, autoRotateSpeed: 1.2, minDistance: 22, minPolarAngle: 0.02, maxPolarAngle: 1.42 });
  controles.target.copy(OBJETIVO);
  controles.addEventListener("change", () => { camaraMovida = true; pedirCuadro(); });
  controles.addEventListener("start", () => { tween = null; vistaInicial = false; });

  let distBase = 30, vistaInicial = true, camaraMovida = true, tween = null, modo = "3d";
  const raycaster = new THREE.Raycaster();
  const tmp = new THREE.Vector3(), ndc = new THREE.Vector3();
  let ancho = 1, alto = 1;

  // En escritorio la escena ocupa todo el hero por detrás del texto: la planta se desplaza a la derecha con un desplazamiento de vista.
  const escritorio = window.matchMedia("(min-width: 1001px)");
  const REGION = 0.6, DESPLAZA_X = 0.185, DESPLAZA_Y = -0.1;
  function calcularDistancia() {
    const anchoUtil = escritorio.matches ? ancho * REGION : ancho;
    const asp = anchoUtil / alto;
    const ancho3d = planta.encuadre.ancho * (escritorio.matches ? 1 : 0.99);
    distBase = Math.max(ancho3d * 1.7, ancho3d / (Math.tan(THREE.MathUtils.degToRad(camara.fov / 2)) * 2 * asp));
    controles.maxDistance = distBase * 1.35;
    controles.minDistance = ancho3d * 1.05;
  }
  function colocar(dir, dist) {
    camara.position.copy(OBJETIVO).addScaledVector(dir, dist);
    controles.target.copy(OBJETIVO); controles.update(); camaraMovida = true;
  }
  function irA(dir, dist, dur = 0.7) {
    const hasta = new THREE.Vector3().copy(OBJETIVO).addScaledVector(dir, dist);
    if (reducirMovimiento || dur === 0) { tween = null; colocar(dir, dist); pedirCuadro(); return; }
    tween = { desde: camara.position.clone(), hasta, t: 0, dur };
    pedirCuadro();
  }

  function ajustar() {
    const r = host.getBoundingClientRect();
    ancho = Math.max(1, Math.round(r.width)); alto = Math.max(1, Math.round(r.height));
    renderer.setSize(ancho, alto, false);
    camara.aspect = ancho / alto;
    if (escritorio.matches) camara.setViewOffset(ancho, alto, -ancho * DESPLAZA_X, -alto * DESPLAZA_Y, ancho, alto); else camara.clearViewOffset();
    camara.updateProjectionMatrix();
    calcularDistancia();
    if (vistaInicial) colocar(modo === "3d" ? DIR_3D : DIR_PLANTA, distBase * (modo === "3d" ? 1 : 0.95));
    camaraMovida = true; pedirCuadro();
  }
  const ro = new ResizeObserver(ajustar); ro.observe(host);
  ajustar();

  const grupoIds = Object.keys(planta.grupos);
  const emisivo = {};
  function resaltar(valores) {
    grupoIds.forEach((id) => {
      const v = valores[id] || 0;
      if (emisivo[id] === v) return; emisivo[id] = v;
      planta.materiales[id].forEach((m) => { m.emissive.copy(RESALTE); m.emissiveIntensity = v; });
    });
  }

  function proyectarMarcadores() {
    const mover = camaraMovida, cajas = [];
    equipos.forEach((e) => {
      const el = marcadores[e.id]; if (!el) return;
      tmp.set(...(planta.puntos[e.id] || e.punto));
      ndc.copy(tmp).project(camara);
      const fuera = ndc.z > 1 || Math.abs(ndc.x) > 1.02 || Math.abs(ndc.y) > 1.02;
      el.hidden = fuera;
      if (fuera) return;
      const px = ((ndc.x + 1) / 2) * ancho, py = ((1 - ndc.y) / 2) * alto;
      el.style.transform = `translate(${px}px, ${py}px)`;
      el.dataset.lado = px > ancho * 0.8 ? "izq" : "der";
      // La etiqueta de texto se omite si choca con otra ya colocada (queda el número)
      const w = (e.corto.length * 7.4 + 22), x0 = el.dataset.lado === "izq" ? px - 40 - w : px + 40;
      const caja = [x0, py - 14, x0 + w, py + 14];
      const choca = cajas.some((c) => caja[0] < c[2] && caja[2] > c[0] && caja[1] < c[3] && caja[3] > c[1]);
      el.dataset.sinEtq = choca ? "true" : "false";
      if (!choca) cajas.push(caja);
      if (mover) {
        const dir = tmp.clone().sub(camara.position), dist = dir.length();
        raycaster.set(camara.position, dir.normalize()); raycaster.far = dist;
        const hit = raycaster.intersectObjects(planta.oclusores, false)[0];
        el.dataset.ocluido = hit && hit.distance < dist - 0.45 ? "true" : "false";
      }
    });
  }

  let ultimoT = -1;
  return {
    host,
    // Un cuadro. Devuelve true si debe seguir dibujando.
    dibujar({ T, tMec, resaltos, autoRotar }, dt) {
      let sigue = false;
      if (tween) {
        tween.t += dt / tween.dur;
        const u = Math.min(1, tween.t), e = u * u * (3 - 2 * u);
        camara.position.lerpVectors(tween.desde, tween.hasta, e);
        camaraMovida = true;
        if (u >= 1) tween = null; else sigue = true;
      }
      controles.autoRotate = autoRotar && !reducirMovimiento;
      controles.enableDamping = !controles.autoRotate; // sin inercia residual al pausar la autorrotación
      const cambio = controles.update(dt);
      if (cambio || controles.autoRotate) sigue = true;

      if (T !== ultimoT) { lote.update(T); ultimoT = T; }
      const ciclo = Math.max(0, tMec - 5.6);
      planta.girar(-0.9 * ciclo);
      if (planta.texBanda) planta.texBanda.offset.x = -1.4 * ciclo;
      resaltar(resaltos);

      renderer.render(escena, camara);
      proyectarMarcadores(); camaraMovida = false;
      return sigue;
    },
    zoom(f) {
      const dir = camara.position.clone().sub(controles.target);
      const d = THREE.MathUtils.clamp(dir.length() * f, controles.minDistance, controles.maxDistance);
      vistaInicial = false;
      tween = { desde: camara.position.clone(), hasta: controles.target.clone().addScaledVector(dir.normalize(), d), t: 0, dur: reducirMovimiento ? 0.001 : 0.25 };
      pedirCuadro();
    },
    vistaInicial() { vistaInicial = true; modo = "3d"; irA(DIR_3D, distBase); },
    vista(m) { modo = m; vistaInicial = true; irA(m === "3d" ? DIR_3D : DIR_PLANTA, distBase * (m === "3d" ? 1 : 0.95)); },
    forzarProyeccion() { camaraMovida = true; },
    // Para pruebas automáticas
    _debug: { camara, controles, planta },
    dispose() { ro.disconnect(); controles.dispose(); renderer.dispose(); },
  };
}
