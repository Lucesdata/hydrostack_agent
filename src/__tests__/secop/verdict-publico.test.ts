import { describe, it, expect } from "vitest";
import { redactarVerdict, razonDe } from "@/src/lib/secop/verdict-publico";
import type { GateResult, GateStatus, Verdict } from "@/src/lib/secop/verdict";

/**
 * Centinelas: cadenas improbables y distinguibles entre sí. La prueba de fuga
 * busca estas cadenas en el JSON serializado, no el campo `reason` — el modo
 * de fallo real es que la explicación sobreviva en cualquier parte del objeto.
 */
const CENTINELA = {
  sectorial: "CENTINELA-SECTORIAL-9f2a",
  cuantia: "CENTINELA-CUANTIA-9f2b",
  plazo: "CENTINELA-PLAZO-9f2c",
  ubicacion: "CENTINELA-UBICACION-9f2d",
  habilitacion: "CENTINELA-HABILITACION-9f2e",
} as const;

function gate(status: GateStatus, reason: string): GateResult {
  return { status, reason, resolvedBy: "metadata", requiredLevel: 0 };
}

/** Veredicto con un estado por compuerta y su centinela como `reason`. */
function verdict(
  estados: Record<keyof Verdict["gates"], GateStatus>,
  overall: GateStatus
): Verdict {
  return {
    procesoId: "CO1.REQ.42",
    overall,
    gates: {
      sectorial: gate(estados.sectorial, CENTINELA.sectorial),
      cuantia: gate(estados.cuantia, CENTINELA.cuantia),
      plazo: gate(estados.plazo, CENTINELA.plazo),
      ubicacion: gate(estados.ubicacion, CENTINELA.ubicacion),
      habilitacion: gate(estados.habilitacion, CENTINELA.habilitacion),
    },
    level: 0,
    evaluatedAt: "2026-08-31T00:00:00.000Z",
  };
}

const TODAS_PASS = verdict(
  {
    sectorial: "PASS",
    cuantia: "PASS",
    plazo: "WARN",
    ubicacion: "PASS",
    habilitacion: "PASS",
  },
  "WARN"
);

describe("redactarVerdict — caso base sin excepciones", () => {
  it("ningún centinela sobrevive al JSON serializado", () => {
    const json = JSON.stringify(redactarVerdict(TODAS_PASS));
    for (const c of Object.values(CENTINELA)) {
      expect(json).not.toContain(c);
    }
  });

  it("conserva lo que no es explicación: semáforo, estados y metadatos", () => {
    const r = redactarVerdict(TODAS_PASS);
    expect(r.redactado).toBe(true);
    expect(r.procesoId).toBe("CO1.REQ.42");
    expect(r.overall).toBe("WARN");
    expect(r.level).toBe(0);
    expect(r.evaluatedAt).toBe("2026-08-31T00:00:00.000Z");
    expect(r.gates.cuantia.status).toBe("PASS");
    expect(r.gates.plazo.status).toBe("WARN");
    expect(r.gates.cuantia.requiredLevel).toBe(0);
    expect(r.gates.cuantia.resolvedBy).toBe("metadata");
  });

  it("marca cada compuerta como redactada", () => {
    const r = redactarVerdict(TODAS_PASS);
    for (const g of Object.values(r.gates)) expect(g.redactado).toBe(true);
  });
});

describe("redactarVerdict — excepción overall FAIL", () => {
  const conFail = verdict(
    {
      sectorial: "PASS",
      cuantia: "FAIL",
      plazo: "PASS",
      ubicacion: "FAIL",
      habilitacion: "PASS",
    },
    "FAIL"
  );

  it("las compuertas que fallaron conservan su explicación", () => {
    const json = JSON.stringify(redactarVerdict(conFail));
    expect(json).toContain(CENTINELA.cuantia);
    expect(json).toContain(CENTINELA.ubicacion);
  });

  it("las compuertas que no fallaron siguen redactadas", () => {
    const json = JSON.stringify(redactarVerdict(conFail));
    expect(json).not.toContain(CENTINELA.sectorial);
    expect(json).not.toContain(CENTINELA.plazo);
    expect(json).not.toContain(CENTINELA.habilitacion);
  });

  it("una compuerta FAIL sin overall FAIL no abre la excepción", () => {
    const soloUna = verdict(
      {
        sectorial: "PASS",
        cuantia: "FAIL",
        plazo: "PASS",
        ubicacion: "PASS",
        habilitacion: "PASS",
      },
      "WARN" // overall inconsistente a propósito: la excepción mira `overall`
    );
    expect(JSON.stringify(redactarVerdict(soloUna))).not.toContain(CENTINELA.cuantia);
  });
});

describe("redactarVerdict — excepción UNKNOWN", () => {
  const conUnknown = verdict(
    {
      sectorial: "PASS",
      cuantia: "PASS",
      plazo: "PASS",
      ubicacion: "PASS",
      habilitacion: "UNKNOWN",
    },
    "PASS"
  );

  it("una compuerta UNKNOWN conserva su explicación: no hay secreto que guardar", () => {
    expect(JSON.stringify(redactarVerdict(conUnknown))).toContain(CENTINELA.habilitacion);
  });

  it("sus vecinas siguen redactadas", () => {
    const json = JSON.stringify(redactarVerdict(conUnknown));
    expect(json).not.toContain(CENTINELA.sectorial);
    expect(json).not.toContain(CENTINELA.cuantia);
  });
});

describe("razonDe", () => {
  it("devuelve null para una compuerta redactada", () => {
    const r = redactarVerdict(TODAS_PASS);
    expect(razonDe(r.gates.sectorial)).toBeNull();
  });

  it("devuelve la explicación de una compuerta no redactada", () => {
    const r = redactarVerdict(
      verdict(
        {
          sectorial: "PASS",
          cuantia: "PASS",
          plazo: "PASS",
          ubicacion: "PASS",
          habilitacion: "UNKNOWN",
        },
        "PASS"
      )
    );
    expect(razonDe(r.gates.habilitacion)).toBe(CENTINELA.habilitacion);
  });

  it("devuelve la explicación de un GateResult completo, sin redactar", () => {
    expect(razonDe(gate("PASS", "explicación cruda"))).toBe("explicación cruda");
  });
});
