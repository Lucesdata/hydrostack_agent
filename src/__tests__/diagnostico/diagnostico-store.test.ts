import { describe, it, expect, vi, beforeEach } from "vitest";

// La DB hace IO real (Postgres). Se mockea para probar SOLO el store: qué se
// inserta, cómo se mapea la fila y la idempotencia del reclamo. Mismo patrón
// que src/__tests__/oferente/perfil-store.test.ts.
const insertValuesMock = vi.fn();
const insertReturningMock = vi.fn();
const selectLimitMock = vi.fn();
const updateWhereMock = vi.fn();
const updateReturningMock = vi.fn();

vi.mock("@/src/lib/db/client", () => ({
  db: {
    insert: () => ({
      values: (...args: unknown[]) => {
        insertValuesMock(...args);
        return { returning: insertReturningMock };
      },
    }),
    select: () => ({
      from: () => ({
        where: () => ({ orderBy: () => ({ limit: selectLimitMock }) }),
      }),
    }),
    update: () => ({
      set: (...args: unknown[]) => {
        updateWhereMock(...args);
        return { where: () => ({ returning: updateReturningMock }) };
      },
    }),
  },
}));

import {
  guardarDiagnostico,
  getDiagnosticoVigente,
  getDiagnosticoPorSessionToken,
  reclamarDiagnosticos,
  mapDiagnosticoRow,
} from "@/src/lib/diagnostico/diagnostico-store";
import { calcularDiagnostico } from "@/src/lib/diagnostico/calcular";
import type { RespuestasDiagnostico } from "@/src/lib/diagnostico/types";

const RESPUESTAS: RespuestasDiagnostico = {
  rup: 0, unspsc: 0, exp: 0, fin: 0, secop: 0,
  poliza: 0, tec: 0, pila: 1, antec: 2, union: 0,
};
const RESULTADO = calcularDiagnostico(RESPUESTAS);

const fila = (over: Record<string, unknown> = {}) => ({
  id: "d1",
  usuarioId: null,
  version: "co-apsb-v1",
  respuestas: RESPUESTAS,
  puntajeTotal: RESULTADO.puntajeTotal,
  puntajeAreas: RESULTADO.puntajeAreas,
  escalon: RESULTADO.escalon,
  bloqueantes: RESULTADO.bloqueantes,
  creadoEn: new Date("2026-08-27T10:00:00Z"),
  ...over,
});

beforeEach(() => vi.clearAllMocks());

describe("guardarDiagnostico", () => {
  it("inserta el resultado y devuelve el id", async () => {
    insertReturningMock.mockResolvedValue([{ id: "d1" }]);
    const r = await guardarDiagnostico({
      usuarioId: null,
      sessionToken: "tok",
      respuestas: RESPUESTAS,
      resultado: RESULTADO,
    });

    expect(r).toEqual({ ok: true, id: "d1" });
    const valores = insertValuesMock.mock.calls[0][0] as Record<string, unknown>;
    expect(valores.sessionToken).toBe("tok");
    expect(valores.usuarioId).toBeNull();
    expect(valores.version).toBe("co-apsb-v1");
    expect(valores.puntajeTotal).toBe(RESULTADO.puntajeTotal);
    expect(valores.bloqueantes).toEqual(RESULTADO.bloqueantes);
  });

  it("un diagnóstico que nace con cuenta ya queda reclamado", async () => {
    insertReturningMock.mockResolvedValue([{ id: "d2" }]);
    await guardarDiagnostico({
      usuarioId: "u1",
      sessionToken: null,
      respuestas: RESPUESTAS,
      resultado: RESULTADO,
    });

    const valores = insertValuesMock.mock.calls[0][0] as Record<string, unknown>;
    expect(valores.usuarioId).toBe("u1");
    expect(valores.reclamadoEn).toBeInstanceOf(Date);
  });

  it("el anónimo se guarda sin reclamar", async () => {
    insertReturningMock.mockResolvedValue([{ id: "d3" }]);
    await guardarDiagnostico({
      usuarioId: null,
      sessionToken: "tok",
      respuestas: RESPUESTAS,
      resultado: RESULTADO,
    });
    expect((insertValuesMock.mock.calls[0][0] as Record<string, unknown>).reclamadoEn).toBeNull();
  });

  it("devuelve DB_UNAVAILABLE si el insert lanza (modo concierge)", async () => {
    insertReturningMock.mockRejectedValueOnce(new Error("connection refused"));
    const r = await guardarDiagnostico({
      usuarioId: null,
      sessionToken: "tok",
      respuestas: RESPUESTAS,
      resultado: RESULTADO,
    });
    expect(r).toEqual({ ok: false, error: "DB_UNAVAILABLE" });
  });
});

describe("lecturas", () => {
  it("getDiagnosticoVigente devuelve el resultado reconstruido", async () => {
    selectLimitMock.mockResolvedValue([fila({ usuarioId: "u1" })]);
    const d = await getDiagnosticoVigente("u1");

    expect(d?.id).toBe("d1");
    expect(d?.puntajeTotal).toBe(RESULTADO.puntajeTotal);
    expect(d?.escalon).toBe(RESULTADO.escalon);
    expect(d?.bloqueantes).toEqual(RESULTADO.bloqueantes);
  });

  it("devuelve null cuando la cuenta no tiene diagnósticos", async () => {
    selectLimitMock.mockResolvedValue([]);
    expect(await getDiagnosticoVigente("u1")).toBeNull();
    expect(await getDiagnosticoPorSessionToken("tok")).toBeNull();
  });
});

describe("mapDiagnosticoRow — campos derivados que no son columnas", () => {
  it("reconstruye banda, estadoRup y bloqueoAbsoluto", () => {
    const d = mapDiagnosticoRow(fila());
    expect(d.banda).toBe(RESULTADO.banda);
    expect(d.estadoRup).toBe("vigente");
    // pila con mora + reporte activo: los dos bloqueantes absolutos.
    expect(d.bloqueoAbsoluto).toEqual(["pila_mora", "antec_mal"]);
  });

  it("una versión desconocida degrada los derivados en vez de mentir", () => {
    const d = mapDiagnosticoRow(fila({ version: "co-apsb-v99" }));
    // Lo guardado se respeta tal cual...
    expect(d.puntajeTotal).toBe(RESULTADO.puntajeTotal);
    expect(d.bloqueantes).toEqual(RESULTADO.bloqueantes);
    // ...pero no se deriva nada con un catálogo que no es el suyo.
    expect(d.bloqueoAbsoluto).toEqual([]);
    expect(d.estadoRup).toBe("desconocido");
  });
});

describe("reclamarDiagnosticos", () => {
  it("asocia las filas anónimas a la cuenta y las marca reclamadas", async () => {
    updateReturningMock.mockResolvedValue([{ id: "d1" }, { id: "d2" }]);
    const n = await reclamarDiagnosticos("tok", "u1");

    expect(n).toBe(2);
    const set = updateWhereMock.mock.calls[0][0] as Record<string, unknown>;
    expect(set.usuarioId).toBe("u1");
    expect(set.reclamadoEn).toBeInstanceOf(Date);
  });

  it("reclamar dos veces no reasigna nada (el IS NULL lo hace idempotente)", async () => {
    updateReturningMock.mockResolvedValueOnce([{ id: "d1" }]).mockResolvedValueOnce([]);
    expect(await reclamarDiagnosticos("tok", "u1")).toBe(1);
    expect(await reclamarDiagnosticos("tok", "u1")).toBe(0);
  });

  it("no lanza si la base falla: no puede bloquear un registro", async () => {
    updateReturningMock.mockRejectedValueOnce(new Error("connection refused"));
    await expect(reclamarDiagnosticos("tok", "u1")).resolves.toBe(0);
  });
});
