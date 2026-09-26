"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { formatConteo, formatCopEscala } from "@/src/components/secop/format";
import { ruta } from "@/src/components/landing/seccionesHome";
import { colorDeTipo } from "@/src/lib/classify/tipo-color";
import { TIPOS_PROYECTO, TIPO_PROYECTO } from "@/src/lib/classify/tipo-proyecto";
import ListaTerritorios from "./ListaTerritorios";
import FichaDepartamento, { formatPorcentaje } from "./FichaDepartamento";
import BandaMercado from "./BandaMercado";
import BuscadorFichas from "./BuscadorFichas";
import {
  contenidoTooltip,
  dptoDesdeObjetivo,
  indicesDeModo,
  useMarcasEnMapa,
  usePinturaEnMapa,
} from "./sincronia";
import { ESCALONES_MONTO, escalonDe, escalonMontoDe } from "@/src/lib/mapa/escala";
import styles from "./hero-territorial.module.css";

/** Una fila de tipo: punto de color, nombre, familia, cifra y barra. */
function FilaTipo({ clave, label, n, max }) {
  const color = colorDeTipo(clave);
  return (
    <>
      <span className={styles.typeNombre}>
        <span className={styles.typePunto} aria-hidden="true" />
        {label}
        {color ? <small>{color.familiaLabel}</small> : null}
      </span>
      <strong>{formatConteo(n)}</strong>
      <span className={styles.typeBar} aria-hidden="true">
        <span style={{ width: `${(100 * n) / max}%` }} />
      </span>
    </>
  );
}

/**
 * Tipos de proyecto de la ficha. Con el detalle del departamento, su propio
 * reparto (sin enlace por fila: no hay faceta departamento × tipo, y mandar al
 * tipo nacional contradiría la cifra). Sin él, el reparto nacional de siempre,
 * con enlace a cada faceta de tipo.
 */
function TiposProyecto({ tipos, departamento }) {
  const propios = departamento?.tipos
    ? TIPOS_PROYECTO.map((t) => ({
        clave: t,
        label: TIPO_PROYECTO[t].label,
        n: departamento.tipos[t] ?? 0,
      }))
    : null;

  if (propios) {
    const max = Math.max(1, ...propios.map((t) => t.n));
    return (
      <div className={styles.types}>
        <h2>Tipos de proyecto · {departamento.label}</h2>
        <p>Procesos abiertos del departamento, por tipo</p>
        {propios.map((t) => {
          const color = colorDeTipo(t.clave);
          return (
            <div
              key={t.clave}
              className={styles.typeFila}
              style={color ? { "--tipo": color.claro } : undefined}
              data-familia={color?.familia}
            >
              <FilaTipo {...t} max={max} />
            </div>
          );
        })}
      </div>
    );
  }

  const max = Math.max(1, ...tipos.map((t) => t.n));
  return (
    <div className={styles.types}>
      <h2>Tipos de proyecto · Colombia</h2>
      <p>Distribución nacional de procesos abiertos</p>
      {tipos.map((tipo) => {
        const color = colorDeTipo(tipo.clave);
        return (
          <Link
            href={`/licitaciones/tipo/${tipo.slug}`}
            key={tipo.clave}
            className={styles.typeFila}
            style={color ? { "--tipo": color.claro } : undefined}
            data-familia={color?.familia}
          >
            <FilaTipo clave={tipo.clave} label={tipo.label} n={tipo.n} max={max} />
          </Link>
        );
      })}
      {tipos.length === 0 ? <p>Distribución no disponible.</p> : null}
    </div>
  );
}

export default function HeroTerritorial({
  mapa = null,
  departamentos = [],
  totalAbiertos = null,
  tipos = [],
  sector = null,
  heroStats = null,
  recientes = null,
}) {
  const [busqueda, setBusqueda] = useState("");
  const [elegido, setElegido] = useState(null);
  const datosDisponibles = totalAbiertos != null;
  const seleccionado = useMemo(
    () => departamentos.find((d) => d.clave === elegido) ?? departamentos[0] ?? null,
    [departamentos, elegido]
  );
  // Lo que el puntero o el foco señalan en el mapa o en la lista. Mientras
  // existe, la ficha lo muestra de vista previa; al soltarlo vuelve al elegido.
  const [resaltado, setResaltado] = useState(null);
  const previa = useMemo(
    () => (resaltado ? (departamentos.find((d) => d.clave === resaltado) ?? null) : null),
    [departamentos, resaltado]
  );
  const vista = previa ?? seleccionado;
  const mapaRef = useRef(null);
  useMarcasEnMapa(mapaRef, resaltado, seleccionado?.clave ?? null);
  // Cómo se colorea el mapa: por procesos (lo que pinta el servidor), por monto
  // en juego o por los procesos de un solo tipo de proyecto. Solo se ofrece si
  // las filas traen el detalle: sin él no hay nada que pintar.
  const hayDetalle = departamentos.some((d) => d.montoAbierto != null && d.tipos);
  const [modo, setModo] = useState("procesos");
  const [tipoFiltro, setTipoFiltro] = useState(null);
  const modoEfectivo = hayDetalle ? modo : "procesos";
  const indices = useMemo(
    () =>
      indicesDeModo({
        modo: modoEfectivo,
        tipo: tipoFiltro,
        departamentos,
        escalonDe,
        escalonMontoDe,
      }),
    [modoEfectivo, tipoFiltro, departamentos]
  );
  usePinturaEnMapa(mapaRef, modoEfectivo, indices);
  const elegirMetrica = (valor) => {
    setModo(valor);
    setTipoFiltro(null);
  };
  const elegirTipo = (tipo) => {
    // Un tipo pinta procesos de ese tipo: el monto no está desglosado por tipo.
    setTipoFiltro(tipo);
    setModo(tipo ? "tipo" : "procesos");
  };
  // Tooltip: dónde pintarlo (relativo al panel) y de qué departamento.
  const panelRef = useRef(null);
  const [punta, setPunta] = useState(null);
  const colocarPunta = (x, y, dpto, nombre) => {
    const panel = panelRef.current?.getBoundingClientRect();
    if (!panel || !dpto) return setPunta(null);
    setPunta({ x: x - panel.left, y: y - panel.top, dpto, nombre, ancho: panel.width });
  };
  const nombreDe = (objetivo) =>
    objetivo?.closest?.("[data-nombre]")?.getAttribute("data-nombre") ??
    objetivo?.querySelector?.("[data-nombre]")?.getAttribute("data-nombre") ??
    null;
  const alSenalarMapa = (e) => {
    const dpto = dptoDesdeObjetivo(e.target);
    setResaltado(dpto);
    // Con teclado no hay puntero: el tooltip va al centro del departamento.
    if (e.type === "focus" && dpto) {
      const r = e.target.getBoundingClientRect();
      colocarPunta(r.left + r.width / 2, r.top + r.height / 2, dpto, nombreDe(e.target));
    }
  };
  const alMoverEnMapa = (e) => {
    // En táctil el toque navega: un tooltip que aparece al tocar y se va al
    // soltar solo estorba.
    if (e.pointerType === "touch") return;
    const dpto = dptoDesdeObjetivo(e.target);
    colocarPunta(e.clientX, e.clientY, dpto, nombreDe(e.target));
  };
  const alSoltarMapa = () => {
    setResaltado(null);
    setPunta(null);
  };
  const etiquetasTipo = useMemo(
    () => Object.fromEntries(tipos.map((t) => [t.clave, t.label])),
    [tipos]
  );
  const tip = punta
    ? contenidoTooltip({
        dpto: punta.dpto,
        nombre: punta.nombre,
        departamentos,
        totalAbiertos,
        tipos: etiquetasTipo,
        tipoFiltro: modoEfectivo === "tipo" ? tipoFiltro : null,
      })
    : null;
  const explorar = ruta("explorar");

  return (
    <section className={styles.hero} aria-labelledby="aq-hero-title">
      <div className={styles.grid}>
        <div className={styles.colIzq}>
          <div className={styles.copy}>
            <p className={styles.eyebrow}>INTELIGENCIA DE CONTRATACIÓN PÚBLICA</p>
            <h1 id="aq-hero-title">
              Explora el mercado de agua y saneamiento de <span>Colombia.</span>
            </h1>
            <p className={styles.lead}>
              Cada proceso del SECOP II tiene aquí su ficha: qué se contrata, si puedes participar y
              qué te falta. Empieza por tu territorio.
            </p>
            <BuscadorFichas />
            <Link className={styles.primaryCta} href={explorar.href}>
              Ver fichas de procesos <span aria-hidden="true">→</span>
            </Link>
            <p className={styles.ctaMeta}>
              <span className={styles.puntoVivo} aria-hidden="true" />
              {sector?.procesosVigilados == null
                ? `${explorar.etiqueta} · datos desde SECOP II`
                : `${explorar.etiqueta} · ${formatConteo(sector.procesosVigilados)} procesos del sector`}
            </p>
          </div>

          <div className={styles.listPanel}>
            <ListaTerritorios
              departamentos={departamentos}
              busqueda={busqueda}
              onBusqueda={setBusqueda}
              seleccionado={seleccionado}
              onSeleccionar={setElegido}
              resaltado={resaltado}
              onResaltar={setResaltado}
              datosDisponibles={datosDisponibles}
            />
            <Link className={styles.allProcesses} href={explorar.href}>
              Ver todos los procesos <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        <div
          ref={panelRef}
          className={styles.mapPanel}
          aria-label="Procesos abiertos por departamento"
        >
          <div className={styles.kpis} aria-label="Indicadores nacionales">
            <div className={styles.kpiTotal}>
              <span className={styles.kpiTitulo}>Procesos abiertos · Colombia</span>
              <strong>{formatConteo(totalAbiertos)}</strong>
            </div>
            <dl>
              <div>
                <dt>Departamentos con procesos</dt>
                <dd>{datosDisponibles ? formatConteo(departamentos.length) : "—"}</dd>
              </div>
              <div>
                <dt>Tipos de proyecto · Colombia</dt>
                <dd>{tipos.length || datosDisponibles ? formatConteo(tipos.length) : "—"}</dd>
              </div>
            </dl>
          </div>
          {hayDetalle && datosDisponibles ? (
            <div className={styles.controlesMapa}>
              <div className={styles.metrica} role="group" aria-label="Colorear el mapa por">
                <span>Colorear por</span>
                {[
                  ["procesos", "Procesos abiertos"],
                  ["monto", "Monto en juego"],
                ].map(([valor, etiqueta]) => (
                  <button
                    key={valor}
                    type="button"
                    aria-pressed={modo === valor || (valor === "procesos" && modo === "tipo")}
                    onClick={() => elegirMetrica(valor)}
                  >
                    {etiqueta}
                  </button>
                ))}
              </div>
              <div className={styles.metrica} role="group" aria-label="Filtrar el mapa por tipo">
                <span>Tipo</span>
                <button type="button" aria-pressed={!tipoFiltro} onClick={() => elegirTipo(null)}>
                  Todos
                </button>
                {TIPOS_PROYECTO.map((t) => {
                  const color = colorDeTipo(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={tipoFiltro === t}
                      onClick={() => elegirTipo(t)}
                      data-familia={color.familia}
                      style={{ "--tipo": color.oscuro }}
                    >
                      <i className={styles.metricaPunto} aria-hidden="true" />
                      {TIPO_PROYECTO[t].label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          {modoEfectivo === "monto" ? (
            // La leyenda del servidor es la de procesos: con monto se oculta por
            // CSS (data-metrica) y se pinta esta, con la escala del monto.
            <div className={styles.leyendaMonto}>
              <ul>
                {ESCALONES_MONTO.map((e) => (
                  <li key={e.indice}>
                    <span style={{ background: `var(--aq-e${e.indice})` }} aria-hidden="true" />
                    {e.etiqueta}
                  </li>
                ))}
              </ul>
              <p>
                Suma del presupuesto oficial de los procesos abiertos que lo publican, según la
                ubicación de la entidad contratante.
              </p>
            </div>
          ) : null}
          <div
            ref={mapaRef}
            className={styles.map}
            onPointerOver={alSenalarMapa}
            onPointerMove={alMoverEnMapa}
            onPointerLeave={alSoltarMapa}
            onFocus={alSenalarMapa}
            onBlur={alSoltarMapa}
          >
            {mapa}
          </div>
          {datosDisponibles && departamentos.length > 0 ? (
            // En móvil los rótulos del mapa se ocultan y la lista queda al final,
            // debajo de la ficha: este enlace dice que existe y lleva a ella.
            // Es la alternativa en texto al mapa (cada cifra, legible).
            <a className={styles.verLista} href="#aq-lista-departamentos">
              Ver los {formatConteo(departamentos.length)} departamentos como lista{" "}
              <span aria-hidden="true">↓</span>
            </a>
          ) : null}
          {tip && datosDisponibles ? (
            // Duplica lo que ya dicen la ficha (vista previa) y el aria-label
            // de cada departamento: es una ayuda visual, fuera del árbol
            // accesible.
            <div
              className={styles.tooltip}
              aria-hidden="true"
              style={{
                left: Math.min(punta.x + 14, punta.ancho - 230),
                top: punta.y + 14,
              }}
            >
              <strong>{tip.nombre}</strong>
              <span>
                {tip.n === 0
                  ? "Sin procesos abiertos"
                  : `${formatConteo(tip.n)} ${tip.n === 1 ? "proceso abierto" : "procesos abiertos"}`}
              </span>
              {tip.pct != null ? <span>{formatPorcentaje(tip.pct)} del total nacional</span> : null}
              {tip.nTipo != null ? (
                <span className={styles.tooltipTipo}>
                  <b>{formatConteo(tip.nTipo)}</b> de {TIPO_PROYECTO[tipoFiltro].label}
                </span>
              ) : null}
              {tip.monto > 0 ? <span>{formatCopEscala(tip.monto)} en juego</span> : null}
              {tip.principal ? (
                <span className={styles.tooltipTipo}>
                  Más frecuente: <b>{tip.principal.label}</b>
                </span>
              ) : null}
              {tip.n > 0 ? <em>Clic para ver sus fichas</em> : null}
            </div>
          ) : null}
          {mapa && totalAbiertos == null ? (
            <p className={styles.noData}>El mapa no tiene datos disponibles en este momento.</p>
          ) : null}
        </div>

        <div className={styles.detailPanel}>
          <FichaDepartamento
            departamento={vista}
            totalAbiertos={totalAbiertos}
            vistaPrevia={previa != null}
          />
          <TiposProyecto tipos={tipos} departamento={vista} />
          {vista && vista.n > 0 ? (
            <Link
              className={styles.fichaCta}
              href={`/licitaciones/departamento/${vista.slug}`}
              aria-label={`Ver fichas de ${vista.label}`}
            >
              Ver fichas de {vista.label} <span aria-hidden="true">→</span>
            </Link>
          ) : null}
        </div>
      </div>

      <BandaMercado sector={sector} heroStats={heroStats} recientes={recientes} />
    </section>
  );
}
