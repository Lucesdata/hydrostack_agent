import { describe, expect, it } from "vitest";
import { entradaDesdeFormData } from "@/src/lib/empresa/formulario";
import { validarEntradaEmpresa } from "@/src/lib/empresa/validar";
import type { EmpresaGuardada } from "@/src/lib/empresa/servicio";

function fd(pares: [string, string][]): FormData {
  const f = new FormData();
  for (const [k, v] of pares) f.append(k, v);
  return f;
}

const base: [string, string][] = [
  ["razonSocial", "  Acme Pumps GmbH "],
  ["pais", "de"],
  ["registroEmpresarial", "HRB 1"],
  ["sitioOficial", "https://acme.example"],
  ["rol", "fabricante_internacional"],
  ["rol", "importador"],
  ["cap", "BOM.SUM"],
  ["marcas:BOM.SUM", "Acme, Otra ; Acme"],
  ["cap", "INS"],
  ["dpto", "76"],
  ["dpto", "19"],
  ["attr:idiomas", "es, en"],
  ["attr:garantias", "24 meses"],
  ["attr:operacion", "Mediante aliado local"],
];

describe("entradaDesdeFormData", () => {
  it("convierte el formulario en la entrada del servicio y esta pasa el validador", () => {
    const e = entradaDesdeFormData(fd(base), null) as Record<string, unknown>;
    expect(e.razonSocial).toBe("  Acme Pumps GmbH ");
    expect(e.roles).toEqual(["fabricante_internacional", "importador"]);
    expect(e.capacidades).toEqual([
      { nodoCodigo: "BOM.SUM", marcas: ["Acme", "Otra", "Acme"], especificaciones: null },
      { nodoCodigo: "INS", marcas: [], especificaciones: null },
    ]);
    expect(e.cobertura).toEqual(["76", "19"]);
    expect(e.coberturaNacional).toBe(false);
    expect(e.atributos).toEqual({
      idiomas: ["es", "en"],
      garantias: "24 meses",
      operacion: "Mediante aliado local",
    });
    expect(validarEntradaEmpresa(e).ok).toBe(true);
  });

  it("«Todo el país» activa la cobertura nacional", () => {
    const e = entradaDesdeFormData(fd([...base, ["coberturaNacional", "on"]]), null) as Record<
      string,
      unknown
    >;
    expect(e.coberturaNacional).toBe(true);
  });

  it("los campos vacíos no entran en atributos", () => {
    const e = entradaDesdeFormData(fd([...base, ["attr:soporte_tecnico", "   "]]), null) as {
      atributos: Record<string, unknown>;
    };
    expect(e.atributos).not.toHaveProperty("soporte_tecnico");
  });

  it("ignora campos que el formulario no ofrece: estados, ids y verificación", () => {
    const e = entradaDesdeFormData(
      fd([
        ...base,
        ["estadoVerificacion", "verificada"],
        ["usuarioId", "otro"],
        ["estado:BOM.SUM", "verificado"],
      ]),
      null
    ) as Record<string, unknown>;
    expect(JSON.stringify(e)).not.toMatch(/verificada|otro|verificado/);
  });

  it("conserva las especificaciones ya guardadas, que el formulario no edita", () => {
    const existente = {
      capacidades: [
        {
          nodoCodigo: "BOM.SUM",
          especificaciones: { caudal_max_m3h: 120 },
          marcas: [],
          estadoDato: "declarado",
          taxonomiaVersion: "x",
        },
      ],
      cobertura: [],
    } as unknown as EmpresaGuardada;
    const e = entradaDesdeFormData(fd(base), existente) as {
      capacidades: { nodoCodigo: string; especificaciones: unknown }[];
    };
    expect(e.capacidades.find((c) => c.nodoCodigo === "BOM.SUM")?.especificaciones).toEqual({
      caudal_max_m3h: 120,
    });
    expect(e.capacidades.find((c) => c.nodoCodigo === "INS")?.especificaciones).toBeNull();
  });

  it("conserva la cobertura municipal ya declarada, que el formulario no edita", () => {
    const existente = {
      capacidades: [],
      cobertura: [
        { divipola: "05001", estadoDato: "declarado" },
        { divipola: "76", estadoDato: "declarado" },
      ],
    } as unknown as EmpresaGuardada;
    const e = entradaDesdeFormData(
      fd([
        ["razonSocial", "X"],
        ["pais", "DE"],
      ]),
      existente
    ) as { cobertura: string[] };
    expect(e.cobertura).toEqual(["05001"]); // el departamento se desmarcó; el municipio se conserva
  });

  it("un formulario vacío da una entrada vacía pero válida de forma (el validador decide)", () => {
    const e = entradaDesdeFormData(fd([]), null) as Record<string, unknown>;
    expect(e.roles).toEqual([]);
    expect(e.capacidades).toEqual([]);
    expect(validarEntradaEmpresa(e).ok).toBe(false); // falta razón social y país
  });
});
