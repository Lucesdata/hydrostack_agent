import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AA, contraste, leerTokensHex } from "@/src/lib/design/contraste";

const css = readFileSync(
  "src/components/landing/hero-territorial/buscador-guiado.module.css",
  "utf8"
);
const t = leerTokensHex(css);
describe("contraste real del buscador oscuro", () => {
  for (const texto of ["bs-texto", "bs-suave", "bs-enlace"]) {
    for (const fondo of ["bs-bg", "bs-campo"]) {
      it(`${texto} sobre ${fondo} llega a AA`, () => {
        expect(contraste(t[texto], t[fondo])).toBeGreaterThanOrEqual(AA.texto);
      });
    }
  }
  it("el botón permite leer texto blanco", () => {
    expect(contraste("#ffffff", t["bs-boton"])).toBeGreaterThanOrEqual(AA.texto);
  });
  it("el borde de los campos llega a 3:1", () => {
    expect(contraste(t["bs-borde"], t["bs-campo"])).toBeGreaterThanOrEqual(AA.noTextual);
  });
});
