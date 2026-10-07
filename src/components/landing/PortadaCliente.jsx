"use client";
// La portada, como isla de cliente.
//
// Vivía en `app/page.js` hasta el 2026-09-22. Se movió aquí sin tocar su
// contenido para que `app/page.js` pueda ser un componente de SERVIDOR: el mapa
// departamental importa 62 kB de geometría y calcula 33 caminos, y dentro de un
// árbol `"use client"` todo eso viajaría al navegador. Ahora el servidor lo
// dibuja y lo entrega ya pintado por la prop `mapa`, que es el mismo patrón del
// hueco `semaforo` en `FilaProceso`.

import HeroTerritorial from "@/src/components/landing/hero-territorial/HeroTerritorial";
import { frase } from "@/src/components/landing/texto";
import FichaViva from "@/src/components/landing/ficha-viva/FichaViva";
import { procesosDe } from "@/src/lib/landing/destacados-portada";

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
 * }} props — `mapa` llega ya renderizado desde el servidor. Es un hueco y no un
 * import: importarlo aquí lo arrastraría al bundle del navegador. `destacados`
 * son los de `destacadosPortada()`, con cuyos procesos el servidor dibujó ese
 * mapa; `null` si la consulta falló.
 *
 * Desde el 2026-10-04 la portada ya no recibe los agregados por departamento:
 * el mapa del hero marca los procesos elegidos en vez de contar por territorio
 * (spec 2026-10-04-hero-cinco-minifichas §7.2).
 */
export default function LandingPage({ mapa = null, destacados = null, conteos = null }) {
  // La franja de la ficha enlaza las secciones del primer destacado del hero:
  // uno fijo, no el de la pestaña elegida, para que sus cuatro enlaces no
  // cambien de destino mientras se mira el hero.
  const primero = procesosDe(destacados)[0];
  const destacado = primero ? { href: primero.href, objeto: frase(primero.objeto) } : null;

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
        <HeroTerritorial mapa={mapa} destacados={destacados} conteos={conteos} />

        {/* La franja de la ficha: los cuatro accesos al primer proceso del
            hero. Va justo después del hero porque el hero existe para llevar a
            una ficha. */}
        <FichaViva destacado={destacado} />
      </div>
    </div>
  );
}
