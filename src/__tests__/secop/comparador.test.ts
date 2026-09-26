import { describe, expect, it } from "vitest";
import { clavesDesdeHash, hashDesdeClaves, seleccionInicial } from "@/src/lib/secop/comparador";

const validas = new Set(["05", "11", "76", "08"]);

describe("comparador: selección en el hash", () => {
  it("lee claves válidas, sin repetir y como mucho tres", () => {
    expect(clavesDesdeHash("#05,76", validas)).toEqual(["05", "76"]);
    expect(clavesDesdeHash("#05,05,99,11,76,08", validas)).toEqual(["05", "11", "76"]);
    expect(clavesDesdeHash("", validas)).toEqual([]);
    expect(clavesDesdeHash("#<script>", validas)).toEqual([]);
  });

  it("escribe el hash sin huecos", () => {
    expect(hashDesdeClaves(["05", null, "76"])).toBe("#05,76");
    expect(hashDesdeClaves([null, null])).toBe("");
  });

  it("sin elección, compara los dos con más procesos", () => {
    expect(
      seleccionInicial([
        { clave: "08", n: 10 },
        { clave: "05", n: 500 },
        { clave: "11", n: 300 },
      ])
    ).toEqual(["05", "11"]);
  });
});
