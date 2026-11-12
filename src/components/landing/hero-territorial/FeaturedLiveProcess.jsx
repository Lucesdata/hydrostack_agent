import Link from "next/link";
import { rotuloDeObjeto, titulo } from "@/src/components/landing/texto";
import {
  estadoVisible,
  familiaDe,
  presupuestoLargo,
  ubicacionDe,
} from "@/src/lib/landing/proceso-portada";
import { fechaDeCierre } from "@/src/lib/landing/destacados-portada";
import { pastillaDe } from "./Minifichas";
import styles from "./hero-v3.module.css";

/**
 * La Ficha Viva de la franja inferior: un proceso real del destacado activo
 * con título, entidad, estado, presupuesto y cierre, (antes, la sección
 * FichaViva bajo el hero; sus cuatro accesos a secciones salieron el 2026-11-02).
 *
 * Es el mismo proceso que marca el mapa. Si se abre un departamento, su panel
 * ocupa este sitio. El estado sale de `estadoVisible()` y el cierre de la
 * recepción de ofertas: un proceso vencido no se pinta como abierto. Sin
 * proceso, lo dice (no se rellena con otro).
 *
 * La tarjeta (2026-11-11) se lee como un expediente: una cinta con el tipo de
 * obra y el número publicado del proceso, el objeto y la entidad, y tres
 * casillas rotuladas —estado, presupuesto y recepción de ofertas—. Lleva `key`
 * por proceso: al cambiar de pestaña entra con un fundido en vez de cambiar el
 * texto de golpe. Todo lo que pinta sale del mismo `ProcesoPortada`.
 */

/** El trazo del icono de la tarjeta, por familia (decorativo: el tipo va en el texto). */
const TRAZO = {
  potable: <path d="M12 3.5s-6 6.6-6 11a6 6 0 0 0 12 0c0-4.4-6-11-6-11z" />,
  residual: (
    <path d="M3 9c2.5-2 4.5-2 7 0s4.5 2 7 0 2.5-1.5 4-1.5M3 15c2.5-2 4.5-2 7 0s4.5 2 7 0 2.5-1.5 4-1.5" />
  ),
  redes: <path d="M3 9h11a4 4 0 0 1 4 4v8M3 15h8a1 1 0 0 1 1 1v5" />,
  otros: <path d="M5 12h.01M12 12h.01M19 12h.01" />,
};

export default function FeaturedLiveProcess({
  proceso,
  cierre,
  region = null,
  vacio = "",
  pie = null,
}) {
  const objeto = proceso ? rotuloDeObjeto(proceso.objeto) : "";
  const cierreTexto = fechaDeCierre(cierre ?? null);
  return (
    <section className={styles.ficha} aria-labelledby="aq-ficha-titulo">
      <header className={styles.fichaCab}>
        <span className={styles.fichaIcono} aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            width="30"
            height="30"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3 3 8l9 5 9-5-9-5z" />
            <path d="m3 13 9 5 9-5M3 17.5l9 5 9-5" />
          </svg>
        </span>
        <div>
          <h2 id="aq-ficha-titulo">Ficha Viva</h2>
          <p>Todo el ciclo del proceso en un solo lugar, siempre actualizada.</p>
        </div>
      </header>
      {region ? (
        region
      ) : proceso ? (
        <>
          <article
            key={proceso.id}
            className={styles.fichaTarjeta}
            data-familia={familiaDe(proceso.tipoProyecto)}
          >
            <p className={styles.fichaCinta}>
              <span className={styles.fichaTipo}>
                <span aria-hidden="true" />
                {pastillaDe(proceso.tipoProyecto)}
              </span>
              <span className={styles.fichaNumero}>
                <span className="sr-only">Proceso: </span>
                {proceso.numeroProceso}
              </span>
            </p>
            <span className={styles.fichaAvatar} aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                width="26"
                height="26"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {TRAZO[familiaDe(proceso.tipoProyecto)] ?? TRAZO.otros}
              </svg>
            </span>
            <div className={styles.fichaTitulos}>
              <h3 title={objeto}>
                <Link href={proceso.href} aria-label={`Ver ficha: ${objeto}`}>
                  {objeto}
                </Link>
              </h3>
              <p>
                {titulo(proceso.entidad) || "Entidad no disponible"} · {ubicacionDe(proceso)}
              </p>
              {proceso.contextoTipo ? <p>{proceso.contextoTipo}</p> : null}
            </div>
            <span className={styles.fichaFlecha} aria-hidden="true">
              →
            </span>
            <ul className={styles.fichaDatos}>
              <li data-abierto={proceso.abierto ? "" : undefined}>
                <small>Estado</small>
                <span className={styles.fichaEstado}>
                  <span aria-hidden="true" />
                  {estadoVisible(proceso)}
                </span>
              </li>
              <li>
                <small>Presupuesto</small>
                {presupuestoLargo(proceso.presupuesto)}
              </li>
              <li>
                <small>Recepción de ofertas</small>
                {cierreTexto ? `Cierre: ${cierreTexto}` : "Cierre sin fecha publicada"}
              </li>
            </ul>
          </article>
        </>
      ) : (
        <p className={styles.fichaVacio} role="status">
          {vacio}
        </p>
      )}
      {pie}
    </section>
  );
}
