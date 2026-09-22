import { describe, it, expect } from "vitest";
import { ETAPA_POR_ESTADO, vistaFichaCard, type ProcesoParaCard } from "@/src/lib/secop/ficha-card";

const HOY = new Date("2026-09-21T12:00:00Z");

const base: ProcesoParaCard = {
  secopProcesoId: "CO1.REQ.1234567",
  objeto: "Optimización de la red de alcantarillado del sector nororiental",
  entidadNombre: "Empresas Municipales de Cali — EMCALI",
  departamento: "Valle del Cauca",
  municipio: "Cali",
  valorEstimado: "2340000000",
  estadoActual: "Publicado",
  estadoApertura: "Abierto",
  fechaRecepcion: null,
  adjudicatario: null,
  valorAdjudicacion: null,
  fechaAdjudicacion: null,
};

describe("la etapa sale de los estados que la fuente publica de verdad", () => {
  it("mapea los nueve valores reales de estado_actual", () => {
    expect(ETAPA_POR_ESTADO["Publicado"].label).toBe("ABIERTO");
    expect(ETAPA_POR_ESTADO["Abierto"].label).toBe("ABIERTO");
    expect(ETAPA_POR_ESTADO["Evaluación"].label).toBe("EN EVALUACIÓN");
    expect(ETAPA_POR_ESTADO["En aprobación"].label).toBe("EN EVALUACIÓN");
    expect(ETAPA_POR_ESTADO["Aprobado"].label).toBe("EN EVALUACIÓN");
    expect(ETAPA_POR_ESTADO["Seleccionado"].label).toBe("ADJUDICADO");
    expect(ETAPA_POR_ESTADO["Cancelado"].label).toBe("CANCELADO");
    expect(ETAPA_POR_ESTADO["Suspendido"].label).toBe("SUSPENDIDO");
    expect(ETAPA_POR_ESTADO["Borrador"].label).toBe("BORRADOR");
  });

  it("no inventa DESIERTO: ese estado no existe en la fuente", () => {
    expect(Object.values(ETAPA_POR_ESTADO).map((e) => e.label)).not.toContain("DESIERTO");
  });

  it("un estado desconocido o nulo cae en SIN ESTADO, no en blanco", () => {
    expect(vistaFichaCard({ ...base, estadoActual: null }, HOY).etapa.label).toBe("SIN ESTADO");
    expect(vistaFichaCard({ ...base, estadoActual: "Vaya usted a saber" }, HOY).etapa.label).toBe(
      "SIN ESTADO"
    );
  });
});

describe("el plazo dice lo que hay, no lo que se deduce", () => {
  it("sin fecha de recepción y abierto, enuncia la ventana binaria", () => {
    expect(vistaFichaCard(base, HOY).plazo).toBe("Abierto a ofertas");
  });

  it("sin fecha de recepción y cerrado, lo dice", () => {
    expect(vistaFichaCard({ ...base, estadoApertura: "Cerrado" }, HOY).plazo).toBe(
      "Cerrado a ofertas"
    );
  });

  it("con fecha futura añade la cuenta atrás", () => {
    const v = vistaFichaCard({ ...base, fechaRecepcion: "2026-09-29" }, HOY);
    expect(v.plazo).toBe("Recepción hasta el 29 sept 2026 · faltan 8 días");
  });

  it("con fecha de hoy no dice «faltan 0 días»", () => {
    const v = vistaFichaCard({ ...base, fechaRecepcion: "2026-09-21" }, HOY);
    expect(v.plazo).toBe("Recepción hasta el 21 sept 2026 · último día");
  });

  it("con fecha pasada no cuenta hacia atrás", () => {
    const v = vistaFichaCard({ ...base, fechaRecepcion: "2026-09-01" }, HOY);
    expect(v.plazo).toBe("Recepción cerrada el 01 sept 2026");
  });
});

describe("los campos ausentes tienen texto, nunca hueco", () => {
  it("entidad sin resolver", () => {
    expect(vistaFichaCard({ ...base, entidadNombre: null }, HOY).entidad).toBe(
      "Entidad no informada"
    );
  });

  it("objeto sin publicar", () => {
    expect(vistaFichaCard({ ...base, objeto: null }, HOY).objeto).toBe("Objeto no publicado");
  });

  it("cuantía sin publicar, y el cero no es una cuantía", () => {
    expect(vistaFichaCard({ ...base, valorEstimado: null }, HOY).cuantia).toBe(
      "Cuantía no publicada"
    );
    expect(vistaFichaCard({ ...base, valorEstimado: "0" }, HOY).cuantia).toBe(
      "Cuantía no publicada"
    );
  });

  it("ubicación: municipio y departamento, solo departamento, o nada", () => {
    expect(vistaFichaCard(base, HOY).ubicacion).toBe("Cali, Valle del Cauca");
    expect(vistaFichaCard({ ...base, municipio: null }, HOY).ubicacion).toBe("Valle del Cauca");
    expect(vistaFichaCard({ ...base, municipio: null, departamento: null }, HOY).ubicacion).toBe(
      "Ubicación no informada"
    );
  });
});

describe("la adjudicación sustituye al plazo cuando existe", () => {
  it("con proveedor y valor, rotulado con «por» para no leer la cifra como un dato aparte", () => {
    const v = vistaFichaCard(
      {
        ...base,
        fechaAdjudicacion: "2026-09-17",
        adjudicatario: "Constructora del Pacífico S.A.S.",
        valorAdjudicacion: "1980000000",
      },
      HOY
    );
    expect(v.adjudicacion).toBe("Adjudicado a Constructora del Pacífico S.A.S. por $1.980 M");
  });

  it("adjudicado sin proveedor publicado: sin «por», no hay a quién atribuírselo", () => {
    const v = vistaFichaCard(
      { ...base, fechaAdjudicacion: "2026-09-17", valorAdjudicacion: "1980000000" },
      HOY
    );
    expect(v.adjudicacion).toBe("Adjudicatario no publicado · $1.980 M");
  });

  it("sin adjudicación es null, y entonces manda el plazo", () => {
    expect(vistaFichaCard(base, HOY).adjudicacion).toBeNull();
  });
});

describe("con adjudicación, la etapa es ADJUDICADO mande lo que mande estado_actual", () => {
  // Medido en la base el 2026-09-21: de los 191 procesos adjudicados en los
  // últimos 30 días, 4 llevan estado_actual «Abierto» y 1 «Evaluación» — la
  // tarjeta no puede decir «Adjudicado a X» bajo una pastilla que dice ABIERTO.
  it("estado_actual «Abierto» con fecha de adjudicación pasa a ADJUDICADO", () => {
    const v = vistaFichaCard(
      { ...base, estadoActual: "Abierto", fechaAdjudicacion: "2026-09-17" },
      HOY
    );
    expect(v.etapa.label).toBe("ADJUDICADO");
  });

  it("estado_actual «Evaluación» con fecha de adjudicación pasa a ADJUDICADO", () => {
    const v = vistaFichaCard(
      { ...base, estadoActual: "Evaluación", fechaAdjudicacion: "2026-09-17" },
      HOY
    );
    expect(v.etapa.label).toBe("ADJUDICADO");
  });

  it("sin fecha de adjudicación, la etapa sigue el estado_actual normal", () => {
    expect(vistaFichaCard({ ...base, estadoActual: "Abierto" }, HOY).etapa.label).toBe("ABIERTO");
  });
});

describe("una fecha inválida no revienta el plazo", () => {
  it("un ISO corrupto en fecha_recepcion cae al texto binario, no a «Invalid Date» ni «NaN días»", () => {
    const v = vistaFichaCard({ ...base, fechaRecepcion: "no-es-una-fecha" }, HOY);
    expect(v.plazo).toBe("Abierto a ofertas");
    expect(v.plazo).not.toMatch(/Invalid Date|NaN/);
  });

  it("igual si el proceso está cerrado", () => {
    const v = vistaFichaCard(
      { ...base, estadoApertura: "Cerrado", fechaRecepcion: "no-es-una-fecha" },
      HOY
    );
    expect(v.plazo).toBe("Cerrado a ofertas");
  });
});

describe("el id", () => {
  it("se muestra tal cual, porque es la clave y nunca falta", () => {
    expect(vistaFichaCard(base, HOY).id).toBe("CO1.REQ.1234567");
  });
});
