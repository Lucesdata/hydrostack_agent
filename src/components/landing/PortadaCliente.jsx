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

        {/* Segunda y última sección (2026-11-01; era la tercera): «¿Puedes participar?», el
            cierre hacia la cuenta gratuita. La portada son estas tres y no se
            apilan más sin una razón medida. */}
        <section aria-label="Observatorio de contratación AquaLicita" style={{padding:"24px clamp(16px,4vw,54px) 45px"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:18}}>
            <Link href="/proyectos-adjudicados" style={{display:"block",position:"relative",minHeight:210,padding:25,border:"1px solid #1c6575",borderRadius:18,background:"linear-gradient(110deg,#082c3d,#00545b)",color:"#ecffff",textDecoration:"none",overflow:"hidden"}}>
              <img src="/ilustraciones/adjudicaciones-agua.svg" alt="" aria-hidden="true" style={{position:"absolute",width:250,right:-10,bottom:-20,opacity:.85}}/>
              <span style={{color:"#7be8e0",fontSize:11,letterSpacing:".13em",fontWeight:800}}>OBSERVATORIO SECOP II</span><h2 style={{position:"relative",fontSize:27,maxWidth:240,margin:"15px 0 9px"}}>Proyectos adjudicados</h2>
              <p style={{position:"relative",fontSize:13,maxWidth:245,color:"#c1e2e4"}}>Las mayores adjudicaciones de agua y saneamiento del último mes cerrado.</p><b style={{position:"relative",fontSize:13,color:"#83f3e9"}}>Explorar proyectos →</b>
            </Link>
            <Link href="/licitaciones/entidades" style={{display:"block",position:"relative",minHeight:210,padding:25,border:"1px solid #1c6575",borderRadius:18,background:"linear-gradient(110deg,#082c3d,#00545b)",color:"#ecffff",textDecoration:"none",overflow:"hidden"}}>
              <img src="/ilustraciones/radar-agua.svg" alt="" aria-hidden="true" style={{position:"absolute",width:250,right:-10,bottom:-20,opacity:.85}}/>
              <span style={{color:"#7be8e0",fontSize:11,letterSpacing:".13em",fontWeight:800}}>FICHAS VIVAS INSTITUCIONALES</span><h2 style={{position:"relative",fontSize:27,maxWidth:260,margin:"15px 0 9px"}}>Radar institucional</h2>
              <p style={{position:"relative",fontSize:13,maxWidth:250,color:"#c1e2e4"}}>Descubre quién contrata, consulta entidades y sigue su actividad.</p><b style={{position:"relative",fontSize:13,color:"#83f3e9"}}>Explorar entidades →</b>
            </Link>
          </div>
        </section>
        <TuPerfil />
      </div>
    </div>
  );
}
