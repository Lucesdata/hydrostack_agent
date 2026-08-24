export default function S4Invitation() {
  return (
    <section style={{ padding: "64px 48px", background: "rgba(3, 105, 161, 0.04)" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto", textAlign: "center" }}>
        <h2 style={{ font: "700 40px/1.2 var(--font-ibm-plex-sans-condensed)", color: "#0A1F1C", marginBottom: 24 }}>
          ¿Qué proceso necesitas revisar esta semana?
        </h2>

        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 32, flexWrap: "wrap" }}>
          {["Prueba sin cuenta", "Resultado en 2 minutos", "Pliegos descifrados"].map((item) => (
            <div key={item} style={{ font: "14px var(--font-inter)", color: "#525B5A" }}>
              {item}
              {item !== "Pliegos descifrados" && <span style={{ marginLeft: 12 }}>·</span>}
            </div>
          ))}
        </div>

        <a
          href="/licitaciones"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 24px",
            background: "#0369A1",
            color: "white",
            font: "600 14px var(--font-inter)",
            borderRadius: 4,
            textDecoration: "none",
            cursor: "pointer",
          }}
        >
          Empezar →
        </a>
      </div>
    </section>
  );
}
