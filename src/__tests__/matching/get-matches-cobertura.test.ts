/**
 * Regresión de la D2 del spec `2026-09-28-ficha-bloque-decision.md`: la zona
 * fuera de cobertura pasó de FAIL a WARN (la ficha dice "revisar"), pero
 * /mis-coincidencias, las alertas diarias y la vista previa del perfil —las tres
 * leen `getMatchesForPerfil*`— tienen que seguir excluyendo esos procesos, como
 * cuando eran FAIL.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SecopProceso } from "@/src/lib/secop/types";
import type { OferenteProfile } from "@/src/lib/oferente/types";
import type { PerfilMinimo } from "@/src/lib/oferente/perfil-minimo";

const searchProcesosDb = vi.fn();
vi.mock("@/src/lib/secop/db-search", () => ({
  searchProcesosDb: (...args: unknown[]) => searchProcesosDb(...args),
}));

import { getMatchesForPerfil } from "@/src/lib/matching/get-matches-for-perfil";
import { getMatchesForPerfilMinimo } from "@/src/lib/matching/get-matches-for-perfil-minimo";

const NOW = new Date("2026-06-27T00:00:00Z");

function proceso(over: Partial<SecopProceso>): SecopProceso {
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
    unspsc: "83101500",
    url: null,
    estadoApertura: "Abierto",
    documentAccess: "PUBLIC",
    accessMessage: "",
    ...over,
  } as SecopProceso;
}

const dentro = proceso({ id: "CO1.REQ.DENTRO" });
const fuera = proceso({ id: "CO1.REQ.FUERA", departamento: "Antioquia", ciudad: "Medellín" });
const sinZona = proceso({ id: "CO1.REQ.SINZONA", departamento: "Tierra del Nunca", ciudad: "" });

const perfil: OferenteProfile = {
  id: "oferente-piloto",
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
  cobertura: { departamentos: ["76"], municipios: [] },
  cuantiaObjetivo: { minCop: 100_000_000, maxCop: 1_000_000_000 },
};

const minimo: PerfilMinimo = {
  id: "u1",
  sectoresUnspsc: ["83101"],
  cobertura: { departamentos: ["76"], municipios: [] },
};

beforeEach(() => {
  searchProcesosDb.mockReset();
  searchProcesosDb.mockResolvedValue({ items: [dentro, fuera, sinZona], total: 3 });
});

describe("getMatchesForPerfil — cobertura como filtro", () => {
  it("excluye el proceso cuya entidad está fuera de la cobertura", async () => {
    const ids = (await getMatchesForPerfil(perfil, NOW)).map((m) => m.proceso.id);
    expect(ids).toContain("CO1.REQ.DENTRO");
    expect(ids).not.toContain("CO1.REQ.FUERA");
  });

  it("conserva el proceso de ubicación no reconocida (UNKNOWN), como antes", async () => {
    const ids = (await getMatchesForPerfil(perfil, NOW)).map((m) => m.proceso.id);
    expect(ids).toContain("CO1.REQ.SINZONA");
  });
});

describe("getMatchesForPerfilMinimo — cobertura como filtro", () => {
  it("excluye el proceso cuya entidad está fuera de la cobertura", async () => {
    const ids = (await getMatchesForPerfilMinimo(minimo)).map((m) => m.proceso.id);
    expect(ids).toContain("CO1.REQ.DENTRO");
    expect(ids).not.toContain("CO1.REQ.FUERA");
    expect(ids).toContain("CO1.REQ.SINZONA");
  });
});
