import { describe, expect, it } from "vitest";
import { topePool } from "@/src/lib/db/client";

describe("topePool", () => {
  it("usa 3 por defecto", () => expect(topePool(undefined)).toBe(3));
  it("acepta un entero entre 1 y 10", () => {
    expect(topePool("1")).toBe(1);
    expect(topePool("10")).toBe(10);
  });
  it.each(["0", "11", "-2", "2.5", "abc", ""])("ignora %j y vuelve a 3", (v) =>
    expect(topePool(v)).toBe(3)
  );
});
