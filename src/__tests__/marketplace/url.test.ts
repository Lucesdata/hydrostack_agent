import { describe, expect, it } from "vitest";
import { FAMILIAS_CHIP, ILUSTRACION, familiaDeTipo, ilustracionDeTipo } from "@/src/lib/marketplace/familias";
import { filtrosDesdeParams, SIN_FILTROS } from "@/src/lib/secop/filtros-vitrina";
import { esSistema, SISTEMAS_AGRUPADOS } from "@/src/lib/secop/busqueda-guiada";
import {
  conDepartamento,
  conTipo,
  hrefMarketplace,
  hrefVitrina,
  normalizarBusqueda,
  traeParametrosVacios,
} from "@/src/lib/marketplace/url";
import fs from "node:fs";
import path from "node:path";

describe("URL del marketplace", () => {
  it("la URL es el estado: ida y vuelta con los parámetros de la vitrina", () => {
    const f = { ...SIN_FILTROS, q: "ptar", tipo: "residual" as const, departamento: "antioquia", orden: "valor" as const };
    const href = hrefMarketplace(f, 2);
    expect(href).toBe("/marketplace?q=ptar&tipo=residual&departamento=antioquia&orden=valor&pagina=2");
    const { filtros, pagina } = filtrosDesdeParams(new URLSearchParams(href.split("?")[1]));
    expect(filtros).toMatchObject({ q: "ptar", tipo: "residual", departamento: "antioquia", orden: "valor" });
    expect(pagina).toBe(2);
  });

  it("cambiar filtro vuelve a la página uno; quitar territorio conserva texto y familia", () => {
    const f = { ...SIN_FILTROS, q: "agua", tipo: "potable" as const, departamento: "huila" };
    expect(hrefMarketplace(conTipo(f, "redes"))).not.toContain("pagina");
    expect(hrefMarketplace(conDepartamento(f, null))).toBe("/marketplace?q=agua&tipo=potable");
  });

  it("nunca arrastra el filtro de etapa: esos procesos no son oportunidades", () => {
    expect(hrefMarketplace({ ...SIN_FILTROS, etapa: "en_ejecucion" })).toBe("/marketplace");
    expect(hrefVitrina({ ...SIN_FILTROS, tipo: "redes", etapa: "contratado" })).toBe("/licitaciones?tipo=redes");
  });

  it("valida del lado servidor: enums, longitud, departamento y página", () => {
    const { filtros, pagina } = filtrosDesdeParams({
      tipo: "cualquiera",
      departamento: "../../etc",
      presupuesto: "7",
      orden: "x",
      q: "a".repeat(500),
      pagina: "-3",
    });
    expect(filtros.tipo).toBeNull();
    expect(filtros.departamento).toBeNull();
    expect(filtros.presupuestoMin).toBeNull();
    expect(filtros.orden).toBe("relevancia");
    expect(filtros.q).toHaveLength(120);
    expect(pagina).toBe(1);
  });

  it("un id de SECOP en el buscador principal se busca como número", () => {
    const f = normalizarBusqueda({ ...SIN_FILTROS, q: "CO1.REQ.5720221" });
    expect(f).toMatchObject({ q: null, numero: "CO1.REQ.5720221" });
    expect(normalizarBusqueda({ ...SIN_FILTROS, q: "acueducto" }).numero).toBeNull();
    expect(normalizarBusqueda({ ...SIN_FILTROS, q: "CO1.REQ.1", numero: "X-1" }).numero).toBe("X-1");
  });

  it("detecta parámetros vacíos del formulario GET para canonizar la URL", () => {
    expect(traeParametrosVacios({ q: "", tipo: "potable" })).toBe(true);
    expect(traeParametrosVacios({ q: "agua" })).toBe(false);
    expect(traeParametrosVacios({})).toBe(false);
  });
});

describe("familias e ilustraciones", () => {
  it("las tres familias son sistemas válidos de la vitrina", () => {
    expect(FAMILIAS_CHIP.map((f) => f.sistema)).toEqual([...SISTEMAS_AGRUPADOS]);
    for (const f of FAMILIAS_CHIP) expect(esSistema(f.sistema)).toBe(true);
  });

  it("tipo → familia → foto; sin tipo confirmado no hay foto", () => {
    expect(familiaDeTipo("ptap")).toBe("potable");
    expect(familiaDeTipo("acueducto")).toBe("potable");
    expect(familiaDeTipo("ptar")).toBe("residual");
    expect(familiaDeTipo("alcantarillado")).toBe("redes");
    expect(familiaDeTipo("otros")).toBeNull();
    expect(familiaDeTipo(null)).toBeNull();
    expect(ilustracionDeTipo("otros")).toBeNull();
    expect(ilustracionDeTipo("ptar")?.src).toContain("ptar");
  });

  it("los archivos de ilustración existen y las variantes pesan menos que el original", () => {
    for (const il of Object.values(ILUSTRACION)) {
      const grande = fs.statSync(path.join(process.cwd(), "public", il.src));
      const chica = fs.statSync(path.join(process.cwd(), "public", il.src640));
      expect(chica.size).toBeLessThan(grande.size);
    }
  });
});
