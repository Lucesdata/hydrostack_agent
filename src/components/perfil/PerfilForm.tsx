"use client";

import { useEffect, useState } from "react";
import type { OferenteProfile, ExperienciaContrato } from "@/src/lib/oferente/types";
import { OFERENTE_LOCAL_ID, SECTOR_OPTIONS } from "@/src/lib/oferente/wizard";
import { DEPARTAMENTOS } from "@/data/dane/divipola";
import { searchUnspsc } from "@/src/lib/oferente/unspsc-catalog";
import { PerfilResultadosPanel } from "./PerfilResultadosPanel";

const LAYOUT_STYLE = `
  .clr-pf-layout{ display: flex; flex-direction: column; gap: 24px; }
  .clr-pf-panel{ order: -1; }
  @media (min-width: 860px){
    .clr-pf-layout{ display: grid; grid-template-columns: minmax(0, 1fr) 300px; align-items: start; gap: 32px; }
    .clr-pf-panel{ order: 0; position: sticky; top: 24px; }
  }
`;

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
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error" | "concierge">("idle");
  const [unspscQuery, setUnspscQuery] = useState("");
  const unspscOpciones = searchUnspsc(unspscQuery).slice(0, 8);

  // El panel gatea "Ver todas en Mis coincidencias" con guardadoOk (status === "saved").
  // Sin este efecto, editar el perfil después de guardar dejaría el link apuntando a
  // /mis-coincidencias (que lee lo persistido en BD) mientras el panel ya muestra un
  // borrador distinto — exactamente el desalineamiento que la spec pidió evitar.
  useEffect(() => {
    setStatus((s) => (s === "saved" ? "idle" : s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil]);

  async function guardar() {
    const perfilAlGuardar = JSON.stringify(perfil);
    setStatus("saving");
    try {
      const res = await fetch("/api/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: perfilAlGuardar,
      });
      if (res.ok) {
        // Solo marcar saved si el perfil no cambió mientras guardábamos
        if (JSON.stringify(perfil) === perfilAlGuardar) {
          setStatus("saved");
        } else {
          setStatus("error");
        }
        return;
      }
      const body = await res.json().catch(() => null);
      setStatus(body?.error === "DB_UNAVAILABLE" ? "concierge" : "error");
    } catch {
      setStatus("error");
    }
  }

  function mailtoConcierge(): string {
    const contacto = process.env.NEXT_PUBLIC_CONCIERGE_EMAIL || "";
    const subject = `Perfil RUP — registro manual (${perfil.id})`;
    const cuerpo = [
      "No se pudo guardar automáticamente. Copio mi perfil para que lo registren manualmente:",
      "",
      JSON.stringify(perfil, null, 2),
    ].join("\n");
    return `mailto:${contacto}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(cuerpo)}`;
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
    <div className="clr-pf-layout">
      <style dangerouslySetInnerHTML={{ __html: LAYOUT_STYLE }} />

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
          <h3>¿Qué rango de contrato buscas?</h3>
          <label>
            Valor mínimo (COP)
            <input
              type="number"
              min={0}
              value={perfil.cuantiaObjetivo.minCop}
              onChange={(e) =>
                setPerfil((p) => ({
                  ...p,
                  cuantiaObjetivo: { ...p.cuantiaObjetivo, minCop: Number(e.target.value) },
                }))
              }
            />
          </label>
          <label>
            Valor máximo (COP)
            <input
              type="number"
              min={0}
              value={perfil.cuantiaObjetivo.maxCop}
              onChange={(e) =>
                setPerfil((p) => ({
                  ...p,
                  cuantiaObjetivo: { ...p.cuantiaObjetivo, maxCop: Number(e.target.value) },
                }))
              }
            />
          </label>
        </section>

        <section>
          <h3>Experiencia (contratos aportables)</h3>
          {(perfil.experiencia ?? []).map((c, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 8 }}>
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
              <div>
                <label>
                  Códigos UNSPSC del contrato
                  <input
                    placeholder="Buscar código UNSPSC…"
                    value={unspscQuery}
                    onChange={(e) => setUnspscQuery(e.target.value)}
                  />
                </label>
                {unspscQuery && (
                  <div>
                    {unspscOpciones.map((o) => (
                      <label key={o.codigo} style={{ display: "block" }}>
                        <input
                          type="checkbox"
                          checked={c.unspscCodigos.includes(o.codigo)}
                          onChange={() =>
                            updateContrato(i, {
                              unspscCodigos: c.unspscCodigos.includes(o.codigo)
                                ? c.unspscCodigos.filter((x) => x !== o.codigo)
                                : [...c.unspscCodigos, o.codigo],
                            })
                          }
                        />{" "}
                        {o.codigo} — {o.label}
                      </label>
                    ))}
                  </div>
                )}
                {c.unspscCodigos.length > 0 && (
                  <div>Seleccionados: {c.unspscCodigos.join(", ")}</div>
                )}
              </div>
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
          <label>
            Razón de cobertura de intereses (veces)
            <input
              type="number"
              step="0.01"
              value={perfil.capacidadFinanciera.razonCoberturaIntereses}
              onChange={(e) =>
                setPerfil((p) => ({ ...p, capacidadFinanciera: { ...p.capacidadFinanciera, razonCoberturaIntereses: Number(e.target.value) } }))
              }
            />
          </label>
          <label>
            Rentabilidad del patrimonio (0–1)
            <input
              type="number"
              step="0.01"
              value={perfil.capacidadFinanciera.rentabilidadPatrimonio ?? ""}
              onChange={(e) =>
                setPerfil((p) => ({
                  ...p,
                  capacidadFinanciera: {
                    ...p.capacidadFinanciera,
                    rentabilidadPatrimonio: e.target.value === "" ? undefined : Number(e.target.value),
                  },
                }))
              }
            />
          </label>
          <label>
            Rentabilidad del activo (0–1)
            <input
              type="number"
              step="0.01"
              value={perfil.capacidadFinanciera.rentabilidadActivo ?? ""}
              onChange={(e) =>
                setPerfil((p) => ({
                  ...p,
                  capacidadFinanciera: {
                    ...p.capacidadFinanciera,
                    rentabilidadActivo: e.target.value === "" ? undefined : Number(e.target.value),
                  },
                }))
              }
            />
          </label>
          <label>
            Capital de trabajo (SMMLV)
            <input
              type="number"
              value={perfil.capacidadFinanciera.capitalTrabajoSmmlv ?? ""}
              onChange={(e) =>
                setPerfil((p) => ({
                  ...p,
                  capacidadFinanciera: {
                    ...p.capacidadFinanciera,
                    capitalTrabajoSmmlv: e.target.value === "" ? undefined : Number(e.target.value),
                  },
                }))
              }
            />
          </label>
        </section>

        <button type="button" onClick={guardar} disabled={status === "saving"}>
          {status === "saving" ? "Guardando…" : "Guardar perfil"}
        </button>
        {status === "saved" && <span>Guardado ✓</span>}
        {status === "error" && <span>Error al guardar — intenta de nuevo.</span>}
        {status === "concierge" && (
          <div className="clr-perfil-concierge" role="alert">
            <p>
              No pudimos guardar tu perfil automáticamente. Envíanoslo por correo y lo registramos
              nosotros mientras tanto — ya viene listo para copiar y pegar.
            </p>
            <a href={mailtoConcierge()}>Enviar mi perfil por correo →</a>
          </div>
        )}
      </div>

      <div className="clr-pf-panel">
        <PerfilResultadosPanel perfil={perfil} guardadoOk={status === "saved"} />
      </div>
    </div>
  );
}
