"use client";

import { useId, useRef, useState } from "react";
import { TIPOS_PROYECTO, TIPO_PROYECTO } from "@/src/lib/classify/tipo-proyecto";
import {
  ACTIVIDADES_BUSQUEDA,
  ETIQUETA_SISTEMA,
  SISTEMAS_AGRUPADOS,
} from "@/src/lib/secop/busqueda-guiada";
import styles from "./buscador-guiado.module.css";

/** Sistemas agrupados y luego los cuatro tipos de agua (sin `otros`). */
const OPCIONES_SISTEMA = [
  ...SISTEMAS_AGRUPADOS.map((value) => ({ value, label: ETIQUETA_SISTEMA[value] })),
  ...TIPOS_PROYECTO.filter((t) => t !== "otros").map((value) => ({
    value,
    label: TIPO_PROYECTO[value].label,
  })),
];

type Familia = "potable" | "residual" | "redes";

/** Lo que cambia con el tipo de obra: imagen, pie de foto, ayuda y texto del campo. */
const FAMILIAS: Record<
  Familia,
  {
    value: string;
    label: string;
    detalle: string;
    imagen: string;
    pie: string;
    placeholder: string;
    titular: string;
  }
> = {
  potable: {
    value: "potable",
    label: "Agua potable",
    detalle: "Plantas, captación, conducción y tratamiento",
    imagen: "/images/buscador/potable.webp",
    pie: "Planta de tratamiento de agua potable · Colombia",
    placeholder: "Bombeo, laboratorio, captación, municipio…",
    titular: "Obras de agua que transforman territorios",
  },
  residual: {
    value: "residual",
    label: "Agua residual",
    detalle: "PTAR, colectores, emisarios y tratamiento",
    imagen: "/images/buscador/residual.webp",
    pie: "Planta de tratamiento de aguas residuales · Colombia",
    placeholder: "PTAR, colector, emisario, lodos, tratamiento…",
    titular: "Obras de agua que transforman territorios",
  },
  redes: {
    value: "redes",
    label: "Redes y alcantarillado",
    detalle: "Redes, colectores y obras complementarias",
    imagen: "/images/buscador/redes.webp",
    pie: "Instalación de alcantarillado sanitario · Colombia",
    placeholder: "Redes, alcantarillado, colectores, pozos, emisarios…",
    titular: "Obras de agua que transforman territorios",
  },
};
const ORDEN_FAMILIAS: Familia[] = ["potable", "residual", "redes"];

/** Qué tarjeta corresponde al sistema elegido (incluye los tipos sueltos del select). */
function familiaDe(sistema: string): Familia | null {
  if (sistema === "potable" || sistema === "acueducto" || sistema === "ptap") return "potable";
  if (sistema === "residual" || sistema === "ptar") return "residual";
  if (sistema === "redes" || sistema === "alcantarillado") return "redes";
  return null;
}

const BENEFICIOS = [
  {
    icono: "entidad",
    titulo: "Entidades públicas",
    texto: "Alcaldías, gobernaciones y entidades del sector.",
  },
  {
    icono: "obra",
    titulo: "Obras y servicios",
    texto: "Construcción, estudios, interventorías, operación.",
  },
  {
    icono: "pais",
    titulo: "En todo Colombia",
    texto: "Procesos clasificados como del sector en SECOP II.",
  },
  {
    icono: "reloj",
    titulo: "Información actualizada",
    texto: "Con adendas, cronogramas y estados.",
  },
] as const;

function Icono({ nombre }: { nombre: string }) {
  const trazo = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      {nombre === "potable" ? (
        <path d="M16 3.5S7.5 14 7.5 20.5a8.5 8.5 0 0 0 17 0C24.5 14 16 3.5 16 3.5Z" {...trazo} />
      ) : nombre === "residual" ? (
        <>
          <path d="M5 9h22v9a7 7 0 0 1-7 7h-8a7 7 0 0 1-7-7V9Z" {...trazo} />
          <path d="M5 19c2-2 4-2 6 0s4 2 6 0 4-2 6 0 3 2 4 1M11 5h10M14 2h4" {...trazo} />
        </>
      ) : nombre === "redes" ? (
        <path d="M6 4v9h8v7h12M6 13v13h7m1-13h5V7h7m-12 13h7v6m-7-6v-6" {...trazo} />
      ) : nombre === "entidad" ? (
        <path d="M4 12 16 5l12 7M7 12v11M13 12v11M19 12v11M25 12v11M4 26h24M4 12h24" {...trazo} />
      ) : nombre === "obra" ? (
        <path d="M8 4h11l5 5v19H8V4ZM19 4v5h5M12 15h8M12 20h8" {...trazo} />
      ) : nombre === "pais" ? (
        <path d="M13 3l5 3 1 5 4 3-2 5 2 4-5 5-4-3-2-5-4-2 1-6 4-3 0-6Z" {...trazo} />
      ) : (
        <>
          <circle cx="16" cy="16" r="11" {...trazo} />
          <path d="M16 9v7l4 3" {...trazo} />
        </>
      )}
    </svg>
  );
}

/**
 * «Buscar procesos» del hero: un modal con dos formularios GET a
 * `/licitaciones`, la vitrina, que es el único buscador desde el 2026-10-05.
 * Por tema envía `tipo`, `actividad` y `q`; por número, `numero`. Sin
 * JavaScript propio más allá de abrir el modal y marcar las categorías: el
 * resultado es una URL normal, con la tarjeta, el encaje y el Radar de la
 * vitrina. Diseño del 2026-10-07: foto y acento de color según el tipo de obra
 * (azul potable, naranja residual, violeta redes; azul si no hay tipo elegido).
 */
export default function BuscadorGuiado() {
  const uid = useId();
  const modalRef = useRef<HTMLDialogElement>(null);
  const [modo, setModo] = useState<"tema" | "numero">("tema");
  const [tema, setTema] = useState({ sistema: "", actividad: "", q: "" });
  const [numero, setNumero] = useState("");
  const campo =
    (key: keyof typeof tema) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setTema((actual) => ({ ...actual, [key]: event.target.value }));
  const elegida = familiaDe(tema.sistema);
  const activa = elegida ?? "potable";
  const datos = FAMILIAS[activa];
  return (
    <>
      <button
        type="button"
        className={styles.activador}
        onClick={() => modalRef.current?.showModal()}
        aria-haspopup="dialog"
      >
        <span>Buscar procesos</span>
        <span className={styles.activadorIcono} aria-hidden="true">
          ⌕
        </span>
      </button>
      <dialog
        ref={modalRef}
        className={styles.dialog}
        data-familia={activa}
        aria-labelledby={`${uid}-titulo-modal`}
        onClick={(event) => {
          if (event.target === event.currentTarget) modalRef.current?.close();
        }}
      >
        {/* Foto decorativa: cambia con el tipo; el nombre y el pie van en texto. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.foto} src={datos.imagen} alt="" aria-hidden="true" />
        <div className={styles.velo} aria-hidden="true" />
        <button
          type="button"
          className={styles.cerrar}
          onClick={() => modalRef.current?.close()}
          aria-label="Cerrar búsqueda"
        >
          <span aria-hidden="true">×</span>
        </button>
        <div className={styles.cuerpo}>
          <div className={styles.columnaForm}>
            <div className={styles.dialogCabecera}>
              <p className={styles.dialogEyebrow}>BÚSQUEDA GUIADA</p>
              <h2 id={`${uid}-titulo-modal`}>
                Encuentra un proceso <span className={styles.acento}>de tu interés</span>
              </h2>
              <p>Busca por tema o introduce el número SECOP II.</p>
            </div>
            <section
              className={styles.buscador}
              data-familia={activa}
              aria-label="Buscador guiado de procesos"
            >
              <fieldset className={styles.selector}>
                <legend className="sr-only">Cómo quieres buscar</legend>
                <input
                  className={styles.radioTema}
                  type="radio"
                  name={`entrada-${uid}`}
                  id={`${uid}-tema`}
                  checked={modo === "tema"}
                  onChange={() => setModo("tema")}
                />
                <label className={styles.pestana} htmlFor={`${uid}-tema`}>
                  Por tema
                </label>
                <input
                  className={styles.radioNumero}
                  type="radio"
                  name={`entrada-${uid}`}
                  id={`${uid}-numero`}
                  checked={modo === "numero"}
                  onChange={() => setModo("numero")}
                />
                <label className={styles.pestana} htmlFor={`${uid}-numero`}>
                  Por número
                </label>
                <a className={styles.pestana} href="/mis-procesos">
                  Mis procesos
                </a>
                <div className={styles.formularios}>
                  <form
                    className={styles.formTema}
                    action="/licitaciones"
                    method="get"
                    role="search"
                  >
                    <fieldset className={styles.categorias}>
                      <legend>Tipo de obra</legend>
                      <div className={styles.categoriasGrid}>
                        {ORDEN_FAMILIAS.map((familia) => {
                          const opcion = FAMILIAS[familia];
                          const seleccionada = elegida === familia;
                          return (
                            <button
                              key={familia}
                              type="button"
                              className={styles.categoria}
                              data-familia={familia}
                              aria-pressed={seleccionada}
                              onClick={() =>
                                setTema((actual) => ({
                                  ...actual,
                                  sistema: seleccionada ? "" : opcion.value,
                                }))
                              }
                            >
                              <Icono nombre={familia} />
                              <span className={styles.categoriaNombre}>{opcion.label}</span>
                              <span className={styles.categoriaDetalle}>{opcion.detalle}</span>
                              {seleccionada ? (
                                <span className={styles.categoriaCheck} aria-hidden="true">
                                  ✓
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>
                    <details className={styles.masSistemas}>
                      <summary>Elegir un sistema específico</summary>
                      <label htmlFor={`${uid}-sistema`}>
                        Sistema
                        <select
                          id={`${uid}-sistema`}
                          name="tipo"
                          value={tema.sistema}
                          onChange={campo("sistema")}
                        >
                          <option value="">Todos los sistemas</option>
                          {OPCIONES_SISTEMA.map((opcion) => (
                            <option value={opcion.value} key={opcion.value}>
                              {opcion.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </details>
                    <label htmlFor={`${uid}-actividad`}>
                      Actividad
                      <select
                        id={`${uid}-actividad`}
                        name="actividad"
                        value={tema.actividad}
                        onChange={campo("actividad")}
                      >
                        <option value="">Todas las actividades</option>
                        {ACTIVIDADES_BUSQUEDA.map((opcion) => (
                          <option value={opcion.value} key={opcion.value}>
                            {opcion.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label htmlFor={`${uid}-q`}>
                      Palabra o entidad <span className={styles.opcional}>· opcional</span>
                      <input
                        id={`${uid}-q`}
                        name="q"
                        value={tema.q}
                        onChange={campo("q")}
                        maxLength={120}
                        placeholder={datos.placeholder}
                        autoComplete="off"
                      />
                    </label>
                    <button className={styles.buscar} type="submit">
                      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <circle
                          cx="11"
                          cy="11"
                          r="7"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <path
                          d="m16.5 16.5 4 4"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                      Buscar procesos
                    </button>
                  </form>
                  <form
                    className={styles.formNumero}
                    action="/licitaciones"
                    method="get"
                    role="search"
                  >
                    <label htmlFor={`${uid}-numero-proceso`}>
                      Número del proceso
                      <input
                        id={`${uid}-numero-proceso`}
                        name="numero"
                        value={numero}
                        onChange={(event) => setNumero(event.target.value)}
                        required
                        maxLength={120}
                        placeholder="CO1.REQ.5720221 o referencia"
                        autoComplete="off"
                        aria-describedby={`${uid}-ayuda`}
                      />
                    </label>
                    <p id={`${uid}-ayuda`} className={styles.ayuda}>
                      Identificador SECOP II o referencia de la entidad. Incluye procesos abiertos y
                      cerrados.
                    </p>
                    <button className={styles.buscar} type="submit">
                      Buscar proceso
                    </button>
                  </form>
                </div>
              </fieldset>
            </section>
          </div>
          <aside className={styles.columnaInfo} aria-label="Qué encuentras">
            <p className={styles.pie}>
              <span aria-hidden="true">●</span> {datos.pie}
            </p>
            <p className={styles.infoTitulo}>ENCUENTRA PROCESOS DE</p>
            <ul className={styles.beneficios}>
              {BENEFICIOS.map((b) => (
                <li key={b.icono}>
                  <span className={styles.beneficioIcono}>
                    <Icono nombre={b.icono} />
                  </span>
                  <span>
                    <strong>{b.titulo}</strong>
                    {b.texto}
                  </span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </dialog>
    </>
  );
}
