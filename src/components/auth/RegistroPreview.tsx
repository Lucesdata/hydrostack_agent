"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import Minifichas from "@/src/components/landing/hero-territorial/Minifichas";
import {
  procesoDesdeObjetivo,
  useActivoEnMapa,
} from "@/src/components/landing/hero-territorial/sincronia";
import {
  criterioDe,
  FAMILIAS_DESTACADAS,
  PESTANA,
  procesosDe,
  type DestacadoPortada,
} from "@/src/lib/landing/destacados-portada";
import { familiaDe } from "@/src/lib/landing/proceso-portada";
import styles from "./registro.module.css";

/** La geometría llega dibujada desde el servidor; solo la selección es local. */
export default function RegistroPreview({
  destacados,
  mapa,
  cargando = false,
}: {
  destacados: DestacadoPortada[] | null;
  mapa: ReactNode;
  cargando?: boolean;
}) {
  const [familia, setFamilia] = useState(
    () => destacados?.find((d) => d.proceso)?.familia ?? FAMILIAS_DESTACADAS[0]
  );
  const elegido = destacados?.find((d) => d.familia === familia);
  const proceso = elegido?.proceso ?? null;
  const contenedor = useRef<HTMLDivElement>(null);
  const familias = useMemo(
    () => new Map(procesosDe(destacados).map((p) => [p.id, familiaDe(p.tipoProyecto)])),
    [destacados]
  );
  useActivoEnMapa(contenedor, proceso?.id ?? null, familias);

  return (
    <aside className={styles.territorio} aria-label="Explora AquaLicita antes de registrarte">
      <div className={styles.intro}>
        <span className={styles.eyebrow}>AGUA Y SANEAMIENTO · COLOMBIA</span>
        <h2>
          Tu próxima oportunidad
          <br />
          <span>empieza aquí.</span>
        </h2>
        <p>Del territorio al pliego. Encuentra procesos de agua y entiende qué te piden.</p>
      </div>
      <div className={styles.exploracion} ref={contenedor}>
        <div className={styles.familias} role="group" aria-label="Elegir familia de procesos">
          {FAMILIAS_DESTACADAS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={familia === f}
              onClick={() => setFamilia(f)}
              disabled={cargando || destacados === null}
            >
              {PESTANA[f]}
            </button>
          ))}
        </div>
        <div
          className={styles.mapa}
          onPointerOver={(event) => {
            const id = procesoDesdeObjetivo(event.target);
            const d = destacados?.find((x) => x.proceso?.id === id);
            if (d) setFamilia(d.familia);
          }}
        >
          {mapa}
        </div>
        <div className={styles.ficha}>
          <p className={styles.fichaEtiqueta}>UNA VISTA A LOS PROCESOS</p>
          {proceso && elegido ? (
            <>
              <Minifichas proceso={proceso} />
              <details className={styles.criterio}>
                <summary>¿Por qué este proceso?</summary>
                <p>{criterioDe(elegido)}</p>
              </details>
            </>
          ) : (
            <div className={styles.sinDatos} role="status">
              <p>
                {cargando
                  ? "Cargando procesos…"
                  : destacados === null
                    ? "No pudimos cargar los procesos ahora."
                    : "No hay procesos destacados de esta familia."}
              </p>
              <Link href="/licitaciones">Explorar las fichas disponibles →</Link>
            </div>
          )}
        </div>
      </div>
      <p className={styles.fuente}>Datos del SECOP II · Ubicación de la entidad contratante.</p>
      <ul className={styles.beneficios} aria-label="Qué incluye tu cuenta">
        <li>
          <span aria-hidden="true">01</span>
          <div>
            <strong>Guarda tus procesos</strong>
            <p>Vuelve a lo que te interesa.</p>
          </div>
        </li>
        <li>
          <span aria-hidden="true">02</span>
          <div>
            <strong>Entiende el pliego</strong>
            <p>Consulta sus requisitos.</p>
          </div>
        </li>
        <li>
          <span aria-hidden="true">03</span>
          <div>
            <strong>Configura tus alertas</strong>
            <p>Procesos nuevos según tu perfil.</p>
          </div>
        </li>
      </ul>
    </aside>
  );
}
