import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SecopProceso } from "@/src/lib/secop/types";

const mockPerfil = vi.fn();
const mockCompleto = vi.fn();
const mockMinimo = vi.fn();
const mockEsCompleto = vi.fn();
vi.mock("@/src/lib/oferente/perfil-store", () => ({
  getPerfilDb: (...a: unknown[]) => mockPerfil(...a),
}));
vi.mock("@/src/lib/oferente/perfil-minimo", () => ({
  isPerfilCompleto: (...a: unknown[]) => mockEsCompleto(...a),
}));
vi.mock("@/src/lib/matching/get-matches-for-perfil", () => ({
  getMatchesForPerfil: (...a: unknown[]) => mockCompleto(...a),
}));
vi.mock("@/src/lib/matching/get-matches-for-perfil-minimo", () => ({
  getMatchesForPerfilMinimo: (...a: unknown[]) => mockMinimo(...a),
}));

import { estanteParaTi, TARJETAS_PARA_TI } from "@/src/lib/secop/para-ti";
import EstanteParaTi from "@/src/components/secop/vitrina/EstanteParaTi";

function proceso(n: number, over: Partial<SecopProceso> = {}): SecopProceso {
  return {
    id: `CO1.REQ.${n}`,
    referencia: "",
    nombre: `OPTIMIZACIÓN DE LA PTAP ${n}`,
    descripcion: "",
    entidad: "Alcaldía",
    departamento: "Boyacá",
    ciudad: "Tunja",
    estado: "Publicado",
    fase: "",
    modalidad: "",
    tipoContrato: "",
    fechaPublicacion: null,
    precioBase: 260_000_000,
    adjudicado: false,
    valorAdjudicacion: null,
    adjudicatario: null,
    unspsc: null,
    url: null,
    estadoApertura: "Abierto",
    documentAccess: "UNKNOWN",
    accessMessage: "",
    ...over,
  };
}

beforeEach(() => {
  for (const m of [mockPerfil, mockCompleto, mockMinimo, mockEsCompleto]) m.mockReset();
});

describe("estanteParaTi", () => {
  it("sin perfil guardado no hay estante", async () => {
    mockPerfil.mockResolvedValue(null);
    expect(await estanteParaTi("u1")).toBeNull();
    expect(mockCompleto).not.toHaveBeenCalled();
  });

  it("perfil completo: las cinco compuertas, y solo las primeras en el estante", async () => {
    mockPerfil.mockResolvedValue({ id: "p" });
    mockEsCompleto.mockReturnValue(true);
    mockCompleto.mockResolvedValue(
      Array.from({ length: 7 }, (_, i) => ({ proceso: proceso(i), verdict: { overall: "PASS" } }))
    );
    const e = await estanteParaTi("u1");
    expect(e.total).toBe(7);
    expect(e.tarjetas).toHaveLength(TARJETAS_PARA_TI);
    expect(e.tarjetas[0]).toEqual({
      id: "CO1.REQ.0",
      href: "/licitaciones/optimizacion-de-la-ptap-0--CO1.REQ.0",
      titulo: "Optimización de la PTAP 0",
      entidad: "Alcaldía",
      lugar: "Tunja, Boyacá",
      presupuesto: "$260 M",
      overall: "PASS",
    });
    expect(mockMinimo).not.toHaveBeenCalled();
  });

  it("perfil mínimo: sector y zona, por su propia consulta", async () => {
    mockPerfil.mockResolvedValue({ id: "p" });
    mockEsCompleto.mockReturnValue(false);
    mockMinimo.mockResolvedValue([{ proceso: proceso(1, { precioBase: 0 }), overall: "UNKNOWN" }]);
    const e = await estanteParaTi("u1");
    expect(e.tarjetas[0].overall).toBe("UNKNOWN");
    // El 0 del SECOP es «sin dato», nunca «$0».
    expect(e.tarjetas[0].presupuesto).toBe("Sin presupuesto publicado");
    expect(mockCompleto).not.toHaveBeenCalled();
  });
});

describe("EstanteParaTi — HTML del servidor", () => {
  const tarjeta = {
    id: "CO1.REQ.1",
    href: "/licitaciones/x--CO1.REQ.1",
    titulo: "PTAP de Covarachía",
    entidad: "Alcaldía",
    lugar: "Covarachía, Boyacá",
    presupuesto: "$260 M",
    overall: "WARN" as const,
  };

  it("abierto, con las tarjetas enlazadas a su ficha y el enlace a la lista entera", () => {
    const h = renderToStaticMarkup(<EstanteParaTi estante={{ total: 9, tarjetas: [tarjeta] }} />);
    expect(h).toMatch(/^<details class="pt" open="">/);
    expect(h).toContain("9 encajan con tu perfil");
    expect(h).toContain('href="/licitaciones/x--CO1.REQ.1"');
    expect(h).toContain(">Revisar<");
    expect(h).toContain("Ver las 9 en Mis coincidencias");
  });

  it("sin coincidencias lo dice y lleva al perfil", () => {
    const h = renderToStaticMarkup(<EstanteParaTi estante={{ total: 0, tarjetas: [] }} />);
    expect(h).toContain("nada encaja hoy");
    expect(h).toContain('href="/perfil"');
  });
});
