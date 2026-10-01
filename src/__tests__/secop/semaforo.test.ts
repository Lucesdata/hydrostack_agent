import { describe, it, expect } from "vitest";
import {
  CLAVES_COMPUERTA,
  ETIQUETA_COMPUERTA,
  PALABRA_ESTADO,
  compuertasAbsolutas,
  compuertasDesdeVeredicto,
  explicacionModalidad,
  fechaCortaDeDia,
  fraseVeredicto,
  siguientePaso,
  textoDiasRestantes,
  ventanaDeOfertas,
  type CompuertaVista,
  type EstadoCompuerta,
  type ProcesoParaSemaforo,
} from "@/src/lib/secop/semaforo";
import type { GateStatus } from "@/src/lib/secop/verdict";

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

  it("la fecha de recepción (DATE) conserva su día de calendario", () => {
    const plazo = compuertasAbsolutas({ ...base, fechaRecepcion: "2026-10-15" }).find(
      (x) => x.clave === "plazo"
    )!;
    expect(plazo.valorCorto).toContain("15");
    expect(plazo.explicacion).toContain("15");
    expect(plazo.explicacion).not.toContain("14");
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

// ── Bloque de decisión (spec 2026-09-28-ficha-bloque-decision) ──────────────

function vistas(
  estados: [EstadoCompuerta, EstadoCompuerta, EstadoCompuerta, EstadoCompuerta, EstadoCompuerta],
  faltanEnPerfil?: string[]
): CompuertaVista[] {
  return CLAVES_COMPUERTA.map((clave, i) => ({
    clave,
    etiqueta: clave,
    estado: estados[i],
    explicacion: "x",
    valorCorto: "x",
    redactada: false,
    ...(clave === "habilitacion" && faltanEnPerfil ? { faltanEnPerfil } : {}),
  }));
}

describe("fraseVeredicto", () => {
  it("sin perfil no juzga: dice que depende de la empresa", () => {
    const f = fraseVeredicto(vistas(["DATO", "DATO", "DATO", "DATO", "UNKNOWN"]), false);
    expect(f.titulo).toBe("Esto exige el proceso. Si te sirve, depende de tu empresa.");
  });

  it("cuatro cumplen y la habilitación sin dato", () => {
    const f = fraseVeredicto(vistas(["PASS", "PASS", "PASS", "PASS", "UNKNOWN"]), true);
    expect(f.titulo).toBe("Encaja con tu empresa en 4 de 5: falta el dato de la habilitación.");
    expect(f.bajada).toBe("La habilitación solo se sabe leyendo el pliego del proceso.");
  });

  it("revisar y sin dato a la vez, enumerados en frase", () => {
    const f = fraseVeredicto(vistas(["PASS", "PASS", "WARN", "WARN", "UNKNOWN"]), true);
    expect(f.titulo).toBe(
      "Encaja con tu empresa en 2 de 5: revisa el plazo y la zona; falta el dato de la habilitación."
    );
  });

  it("alguna no cumple: lo dice primero, nombrando cuáles", () => {
    const f = fraseVeredicto(vistas(["PASS", "FAIL", "PASS", "WARN", "FAIL"]), true);
    expect(f.titulo).toBe("Hoy no cumples en la cuantía y la habilitación.");
  });

  it("todas cumplen: aun así recuerda que decide el pliego", () => {
    const f = fraseVeredicto(vistas(["PASS", "PASS", "PASS", "PASS", "PASS"]), true);
    expect(f.titulo).toBe("Cumples en las 5 compuertas.");
    expect(f.bajada).toMatch(/quien decide si calificas es el pliego/);
  });

  it("ninguna cumple todavía", () => {
    const f = fraseVeredicto(vistas(["UNKNOWN", "UNKNOWN", "WARN", "UNKNOWN", "UNKNOWN"]), true);
    expect(f.titulo.startsWith("Ninguna compuerta confirma todavía que encaje")).toBe(true);
  });

  it("es determinista: los mismos estados dan la misma frase", () => {
    const a = fraseVeredicto(vistas(["PASS", "WARN", "PASS", "PASS", "UNKNOWN"]), true);
    const b = fraseVeredicto(vistas(["PASS", "WARN", "PASS", "PASS", "UNKNOWN"]), true);
    expect(a).toEqual(b);
  });
});

describe("siguientePaso — tabla §2e del spec", () => {
  const base = { conCuenta: true, conPliego: false };

  it("sin perfil → define tu perfil, sin cuenta (D1)", () => {
    const s = siguientePaso({
      ...base,
      conCuenta: false,
      relativo: false,
      compuertas: vistas(["DATO", "DATO", "DATO", "DATO", "UNKNOWN"]),
    });
    expect(s).toMatchObject({ paso: 0, cta: "Define tu perfil", destino: "definir-perfil" });
    expect(s.ayuda).toMatch(/sin crear cuenta/);
  });

  it("perfil sin cuenta y sin pliego → sube el pliego, avisando de la cuenta", () => {
    const s = siguientePaso({
      ...base,
      conCuenta: false,
      relativo: true,
      compuertas: vistas(["PASS", "PASS", "PASS", "PASS", "UNKNOWN"]),
    });
    expect(s).toMatchObject({ paso: 1, destino: "subir-pliego" });
    expect(s.ayuda).toMatch(/cuenta gratuita/);
  });

  it("cuenta con perfil, sin pliego → sube el pliego con la cuota", () => {
    const s = siguientePaso({
      ...base,
      relativo: true,
      compuertas: vistas(["PASS", "PASS", "PASS", "PASS", "UNKNOWN"]),
    });
    expect(s).toMatchObject({ paso: 1, cta: "Sube el pliego", destino: "subir-pliego" });
    expect(s.ayuda).toMatch(/Hasta 5 pliegos cada 24 horas/);
  });

  it("pliego leído y un dato que falta → completa ese dato", () => {
    const s = siguientePaso({
      ...base,
      conPliego: true,
      relativo: true,
      compuertas: vistas(["PASS", "PASS", "PASS", "PASS", "WARN"], ["índice de endeudamiento"]),
    });
    expect(s).toMatchObject({
      cta: "Completa tu índice de endeudamiento",
      destino: "completar-perfil",
      destinoSecundario: "requisitos-pliego",
    });
  });

  it("varios datos que faltan → los cuenta", () => {
    const s = siguientePaso({
      ...base,
      conPliego: true,
      relativo: true,
      compuertas: vistas(["PASS", "PASS", "PASS", "PASS", "WARN"], ["a", "b"]),
    });
    expect(s.cta).toBe("Completa 2 datos de tu perfil");
  });

  it("pliego leído y todo resuelto → preparar la oferta en SECOP II", () => {
    const s = siguientePaso({
      ...base,
      conPliego: true,
      relativo: true,
      compuertas: vistas(["PASS", "PASS", "PASS", "WARN", "PASS"]),
    });
    expect(s).toMatchObject({ paso: 2, destino: "ofertar-secop" });
  });

  it("alguna no cumple → ver por qué, antes que cualquier otra cosa", () => {
    const s = siguientePaso({
      ...base,
      relativo: true,
      compuertas: vistas(["PASS", "FAIL", "PASS", "PASS", "UNKNOWN"]),
    });
    expect(s).toMatchObject({
      cta: "Ver por qué",
      destino: "ver-porque",
      destinoSecundario: "explorar",
    });
  });
});

describe("compuertasDesdeVeredicto — faltanEnPerfil", () => {
  const g = (status: GateStatus, extra = {}) => ({
    status,
    reason: "r",
    resolvedBy: "document" as const,
    requiredLevel: 2 as const,
    ...extra,
  });

  it("lo pasa a la vista cuando la razón no está redactada", () => {
    const v = {
      procesoId: "p",
      overall: "WARN",
      level: 0,
      evaluatedAt: "",
      gates: {
        sectorial: g("PASS"),
        cuantia: g("PASS"),
        plazo: g("PASS"),
        ubicacion: g("PASS"),
        habilitacion: g("WARN", { faltanEnPerfil: ["índice de liquidez"] }),
      },
    } as never;
    expect(compuertasDesdeVeredicto(v)[4].faltanEnPerfil).toEqual(["índice de liquidez"]);
  });
});

describe("ventanaDeOfertas", () => {
  const pub = "2026-09-14T00:00:00Z";
  const rec = "2026-10-14T00:00:00Z";

  it("cuenta los días que quedan y la fracción transcurrida", () => {
    const v = ventanaDeOfertas(pub, rec, Date.parse("2026-09-28T00:00:00Z"));
    expect(v?.diasRestantes).toBe(16);
    expect(v?.transcurrido).toBeCloseTo(14 / 30, 5);
  });

  it("sin cualquiera de las dos fechas no hay ventana (criterio 7)", () => {
    expect(ventanaDeOfertas(null, rec, 0)).toBeNull();
    expect(ventanaDeOfertas(pub, null, 0)).toBeNull();
  });

  it("fechas imposibles no dan ventana", () => {
    expect(ventanaDeOfertas(rec, pub, 0)).toBeNull();
    expect(ventanaDeOfertas("no es fecha", rec, 0)).toBeNull();
  });

  it("vencido: días negativos y la barra llena", () => {
    const v = ventanaDeOfertas(pub, rec, Date.parse("2026-10-20T00:00:00Z"));
    expect(v?.diasRestantes).toBeLessThan(0);
    expect(v?.transcurrido).toBe(1);
  });
});

describe("textoDiasRestantes", () => {
  it.each([
    [16, "quedan 16 días"],
    [1, "queda 1 día"],
    [0, "cierra hoy"],
    [-3, "plazo vencido"],
  ])("%i → %s", (dias, texto) => {
    expect(textoDiasRestantes(dias)).toBe(texto);
  });
});

describe("explicacionModalidad", () => {
  it("reconoce las variantes del dataset sin importar tildes ni mayúsculas", () => {
    expect(explicacionModalidad("Licitación Pública Acuerdo Marco de Precios")).toMatch(
      /Convocatoria abierta/
    );
    expect(explicacionModalidad("Selección Abreviada de Menor Cuantía")).toMatch(/más corto/);
    expect(explicacionModalidad("Contratación régimen especial (con ofertas)")).toMatch(
      /propio manual/
    );
  });

  it("no inventa: una modalidad desconocida o ausente no tiene explicación", () => {
    expect(explicacionModalidad("Otra cosa")).toBeNull();
    expect(explicacionModalidad(null)).toBeNull();
  });
});

describe("fechaCortaDeDia", () => {
  it("una fecha de día no se corre al día anterior por el huso de Colombia", () => {
    expect(fechaCortaDeDia("2026-10-15")).toMatch(/^15 oct/);
    expect(fechaCortaDeDia("2026-10-15")).toContain("2026");
  });

  it("sin fecha o con basura, nada", () => {
    expect(fechaCortaDeDia(null)).toBeNull();
    expect(fechaCortaDeDia("no es fecha")).toBeNull();
  });
});
