import type { Metadata } from "next";
import { LangProvider } from "@/lib/i18n";
import Navbar from "@/components/Common/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "HydroStack — Water & Sanitation Engineering",
  description: "Technical calculation tools for water and sanitation engineering. Septic tanks, Imhoff tanks, activated sludge, UASB reactors and more.",
  keywords: "septic tank calculator, fosa septica, water treatment, wastewater design, RAS Colombia, EN 12566",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;1,300&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* Fixed background grid */}
        <div className="bg-grid" aria-hidden="true"/>
        {/* CRT scanline */}
        <div className="scanline" aria-hidden="true"/>
        <LangProvider>
          <Navbar />
          <main style={{ position: "relative", zIndex: 1 }}>{children}</main>
        </LangProvider>
      </body>
    </html>
  );
}
