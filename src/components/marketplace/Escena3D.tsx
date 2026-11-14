"use client";

/**
 * El mapa 3D del hero (SPEC Fase 4 §6). Three.js directo, sin R3F.
 *
 * Decisiones que se ven en el código:
 * - **Canvas transparente** (`alpha`, clear en 0): el mapa flota sobre el fondo
 *   del hero; no hay caja, borde ni sombra rectangular.
 * - **Se dibuja bajo demanda**, no en bucle: un cuadro al cambiar cámara,
 *   tamaño, datos o selección, y los que dure cada transición (≤ 350 ms). Sin
 *   giro continuo ni autoplay.
 * - **Cámara ortográfica oblicua** (35° desde la vertical), con zoom limitado a
 *   1–2,5 ×. La rueda solo hace zoom con Ctrl/⌘ y el canvas deja pasar el
 *   desplazamiento vertical del tacto (`touch-action: pan-y`).
 * - Geometría por DIVIPOLA desde `geometria3d()`: cada objeto sabe su código.
 *   Los marcadores son **agregados por departamento**; ninguno afirma el lugar
 *   de una obra (la fuente publica la sede de la entidad).
 * - Se libera todo al desmontar y se avisa si el contexto WebGL se pierde, para
 *   que el padre vuelva al mapa 2D.
 *
 * Es decorativo para tecnologías de asistencia (`aria-hidden`): los controles
 * HTML del padre ofrecen la misma selección.
 */

import { useEffect, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { geometria3d, type Poligono } from "@/src/lib/marketplace/geometria3d";
import s from "./marketplace.module.css";

export interface RegionEscena {
  codigo: string;
  nombre: string;
  total: number;
}

export interface EscenaHandle {
  acercar(): void;
  alejar(): void;
  restablecer(): void;
  girar?(): void;
}

interface Props {
  regiones: RegionEscena[];
  seleccionCodigo: string | null;
  onSeleccionar: (codigo: string) => void;
  /** WebGL no disponible, o el contexto se perdió: el padre muestra el 2D. */
  onFallo: () => void;
  /** Primer cuadro dibujado: el padre ya puede ocultar el 2D. */
  onLista: () => void;
  /**
   * Los controles HTML del padre mandan por aquí. Una referencia en una prop y
   * no `ref`: `next/dynamic` no reenvía `ref` al componente cargado.
   */
  controles: MutableRefObject<EscenaHandle | null>;
  /** Visor sin coropleta: muestra geografía y habilita giro por pasos. */
  exploracionTerritorial?: boolean;
}

const INCLINACION = (35 * Math.PI) / 180;
const PROFUNDIDAD = 5;
const ELEVACION_SELECCION = 3.5;
const ZOOM_MIN = 1;
const ZOOM_MAX = 2.5;
const PASO_ZOOM = 1.35;
const DUR_SELECCION = 220;
const DUR_CAMARA = 350;

const COLOR = {
  vacio: new THREE.Color("#0b1c2c"),
  bajo: new THREE.Color("#14405f"),
  territorio: new THREE.Color("#235776"),
  alto: new THREE.Color("#2a8fbf"),
  seleccion: new THREE.Color("#f0bb68"),
  lado: new THREE.Color("#0a1826"),
  linea: new THREE.Color("#67c6ef"),
};

const facil = (t: number) => 1 - Math.pow(1 - t, 3);

function colorDe(total: number, maximo: number, seleccionado: boolean): THREE.Color {
  if (seleccionado) return COLOR.seleccion;
  if (total <= 0) return COLOR.vacio;
  return COLOR.bajo.clone().lerp(COLOR.alto, Math.sqrt(total / Math.max(1, maximo)));
}

function formaDe(p: Poligono): THREE.Shape {
  // La forma vive en XY y se acuesta con rotateX(-90°): y = -z (el sur es +z).
  const [exterior, ...huecos] = p;
  const forma = new THREE.Shape(exterior.map(([x, z]) => new THREE.Vector2(x, -z)));
  for (const h of huecos)
    forma.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z))));
  return forma;
}

interface Grupo {
  codigo: string;
  nombre: string;
  raiz: THREE.Group;
  material: THREE.MeshStandardMaterial;
  marcador: THREE.Mesh | null;
  elevacion: number;
  centro: [number, number];
  rotulo: HTMLDivElement | null;
}

interface Tween {
  t0: number;
  dur: number;
  aplicar: (p: number) => void;
}

export default function Escena3D(props: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const etiqueta = useRef<HTMLDivElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const api = useRef<{
    aplicarDatos: () => void;
    zoom: (factor: number) => void;
    restablecer: () => void;
  } | null>(null);

  useEffect(() => {
    const host = contenedor.current;
    if (!host) return undefined;

    const exploracionTerritorial = propsRef.current.exploracionTerritorial;
    const profundidad = exploracionTerritorial ? 19 : PROFUNDIDAD;
    const quieto = exploracionTerritorial && window.matchMedia("(prefers-reduced-motion: reduce)");
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
      if (!renderer.getContext()) throw new Error("sin contexto");
    } catch (error) {
      if (exploracionTerritorial) console.warn("[mapa-3d] WebGL no disponible", error);
      propsRef.current.onFallo();
      return undefined;
    }
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    const canvas = renderer.domElement;
    canvas.className = s.canvas3d;
    host.prepend(canvas);

    const geo = geometria3d();
    const escena = new THREE.Scene();
    escena.add(new THREE.AmbientLight(0xffffff, 0.85));
    const sol = new THREE.DirectionalLight(0xdff2ff, 1.25);
    sol.position.set(-180, 320, -140);
    escena.add(sol);

    const camara = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 3000);
    const distancia = 900;
    const inclinacion = exploracionTerritorial ? Math.PI / 4 : INCLINACION;

    const materialLado = new THREE.MeshStandardMaterial({
      color: exploracionTerritorial ? 0xffffff : COLOR.lado,
      vertexColors: exploracionTerritorial,
      roughness: exploracionTerritorial ? 0.36 : 0.95,
      metalness: exploracionTerritorial ? 0.22 : 0.05,
    });
    const materialLinea = new THREE.LineBasicMaterial({
      color: COLOR.linea,
      transparent: true,
      opacity: exploracionTerritorial ? 0.8 : 0.5,
    });
    const materialBordeSuperior = new THREE.LineBasicMaterial({
      color: "#8ce9fa",
      transparent: true,
      opacity: 0.66,
    });
    const baseVidrio = new THREE.Color("#081725");
    const bordeVidrio = new THREE.Color("#368fa8");
    const tonoVidrio = new THREE.Color();
    const materialMarcador = new THREE.MeshBasicMaterial({ color: COLOR.linea });
    const materialMarcadorSel = new THREE.MeshBasicMaterial({ color: COLOR.seleccion });
    const geoMarcador = new THREE.SphereGeometry(1, 16, 12);

    const geometrias: THREE.BufferGeometry[] = [geoMarcador];
    const grupos = new Map<string, Grupo>();
    const seleccionables: THREE.Object3D[] = [];

    for (const t of geo.territorios) {
      const material = new THREE.MeshStandardMaterial({
        color: COLOR.vacio,
        roughness: exploracionTerritorial ? 0.32 : 0.85,
        metalness: exploracionTerritorial ? 0.14 : 0.08,
        emissive: exploracionTerritorial ? "#163c50" : "#000000",
        emissiveIntensity: 0.3,
      });
      const raiz = new THREE.Group();
      for (const p of t.poligonos) {
        if (p[0].length < 3) continue;
        const g = new THREE.ExtrudeGeometry(formaDe(p), {
          depth: profundidad,
          bevelEnabled: false,
        });
        g.rotateX(-Math.PI / 2);
        if (exploracionTerritorial) {
          const posiciones = g.getAttribute("position");
          const colores = new Float32Array(posiciones.count * 3);
          for (let i = 0; i < posiciones.count; i++) {
            const altura = THREE.MathUtils.clamp(posiciones.getY(i) / profundidad, 0, 1);
            tonoVidrio.copy(baseVidrio).lerp(bordeVidrio, altura);
            tonoVidrio.toArray(colores, i * 3);
          }
          g.setAttribute("color", new THREE.BufferAttribute(colores, 3));
          for (const anillo of p) {
            const borde = new THREE.BufferGeometry().setFromPoints(
              anillo.map(([x, z]) => new THREE.Vector3(x, profundidad + 0.15, z))
            );
            raiz.add(new THREE.LineLoop(borde, materialBordeSuperior));
            geometrias.push(borde);
          }
        }
        const malla = new THREE.Mesh(g, [material, materialLado]);
        malla.userData.codigo = t.codigo;
        raiz.add(malla);
        geometrias.push(g);
        if (!exploracionTerritorial) {
          const bordes = new THREE.EdgesGeometry(g, 25);
          raiz.add(new THREE.LineSegments(bordes, materialLinea));
          geometrias.push(bordes);
        }
        seleccionables.push(malla);
      }
      let marcador: THREE.Mesh | null = null;
      if (t.ancla) {
        marcador = new THREE.Mesh(geoMarcador, materialMarcador);
        marcador.position.set(t.ancla[0], profundidad + 3, t.ancla[1]);
        marcador.scale.setScalar(2.6);
        marcador.userData.codigo = t.codigo;
        marcador.visible = false;
        raiz.add(marcador);
        seleccionables.push(marcador);
      }
      const rotulo = exploracionTerritorial && marcador ? document.createElement("div") : null;
      if (rotulo) {
        rotulo.className = s.rotuloTerritorial3d;
        rotulo.addEventListener("click", () => propsRef.current.onSeleccionar(t.codigo));
        host.append(rotulo);
      }
      escena.add(raiz);
      grupos.set(t.codigo, {
        rotulo,
        codigo: t.codigo,
        nombre: t.nombre,
        raiz,
        material,
        marcador,
        elevacion: 0,
        centro: t.ancla ?? [0, 0],
      });
    }

    // ── Cámara ─────────────────────────────────────────────────────────────
    const vista = { zoom: 1, panX: 0, panZ: 0, giro: 0 };
    let ancho = 1;
    let alto = 1;

    function ajustarCamara() {
      const aspecto = ancho / alto;
      const altoUtil = geo.alto * Math.cos(inclinacion) + 4 * profundidad;
      const coseno = Math.abs(Math.cos(vista.giro));
      const seno = Math.abs(Math.sin(vista.giro));
      const anchoGirado = geo.ancho * coseno + geo.alto * seno;
      const altoGirado = altoUtil * coseno + geo.ancho * seno * Math.cos(inclinacion);
      const mitad = (Math.max(altoGirado, anchoGirado / aspecto) * 1.06) / 2;
      camara.left = -mitad * aspecto;
      camara.right = mitad * aspecto;
      camara.top = mitad;
      camara.bottom = -mitad;
      camara.zoom = vista.zoom;
      camara.position.set(
        vista.panX + distancia * Math.sin(inclinacion) * Math.sin(vista.giro),
        distancia * Math.cos(inclinacion),
        vista.panZ + distancia * Math.sin(inclinacion) * Math.cos(vista.giro)
      );
      camara.lookAt(vista.panX, 0, vista.panZ);
      camara.updateProjectionMatrix();
    }

    // ── Dibujo bajo demanda y transiciones cancelables ──────────────────────
    const tweens = new Map<string, Tween>();
    let raf = 0;
    let vivo = true;
    let primero = true;

    const puntoRotulo = new THREE.Vector3();

    function cuadro(ahora: number) {
      raf = 0;
      if (!vivo) return;
      for (const [clave, t] of tweens) {
        const p = Math.min(1, (ahora - t.t0) / t.dur);
        t.aplicar(facil(p));
        if (p >= 1) tweens.delete(clave);
      }
      ajustarCamara();
      renderer.render(escena, camara);
      for (const { rotulo, marcador } of grupos.values()) {
        if (!rotulo || !marcador || !rotulo.textContent) continue;
        marcador.getWorldPosition(puntoRotulo).project(camara);
        rotulo.style.left = `${(puntoRotulo.x + 1) * 50}%`;
        rotulo.style.top = `${(1 - puntoRotulo.y) * 50}%`;
        rotulo.hidden = Math.abs(puntoRotulo.x) > 1 || Math.abs(puntoRotulo.y) > 1;
      }
      if (primero) {
        primero = false;
        propsRef.current.onLista();
      }
      if (tweens.size > 0) pedir();
    }
    function pedir() {
      if (!raf && vivo) raf = requestAnimationFrame(cuadro);
    }
    function mover(clave: string, dur: number, aplicar: (p: number) => void) {
      if (quieto && quieto.matches) {
        tweens.delete(clave);
        aplicar(1);
      } else {
        tweens.set(clave, { t0: performance.now(), dur, aplicar });
      }
      pedir();
    }

    function irA(zoom: number, x: number, z: number) {
      const z0 = vista.zoom;
      const x0 = vista.panX;
      const zz0 = vista.panZ;
      const zf = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
      mover("camara", DUR_CAMARA, (p) => {
        vista.zoom = z0 + (zf - z0) * p;
        vista.panX = x0 + (x - x0) * p;
        vista.panZ = zz0 + (z - zz0) * p;
      });
    }

    // ── Datos y selección ───────────────────────────────────────────────────
    let seleccionActual: string | null = null;
    const totales = new Map<string, number>();

    function aplicarDatos() {
      const { regiones, seleccionCodigo } = propsRef.current;
      totales.clear();
      for (const r of regiones) totales.set(r.codigo, r.total);
      const maximo = Math.max(1, ...regiones.map((r) => r.total));
      for (const g of grupos.values()) {
        const total = totales.get(g.codigo) ?? 0;
        const sel = g.codigo === seleccionCodigo;
        g.material.color.copy(
          exploracionTerritorial && !sel && total === 0
            ? COLOR.territorio
            : colorDe(total, maximo, sel)
        );
        if (g.rotulo) {
          g.rotulo.textContent = total ? String(total) : "";
          g.rotulo.title = `${g.nombre} · ${total} ${total === 1 ? "proyecto" : "proyectos"}`;
          g.rotulo.dataset.activo = String(sel);
          g.rotulo.hidden = !total;
        }
        if (g.marcador) {
          g.marcador.visible = total > 0 || sel;
          g.marcador.material = sel ? materialMarcadorSel : materialMarcador;
          g.marcador.scale.setScalar(sel ? 4 : 2.6);
        }
        const hasta = sel ? ELEVACION_SELECCION : 0;
        if (g.elevacion !== hasta) {
          const desde = g.elevacion;
          mover(`elev:${g.codigo}`, DUR_SELECCION, (p) => {
            g.elevacion = desde + (hasta - desde) * p;
            g.raiz.position.y = g.elevacion;
          });
        }
      }
      if (seleccionCodigo !== seleccionActual) {
        seleccionActual = seleccionCodigo;
        const g = seleccionCodigo ? grupos.get(seleccionCodigo) : null;
        if (g) irA(1.3, g.centro[0] * 0.45, g.centro[1] * 0.45);
        else irA(1, 0, 0);
      }
      pedir();
    }

    // ── Tamaño ──────────────────────────────────────────────────────────────
    function medir() {
      ancho = Math.max(1, host!.clientWidth);
      alto = Math.max(1, host!.clientHeight);
      renderer.setSize(ancho, alto, false);
      pedir();
    }
    const observador = new ResizeObserver(medir);
    observador.observe(host);
    medir();

    // ── Puntero: hover, clic sin arrastre y desplazamiento con zoom ─────────
    const rayo = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    function codigoEn(clientX: number, clientY: number): string | null {
      const r = canvas.getBoundingClientRect();
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      rayo.setFromCamera(ndc, camara);
      const hit = rayo.intersectObjects(seleccionables, false)[0];
      return (hit?.object.userData.codigo as string | undefined) ?? null;
    }

    let inicio: { x: number; y: number; id: number; tipo: string } | null = null;
    let arrastrando = false;
    let ultimo = { x: 0, y: 0 };

    function mostrarEtiqueta(codigo: string | null, x: number, y: number) {
      const el = etiqueta.current;
      if (!el) return;
      if (!codigo) {
        el.hidden = true;
        canvas.style.cursor = "";
        return;
      }
      const g = grupos.get(codigo);
      const n = totales.get(codigo) ?? 0;
      const nombre = g?.nombre ?? codigo;
      el.textContent = exploracionTerritorial ? nombre : `${nombre} · ${n.toLocaleString("es-CO")}`;
      el.hidden = false;
      const r = host!.getBoundingClientRect();
      el.style.transform = `translate(${Math.round(x - r.left + 14)}px, ${Math.round(y - r.top + 14)}px)`;
      canvas.style.cursor = "pointer";
    }

    const alBajar = (e: PointerEvent) => {
      inicio = { x: e.clientX, y: e.clientY, id: e.pointerId, tipo: e.pointerType };
      arrastrando = false;
      ultimo = { x: e.clientX, y: e.clientY };
    };
    const alMover = (e: PointerEvent) => {
      if (inicio && e.pointerId === inicio.id) {
        const d = Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y);
        if (d > 5 && inicio.tipo === "mouse" && vista.zoom > 1.01) {
          if (!arrastrando) {
            arrastrando = true;
            canvas.setPointerCapture(e.pointerId);
            tweens.delete("camara");
          }
          const porPixel = (camara.top - camara.bottom) / vista.zoom / alto;
          const dx = (e.clientX - ultimo.x) * porPixel;
          const dz = ((e.clientY - ultimo.y) * porPixel) / Math.cos(inclinacion);
          vista.panX -= dx * Math.cos(vista.giro) + dz * Math.sin(vista.giro);
          vista.panZ -= dz * Math.cos(vista.giro) - dx * Math.sin(vista.giro);
          ultimo = { x: e.clientX, y: e.clientY };
          pedir();
          return;
        }
      }
      if (e.pointerType === "mouse")
        mostrarEtiqueta(codigoEn(e.clientX, e.clientY), e.clientX, e.clientY);
    };
    const alSubir = (e: PointerEvent) => {
      const i = inicio;
      inicio = null;
      if (!i || e.pointerId !== i.id) return;
      if (arrastrando) {
        arrastrando = false;
        canvas.releasePointerCapture(e.pointerId);
        return;
      }
      if (Math.hypot(e.clientX - i.x, e.clientY - i.y) > 5) return;
      const codigo = codigoEn(e.clientX, e.clientY);
      if (codigo) propsRef.current.onSeleccionar(codigo);
    };
    const alSalir = () => mostrarEtiqueta(null, 0, 0);
    const alRueda = (e: WheelEvent) => {
      // Solo con Ctrl/⌘: la rueda sola desplaza la página.
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      tweens.delete("camara");
      vista.zoom = Math.min(
        ZOOM_MAX,
        Math.max(ZOOM_MIN, vista.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12))
      );
      pedir();
    };
    canvas.addEventListener("pointerdown", alBajar);
    canvas.addEventListener("pointermove", alMover);
    canvas.addEventListener("pointerup", alSubir);
    canvas.addEventListener("pointerleave", alSalir);
    canvas.addEventListener("wheel", alRueda, { passive: false });

    // ── Pérdida del contexto: el padre vuelve al 2D ─────────────────────────
    const alPerder = (e: Event) => {
      e.preventDefault();
      vivo = false;
      propsRef.current.onFallo();
    };
    canvas.addEventListener("webglcontextlost", alPerder);

    api.current = {
      aplicarDatos,
      zoom: (factor) => irA(vista.zoom * factor, vista.panX, vista.panZ),
      restablecer: () => {
        tweens.delete("giro");
        vista.giro = 0;
        irA(1, 0, 0);
      },
    };
    aplicarDatos();
    const controles = propsRef.current.controles;
    controles.current = {
      acercar: () => api.current?.zoom(PASO_ZOOM),
      alejar: () => api.current?.zoom(1 / PASO_ZOOM),
      restablecer: () => api.current?.restablecer(),
      girar: exploracionTerritorial
        ? () => {
            const desde = vista.giro;
            mover("giro", DUR_CAMARA, (p) => {
              vista.giro = (desde + (Math.PI / 6) * p) % (2 * Math.PI);
            });
          }
        : undefined,
    };

    return () => {
      vivo = false;
      api.current = null;
      controles.current = null;
      if (raf) cancelAnimationFrame(raf);
      tweens.clear();
      observador.disconnect();
      canvas.removeEventListener("pointerdown", alBajar);
      canvas.removeEventListener("pointermove", alMover);
      canvas.removeEventListener("pointerup", alSubir);
      canvas.removeEventListener("pointerleave", alSalir);
      canvas.removeEventListener("wheel", alRueda);
      canvas.removeEventListener("webglcontextlost", alPerder);
      geometrias.forEach((g) => g.dispose());
      grupos.forEach((g) => {
        g.material.dispose();
        g.rotulo?.remove();
      });
      [
        materialLado,
        materialLinea,
        materialBordeSuperior,
        materialMarcador,
        materialMarcadorSel,
      ].forEach((m) => m.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, []);

  // Datos y selección nuevos: se recolorea sin reconstruir la escena.
  useEffect(() => {
    api.current?.aplicarDatos();
  }, [props.regiones, props.seleccionCodigo]);

  return (
    <div ref={contenedor} className={s.escena3d} aria-hidden="true">
      <div ref={etiqueta} className={s.etiqueta3d} hidden />
    </div>
  );
}
