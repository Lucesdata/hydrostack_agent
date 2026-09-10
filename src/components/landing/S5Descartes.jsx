import Link from "next/link";
import { ruta } from "./seccionesHome";

const RUTA = ruta("auditoria");

/**
 * Los motivos son los de `EXPLICA` en app/auditoria/explica.ts, literales —
 * `src/__tests__/landing/explica.test.ts` compara las dos listas y falla si
 * divergen, así que exportarla aquí no es opcional.
 *
 * Esta sección NO lleva cifras a propósito: `descartesPorMotivo()` va por
 * accountId, así que cualquier total que se pusiera aquí sería el de otra
 * persona. Es el mismo error que tuvo el ticker con sus montos ficticios.
 */
export const MOTIVOS = [
  "Ni el código UNSPSC ni el texto del objeto coincidieron con ningún criterio",
  "Segmento UNSPSC 80 (gestión y personal): se excluye en la ingesta porque midió ~0 % de relevancia",
  "Contenía una de tus palabras excluidas",
  "El presupuesto queda fuera del rango que fijaste",
  "La entidad no está en las zonas que seleccionaste",
  "La entidad no está en tu lista",
  "La modalidad de contratación no está en tu lista",
];

export default function S5Descartes() {
  return (
    <section className="section-pad">
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <span style={{ width: 8, height: 8, background: "#0369A1" }} />
          <span
            style={{
              font: "11px var(--font-jetbrains-mono),monospace",
              color: "#0369A1",
              letterSpacing: ".08em",
            }}
          >
            Transparencia · {RUTA.etiqueta}
          </span>
        </div>

        <h2
          style={{
            font: "700 var(--step-h2)/1.2 var(--font-ibm-plex-sans-condensed)",
            color: "#0A1F1C",
            margin: "0 0 16px",
            maxWidth: 760,
          }}
        >
          Un filtro demasiado estrecho no da errores. Da silencio
        </h2>

        <p
          style={{
            font: "15px/1.6 var(--font-inter)",
            color: "#525B5A",
            maxWidth: "65ch",
            margin: "0 0 36px",
          }}
        >
          Y el silencio no se ve. Por eso guardamos cada proceso que tus reglas descartaron, con el
          motivo exacto, y puedes revisarlos cuando quieras. Dos de los motivos de abajo son
          distintos: son la red sectorial que decide qué entra antes de que exista un proceso que
          guardar, así que esos no quedan uno por uno — se muestran igual, para que el criterio no
          quede oculto. Si al leerlos aparece algo que sí te interesaba, el filtro está mal — y ya
          sabes cuál.
        </p>

        <ul
          className="grid-cards"
          style={{ listStyle: "none", padding: 0, margin: "0 0 36px", maxWidth: 900 }}
        >
          {MOTIVOS.map((m) => (
            <li
              key={m}
              style={{
                font: "13px/1.5 var(--font-inter)",
                color: "#525B5A",
                paddingLeft: 16,
                borderLeft: "1px solid #DADAD2",
              }}
            >
              {m}
            </li>
          ))}
        </ul>

        <Link
          href={RUTA.href}
          className="tap-target"
          style={{
            font: "600 12px var(--font-jetbrains-mono),monospace",
            color: "#0369A1",
            textDecoration: "none",
          }}
        >
          [ VER QUÉ SE DESCARTA ]
        </Link>
      </div>
    </section>
  );
}
