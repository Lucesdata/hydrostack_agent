import { describe, it, expect } from "vitest";
import {
  calcularDiagnostico,
  parseRespuestas,
  bandaDePuntaje,
} from "@/src/lib/diagnostico/calcular";
import {
  getCuestionario,
  versionesRegistradas,
  CUESTIONARIO_VIGENTE,
} from "@/src/lib/diagnostico/registro";
import { mapDiagnosticoRow } from "@/src/lib/diagnostico/diagnostico-store";
import type { Cuestionario, RespuestasDiagnostico } from "@/src/lib/diagnostico/types";

/**
 * Cuestionario de prueba que ejercita lo que `co-apsb-v1` no puede: 4
 * preguntas en vez de 10 (máximo 40, no 100) y SIN escalera ni pregunta de
 * RUP — la forma que tendrá la variante de la Ley 142.
 */
const SIN_ESCALERA: Cuestionario = {
  version: "test-sin-escalera",
  etiqueta: "Cuestionario de prueba",
  categorias: [
    { id: "a", label: "Área A" },
    { id: "b", label: "Área B" },
  ],
  preguntas: [
    {
      key: "p1",
      categoria: "a",
      texto: "?",
      ayuda: "",
      opciones: [
        { texto: "bien", puntos: 10 },
        { texto: "mal", puntos: 0, flag: "duro" },
      ],
    },
    {
      key: "p2",
      categoria: "a",
      texto: "?",
      ayuda: "",
      opciones: [
        { texto: "bien", puntos: 10 },
        { texto: "regular", puntos: 5, flag: "blando" },
      ],
    },
    {
      key: "p3",
      categoria: "b",
      texto: "?",
      ayuda: "",
      opciones: [
        { texto: "bien", puntos: 10 },
        { texto: "mal", puntos: 0, flag: "absoluto" },
      ],
    },
    {
      key: "p4",
      categoria: "b",
      texto: "?",
      ayuda: "",
      opciones: [
        { texto: "bien", puntos: 10 },
        { texto: "mal", puntos: 2 },
      ],
    },
  ],
  remedios: {
    duro: { id: "duro", severidad: "hard", absoluto: false, titulo: "D", detalle: "", chips: [] },
    absoluto: {
      id: "absoluto",
      severidad: "hard",
      absoluto: true,
      titulo: "A",
      detalle: "",
      chips: [],
    },
    blando: {
      id: "blando",
      severidad: "soft",
      absoluto: false,
      titulo: "B",
      detalle: "",
      chips: [],
    },
  },
  veredictos: CUESTIONARIO_VIGENTE.veredictos,
  portada: CUESTIONARIO_VIGENTE.portada,
  facts: [],
  veredictoBloqueado: CUESTIONARIO_VIGENTE.veredictoBloqueado,
  planSinPendientes: CUESTIONARIO_VIGENTE.planSinPendientes,
  mitos: [],
  disclaimer: "",
  // sin `escalon`, sin `estadoRup`, sin `escalera`, sin `rutas`
};

const todo = (i: number): RespuestasDiagnostico => ({ p1: i, p2: i, p3: i, p4: i });

describe("registro de cuestionarios", () => {
  it("resuelve el vigente por su versión", () => {
    expect(getCuestionario(CUESTIONARIO_VIGENTE.version)).toBe(CUESTIONARIO_VIGENTE);
    expect(versionesRegistradas()).toContain("co-apsb-v1");
  });

  it("devuelve null ante una versión que no conoce, en vez de caer al vigente", () => {
    // Caer al vigente pintaría textos que esa persona nunca vio.
    expect(getCuestionario("co-esp-v9")).toBeNull();
  });
});

describe("puntaje normalizado — la escala no depende del número de preguntas", () => {
  it("un cuestionario de 4 preguntas perfectas da 100, no 40", () => {
    const r = calcularDiagnostico(todo(0), SIN_ESCALERA);
    expect(r.puntajeTotal).toBe(100);
    expect(r.banda).toBe("listo");
  });

  it("las áreas se calculan sobre su propio máximo", () => {
    // p1 mal (0 de 10) y p2 regular (5 de 10) → área A = 25 %.
    const r = calcularDiagnostico({ p1: 1, p2: 1, p3: 0, p4: 0 }, SIN_ESCALERA);
    expect(r.puntajeAreas.a).toBe(25);
    expect(r.puntajeAreas.b).toBe(100);
    // Total: 0 + 5 + 10 + 10 = 25 de 40 → 63 %.
    expect(r.puntajeTotal).toBe(63);
    expect(r.banda).toBe(bandaDePuntaje(63));
  });

  it("co-apsb-v1 no cambia: su máximo ya era 100", () => {
    const perfectas: RespuestasDiagnostico = {
      rup: 0,
      unspsc: 0,
      exp: 0,
      fin: 0,
      secop: 0,
      poliza: 0,
      tec: 0,
      pila: 0,
      antec: 0,
      union: 0,
    };
    expect(calcularDiagnostico(perfectas).puntajeTotal).toBe(100);
  });
});

describe("cuestionario sin escalera ni RUP", () => {
  it("devuelve escalon y estadoRup en null en vez de inventarlos", () => {
    const r = calcularDiagnostico(todo(0), SIN_ESCALERA);
    expect(r.escalon).toBeNull();
    expect(r.estadoRup).toBeNull();
    expect(r.version).toBe("test-sin-escalera");
  });

  it("los bloqueantes y el bloqueo absoluto siguen funcionando", () => {
    const r = calcularDiagnostico({ p1: 1, p2: 1, p3: 1, p4: 0 }, SIN_ESCALERA);
    // hard antes que soft, cada grupo en orden de pregunta.
    expect(r.bloqueantes).toEqual(["duro", "absoluto", "blando"]);
    expect(r.bloqueoAbsoluto).toEqual(["absoluto"]);
  });

  it("parseRespuestas valida contra el cuestionario que se le pasa", () => {
    expect(parseRespuestas({ p1: 0, p2: 0, p3: 0, p4: 0 }, SIN_ESCALERA)).toEqual(todo(0));
    // Las claves de co-apsb-v1 no sirven aquí, ni al revés.
    expect(parseRespuestas({ rup: 0 }, SIN_ESCALERA)).toBeNull();
    expect(parseRespuestas({ p1: 0, p2: 0, p3: 0, p4: 9 }, SIN_ESCALERA)).toBeNull();
    expect(parseRespuestas(todo(0))).toBeNull();
  });
});

describe("mapDiagnosticoRow con escalón nulo", () => {
  it("una fila sin escalón se lee sin inventarlo", () => {
    const d = mapDiagnosticoRow({
      id: "d1",
      usuarioId: "u1",
      version: "test-sin-escalera",
      respuestas: todo(0),
      puntajeTotal: 100,
      puntajeAreas: { a: 100, b: 100 },
      escalon: null,
      bloqueantes: [],
      creadoEn: new Date(),
    });
    expect(d.escalon).toBeNull();
    // Versión no registrada: degrada en vez de derivar con otro catálogo.
    expect(d.bloqueoAbsoluto).toEqual([]);
    expect(d.estadoRup).toBe("desconocido");
  });
});
