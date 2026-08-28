import { describe, it, expect } from "vitest";
import {
  calcularDiagnostico,
  bandaDePuntaje,
  estadoArea,
  parseRespuestas,
} from "@/src/lib/diagnostico/calcular";
import {
  PREGUNTAS,
  REMEDIOS,
  CATEGORIAS,
  VERSION_CUESTIONARIO,
} from "@/src/lib/diagnostico/cuestionario/co-apsb-v1";
import type { RespuestasDiagnostico, PreguntaKey } from "@/src/lib/diagnostico/types";

/**
 * Respuestas perfectas: la opción 0 de cada pregunta vale 10 → total 100.
 * `resp({ exp: 4 })` degrada solo esa pregunta.
 */
const PERFECTAS: RespuestasDiagnostico = {
  rup: 0, unspsc: 0, exp: 0, fin: 0, secop: 0,
  poliza: 0, tec: 0, pila: 0, antec: 0, union: 0,
};
const resp = (overrides: Partial<RespuestasDiagnostico> = {}): RespuestasDiagnostico => ({
  ...PERFECTAS,
  ...overrides,
});
/** Última opción de cada pregunta — el peor escenario posible. */
const PEORES = Object.fromEntries(
  PREGUNTAS.map((q) => [q.key, q.opciones.length - 1])
) as RespuestasDiagnostico;

describe("integridad del contenido co-apsb-v1", () => {
  it("son 10 preguntas y suman exactamente 100 puntos", () => {
    expect(PREGUNTAS).toHaveLength(10);
    const maximo = PREGUNTAS.reduce(
      (s, q) => s + Math.max(...q.opciones.map((o) => o.puntos)),
      0
    );
    expect(maximo).toBe(100);
  });

  it("cada pregunta vale como máximo 10 y tiene al menos dos opciones", () => {
    for (const q of PREGUNTAS) {
      expect(q.opciones.length).toBeGreaterThanOrEqual(2);
      for (const o of q.opciones) {
        expect(o.puntos).toBeGreaterThanOrEqual(0);
        expect(o.puntos).toBeLessThanOrEqual(10);
      }
    }
  });

  it("todo flag apunta a un remedio existente y no hay remedios muertos", () => {
    const usados = new Set(
      PREGUNTAS.flatMap((q) => q.opciones.map((o) => o.flag).filter(Boolean))
    );
    for (const id of usados) expect(REMEDIOS[id!]).toBeDefined();
    expect(usados.size).toBe(Object.keys(REMEDIOS).length);
    expect(usados.size).toBe(16);
  });

  it("ningún id de flag se repite entre preguntas distintas", () => {
    // Garantiza que la lista de bloqueantes nunca traiga duplicados.
    const porFlag = new Map<string, Set<PreguntaKey>>();
    for (const q of PREGUNTAS) {
      for (const o of q.opciones) {
        if (!o.flag) continue;
        if (!porFlag.has(o.flag)) porFlag.set(o.flag, new Set());
        porFlag.get(o.flag)!.add(q.key);
      }
    }
    for (const [flag, keys] of porFlag) {
      expect(keys.size, `${flag} aparece en varias preguntas`).toBe(1);
    }
  });

  it("solo antec_mal y pila_mora son bloqueantes absolutos", () => {
    const absolutos = Object.values(REMEDIOS)
      .filter((r) => r.absoluto)
      .map((r) => r.id)
      .sort();
    expect(absolutos).toEqual(["antec_mal", "pila_mora"]);
    // Y todo absoluto es hard.
    for (const r of Object.values(REMEDIOS)) {
      if (r.absoluto) expect(r.severidad).toBe("hard");
    }
  });

  it("toda pregunta pertenece a una categoría declarada", () => {
    const ids = new Set(CATEGORIAS.map((c) => c.id));
    for (const q of PREGUNTAS) expect(ids.has(q.categoria)).toBe(true);
  });
});

describe("bandaDePuntaje — los cuatro umbrales", () => {
  it("clasifica en los límites exactos", () => {
    expect(bandaDePuntaje(100)).toBe("listo");
    expect(bandaDePuntaje(78)).toBe("listo");
    expect(bandaDePuntaje(77)).toBe("casi");
    expect(bandaDePuntaje(58)).toBe("casi");
    expect(bandaDePuntaje(57)).toBe("en_camino");
    expect(bandaDePuntaje(35)).toBe("en_camino");
    expect(bandaDePuntaje(34)).toBe("inicio");
    expect(bandaDePuntaje(0)).toBe("inicio");
  });
});

describe("calcularDiagnostico — las cuatro bandas de veredicto", () => {
  it("todo perfecto → 100 puntos, banda listo", () => {
    const r = calcularDiagnostico(PERFECTAS);
    expect(r.puntajeTotal).toBe(100);
    expect(r.banda).toBe("listo");
    expect(r.bloqueantes).toEqual([]);
    expect(r.version).toBe(VERSION_CUESTIONARIO);
  });

  it("banda casi", () => {
    // -10 exp, -10 fin, -8 poliza, -8 tec = 64
    const r = calcularDiagnostico(resp({ exp: 4, fin: 3, poliza: 2, tec: 2 }));
    expect(r.puntajeTotal).toBe(64);
    expect(r.banda).toBe("casi");
  });

  it("banda en_camino", () => {
    // 64 anterior, además -9 unspsc y -9 secop = 46
    const r = calcularDiagnostico(
      resp({ exp: 4, fin: 3, poliza: 2, tec: 2, unspsc: 2, secop: 2 })
    );
    expect(r.puntajeTotal).toBe(46);
    expect(r.banda).toBe("en_camino");
  });

  it("todo en la peor opción → banda inicio", () => {
    const r = calcularDiagnostico(PEORES);
    expect(r.puntajeTotal).toBe(17);
    expect(r.banda).toBe("inicio");
  });
});

describe("calcularDiagnostico — los tres escalones", () => {
  it("licitación pública: RUP vigente, experiencia acreditable y ≥70", () => {
    expect(calcularDiagnostico(PERFECTAS).escalon).toBe("licitacion_publica");
    // Experiencia con privadas o E.S.P. (8 pts) también habilita.
    expect(calcularDiagnostico(resp({ exp: 1 })).escalon).toBe("licitacion_publica");
  });

  it("menor cuantía: RUP vigente y ≥55, pero sin experiencia acreditable", () => {
    // "Uno o dos, pequeños" = 5 pts → no supera el corte de experiencia.
    const r = calcularDiagnostico(resp({ exp: 2 }));
    expect(r.puntajeTotal).toBe(95);
    expect(r.escalon).toBe("menor_cuantia");
  });

  it("menor cuantía: con experiencia pero por debajo de 70", () => {
    // -10 fin, -9 unspsc, -9 secop, -8 poliza, -8 tec = 56
    const r = calcularDiagnostico(resp({ fin: 3, unspsc: 2, secop: 2, poliza: 2, tec: 2 }));
    expect(r.puntajeTotal).toBe(56);
    expect(r.escalon).toBe("menor_cuantia");
  });

  it("mínima cuantía: sin RUP vigente, por alto que sea el puntaje", () => {
    // 94 puntos y aun así mínima cuantía — la escalera se autocorrige sola.
    const r = calcularDiagnostico(resp({ rup: 1 }));
    expect(r.puntajeTotal).toBe(94);
    expect(r.banda).toBe("listo");
    expect(r.escalon).toBe("minima_cuantia");
  });

  it("mínima cuantía: puntaje bajo", () => {
    expect(calcularDiagnostico(PEORES).escalon).toBe("minima_cuantia");
  });
});

describe("calcularDiagnostico — orden del plan de acción", () => {
  it("los hard van antes que los soft, cada grupo en orden de pregunta", () => {
    // unspsc (soft, P2) · fin_no (hard, P4) · poliza (soft, P6) · antec_mal (hard, P9)
    const r = calcularDiagnostico(resp({ unspsc: 2, fin: 3, poliza: 2, antec: 2 }));
    expect(r.bloqueantes).toEqual(["fin_no", "antec_mal", "unspsc", "poliza"]);
  });

  it("sin flags disparados la lista queda vacía", () => {
    expect(calcularDiagnostico(PERFECTAS).bloqueantes).toEqual([]);
  });

  it("la peor respuesta posible dispara un bloqueante por pregunta", () => {
    const r = calcularDiagnostico(PEORES);
    expect(r.bloqueantes).toEqual([
      "rup_no", "fin_no", "secop_no", "antec_mal",
      "unspsc", "exp_cero", "poliza", "tec", "pila_sin", "solo",
    ]);
    expect(new Set(r.bloqueantes).size).toBe(r.bloqueantes.length);
  });
});

describe("calcularDiagnostico — bloqueo absoluto (02-cuestionario §5.1)", () => {
  it("un reporte activo no baja el puntaje ni la banda, pero marca el bloqueo", () => {
    // Nueve respuestas perfectas + inhabilidad: el prototipo decía
    // "puedes presentarte esta misma semana" y se contradecía con el plan.
    const r = calcularDiagnostico(resp({ antec: 2 }));
    expect(r.puntajeTotal).toBe(90);
    expect(r.banda).toBe("listo");
    expect(r.bloqueoAbsoluto).toEqual(["antec_mal"]);
  });

  it("la mora en parafiscales también bloquea en cualquier escalón", () => {
    const r = calcularDiagnostico(resp({ pila: 1 }));
    expect(r.puntajeTotal).toBe(92);
    expect(r.bloqueoAbsoluto).toEqual(["pila_mora"]);
  });

  it("los hard relativos al escalón NO bloquean", () => {
    // Sin RUP, sin financieros, sin usuario de SECOP: los tres son hard,
    // ninguno es absoluto — la escalera ya los resuelve bajando el escalón.
    for (const caso of [{ rup: 2 }, { rup: 1 }, { fin: 3 }, { secop: 2 }]) {
      const r = calcularDiagnostico(resp(caso));
      expect(r.bloqueoAbsoluto, JSON.stringify(caso)).toEqual([]);
      expect(r.bloqueantes.length).toBeGreaterThan(0);
    }
  });

  it("bloqueoAbsoluto es siempre un subconjunto de bloqueantes", () => {
    const r = calcularDiagnostico(resp({ antec: 2, pila: 1, unspsc: 2 }));
    expect(r.bloqueoAbsoluto).toEqual(["pila_mora", "antec_mal"]);
    for (const id of r.bloqueoAbsoluto) expect(r.bloqueantes).toContain(id);
  });
});

describe("calcularDiagnostico — puntaje por área y estado del RUP", () => {
  it("todo perfecto deja las seis áreas en 100", () => {
    const r = calcularDiagnostico(PERFECTAS);
    for (const c of CATEGORIAS) expect(r.puntajeAreas[c.id]).toBe(100);
  });

  it("cada área se calcula sobre su propio máximo", () => {
    // Jurídica agrupa 4 preguntas (máx 40): 4+10+10+10 = 34 → 85 %.
    const r = calcularDiagnostico(resp({ rup: 1 }));
    expect(r.puntajeAreas.juridica).toBe(85);
    expect(r.puntajeAreas.financiera).toBe(100);
    // Financiera agrupa 2 preguntas (máx 20): 10+2 = 12 → 60 %.
    expect(calcularDiagnostico(resp({ poliza: 2 })).puntajeAreas.financiera).toBe(60);
  });

  it("estadoArea usa su propia escala, distinta a la de las bandas", () => {
    expect(estadoArea(100)).toBe("listo");
    expect(estadoArea(75)).toBe("listo");
    expect(estadoArea(74)).toBe("parcial");
    expect(estadoArea(45)).toBe("parcial");
    expect(estadoArea(44)).toBe("pendiente");
  });

  it("deriva el estado del RUP de la primera pregunta", () => {
    expect(calcularDiagnostico(resp({ rup: 0 })).estadoRup).toBe("vigente");
    expect(calcularDiagnostico(resp({ rup: 1 })).estadoRup).toBe("sin_renovar");
    expect(calcularDiagnostico(resp({ rup: 2 })).estadoRup).toBe("no_inscrito");
    expect(calcularDiagnostico(resp({ rup: 3 })).estadoRup).toBe("desconocido");
  });
});

describe("calcularDiagnostico — determinismo", () => {
  it("las mismas respuestas producen siempre el mismo resultado", () => {
    const entrada = resp({ exp: 3, fin: 2, antec: 1, union: 2 });
    expect(calcularDiagnostico(entrada)).toEqual(calcularDiagnostico(entrada));
  });

  it("el orden de las claves del objeto no cambia el resultado", () => {
    const a: RespuestasDiagnostico = {
      rup: 1, unspsc: 2, exp: 3, fin: 1, secop: 1,
      poliza: 2, tec: 1, pila: 2, antec: 1, union: 2,
    };
    const b: RespuestasDiagnostico = {
      union: 2, antec: 1, pila: 2, tec: 1, poliza: 2,
      secop: 1, fin: 1, exp: 3, unspsc: 2, rup: 1,
    };
    expect(calcularDiagnostico(a)).toEqual(calcularDiagnostico(b));
  });
});

describe("parseRespuestas — guard de frontera", () => {
  it("acepta un cuestionario completo y válido", () => {
    expect(parseRespuestas({ ...PERFECTAS })).toEqual(PERFECTAS);
  });

  it("rechaza respuestas incompletas, índices fuera de rango y basura", () => {
    const { rup, ...incompleto } = PERFECTAS;
    expect(parseRespuestas(incompleto)).toBeNull();
    expect(parseRespuestas(resp({ rup: 9 }))).toBeNull();
    expect(parseRespuestas(resp({ rup: -1 }))).toBeNull();
    expect(parseRespuestas({ ...PERFECTAS, rup: 1.5 })).toBeNull();
    expect(parseRespuestas({ ...PERFECTAS, rup: "0" })).toBeNull();
    expect(parseRespuestas(null)).toBeNull();
    expect(parseRespuestas([])).toBeNull();
    expect(parseRespuestas("nope")).toBeNull();
  });

  it("ignora claves que no son preguntas del cuestionario", () => {
    expect(parseRespuestas({ ...PERFECTAS, sobra: 3 })).toEqual(PERFECTAS);
  });

  it("calcularDiagnostico falla ruidosamente ante un índice inválido", () => {
    expect(() => calcularDiagnostico(resp({ rup: 99 }))).toThrow(/rup/);
  });
});
