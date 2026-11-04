"use client";
// La portada, como isla de cliente.
//
// Vivía en `app/page.js` hasta el 2026-09-22. Se movió aquí sin tocar su
// contenido para que `app/page.js` pueda ser un componente de SERVIDOR: el mapa
// departamental importa 62 kB de geometría y calcula 33 caminos, y dentro de un
// árbol `"use client"` todo eso viajaría al navegador. Ahora el servidor lo
// dibuja y lo entrega ya pintado por la prop `mapa`, que es el mismo patrón del
// hueco `semaforo` en `FilaProceso`.

import HeroTerritorialV3 from "@/src/components/landing/hero-territorial/HeroTerritorialV3";
import TuPerfil from "@/src/components/landing/tu-perfil/TuPerfil";
import Link from "next/link";
import styles from "./observatorio.module.css";
import AguaViva from "./AguaViva";

// La portada se concentra en dos cosas (2026-09-26): el mapa de procesos (hero
// territorial) y la Ficha Viva. Salieron las rutas de intención, el motor, el
// diagnóstico, el modelo de acceso, las preguntas frecuentes y la banda de
// cierre: repetían lo que ya dicen el hero y la ficha, o tienen su propia
// página (/diagnostico, /precios, las rutas de cada asistente).
//
// El 2026-09-27 salieron también el ticker de fichas recientes y el fondo
// "blueprint" animado (rejilla, línea de nivel, ondas y regla de profundidad):
// había quejas de usuarios de que la portada estaba muy cargada, y en el primer
// pliegue había 15 animaciones en marcha. Plan:
// docs/superpowers/plans/2026-09-27-portada-esencial.md. Su estado previo está
// en git.

/** Lo único que quedaba del CSS del fondo y no era el fondo. */
const PORTADA_CSS = `.bp-page a { text-decoration: none; cursor: pointer; }`;

/**
 * @param {{
 *   mapa?: import("react").ReactNode,
 *   destacados?: import("@/src/lib/landing/destacados-portada").DestacadoPortada[] | null,
 *   conteos?: import("@/src/lib/landing/conteos-familia").ConteoDepartamento[] | null,
 *   fondo?: import("react").ReactNode,
 *   mensaje?: import("react").ReactNode,
 *   gemelos?: import("react").ReactNode,
 * }} props — `mapa` llega ya renderizado desde el servidor. Es un hueco y no un
 * import: importarlo aquí lo arrastraría al bundle del navegador. `destacados`
 * son los de `destacadosPortada()`, con cuyos procesos el servidor dibujó ese
 * mapa; `null` si la consulta falló.
 *
 * Desde el 2026-10-04 la portada ya no recibe los agregados por departamento:
 * el mapa del hero marca los procesos elegidos en vez de contar por territorio
 * (spec 2026-10-04-hero-cinco-minifichas §7.2).
 */
export default function LandingPage({
  mapa = null,
  destacados = null,
  conteos = null,
  fondo = null,
  mensaje = null,
  gemelos = null,
}) {
  return (
    <div
      // La portada entera en oscuro (punto 45, 2026-09-26): el hero ya lo era y
      // el resto se unifica redefiniendo los tokens (globals.css, .tema-oscuro).
      className="bp-page tema-oscuro"
      style={{
        position: "relative",
        background: "var(--bg)",
        fontFamily: "var(--font-inter), sans-serif",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: PORTADA_CSS }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1440, margin: "0 auto" }}>
        {/* El hero V3 (2026-11-01): mensaje, mapa con las tres familias y, en su
            franja inferior, la Ficha Viva y los gemelos digitales. La Ficha
            Viva absorbió a la sección FichaViva que iba justo después. */}
        <HeroTerritorialV3
          mapa={mapa}
          destacados={destacados}
          conteos={conteos}
          fondo={fondo}
          mensaje={mensaje}
          gemelos={gemelos}
        />

        {/* Accesos al observatorio: las rutas y sus consultas SECOP II se conservan. */}
        <section aria-label="Observatorio de contratación AquaLicita" className={styles.section}>
          <header className={styles.intro}>
            <span className={styles.kicker}>HERRAMIENTAS DE INTELIGENCIA</span>
            <h2>
              Explora la contratación en <span>agua y saneamiento</span>
            </h2>
            <p>
              Dos herramientas complementarias para explorar adjudicaciones, analizar el mercado y
              consultar las entidades del sector, con datos de SECOP II.
            </p>
          </header>
          <div className={styles.grid}>
            <article className={`${styles.card} ${styles.projects}`}>
              <div className={styles.topline}>
                <span className={styles.icon} aria-hidden="true">
                  <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="m4 10 12-6 12 6-12 6-12-6Zm0 7 12 6 12-6M4 24l12 6 12-6" />
                  </svg>
                </span>
                <span>CONTRATACIÓN SECOP II</span>
              </div>
              <div className={styles.content}>
                <h3>
                  <Link href="/proyectos-adjudicados" className={styles.projectLink}>
                    Proyectos
                    <br />
                    adjudicados
                  </Link>
                </h3>
                <p>
                  Consulta y analiza las mayores adjudicaciones de agua y saneamiento del último mes
                  cerrado. Conoce quién contrató, a quién y por qué valor.
                </p>
                <span className={styles.cta}>
                  Explorar adjudicados <span aria-hidden="true">→</span>
                </span>
              </div>
              <AguaViva />
            </article>
            <Link href="/licitaciones/entidades" className={`${styles.card} ${styles.radar}`}>
              <div className={styles.topline}>
                <span className={styles.icon} aria-hidden="true">
                  <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="m4 10 12-6 12 6H4Zm2 3h20M7 25h18M4 28h24M9 13v12m7-12v12m7-12v12" />
                  </svg>
                </span>
                <span>ENTIDADES Y CONTRATACIÓN</span>
              </div>
              <div className={styles.content}>
                <h3>Radar institucional</h3>
                <p>
                  Consulta la actividad de contratación de entidades clave del sector. Explora su
                  historial, adjudicaciones y procesos abiertos.
                </p>
                <span className={styles.cta}>
                  Explorar entidades <span aria-hidden="true">→</span>
                </span>
              </div>
              <img
                className={styles.scene}
                src="/portada/observatorio/radar-institucional.webp"
                alt=""
                aria-hidden="true"
                loading="lazy"
                width="1100"
                height="733"
              />
            </Link>
          </div>
        </section>
        <TuPerfil />
      </div>
    </div>
  );
}
