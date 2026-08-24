export default function S2WhyHydroStack() {
  const cards = [
    {
      icon: "✓",
      title: "Sabes si calificas antes de escribir",
      desc: "Cada compuerta revisada. Ves el veredicto, no la caja negra.",
      chip: "Pre-evaluación RUP",
    },
    {
      icon: "📋",
      title: "El pliego, como lista de requisitos",
      desc: "Requisitos técnicos, financieros, legales — extraídos y organizados. Para marcar, no para leer.",
      chip: "Extracción de pliegos",
    },
    {
      icon: "📚",
      title: "Una respuesta con la norma citada",
      desc: "No te decimos qué hacer — te mostramos dónde está escrito y por qué.",
      chip: "RAS · Res. 0330 · CRA",
    },
    {
      icon: "🎯",
      title: "No es un buscador genérico: es agua",
      desc: "Procesos clasificados por sector. Solo lo que te sirve aparece.",
      chip: "Clasificación sectorial",
    },
  ];

  return (
    <section style={{ padding: "64px 48px", background: "#FCFCF9" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "64px", maxWidth: 800, marginLeft: "auto", marginRight: "auto" }}>
          <div style={{ font: "11px var(--font-jetbrains-mono),monospace", color: "#0369A1", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 16 }}>
            Por qué HydroStack
          </div>
          <h2 style={{ font: "700 40px/1.2 var(--font-ibm-plex-sans-condensed)", color: "#0A1F1C", marginBottom: 20 }}>
            Hecho para agua, no para todo lo demás.
          </h2>
          <p style={{ font: "15px/1.6 var(--font-inter)", color: "#525B5A" }}>
            Las compuertas de elegibilidad, el lenguaje de la norma, los requisitos que importan — todo pensado para quién licita agua.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "32px" }}>
          {cards.map((card, i) => (
            <div
              key={i}
              style={{
                padding: 32,
                background: "#fff",
                border: "1px solid #DADAD2",
                borderRadius: 4,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                <div
                  style={{
                    width: 50,
                    height: 50,
                    background: "#0369A1",
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "24px",
                    flexShrink: 0,
                  }}
                >
                  {card.icon}
                </div>
                <h3 style={{ font: "600 20px/1.3 var(--font-inter)", margin: 0, color: "#0A1F1C" }}>
                  {card.title}
                </h3>
              </div>
              <p style={{ font: "15px/1.5 var(--font-inter)", color: "#525B5A", margin: "0 0 20px 0" }}>
                {card.desc}
              </p>
              <div style={{ display: "inline-block", padding: "6px 12px", background: "rgba(3, 105, 161, 0.08)", color: "#0369A1", borderRadius: 3, font: "600 12px var(--font-jetbrains-mono),monospace", textTransform: "uppercase", letterSpacing: ".05em" }}>
                {card.chip}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
