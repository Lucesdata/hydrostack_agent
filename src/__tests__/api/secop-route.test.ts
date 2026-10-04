import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import type { SecopProceso } from "@/src/lib/secop/types";

// La búsqueda hace IO (Postgres y/o red a Socrata). Se mockean ambas fuentes
// para probar SOLO el route: que Postgres es la fuente primaria (Fase 3) y
// que Socrata live es el fallback si la base falla.
vi.mock("@/src/lib/secop/client", () => ({
  searchProcesos: vi.fn(),
  searchContratos: vi.fn(),
  countProcesos: vi.fn(),
}));
vi.mock("@/src/lib/secop/cached-db-search", () => ({
  searchProcesosDbCached: vi.fn(),
  countProcesosDbCached: vi.fn(),
}));

import { GET } from "@/app/api/secop/route";
import { searchProcesos, countProcesos, searchContratos } from "@/src/lib/secop/client";
import { searchProcesosDbCached, countProcesosDbCached } from "@/src/lib/secop/cached-db-search";

const mockedSearch = vi.mocked(searchProcesos);
const mockedCount = vi.mocked(countProcesos);
const mockedSearchDb = vi.mocked(searchProcesosDbCached);
const mockedCountDb = vi.mocked(countProcesosDbCached);

const sampleProceso: SecopProceso = {
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

const req = (qs = "tipo=procesos") => new NextRequest(`http://localhost/api/secop?${qs}`);

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("GET /api/secop — Postgres primero, Socrata como fallback (Fase 3)", () => {
  it("usa Postgres cuando responde bien, sin tocar Socrata", async () => {
    mockedSearchDb.mockResolvedValue({ items: [sampleProceso], page: 1, pageSize: 25 });
    mockedCountDb.mockResolvedValue(1);
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.items[0].id).toBe("CO1.REQ.42");
    expect(mockedSearch).not.toHaveBeenCalled();
    expect(mockedCount).not.toHaveBeenCalled();
  });

  it("no adjunta verdict a los items; el semáforo se computa aparte en POST /api/secop/verdict", async () => {
    mockedSearchDb.mockResolvedValue({ items: [sampleProceso], page: 1, pageSize: 25 });
    mockedCountDb.mockResolvedValue(1);
    const res = await GET(req());
    const body = await res.json();
    expect(body.items[0].verdict).toBeUndefined();
  });

  it("cae a Socrata live si Postgres falla (sin DATABASE_URL, error de conexión/consulta)", async () => {
    mockedSearchDb.mockRejectedValue(new Error("no DATABASE_URL"));
    mockedCountDb.mockRejectedValue(new Error("no DATABASE_URL"));
    mockedSearch.mockResolvedValue({ items: [sampleProceso], page: 1, pageSize: 25 });
    mockedCount.mockResolvedValue(7);
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(7);
    expect(body.items[0].id).toBe("CO1.REQ.42");
  });

  it("un total vacío en Postgres (filtros muy angostos) NO cae a Socrata", async () => {
    mockedSearchDb.mockResolvedValue({ items: [], page: 1, pageSize: 25 });
    mockedCountDb.mockResolvedValue(0);
    const res = await GET(req());
    const body = await res.json();
    expect(body.total).toBe(0);
    expect(body.items).toHaveLength(0);
    expect(mockedSearch).not.toHaveBeenCalled();
  });
});

describe("GET /api/secop — buscador guiado", () => {
  it("transmite sistema y actividad sin el filtro textual sectorial antiguo", async () => {
    mockedSearchDb.mockResolvedValue({ items: [sampleProceso], page: 1, pageSize: 25 });
    mockedCountDb.mockResolvedValue(1);
    const res = await GET(req("modo=tema&sistema=ptar&actividad=consultoria&apertura=Abierto"));
    expect(res.status).toBe(200);
    expect((await res.json()).total).toBe(1);
    expect(mockedSearchDb).toHaveBeenCalledWith(
      expect.objectContaining({
        modo: "tema",
        sistema: "ptar",
        actividad: "consultoria",
        apertura: "Abierto",
        soloAgua: false,
      })
    );
  });

  it.each([
    "modo=inventado",
    "modo=tema&sistema=inventado",
    "modo=tema&actividad=inventada",
    "modo=numero",
    "modo=numero&numero=R42&sistema=ptar",
    "modo=tema&pageSize=0",
    "tipo=contratos&modo=tema&actividad=muestreo",
  ])("criterios inválidos responden 400 sin consultar datos: %s", async (query) => {
    const res = await GET(req(query));
    expect(res.status).toBe(400);
    expect(await res.json()).toHaveProperty("error");
    expect(mockedSearchDb).not.toHaveBeenCalled();
    expect(mockedSearch).not.toHaveBeenCalled();
    expect(searchContratos).not.toHaveBeenCalled();
  });

  it("el número elimina el límite de abiertos y preserva las coincidencias", async () => {
    mockedSearchDb.mockResolvedValue({
      items: [{ ...sampleProceso, estadoApertura: "Cerrado", coincidencia: "exacta" }],
      page: 1,
      pageSize: 25,
    });
    mockedCountDb.mockResolvedValue(1);
    const res = await GET(req("modo=numero&numero=CO1.REQ.42&apertura=Abierto"));
    expect(res.status).toBe(200);
    expect((await res.json()).items[0]).toMatchObject({
      estadoApertura: "Cerrado",
      coincidencia: "exacta",
    });
    expect(mockedSearchDb).toHaveBeenCalledWith(
      expect.objectContaining({
        modo: "numero",
        numero: "CO1.REQ.42",
        apertura: undefined,
        soloAgua: false,
      })
    );
  });

  it.each(["listado", "conteo"])(
    "si falla %s devuelve 503 sin buscar en vivo ni revelar detalles",
    async (parte) => {
      const failure = new Error("postgres://usuario:secreto@host/privado");
      mockedSearchDb.mockResolvedValue({ items: [sampleProceso], page: 1, pageSize: 25 });
      mockedCountDb.mockResolvedValue(1);
      if (parte === "listado") mockedSearchDb.mockRejectedValue(failure);
      else mockedCountDb.mockRejectedValue(failure);
      mockedSearch.mockResolvedValue({ items: [sampleProceso], page: 1, pageSize: 25 });
      mockedCount.mockResolvedValue(7);
      const res = await GET(req("modo=tema&actividad=consultoria"));
      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body).toHaveProperty("error");
      expect(JSON.stringify(body)).not.toContain("secreto");
      expect(body.detail).toBeUndefined();
      expect(body.items).toBeUndefined();
      expect(mockedSearch).not.toHaveBeenCalled();
      expect(mockedCount).not.toHaveBeenCalled();
    }
  );

  it("un vacío guiado es una respuesta válida sin caída a la red", async () => {
    mockedSearchDb.mockResolvedValue({ items: [], page: 1, pageSize: 25 });
    mockedCountDb.mockResolvedValue(0);
    const res = await GET(req("modo=numero&numero=NO-EXISTE"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ items: [], total: 0 });
    expect(mockedSearch).not.toHaveBeenCalled();
  });
});
