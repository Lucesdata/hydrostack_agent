"use client";

/**
 * Frontera de error del listado. Sin ella, un fallo de la base cae en la
 * pantalla genérica de Next, que no ofrece salida.
 *
 * `reset()` reintenta el render en el cliente; si el fallo era de la consulta y
 * ya pasó, la página vuelve sin recargar.
 */
export default function ErrorLicitaciones({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="clr-page">
      <div className="clr-container" style={{ padding: "64px 0" }}>
        <h1 style={{ font: "700 24px var(--sans)", margin: "0 0 10px" }}>
          No pudimos cargar las fichas.
        </h1>
        <p style={{ font: "14px var(--sans)", color: "var(--text-muted)", margin: "0 0 18px" }}>
          El listado no respondió. Puede volver a intentarlo.
        </p>
        <button
          onClick={reset}
          style={{
            font: "600 13px var(--mono)",
            color: "var(--accent)",
            background: "none",
            border: "1px solid var(--accent)",
            borderRadius: 3,
            padding: "9px 16px",
            cursor: "pointer",
          }}
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
