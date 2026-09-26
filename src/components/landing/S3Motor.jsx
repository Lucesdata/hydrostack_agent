import Link from "next/link";
import { formatConteo } from "@/src/components/secop/format";
import { ruta } from "./seccionesHome";

/**
 * "Cómo funciona", en tres pasos y los tres sin cuenta.
 *
 * Eran cuatro (vigilar, filtrar, ver por qué calificas, auditar lo descartado)
 * y el spec de rediseño pedía quitar la sección. Se decidió el 2026-09-26
 * dejar una versión compacta que cuente el camino de la Ficha Viva: llegar a
 * una ficha, leerla y completar tus datos. Filtros, coincidencias y auditoría
 * no desaparecen: siguen en `S7Acceso`, que lista todas las secciones.
 *
 * El paso 3 no dice que el diagnóstico cambie el veredicto de la ficha, porque
 * no lo hace: no alimenta `habilitacionGate` (CLAUDE.md). Dice lo que devuelve.
 */
export default function S3Motor({ procesosVigilados }) {
  const PASOS = [
    {
      n: "01",
      titulo: "Llega a un proceso",
      cuerpo: `Por el mapa, por tu departamento o buscando por entidad u objeto: ${formatConteo(
        procesosVigilados
      )} procesos de agua y saneamiento del SECOP II, clasificados por tipo de obra.`,
      ...ruta("explorar"),
      cta: "VER FICHAS",
    },
    {
      n: "02",
      titulo: "Lee su ficha",
      cuerpo:
        "Qué se contrata, si recibe ofertas, si puedes participar y qué te falta, con el estado de cada requisito. El semáforo se ve sin cuenta.",
      href: "#ficha-viva",
      etiqueta: "sin cuenta",
      cta: "CÓMO RAZONA LA FICHA",
    },
    {
      n: "03",
      titulo: "Mide tu preparación",
      cuerpo:
        "Diez preguntas y sin cuenta: tu nivel de preparación, a qué escalón de contratación llegas y qué hacer primero.",
      ...ruta("diagnostico"),
      cta: "HACER EL DIAGNÓSTICO",
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
          Del mapa a la ficha, y de la ficha a lo que te falta
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
                  style={{ font: "10px var(--font-jetbrains-mono),monospace", color: "#525B5A" }}
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
