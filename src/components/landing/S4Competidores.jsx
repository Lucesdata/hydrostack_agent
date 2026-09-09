import Link from "next/link";
import { formatConteo } from "@/src/components/secop/format";
import { ruta } from "./seccionesHome";

const RUTA = ruta("competidores");

export default function S4Competidores({ oferentesHistoricos, sanciones }) {
  const DATOS = [
    {
      valor: formatConteo(oferentesHistoricos),
      etiqueta: "registros de quién se presentó",
      pie: "A qué proceso, contra quién y por cuánto.",
    },
    {
      valor: formatConteo(sanciones),
      etiqueta: "sanciones registradas",
      pie: "Para saber con quién compites antes de competir.",
    },
  ];

  return (
    <section className="section-pad" style={{ background: "#FAFAF7" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <span style={{ width: 8, height: 8, background: "#0369A1" }} />
          <span
            style={{
              font: "11px var(--font-jetbrains-mono),monospace",
              color: "#0369A1",
              letterSpacing: ".12em",
              textTransform: "uppercase",
            }}
          >
            Inteligencia de mercado · {RUTA.etiqueta}
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
          El pliego te dice qué piden. No te dice contra quién compites
        </h2>

        <p
          style={{
            font: "15px/1.6 var(--font-inter)",
            color: "#525B5A",
            maxWidth: "65ch",
            margin: "0 0 40px",
          }}
        >
          Quién se presenta en el sector, cuánto gana, a qué precio adjudica y si arrastra
          sanciones. Es información pública, pero está desperdigada en miles de expedientes: aquí ya
          está reunida.
        </p>

        <div className="grid-cards" style={{ marginBottom: 40 }}>
          {DATOS.map((d) => (
            <div key={d.etiqueta} style={{ borderLeft: "2px solid #0369A1", paddingLeft: 16 }}>
              <div
                style={{
                  font: "700 clamp(30px,3.6vw,42px)/1 var(--font-ibm-plex-sans-condensed)",
                  color: "#0A1F1C",
                }}
              >
                {d.valor}
              </div>
              <div
                style={{
                  font: "11px var(--font-jetbrains-mono),monospace",
                  color: "#0369A1",
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                  margin: "8px 0 6px",
                }}
              >
                {d.etiqueta}
              </div>
              <p style={{ font: "13px/1.5 var(--font-inter)", color: "#525B5A", margin: 0 }}>
                {d.pie}
              </p>
            </div>
          ))}
        </div>

        <Link
          href={RUTA.href}
          className="tap-target"
          style={{
            font: "600 12px var(--font-jetbrains-mono),monospace",
            color: "#0369A1",
            textDecoration: "none",
          }}
        >
          [ VER COMPETIDORES → ]
        </Link>
      </div>
    </section>
  );
}
