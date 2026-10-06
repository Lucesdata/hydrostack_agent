import { describe, it, expect } from "vitest";
import {
  ETAPA_POR_ESTADO,
  objetoLegible,
  vistaFichaCard,
  type ProcesoParaCard,
} from "@/src/lib/secop/ficha-card";

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

describe("la pastilla no contradice al plazo", () => {
  // CO1.REQ.11144872, en producción el 2026-10-04: ABIERTO encima de
  // «Recepción cerrada el 03 oct 2026».
  it("con la recepción vencida, un estado abierto pasa a CERRADO A OFERTAS", () => {
    const v = vistaFichaCard({ ...base, fechaRecepcion: "2026-09-20" }, HOY);
    expect(v.plazo).toBe("Recepción cerrada el 20 sept 2026");
    expect(v.etapa).toEqual({ clave: "cerrado", label: "CERRADO A OFERTAS" });
  });

  it("el último día sigue abierto", () => {
    expect(vistaFichaCard({ ...base, fechaRecepcion: "2026-09-21" }, HOY).etapa.label).toBe(
      "ABIERTO"
    );
  });

  it("sin fecha, manda estado_apertura", () => {
    expect(vistaFichaCard({ ...base, estadoApertura: "Cerrado" }, HOY).etapa.label).toBe(
      "CERRADO A OFERTAS"
    );
    expect(vistaFichaCard(base, HOY).etapa.label).toBe("ABIERTO");
  });

  it("no toca las demás etapas", () => {
    const v = vistaFichaCard(
      { ...base, estadoActual: "Evaluación", fechaRecepcion: "2026-09-01" },
      HOY
    );
    expect(v.etapa.label).toBe("EN EVALUACIÓN");
  });

  it("cuenta el día en Colombia: a las 9 p. m. del 21 aún es el 21", () => {
    // 2026-09-22T02:00Z es el 21 a las 9 p. m. en Bogotá.
    const noche = new Date("2026-09-22T02:00:00Z");
    const v = vistaFichaCard({ ...base, fechaRecepcion: "2026-09-21" }, noche);
    expect(v.plazo).toBe("Recepción hasta el 21 sept 2026 · último día");
    expect(v.etapa.label).toBe("ABIERTO");
  });
});

describe("el objeto, legible en la tarjeta", () => {
  it("quita los paréntesis de trámite, también los anidados", () => {
    expect(
      objetoLegible(
        "ALCANTARILLADO - SAN JERONIMO (Manifestación de interés (Menor Cuantía)) (Presentación de oferta)"
      )
    ).toBe("Alcantarillado - san jeronimo");
  });

  it("conserva los paréntesis que dicen algo de la obra", () => {
    expect(objetoLegible("Construcción de la planta de tratamiento (PTAR) fase II")).toBe(
      "Construcción de la planta de tratamiento (PTAR) fase II"
    );
  });

  it("pasa las MAYÚSCULAS a minúscula de oración, con siglas y lugares del proceso", () => {
    expect(
      objetoLegible("OPTIMIZACIÓN DE LA PTAP DEL MUNICIPIO DE COVARACHÍA, BOYACÁ", [
        "Covarachía",
        "Boyacá",
      ])
    ).toBe("Optimización de la PTAP del municipio de Covarachía, Boyacá");
  });

  it("deja tal cual un objeto ya escrito en minúscula de oración", () => {
    expect(objetoLegible("Definir los tramos intervenidos de espacio público")).toBe(
      "Definir los tramos intervenidos de espacio público"
    );
  });

  it("un objeto sin texto no se presenta como si describiera algo", () => {
    expect(objetoLegible("2026000088")).toBe("Objeto sin descripción publicada");
    expect(objetoLegible(null)).toBe("Objeto no publicado");
    expect(objetoLegible("   ")).toBe("Objeto no publicado");
  });

  it("si quitar trámite lo dejaría vacío, se queda el original", () => {
    expect(objetoLegible("(Presentación de oferta)")).toBe("(Presentación de oferta)");
  });

  it("la vista guarda el original para el title", () => {
    const v = vistaFichaCard({ ...base, objeto: "OBRA DE ACUEDUCTO EN CALI" }, HOY);
    expect(v.objeto).toBe("Obra de acueducto en Cali");
    expect(v.objetoOriginal).toBe("OBRA DE ACUEDUCTO EN CALI");
  });
});

describe("la columna «Cierre de ofertas» de la vitrina", () => {
  it("cuenta los días en grande y marca urgente a 3 o menos", () => {
    expect(vistaFichaCard({ ...base, fechaRecepcion: "2026-09-29" }, HOY).cierre).toEqual({
      valor: "En 8 días",
      detalle: "29 sept 2026",
      urgente: false,
      apagado: false,
    });
    expect(vistaFichaCard({ ...base, fechaRecepcion: "2026-09-24" }, HOY).cierre.urgente).toBe(
      true
    );
  });

  it("hoy y mañana se dicen con palabras", () => {
    expect(vistaFichaCard({ ...base, fechaRecepcion: "2026-09-21" }, HOY).cierre.valor).toBe("Hoy");
    expect(vistaFichaCard({ ...base, fechaRecepcion: "2026-09-22" }, HOY).cierre.valor).toBe(
      "Mañana"
    );
  });

  it("vencida dice cerrada, con la fecha", () => {
    expect(vistaFichaCard({ ...base, fechaRecepcion: "2026-09-01" }, HOY).cierre).toMatchObject({
      valor: "Cerrada",
      detalle: "el 01 sept 2026",
      apagado: true,
    });
  });

  it("sin fecha no inventa urgencia", () => {
    expect(vistaFichaCard(base, HOY).cierre).toEqual({
      valor: "Sin fecha",
      detalle: "no se publicó el cierre",
      urgente: false,
      apagado: true,
    });
  });
});

describe("«Nuevo»", () => {
  it("publicado hoy o ayer, en Colombia", () => {
    expect(vistaFichaCard({ ...base, fechaPublicacion: "2026-09-21" }, HOY).nuevo).toBe(true);
    expect(vistaFichaCard({ ...base, fechaPublicacion: "2026-09-20" }, HOY).nuevo).toBe(true);
    expect(vistaFichaCard({ ...base, fechaPublicacion: "2026-09-19" }, HOY).nuevo).toBe(false);
  });

  it("sin fecha de publicación, o con una futura corrupta, no es nuevo", () => {
    expect(vistaFichaCard(base, HOY).nuevo).toBe(false);
    expect(vistaFichaCard({ ...base, fechaPublicacion: "2027-01-01" }, HOY).nuevo).toBe(false);
  });
});

describe("con la etapa ya calculada (filtro de etapa de la vitrina)", () => {
  it("la pastilla dice la etapa y nunca ABIERTO; no invita a ofertar", () => {
    const v = vistaFichaCard(
      {
        ...base,
        estadoActual: "Abierto",
        estadoApertura: "Abierto",
        etapaCalculada: "En ejecución",
      },
      HOY
    );
    expect(v.etapa.label).toBe("EN EJECUCIÓN");
    expect(v.plazo).toBe("No recibe ofertas");
    expect(v.cierre).toMatchObject({ valor: "Cerrada", apagado: true });
  });
});
