import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

describe("matching ya no depende de raw_record", () => {
  const src = readFileSync("src/lib/al/matching/buscar-candidatos.ts", "utf8");

  it("no hace JOIN a raw_record", () => {
    expect(src).not.toContain("leftJoin(rawRecord");
  });

  it("lee descripcion y unspsc de proceso", () => {
    expect(src).toContain("proceso.descripcion");
    expect(src).toContain("proceso.unspsc");
  });
});
