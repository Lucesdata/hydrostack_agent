export default function S6Footer() {
  return (
    <footer style={{ padding: "32px 48px", background: "#070E0C", borderTop: "1px solid #DADAD2" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ fontSize: "20px" }}>💧</div>

        <div style={{ display: "flex", gap: 32 }}>
          <a href="/terms" style={{ font: "13px var(--font-inter)", color: "#6B746F", textDecoration: "none" }}>
            Términos de servicio
          </a>
          <a href="/privacy" style={{ font: "13px var(--font-inter)", color: "#6B746F", textDecoration: "none" }}>
            Privacidad
          </a>
          <a href="/nosotros" style={{ font: "13px var(--font-inter)", color: "#6B746F", textDecoration: "none" }}>
            Nosotros
          </a>
        </div>
      </div>

      <div style={{ textAlign: "center", color: "#6B746F", font: "12px var(--font-inter)" }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, marginBottom: 12 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#16A34A" }} />
          <span>Datos SECOP II · actualización diaria</span>
        </div>
        <p style={{ margin: 0 }}>© 2026 AquaLicita. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
