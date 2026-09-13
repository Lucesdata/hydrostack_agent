import Link from "next/link";
import { ruta } from "./seccionesHome";

const RUTA_EXPLORAR = ruta("explorar");
const RUTA_NOSOTROS = ruta("nosotros");

export default function S5DarkClosing() {
  return (
    <section className="section-pad center-md" style={{ background: "#0A1F1C", color: "white" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <h2
          style={{
            font: "700 var(--step-h2)/1.2 var(--font-ibm-plex-sans-condensed)",
            color: "white",
            marginBottom: 20,
          }}
        >
          AquaLicita: tu compañero <span style={{ color: "#7DD3FC" }}>de agua</span>
        </h2>

        <p
          style={{
            font: "15px/1.6 var(--font-inter)",
            color: "rgba(255,255,255,0.6)",
            marginBottom: 32,
            maxWidth: "65ch",
            marginInline: "0",
          }}
        >
          Clasificación sectorial, filtros que puedes auditar y competidores con histórico. Todo
          desde un solo lugar.
        </p>

        <div
          className="acciones-cierre"
          style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", marginBottom: 32 }}
        >
          <Link
            href={RUTA_EXPLORAR.href}
            className="tap-target"
            style={{
              gap: 8,
              padding: "12px 24px",
              background: "white",
              color: "#0369A1",
              font: "600 14px var(--font-inter)",
              borderRadius: 4,
              textDecoration: "none",
              cursor: "pointer",
            }}
          >
            Explorar procesos →
          </Link>
          {/* El único camino a Nosotros para quien llegó hasta abajo: el navbar
              lo mete en la hamburguesa por debajo de 1024px. --accent-river
              (#7dd3fc) sobre #0A1F1C da ~9:1, muy por encima del 4.5 exigido. */}
          <Link
            href={RUTA_NOSOTROS.href}
            className="tap-target"
            style={{
              color: "var(--accent-river)",
              font: "14px var(--font-inter)",
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            Quién está detrás
          </Link>
        </div>

        <div className="checks-cierre" style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {[
            "Datos SECOP II a diario",
            "Veredicto explicado, no caja negra",
            "Empieza sin cuenta",
          ].map((check) => (
            <div
              key={check}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                font: "14px var(--font-inter)",
                color: "rgba(255,255,255,0.8)",
              }}
            >
              <span style={{ color: "#7DD3FC", fontWeight: 700 }}>✓</span> {check}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
