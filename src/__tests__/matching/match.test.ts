import { describe, it, expect } from "vitest";
import { matchProcesos } from "@/src/lib/matching/match";
import { buildVerdict, toVerdictInput } from "@/src/lib/secop/verdict";
import type { OferenteProfile } from "@/src/lib/oferente/types";
import type { SecopProceso } from "@/src/lib/secop/types";

const NOW = new Date("2026-06-27T00:00:00Z");

const perfil: OferenteProfile = {
  id: "oferente-1",
  tipoPersona: "juridica",
  sectoresUnspsc: ["83101"],
  capacidadFinanciera: {
    capitalTrabajoCop: 500_000_000,
    indiceLiquidez: 2,
    indiceEndeudamiento: 0.4,
    razonCoberturaIntereses: 3,
    fuente: "manual",
    vigenciaHasta: "2026-12-31",
  },
  kCapacidadResidualCop: 1_000_000_000,
  cobertura: { departamentos: ["76"], municipios: ["76001"] },
  cuantiaObjetivo: { minCop: 100_000_000, maxCop: 1_000_000_000 },
};

function proceso(over: Partial<SecopProceso> = {}): SecopProceso {
  return {
    id: "CO1.REQ.1",
    referencia: "REF-1",
    nombre: "Optimización del sistema de acueducto",
    descripcion: "Obras de acueducto",
    entidad: "Acuavalle",
    departamento: "Valle del Cauca",
    ciudad: "Cali",
    estado: "Publicado",
    fase: "",
    modalidad: "Licitación pública",
    tipoContrato: "Obra",
    fechaPublicacion: "2026-06-01",
    precioBase: 500_000_000,
    adjudicado: false,
    valorAdjudicacion: null,
    adjudicatario: null,
    unspsc: "V1.83101500",
    url: null,
    estadoApertura: "Abierto",
    documentAccess: "UNKNOWN",
    accessMessage: "",
    ...over,
  };
}

describe("matchProcesos", () => {
  it("array vacío → sin matches", () => {
    expect(matchProcesos(perfil, [], NOW)).toEqual([]);
  });

  it("un match por proceso, mismo orden de entrada", () => {
    const procesos = [proceso({ id: "A" }), proceso({ id: "B" }), proceso({ id: "C" })];
    const matches = matchProcesos(perfil, procesos, NOW);
    expect(matches.map((m) => m.proceso.id)).toEqual(["A", "B", "C"]);
  });

  it("el veredicto de cada match coincide con buildVerdict para el mismo insumo", () => {
    const p = proceso();
    const [match] = matchProcesos(perfil, [p], NOW);
    const expected = buildVerdict(perfil, toVerdictInput(p), NOW);
    expect(match.verdict).toEqual(expected);
  });

  it("no filtra: incluye también los procesos que dan FAIL", () => {
    const fueraDeSector = proceso({ id: "X", unspsc: "V1.99999999" });
    const matches = matchProcesos(perfil, [fueraDeSector], NOW);
    expect(matches).toHaveLength(1);
    expect(matches[0].verdict.gates.sectorial.status).toBe("FAIL");
  });
});
