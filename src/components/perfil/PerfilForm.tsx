"use client";

import { useState } from "react";
import type { OferenteProfile, ExperienciaContrato } from "@/src/lib/oferente/types";
import { OFERENTE_LOCAL_ID, SECTOR_OPTIONS } from "@/src/lib/oferente/wizard";
import { DEPARTAMENTOS } from "@/data/dane/divipola";

function defaultPerfil(): OferenteProfile {
  return {
    id: OFERENTE_LOCAL_ID,
    tipoPersona: "juridica",
    sectoresUnspsc: [],
    capacidadFinanciera: {
      capitalTrabajoCop: 0,
      indiceLiquidez: 0,
      indiceEndeudamiento: 0,
      razonCoberturaIntereses: 0,
      fuente: "manual",
      vigenciaHasta: null,
    },
    kCapacidadResidualCop: null,
    cobertura: { departamentos: [], municipios: [] },
    cuantiaObjetivo: { minCop: 0, maxCop: 0 },
    experiencia: [],
  };
}

export default function PerfilForm({ perfilInicial }: { perfilInicial: OferenteProfile | null }) {
  const [perfil, setPerfil] = useState<OferenteProfile>(perfilInicial ?? defaultPerfil());
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function guardar() {
    setStatus("saving");
    try {
      const res = await fetch("/api/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(perfil),
      });
      setStatus(res.ok ? "saved" : "error");
    } catch {
      setStatus("error");
    }
  }

  function toggleSector(codigo: string) {
    setPerfil((p) => ({
      ...p,
      sectoresUnspsc: p.sectoresUnspsc.includes(codigo)
        ? p.sectoresUnspsc.filter((c) => c !== codigo)
        : [...p.sectoresUnspsc, codigo],
    }));
  }

  function addContrato() {
    setPerfil((p) => ({
      ...p,
      experiencia: [
        ...(p.experiencia ?? []),
        { objeto: "", valorSmmlv: 0, unspscCodigos: [], anioTerminacion: new Date().getFullYear() },
      ],
    }));
  }

  function updateContrato(i: number, patch: Partial<ExperienciaContrato>) {
    setPerfil((p) => ({
      ...p,
      experiencia: (p.experiencia ?? []).map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
    }));
  }

  function removeContrato(i: number) {
    setPerfil((p) => ({ ...p, experiencia: (p.experiencia ?? []).filter((_, idx) => idx !== i) }));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 24 }}>
      <section>
        <h3>Clasificación (UNSPSC)</h3>
        {SECTOR_OPTIONS.map((o) => (
          <label key={o.codigo} style={{ display: "block" }}>
            <input
              type="checkbox"
              checked={perfil.sectoresUnspsc.includes(o.codigo)}
              onChange={() => toggleSector(o.codigo)}
            />{" "}
            {o.label}
          </label>
        ))}
      </section>

      <section>
        <h3>Cobertura</h3>
        <select
          multiple
          value={perfil.cobertura.departamentos}
          onChange={(e) =>
            setPerfil((p) => ({
              ...p,
              cobertura: {
                ...p.cobertura,
                departamentos: Array.from(e.target.selectedOptions).map((o) => o.value),
              },
            }))
          }
        >
          {DEPARTAMENTOS.map((d) => (
            <option key={d.departamentoCodigo} value={d.departamentoCodigo}>
              {d.departamentoNombre}
            </option>
          ))}
        </select>
      </section>

      <section>
        <h3>Experiencia (contratos aportables)</h3>
        {(perfil.experiencia ?? []).map((c, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input placeholder="Objeto" value={c.objeto} onChange={(e) => updateContrato(i, { objeto: e.target.value })} />
            <input
              type="number"
              placeholder="Valor (SMMLV)"
              value={c.valorSmmlv ?? ""}
              onChange={(e) => updateContrato(i, { valorSmmlv: Number(e.target.value) })}
            />
            <input
              type="number"
              placeholder="Año"
              value={c.anioTerminacion ?? ""}
              onChange={(e) => updateContrato(i, { anioTerminacion: Number(e.target.value) })}
            />
            <button type="button" onClick={() => removeContrato(i)}>Quitar</button>
          </div>
        ))}
        <button type="button" onClick={addContrato}>+ Añadir contrato</button>
      </section>

      <section>
        <h3>Capacidad financiera y organizacional</h3>
        <label>
          Índice de liquidez
          <input
            type="number"
            step="0.01"
            value={perfil.capacidadFinanciera.indiceLiquidez}
            onChange={(e) =>
              setPerfil((p) => ({ ...p, capacidadFinanciera: { ...p.capacidadFinanciera, indiceLiquidez: Number(e.target.value) } }))
            }
          />
        </label>
        <label>
          Índice de endeudamiento (0–1)
          <input
            type="number"
            step="0.01"
            value={perfil.capacidadFinanciera.indiceEndeudamiento}
            onChange={(e) =>
              setPerfil((p) => ({ ...p, capacidadFinanciera: { ...p.capacidadFinanciera, indiceEndeudamiento: Number(e.target.value) } }))
            }
          />
        </label>
        <label>
          Patrimonio (SMMLV)
          <input
            type="number"
            value={perfil.capacidadFinanciera.patrimonioSmmlv ?? ""}
            onChange={(e) =>
              setPerfil((p) => ({ ...p, capacidadFinanciera: { ...p.capacidadFinanciera, patrimonioSmmlv: Number(e.target.value) } }))
            }
          />
        </label>
      </section>

      <button type="button" onClick={guardar} disabled={status === "saving"}>
        {status === "saving" ? "Guardando…" : "Guardar perfil"}
      </button>
      {status === "saved" && <span>Guardado ✓</span>}
      {status === "error" && <span>Error al guardar — intenta de nuevo.</span>}
    </div>
  );
}
