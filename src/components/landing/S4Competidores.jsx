import Link from "next/link";
import { formatConteo } from "@/src/components/secop/format";
import { SECCIONES_HOME } from "./seccionesHome";

const RUTA = SECCIONES_HOME.find((s) => s.id === "competidores");

export default function S4Competidores({ oferentesHistoricos, sanciones }) {
  const DATOS = [
    {
      valor: formatConteo(oferentesHistoricos),
      etiqueta: "registros de quién se presentó",
      pie: "A qué proceso, contra quién y por cuánto.",
    },
    {
      valor: formatConteo(sanciones),
      etiqueta: "sanciones cruzadas",
      pie: "Para saber con quién compites antes de competir.",
    },
  ];

  return (
    <section style={{ padding: "80px 48px", background: "#FAFAF7" }}>
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
            font: "700 clamp(28px,3.4vw,40px)/1.2 var(--font-ibm-plex-sans-condensed)",
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
            maxWidth: 640,
            margin: "0 0 40px",
          }}
        >
          Quién se presenta en tu zona, cuánto gana, a qué precio adjudica y si arrastra sanciones.
          Es información pública, pero está desperdigada en miles de expedientes: aquí ya está
          reunida.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
            gap: 32,
            marginBottom: 40,
          }}
        >
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
