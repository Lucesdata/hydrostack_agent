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
import { getSessionDisplayUser } from "@/src/lib/supabase/get-session-user";
import { hasCoincidenciasNoVistas } from "@/src/lib/matching/record-coincidencias";
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

export const metadata = {
  title: "HydroStack — Inteligencia para contratación pública en agua y saneamiento",
  description:
    "HydroStack cruza tu perfil de oferente con los procesos activos de SECOP II en agua y saneamiento — elegibilidad, pliegos y alertas en un solo lugar.",
  keywords:
    "SECOP II, licitaciones agua y saneamiento, contratación pública Colombia, RUP, pliegos de condiciones",
};

export default async function RootLayout({ children }) {
  const user = await getSessionDisplayUser();
  const hasNewMatches = user ? await hasCoincidenciasNoVistas(user.id) : false;

  return (
    <html
      lang="es"
      className={`${orbitron.variable} ${ibmPlexMono.variable} ${inter.variable} ${jetbrainsMono.variable} ${ibmPlexSansCondensed.variable}`}
    >
      <body>
        <Navbar user={user} hasNewMatches={hasNewMatches} />
        <main style={{ position: "relative", zIndex: 1 }}>{children}</main>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
