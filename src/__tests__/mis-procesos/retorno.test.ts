import { describe, expect, it } from "vitest";
import { retornoDeGuardado, rutaInterna } from "@/src/lib/mis-procesos/retorno";
describe("intención pendiente al iniciar sesión", () => {
  it("transporta id y filtros sin confirmar ningún guardado", () => {
    const r = new URL(
      retornoDeGuardado("CO1.REQ.42", "/licitaciones/explorar?modo=tema&sistema=ptar"),
      "https://aqualicita.com"
    );
    expect(r.pathname).toBe("/mis-procesos");
    expect(r.searchParams.get("guardar")).toBe("CO1.REQ.42");
    expect(r.searchParams.get("volver")).toContain("sistema=ptar");
  });
  it("rechaza retorno externo, barras invertidas y controles", () => {
    for (const value of [
      "//malicioso.test",
      "/\\malicioso.test",
      "/\nmalicioso",
      "https://malicioso.test",
    ]) {
      expect(rutaInterna(value)).toBe("/mis-procesos");
    }
  });
});
