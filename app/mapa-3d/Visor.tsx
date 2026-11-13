"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type Escena3D from "@/src/components/marketplace/Escena3D";
import type { EscenaHandle } from "@/src/components/marketplace/Escena3D";
import { formatCopEscala } from "@/src/components/secop/format";
import { DEPARTAMENTOS_DANE } from "@/src/lib/marketplace/adaptador";
import { fechaLegible } from "@/src/lib/secop/etapa";
import { geometria3d } from "@/src/lib/marketplace/geometria3d";
import type { ProyectoAdjudicado } from "@/app/api/departamento/[dpto]/adjudicados/route";
import s from "./mapa.module.css";

const { ancho, alto, territorios } = geometria3d();
const departamentos = [...DEPARTAMENTOS_DANE].sort((a, b) =>
  a.nombre.localeCompare(b.nombre, "es")
);
const regiones = departamentos.map(({ codigo, nombre }) => ({ codigo, nombre, total: 0 }));
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
  | { estado: "listo"; proyectos: ProyectoAdjudicado[] };

function Proyectos({ codigo }: { codigo: string }) {
  const [resultado, setResultado] = useState<Resultado>({ estado: "cargando" });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    const controlador = new AbortController();
    async function consultar() {
      try {
        const respuesta = await fetch(`/api/departamento/${codigo}/adjudicados`, {
          signal: controlador.signal,
        });
        if (!respuesta.ok) throw new Error(`Resumen departamental: ${respuesta.status}`);
        const datos: { proyectos: ProyectoAdjudicado[] } = await respuesta.json();
        if (!Array.isArray(datos.proyectos)) throw new Error("Resumen departamental no válido");
        if (!controlador.signal.aborted) {
          setResultado({ estado: "listo", proyectos: datos.proyectos });
        }
      } catch (error) {
        if (!controlador.signal.aborted) {
          console.warn("[mapa-3d] No se pudo consultar el departamento", error);
          setResultado({ estado: "error" });
        }
      }
    }
    void consultar();
    return () => controlador.abort();
  }, [codigo, intento]);

  if (resultado.estado === "cargando") return <p role="status">Consultando proyectos…</p>;
  if (resultado.estado === "error") {
    return (
      <div>
        <p role="status">Los proyectos no están disponibles en este momento.</p>
        <button
          type="button"
          onClick={() => {
            setResultado({ estado: "cargando" });
            setIntento((previo) => previo + 1);
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }
  if (!resultado.proyectos.length) {
    return (
      <p role="status">No se encontraron adjudicaciones con valor publicado en este territorio.</p>
    );
  }
  return (
    <ul className={s.procesos} aria-label="Adjudicaciones más recientes">
      {resultado.proyectos.map((proyecto) => (
        <li key={proyecto.id}>
          <p className={s.rotulo}>{proyecto.referencia || proyecto.id}</p>
          <p className={s.objeto}>{proyecto.objeto || "Objeto sin publicar"}</p>
          {proyecto.entidad && <p>{proyecto.entidad}</p>}
          <p>Valor adjudicado · {formatCopEscala(proyecto.valor)}</p>
          <dl className={s.avance}>
            <dt>Etapa contractual</dt>
            <dd>{proyecto.etapa}</dd>
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
              {proyecto.valorContrato === null
                ? "Sin dato"
                : formatCopEscala(proyecto.valorContrato)}
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
        </li>
      ))}
    </ul>
  );
}

export default function Visor() {
  const [codigo, seleccionar] = useState("");
  const [activar3d, setActivar3d] = useState(false);
  const [lista, setLista] = useState(false);
  const [fallo, setFallo] = useState(false);
  const [Escena, setEscena] = useState<typeof Escena3D | null>(null);
  const controles = useRef<EscenaHandle | null>(null);
  const departamento = departamentos.find((d) => d.codigo === codigo);

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
    <div className={s.visor}>
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
                data-seleccionado={codigo === camino.codigo}
                onClick={() => seleccionar(camino.codigo)}
              />
            ))}
          </svg>
        )}
        {activar3d && !fallo && Escena && (
          <div className={s.capa3d} data-lista={mostrar3d}>
            <Escena
              regiones={regiones}
              seleccionCodigo={codigo || null}
              onSeleccionar={seleccionar}
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
              ? "Selecciona un territorio. Usa los controles para girar o acercar."
              : activar3d
                ? "Cargando mapa 3D…"
                : "Vista 2D · Selecciona un territorio."}
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
        <h2>{departamento?.nombre ?? "Explora por territorio"}</h2>
        {departamento ? (
          <>
            <p>
              Hasta diez adjudicaciones recientes, ubicadas por la sede de la entidad. El porcentaje
              pagado usa el contrato firmado más reciente.
            </p>
            <Proyectos key={codigo} codigo={codigo} />
          </>
        ) : (
          <p>
            Elige un departamento en el mapa o en el selector para consultar sus proyectos
            adjudicados.
          </p>
        )}
      </aside>
    </div>
  );
}
