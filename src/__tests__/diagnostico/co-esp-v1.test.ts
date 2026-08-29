import { describe, it, expect } from "vitest";
import { calcularDiagnostico, parseRespuestas } from "@/src/lib/diagnostico/calcular";
import { getCuestionario, versionesRegistradas } from "@/src/lib/diagnostico/registro";
import type { Cuestionario, RespuestasDiagnostico } from "@/src/lib/diagnostico/types";

const esp = getCuestionario("co-esp-v1") as Cuestionario;

const PERFECTAS: RespuestasDiagnostico = {
  registro: 0,
  unspsc: 0,
  exp: 0,
  fin: 0,
  flujo: 0,
  tec: 0,
  listas: 0,
  puerta: 0,
};
const resp = (o: Partial<RespuestasDiagnostico> = {}) => ({ ...PERFECTAS, ...o });

describe("invariantes de TODOS los cuestionarios registrados", () => {
  const versiones = versionesRegistradas();

  it("hay al menos dos variantes registradas", () => {
    expect(versiones).toEqual(expect.arrayContaining(["co-apsb-v1", "co-esp-v1"]));
  });

  it.each(versiones)("%s: coherente de punta a punta", (version) => {
    const c = getCuestionario(version)!;

    expect(c.version).toBe(version);
    expect(c.preguntas.length).toBeGreaterThan(0);

    const categorias = new Set(c.categorias.map((x) => x.id));
    const flagsPorPregunta = new Map<string, Set<string>>();

    for (const p of c.preguntas) {
      expect(categorias.has(p.categoria), `${p.key} apunta a una categoría inexistente`).toBe(true);
      expect(p.opciones.length).toBeGreaterThanOrEqual(2);
      for (const o of p.opciones) {
        expect(o.puntos).toBeGreaterThanOrEqual(0);
        if (!o.flag) continue;
        expect(c.remedios[o.flag], `${o.flag} no está en el catálogo`).toBeDefined();
        if (!flagsPorPregunta.has(o.flag)) flagsPorPregunta.set(o.flag, new Set());
        flagsPorPregunta.get(o.flag)!.add(p.key);
      }
    }

    // Un flag en dos preguntas produciría bloqueantes duplicados en el plan.
    for (const [flag, keys] of flagsPorPregunta) {
      expect(keys.size, `${flag} aparece en varias preguntas`).toBe(1);
    }

    // Sin remedios muertos: todo lo del catálogo lo dispara alguna opción.
    expect(new Set(flagsPorPregunta.keys()).size).toBe(Object.keys(c.remedios).length);

    // Si declara un bloqueante absoluto, debe traer el titular que lo anuncia.
    const tieneAbsoluto = Object.values(c.remedios).some((r) => r.absoluto);
    if (tieneAbsoluto) expect(c.veredictoBloqueado).toBeDefined();

    // La escalera y sus textos van juntos o no van.
    if (c.escalera) {
      expect(c.rutas).toBeDefined();
      for (const p of c.escalera) expect(c.rutas![p.escalon]).toBeDefined();
      expect(c.escalon).toBeDefined();
    } else {
      expect(c.escalon).toBeUndefined();
    }

    // La otra variante tiene que existir en el registro.
    if (c.otraVariante) expect(getCuestionario(c.otraVariante.version)).not.toBeNull();
  });
});

describe("co-esp-v1 — forma del cuestionario", () => {
  it("son 8 preguntas y el máximo es 80, normalizado a 100", () => {
    expect(esp.preguntas).toHaveLength(8);
    const maximo = esp.preguntas.reduce(
      (s, q) => s + Math.max(...q.opciones.map((o) => o.puntos)),
      0
    );
    expect(maximo).toBe(80);
    expect(calcularDiagnostico(PERFECTAS, esp).puntajeTotal).toBe(100);
  });

  it("no tiene escalera ni pregunta por el RUP", () => {
    const r = calcularDiagnostico(PERFECTAS, esp);
    expect(r.escalon).toBeNull();
    expect(r.estadoRup).toBeNull();
    expect(esp.escalera).toBeUndefined();
  });

  it("sigue advirtiendo de lo que NO cubre, que ya no incluye las listas", () => {
    // Las listas restrictivas pasaron a preguntarse; inhabilidades y
    // parafiscales siguen fuera, pendientes de revisión jurídica.
    expect(esp.advertencia).toContain("inhabilidades");
    expect(esp.advertencia).toContain("seguridad social");
  });

  it("las listas restrictivas son su único bloqueante absoluto", () => {
    const absolutos = Object.values(esp.remedios)
      .filter((r) => r.absoluto)
      .map((r) => r.id);
    expect(absolutos).toEqual(["listas_si"]);
    // Y por tanto ya necesita el titular que anuncia el bloqueo.
    expect(esp.veredictoBloqueado).toBeDefined();
  });

  it("un reporte en lista restrictiva no baja el puntaje, pero bloquea", () => {
    // Mismo criterio que en co-apsb-v1 (02-cuestionario §5.1): el puntaje es
    // honesto, lo que cambia es lo que se afirma sobre él.
    const r = calcularDiagnostico(resp({ listas: 2 }), esp);
    expect(r.puntajeTotal).toBe(88);
    expect(r.banda).toBe("listo");
    expect(r.bloqueoAbsoluto).toEqual(["listas_si"]);
  });

  it("los códigos UNSPSC se preguntan aunque no haya RUP de por medio", () => {
    // El registro del EAAB clasifica por ellos: estar inscrito bajo el código
    // equivocado equivale a no estar (05-hallazgos §5.2a).
    const r = calcularDiagnostico(resp({ unspsc: 1 }), esp);
    expect(r.bloqueantes).toEqual(["unspsc_esp"]);
    expect(r.puntajeAreas.registro).toBe(75);
  });
});

describe("co-esp-v1 — cálculo", () => {
  it("todo perfecto: 100 y banda listo", () => {
    const r = calcularDiagnostico(PERFECTAS, esp);
    expect(r.puntajeTotal).toBe(100);
    expect(r.banda).toBe("listo");
    expect(r.bloqueantes).toEqual([]);
    expect(r.version).toBe("co-esp-v1");
  });

  it("los duros van antes que los blandos, en orden de pregunta", () => {
    // registro_no (duro, P1) · exp_informal (blando, P2) · flujo_no (duro, P4)
    const r = calcularDiagnostico(resp({ registro: 2, exp: 3, flujo: 3 }), esp);
    expect(r.bloqueantes).toEqual(["registro_no", "flujo_no", "exp_informal"]);
  });

  it("la peor respuesta posible cae en la banda de partida", () => {
    const peores = Object.fromEntries(
      esp.preguntas.map((q) => [q.key, q.opciones.length - 1])
    ) as RespuestasDiagnostico;
    const r = calcularDiagnostico(peores, esp);
    // 0 + 1 + 0 + 0 + 1 + 1 + 0 + 3 = 6 de 80 → 8 %.
    expect(r.puntajeTotal).toBe(8);
    expect(r.banda).toBe("inicio");
  });

  it("cada área se calcula sobre su propio máximo", () => {
    // Capacidad financiera agrupa 2 preguntas (máx 20): 10 + 4 = 14 → 70 %.
    const r = calcularDiagnostico(resp({ flujo: 2 }), esp);
    expect(r.puntajeAreas.financiera).toBe(70);
    // Registro también agrupa 2 (inscripción + códigos UNSPSC).
    expect(r.puntajeAreas.registro).toBe(100);
    expect(r.puntajeAreas.juridica).toBe(100);
  });

  it("las claves de un cuestionario no valen en el otro", () => {
    expect(parseRespuestas(PERFECTAS, esp)).toEqual(PERFECTAS);
    expect(parseRespuestas(PERFECTAS)).toBeNull();
    expect(parseRespuestas({ rup: 0 }, esp)).toBeNull();
  });
});
