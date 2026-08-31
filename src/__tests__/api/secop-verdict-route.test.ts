import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { SecopProceso } from "@/src/lib/secop/types";
import type { OferenteProfile } from "@/src/lib/oferente/types";

const mockLimit = vi.fn();
vi.mock("@/src/lib/db/client", () => ({
  db: { select: () => ({ from: () => ({ where: () => ({ limit: mockLimit }) }) }) },
}));

const mockAuth = vi.fn();
vi.mock("@/src/lib/supabase/get-session-user", () => ({ getSessionUser: () => mockAuth() }));

const mockSignal = vi.fn();
vi.mock("@/src/lib/signals/record-signal", () => ({
  recordUserSignal: (...a: unknown[]) => mockSignal(...a),
}));

import { POST } from "@/app/api/secop/verdict/route";

const proceso: SecopProceso = {
  id: "CO1.REQ.42",
  referencia: "R42",
  nombre: "Optimización acueducto",
  descripcion: "",
  entidad: "Acuavalle",
  departamento: "Valle del Cauca",
  ciudad: "Cali",
  estado: "Publicado",
  fase: "",
  modalidad: "Licitación pública",
  tipoContrato: "Obra",
  fechaPublicacion: null,
  precioBase: 200_000_000,
  adjudicado: false,
  valorAdjudicacion: null,
  adjudicatario: null,
  unspsc: "V1.83101500",
  url: null,
  estadoApertura: "Abierto",
  documentAccess: "UNKNOWN",
  accessMessage: "",
};

const perfil: OferenteProfile = {
  id: "oferente-local",
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

const postReq = (body: unknown) =>
  new NextRequest("http://localhost/api/secop/verdict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

describe("POST /api/secop/verdict — veredicto Nivel 0 on-demand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLimit.mockResolvedValue([]); // sin requisitos cacheados por defecto
    mockAuth.mockResolvedValue(null); // sin sesión por defecto
  });

  it("devuelve el veredicto para un proceso y perfil válidos", async () => {
    const res = await POST(postReq({ proceso, perfil }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.verdict.procesoId).toBe("CO1.REQ.42");
    expect(body.verdict.level).toBe(0);
    expect(body.verdict.gates.habilitacion.status).toBe("UNKNOWN");
    expect(["PASS", "WARN", "FAIL", "UNKNOWN"]).toContain(body.verdict.overall);
  });

  it("recomputa (no persiste): dos llamadas con el mismo insumo dan el mismo resultado", async () => {
    const r1 = await (await POST(postReq({ proceso, perfil }))).json();
    const r2 = await (await POST(postReq({ proceso, perfil }))).json();
    expect(r1.verdict.overall).toBe(r2.verdict.overall);
  });

  it("400 si falta el perfil", async () => {
    const res = await POST(postReq({ proceso }));
    expect(res.status).toBe(400);
  });

  it("400 si falta el proceso", async () => {
    const res = await POST(postReq({ perfil }));
    expect(res.status).toBe(400);
  });

  it("400 si el JSON es inválido", async () => {
    const res = await POST(postReq("no-es-json"));
    expect(res.status).toBe(400);
  });

  it("registra la señal oferente cuando hay sesión", async () => {
    mockAuth.mockResolvedValue({ id: "u1", email: "u1@example.com" });
    await POST(postReq({ proceso, perfil }));
    expect(mockSignal).toHaveBeenCalledWith("u1", "oferente");
  });

  it("no registra señal sin sesión", async () => {
    await POST(postReq({ proceso, perfil }));
    expect(mockSignal).not.toHaveBeenCalled();
  });

  it("usa los requisitos cacheados: habilitacionGate deja de ser UNKNOWN", async () => {
    mockLimit.mockResolvedValue([
      {
        procesoId: proceso.id,
        requisitos: {
          experiencia: {
            valor_min_smmlv: 0,
            unspsc_exigidos: [],
            max_contratos_aportables: null,
            verificar_manual: true, // fuerza WARN, no depende del perfil
            cita_textual: "Se debe acreditar experiencia mínima según el RUP.",
          },
          indicadores_financieros: [],
        },
      },
    ]);
    const res = await POST(postReq({ proceso, perfil }));
    const body = await res.json();
    expect(body.verdict.gates.habilitacion.status).toBe("WARN");
  });

  it("fila cacheada corrupta no produce 500 — se trata como si no hubiera caché (UNKNOWN)", async () => {
    mockLimit.mockResolvedValue([{ procesoId: proceso.id, requisitos: { garbage: true } }]);
    const res = await POST(postReq({ proceso, perfil }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.verdict.gates.habilitacion.status).toBe("UNKNOWN");
  });

  it("sin sesión devuelve el veredicto redactado", async () => {
    const res = await POST(postReq({ proceso, perfil }));
    const body = await res.json();
    expect(body.verdict.redactado).toBe(true);
  });

  it("con sesión devuelve el veredicto completo", async () => {
    mockAuth.mockResolvedValue({ id: "u1", email: "u1@example.com" });
    const res = await POST(postReq({ proceso, perfil }));
    const body = await res.json();
    expect(body.verdict.redactado).toBe(false);
  });

  it("el semáforo y los estados por compuerta sobreviven a la redacción", async () => {
    const res = await POST(postReq({ proceso, perfil }));
    const body = await res.json();
    expect(body.verdict.overall).toBeDefined();
    for (const clave of ["sectorial", "cuantia", "plazo", "ubicacion", "habilitacion"]) {
      expect(body.verdict.gates[clave].status).toBeDefined();
    }
  });

  it("redactar no cuesta una consulta más: la sesión basta, el plan no se lee", async () => {
    mockLimit.mockClear();
    await POST(postReq({ proceso, perfil }));
    // La única consulta del handler sigue siendo la de requisitos cacheados.
    expect(mockLimit).toHaveBeenCalledTimes(1);
  });
});
