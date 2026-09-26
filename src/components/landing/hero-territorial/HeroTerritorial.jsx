"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatConteo } from "@/src/components/secop/format";
import { ruta } from "@/src/components/landing/seccionesHome";
import ListaTerritorios from "./ListaTerritorios";
import FichaDepartamento from "./FichaDepartamento";
import BandaMercado from "./BandaMercado";
import styles from "./hero-territorial.module.css";

export default function HeroTerritorial({
  mapa = null,
  departamentos = [],
  totalAbiertos = null,
  tipos = [],
  sector,
  heroStats,
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
      <div className={styles.topGrid}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>AGUA Y SANEAMIENTO · COLOMBIA</p>
          <h1 id="aq-hero-title">
            Explora el mercado de agua.
            <span>Entiende cada proceso.</span>
          </h1>
          <p className={styles.lead}>
            Explora los procesos de agua y saneamiento del SECOP II en Colombia. Encuentra
            oportunidades, consulta su ficha y sigue lo que te importa.
          </p>
          <Link className={styles.primaryCta} href={explorar.href}>
            Explorar procesos <span aria-hidden="true">→</span>
          </Link>
          <p className={styles.ctaMeta}>
            {sector?.procesosVigilados == null
              ? explorar.etiqueta
              : `${explorar.etiqueta} · ${formatConteo(sector.procesosVigilados)} procesos del sector`}
          </p>

          <div className={styles.kpis} aria-label="Indicadores nacionales">
            <div>
              <span>Procesos abiertos · Colombia</span>
              <strong>{formatConteo(totalAbiertos)}</strong>
            </div>
            <div>
              <span>Departamentos con procesos</span>
              <strong>{datosDisponibles ? formatConteo(departamentos.length) : "—"}</strong>
            </div>
            <div>
              <span>Tipos de proyecto · Colombia</span>
              <strong>{tipos.length || datosDisponibles ? formatConteo(tipos.length) : "—"}</strong>
            </div>
          </div>
        </div>

        <div className={styles.mapPanel} aria-label="Procesos abiertos por departamento">
          <div className={styles.mapHeading}>
            <span>Procesos abiertos por departamento</span>
            <strong>{datosDisponibles ? formatConteo(totalAbiertos) : "—"}</strong>
          </div>
          <div className={styles.map}>{mapa}</div>
          {mapa && totalAbiertos == null ? (
            <p className={styles.noData}>El mapa no tiene datos disponibles en este momento.</p>
          ) : null}
        </div>
      </div>

      <div className={styles.territorialGrid}>
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

        <div className={styles.detailPanel}>
          <FichaDepartamento departamento={seleccionado} totalAbiertos={totalAbiertos} />
          <div className={styles.types}>
            <h2>Tipos de proyecto · Colombia</h2>
            <p>Distribución nacional de procesos abiertos</p>
            {tipos.map((tipo) => (
              <Link href={`/licitaciones/tipo/${tipo.slug}`} key={tipo.clave}>
                <span>{tipo.label}</span>
                <span className={styles.typeBar} aria-hidden="true">
                  <span style={{ width: `${(100 * tipo.n) / maxTipo}%` }} />
                </span>
                <strong>{formatConteo(tipo.n)}</strong>
              </Link>
            ))}
            {tipos.length === 0 ? <p>Distribución no disponible.</p> : null}
          </div>
        </div>
      </div>

      <BandaMercado sector={sector} heroStats={heroStats} />
    </section>
  );
}
