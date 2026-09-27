import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// `contar` vive en un objeto creado con `vi.hoisted` (en vez de un simple
// `const contar = vi.fn()` a nivel de módulo) y se reasigna a un `vi.fn()`
// nuevo en cada `beforeEach`, en vez de reusar el mismo mock con
// `.mockReset()`. Verificado en este repo con vitest@4.1.6: reutilizar un
// único `vi.fn()` que pasa de una implementación resuelta (test anterior) a
// una rechazada persistente (`mockRejectedValue`, sin "Once") hace que
// `@vitest/spy` reporte un "unhandled rejection" fantasma contra el test
// siguiente — reproducido incluso con un mock ajeno a Drizzle y sin
// `Promise.all`/`allSettled` de por medio. Un `vi.fn()` fresco por test lo
// evita.
const mocks = vi.hoisted(() => ({ contar: vi.fn() }));

vi.mock("@/src/lib/db/client", () => ({
  db: {
    select: () => ({ from: (t: unknown) => mocks.contar(t) }),
  },
}));

import { getProcesosVigilados } from "@/src/lib/landing/cifras";

describe("getProcesosVigilados", () => {
  // contar() logea con console.warn cuando degrada por un fallo real (ver
  // cifras.ts). Los tests de degradación lo disparan a propósito — se
  // silencia aquí para que la salida del test quede limpia.
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mocks.contar = vi.fn();
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("devuelve el conteo cuando la consulta responde", async () => {
    mocks.contar.mockResolvedValueOnce([{ n: 90076 }]);
    expect(await getProcesosVigilados()).toBe(90076);
  });

  it("nunca lanza: si la consulta falla devuelve null y deja rastro", async () => {
    mocks.contar.mockRejectedValueOnce(new Error("caída"));
    expect(await getProcesosVigilados()).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("caída"));
  });

  it("degrada a null si la fila viene sin número utilizable", async () => {
    mocks.contar.mockResolvedValueOnce([]);
    expect(await getProcesosVigilados()).toBeNull();
    mocks.contar.mockResolvedValueOnce([{ n: null }]);
    expect(await getProcesosVigilados()).toBeNull();
  });
});
