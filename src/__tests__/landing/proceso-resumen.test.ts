import { describe, expect, it } from "vitest";
import { mapApiItem } from "@/src/components/landing/proceso-resumen";
import { frase, titulo } from "@/src/components/landing/texto";

// Casos que vivían en ProcesosTicker.test.tsx: el ticker salió de la portada
// (2026-09-27) y estas funciones siguen en uso en los destacados y el buscador.

const base = {
  id: "CO1.REQ.1",
  objeto: "OPTIMIZACIÓN DE LA PTAR MUNICIPAL",
  entidad: "MUNICIPIO DE CHINU",
  tipoProyecto: "ptar",
  departamento: "CÓRDOBA",
  municipio: "CHINÚ",
  valorEstimado: 4_280_000_000,
  estado: "Publicado",
  ficha: "/licitaciones/optimizacion-de-la-ptar--CO1.REQ.1",
};

describe("frase", () => {
  it("el objeto en mayúsculas pasa a frase y conserva las siglas del sector", () => {
    expect(frase("OPTIMIZACIÓN DE LA PTAR MUNICIPAL")).toBe("Optimización de la PTAR municipal");
    expect(frase("Ampliación de la PTAR El Salitre")).toBe("Ampliación de la PTAR El Salitre");
  });
});

describe("mapApiItem", () => {
  it("cada elemento enlaza su ficha, y la lista solo si no hay ficha", () => {
    expect(mapApiItem(base).href).toBe(base.ficha);
    expect(mapApiItem({ ...base, ficha: null }).href).toBe("/licitaciones");
  });

  it("lleva tipo con color y monto; sin tipo no inventa uno", () => {
    const item = mapApiItem(base);
    expect(item.tipo.label).toBe("PTAR");
    expect(item.tipo.color.familia).toBe("residual");
    expect(item.valor).toBe("$4.280 M");
    expect(mapApiItem({ ...base, tipoProyecto: null }).tipo).toBeNull();
  });
});

describe("titulo", () => {
  it("en nombres de lugar no ve siglas", () => {
    expect(titulo("META", false)).toBe("Meta");
    expect(mapApiItem({ ...base, municipio: "CALI", departamento: "VALLE DEL CAUCA" }).ciudad).toBe(
      "Cali"
    );
  });

  it("baja los conectores y conserva las siglas", () => {
    expect(titulo("EMPRESA DE ACUEDUCTO DE BOGOTÁ E.S.P.")).toBe(
      "Empresa de Acueducto de Bogotá E.S.P."
    );
    expect(titulo("EAAB")).toBe("EAAB");
  });
});
