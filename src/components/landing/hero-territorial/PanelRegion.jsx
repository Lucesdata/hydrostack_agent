"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { fechaDeCierre, PESTANA } from "@/src/lib/landing/destacados-portada";
import { hrefRegion, LIMITE_REGION, textoConteo } from "@/src/lib/landing/conteos-familia";
import {
  departamentoCorto,
  presupuestoLargo,
  ubicacionDe,
} from "@/src/lib/landing/proceso-portada";
import { frase, titulo } from "@/src/components/landing/texto";
import styles from "./hero-territorial.module.css";

/**
 * El panel de una región (spec 2026-10-07-hero-tres-destacados, PR 3): al
 * pulsar un departamento del mapa, sus procesos de la familia elegida
 * publicados en 2026, de mayor a menor presupuesto. Ocupa el sitio de la ficha
 * destacada hasta que se cierra.
 *
 * Cada proceso dice si recibe ofertas o no: el mapa cuenta todas las etapas y
 * un contrato en ejecución no se presenta como oportunidad. El enlace del pie
 * lleva a la vitrina solo si alguno recibe ofertas, porque la vitrina enseña
 * esos y no los demás; va arriba, junto al conteo, porque es el paso siguiente.
 *
 * `conteo` llega de los conteos del servidor, así que la cabecera se pinta al
 * instante; la lista espera a la API (`region.js`).
 */
export default function PanelRegion({ dpto, nombre, familia, conteo, estado, onCerrar }) {
  const tituloRef = useRef(null);
  // Al abrir o cambiar de región el foco va al título: en el celular el mapa
  // queda debajo y así el panel entra en vista sin desplazar a mano.
  useEffect(() => {
    tituloRef.current?.focus({ preventScroll: false });
  }, [dpto]);

  const corto = departamentoCorto(nombre);
  const procesos = estado.fase === "listo" ? estado.datos.procesos : [];
  return (
    <section className={styles.region} aria-labelledby="aq-region-titulo" data-familia={familia}>
      <div className={styles.regionCab}>
        <h2 id="aq-region-titulo" ref={tituloRef} tabIndex={-1}>
          {corto} · {PESTANA[familia]}
        </h2>
        <button type="button" className={styles.regionCerrar} onClick={onCerrar}>
          <span aria-hidden="true">←</span> Volver al destacado
        </button>
      </div>
      <p className={styles.criterio}>
        {textoConteo(conteo)}.{" "}
        {conteo.n > LIMITE_REGION
          ? `Aquí, los ${LIMITE_REGION} de mayor presupuesto`
          : "De mayor a menor presupuesto"}
        , por sede de la entidad.
      </p>
      {/* El paso siguiente va arriba: con cinco filas el pie quedaba bajo el
          primer pantallazo. */}
      {conteo.abiertos > 0 ? (
        <Link className={styles.enlaceFamilia} href={hrefRegion(nombre, familia)}>
          {conteo.abiertos === 1
            ? `Ver el que recibe ofertas en ${corto}`
            : `Ver los ${conteo.abiertos} que reciben ofertas en ${corto}`}{" "}
          <span aria-hidden="true">→</span>
        </Link>
      ) : (
        <p className={styles.regionNota}>Ninguno recibe ofertas hoy en {corto}.</p>
      )}
      {estado.fase === "cargando" ? (
        <p className={styles.regionNota} role="status">
          Cargando los procesos de {corto}…
        </p>
      ) : estado.fase === "error" ? (
        <p className={styles.regionNota} role="status">
          No pudimos cargar los procesos de {corto}.{" "}
          <button type="button" className={styles.regionReintentar} onClick={estado.reintentar}>
            Reintentar
          </button>
        </p>
      ) : procesos.length ? (
        <ol className={styles.regionLista}>
          {procesos.map((p) => {
            const fecha = fechaDeCierre(p.cierre);
            return (
              <li key={p.id}>
                <Link href={p.href} className={styles.regionObjeto} title={frase(p.objeto)}>
                  {frase(p.objeto)}
                </Link>
                <span className={styles.regionEntidad}>
                  {titulo(p.entidad) || "Entidad no disponible"} · {ubicacionDe(p)}
                </span>
                <span className={styles.regionDatos}>
                  <strong>{presupuestoLargo(p.presupuesto)}</strong>
                  <span data-abierto={p.abierto ? "" : undefined}>
                    {p.abierto
                      ? fecha
                        ? `Recibe ofertas hasta el ${fecha}`
                        : "Recibe ofertas"
                      : "No recibe ofertas"}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className={styles.regionNota}>No hay fichas para mostrar en {corto}.</p>
      )}
    </section>
  );
}
