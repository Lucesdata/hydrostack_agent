"use client";

import { useCalcNorm } from "@/hooks/useCalcNorm";
import { SepticForm } from "./SepticForm";
import { SepticResults } from "./SepticResults";

export function SepticTankCalculator() {
  const { formState, result, updateField } = useCalcNorm();

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ color: "#00F5FF", margin: "0 0 8px 0" }}>Fosa Séptica</h1>
        <p style={{ color: "#7ab8c8", margin: 0 }}>Dimensionamiento completo: volúmenes, cámaras y verificaciones</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* Formulario */}
        <div>
          <SepticForm formState={formState} onUpdate={updateField} />
        </div>

        {/* Resultados */}
        <div>
          <SepticResults result={result} />
        </div>
      </div>
    </div>
  );
}
