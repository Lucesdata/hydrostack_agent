import { describe, expect, it } from "vitest";
import { haceCuanto } from "@/src/lib/landing/hace-cuanto";

const ahora = new Date("2026-09-26T18:00:00Z");
const antes = (min: number) => new Date(ahora.getTime() - min * 60_000).toISOString();

describe("haceCuanto", () => {
  it("trunca, no redondea hacia lo reciente", () => {
    expect(haceCuanto(antes(20), ahora)).toBe("hace menos de una hora");
    expect(haceCuanto(antes(119), ahora)).toBe("hace 1 h");
    expect(haceCuanto(antes(47 * 60 + 59), ahora)).toBe("hace 47 h");
  });

  it("pasa a días desde las 48 h, para que un dato viejo se vea viejo", () => {
    expect(haceCuanto(antes(48 * 60), ahora)).toBe("hace 2 días");
    expect(haceCuanto(antes(10 * 24 * 60), ahora)).toBe("hace 10 días");
  });

  it("sin fecha o con una ilegible no dice nada", () => {
    expect(haceCuanto(null, ahora)).toBeNull();
    expect(haceCuanto("no es fecha", ahora)).toBeNull();
  });
});
