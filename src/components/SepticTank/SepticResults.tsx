"use client";

import type { ComputeResult } from "@/types";

interface SepticResultsProps {
  result: ComputeResult | null;
}

export function SepticResults({ result }: SepticResultsProps) {
  if (!result) {
    return (
      <div
        style={{
          padding: "40px 20px",
          textAlign: "center",
          backgroundColor: "#041820",
          borderRadius: "8px",
          marginTop: "16px",
        }}
      >
        <div style={{ fontSize: "48px", opacity: 0.1, marginBottom: "12px" }}>🧮</div>
        <p style={{ color: "#2a5070", margin: 0 }}>
          Completa todos los parámetros para ver resultados
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: "20px" }}>
      <h2 style={{ color: "#00F5FF", marginTop: 0 }}>Resultados</h2>

      {/* Volúmenes */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <div style={{ backgroundColor: "#0a2835", padding: "16px", borderRadius: "6px" }}>
          <div style={{ fontSize: "24px", color: "#00F5FF", fontWeight: "bold" }}>
            {result.Vl?.toFixed(2) || "—"}
          </div>
          <div style={{ fontSize: "12px", color: "#7ab8c8" }}>m³ Vol. Líquido</div>
        </div>

        <div style={{ backgroundColor: "#0a2835", padding: "16px", borderRadius: "6px" }}>
          <div style={{ fontSize: "24px", color: "#00F5FF", fontWeight: "bold" }}>
            {result.Vs?.toFixed(2) || "—"}
          </div>
          <div style={{ fontSize: "12px", color: "#7ab8c8" }}>m³ Vol. Lodos</div>
        </div>

        <div style={{ backgroundColor: "#0a2835", padding: "16px", borderRadius: "6px" }}>
          <div style={{ fontSize: "24px", color: "#00F5FF", fontWeight: "bold" }}>
            {result.Vn?.toFixed(2) || "—"}
          </div>
          <div style={{ fontSize: "12px", color: "#7ab8c8" }}>m³ Vol. Natas</div>
        </div>

        <div
          style={{
            backgroundColor: "#0a1820",
            padding: "16px",
            borderRadius: "6px",
            border: "2px solid #00F5FF",
          }}
        >
          <div style={{ fontSize: "28px", color: "#00F5FF", fontWeight: "bold" }}>
            {result.Vtot?.toFixed(2) || "—"}
          </div>
          <div style={{ fontSize: "12px", color: "#00F5FF", fontWeight: "600" }}>
            m³ VOLUMEN TOTAL
          </div>
          {result.minA && (
            <div style={{ fontSize: "10px", color: "#b0a060", marginTop: "4px" }}>
              (mín. normativo aplicado)
            </div>
          )}
        </div>
      </div>

      {/* Dimensiones */}
      <div
        style={{
          backgroundColor: "#041820",
          padding: "16px",
          borderRadius: "6px",
          marginBottom: "20px",
        }}
      >
        <h3 style={{ color: "#00F5FF", margin: "0 0 12px 0" }}>Dimensiones</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "12px",
            fontSize: "14px",
          }}
        >
          <div>
            <span style={{ color: "#7ab8c8" }}>Largo:</span>{" "}
            <span style={{ color: "#00F5FF" }}>{result.L?.toFixed(2)}m</span>
          </div>
          <div>
            <span style={{ color: "#7ab8c8" }}>Ancho:</span>{" "}
            <span style={{ color: "#00F5FF" }}>{result.W?.toFixed(2)}m</span>
          </div>
          <div>
            <span style={{ color: "#7ab8c8" }}>Área:</span>{" "}
            <span style={{ color: "#00F5FF" }}>{result.Area?.toFixed(2)}m²</span>
          </div>
          <div>
            <span style={{ color: "#7ab8c8" }}>Cámaras:</span>{" "}
            <span style={{ color: "#00F5FF", fontWeight: "bold" }}>{result.chambers}</span>
          </div>
        </div>
      </div>

      {/* Validaciones */}
      <div style={{ backgroundColor: "#041820", padding: "16px", borderRadius: "6px" }}>
        <h3 style={{ color: "#00F5FF", margin: "0 0 12px 0" }}>Verificaciones</h3>
        <div style={{ display: "grid", gap: "8px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "8px",
              backgroundColor: "#0a2835",
              borderRadius: "4px",
            }}
          >
            <span style={{ color: "#7ab8c8" }}>SRT (≥ 20 días):</span>
            <span
              style={{
                color: result.chkSRT ? "#00ff88" : "#ff5050",
                fontWeight: "bold",
              }}
            >
              {result.SRT?.toFixed(0)} días {result.chkSRT ? "✓" : "✗"}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "8px",
              backgroundColor: "#0a2835",
              borderRadius: "4px",
            }}
          >
            <span style={{ color: "#7ab8c8" }}>CVO (≤ 0.30 kg/m³·d):</span>
            <span
              style={{
                color: result.chkCVO ? "#00ff88" : "#ff5050",
                fontWeight: "bold",
              }}
            >
              {result.CVO?.toFixed(4)} {result.chkCVO ? "✓" : "✗"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
