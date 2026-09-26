import { describe, expect, it } from "vitest";
import { metadataDeFaceta } from "@/src/lib/secop/faceta-metadata";

const antioquia = {
  familia: "departamento" as const,
  slug: "antioquia",
  label: "Antioquia",
  descripcion: "Procesos de agua y saneamiento abiertos en Antioquia.",
};

describe("metadataDeFaceta", () => {
  it("pone la cifra de abiertos en el título y la descripción", () => {
    const m = metadataDeFaceta({ ...antioquia, abiertos: 5155 });
    expect(m.title).toBe("Licitaciones de agua en Antioquia · 5.155 procesos abiertos");
    expect(m.description).toMatch(/^5\.155 procesos abiertos de agua y saneamiento en Antioquia/);
    expect(m.description).not.toContain("Procesos de agua y saneamiento abiertos en Antioquia.");
    expect(m.alternates.canonical).toBe("/licitaciones/departamento/antioquia");
  });

  it("singular con un proceso", () => {
    expect(metadataDeFaceta({ ...antioquia, abiertos: 1 }).title).toContain("· 1 proceso abierto");
  });

  it("sin cifra se queda en la forma de siempre, sin inventar", () => {
    for (const abiertos of [undefined, null, 0]) {
      const m = metadataDeFaceta({ ...antioquia, abiertos });
      expect(m.title).toBe("Antioquia · Licitaciones de agua y saneamiento");
      expect(m.description).toBe(antioquia.descripcion);
    }
  });

  it("en un tipo conserva la frase que explica el subsistema", () => {
    const m = metadataDeFaceta({
      familia: "tipo",
      slug: "ptar",
      label: "PTAR",
      descripcion: "Plantas de tratamiento de aguas residuales.",
      abiertos: 3000,
    });
    expect(m.title).toBe("Licitaciones de PTAR en Colombia · 3.000 procesos abiertos");
    expect(m.description).toContain("Plantas de tratamiento de aguas residuales.");
  });
});

describe("frases de tipo", () => {
  const tipo = (slug: string, label: string) =>
    metadataDeFaceta({ familia: "tipo", slug, label, descripcion: "x", abiertos: 10 }).title;
  it("en minúscula salvo siglas, y «otros» dicho como lo que es", () => {
    expect(tipo("acueducto", "Acueducto")).toBe(
      "Licitaciones de acueducto en Colombia · 10 procesos abiertos"
    );
    expect(tipo("otros", "Otros")).toBe(
      "Licitaciones de agua y saneamiento sin subsistema identificado · 10 procesos abiertos"
    );
  });
});
