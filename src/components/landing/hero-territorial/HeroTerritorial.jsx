"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatConteo } from "@/src/components/secop/format";
import { ruta } from "@/src/components/landing/seccionesHome";
import { colorDeTipo } from "@/src/lib/classify/tipo-color";
import ListaTerritorios from "./ListaTerritorios";
import FichaDepartamento from "./FichaDepartamento";
import BandaMercado from "./BandaMercado";
import styles from "./hero-territorial.module.css";

export default function HeroTerritorial({
  mapa = null,
  departamentos = [],
  totalAbiertos = null,
  tipos = [],
  sector = null,
  heroStats = null,
}) {
  const [busqueda, setBusqueda] = useState("");
  const [elegido, setElegido] = useState(null);
  const datosDisponibles = totalAbiertos != null;
  const seleccionado = useMemo(
    () => departamentos.find((d) => d.clave === elegido) ?? departamentos[0] ?? null,
    [departamentos, elegido]
  );
  const maxTipo = Math.max(1, ...tipos.map((t) => t.n));
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
              datosDisponibles={datosDisponibles}
            />
            <Link className={styles.allProcesses} href={explorar.href}>
              Ver todos los procesos <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        <div className={styles.mapPanel} aria-label="Procesos abiertos por departamento">
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
          <div className={styles.map}>{mapa}</div>
          {mapa && totalAbiertos == null ? (
            <p className={styles.noData}>El mapa no tiene datos disponibles en este momento.</p>
          ) : null}
        </div>

        <div className={styles.detailPanel}>
          <FichaDepartamento departamento={seleccionado} totalAbiertos={totalAbiertos} />
          <div className={styles.types}>
            <h2>Tipos de proyecto · Colombia</h2>
            <p>Distribución nacional de procesos abiertos</p>
            {tipos.map((tipo) => {
              const color = colorDeTipo(tipo.clave);
              return (
                <Link
                  href={`/licitaciones/tipo/${tipo.slug}`}
                  key={tipo.clave}
                  style={color ? { "--tipo": color.claro } : undefined}
                  data-familia={color?.familia}
                >
                  <span className={styles.typeNombre}>
                    <span className={styles.typePunto} aria-hidden="true" />
                    {tipo.label}
                    {color ? <small>{color.familiaLabel}</small> : null}
                  </span>
                  <strong>{formatConteo(tipo.n)}</strong>
                  <span className={styles.typeBar} aria-hidden="true">
                    <span style={{ width: `${(100 * tipo.n) / maxTipo}%` }} />
                  </span>
                </Link>
              );
            })}
            {tipos.length === 0 ? <p>Distribución no disponible.</p> : null}
          </div>
          {seleccionado && seleccionado.n > 0 ? (
            <Link
              className={styles.fichaCta}
              href={`/licitaciones/departamento/${seleccionado.slug}`}
              aria-label={`Ver fichas de ${seleccionado.label}`}
            >
              Ver fichas de {seleccionado.label} <span aria-hidden="true">→</span>
            </Link>
          ) : null}
        </div>
      </div>

      <BandaMercado sector={sector} heroStats={heroStats} />
    </section>
  );
}
