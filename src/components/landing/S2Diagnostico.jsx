import Link from "next/link";
import { ruta } from "./seccionesHome";

const RUTA = ruta("diagnostico");

/** Lo que devuelve `calcularDiagnostico`, en el orden en que lo lee el usuario. */
const DEVUELVE = [
  {
    n: "01",
    t: "Tu nivel de preparación",
    d: "Cuatro bandas, de «apenas empiezas» a «listo para presentarte».",
  },
  {
    n: "02",
    t: "Tu escalón de contratación",
    d: "A qué modalidades puedes aspirar hoy con lo que ya tienes.",
  },
  {
    n: "03",
    t: "Tu plan de acción",
    d: "Qué te falta exactamente, en orden, empezando por lo que te bloquea.",
  },
];

export default function S2Diagnostico() {
  return (
    <section className="section-pad" style={{ background: "var(--accent-faint)" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <span style={{ width: 8, height: 8, background: "var(--accent)" }} />
          <span
            style={{
              font: "11px var(--font-jetbrains-mono),monospace",
              color: "var(--accent)",
              letterSpacing: ".08em",
            }}
          >
            Paso previo · opcional · {RUTA.etiqueta}
          </span>
        </div>

        <h2
          style={{
            font: "700 var(--step-h2)/1.2 var(--font-ibm-plex-sans-condensed)",
            color: "var(--text-primary)",
            margin: "0 0 16px",
            maxWidth: 720,
          }}
        >
          Antes de perseguir un contrato, sabe si puedes ganarlo
        </h2>

        <p
          style={{
            font: "15px/1.6 var(--font-inter)",
            color: "var(--text-muted)",
            maxWidth: "65ch",
            margin: "0 0 40px",
          }}
        >
          Diez preguntas, sin cuenta y sin IA: reglas fijas, así que las mismas respuestas dan
          siempre el mismo veredicto.
        </p>

        <div className="grid-cards" style={{ marginBottom: 40 }}>
          {DEVUELVE.map((x) => (
            <div key={x.n} style={{ borderTop: "2px solid var(--accent)", paddingTop: 16 }}>
              <span
                style={{
                  font: "10px var(--font-jetbrains-mono),monospace",
                  color: "var(--text-muted)",
                }}
              >
                [ {x.n} ]
              </span>
              <div
                style={{
                  font: "600 16px/1.3 var(--font-inter)",
                  color: "var(--text-primary)",
                  margin: "8px 0 6px",
                }}
              >
                {x.t}
              </div>
              <p
                style={{
                  font: "13px/1.5 var(--font-inter)",
                  color: "var(--text-muted)",
                  margin: 0,
                }}
              >
                {x.d}
              </p>
            </div>
          ))}
        </div>

        <Link
          href={RUTA.href}
          className="tap-target"
          style={{
            gap: 8,
            padding: "12px 24px",
            background: "var(--accent-fill)",
            color: "#fff",
            font: "600 14px var(--font-inter)",
            borderRadius: 4,
            textDecoration: "none",
          }}
        >
          Ver si estás listo →
        </Link>
      </div>
    </section>
  );
}
