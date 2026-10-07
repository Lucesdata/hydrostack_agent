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

/**
 * «Buscar procesos» del hero: un modal con dos formularios GET a
 * `/licitaciones`, la vitrina, que es el único buscador desde el 2026-10-05.
 * Por tema envía `tipo`, `actividad` y `q`; por número, `numero`. Sin
 * JavaScript propio más allá de abrir el modal y marcar las categorías: el
 * resultado es una URL normal, con la tarjeta, el encaje y el Radar de la
 * vitrina. Antes (#109) enseñaba cinco resultados dentro del modal y tenía su
 * propio explorador en `/licitaciones/explorar`, que ahora redirige.
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
        aria-labelledby={`${uid}-titulo-modal`}
        onClick={(event) => {
          if (event.target === event.currentTarget) modalRef.current?.close();
        }}
      >
        <div className={styles.dialogCabecera}>
          <div>
            <p className={styles.dialogEyebrow}>BÚSQUEDA GUIADA</p>
            <h2 id={`${uid}-titulo-modal`}>Encuentra un proceso</h2>
            <p>Busca por tema o introduce el número SECOP II.</p>
          </div>
          <button
            type="button"
            className={styles.cerrar}
            onClick={() => modalRef.current?.close()}
            aria-label="Cerrar búsqueda"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <section className={styles.buscador} aria-label="Buscador guiado de procesos">
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
              <form className={styles.formTema} action="/licitaciones" method="get" role="search">
                <fieldset className={styles.categorias}>
                  <legend>Tipo de obra</legend>
                  <div className={styles.categoriasGrid}>
                    {[
                      {
                        value: "potable",
                        label: "Agua potable",
                        familia: "potable",
                        icono: "gota",
                      },
                      {
                        value: "residual",
                        label: "Aguas residuales",
                        familia: "residual",
                        icono: "tratamiento",
                      },
                      {
                        value: "redes",
                        label: "Redes y alcantarillado",
                        familia: "redes",
                        icono: "red",
                      },
                    ].map((opcion) => {
                      const seleccionada =
                        tema.sistema === opcion.value ||
                        (opcion.value === "potable" &&
                          (tema.sistema === "acueducto" || tema.sistema === "ptap")) ||
                        (opcion.value === "residual" && tema.sistema === "ptar") ||
                        (opcion.value === "redes" && tema.sistema === "alcantarillado");
                      return (
                        <button
                          key={opcion.value}
                          type="button"
                          className={styles.categoria}
                          data-familia={opcion.familia}
                          aria-pressed={seleccionada}
                          onClick={() =>
                            setTema((actual) => ({
                              ...actual,
                              sistema: actual.sistema === opcion.value ? "" : opcion.value,
                            }))
                          }
                        >
                          <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
                            {opcion.icono === "gota" ? (
                              <path
                                d="M16 3.5S7.5 14 7.5 20.5a8.5 8.5 0 0 0 17 0C24.5 14 16 3.5 16 3.5Z"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinejoin="round"
                              />
                            ) : opcion.icono === "tratamiento" ? (
                              <>
                                <path
                                  d="M5 9h22v9a7 7 0 0 1-7 7h-8a7 7 0 0 1-7-7V9Z"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M5 19c2-2 4-2 6 0s4 2 6 0 4-2 6 0 3 2 4 1M11 5h10M14 2h4"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                />
                              </>
                            ) : (
                              <path
                                d="M6 4v9h8v7h12M6 13v13h7m1-13h5V7h7m-12 13h7v6m-7-6v-6"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            )}
                          </svg>
                          <span>{opcion.label}</span>
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
                    placeholder="Bombeo, laboratorio…"
                    autoComplete="off"
                  />
                </label>
                <div className={styles.acciones}>
                  <button className={styles.buscar} type="submit">
                    Buscar procesos
                  </button>
                  <span>Abiertos · Colombia</span>
                </div>
              </form>
              <form className={styles.formNumero} action="/licitaciones" method="get" role="search">
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
      </dialog>
    </>
  );
}
