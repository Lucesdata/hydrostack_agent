import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// `contar` vive en un objeto creado con `vi.hoisted` (en vez de un simple
// `const contar = vi.fn()` a nivel de módulo) y se reasigna a un `vi.fn()`
// nuevo en cada `beforeEach`, en vez de reusar el mismo mock con
// `.mockReset()`. Verificado en este repo con vitest@4.1.6: reutilizar un
// único `vi.fn()` que pasa de una implementación resuelta (test anterior) a
// una rechazada persistente (`mockRejectedValue`, sin "Once") hace que
// `@vitest/spy` reporte un "unhandled rejection" fantasma contra el test
// siguiente — reproducido incluso con un mock ajeno a Drizzle y sin
// `Promise.all`/`allSettled` de por medio, así que no es un bug de
// `getCifrasSector`. Un `vi.fn()` fresco por test lo evita.
const mocks = vi.hoisted(() => ({ contar: vi.fn() }));

vi.mock("@/src/lib/db/client", () => ({
  db: {
    select: () => ({ from: (t: unknown) => mocks.contar(t) }),
  },
}));

import { getCifrasSector } from "@/src/lib/landing/cifras";

describe("getCifrasSector", () => {
  // contar() logea con console.warn cuando degrada por un fallo real (ver
  // cifras.ts). Los tests de degradación lo disparan a propósito — se
  // silencia aquí, igual que se silenciaría cualquier log esperado, para que
  // la salida del test quede limpia.
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mocks.contar = vi.fn();
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("devuelve los tres conteos cuando todas las consultas responden", async () => {
    mocks.contar
      .mockResolvedValueOnce([{ n: 90076 }])
      .mockResolvedValueOnce([{ n: 27035 }])
      .mockResolvedValueOnce([{ n: 2114 }]);

    expect(await getCifrasSector()).toEqual({
      procesosVigilados: 90076,
      oferentesHistoricos: 27035,
      sanciones: 2114,
    });
  });

  it("degrada a null solo la cifra que falla, no las demás", async () => {
    mocks.contar
      .mockResolvedValueOnce([{ n: 90076 }])
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce([{ n: 2114 }]);

    expect(await getCifrasSector()).toEqual({
      procesosVigilados: 90076,
      oferentesHistoricos: null,
      sanciones: 2114,
    });
  });

  it("nunca lanza: si todo falla devuelve los tres en null", async () => {
    mocks.contar.mockRejectedValue(new Error("caída"));
    expect(await getCifrasSector()).toEqual({
      procesosVigilados: null,
      oferentesHistoricos: null,
      sanciones: null,
    });
  });

  it("degrada a null si la fila viene sin número utilizable", async () => {
    mocks.contar
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ n: null }])
      .mockResolvedValueOnce([{ n: 2114 }]);

    const r = await getCifrasSector();
    expect(r.procesosVigilados).toBeNull();
    expect(r.oferentesHistoricos).toBeNull();
    expect(r.sanciones).toBe(2114);
  });
});
