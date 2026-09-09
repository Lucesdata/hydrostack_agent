import Link from "next/link";
import { formatConteo } from "@/src/components/secop/format";
import { ruta } from "./seccionesHome";

export default function S3Motor({ procesosVigilados }) {
  const PASOS = [
    {
      n: "01",
      titulo: "Se vigila el sector entero",
      cuerpo: `Todo lo que publica el SECOP II pasa por una red sectorial: ${formatConteo(
        procesosVigilados
      )} procesos de agua y saneamiento clasificados, no el SECOP completo.`,
      ...ruta("explorar"),
      cta: "EXPLORAR PROCESOS",
    },
    {
      n: "02",
      titulo: "Tus reglas lo filtran",
      cuerpo:
        "Cuantía, zona, entidad, modalidad y palabras excluidas. El motor es determinista: la misma regla da siempre el mismo resultado, y puedes auditar por qué.",
      ...ruta("filtros"),
      cta: "DEFINIR FILTROS",
    },
    {
      n: "03",
      titulo: "Ves por qué calificas o por qué no",
      cuerpo:
        "Cada requisito habilitante es una compuerta con su estado. El semáforo lo ves sin cuenta; la explicación de cada compuerta, con cuenta.",
      ...ruta("coincidencias"),
      cta: "VER COINCIDENCIAS",
    },
    {
      n: "04",
      titulo: "Te avisamos, no te toca vigilar",
      cuerpo:
        "Correo diario con lo nuevo que encaja, y un enlace permanente que sigue diciendo lo mismo tres semanas después.",
      ...ruta("alertas"),
      cta: "CONFIGURAR ALERTAS",
    },
  ];

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
            Cómo funciona
          </span>
        </div>

        <h2
          style={{
            font: "700 var(--step-h2)/1.2 var(--font-ibm-plex-sans-condensed)",
            color: "#0A1F1C",
            margin: "0 0 48px",
            maxWidth: 720,
          }}
        >
          Un motor que vigila por ti, y que te enseña cómo decide
        </h2>

        <div style={{ display: "grid", gap: 0 }}>
          {PASOS.map((p) => (
            <div
              key={p.n}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0,1fr)",
                gap: 8,
                padding: "28px 0",
                borderTop: "1px solid #DADAD2",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}>
                <span
                  style={{ font: "10px var(--font-jetbrains-mono),monospace", color: "#6B746F" }}
                >
                  [ {p.n} ]
                </span>
                <div style={{ font: "600 20px/1.3 var(--font-inter)", color: "#0A1F1C" }}>
                  {p.titulo}
                </div>
                <span
                  style={{
                    font: "10px var(--font-jetbrains-mono),monospace",
                    color: "#6B746F",
                    border: "1px solid #DADAD2",
                    padding: "2px 8px",
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                  }}
                >
                  {p.etiqueta}
                </span>
              </div>
              <p
                style={{
                  font: "14px/1.6 var(--font-inter)",
                  color: "#525B5A",
                  margin: 0,
                  maxWidth: "65ch",
                }}
              >
                {p.cuerpo}
              </p>
              <Link
                href={p.href}
                className="tap-target"
                style={{
                  font: "600 12px var(--font-jetbrains-mono),monospace",
                  color: "#0369A1",
                  textDecoration: "none",
                }}
              >
                [ {p.cta} ]
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
