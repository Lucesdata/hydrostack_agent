import { describe, it, expect } from "vitest";
import {
  CLAVES_COMPUERTA,
  ETIQUETA_COMPUERTA,
  PALABRA_ESTADO,
  compuertasAbsolutas,
  compuertasDesdeVeredicto,
  type ProcesoParaSemaforo,
} from "@/src/lib/secop/semaforo";

const base: ProcesoParaSemaforo = {
  tipoProyecto: null,
  valorEstimado: null,
  departamento: null,
  municipio: null,
  estadoApertura: null,
  fechaRecepcion: null,
};

describe("las cinco compuertas", () => {
  it("son cinco, en el orden del spec", () => {
    expect([...CLAVES_COMPUERTA]).toEqual([
      "sectorial",
      "cuantia",
      "plazo",
      "ubicacion",
      "habilitacion",
    ]);
  });

  it("la compuerta `ubicacion` se le muestra al usuario como «Zona»", () => {
    // El código la llamó así antes de que el producto la llamara de la otra
    // forma. Renombrar la clave arrastraría verdict.ts, sus tests y el endpoint.
    expect(ETIQUETA_COMPUERTA.ubicacion).toBe("Zona");
  });

  it("todo estado tiene una palabra: el color nunca viaja solo", () => {
    for (const estado of ["PASS", "WARN", "FAIL", "UNKNOWN", "DATO"] as const) {
      expect(PALABRA_ESTADO[estado]).toBeTruthy();
    }
  });
});

describe("lectura absoluta (sin perfil)", () => {
  it("devuelve siempre las cinco, aunque no haya datos", () => {
    const c = compuertasAbsolutas(base);
    expect(c).toHaveLength(5);
    expect(c.map((x) => x.clave)).toEqual([...CLAVES_COMPUERTA]);
  });

  it("nunca emite PASS ni FAIL: sin perfil no hay nada que aprobar", () => {
    // Es la diferencia entre "el proceso es de acueducto" y "calificas", y
    // pintarlo verde diría lo segundo.
    const c = compuertasAbsolutas({
      ...base,
      tipoProyecto: "ptar",
      valorEstimado: "2400000000",
      departamento: "Antioquia",
      municipio: "Medellín",
      estadoApertura: "Abierto",
    });
    for (const x of c) expect(["DATO", "UNKNOWN"]).toContain(x.estado);
  });

  it("enuncia lo que el proceso exige en cada eje que tiene dato", () => {
    const c = compuertasAbsolutas({
      ...base,
      tipoProyecto: "ptap",
      valorEstimado: "800000000",
      departamento: "Caldas",
      municipio: "Manizales",
    });
    const por = (k: string) => c.find((x) => x.clave === k)!;
    // La sigla va en mayúscula: "Proyecto de ptap" parecía una errata.
    expect(por("sectorial").explicacion).toContain("PTAP");
    expect(por("cuantia").estado).toBe("DATO");
    expect(por("ubicacion").explicacion).toBe(
      "Entidad contratante ubicada en Manizales, Caldas. Lugar de ejecución no confirmado."
    );
  });

  it("un presupuesto en cero no es una exigencia: queda sin datos", () => {
    expect(
      compuertasAbsolutas({ ...base, valorEstimado: "0" }).find((x) => x.clave === "cuantia")!
        .estado
    ).toBe("UNKNOWN");
  });

  it("habilitación siempre queda sin datos: sus requisitos viven en el pliego", () => {
    // `requisitos_proceso` está vacía y `verdict.ts` la deja UNKNOWN en Nivel 0.
    const h = compuertasAbsolutas(base).find((x) => x.clave === "habilitacion")!;
    expect(h.estado).toBe("UNKNOWN");
  });

  it("no inventa un plazo que el SECOP no publica", () => {
    const abierto = compuertasAbsolutas({ ...base, estadoApertura: "Abierto" });
    expect(abierto.find((x) => x.clave === "plazo")!.explicacion).toContain("no publica la fecha");
  });
});

describe("lectura relativa (con veredicto)", () => {
  const gate = (status: string, reason: string) => ({
    status,
    reason,
    resolvedBy: "metadata",
    requiredLevel: 0,
  });

  it("traduce las cinco compuertas del veredicto conservando su estado", () => {
    const v = {
      procesoId: "p1",
      overall: "WARN",
      level: 0,
      evaluatedAt: "2026-09-15T00:00:00Z",
      gates: {
        sectorial: gate("PASS", "dentro de tus sectores"),
        cuantia: gate("WARN", "roza el techo de tu rango"),
        plazo: gate("PASS", "abierto"),
        ubicacion: gate("FAIL", "fuera de tu cobertura"),
        habilitacion: gate("UNKNOWN", "requiere pliego"),
      },
    } as never;
    const c = compuertasDesdeVeredicto(v);
    expect(c.map((x) => x.estado)).toEqual(["PASS", "WARN", "PASS", "FAIL", "UNKNOWN"]);
    expect(c[1].explicacion).toBe("roza el techo de tu rango");
  });

  it("marca como redactada la compuerta cuya explicación pide cuenta", () => {
    const v = {
      procesoId: "p1",
      overall: "PASS",
      level: 0,
      evaluatedAt: "2026-09-15T00:00:00Z",
      gates: {
        sectorial: { status: "PASS", redactado: true, resolvedBy: "metadata", requiredLevel: 0 },
        cuantia: gate("PASS", "ok"),
        plazo: gate("PASS", "ok"),
        ubicacion: gate("PASS", "ok"),
        habilitacion: gate("UNKNOWN", "requiere pliego"),
      },
    } as never;
    const c = compuertasDesdeVeredicto(v);
    expect(c[0].redactada).toBe(true);
    expect(c[0].explicacion).toBeNull();
    // El estado NO se oculta: la frontera del producto es la explicación, no el
    // semáforo — ver verdict-publico.ts.
    expect(c[0].estado).toBe("PASS");
  });
});

describe("valorCorto: lo que se ve en la fila densa", () => {
  it("en la lectura absoluta muestra el VALOR, no un estado repetido", () => {
    // La primera versión mostraba la palabra del estado y salían cinco "exige"
    // seguidos: ocupaba una columna entera para no decir nada.
    const c = compuertasAbsolutas({
      tipoProyecto: "ptar",
      valorEstimado: "49000000",
      departamento: "Cundinamarca",
      municipio: "Anapoima",
      estadoApertura: "Abierto",
      fechaRecepcion: null,
    });
    const por = (k: string) => c.find((x) => x.clave === k)!.valorCorto;
    expect(por("sectorial")).toBe("PTAR");
    expect(por("ubicacion")).toBe("Cundinamarca");
    expect(por("plazo")).toBe("abierto");
    expect(por("cuantia")).toMatch(/49/);
    expect(new Set(c.map((x) => x.valorCorto)).size).toBeGreaterThan(1);
  });

  it("en la lectura relativa sí muestra el estado: ahí el estado es la información", () => {
    const v = {
      procesoId: "p1",
      overall: "WARN",
      level: 0,
      evaluatedAt: "2026-09-15T00:00:00Z",
      gates: {
        sectorial: { status: "PASS", reason: "ok", resolvedBy: "metadata", requiredLevel: 0 },
        cuantia: { status: "WARN", reason: "ok", resolvedBy: "metadata", requiredLevel: 0 },
        plazo: { status: "PASS", reason: "ok", resolvedBy: "metadata", requiredLevel: 0 },
        ubicacion: { status: "FAIL", reason: "ok", resolvedBy: "metadata", requiredLevel: 0 },
        habilitacion: { status: "UNKNOWN", reason: "ok", resolvedBy: "metadata", requiredLevel: 0 },
      },
    } as never;
    expect(compuertasDesdeVeredicto(v).map((x) => x.valorCorto)).toEqual([
      "cumple",
      "revisar",
      "cumple",
      "no cumple",
      "sin datos",
    ]);
  });

  it("nunca deja el valor corto vacío: sin dato dice «sin datos»", () => {
    const c = compuertasAbsolutas({
      tipoProyecto: null,
      valorEstimado: null,
      departamento: null,
      municipio: null,
      estadoApertura: null,
      fechaRecepcion: null,
    });
    for (const x of c) expect(x.valorCorto).toBeTruthy();
  });
});
