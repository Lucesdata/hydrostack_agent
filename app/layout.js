import {
  Orbitron,
  IBM_Plex_Mono,
  IBM_Plex_Sans_Condensed,
  Inter,
  JetBrains_Mono,
} from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Navbar from "@/src/components/Navbar";
import S6Footer from "@/src/components/landing/S6Footer";
import { appUrl } from "@/src/lib/app-url";
import "./globals.css";

// Las 4 familias reales de la landing + calculadoras + Hydro_Agent, self-hosted
// vía next/font en vez del <link> a Google Fonts que había antes (evita el
// warning de lint y el round-trip a fonts.googleapis.com). Cada .variable se
// aplica al <html> más abajo y --mono/--sans/--orb/--font-mono/--font-sans en
// globals.css referencian estas variables — no se usan los nombres de fuente
// literales ("Orbitron", "IBM Plex Mono"…) en ningún lado del código.
const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-orbitron",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

// Solo para el headline del hero (rediseño "vidrio flotante" 2026-08-15).
const ibmPlexSansCondensed = IBM_Plex_Sans_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-ibm-plex-sans-condensed",
  display: "swap",
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
      className={`${orbitron.variable} ${ibmPlexMono.variable} ${inter.variable} ${jetbrainsMono.variable} ${ibmPlexSansCondensed.variable}`}
    >
      <body>
        <Navbar />
        <main style={{ position: "relative", zIndex: 1 }}>{children}</main>
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
