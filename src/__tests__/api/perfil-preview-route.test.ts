import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { OferenteProfile } from "@/src/lib/oferente/types";
import type { Match } from "@/src/lib/matching/match";
import type { SecopProceso } from "@/src/lib/secop/types";

const mockAuth = vi.fn();
vi.mock("@/src/lib/supabase/get-session-user", () => ({
  getSessionUser: () => mockAuth(),
}));

const mockGetMatches = vi.fn();
vi.mock("@/src/lib/matching/get-matches-for-perfil", () => ({
  getMatchesForPerfil: (...args: unknown[]) => mockGetMatches(...args),
}));

import { POST } from "@/app/api/perfil/preview/route";

const perfil: OferenteProfile = {
  id: "oferente-1",
  tipoPersona: "juridica",
  sectoresUnspsc: ["83101"],
  capacidadFinanciera: {
    capitalTrabajoCop: 0,
    indiceLiquidez: 0,
    indiceEndeudamiento: 0,
    razonCoberturaIntereses: 0,
    fuente: "manual",
    vigenciaHasta: null,
  },
  kCapacidadResidualCop: null,
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

function match(over: Partial<SecopProceso> = {}): Match {
  const p = proceso(over);
  return {
    proceso: p,
    verdict: {
      procesoId: p.id,
      overall: "PASS",
      gates: {
        sectorial: { status: "PASS", reason: "", resolvedBy: "metadata", requiredLevel: 0 },
        cuantia: { status: "PASS", reason: "", resolvedBy: "metadata", requiredLevel: 0 },
        plazo: { status: "PASS", reason: "", resolvedBy: "metadata", requiredLevel: 0 },
        ubicacion: { status: "PASS", reason: "", resolvedBy: "metadata", requiredLevel: 0 },
        habilitacion: { status: "UNKNOWN", reason: "", resolvedBy: "document", requiredLevel: 2 },
      },
      level: 0,
      evaluatedAt: "2026-06-27T00:00:00Z",
    },
  };
}

const postReq = (body: unknown) =>
  new NextRequest("http://localhost/api/perfil/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

describe("POST /api/perfil/preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(postReq(perfil));
    expect(res.status).toBe(401);
  });

  it("400 con JSON inválido", async () => {
    mockAuth.mockResolvedValue({ id: "u1", email: "u1@example.com" });
    const res = await POST(postReq("no-es-json"));
    expect(res.status).toBe(400);
  });

  it("400 con perfil inválido", async () => {
    mockAuth.mockResolvedValue({ id: "u1", email: "u1@example.com" });
    const res = await POST(postReq({ id: "x" }));
    expect(res.status).toBe(400);
  });

  it("200 con count y hasta 3 ejemplos, valor con fallback precioBase→valorAdjudicacion", async () => {
    mockAuth.mockResolvedValue({ id: "u1", email: "u1@example.com" });
    mockGetMatches.mockResolvedValue([
      match({
        id: "A",
        nombre: "Proceso A",
        entidad: "Entidad A",
        precioBase: 100,
        valorAdjudicacion: null,
      }),
      match({
        id: "B",
        nombre: "Proceso B",
        entidad: "Entidad B",
        precioBase: null,
        valorAdjudicacion: 200,
      }),
      match({ id: "C", nombre: "Proceso C", entidad: "Entidad C" }),
      match({ id: "D", nombre: "Proceso D", entidad: "Entidad D" }),
    ]);
    const res = await POST(postReq(perfil));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(4);
    expect(body.ejemplos).toHaveLength(3);
    expect(body.ejemplos[0]).toEqual({ nombre: "Proceso A", entidad: "Entidad A", valor: 100 });
    expect(body.ejemplos[1]).toEqual({ nombre: "Proceso B", entidad: "Entidad B", valor: 200 });
    expect(mockGetMatches).toHaveBeenCalledWith(perfil);
  });

  it("503 si getMatchesForPerfil lanza (base inalcanzable)", async () => {
    mockAuth.mockResolvedValue({ id: "u1", email: "u1@example.com" });
    mockGetMatches.mockRejectedValue(new Error("connection refused"));
    const res = await POST(postReq(perfil));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe("DB_UNAVAILABLE");
  });
});
