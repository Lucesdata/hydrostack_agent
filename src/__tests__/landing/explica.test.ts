import { describe, it, expect } from "vitest";
import { EXPLICA } from "@/app/auditoria/explica";
import { MOTIVOS } from "@/src/components/landing/S5Descartes";

/**
 * `S5Descartes.jsx` mantiene una copia literal de los textos de `EXPLICA`
 * (app/auditoria/explica.ts, la fuente que usa app/auditoria/page.tsx) para
 * no depender de una petición al servidor en el home. Antes solo un
 * comentario prometía que las dos listas no divergían; este test lo hace
 * exigible.
 */
describe("MOTIVOS de S5Descartes coincide con EXPLICA de auditoría", () => {
  it("es una copia literal, byte a byte, de Object.values(EXPLICA)", () => {
    expect(MOTIVOS).toEqual(Object.values(EXPLICA));
  });
});
