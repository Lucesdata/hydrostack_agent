import { describe, expect, it } from "vitest";
import { enlacesDeFicha } from "@/src/components/landing/proceso-resumen";
import { frase, titulo } from "@/src/components/landing/texto";

const base = {
  id: "CO1.REQ.1",
  objeto: "OPTIMIZACIÓN DE LA PTAR MUNICIPAL",
  entidad: "MUNICIPIO DE CHINU",
  tipoProyecto: "ptar",
  departamento: "CÓRDOBA",
  municipio: "CHINÚ",
  valorEstimado: 4_280_000_000,
  estado: "Publicado",
  ficha: "/licitaciones/optimizacion-de-la-ptar-municipal--CO1.REQ.1",
};

describe("frase", () => {
  it("el objeto en mayúsculas pasa a frase y conserva las siglas del sector", () => {
    expect(frase("OPTIMIZACIÓN DE LA PTAR MUNICIPAL")).toBe("Optimización de la PTAR municipal");
    expect(frase("Ampliación de la PTAR El Salitre")).toBe("Ampliación de la PTAR El Salitre");
  });
});

describe("enlacesDeFicha", () => {
  it("los cinco destinos salen de la misma ficha, con los anclajes de ExploradorFicha", () => {
    const e = enlacesDeFicha(base.ficha);
    expect(e).toEqual({
      ficha: base.ficha,
      resumen: `${base.ficha}#ficha-resumen`,
      dinero: `${base.ficha}#ficha-dinero`,
      plazos: `${base.ficha}#ficha-plazos`,
      pliego: `${base.ficha}#pliego`,
    });
  });

  it("sin ficha no hay enlaces", () => {
    expect(enlacesDeFicha(null)).toBeNull();
    expect(enlacesDeFicha(undefined)).toBeNull();
  });

  it("los anclajes existen en la ficha", async () => {
    const { readFileSync } = await import("node:fs");
    const pagina = readFileSync("app/licitaciones/[slug]/page.tsx", "utf8");
    for (const id of ["resumen", "dinero", "plazos", "participar"]) {
      expect(pagina).toContain(`id: "${id}"`);
    }
    const explorador = readFileSync("src/components/secop/ficha/ExploradorFicha.tsx", "utf8");
    expect(explorador).toContain('hash === "pliego"');
    expect(explorador).toContain('hash.replace(/^ficha-/, "")');
  });
});

describe("titulo", () => {
  it("en nombres de lugar no ve siglas", () => {
    expect(titulo("META", false)).toBe("Meta");
    expect(titulo("CALI", false)).toBe("Cali");
  });

  it("baja los conectores y conserva las siglas", () => {
    expect(titulo("EMPRESA DE ACUEDUCTO DE BOGOTÁ E.S.P.")).toBe(
      "Empresa de Acueducto de Bogotá E.S.P."
    );
    expect(titulo("EAAB")).toBe("EAAB");
  });
});
