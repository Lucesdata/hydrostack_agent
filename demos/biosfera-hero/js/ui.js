// Interfaz HTML: pasos, marcadores, panel de equipo, tarjeta del lote, documentos y modal. Sin Three.js.
import { EQUIPOS, ETAPAS, ZONAS, REGISTRO, CERTIFICADO, DEMOS, LOTE_ID } from "./data.js";

const $ = (id) => document.getElementById(id);

const ICONOS = {
  camion: '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  maquina: '<rect x="3" y="8" width="18" height="8"/><path d="M6 8v8M10 8v8M14 8v8M18 8v8M5 19h14M7 5h10"/>',
  documento: '<path d="M6 3h9l4 4v14H6zM15 3v4h4M9 12h7M9 16h7"/>',
  certificado: '<path d="M6 3h9l4 4v6M15 3v4h4M9 11h6M9 15h3"/><circle cx="16" cy="18" r="3.5"/><path d="M14.5 18l1.2 1.2 2-2.2"/>',
};

function el(tag, attrs = {}, texto) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (texto != null) e.textContent = texto;
  return e;
}

export function crearUI({ alElegirPaso, alElegirEquipo }) {
  // ---------- Pasos ----------
  const lista = $("pasos");
  const botonesPaso = ETAPAS.map((e, i) => {
    const li = el("li");
    const b = el("button", { type: "button", class: "paso", "data-estado": "pendiente", "data-paso": i });
    b.append(el("span", { class: "paso__n", "aria-hidden": "true" }, String(e.n)));
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "paso__icono"); svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = ICONOS[e.icono]; b.append(svg);
    b.append(el("span", { class: "paso__titulo" }, e.titulo), el("span", { class: "paso__breve" }, e.breve));
    b.setAttribute("aria-label", `Paso ${e.n}: ${e.titulo}. ${e.breve} Ver este momento del recorrido.`);
    b.addEventListener("click", () => alElegirPaso(i));
    li.append(b); lista.append(li);
    return b;
  });

  // ---------- Marcadores (hotspots) ----------
  const capa = $("marcadores"), marcadores = {};
  EQUIPOS.forEach((e) => {
    const b = el("button", { type: "button", class: "marcador", "aria-pressed": "false", "data-id": e.id, "aria-label": `${e.n}. ${e.nombre}` });
    b.append(el("span", { class: "marcador__num", "aria-hidden": "true" }, String(e.n)), el("span", { class: "marcador__etq", "aria-hidden": "true" }, e.corto));
    b.addEventListener("click", () => alElegirEquipo(e.id));
    capa.append(b); marcadores[e.id] = b;
  });

  // Lista alternativa (sin WebGL)
  const listaEq = $("lista-equipos"), botonesLista = {};
  EQUIPOS.forEach((e) => {
    const li = el("li"), b = el("button", { type: "button", "aria-pressed": "false" }, `${e.n}. ${e.nombre}`);
    b.addEventListener("click", () => alElegirEquipo(e.id)); li.append(b); listaEq.append(li); botonesLista[e.id] = b;
  });

  // ---------- Panel de equipo ----------
  const panel = $("panel-equipo");
  let sel = null, zonaTxt = null;
  function pintarPanel() {
    const e = EQUIPOS.find((x) => x.id === sel);
    const z = zonaTxt;
    panel.hidden = !e && !z;
    $("equipo-cerrar").hidden = !e;
    if (e) { $("equipo-n").textContent = `Equipo ${e.n} de ${EQUIPOS.length}`; $("equipo-nombre").textContent = e.nombre; $("equipo-texto").textContent = e.texto; }
    else if (z) { $("equipo-n").textContent = "Zona activa"; $("equipo-nombre").textContent = z.nombre; $("equipo-texto").textContent = z.texto; }
  }
  function mostrarEquipo(id) {
    sel = id;
    Object.entries(marcadores).forEach(([k, b]) => b.setAttribute("aria-pressed", String(k === id)));
    Object.entries(botonesLista).forEach(([k, b]) => b.setAttribute("aria-pressed", String(k === id)));
    pintarPanel();
    return EQUIPOS.find((x) => x.id === id);
  }
  $("equipo-cerrar").addEventListener("click", () => alElegirEquipo(null));

  // ---------- Lote y recorrido ----------
  const prev = {};
  const cambio = (k, v) => (prev[k] === v ? false : ((prev[k] = v), true));
  function documento(etapa) {
    const caja = $("doc");
    caja.hidden = etapa < 2;
    if (etapa < 2) return;
    const d = etapa === 2 ? REGISTRO : CERTIFICADO;
    caja.className = "doc" + (etapa === 3 ? " doc--cert" : "");
    caja.replaceChildren(
      el("p", { class: "doc__sello" }, "Ejemplo ilustrativo"),
      el("h3", {}, d.titulo),
    );
    const dl = el("dl");
    d.filas.forEach(([k, v]) => dl.append(el("dt", {}, k), el("dd", {}, v)));
    caja.append(dl, el("p", { class: "doc__pie" }, "Datos de demostración: no corresponden a un lote real ni contienen mediciones."));
  }

  function pintar(e, { autoOn }) {
    if (cambio("etapa", e.etapa)) {
      botonesPaso.forEach((b, i) => {
        const estado = e.etapa === i ? "activo" : e.etapa > i || (e.terminado && e.iniciado) ? "hecho" : "pendiente";
        b.dataset.estado = estado;
        if (e.etapa === i) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
      });
      $("lote-texto").textContent = e.etapa < 0 ? "Pulsa «Iniciar recorrido» para ver cómo avanza un lote ilustrativo por la planta." : ETAPAS[e.etapa].explicacion;
      $("lienzo").dataset.modo = e.etapa >= 2 ? "admin" : "planta";
      documento(e.etapa);
      return { anuncio: e.etapa >= 0 ? `Paso ${ETAPAS[e.etapa].n}: ${ETAPAS[e.etapa].titulo}. ${ETAPAS[e.etapa].explicacion}` : "" };
    }
    return null;
  }

  function pintarRapido(e, { autoOn }) {
    if (cambio("zona", e.zona + "|" + e.terminado)) {
      zonaTxt = !e.iniciado ? null : e.terminado ? ZONAS.fin : ZONAS[e.zona];
      pintarPanel();
    }
    const estado = !e.iniciado ? "Listo para iniciar" : e.terminado ? "Completo" : e.pausado ? "En pausa" : "En curso";
    if (cambio("estado", estado)) $("lote-estado").textContent = estado;
    const pct = Math.round(e.progreso * 100);
    if (cambio("pct", pct)) { $("progreso").setAttribute("aria-valuenow", String(pct)); $("progreso-barra").style.width = pct + "%"; }
    const activo = e.iniciado && !e.terminado;
    if (cambio("btn", [activo, e.pausado, autoOn, e.iniciado].join())) {
      $("b-iniciar").disabled = activo;
      const pausa = $("b-pausa");
      pausa.disabled = !(activo || autoOn);
      pausa.textContent = e.pausado ? "Reanudar" : "Pausar";
      pausa.setAttribute("aria-pressed", String(e.pausado));
      document.body.dataset.pausado = String(e.pausado);
    }
  }

  // ---------- Modal de demostración ----------
  const modal = $("modal");
  function abrirDemo(clave) {
    const d = DEMOS[clave];
    if (!d) return;
    $("modal-titulo").textContent = d.titulo; $("modal-texto").textContent = d.texto;
    if (modal.showModal) modal.showModal(); else modal.setAttribute("open", "");
    $("modal-cerrar").focus();
  }
  const cerrarModal = () => (modal.close ? modal.close() : modal.removeAttribute("open"));
  $("modal-cerrar").addEventListener("click", cerrarModal);
  modal.addEventListener("click", (ev) => { if (ev.target === modal) cerrarModal(); });
  document.querySelectorAll("[data-demo]").forEach((n) => n.addEventListener("click", (ev) => { ev.preventDefault(); abrirDemo(n.dataset.demo); }));

  $("lote-id").textContent = LOTE_ID;

  return { marcadores, mostrarEquipo, pintar, pintarRapido, modalAbierto: () => modal.open, anunciar: (t) => { $("sr-estado").textContent = t; } };
}
