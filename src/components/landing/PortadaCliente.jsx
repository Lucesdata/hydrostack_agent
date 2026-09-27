"use client";
// La portada, como isla de cliente.
//
// Vivía en `app/page.js` hasta el 2026-09-22. Se movió aquí sin tocar su
// contenido para que `app/page.js` pueda ser un componente de SERVIDOR: el mapa
// departamental importa 62 kB de geometría y calcula 33 caminos, y dentro de un
// árbol `"use client"` todo eso viajaría al navegador. Ahora el servidor lo
// dibuja y lo entrega ya pintado por la prop `mapa`, que es el mismo patrón del
// hueco `semaforo` en `FilaProceso`.

import { useEffect, useState } from "react";
import HeroTerritorial from "@/src/components/landing/hero-territorial/HeroTerritorial";
import FichaViva from "@/src/components/landing/ficha-viva/FichaViva";

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
 *   departamentos?: import("@/src/lib/secop/agregados").FilaAgregado[],
 *   totalAbiertos?: number | null,
 *   tipos?: import("@/src/lib/secop/agregados").FilaAgregado[],
 * }} props — `mapa` llega ya renderizado desde el servidor. Es un hueco y no un
 * import: importarlo aquí lo arrastraría al bundle del navegador.
 */
export default function LandingPage({
  mapa = null,
  departamentos = [],
  totalAbiertos = null,
  tipos = [],
}) {
  // Procesos del sector vigilados, para la línea bajo el CTA del hero. Se
  // queda en null si el fetch falla: la UI dice "datos desde SECOP II" sin la
  // cifra.
  const [sector, setSector] = useState(null);

  useEffect(() => {
    let vivo = true;
    fetch("/api/landing-stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (vivo && d?.sector) setSector(d.sector);
      })
      .catch(() => {
        /* se queda en null: la frase sigue siendo cierta sin la cifra */
      });
    return () => {
      vivo = false;
    };
  }, []);

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
        <HeroTerritorial
          mapa={mapa}
          departamentos={departamentos}
          totalAbiertos={totalAbiertos}
          tipos={tipos}
          sector={sector}
        />

        {/* La Ficha Viva: qué se encuentra al llegar a una ficha. Va justo
            después del hero porque el hero existe para llevar a una ficha. */}
        <FichaViva />
      </div>
    </div>
  );
}
