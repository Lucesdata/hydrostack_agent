import { describe, it, expect } from "vitest";
import { puede, type Nivel } from "@/src/lib/acceso/politica";
import { SECCIONES_HOME, ETIQUETA_POR_NIVEL } from "@/src/components/landing/seccionesHome";

const NIVELES: Nivel[] = ["anonimo", "gratis", "pro"];

/** El nivel más bajo que puede ejercer la capacidad: la verdad de politica.ts. */
function nivelMinimoReal(capacidad: string): Nivel {
  const encontrado = NIVELES.find((n) => puede(n, capacidad as never));
  if (!encontrado) throw new Error(`capacidad sin nivel: ${capacidad}`);
  return encontrado;
}

describe("las etiquetas del home dicen la verdad", () => {
  it.each(SECCIONES_HOME)(
    "$id: la etiqueta «$etiqueta» coincide con politica.ts",
    ({ capacidad, etiqueta }) => {
      expect(etiqueta).toBe(ETIQUETA_POR_NIVEL[nivelMinimoReal(capacidad)]);
    }
  );

  it("toda etiqueta usada existe en el mapa de niveles", () => {
    const validas = Object.values(ETIQUETA_POR_NIVEL);
    for (const s of SECCIONES_HOME) expect(validas).toContain(s.etiqueta);
  });
});
