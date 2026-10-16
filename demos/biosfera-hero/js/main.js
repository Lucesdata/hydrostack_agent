// Orquestación: recorrido + interfaz + escena. La página funciona aunque la escena 3D falle.
import { EQUIPOS, ZONAS } from "./data.js";
import { crearRecorrido, tiempoMecanismos } from "./journey.js";
import { crearUI } from "./ui.js";
import { MODELO } from "./config.js";

const $ = (id) => document.getElementById(id);
const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
let reducir = mq.matches;
const aviso = $("aviso-movimiento");
aviso.hidden = !reducir;
mq.addEventListener?.("change", () => { reducir = mq.matches; aviso.hidden = !reducir; });

let escena = null, seleccion = null, autoOn = false;
let raf = 0, ultimo = 0, enPantalla = true;

const rec = crearRecorrido(() => pintar());
const ui = crearUI({
  alElegirPaso(i) { rec.irAEtapa(i); pedir(); },
  alElegirEquipo(id) { elegirEquipo(id === seleccion ? null : id); },
});

function pintar() {
  const e = rec.estado(), ctx = { autoOn };
  const r = ui.pintar(e, ctx);
  if (r && r.anuncio) ui.anunciar(r.anuncio);
  ui.pintarRapido(e, ctx);
}

function elegirEquipo(id) {
  seleccion = id;
  const eq = ui.mostrarEquipo(id);
  ui.anunciar(eq ? `Equipo ${eq.n}: ${eq.nombre}. ${eq.texto}` : "Equipo deseleccionado.");
  pedir();
}

function resaltos(e) {
  const r = {};
  if (e.zona) ZONAS[e.zona].grupos.forEach((g) => (r[g] = 0.3));
  if (seleccion) r[seleccion] = 0.55;
  return r;
}

function cuadro(now) {
  raf = 0;
  const dt = Math.min(0.1, (now - (ultimo || now)) / 1000);
  ultimo = now;
  rec.avanzar(dt);
  const e = rec.estado();
  let sigue = rec.avanzando();
  if (escena) sigue = escena.dibujar({ T: e.T, tMec: tiempoMecanismos(e.T), resaltos: resaltos(e), autoRotar: autoOn && !e.pausado }, dt) || sigue;
  if (sigue) pedir(); else ultimo = 0;
}
function pedir() { if (!raf && enPantalla && !document.hidden) raf = requestAnimationFrame(cuadro); }

document.addEventListener("visibilitychange", () => { ultimo = 0; pedir(); });
if ("IntersectionObserver" in window) {
  new IntersectionObserver(([en]) => { enPantalla = en.isIntersecting; ultimo = 0; pedir(); }).observe($("lienzo"));
}

// ---------- Controles ----------
$("b-iniciar").addEventListener("click", () => { rec.iniciar(); pedir(); });
$("b-pausa").addEventListener("click", () => { rec.alternarPausa(); ui.anunciar(rec.estado().pausado ? "Animación en pausa." : "Animación reanudada."); pedir(); });
$("b-reiniciar").addEventListener("click", () => { rec.reiniciar(); ui.anunciar("Lote reiniciado."); pedir(); });

const autorr = $("autorrotar");
autorr.addEventListener("click", () => {
  autoOn = !autoOn; autorr.setAttribute("aria-pressed", String(autoOn));
  if (autoOn && rec.estado().pausado) rec.fijarPausa(false);
  pintar(); pedir();
});

document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape" && seleccion && !ui.modalAbierto()) elegirEquipo(null);
});

// ---------- Escena (carga diferida para no bloquear la página si falla) ----------
async function iniciarEscena() {
  const sinWebgl = (motivo) => {
    console.warn("[biosfera] escena 3D no disponible:", motivo);
    $("sin-webgl").hidden = false; $("lienzo").classList.add("sin-webgl-activo");
    document.querySelector(".escena").classList.add("sin-webgl-activo");
  };
  try {
    const m = await import("./scene.js");
    if (!m.webglDisponible()) return sinWebgl("WebGL no disponible");
    const [{ cargarPlanta }, { buildPlant }] = await Promise.all([import("./modelo.js"), import("./machinery.js")]);
    const planta = await cargarPlanta({ ruta: new URLSearchParams(location.search).get("modelo") || MODELO, construirPropia: buildPlant });
    $("lienzo").dataset.modelo = planta.informe.origen;
    escena = m.crearEscena({ host: $("lienzo"), equipos: EQUIPOS, marcadores: ui.marcadores, reducirMovimiento: reducir, pedirCuadro: pedir, planta });
    if (new URLSearchParams(location.search).has("debug")) console.info("[biosfera] modelo:", planta.informe);
  } catch (err) {
    escena = null; sinWebgl(err);
  }
  if (!escena) return;
  $("vista-3d").addEventListener("click", () => { escena.vista("3d"); setVista("3d"); });
  $("vista-planta").addEventListener("click", () => { escena.vista("planta"); setVista("planta"); });
  $("zoom-mas").addEventListener("click", () => escena.zoom(0.8));
  $("zoom-menos").addEventListener("click", () => escena.zoom(1.25));
  $("vista-inicial").addEventListener("click", () => { escena.vistaInicial(); setVista("3d"); });
  if (new URLSearchParams(location.search).has("debug")) window.__biosfera = { rec, escena, elegirEquipo, pedir };
  pedir();
}
function setVista(m) {
  $("vista-3d").setAttribute("aria-pressed", String(m === "3d"));
  $("vista-planta").setAttribute("aria-pressed", String(m === "planta"));
  pedir();
}

pintar();
iniciarEscena();
