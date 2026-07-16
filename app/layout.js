import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { LangProvider } from "@/src/lib/i18n";
import Navbar from "@/src/components/Navbar";
import GlobalProgress from "@/src/components/BuildFlow/GlobalProgress";
import "./globals.css";

export const metadata = {
  title: "HydroStack — Water & Sanitation Engineering",
  description: "Technical calculation tools for water and sanitation engineering. Septic tanks, Imhoff tanks, activated sludge, UASB reactors and more.",
  keywords: "septic tank calculator, fosa septica, water treatment, wastewater design, RAS Colombia, EN 12566",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;1,300&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <LangProvider>
          <Navbar />
          <main style={{ position: "relative", zIndex: 1 }}>{children}</main>
          <GlobalProgress />
        </LangProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
