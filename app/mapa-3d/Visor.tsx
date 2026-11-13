"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type Escena3D from "@/src/components/marketplace/Escena3D";
import type { EscenaHandle } from "@/src/components/marketplace/Escena3D";
import { formatCopEscala } from "@/src/components/secop/format";
import { DEPARTAMENTOS_DANE } from "@/src/lib/marketplace/adaptador";
import { objetoLegible } from "@/src/lib/secop/ficha-card";
import { fechaLegible } from "@/src/lib/secop/etapa";
import { geometria3d } from "@/src/lib/marketplace/geometria3d";
import type { ProyectoAdjudicado } from "@/app/api/mapa-3d/adjudicados/route";
import s from "./mapa.module.css";

const { ancho, alto, territorios } = geometria3d();
const departamentos = [...DEPARTAMENTOS_DANE].sort((a, b) =>
  a.nombre.localeCompare(b.nombre, "es")
);
const caminos = territorios.map(({ codigo, poligonos }) => ({
  codigo,
  d: poligonos
    .flatMap((poligono) =>
      poligono.map(
        (anillo) => `M${anillo.map(([x, z]) => `${x.toFixed(1)} ${z.toFixed(1)}`).join("L")}Z`
      )
    )
    .join(""),
}));

type Resultado =
  | { estado: "cargando" }
  | { estado: "error" }
  | { estado: "listo"; proyectos: ProyectoAdjudicado[]; periodo: string };

function useProyectosNacionales() {
  const [resultado, setResultado] = useState<Resultado>({ estado: "cargando" });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    const controlador = new AbortController();
    async function consultar() {
      try {
        const respuesta = await fetch("/api/mapa-3d/adjudicados", {
          signal: controlador.signal,
        });
        if (!respuesta.ok) throw new Error(`Resumen departamental: ${respuesta.status}`);
        const datos: { proyectos: ProyectoAdjudicado[]; periodo: string } = await respuesta.json();
        if (!Array.isArray(datos.proyectos)) throw new Error("Resumen departamental no válido");
        if (!controlador.signal.aborted) {
          setResultado({ estado: "listo", proyectos: datos.proyectos, periodo: datos.periodo });
        }
      } catch (error) {
        if (!controlador.signal.aborted) {
          console.warn("[mapa-3d] No se pudo consultar las adjudicaciones nacionales", error);
          setResultado({ estado: "error" });
        }
      }
    }
    void consultar();
    return () => controlador.abort();
  }, [intento]);

  const reintentar = () => {
    setResultado({ estado: "cargando" });
    setIntento((previo) => previo + 1);
  };
  return { resultado, reintentar };
}

function Proyectos({
  codigo,
  resultado,
  reintentar,
  abrir,
}: {
  codigo: string;
  resultado: Resultado;
  reintentar: () => void;
  abrir: (proyecto: ProyectoAdjudicado) => void;
}) {
  if (resultado.estado === "cargando") return <p role="status">Consultando proyectos…</p>;
  if (resultado.estado === "error") {
    return (
      <div>
        <p role="status">Los proyectos no están disponibles en este momento.</p>
        <button type="button" onClick={reintentar}>
          Reintentar
        </button>
      </div>
    );
  }
  const proyectos = codigo
    ? resultado.proyectos.filter((proyecto) => proyecto.departamentoCodigo === codigo)
    : resultado.proyectos;
  if (!proyectos.length) {
    return (
      <p role="status">
        {codigo
          ? "Este territorio no tiene proyectos entre los diez seleccionados."
          : "No se encontraron adjudicaciones para el periodo."}
      </p>
    );
  }
  return (
    <ol className={s.procesos} aria-label="Mayores adjudicaciones de Colombia">
      {proyectos.map((proyecto) => (
        <li key={proyecto.id}>
          <button type="button" className={s.fila} onClick={() => abrir(proyecto)}>
            <span className={s.puesto} aria-label={`Puesto ${proyecto.puesto}`}>
              {String(proyecto.puesto).padStart(2, "0")}
            </span>
            <span className={s.filaContenido}>
              <strong>{objetoLegible(proyecto.objeto, [proyecto.departamento])}</strong>
              <span>{proyecto.departamento ?? "Sede sin ubicar"}</span>
              <span className={s.filaDatos}>
                <b>{formatCopEscala(proyecto.valor)}</b>
                <span>{proyecto.etapa}</span>
              </span>
            </span>
            <span aria-hidden="true">›</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

function FichaProyecto({ proyecto, cerrar }: { proyecto: ProyectoAdjudicado; cerrar: () => void }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const elemento = dialogo.current;
    elemento?.showModal();
    return () => elemento?.close();
  }, []);
  return (
    <dialog ref={dialogo} className={s.ficha} aria-labelledby="titulo-proyecto" onClose={cerrar}>
      <header>
        <p className={s.rotulo}>
          Puesto {proyecto.puesto} · {proyecto.departamento ?? "Sede sin ubicar"}
        </p>
        <button type="button" onClick={() => dialogo.current?.close()} aria-label="Cerrar ficha">
          ×
        </button>
      </header>
      <h2 id="titulo-proyecto">{objetoLegible(proyecto.objeto, [proyecto.departamento])}</h2>
      {proyecto.entidad && <p>{proyecto.entidad}</p>}
      <div className={s.resumenFicha}>
        <div>
          <p>Valor adjudicado</p>
          <strong>{formatCopEscala(proyecto.valor)}</strong>
        </div>
        <div>
          <p>Etapa contractual</p>
          <strong>{proyecto.etapa}</strong>
        </div>
      </div>
      <h3>Fechas y pagos publicados</h3>
      <dl className={s.avance}>
        {proyecto.estadoContrato && (
          <>
            <dt>Estado en SECOP II</dt>
            <dd>{proyecto.estadoContrato}</dd>
          </>
        )}
        <dt>Fecha de adjudicación</dt>
        <dd>{fechaLegible(proyecto.fechaAdjudicacion) ?? "Sin dato"}</dd>
        <dt>Firma del contrato</dt>
        <dd>{fechaLegible(proyecto.fechaFirma) ?? "Sin dato"}</dd>
        <dt>Inicio contractual</dt>
        <dd>{fechaLegible(proyecto.fechaInicio) ?? "Sin dato"}</dd>
        <dt>Fin previsto</dt>
        <dd>{fechaLegible(proyecto.fechaFin) ?? "Sin dato"}</dd>
        <dt>Valor del contrato</dt>
        <dd>
          {proyecto.valorContrato === null ? "Sin dato" : formatCopEscala(proyecto.valorContrato)}
        </dd>
        <dt>Monto pagado</dt>
        <dd>
          {proyecto.valorPagado === null ? "Sin dato" : formatCopEscala(proyecto.valorPagado)}
        </dd>
        <dt>Porcentaje pagado</dt>
        <dd>
          {proyecto.porcentajePagado === null
            ? "Sin dato"
            : new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(
                proyecto.porcentajePagado
              ) + " %"}
        </dd>
        <dt>Avance físico</dt>
        <dd>Pendiente de verificación en campo</dd>
      </dl>
      <Link
        href={proyecto.ficha}
        prefetch={false}
        aria-label={`Ver ficha ${proyecto.referencia || proyecto.id}`}
      >
        Ver ficha →
      </Link>
      {proyecto.secop && (
        <a className={s.enlaceSecop} href={proyecto.secop}>
          Ver SECOP II ↗
        </a>
      )}

      <details className={s.expediente}>
        <summary>Objeto y referencia oficiales</summary>
        <p>{proyecto.referencia || proyecto.id}</p>
        {proyecto.objeto && <p>{proyecto.objeto}</p>}
      </details>
    </dialog>
  );
}

export default function Visor() {
  const [codigo, seleccionar] = useState("");
  const [proyecto, setProyecto] = useState<ProyectoAdjudicado | null>(null);
  const [vistaMovil, setVistaMovil] = useState<"lista" | "mapa">("lista");
  const [activar3d, setActivar3d] = useState(false);
  const [lista, setLista] = useState(false);
  const [fallo, setFallo] = useState(false);
  const [Escena, setEscena] = useState<typeof Escena3D | null>(null);
  const controles = useRef<EscenaHandle | null>(null);
  const departamento = departamentos.find((d) => d.codigo === codigo);
  const { resultado, reintentar } = useProyectosNacionales();
  const proyectos = resultado.estado === "listo" ? resultado.proyectos : [];
  const regiones = useMemo(
    () =>
      departamentos.map(({ codigo, nombre }) => ({
        codigo,
        nombre,
        total: proyectos.filter((p) => p.departamentoCodigo === codigo).length,
      })),
    [proyectos]
  );
  const marcadores = territorios.flatMap(({ codigo, ancla }) => {
    const region = regiones.find((r) => r.codigo === codigo);
    return ancla && region?.total ? [{ ...region, ancla }] : [];
  });

  function elegirTerritorio(codigo: string) {
    seleccionar(codigo);
    setVistaMovil("lista");
  }

  useEffect(() => {
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!quieto.matches && window.matchMedia("(min-width: 960px)").matches) {
      setActivar3d(true);
    }
  }, []);

  useEffect(() => {
    if (!activar3d || Escena) return;
    let vigente = true;
    import("@/src/components/marketplace/Escena3D")
      .then(({ default: componente }) => {
        if (vigente) setEscena(() => componente);
      })
      .catch((error) => {
        if (vigente) {
          console.warn("[mapa-3d] No se pudo cargar la escena", error);
          setFallo(true);
        }
      });
    return () => {
      vigente = false;
    };
  }, [activar3d, Escena]);

  const mostrar3d = activar3d && lista && !fallo;

  return (
    <div className={s.visor} data-vista-movil={vistaMovil}>
      <div className={s.vistasMovil} role="group" aria-label="Vista de proyectos">
        <button
          type="button"
          aria-pressed={vistaMovil === "lista"}
          onClick={() => setVistaMovil("lista")}
        >
          Ver lista
        </button>
        <button
          type="button"
          aria-pressed={vistaMovil === "mapa"}
          onClick={() => setVistaMovil("mapa")}
        >
          Ver mapa
        </button>
      </div>
      <div className={s.lienzo} data-vista={mostrar3d ? "3d" : "2d"}>
        <div className={s.herramientas}>
          <button
            type="button"
            disabled={fallo}
            onClick={() => {
              setLista(false);
              setActivar3d(!activar3d);
            }}
          >
            {activar3d && !fallo ? "Ver en 2D" : "Ver en 3D"}
          </button>
          {mostrar3d && (
            <div role="group" aria-label="Controles del mapa">
              <button
                type="button"
                aria-label="Acercar"
                onClick={() => controles.current?.acercar()}
              >
                +
              </button>
              <button type="button" aria-label="Alejar" onClick={() => controles.current?.alejar()}>
                −
              </button>
              <button
                type="button"
                aria-label="Girar el mapa"
                onClick={() => controles.current?.girar?.()}
              >
                Girar
              </button>
              <button type="button" onClick={() => controles.current?.restablecer()}>
                Restablecer
              </button>
            </div>
          )}
        </div>
        {!mostrar3d && (
          <svg
            className={s.mapa2d}
            viewBox={`${-ancho / 2 - 12} ${-alto / 2 - 12} ${ancho + 24} ${alto + 24}`}
            aria-hidden="true"
          >
            {caminos.map((camino) => (
              <path
                key={camino.codigo}
                d={camino.d}
                data-codigo={camino.codigo}
                data-con-proyectos={regiones.some((r) => r.codigo === camino.codigo && r.total > 0)}
                data-seleccionado={(proyecto?.departamentoCodigo || codigo) === camino.codigo}
                onClick={() => elegirTerritorio(camino.codigo)}
              />
            ))}
            {marcadores.map(({ codigo: id, nombre, ancla: [x, z], total }) => (
              <g
                key={id}
                className={s.marcador2d}
                data-activo={id === codigo}
                transform={`translate(${x} ${z})`}
                onClick={() => elegirTerritorio(id)}
              >
                <title>
                  {nombre} · {total} {total === 1 ? "proyecto" : "proyectos"}
                </title>
                <circle r="12" />
                <text textAnchor="middle" dominantBaseline="central">
                  {total}
                </text>
              </g>
            ))}
          </svg>
        )}
        {activar3d && !fallo && Escena && (
          <div className={s.capa3d} data-lista={mostrar3d}>
            <Escena
              regiones={regiones}
              seleccionCodigo={proyecto?.departamentoCodigo || codigo || null}
              onSeleccionar={elegirTerritorio}
              onLista={() => setLista(true)}
              onFallo={() => setFallo(true)}
              controles={controles}
              exploracionTerritorial
            />
          </div>
        )}
        <p className={s.indicacion} role="status">
          {fallo
            ? "Vista 2D · El mapa 3D no está disponible."
            : mostrar3d
              ? "Sede de la entidad contratante · El número indica proyectos."
              : activar3d
                ? "Cargando mapa 3D…"
                : "Sede de la entidad contratante · El número indica proyectos."}
        </p>
      </div>
      <aside className={s.panel} aria-label="Proyectos adjudicados por departamento">
        <label className={s.rotulo} htmlFor="territorio-mapa">
          Departamento o distrito
        </label>
        <select id="territorio-mapa" value={codigo} onChange={(e) => seleccionar(e.target.value)}>
          <option value="">Toda Colombia</option>
          {departamentos.map((d) => (
            <option key={d.codigo} value={d.codigo}>
              {d.nombre}
            </option>
          ))}
        </select>
        <h2>{departamento?.nombre ?? "Top 10 nacional"}</h2>
        <p>
          Mayores valores adjudicados del último mes cerrado
          {resultado.estado === "listo" ? ` (${resultado.periodo})` : ""}. Ubicación según la sede
          de la entidad.
        </p>
        <Proyectos
          codigo={codigo}
          resultado={resultado}
          reintentar={reintentar}
          abrir={setProyecto}
        />
      </aside>
      {proyecto && <FichaProyecto proyecto={proyecto} cerrar={() => setProyecto(null)} />}
    </div>
  );
}
