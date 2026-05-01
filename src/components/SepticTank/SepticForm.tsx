"use client";

import { NORMS_METADATA } from "@/lib/norms";
import type { FormState } from "@/types";

interface SepticFormProps {
  formState: FormState;
  onUpdate: (field: keyof FormState, value: any) => void;
}

export function SepticForm({ formState, onUpdate }: SepticFormProps) {
  return (
    <div style={{ padding: "20px", backgroundColor: "#041820", borderRadius: "8px" }}>
      <h2 style={{ marginTop: 0, color: "#00F5FF" }}>Parámetros de Entrada</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        {/* Normativa */}
        <div>
          <label
            style={{ display: "block", fontSize: "12px", color: "#7ab8c8", marginBottom: "4px" }}
          >
            Normativa
          </label>
          <select
            value={formState.normKey ?? ""}
            onChange={(e) => onUpdate("normKey", e.target.value)}
            style={{
              width: "100%",
              padding: "8px",
              backgroundColor: "#0a2835",
              color: "#00F5FF",
              border: "1px solid #00F5FF",
              borderRadius: "4px",
              fontSize: "12px",
            }}
          >
            <option value="">-- Selecciona --</option>
            {Object.values(NORMS_METADATA).map((norm) => (
              <option key={norm.key} value={norm.key}>
                {norm.flag} {norm.name}
              </option>
            ))}
          </select>
        </div>

        {/* Usuarios */}
        <div>
          <label
            style={{ display: "block", fontSize: "12px", color: "#7ab8c8", marginBottom: "4px" }}
          >
            Usuarios (habitantes)
          </label>
          <input
            type="number"
            min="1"
            value={formState.users ?? ""}
            onChange={(e) => onUpdate("users", Number(e.target.value))}
            style={{
              width: "100%",
              padding: "8px",
              backgroundColor: "#0a2835",
              color: "#00F5FF",
              border: "1px solid #00F5FF",
              borderRadius: "4px",
              fontSize: "12px",
            }}
          />
        </div>

        {/* Dotación */}
        <div>
          <label
            style={{ display: "block", fontSize: "12px", color: "#7ab8c8", marginBottom: "4px" }}
          >
            Dotación (L/hab·día)
          </label>
          <input
            type="number"
            min="10"
            value={formState.dotacion ?? ""}
            onChange={(e) => onUpdate("dotacion", Number(e.target.value))}
            style={{
              width: "100%",
              padding: "8px",
              backgroundColor: "#0a2835",
              color: "#00F5FF",
              border: "1px solid #00F5FF",
              borderRadius: "4px",
              fontSize: "12px",
            }}
          />
        </div>

        {/* Temperatura */}
        <div>
          <label
            style={{ display: "block", fontSize: "12px", color: "#7ab8c8", marginBottom: "4px" }}
          >
            Temperatura (°C)
          </label>
          <input
            type="number"
            min="-10"
            max="50"
            value={formState.temp ?? ""}
            onChange={(e) => onUpdate("temp", Number(e.target.value))}
            style={{
              width: "100%",
              padding: "8px",
              backgroundColor: "#0a2835",
              color: "#00F5FF",
              border: "1px solid #00F5FF",
              borderRadius: "4px",
              fontSize: "12px",
            }}
          />
        </div>

        {/* Profundidad */}
        <div>
          <label
            style={{ display: "block", fontSize: "12px", color: "#7ab8c8", marginBottom: "4px" }}
          >
            Profundidad útil (m)
          </label>
          <input
            type="number"
            min="0.8"
            step="0.1"
            value={formState.depth ?? ""}
            onChange={(e) => onUpdate("depth", Number(e.target.value))}
            style={{
              width: "100%",
              padding: "8px",
              backgroundColor: "#0a2835",
              color: "#00F5FF",
              border: "1px solid #00F5FF",
              borderRadius: "4px",
              fontSize: "12px",
            }}
          />
        </div>

        {/* Período de limpieza */}
        <div>
          <label
            style={{ display: "block", fontSize: "12px", color: "#7ab8c8", marginBottom: "4px" }}
          >
            Limpieza (años)
          </label>
          <input
            type="number"
            min="1"
            value={formState.cleanYears ?? ""}
            onChange={(e) => onUpdate("cleanYears", Number(e.target.value))}
            style={{
              width: "100%",
              padding: "8px",
              backgroundColor: "#0a2835",
              color: "#00F5FF",
              border: "1px solid #00F5FF",
              borderRadius: "4px",
              fontSize: "12px",
            }}
          />
        </div>
      </div>
    </div>
  );
}
