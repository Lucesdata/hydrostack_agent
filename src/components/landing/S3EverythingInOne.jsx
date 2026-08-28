export default function S3EverythingInOne() {
  const features = [
    {
      title: "Procesos de agua y saneamiento:",
      desc: "Los del SECOP II que son de tu sector, clasificados, no todo el SECOP.",
    },
    {
      title: "Pliegos descifrados:",
      desc: "Requisitos legales, técnicos y financieros extraídos como lista que puedes marcar.",
    },
    {
      title: "Dudas de norma con cita:",
      desc: "RAS, Resolución 0330, CRA y SUI, con la fuente al lado de cada respuesta.",
    },
  ];

  return (
    <section style={{ padding: "64px 48px", background: "#FCFCF9" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        {/* Franja de fuentes */}
        <div
          style={{
            borderTop: "1px solid #DADAD2",
            borderBottom: "1px solid #DADAD2",
            padding: "20px 32px",
            textAlign: "center",
            marginBottom: "64px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "32px",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              font: "600 12px var(--font-jetbrains-mono),monospace",
              color: "#6B746F",
              textTransform: "uppercase",
              letterSpacing: ".05em",
              whiteSpace: "nowrap",
            }}
          >
            Fuentes
          </div>
          <div style={{ display: "flex", gap: "32px", flexWrap: "wrap", justifyContent: "center" }}>
            {["SECOP II", "RAS", "Resolución 0330", "CRA", "SUI"].map((source) => (
              <div key={source} style={{ font: "14px var(--font-inter)", color: "#525B5A" }}>
                {source}
              </div>
            ))}
          </div>
        </div>

        {/* Bloque a dos columnas */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "64px",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                font: "11px var(--font-jetbrains-mono),monospace",
                color: "#0369A1",
                letterSpacing: ".12em",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
            >
              Capacidades
            </div>
            <h2
              style={{
                font: "700 40px/1.2 var(--font-ibm-plex-sans-condensed)",
                color: "#0A1F1C",
                marginBottom: 20,
              }}
            >
              Todo en un solo lugar.
            </h2>
            <p style={{ font: "15px/1.6 var(--font-inter)", color: "#525B5A", marginBottom: 32 }}>
              No saltes entre cinco pestañas. Las compuertas, los requisitos, la norma — reunidos,
              cruzados, citables.
            </p>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "24px", marginBottom: 32 }}
            >
              {features.map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 12 }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      background: "#0369A1",
                      borderRadius: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontWeight: 700,
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    ✓
                  </div>
                  <div>
                    <strong style={{ font: "600 15px var(--font-inter)", color: "#0A1F1C" }}>
                      {f.title}
                    </strong>
                    <span style={{ font: "15px var(--font-inter)", color: "#525B5A" }}>
                      {" "}
                      {f.desc}
                    </span>
                  </div>
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
              Explorar procesos →
            </a>
          </div>

          <div
            style={{
              background: "linear-gradient(135deg, rgba(3,105,161,0.15), rgba(3,105,161,0.08))",
              border: "2px dashed #DADAD2",
              borderRadius: 8,
              height: 400,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#6B746F",
              textAlign: "center",
              padding: 32,
            }}
          >
            <div>
              <strong>Captura del producto</strong>
              <br />
              Semáforo de compuertas o extractor de pliegos
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
