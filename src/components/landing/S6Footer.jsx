import Link from "next/link";
import { COLUMNAS_PIE, NOMBRE_POR_ID, ruta } from "./seccionesHome";

/**
 * El pie enlazaba a /terms y /privacy, que nunca existieron. Ahora las rutas
 * salen de SECCIONES_HOME, que `enlaces.test.ts` verifica contra `app/`: un
 * enlace roto en el pie deja de ser algo que se descubre haciendo clic.
 *
 * Desde 2026-09-15 tampoco decide sus propias columnas: las declara
 * `COLUMNAS_PIE` en seccionesHome.js, junto al nav. Eran dos listas sueltas
 * —cinco destinos arriba, cuatro distintos abajo— y ninguna de las dos era "la
 * navegación del producto". Ahora si una ruta no aparece en ninguna de las dos,
 * se ve de un vistazo en un solo archivo.
 */

const href = (id) => ruta(id).href;

// El pie usa el azul noche de la portada (#061423) y el borde tenue de la barra
// de navegación. Era un verde casi negro (#070E0C) con una línea casi blanca
// (#DADAD2): sobre la portada se veía como otra web pegada debajo (2026-10-22).
// Los contrastes los mide src/__tests__/design/pie.test.ts.
export const COLORES_PIE = {
  fondo: "#061423",
  borde: "rgba(140, 190, 225, 0.16)",
  separador: "rgba(140, 190, 225, 0.14)",
  texto: "#9fb4c6",
  grupo: "#7dd3fc",
};

const linkStyle = {
  font: "13px var(--font-inter)",
  color: COLORES_PIE.texto,
  textDecoration: "none",
  display: "flex",
  alignItems: "center",
  minHeight: 44,
  padding: "3px 0",
};

export default function S6Footer() {
  return (
    <footer
      style={{
        padding: "48px var(--gutter) 32px",
        background: COLORES_PIE.fondo,
        borderTop: `1px solid ${COLORES_PIE.borde}`,
      }}
    >
      <div
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          display: "flex",
          gap: 64,
          flexWrap: "wrap",
          marginBottom: 40,
        }}
      >
        {COLUMNAS_PIE.map((col) => (
          <div key={col.grupo}>
            <div
              style={{
                font: "10px var(--font-jetbrains-mono),monospace",
                color: COLORES_PIE.grupo,
                textTransform: "uppercase",
                letterSpacing: ".12em",
                marginBottom: 12,
              }}
            >
              {col.grupo}
            </div>
            {col.ids.map((id) => (
              <Link key={id} href={href(id)} style={linkStyle}>
                {NOMBRE_POR_ID[id]}
              </Link>
            ))}
          </div>
        ))}
      </div>

      <div
        style={{
          textAlign: "center",
          color: COLORES_PIE.texto,
          font: "12px var(--font-inter)",
          borderTop: `1px solid ${COLORES_PIE.separador}`,
          paddingTop: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 6,
            marginBottom: 12,
          }}
        >
          <span
            style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)" }}
          />
          <span>Datos SECOP II · actualización diaria</span>
        </div>
        {/* Créditos de la geometría del mapa de la portada: el DANE lo pide y
            geoBoundaries (CC BY 4.0) lo exige (data/geo/README.md). */}
        <p style={{ margin: "0 0 8px", fontSize: 11.5 }}>
          Mapa: DANE, MGN 2025 · Islas:{" "}
          <a
            href="https://www.geoboundaries.org"
            rel="noopener noreferrer"
            style={{ color: "inherit" }}
          >
            geoBoundaries
          </a>{" "}
          (CC BY 4.0)
        </p>
        <p style={{ margin: 0 }}>© 2026 AquaLicita. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
