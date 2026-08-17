import { describe, it, expect } from "vitest";
import { matchProcesosMinimo, coincideEnLabel } from "@/src/lib/matching/match-minimo";
import type { PerfilMinimo } from "@/src/lib/oferente/perfil-minimo";
import type { SecopProceso } from "@/src/lib/secop/types";

const perfil: PerfilMinimo = {
  id: "u1",
  sectoresUnspsc: ["83101"],
  cobertura: { departamentos: ["76"], municipios: [] },
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
    unspsc: "83101500",
    url: null,
    estadoApertura: "Abierto",
    documentAccess: "PUBLIC",
    accessMessage: "",
    ...over,
  } as SecopProceso;
}

describe("matchProcesosMinimo", () => {
  it("PASS en sector y zona → overall PASS", () => {
    const [m] = matchProcesosMinimo(perfil, [proceso()]);
    expect(m.gates.sectorial.status).toBe("PASS");
    expect(m.gates.ubicacion.status).toBe("PASS");
    expect(m.overall).toBe("PASS");
  });

  it("fuera de cobertura → overall FAIL", () => {
    const [m] = matchProcesosMinimo(perfil, [proceso({ departamento: "Cundinamarca", ciudad: "Bogotá" })]);
    expect(m.overall).toBe("FAIL");
  });
});

describe("coincideEnLabel", () => {
  it("ambos PASS → 'Sector + Zona'", () => {
    const [m] = matchProcesosMinimo(perfil, [proceso()]);
    expect(coincideEnLabel(m)).toBe("Coincide en: Sector + Zona");
  });

  it("solo sector PASS → 'Sector'", () => {
    const [m] = matchProcesosMinimo(perfil, [proceso({ departamento: "Cundinamarca", ciudad: "Bogotá", unspsc: "83101500" })]);
    expect(coincideEnLabel(m)).toBe("Coincide en: Sector");
  });
});
