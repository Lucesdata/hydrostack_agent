export default function S5DarkClosing() {
  return (
    <section style={{ padding: "96px 48px", background: "#0A1F1C", textAlign: "center", color: "white" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <div style={{ fontSize: "48px", marginBottom: 32 }}>💧</div>

        <h2 style={{ font: "700 40px/1.2 var(--font-ibm-plex-sans-condensed)", color: "white", marginBottom: 20 }}>
          HydroStack: tu compañero <span style={{ color: "#7DD3FC" }}>de agua</span>
        </h2>

        <p style={{ font: "15px/1.6 var(--font-inter)", color: "rgba(255,255,255,0.6)", marginBottom: 32 }}>
          Clasificación, compuertas, norma — todo desde un solo lugar.
        </p>

        <a
          href="/licitaciones"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 24px",
            background: "white",
            color: "#0369A1",
            font: "600 14px var(--font-inter)",
            borderRadius: 4,
            textDecoration: "none",
            cursor: "pointer",
            marginBottom: 32,
          }}
        >
          Acceder →
        </a>

        <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
          {["Sin suscripción", "Datos en vivo", "Respuestas citadas"].map((check) => (
            <div key={check} style={{ display: "flex", alignItems: "center", gap: 6, font: "14px var(--font-inter)", color: "rgba(255,255,255,0.8)" }}>
              <span style={{ color: "#7DD3FC", fontWeight: 700 }}>✓</span> {check}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
