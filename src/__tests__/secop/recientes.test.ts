import { describe, it, expect } from "vitest";
import { extractUrlProceso, mapRowToResumen, type RecienteRow } from "@/src/lib/secop/recientes";

const baseRow: RecienteRow = {
  secopProcesoId: "CO1.REQ.100",
  referencia: "LP-001-2026",
  objeto: "CONSTRUCCIÓN PTAP MUNICIPIO X",
  modalidad: "Licitación pública",
  estado: "Publicado",
  valorEstimado: "1500000000.00",
  fechaPublicacion: "2026-07-10",
  entidadNombre: "ALCALDÍA DE X",
  departamento: "VALLE DEL CAUCA",
  municipio: "CALI",
  urlRaw: { url: "https://community.secop.gov.co/x" },
};

describe("extractUrlProceso", () => {
  it("string http → tal cual", () => {
    expect(extractUrlProceso("https://a.co/p")).toBe("https://a.co/p");
  });
  it("objeto { url } → url interna", () => {
    expect(extractUrlProceso({ url: "https://a.co/p" })).toBe("https://a.co/p");
  });
  it("basura → null", () => {
    expect(extractUrlProceso(null)).toBeNull();
    expect(extractUrlProceso("no-descargable")).toBeNull();
    expect(extractUrlProceso({ url: 42 })).toBeNull();
    expect(extractUrlProceso(7)).toBeNull();
  });
});

describe("mapRowToResumen", () => {
  it("mapea la fila completa, numeric pg (string) → number", () => {
    const r = mapRowToResumen(baseRow);
    expect(r.id).toBe("CO1.REQ.100");
    expect(r.valorEstimado).toBe(1500000000);
    expect(r.url).toBe("https://community.secop.gov.co/x");
    expect(r.municipio).toBe("CALI");
  });
  it("nulos degradan sin romper", () => {
    const r = mapRowToResumen({
      ...baseRow,
      objeto: null,
      valorEstimado: null,
      urlRaw: null,
      entidadNombre: null,
    });
    expect(r.objeto).toBe("");
    expect(r.valorEstimado).toBeNull();
    expect(r.url).toBeNull();
    expect(r.entidad).toBeNull();
  });
  it("numeric ilegible → null, no NaN", () => {
    const r = mapRowToResumen({ ...baseRow, valorEstimado: "abc" });
    expect(r.valorEstimado).toBeNull();
  });
});

describe("el 0 de SECOP no viaja en el DTO", () => {
  // 9.436 filas traen `valor_estimado = 0` y no es que el proceso sea gratis:
  // es que la entidad no publicó la cuantía. Si el 0 llega al DTO, la fila
  // de destacados del departamento pinta "$ 0" y afirma un precio inexistente.
  it("fila de base con '0.00' → valorEstimado null", () => {
    expect(mapRowToResumen({ ...baseRow, valorEstimado: "0.00" }).valorEstimado).toBeNull();
  });
});

describe("enlace a la ficha", () => {
  it("la fila mapeada no inventa ficha: la ruta se añade solo al leer de la base", () => {
    const r = mapRowToResumen({ ...baseRow, tipoProyecto: "ptar" });
    expect(r.tipoProyecto).toBe("ptar");
    expect(r.ficha).toBeNull();
  });
});
