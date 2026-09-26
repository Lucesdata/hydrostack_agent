import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Navbar from "@/src/components/Navbar";
import S6Footer from "@/src/components/landing/S6Footer";
import { appUrl } from "@/src/lib/app-url";
import "./globals.css";

// Fuentes versionadas en app/fonts/ y servidas con next/font/local (2026-09-26,
// PENDIENTES §42). Antes eran cinco familias de next/font/google, y cada build
// —en CI y en Vercel— salía a la red a buscarlas: cuando Google Fonts respondía
// mal, el build caía entero aunque el cambio no tocara nada (pasó en los PR #45
// y #61). Ahora el build no depende de la red.
//
// De paso, se quedaron las tres que se usan. Orbitron no lo usaba nadie (--orb
// no aparece en el código) e IBM Plex Mono era una segunda monoespaciada: --mono
// apunta ahora a JetBrains Mono, la de todo lo demás. Once archivos y 181 kB
// pasaron a cinco y 130 kB. Los woff2 son el subconjunto latin de @fontsource
// (licencia SIL OFL, en app/fonts/OFL-*.txt), que cubre tildes, ñ, ü, ¿ y ¡.
//
// Cada .variable se aplica al <html> más abajo; globals.css y los componentes
// usan las variables, nunca el nombre literal de la fuente.
const inter = localFont({
  src: "./fonts/inter-latin-var.woff2",
  weight: "100 900",
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = localFont({
  src: [
    { path: "./fonts/jetbrains-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/jetbrains-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

// Titulares condensados (hero y secciones).
const ibmPlexSansCondensed = localFont({
  src: [
    {
      path: "./fonts/ibm-plex-sans-condensed-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/ibm-plex-sans-condensed-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-ibm-plex-sans-condensed",
  display: "swap",
  // No se precarga: ya no aparece en la parte visible de la portada (el titular
  // es Inter), y sus 39 kB competían con el LCP en una conexión lenta. Se pide
  // cuando una hoja la usa. Medido con Lighthouse el 2026-09-26.
  preload: false,
});

/**
 * El título global.
 *
 * Era "AquaLicita — Inteligencia para contratación pública en agua y
 * saneamiento": abre con la marca, que nadie busca todavía, y sigue con
 * "inteligencia para contratación pública", que no es lo que nadie teclea. Un
 * título posiciona por lo que la gente escribe, y lo que escribe es
 * "licitaciones de agua", "licitaciones acueducto SECOP", "contratos PTAR".
 *
 * El nuevo pone delante esos términos y deja la marca al final, donde sirve para
 * reconocer el resultado sin gastar los primeros caracteres —que son los que
 * pesan y los únicos que se ven en un móvil.
 *
 * `template` hace que cada página componga con la marca sin repetirla a mano:
 * antes cada ruta escribía "· AquaLicita" en su propio título y bastaba con que
 * una se olvidara para que el sitio hablara con dos voces.
 *
 * `metadataBase` NO es decorativo: sin él, las canónicas relativas que declaran
 * la ficha y las rutas facetadas (`alternates.canonical: "/licitaciones/…"`) no
 * pueden resolverse a una URL absoluta, que es como las quiere un buscador.
 */
export const metadata = {
  metadataBase: new URL(appUrl()),
  title: {
    default: "Licitaciones de agua y saneamiento en Colombia · AquaLicita",
    template: "%s · AquaLicita",
  },
  description:
    "Todos los procesos de agua potable y saneamiento del SECOP II, filtrados por tus reglas: acueducto, alcantarillado, PTAP y PTAR, con el detalle de qué exige cada uno.",
  keywords:
    "licitaciones agua, licitaciones acueducto, licitaciones alcantarillado, PTAR, PTAP, SECOP II, contratación pública Colombia, saneamiento básico",
};

/*
  Este layout NO lee la sesión, y es deliberado.

  Envuelve todas las páginas, así que cualquier `cookies()` que haga aquí
  arrastra a dinámicas también a las rutas facetadas (`/licitaciones/tipo/…`,
  `/departamento/…`, `/entidad/…` y la ficha), que se declaran estáticas a
  propósito y con razón medida. El 2026-09-15 eso tumbó las 43 en producción con
  500: "Page changed from static to dynamic at runtime ... reason: cookies".

  Y aunque Next lo permitiera, seguiría estando mal: el HTML de una página
  cacheada se sirve tal cual al siguiente visitante, de modo que hornear en él el
  avatar y el correo de alguien sería filtrarlos. El Navbar pide su sesión a
  /api/sesion desde el navegador, que es quien tiene la cookie.
*/
export default function RootLayout({ children }) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${jetbrainsMono.variable} ${ibmPlexSansCondensed.variable}`}
    >
      <body>
        <a className="saltar-contenido" href="#contenido">
          Saltar al contenido
        </a>
        <Navbar />
        {/* tabIndex -1: el salto mueve el foco aquí, no solo el scroll. */}
        <main
          id="contenido"
          tabIndex={-1}
          style={{ position: "relative", zIndex: 1, outline: "none" }}
        >
          {children}
        </main>
        {/*
          El pie vivía dentro de `app/page.js`, así que SOLO existía en la
          portada: desde cualquier otra página —una faceta, /precios, /pliego—
          no había forma de llegar a nada salvo por el nav. Sube aquí, que es
          donde un pie tiene sentido, y con él suben sus enlaces a /cuenta y
          /mis-coincidencias, que hasta ahora solo se alcanzaban desde el correo.
        */}
        <S6Footer />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
